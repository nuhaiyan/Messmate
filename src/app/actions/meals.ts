'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context (e.g. testing)
  }
}

export interface BulkMealInput {
  memberId: string;
  breakfast: number;
  lunch: number;
  dinner: number;
}

export async function saveBulkMealsAction(data: {
  date: string; // YYYY-MM-DD
  meals: BulkMealInput[];
}) {
  const session = await requireManager();
  const mealDate = new Date(`${data.date}T12:00:00Z`);
  const year = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth() + 1;

  // Find or create monthly period
  let period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: {
        messId: session.messId,
        year,
        month,
      },
    },
  });

  if (!period) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    period = await prisma.monthlyPeriod.create({
      data: {
        messId: session.messId,
        year,
        month,
        startDate,
        endDate,
        isClosed: false,
      },
    });
  }

  if (period.isClosed) {
    return {
      success: false,
      error: `Cannot modify meals for ${data.date}. This month (${month}/${year}) is CLOSED and locked.`,
    };
  }

  // Active eligible members check: Deactivated/Archived members cannot receive new meal entries
  const activeMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true, isArchived: false },
    select: { id: true, fullName: true },
  });
  const activeMap = new Map(activeMembers.map((m) => [m.id, m.fullName]));

  let totalUpdated = 0;

  // Execute in database transaction
  await prisma.$transaction(async (tx) => {
    for (const item of data.meals) {
      if (!activeMap.has(item.memberId)) {
        // Skip or ignore inactive/archived members
        continue;
      }

      const bf = Math.max(0, Number(item.breakfast) || 0);
      const ln = Math.max(0, Number(item.lunch) || 0);
      const dn = Math.max(0, Number(item.dinner) || 0);
      const total = bf + ln + dn;

      // Upsert meal entry
      await tx.mealEntry.upsert({
        where: {
          memberId_date: {
            memberId: item.memberId,
            date: mealDate,
          },
        },
        create: {
          messId: session.messId,
          periodId: period.id,
          memberId: item.memberId,
          date: mealDate,
          breakfast: bf,
          lunch: ln,
          dinner: dn,
          totalMeals: total,
          createdById: session.userId,
        },
        update: {
          breakfast: bf,
          lunch: ln,
          dinner: dn,
          totalMeals: total,
        },
      });
      totalUpdated++;
    }
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEAL_BULK_ENTRY',
    entity: 'MEAL',
    details: { date: data.date, memberCount: totalUpdated },
  });

  safeRevalidate('/meals');
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');
  return { success: true, count: totalUpdated };
}

export async function copyPreviousDayMealsAction(targetDateStr: string) {
  const session = await requireManager();
  const targetDate = new Date(`${targetDateStr}T12:00:00Z`);
  const prevDate = new Date(targetDate);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);

  // Fetch only active, non-archived members
  const activeMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true, isArchived: false },
    select: { id: true },
  });
  const activeIds = activeMembers.map((m) => m.id);

  // Fetch previous day's meals
  const prevMeals = await prisma.mealEntry.findMany({
    where: {
      messId: session.messId,
      date: prevDate,
      memberId: { in: activeIds },
    },
  });

  if (prevMeals.length === 0) {
    return { success: false, error: 'No meal records found for yesterday to copy.' };
  }

  const mealInputs: BulkMealInput[] = prevMeals.map((m) => ({
    memberId: m.memberId,
    breakfast: Number(m.breakfast),
    lunch: Number(m.lunch),
    dinner: Number(m.dinner),
  }));

  return await saveBulkMealsAction({
    date: targetDateStr,
    meals: mealInputs,
  });
}

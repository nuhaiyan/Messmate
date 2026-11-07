import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MealManagementClient } from './meal-management-client';

interface MealsPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function MealsPage({ searchParams }: MealsPageProps) {
  const session = await requireAuth();
  const sp = await searchParams;

  const selectedDateStr = sp.date || '2026-11-07';
  const targetDate = new Date(`${selectedDateStr}T12:00:00Z`);
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth() + 1;

  // Find period
  const period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: { messId: session.messId, year, month },
    },
  });

  const isClosed = period?.isClosed ?? false;

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    include: { profile: true },
  });

  const messSetting = await prisma.messSetting.findUnique({
    where: { messId: session.messId },
    select: { includeBreakfast: true },
  });
  const includeBreakfast = messSetting?.includeBreakfast ?? false;

  const messName = mess?.profile?.messName || mess?.name || "Tarek's Residence";
  const messLogoUrl = mess?.profile?.logoUrl || mess?.logoUrl || null;

  // All members of the mess
  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  // ONLY active and non-archived members appear on daily meal entry sheet
  const activeMembers = allMembers.filter((m) => m.isActive && !m.isArchived);

  // Fetch meals for this day
  const dayMeals = await prisma.mealEntry.findMany({
    where: {
      messId: session.messId,
      date: targetDate,
    },
  });

  // Fetch month totals per member
  const monthMeals = await prisma.mealEntry.findMany({
    where: {
      messId: session.messId,
      periodId: period?.id,
    },
  });

  const memberMonthTotals: Record<string, number> = {};
  for (const m of activeMembers) {
    memberMonthTotals[m.id] = 0;
  }
  for (const item of monthMeals) {
    if (memberMonthTotals[item.memberId] !== undefined) {
      memberMonthTotals[item.memberId] += Number(item.totalMeals);
    }
  }

  const mealMap: Record<string, { b: number; l: number; d: number }> = {};
  for (const dm of dayMeals) {
    mealMap[dm.memberId] = {
      b: Number(dm.breakfast),
      l: Number(dm.lunch),
      d: Number(dm.dinner),
    };
  }

  const initialMeals = activeMembers.map((m) => ({
    memberId: m.id,
    fullName: m.fullName,
    roomNumber: m.roomNumber,
    breakfast: mealMap[m.id]?.b ?? 1,
    lunch: mealMap[m.id]?.l ?? 1,
    dinner: mealMap[m.id]?.d ?? 1,
    monthTotal: memberMonthTotals[m.id] ?? 0,
  }));

  const membersOptions = allMembers
    .filter((m) => !m.isArchived)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      isPrimaryAdmin: m.isPrimaryAdmin,
      isAdmin: m.isAdmin,
      isManager: m.isManager,
    }));

  const canManageMeals = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      messName={messName}
      messLogoUrl={messLogoUrl}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      membersList={membersOptions}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
    >
      <MealManagementClient
        selectedDate={selectedDateStr}
        initialMeals={initialMeals}
        isManager={canManageMeals}
        isClosed={isClosed}
        initialIncludeBreakfast={includeBreakfast}
      />
    </DashboardShell>
  );
}
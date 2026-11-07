import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { History } from 'lucide-react';

export default async function ActivitiesPage() {
  const session = await requireAuth();

  // Protect Admin/Manager panel: audit logs restricted to management
  if (!session.isPrimaryAdmin && !session.isAdmin && !session.isManager) {
    redirect('/my-ledger');
  }

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  const membersOptions = allMembers
    .filter((m) => !m.isArchived)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      isPrimaryAdmin: m.isPrimaryAdmin,
      isAdmin: m.isAdmin,
      isManager: m.isManager,
    }));

  const logs = await prisma.auditLog.findMany({
    where: { messId: session.messId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      membersList={membersOptions}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Immutable Audit Trail &amp; Activity Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic/database record of all financial changes, member creations, meal entries, and period closings
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Audit Logs ({logs.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {log.user?.name || 'System'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {log.entity}
                      </td>
                      <td className="py-3 px-4 text-xs italic text-amber-700 dark:text-amber-300">
                        {log.reason ? `“${log.reason}”` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
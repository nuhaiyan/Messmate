'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header, MemberOption } from './header';
import { I18nProvider } from '@/lib/i18n/context';

interface DashboardShellProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
  messName?: string;
  messLogoUrl?: string | null;
  currentMealRate?: string | number;
  selectedMonth?: number;
  selectedYear?: number;
  membersList?: MemberOption[];
  activeMemberId?: string;
  isPrimaryAdmin?: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
  currentManagerName?: string;
  primaryAdminName?: string;
}

export function DashboardShell({
  children,
  userRole = 'PRIMARY_ADMIN',
  userName = 'Mohammad Tarek Hossen',
  messName = "Tarek's Residence",
  messLogoUrl = null,
  currentMealRate,
  selectedMonth = 11,
  selectedYear = 2026,
  membersList = [],
  activeMemberId,
  isPrimaryAdmin = false,
  isAdmin = false,
  isManager = false,
  currentManagerName = 'Tanvir',
  primaryAdminName = 'Mohammad Tarek Hossen',
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <I18nProvider>
      <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar
            userRole={userRole}
            userName={userName}
            messName={messName}
            messLogoUrl={messLogoUrl}
            isPrimaryAdmin={isPrimaryAdmin}
            isAdmin={isAdmin}
            isManager={isManager}
            currentManagerName={currentManagerName}
            primaryAdminName={primaryAdminName}
          />
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 flex flex-col w-64 max-w-xs bg-slate-900 dark:bg-slate-950 shadow-2xl">
              <Sidebar
                userRole={userRole}
                userName={userName}
                messName={messName}
                messLogoUrl={messLogoUrl}
                isPrimaryAdmin={isPrimaryAdmin}
                isAdmin={isAdmin}
                isManager={isManager}
                currentManagerName={currentManagerName}
                primaryAdminName={primaryAdminName}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            currentMealRate={currentMealRate}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            membersList={membersList}
            activeMemberId={activeMemberId}
            currentManagerName={currentManagerName}
            primaryAdminName={primaryAdminName}
          />
          <main className="flex-1 p-3 sm:p-5 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}

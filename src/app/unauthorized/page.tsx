import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h1>
      <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
        This section is reserved for the Mess Manager. Members can view their own financial ledger, daily meals, and reports.
      </p>
      <Link href="/dashboard">
        <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Edit2,
  PowerOff,
  Power,
  ShieldCheck,
  User,
  Crown,
  Shield,
  BookOpenText,
  Phone,
  Calendar,
  X,
  Check,
  AlertCircle,
  Archive,
  RefreshCw,
  History,
  Lock,
  ArrowRight,
  ShieldAlert,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  addMemberAction,
  updateMemberAction,
  deactivateMemberAction,
  activateMemberAction,
  archiveMemberAction,
  changeManagerAction,
  grantAdminPrivilegeAction,
  revokeAdminPrivilegeAction,
  setMemberPasswordAction,
  resetMemberPasswordToDefaultAction,
  toggleMemberLoginAccessAction,
} from '@/app/actions/members';

export interface MemberItem {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  roomNumber: string | null;
  joiningDate: string;
  leavingDate: string | null;
  isActive: boolean;
  isArchived: boolean;
  initialOpeningBalance: number;
  isPrimaryAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  adminGrantedAt: string | null;
  role: string;
  loginEnabled?: boolean;
  hasPassword?: boolean;
}

export interface ManagerAssignmentItem {
  id: string;
  memberName: string;
  assignedByName: string;
  assignedAt: string;
  endedAt: string | null;
  notes: string | null;
}

export interface AdminLogItem {
  id: string;
  action: string;
  memberName: string;
  performedByName: string;
  performedAt: string;
  notes: string | null;
}

export interface CurrentUserSession {
  memberId: string;
  name: string;
  isPrimaryAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

interface MemberManagementClientProps {
  members: MemberItem[];
  managerAssignments: ManagerAssignmentItem[];
  adminLogs: AdminLogItem[];
  currentUser: CurrentUserSession;
  initialTab?: string;
}

export function MemberManagementClient({
  members,
  managerAssignments,
  adminLogs,
  currentUser,
  initialTab = 'members',
}: MemberManagementClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'members' | 'manager' | 'admins'>(
    initialTab === 'manager' || initialTab === 'admins' ? initialTab : 'members'
  );

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);

  // Action Modals
  const [deactivateModalMember, setDeactivateModalMember] = useState<MemberItem | null>(null);
  const [archiveModalMember, setArchiveModalMember] = useState<MemberItem | null>(null);
  const [changeManagerModalOpen, setChangeManagerModalOpen] = useState(false);
  const [selectedNewManagerId, setSelectedNewManagerId] = useState('');
  const [managerChangeNotes, setManagerChangeNotes] = useState('');

  const [grantAdminModalOpen, setGrantAdminModalOpen] = useState(false);
  const [selectedAdminMemberId, setSelectedAdminMemberId] = useState('');
  const [grantAdminNotes, setGrantAdminNotes] = useState('');

  const [revokeAdminModalMember, setRevokeAdminModalMember] = useState<MemberItem | null>(null);
  const [revokeAdminNotes, setRevokeAdminNotes] = useState('');

  // Form states for Add / Edit
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [joiningDate, setJoiningDate] = useState('2026-09-01');
  const [leavingDate, setLeavingDate] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  const currentManager = members.find((m) => m.isManager);
  const primaryAdmin = members.find((m) => m.isPrimaryAdmin);
  const sharedAdmins = members.filter((m) => m.isAdmin && !m.isPrimaryAdmin);

  // Counts
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.isActive && !m.isArchived).length;
  const deactivatedCount = members.filter((m) => !m.isActive && !m.isArchived).length;
  const archivedCount = members.filter((m) => m.isArchived).length;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setRoomNumber('');
    setJoiningDate('2026-09-01');
    setLeavingDate('');
    setInitialBalance('0');
    setAddEditModalOpen(true);
  };

  const openEditModal = (m: MemberItem) => {
    setEditingMember(m);
    setFullName(m.fullName);
    setPhone(m.phone);
    setEmail(m.email || '');
    setRoomNumber(m.roomNumber || '');
    setJoiningDate(new Date(m.joiningDate).toISOString().split('T')[0]);
    setLeavingDate(m.leavingDate ? new Date(m.leavingDate).toISOString().split('T')[0] : '');
    setInitialBalance(m.initialOpeningBalance.toString());
    setAddEditModalOpen(true);
  };

  // Submit Add / Edit
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (editingMember) {
        const res = await updateMemberAction(editingMember.id, {
          fullName,
          phone,
          email,
          roomNumber,
          joiningDate,
          leavingDate: leavingDate || null,
          initialBalance: parseFloat(initialBalance) || 0,
        });
        if (res.success) {
          showFeedback('success', `Member ${fullName} updated successfully.`);
          setAddEditModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Failed to update member.');
        }
      } else {
        const res = await addMemberAction({
          fullName,
          phone,
          email,
          roomNumber,
          joiningDate,
          initialBalance: parseFloat(initialBalance) || 0,
        });
        if (res.success) {
          showFeedback('success', `Member ${fullName} added successfully.`);
          setAddEditModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Failed to add member.');
        }
      }
    });
  };

  // Handle Deactivate
  const handleDeactivate = async () => {
    if (!deactivateModalMember) return;
    startTransition(async () => {
      const res = await deactivateMemberAction(deactivateModalMember.id);
      if (res.success) {
        showFeedback('success', `${deactivateModalMember.fullName} deactivated. Excluded from meal lists while preserving history.`);
        setDeactivateModalMember(null);
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to deactivate member.');
      }
    });
  };

  // Handle Reactivate
  const handleReactivate = async (m: MemberItem) => {
    startTransition(async () => {
      const res = await activateMemberAction(m.id);
      if (res.success) {
        showFeedback('success', `${m.fullName} reactivated for active mess operations.`);
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to reactivate member.');
      }
    });
  };

  // Handle Archive
  const handleArchive = async () => {
    if (!archiveModalMember) return;
    startTransition(async () => {
      const res = await archiveMemberAction(archiveModalMember.id);
      if (res.success) {
        showFeedback('success', `${archiveModalMember.fullName} archived. All past records, ledgers, and transactions remain preserved.`);
        setArchiveModalMember(null);
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to archive member.');
      }
    });
  };

  // Handle Change Manager
  const handleChangeManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewManagerId) {
      showFeedback('error', 'Please select an eligible member to become the new Manager.');
      return;
    }
    startTransition(async () => {
      const res = await changeManagerAction(selectedNewManagerId, managerChangeNotes);
      if (res.success) {
        showFeedback('success', 'New Mess Manager appointed successfully. Previous manager returned to regular status.');
        setChangeManagerModalOpen(false);
        setSelectedNewManagerId('');
        setManagerChangeNotes('');
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to change manager.');
      }
    });
  };

  // Handle Grant Admin
  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminMemberId) {
      showFeedback('error', 'Please select an active member to grant Admin privileges.');
      return;
    }
    startTransition(async () => {
      const res = await grantAdminPrivilegeAction(selectedAdminMemberId, grantAdminNotes);
      if (res.success) {
        showFeedback('success', 'Admin privileges granted successfully.');
        setGrantAdminModalOpen(false);
        setSelectedAdminMemberId('');
        setGrantAdminNotes('');
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to grant admin privileges.');
      }
    });
  };

  // Handle Revoke Admin
  const handleRevokeAdmin = async () => {
    if (!revokeAdminModalMember) return;
    startTransition(async () => {
      const res = await revokeAdminPrivilegeAction(revokeAdminModalMember.id, revokeAdminNotes);
      if (res.success) {
        showFeedback('success', `Admin privileges revoked from ${revokeAdminModalMember.fullName}.`);
        setRevokeAdminModalMember(null);
        setRevokeAdminNotes('');
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to revoke admin privileges.');
      }
    });
  };

  // Password & Login Access Management States
  const [passwordModalMember, setPasswordModalMember] = useState<MemberItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Handle Set Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalMember || !newPasswordInput.trim()) return;
    startTransition(async () => {
      const res = await setMemberPasswordAction(passwordModalMember.id, newPasswordInput.trim());
      if (res.success) {
        showFeedback('success', res.message || 'Password updated.');
        setPasswordModalMember(null);
        setNewPasswordInput('');
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to update password.');
      }
    });
  };

  // Handle Reset to Default Password
  const handleResetDefaultPassword = async () => {
    if (!passwordModalMember) return;
    startTransition(async () => {
      const res = await resetMemberPasswordToDefaultAction(passwordModalMember.id);
      if (res.success) {
        showFeedback('success', res.message || 'Password reset to default (mess1234).');
        setPasswordModalMember(null);
        setNewPasswordInput('');
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to reset password.');
      }
    });
  };

  // Handle Toggle Login Access
  const handleToggleLoginAccess = async (m: MemberItem, currentEnabled: boolean) => {
    startTransition(async () => {
      const res = await toggleMemberLoginAccessAction(m.id, !currentEnabled);
      if (res.success) {
        showFeedback('success', res.message || 'Login access updated.');
        if (passwordModalMember && passwordModalMember.id === m.id) {
          setPasswordModalMember({ ...passwordModalMember, loginEnabled: !currentEnabled });
        }
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Failed to update login access.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Members &amp; Role Management</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            14 preloaded bachelor mess members, dynamic manager assignments, and role delegation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.isPrimaryAdmin && (
            <Button
              onClick={() => setChangeManagerModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Change Manager</span>
            </Button>
          )}

          <Button
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* Summary Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Permanent Primary Admin Card */}
        <div className="p-4 rounded-xl bg-linear-to-br from-amber-500/10 via-amber-50/60 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Permanent Primary Admin
            </span>
            <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
              Level 1
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{primaryAdmin?.fullName || 'Mohammad Tarek Hossen'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Permanent supreme authority. Cannot be removed, demoted or replaced by any user.
          </p>
        </div>

        {/* Current Manager Card */}
        <div className="p-4 rounded-xl bg-linear-to-br from-emerald-500/10 via-emerald-50/60 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Current Manager
            </span>
            <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
              Level 3
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{currentManager?.fullName || 'Tanvir'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Full operational authority over daily meals, bazar expenses, deposits, and closing.
          </p>
        </div>

        {/* Member Metrics Card */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Member Statuses
            </span>
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
              Total {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium mt-2">
            <span className="text-emerald-700 dark:text-emerald-400">● {activeCount} Active</span>
            <span className="text-amber-700 dark:text-amber-400">● {deactivatedCount} Deactivated</span>
            <span className="text-slate-500 dark:text-slate-400">● {archivedCount} Archived</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Members ({totalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('manager')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'manager'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Manager Management &amp; History</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'admins'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Admin Privileges ({1 + sharedAdmins.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL MEMBERS LIST */}
      {activeTab === 'members' && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
              Mess Members Directory ({members.length})
            </CardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active members appear on daily meal sheets and expense splits
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100/75 dark:bg-slate-800/80 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">#</th>
                  <th className="px-6 py-3.5">Member Name</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Room</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Opening Bal</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {members.map((m, idx) => {
                  const isDeactivated = !m.isActive && !m.isArchived;
                  const isArchived = m.isArchived;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        m.isPrimaryAdmin
                          ? 'bg-amber-50/20 dark:bg-amber-950/20'
                          : m.isManager
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/20'
                          : isDeactivated
                          ? 'bg-slate-50/70 dark:bg-slate-850/70 text-slate-400 dark:text-slate-500'
                          : isArchived
                          ? 'bg-rose-50/15 dark:bg-rose-950/15 text-slate-400 dark:text-slate-500'
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 dark:text-slate-500">{idx + 1}</td>

                      {/* Name & Role Indicators */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              m.isPrimaryAdmin
                                ? 'text-amber-950 dark:text-amber-300 font-bold'
                                : m.isManager
                                ? 'text-emerald-950 dark:text-emerald-300 font-bold'
                                : isArchived
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {m.fullName}
                          </span>
                          {m.isPrimaryAdmin && (
                            <span title="Permanent Primary Admin">
                              <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                            </span>
                          )}
                          {m.isManager && (
                            <span title="Current Mess Manager">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </span>
                          )}
                          {m.isAdmin && !m.isPrimaryAdmin && (
                            <span title="Shared Admin Privileges">
                              <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td className="px-6 py-4">
                        {m.isPrimaryAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Primary Admin
                          </span>
                        ) : m.isManager ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Manager
                          </span>
                        ) : m.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Member
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <Archive className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Archived
                          </span>
                        ) : isDeactivated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <PowerOff className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span> Active
                          </span>
                        )}
                      </td>

                      {/* Room & Contact */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">{m.roomNumber || '—'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">{m.phone}</td>
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900 dark:text-slate-100">৳{m.initialOpeningBalance}</td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ledger button */}
                          <Link
                            href={`/my-ledger?memberId=${m.id}`}
                            title="View Individual Ledger"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <BookOpenText className="w-4 h-4" />
                          </Link>

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(m)}
                            title="Edit Member"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Manage Login & Password */}
                          {(!m.isPrimaryAdmin || currentUser.isPrimaryAdmin) && (
                            <button
                              onClick={() => {
                                setPasswordModalMember(m);
                                setNewPasswordInput('');
                              }}
                              title={m.isPrimaryAdmin ? 'Change Admin Password' : 'Manage Password & Login Access'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                m.isPrimaryAdmin
                                  ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                  : 'text-slate-500 hover:text-indigo-700 hover:bg-indigo-50'
                              }`}
                            >
                              <Key className={`w-4 h-4 ${m.isPrimaryAdmin ? 'text-amber-600' : 'text-indigo-600'}`} />
                            </button>
                          )}

                          {/* Deactivate / Reactivate */}
                          {!m.isPrimaryAdmin && !m.isArchived && (
                            <>
                              {m.isActive ? (
                                <button
                                  onClick={() => setDeactivateModalMember(m)}
                                  title="Deactivate Member (Preserves past records, excludes from future meals)"
                                  disabled={m.isManager}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <PowerOff className="w-4 h-4 text-amber-600" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(m)}
                                  title="Reactivate Member for active operations"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                >
                                  <Power className="w-4 h-4 text-emerald-600" />
                                </button>
                              )}
                            </>
                          )}

                          {/* Archive (Soft delete) */}
                          {!m.isPrimaryAdmin && !m.isArchived && (
                            <button
                              onClick={() => setArchiveModalMember(m)}
                              title="Archive Member (Soft delete, historical transactions 100% preserved)"
                              disabled={m.isManager}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Archive className="w-4 h-4 text-rose-500" />
                            </button>
                          )}

                          {/* Primary Admin locked badge */}
                          {m.isPrimaryAdmin && (
                            <span
                              title="Primary Admin is permanent and cannot be deactivated or deleted"
                              className="p-1 text-amber-600"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: MANAGER MANAGEMENT & HISTORY */}
      {activeTab === 'manager' && (
        <div className="space-y-6">
          {/* Current Manager Banner */}
          <Card className="border border-emerald-200 dark:border-emerald-800 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900 shadow-2xs">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                    {currentManager?.fullName.charAt(0) || 'T'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                        Current Mess Manager
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Level 3 Authority</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {currentManager?.fullName || 'Tanvir'}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Phone: <span className="font-mono">{currentManager?.phone}</span> • Room: {currentManager?.roomNumber || 'Room 102'}
                    </p>
                  </div>
                </div>

                {currentUser.isPrimaryAdmin ? (
                  <Button
                    onClick={() => setChangeManagerModalOpen(true)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-2 shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Change Mess Manager</span>
                  </Button>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic max-w-xs bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    Only the Permanent Primary Admin (Mohammad Tarek Hossen) can change the Mess Manager.
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-200/70 dark:border-emerald-800/70 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60">
                  <span className="font-bold block text-slate-900 dark:text-slate-100">Daily Meals</span>
                  Enter &amp; update daily meal counts for all active members
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60">
                  <span className="font-bold block text-slate-900 dark:text-slate-100">Bazar Expenses</span>
                  Log groceries &amp; food expenses with personal reimbursement
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60">
                  <span className="font-bold block text-slate-900 dark:text-slate-100">Member Deposits</span>
                  Record monthly member deposits and maintain balances
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60">
                  <span className="font-bold block text-slate-900 dark:text-slate-100">Monthly Closing</span>
                  Calculate meal rates, balances, and generate final statements
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manager Assignment History */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Manager Assignment History</span>
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete audit trail of mess managers, appointed dates, and assigners
                </p>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Assigned Date</th>
                    <th className="px-6 py-3.5">Manager Appointed</th>
                    <th className="px-6 py-3.5">Appointed By</th>
                    <th className="px-6 py-3.5">Status / Ended</th>
                    <th className="px-6 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                  {managerAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                        No manager assignment history recorded yet.
                      </td>
                    </tr>
                  ) : (
                    managerAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 font-mono">{formatDate(a.assignedAt)}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{a.memberName}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{a.assignedByName}</span> (Primary Admin)
                        </td>
                        <td className="px-6 py-3.5">
                          {a.endedAt ? (
                            <span className="text-slate-500 dark:text-slate-400">Ended on {formatDate(a.endedAt)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              Currently Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                          {a.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: ADMIN PRIVILEGES & AUDIT LOG */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          {/* Admin Sharing Info & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Permanent Admin Card */}
            <Card className="border border-amber-300 dark:border-amber-800 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-slate-900 shadow-2xs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-400" /> Permanent Primary Admin
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    Level 1
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{primaryAdmin?.fullName || 'Mohammad Tarek Hossen'}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Supreme system authority. Mohammad Tarek Hossen is permanently protected and cannot be demoted, deactivated, or replaced by any user.
                </p>
                <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Immutable Security Anchor
                </div>
              </CardContent>
            </Card>

            {/* Grant Shared Admin Action */}
            <Card className="border border-indigo-200 dark:border-indigo-800 bg-linear-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 shadow-2xs">
              <CardContent className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Shared Admin Privileges
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-full">
                      Level 2
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Admin Privilege Sharing</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Primary Admin can share administrative authority with other active members. Admin privileges and Manager assignments are separate.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <span className="text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                    {sharedAdmins.length} Shared Admin(s) Active
                  </span>
                  {currentUser.isPrimaryAdmin ? (
                    <Button
                      onClick={() => setGrantAdminModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Grant Admin</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Primary Admin only</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shared Admins Table */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                Active Shared Admins ({sharedAdmins.length})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Admin Member</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Granted Date</th>
                    <th className="px-6 py-3.5">Manager Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                  {sharedAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                        No shared admins currently assigned. All admin authority resides with Mohammad Tarek Hossen.
                      </td>
                    </tr>
                  ) : (
                    sharedAdmins.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>{m.fullName}</span>
                        </td>
                        <td className="px-6 py-3.5 font-mono">{m.phone}</td>
                        <td className="px-6 py-3.5 font-mono">
                          {m.adminGrantedAt ? formatDate(m.adminGrantedAt) : 'Initial'}
                        </td>
                        <td className="px-6 py-3.5">
                          {m.isManager ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              Also Current Manager
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">Regular Member</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {currentUser.isPrimaryAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRevokeAdminModalMember(m)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs"
                            >
                              Revoke Admin
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Admin Privilege History Log */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Admin Privilege History Log</span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Date &amp; Time</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Target Member</th>
                    <th className="px-6 py-3.5">Action By</th>
                    <th className="px-6 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                  {adminLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                        No admin privilege grant/revoke logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    adminLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 font-mono">{formatDate(l.performedAt)}</td>
                        <td className="px-6 py-3.5">
                          {l.action === 'ADMIN_GRANTED' || l.action === 'GRANTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                              GRANT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                              REVOKE
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">{l.memberName}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">{l.performedByName} (Primary Admin)</td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">{l.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =======================================================
          MODALS & DIALOGS
      ======================================================= */}

      {/* 1. Add / Edit Member Modal */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {editingMember ? 'Edit Member Information' : 'Add New Mess Member'}
              </h3>
              <button onClick={() => setAddEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  disabled={editingMember?.isPrimaryAdmin}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:text-slate-500"
                />
                {editingMember?.isPrimaryAdmin && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                    Mohammad Tarek Hossen is the permanent Primary Admin and cannot be renamed.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Room 101"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@messmate.com"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Balance (৳)</label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {editingMember && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Leaving Date (Optional)</label>
                  <input
                    type="date"
                    value={leavingDate}
                    onChange={(e) => setLeavingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setAddEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPending ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Deactivate Confirmation Modal */}
      {deactivateModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <PowerOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Deactivate {deactivateModalMember.fullName}?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 text-left bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 leading-relaxed">
                  <strong>What happens when deactivated:</strong>
                  <br />• Excluded from future daily meal entry tables.
                  <br />• Prevented from new financial transactions.
                  <br />• <strong>All previous records, meal counts, deposits, and balances remain completely preserved</strong>.
                  <br />• Can be reactivated anytime by the Primary Admin.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setDeactivateModalMember(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeactivate}
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isPending ? 'Deactivating...' : 'Confirm Deactivation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Archive / Soft-Delete Confirmation Modal */}
      {archiveModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Archive {archiveModalMember.fullName}?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 text-left bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-800 leading-relaxed">
                  <strong>Soft-Deletion Notice:</strong>
                  <br />• Excludes the member from active member lists.
                  <br />• Blocks all future meal and financial entries.
                  <br />• <strong>Retains 100% of historical transactions, monthly closing snapshots, and reports</strong>.
                  <br />• Does not break any accounting calculations.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setArchiveModalMember(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleArchive}
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isPending ? 'Archiving...' : 'Confirm Archive'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Change Manager Modal */}
      {changeManagerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Appoint New Mess Manager</h3>
              </div>
              <button onClick={() => setChangeManagerModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangeManager} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p>
                  <strong>Current Manager:</strong> {currentManager?.fullName || 'Tanvir'}
                </p>
                <p>
                  When appointed, the previous manager returns to regular member status (unless they hold separate Admin privileges). All past transactions and accounting remain intact.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select New Manager (Eligible Active Members) *
                </label>
                <select
                  required
                  value={selectedNewManagerId}
                  onChange={(e) => setSelectedNewManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="" className="dark:bg-slate-900 dark:text-slate-100">-- Choose active member --</option>
                  {members
                    .filter((m) => m.isActive && !m.isArchived && !m.isPrimaryAdmin && !m.isManager)
                    .map((m) => (
                      <option key={m.id} value={m.id} className="dark:bg-slate-900 dark:text-slate-100">
                        {m.fullName} ({m.roomNumber || 'Room'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Reason / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={managerChangeNotes}
                  onChange={(e) => setManagerChangeNotes(e.target.value)}
                  placeholder="e.g. Monthly manager rotation for December 2026"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setChangeManagerModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPending ? 'Appointing...' : 'Confirm New Manager'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Grant Admin Privileges Modal */}
      {grantAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Grant Admin Privileges</h3>
              </div>
              <button onClick={() => setGrantAdminModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGrantAdmin} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                The Primary Admin (Mohammad Tarek Hossen) can share Admin privileges with any active member. Admin privileges are separate from the Manager role.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Eligible Member *
                </label>
                <select
                  required
                  value={selectedAdminMemberId}
                  onChange={(e) => setSelectedAdminMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="" className="dark:bg-slate-900 dark:text-slate-100">-- Choose active member --</option>
                  {members
                    .filter((m) => m.isActive && !m.isArchived && !m.isPrimaryAdmin && !m.isAdmin)
                    .map((m) => (
                      <option key={m.id} value={m.id} className="dark:bg-slate-900 dark:text-slate-100">
                        {m.fullName} {m.isManager ? '(Current Manager)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={grantAdminNotes}
                  onChange={(e) => setGrantAdminNotes(e.target.value)}
                  placeholder="e.g. Co-managing accounts & audits"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setGrantAdminModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isPending ? 'Granting...' : 'Grant Privileges'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Revoke Admin Confirmation Modal */}
      {revokeAdminModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Revoke Admin from {revokeAdminModalMember.fullName}?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 text-left bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-800 leading-relaxed">
                  This will remove shared administrative privileges from {revokeAdminModalMember.fullName}.
                  If they are the current Manager, their manager operational duties remain unaffected.
                </p>
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={revokeAdminNotes}
                  onChange={(e) => setRevokeAdminNotes(e.target.value)}
                  placeholder="Reason for revocation"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm outline-hidden"
                />
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setRevokeAdminModalMember(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRevokeAdmin}
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isPending ? 'Revoking...' : 'Revoke Privileges'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Member Password & Login Access Modal */}
      {passwordModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className={`w-5 h-5 ${passwordModalMember.isPrimaryAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {passwordModalMember.isPrimaryAdmin
                    ? 'অ্যাডমিন পাসওয়ার্ড পরিবর্তন (Admin Password)'
                    : 'Password & Login Access'}
                </h3>
              </div>
              <button
                onClick={() => setPasswordModalMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Member overview card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Member:</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">{passwordModalMember.fullName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Room / Phone:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {passwordModalMember.roomNumber || '—'} / {passwordModalMember.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Login Access:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      passwordModalMember.loginEnabled !== false
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {passwordModalMember.loginEnabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Set New Custom Password Form */}
              <form onSubmit={handleUpdatePassword} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {passwordModalMember.isPrimaryAdmin
                      ? 'নতুন অ্যাডমিন পাসওয়ার্ড দিন (New Admin Password)'
                      : 'Set New Password (Admin Controlled)'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder={
                        passwordModalMember.isPrimaryAdmin
                          ? 'Enter new admin password'
                          : 'Enter new password (min 4 chars)'
                      }
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button
                      type="submit"
                      disabled={isPending || newPasswordInput.trim().length < 4}
                      className={
                        passwordModalMember.isPrimaryAdmin
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shrink-0'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shrink-0'
                      }
                    >
                      {passwordModalMember.isPrimaryAdmin ? 'Save Admin Password' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {passwordModalMember.isPrimaryAdmin
                      ? 'Only Primary Admin Mohammad Tarek Hossen can change the Admin Password.'
                      : 'Only Admin can assign or change passwords. Members cannot change their own passwords.'}
                  </p>
                </div>
              </form>

              {/* Reset to Default Action - Only for regular members */}
              {!passwordModalMember.isPrimaryAdmin && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Quick Reset</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Reset password to default:{' '}
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-400 font-bold">
                        mess1234
                      </code>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetDefaultPassword}
                    disabled={isPending}
                    className="text-xs shrink-0 cursor-pointer"
                  >
                    Reset to Default
                  </Button>
                </div>
              )}

              {/* Toggle Login Access - Only for regular members */}
              {!passwordModalMember.isPrimaryAdmin && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Login Permission</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {passwordModalMember.loginEnabled !== false
                        ? 'Member can currently log in to the Member Portal.'
                        : 'Member is currently blocked from signing in.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={passwordModalMember.loginEnabled !== false ? 'destructive' : 'default'}
                    onClick={() =>
                      handleToggleLoginAccess(
                        passwordModalMember,
                        passwordModalMember.loginEnabled !== false
                      )
                    }
                    disabled={isPending || passwordModalMember.isPrimaryAdmin}
                    className="text-xs shrink-0 cursor-pointer"
                  >
                    {passwordModalMember.loginEnabled !== false ? 'Disable Login' : 'Enable Login'}
                  </Button>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordModalMember(null)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
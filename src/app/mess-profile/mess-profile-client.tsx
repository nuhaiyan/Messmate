'use client';

import React, { useState, useRef, useTransition } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Upload,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Calendar,
  Lock,
  Edit3,
  X,
  Compass,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { updateMessProfileAction } from '@/app/actions/mess-profile';

interface MessProfileClientProps {
  initialMess: {
    id: string;
    messId: string;
    name: string;
    code: string;
    address: string;
    location: string;
    contactPhone: string;
    email: string;
    description: string;
    establishedDate: string;
    logoUrl: string | null;
    coverUrl: string | null;
    managerName: string;
    activeMemberCount: number;
    createdAt: string;
  };
  isManagerOrAdmin: boolean;
  primaryAdminName: string;
}

export function MessProfileClient({
  initialMess,
  isManagerOrAdmin,
  primaryAdminName,
}: MessProfileClientProps) {
  const { t } = useI18n();
  const [mess, setMess] = useState(initialMess);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formName, setFormName] = useState(initialMess.name);
  const [formLogoUrl, setFormLogoUrl] = useState(initialMess.logoUrl || '');
  const [formCoverUrl, setFormCoverUrl] = useState(initialMess.coverUrl || '');
  const [formAddress, setFormAddress] = useState(initialMess.address);
  const [formLocation, setFormLocation] = useState(initialMess.location);
  const [formPhone, setFormPhone] = useState(initialMess.contactPhone);
  const [formEmail, setFormEmail] = useState(initialMess.email);
  const [formDescription, setFormDescription] = useState(initialMess.description);
  const [formEstablishedDate, setFormEstablishedDate] = useState(initialMess.establishedDate);

  // Upload progress states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Open Edit Modal with fresh data
  const handleOpenEdit = () => {
    setFormName(mess.name);
    setFormLogoUrl(mess.logoUrl || '');
    setFormCoverUrl(mess.coverUrl || '');
    setFormAddress(mess.address);
    setFormLocation(mess.location);
    setFormPhone(mess.contactPhone);
    setFormEmail(mess.email);
    setFormDescription(mess.description);
    setFormEstablishedDate(mess.establishedDate);
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsEditModalOpen(true);
  };

  // Upload handler helper
  const handleFileUpload = async (file: File, type: 'logo' | 'cover') => {
    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        if (type === 'logo') setFormLogoUrl(data.url);
        else setFormCoverUrl(data.url);
      } else {
        setErrorMessage(data.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload error');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingCover(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrAdmin) return;

    setSuccessMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await updateMessProfileAction({
        name: formName,
        logoUrl: formLogoUrl.trim() || null,
        coverUrl: formCoverUrl.trim() || null,
        address: formAddress.trim() || null,
        location: formLocation.trim() || null,
        contactPhone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        description: formDescription.trim() || null,
        establishedDate: formEstablishedDate || null,
      });

      if (res.success && res.profile) {
        setMess((prev) => ({
          ...prev,
          name: res.profile!.name,
          logoUrl: res.profile!.logoUrl || null,
          coverUrl: res.profile!.coverUrl || null,
          address: res.profile!.address || '',
          location: res.profile!.location || '',
          contactPhone: res.profile!.contactPhone || '',
          email: res.profile!.email || '',
          description: res.profile!.description || '',
          establishedDate: res.profile!.establishedDate || '',
        }));
        setIsEditModalOpen(false);
        setSuccessMessage('Mess Profile updated successfully. Changes applied globally.');
      } else {
        setErrorMessage(res.error || 'Failed to update mess profile.');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              Community Residence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-orange-500" />
            {t.messProfile?.title || 'Mess Profile Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Independent institutional profile for the entire mess. Separate from individual member accounts.
          </p>
        </div>

        {isManagerOrAdmin ? (
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Mess Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>View Only (Admin Managed)</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs sm:text-sm shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Hero Visual Card (Cover Image + Logo + Brand Overview) */}
      <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900 transition-all">
        {/* Cover Image banner */}
        <div className="h-48 sm:h-64 w-full bg-linear-to-r from-orange-600 via-amber-600 to-slate-900 relative overflow-hidden">
          {mess.coverUrl ? (
            <img
              src={mess.coverUrl}
              alt="Mess Cover"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-25 text-white">
              <Building2 className="w-20 h-20 mb-2" />
              <span className="text-xs font-semibold tracking-wider uppercase">Default Mess Cover</span>
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
        </div>

        {/* Profile Card Header */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden shrink-0 flex items-center justify-center relative">
              {mess.logoUrl ? (
                <img
                  src={mess.logoUrl}
                  alt={mess.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white">
                  <Building2 className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="mb-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {mess.name}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                  Verified Mess
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <span>{mess.address || 'Address not specified'}</span>
                {mess.location && (
                  <span className="opacity-80">({mess.location})</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Users className="w-4 h-4 text-orange-500" />
              <span>{mess.activeMemberCount} Active Members</span>
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs font-semibold text-orange-800 dark:text-orange-300">
              <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Manager: {mess.managerName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details Cards */}
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Mess Information
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-orange-500" /> Location
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[170px] truncate">
                  {mess.location || 'Not set'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-500" /> Contact Phone
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {mess.contactPhone || 'Not set'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-500" /> Email
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                  {mess.email || 'None'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" /> Established
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {mess.establishedDate || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Primary Admin</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{primaryAdminName}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              About the Mess
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {mess.description || 'Welcome to our shared bachelor mess community. We prioritize mutual cooperation and transparent digital accounting with automated meal rates and member ledger integrity.'}
            </p>
          </div>
        </div>

        {/* Right Column: Visual Overview & Guidelines */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Independent Mess Profile Governance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Institutional data represents the entire accommodation, not individual roommates.
                </p>
              </div>

              {isManagerOrAdmin && (
                <button
                  onClick={handleOpenEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-orange-700 dark:text-orange-400 text-xs font-semibold border border-orange-200 dark:border-orange-800 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Information</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  1. Global Application Branding
                </span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  The configured Mess Name and Logo dynamically appear on the sidebar, dashboard, navigation header, and member reports.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  2. Completely Decoupled Profiles
                </span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Updating mess information does NOT affect the Primary Admin&apos;s or any roommate&apos;s personal name, avatar, or contact details.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  3. Dedicated Database Entity
                </span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Stored permanently in the dedicated <code className="text-orange-600 dark:text-orange-400 font-mono">MessProfile</code> schema model and synced for maximum data resilience.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  4. Direct File Uploads
                </span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload new logos and high-resolution cover photos directly from your computer or phone, with instant visual preview.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MESS PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Close Button */}
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Institutional Settings
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                Edit Mess Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Update the mess name, logo, cover image, and contact details. These changes appear across the entire application.
              </p>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSave} className="space-y-5">
              {/* Row 1: Mess Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mess Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Tarek's Residence / Bashundhara Bachelor Mess"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-orange-500 transition-all"
                />
              </div>

              {/* Row 2: Logo and Cover Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Upload Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mess Logo
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {formLogoUrl ? (
                        <img src={formLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logo');
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                      </button>
                      <input
                        type="url"
                        value={formLogoUrl}
                        onChange={(e) => setFormLogoUrl(e.target.value)}
                        placeholder="Or paste URL..."
                        className="w-full px-2 py-1 rounded text-[11px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Image Upload Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cover Image
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {formCoverUrl ? (
                        <img src={formCoverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        ref={coverInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'cover');
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isUploadingCover}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isUploadingCover ? 'Uploading...' : 'Upload Cover'}</span>
                      </button>
                      <input
                        type="url"
                        value={formCoverUrl}
                        onChange={(e) => setFormCoverUrl(e.target.value)}
                        placeholder="Or paste URL..."
                        className="w-full px-2 py-1 rounded text-[11px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Address and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mess Full Address
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. Bohoddarhat, Chattogram, Bangladesh"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Location / Area
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Chattogram, Bangladesh"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>
              </div>

              {/* Row 4: Phone, Email, Establishment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="mess@example.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Established Date
                  </label>
                  <input
                    type="date"
                    value={formEstablishedDate}
                    onChange={(e) => setFormEstablishedDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>
              </div>

              {/* Row 5: Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Short Description / About the Mess
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. A comfortable shared living space for students and bachelors..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending || isUploadingLogo || isUploadingCover}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isPending ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

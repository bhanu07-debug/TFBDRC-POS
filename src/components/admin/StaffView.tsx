import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { StaffMember, StaffRole } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Shield,
  Smartphone,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  User,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X
} from 'lucide-react';

export const StaffView: React.FC = () => {
  const {
    staffList,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<StaffRole>('waiter');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility toggle per row
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCredentials = (staff: StaffMember) => {
    const text = `Username: ${staff.username}\nPassword: ${staff.password || ''}\nRole: ${staff.role.toUpperCase()}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(staff.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('waiter');
    setFormPhone('');
    setFormEmail('');
    setFormIsActive(true);
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormUsername(staff.username);
    setFormPassword(staff.password || 'buddhaadmin@123');
    setFormRole(staff.role);
    setFormPhone(staff.phone || '');
    setFormEmail(staff.email || '');
    setFormIsActive(staff.isActive !== false);
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanPassword = formPassword.trim();

    if (!cleanName) {
      setFormError('Please enter full staff name');
      return;
    }
    if (!cleanUsername) {
      setFormError('Please enter a username for sign-in');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setFormError('Password must be at least 4 characters');
      return;
    }

    // Check username uniqueness
    const duplicate = staffList.find(
      s => s.username.toLowerCase() === cleanUsername && (!editingStaff || s.id !== editingStaff.id)
    );
    if (duplicate) {
      setFormError(`Username "${cleanUsername}" is already taken by ${duplicate.name}. Choose another.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaffMember(editingStaff.id, {
          name: cleanName,
          username: cleanUsername,
          password: cleanPassword,
          role: formRole,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          isActive: formIsActive
        });
        setActionSuccessNotice(`Staff "${cleanName}" updated successfully.`);
      } else {
        await createStaffMember({
          name: cleanName,
          username: cleanUsername,
          password: cleanPassword,
          role: formRole,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          isActive: formIsActive
        });
        setActionSuccessNotice(`New staff "${cleanName}" (@${cleanUsername}) added successfully.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Error saving staff:', err);
      setFormError(err?.message || 'Could not save staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    if (deletingStaff.username === 'admin') {
      alert('The primary administrator account cannot be deleted.');
      setDeletingStaff(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteStaffMember(deletingStaff.id);
      setActionSuccessNotice(`Staff account @${deletingStaff.username} deleted.`);
      setDeletingStaff(null);
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      alert(err?.message || 'Failed to delete staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return (staffList || []).filter(staff => {
      if (roleFilter !== 'all' && staff.role !== roleFilter) return false;
      if (statusFilter === 'active' && !staff.isActive) return false;
      if (statusFilter === 'inactive' && staff.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = (staff.name || '').toLowerCase().includes(q);
        const mUser = (staff.username || '').toLowerCase().includes(q);
        const mRole = (staff.role || '').toLowerCase().includes(q);
        const mPhone = (staff.phone || '').toLowerCase().includes(q);
        if (!mName && !mUser && !mRole && !mPhone) return false;
      }

      return true;
    });
  }, [staffList, roleFilter, statusFilter, searchQuery]);

  // KPI Metrics
  const totalCount = staffList.length;
  const waitersCount = staffList.filter(s => s.role === 'waiter' && s.isActive).length;
  const cashiersCount = staffList.filter(s => (s.role === 'cashier' || s.role === 'admin') && s.isActive).length;
  const inactiveCount = staffList.filter(s => !s.isActive).length;

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'waiter':
        return {
          bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
          label: 'Floor Waiter',
          icon: Smartphone
        };
      case 'admin':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          label: 'Administrator',
          icon: Shield
        };
      case 'cashier':
        return {
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          label: 'Cashier / Billing',
          icon: KeyRound
        };
      case 'kitchen':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          label: 'Kitchen Staff',
          icon: Users
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          label: role,
          icon: User
        };
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#111827] via-[#161F30] to-[#111827] border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Staff &amp; Waiter Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage floor waiters, cashiers, and login credentials for The Fat Buddha Delight POS.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          id="btn-add-staff"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccessNotice}</span>
          </div>
          <button onClick={() => setActionSuccessNotice(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 2. Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Staff</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white font-mono">{totalCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Registered accounts</p>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Waiters</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-purple-400 font-mono">{waitersCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Floor mobile ordering enabled</p>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cashiers &amp; Admins</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-400 font-mono">{cashiersCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">POS &amp; billing access</p>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Deactivated</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-400 font-mono">{inactiveCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Access suspended</p>
        </div>
      </div>

      {/* 3. Helper Info Box: Waiter Login Instructions */}
      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-purple-200">
              Waiter Mobile Ordering Credentials
            </p>
            <p className="text-slate-400 mt-0.5">
              Default account: Username <strong className="text-white font-mono bg-purple-900/60 px-1.5 py-0.5 rounded">waiter</strong> and Password <strong className="text-white font-mono bg-purple-900/60 px-1.5 py-0.5 rounded">buddhaadmin@123</strong>. Floor staff log in from their phones to submit table orders directly to the cashier.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Search and Filters */}
      <div className="bg-[#111827] p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, phone..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="all">Role: All Roles</option>
              <option value="waiter">Role: Floor Waiters</option>
              <option value="cashier">Role: Cashiers</option>
              <option value="admin">Role: Administrators</option>
              <option value="kitchen">Role: Kitchen Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="all">Status: All Statuses</option>
              <option value="active">Status: Active Only</option>
              <option value="inactive">Status: Deactivated Only</option>
            </select>
          </div>
        </div>

        {/* 5. Staff Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Password</th>
                <th className="p-3.5">Phone / Contact</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p>No staff accounts found matching filters</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "+ Add New Staff" above to create floor waiter or cashier logins.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map(staff => {
                  const roleBadge = getRoleBadge(staff.role);
                  const RoleIcon = roleBadge.icon;
                  const isPassVisible = visiblePasswords[staff.id];
                  const isCopied = copiedId === staff.id;

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-900/60 transition group"
                    >
                      {/* Name & Initials */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-bold flex items-center justify-center text-xs">
                            {staff.name
                              .split(' ')
                              .map(p => p[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{staff.name}</span>
                            <span className="text-[10px] text-slate-500">ID: {staff.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="p-3.5 font-mono font-bold text-amber-400">
                        @{staff.username}
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleBadge.bg}`}>
                          <RoleIcon className="w-3 h-3" />
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      {/* Password with View & Copy */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">
                            {isPassVisible ? staff.password || 'buddhaadmin@123' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(staff.id)}
                            className="text-slate-500 hover:text-slate-300 transition p-1"
                            title={isPassVisible ? 'Hide password' : 'Show password'}
                          >
                            {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(staff)}
                            className="text-slate-500 hover:text-amber-400 transition p-1"
                            title="Copy credentials to clipboard"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-3.5 text-slate-400">
                        {staff.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{staff.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {staff.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {staff.username !== 'admin' && (
                            <button
                              onClick={() => setDeletingStaff(staff)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete Staff Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT STAFF MEMBER
          ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingStaff ? 'Edit Staff Account' : 'Add New Staff Member'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set role permissions and login credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Thapa"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Username & Role Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="e.g. waiter, ramesh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    System Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="waiter">Floor Waiter</option>
                    <option value="cashier">Cashier</option>
                    <option value="admin">Administrator</option>
                    <option value="kitchen">Kitchen Staff</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Enter staff password"
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Used by staff to sign in on their phone browser.
                </span>
              </div>

              {/* Phone */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="e.g. +977-9800000000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. staff@thefatbuddha.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-1 flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Account Status</span>
                  <span className="text-[11px] text-slate-400">
                    Allow this user to sign in to their mobile portal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                    formIsActive ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingStaff ? 'Update Staff' : 'Create Staff Account'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM DELETE STAFF
          ======================================================== */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Staff Account?</h3>
                <p className="text-[11px] text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800">
              Are you sure you want to delete staff account <strong>{deletingStaff.name}</strong> (@{deletingStaff.username})? They will no longer be able to log in to the POS or waiter mobile portal.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Staff</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  MessageSquare,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  UserX,
  ShieldCheck,
  Flame,
  Radio,
  Calendar,
  Sparkles,
  BarChart3,
  Trash2,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  UserProfile,
  ComplaintItem,
  DashboardStats,
  SystemErrorItem,
  AppLanguage,
} from '../types';
import {
  apiGetAdminDashboard,
  apiGetAdminUsers,
  apiUpdateUserRole,
  apiUpdateUserStatus,
  apiGetAdminComplaints,
  apiReplyComplaint,
  apiUpdateComplaintStatus,
  apiGetAdminErrors,
  apiClearAdminErrors,
} from '../utils/auth';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  language: AppLanguage;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'complaints' | 'monitoring'>('overview');

  // Stats state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<string | null>(null);

  // System Errors state
  const [systemErrors, setSystemErrors] = useState<SystemErrorItem[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);

  // Status feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initial load & polling
  useEffect(() => {
    if (isOpen) {
      loadAllData();
      // Auto refresh stats every 20 seconds while admin dashboard is open
      const timer = setInterval(() => {
        loadDashboardStats(false);
      }, 20000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // Tab switch loading
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'complaints') loadComplaints();
    if (activeTab === 'monitoring') {
      loadDashboardStats(false);
      loadErrors();
    }
  }, [activeTab, isOpen]);

  const loadAllData = async () => {
    loadDashboardStats(true);
    loadUsers();
    loadComplaints();
    loadErrors();
  };

  const loadDashboardStats = async (showLoading = true) => {
    if (showLoading) setIsLoadingStats(true);
    try {
      const data = await apiGetAdminDashboard();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      if (showLoading) setIsLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const list = await apiGetAdminUsers(userSearch, roleFilter, statusFilter);
      setUsersList(list);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadComplaints = async () => {
    setIsLoadingComplaints(true);
    try {
      const list = await apiGetAdminComplaints(complaintFilter);
      setComplaints(list);
    } catch (err: any) {
      console.error('Failed to load complaints:', err);
    } finally {
      setIsLoadingComplaints(false);
    }
  };

  const loadErrors = async () => {
    setIsLoadingErrors(true);
    try {
      const errors = await apiGetAdminErrors();
      setSystemErrors(errors);
    } catch (err: any) {
      console.error('Failed to load errors:', err);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  if (!isOpen) return null;

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await apiUpdateUserRole(user.id, newRole);
      showNotification(
        language === 'so'
          ? `Doorka ${user.name} waxaa loo beddelay ${newRole}`
          : `Role for ${user.name} updated to ${newRole}`
      );
      loadUsers();
      loadDashboardStats(false);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await apiUpdateUserStatus(user.id, newStatus);
      showNotification(
        language === 'so'
          ? `Heerka akoonka ${user.name} waa: ${newStatus}`
          : `Account status for ${user.name} is now ${newStatus}`
      );
      loadUsers();
      loadDashboardStats(false);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleSendReply = async (complaintId: string) => {
    const text = replyTextMap[complaintId];
    if (!text || !text.trim()) {
      showNotification(language === 'so' ? 'Fadlan qor jawaabta marka hore' : 'Please type a reply first', true);
      return;
    }

    setIsSubmittingReply(complaintId);
    try {
      await apiReplyComplaint(complaintId, text.trim(), 'resolved');
      showNotification(
        language === 'so'
          ? 'Jawaabta si guul leh ayaa loo diray oo cabashada waa la xaliyay!'
          : 'Reply sent successfully and complaint marked as resolved!'
      );
      setReplyTextMap((prev) => ({ ...prev, [complaintId]: '' }));
      loadComplaints();
      loadDashboardStats(false);
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmittingReply(null);
    }
  };

  const handleStatusChange = async (complaintId: string, status: 'pending' | 'in_progress' | 'resolved') => {
    try {
      await apiUpdateComplaintStatus(complaintId, status);
      showNotification(language === 'so' ? 'Heerka cabashada waa la cusbooneysiiyay' : 'Status updated');
      loadComplaints();
      loadDashboardStats(false);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleClearErrors = async () => {
    if (!confirm(language === 'so' ? 'Ma hubtaa inaad tirto dhammaan log-yada khaladaadka?' : 'Clear all system error logs?')) {
      return;
    }
    try {
      await apiClearAdminErrors();
      setSystemErrors([]);
      showNotification(language === 'so' ? 'Dhammaan khaladaadka waa la tirtiray' : 'System error logs cleared');
      loadDashboardStats(false);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#0b101d] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {language === 'so' ? 'Xarunta Maamulka SomGPT AI' : 'SomGPT AI Admin Control Center'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 uppercase tracking-widest">
                  Live Security
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'so'
                  ? `Maamulaha: ${currentUser.name} (${currentUser.email})`
                  : `Administrator: ${currentUser.name} (${currentUser.email})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAllData()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh Real-Time Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-6 py-2 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="bg-red-500/20 border-b border-red-500/40 text-red-300 px-6 py-2 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{language === 'so' ? 'Guudmar & Qiimayn (Overview)' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{language === 'so' ? 'Isticmaalayaasha (Users)' : 'Users List'}</span>
            {stats && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {stats.totalUsers}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'complaints'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{language === 'so' ? 'Cabashooyinka (Complaints)' : 'Complaints'}</span>
            {stats && stats.pendingComplaints > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                {stats.pendingComplaints}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('monitoring')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'monitoring'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{language === 'so' ? 'Kormeerka & Xogta AI (Activity)' : 'Activity Monitoring'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 6 Key Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* Total Users */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">{language === 'so' ? 'Dadka Is-diiwaangeliyay' : 'Total Users'}</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalUsers ?? '—'}</p>
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <span>+{stats?.newUsers24h ?? 0}</span>
                    <span className="text-slate-500">{language === 'so' ? '24 saac' : 'last 24h'}</span>
                  </p>
                </div>

                {/* Online Users */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">{language === 'so' ? 'Hadda Online ah' : 'Live Online'}</span>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400 tracking-tight">{stats?.onlineUsers ?? '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{language === 'so' ? 'Xilligan tooska ah' : 'Real-time ping'}</p>
                </div>

                {/* AI Active Users */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">{language === 'so' ? 'Isticmaalaya AI' : 'Active on AI'}</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400 tracking-tight">{stats?.activeAiUsers ?? '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{language === 'so' ? '10-kii daqiiqo u dambeeyay' : 'Last 10 minutes'}</p>
                </div>

                {/* Total Messages Sent */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">{language === 'so' ? 'Fariimaha la Diray' : 'Messages Sent'}</span>
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-2xl font-bold text-cyan-400 tracking-tight">{stats?.totalMessages ?? '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{language === 'so' ? 'Isu-geyn dhab ah' : 'Total real queries'}</p>
                </div>

                {/* Complaints Status */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">{language === 'so' ? 'Cabashooyinka' : 'Complaints'}</span>
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalComplaints ?? '—'}</p>
                  <p className="text-[11px] text-amber-400 mt-1">
                    {stats?.pendingComplaints ?? 0} {language === 'so' ? 'sugaya' : 'pending'}
                  </p>
                </div>

                {/* System Errors */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">{language === 'so' ? 'Cilladaha Nidaamka' : 'System Errors'}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalErrors ?? '0'}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    {stats?.totalErrors === 0 ? (language === 'so' ? 'Nidaamku wuu hufan yahay' : 'All systems normal') : (language === 'so' ? 'Log-yo jira' : 'Logged')}
                  </p>
                </div>
              </div>

              {/* Middle Section: Recent Registered Users & Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Users */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">
                        {language === 'so' ? 'Isticmaalayaashii Ugu Dambeeyay' : 'Newly Registered Users'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      {language === 'so' ? 'Eeg Dhammaan →' : 'View All →'}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                      stats.recentUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-xs text-white">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">{u.name}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(u.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-6 text-center">
                        {language === 'so' ? 'Weli ma jiraan xog' : 'No users found'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Real-time Activity Stream */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <h3 className="text-sm font-bold text-white">
                        {language === 'so' ? 'Dhaqdhaqaaqa Tooska ah ee SomGPT AI' : 'Live Real Activity Stream'}
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {language === 'so' ? 'Xog dhab ah oo laga keenay DB' : 'Real database events'}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                      stats.recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <div>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 mr-2">
                              {log.action}
                            </span>
                            <span className="text-slate-300">{log.details || log.user_email || 'Action recorded'}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-6 text-center">
                        {language === 'so' ? 'Weli ma jiro dhaqdhaqaaq la qoray' : 'No activity recorded yet'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    placeholder={language === 'so' ? 'Ku raadi magac ama email...' : 'Search by name or email...'}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                    }}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">{language === 'so' ? 'Dhammaan Doorka' : 'All Roles'}</option>
                    <option value="admin">{language === 'so' ? 'Maamulayaasha (Admin)' : 'Admin'}</option>
                    <option value="user">{language === 'so' ? 'Isticmaalayaasha (User)' : 'User'}</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                    }}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">{language === 'so' ? 'Dhammaan Xaaladaha' : 'All Status'}</option>
                    <option value="active">{language === 'so' ? 'Shaqaynaya (Active)' : 'Active'}</option>
                    <option value="suspended">{language === 'so' ? 'La Hakiyay (Suspended)' : 'Suspended'}</option>
                  </select>

                  <button
                    onClick={loadUsers}
                    className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    {language === 'so' ? 'Raadi' : 'Filter'}
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5">{language === 'so' ? 'Qofka' : 'User'}</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">{language === 'so' ? 'Doorka' : 'Role'}</th>
                        <th className="p-3.5">{language === 'so' ? 'Xaaladda' : 'Status'}</th>
                        <th className="p-3.5">{language === 'so' ? 'Diiwaangelinta' : 'Registered Date'}</th>
                        <th className="p-3.5">{language === 'so' ? 'Dhaqdhaqaaqii Ugu Dambeeyay' : 'Last Active'}</th>
                        <th className="p-3.5 text-right">{language === 'so' ? 'Ficillada' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {isLoadingUsers ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                            <span>{language === 'so' ? 'Soo kicinaya xogta...' : 'Loading users...'}</span>
                          </td>
                        </tr>
                      ) : usersList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            {language === 'so' ? 'Qofna lama helin' : 'No users match criteria'}
                          </td>
                        </tr>
                      ) : (
                        usersList.map((u) => {
                          const isOnline = Date.now() - u.last_active_at < 60000;
                          const isSelf = u.id === currentUser.id;

                          return (
                            <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="relative">
                                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-white">
                                      {u.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    {isOnline && (
                                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">{u.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{u.id}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5 font-mono text-slate-300">{u.email}</td>

                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    u.role === 'admin'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    u.status === 'active'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}
                                >
                                  {u.status === 'active' ? (language === 'so' ? 'Shaqaynaya' : 'Active') : (language === 'so' ? 'La Hakiyay' : 'Suspended')}
                                </span>
                              </td>

                              <td className="p-3.5 text-slate-400">
                                {new Date(u.created_at).toLocaleDateString()}
                              </td>

                              <td className="p-3.5 text-slate-400">
                                {isOnline ? (
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {language === 'so' ? 'Hadda Online' : 'Online now'}
                                  </span>
                                ) : (
                                  new Date(u.last_active_at).toLocaleString()
                                )}
                              </td>

                              <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                {!isSelf && (
                                  <>
                                    <button
                                      onClick={() => handleToggleRole(u)}
                                      title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleToggleStatus(u)}
                                      title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        u.status === 'active'
                                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                      }`}
                                    >
                                      {u.status === 'active' ? (
                                        <UserX className="w-3.5 h-3.5" />
                                      ) : (
                                        <UserCheck className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLAINTS MANAGEMENT */}
          {activeTab === 'complaints' && (
            <div className="space-y-4">
              {/* Complaint Filters */}
              <div className="flex items-center justify-between bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                  {['all', 'pending', 'in_progress', 'resolved'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setComplaintFilter(st);
                        setTimeout(loadComplaints, 50);
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        complaintFilter === st
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st === 'all' && (language === 'so' ? 'Dhammaan' : 'All')}
                      {st === 'pending' && (language === 'so' ? 'Sugaya' : 'Pending')}
                      {st === 'in_progress' && (language === 'so' ? 'Socda' : 'In Progress')}
                      {st === 'resolved' && (language === 'so' ? 'La Xaliyay' : 'Resolved')}
                    </button>
                  ))}
                </div>

                <button
                  onClick={loadComplaints}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{language === 'so' ? 'Dib u cusbooneysii' : 'Refresh'}</span>
                </button>
              </div>

              {/* Complaints List */}
              <div className="space-y-4">
                {isLoadingComplaints ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>{language === 'so' ? 'Soo kicinaya cabashooyinka...' : 'Loading complaints...'}</span>
                  </div>
                ) : complaints.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
                    <p className="text-xs">
                      {language === 'so' ? 'Ma jiraan wax cabasho ah oo qaybtan ku jira.' : 'No complaints found in this category.'}
                    </p>
                  </div>
                ) : (
                  complaints.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                              {c.category}
                            </span>
                            <h4 className="text-sm font-bold text-white">{c.subject}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {language === 'so' ? 'Qofka:' : 'From:'}{' '}
                            <strong className="text-slate-200">{c.user_name}</strong> ({c.user_email}) •{' '}
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>

                        {/* Status Selector */}
                        <div className="flex items-center gap-2">
                          <select
                            value={c.status}
                            onChange={(e) => handleStatusChange(c.id, e.target.value as any)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold focus:outline-none border ${
                              c.status === 'resolved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : c.status === 'in_progress'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <option value="pending">{language === 'so' ? 'Sugaya (Pending)' : 'Pending'}</option>
                            <option value="in_progress">{language === 'so' ? 'Socda (In Progress)' : 'In Progress'}</option>
                            <option value="resolved">{language === 'so' ? 'La Xaliyay (Resolved)' : 'Resolved'}</option>
                          </select>
                        </div>
                      </div>

                      {/* Complaint Content */}
                      <p className="text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                        {c.message}
                      </p>

                      {/* Existing Admin Reply */}
                      {c.admin_reply && (
                        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs space-y-1">
                          <div className="flex items-center justify-between text-cyan-300 font-semibold text-[11px]">
                            <span>{language === 'so' ? 'Jawaabtii Maamulka:' : 'Admin Reply:'} ({c.replied_by})</span>
                            <span className="text-[10px] text-cyan-400/70">
                              {c.replied_at && new Date(c.replied_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-200">{c.admin_reply}</p>
                        </div>
                      )}

                      {/* Direct Reply Form */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={replyTextMap[c.id] || ''}
                          onChange={(e) => setReplyTextMap({ ...replyTextMap, [c.id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendReply(c.id)}
                          placeholder={language === 'so' ? 'U qor jawaab toos ah qofka cabanaya...' : 'Write an official reply to the user...'}
                          className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleSendReply(c.id)}
                          disabled={isSubmittingReply === c.id}
                          className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md"
                        >
                          {isSubmittingReply === c.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>{language === 'so' ? 'U Dir Jawaab' : 'Send Reply'}</span>
                              <Send className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY MONITORING & SYSTEM LOGS */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              {/* Real Daily Activity Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">
                      {language === 'so' ? 'Dhaqdhaqaaqa Maalinlaha ah (7-dii Maalmood ee la soo dhaafay)' : 'Daily Real Activity (Last 7 Days)'}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {language === 'so' ? 'Fariimaha & Is-diiwaangelinta Dhabta ah' : 'Real Database Aggregation'}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {stats?.dailyActivity && stats.dailyActivity.map((day, idx) => {
                    const heightPercent = Math.min(100, Math.max(15, (day.messages + day.registrations) * 12));
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="w-full h-28 bg-slate-950 rounded-xl flex items-end p-1.5 border border-slate-800/80">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                          >
                            {day.messages}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-semibold text-slate-300">{day.date}</p>
                          <p className="text-[10px] text-slate-500">+{day.registrations} usr</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly & Monthly Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weekly */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'so' ? 'Dhaqdhaqaaqa Toddobaadlaha ah (4 Weeks)' : 'Weekly Activity (4 Weeks)'}</span>
                  </h4>
                  <div className="space-y-2">
                    {stats?.weeklyActivity?.map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 text-xs">
                        <span className="text-slate-300 font-medium">{w.week}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-bold">{w.queries} queries</span>
                          <span className="text-slate-500">{w.activeUsers} users</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{language === 'so' ? 'Dhaqdhaqaaqa Bishii (6 Months)' : 'Monthly Activity (6 Months)'}</span>
                  </h4>
                  <div className="space-y-2">
                    {stats?.monthlyActivity?.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 text-xs">
                        <span className="text-slate-300 font-medium">{m.month}</span>
                        <span className="text-purple-400 font-bold">{m.totalActivity} total events</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Errors and Technical Issues Log */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">
                      {language === 'so' ? 'Cilladaha Nidaamka & Khaladaadka Farsamo' : 'System Errors & Technical Issues Log'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadErrors}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {systemErrors.length > 0 && (
                      <button
                        onClick={handleClearErrors}
                        className="py-1 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{language === 'so' ? 'Nadiifi Log-yada' : 'Clear Error Logs'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 font-mono text-[11px]">
                  {systemErrors.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-1" />
                      <p>{language === 'so' ? 'Wax khalad ah lama diiwaangelin. Nidaamku wuu deggan yahay!' : 'Zero active system errors. All services healthy!'}</p>
                    </div>
                  ) : (
                    systemErrors.map((err) => (
                      <div
                        key={err.id}
                        className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-red-300 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-400">{err.endpoint}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(err.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-200">{err.error_message}</p>
                        {err.stack && (
                          <pre className="text-[9px] text-slate-500 overflow-x-auto p-1 bg-black/40 rounded mt-1">
                            {err.stack.slice(0, 300)}...
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

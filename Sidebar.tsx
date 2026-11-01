import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Compass,
  Settings,
  Info,
  Globe,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  BookOpen,
  Code2,
  SearchCheck,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { Conversation, AppLanguage, AppMode, UserProfile } from '../types';
import { translations } from '../utils/translations';
import { BrandLogo } from './BrandLogo';
import {
  Shield,
  MessageSquareWarning,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: (mode?: AppMode) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  language: AppLanguage;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenExplore: () => void;
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenComplaints: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  language,
  onOpenSettings,
  onOpenAbout,
  onOpenExplore,
  currentMode,
  onSelectMode,
  currentUser,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onOpenAdmin,
  onOpenComplaints,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Group conversations by time period
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayChats = filteredConversations.filter((c) => c.updatedAt >= todayStart);
  const yesterdayChats = filteredConversations.filter(
    (c) => c.updatedAt < todayStart && c.updatedAt >= todayStart - oneDayMs
  );
  const previous7DaysChats = filteredConversations.filter(
    (c) => c.updatedAt < todayStart - oneDayMs && c.updatedAt >= todayStart - 7 * oneDayMs
  );
  const olderChats = filteredConversations.filter((c) => c.updatedAt < todayStart - 7 * oneDayMs);

  const startRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitle(currentTitle);
  };

  const saveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t.confirmDeleteChat)) {
      onDeleteChat(id);
    }
  };

  const renderChatGroup = (title: string, chats: Conversation[]) => {
    if (chats.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </div>
        <div className="space-y-1">
          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditing = chat.id === editingChatId;

            return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/40 text-cyan-300 shadow-sm'
                    : 'hover:bg-slate-900/80 text-slate-300 hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  
                  {isEditing ? (
                    <form
                      onSubmit={(e) => saveRename(chat.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 flex-1"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        className="w-full bg-slate-950 px-2 py-0.5 rounded text-xs text-white border border-cyan-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => saveRename(chat.id, e)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <span className="truncate">{chat.title || 'Untitled Conversation'}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startRename(chat.id, chat.title, e)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      title={t.rename}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(chat.id, e)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                      title={t.delete}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <BrandLogo size="md" showText={true} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-sky-400 hover:opacity-95 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>{t.newChat}</span>
          </button>
        </div>

        {/* Quick Mode Filters */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium">
            <button
              onClick={() => {
                onSelectMode('research');
                onNewChat('research');
                if (window.innerWidth < 1024) onClose();
              }}
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-colors ${
                currentMode === 'research'
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <SearchCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{t.modes.research}</span>
            </button>

            <button
              onClick={() => {
                onSelectMode('study');
                onNewChat('study');
                if (window.innerWidth < 1024) onClose();
              }}
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-colors ${
                currentMode === 'study'
                  ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{t.modes.study}</span>
            </button>
          </div>
        </div>

        {/* Search Input for Chat History */}
        {conversations.length > 3 && (
          <div className="px-3 py-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchHistoryPlaceholder}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {conversations.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center text-slate-500 text-xs px-4">
              <MessageSquare className="w-6 h-6 stroke-1 mb-2 opacity-40" />
              <span>{t.noHistory}</span>
            </div>
          ) : (
            <>
              {renderChatGroup(t.today, todayChats)}
              {renderChatGroup(t.yesterday, yesterdayChats)}
              {renderChatGroup(t.previous7Days, previous7DaysChats)}
              {renderChatGroup(t.older, olderChats)}
            </>
          )}
        </div>

        {/* Bottom Menu Navigation */}
        <div className="p-3 border-t border-slate-800/80 space-y-1 bg-[#070b12]">
          <button
            onClick={() => {
              onOpenExplore();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{t.explore}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>{t.settings}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          <button
            onClick={() => {
              onOpenAbout();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>{t.about}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {/* User Complaints / Feedback Button */}
          <button
            onClick={() => {
              onOpenComplaints();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-amber-300/90 hover:text-amber-200 hover:bg-amber-950/20 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquareWarning className="w-4 h-4 text-amber-400" />
              <span>{language === 'so' ? 'Cabashooyinka & Taageerada' : 'Complaints & Support'}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {/* Admin Panel Button (Strictly shown only for administrators) */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                onOpenAdmin();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>{language === 'so' ? 'Dashboard-ka Maamulka' : 'Admin Dashboard'}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}

          {/* Account Profile / Auth Action Card */}
          <div className="pt-2 mt-1 border-t border-slate-800/80">
            {currentUser ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title={language === 'so' ? 'Ka bax' : 'Sign Out'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onOpenLogin();
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === 'so' ? 'Gal' : 'Sign In'}</span>
                </button>
                <button
                  onClick={() => {
                    onOpenRegister();
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-semibold text-white shadow-md transition-all"
                >
                  <span>{language === 'so' ? 'Akoon Samee' : 'Register'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

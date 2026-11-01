import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogIn,
  LogOut,
  Shield,
  MessageSquareWarning,
  ChevronDown,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { UserProfile, AppLanguage } from '../types';

interface UserMenuProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenComplaints: () => void;
  language: AppLanguage;
  compact?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onOpenAdmin,
  onOpenComplaints,
  language,
  compact = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 transition-all active:scale-95 shadow-sm"
        >
          <LogIn className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'so' ? 'Gal' : 'Sign In'}</span>
        </button>
        <button
          onClick={onOpenRegister}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition-all active:scale-95 shadow-sm shadow-cyan-500/20"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{language === 'so' ? 'Is-diiwaangeli' : 'Sign Up'}</span>
        </button>
      </div>
    );
  }

  const initials = currentUser.name.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all active:scale-95 shadow-sm"
      >
        <div className="relative">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </div>

        {!compact && (
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight max-w-[100px] truncate">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-cyan-400 font-medium leading-none flex items-center gap-1">
              {currentUser.role === 'admin' && <Shield className="w-2.5 h-2.5 text-cyan-400" />}
              {currentUser.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        )}

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#0f172a] dark:bg-[#090d16] border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn text-xs">
          {/* User Info Header */}
          <div className="px-3 py-2.5 border-b border-slate-800/80 mb-1">
            <p className="font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}
              >
                {currentUser.role === 'admin' ? 'Administrator' : 'Standard User'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>

          {/* Admin Panel Trigger (Only for admins) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAdmin();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-cyan-300 hover:bg-cyan-950/40 font-semibold transition-colors"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{language === 'so' ? 'Dashboard-ka Maamulka' : 'Admin Panel'}</span>
            </button>
          )}

          {/* User Complaints & Feedback Trigger */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              onOpenComplaints();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <MessageSquareWarning className="w-4 h-4 text-amber-400" />
            <span>{language === 'so' ? 'Cabashooyinka & Jawaabaha' : 'Complaints & Support'}</span>
          </button>

          <div className="border-t border-slate-800/80 my-1" />

          {/* Logout */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-red-400 hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>{language === 'so' ? 'Ka bax Akoonka (Sign Out)' : 'Sign Out'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

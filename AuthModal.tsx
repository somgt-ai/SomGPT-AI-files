import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Shield,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { apiLogin, apiRegister, apiForgotPassword, apiResetPassword } from '../utils/auth';
import { UserProfile, AppLanguage } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  language: AppLanguage;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  language,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password reset step
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setResetCode('');
    setResetStep(1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg(language === 'so' ? 'Fadlan geli email-kaaga iyo furahaaga.' : 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg(language === 'so' ? 'Fadlan geli magacaaga oo buuxa.' : 'Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(language === 'so' ? 'Fadlan geli email sax ah.' : 'Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg(language === 'so' ? 'Furaha sirta ah waa inuu ugu yaraan yahay 6 xaraf.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(language === 'so' ? 'Labada fure isma leha.' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRegister(name, email, password);
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg(language === 'so' ? 'Fadlan geli email-kaaga.' : 'Please enter your email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiForgotPassword(email);
      setSuccessMsg(
        language === 'so'
          ? `Koodhka xaqiijinta waa: ${res.resetCode || '123456'} (Fadlan qor koodhkan)`
          : `Recovery verification code is: ${res.resetCode || '123456'}`
      );
      if (res.resetCode) {
        setResetCode(res.resetCode);
      }
      setResetStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request reset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!resetCode.trim() || !newPassword) {
      setErrorMsg(language === 'so' ? 'Fadlan geli koodhka iyo furaha cusub.' : 'Please enter the code and new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg(language === 'so' ? 'Furaha cusub waa inuu ugu yaraan yahay 6 xaraf.' : 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await apiResetPassword(email, resetCode, newPassword);
      setSuccessMsg(
        language === 'so'
          ? 'Furahaagii si guul leh ayaa loo beddelay! Hadda waad gali kartaa.'
          : 'Password reset successfully! You can now log in.'
      );
      setTimeout(() => {
        setMode('login');
        setPassword('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('admin@somgpt.ai');
    setPassword('AdminSomGPT2026!');
    setMode('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0f172a] dark:bg-[#090d16] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" showText={false} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' && (language === 'so' ? 'Ku soo dhawoow SomGPT AI' : 'Sign in to SomGPT AI')}
            {mode === 'register' && (language === 'so' ? 'Abuur Akoon Cusub' : 'Create an Account')}
            {mode === 'forgot' && (language === 'so' ? 'Soo Celi Furaha Sirta ah' : 'Reset Your Password')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && (language === 'so' ? 'Geli email-kaaga si aad u hesho wadahadalladaada gaarka ah.' : 'Enter your credentials to access your private chat history.')}
            {mode === 'register' && (language === 'so' ? 'Is-diiwaangeli si taariikhdaada wadahadallada loo keydiyo.' : 'Sign up to keep your personal chats securely saved.')}
            {mode === 'forgot' && (language === 'so' ? 'Geli email-kaaga si laguu soo diro koodhka beddelka.' : 'Enter your email to receive a recovery verification code.')}
          </p>
        </div>

        {/* Tabs for Login / Register */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-slate-900/80 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetForm();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'so' ? 'Gal (Sign In)' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                resetForm();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'so' ? 'Is-diiwaangeli (Sign Up)' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* Alert Feedback */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {language === 'so' ? 'Email-kaaga' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tusaale@somgpt.ai"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {language === 'so' ? 'Furaha Sirta ah' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    resetForm();
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {language === 'so' ? 'Ma ilowday furaha?' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{language === 'so' ? 'Gal Akoonka' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'so' ? 'Magacaaga oo buuxa' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cali Axmed"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'so' ? 'Email-kaaga' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cali@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'so' ? 'Furaha Sirta ah (Ugu yaraan 6 xaraf)' : 'Password (min 6 chars)'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'so' ? 'Xaqiiji Furaha Sirta ah' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{language === 'so' ? 'Dhis Akoon Cusub' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FLOW */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {language === 'so' ? 'Geli Email-kaaga diiwaangashan' : 'Enter your registered email'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tusaale@somgpt.ai"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{language === 'so' ? 'Hel Koodhka Soo Celinta' : 'Get Verification Code'}</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'so' ? 'Koodhka 6-da god ah' : '6-digit Recovery Code'}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 tracking-widest text-center font-mono font-bold transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'so' ? 'Furaha Cusub' : 'New Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{language === 'so' ? 'Beddel Furaha Hadda' : 'Reset Password Now'}</span>
                  )}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetForm();
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 transition-colors"
            >
              {language === 'so' ? '← Ku noqo Galitaanka' : '← Back to Sign In'}
            </button>
          </div>
        )}

        {/* Quick Admin Test Helper Card */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {language === 'so' ? 'Akoonka Maamulka:' : 'Admin Account:'}{' '}
                <strong className="text-slate-300 font-mono">admin@somgpt.ai</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/40 transition-colors"
            >
              {language === 'so' ? 'Geli' : 'Fill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

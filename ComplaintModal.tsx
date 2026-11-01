import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquareWarning,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Inbox,
  Loader2,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { ComplaintItem, AppLanguage, UserProfile } from '../types';
import { apiSubmitComplaint, apiGetMyComplaints } from '../utils/auth';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  language: AppLanguage;
  onOpenAuth: () => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  language,
  onOpenAuth,
}) => {
  const [tab, setTab] = useState<'submit' | 'history'>('submit');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Complaints history
  const [myComplaints, setMyComplaints] = useState<ComplaintItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser && tab === 'history') {
      loadHistory();
    }
  }, [isOpen, currentUser, tab]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await apiGetMyComplaints();
      setMyComplaints(data);
    } catch (err: any) {
      console.error('Failed to load complaints history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!subject.trim()) {
      setErrorMsg(language === 'so' ? 'Fadlan qor ciwaanka cabashada.' : 'Please enter a subject.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg(language === 'so' ? 'Fadlan qor faahfaahinta cabashadaada.' : 'Please enter your message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiSubmitComplaint(subject.trim(), category, message.trim());
      setSuccessMsg(
        language === 'so'
          ? 'Cabashadaada si guul leh ayaa loo gudbiyay! Maamulka ayaa dib u eegi doona dhawaan.'
          : 'Your complaint has been submitted! Our admin team will review it shortly.'
      );
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setTab('history');
        loadHistory();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            {language === 'so' ? 'Waa la xaliyay' : 'Resolved'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3 animate-pulse" />
            {language === 'so' ? 'Gacanta ayaa lagu hayaa' : 'In Progress'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            {language === 'so' ? 'Sugaya' : 'Pending'}
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'bug':
        return language === 'so' ? 'Cilad Farsamo (Bug)' : 'Technical Bug';
      case 'feature':
        return language === 'so' ? 'Fikrad Cusub (Feature Request)' : 'Feature Request';
      case 'ai_quality':
        return language === 'so' ? 'Tayada AI (Quality Issue)' : 'AI Response Quality';
      case 'account':
        return language === 'so' ? 'Akoonka & Galitaanka' : 'Account & Access';
      default:
        return language === 'so' ? 'Arin Kale' : 'General Feedback';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-[#0f172a] dark:bg-[#090d16] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <MessageSquareWarning className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {language === 'so' ? 'Cabashooyinka & Soo Jeedinta' : 'User Complaints & Feedback'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'so'
                ? 'Gudbi cabasho ama fikrad si toos ah ugu tagaysa maamulka SomGPT AI.'
                : 'Submit complaints or feedback directly to the SomGPT AI administration.'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mb-5 border border-slate-800">
          <button
            onClick={() => setTab('submit')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'submit'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'so' ? 'Gudbi Cabasho Cusub' : 'Submit New Complaint'}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'so' ? 'Taariikhda Cabashooyinkayga' : 'My Complaints History'}
          </button>
        </div>

        {/* Content */}
        {!currentUser ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-amber-400/80 mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              {language === 'so' ? 'Fadlan marka hore gal akoonkaaga' : 'Please Sign In First'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5">
              {language === 'so'
                ? 'Si cabashadaada lagula socodsiiyo laguguna soo jawaabo, fadlan gal akoonkaaga ama is-diiwaangeli.'
                : 'To submit complaints and receive official administrator replies, please sign in or register.'}
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              {language === 'so' ? 'Gal Akoonka Hadda' : 'Sign In Now'}
            </button>
          </div>
        ) : tab === 'submit' ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {language === 'so' ? 'Nooca Cabashada' : 'Complaint Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="bug">{language === 'so' ? 'Cilad Farsamo (Bug / Error)' : 'Technical Bug / Error'}</option>
                <option value="ai_quality">{language === 'so' ? 'Tayada Jawaabaha AI (Response Quality)' : 'AI Response Quality'}</option>
                <option value="feature">{language === 'so' ? 'Fikrad ama Hawl Cusub (Feature Request)' : 'Feature Request'}</option>
                <option value="account">{language === 'so' ? 'Akoonka & Amniga (Account & Security)' : 'Account & Security'}</option>
                <option value="other">{language === 'so' ? 'Cabasho Kale (Other)' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {language === 'so' ? 'Ciwaanka Cabashada' : 'Subject'}
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={language === 'so' ? 'Tusaale: Cilad xagga abuurista sawirka ah' : 'e.g. Issue generating image'}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {language === 'so' ? 'Faahfaahinta Cabashadaada' : 'Detailed Message'}
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={language === 'so' ? 'Sharax dhibaatada aad la kulantay ama fikradda aad soo jeedinayso...' : 'Describe the problem in detail...'}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>{language === 'so' ? 'Gudbi Cabashada' : 'Submit Complaint'}</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoadingHistory ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : myComplaints.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  {language === 'so' ? 'Weli ma aadan gudbin wax cabasho ah.' : 'You have not submitted any complaints yet.'}
                </p>
              </div>
            ) : (
              myComplaints.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                        {getCategoryLabel(item.category)}
                      </span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{item.subject}</h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    {item.message}
                  </p>

                  {/* Admin Reply */}
                  {item.admin_reply && (
                    <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-br from-cyan-950/40 to-blue-950/40 border border-cyan-800/50 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{language === 'so' ? 'Jawaabta Maamulka SomGPT AI:' : 'Official Admin Reply:'}</span>
                      </div>
                      <p className="text-xs text-slate-200">{item.admin_reply}</p>
                      {item.replied_at && (
                        <p className="text-[10px] text-cyan-400/80">
                          {new Date(item.replied_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

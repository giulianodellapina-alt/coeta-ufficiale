import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, XCircle, AlertOctagon, Loader2, X, ShieldAlert, Send } from 'lucide-react';

export interface EmailFeedbackState {
  isOpen: boolean;
  status: 'sending' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  successes?: string[];
  errors?: string[];
  log?: string[];
}

interface EmailFeedbackModalProps {
  state: EmailFeedbackState | null;
  onClose: () => void;
}

export const EmailFeedbackModal: React.FC<EmailFeedbackModalProps> = ({ state, onClose }) => {
  if (!state || !state.isOpen) return null;

  const getStatusColor = () => {
    switch (state.status) {
      case 'sending': return 'border-amber-500/30 text-amber-400 bg-amber-500/5';
      case 'success': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
      case 'warning': return 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5';
      case 'error': return 'border-rose-500/30 text-rose-400 bg-rose-500/5';
      default: return 'border-slate-700 text-slate-300';
    }
  };

  const getIcon = () => {
    switch (state.status) {
      case 'sending':
        return <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-10 w-10 text-emerald-400" />;
      case 'warning':
        return <AlertOctagon className="h-10 w-10 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-10 w-10 text-rose-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div id="email-feedback-overlay" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`relative bg-slate-950 border-2 ${getStatusColor().split(' ')[0]} rounded-[2rem] p-6 md:p-8 max-w-lg w-full shadow-2xl overflow-hidden`}
        >
          {/* Top Banner Accent Decors */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-20" />

          {/* Close button if not sending */}
          {state.status !== 'sending' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 p-2 rounded-full transition-all hover:scale-105"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="flex flex-col items-center space-y-6 text-center">
            {/* Round Badge */}
            <div className={`p-4 rounded-full border ${getStatusColor().split(' ')[0]} ${getStatusColor().split(' ')[2] || 'bg-slate-900'}`}>
              {getIcon()}
            </div>

            {/* Title / Description */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-white uppercase italic">
                {state.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                {state.message}
              </p>
            </div>

            {/* Granular delivery lists */}
            {(state.successes && state.successes.length > 0) || (state.errors && state.errors.length > 0) ? (
              <div className="w-full space-y-4 pt-2 text-left">
                {state.successes && state.successes.length > 0 && (
                  <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wide">
                      <Send className="h-3 w-3" /> E-mail Inviate con Successo:
                    </span>
                    <ul className="space-y-1">
                      {state.successes.map((email, idx) => (
                        <li key={idx} className="text-xs text-emerald-300 font-mono break-all flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {state.errors && state.errors.length > 0 && (
                  <div className="bg-rose-950/10 border border-rose-900/30 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-2 uppercase tracking-wide">
                      <ShieldAlert className="h-3.5 w-3.5" /> Blocchi, Errori o Rifiuti:
                    </span>
                    <ul className="space-y-1">
                      {state.errors.map((err, idx) => (
                        <li key={idx} className="text-xs text-rose-300 font-mono break-all flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                          <span>{err}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* Execution logs style (informative, great for sending state) */}
            {state.log && state.log.length > 0 && (
              <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Monitor Trasmissione:</span>
                <div className="space-y-1 max-h-[80px] overflow-y-auto font-mono text-[10px] text-slate-400 scrollbar-thin">
                  {state.log.map((logLine, idx) => (
                    <div key={idx} className={`flex items-start gap-1 ${idx === state.log!.length - 1 ? 'text-amber-300 animate-pulse' : ''}`}>
                      <span>&gt;</span>
                      <span>{logLine}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {state.status !== 'sending' && (
              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold uppercase tracking-wider text-xs shadow-lg hover:text-white active:scale-98 transition-all"
                >
                  Chiudi Monitor
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    componentStack: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const msg = String(error?.message || error || "");
    if (msg.includes("FIRESTORE") || msg.includes("INTERNAL ASSERTION") || msg.includes("Unexpected state")) {
      console.warn("Isolato errore interno Firestore in ErrorBoundary ed evitato blocco dell app:", error);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack || null });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 text-center">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/40 p-6 md:p-8 rounded-3xl shadow-2xl">
            <h1 className="text-2xl font-black text-red-500 uppercase tracking-tighter mb-2 italic">Anomalia Critica</h1>
            <p className="text-sm text-slate-400 mb-4 font-mono leading-relaxed">
              Il sistema ha riscontrato un errore nel rendering dell interfaccia.
            </p>
            <div className="bg-black/70 p-4 rounded-xl mb-4 text-left overflow-auto max-h-56 border border-slate-800">
               <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                 {this.state.error?.name}: {this.state.error?.message}
               </pre>
               {this.state.error?.stack && (
                 <pre className="text-[10px] text-slate-400 font-mono mt-2 whitespace-pre-wrap border-t border-slate-800 pt-2">
                   {this.state.error.stack}
                 </pre>
               )}
               {this.state.componentStack && (
                 <pre className="text-[10px] text-amber-400 font-mono mt-2 whitespace-pre-wrap border-t border-slate-800 pt-2">
                   {this.state.componentStack}
                 </pre>
               )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg"
              >
                Riprova Rendering
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch (e) {
                    console.warn("localStorage.clear failed inside ErrorBoundary", e);
                  }
                  window.location.reload();
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-900/40"
              >
                Reset Sessione e Ricarica
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

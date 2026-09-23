import React, { useState } from "react";
import { Shield, KeyRound, ArrowRight, UserCheck, Smartphone, Users, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { EkoclubLogo } from "./EkoclubLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Guard } from "../types";

interface LoginScreenProps {
  matricolaInput: string;
  setMatricolaInput: (val: string) => void;
  onLogin: (matricola: string) => void;
  guards: Guard[];
  loginError: string;
  loading: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  matricolaInput,
  setMatricolaInput,
  onLogin,
  guards,
  loginError,
  loading,
}) => {
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matricolaInput.trim()) {
      onLogin(matricolaInput.trim().toUpperCase());
    }
  };

  const handleSelectGuard = (guard: Guard) => {
    const mat = (guard.matricola || "").replace(/\s+/g, "").toUpperCase();
    setMatricolaInput(mat);
    onLogin(mat);
  };

  // Filtra guardie per ricerca rapida
  const filteredGuards = guards.filter((g) => {
    const query = searchFilter.toLowerCase();
    const name = `${g.name || ""} ${g.surname || ""}`.toLowerCase();
    const mat = (g.matricola || "").toLowerCase();
    const role = (g.role || "").toLowerCase();
    return name.includes(query) || mat.includes(query) || role.includes(query);
  });

  return (
    <div className="min-h-screen w-full bg-[#0b1329] bg-gradient-to-b from-[#0f172a] via-[#0b1329] to-[#020617] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-y-auto">
      {/* Sfondo decorativo con effetto radar discreto */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* LOGO & INTESTAZIONE UFFICIALE */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/95 p-2 shadow-2xl shadow-blue-500/20 border-2 border-yellow-400/80 flex items-center justify-center">
              <EkoclubLogo className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-blue-600 border-2 border-slate-900 rounded-full p-1.5 shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
              C.O.E.T.A.
            </h1>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-blue-300">
              Centrale Operativa Ekoclub Tutela Animali
            </p>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">
              Nucleo Guardie Giurate Volontarie • Attilio Bertolucci
            </p>
          </div>
        </div>

        {/* BOX INSERIMENTO MATRICOLA */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="border-b border-slate-700/60 pb-3 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-300 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              <KeyRound className="w-3.5 h-3.5 text-yellow-400" />
              Accesso con Matricola di Servizio
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="matricola-input" className="block text-xs font-medium text-slate-300">
                Numero di Matricola Operativa:
              </label>
              <div className="relative">
                <Input
                  id="matricola-input"
                  type="text"
                  placeholder="Es. DPG917, BA906, FC918..."
                  value={matricolaInput}
                  onChange={(e) => setMatricolaInput(e.target.value.toUpperCase())}
                  autoFocus
                  disabled={loading}
                  className="bg-slate-900/90 border-slate-600 text-white placeholder:text-slate-500 uppercase tracking-widest font-mono text-center text-lg sm:text-xl font-bold h-13 rounded-2xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-950/60 border border-red-500/60 rounded-2xl p-3 text-red-200 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">{loginError}</div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !matricolaInput.trim()}
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span>Verifica in corso...</span>
              ) : (
                <>
                  <span>Accedi al Servizio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* SIMULAZIONE / ACCESSO RAPIDO GUARDIE */}
          <div className="pt-2 border-t border-slate-700/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowQuickSelect(!showQuickSelect)}
              className="w-full text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl py-2 flex items-center justify-between font-normal"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Simulatore / Seleziona Guardia dal Ruolo</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showQuickSelect ? "rotate-180" : ""}`} />
            </Button>

            {showQuickSelect && (
              <div className="mt-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 space-y-2 max-h-64 overflow-y-auto">
                <Input
                  type="text"
                  placeholder="Cerca nome o matricola..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-8 text-xs bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 rounded-lg mb-2"
                />

                <div className="space-y-1.5">
                  {filteredGuards.length === 0 ? (
                    <div className="text-center py-3 text-slate-400 text-xs">
                      Nessun nominativo trovato.
                    </div>
                  ) : (
                    filteredGuards.map((g) => {
                      const isAdm = g.role === "admin";
                      const isResp = g.role === "responsabile";
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelectGuard(g)}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-400 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-white group-hover:text-blue-200 truncate">
                              {g.surname ? `${g.surname} ${g.name}` : g.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Matr: <strong className="text-yellow-400">{g.matricola || "N/D"}</strong></span>
                              {g.phone && <span className="text-[10px] text-slate-500">• {g.phone}</span>}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {isAdm ? (
                              <Badge className="bg-red-950/80 text-red-300 border-red-700/60 text-[9px] uppercase font-bold">
                                Admin
                              </Badge>
                            ) : isResp ? (
                              <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 text-[9px] uppercase font-bold">
                                Resp.
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-[9px] uppercase">
                                Guardia
                              </Badge>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-300 ml-1" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NOTA OPERATIVA INFORMATIVA */}
        <div className="text-center text-[11px] text-slate-400 px-4 space-y-1">
          <p className="flex items-center justify-center gap-1.5 text-slate-300">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compatibile con tutti i dispositivi mobili e cellulari di servizio.</span>
          </p>
          <p className="text-slate-500 text-[10px]">
            In caso di smarrimento credenziali o nuova matricola, rivolgiti alla Direzione Operativa.
          </p>
        </div>
      </div>
    </div>
  );
};

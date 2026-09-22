import React, { useState } from "react";
import { 
  Scale, 
  BookOpenText, 
  MapPin, 
  ShieldAlert,
  Fish,
  Trees,
  AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";

export interface VerbalisticaSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSector: string;
  onSelectSopralluogo: () => void;
  onSelectServiceReport: (sector?: string) => void;
  onSelectTerritoryControl: () => void;
  onSelectSanzione: (sector?: string) => void;
  onSelectRapidReport?: () => void;
}

export const VerbalisticaSelectorDialog: React.FC<VerbalisticaSelectorDialogProps> = ({
  open,
  onOpenChange,
  activeSector,
  onSelectSopralluogo,
  onSelectServiceReport,
  onSelectTerritoryControl,
  onSelectSanzione,
  onSelectRapidReport,
}) => {
  const [currentSector, setCurrentSector] = useState<string>(activeSector || "zoofila");

  // Keep synced if activeSector prop changes
  React.useEffect(() => {
    if (activeSector) {
      setCurrentSector(activeSector);
    }
  }, [activeSector]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden max-w-[98vw] w-full md:max-w-4xl max-h-[92vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl">
        <DialogHeader className="p-5 md:p-6 border-b border-slate-800 bg-slate-950/80 shrink-0 flex flex-col gap-4">
          <div className="flex flex-row justify-between items-center">
            <div>
              <DialogTitle className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="h-6 w-6 text-amber-400" />
                Operatività Vigilanza & Modulistica
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                Seleziona il settore d'intervento: verranno mostrati esclusivamente gli atti e verbali autorizzati per quella specialità.
              </DialogDescription>
            </div>
          </div>

          {/* PULSANTIERA SETTORI (ZOOFILA / ITTICA / VENATORIA / AMBIENTE) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentSector("zoofila")}
              className={cn(
                "py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                currentSector === "zoofila"
                  ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30 scale-[1.02]"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <span>🐾</span>
              <span>Zoofila</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSector("ittica")}
              className={cn(
                "py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                currentSector === "ittica"
                  ? "bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/30 scale-[1.02]"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <Fish className="h-4 w-4" />
              <span>Ittica</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSector("venatoria")}
              className={cn(
                "py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                currentSector === "venatoria"
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <span>🦅</span>
              <span>Venatoria</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSector("ambiente")}
              className={cn(
                "py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                currentSector === "ambiente"
                  ? "bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/30 scale-[1.02]"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <Trees className="h-4 w-4" />
              <span>Ambiente</span>
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar bg-slate-950/40">
          
          {/* ================= SETTORE ZOOFILO ================= */}
          {currentSector === "zoofila" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-black text-purple-400">
                  Modulistica Operativa: Settore Zoofilo (Benessere Animale & Cani)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">4 Moduli Disponibili</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. VERBALE DI SOPRALLUOGO */}
                <button
                  type="button"
                  onClick={onSelectSopralluogo}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-purple-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-all">
                    <Scale className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-purple-400 transition-colors">
                      Verbale di Sopralluogo
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      1° e 2° Controllo ad horas, verifica prescrizioni benessere animale e foto fascicolo unico.
                    </p>
                  </div>
                </button>

                {/* 2. VERBALE SANZIONATORIO ZOOFILO */}
                <button
                  type="button"
                  onClick={() => onSelectSanzione("zoofila")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-rose-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-all">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-rose-400 transition-colors">
                      Verbale Sanzionatorio (L.R. 59/09)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Violazioni anagrafe canina, custodia cani, malgoverno e regolamenti comunali (L. 689/81).
                    </p>
                  </div>
                </button>

                {/* 3. RELAZIONE DI SERVIZIO ZOOFILA */}
                <button
                  type="button"
                  onClick={() => onSelectServiceReport("zoofila")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-emerald-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-all">
                    <BookOpenText className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-emerald-400 transition-colors">
                      Relazione di Servizio
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Rapporto ufficiale del turno di vigilanza zoofila: orari pattuglia, itinerario ed esito controlli.
                    </p>
                  </div>
                </button>

                {/* 4. CONTROLLO RAPIDO TERRITORIO & CANI */}
                <button
                  type="button"
                  onClick={onSelectTerritoryControl}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-amber-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-all">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-amber-400 transition-colors">
                      Registro Controlli Territoriali
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Stampa A4 Landscape stile Excel con memorizzazione immediata dei microchip in anagrafe canina.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ================= SETTORE ITTICO ================= */}
          {currentSector === "ittica" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-black text-cyan-400">
                  Modulistica Operativa: Settore Ittico (Acque Interne & Pesca)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">2 Moduli Autorizzati</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. RELAZIONE DI SERVIZIO ITTICA */}
                <button
                  type="button"
                  onClick={() => onSelectServiceReport("ittica")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-cyan-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-all">
                    <BookOpenText className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-cyan-400 transition-colors">
                      Relazione di Servizio Ittica
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Verifica corsi d'acqua, fiumi (Frigido, Carrione), canali, pescatori presenti, licenze e concessioni.
                    </p>
                  </div>
                </button>

                {/* 2. VERBALE SANZIONATORIO ITTICO */}
                <button
                  type="button"
                  onClick={() => onSelectSanzione("ittica")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-rose-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-all">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-rose-400 transition-colors">
                      Verbale Sanzionatorio Ittico
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Sanzioni per pesca in acque di divieto, mancanza licenza, attrezzi non consentiti (R.D. 1604/1931).
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 italic bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                ℹ️ Nel settore Ittico sono esclusi i verbali di sopralluogo canino e i censimenti microchip.
              </p>
            </div>
          )}

          {/* ================= SETTORE VENATORIO ================= */}
          {currentSector === "venatoria" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-black text-emerald-400">
                  Modulistica Operativa: Settore Venatorio (Caccia & Fauna Selvatica)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">2 Moduli Autorizzati</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. RELAZIONE DI SERVIZIO VENATORIA */}
                <button
                  type="button"
                  onClick={() => onSelectServiceReport("venatoria")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-emerald-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-all">
                    <BookOpenText className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-emerald-400 transition-colors">
                      Relazione di Servizio Venatoria
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Controllo zone ATC, tesserini venatori regionali, porto d'armi per uso caccia e rispetto orari di sparo.
                    </p>
                  </div>
                </button>

                {/* 2. VERBALE SANZIONATORIO VENATORIO */}
                <button
                  type="button"
                  onClick={() => onSelectSanzione("venatoria")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-rose-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-all">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-rose-400 transition-colors">
                      Verbale Sanzionatorio Caccia
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Violazioni alla L. 157/1992 e L.R. Toscana 3/1994 (distanze da strade/abitazioni, mancata segnatura capi).
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 italic bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                ℹ️ Nel settore Venatorio sono esclusi i verbali di sopralluogo canino per privati e colonie.
              </p>
            </div>
          )}

          {/* ================= SETTORE AMBIENTALE ================= */}
          {currentSector === "ambiente" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-black text-amber-400">
                  Modulistica Operativa: Settore Ambiente (Rifiuti & Territorio)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">3 Moduli Disponibili</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. SEGNALAZIONE AMBIENTALE RAPIDA */}
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectRapidReport) onSelectRapidReport();
                  }}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-amber-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-all">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-amber-400 transition-colors">
                      Segnalazione Rapida
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Rilevamento immediato con foto e GPS di discariche abusive, rifiuti e scarichi inquinanti.
                    </p>
                  </div>
                </button>

                {/* 2. RELAZIONE DI SERVIZIO AMBIENTALE */}
                <button
                  type="button"
                  onClick={() => onSelectServiceReport("ambiente")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-emerald-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-all">
                    <BookOpenText className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-emerald-400 transition-colors">
                      Relazione di Servizio
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Rapporto di turno su parchi, riserve naturali, alvei fluviali e aree di tutela paesaggistica.
                    </p>
                  </div>
                </button>

                {/* 3. VERBALE SANZIONATORIO AMBIENTE */}
                <button
                  type="button"
                  onClick={() => onSelectSanzione("ambiente")}
                  className="group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-rose-500/40 text-white rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 shadow-xl cursor-pointer text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-all">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-rose-400 transition-colors">
                      Verbale Sanzione D.Lgs. 152/06
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Abbandono di rifiuti non pericolosi sul suolo e violazioni alle ordinanze sindacali sui conferimenti.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white uppercase tracking-wider text-xs font-semibold"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


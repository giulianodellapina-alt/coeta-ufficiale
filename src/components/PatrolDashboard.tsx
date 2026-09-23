import React, { useState } from "react";
import { 
  FileText, 
  MapPin, 
  FolderArchive, 
  AlertTriangle, 
  Shield, 
  Calendar as CalendarIcon, 
  Navigation, 
  FileSpreadsheet, 
  ChevronRight,
  CheckCircle2,
  RotateCw,
  PawPrint,
  Clock,
  Scale,
  Fish,
  Trees,
  Lock
} from "lucide-react";
import { Guard } from "../types";
import { cn } from "../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PatrolDashboardProps {
  currentGuard: Guard | null;
  guardPrivateInfo: any;
  activeSector: string;
  onSelectSector: (sector: string) => void;
  isSectorAllowed?: (sector: string) => boolean;
  onOpenSopralluogo: () => void;
  onOpenVerbaleSanzione?: () => void;
  onOpenRelazione: () => void;
  onOpenControlliTerritorio: () => void;
  onOpenArchivioSopralluoghi: () => void;
  onOpenMicrochipArchive?: () => void;
  onOpenSos: () => void;
  isTracking: boolean;
  onToggleGps: () => void;
  renderCalendar: () => React.ReactNode;
  pendingCount?: number;
  onOpenPendingDocuments?: () => void;
}

export const PatrolDashboard: React.FC<PatrolDashboardProps> = ({
  currentGuard,
  guardPrivateInfo,
  activeSector,
  onSelectSector,
  isSectorAllowed,
  onOpenSopralluogo,
  onOpenVerbaleSanzione,
  onOpenRelazione,
  onOpenControlliTerritorio,
  onOpenArchivioSopralluoghi,
  onOpenMicrochipArchive,
  onOpenSos,
  isTracking,
  onToggleGps,
  renderCalendar,
  pendingCount = 0,
  onOpenPendingDocuments
}) => {
  const [isTesserinoModalOpen, setIsTesserinoModalOpen] = useState(false);
  // Stato per alternare fronte e retro
  const [tesserinoSide, setTesserinoSide] = useState<"front" | "back">("front");

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 font-normal">
      {/* BANNER DOCUMENTI OFFLINE IN ATTESA DI TRASMISSIONE */}
      {pendingCount > 0 && (
        <div 
          onClick={onOpenPendingDocuments}
          className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/40 hover:border-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 cursor-pointer hover:bg-amber-500/15 transition-all shadow-lg animate-pulse"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <span>📡 {pendingCount} {pendingCount === 1 ? "Atto Memorizzato Offline" : "Atti Memorizzati Offline"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-500/40">In attesa di segnale</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Redatto in assenza di rete. Verrà trasmesso e inviato via email automaticamente non appena si ristabilisce la connessione.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shrink-0 transition-all self-end sm:self-auto cursor-pointer"
          >
            Gestisci Coda / Invia
          </button>
        </div>
      )}

      {/* SELETTORE RAPIDO SETTORE OPERATIVO (FILTRATO PER QUALIFICHE GUARDIA) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🎯</span> Settore Operativo in Servizio:
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
              {activeSector.toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Seleziona la materia del controllo/atto
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* ZOOFILA */}
          {(() => {
            const allowed = isSectorAllowed ? isSectorAllowed("zoofila") : true;
            return (
              <button
                type="button"
                disabled={!allowed}
                onClick={() => allowed && onSelectSector("zoofila")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                  activeSector === "zoofila"
                    ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-950/60 ring-2 ring-purple-400/50 scale-[1.02]"
                    : allowed
                    ? "bg-slate-950/80 border-slate-800 text-purple-300 hover:bg-purple-950/40 hover:border-purple-700/60 cursor-pointer"
                    : "bg-slate-950/30 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                )}
                title={allowed ? "Passa a Settore Zoofilo" : "Non abilitato per il tuo decreto"}
              >
                <span className="text-base">🐾</span>
                <span>Zoofila</span>
                {!allowed && <Lock className="w-3 h-3 text-slate-600 ml-auto" />}
              </button>
            );
          })()}

          {/* ITTICA */}
          {(() => {
            const allowed = isSectorAllowed ? isSectorAllowed("ittica") : true;
            return (
              <button
                type="button"
                disabled={!allowed}
                onClick={() => allowed && onSelectSector("ittica")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                  activeSector === "ittica"
                    ? "bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-400/50 scale-[1.02]"
                    : allowed
                    ? "bg-slate-950/80 border-slate-800 text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-700/60 cursor-pointer"
                    : "bg-slate-950/30 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                )}
                title={allowed ? "Passa a Settore Ittico" : "Non abilitato per il tuo decreto"}
              >
                <Fish className="w-4 h-4 text-cyan-300" />
                <span>Ittica</span>
                {!allowed && <Lock className="w-3 h-3 text-slate-600 ml-auto" />}
              </button>
            );
          })()}

          {/* VENATORIA */}
          {(() => {
            const allowed = isSectorAllowed ? isSectorAllowed("venatoria") : true;
            return (
              <button
                type="button"
                disabled={!allowed}
                onClick={() => allowed && onSelectSector("venatoria")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                  activeSector === "venatoria"
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/50 scale-[1.02]"
                    : allowed
                    ? "bg-slate-950/80 border-slate-800 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-700/60 cursor-pointer"
                    : "bg-slate-950/30 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                )}
                title={allowed ? "Passa a Settore Venatorio" : "Non abilitato per il tuo decreto"}
              >
                <span className="text-base">🦅</span>
                <span>Venatoria</span>
                {!allowed && <Lock className="w-3 h-3 text-slate-600 ml-auto" />}
              </button>
            );
          })()}

          {/* AMBIENTALE */}
          {(() => {
            const allowed = isSectorAllowed ? isSectorAllowed("ambientale") : true;
            return (
              <button
                type="button"
                disabled={!allowed}
                onClick={() => allowed && onSelectSector("ambientale")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                  activeSector === "ambientale"
                    ? "bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-950/60 ring-2 ring-amber-400/50 scale-[1.02]"
                    : allowed
                    ? "bg-slate-950/80 border-slate-800 text-amber-300 hover:bg-amber-950/40 hover:border-amber-700/60 cursor-pointer"
                    : "bg-slate-950/30 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                )}
                title={allowed ? "Passa a Settore Ambientale" : "Non abilitato per il tuo decreto"}
              >
                <Trees className="w-4 h-4 text-amber-300" />
                <span>Ambiente</span>
                {!allowed && <Lock className="w-3 h-3 text-slate-600 ml-auto" />}
              </button>
            );
          })()}
        </div>
      </div>

      {/* GRIGLIA PULSANTI OPERATIVI SUL CAMPO */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-normal uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span>⚡</span> Cruscotto operativo sul campo (Tocca un pulsante per aprire)
          </h3>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/60 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Aggiorna e ricarica i dati all'ultima versione"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Aggiorna Dati</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. IL MIO TESSERINO */}
          <button
            type="button"
            onClick={() => {
              setTesserinoSide("front");
              setIsTesserinoModalOpen(true);
            }}
            className="group p-5 rounded-3xl bg-slate-800/70 border border-blue-400/30 hover:border-blue-300 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              <Shield className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase group-hover:text-blue-100">
                  Il mio tesserino
                </h4>
                <ChevronRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                Visualizzazione integrale fronte e retro.
              </p>
            </div>
          </button>

          {/* 2. VERBALE DI SOPRALLUOGO */}
          <button
            type="button"
            onClick={onOpenSopralluogo}
            className="group p-5 rounded-3xl bg-slate-800/70 border border-purple-400/30 hover:border-purple-300 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase group-hover:text-purple-100 flex items-center gap-2">
                  <span>Verbale sopralluogo</span>
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.2 rounded font-mono">
                    {activeSector.toUpperCase()}
                  </span>
                </h4>
                <ChevronRight className="w-5 h-5 text-purple-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                {activeSector === "zoofila"
                  ? "1° e 2° Sopralluogo con prescrizioni e foto per benessere animale."
                  : activeSector === "ittica"
                  ? "Sopralluogo acque interne e controlli sponde fluviali."
                  : activeSector === "venatoria"
                  ? "Accertamento sul territorio, appostamenti fissi e temporanei."
                  : "Accertamento e sopralluogo ambientale e rifiuti."}
              </p>
            </div>
          </button>

          {/* 2b. VERBALE SANZIONATORIO */}
          {onOpenVerbaleSanzione && (
            <button
              type="button"
              onClick={onOpenVerbaleSanzione}
              className="group p-5 rounded-3xl bg-slate-800/70 border border-rose-500/40 hover:border-rose-400 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
                <Scale className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-normal text-white uppercase group-hover:text-rose-100 flex items-center gap-2">
                    <span>Verbale sanzionatorio</span>
                    <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-700 px-1.5 py-0.2 rounded font-mono">
                      {activeSector.toUpperCase()}
                    </span>
                  </h4>
                  <ChevronRight className="w-5 h-5 text-rose-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-normal">
                  {activeSector === "ittica"
                    ? "Contestazione illeciti pesca nelle acque interne (R.D. 1604/1931)."
                    : activeSector === "venatoria"
                    ? "Contestazione illeciti caccia e fauna selvatica (L. 157/1992)."
                    : activeSector === "ambientale"
                    ? "Violazioni abbandono rifiuti e tutela ambientale."
                    : "Contestazione illeciti tutela animale e anagrafe canina (L.R. 59/09)."}
                </p>
              </div>
            </button>
          )}

          {/* 3. RAPPORTO DI SERVIZIO */}
          <button
            type="button"
            onClick={onOpenRelazione}
            className="group p-5 rounded-3xl bg-slate-800/70 border border-emerald-400/30 hover:border-emerald-300 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-200 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase group-hover:text-emerald-100 flex items-center gap-2">
                  <span>Rapporto di servizio</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-mono">
                    {activeSector.toUpperCase()}
                  </span>
                </h4>
                <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                Relazione analitica e riepilogo operativo del turno di servizio.
              </p>
            </div>
          </button>

          {/* 4. CONTROLLI SUL TERRITORIO */}
          <button
            type="button"
            onClick={onOpenControlliTerritorio}
            className="group p-5 rounded-3xl bg-slate-800/70 border border-cyan-400/30 hover:border-cyan-300 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-200 shrink-0 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase group-hover:text-cyan-100">
                  Controlli territorio
                </h4>
                <ChevronRight className="w-5 h-5 text-cyan-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                Registro microchip cani, molo e passeggiata.
              </p>
            </div>
          </button>

          {/* 5. ATTIVAZIONE GPS */}
          <button
            type="button"
            onClick={onToggleGps}
            className={cn(
              "group p-5 rounded-3xl border text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer",
              isTracking
                ? "bg-slate-800/80 border-emerald-400/60 text-emerald-200"
                : "bg-slate-800/70 border-slate-700/60 hover:border-slate-500 text-slate-300"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all shadow-sm",
              isTracking
                ? "bg-emerald-600 border-emerald-400 text-white animate-pulse"
                : "bg-slate-700/60 border-slate-600 text-slate-300 group-hover:text-white"
            )}>
              <Navigation className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase">
                  Attivazione GPS
                </h4>
                <span className={cn(
                  "text-[10px] font-normal uppercase px-2 py-0.5 rounded-full border",
                  isTracking
                    ? "bg-emerald-950/80 text-emerald-200 border-emerald-400/50"
                    : "bg-slate-900 text-slate-400 border-slate-700"
                )}>
                  {isTracking ? "ATTIVO ON" : "SPENTO OFF"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                {isTracking ? "Posizione trasmessa in tempo reale al Radar." : "Tocca per avviare la geolocalizzazione."}
              </p>
            </div>
          </button>

          {/* 6. CONTROLLO ARCHIVIO */}
          <button
            type="button"
            onClick={onOpenArchivioSopralluoghi}
            className="group p-5 rounded-3xl bg-slate-800/70 border border-indigo-400/30 hover:border-indigo-300 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-200 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <FolderArchive className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase group-hover:text-indigo-100">
                  Controllo archivio
                </h4>
                <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                Verbali precedenti, storico e fascicoli aperti.
              </p>
            </div>
          </button>

          {/* 7. ARCHIVIO MICROCHIP & CANI */}
          <button
            type="button"
            id="btn-patrol-microchip-archive"
            onClick={onOpenMicrochipArchive}
            className="group p-5 rounded-3xl bg-slate-800/70 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <PawPrint className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-normal text-white uppercase group-hover:text-emerald-200">
                  Archivio Microchip & Cani
                </h4>
                <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-normal">
                Anagrafe canina, verifica iscrizioni ASL, controlli precedenti e discordanze.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 7. BARRA EMERGENZA SOS RAPIDO */}
      <div className="p-4 rounded-3xl bg-slate-800/90 border border-red-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 animate-pulse shadow-md">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-normal uppercase text-white tracking-wide">
              Emergenza o aggressione sul posto (SOS)
            </h4>
            <p className="text-xs text-red-200 font-normal">
              Trasmette allarme immediato e coordinate GPS alla Centrale.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSos}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-normal text-xs uppercase tracking-wider rounded-2xl shadow-md border border-red-400 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          🚨 Invia SOS emergenza
        </button>
      </div>

      {/* 8. CALENDARIO TURNI FISSO IN BASSO */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-normal uppercase tracking-wide text-slate-200 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-300" />
            Calendario turni operativi
          </h3>
          <span className="text-xs text-slate-300 font-normal">Tocca un giorno per richiedere o inserire un turno</span>
        </div>

        <div className="w-full">
          {renderCalendar()}
        </div>
      </div>

      {/* FINESTRA MODALE "IL MIO TESSERINO" (VISIONE INTEGRALE CON PULSANTE GIRA FRONTE/RETRO) */}
      <Dialog open={isTesserinoModalOpen} onOpenChange={setIsTesserinoModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-700 text-white p-5 sm:p-6 rounded-3xl shadow-2xl z-[10000] overflow-y-auto max-h-[92vh] font-normal">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-normal uppercase text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-300" />
                Tesserino di riconoscimento ({tesserinoSide === "front" ? "Fronte" : "Retro"})
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-300 font-normal">
              Visualizzazione telematica conforme all'originale depositato agli atti del Nucleo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* DICITURA UFFICIALE DI CONFORMITÀ */}
            <div className="bg-slate-800/80 border border-blue-400/30 rounded-2xl p-3 flex items-center justify-center gap-2.5 text-center text-xs text-blue-100 font-normal shadow-inner">
              <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0" />
              <span>
                Documento di riconoscimento telematico ad uso interno conforme all'originale depositato agli atti del Corpo.
              </span>
            </div>

            {/* PULSANTE GIRA TESSERINO (FRONTE / RETRO) */}
            <div className="flex justify-center">
              <div className="inline-flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setTesserinoSide("front")}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-normal uppercase tracking-wide transition-all cursor-pointer",
                    tesserinoSide === "front"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Mostra Fronte
                </button>
                <button
                  type="button"
                  onClick={() => setTesserinoSide("back")}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-normal uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5",
                    tesserinoSide === "back"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <RotateCw className="w-3 h-3" />
                  Mostra Retro
                </button>
              </div>
            </div>

            {/* IMMAGINE INTEGRALE A TUTTO SCHERMO */}
            <div className="bg-slate-950 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-center min-h-[320px] sm:min-h-[380px] overflow-hidden shadow-xl">
              {tesserinoSide === "front" ? (
                guardPrivateInfo?.idCardFront || (currentGuard as any)?.avatar || (currentGuard as any)?.photoUrl ? (
                  <img 
                    src={guardPrivateInfo?.idCardFront || (currentGuard as any)?.avatar || (currentGuard as any)?.photoUrl} 
                    alt="Tesserino Fronte" 
                    className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <div className="text-center p-8 space-y-2 text-slate-400">
                    <Shield className="w-14 h-14 mx-auto text-slate-600" />
                    <p className="text-xs font-normal">Immagine fronte non presente in archivio</p>
                  </div>
                )
              ) : (
                guardPrivateInfo?.idCardBack ? (
                  <img 
                    src={guardPrivateInfo?.idCardBack} 
                    alt="Tesserino Retro" 
                    className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <div className="text-center p-8 space-y-2 text-slate-400">
                    <Shield className="w-14 h-14 mx-auto text-slate-600" />
                    <p className="text-xs font-normal">Immagine retro non presente in archivio</p>
                  </div>
                )
              )}
            </div>

            {/* PULSANTE DI CHIUSURA */}
            <div className="pt-2 text-center border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTesserinoModalOpen(false)}
                className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-normal uppercase rounded-xl border border-slate-600 cursor-pointer shadow transition-all"
              >
                Chiudi tesserino
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

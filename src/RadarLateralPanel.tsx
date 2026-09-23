import React from "react";
import { 
  Shield, 
  Video, 
  Phone, 
  MessageCircle, 
  X, 
  Send,
  AlertTriangle
} from "lucide-react";

interface RadarLateralPanelProps {
  guards: any[];
  activeGuardsOnDuty: any[];
  operationalSquads: any[];
  isSquadModeOnMap: boolean;
  setIsSquadModeOnMap: (v: boolean) => void;
  selectedTacticalGuard: any | null;
  setSelectedTacticalGuard: (g: any | null) => void;
  guardPrivateInfoMap: Record<string, any>;
  alerts: any[];
  radarSearchedPoint: { lat: number; lng: number; address: string } | null;
  setRadarSearchedPoint: (pt: { lat: number; lng: number; address: string } | null) => void;
  radarSearchAddress: string;
  setRadarSearchAddress: (s: string) => void;
  handleRadarAddressSearch: (e: React.FormEvent) => void;
  isSearchingRadarAddress: boolean;
  handleOpenWhatsAppAndLog: (phone: string | undefined, msg: string, guardId?: string) => void;
  handleMakeCallAndLog: (phone: string | undefined, guardId?: string) => void;
  setTargetVideoGuard: (g: any | null) => void;
  setVideoDialogOpen: (open: boolean) => void;
  setSelectedGuardForMission: (g: any | null) => void;
  setIsMissionDialogOpen: (open: boolean) => void;
  setNewMission: (mission: any) => void;
  handleToggleGpsForGuard: (guardId: string, matricola?: string, name?: string) => void;
  setRadarMapCenter: (coords: [number, number]) => void;
  setIsSquadTableOpen: (open: boolean) => void;
  selectedPoiComune: string;
  handleComuneSelect: (c: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const RadarLateralPanel: React.FC<RadarLateralPanelProps> = ({
  selectedTacticalGuard,
  setSelectedTacticalGuard,
  guardPrivateInfoMap,
  alerts,
  handleOpenWhatsAppAndLog,
  handleMakeCallAndLog,
  setTargetVideoGuard,
  setVideoDialogOpen,
  setSelectedGuardForMission,
  setIsMissionDialogOpen,
  setNewMission,
  radarSearchedPoint
}) => {
  // Se nessuna guardia è stata cliccata sulla mappa, NON mostrare alcuna finestra
  if (!selectedTacticalGuard) {
    return null;
  }

  const isSelectedGuardInSos = alerts.some((a) => {
    if (a.status !== "active") return false;
    if (a.guardId === selectedTacticalGuard.id) return true;
    if (
      a.matricola &&
      selectedTacticalGuard.matricola &&
      a.matricola.replace(/\s+/g, "").toUpperCase() ===
        selectedTacticalGuard.matricola.replace(/\s+/g, "").toUpperCase()
    )
      return true;
    const fullName = `${selectedTacticalGuard.surname || ""} ${selectedTacticalGuard.name || ""}`
      .trim()
      .toLowerCase();
    const alertNameNorm = (a.guardName || "").trim().toLowerCase();
    return fullName === alertNameNorm || fullName.includes(alertNameNorm);
  });

  const privateInfo = guardPrivateInfoMap[selectedTacticalGuard.id];
  const currentPhone = privateInfo?.cellulare || privateInfo?.phone || selectedTacticalGuard?.phone || "";

  return (
    <div
      id="radar-coordination-lateral-panel"
      className="absolute top-4 left-4 z-[1000] flex flex-col bg-slate-950/95 border-2 border-indigo-500/60 rounded-2xl shadow-2xl backdrop-blur-xl text-white pointer-events-auto overflow-hidden w-64 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-left duration-200"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
      onDoubleClickCapture={(e) => e.stopPropagation()}
      onWheelCapture={(e) => e.stopPropagation()}
    >
      {/* TESTATA CON NOMINATIVO GUARDIA & TASTO CHIUDI */}
      <div className="p-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-indigo-500/40 flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-[10px] text-indigo-300 font-mono font-bold truncate">
              {selectedTacticalGuard.matricola ? `MATR. ${selectedTacticalGuard.matricola}` : "GUARDIA"}
            </span>
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-tight truncate mt-0.5 leading-tight">
            {selectedTacticalGuard.surname || ""} {selectedTacticalGuard.name || ""}
          </h4>
        </div>

        <button
          type="button"
          id="btn-close-radar-lateral-panel"
          onClick={() => setSelectedTacticalGuard(null)}
          className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-rose-900/80 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow"
          title="Chiudi Finestra"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* RILEVAMENTO SOS ATTIVO */}
      {isSelectedGuardInSos && (
        <div className="bg-rose-900 border-b border-rose-500 p-2 text-[10px] font-black text-rose-100 flex items-center gap-1.5 animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>ALLARME SOS ATTIVO!</span>
        </div>
      )}

      {/* I 4 PULSANTI ESSENZIALI IN VERTICALE */}
      <div className="p-2.5 flex flex-col gap-2 font-sans">
        
        {/* 1. WHATSAPP */}
        <button
          type="button"
          id="btn-radar-whatsapp"
          onClick={() =>
            handleOpenWhatsAppAndLog(
              currentPhone,
              `Centrale Operativa C.O.E.T.A. per Guardia ${selectedTacticalGuard.surname || ""} ${selectedTacticalGuard.name || ""}`,
              selectedTacticalGuard.id
            )
          }
          className="w-full h-9 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer border-0 transition-transform active:scale-95"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span>WhatsApp</span>
        </button>

        {/* 2. CHIAMA GSM */}
        <button
          type="button"
          id="btn-radar-call"
          onClick={() => handleMakeCallAndLog(currentPhone, selectedTacticalGuard.id)}
          className="w-full h-9 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer border-0 transition-transform active:scale-95"
        >
          <Phone className="h-4 w-4 shrink-0" />
          <span>Chiama</span>
        </button>

        {/* 3. VIDEO LIVE (DIRETTO PER QUESTA SPECIFICA GUARDIA RICONOSCIUTA) */}
        <button
          type="button"
          id="btn-radar-videolive"
          onClick={() => {
            setTargetVideoGuard(selectedTacticalGuard);
            setVideoDialogOpen(true);
          }}
          className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer border-0 transition-transform active:scale-95"
        >
          <Video className="h-4 w-4 shrink-0" />
          <span>Video Live</span>
        </button>

        {/* 4. NUOVA MISSIONE */}
        <button
          type="button"
          id="btn-radar-newmission"
          onClick={() => {
            setSelectedGuardForMission(selectedTacticalGuard);
            setIsMissionDialogOpen(true);
            if (radarSearchedPoint) {
              setNewMission({
                address: radarSearchedPoint.address,
                description: "",
                priority: "medium"
              });
            }
          }}
          className="w-full h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer border-0 transition-transform active:scale-95"
        >
          <Send className="h-4 w-4 shrink-0" />
          <span>Nuova Missione</span>
        </button>

      </div>
    </div>
  );
};

import React, { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Users,
  Clock,
  MessageCircle,
  XCircle,
  AlertCircle,
  Fish,
  Bird,
  PawPrint,
  ShieldCheck,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "../lib/utils";
import { Shift, Guard } from "../types";

interface OperationalCalendarProps {
  viewDate: Date;
  setViewDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedDate: Date | null;
  calendarDays: Date[];
  calendarSectorFilter?: string;
  setCalendarSectorFilter?: (sec: string) => void;
  shifts: Shift[];
  pendingShifts: Shift[];
  guards: Guard[];
  isAdmin: boolean;
  isResponsabile: boolean;
  currentGuard: Guard | null;
  handleDayClick: (day: Date) => void;
  handleApproveShift: (e: React.MouseEvent, shiftId: string) => void;
  handleDeleteShift: (e: React.MouseEvent, shiftId: string) => void;
  safeFormatDate: (dateVal: any, formatTemplate?: string) => string;
  getShiftsForDay: (day: Date) => Shift[];
  getDaySquadsAndPatrols: (dayShifts: Shift[]) => any[];
}

export const OperationalCalendar: React.FC<OperationalCalendarProps> = ({
  viewDate,
  setViewDate,
  selectedDate,
  calendarDays,
  calendarSectorFilter = "tutti",
  setCalendarSectorFilter,
  shifts,
  pendingShifts,
  guards,
  isAdmin,
  isResponsabile,
  currentGuard,
  handleDayClick,
  handleApproveShift,
  handleDeleteShift,
  safeFormatDate,
  getShiftsForDay,
  getDaySquadsAndPatrols,
}) => {
  // Stato per popup gestione turni del giorno selezionato
  const [dayDetailsModal, setDayDetailsModal] = useState<{ open: boolean; date: Date | null }>({
    open: false,
    date: null
  });

  // Helper colore settore per turno approvato
  const getSectorStyle = (sector: string, isApproved: boolean) => {
    if (!isApproved) {
      // Turno in attesa: grigio chiaro con testo chiaro
      return {
        card: "bg-slate-700/60 text-slate-300 border-slate-600/70",
        badge: "bg-slate-700 text-slate-300 border-slate-600",
        dot: "bg-slate-400"
      };
    }

    const sec = (sector || "").toLowerCase();
    switch (sec) {
      case "ittica":
        return {
          card: "bg-cyan-950/70 text-cyan-200 border-cyan-500/50 shadow-sm",
          badge: "bg-cyan-900/50 text-cyan-200 border-cyan-400/40",
          dot: "bg-cyan-400"
        };
      case "venatoria":
        return {
          card: "bg-emerald-950/70 text-emerald-200 border-emerald-500/50 shadow-sm",
          badge: "bg-emerald-900/50 text-emerald-200 border-emerald-400/40",
          dot: "bg-emerald-400"
        };
      case "zoofila":
        return {
          card: "bg-amber-950/70 text-amber-200 border-amber-500/50 shadow-sm",
          badge: "bg-amber-900/50 text-amber-200 border-amber-400/40",
          dot: "bg-amber-400"
        };
      case "ambientale":
        return {
          card: "bg-teal-950/70 text-teal-200 border-teal-500/50 shadow-sm",
          badge: "bg-teal-900/50 text-teal-200 border-teal-400/40",
          dot: "bg-teal-400"
        };
      default:
        return {
          card: "bg-blue-950/70 text-blue-200 border-blue-500/50",
          badge: "bg-blue-900/50 text-blue-200 border-blue-400/40",
          dot: "bg-blue-400"
        };
    }
  };

  // Condivisione WhatsApp per notificare il turno
  const handleShareWhatsapp = (shift: Shift) => {
    const text = `*TURNO DI SERVIZIO*\n👤 Guardia: ${shift.guardName} (Matr. ${shift.matricola || 'N/D'})\n📡 Settore: ${shift.sector.toUpperCase()}\n📅 Data: ${safeFormatDate(shift.date, "dd/MM/yyyy")}\n⏰ Orario: ${shift.startTime} - ${shift.endTime}\n📝 Note: ${shift.notes || 'Nessuna note'}\n\nStato: ${shift.status === 'approved' ? 'CONFERMATO' : 'In attesa di convalida'}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Eliminazione diretta del turno tramite modale di conferma
  const handleDirectDelete = async (e: React.MouseEvent, shiftId: string, _guardName?: string) => {
    e.stopPropagation();
    handleDeleteShift(e, shiftId);
  };

  // Quando si tocca un giorno, se ci sono già turni apre la lista con possibilità di eliminazione diretta o aggiunta nuovo turno
  const onTileClick = (day: Date) => {
    const dayShifts = getShiftsForDay(day);
    if (dayShifts.length > 0) {
      setDayDetailsModal({ open: true, date: day });
    } else {
      handleDayClick(day);
    }
  };

  const selectedDayShifts = dayDetailsModal.date ? getShiftsForDay(dayDetailsModal.date) : [];

  return (
    <div className="space-y-4 font-normal">
      {/* AVVISO TURNI IN ATTESA DI APPROVAZIONE */}
      {pendingShifts.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-normal text-amber-200 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Turni in attesa di approvazione ({pendingShifts.length})
            </h3>
            <span className="text-[11px] text-amber-300/80 font-normal">
              {isAdmin || isResponsabile ? "Richiede convalida da parte dei Responsabili" : "Le tue richieste inoltrate (in grigio sul calendario)"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingShifts.map((s) => (
              <div key={s.id} className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-normal text-white text-xs">{s.guardName}</span>
                  <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-[10px] uppercase font-normal">
                    {s.sector} (In attesa)
                  </Badge>
                </div>
                <div className="text-xs text-slate-300 flex items-center justify-between font-normal">
                  <span>📅 {safeFormatDate(s.date, "dd/MM/yyyy")}</span>
                  <span>⏰ {s.startTime} - {s.endTime}</span>
                </div>
                {s.notes && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-700">
                    {s.notes}
                  </p>
                )}
                
                <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
                  {(isAdmin || isResponsabile) && (
                    <Button
                      size="sm"
                      onClick={(e) => handleApproveShift(e, s.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-normal text-[11px] h-8 flex-1 rounded-lg cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Convalida turno
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShareWhatsapp(s)}
                    className="border-green-600/40 text-green-300 hover:bg-green-950/40 text-[11px] h-8 px-2 rounded-lg font-normal cursor-pointer"
                    title="Condividi su WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleDirectDelete(e, s.id, s.guardName)}
                    className="border-red-700/60 text-red-300 hover:bg-red-900/40 text-[11px] h-8 px-2 rounded-lg font-normal cursor-pointer"
                    title="Elimina definitivamente questo turno"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDARIO MENSILE - COLORI ADDOLCITI, CASSELLE QUADRATE */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-5 space-y-4 shadow-md">
        
        {/* PULSANTI SETTORE RAPIDI (Ittica, Venatoria, Zoofila, Ambientale, Tutti) */}
        {setCalendarSectorFilter && (
          <div className="bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-700/70 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯</span> Calendario Settore:
              </span>
              {calendarSectorFilter !== "tutti" && (
                <button
                  type="button"
                  onClick={() => setCalendarSectorFilter("tutti")}
                  className="text-[11px] text-blue-300 hover:text-white font-medium underline cursor-pointer"
                >
                  Mostra tutti i settori
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: "ittica", label: "Ittica", icon: Fish, activeCls: "bg-cyan-950/90 text-cyan-200 border-cyan-400 ring-2 ring-cyan-400/40 shadow-sm" },
                { id: "venatoria", label: "Venatoria", icon: Bird, activeCls: "bg-emerald-950/90 text-emerald-200 border-emerald-400 ring-2 ring-emerald-400/40 shadow-sm" },
                { id: "zoofila", label: "Zoofila", icon: PawPrint, activeCls: "bg-amber-950/90 text-amber-200 border-amber-400 ring-2 ring-amber-400/40 shadow-sm" },
                { id: "ambientale", label: "Ambientale", icon: ShieldCheck, activeCls: "bg-teal-950/90 text-teal-200 border-teal-400 ring-2 ring-teal-400/40 shadow-sm" },
                { id: "tutti", label: "Tutti i Settori", icon: Globe, activeCls: "bg-blue-950/90 text-blue-200 border-blue-400 ring-2 ring-blue-400/40 shadow-sm" },
              ].map((sec) => {
                const isCurrent = calendarSectorFilter === sec.id;
                const IconComp = sec.icon;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setCalendarSectorFilter(sec.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                      isCurrent
                        ? sec.activeCls
                        : "bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white"
                    )}
                  >
                    <IconComp className="h-3.5 w-3.5 shrink-0" />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-400/30 rounded-xl text-blue-300">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-normal text-white uppercase tracking-wide">
                {format(viewDate, "MMMM yyyy", { locale: it })}
              </h3>
              <p className="text-[11px] text-slate-300 font-normal">
                Tocca un giorno per vedere i turni o inserire un nuovo turno.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDate(new Date())}
              className="border-blue-400/40 bg-blue-900/30 text-xs text-blue-200 hover:text-white hover:bg-blue-800/50 h-8 px-3 rounded-xl ml-2 font-normal cursor-pointer"
            >
              Oggi
            </Button>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="border-slate-600 bg-slate-700/60 text-white h-9 w-9 rounded-xl hover:bg-slate-600 font-normal cursor-pointer"
              title="Mese precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="border-slate-600 bg-slate-700/60 text-white h-9 w-9 rounded-xl hover:bg-slate-600 font-normal cursor-pointer"
              title="Mese successivo"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        </div>

        {/* Intestazione giorni della settimana */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d, i) => (
            <div key={i} className="text-center text-xs font-bold text-slate-200 uppercase py-2 bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-sm">
              {d}
            </div>
          ))}

          {/* Griglia giorni espansa per supportare molteplici turni di diversi settori */}
          {calendarDays.map((day, idx) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();

            // Raggruppamento conteggi settori nel giorno
            const itticaCount = dayShifts.filter(s => s.sector === "ittica").length;
            const venatoriaCount = dayShifts.filter(s => s.sector === "venatoria").length;
            const zoofilaCount = dayShifts.filter(s => s.sector === "zoofila").length;
            const ambientaleCount = dayShifts.filter(s => s.sector === "ambientale").length;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onTileClick(day)}
                className={cn(
                  "w-full min-h-[135px] sm:min-h-[165px] md:min-h-[195px] lg:min-h-[215px] p-1.5 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group cursor-pointer shadow-sm",
                  !isCurrentMonth && "opacity-40 bg-slate-950/40 border-slate-800/50 text-slate-500",
                  isCurrentMonth && (
                    isSelected
                      ? "bg-blue-950/50 border-blue-400 ring-2 ring-blue-400/70 shadow-lg shadow-blue-950/50"
                      : isToday
                      ? "bg-slate-800/90 border-blue-400 shadow-md shadow-blue-950/40"
                      : "bg-slate-850/80 border-slate-700/80 hover:border-blue-400 hover:bg-slate-800"
                  )
                )}
              >
                {/* Intestazione Giorno Pulita (Solo Numero Giorno e Indicatori Settore) */}
                <div className="flex items-center justify-between w-full pb-1 border-b border-slate-700/40 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-xs sm:text-sm font-black rounded-lg w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center transition-all",
                      isToday ? "bg-blue-500 text-white shadow-md shadow-blue-900/60" : "text-slate-200"
                    )}>
                      {format(day, "d")}
                    </span>

                    {/* Indicatori a pallino dei settori attivi nel giorno */}
                    {dayShifts.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        {zoofilaCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${zoofilaCount} Zoofila`} />}
                        {venatoriaCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`${venatoriaCount} Venatoria`} />}
                        {itticaCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title={`${itticaCount} Ittica`} />}
                        {ambientaleCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" title={`${ambientaleCount} Ambientale`} />}
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-500 group-hover:text-blue-300 transition-colors">
                    {dayShifts.length > 0 ? "Gestisci" : "+ Turno"}
                  </span>
                </div>

                {/* Lista Completa Turni con Icone Settoriali (fino a 6 visibili contemporaneamente) */}
                <div className="flex-1 w-full space-y-1 overflow-y-auto custom-scrollbar my-1 pr-0.5">
                  {dayShifts.slice(0, 6).map((s) => {
                    const isApproved = s.status === "approved";
                    const style = getSectorStyle(s.sector, isApproved);
                    const sec = (s.sector || "").toLowerCase();

                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "text-[9px] sm:text-[10px] px-1.5 py-1 rounded-lg border font-semibold flex items-center justify-between transition-all leading-tight shadow-sm",
                          style.card
                        )}
                      >
                        <span className="truncate flex items-center gap-1 min-w-0 pr-1">
                          <span className="shrink-0">
                            {sec === "ittica" ? "🐟" : sec === "venatoria" ? "🦅" : sec === "zoofila" ? "🐾" : "🌿"}
                          </span>
                          <span className="truncate">{s.guardName || "Guardia"}</span>
                        </span>
                        <span className="text-[8px] sm:text-[9px] opacity-85 shrink-0 font-mono font-bold">
                          {s.startTime}
                        </span>
                      </div>
                    );
                  })}

                  {dayShifts.length > 6 && (
                    <div className="text-[9px] text-blue-200 font-bold text-center bg-blue-950/70 rounded-lg py-1 border border-blue-700/50 shadow-inner">
                      +{dayShifts.length - 6} altri turni
                    </div>
                  )}
                </div>

                {/* Azione Rapida In Basso */}
                <div className="w-full flex justify-end items-center pt-1 border-t border-slate-700/30 shrink-0 text-[9px]">
                  <span className="text-blue-300 font-bold group-hover:text-blue-200 flex items-center gap-0.5">
                    <Plus className="h-2.5 w-2.5" /> Dettagli
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODALE DETTAGLI DEL GIORNO SELEZIONATO: ELENCO TURNI CON ELIMINAZIONE DIRETTA + PULSANTE AGGIUNGI */}
      <Dialog open={dayDetailsModal.open} onOpenChange={(open) => setDayDetailsModal({ open, date: open ? dayDetailsModal.date : null })}>
        <DialogContent className="max-w-lg bg-slate-900 border border-slate-700 text-white p-5 rounded-3xl shadow-2xl z-[10000] font-normal max-h-[88vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-normal uppercase text-white flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-300" />
                Turni del {dayDetailsModal.date ? format(dayDetailsModal.date, "EEEE d MMMM yyyy", { locale: it }) : ""}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-300 font-normal">
              Visualizza, convalida o elimina direttamente i turni registrati per questa data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedDayShifts.length === 0 ? (
              <div className="text-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs font-normal">
                Nessun turno registrato in questa data.
              </div>
            ) : (
              selectedDayShifts.map((s) => {
                const isApproved = s.status === "approved";
                const style = getSectorStyle(s.sector, isApproved);

                return (
                  <div key={s.id} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", style.dot)} />
                        <span className="text-sm font-normal text-white">{s.guardName}</span>
                        {s.matricola && (
                          <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-slate-300">
                            Matr. {s.matricola}
                          </span>
                        )}
                      </div>
                      <Badge className={cn("text-[10px] uppercase font-normal", style.badge)}>
                        {s.sector} ({isApproved ? "Confermato" : "In attesa"})
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-300 flex items-center justify-between bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-300" />
                        {s.startTime} - {s.endTime}
                      </span>
                      {s.notes && (
                        <span className="text-slate-300 truncate max-w-[200px] italic">
                          {s.notes}
                        </span>
                      )}
                    </div>

                    {/* AZIONI SUL TURNO */}
                    <div className="flex items-center gap-2 pt-1">
                      {!isApproved && (isAdmin || isResponsabile) && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            handleApproveShift(e, s.id);
                            setDayDetailsModal({ open: false, date: null });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-normal text-xs h-8 flex-1 rounded-xl cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Convalida turno
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareWhatsapp(s)}
                        className="border-green-600/40 text-green-300 hover:bg-green-950/40 text-xs h-8 px-3 rounded-xl font-normal cursor-pointer"
                        title="Condividi su WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                      </Button>

                      {/* PULSANTE ELIMINA DIRETTO */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          handleDirectDelete(e, s.id, s.guardName);
                          setDayDetailsModal({ open: false, date: null });
                        }}
                        className="border-red-700/60 bg-red-950/30 text-red-300 hover:bg-red-900/60 hover:text-white text-xs h-8 px-3 rounded-xl font-normal cursor-pointer flex items-center gap-1.5"
                        title="Elimina definitivamente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Elimina</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDayDetailsModal({ open: false, date: null })}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-normal h-10 rounded-xl cursor-pointer"
            >
              Chiudi
            </Button>
            <Button
              type="button"
              onClick={() => {
                const targetDay = dayDetailsModal.date;
                setDayDetailsModal({ open: false, date: null });
                if (targetDay) {
                  handleDayClick(targetDay);
                }
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal h-10 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/40"
            >
              <Plus className="h-4 w-4" />
              Aggiungi un altro turno in questa data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

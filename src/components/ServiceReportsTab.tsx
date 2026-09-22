import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { 
  PlusCircle, ClipboardList, Search, Calendar as CalendarIcon, 
  Eye, X, Printer, Mail, Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger, DialogClose 
} from "@/components/ui/dialog";
import { cn, printElementById } from "@/lib/utils";
import { getProvinceFromComune } from "../lib/geo-utils";
import { capitalizeWords } from "../lib/string-utils";
import { EkoclubLogo } from "./EkoclubLogo";
import { ReportHeader } from "./ReportHeader";
import { ServiceReport, Guard } from "../types";
import { db } from "../lib/firebase";
import { InterventionAttachments } from "./InterventionAttachments";

const safeFormatDate = (dateVal: any, formatTemplate: string = "dd/MM/yyyy") => {
  if (!dateVal) return "—";
  try {
    let parsedDate: Date;
    if (typeof dateVal.toDate === "function") {
      parsedDate = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      parsedDate = dateVal;
    } else if (typeof dateVal === "string") {
      parsedDate = parseISO(dateVal);
    } else if (typeof dateVal === "number") {
      parsedDate = new Date(dateVal);
    } else {
      parsedDate = new Date(dateVal);
    }

    if (isNaN(parsedDate.getTime())) {
      if (typeof dateVal === "string") {
        parsedDate = new Date(dateVal);
      }
    }

    if (isNaN(parsedDate.getTime())) {
      return "—";
    }

    return format(parsedDate, formatTemplate, { locale: it });
  } catch (error) {
    console.error("Error formatting date:", dateVal, error);
    return "—";
  }
};

interface ServiceReportsTabProps {
  serviceReports: ServiceReport[];
  guards?: Guard[];
  isAddingServiceReport: boolean;
  setIsAddingServiceReport: (open: boolean) => void;
  newServiceReport: Partial<ServiceReport>;
  setNewServiceReport: (report: Partial<ServiceReport>) => void;
  handleAddServiceReport: () => Promise<void>;
  removeServiceReport: (id: string) => Promise<void>;
  currentGuard: Guard | null;
  isAdmin: boolean;
  isReadOnlyForResponsabile?: boolean;
  isAnimaliaAuthorized?: boolean;
  searchQuery?: string;
}

export const ServiceReportsTab: React.FC<ServiceReportsTabProps> = ({
  serviceReports,
  guards,
  isAddingServiceReport,
  setIsAddingServiceReport,
  newServiceReport,
  setNewServiceReport,
  handleAddServiceReport,
  removeServiceReport,
  currentGuard,
  isAdmin,
  isReadOnlyForResponsabile = false,
  isAnimaliaAuthorized = false,
  searchQuery,
}) => {
  const [serviceReportsSearch, setServiceReportsSearch] = useState("");
  const [serviceReportsDateFilter, setServiceReportsDateFilter] = useState("");

  const isSectorSelectable = (sectorName: string) => {
    if (isAdmin) return true;
    if (!currentGuard) return true;
    if (currentGuard.role === "admin" || currentGuard.role === "responsabile") return true;
    
    const qual = currentGuard.qualifications || [];
    const normalizedQual = qual.map(q => q.toLowerCase());
    
    if (sectorName === "GUARDIA ZOOFILA") return normalizedQual.includes("zoofila");
    if (sectorName === "GUARDIA ITTICA") return normalizedQual.includes("ittica");
    if (sectorName === "GUARDIA VENATORIA") return normalizedQual.includes("venatoria");
    
    return true; 
  };

  const canSeeReport = (report: ServiceReport) => {
    if (isAdmin) return true;
    if (!currentGuard) return true;
    if (currentGuard.role === "admin" || currentGuard.role === "responsabile") return true;

    const qualifications = (currentGuard.qualifications || []).map(q => q.toLowerCase());
    const reportSectors = (report.settore || []).map(s => s.toLowerCase());

    if (reportSectors.length === 0) return true;

    return reportSectors.some(sector => {
      if (sector.includes("zoofila")) return qualifications.includes("zoofila");
      if (sector.includes("ittica")) return qualifications.includes("ittica");
      if (sector.includes("venatoria")) return qualifications.includes("venatoria");
      return true;
    });
  };

  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setServiceReportsSearch(searchQuery);
    }
  }, [searchQuery]);

  // Gestione automatic navigation e spostamento automatico ("spostamenti automatici nelle finestre")
  const handleAutoNavigationKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      // Salta il comportamento se siamo in una textarea così l'utente può fare a capo
      if (target.tagName === "TEXTAREA") return;

      if (
        target.tagName === "INPUT" || 
        target.tagName === "SELECT" || 
        target.getAttribute("role") === "combobox"
      ) {
        e.preventDefault();
        const container = e.currentTarget;
        const focusable = Array.from(
          container.querySelectorAll(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]:not([disabled]), [role="combobox"]'
          )
        ) as HTMLElement[];

        const index = focusable.indexOf(target);
        if (index > -1 && index < focusable.length - 1) {
          const nextEl = focusable[index + 1];
          nextEl.focus();
          nextEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  };

  const handleAutoNavigationFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" || 
      target.tagName === "TEXTAREA" || 
      target.getAttribute("role") === "combobox"
    ) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <div>
          <h2 className="text-3xl font-normal italic tracking-widest text-white uppercase flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-emerald-500" />
            Rapporti di Servizio
          </h2>
          <p className="text-slate-300 text-sm mt-1 font-normal tracking-wider uppercase">Relazioni di vigilanza interna</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cerca per matricola, località, numero..." 
              value={serviceReportsSearch}
              onChange={(e) => setServiceReportsSearch(e.target.value)}
              className="bg-slate-900/50 border-slate-800 pl-10 h-11 text-xs uppercase tracking-widest italic"
            />
          </div>
          <div className="relative w-full md:w-48">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              type="date"
              value={serviceReportsDateFilter}
              onChange={(e) => setServiceReportsDateFilter(e.target.value)}
              className="bg-slate-900/50 border-slate-800 pl-10 h-11 text-xs"
            />
          </div>
        </div>

        <Dialog open={isAddingServiceReport} onOpenChange={setIsAddingServiceReport}>
          {isReadOnlyForResponsabile ? (
            <div className="bg-slate-850 border border-slate-800 text-slate-400 font-normal italic uppercase tracking-wider text-[10px] h-14 px-8 rounded-2xl flex items-center justify-center select-none">
              Sola Lettura (Responsabile)
            </div>
          ) : (
            <DialogTrigger 
              nativeButton={true}
              render={
                <Button className="bg-emerald-700 hover:bg-emerald-600 text-white font-normal italic uppercase tracking-wider text-xs h-14 px-8 rounded-2xl shadow-lg shadow-emerald-900/40 border-none transition-all">
                  <PlusCircle className="h-4 w-4 mr-2" /> Nuovo Rapporto
                </Button>
              }
            />
          )}
          <DialogContent className="fixed inset-0 z-50 bg-slate-900 text-white p-0 flex flex-col overflow-hidden w-full h-[100dvh] max-h-none md:w-full md:max-w-none md:h-full md:rounded-none shadow-none left-0 top-0 translate-x-0 translate-y-0 border-none">
            <DialogHeader className="p-4 md:p-6 border-b border-white/5 bg-slate-950 flex-shrink-0">
              <DialogTitle className="text-lg md:text-xl font-normal italic uppercase tracking-widest flex items-center gap-3 text-white">
                <ClipboardList className="h-6 w-6 text-emerald-500" />
                Compilazione Rapporto
              </DialogTitle>
            </DialogHeader>

            <div 
              className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-slate-900/10"
              onKeyDown={handleAutoNavigationKeyDown}
              onFocus={handleAutoNavigationFocus}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-2">
                <div className="space-y-6">
                  <div className="space-y-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
                    <Label className="text-xs font-normal uppercase tracking-[0.2em] text-slate-400">Settore di Attività</Label>
                    <div className="flex flex-wrap gap-4">
                      {["VIGILANZA AMBIENTALE", "GUARDIA ITTICA", "GUARDIA VENATORIA", "PROTEZIONE CIVILE", "GUARDIA ZOOFILA", "ALTRO"].map((s) => (
                        <div key={s} className={cn("flex items-center space-x-2", !isSectorSelectable(s) && "opacity-40")}>
                          <Checkbox 
                            id={`sector-${s}`}
                            checked={newServiceReport.settore?.includes(s as any)}
                            disabled={!isSectorSelectable(s)}
                            onCheckedChange={(checked) => {
                              const current = newServiceReport.settore || [];
                              if (checked) {
                                setNewServiceReport({...newServiceReport, settore: [...current, s as any]});
                              } else {
                                setNewServiceReport({...newServiceReport, settore: current.filter(x => x !== s)});
                              }
                            }}
                          />
                          <label htmlFor={`sector-${s}`} className="text-sm font-normal uppercase tracking-widest text-slate-300 cursor-pointer">
                            {s}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
                    <Label className="text-xs font-normal uppercase tracking-widest text-slate-400 block mb-1">Membri della Pattuglia (Max 3 Guardie)</Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">1ª Guardia (Capopattuglia)</Label>
                        <Input 
                          value={newServiceReport.guardia1 || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewServiceReport({
                              ...newServiceReport,
                              guardia1: val,
                              guardie: [val, newServiceReport.guardia2 || "", newServiceReport.guardia3 || ""].filter(Boolean).join(", ")
                            });
                          }}
                          placeholder="Matricola / Nome 1ª Guardia"
                          className="bg-slate-900 border-slate-800 h-10 text-xs italic mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">2ª Guardia</Label>
                        <Input 
                          value={newServiceReport.guardia2 || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewServiceReport({
                              ...newServiceReport,
                              guardia2: val,
                              guardie: [newServiceReport.guardia1 || "", val, newServiceReport.guardia3 || ""].filter(Boolean).join(", ")
                            });
                          }}
                          placeholder="Matricola / Nome 2ª Guardia"
                          className="bg-slate-900 border-slate-800 h-10 text-xs italic mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">3ª Guardia</Label>
                        <Input 
                          value={newServiceReport.guardia3 || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewServiceReport({
                              ...newServiceReport,
                              guardia3: val,
                              guardie: [newServiceReport.guardia1 || "", newServiceReport.guardia2 || "", val].filter(Boolean).join(", ")
                            });
                          }}
                          placeholder="Matricola / Nome 3ª Guardia"
                          className="bg-slate-900 border-slate-800 h-10 text-xs italic mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Il Giorno</Label>
                      <Input 
                        type="date"
                        value={newServiceReport.data}
                        onChange={(e) => setNewServiceReport({...newServiceReport, data: e.target.value})}
                        className="bg-slate-900 border-slate-800 h-12 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-normal uppercase tracking-widest text-slate-400 text-center block">Dalle</Label>
                        <Input 
                          type="time"
                          value={newServiceReport.oraInizio}
                          onChange={(e) => setNewServiceReport({...newServiceReport, oraInizio: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-12 text-sm px-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-normal uppercase tracking-widest text-slate-400 text-center block">Alle</Label>
                        <Input 
                          type="time"
                          value={newServiceReport.oraFine}
                          onChange={(e) => setNewServiceReport({...newServiceReport, oraFine: e.target.value})}
                          className="bg-slate-900 border-slate-800 h-12 text-sm px-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Vigilanza in Località</Label>
                      <Input 
                        value={newServiceReport.localita}
                        onChange={(e) => setNewServiceReport({...newServiceReport, localita: capitalizeWords(e.target.value)})}
                        className="bg-slate-900 border-slate-800 h-12 text-sm italic"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Comune</Label>
                        <Input 
                          value={newServiceReport.comune}
                          onChange={(e) => {
                            const val = capitalizeWords(e.target.value);
                            const autoProv = getProvinceFromComune(val);
                            setNewServiceReport({
                              ...newServiceReport,
                              comune: val,
                              ...(autoProv ? { provincia: autoProv } : {})
                            });
                          }}
                          className="bg-slate-900 border-slate-800 h-12 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Prov</Label>
                        <Input 
                          value={newServiceReport.provincia}
                          onChange={(e) => setNewServiceReport({...newServiceReport, provincia: e.target.value.toUpperCase()})}
                          className="bg-slate-900 border-slate-800 h-12 text-sm text-center uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Veicolo Targato</Label>
                      <Input 
                        value={newServiceReport.veicoloTarga}
                        onChange={(e) => setNewServiceReport({...newServiceReport, veicoloTarga: e.target.value})}
                        className="bg-slate-900 border-slate-800 h-12 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Proprietà</Label>
                      <Input 
                        value={newServiceReport.veicoloProprieta}
                        onChange={(e) => setNewServiceReport({...newServiceReport, veicoloProprieta: e.target.value})}
                        className="bg-slate-900 border-slate-800 h-12 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Note di Servizio</Label>
                    <textarea 
                      value={newServiceReport.note}
                      onChange={(e) => setNewServiceReport({...newServiceReport, note: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 min-h-[220px] text-sm text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none custom-scrollbar italic"
                      placeholder="Descrivere l'attività svolta nei dettagli..."
                      rows={8}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 md:p-6 border-t border-white/5 bg-slate-950 flex-shrink-0 flex flex-col md:flex-row gap-3">
              <Button
                onClick={handleAddServiceReport}
                className="w-full md:flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white uppercase italic tracking-widest rounded-xl h-14 md:h-12 font-normal shadow-lg shadow-emerald-950/20 order-1 md:order-2"
              >
                Salva Rapporto
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsAddingServiceReport(false)}
                className="w-full md:flex-1 text-slate-400 hover:text-white uppercase text-[10px] tracking-widest font-normal h-10 md:h-12 order-2 md:order-1"
              >
                Annulla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {serviceReports.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-slate-800/50">
            <ClipboardList className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 italic uppercase tracking-[0.2em]">Nessun rapporto di servizio in archivio</p>
          </div>
        ) : (
          serviceReports
            .filter(report => {
              if (!canSeeReport(report)) return false;
              const searchTerm = serviceReportsSearch.toLowerCase();
              const matchesSearch = !serviceReportsSearch || 
                (report.numeroRapporto || "").toLowerCase().includes(searchTerm) ||
                (report.guardie || "").toLowerCase().includes(searchTerm) ||
                (report.localita || "").toLowerCase().includes(searchTerm) ||
                (report.comune || "").toLowerCase().includes(searchTerm) ||
                (report.note || "").toLowerCase().includes(searchTerm);
              
              const matchesDate = !serviceReportsDateFilter || 
                report.data === serviceReportsDateFilter;

              return matchesSearch && matchesDate;
            })
            .map((report) => (
            <Card key={report.id} className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all group overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-2 transition-all" />
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px] px-3 py-1 uppercase tracking-widest">
                        {report.numeroRapporto}
                      </Badge>
                      <span className="text-slate-500 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarIcon className="h-3 w-3" />
                        {safeFormatDate(report.data, "PPP")}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Settori</Label>
                        <div className="flex gap-1 flex-wrap">
                          {report.settore?.map((s, idx) => (
                            <Badge key={`${s}_${idx}`} variant="secondary" className="bg-slate-880 text-[9px] uppercase tracking-tighter text-emerald-400">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Località</Label>
                        <p className="text-xs text-white font-medium italic tracking-wider truncate">
                          {report.localita}, {report.comune} ({report.provincia})
                        </p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Matricole</Label>
                        <p className="text-xs text-emerald-400 font-mono tracking-widest truncate">
                          {report.guardie}
                        </p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Orario</Label>
                        <p className="text-xs text-white uppercase tracking-widest font-mono">
                          {report.oraInizio} - {report.oraFine}
                        </p>
                      </div>
                      <div className="text-right">
                        <Label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Operatore</Label>
                        <p className="text-xs text-slate-300 font-mono">
                          {report.creatoDaNome}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button 
                      size="sm" 
                      className="bg-sky-600/20 hover:bg-sky-600 border border-sky-500/40 text-sky-300 hover:text-white uppercase text-[10px] tracking-widest gap-2 h-9 px-3.5 rounded-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm("Inviare questo rapporto via email alla centrale operativa?")) return;
                        fetch("/api/send-service-report-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ report }),
                        })
                        .then(res => {
                          if (res.ok) alert("Email inviata con successo alla sede.");
                          else alert("Errore nell'invio dell'email.");
                        })
                        .catch(err => {
                          console.error("Email send failed:", err);
                          alert("Invio fallito. Controlla la connessione.");
                        });
                      }}
                      title="Invia via Email alla Sede"
                    >
                      <Mail className="h-4 w-4" /> <span>Invia Email</span>
                    </Button>
                    <Dialog>
                      <DialogTrigger>
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 hover:bg-slate-800 text-slate-400 hover:text-white uppercase text-[10px] tracking-widest gap-2 cursor-pointer">
                          <Eye className="h-4 w-4" /> {isAnimaliaAuthorized ? "Visualizza / Stampa" : "Visualizza"}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="bg-white text-black max-w-[95vw] md:max-w-5xl p-0 overflow-hidden font-serif border-none shadow-2xl">
                        {/* Floating Close Button for better UX */}
                        <div className="absolute top-4 right-4 z-50 no-print flex gap-2">
                          {isAnimaliaAuthorized && (
                            <Button 
                              onClick={() => printElementById(`printable-report-${report.id}`, `Rapporto di Servizio N. ${report.numeroRapporto || "ND"}`)}
                              variant="secondary" 
                              size="sm" 
                              className="rounded-full shadow-lg font-bold tracking-widest uppercase text-[10px] px-4"
                            >
                              <Printer className="h-4 w-4 mr-1" /> Stampa
                            </Button>
                          )}
                          <DialogClose className="rounded-full shadow-lg font-bold tracking-widest uppercase text-[10px] px-4 h-9 bg-red-600 text-white hover:bg-red-700 inline-flex items-center justify-center cursor-pointer">
                            <X className="h-4 w-4 mr-1" /> Chiudi
                          </DialogClose>
                        </div>

                        {/* PRINTABLE VERSION MIRRORING PDF */}
                        <div id={`printable-report-${report.id}`} className="printable-content p-4 md:p-8 space-y-4 md:space-y-5 bg-white text-black overflow-y-auto max-h-[95vh] md:max-h-[85vh] custom-scrollbar selection:bg-emerald-100 print:max-h-none print:overflow-visible print:p-0">
                          <div className="border-b border-slate-300 pb-2">
                            <ReportHeader hideTitle={true} />
                            <div className="flex flex-col md:flex-row justify-between items-center md:items-start pt-2 gap-3">
                              <div className="py-1">
                                <h2 className="text-lg md:text-xl font-bold uppercase tracking-widest text-slate-900">Rapporto di Servizio</h2>
                                <p className="text-xs md:text-sm font-mono text-slate-700 mt-0.5">{report.numeroRapporto}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex justify-end gap-2 no-print">
                                  <Button 
                                    size="sm" 
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-[10px] tracking-widest gap-2"
                                    onClick={() => {
                                      if (!confirm("Inviare questo rapporto via email alla centrale operativa?")) return;
                                      fetch("/api/send-service-report-email", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ report }),
                                      })
                                      .then(res => {
                                        if (res.ok) alert("Email inviata con successo.");
                                        else alert("Errore nell'invio dell'email.");
                                      })
                                      .catch(err => {
                                        console.error("Email send failed:", err);
                                        alert("Invio fallito. Controlla la connessione.");
                                      });
                                    }}
                                  >
                                    <Mail className="h-4 w-4" /> Invia via Email
                                  </Button>
                                  {isAnimaliaAuthorized && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => printElementById(`printable-report-${report.id}`, `Rapporto di Servizio N. ${report.numeroRapporto || "ND"}`)}
                                      className="text-slate-800 border-slate-300 uppercase text-[10px] tracking-widest gap-2"
                                    >
                                      <Printer className="h-4 w-4" /> Stampa
                                    </Button>
                                  )}
                                </div>
                                {(() => {
                                  const settList = Array.isArray(report.settore)
                                    ? report.settore.map(s => String(s).toLowerCase())
                                    : typeof report.settore === 'string'
                                    ? (report.settore as string).toLowerCase().split(',').map(s => s.trim())
                                    : [];

                                  const isIttica = settList.some(s => s.includes('ittic'));
                                  const isVenatoria = settList.some(s => s.includes('venatori'));
                                  const isZoofila = settList.some(s => s.includes('zoofil'));

                                  return (
                                    <div className="grid grid-cols-3 md:grid-cols-1 gap-1 text-[8px] md:text-[9px] font-bold uppercase text-left border border-slate-300 p-1.5 rounded bg-slate-50/50 min-w-[140px]">
                                      <div className="flex items-center gap-1.5">
                                        <div className={cn("w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[9px] flex-shrink-0 leading-none", isIttica ? "bg-black text-white" : "bg-white text-transparent")}>
                                          ✓
                                        </div>
                                        <span>ITTICA</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className={cn("w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[9px] flex-shrink-0 leading-none", isVenatoria ? "bg-black text-white" : "bg-white text-transparent")}>
                                          ✓
                                        </div>
                                        <span>VENATORIA</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className={cn("w-3.5 h-3.5 border border-black flex items-center justify-center font-bold text-[9px] flex-shrink-0 leading-none", isZoofila ? "bg-black text-white" : "bg-white text-transparent")}>
                                          ✓
                                        </div>
                                        <span>ZOOFILA</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:gap-3 py-1 md:py-2">
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-slate-200 pb-1.5">
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2">
                                  <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Guardie Operative:</span>
                                  <span className="text-sm md:text-base italic font-semibold text-slate-900">{report.guardie || "N.D."}</span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2">
                                  <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Matricole Operative:</span>
                                  <span className="text-sm md:text-base italic font-mono font-semibold text-slate-900">
                                    {(() => {
                                      if (!report.guardie) return "N.D.";
                                      const names = report.guardie.split(",").map(s => s.trim()).filter(Boolean);
                                      const matList: string[] = [];
                                      names.forEach(name => {
                                        const found = guards?.find(g => {
                                          const f1 = `${g.name} ${g.surname || ''}`.trim().toLowerCase();
                                          const f2 = `${g.surname || ''} ${g.name}`.trim().toLowerCase();
                                          const search = name.toLowerCase();
                                          return f1.includes(search) || search.includes(f1) || f2.includes(search) || search.includes(f2) || (g.matricola && search.includes(g.matricola.toLowerCase()));
                                        });
                                        if (found?.matricola) {
                                          matList.push(`${found.name || name}: ${found.matricola}`);
                                        }
                                      });
                                      return matList.length > 0 ? matList.join(" | ") : (report.guardie.includes("Matr") ? report.guardie : "N.D.");
                                    })()}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 border-b border-slate-200 pb-1">
                                <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Vigilanza in località:</span>
                                <span className="text-sm md:text-base italic font-medium text-slate-900">{report.localita}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 border-b border-slate-200 pb-1">
                                  <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Comune:</span>
                                  <span className="text-sm md:text-base italic font-medium text-slate-900">{report.comune}</span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 border-b border-slate-200 pb-1">
                                  <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Provincia:</span>
                                  <span className="text-sm md:text-base italic font-medium text-slate-900">{report.provincia}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 border-b border-slate-200 pb-1">
                                  <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Automezzo:</span>
                                  <span className="text-sm md:text-base italic font-medium text-slate-900">{report.veicoloTarga}</span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 border-b border-slate-200 pb-1">
                                  <span className="text-xs font-bold uppercase shrink-0 text-slate-700">Proprietà:</span>
                                  <span className="text-sm md:text-base italic font-medium text-slate-900">{report.veicoloProprieta}</span>
                                </div>
                              </div>

                              <div className="pt-1">
                                <span className="text-xs font-bold uppercase block mb-1 text-slate-800">Relazione / Note di Servizio:</span>
                                <p className="text-xs md:text-sm leading-relaxed text-slate-900 italic whitespace-pre-wrap bg-slate-50/80 p-3 md:p-5 border border-slate-300 rounded-md min-h-[300px] shadow-inner">
                                  {report.note}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 3 SIGNATURE BLOCKS FOR GUARDS */}
                          {(() => {
                            const guardNames = report.guardie ? report.guardie.split(",").map(g => g.trim()).filter(Boolean) : [];
                            const g1 = guardNames[0] || report.creatoDaNome || "Capo Pattuglia";
                            const g2 = guardNames[1] || "";
                            const g3 = guardNames[2] || "";

                            return (
                              <div className="pt-4 space-y-3 print:break-inside-avoid">
                                <div className="text-[10px] font-bold uppercase text-slate-600 border-b border-slate-300 pb-0.5">
                                  Firme delle Guardie Verbalizzanti / Operative:
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-6">
                                      Firma 1ª Guardia (Capo Pattuglia)
                                    </span>
                                    <div className="border-b border-slate-800 italic pb-0.5 text-xs font-medium text-slate-900 min-h-[20px]">
                                      {g1}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-6">
                                      Firma 2ª Guardia Operante
                                    </span>
                                    <div className="border-b border-slate-800 italic pb-0.5 text-xs font-medium text-slate-900 min-h-[20px]">
                                      {g2}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-6">
                                      Firma 3ª Guardia Operante
                                    </span>
                                    <div className="border-b border-slate-800 italic pb-0.5 text-xs font-medium text-slate-900 min-h-[20px]">
                                      {g3}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end items-center pt-2 text-[9px] uppercase font-semibold text-slate-500 border-t border-slate-200">
                                  <div>Data Redazione: <span className="text-slate-900 font-mono font-bold">{safeFormatDate(report.data, "dd/MM/yyyy")}</span> {report.oraInizio ? `(Ore ${report.oraInizio}${report.oraFine ? ` - ${report.oraFine}` : ""})` : ""}</div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="no-print mt-8 border-t border-slate-200 pt-6">
                            <InterventionAttachments 
                              reportId={report.id} 
                              db={db} 
                              userEmail={currentGuard?.email || "centrale@vigilanza.it"} 
                              isAdmin={isAdmin}
                              theme="light"
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (report.id) removeServiceReport(report.id);
                        }}
                        className="text-slate-600 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

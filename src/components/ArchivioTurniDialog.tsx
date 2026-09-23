import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, Search, Printer, X, Filter, Clock, ShieldAlert, CheckCircle, HelpCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shift, Guard } from "../types";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";

const safeFormatDate = (dateStr: string, template: string = "dd/MM/yyyy") => {
  if (!dateStr) return "—";
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) {
      return dateStr;
    }
    return format(parsed, template, { locale: it });
  } catch {
    return dateStr;
  }
};

interface ArchivioTurniDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: Shift[];
  guards: Guard[];
}

export const ArchivioTurniDialog: React.FC<ArchivioTurniDialogProps> = ({
  isOpen,
  onClose,
  shifts,
  guards,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // Year & Month filters
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<string>(currentYear.toString());
  const [monthFilter, setMonthFilter] = useState<string>("ALL");

  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear.toString());
    shifts.forEach(s => {
      if (s.date) {
        const yr = s.date.split("-")[0];
        if (yr && yr.length === 4) yearsSet.add(yr);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [shifts, currentYear]);

  const months = [
    { value: "ALL", label: "TUTTI I MESI" },
    { value: "01", label: "GENNAIO" },
    { value: "02", label: "FEBBRAIO" },
    { value: "03", label: "MARZO" },
    { value: "04", label: "APRILE" },
    { value: "05", label: "MAGGIO" },
    { value: "06", label: "GIUGNO" },
    { value: "07", label: "LUGLIO" },
    { value: "08", label: "AGOSTO" },
    { value: "09", label: "SETTEMBRE" },
    { value: "10", label: "OTTOBRE" },
    { value: "11", label: "NOVEMBRE" },
    { value: "12", label: "DICEMBRE" },
  ];

  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const gName = (s.guardName || "").toLowerCase();
      const notes = (s.notes || "").toLowerCase();
      const matricola = (s.matricola || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = gName.includes(query) || notes.includes(query) || matricola.includes(query);
      const matchesSector = sectorFilter === "ALL" || s.sector === sectorFilter;
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      
      let matchesYear = true;
      let matchesMonth = true;

      if (s.date) {
        const parts = s.date.split("-"); // YYYY-MM-DD
        if (parts.length >= 2) {
          const yr = parts[0];
          const mn = parts[1];
          if (yearFilter !== "ALL") matchesYear = yr === yearFilter;
          if (monthFilter !== "ALL") matchesMonth = mn === monthFilter;
        }
      }

      return matchesSearch && matchesSector && matchesStatus && matchesYear && matchesMonth;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [shifts, searchQuery, sectorFilter, statusFilter, yearFilter, monthFilter]);

  const handlePrintShifts = () => {
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const originalTitle = document.title;
    document.title = `Registro_Turni_Guardie_${yearFilter}_Mese_${monthFilter}`;

    const monthLabel = months.find(m => m.value === monthFilter)?.label || "TUTTO L'ANNO";

    const printHeaderHtml = `
      <div style="font-family: 'Times New Roman', Times, serif; color: black; width: 100%; max-width: 260mm; margin: 0 auto; padding: 0; font-size: 9.5pt; line-height: 1.35; background-color: white; box-sizing: border-box;">
        ${getOfficialPrintHeaderHtml("REGISTRO GENERALE DEI TURNI DI GUARDIA ATTIVI E CONVALIDATI", `Anno di riferimento: ${yearFilter} • Periodo: ${monthLabel}`)}
        
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 8pt; font-style: italic; margin-top: 1px;">Documento ad uso amministrativo interno d'ufficio per l'attestazione delle presenze sul campo</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 8.5pt; table-layout: fixed;">
          <colgroup>
            <col style="width: 10%;" />
            <col style="width: 21%;" />
            <col style="width: 8%;" />
            <col style="width: 13%;" />
            <col style="width: 11%;" />
            <col style="width: 23%;" />
            <col style="width: 14%;" />
          </colgroup>
          <thead>
            <tr style="background-color: #f3f4f6; border-top: 1.5px solid black; border-bottom: 1.5px solid black;">
              <th style="padding: 6px 4px; text-align: left; font-weight: bold; border-bottom: 1.5px solid black;">Data</th>
              <th style="padding: 6px 4px; text-align: left; font-weight: bold; border-bottom: 1.5px solid black;">Guardia / Operatore</th>
              <th style="padding: 6px 4px; text-align: center; font-weight: bold; border-bottom: 1.5px solid black;">Matricola</th>
              <th style="padding: 6px 4px; text-align: center; font-weight: bold; border-bottom: 1.5px solid black;">Settore</th>
              <th style="padding: 6px 4px; text-align: center; font-weight: bold; border-bottom: 1.5px solid black;">Orario</th>
              <th style="padding: 6px 4px; text-align: left; font-weight: bold; border-bottom: 1.5px solid black;">Note di Servizio</th>
              <th style="padding: 6px 4px; text-align: right; font-weight: bold; border-bottom: 1.5px solid black;">Stato</th>
            </tr>
          </thead>
          <tbody>
            ${filteredShifts.length === 0 ? `
              <tr>
                <td colspan="7" style="padding: 15px; text-align: center; font-style: italic; color: #4b5563;">
                  Nessun turno registrato corrispondente ai criteri selezionati.
                </td>
              </tr>
            ` : filteredShifts.map(s => {
              let statusLabel = s.status === "approved" ? "CONVALIDATO ✓" : 
                                s.status === "pending" ? "IN ATTESA" : 
                                s.status === "cancelled" ? "ANNULLATO" : "ANNULLAMENTO";
              return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 5px 4px; text-align: left; white-space: nowrap; font-weight: bold;">
                    ${safeFormatDate(s.date, "dd/MM/yyyy")}
                  </td>
                  <td style="padding: 5px 4px; text-align: left; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${s.guardName}
                  </td>
                  <td style="padding: 5px 4px; text-align: center; font-family: monospace; font-size: 8pt;">
                    ${s.matricola || "—"}
                  </td>
                  <td style="padding: 5px 4px; text-align: center; text-transform: uppercase; font-weight: bold; font-size: 7.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${s.sector}
                  </td>
                  <td style="padding: 5px 4px; text-align: center; font-family: monospace; font-weight: bold; white-space: nowrap; font-size: 8pt;">
                    ${s.startTime} - ${s.endTime}
                  </td>
                  <td style="padding: 5px 4px; text-align: left; font-style: italic; color: #374151; font-size: 8pt; word-break: break-word;">
                    ${s.notes || "Servizio ordinario sul territorio."}
                  </td>
                  <td style="padding: 5px 4px; text-align: right; font-weight: bold; font-size: 7.5pt; color: ${s.status === 'approved' ? '#047857' : s.status === 'cancelled' ? '#b91c1c' : '#b45309'}; white-space: nowrap;">
                    ${statusLabel}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <!-- Firma e Validità -->
        <div style="margin-top: 25px; display: flex; justify-content: space-between; page-break-inside: avoid;">
          <div style="width: 45%; text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 28px;">IL COORDINATORE DEL NUCLEO</div>
            <div style="width: 80%; border-top: 1px solid black;"></div>
            <div style="font-size: 7.5pt; font-style: italic; margin-top: 2px;">(Firma Autografa / Validazione Digitale)</div>
          </div>
          <div style="width: 45%; text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 28px;">IL PRESIDENTE EKOCLUB HQ</div>
            <div style="width: 80%; border-top: 1px solid black;"></div>
            <div style="font-size: 7.5pt; font-style: italic; margin-top: 2px;">(Firma Autografa per Presa Visione)</div>
          </div>
        </div>

        <div style="margin-top: 15px; font-size: 7pt; text-align: center; color: #4b5563; border-top: 1px dotted #ccc; padding-top: 4px;">
          Documento generato dall'Archivio Digitale di Presidenza e Amministrazione HQ in data ${new Date().toLocaleDateString("it-IT")} alle ore ${new Date().toLocaleTimeString("it-IT")}
        </div>
      </div>
    `;

    const htmlContent = `
      <html>
        <head>
          <title>Registro Turni Guardie</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 10mm 15mm; }
              body { 
                margin: 0;
                padding: 0;
                background-color: white !important;
                color: black !important;
              }
              .no-print-bar { display: none !important; }
            }
            body { background-color: #0f172a; color: white; padding: 20px; }
            .no-print-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background-color: #1e293b; border-bottom: 1px solid #334155; margin-bottom: 20px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
                <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #a855f7; letter-spacing: 0.5px;">
                  Anteprima Registro di Servizio Turni di Guardia (A4 Orizzontale)
                </span>
              </div>
              <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif;">
                Stampa conforme in formato A4 Orizzontale con margini laterali e proporzioni colonne bilanciate.
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <button 
                id="start-print-btn"
                style="padding: 10px 18px; background-color: #a855f7; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer;"
              >
                AVVIA STAMPA A4 ORIZZONTALE 🖨
              </button>
              <button 
                id="close-print-preview-btn"
                style="padding: 10px 18px; background-color: #e11d48; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer;"
              >
                CHIUDI ✕
              </button>
            </div>
          </div>
          ${printHeaderHtml}
        </body>
      </html>
    `;

    portal.innerHTML = htmlContent;

    const startBtn = portal.querySelector("#start-print-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        window.focus();
        window.print();
      });
    }

    const closeBtn = portal.querySelector("#close-print-preview-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.classList.remove("is-printing-active");
        const currentPortal = document.getElementById("global-print-portal");
        if (currentPortal) {
          currentPortal.innerHTML = "";
        }
        document.title = originalTitle;
      });
    }

    document.body.classList.add("is-printing-active");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[98vw] w-full md:max-w-[1750px] bg-[#020617] border border-slate-800 text-slate-200 p-6 rounded-3xl shadow-2xl flex flex-col h-[94vh] overflow-hidden">
        
        <DialogHeader className="shrink-0 border-b border-slate-900 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-normal italic uppercase tracking-widest text-purple-400 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-purple-400" />
                Registro Generale e Archivio Turni
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs uppercase tracking-wider mt-1">
                Visualizzazione storica e consolidata delle presenze programmate sul campo e relativi stati.
              </DialogDescription>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white h-8 w-8 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Filters and Controls Bar */}
        <div className="shrink-0 bg-slate-950/60 border border-slate-900 rounded-2xl p-4 mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cerca per guardia o matricola..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900/50 border-slate-800 text-sm pl-9 h-10 w-full"
              />
            </div>

            {/* Year Filter */}
            <div className="flex flex-col gap-1">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-300 uppercase tracking-wider font-mono outline-none w-full"
              >
                <option value="ALL">TUTTI GLI ANNI</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex flex-col gap-1">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-300 uppercase tracking-wider font-mono outline-none w-full"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Sector Filter */}
            <div className="flex flex-col gap-1">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-300 uppercase tracking-wider font-mono outline-none w-full"
              >
                <option value="ALL">TUTTI I SETTORI</option>
                <option value="zoofila">ZOOFILA</option>
                <option value="ittica">ITTICA</option>
                <option value="venatoria">VENATORIA</option>
                <option value="ambientale">AMBIENTALE</option>
              </select>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-900">
            {/* Status Filter buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">STATO TURNO:</span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${
                  statusFilter === "ALL" 
                    ? "bg-purple-950/40 text-purple-300 border-purple-500/50" 
                    : "bg-slate-900/40 text-slate-400 border-slate-900 hover:text-slate-300"
                }`}
              >
                TUTTI ({shifts.length})
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${
                  statusFilter === "approved" 
                    ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/50" 
                    : "bg-slate-900/40 text-slate-400 border-slate-900 hover:text-slate-300"
                }`}
              >
                APPROVATI ({shifts.filter(s => s.status === "approved").length})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${
                  statusFilter === "pending" 
                    ? "bg-amber-950/40 text-amber-300 border-amber-500/50" 
                    : "bg-slate-900/40 text-slate-400 border-slate-900 hover:text-slate-300"
                }`}
              >
                IN ATTESA ({shifts.filter(s => s.status === "pending").length})
              </button>
              <button
                onClick={() => setStatusFilter("cancelled")}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${
                  statusFilter === "cancelled" 
                    ? "bg-rose-950/40 text-rose-300 border-rose-500/50" 
                    : "bg-slate-900/40 text-slate-400 border-slate-900 hover:text-slate-300"
                }`}
              >
                ANNULLATI ({shifts.filter(s => s.status === "cancelled").length})
              </button>
            </div>

            {/* Print button */}
            <Button
              onClick={handlePrintShifts}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl h-9 cursor-pointer gap-1.5 shadow shadow-purple-600/20 px-4 self-end"
            >
              <Printer className="h-4 w-4" />
              Stampa Registro A4
            </Button>
          </div>
        </div>

        {/* Scrollable Table View */}
        <div className="flex-1 overflow-y-auto mt-4 rounded-2xl border border-slate-900 bg-slate-950/30">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/90 text-slate-400 uppercase tracking-widest text-[9.5px] font-black">
                  <th className="py-3 px-4 pl-6">Data</th>
                  <th className="py-3 px-4">Guardia / Operatore</th>
                  <th className="py-3 px-4 text-center">Matricola</th>
                  <th className="py-3 px-4 text-center">Settore</th>
                  <th className="py-3 px-4 text-center">Orario</th>
                  <th className="py-3 px-4">Note di Servizio</th>
                  <th className="py-3 px-4 text-right pr-6">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 font-sans font-medium text-xs">
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 italic uppercase tracking-wider text-xs bg-slate-950/10">
                      Nessun turno archiviato corrisponde ai filtri selezionati.
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((s) => {
                    return (
                      <tr key={s.id} className="hover:bg-slate-950/50 transition-colors text-slate-200">
                        <td className="py-3 px-4 pl-6 font-mono font-bold text-slate-400">
                          {safeFormatDate(s.date, "dd/MM/yyyy")}
                        </td>
                        <td className="py-3 px-4 uppercase font-bold text-slate-200">
                          {s.guardName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono uppercase text-slate-400">
                          {s.matricola || "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                            s.sector === "zoofila" ? "border-purple-500/20 bg-purple-500/5 text-purple-300" :
                            s.sector === "ittica" ? "border-blue-500/20 bg-blue-500/5 text-blue-300" :
                            s.sector === "venatoria" ? "border-amber-500/20 bg-amber-500/5 text-amber-300" :
                            "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                          }`}>
                            {s.sector}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-purple-400">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="py-3 px-4 text-xs font-normal text-slate-400 italic max-w-[250px] truncate">
                          {s.notes || "Vigilanza sul territorio."}
                        </td>
                        <td className="py-3 px-4 text-right pr-6">
                          <Badge className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            s.status === "approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                            s.status === "pending" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                            s.status === "cancelled" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                            "bg-orange-950 text-orange-400 border border-orange-800 animate-pulse"
                          }`}>
                            {s.status === "approved" ? "✓ Approvato" : 
                             s.status === "pending" ? "In attesa" : 
                             s.status === "cancelled" ? "Annullato" : "Rich. Annull."}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

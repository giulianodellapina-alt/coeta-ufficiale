import React, { useState, useMemo } from "react";
import { 
  X, Shield, User, Search, Folder, ClipboardList, BarChart3, 
  Printer, FileText, CheckCircle, AlertTriangle, Eye, Award, 
  CheckCircle2, ChevronRight, Scale, Calendar, HelpCircle, 
  Sparkles, Layers, Info, Trash2, Phone, Mail, Clock, MapPin, CheckSquare, RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, printElementById } from "../lib/utils";
import { Guard, Report, ServiceReport, TerritoryControl } from "../types";
import { formatDateIT } from "../lib/date-utils";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ReportHeader } from "./ReportHeader";

interface OperatoGuardieDialogProps {
  isOpen: boolean;
  onClose: () => void;
  guards: Guard[];
  reports: Report[];
  serviceReports: ServiceReport[];
  territoryControls: TerritoryControl[];
}

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
    console.error("Error formatting date in OperatoGuardieDialog:", dateVal, error);
    return "—";
  }
};

export const OperatoGuardieDialog: React.FC<OperatoGuardieDialogProps> = ({
  isOpen,
  onClose,
  guards = [],
  reports = [],
  serviceReports = [],
  territoryControls = []
}) => {
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [searchGuardQuery, setSearchGuardQuery] = useState("");
  const [searchActQuery, setSearchActQuery] = useState("");
  
  // Filtering states for guard history
  const [actTypeFilter, setActTypeFilter] = useState<"ALL" | "verbale" | "rapporto" | "controllo">("ALL");
  const [sectorFilter, setSectorFilter] = useState<"ALL" | "zoofila" | "ittica" | "venatoria">("ALL");
  const [comuneFilter, setComuneFilter] = useState("ALL");

  const [selectedAct, setSelectedAct] = useState<{
    id: string;
    type: "verbale" | "rapporto" | "controllo";
    item: any;
  } | null>(null);

  // Reset helper when guard is closed
  const handleCloseGuard = () => {
    setSelectedGuard(null);
    setSelectedAct(null);
    setSearchActQuery("");
    setActTypeFilter("ALL");
    setSectorFilter("ALL");
    setComuneFilter("ALL");
  };

  // Helper to map and compute statistics for a single guard across all database collections
  const getGuardStats = useMemo(() => {
    const statsMap: Record<string, {
      verbali: number;
      rapporti: number;
      controlli: number;
      total: number;
      verbaliList: Report[];
      rapportiList: ServiceReport[];
      controlliList: TerritoryControl[];
    }> = {};

    guards.forEach(g => {
      const guardNameLower = (g.name || "").toLowerCase();
      const guardSurnameLower = (g.surname || "").toLowerCase();

      const isMatch = (text: string) => {
        if (!text) return false;
        const tLower = text.toLowerCase();
        return tLower.includes(guardNameLower) || (guardSurnameLower && tLower.includes(guardSurnameLower));
      };

      // Match verbali (reports)
      const gVerbali = reports.filter(r => 
        r.creatoDa === g.id || 
        isMatch(r.verbalizzanti || "") || 
        isMatch(r.creatoDaNome || "")
      );

      // Match service reports
      const gRapporti = serviceReports.filter(r => 
        r.creatoDa === g.id || 
        isMatch(r.guardie || "") || 
        isMatch(r.creatoDaNome || "")
      );

      // Match territory controls
      const gControlli = territoryControls.filter(c => 
        c.creatoDa === g.id || 
        isMatch(c.guardie || "") || 
        isMatch(c.creatoDaNome || "")
      );

      statsMap[g.id] = {
        verbali: gVerbali.length,
        rapporti: gRapporti.length,
        controlli: gControlli.length,
        total: gVerbali.length + gRapporti.length + gControlli.length,
        verbaliList: gVerbali,
        rapportiList: gRapporti,
        controlliList: gControlli
      };
    });

    return statsMap;
  }, [guards, reports, serviceReports, territoryControls]);

  // Filter guards based on search query and sort them alphabetically
  const filteredGuards = useMemo(() => {
    const filtered = guards.filter(g => {
      const query = searchGuardQuery.toLowerCase();
      const fullName = `${g.name || ""} ${g.surname || ""}`.toLowerCase();
      const matricola = (g.matricola || "").toLowerCase();
      const role = (g.role || "").toLowerCase();
      return fullName.includes(query) || matricola.includes(query) || role.includes(query);
    });
    return [...filtered].sort((a, b) => {
      const surnameA = (a.surname || "").toLowerCase().trim();
      const surnameB = (b.surname || "").toLowerCase().trim();
      const nameA = (a.name || "").toLowerCase().trim();
      const nameB = (b.name || "").toLowerCase().trim();
      
      if (surnameA !== surnameB) {
        return surnameA.localeCompare(surnameB);
      }
      return nameA.localeCompare(nameB);
    });
  }, [guards, searchGuardQuery]);

  // Get active guard stats and timeline of operations
  const activeGuardData = useMemo(() => {
    if (!selectedGuard) return null;
    const stats = getGuardStats[selectedGuard.id] || {
      verbali: 0, rapporti: 0, controlli: 0, total: 0,
      verbaliList: [], rapportiList: [], controlliList: []
    };

    // Flatten all activities into a single sorted timeline
    const list: Array<{
      id: string;
      type: "verbale" | "rapporto" | "controllo";
      code: string;
      date: string;
      comune: string;
      localita: string;
      sector: "zoofila" | "ittica" | "venatoria" | "ambientale" | string;
      details: string;
      item: any;
    }> = [];

    // Verbali
    stats.verbaliList.forEach(r => {
      list.push({
        id: r.id,
        type: "verbale",
        code: r.numeroVerbale || "N.D.",
        date: r.data,
        comune: r.comune,
        localita: r.localita || r.recatPresso || "",
        sector: (r.tipoVerbale || "zoofila").toLowerCase(),
        details: `Soggetto: ${r.soggettoNome || "Ignoto"}. Specie animale: ${r.tipoAnimale || "Non ind."}`,
        item: r
      });
    });

    // Rapporti
    stats.rapportiList.forEach(r => {
      // Find sector
      let sector = "zoofila";
      if (r.settore) {
        const rawS = Array.isArray(r.settore) ? (r.settore[0] || "") : String(r.settore);
        const s = rawS.toLowerCase();
        if (s.includes("ittica") || s.includes("ittico")) sector = "ittica";
        else if (s.includes("venatoria") || s.includes("venatorio")) sector = "venatoria";
        else if (s.includes("ambientale")) sector = "ambientale";
      }

      list.push({
        id: r.id,
        type: "rapporto",
        code: r.numeroRapporto || "N.D.",
        date: r.data,
        comune: r.comune,
        localita: r.localita || "",
        sector: sector,
        details: `Note: ${r.note ? r.note.substring(0, 100) : "Nessuna nota aggiuntiva."}`,
        item: r
      });
    });

    // Controlli
    stats.controlliList.forEach(c => {
      list.push({
        id: c.id,
        type: "controllo",
        code: c.numeroControllo || "N.D.",
        date: c.data,
        comune: c.comune,
        localita: c.localita || "",
        sector: (c.settore || "zoofila").toLowerCase(),
        details: `Esito: ${c.esito.toUpperCase()}. Animale: ${c.specieRazza || "Non spec."}. Proprietario: ${c.nomeSoggetto || "Ignoto"}`,
        item: c
      });
    });

    // Sort descending by date
    const sorted = list.sort((a, b) => b.date.localeCompare(a.date));

    // Get unique municipalities for filtering
    const uniqueComuni = Array.from(new Set(sorted.map(s => (s.comune || "").trim()))).filter(Boolean).sort();

    // Filter timeline based on selections
    const filteredTimeline = sorted.filter(act => {
      const query = searchActQuery.toLowerCase();
      const codeMatch = (act.code || "").toLowerCase().includes(query);
      const locMatch = (act.localita || "").toLowerCase().includes(query);
      const detMatch = (act.details || "").toLowerCase().includes(query);
      const comMatch = (act.comune || "").toLowerCase().includes(query);
      const searchMatch = !searchActQuery || codeMatch || locMatch || detMatch || comMatch;

      const typeMatch = actTypeFilter === "ALL" || act.type === actTypeFilter;
      const sectorMatch = sectorFilter === "ALL" || act.sector === sectorFilter;
      const comuneMatch = comuneFilter === "ALL" || act.comune === comuneFilter;

      return searchMatch && typeMatch && sectorMatch && comuneMatch;
    });

    return {
      stats,
      timeline: sorted,
      filteredTimeline,
      uniqueComuni
    };
  }, [selectedGuard, getGuardStats, searchActQuery, actTypeFilter, sectorFilter, comuneFilter]);

  // Set the first item of the timeline as selected automatically when opening a guard, to avoid an empty state
  React.useEffect(() => {
    if (activeGuardData && activeGuardData.filteredTimeline.length > 0 && !selectedAct) {
      const first = activeGuardData.filteredTimeline[0];
      setSelectedAct({
        id: first.id,
        type: first.type,
        item: first.item
      });
    }
  }, [activeGuardData, selectedAct]);

  // Handle single item print triggering the global A4 print portal
  const handlePrintAct = (type: "verbale" | "rapporto" | "controllo") => {
    if (!selectedAct) return;
    const printId = `print-act-preview-${selectedAct.id}`;
    printElementById(printId, `Stampa Atto ${selectedAct.type.toUpperCase()} - ${selectedAct.id}`);
  };

  // Handle continuous dossier print triggering
  const handlePrintDossier = () => {
    if (!selectedGuard) return;
    printElementById(`print-dossier-preview-${selectedGuard.id}`, `Fascicolo Completo - ${selectedGuard.name} ${selectedGuard.surname || ""}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[98vw] w-full md:max-w-[1750px] bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden h-[94vh] rounded-3xl shadow-2xl">
        
        {/* Dynamic header */}
        <div className="px-6 py-4.5 border-b border-slate-800 shrink-0 bg-slate-950/85 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                Consultazione Operato & Fascicoli Guardie
              </DialogTitle>
              <DialogDescription className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                Archivio unico e storico delle attività sul campo (Zoofila, Ittica, Venatoria)
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Outer view */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!selectedGuard ? (
            /* ================= VIEW 1: SELECT GUARD ================= */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Top search & explanations */}
              <div className="bg-gradient-to-r from-purple-950/20 to-slate-900/40 p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-left max-w-2xl">
                  <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Area Ispettiva & Audit Amministrativo
                  </span>
                  <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    Consolle di Verifica Operato Agenti
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    Seleziona uno degli operatori elencati qui sotto per accedere istantaneamente al suo fascicolo personale, stampare il dossier di servizio o ispezionare singolarmente ogni verbale, rapporto di turno o controllo del territorio registrato a suo nome.
                  </p>
                </div>

                {/* Guard search input */}
                <div className="relative w-full md:w-80 shrink-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Filtra guardia per nome o matricola..."
                    value={searchGuardQuery}
                    onChange={(e) => setSearchGuardQuery(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs pl-9 h-9"
                  />
                </div>
              </div>

              {/* Guards Grid */}
              {filteredGuards.length === 0 ? (
                <div className="text-center py-20 text-slate-500 italic uppercase tracking-wider text-xs font-light bg-slate-950/20 border border-slate-900 rounded-3xl">
                  Nessuna guardia corrisponde alla ricerca.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGuards.map(g => {
                    const stats = getGuardStats[g.id] || { verbali: 0, rapporti: 0, controlli: 0, total: 0 };
                    
                    return (
                      <Card 
                        key={g.id} 
                        className={cn(
                          "bg-[#070c17]/60 border-slate-900 hover:border-purple-500/35 transition-all duration-300 shadow-xl overflow-hidden group flex flex-col",
                          g.isDisabled ? "opacity-60 border-red-950/50" : ""
                        )}
                      >
                        <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
                          
                          {/* Guard main headers */}
                          <div className="flex items-start gap-3.5">
                            <div className="h-12 w-12 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono text-base shrink-0 group-hover:scale-105 transition-transform">
                              {(g.name || "")[0] || "?"}{(g.surname || "")[0] || ""}
                            </div>
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-black text-white uppercase tracking-wide truncate max-w-[160px]">
                                  {g.surname ? `${g.name} ${g.surname}` : g.name}
                                </h4>
                                {g.role === "admin" ? (
                                  <Badge className="bg-red-950/65 text-red-400 text-[8px] font-black border border-red-900/30 rounded px-1.5 py-0 h-4">ADMIN</Badge>
                                ) : g.role === "responsabile" ? (
                                  <Badge className="bg-emerald-950/65 text-emerald-400 text-[8px] font-black border border-emerald-900/30 rounded px-1.5 py-0 h-4">RESP</Badge>
                                ) : null}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                MATRICOLA: <span className="text-white font-bold">{g.matricola || "—"}</span>
                              </p>
                              <p className="text-[9px] text-purple-300 font-bold uppercase tracking-wide">
                                {g.rank || "Guardia Particolare Giurata"}
                              </p>
                            </div>
                          </div>

                          {/* Mini Stat counters */}
                          <div className="grid grid-cols-3 gap-2 bg-[#02050c]/90 p-3 rounded-xl border border-slate-900/80 text-center">
                            <div className="space-y-0.5">
                              <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider leading-none">Verbali</span>
                              <span className="text-xs font-black text-red-400 font-mono">{stats.verbali}</span>
                            </div>
                            <div className="space-y-0.5 border-x border-slate-900">
                              <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider leading-none">Rapporti</span>
                              <span className="text-xs font-black text-emerald-400 font-mono">{stats.rapporti}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider leading-none">Controlli</span>
                              <span className="text-xs font-black text-yellow-400 font-mono">{stats.controlli}</span>
                            </div>
                          </div>

                          {/* Bottom Action bar */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-900/60 mt-auto">
                            <div className="flex flex-col text-left">
                              <span className="text-[7.5px] uppercase font-bold text-slate-500 tracking-widest">Totale Attività:</span>
                              <span className="text-xs font-extrabold text-purple-300 font-mono leading-none">{stats.total} Atti Svolti</span>
                            </div>

                            <Button
                              onClick={() => setSelectedGuard(g)}
                              size="sm"
                              className="bg-purple-950/40 border border-purple-500/20 hover:bg-purple-900/40 hover:border-purple-500/50 text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-xl py-1 px-3 h-8 flex items-center gap-1 cursor-pointer"
                            >
                              Apri Fascicolo <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                          </div>

                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================= VIEW 2: GUARD DETAIL & FILE INSPECTOR ================= */
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              
              {/* Back navigation & Profile Header */}
              <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-900 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button 
                  onClick={handleCloseGuard}
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold self-start flex items-center gap-1.5 px-2.5 h-8 cursor-pointer rounded-lg hover:bg-purple-950/10"
                >
                  ← Torna all'Elenco Guardie
                </Button>

                {/* Print whole dossier */}
                <Button
                  onClick={handlePrintDossier}
                  variant="outline"
                  size="sm"
                  className="bg-purple-950/20 border-purple-500/20 hover:bg-purple-900/40 hover:border-purple-500/50 text-purple-300 text-[10px] uppercase font-bold tracking-wider rounded-xl h-8 cursor-pointer flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" /> Stampa Fascicolo Continuo (A4)
                </Button>
              </div>

              {/* Guard Profile Summary */}
              <div className="px-6 py-3 bg-[#050912] border-b border-slate-900 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-600/10 border-2 border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedGuard.name || "")[0] || "?"}{(selectedGuard.surname || "")[0] || ""}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white uppercase italic tracking-wide">
                      {selectedGuard.name} {selectedGuard.surname || ""}
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Matricola: <span className="text-white font-mono font-bold">{selectedGuard.matricola || "—"}</span> • Ruolo: <span className="text-purple-300 font-bold">{selectedGuard.rank || "G.P.G. Zoofila"}</span>
                    </p>
                  </div>
                </div>

                {/* Mini contact info */}
                <div className="flex flex-wrap items-center gap-4 text-[10.5px] text-slate-400">
                  {selectedGuard.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-purple-400 shrink-0" /> {selectedGuard.email}
                    </span>
                  )}
                  {selectedGuard.phone && (
                    <span className="flex items-center gap-1.5 border-l border-slate-900 pl-4">
                      <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {selectedGuard.phone}
                    </span>
                  )}
                </div>

                {/* Tiny aggregate statistics counts */}
                {activeGuardData && (
                  <div className="flex items-center gap-1.5">
                    <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 text-center min-w-[50px]">
                      <span className="text-[7px] text-slate-500 uppercase font-black block leading-none">Verb.</span>
                      <span className="text-xs font-bold text-red-400 font-mono">{activeGuardData.stats.verbali}</span>
                    </div>
                    <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 text-center min-w-[50px]">
                      <span className="text-[7px] text-slate-500 uppercase font-black block leading-none">Rapp.</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{activeGuardData.stats.rapporti}</span>
                    </div>
                    <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 text-center min-w-[50px]">
                      <span className="text-[7px] text-slate-500 uppercase font-black block leading-none">Contr.</span>
                      <span className="text-xs font-bold text-yellow-400 font-mono">{activeGuardData.stats.controlli}</span>
                    </div>
                    <div className="bg-purple-950/20 px-2.5 py-1 rounded-lg border border-purple-900/30 text-center min-w-[50px]">
                      <span className="text-[7px] text-purple-400 uppercase font-black block leading-none">Tot.</span>
                      <span className="text-xs font-bold text-purple-300 font-mono">{activeGuardData.stats.total}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline & Detail Split Layout */}
              {activeGuardData && (
                <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                  
                  {/* LEFT COLUMN: ACTIVITY REGISTRY TIMELINE (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col h-full min-h-0 border-r border-slate-900 bg-slate-950/20">
                    
                    {/* Filters block */}
                    <div className="p-4 bg-[#060a13] border-b border-slate-900 space-y-3 shrink-0">
                      
                      {/* Search query inside active timeline */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Cerca per codice, località, note..."
                          value={searchActQuery}
                          onChange={(e) => setSearchActQuery(e.target.value)}
                          className="bg-slate-950 border-slate-900 text-xs pl-9 h-9"
                        />
                      </div>

                      {/* Dropdown Filters */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Act Type Filter */}
                        <div>
                          <label className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">Tipo Atto</label>
                          <select
                            value={actTypeFilter}
                            onChange={(e) => setActTypeFilter(e.target.value as any)}
                            className="bg-slate-950 border border-slate-900 rounded-lg px-2 h-8 text-[10px] text-slate-300 outline-none w-full uppercase font-semibold"
                          >
                            <option value="ALL">Tutti</option>
                            <option value="verbale">Sopralluoghi</option>
                            <option value="controllo">Controlli</option>
                            <option value="rapporto">Rapporti</option>
                          </select>
                        </div>

                        {/* Sector Filter */}
                        <div>
                          <label className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">Materia</label>
                          <select
                            value={sectorFilter}
                            onChange={(e) => setSectorFilter(e.target.value as any)}
                            className="bg-slate-950 border border-slate-900 rounded-lg px-2 h-8 text-[10px] text-slate-300 outline-none w-full uppercase font-semibold"
                          >
                            <option value="ALL">Tutte</option>
                            <option value="zoofila">Zoofila</option>
                            <option value="ittica">Ittica</option>
                            <option value="venatoria">Venatoria</option>
                          </select>
                        </div>

                        {/* Comune Filter */}
                        <div>
                          <label className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">Comune</label>
                          <select
                            value={comuneFilter}
                            onChange={(e) => setComuneFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-900 rounded-lg px-2 h-8 text-[10px] text-slate-300 outline-none w-full uppercase font-semibold"
                          >
                            <option value="ALL">Tutti</option>
                            {activeGuardData.uniqueComuni.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Timeline elements */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
                      {activeGuardData.filteredTimeline.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 italic uppercase tracking-wider text-xs font-light bg-[#080c16]/30 border border-slate-900/60 rounded-2xl">
                          Nessun atto corrisponde ai filtri impostati.
                        </div>
                      ) : (
                        activeGuardData.filteredTimeline.map((item, index) => {
                          const isSelected = selectedAct?.id === item.id && selectedAct?.type === item.type;
                          const itemDate = safeFormatDate(item.date, "dd/MM/yyyy");
                          
                          return (
                            <button
                              key={`${item.type}_${item.id}_${index}`}
                              onClick={() => setSelectedAct({ id: item.id, type: item.type, item: item.item })}
                              className={cn(
                                "w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 relative group cursor-pointer",
                                isSelected 
                                  ? "bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-950/10" 
                                  : "bg-[#090d16] border-slate-900/80 hover:bg-[#101524] hover:border-slate-800"
                              )}
                            >
                              {isSelected && (
                                <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-purple-500 rounded-r-md" />
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold font-mono">{itemDate}</span>
                                <div className="flex items-center gap-1.5">
                                  {/* Sector label */}
                                  <Badge className={cn(
                                    "text-[7px] uppercase tracking-wider font-mono h-3.5 px-1 font-bold rounded",
                                    item.sector === "zoofila" ? "bg-purple-950 text-purple-400 border border-purple-900/30" :
                                    item.sector === "ittica" ? "bg-blue-950 text-blue-400 border border-blue-900/30" :
                                    item.sector === "venatoria" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" :
                                    "bg-slate-900 text-slate-400 border border-slate-800"
                                  )}>
                                    {item.sector === "zoofila" ? "Zoofila" : item.sector === "ittica" ? "Ittica" : item.sector === "venatoria" ? "Venatoria" : "Generale"}
                                  </Badge>

                                  {/* Type label */}
                                  <Badge className={cn(
                                    "text-[8px] uppercase tracking-widest font-mono h-4 px-1.5 font-bold",
                                    item.type === "verbale" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                    item.type === "rapporto" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  )}>
                                    {item.type === "verbale" ? "Sopralluogo" : item.type === "rapporto" ? "Rapporto" : "Controllo"}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-white font-bold font-mono tracking-wide">{item.code}</span>
                                <span className="text-[9.5px] text-purple-300 font-bold uppercase font-sans">({item.comune})</span>
                              </div>

                              {item.localita && (
                                <p className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wide truncate">{item.localita}</p>
                              )}
                              <p className="text-slate-500 text-[10px] uppercase tracking-wider line-clamp-2 mt-0.5 leading-relaxed">{item.details}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: ACTIVE DOCUMENT DETAIL & PREVIEW VIEW (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col h-full min-h-0 overflow-hidden bg-slate-950/40">
                    {selectedAct ? (
                      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        
                        {/* Detail toolbar */}
                        <div className="px-6 py-3.5 bg-[#050912] border-b border-slate-900 shrink-0 flex items-center justify-between gap-3 text-left">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Dettaglio Documento Selezionato:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black font-mono text-white uppercase">{selectedAct.type === "verbale" ? "Sopralluogo" : selectedAct.type === "rapporto" ? "Rapporto Servizio" : "Controllo Rapido"} {selectedAct.item.numeroVerbale || selectedAct.item.numeroRapporto || selectedAct.item.numeroControllo || "—"}</span>
                            </div>
                          </div>

                          <Button
                            onClick={() => handlePrintAct(selectedAct.type)}
                            size="sm"
                            className="bg-emerald-950/20 border border-emerald-500/20 hover:bg-emerald-900/40 hover:border-emerald-500/50 text-emerald-300 text-[10px] uppercase font-black tracking-wider rounded-xl py-1 px-3.5 h-8.5 cursor-pointer flex items-center gap-1.5"
                          >
                            <Printer className="h-4 w-4" /> Stampa Atto A4
                          </Button>
                        </div>

                        {/* Scrollable Preview Screen */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-left space-y-6">
                          
                          {/* Printable wrapper */}
                          <div id={`print-act-preview-${selectedAct.id}`} className="bg-white text-slate-800 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/50 max-w-[800px] mx-auto space-y-6 text-xs leading-relaxed font-serif">
                            
                            {/* A4 Header */}
                            <ReportHeader hideTitle={true} />

                            {/* Act Title */}
                            <div className="text-center bg-slate-100 border border-slate-200 py-2.5 px-4 rounded font-bold uppercase tracking-widest text-slate-900 font-sans text-[11px]">
                              {selectedAct.type === "verbale" ? "Verbale di Sopralluogo ed Accertamento" : 
                               selectedAct.type === "rapporto" ? "Rapporto di Servizio Giornaliero" : 
                               "Scheda di Controllo Rapido del Territorio"}
                            </div>

                            {/* Document Meta grid */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="border border-slate-200 p-3.5 rounded bg-slate-50/50">
                                <div className="text-[8px] uppercase font-black tracking-wider text-slate-500 font-sans">Numero Identificativo Atto:</div>
                                <div className="text-xs font-bold text-slate-950 font-mono mt-1">
                                  {selectedAct.item.numeroVerbale || selectedAct.item.numeroRapporto || selectedAct.item.numeroControllo || "—"}
                                </div>
                              </div>
                              <div className="border border-slate-200 p-3.5 rounded bg-slate-50/50">
                                <div className="text-[8px] uppercase font-black tracking-wider text-slate-500 font-sans">Data dell'Intervento:</div>
                                <div className="text-xs font-bold text-slate-950 font-mono mt-1">
                                  {safeFormatDate(selectedAct.item.data, "EEEE dd MMMM yyyy")}
                                </div>
                              </div>
                            </div>

                            {/* Conditional Rendering depending on active document type */}
                            {selectedAct.type === "verbale" && (() => {
                              const v = selectedAct.item as Report;
                              return (
                                <div className="space-y-4 font-sans text-[11px] leading-relaxed">
                                  
                                  {/* Section 1: Agenti e Localizzazione */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-purple-600" /> Localizzazione ed Operatori
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Comune d'Intervento:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{v.comune || "Massa"} (MS)</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Località/Indirizzo:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{v.localita || v.recatPresso || "Non indicata"}</span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Agenti Verbalizzanti Operativi:</span>
                                      <span className="text-slate-900 uppercase font-semibold block bg-slate-50 p-2 border border-slate-100 rounded font-mono text-[10px]">
                                        {v.verbalizzanti || v.creatoDaNome || "Operatore d'Ufficio"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Section 2: Soggetto Controllato */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <User className="h-3.5 w-3.5 text-purple-600" /> Soggetto Identificato / Detentore
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Cognome e Nome / Ditta:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{v.soggettoNome || "IGNOTO / NON INDENTIFICATO"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Qualifica giuridica del detentore:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{v.proprietarioPossessore || "Non specificato"}</span>
                                    </div>
                                    {v.soggettoIl && (
                                      <div>
                                        <span className="font-bold text-slate-500 uppercase text-[8px] block">Nato a / Data:</span>
                                        <span className="text-slate-900 uppercase font-semibold">{v.soggettoNatoA || "—"} il {formatDateIT(v.soggettoIl)}</span>
                                      </div>
                                    )}
                                    {v.soggettoResidenteA && (
                                      <div>
                                        <span className="font-bold text-slate-500 uppercase text-[8px] block">Residente in (Indirizzo):</span>
                                        <span className="text-slate-900 uppercase font-semibold">{v.soggettoResidenteA} {v.soggettoProv ? `(${v.soggettoProv})` : ""} in {v.soggettoIndirizzo || "—"}</span>
                                      </div>
                                    )}
                                    {v.soggettoDocumentoTipo && (
                                      <div>
                                        <span className="font-bold text-slate-500 uppercase text-[8px] block">Documento d'Identità:</span>
                                        <span className="text-slate-900 uppercase font-semibold font-mono">{v.soggettoDocumentoTipo} N° {v.soggettoDocumentoNumero || "—"}</span>
                                      </div>
                                    )}
                                    {v.soggettoEmail && (
                                      <div>
                                        <span className="font-bold text-slate-500 uppercase text-[8px] block">Contatti (E-mail / Telefono):</span>
                                        <span className="text-slate-900 lowercase font-mono">{v.soggettoEmail}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Section 3: Animale */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <ClipboardList className="h-3.5 w-3.5 text-purple-600" /> Descrizione Animale / Microchip
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Specie e Razza / Quantità:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{v.tipoAnimale || "Non specificato"} (N° {v.numeroAnimali || "1"})</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Consenso alla verifica microchip:</span>
                                      <span className="text-slate-900 uppercase font-bold">{v.esito === "consenso" ? "✓ ACCORDATO" : "⚠️ NEGATO / INIBITO"}</span>
                                    </div>

                                    {v.chips && v.chips.length > 0 && (
                                      <div className="md:col-span-2">
                                        <span className="font-bold text-slate-500 uppercase text-[8px] block mb-1">Cani Rilevati con Lettore di Microchip:</span>
                                        <div className="space-y-1">
                                          {v.chips.map((ch, idx) => (
                                            <div key={idx} className="bg-slate-50 p-2 border border-slate-100 rounded flex justify-between font-mono text-[10px]">
                                              <span>CODICE CHIP: <strong>{ch.numero}</strong></span>
                                              <span>NOMINATIVO ANAGRAFE: <strong>{ch.nominativo || "NON ISCRITTO"}</strong></span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Section 4: Constatazioni sul campo */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <AlertTriangle className="h-3.5 w-3.5 text-purple-600" /> Constatazioni di Fatto ed Esito
                                  </div>
                                  <div className="space-y-1.5">
                                    <span className="font-bold text-slate-500 uppercase text-[8px] block">Descrizione dettagliata dello stato dei luoghi e degli animali:</span>
                                    <p className="bg-slate-50 p-3 border border-slate-200 rounded text-slate-950 whitespace-pre-wrap font-mono text-[9.5px] leading-relaxed">
                                      {v.constatazioni || "Nessuna constatazione inserita."}
                                    </p>
                                  </div>

                                  {/* Prescrizioni o Sanzioni */}
                                  {v.giorniRegolarizzazione && v.giorniRegolarizzazione > 0 ? (
                                    <div className="bg-yellow-50 border border-yellow-200 p-3.5 rounded-xl space-y-1">
                                      <span className="font-black text-yellow-800 uppercase text-[8.5px] flex items-center gap-1">
                                        <Scale className="h-3.5 w-3.5 shrink-0 text-yellow-700" /> Prescrizioni di Adeguamento Imposte
                                      </span>
                                      <p className="text-yellow-950 font-medium leading-relaxed">
                                        Si intima al trasgressore di regolarizzare le non conformità riscontrate sul posto entro il termine perentorio di <strong>{v.giorniRegolarizzazione} GIORNI</strong> decorrenti dalla data odierna, sotto pena di emissione di successivo verbale di sanzione pecuniaria L. 689/81.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-950 font-medium leading-relaxed">
                                      ✓ Nessuna violazione o prescrizione imposta sul posto. Il sopralluogo si è concluso con esito regolare ed idoneo.
                                    </div>
                                  )}

                                  {/* Signatures box */}
                                  <div className="grid grid-cols-2 gap-10 pt-16">
                                    <div className="border-t border-slate-400 text-center pt-2 text-[8px] uppercase tracking-wider text-slate-500">
                                      La Guardia Verbalizzante
                                      {v.firmaGuardia && (
                                        <div className="font-serif italic font-bold text-xs text-slate-900 mt-2">{v.firmaGuardia}</div>
                                      )}
                                    </div>
                                    <div className="border-t border-slate-400 text-center pt-2 text-[8px] uppercase tracking-wider text-slate-500">
                                      Il Soggetto Controllato / Detentore
                                      {v.firmaTrasgressore ? (
                                        <div className="font-serif italic font-bold text-xs text-slate-900 mt-2">{v.firmaTrasgressore}</div>
                                      ) : v.rifiutaFirma ? (
                                        <div className="text-[7.5px] font-black text-red-600 mt-2 italic">HA RIFIUTATO DI FIRMARE</div>
                                      ) : (
                                        <div className="text-[7.5px] font-light text-slate-400 mt-2 italic">FIRMA NON APPOSTA / IGNORATA</div>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              );
                            })()}

                            {selectedAct.type === "rapporto" && (() => {
                              const r = selectedAct.item as ServiceReport;
                              return (
                                <div className="space-y-4 font-sans text-[11px] leading-relaxed">
                                  
                                  {/* Localizzazione e Servizio */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-purple-600" /> Dettagli del Turno di Vigilanza
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Comune Principale:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{r.comune || "Massa"} (MS)</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Località Perlustrate:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{r.localita || "Tutto il territorio"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Orario di Servizio:</span>
                                      <span className="text-slate-900 font-mono font-semibold">Dalle {r.oraInizio || "—"} alle {r.oraFine || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Settori d'Attività:</span>
                                      <span className="text-slate-900 uppercase font-bold text-[9px] flex gap-1 flex-wrap">
                                        {(r.settore || ["ZOOFILA"]).map((s, idx) => (
                                          <span key={idx} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">{s}</span>
                                        ))}
                                      </span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Agenti di Vigilanza in Servizio:</span>
                                      <span className="text-slate-900 uppercase font-semibold block bg-slate-50 p-2 border border-slate-100 rounded font-mono text-[10px]">
                                        {r.guardie || r.creatoDaNome || "Operatore d'Ufficio"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Veicolo */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <Layers className="h-3.5 w-3.5 text-purple-600" /> Automezzo e Attrezzature Utilizzate
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Autovettura di Servizio:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{r.veicoloProprieta || "Veicolo di Nucleo"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Targa Veicolo:</span>
                                      <span className="text-slate-900 uppercase font-bold font-mono">{r.veicoloTarga || "N.D."}</span>
                                    </div>
                                  </div>

                                  {/* Note */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <FileText className="h-3.5 w-3.5 text-purple-600" /> Relazione di Turno / Attività Svolta
                                  </div>
                                  <div className="space-y-1.5">
                                    <span className="font-bold text-slate-500 uppercase text-[8px] block">Attività dettagliata svolta, controlli effettuati e anomalie:</span>
                                    <p className="bg-slate-50 p-3.5 border border-slate-200 rounded text-slate-950 whitespace-pre-wrap font-mono text-[9.5px] leading-relaxed">
                                      {r.note || "Nessuna nota aggiuntiva registrata."}
                                    </p>
                                  </div>

                                  {/* Signatures box */}
                                  <div className="grid grid-cols-1 pt-16">
                                    <div className="border-t border-slate-400 text-center pt-2 text-[8px] uppercase tracking-wider text-slate-500 max-w-[250px] mx-auto">
                                      Capopattuglia Verbalizzante
                                      {r.firmaGuardia && (
                                        <div className="font-serif italic font-bold text-xs text-slate-900 mt-2">{r.firmaGuardia}</div>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              );
                            })()}

                            {selectedAct.type === "controllo" && (() => {
                              const c = selectedAct.item as TerritoryControl;
                              return (
                                <div className="space-y-4 font-sans text-[11px] leading-relaxed">
                                  
                                  {/* Localizzazione e Agenti */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-purple-600" /> Dettagli Logistici e Operatori
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Comune del Controllo:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{c.comune || "Massa"} (MS)</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Località Specifica:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{c.localita || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Data ed Ora del Controllo:</span>
                                      <span className="text-slate-900 font-mono font-semibold">{c.data} alle ore {c.ora || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Materia d'intervento:</span>
                                      <span className="text-slate-900 uppercase font-bold">{c.settore || "Zoofila"}</span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Guardie di Turno sul Posto:</span>
                                      <span className="text-slate-900 uppercase font-semibold block bg-slate-50 p-2 border border-slate-100 rounded font-mono text-[10px]">
                                        {c.guardie || c.creatoDaNome || "Operatore d'Ufficio"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Soggetto e Animale */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <ClipboardList className="h-3.5 w-3.5 text-purple-600" /> Soggetto Identificato ed Animale Rilevato
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Nominativo Controllato / Proprietario:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{c.nomeSoggetto || "IGNOTI"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Documento Esibito:</span>
                                      <span className="text-slate-900 uppercase font-semibold font-mono">{c.documentoEsibito || "Nessuno / Non specificato"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Specie e Razza Rilevata:</span>
                                      <span className="text-slate-900 uppercase font-semibold">{c.specieRazza || "Non specificato"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-500 uppercase text-[8px] block">Numero Microchip Rilevato:</span>
                                      <span className="text-slate-900 uppercase font-bold font-mono text-[11.5px] text-purple-700">{c.microchip || "NON PRESENTE / NON RILEVATO"}</span>
                                    </div>
                                  </div>

                                  {/* Esito */}
                                  <div className="border-b border-slate-300 pb-1.5 text-[9.5px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5 pt-2">
                                    <AlertTriangle className="h-3.5 w-3.5 text-purple-600" /> Esito del Controllo Territoriale
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-500 uppercase text-[8px]">Stato di Regolarità Rilevato:</span>
                                      {c.esito === "regolare" ? (
                                        <span className="bg-emerald-100 text-emerald-800 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded border border-emerald-300">✓ IDONEO / REGOLARE</span>
                                      ) : c.esito === "con_prescrizioni" ? (
                                        <span className="bg-yellow-100 text-yellow-800 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded border border-yellow-300">⚠️ CON PRESCRIZIONI ADEGUAMENTO</span>
                                      ) : (
                                        <span className="bg-red-100 text-red-800 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded border border-red-300">❌ ACCERTATA VIOLAZIONE</span>
                                      )}
                                    </div>

                                    {c.prescrizioneTesto && (
                                      <div className="bg-yellow-50 p-3 border border-yellow-200 rounded-xl space-y-1">
                                        <span className="font-bold text-yellow-800 uppercase text-[8px] block">Prescrizione di regolarizzazione imposta:</span>
                                        <p className="text-yellow-950 font-medium">
                                          {c.prescrizioneTesto} 
                                          {c.giorniAdeguamento && <span> (Termine: <strong>{c.giorniAdeguamento} GIORNI</strong>)</span>}
                                        </p>
                                      </div>
                                    )}

                                    {c.note && (
                                      <div className="space-y-1">
                                        <span className="font-bold text-slate-500 uppercase text-[8px] block">Note Integrative d'Ufficio:</span>
                                        <p className="bg-slate-50 p-3 border border-slate-200 rounded text-slate-950 whitespace-pre-wrap font-mono text-[9.5px] leading-relaxed">
                                          {c.note}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Signatures box */}
                                  <div className="grid grid-cols-1 pt-12">
                                    <div className="border-t border-slate-400 text-center pt-2 text-[8px] uppercase tracking-wider text-slate-500 max-w-[250px] mx-auto">
                                      La Guardia Accertatrice
                                      <div className="font-serif italic font-bold text-xs text-slate-900 mt-2">{c.creatoDaNome || "Operatore d'Ufficio"}</div>
                                    </div>
                                  </div>

                                </div>
                              );
                            })()}

                          </div>

                          {/* Hidden continuous dossier print page (formatted and styled purely for clean continuous page printer) */}
                          <div style={{ display: "none" }}>
                            <div id={`print-dossier-preview-${selectedGuard.id}`} className="bg-white text-slate-950 p-10 font-sans text-xs leading-relaxed max-w-[850px] mx-auto space-y-6">
                              
                              {/* Header */}
                              <ReportHeader hideTitle={true} />

                              {/* Title */}
                              <div className="text-center bg-purple-100 border border-purple-200 py-3 px-4 rounded font-bold uppercase tracking-widest text-purple-900 text-[11px]">
                                Fascicolo Personale ed Operato dell'Operatore
                              </div>

                              {/* Personal metadata */}
                              <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded bg-slate-50/50">
                                <div>
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">Cognome e Nome Operatore:</span>
                                  <span className="text-sm font-bold text-slate-950 uppercase">{selectedGuard.name} {selectedGuard.surname || ""}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">Matricola Nazionale:</span>
                                  <span className="text-sm font-mono font-bold text-slate-950">{selectedGuard.matricola || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">Ruolo / Grado:</span>
                                  <span className="text-xs font-semibold text-slate-800 uppercase">{selectedGuard.rank || "Guardia Particolare Giurata"}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">Contatti:</span>
                                  <span className="text-xs font-mono text-slate-800">{selectedGuard.email || "—"} • {selectedGuard.phone || "—"}</span>
                                </div>
                              </div>

                              {/* Stats table */}
                              <div className="space-y-1.5">
                                <span className="text-[9px] uppercase font-bold text-slate-800 block tracking-wider">Riepilogo Totale Atti d'Ufficio Registrati:</span>
                                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[8.5px]">
                                      <th className="border border-slate-300 p-2">Tipologia Atti d'Ufficio</th>
                                      <th className="border border-slate-300 p-2 text-center">Codifica Codici</th>
                                      <th className="border border-slate-300 p-2 text-center">Quantità Atti</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="border border-slate-300 p-2 font-bold uppercase">Verbali di Sopralluogo ed Accertamento</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono">SO-MS-...</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{activeGuardData.stats.verbali}</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-300 p-2 font-bold uppercase">Rapporti di Servizio Giornalieri di Turno</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono">RS-MS-...</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{activeGuardData.stats.rapporti}</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-300 p-2 font-bold uppercase">Schede di Controllo Rapido del Territorio</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono">CT-MS-...</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{activeGuardData.stats.controlli}</td>
                                    </tr>
                                    <tr className="bg-slate-50 font-bold">
                                      <td className="border border-slate-300 p-2 uppercase text-purple-900" colSpan={2}>Totale Complessivo Attività Svolta sul Campo</td>
                                      <td className="border border-slate-300 p-2 text-center font-mono text-purple-900 text-sm">{activeGuardData.stats.total}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Interventions table timeline list */}
                              <div className="space-y-1.5 pt-4">
                                <span className="text-[9px] uppercase font-bold text-slate-800 block tracking-wider">Cronologia Completa degli Interventi:</span>
                                <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[8px]">
                                      <th className="border border-slate-300 p-2">Data</th>
                                      <th className="border border-slate-300 p-2">Tipo Atto</th>
                                      <th className="border border-slate-300 p-2">Codice Identificativo</th>
                                      <th className="border border-slate-300 p-2">Settore</th>
                                      <th className="border border-slate-300 p-2">Località / Comune</th>
                                      <th className="border border-slate-300 p-2">Note / Dettagli Principali</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeGuardData.timeline.map((act, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">{safeFormatDate(act.date, "dd/MM/yyyy")}</td>
                                        <td className="border border-slate-300 p-2 font-bold uppercase text-[8px]">
                                          {act.type === "verbale" ? "Sopralluogo" : act.type === "rapporto" ? "Rapporto" : "Controllo"}
                                        </td>
                                        <td className="border border-slate-300 p-2 font-mono font-bold">{act.code}</td>
                                        <td className="border border-slate-300 p-2 font-semibold uppercase text-[8px]">{act.sector}</td>
                                        <td className="border border-slate-300 p-2 uppercase">{act.localita ? `${act.localita}, ` : ""}{act.comune}</td>
                                        <td className="border border-slate-300 p-2 text-[9px] uppercase font-light leading-relaxed">{act.details}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Footer signatures */}
                              <div className="grid grid-cols-2 gap-10 pt-16">
                                <div className="border-t border-slate-400 text-center pt-2 text-[8px] uppercase tracking-wider text-slate-500">
                                  Firma dell'Operatore
                                </div>
                                <div className="border-t border-slate-400 text-center pt-2 text-[8px] uppercase tracking-wider text-slate-500">
                                  Il Comandante di Nucleo
                                </div>
                              </div>

                            </div>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                        <FileText className="h-10 w-10 text-slate-600 mb-2 animate-pulse" />
                        <h4 className="text-xs uppercase font-black text-slate-400 tracking-wider">Nessun Atto Selezionato</h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Seleziona un atto dal registro di sinistra per aprirne l'ispezione ed il modulo di stampa A4.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

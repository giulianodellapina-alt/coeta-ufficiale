import React, { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { 
  BarChart3, ClipboardList, Shield, Search, Calendar as CalendarIcon, 
  MapPin, PlusCircle, Check, Eye, Trash2, Printer, CheckSquare, 
  User, Building2, CheckCircle2, AlertTriangle, HelpCircle, FileText, Camera, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDateIT } from "../lib/date-utils";
import { db } from "../lib/firebase";
import { collection, doc, addDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { Report, ServiceReport, TerritoryControl, Guard } from "../types";
import { InterventionAttachments } from "./InterventionAttachments";
import { syncMicrochipToArchive } from "../lib/microchipSync";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";

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

interface StatsAndControlsTabProps {
  reports: Report[];
  serviceReports: ServiceReport[];
  territoryControls: TerritoryControl[];
  guards: Guard[];
  currentGuard: Guard | null;
  isAdmin: boolean;
  isSuperUser: boolean;
  activeSector?: string;
  initialSubTab?: "stats" | "controls";
}

export const StatsAndControlsTab: React.FC<StatsAndControlsTabProps> = ({
  reports: allReports,
  serviceReports,
  territoryControls: allTerritoryControls,
  guards,
  currentGuard,
  isAdmin,
  isSuperUser,
  activeSector = "zoofila",
  initialSubTab = "controls",
}) => {
  // Sector text helpers
  const sectorLabel = activeSector === "ittica" ? "Ittico" : activeSector === "venatoria" ? "Venatorio" : "Zoofilo";
  const sectorLabelFeminine = activeSector === "ittica" ? "Ittica" : activeSector === "venatoria" ? "Venatoria" : "Zoofila";

  // Dynamic filter lists based on active sector to ensure absolute isolation
  const reports = useMemo(() => {
    return allReports.filter(r => {
      if (!activeSector) return true;
      return (r.tipoVerbale || "zoofila").toLowerCase() === activeSector.toLowerCase();
    });
  }, [allReports, activeSector]);

  const territoryControls = useMemo(() => {
    return allTerritoryControls.filter(c => {
      if (!activeSector) return true;
      return (c.settore || "zoofila").toLowerCase() === activeSector.toLowerCase();
    });
  }, [allTerritoryControls, activeSector]);

  // Navigation tabs inside the Stats workspace
  const [activeSubTab, setActiveSubTab] = useState<"stats" | "controls">(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Search & Filter for controls register
  const [searchQuery, setSearchQuery] = useState("");
  const [comuneFilter, setComuneFilter] = useState("ALL");
  const [esitoFilter, setEsitoFilter] = useState("ALL");
  const [controlDateFilter, setControlDateFilter] = useState("");
  const [controlEndDateFilter, setControlEndDateFilter] = useState("");

  // Guard detail modal
  const [selectedGuardForDetail, setSelectedGuardForDetail] = useState<Guard | null>(null);
  const [isGuardDetailOpen, setIsGuardDetailOpen] = useState(false);

  // Guard detail timeline selections & filters
  const [selectedIntervention, setSelectedIntervention] = useState<{
    id: string;
    type: "verbale" | "rapporto" | "controllo";
    code: string;
    date: string;
    comune: string;
    localita: string;
    details: string;
  } | null>(null);
  const [guardHistorySearch, setGuardHistorySearch] = useState("");
  const [guardHistoryTypeFilter, setGuardHistoryTypeFilter] = useState("ALL");
  const [guardHistoryComuneFilter, setGuardHistoryComuneFilter] = useState("ALL");

  const closeGuardDetail = () => {
    setIsGuardDetailOpen(false);
    setSelectedGuardForDetail(null);
    setSelectedIntervention(null);
    setGuardHistorySearch("");
    setGuardHistoryTypeFilter("ALL");
    setGuardHistoryComuneFilter("ALL");
  };

  // Comune detail modal
  const [selectedComuneForDetail, setSelectedComuneForDetail] = useState<string | null>(null);
  const [isComuneDetailOpen, setIsComuneDetailOpen] = useState(false);
  const [selectedComuneAct, setSelectedComuneAct] = useState<{ type: "verbale" | "rapporto" | "controllo"; id: string } | null>(null);

  // New Control Dialog state
  const [isAddingControl, setIsAddingControl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [controlImage, setControlImage] = useState<string>("");

  // Form State
  const [newControl, setNewControl] = useState<Partial<TerritoryControl>>({
    data: "",
    ora: "",
    comune: "",
    localita: "",
    guardie: "",
    settore: "zoofila",
    specieRazza: "",
    microchip: "",
    nomeSoggetto: "",
    documentoEsibito: "",
    esito: "regolare",
    prescrizioneTesto: "",
    giorniAdeguamento: 10,
    note: "",
  });

  // Selected Control detail for viewer
  const [viewedControl, setViewedControl] = useState<TerritoryControl | null>(null);

  // Comuni di Massa-Carrara
  const comuniMassaCarrara = [
    "Aulla", "Bagnone", "Carrara", "Casola in Lunigiana", "Comano", "Filattiera", 
    "Fivizzano", "Fosdinovo", "Licciana Nardi", "Massa", "Montignoso", "Mulazzo", 
    "Podenzana", "Pontremoli", "Tresana", "Villafranca in Lunigiana", "Zeri"
  ];

  // Helper for Base64 image compression/rotation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'immagine supera i 2MB. Si prega di selezionare un'immagine più piccola.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setControlImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Safe generation of random index IDs or unique values
  const generateControlNumber = () => {
    const year = new Date().getFullYear();
    const countCurrentYear = territoryControls.filter(c => c.data.startsWith(String(year))).length;
    const progressive = String(countCurrentYear + 1).padStart(4, "0");
    return `CT-${year}-${progressive}`;
  };

  const handleSaveControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newControl.comune || !newControl.localita) {
      alert("Si prega di completare i campi obbligatori (Comune e Località)");
      return;
    }

    if (newControl.microchip) {
      const chip = newControl.microchip.trim();
      if (chip.length > 0 && chip.length !== 15) {
        alert(`⚠️ ATTENZIONE: MICROCHIP INCOMPLETO\n\nIl codice Microchip inserito "${chip}" contiene ${chip.length} cifre anziché 15.\n\nI codici dei microchip per cani DEVONO essere di ESATTAMENTE 15 cifre numeriche (es. 380260001234567).\n\nVerifica il numero inserito prima di proseguire.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const generatedNum = generateControlNumber();
      const savePayload: Partial<TerritoryControl> = {
        ...newControl,
        numeroControllo: generatedNum,
        specieRazza: newControl.specieRazza || "Cane",
        nomeCane: newControl.nomeCane || "",
        proprietario: newControl.proprietario || newControl.nomeSoggetto || "",
        nomeSoggetto: newControl.proprietario || newControl.nomeSoggetto || newControl.nomeCane || "Cane Controllato",
        documentoEsibito: newControl.documentoEsibito || (newControl.microchip?.trim() ? "LETTURA MICROCHIP" : ""),
        image: controlImage,
        creatoAl: new Date(),
        creatoDa: currentGuard?.id || "admin",
        creatoDaNome: currentGuard?.name ? `${currentGuard.name} ${currentGuard.surname || ""}` : "Amministratore Sede",
      };

      const docRef = await addDoc(collection(db, "territory_controls"), savePayload);
      
      // Sincronizzazione automatica microchip nell'Anagrafe Canina
      if (newControl.microchip) {
        syncMicrochipToArchive({
          microchip: newControl.microchip,
          specieRazza: newControl.specieRazza || "Cane",
          nomeCane: newControl.nomeCane || newControl.nomeSoggetto,
          proprietarioCognome: newControl.proprietario || newControl.nomeSoggetto,
          comune: newControl.comune,
          localita: newControl.localita,
          fonte: `Controllo Territoriale (${generatedNum})`
        });
      }

      setIsAddingControl(false);
      alert(`Controllo sul territorio ${generatedNum} salvato con successo nell'Archivio!`);
      
      // Reset State
      setNewControl({
        data: "",
        ora: "",
        comune: "",
        localita: "",
        guardie: "",
        settore: "zoofila",
        specieRazza: "",
        microchip: "",
        nomeSoggetto: "",
        documentoEsibito: "",
        esito: "regolare",
        prescrizioneTesto: "",
        giorniAdeguamento: 10,
        note: "",
      });
      setControlImage("");
    } catch (err) {
      console.error("Errore durante il salvataggio del controllo:", err);
      alert("Errore nel salvataggio. Si prega di verificare la connessione o i permessi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteControl = async (id: string, num: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare definitivamente il Controllo ${num} dall'archivio? Opzione irreversibile.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "territory_controls", id));
      alert(`Controllo ${num} rimosso con successo.`);
      if (viewedControl?.id === id) {
        setViewedControl(null);
      }
    } catch (err) {
      console.error("Errore eliminazione controllo:", err);
      alert("Errore durante l'eliminazione.");
    }
  };

  // AGGREGATE CORE STATISTICS FOR THE HQ (Real-Time Calculations)
  const totalServices = useMemo(() => {
    return reports.length + serviceReports.length + territoryControls.length;
  }, [reports, serviceReports, territoryControls]);

  const totalTerritoryControls = useMemo(() => {
    // territoryControls (Zoofili field checks) + rapports from Sectors Ittica and Venatoria
    const zoofilaFieldChecks = territoryControls.length;
    const itticaVenatoriaReportsCount = serviceReports.filter(r => {
      const sectorsStr = (r.settore || []).map(s => s.toLowerCase());
      return sectorsStr.some(s => s.includes("ittica") || s.includes("venatoria") || s.includes("venat"));
    }).length;

    return zoofilaFieldChecks + itticaVenatoriaReportsCount;
  }, [serviceReports, territoryControls]);

  const closedIntervSenzaVerb = useMemo(() => {
    // Controlli regolari o con prescrizioni (non sfociati in sanzioni penali/amministrative verbali immediati)
    return territoryControls.filter(c => c.esito === "regolare" || c.esito === "con_prescrizioni").length;
  }, [territoryControls]);

  const closedIntervConVerb = useMemo(() => {
    // Verbali di sopralluogo + controlli sfociati in violazione verbale
    return reports.length + territoryControls.filter(c => c.esito === "violazione").length;
  }, [reports, territoryControls]);

  // Group by Municipality (Comune)
  const statsByComune = useMemo(() => {
    const counts: Record<string, number> = {};
    comuniMassaCarrara.forEach(c => counts[c] = 0);

    // Sum from verbali (reports)
    reports.forEach(r => {
      if (r.comune) {
        const match = comuniMassaCarrara.find(c => c.toLowerCase() === r.comune.toLowerCase().trim());
        if (match) counts[match]++;
      }
    });

    // Sum from service rapports
    serviceReports.forEach(r => {
      if (r.comune) {
        const match = comuniMassaCarrara.find(c => c.toLowerCase() === r.comune.toLowerCase().trim());
        if (match) counts[match]++;
      }
    });

    // Sum from territory controls
    territoryControls.forEach(c => {
      if (c.comune) {
        const match = comuniMassaCarrara.find(m => m.toLowerCase() === c.comune.toLowerCase().trim());
        if (match) counts[match]++;
      }
    });

    return counts;
  }, [reports, serviceReports, territoryControls]);

  // Aggregate stats per single guard
  const statsByGuard = useMemo(() => {
    const guardStats: Record<string, { 
      guard: Guard; 
      verbali: number; 
      rapporti: number; 
      controlli: number;
      total: number;
    }> = {};

    // Initialise with known active/inactive guards
    guards.forEach(g => {
      guardStats[g.id] = {
        guard: g,
        verbali: 0,
        rapporti: 0,
        controlli: 0,
        total: 0
      };
    });

    // Helper to find guard by name or surname
    const findGuardIdByName = (text: string): string | null => {
      if (!text) return null;
      const lowerText = text.toLowerCase();
      const matched = guards.find(g => {
        const nameStr = g.name || "";
        const surnameStr = g.surname || "";
        const fullName = `${nameStr} ${surnameStr}`.toLowerCase();
        const reverseName = `${surnameStr} ${nameStr}`.toLowerCase();
        return (nameStr && lowerText.includes(nameStr.toLowerCase())) || 
               fullName.includes(lowerText) || 
               reverseName.includes(lowerText);
      });
      return matched ? matched.id : null;
    };

    // Parse verbali (reports)
    reports.forEach(r => {
      if (r.creatoDa) {
        if (guardStats[r.creatoDa]) {
          guardStats[r.creatoDa].verbali++;
          return;
        }
      }
      
      const vText = r.verbalizzanti || "";
      const guardId = findGuardIdByName(vText);
      if (guardId && guardStats[guardId]) {
        guardStats[guardId].verbali++;
      }
    });

    // Parse service reports
    serviceReports.forEach(r => {
      if (r.creatoDa && guardStats[r.creatoDa]) {
         guardStats[r.creatoDa].rapporti++;
         return;
      }
      const gText = r.guardie || "";
      const guardId = findGuardIdByName(gText);
      if (guardId && guardStats[guardId]) {
        guardStats[guardId].rapporti++;
      }
    });

    // Parse territory controls
    territoryControls.forEach(c => {
      if (c.creatoDa && guardStats[c.creatoDa]) {
        guardStats[c.creatoDa].controlli++;
        return;
      }
      const gText = c.guardie || "";
      const guardId = findGuardIdByName(gText);
      if (guardId && guardStats[guardId]) {
        guardStats[guardId].controlli++;
      }
    });

    // Compute totals and convert to sorted array
    return Object.values(guardStats)
      .map(entry => {
        const total = entry.verbali + entry.rapporti + entry.controlli;
        return { ...entry, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [reports, serviceReports, territoryControls, guards]);

  // Aggregate monthly progression (Monthly Stats for current year / selectable)
  const currentYear = new Date().getFullYear();
  const [selectedStatsYear, setSelectedStatsYear] = useState<number>(currentYear);

  const monthsList = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", 
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const statsMonthly = useMemo(() => {
    const monthlyCounts = Array(12).fill(0).map(() => ({ verbali: 0, rapporti: 0, controlli: 0, total: 0 }));

    const parseMonthIndex = (dateStr: string): number | null => {
      if (!dateStr) return null;
      try {
        const parsed = parseISO(dateStr);
        if (parsed.getFullYear() === selectedStatsYear) {
          return parsed.getMonth();
        }
      } catch {
        // Fallback for custom formats YYYY-MM-DD
        const parts = dateStr.split("-");
        if (parts.length >= 2 && Number(parts[0]) === selectedStatsYear) {
          return Number(parts[1]) - 1;
        }
      }
      return null;
    };

    // Reports (Verbali)
    reports.forEach(r => {
      const monthIdx = parseMonthIndex(r.data);
      if (monthIdx !== null) monthlyCounts[monthIdx].verbali++;
    });

    // Service Reports
    serviceReports.forEach(r => {
      const monthIdx = parseMonthIndex(r.data);
      if (monthIdx !== null) monthlyCounts[monthIdx].rapporti++;
    });

    // Territory Controls
    territoryControls.forEach(c => {
      const monthIdx = parseMonthIndex(c.data);
      if (monthIdx !== null) monthlyCounts[monthIdx].controlli++;
    });

    // Fill Totals
    return monthlyCounts.map((item, index) => ({
      month: monthsList[index],
      ...item,
      total: item.verbali + item.rapporti + item.controlli
    }));
  }, [reports, serviceReports, territoryControls, selectedStatsYear]);

  // Filtered Territory Controls Register
  const filteredControls = useMemo(() => {
    const getNormalizedIsoDate = (dateStr?: string) => {
      if (!dateStr) return "";
      const trimmed = dateStr.trim();
      if (trimmed.includes("-") && trimmed.length >= 10) return trimmed.slice(0, 10);
      if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts;
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
      return trimmed;
    };

    return territoryControls.filter(c => {
      const matchesSearch = 
        (c.numeroControllo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.comune || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.localita || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.microchip || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nomeSoggetto || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nomeCane || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.proprietario || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.specieRazza || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.guardie || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.data || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesComune = comuneFilter === "ALL" || c.comune === comuneFilter;
      const matchesEsito = esitoFilter === "ALL" || c.esito === esitoFilter;

      const cIso = getNormalizedIsoDate(c.data);
      let matchesDate = true;
      if (controlDateFilter && controlEndDateFilter) {
        matchesDate = cIso >= controlDateFilter && cIso <= controlEndDateFilter;
      } else if (controlDateFilter) {
        matchesDate = cIso === controlDateFilter || (c.data || "").includes(controlDateFilter);
      } else if (controlEndDateFilter) {
        matchesDate = cIso <= controlEndDateFilter;
      }

      return matchesSearch && matchesComune && matchesEsito && matchesDate;
    });
  }, [territoryControls, searchQuery, comuneFilter, esitoFilter, controlDateFilter, controlEndDateFilter]);

  // Guard detail timeline items
  const guardHistoryInterventions = useMemo(() => {
    if (!selectedGuardForDetail) return [];

    const guardNameLower = (selectedGuardForDetail.name || "").toLowerCase();
    const guardSurnameLower = (selectedGuardForDetail.surname || "").toLowerCase();

    const isMatch = (text: string) => {
      if (!text) return false;
      const tLower = text.toLowerCase();
      return tLower.includes(guardNameLower) || tLower.includes(guardSurnameLower);
    };

    const list: Array<{
      id: string;
      type: "verbale" | "rapporto" | "controllo";
      code: string;
      date: string;
      comune: string;
      localita: string;
      details: string;
    }> = [];

    // Verbali
    reports.forEach(r => {
      if (r.creatoDa === selectedGuardForDetail.id || isMatch(r.verbalizzanti || "")) {
        list.push({
          id: r.id,
          type: "verbale",
          code: r.numeroVerbale,
          date: r.data,
          comune: r.comune,
          localita: r.localita || r.recatPresso || "",
          details: `Soggetto: ${r.soggettoNome || "Ignoto"}. Specie animale: ${r.tipoAnimale || "Non ind."}`
        });
      }
    });

    // Rapporti
    serviceReports.forEach(r => {
      if (r.creatoDa === selectedGuardForDetail.id || isMatch(r.guardie || "")) {
        list.push({
          id: r.id,
          type: "rapporto",
          code: r.numeroRapporto,
          date: r.data,
          comune: r.comune,
          localita: r.localita || "",
          details: `Settore: ${(r.settore || []).join(", ")}. Note: ${r.note ? r.note.substring(0, 100) + "..." : "Nessuna"}`
        });
      }
    });

    // Territory Controls
    territoryControls.forEach(c => {
      if (c.creatoDa === selectedGuardForDetail.id || isMatch(c.guardie || "")) {
        list.push({
          id: c.id,
          type: "controllo",
          code: c.numeroControllo,
          date: c.data,
          comune: c.comune,
          localita: c.localita || "",
          details: `Esito: ${c.esito.toUpperCase()}. Animale: ${c.specieRazza || "Non spec."}. Prop: ${c.nomeSoggetto || "Non ind."}`
        });
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedGuardForDetail, reports, serviceReports, territoryControls]);

  // Filtered interventions for guard timeline search
  const filteredGuardInterventions = useMemo(() => {
    let list = guardHistoryInterventions;

    if (guardHistorySearch) {
      const s = guardHistorySearch.toLowerCase();
      list = list.filter(item => 
        (item.code || "").toLowerCase().includes(s) ||
        (item.localita || "").toLowerCase().includes(s) ||
        (item.details || "").toLowerCase().includes(s)
      );
    }

    if (guardHistoryTypeFilter !== "ALL") {
      list = list.filter(item => item.type === guardHistoryTypeFilter);
    }

    if (guardHistoryComuneFilter !== "ALL") {
      list = list.filter(item => (item.comune || "").toLowerCase().trim() === guardHistoryComuneFilter.toLowerCase().trim());
    }

    return list;
  }, [guardHistoryInterventions, guardHistorySearch, guardHistoryTypeFilter, guardHistoryComuneFilter]);

  // Selected full database record based on active timeline selection
  const selectedFullRecord = useMemo(() => {
    if (!selectedIntervention) return null;

    if (selectedIntervention.type === "verbale") {
      return reports.find(r => r.id === selectedIntervention.id) || null;
    } else if (selectedIntervention.type === "rapporto") {
      return serviceReports.find(r => r.id === selectedIntervention.id) || null;
    } else {
      return territoryControls.find(c => c.id === selectedIntervention.id) || null;
    }
  }, [selectedIntervention, reports, serviceReports, territoryControls]);

  // Socio/Partner extraction utility
  const getSocio = (guardieStr: string, currentGuard: Guard) => {
    if (!guardieStr) return "Nessuno (Servizio Singolo)";
    const currentGuardName = `${currentGuard.name || ""} ${currentGuard.surname || ""}`.toLowerCase().trim();
    const currentGuardSurnameOnly = (currentGuard.surname || "").toLowerCase().trim();
    const currentGuardNameOnly = (currentGuard.name || "").toLowerCase().trim();

    const parts = guardieStr.split(/[,;\-e]|\be\b/i).map(p => p.trim());
    const colleagues = parts.filter(p => {
      const pLower = p.toLowerCase();
      if (pLower === "") return false;
      if (pLower.includes(currentGuardName)) return false;
      if (currentGuardSurnameOnly && pLower.includes(currentGuardSurnameOnly)) return false;
      if (pLower.includes(currentGuardNameOnly)) return false;
      return true;
    });

    return colleagues.length > 0 ? colleagues.join(", ") : "Nessuno (Servizio Singolo)";
  };

  // Comune history interventions computation
  const comuneHistoryInterventions = useMemo(() => {
    if (!selectedComuneForDetail) return [];

    const list: Array<{
      id: string;
      type: "verbale" | "rapporto" | "controllo";
      code: string;
      date: string;
      localita: string;
      details: string;
      guardie: string;
    }> = [];

    const comLower = selectedComuneForDetail.toLowerCase().trim();

    reports.forEach(r => {
      if ((r.comune || "").toLowerCase().trim() === comLower) {
        list.push({
          id: r.id,
          type: "verbale",
          code: r.numeroVerbale,
          date: r.data,
          localita: r.localita || r.recatPresso || "",
          details: `Soggetto: ${r.soggettoNome || "Ignoto"}. Specie animale: ${r.tipoAnimale || "Non ind."}`,
          guardie: r.verbalizzanti || ""
        });
      }
    });

    serviceReports.forEach(r => {
      if ((r.comune || "").toLowerCase().trim() === comLower) {
        list.push({
          id: r.id,
          type: "rapporto",
          code: r.numeroRapporto,
          date: r.data,
          localita: r.localita || "",
          details: `Settore: ${(r.settore || []).join(", ")}. Note: ${r.note ? r.note.substring(0, 100) : "Nessuna"}`,
          guardie: r.guardie || ""
        });
      }
    });

    territoryControls.forEach(c => {
      if ((c.comune || "").toLowerCase().trim() === comLower) {
        list.push({
          id: c.id,
          type: "controllo",
          code: c.numeroControllo,
          date: c.data,
          localita: c.localita || "",
          details: `Esito: ${c.esito.toUpperCase()}. Animale: ${c.specieRazza || "Non spec."}. Prop: ${c.nomeSoggetto || "Non ind."}`,
          guardie: c.guardie || ""
        });
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedComuneForDetail, reports, serviceReports, territoryControls]);

  const selectedFullComuneAct = useMemo(() => {
    if (!selectedComuneAct) return null;
    if (selectedComuneAct.type === "verbale") {
      return reports.find(r => r.id === selectedComuneAct.id) || null;
    }
    if (selectedComuneAct.type === "rapporto") {
      return serviceReports.find(r => r.id === selectedComuneAct.id) || null;
    }
    if (selectedComuneAct.type === "controllo") {
      return territoryControls.find(c => c.id === selectedComuneAct.id) || null;
    }
    return null;
  }, [selectedComuneAct, reports, serviceReports, territoryControls]);

  const sectorStats = useMemo(() => {
    const counts = {
      zoofila: 0,
      ittica: 0,
      venatoria: 0,
      ambientale: 0,
      altro: 0,
    };

    comuneHistoryInterventions.forEach(item => {
      if (item.type === "verbale") {
        const orig = reports.find(r => r.id === item.id);
        const s = orig?.tipoVerbale || "zoofila";
        if (s === "zoofila") counts.zoofila++;
        else if (s === "ittica") counts.ittica++;
        else if (s === "venatoria") counts.venatoria++;
        else counts.altro++;
      } else if (item.type === "rapporto") {
        const orig = serviceReports.find(r => r.id === item.id);
        const sectors = orig?.settore || [];
        const sStr = sectors.join(" ").toLowerCase();
        if (sStr.includes("zoofila")) counts.zoofila++;
        else if (sStr.includes("ittica")) counts.ittica++;
        else if (sStr.includes("venatoria")) counts.venatoria++;
        else if (sStr.includes("ambientale") || sStr.includes("vigilanza ambientale")) counts.ambientale++;
        else counts.altro++;
      } else if (item.type === "controllo") {
        const orig = territoryControls.find(c => c.id === item.id);
        const s = orig?.settore || "zoofila";
        if (s === "zoofila") counts.zoofila++;
        else if (s === "ittica") counts.ittica++;
        else if (s === "venatoria") counts.venatoria++;
        else if (s === "ambientale") counts.ambientale++;
        else counts.altro++;
      }
    });

    return counts;
  }, [comuneHistoryInterventions, reports, serviceReports, territoryControls]);

  const printComuneReportA4 = (comune: string, stats: { verbali: number; rapporti: number; controlli: number; total: number }, items: any[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const compiledDate = format(new Date(), "dd/MM/yyyy HH:mm");

    printWindow.document.write(`
      <html>
        <head>
          <title>Rendiconto Territoriale - Comune di ${comune}</title>
          <style>
            @media print {
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; font-size: 10px; line-height: 1.4; }
              .no-print { display: none; }
              .container { max-width: 900px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 35px; border-radius: 8px; }
              .header { text-align: center; border-bottom: 2px double #475569; padding-bottom: 12px; margin-bottom: 20px; }
              .logo { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
              .subheader { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 4px; }
              .doc-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 15px 0; background: #f8fafc; padding: 10px; text-align: center; border: 1px solid #e2e8f0; letter-spacing: 1px; }
              
              .info-grid { display: grid; grid-template-cols: 1.5fr 1fr; gap: 20px; margin-bottom: 25px; }
              .info-card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; background: #fafafa; }
              .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
              .info-label { font-weight: bold; color: #475569; text-transform: uppercase; font-size: 8px; }
              .info-value { text-transform: uppercase; font-weight: 600; }
              
              .stats-card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; background: #f1f5f9; text-align: center; display: flex; flex-direction: column; justify-content: center; }
              .stats-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
              .stats-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 5px; }
              .stat-box { border: 1px solid #e2e8f0; background: white; padding: 6px; border-radius: 4px; }
              .stat-num { font-size: 14px; font-weight: bold; color: #4f46e5; }
              .stat-lbl { font-size: 7px; text-transform: uppercase; color: #64748b; margin-top: 2px; }

              .table-section { margin-top: 25px; }
              .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; color: #334155; margin-bottom: 10px; letter-spacing: 0.5px; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px 6px; font-size: 8px; text-transform: uppercase; font-weight: bold; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; }
              td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; }
              .type-badge { font-weight: bold; font-size: 7.5px; padding: 2px 4px; border-radius: 3px; display: inline-block; }
              .badge-verbale { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
              .badge-controllo { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
              .badge-rapporto { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
              
              .footer-signature { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
              .signature-box { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 8px; text-transform: uppercase; color: #475569; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #e2e8f0; }
            .container { background: white; max-width: 900px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 40px; border-radius: 12px; }
            .no-print-btn { display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px; transition: background 0.2s; }
            .no-print-btn:hover { background: #7c3aed; }
          </style>
        </head>
        <body onload="window.print()">
          <button class="no-print-btn no-print" onclick="window.print()">Stampa Rapporto Territoriale (A4)</button>
          
          <div class="container">
            ${getOfficialPrintHeaderHtml("RAPPORTO ATTIVITÀ TERRITORIALE", `COMUNE DI ${comune}`)}

            <div class="info-grid">
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Territorio di Competenza</span>
                  <span class="info-value" style="font-size: 11px; font-weight: bold; color: #1e1b4b;">${comune} (MS)</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Riconoscimento Giuridico</span>
                  <span class="info-value">D.M. Ministero dell'Ambiente</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ambiti Vigilanza</span>
                  <span class="info-value">Zoofila • Ittica • Venatoria</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Stato Monitoraggio</span>
                  <span class="info-value" style="color: #047857;">Attivo e Coperto</span>
                </div>
              </div>

              <div class="stats-card">
                <div class="stats-title">Rendimento di Servizio Registrato</div>
                <div class="stats-grid">
                  <div class="stat-box">
                    <div class="stat-num">${stats.verbali}</div>
                    <div class="stat-lbl">Verbali</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-num">${stats.controlli}</div>
                    <div class="stat-lbl">Controlli</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-num">${stats.rapporti}</div>
                    <div class="stat-lbl">Rapporti</div>
                  </div>
                  <div class="stat-box" style="border-color: #cbd5e1; background: #eef2f6;">
                    <div class="stat-num" style="color: #8b5cf6;">${stats.total}</div>
                    <div class="stat-lbl" style="font-weight: bold; color: #7c3aed;">Totale</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="table-section">
              <div class="section-title">Registro Cronologico degli Interventi sul Territorio di ${comune}</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 10%;">Data</th>
                    <th style="width: 15%;">Tipologia Atto</th>
                    <th style="width: 15%;">Codice Registro</th>
                    <th style="width: 30%;">Agenti / Guardie Verbalizzanti</th>
                    <th style="width: 30%;">Località & Dettagli / Esito</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => {
                    const itemDate = safeFormatDate(item.date, "dd/MM/yyyy");
                    const badgeClass = item.type === "verbale" ? "badge-verbale" : item.type === "rapporto" ? "badge-rapporto" : "badge-controllo";
                    const typeLabel = item.type === "verbale" ? "Sopralluogo" : item.type === "rapporto" ? "Rapporto" : "Controllo";
                    return `
                      <tr>
                        <td style="font-family: monospace;">${itemDate}</td>
                        <td><span class="type-badge ${badgeClass}">${typeLabel}</span></td>
                        <td style="font-family: monospace; font-weight: bold;">${item.code}</td>
                        <td>${item.guardie || "Nucleo Vigilanza"}</td>
                        <td style="font-size: 8.5px; color: #334155;">
                          <strong>${item.localita || "—"}</strong><br>
                          ${item.details}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="footer-signature">
              <div class="signature-box">Il Responsabile della Vigilanza<br><br><br><br>Consuelo / Capo Nucleo</div>
              <div class="signature-box">Visto della Sede Centrale HQ<br><br><br><br>Eko Club Massa-Carrara</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // printReportA4, printServiceReportA4, printGuardDossierA4
  const printReportA4 = (r: Report) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const formattedDate = safeFormatDate(r.data, "dd/MM/yyyy");

    printWindow.document.write(`
      <html>
        <head>
          <title>Verbale di Sopralluogo - ${r.numeroVerbale}</title>
          <style>
            @media print {
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; font-size: 11px; line-height: 1.5; }
              .no-print { display: none; }
              .container { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 35px; border-radius: 8px; }
              .header { text-align: center; border-bottom: 2px double #475569; padding-bottom: 15px; margin-bottom: 20px; }
              .logo { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
              .subheader { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 5px; }
              .doc-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 20px 0; background: #f1f5f9; padding: 8px; text-align: center; border: 1px solid #e2e8f0; letter-spacing: 1px; }
              .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
              .meta-item { border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; }
              .meta-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #64748b; }
              .meta-value { font-size: 11px; margin-top: 2px; text-transform: uppercase; font-weight: 500; }
              .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; color: #334155; margin-top: 25px; margin-bottom: 10px; letter-spacing: 0.5px; }
              .field-row { display: flex; border-bottom: 1px solid #f1f5f9; padding: 6px 0; }
              .field-col { flex: 1; }
              .field-label { font-weight: bold; color: #475569; width: 180px; shrink: 0; text-transform: uppercase; font-size: 9px; }
              .field-content { text-transform: uppercase; }
              .textarea-block { border: 1px solid #e2e8f0; padding: 10px; min-height: 85px; border-radius: 4px; background: #fafafa; margin-top: 5px; white-space: pre-wrap; font-family: monospace; }
              .footer-signature { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
              .signature-box { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 9px; text-transform: uppercase; color: #475569; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #e2e8f0; }
            .container { background: white; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 40px; border-radius: 12px; }
            .no-print-btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px; transition: background 0.2s; }
            .no-print-btn:hover { background: #4338ca; }
          </style>
        </head>
        <body onload="window.print()">
          <button class="no-print-btn no-print" onclick="window.print()">Stampa Documento standard (A4)</button>
          
          <div class="container">
            ${getOfficialPrintHeaderHtml("VERBALE DI SOPRALLUOGO ED ACCERTAMENTO", `N° ${r.numeroVerbale}`)}

            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">ID Verbale d'Archivio</div>
                <div class="meta-value" style="font-weight: bold; color: #4338ca;">${r.numeroVerbale}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Data e Ora Accertamento</div>
                <div class="meta-value">${formattedDate} — Dalle ore ${r.oraInizio || "—"} alle ore ${r.oraFine || "—"}</div>
              </div>
            </div>

            <div class="section-title">Localizzazione e Agenti Verbalizzanti</div>
            <div class="field-row">
              <div class="field-label">Comune di Intervento</div>
              <div class="field-content">${r.comune} (MS)</div>
            </div>
            <div class="field-row">
              <div class="field-label">Località / Presso</div>
              <div class="field-content">${r.localita || r.recatPresso || "—"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Agenti Verbalizzanti</div>
              <div class="field-content">${r.verbalizzanti || "—"}</div>
            </div>

            <div class="section-title">Anagrafica Soggetto Controllato</div>
            <div class="field-row">
              <div class="field-label">Nominativo / Proprietario</div>
              <div class="field-content">${r.soggettoNome || "IGNOTO"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Nato il / Residente a</div>
              <div class="field-content">${formatDateIT(r.soggettoIl)} a ${r.soggettoNatoA || "—"} — Res. ${r.soggettoResidenteA || "—"} in ${r.soggettoIndirizzo || "—"}</div>
            </div>
            <div class="field-row">
              <div class="field-label font-bold">Documento Esibito</div>
              <div class="field-content">${r.soggettoDocumentoTipo || "—"} Num. ${r.soggettoDocumentoNumero || "—"}</div>
            </div>

            <div class="section-title">Dati Detenzione e Animali Rilevati</div>
            <div class="field-row">
              <div class="field-label">Specie / Quantità Animale</div>
              <div class="field-content">${r.tipoAnimale || "—"} (${r.numeroAnimali || "1"} capi)</div>
            </div>
            <div class="field-row">
              <div class="field-label">Microchip e Anagrafe</div>
              <div class="field-content" style="font-family: monospace; font-weight: bold; font-size: 11px;">${r.chips && r.chips.length > 0 ? r.chips.map(c => `[CHIP: ${c.numero} intestato a ${c.nominativo || 'Proprietario'}]`).join(', ') : "NESSUNO / DA VERIFICARE"}</div>
            </div>

            <div class="section-title">Constatazioni e Rilievi d'Ufficio</div>
            <div class="textarea-block">${r.constatazioni || "Nessun rilievo descritto."}</div>

            <div class="section-title">Prescrizioni e Termini di Regolarizzazione</div>
            <div class="field-row">
              <div class="field-label font-bold text-yellow-600">Giorni concessi</div>
              <div class="field-content font-bold" style="color: #b45309;">${r.giorniRegolarizzazione || "Nessuno (Adeguamento Immediato / Chiuso)"}</div>
            </div>

            <div class="footer-signature">
              <div class="signature-box">Firma del Soggetto Controllato<br><br><br><br>(Firma autografa o dicitura rifiuto)</div>
              <div class="signature-box">Le Guardie Verbalizzanti<br><br><br><br>(Firme autografe conformi)</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printServiceReportA4 = (sr: ServiceReport) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const formattedDate = safeFormatDate(sr.data, "dd/MM/yyyy");

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapporto di Servizio - ${sr.numeroRapporto}</title>
          <style>
            @media print {
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; font-size: 11px; line-height: 1.5; }
              .no-print { display: none; }
              .container { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 35px; border-radius: 8px; }
              .header { text-align: center; border-bottom: 2px double #475569; padding-bottom: 15px; margin-bottom: 20px; }
              .logo { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
              .subheader { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 5px; }
              .doc-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 20px 0; background: #f1f5f9; padding: 8px; text-align: center; border: 1px solid #e2e8f0; letter-spacing: 1px; }
              .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
              .meta-item { border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; }
              .meta-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #64748b; }
              .meta-value { font-size: 11px; margin-top: 2px; text-transform: uppercase; font-weight: 500; }
              .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; color: #334155; margin-top: 25px; margin-bottom: 10px; letter-spacing: 0.5px; }
              .field-row { display: flex; border-bottom: 1px solid #f1f5f9; padding: 6px 0; }
              .field-label { font-weight: bold; color: #475569; width: 180px; shrink: 0; text-transform: uppercase; font-size: 9px; }
              .field-content { text-transform: uppercase; }
              .textarea-block { border: 1px solid #e2e8f0; padding: 10px; min-height: 120px; border-radius: 4px; background: #fafafa; margin-top: 5px; white-space: pre-wrap; font-size: 10px; line-height: 1.6; }
              .footer-signature { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
              .signature-box { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 9px; text-transform: uppercase; color: #475569; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #e2e8f0; }
            .container { background: white; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 40px; border-radius: 12px; }
            .no-print-btn { display: inline-block; background: #10b981; color: white; padding: 10px 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px; transition: background 0.2s; }
            .no-print-btn:hover { background: #059669; }
          </style>
        </head>
        <body onload="window.print()">
          <button class="no-print-btn no-print" onclick="window.print()">Stampa Documento standard (A4)</button>
          
          <div class="container">
            ${getOfficialPrintHeaderHtml("RAPPORTO DI SERVIZIO E RELAZIONE TURNI", `N° ${sr.numeroRapporto}`)}

            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">ID Rapporto Telematico</div>
                <div class="meta-value" style="font-weight: bold; color: #059669;">${sr.numeroRapporto}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Data e Orario Servizio</div>
                <div class="meta-value">${formattedDate} — Dalle ore ${sr.oraInizio || "—"} alle ore ${sr.oraFine || "—"}</div>
              </div>
            </div>

            <div class="section-title">Informazioni Generali di Pattugliamento</div>
            <div class="field-row">
              <div class="field-label">Comune di Riferimento</div>
              <div class="field-content">${sr.comune} (MS)</div>
            </div>
            <div class="field-row">
              <div class="field-label">Località Monitorate</div>
              <div class="field-content">${sr.localita || "—"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Settori Operativi</div>
              <div class="field-content">${(sr.settore || []).join(', ') || "Zoofila"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Automezzo di Servizio</div>
              <div class="field-content">${sr.veicoloTarga ? `${sr.veicoloTarga} (${sr.veicoloProprieta || 'Associazione'})` : "Nessuno (Piedi / Mezzo Proprio)"}</div>
            </div>

            <div class="section-title">Equipaggio / Guardie in Servizio</div>
            <div class="field-row">
              <div class="field-label">Pattuglia Operante</div>
              <div class="field-content">${sr.guardie || "—"}</div>
            </div>

            <div class="section-title">Relazione Dettagliata dell'Uscita ed Eventi Rilevati</div>
            <div class="textarea-block">${sr.note || "Nessun evento o dettaglio inserito."}</div>

            <div class="footer-signature">
              <div class="signature-box">Il Capo Pattuglia / Redattore<br><br><br><br>(Firma autografa)</div>
              <div class="signature-box">Visto del Responsabile Provinciale<br><br><br><br>(Firma e timbro di convalida)</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printGuardDossierA4 = (g: Guard, totalStats: { verbali: number; rapporti: number; controlli: number; total: number }, items: any[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const compiledDate = format(new Date(), "dd/MM/yyyy HH:mm");

    printWindow.document.write(`
      <html>
        <head>
          <title>Dossier Servizi Operatore - ${g.name} ${g.surname || ""}</title>
          <style>
            @media print {
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; font-size: 10px; line-height: 1.4; }
              .no-print { display: none; }
              .container { max-width: 900px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 35px; border-radius: 8px; }
              .header { text-align: center; border-bottom: 2px double #475569; padding-bottom: 12px; margin-bottom: 20px; }
              .logo { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
              .subheader { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 4px; }
              .doc-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 15px 0; background: #f8fafc; padding: 10px; text-align: center; border: 1px solid #e2e8f0; letter-spacing: 1px; }
              
              .info-grid { display: grid; grid-template-cols: 1.5fr 1fr; gap: 20px; margin-bottom: 25px; }
              .info-card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; background: #fafafa; }
              .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
              .info-label { font-weight: bold; color: #475569; text-transform: uppercase; font-size: 8px; }
              .info-value { text-transform: uppercase; font-weight: 600; }
              
              .stats-card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; background: #f1f5f9; text-align: center; display: flex; flex-direction: column; justify-content: center; }
              .stats-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
              .stats-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 5px; }
              .stat-box { border: 1px solid #e2e8f0; background: white; padding: 6px; border-radius: 4px; }
              .stat-num { font-size: 14px; font-weight: bold; color: #4f46e5; }
              .stat-lbl { font-size: 7px; text-transform: uppercase; color: #64748b; margin-top: 2px; }

              .table-section { margin-top: 25px; }
              .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; color: #334155; margin-bottom: 10px; letter-spacing: 0.5px; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px 6px; font-size: 8px; text-transform: uppercase; font-weight: bold; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; }
              td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; }
              .type-badge { font-weight: bold; font-size: 7.5px; padding: 2px 4px; border-radius: 3px; display: inline-block; }
              .badge-verbale { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
              .badge-controllo { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
              .badge-rapporto { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
              
              .footer-signature { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
              .signature-box { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 8px; text-transform: uppercase; color: #475569; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #e2e8f0; }
            .container { background: white; max-width: 900px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 40px; border-radius: 12px; }
            .no-print-btn { display: inline-block; background: #6366f1; color: white; padding: 10px 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px; transition: background 0.2s; }
            .no-print-btn:hover { background: #4f46e5; }
          </style>
        </head>
        <body onload="window.print()">
          <button class="no-print-btn no-print" onclick="window.print()">Stampa Fascicolo Continuo (A4)</button>
          
          <div class="container">
            ${getOfficialPrintHeaderHtml("FASCICOLO PERSONALE DI SERVIZIO", `AGENTE OPERATIVO: ${g.surname || ""} ${g.name}`)}

            <div class="info-grid">
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Cognome e Nome</span>
                  <span class="info-value" style="font-size: 11px; font-weight: bold; color: #1e1b4b;">${g.surname || ""} ${g.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Numero Matricola</span>
                  <span class="info-value" style="font-family: monospace;">${g.matricola || "—"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ruolo / Qualifica</span>
                  <span class="info-value">${(g as any).ruolo || "Guardia Particolare Giurata"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Stato Servizio</span>
                  <span class="info-value" style="color: #047857;">Attivo</span>
                </div>
              </div>

              <div class="stats-card">
                <div class="stats-title">Rendimento di Servizio Registrato</div>
                <div class="stats-grid">
                  <div class="stat-box">
                    <div class="stat-num">${totalStats.verbali}</div>
                    <div class="stat-lbl">Verbali</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-num">${totalStats.controlli}</div>
                    <div class="stat-lbl">Controlli</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-num">${totalStats.rapporti}</div>
                    <div class="stat-lbl">Rapporti</div>
                  </div>
                  <div class="stat-box" style="border-color: #cbd5e1; background: #eef2f6;">
                    <div class="stat-num" style="color: #4f46e5;">${totalStats.total}</div>
                    <div class="stat-lbl" style="font-weight: bold; color: #4338ca;">Totale</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="table-section">
              <div class="section-title">Registro Cronologico degli Interventi sul Territorio</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 10%;">Data</th>
                    <th style="width: 15%;">Tipologia Atto</th>
                    <th style="width: 15%;">Codice Registro</th>
                    <th style="width: 20%;">Comune Competente</th>
                    <th style="width: 40%;">Località & Dettagli / Esito della Risoluzione</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => {
                    const itemDate = safeFormatDate(item.date, "dd/MM/yyyy");
                    const badgeClass = item.type === "verbale" ? "badge-verbale" : item.type === "rapporto" ? "badge-rapporto" : "badge-controllo";
                    const typeLabel = item.type === "verbale" ? "Sopralluogo" : item.type === "rapporto" ? "Rapporto" : "Controllo";
                    return `
                      <tr>
                        <td style="font-family: monospace;">${itemDate}</td>
                        <td><span class="type-badge ${badgeClass}">${typeLabel}</span></td>
                        <td style="font-family: monospace; font-weight: bold;">${item.code}</td>
                        <td>${item.comune}</td>
                        <td style="font-size: 8.5px; color: #334155;">
                          <strong>${item.localita || "—"}</strong><br>
                          ${item.details}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="footer-signature">
              <div class="signature-box">L'Operatore Verificato<br><br><br><br>${g.name} ${g.surname || ""}</div>
              <div class="signature-box">Il Responsabile della Sezione<br><br><br><br>Consuelo / Amministratore HQ</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // A4 Printing Layout for a Territory Control Document
  const printControlA4 = (c: TerritoryControl) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const compiledDate = c.data ? safeFormatDate(c.data, "dd/MM/yyyy") : "";

    const getMatricoleOnly = (guardieStr: string | undefined): string => {
      if (!guardieStr) return "";
      const names = guardieStr.split(",").map(s => s.trim()).filter(Boolean);
      const matricoleList: string[] = [];

      names.forEach(name => {
        const cleanName = name.toLowerCase();
        const foundGuard = guards.find(g => {
          const fullName = `${g.name} ${g.surname || ""}`.trim().toLowerCase();
          const reverseName = `${g.surname || ""} ${g.name}`.trim().toLowerCase();
          return (
            fullName === cleanName ||
            reverseName === cleanName ||
            g.name.toLowerCase() === cleanName ||
            (g.surname && g.surname.toLowerCase() === cleanName) ||
            (g.matricola && g.matricola.toLowerCase() === cleanName)
          );
        });

        if (foundGuard && foundGuard.matricola) {
          const mat = foundGuard.matricola.toLowerCase().startsWith("matr.")
            ? foundGuard.matricola
            : `Matr. ${foundGuard.matricola}`;
          matricoleList.push(mat);
        } else {
          if (/\d/.test(name)) {
            const mat = name.toLowerCase().startsWith("matr.") ? name : `Matr. ${name}`;
            matricoleList.push(mat);
          }
        }
      });

      return matricoleList.length > 0 ? matricoleList.join(", ") : "";
    };

    const guardieMatricole = getMatricoleOnly(c.guardie);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Controllo Territoriale ${compiledDate ? `- ${compiledDate}` : ""}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            @media print {
              body { font-family: 'Times New Roman', Times, serif; color: #0f172a; padding: 0; margin: 0; font-size: 9.5pt; line-height: 1.2; }
              .no-print { display: none !important; }
              .container { max-width: 100%; margin: 0 auto; border: 1px solid #475569; padding: 10px 14px; border-radius: 4px; box-sizing: border-box; }
            }
            body { font-family: 'Times New Roman', Times, serif; color: #0f172a; padding: 20px; background: #f1f5f9; font-size: 9.5pt; line-height: 1.2; }
            .container { background: white; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 14px 18px; border-radius: 6px; border: 1px solid #94a3b8; }
            .no-print-btn { display: inline-block; background: #059669; color: white; padding: 8px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 12px; }
            .no-print-btn:hover { background: #047857; }
            .no-close-btn { display: inline-block; background: #dc2626; color: white; padding: 8px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 12px; margin-left: 10px; }
            .no-close-btn:hover { background: #b91c1c; }
            
            .header-text-top { text-align: center; font-size: 7.5pt; margin-bottom: 2px; line-height: 1.15; }
            .header-main { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 2px; }
            .header-logo { width: 48px; height: 48px; object-fit: contain; }
            .header-titles h1 { font-size: 13.5pt; font-weight: 900; text-transform: uppercase; margin: 0; line-height: 1.05; letter-spacing: 0.5px; }
            .header-titles p { font-size: 8.5pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.15; }
            .header-sub { text-align: center; margin-bottom: 6px; }
            .header-sub p { font-size: 9.5pt; font-weight: bold; font-style: italic; margin: 0; }
            .header-sub span { font-size: 7.5pt; color: #475569; display: block; }
            
            .doc-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin: 4px 0 8px 0; background: #f8fafc; padding: 4px; text-align: center; border: 1px solid #cbd5e1; letter-spacing: 0.5px; }
            .section-title { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 1px; color: #0f172a; margin-top: 6px; margin-bottom: 3px; letter-spacing: 0.5px; }
            
            .field-row { display: flex; border-bottom: 1px solid #e2e8f0; padding: 2.5px 0; align-items: baseline; }
            .field-label { font-weight: bold; color: #334155; width: 190px; flex-shrink: 0; text-transform: uppercase; font-size: 8pt; }
            .field-content { font-size: 9pt; color: #000; text-transform: uppercase; }
            .textarea-block { border: 1px solid #cbd5e1; padding: 5px 8px; min-height: 130px; border-radius: 4px; background: #fafafa; margin-top: 3px; font-size: 9pt; white-space: pre-wrap; font-style: italic; }
            
            .signatures-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 10px; text-align: center; margin-top: 10px; page-break-inside: avoid; }
            .sig-box { text-align: center; }
            .sig-label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 20px; }
            .sig-line { border-top: 1px solid #0f172a; padding-top: 2px; font-size: 8.5pt; font-style: italic; min-height: 16px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="no-print" style="margin-bottom: 10px;">
            <button class="no-print-btn" onclick="window.print()">Stampa Documento standard (A4)</button>
            <button class="no-close-btn" onclick="window.close()">Chiudi Anteprima</button>
          </div>
          
          <div class="container">
            ${getOfficialPrintHeaderHtml("SCHEDA DI CONTROLLO TERRITORIALE", `COMUNE DI ${c.comune ? c.comune.toUpperCase() : "MASSA"}`)}

            <div class="doc-title">SCHEDA DI CONTROLLO ED ISPEZIONE SUL TERRITORIO</div>

            <div class="section-title">Localizzazione e Operatori</div>
            <div class="field-row">
              <div class="field-label">Data e Ora Sopralluogo</div>
              <div class="field-content">${compiledDate ? `${compiledDate}${c.ora ? ` — Ore ${c.ora}` : ""}` : ""}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Comune Competente</div>
              <div class="field-content">${c.comune ? `${c.comune} (MS)` : ""}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Indirizzo / Località</div>
              <div class="field-content">${c.localita || ""}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Guardie Operative in servizio</div>
              <div class="field-content">${guardieMatricole}</div>
            </div>

            <div class="section-title">Anagrafica Soggetto e Animale Controllato</div>
            <div class="field-row">
              <div class="field-label">Proprietario / Detentore</div>
              <div class="field-content">${c.proprietario || c.nomeSoggetto || "—"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Nome Cane</div>
              <div class="field-content">${c.nomeCane || "—"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Specie / Razza Animale</div>
              <div class="field-content">${c.specieRazza || "Cane"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Numero Microchip</div>
              <div class="field-content" style="font-family: monospace; font-weight: bold; letter-spacing: 1px;">${c.microchip || "NON DETECTED"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Documento Esibito</div>
              <div class="field-content">${c.documentoEsibito || ""}</div>
            </div>

            <div class="section-title">Esito Accertamento e Prescrizioni</div>
            <div class="field-row">
              <div class="field-label">Riscontro Ispettivo</div>
              <div class="field-content" style="font-weight: bold;">
                ${c.esito === "regolare" ? "REGOLARE" : 
                  c.esito === "con_prescrizioni" ? `CON PRESCRIZIONI D'ADEGUAMENTO (${c.giorniAdeguamento || 10} GIORNI)` : 
                  c.esito === "violazione" ? "VIOLAZIONE ACCERTATA" : ""}
              </div>
            </div>

            ${c.esito === "con_prescrizioni" && c.prescrizioneTesto ? `
              <div style="margin-top: 4px;">
                <div class="field-label" style="width: 100%; margin-bottom: 2px;">Dettaglio Prescrizioni d'Adeguamento:</div>
                <div class="textarea-block" style="min-height: 50px;">${c.prescrizioneTesto}</div>
              </div>
            ` : ""}

            <div style="margin-top: 4px;">
              <div class="field-label" style="width: 100%; margin-bottom: 2px;">Note d'Ufficio / Rilievi di Servizio:</div>
              <div class="textarea-block">${c.note || ""}</div>
            </div>

            ${c.image ? `
              <div style="text-align: center; margin-top: 6px;">
                <img src="${c.image}" style="max-height: 100px; border-radius: 4px; border: 1px solid #ccc;" />
              </div>
            ` : ""}

            <div style="margin-top: 10px; page-break-inside: avoid;">
              <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 6px;">
                Firme delle Guardie Verbalizzanti / Operative:
              </div>
              <div class="signatures-grid">
                <div class="sig-box">
                  <div class="sig-label">Firma 1ª Guardia Operante</div>
                  <div class="sig-line"></div>
                </div>
                <div class="sig-box">
                  <div class="sig-label">Firma 2ª Guardia Operante</div>
                  <div class="sig-line"></div>
                </div>
                <div class="sig-box">
                  <div class="sig-label">Firma Proprietario / Detentore</div>
                  <div class="sig-line"></div>
                </div>
              </div>
            </div>
            
            <div style="text-align: right; margin-top: 10px; font-size: 7.5pt; color: #64748b; text-transform: uppercase;">
              Data Redazione: <span style="font-weight: bold; color: #0f172a;">${compiledDate}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printTerritoryControlsRegister = (
    list: TerritoryControl[], 
    selectedComuneName: string,
    startDate?: string,
    endDate?: string
  ) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const targetComuneTitle = (selectedComuneName && selectedComuneName !== "ALL")
      ? `COMUNE DI ${selectedComuneName.toUpperCase()}`
      : "COMUNI DI MASSA-CARRARA E PROVINCIA";

    let dateSubheader = "";
    if (startDate && endDate) {
      dateSubheader = `<div style="font-size: 8.5pt; font-weight: normal; margin-top: 3px; color: #334155;">PERIODO CONTROLLI: DAL ${safeFormatDate(startDate, "dd/MM/yyyy")} AL ${safeFormatDate(endDate, "dd/MM/yyyy")}</div>`;
    } else if (startDate) {
      dateSubheader = `<div style="font-size: 8.5pt; font-weight: normal; margin-top: 3px; color: #334155;">DATA CONTROLLI: ${safeFormatDate(startDate, "dd/MM/yyyy")}</div>`;
    } else if (endDate) {
      dateSubheader = `<div style="font-size: 8.5pt; font-weight: normal; margin-top: 3px; color: #334155;">CONTROLLI EFFETTUATI FINO AL: ${safeFormatDate(endDate, "dd/MM/yyyy")}</div>`;
    }

    const rowsHtml = list.map((item, idx) => {
      const formattedDate = item.data ? safeFormatDate(item.data, "dd/MM/yyyy") : "—";
      const fullDateOra = `${formattedDate}${item.ora ? ` - ${item.ora}` : ""}`;
      
      const esitoFormatted = item.esito === 'con_prescrizioni'
        ? `Con Prescrizioni${item.giorniAdeguamento ? ` (${item.giorniAdeguamento} gg)` : ""}`
        : item.esito === 'violazione'
        ? "Violazione / Verbale"
        : "Regolare";

      const specieVal = item.specieRazza && item.specieRazza.trim() !== "" ? item.specieRazza : "Cane";

      const nomeCaneVal = item.nomeCane && item.nomeCane.trim() !== "" 
        ? item.nomeCane 
        : (item.nomeSoggetto && item.nomeSoggetto !== item.proprietario ? item.nomeSoggetto : "—");

      const proprietarioVal = item.proprietario && item.proprietario.trim() !== "" 
        ? item.proprietario 
        : (item.nomeSoggetto && item.nomeSoggetto !== item.nomeCane ? item.nomeSoggetto : "—");

      const microchipVal = item.microchip && item.microchip.trim() !== "" ? item.microchip.trim() : "NON DETECTED";

      const docVal = item.documentoEsibito && item.documentoEsibito.trim() !== "" 
        ? item.documentoEsibito 
        : (item.microchip && item.microchip.trim() !== "" ? "LETTURA MICROCHIP" : "Nessuno");

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; font-family: monospace;">${idx + 1}</td>
          <td style="font-size: 8.5pt; white-space: nowrap;">${fullDateOra}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${item.localita || item.comune || "—"}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${specieVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase; font-weight: bold;">${nomeCaneVal}</td>
          <td style="font-size: 8.5pt; font-family: monospace; font-weight: bold; letter-spacing: 0.5px; text-align: center;">${microchipVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${proprietarioVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${docVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${esitoFormatted}</td>
          <td style="font-size: 8pt; font-family: monospace;">${item.guardie || "—"}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>REGISTRO CONTROLLI TERRITORIO - ${targetComuneTitle}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 8mm;
            }
            @media print {
              body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 0; margin: 0; font-size: 9pt; line-height: 1.2; }
              .no-print { display: none !important; }
              .container { max-width: 100% !important; border: 1px solid #000 !important; box-shadow: none !important; }
            }
            body { font-family: 'Times New Roman', Times, serif; color: #0f172a; padding: 15px; background: #f8fafc; font-size: 9pt; line-height: 1.2; }
            .container { background: white; width: 100%; max-width: 1080px; margin: 0 auto; padding: 12px; border: 1px solid #000; box-sizing: border-box; }
            
            .no-print-btn { display: inline-block; background: #059669; color: white; padding: 8px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 12px; }
            .no-close-btn { display: inline-block; background: #dc2626; color: white; padding: 8px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 12px; margin-left: 10px; }
            
            .header-text-top { text-align: center; font-size: 7.5pt; margin-bottom: 2px; text-transform: uppercase; font-style: italic; color: #334155; }
            .header-main { display: flex; align-items: center; justify-content: center; gap: 15px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
            .header-logo { width: 44px; height: 44px; object-fit: contain; }
            .header-titles h1 { font-size: 13.5pt; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
            .header-titles p { font-size: 8.5pt; font-weight: bold; font-style: italic; margin: 0; }
            
            .doc-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 6px 0 10px 0; background: #f1f5f9; padding: 6px; text-align: center; border: 1px solid #000; letter-spacing: 0.5px; }
            
            table.excel-table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 8.5pt; }
            table.excel-table th { background: #e2e8f0; border: 1px solid #000; padding: 5px 6px; font-weight: bold; text-transform: uppercase; font-size: 8pt; text-align: left; }
            table.excel-table td { border: 1px solid #000; padding: 4.5px 6px; vertical-align: middle; }
            table.excel-table tr:nth-child(even) { background-color: #fafafa; }
            
            .footer-signatures { display: flex; justify-content: space-between; margin-top: 20px; page-break-inside: avoid; border-top: 1px solid #000; padding-top: 10px; }
            .sig-box { text-align: center; width: 30%; }
            .sig-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; margin-bottom: 25px; }
            .sig-line { border-top: 1px dashed #000; font-size: 8.5pt; font-style: italic; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="no-print" style="margin-bottom: 10px;">
            <button class="no-print-btn" onclick="window.print()">Stampa Registro A4 Orizzontale (Stile Excel)</button>
            <button class="no-close-btn" onclick="window.close()">Chiudi Anteprima</button>
          </div>
          
          <div class="container">
            ${getOfficialPrintHeaderHtml(`REGISTRO CONTROLLI SUL TERRITORIO — ${targetComuneTitle}`, dateSubheader)}

            <table class="excel-table">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th style="width: 95px;">Data e Ora</th>
                  <th style="width: 125px;">Località / Postazione</th>
                  <th style="width: 95px;">Specie / Razza</th>
                  <th style="width: 95px;">Nome Cane</th>
                  <th style="width: 130px; text-align: center;">N° Microchip Transponder</th>
                  <th style="width: 125px;">Proprietario / Detentore</th>
                  <th style="width: 95px;">Doc. Esibito</th>
                  <th style="width: 95px;">Esito</th>
                  <th>Guardie (Matricole)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="10" style="text-align: center; padding: 20px; font-style: italic;">Nessun controllo registrato per il comune o filtro selezionato.</td></tr>`}
              </tbody>
            </table>

            <div class="footer-signatures">
              <div class="sig-box">
                <div class="sig-label">Data e Luogo Compilazione</div>
                <div class="sig-line">${selectedComuneName && selectedComuneName !== "ALL" ? selectedComuneName : "Massa"}, ${new Date().toLocaleDateString("it-IT")}</div>
              </div>
              <div class="sig-box">
                <div class="sig-label">Le Guardie Verbalizzanti in Turno</div>
                <div class="sig-line">(Firme autografe sul registro)</div>
              </div>
              <div class="sig-box">
                <div class="sig-label">Visto Il Responsabile di Nucleo</div>
                <div class="sig-line">Guardia Particolare Giurata</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl gap-4">
        <div>
          <h2 className="text-3xl font-normal italic tracking-widest text-white uppercase flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-400" />
            Statistiche & Controlli HQ
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-normal tracking-widest uppercase">
            Sistemi di Monitoraggio Territorio, Analisi Operatori & Registro {sectorLabel} Sede
          </p>
        </div>

        {/* Toggle Workspace */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab("stats")}
            className={cn(
              "px-4 py-2 text-xs font-normal uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
              activeSubTab === "stats" 
                ? "bg-purple-700 text-white shadow-md shadow-purple-900/30 font-medium" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Analisi Statistiche
          </button>
          <button
            onClick={() => setActiveSubTab("controls")}
            className={cn(
              "px-4 py-2 text-xs font-normal uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
              activeSubTab === "controls" 
                ? "bg-purple-700 text-white shadow-md shadow-purple-900/30 font-medium" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Registro {sectorLabel}
          </button>
        </div>
      </div>

      {activeSubTab === "stats" ? (
        // DASHBORD STATISTICHE GENERALE (RISERVATO ADMIN)
        <div className="space-y-6">
          {!isSuperUser && !isAdmin ? (
            <div className="text-center py-16 bg-slate-900/20 border border-slate-800 rounded-2xl">
              <Shield className="h-10 w-10 text-red-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-normal tracking-widest uppercase text-slate-300">Accesso Limitato</h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Questa sezione statistica avanzata è di esclusiva pertinenza degli amministratori HQ.</p>
            </div>
          ) : (
            <>
              {/* CORE METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  onClick={() => {
                    setActiveSubTab("controls");
                    setSearchQuery("");
                    setComuneFilter("ALL");
                    setEsitoFilter("ALL");
                    setControlDateFilter("");
                  }}
                  className="bg-[#0b0f19] border-slate-800/80 shadow-md cursor-pointer transition-all hover:scale-[1.01] hover:border-purple-500/40 select-none group"
                >
                  <CardContent className="p-4 px-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest group-hover:text-purple-300 transition-colors">Totale Atti in Archivio</p>
                        <h4 className="text-2xl font-semibold text-white tracking-tight mt-1">{totalServices} <span className="text-[10px] text-slate-500 font-normal">atti</span></h4>
                      </div>
                      <div className="bg-purple-500/10 p-2 rounded-xl text-purple-400 border border-purple-500/15">
                        <Shield className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-wider">
                      Clicca per esplorare registri del Nucleo
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  onClick={() => {
                    setActiveSubTab("controls");
                    setSearchQuery("");
                    setComuneFilter("ALL");
                    setEsitoFilter("ALL");
                    setControlDateFilter("");
                  }}
                  className="bg-[#0b0f19] border-slate-800/80 shadow-md cursor-pointer transition-all hover:scale-[1.01] hover:border-emerald-500/40 select-none group"
                >
                  <CardContent className="p-4 px-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest group-hover:text-emerald-300 transition-colors">Controlli sul Territorio</p>
                        <h4 className="text-2xl font-semibold text-emerald-400 tracking-tight mt-1">{totalTerritoryControls} <span className="text-[10px] text-slate-500 font-normal">atti</span></h4>
                      </div>
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/15">
                        <ClipboardList className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-wider">
                      Esplora tutti gli accertamenti {sectorLabel.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  onClick={() => {
                    setActiveSubTab("controls");
                    setSearchQuery("");
                    setComuneFilter("ALL");
                    setEsitoFilter("violazione");
                    setControlDateFilter("");
                  }}
                  className="bg-[#0b0f19] border-slate-800/80 shadow-md cursor-pointer transition-all hover:scale-[1.01] hover:border-red-500/40 select-none group"
                >
                  <CardContent className="p-4 px-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest group-hover:text-red-300 transition-colors">Infrazioni Accertate</p>
                        <h4 className="text-2xl font-semibold text-red-400 tracking-tight mt-1">{closedIntervConVerb} <span className="text-[10px] text-slate-500 font-normal">illeciti</span></h4>
                      </div>
                      <div className="bg-red-500/10 p-2 rounded-xl text-red-400 border border-red-500/15">
                        <AlertTriangle className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-wider">
                      Filtra violazioni accertate settore {sectorLabel.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  onClick={() => {
                    setActiveSubTab("controls");
                    setSearchQuery("");
                    setComuneFilter("ALL");
                    setEsitoFilter("con_prescrizioni");
                    setControlDateFilter("");
                  }}
                  className="bg-[#0b0f19] border-slate-800/80 shadow-md cursor-pointer transition-all hover:scale-[1.01] hover:border-yellow-500/40 select-none group"
                >
                  <CardContent className="p-4 px-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest group-hover:text-yellow-300 transition-colors">Diffide e Prescrizioni</p>
                        <h4 className="text-2xl font-semibold text-yellow-400 tracking-tight mt-1">{closedIntervSenzaVerb} <span className="text-[10px] text-slate-500 font-normal font-mono">vincolati</span></h4>
                      </div>
                      <div className="bg-yellow-500/10 p-2 rounded-xl text-yellow-400 border border-yellow-500/15">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-wider">
                      Filtra prescrizioni e adempimenti attivi
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* MONTHLY AND ANNUAL GRID PLOT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CHARTS CONTAINER (Custom Stacked Styled HTML Bar charts) */}
                <Card className="bg-[#090d16] border-slate-800 lg:col-span-2">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Pressione Operativa Mensile</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Distribuzione mensile delle attività e uscite sul campo nel territorio</p>
                      </div>
                      
                      {/* Year Selector */}
                      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                        {[currentYear - 1, currentYear].map(yr => (
                          <button
                            key={yr}
                            onClick={() => setSelectedStatsYear(yr)}
                            className={cn(
                              "px-3 py-1 font-normal rounded-md transition-colors",
                              selectedStatsYear === yr ? "bg-purple-700 text-white" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chart Body */}
                    <div className="space-y-3">
                      {statsMonthly.map((m, index) => {
                        // Max ratio to calculate length safely
                        const maxVal = Math.max(...statsMonthly.map(s => s.total), 1);
                        const pctVerbali = (m.verbali / maxVal) * 100;
                        const pctRapporti = (m.rapporti / maxVal) * 100;
                        const pctControlli = (m.controlli / maxVal) * 100;

                        return (
                          <div 
                            key={index} 
                            onClick={() => {
                              if (m.total > 0) {
                                // Set search query to the selected year-month to filter controls registry
                                setSearchQuery(`${selectedStatsYear}-${String(index + 1).padStart(2, "0")}`);
                                setActiveSubTab("controls");
                              }
                            }}
                            className={cn(
                              "flex items-center gap-4 text-xs select-none",
                              m.total > 0 ? "cursor-pointer group/row" : ""
                            )}
                          >
                            <span className="w-16 text-slate-400 text-[10px] font-medium uppercase text-right truncate group-hover/row:text-purple-400 transition-colors">{m.month.substring(0, 3)}</span>
                            <div className={cn(
                              "flex-1 h-3.5 bg-slate-950 rounded overflow-hidden flex border border-slate-900/60 relative transition-transform duration-250",
                              m.total > 0 ? "group-hover/row:scale-[1.01] group-hover/row:border-purple-500/25" : ""
                            )}>
                              {m.total === 0 ? (
                                <span className="absolute inset-0 flex items-center pl-3 text-[8px] text-slate-600 font-normal uppercase tracking-widest leading-none">Nessuna attività</span>
                              ) : (
                                <>
                                  <div style={{ width: `${pctVerbali}%` }} className="bg-red-500/90 h-full transition-all" title={`${m.verbali} Verbali`} />
                                  <div style={{ width: `${pctRapporti}%` }} className="bg-emerald-500/90 h-full transition-all" title={`${m.rapporti} Rapporti`} />
                                  <div style={{ width: `${pctControlli}%` }} className="bg-yellow-500/90 h-full transition-all" title={`${m.controlli} Controlli Zoofili`} />
                                </>
                              )}
                            </div>
                            <span className="w-12 font-medium text-slate-400 text-[10px] text-left group-hover/row:text-slate-200 transition-colors">
                              {m.total > 0 ? `${m.total} atti` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-900 justify-center text-[10px] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 bg-red-500 rounded" />
                        <span className="text-slate-400">Verbali (Accertamento Reato)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 bg-emerald-500 rounded" />
                        <span className="text-slate-400">Rapporti (Pattugliamento Ambientale/Aree)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 bg-yellow-500 rounded" />
                        <span className="text-slate-400">Controlli Rapidi Cani / Zoofili</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* DISTRIBUTION BY MUNICIPALITY TABLE (A4 Standard Comuni Counts) */}
                <Card className="bg-[#090d16] border-slate-800">
                  <CardContent className="p-4 px-5">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">Rapporto Comuni (MS)</h3>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-4">Seleziona un comune per filtrare i controlli d'anagrafe</p>
                    
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-1.5">
                      {comuniMassaCarrara.map(com => {
                        const count = statsByComune[com] || 0;
                        return (
                          <div 
                            key={com} 
                            onClick={() => {
                              if (count > 0) {
                                setSelectedComuneForDetail(com);
                                setIsComuneDetailOpen(true);
                              }
                            }}
                            className={cn(
                              "flex justify-between items-center p-2 rounded-lg bg-slate-950/40 border border-slate-900 transition-all font-mono select-none",
                              count > 0 
                                ? "cursor-pointer hover:bg-purple-950/20 hover:border-purple-500/20 hover:scale-[1.01] active:scale-[0.99]" 
                                : "opacity-40 cursor-not-allowed"
                            )}
                            title={count > 0 ? `Clicca per filtrare ${com}` : "Nessun atto registrato nel comune"}
                          >
                            <span className="text-xs text-slate-300 font-medium uppercase">{com}</span>
                            <Badge className={cn(
                              "font-normal tracking-wide text-[9px] px-2 py-0.5",
                              count > 5 ? "bg-purple-950 text-purple-300 border border-purple-500/30" : 
                              count > 0 ? "bg-slate-900 text-slate-300 border border-slate-800" :
                              "bg-slate-950 text-slate-600 border-transparent"
                            )}>
                              {count} {count === 1 ? "Atto" : "Atti"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* OPERATORS COMPREHENSIVE STATISTICS (GUARDS RECONCILIATION) */}
              <Card className="bg-[#090d16] border-slate-800">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Rendimento e Attività Singole Guardie</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                        Resoconto totale delle verbalizzazioni e presenze sul campo. Clicca sul nominativo per visualizzare gli atti associati.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-4 font-normal">Operatore / Guardia</th>
                          <th className="py-3 px-4 font-normal">Matricola</th>
                          <th className="py-3 px-4 font-normal text-center">Verbali fatti</th>
                          <th className="py-3 px-4 font-normal text-center">Rapporti compilati</th>
                          <th className="py-3 px-4 font-normal text-center">Controlli eseguiti</th>
                          <th className="py-3 px-4 font-normal text-center font-bold text-slate-300">Totale Interventi</th>
                          <th className="py-3 px-4 text-right">Azione</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-mono">
                        {statsByGuard.map(entry => (
                          <tr key={entry.guard.id} className="hover:bg-slate-950/45 transition-colors">
                            <td className="py-3 px-4">
                              <button
                                onClick={() => {
                                  setSelectedGuardForDetail(entry.guard);
                                  setIsGuardDetailOpen(true);
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300 underline font-semibold text-left uppercase transition-all"
                              >
                                {entry.guard.surname ? `${entry.guard.name} ${entry.guard.surname}` : entry.guard.name}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400 uppercase">{entry.guard.matricola || "—"}</td>
                            <td className="py-3 px-4 text-center text-xs text-slate-300">{entry.verbali}</td>
                            <td className="py-3 px-4 text-center text-xs text-slate-300">{entry.rapporti}</td>
                            <td className="py-3 px-4 text-center text-xs text-slate-300">{entry.controlli}</td>
                            <td className="py-3 px-4 text-center text-xs font-bold text-purple-300">{entry.total}</td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedGuardForDetail(entry.guard);
                                  setIsGuardDetailOpen(true);
                                }}
                                className="h-7 w-7 text-slate-400 hover:text-white p-0 rounded-lg"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        // REGISTRO CONTROLLI ZOOFILI - LISTA E INVIA (ACCESSIBILE A TUTTI)
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-900">
            {/* Search and Filters for register */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Cerca per microchip, cane, localita'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900/50 border-slate-800 pl-9 h-10 text-xs uppercase italic tracking-widest"
                />
              </div>

              {/* Comune selectors */}
              <select
                value={comuneFilter}
                onChange={(e) => setComuneFilter(e.target.value)}
                className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-300 uppercase tracking-wider font-mono outline-none w-full"
              >
                <option value="ALL">TUTTI I COMUNI</option>
                {comuniMassaCarrara.map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>

              {/* Esito selector */}
              <select
                value={esitoFilter}
                onChange={(e) => setEsitoFilter(e.target.value)}
                className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-300 uppercase tracking-wider font-mono outline-none w-full"
              >
                <option value="ALL">TUTTI GLI ESITI</option>
                <option value="regolare">REGOLARE</option>
                <option value="con_prescrizioni">CON PRESCRIZIONI</option>
                <option value="violazione">VIOLAZIONE VERBALE</option>
              </select>

              {/* Start Date Filter */}
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="date"
                  title="Data Inizio / Singola Data"
                  value={controlDateFilter}
                  onChange={(e) => setControlDateFilter(e.target.value)}
                  className="bg-[#0b0f19] border border-slate-800 pl-9 h-10 text-xs text-slate-300 outline-none w-full"
                />
              </div>

              {/* End Date Filter */}
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="date"
                  title="A Data (Opzionale per periodo)"
                  value={controlEndDateFilter}
                  onChange={(e) => setControlEndDateFilter(e.target.value)}
                  className="bg-[#0b0f19] border border-slate-800 pl-9 h-10 text-xs text-slate-300 outline-none w-full"
                />
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {(searchQuery || comuneFilter !== "ALL" || esitoFilter !== "ALL" || controlDateFilter || controlEndDateFilter) && (
            <div className="flex flex-wrap items-center gap-2 bg-purple-950/25 border border-purple-500/15 p-2 px-3.5 rounded-xl text-xs text-slate-300 animate-slideUp">
              <span className="text-[10px] uppercase font-medium tracking-wider text-purple-400">Filtri attivi:</span>
              {searchQuery && (
                <Badge variant="outline" className="text-[9px] bg-slate-900/60 border-slate-800 text-slate-300 font-normal py-0.5 px-2">
                  Cerca: "{searchQuery}"
                </Badge>
              )}
              {comuneFilter !== "ALL" && (
                <Badge variant="outline" className="text-[9px] bg-slate-900/60 border-slate-800 text-slate-300 font-normal py-0.5 px-2">
                  Comune: {comuneFilter.toUpperCase()}
                </Badge>
              )}
              {esitoFilter !== "ALL" && (
                <Badge variant="outline" className="text-[9px] bg-slate-900/60 border-slate-800 text-slate-300 font-normal py-0.5 px-2">
                  Esito: {esitoFilter.toUpperCase()}
                </Badge>
              )}
              {controlDateFilter && !controlEndDateFilter && (
                <Badge variant="outline" className="text-[9px] bg-slate-900/60 border-slate-800 text-slate-300 font-normal py-0.5 px-2">
                  Data: {safeFormatDate(controlDateFilter, "dd/MM/yyyy")}
                </Badge>
              )}
              {controlDateFilter && controlEndDateFilter && (
                <Badge variant="outline" className="text-[9px] bg-slate-900/60 border-slate-800 text-slate-300 font-normal py-0.5 px-2">
                  Periodo: {safeFormatDate(controlDateFilter, "dd/MM/yyyy")} - {safeFormatDate(controlEndDateFilter, "dd/MM/yyyy")}
                </Badge>
              )}
              {!controlDateFilter && controlEndDateFilter && (
                <Badge variant="outline" className="text-[9px] bg-slate-900/60 border-slate-800 text-slate-300 font-normal py-0.5 px-2">
                  Fino a: {safeFormatDate(controlEndDateFilter, "dd/MM/yyyy")}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setComuneFilter("ALL");
                  setEsitoFilter("ALL");
                  setControlDateFilter("");
                  setControlEndDateFilter("");
                }}
                className="text-xs h-7 ml-auto text-purple-300 hover:text-purple-100 hover:bg-purple-900/20 px-2 rounded-lg"
              >
                Ripristina tutti i filtri
              </Button>
            </div>
          )}

          {/* Table list */}
          <div className="bg-[#090d16] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                REGISTRO OPERATIVO DI ANAGRAFE CANINA & CONTROLLO ANIMALI ({filteredControls.length} record)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => printTerritoryControlsRegister(filteredControls, comuneFilter, controlDateFilter, controlEndDateFilter)}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs uppercase font-bold tracking-wider px-3 py-1.5 h-8 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-200" />
                  Stampa Registro A4 Orizzontale (Excel)
                </Button>

                <Button
                  onClick={() => setIsAddingControl(true)}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs uppercase font-bold tracking-wider px-3 py-1.5 h-8 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-950/40 transition-all"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Nuovo Controllo (Molo / Passeggiata)
                </Button>
              </div>
            </div>

            {filteredControls.length === 0 ? (
              <div className="text-center py-20 text-slate-500 italic uppercase tracking-[0.1em] font-light bg-slate-950/20">
                Nessun controllo sul territorio corrispondente ai criteri inseriti di ricerca.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[9px] uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4 font-normal">N. Controllo</th>
                      <th className="py-3 px-4 font-normal">Data/Ora</th>
                      <th className="py-3 px-4 font-normal">Comune</th>
                      <th className="py-3 px-4 font-normal">Località</th>
                      <th className="py-3 px-4 font-normal">Animale / Razza</th>
                      <th className="py-3 px-4 font-normal font-mono">Microchip</th>
                      <th className="py-3 px-3 font-normal">Proprietario/Soggetto</th>
                      <th className="py-3 px-4 font-normal text-center">Esito</th>
                      <th className="py-3 px-4 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 font-mono">
                    {filteredControls.map(c => {
                      const cDate = safeFormatDate(c.data, "dd/MM/yyyy");
                      return (
                        <tr key={c.id} className="hover:bg-slate-950/30 transition-colors">
                          <td className="py-3 px-4 text-xs font-semibold text-purple-400 uppercase">{c.numeroControllo}</td>
                          <td className="py-3 px-4 text-xs text-slate-300">{cDate} • {c.ora || "—"}</td>
                          <td className="py-3 px-4 text-xs text-slate-300 uppercase">{c.comune}</td>
                          <td className="py-3 px-4 text-xs text-slate-400 uppercase max-w-[120px] truncate" title={c.localita}>{c.localita || "—"}</td>
                          <td className="py-3 px-4 text-xs text-slate-300 uppercase">{c.nomeCane ? `${c.nomeCane} (${c.specieRazza || 'Cane'})` : c.specieRazza || "—"}</td>
                          <td className="py-3 px-4 text-xs text-slate-400 tracking-wider text-[11px] font-medium">{c.microchip || "NON PRESENTE"}</td>
                          <td className="py-3 px-3 text-xs text-slate-300 uppercase max-w-[120px] truncate" title={c.proprietario || c.nomeSoggetto}>{c.proprietario || c.nomeSoggetto || "KEEPER IGNOTO"}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={cn(
                              "font-normal uppercase text-[9px] tracking-wider px-2 py-0.5",
                              c.esito === "regolare" ? "bg-emerald-950 text-emerald-300 border-emerald-500/30" : 
                              c.esito === "con_prescrizioni" ? "bg-yellow-950 text-yellow-300 border-yellow-500/20" : 
                              "bg-red-910 text-red-300 border-red-500/30"
                            )}>
                              {c.esito === "regolare" ? "REGOLARE" : c.esito === "con_prescrizioni" ? "PRESCRIZIONI" : "VIOLAZIONE"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewedControl(c)}
                                className="h-8 w-8 text-slate-400 hover:text-white p-0 rounded-lg hover:bg-slate-900 border border-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => printControlA4(c)}
                                className="h-8 w-8 text-neutral-400 hover:text-blue-400 p-0 rounded-lg hover:bg-slate-900 border border-transparent"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteControl(c.id, c.numeroControllo)}
                                  className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 p-0 rounded-lg border border-transparent"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW CONTROL BOTTOM SHEET / DIALOG FORM */}
      <Dialog open={isAddingControl} onOpenChange={setIsAddingControl}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[850px] max-h-[90vh] bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/10 shrink-0 flex flex-row justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-normal text-white uppercase italic tracking-wider">Nuovo Accertamento / Controllo Zoofilo</DialogTitle>
              <DialogDescription className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Registrazione immediata sul campo a cura della guardia zoofila di turno</DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveControl} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/20">
            {/* Context Data and Location */}
            <div className="bg-slate-950/65 border border-slate-900 p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Sezione 1: Tempistiche e Geolocalizzazione
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Data Sopralluogo *</Label>
                  <Input
                    type="date"
                    required
                    value={newControl.data}
                    onChange={(e) => setNewControl({ ...newControl, data: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Ora Accertamento *</Label>
                  <Input
                    required
                    placeholder="Es: 11:45"
                    value={newControl.ora}
                    onChange={(e) => setNewControl({ ...newControl, ora: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Comune MS *</Label>
                  <select
                    value={newControl.comune || ""}
                    onChange={(e) => setNewControl({ ...newControl, comune: e.target.value })}
                    className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-200 outline-none w-full"
                  >
                    <option value="">-- Seleziona Comune --</option>
                    {comuniMassaCarrara.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Località, Via, Civico *</Label>
                  <Input
                    required
                    placeholder="Es: Via Puliche 12"
                    value={newControl.localita}
                    onChange={(e) => setNewControl({ ...newControl, localita: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase font-mono text-purple-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Guardie Operative sul campo *</Label>
                  <Input
                    required
                    value={newControl.guardie}
                    onChange={(e) => setNewControl({ ...newControl, guardie: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* SUBJECT & ANIMAL SECTION */}
            <div className="bg-slate-950/65 border border-slate-900 p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Sezione 2: Istanza Soggetti & Rilievo Anagrafico
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Nome Cane</Label>
                  <Input
                    placeholder="Es: Fido, Rex..."
                    value={newControl.nomeCane || ""}
                    onChange={(e) => setNewControl({ ...newControl, nomeCane: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase font-bold text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Nome Proprietario / Detentore</Label>
                  <Input
                    placeholder="Cognome e Nome proprietario cane"
                    value={newControl.proprietario || newControl.nomeSoggetto || ""}
                    onChange={(e) => setNewControl({ ...newControl, proprietario: e.target.value, nomeSoggetto: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Documento Esibito sul Posto</Label>
                  <Input
                    placeholder="Es: Iscrizione ASL / Passaporto"
                    value={newControl.documentoEsibito}
                    onChange={(e) => setNewControl({ ...newControl, documentoEsibito: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-mono text-purple-300">Numero Microchip (Cane)</Label>
                    {newControl.microchip && (
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                        newControl.microchip.length === 15 ? "text-emerald-400 bg-emerald-950 border border-emerald-500/30" : "text-amber-400 bg-amber-950 border border-amber-500/30"
                      )}>
                        {newControl.microchip.length} / 15 cifre {newControl.microchip.length === 15 ? "✓" : "⚠️ Incompleto"}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="Codice microchip di 15 cifre"
                    maxLength={15}
                    value={newControl.microchip || ""}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 15);
                      setNewControl({ ...newControl, microchip: digitsOnly });
                    }}
                    className={cn(
                      "bg-[#0b0f19] text-xs h-10 font-mono tracking-wider font-bold",
                      (newControl.microchip?.length || 0) === 15 
                        ? "border-emerald-500 text-emerald-300" 
                        : (newControl.microchip?.length || 0) > 0 
                          ? "border-amber-500 text-amber-300" 
                          : "border-slate-800 text-white"
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Specie / Razza Animale</Label>
                  <Input
                    placeholder="Es: Cane / Pastore Tedesco"
                    value={newControl.specieRazza}
                    onChange={(e) => setNewControl({ ...newControl, specieRazza: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* ESITO ACCERTAMENTO & CARICAMENTO FOTO */}
            <div className="bg-slate-950/65 border border-slate-900 p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Sezione 3: Esito del Controllo e Foto Geotagged
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Valutazione Finale Ispettiva *</Label>
                  <select
                    value={newControl.esito}
                    onChange={(e) => setNewControl({ ...newControl, esito: e.target.value as any })}
                    className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-100 outline-none w-full"
                  >
                    <option value="regolare">REGOLARE (Nessuna anomalia)</option>
                    <option value="con_prescrizioni">CON PRESCRIZIONI D'ADEGUAMENTO</option>
                    <option value="violazione">ACCERTATA VIOLAZIONE</option>
                  </select>
                </div>

                {newControl.esito === "con_prescrizioni" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-bold text-yellow-500">Giorni concessi per Adeguamento *</Label>
                    <Input
                      type="number"
                      required
                      value={newControl.giorniAdeguamento}
                      onChange={(e) => setNewControl({ ...newControl, giorniAdeguamento: Number(e.target.value) })}
                      className="bg-[#0b0f19] border-slate-800 text-xs h-10 text-yellow-500"
                    />
                  </div>
                )}

                {newControl.esito === "con_prescrizioni" && (
                  <div className="sm:col-span-2 space-y-1.5 animate-fadeIn">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-bold text-yellow-500">Dettaglio Prescrizioni Accollate *</Label>
                    <Textarea
                      required
                      placeholder="Descrivi cosa il proprietario deve adeguare (es. ricovero idoneo o iscrizione anagrafe canina entro x giorni)..."
                      value={newControl.prescrizioneTesto}
                      onChange={(e) => setNewControl({ ...newControl, prescrizioneTesto: e.target.value })}
                      className="bg-[#0b0f19] border-slate-800 text-xs min-h-[80px]"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Note Aggiuntive / Constatazioni</Label>
                  <Textarea
                    placeholder="Eventuali note integrative d'ufficio..."
                    value={newControl.note}
                    onChange={(e) => setNewControl({ ...newControl, note: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs min-h-[80px]"
                  />
                </div>

                {/* Foto per Admin e per operatore */}
                <div className="sm:col-span-2 space-y-3">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5 text-purple-400" /> Acquisizione Documento / Foto sul posto (Competenza GPG sul campo)
                  </Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                    <div className="relative w-full sm:w-auto">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="form-control-photo"
                      />
                      <Label
                        htmlFor="form-control-photo"
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2 text-xs rounded-lg uppercase tracking-wider font-semibold cursor-pointer text-center block"
                      >
                        Seleziona file o scatta foto
                      </Label>
                    </div>

                    {controlImage ? (
                      <div className="flex items-center gap-3">
                        <img src={controlImage} className="h-14 w-14 object-cover border border-purple-500/30 rounded-lg" alt="Preview control photo" />
                        <div>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Immagine Caricata</p>
                          <button
                            type="button"
                            onClick={() => setControlImage("")}
                            className="text-[10px] text-red-500 underline hover:text-red-400 uppercase tracking-wide cursor-pointer"
                          >
                            Elimina Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Nessuna foto allegata alla scheda.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-2 pt-4 border-t border-slate-900 bg-slate-900/5 flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddingControl(false)}
                className="text-slate-400"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-700 hover:bg-purple-650 text-white font-normal italic uppercase tracking-wider text-xs px-6 py-2.5 rounded-xl h-11"
              >
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Registra Controllo in Archivio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SELECTED CONTROL VIEWER DIALOG */}
      <Dialog open={viewedControl !== null} onOpenChange={(open) => { if (!open) setViewedControl(null); }}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[700px] bg-[#020617] border border-slate-800 text-slate-200 p-6 flex flex-col overflow-hidden max-h-[90vh] rounded-2xl">
          {viewedControl && (
            <>
              <DialogHeader className="border-b border-slate-800 pb-4 shrink-0 flex flex-row justify-between items-start">
                <div>
                  <Badge className="bg-purple-900/50 text-purple-200 border-purple-500/20 mb-2 uppercase tracking-widest text-[9px] font-mono px-2.5">
                    ID Documentale: {viewedControl.numeroControllo}
                  </Badge>
                  <DialogTitle className="text-lg font-normal text-white uppercase italic tracking-wider">Scheda di Controllo della Sede</DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 py-4 custom-scrollbar">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900 font-mono text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Data accertamento</span>
                    <p className="text-slate-300 font-semibold">{safeFormatDate(viewedControl.data, "dd/MM/yyyy")}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Ora</span>
                    <p className="text-slate-300 font-semibold">{viewedControl.ora || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Comune competente</span>
                    <p className="text-slate-300 font-semibold uppercase">{viewedControl.comune || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Indirizzo / Località</span>
                    <p className="text-slate-300 font-semibold uppercase">{viewedControl.localita || "—"}</p>
                  </div>
                </div>

                {/* Guard and Subject */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-900 pb-1">Dati Soggetti e Agenti</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-900/60 py-1.5">
                      <span className="text-slate-500 uppercase">Guardie verbalizzanti:</span>
                      <span className="text-slate-300 uppercase font-bold">{viewedControl.guardie || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 py-1.5">
                      <span className="text-slate-500 uppercase">Proprietario controllato:</span>
                      <span className="text-slate-300 uppercase font-bold">{viewedControl.proprietario || viewedControl.nomeSoggetto || "Non Identificato"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 py-1.5">
                      <span className="text-slate-500 uppercase">Nome Cane:</span>
                      <span className="text-white uppercase font-bold">{viewedControl.nomeCane || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 py-1.5">
                      <span className="text-slate-500 uppercase">Documento esibito:</span>
                      <span className="text-slate-300 uppercase">{viewedControl.documentoEsibito || "Nessuno"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 py-1.5">
                      <span className="text-slate-500 uppercase">Razza animale:</span>
                      <span className="text-slate-300 uppercase">{viewedControl.specieRazza || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 py-1.5 font-mono">
                      <span className="text-slate-500 uppercase">Microchip:</span>
                      <span className="text-white font-bold tracking-wider">{viewedControl.microchip || "NON DETECTED"}</span>
                    </div>
                  </div>
                </div>

                {/* Outcome and details */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-900 pb-1">Riscontro Ispettivo d'Ufficio</h4>
                  <div className={cn(
                    "p-3 rounded-xl border font-normal text-xs uppercase flex items-center gap-2",
                    viewedControl.esito === "regolare" ? "bg-emerald-950/20 border-emerald-500/25 text-emerald-400" :
                    viewedControl.esito === "con_prescrizioni" ? "bg-yellow-950/15 border-yellow-500/20 text-yellow-500" :
                    "bg-red-950/20 border-red-500/30 text-red-500"
                  )}>
                    {viewedControl.esito === "regolare" && "REGOLARE (Nessun illecito o prescrizione riscontrata)"}
                    {viewedControl.esito === "con_prescrizioni" && `CON PRESCRIZIONI D'ADEGUAMENTO entro ${viewedControl.giorniAdeguamento || 10} giorni`}
                    {viewedControl.esito === "violazione" && "VIOLAZIONE ACCERTATA SUL CAMPO"}
                  </div>

                  {viewedControl.esito === "con_prescrizioni" && viewedControl.prescrizioneTesto && (
                    <div className="bg-slate-950/40 p-4 border border-yellow-500/10 rounded-xl space-y-1">
                      <span className="text-[10px] text-yellow-500 uppercase font-bold tracking-wider">Prescrizioni da verificare:</span>
                      <p className="text-xs text-slate-300 uppercase leading-relaxed font-mono">{viewedControl.prescrizioneTesto}</p>
                    </div>
                  )}

                  {viewedControl.note && (
                    <div className="bg-slate-950/20 p-4 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Relazione d'ufficio integrativa:</span>
                      <p className="text-xs text-slate-300 uppercase leading-relaxed">{viewedControl.note}</p>
                    </div>
                  )}

                  {viewedControl.image && (
                    <div className="border border-slate-900 p-2.5 rounded-xl text-center bg-slate-950/60 max-w-sm mx-auto">
                      <span className="text-[9px] text-slate-500 uppercase block mb-1">Allegato Documentale Fotografico</span>
                      <img src={viewedControl.image} className="max-w-full rounded-lg max-h-[220px] object-cover mx-auto select-none border border-slate-800" alt="Control Attachment" />
                    </div>
                  )}

                  <div className="pt-2">
                    <InterventionAttachments 
                      reportId={viewedControl.id} 
                      db={db} 
                      userEmail={currentGuard?.email || "centrale@vigilanza.it"} 
                      isAdmin={isAdmin}
                      theme="dark"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-800 pt-4 flex justify-between gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printControlA4(viewedControl)}
                  className="bg-slate-900 border-slate-800 text-slate-300"
                >
                  <Printer className="h-4 w-4 mr-1" /> Stampa A4
                </Button>
                <Button
                  size="sm"
                  onClick={() => setViewedControl(null)}
                  className="bg-purple-700 hover:bg-purple-650 text-white"
                >
                  Chiudi Dettaglio
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* GUARD SPECIFIC SYSTEMIZED TIMELINE PANEL */}
      <Dialog open={isGuardDetailOpen} onOpenChange={(open) => { if (!open) closeGuardDetail(); }}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[1400px] bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden h-[90vh] rounded-3xl shadow-2xl">
          {selectedGuardForDetail && (() => {
            const guardVerbaliCount = guardHistoryInterventions.filter(i => i.type === "verbale").length;
            const guardControlliCount = guardHistoryInterventions.filter(i => i.type === "controllo").length;
            const guardRapportiCount = guardHistoryInterventions.filter(i => i.type === "rapporto").length;
            const guardTotalCount = guardHistoryInterventions.length;

            const uniqueGuardComuni = Array.from(new Set(guardHistoryInterventions.map(i => (i.comune || "").trim()))).filter(Boolean).sort();

            return (
              <>
                {/* Header Section */}
                <div className="px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-full bg-purple-600/10 border-2 border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg font-mono shrink-0">
                      {selectedGuardForDetail.name ? selectedGuardForDetail.name[0] : (selectedGuardForDetail.surname ? selectedGuardForDetail.surname[0] : "?")}{selectedGuardForDetail.name && selectedGuardForDetail.surname ? selectedGuardForDetail.surname[0] : ""}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-semibold text-white uppercase italic tracking-wider flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-400" />
                        Fascicolo Personale: {selectedGuardForDetail.name} {selectedGuardForDetail.surname || ""}
                      </DialogTitle>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                        Matricola Operatore: <span className="text-white font-bold font-mono">{selectedGuardForDetail.matricola || "—"}</span> • Qualifica: <span className="text-purple-300 font-bold">{(selectedGuardForDetail as any).ruolo || "G.P.G. Zoofila"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Summary Counters */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                      <span className="text-[8px] text-slate-500 uppercase font-black block leading-tight">Sopralluoghi</span>
                      <span className="text-sm font-bold text-red-400 font-mono">{guardVerbaliCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                      <span className="text-[8px] text-slate-500 uppercase font-black block leading-tight">Controlli</span>
                      <span className="text-sm font-bold text-yellow-400 font-mono">{guardControlliCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                      <span className="text-[8px] text-slate-500 uppercase font-black block leading-tight">Rapporti</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">{guardRapportiCount}</span>
                    </div>
                    <div className="bg-purple-900/10 border border-purple-500/20 px-3.5 py-1.5 rounded-xl text-center min-w-[75px]">
                      <span className="text-[8px] text-purple-400 uppercase font-black block leading-tight">Totale Atti</span>
                      <span className="text-sm font-bold text-purple-300 font-mono">{guardTotalCount}</span>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-800 mx-2 hidden md:block" />

                    <Button
                      onClick={() => printGuardDossierA4(selectedGuardForDetail, { verbali: guardVerbaliCount, rapporti: guardRapportiCount, controlli: guardControlliCount, total: guardTotalCount }, filteredGuardInterventions)}
                      variant="outline"
                      size="sm"
                      className="bg-purple-950/20 border-purple-500/20 hover:bg-purple-900/40 hover:border-purple-500/50 text-purple-300 text-[10px] uppercase font-bold tracking-wider rounded-xl h-9 cursor-pointer"
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> Stampa Fascicolo
                    </Button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 overflow-hidden bg-slate-950/20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
                    
                    {/* LEFT PANEL: TIMELINE & SEARCH FILTER */}
                    <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
                      <div className="bg-[#0b0f19] border border-slate-900 rounded-2xl p-4 space-y-3 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                          Strumenti di Ricerca & Filtro Atti
                        </span>
                        
                        {/* Search input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <Input
                            placeholder="Cerca per codice o località..."
                            value={guardHistorySearch}
                            onChange={(e) => setGuardHistorySearch(e.target.value)}
                            className="bg-slate-950 border-slate-900 text-xs pl-9 h-9"
                          />
                        </div>

                        {/* Filters row */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={guardHistoryTypeFilter}
                              onChange={(e) => setGuardHistoryTypeFilter(e.target.value)}
                              className="bg-slate-950 border border-slate-900 rounded-lg px-2 h-8 text-[10px] text-slate-300 outline-none w-full uppercase font-semibold"
                            >
                              <option value="ALL">Tutti gli atti</option>
                              <option value="verbale">Sopralluoghi</option>
                              <option value="controllo">Controlli Rapidi</option>
                              <option value="rapporto">Rapporti Turno</option>
                            </select>
                          </div>
                          <div>
                            <select
                              value={guardHistoryComuneFilter}
                              onChange={(e) => setGuardHistoryComuneFilter(e.target.value)}
                              className="bg-slate-950 border border-slate-900 rounded-lg px-2 h-8 text-[10px] text-slate-300 outline-none w-full uppercase font-semibold"
                            >
                              <option value="ALL">Tutti i comuni</option>
                              {uniqueGuardComuni.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable list */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mt-4 pr-1.5">
                        {filteredGuardInterventions.length === 0 ? (
                          <div className="text-center py-20 text-slate-500 italic uppercase tracking-wider text-xs font-light bg-[#080c16]/30 border border-slate-900/60 rounded-2xl">
                            Nessun atto corrisponde ai filtri impostati.
                          </div>
                        ) : (
                          filteredGuardInterventions.map((item, index) => {
                            const isSelected = selectedIntervention?.id === item.id;
                            const itemDate = safeFormatDate(item.date, "dd/MM/yyyy");
                            return (
                              <button
                                key={`${item.type}_${item.id}_${index}`}
                                onClick={() => setSelectedIntervention(item)}
                                className={cn(
                                  "w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 relative group cursor-pointer",
                                  isSelected 
                                    ? "bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-950/10" 
                                    : "bg-[#090d16] border-slate-900/80 hover:bg-[#101524] hover:border-slate-800"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-purple-500 rounded-r-md" />
                                )}

                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-bold font-mono">{itemDate}</span>
                                  <Badge className={cn(
                                    "text-[8px] uppercase tracking-widest font-mono h-4 px-1.5 font-bold",
                                    item.type === "verbale" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                    item.type === "rapporto" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  )}>
                                    {item.type === "verbale" ? "Sopralluogo" : item.type === "rapporto" ? "Rapporto" : "Controllo"}
                                  </Badge>
                                </div>

                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs text-white font-bold font-mono tracking-wide">{item.code}</span>
                                  <span className="text-[10px] text-purple-300 font-semibold uppercase font-sans">({item.comune})</span>
                                </div>

                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{item.localita || "—"}</p>
                                <p className="text-slate-500 text-[10px] uppercase tracking-wider line-clamp-2 mt-0.5 leading-relaxed">{item.details}</p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* RIGHT PANEL: ACCIDENT DETAIL VIEW */}
                    <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
                      {selectedIntervention === null || selectedFullRecord === null ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-900 rounded-3xl bg-[#030712]/50">
                          <FileText className="h-12 w-12 text-slate-600 mb-3 animate-pulse" />
                          <h4 className="text-sm font-normal uppercase tracking-widest text-slate-300">Nessun Atto Selezionato</h4>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mt-1.5 max-w-[400px]">
                            Seleziona un atto dal registro telematico di sinistra per caricarne il verbale conforme, i dettagli anagrafici ed i relativi moduli di stampa.
                          </p>
                        </div>
                      ) : (() => {
                        const rec = selectedFullRecord;
                        const partner = getSocio((rec as any).guardie || (rec as any).verbalizzanti || "", selectedGuardForDetail);

                        return (
                          <div className="flex-1 flex flex-col overflow-hidden bg-[#050814] border border-slate-900 rounded-3xl shadow-xl">
                            
                            {/* Inner Header */}
                            <div className="px-5 py-3.5 border-b border-slate-900/80 bg-slate-950/60 flex items-center justify-between shrink-0">
                              <div>
                                <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">
                                  Fascicolo di Dettaglio
                                </span>
                                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wide mt-0.5">
                                  {selectedIntervention.type === "verbale" ? "Sopralluogo" : selectedIntervention.type === "rapporto" ? "Rapporto di Servizio" : "Controllo Rapido"} {selectedIntervention.code}
                                </h3>
                              </div>

                              <Button
                                onClick={() => {
                                  if (selectedIntervention.type === "verbale") {
                                    printReportA4(rec as Report);
                                  } else if (selectedIntervention.type === "rapporto") {
                                    printServiceReportA4(rec as ServiceReport);
                                  } else {
                                    printControlA4(rec as TerritoryControl);
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="bg-slate-900 border-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider rounded-xl h-8 cursor-pointer shrink-0"
                              >
                                <Printer className="h-3.5 w-3.5 mr-1" /> Stampa A4
                              </Button>
                            </div>

                            {/* Scrollable details */}
                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
                              
                              {/* Date & Location block */}
                              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 border border-slate-900 rounded-2xl">
                                <div>
                                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Data e Orario</span>
                                  <span className="text-xs text-slate-200 font-bold uppercase font-mono block mt-1">
                                    {safeFormatDate(selectedIntervention.date, "dd/MM/yyyy")}
                                    { (rec as any).ora && ` — Ore ${(rec as any).ora}`}
                                    { (rec as any).oraInizio && ` — Dalle ${(rec as any).oraInizio} alle ${(rec as any).oraFine}`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Territorio / Comune</span>
                                  <span className="text-xs text-slate-200 font-bold uppercase block mt-1">
                                    {rec.comune} (MS)
                                  </span>
                                </div>
                                <div className="col-span-2 border-t border-slate-900/60 pt-2.5 mt-1">
                                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Località / Indirizzo</span>
                                  <span className="text-xs text-purple-200 font-bold uppercase block mt-1">
                                    {rec.localita || (rec as any).recatPresso || "Non specificata"}
                                  </span>
                                </div>
                              </div>

                              {/* Operators / Teammates */}
                              <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                  Equipaggio & Collaboratori
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-500 uppercase block text-[9px]">Operatore Capofila:</span>
                                    <span className="text-white font-bold uppercase">{selectedGuardForDetail.name} {selectedGuardForDetail.surname || ""}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 uppercase block text-[9px]">Socio / Partner in pattuglia:</span>
                                    <span className="text-purple-300 font-bold uppercase">{partner}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Specific item details (Verbali) */}
                              {selectedIntervention.type === "verbale" && (() => {
                                const v = rec as Report;
                                return (
                                  <div className="space-y-4">
                                    {/* Subject */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
                                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Soggetto Controllato
                                      </span>
                                      <div className="space-y-2 text-xs uppercase leading-normal">
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Nominativo:</span>
                                          <span className="text-white font-bold">{v.soggettoNome || "IGNOTO"}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Nascita:</span>
                                          <span className="text-slate-300 font-mono">{formatDateIT(v.soggettoIl)} {v.soggettoNatoA && `a ${v.soggettoNatoA}`}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Residenza:</span>
                                          <span className="text-slate-300">{v.soggettoResidenteA || "—"} {v.soggettoIndirizzo && `in ${v.soggettoIndirizzo}`}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-slate-500">Documento:</span>
                                          <span className="text-slate-300 font-mono">{v.soggettoDocumentoTipo || "—"} {v.soggettoDocumentoNumero}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Animal Details */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
                                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Dati Detenzione & Capi Rilevati
                                      </span>
                                      <div className="space-y-2 text-xs uppercase">
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Specie / Razze Rilevate:</span>
                                          <span className="text-white font-bold">{v.tipoAnimale || "—"}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Quantità animali:</span>
                                          <span className="text-white font-bold font-mono">{v.numeroAnimali || "1"} capi</span>
                                        </div>
                                        {v.chips && v.chips.length > 0 && (
                                          <div className="pt-1.5">
                                            <span className="text-slate-500 text-[9px] uppercase block mb-1">Censimento Microchips:</span>
                                            <div className="space-y-1 font-mono text-[10px] bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                                              {v.chips.map((c, ci) => (
                                                <div key={ci} className="flex justify-between border-b border-slate-900/60 last:border-0 py-1">
                                                  <span className="text-purple-300 font-bold">{c.numero}</span>
                                                  <span className="text-slate-400 text-right">{c.nominativo || "Proprietario"}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Constatations */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Rilievi e Costatazioni d'Ufficio
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed uppercase whitespace-pre-wrap font-mono">
                                        {v.constatazioni || "Nessuna nota o rilievo."}
                                      </p>
                                    </div>

                                    {/* Prescriptions */}
                                    <div className="bg-yellow-950/15 p-4 border border-yellow-500/10 rounded-2xl space-y-2">
                                      <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block border-b border-yellow-500/5 pb-1.5">
                                        Prescrizioni e Termini di Adeguamento
                                      </span>
                                      <div className="text-xs uppercase">
                                        <span className="text-slate-500">Giorni concessi per sanare le violazioni amministrative:</span>
                                        <span className="text-yellow-500 font-bold font-mono block mt-1 text-sm">
                                          {v.giorniRegolarizzazione || "Nessuno (Sanatoria Immediata o Violazione PG)"} giorni
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Specific item details (Controlli) */}
                              {selectedIntervention.type === "controllo" && (() => {
                                const c = rec as TerritoryControl;
                                return (
                                  <div className="space-y-4">
                                    {/* Subject and Animal */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
                                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Soggetto ed Animale Controllato
                                      </span>
                                      <div className="space-y-2 text-xs uppercase">
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Proprietario/Soggetto:</span>
                                          <span className="text-white font-bold">{c.nomeSoggetto || "IGNOTO"}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Documento esibito:</span>
                                          <span className="text-slate-300 font-mono">{c.documentoEsibito || "Nessuno"}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Specie / Razza:</span>
                                          <span className="text-white font-bold">{c.specieRazza || "—"}</span>
                                        </div>
                                        <div className="flex justify-between py-1 font-mono">
                                          <span className="text-slate-500 uppercase">Microchip:</span>
                                          <span className="text-white font-bold tracking-wider">{c.microchip || "NON DETECTED"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Resolution outcome */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Valutazione Finale Ispettiva (Risoluzione)
                                      </span>
                                      <div className={cn(
                                        "p-3 rounded-xl border text-xs font-bold uppercase flex items-center gap-2",
                                        c.esito === "regolare" ? "bg-emerald-950/25 border-emerald-500/25 text-emerald-400" :
                                        c.esito === "con_prescrizioni" ? "bg-yellow-950/15 border-yellow-500/20 text-yellow-500" :
                                        "bg-red-950/20 border-red-500/30 text-red-500"
                                      )}>
                                        {c.esito === "regolare" && "REGOLARE (Nessun illecito o prescrizione riscontrata)"}
                                        {c.esito === "con_prescrizioni" && `CON PRESCRIZIONI D'ADEGUAMENTO entro ${c.giorniAdeguamento || 10} giorni`}
                                        {c.esito === "violazione" && "VIOLAZIONE ACCERTATA SUL CAMPO"}
                                      </div>

                                      {c.esito === "con_prescrizioni" && c.prescrizioneTesto && (
                                        <div className="bg-slate-950 p-3.5 border border-yellow-500/10 rounded-xl space-y-1">
                                          <span className="text-[9px] text-yellow-500 uppercase font-bold">Dettaglio Prescrizioni:</span>
                                          <p className="text-xs text-slate-300 uppercase leading-relaxed font-mono whitespace-pre-wrap">{c.prescrizioneTesto}</p>
                                        </div>
                                      )}

                                      {c.note && (
                                        <div className="bg-slate-950 p-3.5 border border-slate-900 rounded-xl space-y-1">
                                          <span className="text-[9px] text-slate-500 uppercase font-bold">Relazione integrativa:</span>
                                          <p className="text-xs text-slate-300 uppercase leading-relaxed whitespace-pre-wrap">{c.note}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Image attachments */}
                                    {c.image && (
                                      <div className="border border-slate-900 p-3 rounded-2xl text-center bg-slate-950/60 max-w-md mx-auto space-y-2">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Documentazione Fotografica</span>
                                        <img src={c.image} className="max-w-full rounded-xl max-h-[220px] object-cover mx-auto border border-slate-800" alt="Control Attachment" referrerPolicy="no-referrer" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Specific item details (Rapporti) */}
                              {selectedIntervention.type === "rapporto" && (() => {
                                const r = rec as ServiceReport;
                                return (
                                  <div className="space-y-4">
                                    {/* Vehicle Info */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
                                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Automezzo e Logistica di Servizio
                                      </span>
                                      <div className="space-y-2 text-xs uppercase">
                                        <div className="flex justify-between border-b border-slate-900/40 py-1">
                                          <span className="text-slate-500">Veicolo Utilizzato:</span>
                                          <span className="text-white font-bold">{r.veicoloTarga ? `${r.veicoloTarga} (${r.veicoloProprieta || 'Associazione'})` : "Piedi / Mezzo Proprio"}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-slate-500">Settori Monitorati:</span>
                                          <span className="text-emerald-400 font-bold">{(r.settore || []).join(', ') || "Vigilanza Zoofila"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Detailed Report Notes */}
                                    <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                        Relazione Dettagliata dell'Uscita ed Attività Svolta
                                      </span>
                                      <p className="text-xs text-slate-200 leading-relaxed uppercase whitespace-pre-wrap font-sans bg-slate-950/80 p-4 border border-slate-900 rounded-xl leading-relaxed">
                                        {r.note || "Nessun evento o dettaglio inserito."}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>

                {/* Footer Section */}
                <div className="px-6 py-4 border-t border-slate-800 shrink-0 bg-slate-950/60 flex justify-between gap-3 items-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider hidden sm:inline">
                    Sezione Amministrativa HQ • Nucleo Vigilanza
                  </span>
                  <Button
                    onClick={closeGuardDetail}
                    className="bg-purple-700 hover:bg-purple-650 text-white text-xs uppercase tracking-wider font-bold rounded-xl h-9 px-5 cursor-pointer ml-auto"
                  >
                    Chiudi Dossier
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* COMUNE SPECIFIC SYSTEMIZED TIMELINE & TRENDS PANEL */}
      <Dialog open={isComuneDetailOpen} onOpenChange={(open) => { if (!open) { setIsComuneDetailOpen(false); setSelectedComuneForDetail(null); } }}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[1200px] bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden h-[90vh] rounded-3xl shadow-2xl">
          {selectedComuneForDetail && (() => {
            const comVerbaliCount = comuneHistoryInterventions.filter(i => i.type === "verbale").length;
            const comControlliCount = comuneHistoryInterventions.filter(i => i.type === "controllo").length;
            const comRapportiCount = comuneHistoryInterventions.filter(i => i.type === "rapporto").length;
            const comTotalCount = comuneHistoryInterventions.length;

            // Monthly trend
            const monthlyStats = Array.from({ length: 12 }, (_, i) => {
              const monthName = format(new Date(2026, i, 1), "MMMM", { locale: it });
              const count = comuneHistoryInterventions.filter(item => {
                try {
                  if (!item.date) return false;
                  const d = parseISO(item.date);
                  return !isNaN(d.getTime()) && d.getMonth() === i;
                } catch {
                  return false;
                }
              }).length;
              return { month: monthName, count };
            });

            const maxCount = Math.max(...monthlyStats.map(m => m.count), 1);

            return (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-purple-600/10 border-2 border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg font-mono shrink-0">
                      <MapPin className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-semibold text-white uppercase italic tracking-wider flex items-center gap-2">
                        Rendiconto Comunale: {selectedComuneForDetail}
                      </DialogTitle>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                        Territorio di Competenza • Massa-Carrara • Monitoraggio Attività e Sanzioni d'Ufficio
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => printComuneReportA4(
                        selectedComuneForDetail,
                        { verbali: comVerbaliCount, rapporti: comRapportiCount, controlli: comControlliCount, total: comTotalCount },
                        comuneHistoryInterventions
                      )}
                      size="sm"
                      className="bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 font-bold font-mono text-[10px] uppercase tracking-wider h-9 rounded-xl gap-1.5 transition-all"
                    >
                      <Printer className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                      Stampa Report Comune (A4)
                    </Button>
                    <Button
                      onClick={() => {
                        setComuneFilter(selectedComuneForDetail);
                        setActiveSubTab("controls");
                        setIsComuneDetailOpen(false);
                        setSelectedComuneForDetail(null);
                      }}
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold font-mono text-[10px] uppercase tracking-wider h-9 rounded-xl gap-1.5"
                    >
                      Filtra nel Registro
                    </Button>
                  </div>
                </div>

                {/* Main Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/20">
                  {/* Stats Widgets */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verbali</span>
                        <span className="text-3xl font-extrabold text-red-400 font-mono mt-1">{comVerbaliCount}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Sopralluoghi di Reato</span>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rapporti</span>
                        <span className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">{comRapportiCount}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Relazioni Ambientali</span>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controlli</span>
                        <span className="text-3xl font-extrabold text-yellow-400 font-mono mt-1">{comControlliCount}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Vigilanza Rapida</span>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-950/20 border-purple-500/10">
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Totale Atti</span>
                        <span className="text-3xl font-extrabold text-purple-400 font-mono mt-1">{comTotalCount}</span>
                        <span className="text-[8px] text-purple-500 uppercase tracking-widest mt-1">Interventi Registrati</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Graphical Trend & Charts (Andamento Mensile) */}
                  <Card className="bg-[#090d16] border-slate-800">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300">Andamento Storico degli Interventi</h4>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Distribuzione mensile degli atti registrati per {selectedComuneForDetail}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* SVG Mountain Chart - taking up 8 columns on large screens */}
                        <div className="lg:col-span-8 flex flex-col justify-center bg-slate-950/60 p-5 rounded-2xl border border-slate-900/60">
                          <div className="flex items-center justify-between mb-4 shrink-0">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping"></span>
                              Alpi Apuane Activity Peaks (Andamento Mensile)
                            </span>
                            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">2026</span>
                          </div>
                          
                          <div className="h-[210px] w-full relative">
                            {/* SVG Mountain Chart rendering */}
                            <svg viewBox="0 0 600 200" width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible">
                              <defs>
                                <linearGradient id="mountain-gradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                                </linearGradient>
                                <linearGradient id="ridge-gradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#f472b6" />
                                  <stop offset="50%" stopColor="#a855f7" />
                                  <stop offset="100%" stopColor="#38bdf8" />
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feGaussianBlur stdDeviation="3" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                              </defs>

                              {/* Grid lines */}
                              <line x1="40" y1="40" x2="560" y2="40" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.5" />
                              <line x1="40" y1="100" x2="560" y2="100" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="0.5" />
                              <line x1="40" y1="160" x2="560" y2="160" stroke="#334155" strokeWidth="1" />

                              {/* Mountain Fill Area */}
                              {(() => {
                                const points = monthlyStats.map((item, i) => {
                                  const x = 40 + i * (520 / 11);
                                  const y = 160 - (item.count / maxCount) * 120;
                                  return { x, y };
                                });
                                const ridgePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                const areaPath = `${ridgePath} L ${points[11].x} 160 L ${points[0].x} 160 Z`;
                                
                                return (
                                  <>
                                    <path d={areaPath} fill="url(#mountain-gradient)" />
                                    <path d={ridgePath} fill="none" stroke="url(#ridge-gradient)" strokeWidth="3" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />
                                  </>
                                );
                              })()}

                              {/* Labels and Interactive dots */}
                              {monthlyStats.map((item, i) => {
                                const x = 40 + i * (520 / 11);
                                const y = 160 - (item.count / maxCount) * 120;
                                const label = item.month.substring(0, 3).toUpperCase();
                                const hasData = item.count > 0;
                                
                                return (
                                  <g key={i} className="group cursor-pointer">
                                    {/* Vertical line from dot to bottom */}
                                    {hasData && (
                                      <line x1={x} y1={y} x2={x} y2="160" stroke="#334155" strokeWidth="0.75" strokeDasharray="2 2" />
                                    )}
                                    
                                    {/* Outer pulsing ring for data points */}
                                    {hasData && (
                                      <circle cx={x} cy={y} r="7" className="fill-purple-500/20 stroke-purple-400/50 animate-pulse stroke-1" />
                                    )}
                                    
                                    {/* Dot circle */}
                                    <circle 
                                      cx={x} 
                                      cy={y} 
                                      r={hasData ? "4" : "2"} 
                                      className={hasData ? "fill-white stroke-purple-500 stroke-2" : "fill-slate-700"} 
                                    />
                                    
                                    {/* Tooltip text showing only count */}
                                    {hasData && (
                                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <rect x={x - 15} y={y - 24} width="30" height="16" rx="4" className="fill-purple-950 stroke-purple-500 stroke-[0.5]" />
                                        <text x={x} y={y - 13} className="text-[9px] font-bold font-mono fill-white text-center" textAnchor="middle">{item.count}</text>
                                      </g>
                                    )}

                                    {/* Month label at the bottom */}
                                    <text x={x} y="180" className="text-[8px] font-bold font-mono fill-slate-500 group-hover:fill-slate-300 transition-colors text-center" textAnchor="middle">
                                      {label}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        </div>

                        {/* Sector distribution & statistics explanation - taking up 4 columns */}
                        <div className="lg:col-span-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-900 flex flex-col justify-between space-y-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Ripartizione Settori</span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">Complete</span>
                            </div>
                            
                            <div className="space-y-3 font-mono text-[10px]">
                              {/* Zoofila row */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-300 font-bold">
                                  <span className="uppercase tracking-wide">Vigilanza Zoofila</span>
                                  <span className="text-red-400">{sectorStats.zoofila} u.</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${comTotalCount > 0 ? (sectorStats.zoofila / comTotalCount) * 100 : 0}%` }} 
                                    className="h-full bg-gradient-to-r from-red-600 to-pink-500 rounded-full"
                                  />
                                </div>
                              </div>

                              {/* Ittica row */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-300 font-bold">
                                  <span className="uppercase tracking-wide">Servizio Ittico</span>
                                  <span className="text-blue-400">{sectorStats.ittica} u.</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${comTotalCount > 0 ? (sectorStats.ittica / comTotalCount) * 100 : 0}%` }} 
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                                  />
                                </div>
                              </div>

                              {/* Venatoria row */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-300 font-bold">
                                  <span className="uppercase tracking-wide">Servizio Venatorio</span>
                                  <span className="text-amber-500">{sectorStats.venatoria} u.</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${comTotalCount > 0 ? (sectorStats.venatoria / comTotalCount) * 100 : 0}%` }} 
                                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-500 rounded-full"
                                  />
                                </div>
                              </div>

                              {/* Ambientale row */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-300 font-bold">
                                  <span className="uppercase tracking-wide">Vigilanza Ambientale</span>
                                  <span className="text-emerald-400">{sectorStats.ambientale} u.</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${comTotalCount > 0 ? (sectorStats.ambientale / comTotalCount) * 100 : 0}%` }} 
                                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                                  />
                                </div>
                              </div>

                              {/* Altro row */}
                              {sectorStats.altro > 0 && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-slate-300 font-bold">
                                    <span className="uppercase tracking-wide">Altro / Nucleo</span>
                                    <span className="text-purple-400">{sectorStats.altro} u.</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                    <div 
                                      style={{ width: `${comTotalCount > 0 ? (sectorStats.altro / comTotalCount) * 100 : 0}%` }} 
                                      className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-[9px] text-slate-500 uppercase tracking-widest leading-relaxed border-t border-slate-900/60 pt-3 space-y-1 shrink-0 font-sans">
                            <div className="flex items-center gap-1.5"><span className="h-1 w-1 bg-purple-500 rounded-full"></span>Massa-Carrara Controllo Qualità</div>
                            <div className="flex items-center gap-1.5"><span className="h-1 w-1 bg-purple-500 rounded-full"></span>Fascicoli stampabili in conformità PG</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Registered Acts List in that municipality */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300">Cronologia Atti Territoriali</h4>
                    
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#090d16]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-500 tracking-wider bg-slate-950/40 font-mono">
                              <th className="py-3 px-4 font-normal">Data</th>
                              <th className="py-3 px-4 font-normal">Tipologia Atto</th>
                              <th className="py-3 px-4 font-normal">Codice Registro</th>
                              <th className="py-3 px-4 font-normal">Agenti Coinvolti</th>
                              <th className="py-3 px-4 font-normal">Località e Risoluzione</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-mono">
                            {comuneHistoryInterventions.map(item => {
                              const itemDate = safeFormatDate(item.date, "dd/MM/yyyy");
                              const badgeClass = item.type === "verbale" ? "bg-red-950/40 text-red-400 border border-red-500/20" : item.type === "rapporto" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" : "bg-yellow-950/40 text-yellow-400 border border-yellow-500/20";
                              const typeLabel = item.type === "verbale" ? "Sopralluogo" : item.type === "rapporto" ? "Rapporto" : "Controllo";
                              return (
                                <tr key={item.id} className="hover:bg-slate-950/30 transition-colors">
                                  <td className="py-3 px-4 text-xs text-slate-400">{itemDate}</td>
                                  <td className="py-3 px-4">
                                    <span className={cn("text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase", badgeClass)}>
                                      {typeLabel}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-xs">
                                    <button
                                      onClick={() => setSelectedComuneAct({ type: item.type, id: item.id })}
                                      className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold tracking-wide transition-colors group cursor-pointer text-left"
                                    >
                                      <FileText className="h-3.5 w-3.5 group-hover:scale-110 transition-transform text-purple-500" />
                                      <span className="underline decoration-purple-500/30 group-hover:decoration-purple-500/70">{item.code}</span>
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-xs text-slate-400 uppercase truncate max-w-[150px]" title={item.guardie}>
                                    {item.guardie || "NUCLEO VIGILANZA"}
                                  </td>
                                  <td className="py-3 px-4 text-xs">
                                    <div className="font-semibold text-slate-300 uppercase truncate max-w-[200px]" title={item.localita}>
                                      {item.localita || "—"}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase truncate max-w-[300px]" title={item.details}>
                                      {item.details}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 shrink-0 bg-slate-950/60 flex justify-between gap-3 items-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                    Sezione Amministrativa HQ • Monitoraggio Territoriale Massa-Carrara
                  </span>
                  <Button
                    onClick={() => {
                      setIsComuneDetailOpen(false);
                      setSelectedComuneForDetail(null);
                    }}
                    className="bg-purple-700 hover:bg-purple-650 text-white text-xs uppercase tracking-wider font-bold rounded-xl h-9 px-5 cursor-pointer"
                  >
                    Chiudi Rendiconto
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* COMUNE ACT FULL DETAIL POPUP */}
      <Dialog open={!!selectedComuneAct} onOpenChange={(open) => { if (!open) setSelectedComuneAct(null); }}>
        <DialogContent className="max-w-[90vw] w-full md:max-w-[750px] bg-[#02050f] border border-slate-900 text-slate-200 p-0 flex flex-col overflow-hidden h-[80vh] rounded-3xl shadow-2xl z-[100]">
          {selectedFullComuneAct && (() => {
            const act = selectedFullComuneAct;
            const typeLabel = selectedComuneAct!.type === "verbale" ? "Sopralluogo di Reato / Verbale" : selectedComuneAct!.type === "rapporto" ? "Rapporto di Servizio" : "Controllo Rapido sul Territorio";
            const badgeClass = selectedComuneAct!.type === "verbale" ? "bg-red-950/40 text-red-400 border border-red-500/20" : selectedComuneAct!.type === "rapporto" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" : "bg-yellow-950/40 text-yellow-400 border border-yellow-500/20";
            
            return (
              <>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-900/80 bg-slate-950/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full uppercase", badgeClass)}>
                      {selectedComuneAct!.type === "verbale" ? "Verbale" : selectedComuneAct!.type === "rapporto" ? "Rapporto" : "Controllo"}
                    </span>
                    <DialogTitle className="text-sm font-bold text-white uppercase font-mono tracking-wide">
                      {typeLabel} {selectedComuneAct!.type === "verbale" ? (act as Report).numeroVerbale : selectedComuneAct!.type === "rapporto" ? (act as ServiceReport).numeroRapporto : (act as TerritoryControl).numeroControllo}
                    </DialogTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        if (selectedComuneAct!.type === "verbale") {
                          printReportA4(act as Report);
                        } else if (selectedComuneAct!.type === "rapporto") {
                          printServiceReportA4(act as ServiceReport);
                        } else {
                          printControlA4(act as TerritoryControl);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-slate-900 border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 text-[10px] uppercase font-bold tracking-wider rounded-xl h-8 cursor-pointer shrink-0"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" /> Stampa A4
                    </Button>
                    <Button
                      onClick={() => setSelectedComuneAct(null)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white text-xs uppercase h-8 rounded-xl"
                    >
                      Chiudi
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5 bg-slate-950/10">
                  
                  {/* Date & Location block */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 border border-slate-900 rounded-2xl font-mono text-xs">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Data e Orario</span>
                      <span className="text-slate-200 font-bold uppercase block mt-1">
                        {safeFormatDate(act.data, "dd/MM/yyyy")}
                        { (act as any).ora && ` — Ore ${(act as any).ora}`}
                        { (act as any).oraInizio && ` — Dalle ${(act as any).oraInizio} alle ${(act as any).oraFine}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Comune di Competenza</span>
                      <span className="text-slate-200 font-bold uppercase block mt-1">
                        {act.comune} (MS)
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-slate-900/60 pt-2.5 mt-1">
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Località / Indirizzo Intervento</span>
                      <span className="text-purple-200 font-bold uppercase block mt-1">
                        {act.localita || (act as any).recatPresso || "Non specificata"}
                      </span>
                    </div>
                  </div>

                  {/* Agenti verbalizzanti */}
                  <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl font-mono text-xs">
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block mb-1">Equipaggio Operativo</span>
                    <span className="text-white font-bold uppercase block mt-1">
                      {selectedComuneAct!.type === "verbale" ? (act as Report).verbalizzanti : selectedComuneAct!.type === "rapporto" ? (act as ServiceReport).guardie : (act as TerritoryControl).guardie}
                    </span>
                  </div>

                  {/* Specific fields */}
                  {selectedComuneAct!.type === "verbale" && (() => {
                    const v = act as Report;
                    return (
                      <div className="space-y-4">
                        {/* Controlled subject */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3 font-mono text-xs">
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                            Soggetto Controllato / Identificato
                          </span>
                          <div className="space-y-2 uppercase leading-normal">
                            <div className="flex justify-between border-b border-slate-900/40 py-1">
                              <span className="text-slate-500">Nominativo:</span>
                              <span className="text-white font-bold">{v.soggettoNome || "IGNOTO"}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-1">
                              <span className="text-slate-500">Nascita:</span>
                              <span className="text-slate-300">{formatDateIT(v.soggettoIl)} {v.soggettoNatoA && `a ${v.soggettoNatoA}`}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-1">
                              <span className="text-slate-500">Residenza:</span>
                              <span className="text-slate-300">{v.soggettoResidenteA || "—"} {v.soggettoIndirizzo && `in ${v.soggettoIndirizzo}`}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-slate-500">Documento:</span>
                              <span className="text-slate-300">{v.soggettoDocumentoTipo || "—"} {v.soggettoDocumentoNumero}</span>
                            </div>
                          </div>
                        </div>

                        {/* Animal Details */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3 font-mono text-xs">
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                            Dati Detenzione & Capi Rilevati
                          </span>
                          <div className="space-y-2 uppercase">
                            <div className="flex justify-between border-b border-slate-900/40 py-1">
                              <span className="text-slate-500">Specie / Razze Rilevate:</span>
                              <span className="text-white font-bold">{v.tipoAnimale || "—"}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-1">
                              <span className="text-slate-500">Quantità animali:</span>
                              <span className="text-white font-bold">{v.numeroAnimali || "1"} capi</span>
                            </div>
                            {v.chips && v.chips.length > 0 && (
                              <div className="pt-1.5">
                                <span className="text-slate-500 text-[9px] uppercase block mb-1">Censimento Microchips:</span>
                                <div className="space-y-1 text-[10px] bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                                  {v.chips.map((c, ci) => (
                                    <div key={ci} className="flex justify-between border-b border-slate-900/60 last:border-0 py-1">
                                      <span className="text-purple-300 font-bold">{c.numero}</span>
                                      <span className="text-slate-400 text-right">{c.nominativo || "Proprietario"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Constatations */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                            Rilievi e Costatazioni d'Ufficio
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed uppercase whitespace-pre-wrap font-mono">
                            {v.constatazioni || "Nessuna nota o rilievo."}
                          </p>
                        </div>

                        {/* Prescriptions */}
                        {v.giorniRegolarizzazione && (
                          <div className="bg-yellow-950/15 p-4 border border-yellow-500/10 rounded-2xl space-y-2">
                            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block border-b border-yellow-500/5 pb-1.5">
                              Prescrizioni e Termini di Adeguamento
                            </span>
                            <div className="text-xs uppercase font-mono">
                              <span className="text-slate-500">Giorni concessi per sanare le violazioni amministrative:</span>
                              <span className="text-yellow-500 font-bold block mt-1 text-sm">
                                {v.giorniRegolarizzazione} giorni
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {selectedComuneAct!.type === "rapporto" && (() => {
                    const r = act as ServiceReport;
                    return (
                      <div className="space-y-4">
                        {/* Sectors */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2 font-mono text-xs">
                          <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Settori di Servizio</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {(r.settore || []).map((s, si) => (
                              <Badge key={si} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Vehicle details */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl grid grid-cols-2 gap-4 font-mono text-xs">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Veicolo di Pattuglia</span>
                            <span className="text-white font-bold block mt-1 uppercase">{r.veicoloTarga || "Nessun mezzo (A piedi)"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Proprietà Mezzo</span>
                            <span className="text-white font-bold block mt-1 uppercase">{r.veicoloProprieta || "—"}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                            Note Operative / Sintesi di Servizio
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed uppercase whitespace-pre-wrap font-mono">
                            {r.note || "Nessuna nota aggiuntiva."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedComuneAct!.type === "controllo" && (() => {
                    const c = act as TerritoryControl;
                    return (
                      <div className="space-y-4">
                        {/* Subject and Animal */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl grid grid-cols-2 gap-4 font-mono text-xs">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Soggetto Controllato</span>
                            <span className="text-white font-bold block mt-1 uppercase">{c.nomeSoggetto || "IGNOTO"}</span>
                            {c.documentoEsibito && (
                              <span className="text-[9px] text-slate-500 block mt-0.5">Doc: {c.documentoEsibito}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Capi / Animale Rilevato</span>
                            <span className="text-white font-bold block mt-1 uppercase">{c.specieRazza || "Non specificato"}</span>
                            {c.microchip && (
                              <span className="text-[9px] text-purple-400 block mt-0.5">Chip: {c.microchip}</span>
                            )}
                          </div>
                        </div>

                        {/* Outcome & Sector */}
                        <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl grid grid-cols-2 gap-4 font-mono text-xs">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Esito Controllo</span>
                            <span className={cn(
                              "text-xs font-bold block mt-1 uppercase",
                              c.esito === "regolare" ? "text-emerald-400" : c.esito === "con_prescrizioni" ? "text-yellow-500" : "text-red-400"
                            )}>
                              {c.esito === "regolare" ? "Regolare" : c.esito === "con_prescrizioni" ? "Regolarizzato con prescrizioni" : "Violazione Sanzionata"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">Settore Vigilanza</span>
                            <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 mt-1 inline-block">
                              {c.settore}
                            </Badge>
                          </div>
                        </div>

                        {/* Prescription Text */}
                        {c.esito !== "regolare" && (c.prescrizioneTesto || c.giorniAdeguamento) && (
                          <div className="bg-yellow-950/15 p-4 border border-yellow-500/10 rounded-2xl space-y-2 font-mono text-xs">
                            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block border-b border-yellow-500/5 pb-1.5">
                              Prescrizioni Amministrative
                            </span>
                            {c.prescrizioneTesto && (
                              <p className="text-xs text-slate-300 leading-relaxed uppercase whitespace-pre-wrap">{c.prescrizioneTesto}</p>
                            )}
                            {c.giorniAdeguamento && (
                              <p className="text-[10px] text-slate-500 uppercase mt-1">
                                Termine adempimento: <span className="text-yellow-500 font-bold">{c.giorniAdeguamento} giorni</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {c.note && (
                          <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                              Osservazioni / Note Aggiuntive
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed uppercase whitespace-pre-wrap font-mono">
                              {c.note}
                            </p>
                          </div>
                        )}

                        {/* Document/Photo attachment */}
                        {c.image && (
                          <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                              Acquisizione Documentale / Foto allegata
                            </span>
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-900 mt-2 bg-slate-950 flex items-center justify-center">
                              <img src={c.image} alt="Allegato" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

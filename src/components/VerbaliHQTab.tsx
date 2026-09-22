import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ClipboardList,
  Search,
  Calendar as CalendarIcon,
  FileText,
  User as UserIcon,
  MapPin,
  Mail,
  Download,
  Trash2,
  X,
  Printer,
  Eye,
  Maximize2,
  FolderOpen,
  Upload,
  Camera,
  CheckCircle2,
  Link2,
  Unlink,
  AlertTriangle,
  Plus,
  FileUp,
  ChevronLeft,
  Loader2,
  Activity,
  Clock,
  Sparkles,
  RefreshCw,
  Brain,
  Award,
  FileCheck,
} from "lucide-react";
import { motion } from "motion/react";
import {
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  collection,
  query,
  onSnapshot,
  getDocs,
  where,
  orderBy,
} from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ReportHeader, getOfficialPrintHeaderHtml } from "./ReportHeader";

// Fix default Leaflet marker icons in Vite to prevent blank screen crashes on mobile
if (typeof window !== "undefined" && L && L.Icon && L.Icon.Default) {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  } catch (err) {
    console.warn("Leaflet default icons failover error:", err);
  }
}

// Convertitore robusto da data:URI Base64 Canino/PDF a Blob URL per aggirare i controlli rigidi sandbox dei browser sui PDF
const convertDataURIToBlobURL = (dataURI: string): string => {
  if (!dataURI || typeof dataURI !== "string" || !dataURI.startsWith("data:")) return dataURI || "";
  try {
    const parts = dataURI.split(",");
    if (!parts || parts.length < 2) return dataURI;
    const mime = (parts[0] || "").match(/:(.*?);/)?.[1] || "application/octet-stream";
    const byteString = atob(parts[1] || "");
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Errore conversione Blob:", e);
    return dataURI;
  }
};

import { EmailFeedbackModal, EmailFeedbackState } from "./EmailFeedbackModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, printElementById } from "@/lib/utils";
import { formatDateIT } from "../lib/date-utils";
import { EkoclubLogo } from "./EkoclubLogo";
import { Report, EnvironmentalReport, SanctionReport, Guard } from "../types";

// Extractor/converter helper to resolve names to matricolas
const resolveVerbalizzantiToMatricole = (input: string | undefined | null, guards: Guard[] = []): string => {
  if (!input) return "________________";
  
  // Standardize the separators: split by comma, semicolon, dash, slash, or " e "
  const parts = input.split(/,|\/|;| - | -|- | e | e\s+/gi);
  const resolved: string[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    const lowerPart = part.toLowerCase();

    // 1. Direct matricola match
    let matchedGuard: Guard | undefined = undefined;

    matchedGuard = guards.find(g => {
      const gMatr = (g.matricola || "").trim().toLowerCase();
      return gMatr && (lowerPart === gMatr || lowerPart === `matr. ${gMatr}` || lowerPart === `matr ${gMatr}`);
    });

    if (!matchedGuard) {
      // 2. Direct name + surname match
      matchedGuard = guards.find(g => {
        const gName = (g.name || "").trim().toLowerCase();
        const gSurname = (g.surname || "").trim().toLowerCase();
        if (!gName && !gSurname) return false;
        
        if (gName && gSurname) {
          return lowerPart.includes(gName) && lowerPart.includes(gSurname);
        }
        if (gSurname) return lowerPart === gSurname;
        if (gName) return lowerPart === gName;
        return false;
      });
    }

    if (!matchedGuard) {
      // 3. Partial surname match
      matchedGuard = guards.find(g => {
        const gSurname = (g.surname || "").trim().toLowerCase();
        return gSurname && (lowerPart === gSurname || lowerPart.includes(gSurname));
      });
    }

    if (!matchedGuard) {
      // 4. Partial name match
      matchedGuard = guards.find(g => {
        const gName = (g.name || "").trim().toLowerCase();
        return gName && (lowerPart === gName || lowerPart.includes(gName));
      });
    }

    if (matchedGuard && matchedGuard.matricola) {
      const formattedMatr = matchedGuard.matricola.toUpperCase().trim();
      resolved.push(formattedMatr.startsWith("MATR") ? formattedMatr : `MATR. ${formattedMatr}`);
    } else {
      // No match found, fallback to original regex-based extraction
      const parenRegex = /\(([^)]+)\)/;
      const parenMatch = part.match(parenRegex);
      if (parenMatch) {
        const content = parenMatch[1].replace(/matr\.|matricola|matr/i, "").trim();
        if (content) {
          resolved.push(content.toUpperCase().startsWith("MATR") ? content.toUpperCase() : `MATR. ${content.toUpperCase()}`);
          continue;
        }
      }

      const matrRegex = /(?:matr\.|matricola|matr)\s*([A-Za-z0-9\-]+)/i;
      const matrMatch = part.match(matrRegex);
      if (matrMatch && matrMatch[1]) {
        const content = matrMatch[1].trim();
        resolved.push(content.toUpperCase().startsWith("MATR") ? content.toUpperCase() : `MATR. ${content.toUpperCase()}`);
        continue;
      }

      // Check if the part already looks like a matricola (short and has numbers)
      if (part.length < 15 && /[\d]/.test(part)) {
        const cleaned = part.replace(/matr\.|matricola/gi, "").trim().toUpperCase();
        resolved.push(cleaned.startsWith("MATR") ? cleaned : `MATR. ${cleaned}`);
      } else {
        resolved.push(part.toUpperCase());
      }
    }
  }

  return resolved.join(" - ");
};

// Original extractor helper for module-level fallback
const extractOnlyMatricole = (input: string | undefined | null): string => {
  return resolveVerbalizzantiToMatricole(input, []);
};

// Dynamic map panning & zooming controller
const MapFocusController = ({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
};

// Force maps layout updates on triggers
const MapResizeTrigger = ({ watch }: { watch?: any }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map, watch]);
  return null;
};

const CANDIDATE_STRADE = [
  { name: "Via Villafranca (Carrara)", lat: 44.056, lng: 10.063 },
  { name: "Via Genova (Marina di Carrara)", lat: 44.0371, lng: 10.0435 },
  { name: "Via dei Mille (Marina di Carrara)", lat: 44.0375, lng: 10.0405 },
  { name: "Via Piave (Stadio/Carrara)", lat: 44.0618, lng: 10.0815 },
  { name: "Viale XX Settembre (Carrara)", lat: 44.057, lng: 10.076 },
  { name: "Via Roma (Carrara Centro)", lat: 44.0782, lng: 10.1005 },
  { name: "Via Covetta (Avenza)", lat: 44.055, lng: 10.073 },
  { name: "Via Rinchiosa (Marina di Carrara)", lat: 44.039, lng: 10.041 },
  { name: "Viale Colombo (Marina di Carrara)", lat: 44.041, lng: 10.035 },
  { name: "Viale Vespucci (Marina di Carrara)", lat: 44.036, lng: 10.038 },
  { name: "Avenza Centro", lat: 44.0532, lng: 10.0664 },
  { name: "Marina di Carrara Centro", lat: 44.0416, lng: 10.0402 },
  { name: "Stadio (Carrara)", lat: 44.0618, lng: 10.0815 },
  { name: "Carrara Centro", lat: 44.0793, lng: 10.0971 },
  { name: "Bonascola (Carrara)", lat: 44.0673, lng: 10.0818 },
  { name: "Fossola (Carrara)", lat: 44.0772, lng: 10.1141 },
  { name: "Bedizzano (Carrara)", lat: 44.0863, lng: 10.1292 },
  { name: "Torano (Carrara)", lat: 44.0984, lng: 10.0964 },
  { name: "Colonnata (Carrara)", lat: 44.0865, lng: 10.1558 },
  { name: "Sorgnano (Carrara)", lat: 44.0811, lng: 10.1061 },
  { name: "Codena (Carrara)", lat: 44.0868, lng: 10.1118 },
  { name: "Massa Centro", lat: 44.0356, lng: 10.1411 },
  { name: "Marina di Massa", lat: 44.0044, lng: 10.1132 },
  { name: "Aulla Centro", lat: 44.2125, lng: 9.9701 },
  { name: "Villafranca in Lunigiana", lat: 44.2818, lng: 9.9501 },
  { name: "Pontremoli Centro", lat: 44.3789, lng: 9.8824 },
  { name: "Fivizzano Centro", lat: 44.2384, lng: 10.1257 },
  { name: "Fosdinovo Centro", lat: 44.1345, lng: 10.0194 },
];

// Map of municipalities and localities in Massa-Carrara and Lunigiana
const getCoordinateForReport = (report: Report): [number, number] => {
  // If manual override coordinates are set on the document, use them!
  if (
    report.latitude !== undefined &&
    report.latitude !== null &&
    report.longitude !== undefined &&
    report.longitude !== null
  ) {
    return [report.latitude, report.longitude];
  }

  const recatPresso = (report.recatPresso || "").trim().toLowerCase();
  const comune = (report.comune || "").trim().toLowerCase();
  const localita = (report.localita || "").trim().toLowerCase();
  const soggIndirizzo = (report.soggettoIndirizzo || "").trim().toLowerCase();

  // Combine references to search for specific roads or key locations
  const combinedText =
    `${recatPresso} ${localita} ${soggIndirizzo} ${comune}`.replace(
      /\s+/g,
      " ",
    );

  let lat = 44.0793; // Default Carrara center
  let lng = 10.0971;
  let found = false;

  const isCarrara =
    combinedText.includes("carrara") ||
    combinedText.includes("avenza") ||
    combinedText.includes("marina") ||
    combinedText.includes("stadio") ||
    combinedText.includes("fossola") ||
    combinedText.includes("bonascola") ||
    combinedText.includes("bedizzano") ||
    combinedText.includes("codena");

  // Specific check for Carrara's "Via Villafranca" vs the municipality of "Villafranca in Lunigiana"
  if (
    combinedText.includes("villafranca") &&
    (isCarrara ||
      combinedText.includes("via") ||
      combinedText.includes("viale") ||
      combinedText.includes("piazza"))
  ) {
    lat = 44.056;
    lng = 10.063; // Coordinates for Avenza's Via Villafranca inside Carrara
    found = true;
  }

  const streetCoordinates: Record<string, [number, number]> = {
    genova: [44.0371, 10.0435], // Via Genova -> Marina di Carrara
    "dei mille": [44.0375, 10.0405], // Via dei Mille -> Marina di Carrara
    mille: [44.0375, 10.0405], // Via dei Mille -> Marina di Carrara
    piave: [44.0618, 10.0815], // Via Piave -> Località Stadio / Carrara
    roma: [44.0782, 10.1005], // Via Roma
    "xx settembre": [44.057, 10.076], // Viale XX Settembre
    covetta: [44.055, 10.073], // Via Covetta (Avenza)
    rinchiosa: [44.039, 10.041], // Via Rinchiosa (Marina di Carrara)
    ingolstadt: [44.045, 10.045], // Via Ingolstadt
    pucciarelli: [44.048, 10.055], // Via Pucciarelli
    melara: [44.058, 10.07], // Via Melara
    firenze: [44.0378, 10.0488], // Via Firenze
    trieste: [44.0392, 10.0465], // Via Trieste
    fiascheri: [44.0673, 10.0818], // Via Fiascheri
    vespucci: [44.036, 10.038], // Viale Vespucci
    colombo: [44.041, 10.035], // Viale Colombo
    verrazzano: [44.039, 10.032], // Viale Da Verrazzano
    ghibellina: [44.079, 10.102], // Via Ghibellina
    saronich: [44.0425, 10.039], // Via Saronich
    pinete: [43.998, 10.145], // Via delle Pinete
    bondano: [43.999, 10.143], // Via Bondano
    apua: [44.015, 10.125], // Viale Apua
    bastione: [44.037, 10.142], // Via Bastione (Massa)
    aranci: [44.036, 10.1435], // Piazza Aranci
    stadio: [44.0618, 10.0815], // Stadio Carrara
    avenza: [44.0532, 10.0664],
    "marina di carrara": [44.0416, 10.0402],
    "marina di massa": [44.0044, 10.1132],
    fossola: [44.0772, 10.1141],
    bedizzano: [44.0863, 10.1292],
    torano: [44.0984, 10.0964],
    colonnata: [44.0865, 10.1558],
    sorgnano: [44.0811, 10.1061],
    codena: [44.0868, 10.1118],
    bonascola: [44.0673, 10.0818],
    ronchi: [44.0001, 10.1332],
    poveromo: [43.9875, 10.1501],
    altagnana: [44.0531, 10.1873],
    antona: [44.0624, 10.1984],
    canevara: [44.0494, 10.1654],
    mirteto: [44.0488, 10.1388],
    castagnola: [44.0278, 10.1264],
    romagnano: [44.0253, 10.1612],
    pontremoli: [44.3789, 9.8824],
    aulla: [44.2125, 9.9701],
    fivizzano: [44.2384, 10.1257],
    villafranca: [44.2818, 9.9501],
    bagnone: [44.3129, 9.9961],
    filattiera: [44.3315, 9.9329],
    "licciana nardi": [44.2646, 10.0381],
    mulazzo: [44.3161, 9.8891],
    tresana: [44.2057, 9.9149],
    podenzana: [44.2045, 9.9467],
    casola: [44.2012, 10.1741],
    fosdinovo: [44.1345, 10.0194],
    zeri: [44.3512, 9.7612],
  };

  // Check specific keys first for maximum accuracy (excluding "villafranca" if already found)
  if (!found) {
    const keysOrdered = Object.keys(streetCoordinates).sort(
      (a, b) => b.length - a.length,
    );

    for (const key of keysOrdered) {
      if (combinedText.includes(key)) {
        [lat, lng] = streetCoordinates[key];
        found = true;
        break;
      }
    }
  }

  // Fallback to municipality map if no direct street/locality match
  if (!found) {
    if (comune.includes("massa")) {
      [lat, lng] = [44.0356, 10.1411];
    } else if (comune.includes("pontremoli")) {
      [lat, lng] = [44.3789, 9.8824];
    } else if (comune.includes("aulla")) {
      [lat, lng] = [44.2125, 9.9701];
    } else if (comune.includes("fivizzano")) {
      [lat, lng] = [44.2384, 10.1257];
    } else if (comune.includes("villafranca")) {
      [lat, lng] = [44.2818, 9.9501];
    } else {
      [lat, lng] = [44.0793, 10.0971]; // Default Carrara center
    }
  }

  // Generate deterministic ring offset pattern so multiple interventions in the same locality don't overlap perfectly
  let hash = 0;
  const str = report.id || report.numeroVerbale || "id";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const radius = 0.0008 + (Math.abs(hash >> 3) % 100) / 120000; // ~50 to ~150m precise micro-spread
  const offsetLat = Math.sin(angle) * radius;
  const offsetLng = Math.cos(angle) * radius;

  return [lat + offsetLat, lng + offsetLng];
};

interface VerbaliHQTabProps {
  reports: Report[];
  envReports: EnvironmentalReport[];
  db: any;
  isAdmin: boolean;
  isResponsabile?: boolean;
  countNewReports: () => number;
  isReportNew: (report: Report) => boolean;
  markReportAsRead: (id: string | undefined) => void;
  getReportDateFormatted: (dateStr: string) => string;
  generateVerbalePDF: (report: Report) => void;
  removeReport: (id: string) => Promise<void>;
  handleShareReport: (report: EnvironmentalReport) => void;
  saveReportFromAI: (report: Partial<Report>, emailPayload?: any) => Promise<string | undefined>;
  defaultTab?: "operative" | "environmental" | "sanctions";
  guardEmail?: string;
  isAnimaliaAuthorized?: boolean;
  searchQuery?: string;
  searchDossierQuery?: string;
  initialViewMode?: "archive" | "map" | "cartella_unica";
  sanctionReports?: SanctionReport[];
  removeSanctionReport?: (id: string) => Promise<void>;
  currentGuard?: Guard | null;
  emergencyCalls?: any[];
  guards?: Guard[];
  onOpenOperatoGuardie?: () => void;
  onOpenVerbalistica?: () => void;
  onOpenArchivioTurni?: () => void;
}

export const VerbaliHQTab: React.FC<VerbaliHQTabProps> = ({
  reports,
  envReports,
  db,
  isAdmin,
  isResponsabile = false,
  countNewReports,
  isReportNew,
  markReportAsRead,
  getReportDateFormatted,
  generateVerbalePDF,
  removeReport,
  handleShareReport,
  saveReportFromAI,
  defaultTab,
  guardEmail = "",
  isAnimaliaAuthorized = false,
  searchQuery,
  searchDossierQuery,
  initialViewMode,
  sanctionReports = [],
  removeSanctionReport,
  currentGuard,
  emergencyCalls = [],
  guards = [],
  onOpenOperatoGuardie,
  onOpenVerbalistica,
  onOpenArchivioTurni,
}) => {
  const showSopralluoghi = !currentGuard || 
    currentGuard.role === 'admin' || 
    currentGuard.role === 'responsabile' || 
    (currentGuard.qualifications || []).map(q => q.toLowerCase()).includes("zoofila");

  const visibleSectors = currentGuard
    ? (currentGuard.role === 'admin' || currentGuard.role === 'responsabile')
      ? ["zoofila", "ittica", "venatoria"]
      : (currentGuard.qualifications || []).map(q => q.toLowerCase())
    : ["zoofila", "ittica", "venatoria"];

  // Shadow module-level helper with local smart resolution using closure
  const extractOnlyMatricole = (input: string | undefined | null): string => {
    return resolveVerbalizzantiToMatricole(input, guards);
  };

  const [reportsSearch, setReportsSearch] = useState("");
  const [reportsDateFilter, setReportsDateFilter] = useState("");
  const [sopralluogoFilter, setSopralluogoFilter] = useState<"all" | "1" | "2" | "pending">("all");
  const [activeTab, setActiveTab] = useState<"operative" | "environmental" | "sanctions">(
    defaultTab || (showSopralluoghi ? "operative" : "environmental")
  );
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [readingSanctionReport, setReadingSanctionReport] = useState<SanctionReport | null>(null);
  const [readingReport, setReadingReport] = useState<Report | null>(null);
  const [activeUploadLabel, setActiveUploadLabel] = useState<string>(
    "Documento Scannerizzato",
  );
  const [sectorTab, setSectorTab] = useState<
    "zoofila" | "ittica" | "venatoria"
  >(() => {
    if (visibleSectors.includes("zoofila")) return "zoofila";
    if (visibleSectors.includes("ittica")) return "ittica";
    if (visibleSectors.includes("venatoria")) return "venatoria";
    return "zoofila";
  });

  React.useEffect(() => {
    if (!visibleSectors.includes(sectorTab)) {
      if (visibleSectors.includes("zoofila")) setSectorTab("zoofila");
      else if (visibleSectors.includes("ittica")) setSectorTab("ittica");
      else if (visibleSectors.includes("venatoria")) setSectorTab("venatoria");
    }
  }, [visibleSectors, sectorTab]);

  const [viewMode, setViewMode] = useState<
    "archive" | "map" | "cartella_unica"
  >("archive");

  const getReportFollowUpInfo = (rep: Report, allReps: Report[]) => {
    const isSecond = rep.isFollowUp || rep.sopralluogoTipo === "2";
    if (isSecond) {
      const parent = rep.parentReportId ? allReps.find(r => r.id === rep.parentReportId) : null;
      return {
        isSecond: true,
        typeLabel: "2° Sopralluogo (Verifica)",
        parentReport: parent,
        parentNumber: parent?.numeroVerbale || "N.D.",
        parentDate: parent?.data || "N.D.",
        isDone: true
      };
    }
    // 1° sopralluogo
    const followUp = allReps.find(r => r.parentReportId === rep.id && (r.isFollowUp || r.sopralluogoTipo === "2"));
    const hasPrescriptions = Boolean(
      (rep.giorniRegolarizzazione && rep.giorniRegolarizzazione > 0) || 
      (rep.constatazioni && rep.constatazioni.toLowerCase().includes("prescriz"))
    );
    return {
      isSecond: false,
      typeLabel: "1° Sopralluogo (Iniziale)",
      followUpReport: followUp,
      isFollowUpDone: Boolean(followUp),
      hasPrescriptions,
      days: rep.giorniRegolarizzazione
    };
  };

  const [sanctionsSectorTab, setSanctionsSectorTab] = useState<
    "zoofila" | "ittica" | "venatoria"
  >(() => {
    if (visibleSectors.includes("zoofila")) return "zoofila";
    if (visibleSectors.includes("ittica")) return "ittica";
    if (visibleSectors.includes("venatoria")) return "venatoria";
    return "zoofila";
  });

  const isOlderThan60DaysLocal = (dateStr: any): boolean => {
    if (!dateStr || typeof dateStr !== "string") return false;
    let parsedDate: Date | null = null;
    const dmyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }
    if (!parsedDate) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        parsedDate = parsed;
      }
    }
    if (!parsedDate) return false;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - parsedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 60;
  };

  const getAttachmentBadge = (name: string, type: "document" | "photo") => {
    const norm = name.toLowerCase();
    if (
      norm.includes("anagrafe") ||
      norm.includes("canina") ||
      norm.includes("microchip")
    ) {
      return (
        <span className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          🐕 Anagrafe Canina
        </span>
      );
    }
    if (
      norm.includes("medico") ||
      norm.includes("veterinario") ||
      norm.includes("clinica") ||
      norm.includes("sanitario") ||
      norm.includes("salute") ||
      norm.includes("ospedale")
    ) {
      return (
        <span className="text-[8px] bg-red-500/15 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          🩺 Certificato Medico
        </span>
      );
    }
    if (
      norm.includes("catastale") ||
      norm.includes("catasto") ||
      norm.includes("mappa") ||
      norm.includes("mappe") ||
      norm.includes("planimetria")
    ) {
      return (
        <span className="text-[8px] bg-orange-500/15 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          🗺️ Mappa Catastale
        </span>
      );
    }
    if (
      norm.includes("pra") ||
      norm.includes("visura") ||
      norm.includes("targa") ||
      norm.includes("automobile")
    ) {
      return (
        <span className="text-[8px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          🚗 Visura PRA
        </span>
      );
    }
    if (
      norm.includes("indagine") ||
      norm.includes("indagini") ||
      norm.includes("atti") ||
      norm.includes("procura") ||
      norm.includes("osint")
    ) {
      return (
        <span className="text-[8px] bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          🔍 Atti d'Indagine
        </span>
      );
    }
    if (
      norm.includes("foto") ||
      norm.includes("sopralluogo") ||
      norm.includes("abuso") ||
      norm.includes("canile") ||
      type === "photo"
    ) {
      return (
        <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          📸 Foto Sopralluogo
        </span>
      );
    }
    return (
      <span className="text-[8px] bg-slate-500/15 border border-slate-500/30 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
        📁 Allegato Generico
      </span>
    );
  };

  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setReportsSearch(searchQuery);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    if (searchDossierQuery !== undefined) {
      setDossierSearch(searchDossierQuery);
    }
  }, [searchDossierQuery]);

  React.useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Restrict Cartella Unica Interventi strictly to Giuliano / Consuelo (isAdmin)
  React.useEffect(() => {
    if (viewMode === "cartella_unica" && !isAdmin) {
      setViewMode("archive");
    }
  }, [viewMode, isAdmin]);

  // State definitions for the unified "Cartella Unica Interventi" (Dossier) feature
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(
    null,
  );
  const [dossierSearch, setDossierSearch] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isPreloadingAttachments, setIsPreloadingAttachments] = useState(false);
  const [manualLinkTargetReportId, setManualLinkTargetReportId] =
    useState<string>("");
  const [uploadGeo, setUploadGeo] = useState<{
    lat?: number;
    lng?: number;
  } | null>(null);
  const [pendingUploadLabel, setPendingUploadLabel] = useState<string>("");

  // State for AI Expert Evaluation (Valutazione Virtuale AI)
  const [analyzingAttachmentId, setAnalyzingAttachmentId] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<{ [attachmentId: string]: string }>({});
  const [showNotesInputId, setShowNotesInputId] = useState<string | null>(null);
  const [expandedAiEvaluationId, setExpandedAiEvaluationId] = useState<string | null>(null);

  // Structured multi-key stable filters for Cartella Unica Interventi
  const [filterMicrochip, setFilterMicrochip] = useState("");
  const [filterLocalita, setFilterLocalita] = useState("");
  const [filterSpecie, setFilterSpecie] = useState("");
  const [filterNumeroVerbale, setFilterNumeroVerbale] = useState("");
  const [searchCriterion, setSearchCriterion] = useState<"microchip" | "localita" | "specie" | "verbale" | "generica">("microchip");

  // Visual document upload modal states
  const [uploadModalData, setUploadModalData] = useState<{
    isOpen: boolean;
    reportId: string;
    documentType: string;
  } | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  const [modalSuccessMessage, setModalSuccessMessage] = useState<string | null>(
    null,
  );
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(
    null,
  );

  // Real-time listener for the independent attachments collection
  const [dbAttachments, setDbAttachments] = useState<any[]>([]);
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "intervention_attachments"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setDbAttachments(list);
      },
      (error) => {
        console.error("Errore listener allegati indipendenti:", error);
      },
    );
    return unsubscribe;
  }, [db]);

  // High-volume document cache and state managers for chunked files
  const [chunksCache, setChunksCache] = useState<{
    [attachmentId: string]: { url: string; loading: boolean };
  }>({});

  // Floating attachment desk states
  const [activeWindows, setActiveWindows] = useState<
    Array<{
      id: string;
      attachmentId: string;
      name: string;
      url: string;
      type: "document" | "photo";
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
    }>
  >([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState<number>(100);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bringToFront = (id: string) => {
    setMaxZIndex((prev) => {
      const nextZ = prev + 1;
      setActiveWindows((wins) =>
        wins.map((w) => (w.id === id ? { ...w, zIndex: nextZ } : w)),
      );
      return nextZ;
    });
  };

  const loadChunkedAttachment = async (
    attachmentId: string,
  ): Promise<string> => {
    if (chunksCache[attachmentId]?.url) return chunksCache[attachmentId].url;

    setChunksCache((prev) => ({
      ...prev,
      [attachmentId]: { url: "", loading: true },
    }));

    try {
      const q = query(
        collection(db, "attachment_chunks"),
        where("attachmentId", "==", attachmentId),
        orderBy("chunkIndex", "asc"),
      );
      const querySnapshot = await getDocs(q);
      let fullBase64 = "";
      querySnapshot.forEach((doc) => {
        fullBase64 += doc.data().data || "";
      });

      if (!fullBase64) {
        throw new Error("Nessun frammento disponibile per questo documento.");
      }

      setChunksCache((prev) => ({
        ...prev,
        [attachmentId]: { url: fullBase64, loading: false },
      }));
      return fullBase64;
    } catch (err: any) {
      console.error("Errore nel caricamento del file spezzato:", err);
      setChunksCache((prev) => ({
        ...prev,
        [attachmentId]: { url: "", loading: false },
      }));
      alert(
        `Impossibile scaricare l'allegato: ${err.message || "errore di rete."}`,
      );
      return "";
    }
  };

  const handleOpenAttachment = async (att: any) => {
    let url = att.url;
    if (att.isChunked) {
      if (chunksCache[att.id]?.url) {
        url = chunksCache[att.id].url;
      } else {
        url = await loadChunkedAttachment(att.id);
      }
    }
    if (!url) {
      alert("Impossibile caricare l'allegato.");
      return;
    }

    // Convert base64 data URIs of any type (especially PDFs) to Blob URLs for seamless browser rendering and print support
    if (url.startsWith("data:")) {
      url = convertDataURIToBlobURL(url);
    }

    const windowId = `${att.id}-${Date.now()}`;
    const offsetCount = activeWindows.length * 30;
    const initialWidth = 550;
    const initialHeight = 450;

    // Cascading layout positions
    const initialX = Math.max(40, 120 + (offsetCount % 350));
    const initialY = Math.max(90, 140 + (offsetCount % 250));

    setActiveWindows((prev) => [
      ...prev,
      {
        id: windowId,
        attachmentId: att.id,
        name: att.name || "Allegato",
        url,
        type: att.type || "document",
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
        zIndex: maxZIndex + 1,
      },
    ]);
    setMaxZIndex((prev) => prev + 1);
  };

  const handleDownloadAttachment = async (att: any) => {
    let url = att.isChunked ? chunksCache[att.id]?.url : att.url;
    if (att.isChunked && !url) {
      url = await loadChunkedAttachment(att.id);
    }
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = att.name || "allegato";
    a.click();
  };

  // Multi-Email dispatch states
  const [emailDialogReport, setEmailDialogReport] = useState<Report | null>(
    null,
  );
  const [toSede, setToSede] = useState(true);
  const [sedeEmail, setSedeEmail] = useState("turniguardie493@gmail.com");
  const [toControllato, setToControllato] = useState(false);
  const [controllatoEmail, setControllatoEmail] = useState("");
  const [toGuard1, setToGuard1] = useState(false);
  const [guard1Email, setGuard1Email] = useState("");
  const [toGuard2, setToGuard2] = useState(false);
  const [guard2Email, setGuard2Email] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<EmailFeedbackState | null>(
    null,
  );

  // Map control states
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    44.0793, 10.0971,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [mapFocusArea, setMapFocusArea] = useState<
    "carrara" | "massa" | "lunigiana" | "all"
  >("carrara");
  const [showAllSectorsOnMap, setShowAllSectorsOnMap] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<"stradale" | "scura">("stradale");

  // Hook global map callback for standard Leaflet Popup onclick buttons
  useEffect(() => {
    (window as any).openReportFromMap = (reportId: string) => {
      const found = reports.find((r) => r.id === reportId);
      if (found) {
        setReadingReport(found);
      }
    };
    return () => {
      delete (window as any).openReportFromMap;
    };
  }, [reports]);

  useEffect(() => {
    if (selectedReport?.id) {
      markReportAsRead(selectedReport.id);
    }
  }, [selectedReport, markReportAsRead]);

  useEffect(() => {
    if (readingReport?.id) {
      markReportAsRead(readingReport.id);
    }
  }, [readingReport, markReportAsRead]);

  useEffect(() => {
    if (defaultTab) {
      if (defaultTab === "operative" && !showSopralluoghi) {
        setActiveTab("environmental");
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [defaultTab, showSopralluoghi]);

  // Dynamic Grouping Algorithm to form the "Cartella Unica Interventi" Dossier
  const getDossiers = () => {
    const folders: {
      [key: string]: { id: string; root: Report; followUps: Report[] };
    } = {};

    // Group 1: original verbali (root)
    reports.forEach((report) => {
      if ((report.tipoVerbale || "zoofila") !== sectorTab) return;
      if (!report.isFollowUp) {
        folders[report.id] = {
          id: report.id,
          root: report,
          followUps: [],
        };
      }
    });

    // Group 2: match 2° sopralluogo verbali (followUps) to original reports
    reports.forEach((report) => {
      if ((report.tipoVerbale || "zoofila") !== sectorTab) return;
      if (report.isFollowUp) {
        let parentId = report.parentReportId;
        let matchedFolderKey = "";

        if (parentId) {
          if (folders[parentId]) {
            matchedFolderKey = parentId;
          } else {
            // Treat parentId as numeroVerbale
            const matchByNum = Object.values(folders).find(
              (f) =>
                f.root.numeroVerbale &&
                String(parentId).toLowerCase().trim() === String(f.root.numeroVerbale).toLowerCase().trim(),
            );
            if (matchByNum) matchedFolderKey = matchByNum.root.id;
          }
        }

        // If not matched, try matching by microchip (dynamic auto-linking if any of the microchips overlap)
        if (!matchedFolderKey) {
          const matchByChip = Object.values(folders).find(
            (f) =>
              f.root.chips &&
              f.root.chips.some(
                (c1) =>
                  c1.numero &&
                  report.chips &&
                  report.chips.some((c2) => c1.numero === c2.numero),
              ),
          );
          if (matchByChip) matchedFolderKey = matchByChip.root.id;
        }

        // Match by locality + species (fallback auto-grouping)
        if (!matchedFolderKey) {
          const matchByLocAndSpecies = Object.values(folders).find(
            (f) =>
              f.root.localita &&
              report.localita &&
              f.root.localita.toLowerCase() === report.localita.toLowerCase() &&
              f.root.tipoAnimale &&
              report.tipoAnimale &&
              f.root.tipoAnimale.toLowerCase() ===
                report.tipoAnimale.toLowerCase(),
          );
          if (matchByLocAndSpecies) matchedFolderKey = matchByLocAndSpecies.root.id;
        }

        if (matchedFolderKey && folders[matchedFolderKey]) {
          folders[matchedFolderKey].followUps.push(report);
        } else {
          // Fallback: create standalone single-item dossier for orphan follow-up
          folders[report.id] = {
            id: report.id,
            root: report,
            followUps: [],
          };
        }
      }
    });

    return Object.values(folders);
  };

  const buildOnScreenChronologyForReport = (root: any, fUps: any[], allAttachments: any[]) => {
    const events: { timestamp: Date; label: string; icon: string; author?: string; type: string; details?: any }[] = [];

    const parseEventDate = (val: any): Date => {
      if (!val) return new Date();
      if (typeof val.toDate === "function") return val.toDate();
      if (val instanceof Date) return val;
      if (val.seconds) return new Date(val.seconds * 1000);
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
      return new Date();
    };

    const getRootCreationDate = (r: any): Date => {
      if (r.creatoAl) return parseEventDate(r.creatoAl);
      if (r.data && typeof r.data === "string") {
        const pts = r.data.split("/");
        if (pts.length === 3) {
          const year = parseInt(pts[2], 10);
          const month = parseInt(pts[1], 10) - 1;
          const day = parseInt(pts[0], 10);
          let hour = 12, min = 0;
          if (r.oraInizio && typeof r.oraInizio === "string") {
            const tPts = r.oraInizio.split(":");
            if (tPts.length >= 2) {
              hour = parseInt(tPts[0], 10);
              min = parseInt(tPts[1], 10);
            }
          }
          return new Date(year, month, day, hour, min);
        }
      }
      return new Date();
    };

    // 1. Root Report Creation
    const rDate = getRootCreationDate(root);
    events.push({
      timestamp: rDate,
      label: `Apertura Fascicolo (1° Sopralluogo - Verbale Iniziale N° ${root.numeroVerbale || 'N.D.'})`,
      icon: "📋",
      author: root.creatoDaNome || root.verbalizzanti || "Sede HQ",
      type: "root",
      details: root,
    });

    // 2. Attachments
    allAttachments.forEach((a) => {
      let date = a.uploadedAt ? new Date(a.uploadedAt) : new Date();
      events.push({
        timestamp: date,
        label: `Inserimento Allegato: "${a.name}" (${a.type === 'photo' ? 'Foto sul Campo' : 'Certificato/Documento'})`,
        icon: "📎",
        author: a.uploadedBy || "Sede HQ",
        type: "attachment",
        details: a,
      });
    });

    // 3. Follow-Ups
    fUps.forEach((f: any, fIdx: number) => {
      let fDate = f.creatoAl ? parseEventDate(f.creatoAl) : null;
      if (!fDate && f.data) {
        const pts = f.data.split("/");
        if (pts.length === 3) {
          const year = parseInt(pts[2], 10);
          const month = parseInt(pts[1], 10) - 1;
          const day = parseInt(pts[0], 10);
          let hour = 12, min = 0;
          if (f.oraInizio) {
            const tPts = f.oraInizio.split(":");
            if (tPts.length >= 2) {
              hour = parseInt(tPts[0], 10);
              min = parseInt(tPts[1], 10);
            }
          }
          fDate = new Date(year, month, day, hour, min);
        }
      }
      if (!fDate) fDate = new Date();

      events.push({
        timestamp: fDate,
        label: `Inserimento 2° Sopralluogo (Verifica N° ${f.numeroVerbale || fIdx + 1}) - Esito: ${f.esito === 'consenso' ? 'REGOLARIZZATO ✓' : 'INADEMPIENTE ✗'}`,
        icon: "⏱",
        author: f.creatoDaNome || f.verbalizzanti || "Sede HQ",
        type: "followup",
        details: f,
      });
    });

    // 4. Closing
    if (root.dossierStato === 'chiuso') {
      const closeDate = root.dossierChiusoAl ? new Date(root.dossierChiusoAl) : new Date();
      events.push({
        timestamp: closeDate,
        label: "Chiusura e Archiviazione definitiva del Fascicolo",
        icon: "🔒",
        author: root.dossierChiusoDa || "Amministratore",
        type: "closing",
      });
    }

    // Sort chronologically
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return events;
  };

  const handlePrintChronologyOnly = (dossier: any, chronology: any[]) => {
    const root = dossier.root;

    const htmlContent = `
      <html>
        <head>
          <title>Registro Cronologico Fascicolo N. ${root.numeroVerbale || root.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 20px; color: black; background: white; line-height: 1.4; }
            h1 { font-size: 15pt; font-weight: bold; border-bottom: 2px solid black; padding-bottom: 5px; text-transform: uppercase; margin-top: 0; }
            h2 { font-size: 11pt; text-transform: uppercase; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 9pt; }
            th { background-color: #f8fafc; font-weight: bold; }
            .meta-val { font-weight: bold; }
          </style>
        </head>
        <body>
          ${getOfficialPrintHeaderHtml("REGISTRO CRONOLOGICO TEMPISTICHE & DEPOSITI (PG AUDIT TRAIL)", `DOSSIER INTERVENTO N° ${root.numeroVerbale || "HQ-" + root.id.substring(0, 8)}`)}

          <h2>Metadati di Riferimento</h2>
          <table>
            <tr><th style="width: 30%;">Specie Animale / Razza</th><td class="meta-val">${root.tipoAnimale || "Non Specificato"}</td></tr>
            <tr><th>Anagrafica Microchip Rilevati</th><td class="meta-val">
              ${
                (root.chips &&
                  root.chips
                    .map((c: any) => c.numero)
                    .filter(Boolean)
                    .join(", ")) ||
                "Nessun Microchip"
              }
            </td></tr>
            <tr><th>Località / Luogo Intervento</th><td class="meta-val">${root.localita || "N.D."} Comune: ${root.comune || "N.D."} (${root.provincia || "MS"})</td></tr>
            <tr><th>Qualifica e Consenso</th><td class="meta-val">${(root.proprietarioPossessore || "proprietario").toUpperCase()} | ${root.esito === 'consenso' ? 'CONSENSO PRESTATO ✓' : root.esito === 'rifiuto' ? 'NEGATO / DINIEGO ✗' : 'N.D.'}</td></tr>
            <tr><th>Soggetto Presente</th><td class="meta-val">${root.soggettoNome || "Generico / Sconosciuto"}</td></tr>
          </table>

          <h2>Timeline di P.G. & Cronologia Tempistiche Depositi</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Data e Ora con Secondi</th>
                <th style="width: 55%;">Descrizione Attività / Deposito Documentale</th>
                <th style="width: 20%;">Operatore / Depositante</th>
              </tr>
            </thead>
            <tbody>
              ${chronology.map(e => `
                <tr>
                  <td style="font-family: monospace; font-size: 8.5pt;">${format(e.timestamp, "dd/MM/yyyy HH:mm:ss")}</td>
                  <td style="font-size: 8.5pt; font-weight: bold;">${e.icon} ${e.label}</td>
                  <td style="font-size: 8.5pt; font-family: monospace;">${e.author || "Sistema HQ"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 8pt; font-style: italic; color: #475569;">
            <div>Estrazione Registro: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</div>
            <div style="border-top: 1px solid black; width: 180px; text-align: center; padding-top: 5px;">Firma del Responsabile HQ</div>
          </div>
        </body>
      </html>
    `;

    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    document.body.classList.add("is-printing-active");
    portal.innerHTML = `
      <div class="print-preview-header no-print flex justify-between items-center bg-slate-900 p-4 rounded-xl mb-6 shadow-xl" style="font-family: ui-sans-serif, system-ui, sans-serif; background-color: #0d121f !important; color: white !important; margin-bottom: 24px; border-radius: 12px; padding: 16px; width: 100%; max-width: 800px; margin-left: auto; margin-right: auto; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;">
        <div style="text-align: left;">
          <span style="font-size: 12px; font-weight: bold; color: #c084fc;">STAMPA REGISTRO CRONOLOGICO</span>
          <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">Stampa ufficiale di P.G. focalizzata solo sulla timeline dei depositi e tempistiche.</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="print-chron-only-btn" style="padding: 8px 16px; background-color: #c084fc; color: #0f172a; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer;">STAMPA ORA 🖨</button>
          <button id="close-chron-only-btn" style="padding: 8px 16px; background-color: #e11d48; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer;">CHIUDI ✕</button>
        </div>
      </div>
      ${htmlContent}
    `;

    const pBtn = portal.querySelector("#print-chron-only-btn");
    if (pBtn) {
      pBtn.addEventListener("click", () => {
        window.focus();
        window.print();
      });
    }

    const cBtn = portal.querySelector("#close-chron-only-btn");
    if (cBtn) {
      cBtn.addEventListener("click", () => {
        document.body.classList.remove("is-printing-active");
        portal!.innerHTML = "";
      });
    }
  };

  // Automated/Continuous Print layout for PG and Sede (A4 Format conforming to protocol)
  const handlePrintDossier = async (dossier: any) => {
    setIsPreloadingAttachments(true);
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const root = dossier.root;
    const fUps = dossier.followUps || [];
    const originalTitle = document.title;
    document.title = `Cartella_Unica_Intervento_N_${root.numeroVerbale || root.id}`;

    // Aggregate all attachments from root report and all linked followUps!
    const rootDbAttachments = dbAttachments
      .filter((a) => a.reportId === root.id)
      .map((a) => ({
        ...a,
        originReportId: root.id,
        originReportName: "1° Sopralluogo",
      }));
    const followUpsDbAttachments = fUps.flatMap(
      (f: any, fIdx: number) =>
        dbAttachments
          .filter((a) => a.reportId === f.id)
          .map((a) => ({
            ...a,
            originReportId: f.id,
            originReportName: `2° Sopralluogo #${fIdx + 1}`,
          })),
    );

    const allAttachments = [
      ...(root.attachments || []).map((a: any, idx: number) => ({
        ...a,
        id: a.id || `legacy-root-${idx}-${a.name || 'file'}`,
        originReportId: root.id,
        originReportName: "1° Sopralluogo",
      })),
      ...rootDbAttachments,
      ...fUps.flatMap((f: any, fIdx: number) =>
        (f.attachments || []).map((a: any, idx: number) => ({
          ...a,
          id: a.id || `legacy-fup-${fIdx}-${idx}-${a.name || 'file'}`,
          originReportId: f.id,
          originReportName: `2° Sopralluogo #${fIdx + 1}`,
        })),
      ),
      ...followUpsDbAttachments,
    ];

    // Preload chunked files to guarantee full rendering in high-res A4 continuous print format
    const resolvedUrls: { [id: string]: string } = {};
    for (const a of allAttachments) {
      if (a.isChunked) {
        if (chunksCache[a.id]?.url) {
          resolvedUrls[a.id] = chunksCache[a.id].url;
        } else {
          try {
            const url = await loadChunkedAttachment(a.id);
            if (url) {
              resolvedUrls[a.id] = url;
            }
          } catch (err) {
            console.error("Errore nel precaricamento dell'allegato per la stampa:", err);
          }
        }
      } else {
        resolvedUrls[a.id] = a.url;
      }
    }

    setIsPreloadingAttachments(false);

    // Build the Chronology (Audit Trail)
    const parseEventDate = (val: any): Date => {
      if (!val) return new Date();
      if (typeof val.toDate === "function") return val.toDate();
      if (val instanceof Date) return val;
      if (val.seconds) return new Date(val.seconds * 1000);
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
      return new Date();
    };

    const getRootCreationDate = (r: any): Date => {
      if (r.creatoAl) return parseEventDate(r.creatoAl);
      if (r.data) {
        const pts = r.data.split("/");
        if (pts.length === 3) {
          const year = parseInt(pts[2], 10);
          const month = parseInt(pts[1], 10) - 1;
          const day = parseInt(pts[0], 10);
          let hour = 12, min = 0;
          if (r.oraInizio) {
            const tPts = r.oraInizio.split(":");
            if (tPts.length >= 2) {
              hour = parseInt(tPts[0], 10);
              min = parseInt(tPts[1], 10);
            }
          }
          return new Date(year, month, day, hour, min);
        }
      }
      return new Date();
    };

    // Check for linked initial emergency call (Richiesta d'Intervento)
    const findLinkedEmergencyCall = (r: any) => {
      if (!emergencyCalls || emergencyCalls.length === 0 || !r) return null;
      const rootLoc = (r.localita || "").toLowerCase().trim();
      const rootNumero = (r.numeroVerbale || "").toLowerCase().trim();

      return emergencyCalls.find((call) => {
        if (call.linkedReportId && call.linkedReportId === r.id) return true;
        if (call.protocolCode && rootNumero && call.protocolCode.toLowerCase().includes(rootNumero)) return true;
        const callLoc = (call.localita || "").toLowerCase().trim();
        if (rootLoc && callLoc && (rootLoc.includes(callLoc) || callLoc.includes(rootLoc))) {
          return true;
        }
        const rAny = r as any;
        if (call.lat && call.lng && rAny.lat && rAny.lng) {
          const latDiff = Math.abs(call.lat - rAny.lat);
          const lngDiff = Math.abs(call.lng - rAny.lng);
          if (latDiff < 0.002 && lngDiff < 0.002) {
            return true;
          }
        }
        return false;
      });
    };

    const linkedEmergencyCall = findLinkedEmergencyCall(root);

    const buildDossierChronology = () => {
      const events: { timestamp: Date; label: string; icon: string; author?: string }[] = [];

      // 0. Linked Emergency Call (if present)
      if (linkedEmergencyCall) {
        const cDate = linkedEmergencyCall.createdAt ? parseEventDate(linkedEmergencyCall.createdAt) : getRootCreationDate(root);
        events.push({
          timestamp: cDate,
          label: `Apertura Segnalazione / Richiesta d'Intervento Prot. ${linkedEmergencyCall.protocolCode || 'RI-N.D.'} (Richiedente: ${linkedEmergencyCall.callerName || 'N.D.'})`,
          icon: "📞",
          author: linkedEmergencyCall.assignedGuardName || "Centrale Operativa",
        });
      }

      // 1. Root Report Creation
      const rDate = getRootCreationDate(root);
      events.push({
        timestamp: rDate,
        label: `Apertura Fascicolo (1° Sopralluogo - Verbale Iniziale N° ${root.numeroVerbale || 'N.D.'})`,
        icon: "📋",
        author: root.creatoDaNome || root.verbalizzanti || "Sede HQ",
      });

      // 2. Attachments
      allAttachments.forEach((a) => {
        let date = a.uploadedAt ? new Date(a.uploadedAt) : new Date();
        events.push({
          timestamp: date,
          label: `Inserimento Allegato: "${a.name}" (${a.type === 'photo' ? 'Foto sul Campo' : 'Certificato/Documento'})`,
          icon: "📎",
          author: a.uploadedBy || "Sede HQ",
        });
      });

      // 3. Follow-Ups
      fUps.forEach((f: any, fIdx: number) => {
        let fDate = f.creatoAl ? parseEventDate(f.creatoAl) : null;
        if (!fDate && f.data && typeof f.data === "string") {
          const pts = f.data.split("/");
          if (pts.length === 3) {
            const year = parseInt(pts[2], 10);
            const month = parseInt(pts[1], 10) - 1;
            const day = parseInt(pts[0], 10);
            let hour = 12, min = 0;
            if (f.oraInizio && typeof f.oraInizio === "string") {
              const tPts = f.oraInizio.split(":");
              if (tPts.length >= 2) {
                hour = parseInt(tPts[0], 10);
                min = parseInt(tPts[1], 10);
              }
            }
            fDate = new Date(year, month, day, hour, min);
          }
        }
        if (!fDate) fDate = new Date();

        events.push({
          timestamp: fDate,
          label: `Inserimento 2° Sopralluogo (Verifica N° ${f.numeroVerbale || fIdx + 1}) - Esito: ${f.esito === 'consenso' ? 'REGOLARIZZATO ✓' : 'INADEMPIENTE ✗'}`,
          icon: "⏱",
          author: f.creatoDaNome || f.verbalizzanti || "Sede HQ",
        });
      });

      // 4. Closing
      if (root.dossierStato === 'chiuso') {
        const closeDate = root.dossierChiusoAl ? new Date(root.dossierChiusoAl) : new Date();
        events.push({
          timestamp: closeDate,
          label: "Chiusura e Archiviazione definitiva del Fascicolo",
          icon: "🔒",
          author: root.dossierChiusoDa || "Amministratore",
        });
      }

      // Sort chronologically
      events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return events;
    };

    const chronology = buildDossierChronology();

    let pageCount = 1;
    const getPageClass = () => {
      const cls = pageCount % 2 !== 0 ? "print-page print-page-odd" : "print-page print-page-even";
      pageCount++;
      return cls;
    };

    const htmlContent = `
      <html>
        <head>
          <title>Cartella Unica Intervento N. ${root.numeroVerbale || root.id}</title>
          <style>
            /* Ottimizzazione spessore per massima leggibilità e risparmio d'inchiostro */
            body, p, span, div, h1, h2, h3, code, table, tr, li {
              text-shadow: none !important;
            }
            b, strong, th, h1, h2 {
              font-weight: bold !important;
            }
            body.print-odd-only .print-page-even {
              display: none !important;
            }
            body.print-even-only .print-page-odd {
              display: none !important;
            }
            @media print {
              .no-print-break { page-break-inside: avoid; }
              .meta-table { page-break-inside: avoid; }
              .attachment-card { page-break-inside: avoid; }
              @page { size: A4; margin: 6mm 10mm 6mm 10mm; }
              body, p, span, div, h1, h2, h3, code, table, tr, li {
                text-shadow: none !important;
              }
              b, strong, th, h1, h2 {
                font-weight: bold !important;
              }
              body.print-odd-only .print-page-even {
                display: none !important;
              }
              body.print-even-only .print-page-odd {
                display: none !important;
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              color: #111; 
              margin: 6mm 10mm;
              line-height: 1.3;
              font-size: 9pt;
            }
            .header-info {
              text-align: center; 
              border-bottom: 1.5pt solid black; 
              padding-bottom: 2mm; 
              margin-bottom: 4mm;
            }
            h1 { 
              font-size: 14pt; 
              margin-top: 3px; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
            }
            h2 { 
              font-size: 10pt; 
              border-bottom: 1.5pt solid #333; 
              padding-bottom: 2px; 
              margin-top: 10px; 
              text-transform: uppercase;
            }
            h3 { 
              font-size: 8.5pt; 
              color: #444; 
              margin: 1px 0;
              text-transform: uppercase;
            }
            .meta-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 6px 0; 
            }
            .meta-table th, .meta-table td { 
              border: 1px solid #ccc; 
              padding: 4px 6px; 
              text-align: left; 
              font-size: 8.5pt;
            }
            .meta-table th { 
              background-color: #f7f7f7; 
              width: 32%; 
            }
            .text-block { 
              background: #fafafa; 
              border: 1px solid #ccc; 
              padding: 6px 10px; 
              font-style: italic; 
              font-size: 8.5pt;
              margin: 4px 0;
              white-space: pre-wrap;
            }
            .footer-sig { 
              display: flex; 
              justify-content: center; 
              margin-top: 0.8cm; 
              font-size: 8.5pt;
            }
            .sig-box { 
              border-top: 1px dashed #333; 
              width: 10cm; 
              text-align: center; 
              padding-top: 4px; 
            }
            .attachment-card {
              border: 1px solid #ccc;
              border-radius: 6px;
              padding: 10px;
              margin: 10px 0;
              font-size: 8.5pt;
            }
          </style>
        </head>
        <body>
          <!-- PAGE 1: Frontespizio e Registro Cronologico -->
          <div class="${getPageClass()}">
            <!-- 1. Testo Ministeriale - All'estremità superiore, centrato, font 7pt -->
            <div style="text-align: center; font-size: 7pt; margin-bottom: 3mm; line-height: 1.1; font-family: 'Times New Roman', Times, serif; color: black;">
              Associazione protezionistica riconosciuta con decreto del ministro dell’ambiente n. 862/scoc/92<br />
              Sede Nazionale - Via Salaria 298/A - Tel. 06/844094210-216 fax 06844094217 - 00199 Roma
            </div>

            <!-- 2. Blocco Logo + Intestazione Guardie -->
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; font-family: 'Times New Roman', Times, serif; color: black; margin-bottom: 4mm; border-bottom: 1.5pt solid black; padding-bottom: 3mm;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 4mm; margin-bottom: 1.5mm;">
                <div style="width: 25mm; height: 25mm; flex-shrink: 0;">
                  <img src="${window.location.origin}/logo_operativo.jpg" style="width: 100%; height: 100%; object-fit: contain;" alt="Logo Operativo Ekoclub" />
                </div>
                <h1 style="font-size: 15pt; font-weight: 900; text-transform: uppercase; margin: 0; line-height: 1; text-shadow: 0.3px 0 black, -0.3px 0 black, 0 0.3px black, 0 -0.3px black; color: black;">
                  Guardie Ekoclub
                </h1>
              </div>

              <div style="text-align: center; width: 100%;">
                <p style="font-size: 8.5pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.1; color: black;">
                  Guardie Giurate Zoofile-Venetorie-Ittiche-Ambientali
                </p>
                <p style="font-size: 8.5pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.1; margin-top: 0.3mm; color: black;">
                  Servizio di polizia giudiziaria zoofila
                </p>
                <p style="font-size: 9pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.1; margin-top: 0.3mm; color: black;">
                  Nucleo Massa-Carrara "Attilio Bertolucci"
                </p>
                <div style="margin-top: 0.5mm;">
                  <p style="font-size: 7.5pt; margin: 0; line-height: 1; color: black;">
                    ekoclub.massacarrara@gmail.com - cell. 3293738118
                  </p>
                </div>
                <p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 6px 0 0 0; text-align: center; color: black; font-family: sans-serif; text-decoration: underline; letter-spacing: 0.5px;">
                  DOSSIER INTERVENTO N° ${root.numeroVerbale || "_____________"}
                </p>
                <p style="font-size: 8pt; color: #555; margin: 3px 0 0 0; text-align: center; font-style: italic;">
                  Fascicolo Conforme di P.G. • Massa-Carrara
                </p>
              </div>
            </div>
            
            <table class="meta-table">
              <tr><th>Stato Fascicolo</th><td><b>${root.dossierStato === 'chiuso' ? '🔒 CHIUSO E ARCHIVIATO DEFINITIVAMENTE' : '🔓 APERTO (CONTROLLO DOPPIO - CENTRALIZZATO)'}</b></td></tr>
              <tr><th>Numero Verbale Iniziale</th><td><b>N° ${root.numeroVerbale || "Dossier " + root.id}</b></td></tr>
              <tr><th>Specie Animale / Razza</th><td>${root.tipoAnimale || "Non Specificato"}</td></tr>
              <tr><th>Anagrafica Microchip Rilevati</th><td>
                ${
                  (root.chips &&
                    root.chips
                      .map((c: any) => c.numero)
                      .filter(Boolean)
                      .map((n) => `<code>${n}</code>`)
                      .join(", ")) ||
                  "Nessun Microchip"
                }
              </td></tr>
              <tr><th>Località / Luogo Intervento</th><td>${root.localita || "N.D."} Comune: ${root.comune || "N.D."} (${root.provincia || ""})</td></tr>
              <tr><th>Qualifica e Consenso</th><td><b>Qualifica:</b> ${(root.proprietarioPossessore || "proprietario").toUpperCase()} | <b>Consenso al controllo:</b> ${root.esito === 'consenso' ? 'CONSENSO PRESTATO ✓' : root.esito === 'rifiuto' ? 'NEGATO / DINIEGO ✗' : 'N.D.'}</td></tr>
              <tr><th>Presente al Sopralluogo</th><td>${root.soggettoNome || "Generico / Sconosciuto"} (Residente in: ${root.soggettoResidenteA || "N.D."} ${root.soggettoIndirizzo || ""})</td></tr>
            </table>

            <!-- Sezione Eventuale Richiesta d'Intervento (Atto Iniziale) -->
            ${linkedEmergencyCall ? `
              <div class="no-print-break" style="margin-top: 10px; border-top: 1.2pt dashed #444; padding-top: 6px; background-color: #fafafa; padding: 6px 8px; border-radius: 4px;">
                <h2 style="margin-top: 2px; font-size: 8.5pt; border-bottom: 1px solid #666; padding-bottom: 2px;">
                  Atto Iniziale: Richiesta d'Intervento (Protocollo N° ${linkedEmergencyCall.protocolCode || 'RI-N.D.'})
                </h2>
                <table class="meta-table" style="margin-top: 4px;">
                  <tr>
                    <th style="width: 25%;">Data Ricezione</th>
                    <td>${linkedEmergencyCall.createdAt ? new Date(linkedEmergencyCall.createdAt).toLocaleString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N.D."}</td>
                    <th style="width: 25%;">Priorità / Settore</th>
                    <td>${(linkedEmergencyCall.priority || "Media").toUpperCase()} / ${(linkedEmergencyCall.sector || "Zoofila").toUpperCase()}</td>
                  </tr>
                  <tr>
                    <th>Richiedente</th>
                    <td><b>${(linkedEmergencyCall.callerName || "N.D.").toUpperCase()}</b> (Tel: ${linkedEmergencyCall.callerPhone || "N.D."})</td>
                    <th>Pattuglia Incaricata</th>
                    <td>${linkedEmergencyCall.assignedGuardName?.toUpperCase() || (linkedEmergencyCall.status === "in_attesa" ? "DA ASSEGNARE / IN ATTESA" : "CENTRALE OPERATIVA")}</td>
                  </tr>
                  <tr>
                    <th>Motivazione / Fatto</th>
                    <td colspan="3" style="font-style: italic;">${linkedEmergencyCall.description || "Nessun dettaglio aggiuntivo fornito."}</td>
                  </tr>
                </table>
              </div>
            ` : ''}

            <!-- Sezione 1° Sopralluogo nello stesso foglio -->
            <div class="no-print-break" style="margin-top: 15px; border-top: 1.5pt solid black; padding-top: 10px;">
              <h2 style="margin-top: 5px;">1° Sopralluogo (Verbale di Constatazione e Prescrizione)</h2>
              <table class="meta-table">
                <tr><th>Protocollo accertamento</th><td>N° ${root.numeroVerbale || "N.D."}</td></tr>
                <tr><th>Data e Orari</th><td>${root.data || "N.D."} dalle ${root.oraInizio || "--"} alle ${root.oraFine || "--"}</td></tr>
                <tr><th>Verbalizzanti (Solo Matricole)</th><td><b>MATR. ${extractOnlyMatricole(root.verbalizzanti)}</b></td></tr>
                <tr><th>Prescrizione / Termine Adeguamento</th><td>
                  ${root.giorniRegolarizzazione ? `Adeguamento entro e non oltre <b>${root.giorniRegolarizzazione} Giorni</b>` : "Nessuna prescrizione temporale rilevata"}
                </td></tr>
                <tr><th>Esito Verbale (Constatazioni Rilevate)</th><td><b>${root.constatazioni || "Nessuna costatazione particolare."}</b></td></tr>
              </table>

              <div class="footer-sig" style="margin-top: 0.8cm; margin-bottom: 0.3cm;">
                <div class="sig-box">I Verbalizzanti del 1° Sopralluogo (Matr. ${extractOnlyMatricole(root.verbalizzanti)})</div>
              </div>
            </div>

            <!-- Sezione Controlli Successivi nello stesso foglio con layout compatto -->
            ${fUps.length > 0 ? fUps.map((f: any, idx: number) => `
              <div class="no-print-break" style="margin-top: 15px; border-top: 1px dashed #777; padding-top: 10px;">
                <h2 style="margin-top: 5px;">2° Sopralluogo (Controllo di Verifica N° ${idx + 1})</h2>
                <table class="meta-table">
                  <tr><th>Riferimento Verbale 1° Accertamento</th><td>N° ${root.numeroVerbale || "N.D."}</td></tr>
                  <tr><th>Verbale di Controllo N°</th><td><b>N° ${f.numeroVerbale || "N.D."}</b></td></tr>
                  <tr><th>Data e Orari di Verifica</th><td>${f.data || "N.D."} dalle ${f.oraInizio || "--"} alle ${f.oraFine || "--"} (Successivo al termine prescritto)</td></tr>
                  <tr><th>Verbalizzanti (Solo Matricole)</th><td><b>MATR. ${extractOnlyMatricole(f.verbalizzanti)}</b></td></tr>
                  <tr><th>Presente al Sopralluogo</th><td>${f.soggettoNome || root.soggettoNome || "Generico / Sconosciuto"} (Residente in: ${f.soggettoResidenteA || root.soggettoResidenteA || "N.D."} ${f.soggettoIndirizzo || root.soggettoIndirizzo || ""})</td></tr>
                  <tr><th>Verifica Adempimenti / Stato Corrente</th><td>
                    <b>${f.esito === "consenso" ? "REGOLARIZZATO / POSITIVO ✓" : "INADEMPIENTE / NEGATIVO ❌"}</b>
                  </td></tr>
                </table>
                
                <div class="text-block" style="margin-top: 4px; padding: 4px 8px;"><b>Constatazioni e annotazioni rilevate sul posto d'ispezione:</b><br/>${f.constatazioni || "Non compilato."}</div>

                <div class="footer-sig" style="margin-top: 0.8cm; margin-bottom: 0.3cm;">
                  <div class="sig-box">I Verbalizzanti del 2° Sopralluogo (Matr. ${extractOnlyMatricole(f.verbalizzanti)})</div>
                </div>
              </div>
            `).join("") : ""}
          </div>

          <!-- PAGES 2+: Fascicolo Documentale ed Allegati -->
          ${
            allAttachments.length > 0
              ? `
            <div style="page-break-before: always; margin-bottom: 6mm;" class="no-print-break">
              <hr style="border: none; border-top: 1px dashed #777; margin: 8mm 0 4mm 0;" />
              <h2>Fascicolo Documentale e Prove Allegati</h2>
              <p style="font-size: 8.5pt; color: #555; margin-bottom: 12px;">Archivio documentale unificato. Documenti forniti dall'Amministrazione HQ o foto georeferenziate scattate in tempo reale sul campo d'azione.</p>
              
              <!-- Tabella Riepilogativa degli Allegati -->
              <table class="meta-table" style="margin-top: 12px; margin-bottom: 20px; width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="width: 5%; font-weight: bold; font-size: 8pt; text-align: center; border: 1px solid #ccc; padding: 4px;">N.</th>
                    <th style="width: 45%; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #ccc; padding: 4px;">Denominazione Documento / Tipologia</th>
                    <th style="width: 20%; font-weight: bold; font-size: 8pt; text-align: center; border: 1px solid #ccc; padding: 4px;">Ricevuto il (Data/Ora)</th>
                    <th style="width: 15%; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #ccc; padding: 4px;">Operatore / Fonte</th>
                    <th style="width: 15%; font-weight: bold; font-size: 8pt; text-align: center; border: 1px solid #ccc; padding: 4px;">Geotag GPS</th>
                  </tr>
                </thead>
                <tbody>
                  ${allAttachments.map((a: any, idx: number) => {
                    const isPdf = a.name?.toLowerCase().endsWith(".pdf");
                    const typeLabel = isPdf ? "📄 PDF" : "📷 FOTO";
                    const gpsLabel = a.latitude && a.longitude 
                      ? `${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}` 
                      : "Assente";
                    const formattedDate = a.uploadedAt ? format(new Date(a.uploadedAt), "dd/MM/yyyy HH:mm") : "N.D.";
                    
                    return `
                      <tr>
                        <td style="text-align: center; font-size: 8pt; border: 1px solid #ccc; padding: 4px;">${idx + 1}</td>
                        <td style="font-size: 8pt; border: 1px solid #ccc; padding: 4px;">
                          <strong>[${typeLabel}]</strong> ${a.name || "Senza nome"}<br/>
                          ${a.originReportName ? `<span style="font-size: 7.5pt; color: #555;">Origine: ${a.originReportName}</span>` : ""}
                        </td>
                        <td style="font-size: 8pt; text-align: center; border: 1px solid #ccc; padding: 4px;">${formattedDate}</td>
                        <td style="font-size: 8pt; border: 1px solid #ccc; padding: 4px;">${a.uploadedBy || "Sede HQ"}</td>
                        <td style="font-size: 8pt; text-align: center; font-family: monospace; border: 1px solid #ccc; padding: 4px;">${gpsLabel}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
            ${allAttachments
              .map(
                (a: any) => {
                  const docUrl = resolvedUrls[a.id];
                  const isPdf = a.name?.toLowerCase().endsWith(".pdf") || (docUrl && docUrl.startsWith("data:application/pdf"));
                  // Clean URL representation for safe browser printing
                  const printableUrl = docUrl && docUrl.startsWith("data:") ? convertDataURIToBlobURL(docUrl) : docUrl;
                  
                  const isDocType = a.type === 'document';
                  const pageBreakStyle = isDocType 
                    ? 'page-break-before: always; page-break-after: always; min-height: 27cm; box-sizing: border-box;' 
                    : 'page-break-inside: avoid; margin-top: 10px;';
                  const maxImgHeight = isDocType ? '24cm' : '12cm';
                  const containerPadding = isDocType ? '24px' : '12px';
                  const pageClass = getPageClass();

                  return `
                    <div class="${pageClass} attachment-card" style="${pageBreakStyle} border: 1px solid #ccc; padding: ${containerPadding}; margin-bottom: 16px; border-radius: 6px; background-color: #fff;">
                      <b>Nome / Tipologia Documento:</b> ${a.name || "Certificazione d'Ufficio"}<br/>
                      <b>Archiviato in data:</b> ${a.uploadedAt ? format(new Date(a.uploadedAt), "dd/MM/yyyy HH:mm") : "N.D."}<br/>
                      <b>Autorità / Operatore Caricatore:</b> ${a.uploadedBy || "N.D."}<br/>
                      ${a.originReportName ? `<b>Ambito di Acquisizione:</b> ${a.originReportName}<br/>` : ""}
                      ${a.latitude && a.longitude ? `<b>Geotag GPS Acquisito:</b> Latitud.: ${a.latitude.toFixed(6)}°, Longitud.: ${a.longitude.toFixed(6)}° (Validato PG)<br/>` : ""}
                      ${
                        printableUrl
                          ? isPdf
                            ? `
                            <div style="margin-top: 15px; padding: 15px; border: 1.5px dashed #475569; background-color: #f8fafc; text-align: center; font-family: monospace, sans-serif; page-break-inside: avoid; border-radius: 6px;">
                              <p style="font-size: 11pt; font-weight: bold; margin: 0 0 6px 0; color: #0f172a;">📄 ALLEGATO PDF DEPOSITATO TELEMATICAMENTE</p>
                              <p style="font-size: 9pt; margin: 0; color: #475569;">L'allegato PDF integrale è registrato nel Database HQ. Per motivi di impaginazione e risparmio di stampa, è consultabile / scaricabile ad alta risoluzione tramite il visualizzatore interattivo dell'App.</p>
                            </div>
                            `
                            : `
                            <div style="margin-top: 12px; text-align: center; page-break-inside: avoid;">
                              <img src="${printableUrl}" style="max-height: ${maxImgHeight}; max-width: 100%; width: auto; border: 1px solid #ccc; border-radius: 4px; object-fit: contain; display: block; margin: 0 auto;" />
                            </div>
                            `
                          : ""
                      }
                      ${
                        a.aiForensics
                          ? `
                          <div style="margin-top: 20px; border: 1px solid #c084fc; border-radius: 6px; background-color: #faf5ff; padding: 15px; page-break-inside: avoid;">
                            <div style="font-size: 11pt; font-weight: bold; color: #6b21a8; margin-bottom: 10px; border-bottom: 2px solid #e9d5ff; padding-bottom: 4px; text-transform: uppercase; font-family: sans-serif;">
                              🔬 VALUTAZIONE FORENSE VIRTUALE AI (POOL ESPERTI)
                            </div>
                            
                            <p style="font-size: 9.5pt; font-style: italic; color: #475569; margin: 0 0 12px 0; background: #fff; padding: 8px; border-left: 3px solid #c084fc; border-radius: 4px;">
                              <b>Abstract Esito:</b> "${a.aiForensics.summary || "Analisi completata."}"
                            </p>

                            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 12px;">
                              ${a.aiForensics.veterinary ? `
                                <tr>
                                  <th style="border: 1px solid #ddd; padding: 6px; background-color: #f3e8ff; font-weight: bold; text-align: left; width: 30%; color: #6b21a8;">🩺 VET. FORENSE</th>
                                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">
                                    <b>Stato Salute:</b> ${a.aiForensics.veterinary.healthStatus || "N.D."}<br/>
                                    <b>Ferite/Lesioni:</b> ${a.aiForensics.veterinary.injuries || "N.D."}<br/>
                                    <b>Malnutrizione:</b> ${a.aiForensics.veterinary.malnutrition || "N.D."}<br/>
                                    <b>Abusi:</b> ${a.aiForensics.veterinary.abuseEvidence || "N.D."}<br/>
                                    <b>Verdetto Clinico:</b> <u>${a.aiForensics.veterinary.verdict || "N.D."}</u>
                                  </td>
                                </tr>
                              ` : ""}
                              
                              ${a.aiForensics.legal ? `
                                <tr>
                                  <th style="border: 1px solid #ddd; padding: 6px; background-color: #f3e8ff; font-weight: bold; text-align: left; color: #6b21a8;">⚖️ PROFILO LEGALE</th>
                                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">
                                    <b>Reati Ipotizzati:</b> ${a.aiForensics.legal.crimesIdentified || "N.D."}<br/>
                                    <b>Articoli Applicabili:</b> ${a.aiForensics.legal.applicableLaws || "N.D."}<br/>
                                    <b>Solidità Probatoria:</b> ${a.aiForensics.legal.evidenceLevel || "N.D."}<br/>
                                    <b>Consiglio PG:</b> ${a.aiForensics.legal.prosecutionAction || "N.D."}
                                  </td>
                                </tr>
                              ` : ""}

                              ${a.aiForensics.botanical ? `
                                <tr>
                                  <th style="border: 1px solid #ddd; padding: 6px; background-color: #f3e8ff; font-weight: bold; text-align: left; color: #6b21a8;">🌱 BIOCLIMATICA & FLORA</th>
                                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">
                                    <b>Flora Riconosciuta:</b> ${a.aiForensics.botanical.floraIdentified || "N.D."}<br/>
                                    <b>Suolo e Habitat:</b> ${a.aiForensics.botanical.soilAndHabitat || "N.D."}<br/>
                                    <b>Stima Area (Toscana):</b> ${a.aiForensics.botanical.geographicAreaEstimate || "N.D."}<br/>
                                    <b>Stima Stagionale:</b> ${a.aiForensics.botanical.seasonEstimate || "N.D."}
                                  </td>
                                </tr>
                              ` : ""}

                              ${a.aiForensics.weather ? `
                                <tr>
                                  <th style="border: 1px solid #ddd; padding: 6px; background-color: #f3e8ff; font-weight: bold; text-align: left; color: #6b21a8;">☀️ METEO & OMBRE</th>
                                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">
                                    <b>Condizioni Atmosferiche:</b> ${a.aiForensics.weather.estimatedConditions || "N.D."}<br/>
                                    <b>Temperatura stima:</b> ${a.aiForensics.weather.reconstructedMeteo || "N.D."}<br/>
                                    <b>Luce e Ora del Giorno:</b> ${a.aiForensics.weather.lightingAndTimeOfDay || "N.D."}
                                  </td>
                                </tr>
                              ` : ""}

                              ${a.aiForensics.exif ? `
                                <tr>
                                  <th style="border: 1px solid #ddd; padding: 6px; background-color: #f3e8ff; font-weight: bold; text-align: left; color: #6b21a8;">📷 INTEGRITÀ EXIF</th>
                                  <td style="border: 1px solid #ddd; padding: 6px; text-align: left;">
                                    <b>Digital Forensics:</b> ${a.aiForensics.exif.technicalNotes || "N.D."}<br/>
                                    <b>Datazione EXIF:</b> ${a.aiForensics.exif.dateTime || "N.D."}<br/>
                                    <b>Stima GPS:</b> ${a.aiForensics.exif.gps || "N.D."}<br/>
                                    <b>Dispositivo:</b> ${a.aiForensics.exif.camera || "N.D."}
                                  </td>
                                </tr>
                              ` : ""}
                            </table>
                            
                            <div style="font-size: 7.5pt; color: #b45309; border: 1px solid #fcd34d; background-color: #fffbeb; padding: 8px; border-radius: 4px; line-height: 1.3; font-style: italic;">
                              ⚠️ <b>AVVISO DI LIMITAZIONE / DISCLAIMER VIRTUAL-AI:</b> La presente valutazione è generata autonomamente da modelli avanzati di Intelligenza Artificiale per puro supporto analitico interno d'ufficio. Essendo un riscontro telematico e virtuale, non ha valore di perizia legale ufficiale né può essere abbinata ad una denuncia formale o riscontro di Polizia Giudiziaria senza previa ispezione reale e firma autografa di un medico veterinario o tecnico forense abilitato.
                            </div>
                          </div>
                          `
                          : ""
                      }
                    </div>
                  `;
                }
              )
              .join("")}
          `
              : ""
          }
        </body>
      </html>
    `;

    portal.innerHTML = `
      <!-- Barra Direttivi Stampa d'Ufficio - Esclusa in fase di Stampa Cartacea -->
      <div class="print-preview-header no-print flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 shadow-xl" style="font-family: ui-sans-serif, system-ui, sans-serif; background-color: #0d121f !important; color: white !important; margin-bottom: 24px; border-radius: 12px; padding: 16px; border: 1px solid #1e293b !important; width: 100%; max-width: 800px; margin-left: auto; margin-right: auto; box-sizing: border-box;">
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; max-width: 40%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
            <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px;">
              Anteprima Cartella Unica (Sede / PG)
            </span>
          </div>
          <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.4;">
            Avvia la stampa A4 standard (consecutiva un foglio dopo l'altro) adatta a qualsiasi stampante da ufficio. I tasti manuali sono facoltativi.
          </span>
        </div>
        
        <!-- Duplexing Controls block -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button 
            id="print-all-btn"
            style="padding: 10px 18px; background-color: #f59e0b; color: #0f172a; border: none; font-family: monospace; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s;"
          >
            AVVIA STAMPA A4 CONSECUTIVA 🖨
          </button>
          
          <button 
            id="print-odd-btn"
            style="padding: 6px 10px; background-color: #334155; color: #94a3b8; border: none; font-family: monospace; font-size: 9px; font-weight: bold; text-transform: uppercase; border-radius: 6px; cursor: pointer;"
            title="Stampa solo le pagine dispari per fronte-retro manuale"
          >
            Solo Dispari
          </button>
          <button 
            id="print-even-btn"
            style="padding: 6px 10px; background-color: #334155; color: #94a3b8; border: none; font-family: monospace; font-size: 9px; font-weight: bold; text-transform: uppercase; border-radius: 6px; cursor: pointer;"
            title="Stampa solo le pagine pari per fronte-retro manuale"
          >
            Solo Pari
          </button>

          <button 
            id="close-print-preview-btn"
            style="padding: 10px 18px; background-color: #e11d48; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);"
          >
            CHIUDI ✕
          </button>
        </div>
      </div>
      
      ${htmlContent}
    `;

    // Attach programmatic listeners
    const allBtn = portal.querySelector("#print-all-btn") as HTMLButtonElement;
    const oddBtn = portal.querySelector("#print-odd-btn") as HTMLButtonElement;
    const evenBtn = portal.querySelector("#print-even-btn") as HTMLButtonElement;

    if (allBtn) {
      allBtn.addEventListener("click", () => {
        document.body.classList.remove("print-odd-only", "print-even-only");
        allBtn.style.backgroundColor = "#f59e0b";
        allBtn.style.color = "#0f172a";
        if (oddBtn) { oddBtn.style.backgroundColor = "#334155"; oddBtn.style.color = "#94a3b8"; }
        if (evenBtn) { evenBtn.style.backgroundColor = "#334155"; evenBtn.style.color = "#94a3b8"; }
        window.focus();
        window.print();
      });
    }

    if (oddBtn) {
      oddBtn.addEventListener("click", () => {
        document.body.classList.add("print-odd-only");
        document.body.classList.remove("print-even-only");
        oddBtn.style.backgroundColor = "#10b981";
        oddBtn.style.color = "white";
        if (allBtn) { allBtn.style.backgroundColor = "#334155"; allBtn.style.color = "#94a3b8"; }
        if (evenBtn) { evenBtn.style.backgroundColor = "#334155"; evenBtn.style.color = "#94a3b8"; }
        window.focus();
        window.print();
      });
    }

    if (evenBtn) {
      evenBtn.addEventListener("click", () => {
        document.body.classList.add("print-even-only");
        document.body.classList.remove("print-odd-only");
        evenBtn.style.backgroundColor = "#10b981";
        evenBtn.style.color = "white";
        if (allBtn) { allBtn.style.backgroundColor = "#334155"; allBtn.style.color = "#94a3b8"; }
        if (oddBtn) { oddBtn.style.backgroundColor = "#334155"; oddBtn.style.color = "#94a3b8"; }
        window.focus();
        window.print();
      });
    }

    const closeBtn = portal.querySelector("#close-print-preview-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.classList.remove("is-printing-active", "print-odd-only", "print-even-only");
        const currentPortal = document.getElementById("global-print-portal");
        if (currentPortal) {
          currentPortal.innerHTML = "";
        }
        document.title = originalTitle;
      });
    }

    document.body.classList.add("is-printing-active");
  };

  const handleToggleDossierState = async (rootReport: any) => {
    try {
      const reportRef = doc(db, "reports", rootReport.id);
      const isCurrentlyClosed = rootReport.dossierStato === "chiuso";
      
      const updateData: any = {};
      if (isCurrentlyClosed) {
        updateData.dossierStato = "aperto";
        updateData.dossierChiusoAl = null;
        updateData.dossierChiusoDa = null;
      } else {
        updateData.dossierStato = "chiuso";
        updateData.dossierChiusoAl = new Date().toISOString();
        updateData.dossierChiusoDa = currentGuard 
          ? `${currentGuard.name} ${currentGuard.surname}` 
          : "Amministratore";
      }
      
      await updateDoc(reportRef, updateData);
    } catch (err) {
      console.error("Errore aggiornamento stato dossier:", err);
      alert("Errore nell'aggiornamento dello stato del fascicolo: " + err);
    }
  };

  const handleUpdateResolution = async (rootReport: any, value: string) => {
    try {
      const reportRef = doc(db, "reports", rootReport.id);
      await updateDoc(reportRef, { risoluzione: value });
    } catch (err) {
      console.error("Errore aggiornamento risoluzione dossier:", err);
      alert("Errore nell'aggiornamento dell'esito del fascicolo: " + err);
    }
  };

  const handlePrintRichiesta = (callData: any) => {
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const originalTitle = document.title;
    const protocolCode = callData.protocolCode || `RI-${new Date(callData.createdAt).getFullYear()}-${callData.id?.slice(0, 4).toUpperCase()}`;
    document.title = `Richiesta_Intervento_${protocolCode}`;

    const htmlContent = `
      <html>
        <head>
          <title>Richiesta d'Intervento N. ${protocolCode}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              color: #111; 
              margin: 0;
              padding: 0;
              line-height: 1.35;
              font-size: 9pt;
            }
            .protocol-badge {
              border: 1.5pt solid #1e293b;
              display: inline-block;
              padding: 4px 12px;
              font-weight: bold;
              font-size: 10.5pt;
              margin: 6px 0 10px 0;
              text-align: center;
              background-color: #f8fafc;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            h2 { 
              font-size: 9.5pt; 
              border-bottom: 1.2pt solid #333; 
              padding-bottom: 2px; 
              margin-top: 8px; 
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: #0f172a;
            }
            .meta-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 4px 0 8px 0; 
            }
            .meta-table th, .meta-table td { 
              border: 1px solid #94a3b8; 
              padding: 4px 6px; 
              text-align: left; 
              font-size: 8.5pt;
            }
            .meta-table th { 
              background-color: #f1f5f9; 
              width: 28%; 
              font-weight: bold;
              color: #0f172a;
            }
            .text-block { 
              background: #fafafa; 
              border: 1px solid #94a3b8; 
              padding: 6px 8px; 
              font-style: italic; 
              font-size: 8.5pt;
              margin: 4px 0 8px 0; 
              white-space: pre-wrap;
              min-height: 45px;
            }
            .handover-box {
              border: 1.5pt dashed #475569;
              background-color: #f8fafc;
              padding: 6px 8px;
              margin: 8px 0;
              border-radius: 4px;
            }
            .footer-sig { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 18px; 
              font-size: 8.5pt;
              font-weight: bold;
            }
            .sig-box { 
              border-top: 1px dashed #333; 
              width: 6.5cm; 
              text-align: center; 
              padding-top: 4px; 
            }
            @media print {
              .no-print { display: none !important; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${getOfficialPrintHeaderHtml("REGISTRO CENTRALE OPERATIVA - MASSA-CARRARA", "SCHEDA RICHIESTA D'INTERVENTO PROTOCOLLARE")}

          <div style="text-align: center;">
            <div class="protocol-badge">
              RICHIESTA D'INTERVENTO PROTOCOLLO N° ${protocolCode}
            </div>
          </div>

          <h2>1. Estremi della Segnalazione</h2>
          <table class="meta-table">
            <tr>
              <th>Data e Ora Ricezione</th>
              <td>${new Date(callData.createdAt).toLocaleString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <th style="width: 22%;">Priorità Assegnata</th>
              <td><strong>${callData.priority?.toUpperCase() || "MEDIA"}</strong></td>
            </tr>
            <tr>
              <th>Richiedente</th>
              <td>${(callData.callerName || "N.D.").toUpperCase()}</td>
              <th>Recapito Telefonico</th>
              <td>${callData.callerPhone || "N.D."}</td>
            </tr>
            <tr>
              <th>Ambito / Settore</th>
              <td colspan="3">VIGILANZA ${(callData.sector || "ZOOFILA").toUpperCase()}</td>
            </tr>
          </table>

          <h2>2. Localizzazione dell'Intervento</h2>
          <table class="meta-table">
            <tr>
              <th>Comune</th>
              <td>${(callData.comune || "N.D.").toUpperCase()}</td>
              <th style="width: 22%;">Coordinate GPS</th>
              <td>LAT: ${callData.lat?.toFixed(6) || "N.D."} / LNG: ${callData.lng?.toFixed(6) || "N.D."}</td>
            </tr>
            <tr>
              <th>Località / Indirizzo</th>
              <td colspan="3">${(callData.localita || "N.D.").toUpperCase()}</td>
            </tr>
          </table>

          <h2>3. Descrizione del Fatto e Segnalazione</h2>
          <div class="text-block">${callData.description || "Nessun dettaglio aggiuntivo fornito."}</div>

          <h2>4. Gestione e Assegnazione Squadra</h2>
          <table class="meta-table">
            <tr>
              <th>Stato Emergenza</th>
              <td><b>${callData.status === "pattuglia" ? "PATTUGLIA SUL POSTO" : callData.status === "risolta" ? "RISOLTA / INTERVENTO EFFETTUATO" : "IN ATTESA SQUADRE / NON ASSEGNATO"}</b></td>
            </tr>
            <tr>
              <th>Pattuglia Incaricata</th>
              <td><b>${callData.assignedGuardName?.toUpperCase() || "NON ASSEGNATA (DISPONIBILE PER INGAGGI SUL CAMPO)"}</b></td>
            </tr>
            <tr>
              <th>Disposizioni Operative / Note HQ</th>
              <td>${callData.notes || "Disposizione di sopralluogo ispettivo e verifica adempimenti sul posto."}</td>
            </tr>
          </table>

          <!-- Sezione Passaggio Consegne / Assegnazione Posticipata -->
          <div class="handover-box">
            <div style="font-weight: bold; font-size: 8pt; text-transform: uppercase; margin-bottom: 4px; color: #1e293b;">
              Spazio Assegnazione Squadra / Passaggio Missione
            </div>
            <table class="meta-table" style="margin: 0; background: white;">
              <tr>
                <th style="width: 30%;">Squadra / Guardie Assegnatarie:</th>
                <td>${callData.assignedGuardName ? `<b>${callData.assignedGuardName.toUpperCase()}</b>` : "________________________________________________________"}</td>
              </tr>
              <tr>
                <th>Data e Ora Consegna Modulo:</th>
                <td>____/____/________ ore ____:____ &nbsp;&nbsp;|&nbsp;&nbsp; <b>Matr. Operatore Centrale:</b> _________</td>
              </tr>
              <tr>
                <th>Firma per Ricevuta Capopattuglia:</th>
                <td style="height: 18px;">________________________________________________________</td>
              </tr>
            </table>
          </div>

          <div class="footer-sig">
            <div class="sig-box">L'Operatore Centrale di Turno</div>
            <div class="sig-box">Il Responsabile del Nucleo</div>
          </div>
        </body>
      </html>
    `;

    portal.innerHTML = `
      <div class="print-preview-header no-print flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 shadow-xl" style="font-family: ui-sans-serif, system-ui, sans-serif; background-color: #0d121f !important; color: white !important; margin-bottom: 24px; border-radius: 12px; padding: 16px; border: 1px solid #1e293b !important; width: 100%; max-width: 800px; margin-left: auto; margin-right: auto; box-sizing: border-box;">
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; max-width: 60%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; background-color: #3b82f6; border-radius: 50%; display: inline-block;"></span>
            <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.5px;">
              Stampa Modulo Richiesta d'Intervento
            </span>
          </div>
          <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.4;">
            Rassegna la Richiesta d'Intervento istituzionale. Clicca sul pulsante giallo per avviare la stampa A4 o salvare come PDF.
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <button 
            id="start-print-btn"
            onclick="window.focus(); window.print();"
            style="padding: 10px 18px; background-color: #eab308; color: #0f172a; border: none; font-family: monospace; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.25);"
          >
            AVVIA STAMPA A4 🖨
          </button>
          <button 
            id="close-print-preview-btn"
            style="padding: 10px 18px; background-color: #f43f5e; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);"
          >
            CHIUDI ANTEPRIMA ✕
          </button>
        </div>
      </div>
      
      ${htmlContent}
    `;

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

  // Upload an file / scan attachment to a separate 'intervention_attachments' collection in firestore
  const handleSaveAttachment = async (
    reportId: string,
    name: string,
    url: string,
    type: "document" | "photo",
    lat?: number,
    lng?: number,
    isModal: boolean = false,
  ) => {
    try {
      if (isModal) {
        setIsModalProcessing(true);
      } else {
        setIsUploadingAttachment(true);
      }

      const targetReport = reports.find((r) => r.id === reportId);
      if (!targetReport) {
        throw new Error("Verbale non trovato nel sistema.");
      }

      const chunkLength = 500000; // 500KB characters chunk limit
      const isChunked = url.length > chunkLength;

      const newAttachment: any = {
        name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: guardEmail || "Sede HQ Amministratore",
        type,
        reportId, // Linked to the intervention report
        isChunked,
        ...(isChunked
          ? { url: "", totalChunks: Math.ceil(url.length / chunkLength) }
          : { url }),
        ...(lat ? { latitude: lat } : {}),
        ...(lng ? { longitude: lng } : {}),
      };

      const colRef = collection(db, "intervention_attachments");
      const docRef = await addDoc(colRef, newAttachment);

      // If the file exceeds 500KB, split and upload chunks in parallel
      if (isChunked) {
        const totalChunks = Math.ceil(url.length / chunkLength);
        const chunkPromises = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkData = url.substring(
            i * chunkLength,
            (i + 1) * chunkLength,
          );
          chunkPromises.push(
            addDoc(collection(db, "attachment_chunks"), {
              attachmentId: docRef.id,
              chunkIndex: i,
              data: chunkData,
              uploadedAt: new Date().toISOString(),
            }),
          );
        }
        await Promise.all(chunkPromises);
      }

      if (isModal) {
        setModalSuccessMessage(
          `✓ Documento "${name}" caricato correttamente ed associato alla Cartella Unica!`,
        );
      } else {
        alert(
          "✓ Documentazione allegata con successo alla cartella dell'intervento!",
        );
      }
    } catch (err: any) {
      console.error("Errore salvataggio allegato:", err);
      if (isModal) {
        setModalErrorMessage(err.message || "Errore di caricamento.");
      } else {
        alert(
          `❌ Errore durante il caricamento: ${err.message || "riprovare."}`,
        );
      }
    } finally {
      if (isModal) {
        setIsModalProcessing(false);
      } else {
        setIsUploadingAttachment(false);
      }
    }
  };

  // Method to invoke the forensic AI evaluation for administrators
  const handleAnalyzeWithAi = async (att: any) => {
    try {
      setAnalyzingAttachmentId(att.id);
      
      // Get Base64 image
      let base64Url = att.url;
      if (att.isChunked) {
        if (chunksCache[att.id]?.url) {
          base64Url = chunksCache[att.id].url;
        } else {
          base64Url = await loadChunkedAttachment(att.id);
        }
      }
      
      if (!base64Url) {
        throw new Error("Immagine non trovata o non ancora ricomposta dal server.");
      }
      
      // Send the request
      const response = await fetch("/api/forensics/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64Url,
          extraDetails: aiNotes[att.id] || "Nessuna nota aggiuntiva fornita.",
          fileMetadata: {
            name: att.name,
            size: base64Url.length,
            lastModified: att.uploadedAt || new Date().toISOString()
          },
          key: guardEmail || "giulianodellapina@gmail.com"
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Errore sconosciuto durante l'analisi.");
      }
      
      // Update the attachment document in Firestore!
      const attRef = doc(db, "intervention_attachments", att.id);
      await updateDoc(attRef, {
        aiForensics: data
      });
      
      alert("✓ Valutazione Forense AI completata ed associata all'allegato!");
      setShowNotesInputId(null);
    } catch (err: any) {
      console.error("Errore analisi AI:", err);
      alert("❌ Errore durante l'analisi AI: " + err.message);
    } finally {
      setAnalyzingAttachmentId(null);
    }
  };

  // Compress image helper using canvas to keep filesize well below the 1MB firestore limit.
  const compressImageIfNeeded = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        // Non-image files like PDFs cannot be resized using Canvas. Use a standard reader.
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Warn if size is extremely large
          if (result.length > 800000) {
            alert(
              "⚠️ Questo file PDF è molto grande. Se supera i limiti, prova ad esportarlo come immagine JPEG o ridurne la risoluzione.",
            );
          }
          resolve(result);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 960; // Max dimension optimized for perfect smartphone viewport & small document readability

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export as JPEG with 0.55 compression. Ideal for quick reports, reduces 4MB files to dynamic 25KB-50KB!
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.55);
            resolve(compressedBase64);
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => {
          resolve(reader.result as string);
        };
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Convert files in the unified modal to Base64 and send to Firestore
  const handleModalFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    reportId: string,
    customName: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsModalProcessing(true);
    setModalSuccessMessage(null);
    setModalErrorMessage(null);

    try {
      const base64String = await compressImageIfNeeded(file);
      if (!base64String) {
        throw new Error("Impossibile leggere o comprimere il file.");
      }
      const displayName = customName || file.name || "Allegato Scannerizzato";
      await handleSaveAttachment(
        reportId,
        displayName,
        base64String,
        "document",
        undefined,
        undefined,
        true,
      );
    } catch (err: any) {
      setModalErrorMessage(
        `Errore lettura file: ${err?.message || "verifica il formato."}`,
      );
      setIsModalProcessing(false);
    }
  };

  // Manually link a follow-up report to a dossier root
  const handleLinkFollowUp = async (rootId: string, followUpId: string) => {
    try {
      const reportRef = doc(db, "reports", followUpId);
      await updateDoc(reportRef, {
        parentReportId: rootId,
        isFollowUp: true,
      });
      alert(
        "✓ Verbale di verifica e controllo correttamente associato ed inserito nella Cartella Unica!",
      );
    } catch (err) {
      console.error("Errore collegamento verbale:", err);
      alert("❌ Errore nell'operazione di associazione verbale in Firestore.");
    }
  };

  // Convert files / camera photos to Base64 with geolocation and send to Firestore
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    reportId: string,
    customName?: string,
    type: "document" | "photo" = "document",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAttachment(true);
      const base64String = await compressImageIfNeeded(file);
      if (!base64String) {
        throw new Error("Impossibile leggere o comprimere il file.");
      }

      const displayName = customName || file.name || "Allegato Scannerizzato";

      if (type === "photo") {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              await handleSaveAttachment(
                reportId,
                displayName,
                base64String,
                type,
                latitude,
                longitude,
              );
            },
            async (err) => {
              console.warn("Geotag fallito, procedo senza coordinate:", err);
              await handleSaveAttachment(
                reportId,
                displayName,
                base64String,
                type,
              );
            },
            { enableHighAccuracy: true, timeout: 5000 },
          );
        } else {
          await handleSaveAttachment(reportId, displayName, base64String, type);
        }
      } else {
        await handleSaveAttachment(reportId, displayName, base64String, type);
      }
    } catch (err: any) {
      console.error("Errore nel processo di upload:", err);
      alert("❌ Errore durante il caricamento dell'allegato nel database.");
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (
    reportId: string,
    attachmentId: string,
  ) => {
    try {
      // 1. Check if it exists in the new separate collection "intervention_attachments"
      const targetDbAttachment = dbAttachments.find(
        (a) => a.id === attachmentId,
      );
      if (targetDbAttachment) {
        if (targetDbAttachment.isChunked) {
          try {
            const q = query(
              collection(db, "attachment_chunks"),
              where("attachmentId", "==", attachmentId),
            );
            const querySnapshot = await getDocs(q);
            const deletePromises: any[] = [];
            querySnapshot.forEach((chunkDoc) => {
              deletePromises.push(
                deleteDoc(doc(db, "attachment_chunks", chunkDoc.id)),
              );
            });
            await Promise.all(deletePromises);
          } catch (chunkErr) {
            console.error("Errore pulizia chunks allegato:", chunkErr);
          }
        }
        const attachmentRef = doc(db, "intervention_attachments", attachmentId);
        await deleteDoc(attachmentRef);
        try {
          alert("✓ Allegato eliminato con successo!");
        } catch (e) {}
        return;
      }

      // 2. Fallback to legacy reports array
      const targetReport = reports.find((r) => r.id === reportId);
      if (!targetReport) return;

      const prevAttachments = targetReport.attachments || [];
      const updatedAttachments = prevAttachments.filter(
        (att: any, idx: number) => {
          if (att.id && att.id === attachmentId) return false;
          
          // Generate fallback IDs to match
          const rootLegacyId = `legacy-root-${idx}-${att.name || 'file'}`;
          const singleLegacyId = `legacy-single-${idx}-${att.name || 'file'}`;
          if (attachmentId === rootLegacyId || attachmentId === singleLegacyId) return false;
          
          // Fallback matching if attachmentId starts with legacy-fup and targets this index/name
          if (
            attachmentId.startsWith("legacy-fup-") && 
            attachmentId.includes(`-${idx}-`) && 
            attachmentId.endsWith(`-${att.name || 'file'}`)
          ) {
            return false;
          }
          
          // Also fallback to match by name or url if the attachmentId itself contains/is equal to it (to be absolutely sure)
          if (att.name && attachmentId.includes(att.name)) return false;
          if (att.url && (attachmentId === att.url || attachmentId.includes(encodeURIComponent(att.name || '')))) return false;
          
          return true;
        }
      );

      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, {
        attachments: updatedAttachments,
      });
      try {
        alert("✓ Allegato eliminato con successo!");
      } catch (e) {}
    } catch (err) {
      console.error("Errore eliminazione allegato:", err);
      try {
        alert("❌ Errore durante l'eliminazione dell'allegato nel database.");
      } catch (e) {}
    }
  };

  const getInitials = (val: string) => {
    if (!val) return "G.P.G.";
    // Non abbreviare o silenziare matricole/codici identificativi delle guardie (es: DPG917/FC918)
    const isMatricola = /^[A-Z0-9\s\/\-\._]+$/i.test(val) && /[0-9]/.test(val);
    if (isMatricola || val.length <= 15) {
      return val.toUpperCase();
    }
    let clean = val.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, ""); // remove matrix or parenthesized content
    return clean
      .split(/[,;\/&]|\be\b/i)
      .map((p) => {
        let name = p.trim();
        if (!name) return "";
        if (name.length <= 4) return name.toUpperCase(); // already initials or abbreviation
        return name
          .split(/\s+/)
          .map((word) => word.charAt(0).toUpperCase() + ".")
          .join("");
      })
      .filter(Boolean)
      .join(" / ");
  };

  const handlePrintVerbale = (report: Report) => {
    const printId = `printable-verbale-${report.id}`;
    try {
      printElementById(printId, `Verbale_N_${report.numeroVerbale || "ND"}`);
    } catch (e) {
      console.warn("Native print API blocked or failed inside sandbox.", e);
    }

    // Generiamo e facciamo sempre scaricare anche il PDF A4 ufficiale per garantire la stampa fisica
    try {
      generateVerbalePDF(report);
    } catch (pdfErr) {
      console.error("PDF generation error:", pdfErr);
    }
  };

  const handlePrintSanction = (report: SanctionReport) => {
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const originalTitle = document.title;
    document.title = `Verbale_Sanzione_N_${report.numeroVerbale || "ND"}`;

    const printHeaderHtml = `
      <div style="font-family: 'Times New Roman', Times, serif; color: black; max-width: 100%; margin: 0 auto; padding: 0mm; font-size: 8.5pt; line-height: 1.25; background-color: white;">
        <!-- Intestazione Ufficiale Protezionistica -->
        <div style="text-align: center; font-size: 8pt; margin-bottom: 1.5mm; line-height: 1.2; font-family: serif; color: black;">
          Associazione protezionistica riconosciuta con Decreto del Ministro dell’Ambiente n. 862/SCOC/92
        </div>

        <!-- Header con Logo Aquila Operativo ed Intestazione Comando -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 8px;">
          <img src="/logo_operativo.jpg" style="height: 52px; width: auto; object-fit: contain;" alt="Logo Ekoclub" onError="this.style.display='none'" />
          <div style="text-align: center;">
            <div style="font-size: 15pt; font-weight: 900; text-transform: uppercase; font-family: 'Times New Roman', serif; color: black; line-height: 1;">GUARDIE EKOCLUB</div>
            <div style="font-size: 8.5pt; font-weight: bold; font-style: italic; margin-top: 2px;">Guardie Giurate Zoofile-Venatorie-Ittiche-Ambientali</div>
            <div style="font-size: 8.5pt; font-weight: bold; font-style: italic; margin-top: 1px;">Servizio di polizia giudiziaria zoofila</div>
            <div style="font-size: 9pt; font-weight: bold; font-style: italic; margin-top: 1px;">Nucleo Massa-Carrara "Attilio Bertolucci"</div>
            <div style="font-size: 7.5pt; margin-top: 2px;">ekoclub.massacarrara@gmail.com - pec: ekoclub.massacarrara@pec.it - cell. 3293738118</div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 8px;">
          <h1 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; text-decoration: underline;">
            VERBALE DI ACCERTAMENTO E CONTESTAZIONE DI VIOLAZIONE AMMINISTRATIVA
          </h1>
          <div style="font-size: 9.5pt; font-weight: bold; margin-top: 2px;">N° Registro Verbale: ${report.numeroVerbale || "_________________"}</div>
          <div style="font-size: 7.5pt; font-style: italic; margin-top: 1px;">Redatto ai sensi degli Artt. 13 e 14 della Legge 24 Novembre 1981, n. 689</div>
        </div>

        <!-- 1. Dati Redazione -->
        <div style="margin-bottom: 6px;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin: 0 0 4px 0; padding-bottom: 1px;">1. LUOGO E DATA DELL'ACCERTAMENTO</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
            <tr>
              <td style="width: 25%; font-weight: bold; padding: 1px 0;">Data Accertamento:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">${formatDateIT(report.dataAccertamento || report.data)} alle ore ${report.oraAccertamento || report.oraInizio}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Località / Comune:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.localita || "_______________"}, Comune di ${report.comune} (${report.provincia})</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Verbalizzanti:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">Agenti di P.G. nei limiti del servizio, Matricole: ${extractOnlyMatricole(report.verbalizzantiMatricole)}</td>
            </tr>
          </table>
        </div>

        <!-- 2. Trasgressore -->
        <div style="margin-bottom: 6px;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin: 0 0 4px 0; padding-bottom: 1px;">2. GENERALITÀ DEL TRASGRESSORE (Soggetto Controllato)</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
            <tr>
              <td style="width: 25%; font-weight: bold; padding: 1px 0;">Cognome e Nome:</td>
              <td colspan="3" style="border-bottom: 1px dotted black; padding: 1px 4px; font-weight: bold;">${report.soggettoNome}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Nato a:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px; width: 40%;">${report.soggettoNatoA} (${report.soggettoNatoProv})</td>
              <td style="font-weight: bold; padding: 1px 0; width: 8%; text-align: center;">il:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px; width: 22%;">${formatDateIT(report.soggettoNatoIl)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Residente a:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.soggettoResidenteA} (${report.soggettoResidenteProv})</td>
              <td style="font-weight: bold; padding: 1px 0; text-align: center;">Via:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.soggettoResidenteIndirizzo} N. ${report.soggettoResidenteCivico}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Documento:</td>
              <td colspan="3" style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.soggettoDocumentoTipo} N. ${report.soggettoDocumentoNumero} (Rilasciato da ${report.soggettoDocumentoRilasciatoDa} il ${formatDateIT(report.soggettoDocumentoRilasciatoIl)})</td>
            </tr>
          </table>
        </div>

        <!-- 3. Obbligato in solido (se presente) -->
        ${report.obbligatoNome ? `
        <div style="margin-bottom: 6px;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin: 0 0 4px 0; padding-bottom: 1px;">3. GENERALITÀ DELL'OBBLIGATO IN SOLIDO (Art. 6 L. 689/81)</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
            <tr>
              <td style="width: 25%; font-weight: bold; padding: 1px 0;">Cognome e Nome:</td>
              <td colspan="3" style="border-bottom: 1px dotted black; padding: 1px 4px; font-weight: bold;">${report.obbligatoNome}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Qualità (es. Proprietario):</td>
              <td colspan="3" style="border-bottom: 1px dotted black; padding: 1px 4px; font-style: italic;">${report.obbligatoQualita || "Proprietario dell'animale"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Nato a:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px; width: 40%;">${report.obbligatoNatoA} (${report.obbligatoNatoProv})</td>
              <td style="font-weight: bold; padding: 1px 0; width: 8%; text-align: center;">il:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px; width: 22%;">${formatDateIT(report.obbligatoNatoIl)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Residente a:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.obbligatoResidenteA} (${report.obbligatoResidenteProv})</td>
              <td style="font-weight: bold; padding: 1px 0; text-align: center;">Via:</td>
              <td style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.obbligatoResidenteIndirizzo} N. ${report.obbligatoResidenteCivico}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 1px 0;">Documento:</td>
              <td colspan="3" style="border-bottom: 1px dotted black; padding: 1px 4px;">${report.obbligatoDocumentoTipo} N. ${report.obbligatoDocumentoNumero} (Rilasciato da ${report.obbligatoDocumentoRilasciatoDa} il ${formatDateIT(report.obbligatoDocumentoRilasciatoIl)})</td>
            </tr>
          </table>
        </div>
        ` : ''}

        <!-- 4. Descrizione Violazione -->
        <div style="margin-bottom: 6px; page-break-inside: avoid;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin: 0 0 4px 0; padding-bottom: 1px;">4. NORMA VIOLATA E SANZIONE PREVISTA</h3>
          <div style="background-color: #f9f9f9; border: 1px solid black; padding: 4px 6px; margin-bottom: 4px; font-family: monospace; font-size: 8pt; line-height: 1.2;">
            <strong>NORMA VIOLATA:</strong> Art. ${report.trasgreditoArt} della ${report.trasgreditoLeggeRegolamento}<br/>
            <strong>NORMA SANZIONATORIA:</strong> Art. ${report.sanzionatoArt} della ${report.sanzionatoLeggeRegolamento}<br/>
            ${report.altreDisposizioni ? `<strong>ALTRE DISPOSIZIONI:</strong> ${report.altreDisposizioni}<br/>` : ''}
            <strong>SANZIONE EDITTALE:</strong> Min: € ${report.sanzioneMin} (${report.sanzioneMinLettere || '---'}) - Max: € ${report.sanzioneMax} (${report.sanzioneMaxLettere || '---'})
          </div>
          <div style="font-weight: bold; margin-bottom: 2px; font-size: 8.5pt;">DESCRIZIONE DELLA CONDOTTA ACCERTATA (Fatti storici):</div>
          <div style="border: 1px dotted black; padding: 5px; min-height: 38px; font-family: monospace; font-size: 8.5pt; white-space: pre-wrap; line-height: 1.2;">${report.motiviFatti}</div>
        </div>

        <!-- 5. Contestazione e dichiarazioni -->
        <div style="margin-bottom: 6px; page-break-inside: avoid;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin: 0 0 4px 0; padding-bottom: 1px;">5. CONTESTAZIONE, DICHIARAZIONI E SEQUESTRO</h3>
          <div style="margin-bottom: 2px;">
            <strong>Modalità:</strong> Contestazione ${report.contestazioneTipo === 'immediata' ? 'IMMEDIATA all\'interessato' : 'DIFFERITA (notifica successiva)'}
          </div>
          ${report.contestazioneTipo === 'differita' ? `
            <div style="margin-bottom: 3px;"><strong>Motivi della mancata contestazione immediata:</strong>
            <span style="font-style: italic; font-family: monospace;">${report.motivoMancataContestazione || 'Notifica postale ai sensi di legge.'}</span></div>
          ` : ''}
          <div style="margin-bottom: 3px;"><strong>Dichiarazioni spontanee del trasgressore:</strong>
          <span style="font-style: italic; font-family: monospace;">${report.dichiarazioniSpontanee || 'Il trasgressore non ha rilasciato dichiarazioni.'}</span></div>

          <div>
            <strong>Sequestro Amministrativo Cautelare:</strong> ${report.sequestroAmministrativo ? `SI, con Verbale n. ${report.sequestroVerbaleNumero || '---'} del ${formatDateIT(report.sequestroVerbaleDel)}` : 'NO'}
          </div>
        </div>

        <!-- 6. Pagamento in misura ridotta -->
        <div style="margin-bottom: 6px; border: 1.2px solid black; padding: 5px 7px; page-break-inside: avoid;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; text-align: center; margin: 0 0 4px 0; border-bottom: 1px solid black; padding-bottom: 2px;">6. MODALITÀ DI PAGAMENTO IN MISURA RIDOTTA (P.M.R.)</h3>
          <p style="font-size: 8pt; margin: 0 0 4px 0; line-height: 1.2;">
            Ai sensi dell'art. 16 della Legge 689/1981, è ammesso il pagamento di una somma in misura ridotta (pari al terzo del massimo o, se più favorevole, al doppio del minimo edittale) <strong>entro 60 giorni</strong> dalla contestazione o notificazione del presente verbale.
          </p>
          <div style="display: flex; justify-content: space-between; font-size: 9pt; font-weight: bold; margin-bottom: 4px; background-color: #f9f9f9; padding: 3px 6px;">
            <div>Sanzione PMR: € ${report.pagamentoMisuraRidotta}</div>
            <div>Spese Notifica: € ${report.speseNotifica}</div>
            <div style="color: #b91c1c;">TOTALE DA PAGARE: € ${report.pagamentoTotale}</div>
          </div>
          <div style="font-size: 8pt; font-family: monospace; line-height: 1.2;">
            <strong>ENTE DESTINATARIO E ESTREMI DI PAGAMENTO:</strong><br/>
            ${report.metodoPagamento === 'regione_toscana' ? `
              - Intestatario: ${report.regioneIntestatario || 'REGIONE TOSCANA - TESORERIA PROVINCIALE'}<br/>
              - C/C Postale: ${report.regioneCcPostale || '10258452'} | IBAN: ${report.regioneIban || 'IT34O0200813702000000325411'}<br/>
              - Causale obbligatoria: "Sanzione Amministrativa L. 689/81, Verbale N° ${report.numeroVerbale} del ${formatDateIT(report.data)}"
            ` : report.metodoPagamento === 'comune_carrara' ? `
              - Ente Beneficiario: COMUNE DI CARRARA - SERVIZIO ENTRATE<br/>
              - C/C Postale: ${report.comuneCcPostale || '13154546'} | IBAN: ${report.comuneIban || 'IT 45 K 03069 24502 100000012345'}<br/>
              ${report.comuneLinkPagoPa || 'https://carrara.toscana.pagopa.it' ? `- Portale PagoPA: ${report.comuneLinkPagoPa || 'https://carrara.toscana.pagopa.it'}<br/>` : ''}
              - Causale obbligatoria: "Sanzione Amministrativa, Verbale N° ${report.numeroVerbale} del ${formatDateIT(report.data)}, Trasgressore: ${report.soggettoNome}"
            ` : `
              - Ente Beneficiario: ${report.comuneNome || 'COMUNE ACCERTATORE'} - SERVIZIO ENTRATE<br/>
              - C/C Postale: ${report.comuneCcPostale || '12345678'} | IBAN: ${report.comuneIban || 'IT 12 A 03069 24502 100000098765'}<br/>
              ${report.comuneLinkPagoPa ? `- Portale PagoPA: ${report.comuneLinkPagoPa}<br/>` : ''}
              - Causale obbligatoria: "Sanzione Amministrativa L. 689/81, Verbale N° ${report.numeroVerbale} del ${formatDateIT(report.data)}"
            `}
          </div>
        </div>

        <!-- 7. Ricorso -->
        <div style="margin-bottom: 6px; font-size: 8pt; page-break-inside: avoid;">
          <h3 style="font-size: 9pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin: 0 0 4px 0; padding-bottom: 1px;">7. PRESENTAZIONE DI SCRITTI DIFENSIVI (RICORSO)</h3>
          Contro la presente contestazione, gli interessati (trasgressore e obbligato in solido) possono far pervenire <strong>entro 30 giorni</strong> scritti difensivi, documenti o richiedere di essere ascoltati a: 
          <strong>${report.ricorsoAutorita === 'regione_toscana' ? 'REGIONE TOSCANA - SETTORE SANZIONI AMMINISTRATIVE' : `SINDACO DEL COMUNE DI ${report.comune.toUpperCase()}`}</strong>
          ${report.ricorsoComunePec ? `(PEC: ${report.ricorsoComunePec})` : ''}.
        </div>

        <!-- 8. Informativa Privacy (GDPR) -->
        <div style="margin-bottom: 6px; font-size: 7.5pt; color: #222; border-top: 1px dotted #888; padding-top: 3px; page-break-inside: avoid; line-height: 1.15;">
          <strong>INFORMATIVA TRATTAMENTO DATI PERSONALI (Art. 13 Regolamento UE 2016/679 - GDPR):</strong>
          I dati personali ed identificativi contenuti nel presente verbale sono raccolti e trattati esclusivamente per le finalità istituzionali e procedimentali connesse all'accertamento e all'applicazione delle sanzioni amministrative ai sensi della L. 689/1981. Titolare del trattamento è l'Ente accertatore/preposto di competenza territoria.
        </div>

        <!-- Sottoscrizione e Firme -->
        <div style="margin-top: 8px; page-break-inside: avoid;">
          <div style="font-style: italic; font-size: 8pt; margin-bottom: 6px;">
            Sottoscrizione del presente verbale:
            ${report.accettaContenutoERitira ? 'L\'interessato accetta il contenuto del verbale e ne ritira copia conforme.' : 
              report.rifiutaFirmareMaRitira ? 'L\'interessato rifiuta di firmare ma ritira copia conforme del verbale.' : 
              'L\'interessato rifiuta di firmare e rifiuta di ricevere copia (notifica postale obbligatoria).'}
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 15px; text-align: center;">
            <div style="width: 30%; border-top: 1px solid black; padding-top: 3px;">
              <div style="font-size: 8pt; font-weight: bold;">IL TRASGRESSORE</div>
              ${report.firmaTrasgressore ? `<img src="${report.firmaTrasgressore}" style="max-height: 32px; margin: 2px auto; display: block;" />` : '<div style="height: 28px; font-size: 7.5pt; color: #888; line-height: 28px;">Rifiuta o assente</div>'}
            </div>
            ${report.obbligatoNome ? `
            <div style="width: 30%; border-top: 1px solid black; padding-top: 3px;">
              <div style="font-size: 8pt; font-weight: bold;">L'OBBLIGATO IN SOLIDO</div>
              ${report.firmaObbligato ? `<img src="${report.firmaObbligato}" style="max-height: 32px; margin: 2px auto; display: block;" />` : '<div style="height: 28px; font-size: 7.5pt; color: #888; line-height: 28px;">Non firmato</div>'}
            </div>
            ` : ''}
            <div style="width: 40%; border-top: 1px dashed black; padding-top: 3px;">
              <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase;">I Verbalizzanti (Matr. ${extractOnlyMatricole(report.verbalizzantiMatricole)})</div>
              ${report.firmaGuardie ? `<img src="${report.firmaGuardie}" style="max-height: 32px; margin: 2px auto; display: block;" />` : '<div style="height: 28px; font-size: 7.5pt; color: #888; line-height: 28px;">Firmato elettronicamente</div>'}
            </div>
          </div>
        </div>

        <div style="margin-top: 10px; font-size: 7pt; color: #555; text-align: center; border-top: 1px dotted #ccc; padding-top: 4px;">
          Copia conforme all'originale depositato presso l'Archivio Centrale del Nucleo Vigilanza Massa-Carrara.<br/>
          Rilevazione telematica registrata al millisecondo ai fini di Polizia Giudiziaria.
        </div>
      </div>
    `;

    const htmlContent = `
      <html>
        <head>
          <title>Verbale Sanzione L. 689/81 N. ${report.numeroVerbale || "ND"}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 6mm 8mm 6mm 8mm; }
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
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; max-width: 60%;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
                <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.5px;">
                  Anteprima Verbale di Sanzione L. 689/81
                </span>
              </div>
              <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.4;">
                Verifica il documento qui sotto (ora pienamente scorribile e copiabile). Se il tasto di stampa automatica è inibito dal browser nel frame, premi <b style="color: #f59e0b;">CTRL + P</b> (o CMD+P) sulla tua tastiera, oppure apri l'app in una <b style="color: #38bdf8;">Nuova Scheda</b>.
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <button 
                id="start-print-btn"
                onclick="window.focus(); window.print();"
                style="padding: 10px 18px; background-color: #f59e0b; color: #0f172a; border: none; font-family: monospace; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);"
              >
                AVVIA STAMPA A4 🖨
              </button>
              <button 
                id="close-print-preview-btn"
                style="padding: 10px 18px; background-color: #e11d48; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);"
              >
                CHIUDI ANTEPRIMA ✕
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

  const handlePrintEnvironmental = (report: EnvironmentalReport) => {
    const formattedDate =
      report.timestamp && typeof report.timestamp.toDate === "function"
        ? format(report.timestamp.toDate(), "dd/MM/yyyy HH:mm")
        : report.timestamp &&
            (typeof report.timestamp === "string" ||
              report.timestamp instanceof Date)
          ? format(new Date(report.timestamp), "dd/MM/yyyy HH:mm")
          : "N/D";

    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const originalTitle = document.title;
    document.title = `Segnalazione_N_${report.id?.substring(0, 8) || "ND"}`;

    const htmlContent = `
      <html>
        <head>
          <title>Segnalazione N. ${report.id?.substring(0, 8) || "N/D"}</title>
          <style>
            @media print {
              @page { size: A4; margin: 15mm; }
              body { 
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; 
                margin: 0;
                padding: 0;
                background-color: white !important;
                color: #333 !important;
              }
            }
            body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; padding: 15px; }
            .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 4mm; margin-bottom: 6mm; }
            .grid { display: grid; grid-template-columns: 140px 1fr; row-gap: 3mm; margin-bottom: 6mm; }
            .label { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; color: #555; }
            .value { font-size: 10.5pt; border-bottom: 0.5pt solid #ddd; padding-bottom: 1mm; }
            .section { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: black; border-bottom: 1pt solid black; padding-bottom: 1mm; margin-top: 5mm; margin-bottom: 3mm; }
            .description { font-size: 10pt; font-family: monospace; line-height: 1.5; white-space: pre-wrap; background: #f9f9f9; padding: 3mm; border-radius: 4px; border: 0.5pt solid #eee; }
            .footer-sig { margin-top: 1.5cm; display: flex; justify-content: center; }
            .sig-box { text-align: center; width: 10cm; border-top: 1px dashed #333; padding-top: 5px; font-size: 9pt; text-transform: uppercase; font-weight: bold; }
          </style>
        </head>
        <body>
          ${getOfficialPrintHeaderHtml("RAPPORTO DI SEGNALAZIONE AMBIENTALE / REATO", "ESTRATTO DA ARCHIVIO CENTRALE HQ")}
          
          <div class="grid">
            <div class="label">ID Segnalazione:</div>
            <div class="value">${report.id || "N/D"}</div>
            
            <div class="label">Data / Ora:</div>
            <div class="value">${formattedDate}</div>
            
            <div class="label">Tipo Infrazione:</div>
            <div class="value" style="font-weight: bold; text-transform: uppercase">${report.type || "N/A"}</div>
            
            <div class="label">Località / Indirizzo:</div>
            <div class="value">${report.address || "N/D"}</div>
 
            <div class="label">Segnalatore:</div>
            <div class="value">${report.reporterName || "N/D"} (${report.reporterId || "N/D"})</div>
 
            <div class="label">Stato Attuale:</div>
            <div class="value" style="text-transform: uppercase; font-weight: bold;">${report.status || "N/A"}</div>
            
            ${
              report.externalAuthority
                ? `
              <div class="label">Autorità Informata:</div>
              <div class="value" style="font-weight: bold; color: #b91c1c; text-transform: uppercase;">${report.externalAuthority}</div>
            `
                : ""
            }
          </div>
 
          <div class="section">Descrizione e Constatazioni</div>
          <div class="description">${report.description || "Nessuna descrizione ulteriore fornita."}</div>
 
          ${
            report.notes
              ? `
            <div class="section">Note Extra / Sviluppi</div>
            <div class="description">${report.notes}</div>
          `
              : ""
          }
 
          <div class="footer-sig">
            <div class="sig-box">I Verbalizzanti (Matr. ${extractOnlyMatricole(report.reporterName)})</div>
          </div>
        </body>
      </html>
    `;

    portal.innerHTML = `
      <!-- Barra Direttivi Stampa d'Ufficio - Esclusa in fase di Stampa Cartacea -->
      <div class="print-preview-header no-print flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 shadow-xl" style="font-family: ui-sans-serif, system-ui, sans-serif; background-color: #0d121f !important; color: white !important; margin-bottom: 24px; border-radius: 12px; padding: 16px; border: 1px solid #1e293b !important; width: 100%; max-width: 800px; margin-left: auto; margin-right: auto; box-sizing: border-box;">
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; max-width: 60%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
            <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px;">
              Anteprima Segnalazione Ambientale
            </span>
          </div>
          <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.4;">
            Verifica il documento qui sotto (ora pienamente scorribile e copiabile). Se il tasto di stampa automatica è inibito dal browser nel frame, premi <b style="color: #f59e0b;">CTRL + P</b> (o CMD+P) sulla tua tastiera, oppure apri l'app in una <b style="color: #38bdf8;">Nuova Scheda</b>.
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <button 
            id="start-print-btn"
            onclick="window.focus(); window.print();"
            style="padding: 10px 18px; background-color: #f59e0b; color: #0f172a; border: none; font-family: monospace; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);"
            onmouseover="this.style.backgroundColor='#d97706'"
            onmouseout="this.style.backgroundColor='#f59e0b'"
          >
            AVVIA STAMPA A4 🖨
          </button>
          <button 
            id="close-print-preview-btn"
            style="padding: 10px 18px; background-color: #e11d48; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);"
            onmouseover="this.style.backgroundColor='#be123c'"
            onmouseout="this.style.backgroundColor='#e11d48'"
          >
            CHIUDI ANTEPRIMA ✕
          </button>
        </div>
      </div>
      
      ${htmlContent}
    `;

    // Attach programmatic listeners to avoid potential Content Security Policy / Inline Script blockages
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
    <div className="space-y-6">
      {isPreloadingAttachments && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-center p-6 select-none">
          <div className="bg-[#0a0e1a] border border-slate-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
            <h3 className="text-white text-md font-bold uppercase tracking-wider mb-2">Preparazione Dossier...</h3>
            <p className="text-slate-400 text-[10px] leading-relaxed uppercase">
              Scaricamento e ricostruzione degli allegati ad alta risoluzione (Certificati e foto) in corso. Attendere prego...
            </p>
          </div>
        </div>
      )}
      <div className="bg-slate-900/40 p-5 rounded-2xl mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-normal italic tracking-widest text-white uppercase flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-purple-500" />
                Archivio Verbali HQ
              </h1>
              {countNewReports() > 0 && (
                <Badge className="bg-purple-600 hover:bg-purple-500 text-white animate-pulse text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-lg shadow-purple-500/20">
                  {countNewReports()} Nuov{countNewReports() === 1 ? "o" : "i"}{" "}
                  Verbal{countNewReports() === 1 ? "e" : "i"} (Ultimi 5gg)
                </Badge>
              )}
            </div>
            <p className="text-slate-300 text-sm mt-1 font-normal tracking-wider uppercase">
              Gestione documentazione operativa e acquisizione AI
            </p>
          </div>

          <div className="flex gap-1.5 bg-slate-950/60 p-1 rounded-2xl border border-slate-800">
            {showSopralluoghi && (
              <button
                onClick={() => setActiveTab("operative")}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer",
                  activeTab === "operative"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Sopralluoghi
              </button>
            )}
            <button
              onClick={() => setActiveTab("environmental")}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer",
                activeTab === "environmental"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Segnalazioni Ambientali
            </button>
            <button
              onClick={() => setActiveTab("sanctions")}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer",
                activeTab === "sanctions"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Sanzioni L. 689/81
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cerca per N° Verbale, Soggetto, Luogo..."
                value={reportsSearch}
                onChange={(e) => setReportsSearch(e.target.value)}
                className="bg-slate-950/50 border-slate-800 pl-10 h-11 text-xs uppercase tracking-widest italic"
              />
            </div>
            <div className="relative w-full md:w-48">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="date"
                value={reportsDateFilter}
                onChange={(e) => setReportsDateFilter(e.target.value)}
                className="bg-slate-950/50 border-slate-800 pl-10 h-11 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {onOpenVerbalistica && (
              <Button
                onClick={onOpenVerbalistica}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase italic tracking-wider text-[11px] h-11 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 border border-purple-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <FileText className="h-4.5 w-4.5 text-purple-200" />
                Compila Verbale / Atto
              </Button>
            )}

            {onOpenOperatoGuardie && (
              <Button
                onClick={onOpenOperatoGuardie}
                className="bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold uppercase tracking-wider text-[11px] h-11 px-4 rounded-2xl flex items-center justify-center gap-2 border border-slate-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Award className="h-4.5 w-4.5 text-emerald-400" />
                Operato Guardie
              </Button>
            )}

            {onOpenArchivioTurni && (
              <Button
                onClick={onOpenArchivioTurni}
                className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold uppercase tracking-wider text-[11px] h-11 px-4 rounded-2xl flex items-center justify-center gap-2 border border-slate-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <CalendarIcon className="h-4.5 w-4.5 text-amber-400" />
                Archivio Turni
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* SECTOR BUTTON TAB SYSTEM AND VIEW SWITCHER */}
        {activeTab === "operative" && (
          <>
            <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center mb-6 bg-slate-900/20 p-2.5 rounded-2xl">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center px-2">
                {visibleSectors.includes("zoofila") && (
                  <button
                    onClick={() => setSectorTab("zoofila")}
                    className={cn(
                      "px-4 py-2 rounded-xl uppercase font-bold tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent cursor-pointer",
                      sectorTab === "zoofila"
                        ? "bg-orange-600 text-white shadow shadow-orange-950/20 font-extrabold border-orange-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                    )}
                  >
                    Zoofila ({reports.filter(r => (r.tipoVerbale || "zoofila") === "zoofila").length})
                  </button>
                )}
                {visibleSectors.includes("ittica") && (
                  <button
                    onClick={() => setSectorTab("ittica")}
                    className={cn(
                      "px-4 py-2 rounded-xl uppercase font-bold tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent cursor-pointer",
                      sectorTab === "ittica"
                        ? "bg-blue-600 text-white shadow shadow-blue-950/20 font-extrabold border-blue-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                    )}
                  >
                    Ittica ({reports.filter(r => r.tipoVerbale === "ittica").length})
                  </button>
                )}
                {visibleSectors.includes("venatoria") && (
                  <button
                    onClick={() => setSectorTab("venatoria")}
                    className={cn(
                      "px-4 py-2 rounded-xl uppercase font-bold tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent cursor-pointer",
                      sectorTab === "venatoria"
                        ? "bg-emerald-600 text-white shadow shadow-emerald-950/20 font-extrabold border-emerald-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                    )}
                  >
                    Venatoria ({reports.filter(r => r.tipoVerbale === "venatoria").length})
                  </button>
                )}
              </div>

              {/* View Mode Switching Controls */}
              <div className="flex flex-wrap bg-slate-950/60 p-1 rounded-2xl border border-slate-900 gap-1 w-full lg:w-auto">
                <Button
                  size="sm"
                  variant={viewMode === "archive" ? "default" : "ghost"}
                  onClick={() => setViewMode("archive")}
                  className={cn(
                    "flex-1 lg:flex-none h-8.5 text-[9px] uppercase tracking-wider font-extrabold px-4 rounded-xl transition-all",
                    viewMode === "archive"
                      ? "bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-900/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40",
                  )}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Archivio Tradizionale
                </Button>

                {isAdmin && (
                  <Button
                    size="sm"
                    variant={
                      viewMode === "cartella_unica" ? "default" : "ghost"
                    }
                    onClick={() => setViewMode("cartella_unica")}
                    className={cn(
                      "flex-1 lg:flex-none h-8.5 text-[9px] uppercase tracking-wider font-extrabold px-4 rounded-xl transition-all",
                      viewMode === "cartella_unica"
                        ? "bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-900/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/40",
                    )}
                  >
                    <FolderOpen className="h-4 w-4 mr-1.5 text-yellow-500" />
                    Cartella Unica Interventi (HQ)
                  </Button>
                )}

                <Button
                  size="sm"
                  variant={viewMode === "map" ? "default" : "ghost"}
                  onClick={() => setViewMode("map")}
                  className={cn(
                    "flex-1 lg:flex-none h-8.5 text-[9px] uppercase tracking-wider font-extrabold px-4 rounded-xl transition-all",
                    viewMode === "map"
                      ? "bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-900/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40",
                  )}
                >
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Mappa Interventi (Schermo Intero)
                </Button>
              </div>
            </div>

            <div className="w-full">
              {/* Left Panel: Table of verbali */}
              {viewMode === "archive" && (
                <div className="w-full flex flex-col gap-4">
                  {/* BARRA FILTRI RAPIDI PER 1° E 2° SOPRALLUOGO */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1">
                        Filtro Sopralluoghi:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSopralluogoFilter("all")}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer",
                          sopralluogoFilter === "all"
                            ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                            : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                        )}
                      >
                        Tutti i Verbali ({reports.filter((r) => (r.tipoVerbale || "zoofila") === sectorTab).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSopralluogoFilter("1")}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer",
                          sopralluogoFilter === "1"
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                            : "bg-slate-950/60 text-indigo-300 border-slate-800 hover:text-white"
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        1° Sopralluogo (Iniziale) ({
                          reports.filter((r) => (r.tipoVerbale || "zoofila") === sectorTab && !r.isFollowUp && r.sopralluogoTipo !== "2").length
                        })
                      </button>
                      <button
                        type="button"
                        onClick={() => setSopralluogoFilter("2")}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer",
                          sopralluogoFilter === "2"
                            ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                            : "bg-slate-950/60 text-amber-300 border-slate-800 hover:text-white"
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        2° Sopralluogo (Verifica) ({
                          reports.filter((r) => (r.tipoVerbale || "zoofila") === sectorTab && (r.isFollowUp || r.sopralluogoTipo === "2")).length
                        })
                      </button>
                      <button
                        type="button"
                        onClick={() => setSopralluogoFilter("pending")}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer",
                          sopralluogoFilter === "pending"
                            ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                            : "bg-slate-950/60 text-rose-300 border-rose-900/40 hover:text-white"
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        ⏳ 2° Sopralluogo da Effettuare ({
                          reports.filter((r) => {
                            if ((r.tipoVerbale || "zoofila") !== sectorTab) return false;
                            if (r.isFollowUp || r.sopralluogoTipo === "2") return false;
                            const hasPresc = Boolean((r.giorniRegolarizzazione && r.giorniRegolarizzazione > 0) || (r.constatazioni && r.constatazioni.toLowerCase().includes("prescriz")));
                            if (!hasPresc) return false;
                            const hasFollowUp = reports.some((f) => f.parentReportId === r.id && (f.isFollowUp || f.sopralluogoTipo === "2"));
                            return !hasFollowUp;
                          }).length
                        })
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono italic px-2">
                      Fascicoli autonomi con verifica delle prescrizioni
                    </div>
                  </div>

                  {reports.filter((r) => (r.tipoVerbale || "zoofila") === sectorTab).length ===
                  0 ? (
                    <div className="py-20 bg-slate-950/40 rounded-3xl border border-slate-900 border-dashed flex flex-col items-center justify-center opacity-40 text-slate-400">
                      <FileText className="h-12 w-12 mb-4 animate-bounce" />
                      <p className="font-normal italic uppercase tracking-[0.2em] text-sm text-slate-400 text-center py-5">
                        Nessun verbale archiviato in questo settore
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#090d16] overflow-hidden rounded-2xl shadow-xl">
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
                        <Table>
                          <TableHeader className="bg-slate-900/40">
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px] py-4 pl-6">
                                N° Verbale / Tipo
                              </TableHead>
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Data
                              </TableHead>
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Soggetto Controllato
                              </TableHead>
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Località
                              </TableHead>
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Stato Intervento Successivo
                              </TableHead>
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Disposizioni / Constatazioni
                              </TableHead>
                              <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Agenti
                              </TableHead>
                              <TableHead className="text-slate-200 font-bold uppercase tracking-wider text-[10px] text-right pr-4 sticky right-0 bg-[#0f172a] border-l border-slate-800 shadow-[-8px_0_12px_-3px_rgba(0,0,0,0.5)] z-20 min-w-[240px]">
                                Azioni Operative
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reports
                              .filter((report) => {
                                if ((report.tipoVerbale || "zoofila") !== sectorTab)
                                  return false;

                                // Filtro per tipo sopralluogo 1 o 2 o da verificare
                                if (sopralluogoFilter === "1") {
                                  if (report.isFollowUp || report.sopralluogoTipo === "2") return false;
                                } else if (sopralluogoFilter === "2") {
                                  if (!report.isFollowUp && report.sopralluogoTipo !== "2") return false;
                                } else if (sopralluogoFilter === "pending") {
                                  if (report.isFollowUp || report.sopralluogoTipo === "2") return false;
                                  const hasPresc = Boolean(
                                    (report.giorniRegolarizzazione && report.giorniRegolarizzazione > 0) || 
                                    (report.constatazioni && report.constatazioni.toLowerCase().includes("prescriz"))
                                  );
                                  if (!hasPresc) return false;
                                  const hasFollowUp = reports.some(
                                    (f) => f.parentReportId === report.id && (f.isFollowUp || f.sopralluogoTipo === "2")
                                  );
                                  if (hasFollowUp) return false;
                                }

                                const searchTerm = reportsSearch.toLowerCase();
                                const matchesSearch =
                                  !reportsSearch ||
                                  (report.numeroVerbale || "")
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  (report.soggettoNome || "")
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  (report.localita || "")
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  (report.verbalizzanti || "")
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  (report.constatazioni || "")
                                    .toLowerCase()
                                    .includes(searchTerm);

                                const matchesDate =
                                  !reportsDateFilter ||
                                  report.data === reportsDateFilter;

                                return matchesSearch && matchesDate;
                              })
                              .map((report) => {
                                const initials = getInitials(
                                  report.verbalizzanti,
                                );
                                const followUpInfo = getReportFollowUpInfo(report, reports);
                                return (
                                  <TableRow
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className="group border-slate-900 hover:bg-slate-900/40 transition-colors cursor-pointer"
                                  >
                                    <TableCell className="pl-6 whitespace-nowrap">
                                      <div className="flex flex-col gap-1">
                                        <span className="font-mono text-purple-300 font-bold text-xs">
                                          {report.numeroVerbale || "N.D."}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit border",
                                            followUpInfo.isSecond
                                              ? "border-amber-500/60 text-amber-300 bg-amber-500/10"
                                              : "border-indigo-500/60 text-indigo-300 bg-indigo-500/10"
                                          )}
                                        >
                                          {followUpInfo.isSecond ? "2° SOPRALLUOGO" : "1° SOPRALLUOGO"}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-white text-xs whitespace-nowrap">
                                      {report.data
                                        ? getReportDateFormatted(report.data)
                                        : "N.D."}
                                    </TableCell>
                                    <TableCell className="text-white font-semibold text-xs uppercase max-w-[120px] xl:max-w-[150px] truncate">
                                      {report.soggettoNome ||
                                        "Controllo Generico"}
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-xs truncate max-w-[100px] xl:max-w-[130px]">
                                      {report.localita ||
                                        report.comune ||
                                        "N.D."}
                                    </TableCell>
                                    {/* COLONNA STATO INTERVENTO SUCCESSIVO */}
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs max-w-[180px] xl:max-w-[210px]"
                                    >
                                      {followUpInfo.isSecond ? (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1">
                                            🔍 Verifica Eseguita
                                          </span>
                                          {followUpInfo.parentReport ? (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedReport(followUpInfo.parentReport)}
                                              className="text-[9px] text-slate-300 hover:text-indigo-300 underline font-mono text-left cursor-pointer"
                                            >
                                              Rif. 1° Verb. N. {followUpInfo.parentNumber} ({followUpInfo.parentDate})
                                            </button>
                                          ) : (
                                            <span className="text-[9px] text-slate-500 font-mono">
                                              Verbale Iniziale Registrato
                                            </span>
                                          )}
                                        </div>
                                      ) : followUpInfo.isFollowUpDone ? (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                                            ✅ 2° Intervento Eseguito
                                          </span>
                                          {followUpInfo.followUpReport && (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedReport(followUpInfo.followUpReport!)}
                                              className="text-[9px] text-slate-300 hover:text-emerald-300 underline font-mono text-left cursor-pointer"
                                            >
                                              Verb. 2° N. {followUpInfo.followUpReport.numeroVerbale || "S.N."} ({followUpInfo.followUpReport.data})
                                            </button>
                                          )}
                                        </div>
                                      ) : followUpInfo.hasPrescriptions ? (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-rose-400 font-extrabold uppercase flex items-center gap-1 animate-pulse">
                                            ⏳ 2° Intervento Da Fare
                                          </span>
                                          <span className="text-[9px] text-amber-300/90 font-mono">
                                            Termine: {followUpInfo.days ? `${followUpInfo.days} giorni` : "Prescrizione attiva"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 uppercase font-medium">
                                          Nessuna prescrizione
                                        </span>
                                      )}
                                    </TableCell>
                                    {/* COLONNA DISPOSIZIONI / CONSTATAZIONI */}
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-slate-300 text-xs max-w-[200px] xl:max-w-[260px]"
                                      title={report.constatazioni || "NESSUNA CONSTATAZIONE PARTICOLARE"}
                                    >
                                      <div className="flex flex-col gap-1.5 py-1">
                                        {report.giorniRegolarizzazione && report.giorniRegolarizzazione > 0 ? (
                                          <div className="bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] text-amber-300 font-bold uppercase w-fit">
                                            Disposizione: Regolarizzazione entro {report.giorniRegolarizzazione} gg
                                          </div>
                                        ) : null}
                                        <div className="font-mono text-[10px] leading-relaxed uppercase text-slate-200 line-clamp-2 font-semibold">
                                          {report.constatazioni || "NESSUNA CONSTATAZIONE PARTICOLARE_"}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0 rounded",
                                              report.esito === "consenso"
                                                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                                                : "border-red-500 text-red-400 bg-red-500/5",
                                            )}
                                          >
                                            {report.esito === "consenso"
                                              ? "CONSENSO"
                                              : "RIFIUTO"}
                                          </Badge>
                                          <span className="text-[8px] text-slate-500 uppercase font-extrabold tracking-widest bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">
                                            {(report.proprietarioPossessore || "proprietario").toUpperCase()}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-xs whitespace-nowrap font-semibold">
                                      {initials}
                                    </TableCell>
                                    <TableCell
                                      className="text-right pr-3 sticky right-0 bg-[#090d16] group-hover:bg-slate-900 border-l border-slate-800/80 shadow-[-8px_0_12px_-3px_rgba(0,0,0,0.5)] z-10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex justify-end items-center gap-1.5 min-w-[260px] shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-purple-400 hover:text-white"
                                          onClick={() => {
                                            setUploadModalData({
                                              isOpen: true,
                                              reportId: report.id,
                                              documentType: "Foto / Allegati sul Campo",
                                            });
                                          }}
                                          title="Carica Foto/Allegati (Camera)"
                                        >
                                          <Camera className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-yellow-500 hover:text-white"
                                          onClick={() =>
                                            setReadingReport(report)
                                          }
                                          title="Lettura A4"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-sky-400 hover:text-white hover:bg-sky-600/30 bg-sky-950/60 border border-sky-800/60 rounded-lg shadow-sm shrink-0"
                                          onClick={() => {
                                            setEmailDialogReport(report);
                                            setToSede(true);
                                            setSedeEmail(
                                              "giulianodellapina@gmail.com",
                                            );
                                            setToControllato(
                                              !!(
                                                report.soggettoEmail || ""
                                              ).trim(),
                                            );
                                            setControllatoEmail(
                                              report.soggettoEmail || "",
                                            );
                                            setToGuard1(false);
                                            setGuard1Email("");
                                            setToGuard2(false);
                                            setGuard2Email("");
                                          }}
                                          title="Invia Posta / Email"
                                        >
                                          <Mail className="h-4 w-4 text-sky-300" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-blue-400 hover:text-white"
                                          onClick={() =>
                                            generateVerbalePDF(report)
                                          }
                                          title="Scarica PDF"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-emerald-400 hover:text-white"
                                          onClick={() =>
                                            handlePrintVerbale(report)
                                          }
                                          title="Stampa A4"
                                        >
                                          <Printer className="h-4 w-4" />
                                        </Button>
                                        {isAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:bg-red-950/30"
                                            onClick={() =>
                                              removeReport(report.id)
                                            }
                                            title="Elimina"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CARTELLA UNICA INTERVENTI & DOSSIER UNIFICATO MODULE */}
              {viewMode === "cartella_unica" && (
                <div className="w-full flex flex-col gap-6">
                  {/* Search Block and Filter Info */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-5 shadow-xl">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-6 w-6 text-yellow-500 animate-pulse" />
                        <h2 className="text-lg font-normal italic tracking-wider text-slate-100 uppercase m-0">
                          Cartella Unica Interventi
                        </h2>
                      </div>
                      <p className="text-slate-300 text-xs font-normal tracking-wide leading-relaxed">
                        Accorpa automaticamente il primo sopralluogo (verbale iniziale) con il secondo sopralluogo (verbale di controllo).
                      </p>
                    </div>

                    {/* Dicitura richiesta dall'utente ad alto contrasto e leggibile */}
                    <div className="border-t border-slate-800/80 pt-4 mt-2">
                      <div className="text-slate-200 text-sm font-normal uppercase tracking-wider mb-3">
                        👉 Scegli una voce per ricercare la cartella:
                      </div>

                      {/* Riga di selezione del criterio (Finestre separate) */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                        {[
                          { id: "microchip", label: "🏷️ Microchip" },
                          { id: "localita", label: "📍 Località" },
                          { id: "specie", label: "🐾 Specie/Razza" },
                          { id: "verbale", label: "📄 N° Verbale" },
                          { id: "generica", label: "🔍 Ricerca Libera" }
                        ].map((crit) => (
                          <button
                            key={crit.id}
                            type="button"
                            onClick={() => setSearchCriterion(crit.id as any)}
                            className={`px-3 py-2 text-xs rounded-xl border transition-all text-center font-normal ${
                              searchCriterion === crit.id
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/50"
                                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
                            }`}
                          >
                            {crit.label}
                          </button>
                        ))}
                      </div>

                      {/* Finestre di ricerca separate ad alto contrasto */}
                      <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl shadow-inner min-h-[110px] flex flex-col justify-center">
                        
                        {searchCriterion === "microchip" && (
                          <div className="space-y-2 animate-fade-in">
                            <label className="text-xs text-slate-300 font-normal block">
                              Cerca per Codice Microchip dell'animale:
                            </label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Inserisci il numero di microchip (es. 380...)"
                                value={filterMicrochip}
                                onChange={(e) => setFilterMicrochip(e.target.value)}
                                className="bg-slate-900 border-slate-700 h-10 text-xs text-white uppercase tracking-widest placeholder:text-slate-500 max-w-xl"
                              />
                              {filterMicrochip && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setFilterMicrochip("")}
                                  className="h-10 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-rose-400 font-normal text-xs rounded-lg"
                                >
                                  Cancella
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal italic">
                              Consente il rintracciamento immediato del fascicolo tramite l'anagrafe canina.
                            </p>
                          </div>
                        )}

                        {searchCriterion === "localita" && (
                          <div className="space-y-2 animate-fade-in">
                            <label className="text-xs text-slate-300 font-normal block">
                              Cerca per Località, Indirizzo o Comune di intervento:
                            </label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Inserisci via, comune o frazione (es. Massa, Marina di Carrara...)"
                                value={filterLocalita}
                                onChange={(e) => setFilterLocalita(e.target.value)}
                                className="bg-slate-900 border-slate-700 h-10 text-xs text-white uppercase tracking-wider placeholder:text-slate-500 max-w-xl"
                              />
                              {filterLocalita && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setFilterLocalita("")}
                                  className="h-10 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-rose-400 font-normal text-xs rounded-lg"
                                >
                                  Cancella
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal italic">
                              Filtra le cartelle in base al luogo geografico in cui sono avvenuti i sopralluoghi.
                            </p>
                          </div>
                        )}

                        {searchCriterion === "specie" && (
                          <div className="space-y-2 animate-fade-in">
                            <label className="text-xs text-slate-300 font-normal block">
                              Cerca per Specie o Razza dell'animale:
                            </label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Inserisci specie o razza (es. Cane, Gatto, Cavallo, Pastore Tedesco...)"
                                value={filterSpecie}
                                onChange={(e) => setFilterSpecie(e.target.value)}
                                className="bg-slate-900 border-slate-700 h-10 text-xs text-white uppercase tracking-wider placeholder:text-slate-500 max-w-xl"
                              />
                              {filterSpecie && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setFilterSpecie("")}
                                  className="h-10 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-rose-400 font-normal text-xs rounded-lg"
                                >
                                  Cancella
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal italic">
                              Raggruppa le cartelle uniche relative a specifiche specie o razze segnalate.
                            </p>
                          </div>
                        )}

                        {searchCriterion === "verbale" && (
                          <div className="space-y-2 animate-fade-in">
                            <label className="text-xs text-slate-300 font-normal block">
                              Cerca per Numero Verbale di Sopralluogo Iniziale:
                            </label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Inserisci il numero del verbale d'origine (es. 12/2026...)"
                                value={filterNumeroVerbale}
                                onChange={(e) => setFilterNumeroVerbale(e.target.value)}
                                className="bg-slate-900 border-slate-700 h-10 text-xs text-white uppercase tracking-widest placeholder:text-slate-500 max-w-xl"
                              />
                              {filterNumeroVerbale && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setFilterNumeroVerbale("")}
                                  className="h-10 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-rose-400 font-normal text-xs rounded-lg"
                                >
                                  Cancella
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal italic">
                              Rintraccia direttamente la cartella digitando il numero univoco del verbale cartaceo o telematico.
                            </p>
                          </div>
                        )}

                        {searchCriterion === "generica" && (
                          <div className="space-y-2 animate-fade-in">
                            <label className="text-xs text-slate-300 font-normal block">
                              Ricerca Libera Generica (su tutti i campi contemporaneamente):
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1 max-w-xl">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  placeholder="Digita qualsiasi parola chiave..."
                                  value={dossierSearch}
                                  onChange={(e) => setDossierSearch(e.target.value)}
                                  className="bg-slate-900 border-slate-700 pl-10 h-10 text-xs text-white uppercase tracking-wider placeholder:text-slate-500"
                                />
                              </div>
                              {dossierSearch && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setDossierSearch("")}
                                  className="h-10 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-rose-400 font-normal text-xs rounded-lg"
                                >
                                  Cancella
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal italic">
                              Scansiona l'intero archivio per trovare corrispondenze di date, verbali, località e agenti.
                            </p>
                          </div>
                        )}

                      </div>

                      {/* Stato Attivo dei Filtri / Reset Globale */}
                      {(filterMicrochip || filterLocalita || filterSpecie || filterNumeroVerbale || dossierSearch) && (
                        <div className="flex items-center justify-between mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-[11px] text-indigo-400 font-normal uppercase tracking-wider flex items-center gap-1.5">
                            <span>⚡ Filtri Attivi:</span>
                            <span className="text-slate-200">
                              {[
                                filterMicrochip && "Microchip",
                                filterLocalita && "Località",
                                filterSpecie && "Specie",
                                filterNumeroVerbale && "N° Verbale",
                                dossierSearch && "Ricerca Libera"
                              ].filter(Boolean).join(", ")}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setFilterMicrochip("");
                              setFilterLocalita("");
                              setFilterSpecie("");
                              setFilterNumeroVerbale("");
                              setDossierSearch("");
                            }}
                            className="h-7 px-3 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/80 text-rose-200 font-normal text-[10px] uppercase rounded-lg transition-all"
                          >
                            Azzera Filtri
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stable key traditional-archive style table & Fullscreen detail view */}
                  {selectedDossierId === null ? (
                    <div className="w-full">
                      {(() => {
                        const dossiers = getDossiers().filter((d) => {
                          const r = d.root;

                          // ID Microchip filter
                          if (filterMicrochip.trim() !== "") {
                            const searchChip = filterMicrochip
                              .toLowerCase()
                              .trim();
                            const matchIniziali =
                              r.chips &&
                              r.chips.some((c) =>
                                (c.numero || "")
                                  .toLowerCase()
                                  .includes(searchChip),
                              );
                            const matchControlli =
                              d.followUps &&
                              d.followUps.some(
                                (f) =>
                                  f.chips &&
                                  f.chips.some((c) =>
                                    (c.numero || "")
                                      .toLowerCase()
                                      .includes(searchChip),
                                  ),
                              );
                            if (!matchIniziali && !matchControlli) return false;
                          }

                          // Località / Indirizzo filter
                          if (filterLocalita.trim() !== "") {
                            const searchLoc = filterLocalita
                              .toLowerCase()
                              .trim();
                            const matchIniziale =
                              (r.localita || "")
                                .toLowerCase()
                                .includes(searchLoc) ||
                              (r.recatPresso || "")
                                .toLowerCase()
                                .includes(searchLoc) ||
                              (r.comune || "")
                                .toLowerCase()
                                .includes(searchLoc);
                            const matchControlli =
                              d.followUps &&
                              d.followUps.some(
                                (f) =>
                                  (f.localita || "")
                                    .toLowerCase()
                                    .includes(searchLoc) ||
                                  (f.recatPresso || "")
                                    .toLowerCase()
                                    .includes(searchLoc) ||
                                  (f.comune || "")
                                    .toLowerCase()
                                    .includes(searchLoc),
                              );
                            if (!matchIniziale && !matchControlli) return false;
                          }

                          // Specie / Razza filter
                          if (filterSpecie.trim() !== "") {
                            const searchSpecie = filterSpecie
                              .toLowerCase()
                              .trim();
                            const matchIniziale = (r.tipoAnimale || "")
                              .toLowerCase()
                              .includes(searchSpecie);
                            const matchControlli =
                              d.followUps &&
                              d.followUps.some((f) =>
                                (f.tipoAnimale || "")
                                  .toLowerCase()
                                  .includes(searchSpecie),
                              );
                            if (!matchIniziale && !matchControlli) return false;
                          }

                          // Numero Verbale Iniziale filter
                          if (filterNumeroVerbale.trim() !== "") {
                            const searchVerb = filterNumeroVerbale
                              .toLowerCase()
                              .trim();
                            const matchVerb = (r.numeroVerbale || "")
                              .toLowerCase()
                              .includes(searchVerb);
                            if (!matchVerb) return false;
                          }

                          // General search filter if active
                          if (dossierSearch.trim() !== "") {
                            const term = dossierSearch.toLowerCase().trim();
                            const matchIniziale = (r.numeroVerbale || "")
                              .toLowerCase()
                              .includes(term);
                            const matchLocalita =
                              (r.localita || "").toLowerCase().includes(term) ||
                              (r.comune || "").toLowerCase().includes(term);
                            const matchSottoSettore = (r.tipoAnimale || "")
                              .toLowerCase()
                              .includes(term);
                            const matchChipsIniziali =
                              r.chips &&
                              r.chips.some((c) =>
                                (c.numero || "").toLowerCase().includes(term),
                              );
                            const matchChipsControlli =
                              d.followUps &&
                              d.followUps.some(
                                (f) =>
                                  f.chips &&
                                  f.chips.some((c) =>
                                    (c.numero || "")
                                      .toLowerCase()
                                      .includes(term),
                                  ),
                              );
                            const matchDateRoot = (r.data || "")
                              .toLowerCase()
                              .includes(term);
                            const matchDateFollowUps =
                              d.followUps &&
                              d.followUps.some((f) =>
                                (f.data || "").toLowerCase().includes(term),
                              );
                            const matchGuardRoot =
                              (r.creatoDaNome || "")
                                .toLowerCase()
                                .includes(term) ||
                              (r.verbalizzanti || "")
                                .toLowerCase()
                                .includes(term);
                            const matchGuardFollowUps =
                              d.followUps &&
                              d.followUps.some(
                                (f) =>
                                  (f.creatoDaNome || "")
                                    .toLowerCase()
                                    .includes(term) ||
                                  (f.verbalizzanti || "")
                                    .toLowerCase()
                                    .includes(term),
                              );

                            if (
                              !(
                                matchIniziale ||
                                matchLocalita ||
                                matchSottoSettore ||
                                matchChipsIniziali ||
                                matchChipsControlli ||
                                matchDateRoot ||
                                matchDateFollowUps ||
                                matchGuardRoot ||
                                matchGuardFollowUps
                              )
                            ) {
                              return false;
                            }
                          }

                          return true;
                        });

                        if (dossiers.length === 0) {
                          return (
                            <div className="py-20 bg-slate-950/40 rounded-3xl border border-slate-900 border-dashed flex flex-col items-center justify-center opacity-40 text-slate-400">
                              <FolderOpen className="h-12 w-12 mb-4 animate-bounce" />
                              <p className="font-normal italic uppercase tracking-[0.2em] text-sm text-slate-400 text-center py-5">
                                Nessun Fascicolo / Cartella Unica corrispondente
                                ai filtri
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-[#090d16] overflow-hidden rounded-2xl shadow-xl">
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
                              <Table>
                                <TableHeader className="bg-slate-900/40">
                                  <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px] py-4 pl-6">
                                      N° Verbale Iniziale
                                    </TableHead>
                                    <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                      Specie / Razza
                                    </TableHead>
                                    <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                      Località / Comune
                                    </TableHead>
                                    <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                      Codice Microchip
                                    </TableHead>
                                    <TableHead className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                      Stato Fascicolo
                                    </TableHead>
                                    <TableHead className="text-slate-200 font-bold uppercase tracking-wider text-[10px] text-right pr-4 sticky right-0 bg-[#0f172a] border-l border-slate-800 shadow-[-8px_0_12px_-3px_rgba(0,0,0,0.5)] z-20 min-w-[220px]">
                                      Azioni Cartella
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {dossiers.map((dossier) => {
                                    const root = dossier.root;
                                    const followUps = dossier.followUps || [];
                                    const isExpired =
                                      root.giorniRegolarizzazione &&
                                      followUps.length === 0;

                                    // Collect unique microchips
                                    const allChips: string[] = [];
                                    if (root.chips) {
                                      root.chips.forEach((c) => {
                                        if (
                                          c.numero &&
                                          !allChips.includes(c.numero)
                                        )
                                          allChips.push(c.numero);
                                      });
                                    }
                                    followUps.forEach((f) => {
                                      if (f.chips) {
                                        f.chips.forEach((c) => {
                                          if (
                                            c.numero &&
                                            !allChips.includes(c.numero)
                                          )
                                            allChips.push(c.numero);
                                        });
                                      }
                                    });

                                    return (
                                      <TableRow
                                        key={dossier.id}
                                        onClick={() => {
                                          setSelectedDossierId(dossier.id);
                                        }}
                                        className="group border-slate-900 hover:bg-slate-900/40 transition-colors cursor-pointer"
                                      >
                                        <TableCell className="font-mono text-purple-400 font-bold pl-6 text-xs whitespace-nowrap">
                                          {root.numeroVerbale ||
                                            "N° " +
                                              root.id
                                                .substring(0, 5)
                                                .toUpperCase()}
                                        </TableCell>
                                        <TableCell className="text-white text-xs whitespace-nowrap uppercase font-semibold">
                                          {root.tipoAnimale || "Animale N.D."}
                                        </TableCell>
                                        <TableCell className="text-white text-xs whitespace-nowrap uppercase">
                                          {root.localita || "GENERICA"} (
                                          {root.comune || "MASSA"})
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate">
                                          {allChips.length === 0 ? (
                                            <span className="text-slate-500 font-mono text-[10px] italic">
                                              NESSUNO
                                            </span>
                                          ) : (
                                            <div className="flex flex-wrap gap-1">
                                              {allChips.map((c, idx) => (
                                                <span
                                                  key={idx}
                                                  className="font-mono text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-purple-300 border border-slate-850"
                                                >
                                                  {c}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                                            {root.dossierStato === "chiuso" ? (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap border-rose-800 text-rose-400 bg-rose-950/20"
                                              >
                                                🔒 CHIUSO
                                              </Badge>
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap border-emerald-800 text-emerald-400 bg-emerald-950/20"
                                              >
                                                🔓 APERTO
                                              </Badge>
                                            )}
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap",
                                                followUps.length > 0
                                                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                                                  : isExpired
                                                    ? "border-rose-500 text-rose-400 bg-rose-500/5 animate-pulse"
                                                    : "border-slate-500 text-slate-300 bg-slate-500/5",
                                              )}
                                            >
                                              {followUps.length > 0
                                                ? `✓ ACCORPATO (${followUps.length + 1}° CONTROLLI)`
                                                : isExpired
                                                  ? `⚠️ SCADUTO / DA ADEGUARE`
                                                  : "1° SOPRALLUOGO"}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell
                                          className="text-right pr-3 sticky right-0 bg-[#090d16] group-hover:bg-slate-900 border-l border-slate-800/80 shadow-[-8px_0_12px_-3px_rgba(0,0,0,0.5)] z-10"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex justify-end items-center gap-1.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 text-[9px] uppercase tracking-widest font-black text-purple-400 hover:text-white hover:bg-purple-650/10 flex items-center gap-1 px-3"
                                              onClick={() => {
                                                setSelectedDossierId(
                                                  dossier.id,
                                                );
                                              }}
                                              title="Apri Fascicolo"
                                            >
                                              <FolderOpen className="h-4 w-4" />
                                              Apri Cartella
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-emerald-400 hover:text-white"
                                              onClick={() =>
                                                handlePrintDossier(dossier)
                                              }
                                              title="Stampa Continuo A4"
                                            >
                                              <Printer className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            </div>
                          );
                        })()}
                    </div>
                  ) : (
                    /* Detail View in Total Screen mode (A Schermo Totale) */
                    (() => {
                      const dossier = getDossiers().find(
                        (d) => d.id === selectedDossierId,
                      );
                      if (!dossier) {
                        return (
                          <div className="p-12 text-center text-slate-400 italic bg-slate-950/40 rounded-2xl border border-slate-900 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                            <span>Aggiornamento del fascicolo in corso...</span>
                            <Button
                              onClick={() => setSelectedDossierId(null)}
                              variant="outline"
                              className="text-xs uppercase font-bold tracking-widest border-slate-800 hover:bg-slate-900"
                            >
                              Torna all'Elenco Cartelle Uniche
                            </Button>
                          </div>
                        );
                      }

                      const root = dossier.root;
                      const followUps = dossier.followUps || [];

                      // Aggregate all attachments from root report and all linked followUps!
                      const rootDbAttachments = dbAttachments
                        .filter((a) => a.reportId === root.id)
                        .map((a) => ({
                          ...a,
                          originReportId: root.id,
                          originReportName: "1° Sopralluogo",
                        }));
                      const followUpsDbAttachments = followUps.flatMap(
                        (f: any, fIdx: number) =>
                          dbAttachments
                            .filter((a) => a.reportId === f.id)
                            .map((a) => ({
                              ...a,
                              originReportId: f.id,
                              originReportName: `2° Sopralluogo #${fIdx + 1}`,
                            })),
                      );

                      const allAttachments = [
                        ...(root.attachments || []).map((a: any, idx: number) => ({
                          ...a,
                          id: a.id || `legacy-root-${idx}-${a.name || 'file'}`,
                          originReportId: root.id,
                          originReportName: "1° Sopralluogo",
                        })),
                        ...rootDbAttachments,
                        ...followUps.flatMap((f: any, fIdx: number) =>
                          (f.attachments || []).map((a: any, idx: number) => ({
                            ...a,
                            id: a.id || `legacy-fup-${fIdx}-${idx}-${a.name || 'file'}`,
                            originReportId: f.id,
                            originReportName: `2° Sopralluogo #${fIdx + 1}`,
                          })),
                        ),
                        ...followUpsDbAttachments,
                      ];

                      const parseEventDate = (val: any): Date => {
                        if (!val) return new Date();
                        if (typeof val.toDate === "function") return val.toDate();
                        if (val instanceof Date) return val;
                        if (val.seconds) return new Date(val.seconds * 1000);
                        const parsed = new Date(val);
                        if (!isNaN(parsed.getTime())) return parsed;
                        return new Date();
                      };

                      const getRootCreationDate = (r: any): Date => {
                        if (r.creatoAl) return parseEventDate(r.creatoAl);
                        if (r.data) {
                          const pts = r.data.split("/");
                          if (pts.length === 3) {
                            const year = parseInt(pts[2], 10);
                            const month = parseInt(pts[1], 10) - 1;
                            const day = parseInt(pts[0], 10);
                            let hour = 12, min = 0;
                            if (r.oraInizio) {
                              const tPts = r.oraInizio.split(":");
                              if (tPts.length >= 2) {
                                hour = parseInt(tPts[0], 10);
                                min = parseInt(tPts[1], 10);
                              }
                            }
                            return new Date(year, month, day, hour, min);
                          }
                        }
                        return new Date();
                      };

                      // Find candidate unlinked follow-up reports from same sector
                      const candidateFollowUps = reports.filter(
                        (r) =>
                          r.tipoVerbale === sectorTab &&
                          r.isFollowUp &&
                          (!r.parentReportId || r.parentReportId === "") &&
                          r.id !== root.id,
                      );

                      // Dynamic matching of "Richiesta d'Intervento" (Emergency Calls) to this dossier
                      const getLinkedEmergencyCall = () => {
                        if (!emergencyCalls) return null;
                        const rootLoc = (root.localita || "").toLowerCase().trim();
                        if (!rootLoc) return null;

                        return emergencyCalls.find((call) => {
                          const callLoc = (call.localita || "").toLowerCase().trim();
                          if (callLoc && (rootLoc.includes(callLoc) || callLoc.includes(rootLoc))) {
                            return true;
                          }
                          // Fallback GPS match
                          const rootAny = root as any;
                          if (call.lat && call.lng && rootAny.lat && rootAny.lng) {
                            const latDiff = Math.abs(call.lat - rootAny.lat);
                            const lngDiff = Math.abs(call.lng - rootAny.lng);
                            if (latDiff < 0.0015 && lngDiff < 0.0015) {
                              return true;
                            }
                          }
                          return false;
                        });
                      };

                      const linkedCall = getLinkedEmergencyCall();

                      return (
                        <div className="w-full flex flex-col gap-6">
                          {/* Back button and dossier header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <Button
                              onClick={() => setSelectedDossierId(null)}
                              className="h-10 text-xs font-black uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white rounded-xl gap-2 px-4 shadow-xl"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Torna all'Elenco Cartelle Uniche
                            </Button>

                             <div className="flex gap-2">
                              {(isAdmin || isResponsabile) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleDossierState(root)}
                                  className={cn(
                                    "text-[10px] uppercase tracking-widest font-extrabold h-10 px-4 rounded-xl shadow-xl flex items-center border transition-all",
                                    root.dossierStato === "chiuso"
                                      ? "bg-rose-950/40 border-rose-900/50 text-rose-350 hover:bg-rose-900/60 hover:text-white"
                                      : "bg-emerald-950/40 border-emerald-900/50 text-emerald-350 hover:bg-emerald-900/60 hover:text-white"
                                  )}
                                >
                                  {root.dossierStato === "chiuso" ? "🔓 Riapri Fascicolo" : "🔒 Chiudi / Archivia"}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintDossier(dossier)}
                                className="text-[10px] uppercase tracking-widest font-extrabold h-10 bg-slate-950/80 border-slate-800 hover:bg-slate-900 text-white px-4 rounded-xl shadow-xl flex items-center"
                              >
                                <Printer className="h-3.5 w-3.5 mr-1.5" />
                                Stampa Continuo A4
                              </Button>
                            </div>
                          </div>

                          <Card className="bg-[#0f172a] border-slate-800 rounded-3xl shadow-xl overflow-hidden w-full">
                            {/* Detail Header area */}
                            <div className="p-6 border-b border-slate-900 bg-slate-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className="bg-orange-600 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded">
                                    Vigilanza {root.tipoVerbale}
                                  </Badge>
                                  <span className="font-mono text-slate-400 text-xs font-black mr-1">
                                    N°{" "}
                                    {root.numeroVerbale || "Dossier " + root.id}
                                  </span>
                                  {root.dossierStato === "chiuso" ? (
                                    <Badge className="bg-rose-950 text-rose-400 border border-rose-800 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded">
                                      🔒 Chiuso
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded animate-pulse">
                                      🔓 Aperto
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-xl font-normal italic uppercase tracking-widest text-purple-400">
                                  Dossier Unificato Intervento (Schermo Totale)
                                </CardTitle>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedDossierId(null)}
                                  className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>

                            {/* Dossier Body area */}
                            <CardContent className="p-6 space-y-6">
                              {/* Stable Metadata info cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                                    Frazione / Località
                                  </span>
                                  <span className="text-xs font-semibold text-white uppercase block leading-tight">
                                    {root.localita || "Non specificata"},{" "}
                                    {root.comune || "N.D."}
                                  </span>
                                </div>
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                                    Qualifica & Consenso
                                  </span>
                                  <div className="text-xs font-semibold text-white uppercase block leading-tight">
                                    <div className="text-amber-400 font-bold">
                                      {(root.proprietarioPossessore || "N.D.").toUpperCase()}
                                    </div>
                                    <div className={`text-[10px] font-bold ${root.esito === 'consenso' ? 'text-emerald-400' : root.esito === 'rifiuto' ? 'text-red-400' : 'text-slate-400'}`}>
                                      {root.esito === 'consenso' ? 'CONSENSO PRESTATO ✓' : root.esito === 'rifiuto' ? 'NEGATO / DINIEGO ✗' : 'N.D.'}
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                                    Presente al Sopralluogo
                                  </span>
                                  <span className="text-xs font-semibold text-white uppercase block leading-tight">
                                    {root.soggettoNome || "Generico / Sconosciuto"}
                                    {root.soggettoResidenteA && (
                                      <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                                        Residente a: {root.soggettoResidenteA}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                                    Specie e Razza Rilevata
                                  </span>
                                  <span className="text-xs font-semibold text-white uppercase block leading-tight">
                                    {root.tipoAnimale || "Non specificato"}
                                  </span>
                                </div>
                              </div>

                              {/* 5. RESOLUTION / OUTCOME OF THE DOSSIER */}
                              <div className="space-y-4 pt-4 border-t border-slate-900">
                                <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                                  Esito e Risoluzione Finale dell'Intervento
                                </h3>

                                <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-900 space-y-4 text-left">
                                  {/* Info and current resolution display */}
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Stato Risoluzione Attuale:</span>
                                      <div className="flex items-center gap-2">
                                        {!root.risoluzione ? (
                                          <Badge className="bg-slate-900 text-slate-400 border border-slate-800 text-[10.5px] uppercase font-black tracking-widest px-3 py-1 rounded-xl">
                                            ⚠️ DA ASSEGNARE / IN CORSO
                                          </Badge>
                                        ) : root.risoluzione === "risolto_telefonicamente" ? (
                                          <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10.5px] uppercase font-black tracking-widest px-3 py-1 rounded-xl">
                                            📞 RISOLTO TELEFONICAMENTE
                                          </Badge>
                                        ) : root.risoluzione === "archiviato_senza_sanzione" ? (
                                          <Badge className="bg-blue-950 text-blue-400 border border-blue-800 text-[10.5px] uppercase font-black tracking-widest px-3 py-1 rounded-xl">
                                            ✓ ARCHIVIATO SENZA SANZIONE
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-red-950 text-red-400 border border-red-800 text-[10.5px] uppercase font-black tracking-widest px-3 py-1 rounded-xl">
                                            ⚖️ SANZIONATO AMMINISTRATIVAMENTE
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {(isAdmin || isResponsabile) && (
                                      <p className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wide italic">
                                        Seleziona un esito definitivo per consolidare l'archiviazione del fascicolo.
                                      </p>
                                    )}
                                  </div>

                                  {/* Interactive Controls for Admins/Supervisors */}
                                  {(isAdmin || isResponsabile) ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {/* Option 1: Telefonicamente */}
                                      <button
                                        onClick={() => handleUpdateResolution(root, "risolto_telefonicamente")}
                                        className={cn(
                                          "p-4 rounded-xl border text-left transition-all active:scale-98 flex flex-col justify-between gap-2 h-28 cursor-pointer",
                                          root.risoluzione === "risolto_telefonicamente"
                                            ? "bg-emerald-950/30 border-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                                            : "bg-[#0b0f19] border-slate-900 text-slate-300 hover:border-slate-800 hover:bg-slate-950/40"
                                        )}
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Risolto Telefonicamente</span>
                                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${root.risoluzione === "risolto_telefonicamente" ? "border-emerald-500 bg-emerald-500" : "border-slate-700"}`}>
                                            {root.risoluzione === "risolto_telefonicamente" && <span className="text-[8px] text-[#0f172a]">✓</span>}
                                          </div>
                                        </div>
                                        <p className="text-[10.5px] text-slate-400 leading-snug font-normal">
                                          L'intervento è stato risolto con successo per le vie brevi (contatto telefonico, accordo verbale, chiarimento).
                                        </p>
                                      </button>

                                      {/* Option 2: Archiviato Senza Sanzione */}
                                      <button
                                        onClick={() => handleUpdateResolution(root, "archiviato_senza_sanzione")}
                                        className={cn(
                                          "p-4 rounded-xl border text-left transition-all active:scale-98 flex flex-col justify-between gap-2 h-28 cursor-pointer",
                                          root.risoluzione === "archiviato_senza_sanzione"
                                            ? "bg-blue-950/30 border-blue-500 text-white shadow-lg shadow-blue-950/40"
                                            : "bg-[#0b0f19] border-slate-900 text-slate-300 hover:border-slate-800 hover:bg-slate-950/40"
                                        )}
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Archiviato No Sanzione</span>
                                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${root.risoluzione === "archiviato_senza_sanzione" ? "border-blue-500 bg-blue-500" : "border-slate-700"}`}>
                                            {root.risoluzione === "archiviato_senza_sanzione" && <span className="text-[8px] text-[#0f172a]">✓</span>}
                                          </div>
                                        </div>
                                        <p className="text-[10.5px] text-slate-400 leading-snug font-normal">
                                          Il controllo è risultato regolare, oppure il soggetto ha adempiuto appieno alle prescrizioni imposte entro i termini.
                                        </p>
                                      </button>

                                      {/* Option 3: Sanzionato */}
                                      <button
                                        onClick={() => handleUpdateResolution(root, "sanzionato")}
                                        className={cn(
                                          "p-4 rounded-xl border text-left transition-all active:scale-98 flex flex-col justify-between gap-2 h-28 cursor-pointer",
                                          root.risoluzione === "sanzionato"
                                            ? "bg-red-950/30 border-red-500 text-white shadow-lg shadow-red-950/40"
                                            : "bg-[#0b0f19] border-slate-900 text-slate-300 hover:border-slate-800 hover:bg-slate-950/40"
                                        )}
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Sanzionato Amministrativamente</span>
                                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${root.risoluzione === "sanzionato" ? "border-red-500 bg-red-500" : "border-slate-700"}`}>
                                            {root.risoluzione === "sanzionato" && <span className="text-[8px] text-[#0f172a]">✓</span>}
                                          </div>
                                        </div>
                                        <p className="text-[10.5px] text-slate-400 leading-snug font-normal">
                                          È stata accertata una violazione di leggi o regolamenti con emissione di verbale di sanzione pecuniaria L. 689/81.
                                        </p>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 text-xs italic bg-[#0b0f19] p-3 rounded-lg border border-slate-900 font-normal">
                                      La modifica dell'esito della cartella di sopralluogo è riservata agli amministratori e responsabili di servizio della centrale HQ.
                                    </div>
                                  )}

                                  {/* Linked Sanctions List Display */}
                                  <div className="pt-3 border-t border-slate-900/60 space-y-2">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                                      Verbali di Sanzione L. 689/81 Collegati:
                                    </span>

                                    {(() => {
                                      const linkedSanctions = (sanctionReports || []).filter((s) => {
                                        const matchVerbale = s.numeroVerbale && root.numeroVerbale && s.numeroVerbale.trim() === root.numeroVerbale.trim();
                                        const matchSoggetto = s.soggettoNome && root.soggettoNome && s.soggettoNome.trim().toLowerCase() === root.soggettoNome.trim().toLowerCase();
                                        return matchVerbale || matchSoggetto;
                                      });

                                      if (linkedSanctions.length === 0) {
                                        return (
                                          <div className="text-[11px] text-slate-500 italic bg-slate-950/30 px-3 py-2.5 rounded-lg border border-slate-900/40 font-normal">
                                            Nessun verbale sanzionatorio L. 689/81 collegato trovato nell'archivio storico sanzioni.
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {linkedSanctions.map((s) => (
                                            <div key={s.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex justify-between items-center gap-3">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-black font-mono text-red-400">VERBALE N° {s.numeroVerbale || "N.D."}</span>
                                                  <Badge className="bg-red-950/60 text-red-400 text-[8px] border border-red-900/30 px-1.5 py-0 rounded font-bold">
                                                    L. 689/81
                                                  </Badge>
                                                </div>
                                                <p className="text-[11px] text-slate-300 font-bold uppercase">{s.soggettoNome}</p>
                                                <p className="text-[10px] text-slate-450 italic font-normal line-clamp-1">
                                                  Art. {s.trasgreditoArt} - {s.trasgreditoLeggeRegolamento}
                                                </p>
                                              </div>

                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <Button
                                                  onClick={() => setReadingSanctionReport(s)}
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-8 w-8 text-purple-400 hover:bg-purple-950/20"
                                                  title="Visualizza Verbale"
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  onClick={() => handlePrintSanction(s)}
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-8 w-8 text-emerald-400 hover:bg-emerald-950/20"
                                                  title="Stampa Verbale A4"
                                                >
                                                  <Printer className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Interactive Timeline of Inspections */}
                              <div className="space-y-4">
                                <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest">
                                  Cronologia Ispezioni
                                </h3>
                                <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
                                  {/* Element 0: Richiesta d'Intervento (Atto Iniziale) */}
                                  {linkedCall && (
                                    <div className="relative">
                                      <span className="absolute -left-[31px] top-0.5 bg-blue-600 h-4 w-4 rounded-full border-4 border-[#0f172a]" />
                                      <div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-white text-xs font-bold uppercase text-blue-400">
                                              📋 Richiesta d'Intervento (Atto Iniziale)
                                            </span>
                                            <span className="text-slate-400 font-mono text-[9px] font-bold tracking-wider">
                                              {linkedCall.createdAt ? new Date(linkedCall.createdAt).toLocaleDateString("it-IT") : "N.D."}
                                            </span>
                                          </div>
                                          <Badge className="bg-blue-950 text-blue-400 border border-blue-800 text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0 rounded">
                                            Prot. {linkedCall.protocolCode || "RI-N.D."}
                                          </Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 block font-semibold">
                                          Richiedente: {linkedCall.callerName} ({linkedCall.callerPhone || "N.D."}) • Settore: {linkedCall.sector?.toUpperCase() || "ZOOFILA"}
                                        </p>

                                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 mt-2 text-xs italic text-slate-350 leading-relaxed font-normal">
                                          "{linkedCall.description || "Nessuna descrizione."}"
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handlePrintRichiesta(linkedCall)}
                                            className="h-7 text-[8px] uppercase tracking-widest font-black text-blue-400 p-0 hover:bg-transparent flex items-center gap-1"
                                          >
                                            <Printer className="h-3.5 w-3.5" />
                                            Stampa Richiesta A4
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Element 1: 1st Sopralluogo */}
                                  <div className="relative">
                                    <span className="absolute -left-[31px] top-0.5 bg-purple-600 h-4 w-4 rounded-full border-4 border-[#0f172a]" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-xs font-bold uppercase">
                                          1° Sopralluogo (Verbale Iniziale)
                                        </span>
                                        <span className="text-slate-400 font-mono text-[9px] font-bold tracking-wider">
                                          {root.data || "N.D."}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 block font-semibold">
                                        Redatto da: {root.verbalizzanti} •
                                        Consenso al Controllo: {root.esito === 'consenso' ? 'PRESTATO ✓' : root.esito === 'rifiuto' ? 'NEGATO ✗' : 'N.D.'}
                                      </p>
                                      {root.giorniRegolarizzazione && (
                                        <Badge
                                          variant="outline"
                                          className="border-red-500/30 bg-red-500/5 text-red-400 text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded mt-1"
                                        >
                                          ⏱ Termine adeguamento:{" "}
                                          {root.giorniRegolarizzazione} Giorni
                                        </Badge>
                                      )}

                                      <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 mt-2 text-xs italic text-slate-300 leading-relaxed font-normal">
                                        "
                                        {root.constatazioni ||
                                          "Nessuna annotazione o prescrizione aggiuntiva."}
                                        "
                                      </div>

                                      <div className="mt-2.5 flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setSelectedReport(root)
                                          }
                                          className="h-7 text-[8px] uppercase tracking-widest font-black text-purple-400 p-0 hover:bg-transparent"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Apri Dettaglio Completo
                                        </Button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Element 2: Termine Legal warning if any */}
                                  {root.giorniRegolarizzazione && (
                                    <div className="relative">
                                      <span className="absolute -left-[30px] top-1 bg-amber-500 h-3.5 w-3.5 rounded-full border-2 border-[#0f172a]" />
                                      <div className="p-3 bg-amber-950/15 border border-amber-900/20 rounded-xl">
                                        <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wide">
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          Scadenza dei termini di adeguamento
                                        </div>
                                        <p className="text-[9px] text-slate-400 uppercase block mt-1">
                                          Scrutinio prescrizioni concesso dalla
                                          squadra accertatrice per regolarizzare
                                          lo stato di tenuta dell'animale.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Element 3: 2° Sopralluogo follow-ups */}
                                  {followUps.map((f, idx) => (
                                    <div key={f.id} className="relative">
                                      <span className="absolute -left-[31px] top-0.5 bg-emerald-600 h-4 w-4 rounded-full border-4 border-[#0f172a]" />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-white text-xs font-bold uppercase">
                                            2° Sopralluogo (Controllo di
                                            Verifica #{idx + 1})
                                          </span>
                                          <span className="text-slate-400 font-mono text-[9px] font-bold tracking-wider">
                                            {f.data || "N.D."}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 block font-semibold">
                                          Guardie Verificanti: {f.verbalizzanti}{" "}
                                          • Stato adempimenti:
                                          <span
                                            className={cn(
                                              "font-bold ml-1",
                                              f.esito === "consenso"
                                                ? "text-emerald-400"
                                                : "text-red-400",
                                            )}
                                          >
                                            {f.esito === "consenso"
                                              ? "REGOLARIZZATO ✓"
                                              : "INADEMPIENTE ❌"}
                                          </span>
                                        </p>

                                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 mt-2 text-xs italic text-slate-300 leading-relaxed font-normal">
                                          "
                                          {f.constatazioni ||
                                            "Non specificate."}
                                          "
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setSelectedReport(f)}
                                            className="h-7 text-[8px] uppercase tracking-widest font-black text-purple-400 p-0 hover:bg-transparent"
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Apri Dettaglio Completo
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Optional Fallback message if no follow up linked yet */}
                                  {followUps.length === 0 && (
                                    <div className="relative">
                                      <span className="absolute -left-[30px] top-1 bg-slate-800 h-3.5 w-3.5 rounded-full border-2 border-[#0f172a]" />
                                      <div className="p-4 bg-slate-950/40 border border-slate-800/40 border-dashed rounded-xl flex flex-col items-start gap-1 justify-center">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                          ⏱ In attesa di 2° sopralluogo /
                                          controllo
                                        </span>
                                        <p className="text-[9px] text-slate-500 uppercase leading-normal">
                                          Arruolare una squadra sul campo per
                                          eseguire la verifica delle
                                          prescrizioni, oppure associare
                                          manualmente un verbale compilato in
                                          precedenza da un'altra pattuglia.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Registro Cronologico Unificato & Tempistiche Allegati (PG Audit Trail) */}
                              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-900 mt-6 space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                  <div>
                                    <h3 className="text-slate-100 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-purple-400" />
                                      Registro Cronologico & Tempistiche Allegati (Audit Trail)
                                    </h3>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-1">
                                      Tracciamento temporale blindato per contestazioni legali (Dettaglio al secondo)
                                    </p>
                                  </div>

                                  <Button
                                    size="sm"
                                    onClick={() => handlePrintChronologyOnly(dossier, buildOnScreenChronologyForReport(root, followUps, allAttachments))}
                                    className="h-8 text-[9px] uppercase tracking-wider font-extrabold bg-slate-900 border border-slate-800 text-purple-300 hover:text-white rounded-lg flex items-center gap-1.5 px-3 shadow"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                    Stampa Solo Registro (A4)
                                  </Button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-900/60 bg-slate-950/60">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-900 text-[9px] uppercase tracking-wider text-slate-400 font-bold bg-slate-900/40">
                                        <th className="p-3 font-semibold">Data e Ora con Secondi</th>
                                        <th className="p-3 font-semibold">Evento / Attività Registrata</th>
                                        <th className="p-3 font-semibold">Operatore / Depositante</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900/40 text-[11px]">
                                      {buildOnScreenChronologyForReport(root, followUps, allAttachments).map((ev, eIdx) => (
                                        <tr key={eIdx} className="hover:bg-slate-900/20 transition-colors">
                                          <td className="p-3 font-mono text-[10.5px] text-slate-350 whitespace-nowrap">
                                            {format(ev.timestamp, "dd/MM/yyyy HH:mm:ss")}
                                          </td>
                                          <td className="p-3 text-slate-200">
                                            <span className="mr-2 text-xs">{ev.icon}</span>
                                            <span className="font-semibold text-slate-200">{ev.label}</span>
                                          </td>
                                          <td className="p-3 text-slate-400 font-mono text-[10px] uppercase">
                                            {ev.author || "Sistema HQ"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Sottosezione Associazione d'Ufficio (Admin/Responsabili option to link unlinked followUp reports) */}
                              {isAdmin && candidateFollowUps.length > 0 && (
                                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-900/60 mt-4">
                                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                                    <Link2 className="h-4 w-4 text-purple-500 animate-pulse" />
                                    Associazione d'Ufficio (HQ Amministrazione)
                                  </div>
                                  <p className="text-[9px] text-slate-400 uppercase leading-relaxed mb-3">
                                    Se un'altra squadra ha registrato
                                    separatamente il secondo sopralluogo della
                                    verifica senza associarlo, selezionalo di
                                    seguito per accorpare i verbali nella scheda
                                    d'intervento centralizzata.
                                  </p>

                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <select
                                      value={manualLinkTargetReportId}
                                      onChange={(e) =>
                                        setManualLinkTargetReportId(
                                          e.target.value,
                                        )
                                      }
                                      className="bg-slate-900 border border-slate-850 p-2 text-[10px] rounded-lg text-white font-mono uppercase tracking-wider flex-1"
                                    >
                                      <option value="">
                                        Seleziona un verbale di controllo...
                                      </option>
                                      {candidateFollowUps.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          N°{" "}
                                          {c.numeroVerbale ||
                                            c.id.substring(0, 5)}{" "}
                                          - {c.data || "N.D."} (di{" "}
                                          {getInitials(c.verbalizzanti)})
                                        </option>
                                      ))}
                                    </select>

                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        if (!manualLinkTargetReportId) {
                                          alert(
                                            "Per favore, seleziona una relazione di controllo valida.",
                                          );
                                          return;
                                        }
                                        if (
                                          window.confirm(
                                            "Associare ed unire il verbale di controllo selezionato a questa cartella unica d'intervento?",
                                          )
                                        ) {
                                          await handleLinkFollowUp(
                                            root.id,
                                            manualLinkTargetReportId,
                                          );
                                          setManualLinkTargetReportId("");
                                        }
                                      }}
                                      className="h-9 text-[9px] uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white font-bold"
                                    >
                                      Accorpa Ispezione
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Sezione Allegati Documentali e Prove Fotografiche */}
                              <div className="space-y-4 pt-3 border-t border-slate-900">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-slate-100 text-xs font-normal uppercase tracking-widest">
                                    Allegati Documentali e Prove Fotografiche
                                  </h3>
                                  <span className="text-xs font-mono text-slate-300 font-normal uppercase">
                                    {allAttachments.length} Caricati
                                  </span>
                                </div>

                                {/* Attachments List */}
                                {allAttachments.length === 0 ? (
                                  <div className="py-8 bg-slate-950/20 rounded-xl border border-slate-900/80 border-dashed flex flex-col items-center justify-center opacity-45">
                                    <FileUp className="h-7 w-7 text-slate-500 mb-1.5" />
                                    <span className="text-xs uppercase font-normal text-slate-400">
                                      Nessuna scannerizzazione o allegato in
                                      archivio
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col space-y-2">
                                    {allAttachments.map((att: any) => (
                                      <div key={att.id} className="flex flex-col space-y-2">
                                        <div className="relative bg-slate-950 px-4 py-3 rounded-lg border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-200">
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {att.type === "photo" ? (
                                              <Camera className="h-5 w-5 text-emerald-400 shrink-0" />
                                            ) : (
                                              <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                                            )}

                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-normal">
                                                <span
                                                  className="text-sm text-slate-100 uppercase tracking-wide truncate max-w-[280px] font-normal"
                                                  title={att.name}
                                                >
                                                  {att.name}
                                                </span>
                                                {att.originReportName && (
                                                  <span className="text-[10px] bg-purple-950/80 border border-purple-900/40 px-1.5 py-0.5 rounded text-purple-300 uppercase shrink-0 font-normal">
                                                    {att.originReportName}
                                                  </span>
                                                )}
                                                <span className="text-slate-400 font-normal whitespace-nowrap">
                                                  • Caricato il{" "}
                                                  {format(
                                                    new Date(att.uploadedAt),
                                                    "dd/MM/yyyy",
                                                  )}{" "}
                                                  da {att.uploadedBy}
                                                </span>
                                                {att.latitude &&
                                                  att.longitude && (
                                                    <span
                                                      className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-normal shrink-0"
                                                      title={`Geotag: ${att.latitude}, ${att.longitude}`}
                                                    >
                                                      📍 GEOTAG
                                                    </span>
                                                  )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Action buttons and confirmation */}
                                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                                            {att.isChunked &&
                                              !chunksCache[att.id]?.url && (
                                                <span className="text-xs text-purple-300 font-normal mr-1">
                                                  {chunksCache[att.id]?.loading
                                                    ? "Ricomposizione..."
                                                    : "Carica file"}
                                                </span>
                                              )}

                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleOpenAttachment(att)
                                              }
                                              className="h-8 px-3 text-xs uppercase tracking-wider bg-slate-900 border border-slate-800 hover:bg-purple-950/40 hover:border-purple-500/30 text-purple-300 rounded-lg flex items-center gap-1.5 transition-all font-normal"
                                            >
                                              {att.isChunked &&
                                              chunksCache[att.id]?.loading ? (
                                                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                                              ) : (
                                                <Eye className="h-3.5 w-3.5" />
                                              )}
                                              Apri
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDownloadAttachment(att)
                                              }
                                              className="h-8 px-3 text-xs uppercase tracking-wider bg-slate-900 border border-slate-800 hover:bg-emerald-950/40 hover:border-emerald-500/30 text-emerald-300 rounded-lg flex items-center gap-1.5 transition-all font-normal"
                                            >
                                              {att.isChunked &&
                                              chunksCache[att.id]?.loading ? (
                                                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                                              ) : (
                                                <Download className="h-3.5 w-3.5" />
                                              )}
                                              Scarica
                                            </button>

                                            {/* IA Expert Evaluation for Admins */}
                                            {isAdmin && att.type === "photo" && (
                                              <>
                                                {att.aiForensics ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => setExpandedAiEvaluationId(expandedAiEvaluationId === att.id ? null : att.id)}
                                                      className={`h-8 px-3 text-xs uppercase tracking-wider border rounded-lg flex items-center gap-1.5 transition-all font-normal ${
                                                        expandedAiEvaluationId === att.id
                                                          ? "bg-purple-600 border-purple-500 text-white hover:bg-purple-500 animate-pulse"
                                                          : "bg-purple-950/40 border-purple-800/80 hover:bg-purple-900/40 hover:border-purple-600/50 text-purple-200"
                                                      }`}
                                                      title="Mostra la valutazione multidisciplinare degli esperti virtuali AI"
                                                    >
                                                      <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                                                      {expandedAiEvaluationId === att.id ? "Nascondi IA" : "Vedi IA Esperti"}
                                                    </button>
                                                    
                                                    <button
                                                      type="button"
                                                      disabled={analyzingAttachmentId === att.id}
                                                      onClick={() => setShowNotesInputId(showNotesInputId === att.id ? null : att.id)}
                                                      className="h-8 w-8 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg flex items-center justify-center transition-all"
                                                      title="Rianalizza o aggiungi note"
                                                    >
                                                      <RefreshCw className={`h-3.5 w-3.5 ${analyzingAttachmentId === att.id ? "animate-spin text-purple-400" : ""}`} />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    disabled={analyzingAttachmentId === att.id}
                                                    onClick={() => setShowNotesInputId(showNotesInputId === att.id ? null : att.id)}
                                                    className="h-8 px-3 text-xs uppercase tracking-wider bg-purple-950 border border-purple-800 hover:bg-purple-900 hover:border-purple-600 text-purple-200 rounded-lg flex items-center gap-1.5 transition-all font-normal"
                                                    title="Richiedi analisi forense ed esperti veterinari virtuali AI"
                                                  >
                                                    {analyzingAttachmentId === att.id ? (
                                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                                                    ) : (
                                                      <Brain className="h-3.5 w-3.5 text-purple-400" />
                                                    )}
                                                    {analyzingAttachmentId === att.id ? "Analisi..." : "Valutazione AI"}
                                                  </button>
                                                )}
                                              </>
                                            )}

                                            {confirmDeleteId === att.id ? (
                                              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-850">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleDeleteAttachment(
                                                      att.originReportId ||
                                                        root.id,
                                                      att.id,
                                                    );
                                                    setConfirmDeleteId(null);
                                                  }}
                                                  className="text-white bg-rose-600 hover:bg-rose-500 text-xs px-2.5 py-1 rounded transition-colors font-normal animate-pulse"
                                                >
                                                  Rimuovi?
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setConfirmDeleteId(null)
                                                  }
                                                  className="text-slate-300 bg-slate-800 hover:bg-slate-750 text-xs px-2 py-1 rounded border border-slate-700 transition-colors font-normal"
                                                >
                                                  Annulla
                                                </button>
                                              </div>
                                            ) : (
                                              isAdmin && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setConfirmDeleteId(att.id)
                                                  }
                                                  className="text-rose-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-950/25 transition-colors"
                                                  title="Elimina permanentemente"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </button>
                                              )
                                            )}
                                          </div>
                                        </div>

                                        {/* Notes Input Panel */}
                                        {showNotesInputId === att.id && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-slate-950 p-4 rounded-lg border border-purple-900/40 space-y-3 text-left"
                                          >
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs uppercase font-semibold text-purple-300 tracking-wider flex items-center gap-1.5">
                                                <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
                                                Configurazione Analisi Esperti Virtuali AI
                                              </span>
                                              <button
                                                onClick={() => setShowNotesInputId(null)}
                                                className="text-slate-400 hover:text-slate-200 transition-colors"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                            
                                            <p className="text-[10px] uppercase text-slate-400 leading-normal">
                                              INSERISCI NOTE O INDIZI INVESTIGATIVI AGGIUNTIVI PER ORIENTARE IL POOL DI ESPERTI VIRTUALI (ES. SOSPETTO MALTRATTAMENTO, CONDIZIONI DELL'HABITAT, PRESENZA DI COLLARI VIETATI O FERITE PARTICOLARI):
                                            </p>
                                            
                                            <textarea
                                              value={aiNotes[att.id] || ""}
                                              onChange={(e) => setAiNotes({ ...aiNotes, [att.id]: e.target.value })}
                                              placeholder="Esempio: Il cane sembra bagnato e tenuto a catena corta. Sospetto reato art. 727 c.p. analizzare con cura lo stato del manto e la vegetazione per capire se è Alta Toscana..."
                                              className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-md p-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none h-16 resize-none transition-all font-normal"
                                            />
                                            
                                            <div className="flex justify-end gap-2">
                                              <button
                                                type="button"
                                                onClick={() => setShowNotesInputId(null)}
                                                className="h-8 px-3 text-[10px] uppercase tracking-wider bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition-all font-normal"
                                              >
                                                Annulla
                                              </button>
                                              <button
                                                type="button"
                                                disabled={analyzingAttachmentId === att.id}
                                                onClick={() => handleAnalyzeWithAi(att)}
                                                className="h-8 px-4 text-[10px] uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1.5 transition-all font-extrabold shadow-lg shadow-purple-950/20"
                                              >
                                                {analyzingAttachmentId === att.id ? (
                                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                  <Sparkles className="h-3.5 w-3.5" />
                                                )}
                                                {analyzingAttachmentId === att.id ? "Analisi in corso..." : "Avvia Consultazione AI"}
                                              </button>
                                            </div>
                                          </motion.div>
                                        )}

                                        {/* AI Forensic Evaluation Result Panel */}
                                        {expandedAiEvaluationId === att.id && att.aiForensics && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-slate-950 p-5 rounded-lg border border-purple-500/20 text-left space-y-4"
                                          >
                                            {/* Header */}
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                                              <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center">
                                                  <Brain className="h-4 w-4 text-purple-400" />
                                                </div>
                                                <div>
                                                  <span className="text-xs uppercase font-extrabold text-purple-300 tracking-wider block">
                                                    Valutazione Forense Multidisciplinare Integrata
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-normal uppercase">
                                                    Consultazione Telematica Virtuale Esperti AI
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {/* Mini actions inside result */}
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const printWindow = window.open("", "_blank");
                                                    if (!printWindow) {
                                                      alert("Abilita i popup nel browser per visualizzare la stampa!");
                                                      return;
                                                    }
                                                    const reportHtml = `
                                                      <html>
                                                        <head>
                                                          <title>Valutazione Forense AI - ${att.name}</title>
                                                          <style>
                                                            body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2cm; max-width: 800px; margin: 0 auto; color: #1e293b; line-height: 1.5; }
                                                            h1 { color: #6b21a8; font-size: 18pt; border-bottom: 2px solid #6b21a8; padding-bottom: 8px; text-transform: uppercase; margin-bottom: 20px; }
                                                            h2 { color: #475569; font-size: 11pt; text-transform: uppercase; margin-top: 15px; margin-bottom: 5px; }
                                                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
                                                            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                                                            th { background-color: #f8fafc; font-weight: bold; width: 30%; }
                                                            .disclaimer { font-size: 8pt; color: #b45309; border: 1px solid #fcd34d; background-color: #fffbeb; padding: 12px; border-radius: 6px; line-height: 1.4; margin-top: 30px; font-style: italic; }
                                                          </style>
                                                        </head>
                                                        <body>
                                                          <h1>🔬 Valutazione Forense Virtuale (Esperti AI)</h1>
                                                          <p><b>Allegato di riferimento:</b> ${att.name}<br/><b>Data Archiviazione:</b> ${new Date(att.uploadedAt).toLocaleString("it-IT")}</p>
                                                          
                                                          <h2>🩺 Sezione 1: Veterinario Forense</h2>
                                                          <table>
                                                            <tr><th>Stato Clinico Generale</th><td>${att.aiForensics.veterinary?.healthStatus || "N.D."}</td></tr>
                                                            <tr><th>Ferite o Lesioni Visibili</th><td>${att.aiForensics.veterinary?.injuries || "N.D."}</td></tr>
                                                            <tr><th>Segni di Malnutrizione</th><td>${att.aiForensics.veterinary?.malnutrition || "N.D."}</td></tr>
                                                            <tr><th>Evidenze d'Incuria/Abuso</th><td>${att.aiForensics.veterinary?.abuseEvidence || "N.D."}</td></tr>
                                                            <tr><th>Verdetto Clinico Visivo</th><td><b>${att.aiForensics.veterinary?.verdict || "N.D."}</b></td></tr>
                                                          </table>

                                                          <h2>⚖️ Sezione 2: Profilo Legale e Reati Ipotizzabili</h2>
                                                          <table>
                                                            <tr><th>Reati Ipotizzati</th><td>${att.aiForensics.legal?.crimesIdentified || "N.D."}</td></tr>
                                                            <tr><th>Normative e Articoli Applicabili</th><td>${att.aiForensics.legal?.applicableLaws || "N.D."}</td></tr>
                                                            <tr><th>Solidità della Prova Fotografica</th><td>${att.aiForensics.legal?.evidenceLevel || "N.D."}</td></tr>
                                                            <tr><th>Azioni Consigliate di PG</th><td>${att.aiForensics.legal?.prosecutionAction || "N.D."}</td></tr>
                                                          </table>

                                                          <h2>🌱 Sezione 3: Botanica e Caratterizzazione Ambientale</h2>
                                                          <table>
                                                            <tr><th>Flora Identificata</th><td>${att.aiForensics.botanical?.floraIdentified || "N.D."}</td></tr>
                                                            <tr><th>Suolo e Caratteristiche Habitat</th><td>${att.aiForensics.botanical?.soilAndHabitat || "N.D."}</td></tr>
                                                            <tr><th>Area Geografica Compatibile</th><td>${att.aiForensics.botanical?.geographicAreaEstimate || "N.D."}</td></tr>
                                                            <tr><th>Stima Stagionale Temporale</th><td>${att.aiForensics.botanical?.seasonEstimate || "N.D."}</td></tr>
                                                          </table>

                                                          <h2>☀️ Sezione 4: Climatologia e Ricostruzione Luce</h2>
                                                          <table>
                                                            <tr><th>Condizioni Atmosferiche Visibili</th><td>${att.aiForensics.weather?.estimatedConditions || "N.D."}</td></tr>
                                                            <tr><th>Temperatura stima ed Umidità</th><td>${att.aiForensics.weather?.reconstructedMeteo || "N.D."}</td></tr>
                                                            <tr><th>Fascia Oraria / Orientamento Luce</th><td>${att.aiForensics.weather?.lightingAndTimeOfDay || "N.D."}</td></tr>
                                                          </table>

                                                          <h2>📷 Sezione 5: Integrità Digitale ed EXIF Visivi</h2>
                                                          <table>
                                                            <tr><th>Integrità Digitale</th><td>${att.aiForensics.exif?.technicalNotes || "N.D."}</td></tr>
                                                            <tr><th>Datazione e Localizzazione EXIF</th><td>${att.aiForensics.exif?.dateTime || "N.D."} (GPS: ${att.aiForensics.exif?.gps || "N.D."})</td></tr>
                                                            <tr><th>Dispositivo di Scatto Stimato</th><td>${att.aiForensics.exif?.camera || "N.D."}</td></tr>
                                                          </table>

                                                          <p><b>Riassunto Forense Generale:</b> ${att.aiForensics.summary || "N.D."}</p>

                                                          <div class="disclaimer">
                                                            <b>AVVISO DI LIMITAZIONE / DISCLAIMER VIRTUAL-AI:</b> La presente valutazione è generata autonomamente da modelli avanzati di Intelligenza Artificiale per puro supporto analitico interno d'ufficio. Essendo un riscontro telematico e virtuale, non ha valore di perizia legale ufficiale né può essere abbinata ad una denuncia formale o riscontro di Polizia Giudiziaria senza previa validazione, ispezione sul campo e firma autografa di un medico veterinario o tecnico forense abilitato.
                                                          </div>
                                                        </body>
                                                      </html>
                                                    `;
                                                    printWindow.document.write(reportHtml);
                                                    printWindow.document.close();
                                                    printWindow.print();
                                                  }}
                                                  className="h-7 px-2.5 text-[10px] uppercase bg-slate-900 border border-slate-800 hover:bg-slate-800 text-purple-300 hover:text-white rounded flex items-center gap-1 transition-all"
                                                >
                                                  <Printer className="h-3 w-3" />
                                                  Stampa Report
                                                </button>
                                                <button
                                                  onClick={() => setExpandedAiEvaluationId(null)}
                                                  className="text-slate-400 hover:text-slate-200 transition-colors"
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                            
                                            {/* Summary */}
                                            <div className="bg-slate-900/60 border border-purple-950/40 p-3 rounded-lg text-xs leading-relaxed text-slate-300 italic">
                                              <span className="font-bold text-purple-400 block not-italic mb-1 text-[10px] uppercase tracking-wider">ABSTRACT GENERALE ED ESITO:</span>
                                              "{att.aiForensics.summary}"
                                            </div>

                                            {/* Bento Grid layout for 5 experts */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                              {/* 1. Veterinary */}
                                              {att.aiForensics.veterinary && (
                                                <div className="bg-slate-900/40 border border-purple-900/20 p-3.5 rounded-lg space-y-2 text-xs">
                                                  <span className="font-bold text-purple-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 border-b border-purple-950 pb-1 mb-1.5">
                                                    🩺 Veterinario Forense
                                                  </span>
                                                  <div className="space-y-1">
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Stato Salute:</strong> {att.aiForensics.veterinary.healthStatus}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Ferite/Lesioni:</strong> {att.aiForensics.veterinary.injuries}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Malnutrizione:</strong> {att.aiForensics.veterinary.malnutrition}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Incuria/Abusi:</strong> {att.aiForensics.veterinary.abuseEvidence}</p>
                                                    <p className="text-slate-300 bg-purple-950/20 border border-purple-900/30 p-1.5 rounded mt-2 text-[11px] font-semibold leading-relaxed">
                                                      👉 <span className="underline">Verdetto:</span> {att.aiForensics.veterinary.verdict}
                                                    </p>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 2. Legal */}
                                              {att.aiForensics.legal && (
                                                <div className="bg-slate-900/40 border border-blue-900/20 p-3.5 rounded-lg space-y-2 text-xs">
                                                  <span className="font-bold text-blue-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 border-b border-blue-950 pb-1 mb-1.5">
                                                    ⚖️ Profilo Legale & PG
                                                  </span>
                                                  <div className="space-y-1">
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Reati Ipotizzati:</strong> {att.aiForensics.legal.crimesIdentified}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Norme Applicabili:</strong> {att.aiForensics.legal.applicableLaws}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Solidità Probatoria:</strong> <span className="font-semibold text-blue-300">{att.aiForensics.legal.evidenceLevel}</span></p>
                                                    <p className="text-slate-300 bg-blue-950/20 border border-blue-900/30 p-1.5 rounded mt-2 text-[11px] font-semibold leading-relaxed">
                                                      📋 <span className="underline">Azioni PG:</span> {att.aiForensics.legal.prosecutionAction}
                                                    </p>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 3. Botanical */}
                                              {att.aiForensics.botanical && (
                                                <div className="bg-slate-900/40 border border-emerald-900/20 p-3.5 rounded-lg space-y-2 text-xs">
                                                  <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 border-b border-emerald-950 pb-1 mb-1.5">
                                                    🌱 Botanica & Flora
                                                  </span>
                                                  <div className="space-y-1">
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Flora Identificata:</strong> {att.aiForensics.botanical.floraIdentified}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Suolo e Habitat:</strong> {att.aiForensics.botanical.soilAndHabitat}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Stima Territorio:</strong> {att.aiForensics.botanical.geographicAreaEstimate}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Stagione Stima:</strong> {att.aiForensics.botanical.seasonEstimate}</p>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 4. Weather */}
                                              {att.aiForensics.weather && (
                                                <div className="bg-slate-900/40 border border-amber-900/20 p-3.5 rounded-lg space-y-2 text-xs">
                                                  <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 border-b border-amber-950 pb-1 mb-1.5">
                                                    ☀️ Meteo & Ricostruzione Luce
                                                  </span>
                                                  <div className="space-y-1">
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Atmosfera Visibile:</strong> {att.aiForensics.weather.estimatedConditions}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Temperatura stima:</strong> {att.aiForensics.weather.reconstructedMeteo}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Fascia Oraria/Luce:</strong> {att.aiForensics.weather.lightingAndTimeOfDay}</p>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 5. Exif Forensics */}
                                              {att.aiForensics.exif && (
                                                <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg space-y-2 text-xs">
                                                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-1.5">
                                                    📷 Fotoritocco & Digital Forensics
                                                  </span>
                                                  <div className="space-y-1">
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Integrità Foto:</strong> {att.aiForensics.exif.technicalNotes}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Datazione:</strong> {att.aiForensics.exif.dateTime}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">GPS Stima:</strong> {att.aiForensics.exif.gps}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-300 font-medium">Sensore/Device:</strong> {att.aiForensics.exif.camera}</p>
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Disclaimer alert */}
                                            <div className="border border-amber-900/60 bg-amber-950/20 p-3 rounded-lg text-amber-200/90 text-[10px] leading-relaxed font-normal">
                                              ⚠️ <b>AVVISO LIMITAZIONE IMPORTANTE (DISCLAIMER):</b> Questa analisi è generata autonomamente da un motore di Intelligenza Artificiale addestrato per finalità OSINT e veterinarie di supporto analitico interno d'ufficio. Trattandosi di riscontri digitali dedotti in modo telematico e puramente virtuale, non rivestono carattere di perizia legale certificata né possono essere associati tout-court a denunce, esposti o atti giudiziari formali senza un preventivo sopralluogo reale, riscontro clinico e firma autografa di un medico veterinario o tecnico forense iscritto all'albo.
                                            </div>
                                          </motion.div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Competenze Division area: Upload mechanisms (Guard & HQ Sede Split) */}
                                <div className="mt-4 pt-3 border-t border-slate-900">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-900">
                                    {/* Left column: Guardia sul Campo */}
                                    <div className="p-3.5 bg-emerald-950/10 rounded-lg border border-emerald-900/20 text-left">
                                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 mb-1">
                                        <Camera className="h-4 w-4 animate-pulse text-emerald-400" />{" "}
                                        📸 Guardia sul Campo: Invio Rapido Foto
                                        Documento
                                      </span>
                                      <p className="text-[8.5px] text-slate-400 uppercase leading-normal mb-3">
                                        Usa la fotocamera del tuo dispositivo
                                        per scattare una foto nitida del
                                        documento esibito (ASL, microchip,
                                        passaporto canino, ecc.) con Geotag
                                        automatico.
                                      </p>

                                      <div className="relative">
                                        {isUploadingAttachment ? (
                                          <div className="h-9 w-full bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center gap-2 text-purple-400 font-bold text-[10px] uppercase tracking-widest">
                                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />{" "}
                                            Caricamento in corso...
                                          </div>
                                        ) : (
                                          <>
                                            <Button
                                              variant="default"
                                              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                              onClick={() => {
                                                const inputEl =
                                                  document.getElementById(
                                                    `field-doc-capture-${root.id}`,
                                                  ) as HTMLInputElement;
                                                if (inputEl) {
                                                  inputEl.value = "";
                                                  inputEl.click();
                                                }
                                              }}
                                            >
                                              <Camera className="h-4 w-4" />{" "}
                                              Scatta Foto Documento (Geotag)
                                            </Button>
                                            <input
                                              type="file"
                                              id={`field-doc-capture-${root.id}`}
                                              className="hidden"
                                              accept="image/*"
                                              capture="environment"
                                              onChange={(e) => {
                                                handleFileChange(
                                                  e,
                                                  root.id,
                                                  "Foto Documento sul Campo (Guardia)",
                                                  "photo",
                                                );
                                              }}
                                            />
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right column: HQ Sede */}
                                    <div className="p-3.5 bg-purple-950/10 rounded-lg border border-purple-900/10 text-left">
                                      <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5 mb-1">
                                        <FolderOpen className="h-4 w-4 text-purple-400" />{" "}
                                        🏦 Sede HQ: Scannerizzazione Documenti
                                        (Amministratori)
                                      </span>
                                      <p className="text-[8.5px] text-slate-400 uppercase leading-normal mb-3">
                                        L'amministratore associa le iscrizioni
                                        ufficiali ASL, i riscontri dei
                                        veterinari o i moduli digitalizzati
                                        direttamente a questa Cartella Unica.
                                      </p>
                                      <div className="space-y-2">
                                        {/* Quick-select grid */}
                                        <div className="grid grid-cols-2 gap-1.5 text-[8.5px]">
                                          {[
                                            {
                                              label: "Scansione Verbale Sopralluogo",
                                              icon: "📝",
                                            },
                                            {
                                              label: "Anagrafe Canina",
                                              icon: "🐕",
                                            },
                                            {
                                              label: "Certificato Medico",
                                              icon: "🩺",
                                            },
                                            {
                                              label: "Atti d'Indagine",
                                              icon: "🔍",
                                            },
                                          ].map((preset) => (
                                            <button
                                              key={preset.label}
                                              type="button"
                                              onClick={() => {
                                                setModalSuccessMessage(null);
                                                setModalErrorMessage(null);
                                                setIsModalProcessing(false);
                                                setUploadModalData({
                                                  isOpen: true,
                                                  reportId: root.id,
                                                  documentType: preset.label,
                                                });
                                              }}
                                              className="h-8 text-[8px] uppercase tracking-wider rounded-lg bg-slate-900 border border-slate-850 hover:border-purple-500/40 hover:bg-purple-950/20 text-slate-300 transition-all flex items-center justify-center gap-1 font-bold"
                                            >
                                              <span>{preset.icon}</span>
                                              <span className="truncate">
                                                {preset.label}
                                              </span>
                                            </button>
                                          ))}
                                        </div>

                                        {/* Manual custom label input */}
                                        <div className="flex gap-2 items-center bg-slate-900/60 p-1 rounded-xl border border-slate-850">
                                          <Input
                                            type="text"
                                            placeholder="Altro tipo di doc..."
                                            id={`hq-custom-doc-name-${root.id}`}
                                            className="h-8 text-[9px] bg-slate-950 border-slate-850 rounded text-white font-semibold flex-1"
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-[8px] uppercase font-bold bg-slate-800 border-slate-700 text-slate-350 hover:text-white shrink-0 px-3 rounded-lg"
                                            onClick={() => {
                                              const inputEl =
                                                document.getElementById(
                                                  `hq-custom-doc-name-${root.id}`,
                                                ) as HTMLInputElement;
                                              const customName =
                                                inputEl?.value?.trim();
                                              if (!customName) {
                                                alert(
                                                  "Specifica un nome personalizzato prima.",
                                                );
                                                return;
                                              }
                                              setModalSuccessMessage(null);
                                              setModalErrorMessage(null);
                                              setIsModalProcessing(false);
                                              setUploadModalData({
                                                isOpen: true,
                                                reportId: root.id,
                                                documentType: customName,
                                              });
                                              if (inputEl) inputEl.value = "";
                                            }}
                                          >
                                            Carica
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* REGISTRO CRONOLOGICO DEGLI EVENTI (AUDIT TRAIL) */}
                                <div className="space-y-4 pt-5 border-t border-slate-900 mt-6 text-left">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-slate-100 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                      <Activity className="h-4 w-4 text-purple-400 animate-pulse" />
                                      Registro Cronologico degli Eventi (Audit Trail del Fascicolo)
                                    </h3>
                                    <Badge className="bg-purple-950/80 text-purple-400 border border-purple-800 text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded">
                                      PC-Time Certificato
                                    </Badge>
                                  </div>

                                  <div className="bg-slate-950/50 rounded-2xl border border-slate-900 overflow-hidden">
                                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="border-b border-slate-900 bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[8.5px] font-bold">
                                            <th className="p-3 w-[20%]">Data e Ora</th>
                                            <th className="p-3 w-[60%] font-bold">Evento / Attività Rilevata</th>
                                            <th className="p-3 w-[20%]">Operatore Responsabile</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-900/60 font-medium">
                                          {(() => {
                                            const events: { timestamp: Date; label: string; icon: string; author?: string }[] = [];

                                            // 1. Root Report Creation
                                            const rDate = getRootCreationDate(root);
                                            events.push({
                                              timestamp: rDate,
                                              label: `Apertura Fascicolo (1° Sopralluogo - Verbale Iniziale N° ${root.numeroVerbale || 'N.D.'})`,
                                              icon: "📋",
                                              author: root.creatoDaNome || root.verbalizzanti || "Sede HQ",
                                            });

                                            // 2. Attachments
                                            allAttachments.forEach((a) => {
                                              let date = a.uploadedAt ? new Date(a.uploadedAt) : new Date();
                                              events.push({
                                                timestamp: date,
                                                label: `Inserimento Allegato: "${a.name}" (${a.type === 'photo' ? 'Foto sul Campo' : 'Certificato/Documento'})`,
                                                icon: "📎",
                                                author: a.uploadedBy || "Sede HQ",
                                              });
                                            });

                                            // 3. Follow-Ups
                                            followUps.forEach((f: any, fIdx: number) => {
                                              let fDate = f.creatoAl ? parseEventDate(f.creatoAl) : null;
                                              if (!fDate && f.data) {
                                                const pts = f.data.split("/");
                                                if (pts.length === 3) {
                                                  const year = parseInt(pts[2], 10);
                                                  const month = parseInt(pts[1], 10) - 1;
                                                  const day = parseInt(pts[0], 10);
                                                  let hour = 12, min = 0;
                                                  if (f.oraInizio) {
                                                    const tPts = f.oraInizio.split(":");
                                                    if (tPts.length >= 2) {
                                                      hour = parseInt(tPts[0], 10);
                                                      min = parseInt(tPts[1], 10);
                                                    }
                                                  }
                                                  fDate = new Date(year, month, day, hour, min);
                                                }
                                              }
                                              if (!fDate) fDate = new Date();

                                              events.push({
                                                timestamp: fDate,
                                                label: `Inserimento 2° Sopralluogo (Verifica N° ${f.numeroVerbale || fIdx + 1}) - Esito: ${f.esito === 'consenso' ? 'REGOLARIZZATO ✓' : 'INADEMPIENTE ✗'}`,
                                                icon: "⏱",
                                                author: f.creatoDaNome || f.verbalizzanti || "Sede HQ",
                                              });
                                            });

                                            // 4. Closing
                                            if (root.dossierStato === 'chiuso') {
                                              const closeDate = root.dossierChiusoAl ? new Date(root.dossierChiusoAl) : new Date();
                                              events.push({
                                                timestamp: closeDate,
                                                label: "Fine Aggiornamento / Chiusura e Archiviazione definitiva del Fascicolo",
                                                icon: "🔒",
                                                author: root.dossierChiusoDa || "Amministratore",
                                              });
                                            }

                                            // Sort chronologically
                                            events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                                            if (events.length === 0) {
                                              return (
                                                <tr>
                                                  <td colSpan={3} className="p-4 text-center text-slate-500 italic">
                                                    Nessun evento registrato.
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            return events.map((e, idx) => (
                                              <tr key={idx} className="hover:bg-slate-900/35 transition-colors text-slate-300">
                                                <td className="p-3 font-mono text-[10px] text-slate-400">
                                                  {format(e.timestamp, "dd/MM/yyyy HH:mm")}
                                                </td>
                                                <td className="p-3">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm shrink-0">{e.icon}</span>
                                                    <span className="uppercase text-[9.5px] tracking-wide font-bold text-slate-200">
                                                      {e.label}
                                                    </span>
                                                  </div>
                                                </td>
                                                <td className="p-3 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                                                  {e.author}
                                                </td>
                                              </tr>
                                            ));
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
              {(isAdmin || isResponsabile) && viewMode === "map" && (
                <div className="w-full flex flex-col gap-4">
                  <Card className="bg-[#0f172a] border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[680px] shadow-2xl relative">
                    <CardHeader className="p-4 border-b border-slate-900 bg-slate-950/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-bold italic tracking-widest text-purple-400 uppercase flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                            Mappa Interventi HQ
                          </CardTitle>
                          <CardDescription className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                            Georeferenziazione verbali eseguiti
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 relative flex flex-col overflow-hidden">
                      {/* Territory Selectors */}
                      <div className="bg-slate-950/65 p-2 flex flex-wrap gap-1 border-b border-slate-900 select-none shrink-0">
                        <Button
                          variant={
                            mapFocusArea === "carrara" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setMapCenter([44.0793, 10.0971]);
                            setMapZoom(13);
                            setMapFocusArea("carrara");
                          }}
                          className={cn(
                            "h-7 text-[8px] uppercase tracking-wider font-extrabold flex-1 rounded-lg px-1 sm:px-2",
                            mapFocusArea === "carrara"
                              ? "bg-purple-600 text-white border-purple-500 hover:bg-purple-500 hover:text-white"
                              : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900",
                          )}
                        >
                          Carrara
                        </Button>
                        <Button
                          variant={
                            mapFocusArea === "massa" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setMapCenter([44.0356, 10.1411]);
                            setMapZoom(13);
                            setMapFocusArea("massa");
                          }}
                          className={cn(
                            "h-7 text-[8px] uppercase tracking-wider font-extrabold flex-1 rounded-lg px-1 sm:px-2",
                            mapFocusArea === "massa"
                              ? "bg-purple-600 text-white border-purple-500 hover:bg-purple-500 hover:text-white"
                              : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900",
                          )}
                        >
                          Massa
                        </Button>
                        <Button
                          variant={
                            mapFocusArea === "lunigiana" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setMapCenter([44.3, 9.95]);
                            setMapZoom(11);
                            setMapFocusArea("lunigiana");
                          }}
                          className={cn(
                            "h-7 text-[8px] uppercase tracking-wider font-extrabold flex-1 rounded-lg px-1 sm:px-2",
                            mapFocusArea === "lunigiana"
                              ? "bg-purple-600 text-white border-purple-500 hover:bg-purple-500 hover:text-white"
                              : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900",
                          )}
                        >
                          Lunigiana
                        </Button>
                        <Button
                          variant={
                            mapFocusArea === "all" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setMapCenter([44.15, 10.05]);
                            setMapZoom(10);
                            setMapFocusArea("all");
                          }}
                          className={cn(
                            "h-7 text-[8px] uppercase tracking-wider font-extrabold rounded-lg px-2",
                            mapFocusArea === "all"
                              ? "bg-purple-600 text-white border-purple-500 hover:bg-purple-500 hover:text-white"
                              : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900",
                          )}
                        >
                          Tutti
                        </Button>
                      </div>

                      {/* Toggle: Show Only Current Sector vs Show All Sectors & Map Style Selection */}
                      <div className="bg-slate-950/20 px-3 py-1.5 border-b border-slate-900 flex flex-col [@media(min-width:380px)]:flex-row gap-2 justify-between items-start [@media(min-width:380px)]:items-center text-[9px] select-none shrink-0 border-t border-slate-900/40">
                        <div className="flex items-center gap-2">
                          <span className="uppercase text-slate-400 font-bold tracking-wider">
                            Tutti i settori:
                          </span>
                          <button
                            onClick={() =>
                              setShowAllSectorsOnMap(!showAllSectorsOnMap)
                            }
                            className={cn(
                              "w-[34px] h-4 rounded-full p-0.5 transition-colors focus:outline-none",
                              showAllSectorsOnMap
                                ? "bg-purple-600"
                                : "bg-slate-800",
                            )}
                          >
                            <div
                              className={cn(
                                "w-3 h-3 rounded-full bg-white transition-transform duration-200",
                                showAllSectorsOnMap
                                  ? "translate-x-[18px]"
                                  : "translate-x-0",
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-900 gap-0.5 shrink-0 self-stretch [@media(min-width:380px)]:self-auto justify-center">
                          <button
                            onClick={() => setMapStyle("stradale")}
                            className={cn(
                              "px-2 px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider text-[7px] font-sans transition-all",
                              mapStyle === "stradale"
                                ? "bg-purple-600 text-white"
                                : "text-slate-500 hover:text-slate-300",
                            )}
                          >
                            Mappa Stradale
                          </button>
                          <button
                            onClick={() => setMapStyle("scura")}
                            className={cn(
                              "px-2 px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider text-[7px] font-sans transition-all",
                              mapStyle === "scura"
                                ? "bg-purple-600 text-white"
                                : "text-slate-500 hover:text-slate-300",
                            )}
                          >
                            Mappa Scura
                          </button>
                        </div>
                      </div>

                      {/* Map Window */}
                      <div className="flex-1 relative w-full h-full min-h-[300px]">
                        <MapContainer
                          center={mapCenter}
                          zoom={mapZoom}
                          minZoom={3}
                          zoomControl={false}
                          className="w-full h-full z-10"
                        >
                          <TileLayer
                            attribution={
                              mapStyle === "scura"
                                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            }
                            url={
                              mapStyle === "scura"
                                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            }
                            referrerPolicy="no-referrer"
                          />

                          <MapFocusController
                            center={mapCenter}
                            zoom={mapZoom}
                          />
                          <MapResizeTrigger
                            watch={`${showAllSectorsOnMap}-${mapFocusArea}`}
                          />

                          {reports
                            .filter((r) => {
                              const matchesDate =
                                !reportsDateFilter ||
                                r.data === reportsDateFilter;
                              const matchesSearch =
                                !reportsSearch ||
                                (r.numeroVerbale || "")
                                  .toLowerCase()
                                  .includes(reportsSearch.toLowerCase()) ||
                                (r.soggettoNome || "")
                                  .toLowerCase()
                                  .includes(reportsSearch.toLowerCase()) ||
                                (r.localita || "")
                                  .toLowerCase()
                                  .includes(reportsSearch.toLowerCase());

                              if (!matchesDate || !matchesSearch) return false;

                              // If filter sectors toggled
                              if (!showAllSectorsOnMap) {
                                return r.tipoVerbale === sectorTab;
                              }
                              return true;
                            })
                            .map((r) => {
                              const pos = getCoordinateForReport(r);
                              const formattedDate = r.data
                                ? getReportDateFormatted(r.data)
                                : "N.D.";
                              const isOldReport = isOlderThan60DaysLocal(
                                r.data,
                              );

                              let pulseColor = "#ea580c"; // zoofila
                              let sectorShort = "ZOOF";
                              if (r.tipoVerbale === "ittica") {
                                pulseColor = "#2563eb";
                                sectorShort = "ITT";
                              } else if (r.tipoVerbale === "venatoria") {
                                pulseColor = "#059669";
                                sectorShort = "VEN";
                              }

                              if (isOldReport) {
                                pulseColor = "#64748b"; // Neutral slate/gray
                                sectorShort = r.tipoVerbale
                                  ? r.tipoVerbale.substring(0, 4).toUpperCase()
                                  : "VERB";
                              }

                              return (
                                <Marker
                                  key={r.id}
                                  position={pos}
                                  icon={L.divIcon({
                                    className: "report-marker-icon",
                                    html: `
                                  <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                                    ${
                                      !isOldReport
                                        ? `
                                    <div style="
                                      position: absolute;
                                      width: 24px;
                                      height: 24px;
                                      background: ${pulseColor};
                                      opacity: 0.15;
                                      border-radius: 50%;
                                      animation: marker-pulse-ring-hq 2.5s infinite;
                                    "></div>
                                    `
                                        : ""
                                    }
                                    <div style="
                                      width: ${isOldReport ? "7px" : "10px"};
                                      height: ${isOldReport ? "7px" : "10px"};
                                      background: ${pulseColor};
                                      border: ${isOldReport ? "1px solid #94a3b8" : "2px solid white"};
                                      border-radius: 50%;
                                      ${!isOldReport ? `box-shadow: 0 0 10px ${pulseColor};` : "opacity: 0.5;"}
                                    "></div>
                                    ${
                                      !isOldReport
                                        ? `
                                    <style>
                                      @keyframes marker-pulse-ring-hq {
                                        0% { transform: scale(0.6); opacity: 0.6; }
                                        70% { transform: scale(2); opacity: 0; }
                                        100% { transform: scale(2); opacity: 0; }
                                      }
                                    </style>
                                    `
                                        : ""
                                    }
                                  </div>
                                `,
                                  })}
                                >
                                  <Popup className="custom-leaflet-popup">
                                    <div className="p-3 bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl font-sans min-w-[200px]">
                                      <div className="flex justify-between items-center mb-1">
                                        <span
                                          className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded text-white"
                                          style={{
                                            backgroundColor: pulseColor,
                                          }}
                                        >
                                          Vigilanza {sectorShort}
                                        </span>
                                        <span className="text-[10px] font-mono text-purple-400 font-bold">
                                          N° {r.numeroVerbale || "N.D."}
                                        </span>
                                      </div>
                                      <div className="my-2 border-t border-slate-900 pt-2 text-xs font-sans">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                          {formattedDate}
                                        </p>
                                        <p className="font-extrabold text-white uppercase text-xs truncate max-w-[180px]">
                                          {r.soggettoNome ||
                                            "Controllo Generico"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase italic truncate max-w-[180px]">
                                          {r.localita ||
                                            r.comune ||
                                            "Massa-Carrara"}
                                        </p>
                                      </div>

                                      <Button
                                        size="sm"
                                        onClick={() => setReadingReport(r)}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[9px] uppercase tracking-wider h-8 rounded-lg mt-2"
                                      >
                                        📂 APRI LETTURA A4
                                      </Button>
                                    </div>
                                  </Popup>
                                </Marker>
                              );
                            })}
                        </MapContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* SINGLE DETAILED POPUP FOR DIRECT ROW CONSULTING */}
            <Dialog
              open={!!selectedReport}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedReport(null);
                }
              }}
            >
              <DialogContent className="bg-slate-950 border-slate-800 text-white w-[95vw] sm:max-w-2xl">
                {selectedReport && (
                  <>
                    <DialogHeader>
                      <div className="flex justify-between items-center mb-1">
                        <Badge
                          className={cn(
                            "uppercase text-[10px] font-bold tracking-widest text-white border-none",
                            selectedReport.tipoVerbale === "zoofila"
                              ? "bg-orange-600 hover:bg-orange-600"
                              : selectedReport.tipoVerbale === "ittica"
                                ? "bg-blue-600 hover:bg-blue-600"
                                : "bg-emerald-600 hover:bg-emerald-600",
                          )}
                        >
                          Vigilanza {selectedReport.tipoVerbale}
                        </Badge>
                        <span className="text-xs font-mono text-slate-400 font-bold tracking-widest block">
                          N° {selectedReport.numeroVerbale || "N.D."}
                        </span>
                      </div>
                      <DialogTitle className="text-2xl font-normal italic uppercase tracking-widest text-purple-400">
                        Verbale di Sopralluogo
                      </DialogTitle>
                      <DialogDescription className="text-slate-400 uppercase font-normal text-[10px] tracking-wider mt-1 block">
                        Archiviato da {selectedReport.creatoDaNome || "N.D."} il{" "}
                        {selectedReport.creatoAl &&
                        typeof selectedReport.creatoAl.toDate === "function"
                          ? format(
                              selectedReport.creatoAl.toDate(),
                              "dd/MM/yyyy HH:mm",
                            )
                          : "N.D."}
                      </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] pr-4 mt-6">
                      <div className="space-y-6">
                        {/* STATO INTERVENTO E DISPOSIZIONI DATE */}
                        {(() => {
                          const info = getReportFollowUpInfo(selectedReport, reports);
                          return (
                            <div className={cn(
                              "p-4 rounded-2xl border flex flex-col gap-3",
                              info.isSecond 
                                ? "bg-amber-950/20 border-amber-500/40"
                                : info.isFollowUpDone
                                  ? "bg-emerald-950/20 border-emerald-500/40"
                                  : info.hasPrescriptions
                                    ? "bg-rose-950/20 border-rose-500/40"
                                    : "bg-slate-900 border-slate-800"
                            )}>
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn(
                                    "text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1",
                                    info.isSecond ? "bg-amber-600 text-white" : "bg-indigo-600 text-white"
                                  )}>
                                    {info.isSecond ? "2° Sopralluogo (Verifica Prescrizioni)" : "1° Sopralluogo (Iniziale)"}
                                  </Badge>
                                  {info.isSecond ? (
                                    <span className="text-xs font-bold text-amber-300">
                                      Verifica Ottemperanza Disposizioni
                                    </span>
                                  ) : info.isFollowUpDone ? (
                                    <span className="text-xs font-bold text-emerald-400">
                                      ✅ Intervento successivo ESEGUITO
                                    </span>
                                  ) : info.hasPrescriptions ? (
                                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                                      ⏳ 2° Intervento DA EFFETTUARE
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      Accertamento regolare / Nessun termine
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* DISPOSIZIONI E PRESCRIZIONI ASSEGNATE */}
                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
                                <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-1 flex items-center gap-1.5">
                                  <FileCheck className="h-3.5 w-3.5" />
                                  Disposizioni e Prescrizioni Formali:
                                </div>
                                {selectedReport.giorniRegolarizzazione && selectedReport.giorniRegolarizzazione > 0 ? (
                                  <div className="text-amber-300 font-bold mb-1">
                                    Termine concesso: {selectedReport.giorniRegolarizzazione} giorni per regolarizzare/adeguare.
                                  </div>
                                ) : (
                                  <div className="text-slate-400 italic mb-1">
                                    Nessun termine di regolarizzazione formale indicato.
                                  </div>
                                )}
                                <p className="text-slate-300 italic text-[11px] whitespace-pre-wrap">
                                  {selectedReport.constatazioni || "Nessuna specifica annotata."}
                                </p>
                              </div>

                              {/* COLLEGAMENTO AL VERBALE COMPLEMENTARE */}
                              {info.isSecond && info.parentReport && (
                                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                                  <div className="text-xs text-slate-300">
                                    <span className="text-slate-400 font-normal">Collegato a 1° Verbale: </span>
                                    <span className="font-bold text-indigo-300">N° {info.parentNumber} del {info.parentDate}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedReport(info.parentReport)}
                                    className="h-7 text-[10px] font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white"
                                  >
                                    Apri 1° Verbale
                                  </Button>
                                </div>
                              )}

                              {!info.isSecond && info.followUpReport && (
                                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                                  <div className="text-xs text-slate-300">
                                    <span className="text-slate-400 font-normal">2° Verbale di Verifica: </span>
                                    <span className="font-bold text-emerald-300">N° {info.followUpReport.numeroVerbale || "S.N."} del {info.followUpReport.data}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedReport(info.followUpReport!)}
                                    className="h-7 text-[10px] font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white"
                                  >
                                    Apri 2° Verbale
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <span className="text-xs uppercase font-normal text-slate-400 tracking-widest block mb-1">
                              Località
                            </span>
                            <span className="text-sm font-semibold text-white uppercase">
                              {selectedReport.localita || "N.D."},{" "}
                              {selectedReport.comune || ""} (
                              {selectedReport.provincia || ""})
                            </span>
                          </div>
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <span className="text-xs uppercase font-normal text-slate-400 tracking-widest block mb-1">
                              Orario
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {selectedReport.oraInizio || "--"} -{" "}
                              {selectedReport.oraFine || "--"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <span className="text-xs uppercase font-normal text-slate-400 tracking-widest block mb-1">
                              Soggetto Controllato
                            </span>
                            <span className="text-sm font-bold text-purple-400 uppercase">
                              {selectedReport.soggettoNome || "N.D."}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase block mt-1">
                              Nato a: {selectedReport.soggettoNatoA || "N.D."}{" "}
                              il {formatDateIT(selectedReport.soggettoIl) !== "---" ? formatDateIT(selectedReport.soggettoIl) : "N.D."}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase block">
                              Residente a:{" "}
                              {selectedReport.soggettoResidenteA || "N.D."}{" "}
                              {selectedReport.soggettoIndirizzo || ""}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <span className="text-xs uppercase font-normal text-slate-400 tracking-widest block mb-1">
                              Documento d'identità
                            </span>
                            <span className="text-sm font-semibold text-white uppercase">
                              {selectedReport.soggettoDocumentoTipo || "N.D."} -{" "}
                              {selectedReport.soggettoDocumentoNumero || "N.D."}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase block mt-1">
                              Scadenza:{" "}
                              {selectedReport.soggettoDocScadenza || "N.D."}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                          <span className="text-sm uppercase font-normal text-purple-400 tracking-widest block mb-3">
                            Costatazioni e descrizione fatti
                          </span>
                          <p className="text-sm leading-relaxed text-slate-300 font-medium whitespace-pre-wrap italic">
                            "
                            {selectedReport.constatazioni ||
                              "Nessuna annotazione particolare."}
                            "
                          </p>
                        </div>

                        {selectedReport.chips &&
                          selectedReport.chips.some((c) => c.numero) && (
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                              <span className="text-xs uppercase font-normal text-slate-400 tracking-widest block mb-3">
                                Microchip Rilevati
                              </span>
                              <div className="space-y-2">
                                {selectedReport.chips
                                  .filter((c) => c.numero)
                                  .map((c, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center bg-slate-1000 p-2.5 rounded-xl border border-slate-900 bg-slate-950"
                                    >
                                      <span className="text-xs font-mono text-purple-400 font-bold">
                                        {c.numero}
                                      </span>
                                      <span className="text-xs text-slate-350 uppercase">
                                        {c.nominativo || "Nessun Nominativo"}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                        {/* MAP OVERRIDE AND MULTI-LOCALITY CHOICE SECTION */}
                        {(isAdmin || isResponsabile) && (
                          <div className="bg-slate-900/60 p-4 rounded-3xl border border-slate-800 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-[11px] tracking-wider">
                                <MapPin className="h-4 w-4 text-purple-500 animate-pulse" />
                                <span>
                                  GEOFOCALIZZAZIONE E CORREZIONE MAPPA
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase border-purple-500/40 text-purple-300 font-normal"
                              >
                                {selectedReport.latitude &&
                                selectedReport.longitude
                                  ? "✏️ Personalizzato"
                                  : "🤖 Rilevato Automatizzato"}
                              </Badge>
                            </div>

                            <p className="text-[10px] text-slate-400">
                              Se l'indirizzo rilevato in automatico presenta
                              ambiguità (es. "Via Villafranca" a Carrara
                              posizionata erroneamente nel comune di Villafranca
                              in Lunigiana), seleziona la corretta frazione o
                              strada qui sotto per correggere in tempo reale la
                              sua posizione sulla mappa d'archivio.
                            </p>

                            {/* Custom street suggestions matching the text */}
                            {(() => {
                              const txt =
                                `${selectedReport.recatPresso} ${selectedReport.localita} ${selectedReport.soggettoIndirizzo} ${selectedReport.comune}`.toLowerCase();

                              // Look for candidates that match the text
                              const matchingCandidates =
                                CANDIDATE_STRADE.filter((s) => {
                                  // Match base name or common variants
                                  const baseName = s.name
                                    .toLowerCase()
                                    .split("(")[0]
                                    .trim();
                                  return (
                                    txt.includes(baseName) ||
                                    (txt.includes("villafranca") &&
                                      s.name.includes("Villafranca")) ||
                                    (txt.includes("via genova") &&
                                      s.name.includes("Marina di Carrara")) ||
                                    (txt.includes("via piave") &&
                                      s.name.includes("Stadio"))
                                  );
                                });

                              if (matchingCandidates.length > 0) {
                                return (
                                  <div className="space-y-2">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
                                      📍 Suggerimenti rilevati dal testo del
                                      verbale:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {matchingCandidates.map((c, i) => {
                                        const currentCoords =
                                          getCoordinateForReport(
                                            selectedReport,
                                          );
                                        // check if matches currentCoords exactly (within 0.001)
                                        const isSelected =
                                          Math.abs(currentCoords[0] - c.lat) <
                                            0.001 &&
                                          Math.abs(currentCoords[1] - c.lng) <
                                            0.001;
                                        return (
                                          <Button
                                            key={i}
                                            size="sm"
                                            variant={
                                              isSelected ? "default" : "outline"
                                            }
                                            onClick={async () => {
                                              try {
                                                const reportRef = doc(
                                                  db,
                                                  "reports",
                                                  selectedReport.id,
                                                );
                                                await updateDoc(reportRef, {
                                                  latitude: c.lat,
                                                  longitude: c.lng,
                                                });
                                                // update the local popup selection object to see changes immediately
                                                setSelectedReport({
                                                  ...selectedReport,
                                                  latitude: c.lat,
                                                  longitude: c.lng,
                                                });
                                              } catch (err) {
                                                console.error(
                                                  "Errore aggiornamento coordinate:",
                                                  err,
                                                );
                                              }
                                            }}
                                            className={cn(
                                              "text-[9px] px-3 py-1 bg-slate-950/80 border-slate-800 rounded-xl font-bold uppercase transition-all",
                                              isSelected
                                                ? "bg-purple-600 text-white hover:bg-purple-500 border-purple-500"
                                                : "text-slate-350 hover:text-white",
                                            )}
                                          >
                                            🚀 {c.name}
                                          </Button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Full selector grid */}
                            <div className="space-y-2 border-t border-slate-800/80 pt-3">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
                                🗺️ Scelta Alternativa Località o Frazione:
                              </span>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                {CANDIDATE_STRADE.map((c, i) => {
                                  const currentCoords =
                                    getCoordinateForReport(selectedReport);
                                  const isSelected =
                                    Math.abs(currentCoords[0] - c.lat) <
                                      0.001 &&
                                    Math.abs(currentCoords[1] - c.lng) < 0.001;
                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const reportRef = doc(
                                            db,
                                            "reports",
                                            selectedReport.id,
                                          );
                                          await updateDoc(reportRef, {
                                            latitude: c.lat,
                                            longitude: c.lng,
                                          });
                                          setSelectedReport({
                                            ...selectedReport,
                                            latitude: c.lat,
                                            longitude: c.lng,
                                          });
                                        } catch (err) {
                                          console.error(
                                            "Errore aggiornamento coordinate:",
                                            err,
                                          );
                                        }
                                      }}
                                      className={cn(
                                        "text-left px-2 py-1.5 rounded-lg text-[8px] font-bold uppercase border transition-all truncate font-sans",
                                        isSelected
                                          ? "bg-purple-600 border-purple-500 text-white"
                                          : "bg-slate-950 border-slate-900 text-slate-400 hover:text-white hover:border-slate-800",
                                      )}
                                    >
                                      {isSelected ? "🟢 " : ""} {c.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Manual option reset */}
                            {(selectedReport.latitude ||
                              selectedReport.longitude) && (
                              <div className="flex justify-end pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      const reportRef = doc(
                                        db,
                                        "reports",
                                        selectedReport.id,
                                      );
                                      await updateDoc(reportRef, {
                                        latitude: null,
                                        longitude: null,
                                      });
                                      setSelectedReport({
                                        ...selectedReport,
                                        latitude: undefined,
                                        longitude: undefined,
                                      });
                                    } catch (err) {
                                      console.error(
                                        "Errore reset coordinate:",
                                        err,
                                      );
                                    }
                                  }}
                                  className="text-[9px] hover:bg-red-950/20 text-red-400 uppercase font-extrabold h-7 px-2"
                                >
                                  🗑️ Ripristina Rilevamento Automatico
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedReport.firmaGuardia && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-2xl border border-slate-800 text-center">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1 tracking-widest">
                                Firma Guardia Verbalizzante
                              </span>
                              <img
                                src={selectedReport.firmaGuardia}
                                alt="Firma Guardia"
                                className="max-h-12 mx-auto"
                              />
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-slate-800 text-center">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1 tracking-widest">
                                Firma Trasgressore/Legale
                              </span>
                              {selectedReport.firmaTrasgressore ? (
                                <img
                                  src={selectedReport.firmaTrasgressore}
                                  alt="Firma Trasgressore"
                                  className="max-h-12 mx-auto"
                                />
                              ) : (
                                <span className="text-xs text-red-500 font-bold italic h-12 flex items-center justify-center uppercase">
                                  {selectedReport.rifiutaFirma
                                    ? "HA RIFIUTATO DI FIRMARE"
                                    : "NON FIRMATO"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs font-normal italic uppercase text-slate-550 tracking-widest text-slate-500">
                          <div className="h-px flex-1 bg-slate-900" />
                          Fine Documento
                          <div className="h-px flex-1 bg-slate-900" />
                        </div>
                      </div>
                    </ScrollArea>
                    <DialogFooter className="p-4 border-t border-white/5 bg-slate-950 flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => setReadingReport(selectedReport)}
                        className="flex-1 bg-yellow-650 hover:bg-yellow-600 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
                      >
                        <Eye className="h-4 w-4 mr-2" /> Lettura A4
                      </Button>
                      <Button
                        onClick={() => handlePrintVerbale(selectedReport)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
                      >
                        <Printer className="h-4 w-4 mr-2" /> Stampa
                      </Button>
                      <Button
                        onClick={() => generateVerbalePDF(selectedReport)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
                      >
                        <Download className="h-4 w-4 mr-2" /> Scarica
                      </Button>
                      <Button
                        onClick={() => {
                          setEmailDialogReport(selectedReport);
                          setToSede(true);
                          setSedeEmail("giulianodellapina@gmail.com");
                          setToControllato(
                            !!(selectedReport.soggettoEmail || "").trim(),
                          );
                          setControllatoEmail(
                            selectedReport.soggettoEmail || "",
                          );
                          setToGuard1(false);
                          setGuard1Email("");
                          setToGuard2(false);
                          setGuard2Email("");
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
                      >
                        <Mail className="h-4 w-4 mr-2" /> Invia Posta
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}

        {activeTab === "environmental" && (
          <Card className="bg-[#0f172a] border-slate-700 overflow-hidden rounded-3xl shadow-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/50">
                  <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs py-4">
                    Data
                  </TableHead>
                  <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                    Tipo
                  </TableHead>
                  <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                    Comune
                  </TableHead>
                  <TableHead className="text-right text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                    Azioni
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envReports
                  .sort(
                    (a, b) =>
                      (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
                  )
                  .map((report) => (
                    <TableRow
                      key={report.id}
                      className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell className="text-white font-normal">
                        {report.timestamp &&
                        typeof report.timestamp.toDate === "function"
                          ? format(report.timestamp.toDate(), "dd/MM/yyyy")
                          : "N/D"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize text-white border-slate-600 text-xs font-normal"
                        >
                          {report.type?.replace("_", " ") || "Altro"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {report.address || "N/D"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handlePrintEnvironmental(report)}
                            variant="ghost"
                            size="icon"
                            className="text-emerald-400 h-8 w-8"
                            title="Stampa Segnalazione A4"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>

                          <Dialog>
                            <DialogTrigger
                              nativeButton={true}
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-purple-400 h-8 w-8"
                                  title="Dettagli Segnalazione"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DialogContent className="bg-slate-950 border-slate-800 text-white w-[95vw] sm:max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-normal italic uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                  <span>Segnalazione Ambientale</span>
                                  <Badge className="bg-red-950/40 text-red-400 border border-red-900/30 uppercase text-[9px] font-bold">
                                    {report.type || "ALTRO"}
                                  </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 uppercase font-normal text-[10px] tracking-wider leading-none mt-1">
                                  Archivio Segnalazioni HQ • ID: {report.id}
                                </DialogDescription>
                              </DialogHeader>

                              <ScrollArea className="max-h-[60vh] pr-4 mt-4">
                                <div className="space-y-6">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                                        Località / Indirizzo
                                      </span>
                                      <span className="text-xs font-semibold text-white">
                                        {report.address || "N/D"}
                                      </span>
                                    </div>
                                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                                        Data e Ora
                                      </span>
                                      <span className="text-xs font-semibold text-white">
                                        {report.timestamp &&
                                        typeof report.timestamp.toDate ===
                                          "function"
                                          ? format(
                                              report.timestamp.toDate(),
                                              "dd/MM/yyyy HH:mm",
                                            )
                                          : report.timestamp &&
                                              (typeof report.timestamp ===
                                                "string" ||
                                                report.timestamp instanceof
                                                  Date)
                                            ? format(
                                                new Date(report.timestamp),
                                                "dd/MM/yyyy HH:mm",
                                              )
                                            : "N/D"}
                                      </span>
                                    </div>
                                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                                        Segnalatore
                                      </span>
                                      <span className="text-xs font-semibold text-white">
                                        {report.reporterName || "N/A"} (
                                        {report.reporterId || "N/A"})
                                      </span>
                                    </div>
                                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                                        Stato Attuale
                                      </span>
                                      <span className="text-xs font-black uppercase text-amber-500 tracking-wide">
                                        {report.status || "NUOVA"}
                                      </span>
                                    </div>
                                    {report.externalAuthority && (
                                      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 sm:col-span-2">
                                        <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider block mb-1">
                                          Autorità Esterna Informata
                                        </span>
                                        <span className="text-xs font-semibold text-white tracking-wide">
                                          {report.externalAuthority}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest block mb-3">
                                      Descrizione dei Fatti
                                    </span>
                                    <p className="text-xs leading-relaxed text-slate-300 font-medium whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono uppercase">
                                      {report.description ||
                                        "Nessun dettaglio aggiuntivo fornito."}
                                    </p>
                                  </div>

                                  {report.notes && (
                                    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                                      <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest block mb-3">
                                        Note Extra di Sviluppo
                                      </span>
                                      <p className="text-xs leading-relaxed text-slate-300 font-medium whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono">
                                        {report.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>

                              <DialogFooter className="pt-4 border-t border-white/5 bg-slate-950/50 flex flex-col sm:flex-row gap-3">
                                <Button
                                  onClick={() =>
                                    handlePrintEnvironmental(report)
                                  }
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest h-11 text-xs rounded-xl border-none"
                                >
                                  <Printer className="h-4 w-4 mr-2" /> Stampa
                                  Segnalazione
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            onClick={() => handleShareReport(report)}
                            variant="ghost"
                            size="icon"
                            className="text-blue-400 h-8 w-8"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              onClick={async () => {
                                let isConfirmed = false;
                                try {
                                  isConfirmed = window.confirm(
                                    "Eliminare questa sanzione / segnalazione ambientale?",
                                  );
                                } catch (e) {
                                  console.warn(
                                    "window.confirm blocked by sandbox, auto-confirming.",
                                    e,
                                  );
                                  isConfirmed = true;
                                }
                                if (isConfirmed) {
                                  try {
                                    await deleteDoc(
                                      doc(
                                        db,
                                        "environmental_reports",
                                        report.id!,
                                      ),
                                    );
                                    alert("Segnalazione eliminata.");
                                  } catch (e: any) {
                                    alert("Errore eliminazione: " + e.message);
                                  }
                                }
                              }}
                              variant="ghost"
                              size="icon"
                              className="text-red-400 h-8 w-8 hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === "sanctions" && (
          <div className="space-y-6">
            {/* SECTOR BUTTON TAB SYSTEM FOR SANCTIONS */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center mb-2 bg-slate-900/40 p-2.5 rounded-3xl border border-slate-800">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                {visibleSectors.includes("zoofila") && (
                  <button
                    onClick={() => setSanctionsSectorTab("zoofila")}
                    className={cn(
                      "flex-1 lg:flex-none px-6 py-2.5 rounded-xl uppercase font-bold tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent",
                      sanctionsSectorTab === "zoofila"
                        ? "bg-orange-600 text-white shadow shadow-orange-950/20 font-extrabold border-orange-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50",
                    )}
                  >
                    Sanzioni Zoofila (
                    {sanctionReports.filter((r) => (r.settore || "zoofila") === "zoofila").length})
                  </button>
                )}
                {visibleSectors.includes("ittica") && (
                  <button
                    onClick={() => setSanctionsSectorTab("ittica")}
                    className={cn(
                      "flex-1 lg:flex-none px-6 py-2.5 rounded-xl uppercase font-bold tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent",
                      sanctionsSectorTab === "ittica"
                        ? "bg-blue-600 text-white shadow shadow-blue-950/20 font-extrabold border-blue-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50",
                    )}
                  >
                    Sanzioni Ittica (
                    {sanctionReports.filter((r) => (r.settore || "zoofila") === "ittica").length})
                  </button>
                )}
                {visibleSectors.includes("venatoria") && (
                  <button
                    onClick={() => setSanctionsSectorTab("venatoria")}
                    className={cn(
                      "flex-1 lg:flex-none px-6 py-2.5 rounded-xl uppercase font-bold tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 border border-transparent",
                      sanctionsSectorTab === "venatoria"
                        ? "bg-emerald-600 text-white shadow shadow-emerald-950/20 font-extrabold border-emerald-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50",
                    )}
                  >
                    Sanzioni Venatoria (
                    {sanctionReports.filter((r) => (r.settore || "zoofila") === "venatoria").length})
                  </button>
                )}
              </div>
            </div>

            <Card className="bg-[#0f172a] border-slate-700 overflow-hidden rounded-3xl shadow-2xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/50">
                    <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs py-4">
                      N° Verbale
                    </TableHead>
                    <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                      Data / Luogo
                    </TableHead>
                    <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                      Trasgressore
                    </TableHead>
                    <TableHead className="text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                      Violazione ed Importo
                    </TableHead>
                    <TableHead className="text-right text-slate-300 font-normal italic uppercase tracking-widest text-xs">
                      Azioni
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sanctionReports && sanctionReports.filter(r => (r.settore || "zoofila") === sanctionsSectorTab).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs uppercase tracking-widest italic">
                        Nessun verbale sanzionatorio per questo settore in archivio
                      </TableCell>
                    </TableRow>
                  ) : (
                    (sanctionReports || [])
                      .filter((r) => {
                        const rSector = r.settore || "zoofila";
                        if (rSector !== sanctionsSectorTab) return false;

                        if (reportsDateFilter && r.data !== reportsDateFilter) return false;
                        if (reportsSearch) {
                          const q = reportsSearch.toLowerCase();
                          const matchNum = (r.numeroVerbale || "").toLowerCase().includes(q);
                          const matchSoggetto = (r.soggettoNome || "").toLowerCase().includes(q);
                          const matchLuogo = (r.comune || "").toLowerCase().includes(q) || (r.localita || "").toLowerCase().includes(q);
                          return matchNum || matchSoggetto || matchLuogo;
                        }
                        return true;
                      })
                      .map((report) => (
                        <TableRow
                          key={report.id}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                        >
                          <TableCell className="text-white font-bold font-mono">
                            {report.numeroVerbale || "ND"}
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs">
                            <div className="font-semibold">{formatDateIT(report.data)}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{report.comune} ({report.provincia}) - {report.localita}</div>
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs">
                            <div className="font-bold text-white uppercase">{report.soggettoNome}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Doc: {report.soggettoDocumentoNumero || "N/A"}</div>
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs">
                            <div className="font-semibold text-amber-400">Art. {report.trasgreditoArt} - {report.trasgreditoLeggeRegolamento}</div>
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">P.M.R: € {report.pagamentoTotale || report.pagamentoMisuraRidotta}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => setReadingSanctionReport(report)}
                                variant="ghost"
                                size="icon"
                                className="text-purple-400 h-8 w-8 hover:bg-purple-950/20"
                                title="Visualizza Verbale"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                onClick={() => handlePrintSanction(report)}
                                variant="ghost"
                                size="icon"
                                className="text-emerald-400 h-8 w-8 hover:bg-emerald-950/20"
                                title="Stampa Verbale A4"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>

                              {isAdmin && (
                                <Button
                                  onClick={async () => {
                                    if (removeSanctionReport) {
                                      await removeSanctionReport(report.id);
                                    }
                                  }}
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 h-8 w-8 hover:bg-red-950/30"
                                  title="Elimina Verbale"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>

      {/* Hidden printing templates for all reports */}
      <div
        style={{
          display: "none",
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
        }}
        className="hidden pointer-events-none select-none hidden-print-templates"
      >
        {reports.map((r) => {
          const initials = extractOnlyMatricole(r.verbalizzanti);
          return (
            <div
              key={`print-tpl-${r.id}`}
              id={`printable-verbale-${r.id}`}
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "white",
                color: "black",
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              {/* Header */}
              <div
                style={{
                  width: "100%",
                  marginBottom: "3mm",
                  fontFamily: '"Times New Roman", Times, serif',
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "8pt",
                    marginBottom: "2mm",
                    lineHeight: "1.2",
                  }}
                >
                  Associazione protezionistica riconosciuta con decreto del
                  ministro dell’ambiente n. 862/scoc/92
                  <br />
                  Sede Nazionale - Via Salaria 298/A - Tel. 06/844094210-216 fax
                  06844094217 - 00199 Roma
                </div>
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {/* Logo posizionato vicino alla G */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4mm",
                      marginBottom: "1.5mm",
                    }}
                  >
                    <div
                      style={{ width: "25mm", height: "25mm", flexShrink: 0 }}
                    >
                      <EkoclubLogo className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1
                        style={{
                          fontSize: "15pt",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          margin: "0",
                          lineHeight: "1.1",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Guardie Ekoclub
                      </h1>
                      <p style={{ fontSize: "9.5pt", fontWeight: "bold", fontStyle: "italic", margin: "0", lineHeight: "1.2" }}>
                        Guardie Giurate Zoofile - Venatorie - Ittiche - Ambientali
                      </p>
                      <p style={{ fontSize: "9pt", fontWeight: "bold", fontStyle: "italic", margin: "0", lineHeight: "1.2" }}>
                        Servizio di polizia giudiziaria zoofila
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "center", width: "100%" }}>
                    <p
                      style={{
                        fontSize: "10.5pt",
                        fontWeight: "bold",
                        fontStyle: "italic",
                        margin: "0",
                        lineHeight: "1.2",
                      }}
                    >
                      Nucleo Massa-Carrara "Attilio Bertolucci"
                    </p>
                    <div style={{ marginTop: "0.5mm" }}>
                      <p
                        style={{
                          fontSize: "8.5pt",
                          margin: "0",
                          lineHeight: "1.2",
                        }}
                      >
                        ekoclub.massacarrara@gmail.com - cell. 3293738118
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    width: "100%",
                    marginTop: "3mm",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "12pt",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      margin: "0",
                      letterSpacing: "0.5px",
                    }}
                  >
                    VERBALE DI SOPRALLUOGO N°{" "}
                    <span
                      style={{
                        borderBottom: "1.5pt solid black",
                        padding: "0 2mm",
                        fontWeight: "bold",
                      }}
                    >
                      {r.sopralluogoTipo || "1"}
                    </span>
                  </h2>
                </div>
              </div>

              {/* Body of the Verbale */}
              <div
                style={{
                  marginTop: "2mm",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2mm",
                  fontSize: "10.5pt",
                  lineHeight: "1.35",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: "2mm",
                    rowGap: "1mm",
                  }}
                >
                  <span>L'anno </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.data || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> alle ore </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.oraInizio || "\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> con termine ore </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.oraFine || "\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> i sottoscritti </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {initials
                      ? `${initials.toUpperCase()} /////`
                      : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: "2mm",
                    rowGap: "1mm",
                  }}
                >
                  <span>nel Comune di </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.comune || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> prov. (</span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1mm",
                    }}
                  >
                    {r.provincia || "\u00A0\u00A0"}
                  </span>
                  <span>) in località </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.localita || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: "2mm",
                    rowGap: "1mm",
                  }}
                >
                  <span>Ci siamo recati presso </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.recatPresso ||
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span>
                    {" "}
                    allo scopo di constatare le condizioni di custodia di
                    n.{" "}
                  </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.numeroAnimali || "\u00A0\u00A0"}
                  </span>
                  <span> animali.</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: "2mm",
                    rowGap: "1mm",
                  }}
                >
                  <span>Dopo esserci qualificati al Sig. </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoNome ||
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> nato a </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoNatoA ||
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> il </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {formatDateIT(r.soggettoIl) !== "---" ? formatDateIT(r.soggettoIl) : "__________"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: "2mm",
                    rowGap: "1mm",
                  }}
                >
                  <span>residente a </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoResidenteA ||
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                  <span> prov. </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoProv || "\u00A0\u00A0"}
                  </span>
                  <span> via/piazza </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoIndirizzo ||
                      "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A5"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: "2mm",
                    rowGap: "1mm",
                  }}
                >
                  <span>doc. </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoDocumentoTipo ||
                      "\u00A0\u00A0\u00A0\u00A0\u5345"}
                  </span>
                  <span> n. </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoDocumentoNumero ||
                      "\u00A0\u00A0\u00A0\u00A0\u5345"}
                  </span>
                  <span> scad. </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.soggettoDocScadenza || "\u00A0\u00A0\u00A0\u00A0\u5345"}
                  </span>
                  <span> che risulta </span>
                  <span
                    style={{
                      borderBottom: "1pt solid black",
                      fontStyle: "italic",
                      padding: "0 1.5mm",
                    }}
                  >
                    {r.proprietarioPossessore || "proprietario"}
                  </span>
                  <span> degli animali in oggetto di controllo.</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "2.5mm",
                  fontStyle: "italic",
                  fontSize: "10.5pt",
                }}
              >
                I verbalizzanti hanno chiesto il consenso al sopralluogo.
              </div>

              <div
                style={{
                  marginTop: "1.5mm",
                  fontStyle: "italic",
                  fontSize: "10.5pt",
                  lineHeight: "1.35",
                }}
              >
                {r.esito === "rifiuto"
                  ? "Avendo ricevuto rifiuto i verbalizzanti non hanno potuto procedere al sopralluogo."
                  : "Avendo ricevuto consenso esplicito i verbalizzanti hanno potuto procedere al sopralluogo ed hanno constatato quanto appresso."}
              </div>

              {/* ESITO CONSTATATO */}
              {(r.esito === "consenso" || !r.esito) && (
                <div style={{ marginTop: "2.5mm" }}>
                  <div
                    style={{
                      fontWeight: "600",
                      borderBottom: "1pt solid black",
                      paddingBottom: "0.5mm",
                      fontSize: "10.5pt",
                    }}
                  >
                    Esito sopralluogo / constatato quanto appresso:
                  </div>
                  <div
                    style={{
                      width: "100%",
                      marginTop: "1.5mm",
                      padding: "1mm 0",
                      lineHeight: "1.35",
                      fontSize: "10.5pt",
                      minHeight: "40px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {r.constatazioni || "Nessuna constatazione particolare_"}
                  </div>

                  {/* MICROCHIPS */}
                  {r.chips && r.chips.length > 0 && (
                    <div
                      style={{
                        marginTop: "2mm",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5mm",
                      }}
                    >
                      {r.chips.map((chip, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            flexWrap: "wrap",
                            rowGap: "1mm",
                            columnGap: "2mm",
                          }}
                        >
                          <span
                            style={{ fontSize: "10.5pt" }}
                          >
                            Chip {index + 1}:
                          </span>
                          <span
                            style={{
                              borderBottom: "1pt solid black",
                              minWidth: "44mm",
                              width: "44mm",
                              display: "inline-block",
                              textAlign: "center",
                              fontSize: "10.5pt",
                            }}
                          >
                            {chip.numero || "\u00A0\u00A0\u00A5"}
                          </span>
                          <span
                            style={{
                              fontSize: "10.5pt",
                              marginLeft: "1.5mm",
                            }}
                          >
                            Nome animale:
                          </span>
                          <span
                            style={{
                              borderBottom: "1pt solid black",
                              flex: 1,
                              fontStyle: "italic",
                              fontSize: "10.5pt",
                            }}
                          >
                            {chip.nominativo || "\u00A0\u00A0\u00A5"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div
                style={{
                  marginTop: "2.5mm",
                  display: "flex",
                  alignItems: "baseline",
                  fontSize: "10.5pt",
                  lineHeight: "1.35",
                }}
              >
                <span>Vengono concessi giorni </span>
                <span
                  style={{
                    borderBottom: "1pt solid black",
                    width: "22mm",
                    textAlign: "center",
                    display: "inline-block",
                  }}
                >
                  {r.giorniRegolarizzazione || "___"}
                </span>
                <span>
                  {" "}
                  per la regolarizzazione dalla notifica del presente atto.
                </span>
              </div>

              <div
                style={{
                  marginTop: "4mm",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "15mm",
                }}
              >
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      borderTop: "1pt solid black",
                      paddingTop: "1mm",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "9.5pt",
                      }}
                    >
                      Il detentore / proprietario
                    </div>
                  </div>
                  {/* Visualizzazione Firma (se esistente) */}
                  {r.signatureData && (
                    <div style={{ marginTop: "1.5mm" }}>
                      <img
                        src={r.signatureData}
                        alt="Firma Detentore"
                        style={{
                          maxHeight: "15mm",
                          maxWidth: "100%",
                          margin: "0 auto",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      borderTop: "1pt solid black",
                      paddingTop: "1mm",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "9.5pt",
                      }}
                    >
                      I verbalizzanti
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "2.5mm",
                      fontSize: "10.5pt",
                      fontWeight: "bold",
                    }}
                  >
                    {initials
                      ? `${initials.toUpperCase()} /////`
                      : "____________________"}
                  </div>
                  <div
                    style={{
                      fontSize: "7.5pt",
                      color: "#666",
                      marginTop: "1mm",
                    }}
                  >
                    (Firma non richiesta)
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "3mm",
                  fontSize: "7.5pt",
                  color: "#555",
                  textAlign: "center",
                  lineHeight: "1.25",
                  borderTop: "0.5pt solid #ddd",
                  paddingTop: "1.5mm",
                }}
              >
                Il trattamento dei dati riportati nel presente verbale viene
                effettuato nel rispetto di finalità di rilevante interesse
                pubblico, ai sensi degli artt. 70 e 73 del D.Lgs. 30/06/2003 n.
                196 e s.m.i.
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL SCREEN A4 READING VIEW */}
      <Dialog
        open={!!readingReport}
        onOpenChange={(open) => {
          if (!open) {
            setReadingReport(null);
          }
        }}
      >
        <DialogContent className="bg-slate-950 border-slate-800 text-white w-[95vw] sm:max-w-none md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-slate-900 bg-slate-900/30 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-lg font-normal italic uppercase tracking-widest text-purple-400">
                Lettura Verbale A4 Sfondo Bianco
              </DialogTitle>
              <DialogDescription className="text-slate-400 uppercase font-normal text-[10px] tracking-wider leading-none mt-1">
                Visualizzazione ufficiale pronta per la stampa • Numero:{" "}
                {readingReport?.numeroVerbale || "N.D."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Scrollable Area containing the pristine A4 sheet */}
          <div className="flex-1 bg-slate-900 p-4 md:p-8 overflow-y-auto scrollbar-thin">
            <div
              className="max-w-[210mm] mx-auto bg-white text-black p-[6mm] sm:p-[8mm] md:p-[10mm] rounded-sm shadow-2xl relative select-text"
              style={{
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              {readingReport && (
                <>
                  {/* Header */}
                  <div className="w-full mb-3">
                    <div className="text-center text-[9px] mb-1.5 leading-tight font-serif text-black">
                      Associazione protezionistica riconosciuta con decreto del
                      ministro dell’ambiente n. 862/scoc/92
                      <br />
                      Sede Nazionale - Via Salaria 298/A - Tel. 06/844094210-216
                      fax 06844094217 - 00199 Roma
                    </div>
                    <div className="w-full flex justify-center min-h-[75px] items-center">
                      <div className="flex items-center gap-4">
                        {/* Logo posizionato vicino alla G */}
                        <div className="w-[25mm] h-[25mm] shrink-0 flex items-center justify-center">
                          <EkoclubLogo className="w-full h-full text-black" />
                        </div>

                        {/* Testo dell'intestazione ufficiale */}
                        <div className="text-left">
                          <h1 className="text-2xl font-black tracking-wider uppercase m-0 leading-none text-black">
                            Guardie Ekoclub
                          </h1>
                          <p className="text-xs font-bold italic mt-1.5 m-0 leading-snug text-black">
                            Guardie Giurate Zoofile - Venatorie - Ittiche - Ambientali
                          </p>
                          <p className="text-xs font-bold italic m-0 leading-snug text-black">
                            Servizio di polizia giudiziaria zoofila
                          </p>
                          <p className="text-xs font-bold italic mt-1 m-0 leading-snug text-black">
                            Nucleo Massa-Carrara "Attilio Bertolucci"
                          </p>
                          <div className="mt-0.5">
                            <p className="text-[10px] m-0 leading-tight text-slate-700">
                              ekoclub.massacarrara@gmail.com - cell. 3293738118
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center w-full mt-2">
                      <h2 className="text-base font-bold uppercase m-0 text-black">
                        VERBALE DI SOPRALLUOGO N°{" "}
                        <span className="border-b border-black px-2 font-bold">
                          {readingReport.sopralluogoTipo || "1"}
                        </span>
                      </h2>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="mt-2 flex flex-col gap-2.5 text-[12px] leading-relaxed text-black">
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span>L'anno </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.data || "_________"}
                      </span>
                      <span> alle ore </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.oraInizio || "_____"}
                      </span>
                      <span> con termine ore </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.oraFine || "_____"}
                      </span>
                      <span> i sottoscritti </span>
                      <span className="italic underline px-1 font-serif">
                        {getInitials(readingReport.verbalizzanti)
                          ? `${getInitials(readingReport.verbalizzanti)} /////`
                          : "________"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1">
                      <span>nel Comune di </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.comune || "_________"}
                      </span>
                      <span> prov. (</span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.provincia || "__"}
                      </span>
                      <span>) in località </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.localita || "_________"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1">
                      <span>Ci siamo recati presso </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.recatPresso || "_________"}
                      </span>
                      <span>
                        {" "}
                        allo scopo di constatare le condizioni di custodia di
                        n.{" "}
                      </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.numeroAnimali || "__"}
                      </span>
                      <span> animali.</span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1">
                      <span>Dopo esserci qualificati al Sig. </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoNome || "_________"}
                      </span>
                      <span> nato a </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoNatoA || "_________"}
                      </span>
                      <span> il </span>
                      <span className="italic underline px-1 font-serif">
                        {formatDateIT(readingReport.soggettoIl) !== "---" ? formatDateIT(readingReport.soggettoIl) : "_________"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1">
                      <span>residente a </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoResidenteA || "_________"}
                      </span>
                      <span> prov. </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoProv || "__"}
                      </span>
                      <span> via/piazza </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoIndirizzo || "_________"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1">
                      <span>doc. </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoDocumentoTipo || "_________"}
                      </span>
                      <span> n. </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoDocumentoNumero || "_________"}
                      </span>
                      <span> scad. </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.soggettoDocScadenza || "_________"}
                      </span>
                      <span> che risulta </span>
                      <span className="italic underline px-1 font-serif">
                        {readingReport.proprietarioPossessore || "proprietario"}
                      </span>
                      <span> degli animali in oggetto di controllo.</span>
                    </div>
                  </div>

                  <div className="mt-2.5 italic text-[11px] text-slate-700">
                    I verbalizzanti hanno chiesto il consenso al sopralluogo.
                  </div>

                  <div className="mt-1.5 text-[12px] leading-relaxed text-black">
                    {readingReport.esito === "rifiuto"
                      ? "Avendo ricevuto rifiuto i verbalizzanti non hanno potuto procedere al sopralluogo."
                      : "Avendo ricevuto consenso esplicito i verbalizzanti hanno potuto procedere al sopralluogo ed hanno constatato quanto appresso."}
                  </div>

                  {/* ESITO CONSTATATO */}
                  {(readingReport.esito === "consenso" ||
                    !readingReport.esito) && (
                    <div className="mt-2.5 text-black">
                      <div className="font-semibold border-b border-black text-sm">
                        Esito sopralluogo / constatato quanto appresso:
                      </div>
                      <div className="w-full pt-1.5 min-h-[50px] text-[12px] leading-relaxed whitespace-pre-wrap italic font-serif">
                        {readingReport.constatazioni ||
                          "NESSUNA CONSTATAZIONE PARTICOLARE_"}
                      </div>

                      {/* MICROCHIPS */}
                      {readingReport.chips &&
                        readingReport.chips.length > 0 && (
                          <div className="mt-2.5 flex flex-col gap-2">
                            {readingReport.chips.map((chip, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="text-[11px] font-medium w-16">
                                  Chip {index + 1}:
                                </span>
                                <div className="flex gap-0.5">
                                  {[...Array(15)].map((_, di) => (
                                    <div
                                      key={di}
                                      className="w-[15px] h-[22px] border border-black text-center font-mono text-xs flex items-center justify-center bg-white text-black font-semibold"
                                    >
                                      {chip.numero?.[di] || " "}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[11px] font-medium ml-2">
                                  Nome:
                                </span>
                                <span className="border-b border-black flex-1 italic text-xs px-2 font-serif">
                                  {chip.nominativo || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  <div className="mt-3 flex items-baseline text-[12px] text-black">
                    <span>Vengono concessi giorni </span>
                    <span className="italic underline text-center w-12 inline-block mx-1 font-serif">
                      {readingReport.giorniRegolarizzazione || "___"}
                    </span>
                    <span>
                      {" "}
                      per la regolarizzazione dalla notifica del presente atto.
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between items-start gap-12 text-black">
                    <div className="flex-1 text-center">
                      <div className="border-t border-black pt-1">
                        <div className="font-semibold text-[10px]">
                          Il detentore / proprietario
                        </div>
                      </div>
                      {readingReport.signatureData && (
                        <div className="mt-1.5">
                          <img
                            src={readingReport.signatureData}
                            alt="Firma Detentore"
                            className="max-h-12 max-w-full mx-auto"
                            style={{ filter: "multiply(1.2)" }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center">
                      <div>
                        <div className="border-t border-black pt-1">
                          <div className="font-semibold text-[10px]">
                            I verbalizzanti
                          </div>
                        </div>
                        <div className="mt-2.5 text-xs italic tracking-wider font-serif">
                          {getInitials(readingReport.verbalizzanti)
                            ? `${getInitials(readingReport.verbalizzanti)} /////`
                            : "____________________"}
                        </div>
                        <div className="text-[8px] text-slate-500 mt-1">
                          (Firma non richiesta)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[8px] text-slate-500 text-center leading-normal border-t border-slate-200 pt-1.5">
                    Il trattamento dei dati riportati nel presente verbale viene
                    effettuato nel rispetto di finalità di rilevante interesse
                    pubblico, ai sensi degli artt. 70 e 73 del D.Lgs. 30/06/2003
                    n. 196 e s.m.i.
                  </div>
                </>
              )}
            </div>

            {/* Attachments Section in the Printable Dialog */}
            {readingReport &&
              (() => {
                const reportDbAttachments = dbAttachments.filter(
                  (a) => a.reportId === readingReport.id,
                );
                const allReportAttachments = [
                  ...(readingReport.attachments || []).map((a: any, idx: number) => ({
                    ...a,
                    id: a.id || `legacy-single-${idx}-${a.name || 'file'}`,
                  })),
                  ...reportDbAttachments,
                ];

                return (
                  <div className="max-w-[210mm] mx-auto mt-6 bg-slate-950 p-6 rounded-xl border border-slate-900 shadow-xl print:hidden font-sans">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-400" />
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                            💻 Documenti Scannerizzati & File Digitale
                          </h3>
                          <p className="text-[10px] text-slate-500 uppercase">
                            Fascicolo di prove e anagrafi allegate a questo
                            Verbale
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-purple-500/30 hover:border-purple-500 bg-purple-950/25 text-purple-300 hover:text-white flex items-center gap-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider"
                          onClick={() => {
                            setUploadModalData({
                              isOpen: true,
                              reportId: readingReport.id,
                              documentType: "Foto / Allegati sul Campo",
                            });
                          }}
                        >
                          <Camera className="h-4 w-4 text-purple-400 animate-pulse" />
                          Scatta Foto / Carica
                        </Button>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-900 rounded-full text-purple-400 border border-slate-800">
                          {allReportAttachments.length} Allegati
                        </span>
                      </div>
                    </div>

                    {allReportAttachments.length === 0 ? (
                      <div className="py-6 flex flex-col items-center justify-center opacity-50 bg-slate-900/50 rounded-xl border border-slate-900 border-dashed">
                        <FileText className="h-8 w-8 text-slate-700 mb-1" />
                        <span className="text-xs uppercase font-normal text-slate-400">
                          Nessun documento digitale allegato a questo foglio
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        {allReportAttachments.map((att: any) => (
                          <div
                            key={att.id}
                            className="relative bg-slate-900/40 px-4 py-3 rounded-lg border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-200"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {att.type === "photo" ? (
                                <Camera className="h-5 w-5 text-emerald-400 shrink-0" />
                              ) : (
                                <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-normal">
                                  <span
                                    className="text-sm text-slate-100 uppercase tracking-wide truncate max-w-[280px] font-normal"
                                    title={att.name}
                                  >
                                    {att.name}
                                  </span>
                                  <span className="text-slate-400 font-normal whitespace-nowrap">
                                    • Caricato da: {att.uploadedBy} il{" "}
                                    {att.uploadedAt
                                      ? format(
                                          new Date(att.uploadedAt),
                                          "dd/MM/yyyy",
                                        )
                                      : "N.D."}
                                  </span>
                                  {att.latitude && att.longitude && (
                                    <span
                                      className="text-[10px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-normal shrink-0"
                                      title={`Geotag: ${att.latitude}, ${att.longitude}`}
                                    >
                                      📍 GEOTAG
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              {att.isChunked && !chunksCache[att.id]?.url && (
                                <span className="text-xs text-purple-300 font-normal mr-1">
                                  {chunksCache[att.id]?.loading
                                    ? "Ricomposizione..."
                                    : "Carica file"}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenAttachment(att)}
                                className="h-8 px-3 text-xs uppercase tracking-wider bg-slate-950 border border-slate-850 hover:bg-purple-950/40 hover:border-purple-500/30 text-purple-300 rounded-lg flex items-center gap-1.5 transition-all font-normal"
                              >
                                {att.isChunked &&
                                chunksCache[att.id]?.loading ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                                Apri
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att)}
                                className="h-8 px-3 text-xs uppercase tracking-wider bg-slate-950 border border-slate-850 hover:bg-emerald-950/40 hover:border-emerald-500/30 text-emerald-300 rounded-lg flex items-center gap-1.5 transition-all font-normal"
                              >
                                {att.isChunked &&
                                chunksCache[att.id]?.loading ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                Scarica
                              </button>

                              {confirmDeleteId === att.id ? (
                                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-850">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteAttachment(
                                        att.originReportId || readingReport.id,
                                        att.id,
                                      );
                                      setConfirmDeleteId(null);
                                    }}
                                    className="text-white bg-rose-600 hover:bg-rose-500 text-xs px-2.5 py-1 rounded transition-colors font-normal animate-pulse"
                                  >
                                    Rimuovi?
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-slate-300 bg-slate-800 hover:bg-slate-750 text-xs px-2 py-1 rounded border border-slate-700 transition-colors font-normal"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              ) : (
                                isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(att.id)}
                                    className="text-rose-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-950/25 transition-colors"
                                    title="Elimina permanentemente"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>

          <DialogFooter className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handlePrintVerbale(readingReport!)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
            >
              <Printer className="h-4 w-4 mr-2" /> Stampa
            </Button>
            <Button
              onClick={() => generateVerbalePDF(readingReport!)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
            >
              <Download className="h-4 w-4 mr-2" /> Scarica
            </Button>
            <Button
              onClick={() => {
                if (!readingReport) return;
                setEmailDialogReport(readingReport);
                setToSede(true);
                setSedeEmail("giulianodellapina@gmail.com");
                setToControllato(!!(readingReport.soggettoEmail || "").trim());
                setControllatoEmail(readingReport.soggettoEmail || "");
                setToGuard1(false);
                setGuard1Email("");
                setToGuard2(false);
                setGuard2Email("");
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
            >
              <Mail className="h-4 w-4 mr-2" /> Invia Posta
            </Button>
            <DialogClose className="flex-1 border border-slate-750 hover:bg-slate-900 text-white font-bold uppercase tracking-widest h-12 rounded-xl inline-flex items-center justify-center cursor-pointer transition-colors bg-transparent">
              Chiudi
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SANCTION REPORT A4 READING VIEW */}
      <Dialog
        open={!!readingSanctionReport}
        onOpenChange={(open) => {
          if (!open) {
            setReadingSanctionReport(null);
          }
        }}
      >
        <DialogContent className="bg-slate-950 border-slate-800 text-white w-[95vw] sm:max-w-none md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-slate-900 bg-slate-900/30 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-lg font-normal italic uppercase tracking-widest text-purple-400">
                Visualizzazione Verbale Sanzionatorio A4
              </DialogTitle>
              <DialogDescription className="text-slate-400 uppercase font-normal text-[10px] tracking-wider leading-none mt-1">
                Visualizzazione ufficiale ai sensi della Legge 689/81 • Numero:{" "}
                {readingSanctionReport?.numeroVerbale || "N.D."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Scrollable Area containing the pristine A4 sheet */}
          <div className="flex-1 bg-slate-900 p-4 md:p-8 overflow-y-auto scrollbar-thin">
            {readingSanctionReport && (
              <div
                className="max-w-[210mm] mx-auto bg-white text-black p-[6mm] sm:p-[12mm] md:p-[20mm] rounded-sm shadow-2xl relative select-text"
                style={{
                  minHeight: "auto",
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: "11pt",
                  lineHeight: "1.4",
                }}
              >
                {/* Intestazione */}
                <div style={{ textAlign: "center", borderBottom: "2px solid black", paddingBottom: "5px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "14pt", fontWeight: "bold", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "sans-serif" }}>Guardie Ekoclub</div>
                  <div style={{ fontSize: "9.5pt", fontWeight: "bold", fontStyle: "italic", marginTop: "2px" }}>Guardie Giurate Zoofile-Venetorie-Ittiche-Ambientali</div>
                  <div style={{ fontSize: "9.5pt", fontWeight: "bold", fontStyle: "italic", marginTop: "2px" }}>Servizio di polizia giudiziaria zoofila - Nucleo Massa-Carrara "Attilio Bertolucci"</div>
                  <div style={{ fontSize: "9pt", marginTop: "2px" }}>Mail: ekoclub.massacarrara@gmail.com - Cell: 3293738118</div>
                </div>

                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h1 style={{ fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textDecoration: "underline" }}>
                    VERBALE DI ACCERTAMENTO E CONTESTAZIONE DI VIOLAZIONE AMMINISTRATIVA
                  </h1>
                  <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "5px" }}>N° Registro Verbale: {readingSanctionReport.numeroVerbale || "_________________"}</div>
                  <div style={{ fontSize: "9pt", fontStyle: "italic", marginTop: "2px" }}>Redatto ai sensi degli Artt. 13 e 14 della Legge 24 Novembre 1981, n. 689</div>
                </div>

                {/* 1. Dati Redazione */}
                <div style={{ marginBottom: "15px" }}>
                  <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid black", margin: "0 0 10px 0", paddingBottom: "2px" }}>1. LUOGO E DATA DELL'ACCERTAMENTO</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "30%", fontWeight: "bold", padding: "3px 0" }}>Data Accertamento:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{formatDateIT(readingSanctionReport.dataAccertamento || readingSanctionReport.data)} alle ore {readingSanctionReport.oraAccertamento || readingSanctionReport.oraInizio}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "3px 0" }}>Località / Comune:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.localita || "_______________"}, Comune di {readingSanctionReport.comune} ({readingSanctionReport.provincia})</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "3px 0" }}>Verbalizzanti:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>Agenti di P.G. nei limiti del servizio, Matricole: {extractOnlyMatricole(readingSanctionReport.verbalizzantiMatricole)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Trasgressore */}
                <div style={{ marginBottom: "15px" }}>
                  <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid black", margin: "0 0 10px 0", paddingBottom: "2px" }}>2. GENERALITÀ DEL TRASGRESSORE</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "30%", fontWeight: "bold", padding: "3px 0" }}>Cognome e Nome:</td>
                        <td colSpan={3} style={{ borderBottom: "1px dotted black", padding: "3px 5px", fontWeight: "bold" }}>{readingSanctionReport.soggettoNome}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "3px 0" }}>Nato a:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px", width: "40%" }}>{readingSanctionReport.soggettoNatoA} ({readingSanctionReport.soggettoNatoProv})</td>
                        <td style={{ fontWeight: "bold", padding: "3px 0", width: "10%", textAlign: "center" }}>il:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px", width: "20%" }}>{formatDateIT(readingSanctionReport.soggettoNatoIl)}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "3px 0" }}>Residente a:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.soggettoResidenteA} ({readingSanctionReport.soggettoResidenteProv})</td>
                        <td style={{ fontWeight: "bold", padding: "3px 0", textAlign: "center" }}>Via:</td>
                        <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.soggettoResidenteIndirizzo} N. {readingSanctionReport.soggettoResidenteCivico}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "3px 0" }}>Documento:</td>
                        <td colSpan={3} style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.soggettoDocumentoTipo} N. {readingSanctionReport.soggettoDocumentoNumero} rilasciato da {readingSanctionReport.soggettoDocumentoRilasciatoDa} il {formatDateIT(readingSanctionReport.soggettoDocumentoRilasciatoIl)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Obbligato in solido */}
                {readingSanctionReport.obbligatoNome && (
                  <div style={{ marginBottom: "15px" }}>
                    <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid black", margin: "0 0 10px 0", paddingBottom: "2px" }}>3. GENERALITÀ DELL'OBBLIGATO IN SOLIDO (Art. 6 L. 689/81)</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
                      <tbody>
                        <tr>
                          <td style={{ width: "30%", fontWeight: "bold", padding: "3px 0" }}>Cognome e Nome:</td>
                          <td colSpan={3} style={{ borderBottom: "1px dotted black", padding: "3px 5px", fontWeight: "bold" }}>{readingSanctionReport.obbligatoNome}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", padding: "3px 0" }}>Qualità (es. Proprietario):</td>
                          <td colSpan={3} style={{ borderBottom: "1px dotted black", padding: "3px 5px", fontStyle: "italic" }}>{readingSanctionReport.obbligatoQualita || "Proprietario dell'animale"}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", padding: "3px 0" }}>Nato a:</td>
                          <td style={{ borderBottom: "1px dotted black", padding: "3px 5px", width: "40%" }}>{readingSanctionReport.obbligatoNatoA} ({readingSanctionReport.obbligatoNatoProv})</td>
                          <td style={{ fontWeight: "bold", padding: "3px 0", width: "10%", textAlign: "center" }}>il:</td>
                          <td style={{ borderBottom: "1px dotted black", padding: "3px 5px", width: "20%" }}>{formatDateIT(readingSanctionReport.obbligatoNatoIl)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", padding: "3px 0" }}>Residente a:</td>
                          <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.obbligatoResidenteA} ({readingSanctionReport.obbligatoResidenteProv})</td>
                          <td style={{ fontWeight: "bold", padding: "3px 0", textAlign: "center" }}>Via:</td>
                          <td style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.obbligatoResidenteIndirizzo} N. {readingSanctionReport.obbligatoResidenteCivico}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", padding: "3px 0" }}>Documento:</td>
                          <td colSpan={3} style={{ borderBottom: "1px dotted black", padding: "3px 5px" }}>{readingSanctionReport.obbligatoDocumentoTipo} N. {readingSanctionReport.obbligatoDocumentoNumero} rilasciato da {readingSanctionReport.obbligatoDocumentoRilasciatoDa} il {formatDateIT(readingSanctionReport.obbligatoDocumentoRilasciatoIl)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Descrizione Violazione */}
                <div style={{ marginBottom: "15px" }}>
                  <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid black", margin: "0 0 10px 0", paddingBottom: "2px" }}>4. NORMA VIOLATA E SANZIONE PREVISTA</h3>
                  <div style={{ backgroundColor: "#f5f5f5", border: "1px solid black", padding: "8px", marginBottom: "10px", fontFamily: "monospace", fontSize: "9.5pt" }}>
                    <strong>NORMA VIOLATA:</strong> Art. {readingSanctionReport.trasgreditoArt} della {readingSanctionReport.trasgreditoLeggeRegolamento}<br/>
                    <strong>NORMA SANZIONATORIA:</strong> Art. {readingSanctionReport.sanzionatoArt} della {readingSanctionReport.sanzionatoLeggeRegolamento}<br/>
                    {readingSanctionReport.altreDisposizioni && <><strong>ALTRE DISPOSIZIONI:</strong> {readingSanctionReport.altreDisposizioni}<br/></>}
                    <strong>SANZIONE EDITTALE:</strong> Min: € {readingSanctionReport.sanzioneMin} - Max: € {readingSanctionReport.sanzioneMax}
                  </div>
                  <div style={{ fontWeight: "bold", marginBottom: "5px" }}>DESCRIZIONE DELLA CONDOTTA ACCERTATA:</div>
                  <div style={{ border: "1px dotted black", padding: "10px", minHeight: "80px", fontFamily: "monospace", fontSize: "10pt", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>{readingSanctionReport.motiviFatti}</div>
                </div>

                {/* 5. Contestazione e dichiarazioni */}
                <div style={{ marginBottom: "15px" }}>
                  <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid black", margin: "0 0 10px 0", paddingBottom: "2px" }}>5. CONTESTAZIONE E DICHIARAZIONI</h3>
                  <div style={{ marginBottom: "5px" }}>
                    <strong>Modalità:</strong> Contestazione {readingSanctionReport.contestazioneTipo === 'immediata' ? 'IMMEDIATA' : 'DIFFERITA'}
                  </div>
                  {readingSanctionReport.contestazioneTipo === 'differita' && (
                    <div style={{ marginBottom: "8px" }}><strong>Motivi differimento:</strong> {readingSanctionReport.motivoMancataContestazione || 'Notifica postale.'}</div>
                  )}
                  <div style={{ marginBottom: "8px" }}><strong>Dichiarazioni spontanee del trasgressore:</strong><br/>
                  <span style={{ fontStyle: "italic", fontFamily: "monospace" }}>{readingSanctionReport.dichiarazioniSpontanee || 'Nessuna.'}</span></div>
                </div>

                {/* 6. Pagamento in misura ridotta */}
                <div style={{ marginBottom: "15px", border: "1.5px solid black", padding: "10px" }}>
                  <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", textAlign: "center", margin: "0 0 10px 0", borderBottom: "1px solid black", paddingBottom: "4px" }}>6. MODALITÀ DI PAGAMENTO IN MISURA RIDOTTA (P.M.R.)</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11pt", fontWeight: "bold", marginBottom: "10px", backgroundColor: "#f9f9f9", padding: "5px" }}>
                    <div>Sanzione: € {readingSanctionReport.pagamentoMisuraRidotta}</div>
                    <div>Spese: € {readingSanctionReport.speseNotifica}</div>
                    <div style={{ color: "#b91c1c" }}>TOTAL: € {readingSanctionReport.pagamentoTotale}</div>
                  </div>
                  <div style={{ fontSize: "10pt", fontFamily: "monospace", lineHeight: "1.3" }}>
                    <strong>ESTREMI PAGAMENTO:</strong><br/>
                    {readingSanctionReport.metodoPagamento === 'regione_toscana' ? (
                      <>
                        - Intestatario: {readingSanctionReport.regioneIntestatario || 'REGIONE TOSCANA - TESORERIA PROVINCIALE'}<br/>
                        - C/C Postale: {readingSanctionReport.regioneCcPostale || '10258452'}<br/>
                        - IBAN: {readingSanctionReport.regioneIban || 'IT34O0200813702000000325411'}<br/>
                      </>
                    ) : readingSanctionReport.metodoPagamento === 'comune_carrara' ? (
                      <>
                        - Ente: COMUNE DI CARRARA<br/>
                        - Intestatario: {readingSanctionReport.comuneIntestatario || 'COMUNE DI CARRARA - SERVIZIO ENTRATE'}<br/>
                        - C/C Postale: {readingSanctionReport.comuneCcPostale || '13154546'}<br/>
                        - IBAN: {readingSanctionReport.comuneIban || 'IT 45 K 03069 24502 100000012345'}<br/>
                        - Portale PagoPA: {readingSanctionReport.comuneLinkPagoPa || 'https://carrara.toscana.pagopa.it'}<br/>
                      </>
                    ) : (
                      <>
                        - Ente: {readingSanctionReport.comuneNome || 'COMUNE ACCERTATORE'}<br/>
                        - Intestatario: {readingSanctionReport.comuneIntestatario || 'SERVIZIO ENTRATE / TESORERIA COMUNALE'}<br/>
                        - C/C Postale: {readingSanctionReport.comuneCcPostale || '12345678'}<br/>
                        - IBAN: {readingSanctionReport.comuneIban || 'IT 12 A 03069 24502 100000098765'}<br/>
                        {readingSanctionReport.comuneLinkPagoPa && <>- Portale PagoPA: {readingSanctionReport.comuneLinkPagoPa}<br/></>}
                      </>
                    )}
                    - Causale obbligatoria: "Sanzione L. 689/81, Verbale N° {readingSanctionReport.numeroVerbale}"
                  </div>
                </div>

                {/* Sottoscrizioni */}
                <div style={{ marginTop: "30px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
                    <div style={{ width: "30%", borderTop: "1px solid black", paddingTop: "5px" }}>
                      <div style={{ fontSize: "8.5pt", fontWeight: "bold" }}>IL TRASGRESSORE</div>
                      {readingSanctionReport.firmaTrasgressore ? (
                        <img src={readingSanctionReport.firmaTrasgressore} style={{ maxHeight: "40px", margin: "5px auto", display: "block" }} />
                      ) : (
                        <div style={{ height: "40px", fontSize: "8pt", color: "#999", lineHeight: "40px" }}>Assente o rifiuta</div>
                      )}
                    </div>
                    {readingSanctionReport.obbligatoNome && (
                      <div style={{ width: "30%", borderTop: "1px solid black", paddingTop: "5px" }}>
                        <div style={{ fontSize: "8.5pt", fontWeight: "bold" }}>L'OBBLIGATO IN SOLIDO</div>
                        {readingSanctionReport.firmaObbligato ? (
                          <img src={readingSanctionReport.firmaObbligato} style={{ maxHeight: "40px", margin: "5px auto", display: "block" }} />
                        ) : (
                          <div style={{ height: "40px", fontSize: "8pt", color: "#999", lineHeight: "40px" }}>Non firmato</div>
                        )}
                      </div>
                    )}
                    <div style={{ width: "40%", borderTop: "1px dashed black", paddingTop: "5px" }}>
                      <div style={{ fontSize: "8.5pt", fontWeight: "bold", textTransform: "uppercase" }}>I Verbalizzanti (Matr. {extractOnlyMatricole(readingSanctionReport.verbalizzantiMatricole)})</div>
                      {readingSanctionReport.firmaGuardie ? (
                        <img src={readingSanctionReport.firmaGuardie} style={{ maxHeight: "40px", margin: "5px auto", display: "block" }} />
                      ) : (
                        <div style={{ height: "40px", fontSize: "8pt", color: "#999", lineHeight: "40px" }}>Firmato elettronicamente</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                if (readingSanctionReport) {
                  handlePrintSanction(readingSanctionReport);
                }
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest h-12 rounded-xl border-none font-normal"
            >
              <Printer className="h-4 w-4 mr-2" /> Stampa A4
            </Button>
            <DialogClose className="flex-1 border border-slate-750 hover:bg-slate-900 text-white font-bold uppercase tracking-widest h-12 rounded-xl inline-flex items-center justify-center cursor-pointer transition-colors bg-transparent">
              Chiudi
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG INVIO EMAIL MULTIPLO (SEDE, CONTROLLATO, GUARDIE) */}
      <Dialog
        open={emailDialogReport !== null}
        onOpenChange={(open) => {
          if (!open) setEmailDialogReport(null);
        }}
      >
        <DialogContent className="border-slate-805 bg-[#0a0e1a] text-white p-0 rounded-3xl max-w-lg md:max-w-xl overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg tracking-wide text-white">
                  Invia Copie Atto via E-mail
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-1 font-sans">
                  Seleziona i destinatari per l'invio del Verbale N°{" "}
                  {emailDialogReport?.numeroVerbale || "_______"} del{" "}
                  {emailDialogReport?.data}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto text-left">
            <p className="text-xs text-slate-400 leading-relaxed bg-[#111726]/40 p-3.5 rounded-xl border border-white/5 font-serif italic text-justify">
              In fase Beta il recapito della Sede Centrale è configurato
              sull'indirizzo pseudo-istituzionale{" "}
              <span className="text-yellow-500 font-sans not-italic font-bold">
                giulianodellapina@gmail.com
              </span>{" "}
              per un tracciamento sicuro. Le e-mail ai controllati riporteranno
              la corretta dicitura ed intestazione mittente.
            </p>

            {/* ANTEPRIMA INTESTAZIONE TRASMISSIONE ESTERNA */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-slate-800 text-slate-300 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7] block mb-2 font-sans">
                Anteprima Testo Mail (Esterno al Verbale)
              </span>
              <div className="border border-slate-800/80 rounded-xl p-3.5 bg-slate-950 font-mono text-[11px] leading-relaxed select-text space-y-1.5 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-900 pb-1.5 text-slate-400 gap-1">
                  <span className="font-semibold text-slate-350">
                    Ekoclub MassaCarrara "nucleo Attilio Bertolucci"
                  </span>
                  <span className="text-purple-400">
                    turniguardie493@gmail.com
                  </span>
                </div>
                <div className="text-slate-200 font-bold font-sans mt-1">
                  verbale di sopralluogo del{" "}
                  {emailDialogReport?.data || "04/06/2026"}
                </div>
                <div className="text-slate-400 font-sans">
                  a:{" "}
                  <span className="text-blue-400 underline">
                    {toControllato && controllatoEmail
                      ? controllatoEmail.trim()
                      : "faidatelegno@virgilio.it"}
                  </span>{" "}
                  Copia:{" "}
                  <span className="text-blue-400 underline">
                    giulianodellapina@gmail.com
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Sezione 1: Sede Centrale */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-slate-800 transition">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="toSede"
                    checked={toSede}
                    onChange={(e) => setToSede(e.target.checked)}
                    className="mt-1 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1.5 text-left">
                    <label
                      htmlFor="toSede"
                      className="text-sm font-semibold text-slate-200 cursor-pointer flex items-center justify-between"
                    >
                      <span>Archivio Sede Centrale (Sede)</span>
                      <span className="text-[10px] font-normal uppercase px-2 py-0.5 bg-slate-800 text-purple-400 border border-purple-500/15 rounded-md font-mono">
                        In Beta
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 font-sans leading-normal">
                      Riceve copia conforme interna.
                    </p>
                    <Input
                      disabled={!toSede}
                      value={sedeEmail}
                      onChange={(e) => setSedeEmail(e.target.value)}
                      placeholder="giulianodellapina@gmail.com"
                      className="h-9 text-xs bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione 2: Controllato */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-slate-800 transition">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="toControllato"
                    checked={toControllato}
                    onChange={(e) => setToControllato(e.target.checked)}
                    className="mt-1 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1.5 text-left">
                    <label
                      htmlFor="toControllato"
                      className="text-sm font-semibold text-slate-200 cursor-pointer"
                    >
                      Soggetto Controllato (Cittadino)
                    </label>
                    <p className="text-[11px] text-slate-400 font-sans leading-normal">
                      Mittente formale: Ekoclub Massa Carrara "nucleo "Attilio
                      Bertolucci"
                    </p>
                    <Input
                      disabled={!toControllato}
                      value={controllatoEmail}
                      onChange={(e) => setControllatoEmail(e.target.value)}
                      placeholder="E-mail del soggetto controllato"
                      className="h-9 text-xs bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione 3: Guardia 1 */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-slate-800 transition">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="toGuard1"
                    checked={toGuard1}
                    onChange={(e) => setToGuard1(e.target.checked)}
                    className="mt-1 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1.5 text-left">
                    <label
                      htmlFor="toGuard1"
                      className="text-sm font-semibold text-slate-200 cursor-pointer"
                    >
                      Prima Guardia Intervenuta (Verbalizzante)
                    </label>
                    <p className="text-[11px] text-slate-400 font-sans leading-normal">
                      Riceve una copia personale di servizio.
                    </p>
                    <Input
                      disabled={!toGuard1}
                      value={guard1Email}
                      onChange={(e) => setGuard1Email(e.target.value)}
                      placeholder="E-mail della prima guardia"
                      className="h-9 text-xs bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione 4: Guardia 2 */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-slate-800 transition">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="toGuard2"
                    checked={toGuard2}
                    onChange={(e) => setToGuard2(e.target.checked)}
                    className="mt-1 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1.5 text-left">
                    <label
                      htmlFor="toGuard2"
                      className="text-sm font-semibold text-slate-200 cursor-pointer"
                    >
                      Seconda Guardia Intervenuta (Verbalizzante)
                    </label>
                    <p className="text-[11px] text-slate-400 font-sans leading-normal">
                      Riceve una copia personale di servizio.
                    </p>
                    <Input
                      disabled={!toGuard2}
                      value={guard2Email}
                      onChange={(e) => setGuard2Email(e.target.value)}
                      placeholder="E-mail della seconda guardia"
                      className="h-9 text-xs bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-white/5 bg-slate-950 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              disabled={isSendingEmail}
              onClick={() => setEmailDialogReport(null)}
              className="flex-1 border-slate-800 text-slate-350 hover:bg-slate-900 text-white rounded-xl h-12 uppercase tracking-widest text-xs font-semibold"
            >
              Annulla
            </Button>
            <Button
              disabled={
                isSendingEmail ||
                (!toSede && !toControllato && !toGuard1 && !toGuard2)
              }
              onClick={async () => {
                if (!emailDialogReport) return;
                setIsSendingEmail(true);
                setEmailFeedback({
                  isOpen: true,
                  status: "sending",
                  title: "Inizializzazione SMTP...",
                  message: `Preparazione del file PDF conforme per il Verbale N° ${emailDialogReport.numeroVerbale || "N/A"}. Connessione e routing e-mail in corso.`,
                  log: [
                    "Connessione al canale SMTP...",
                    "Generazione del certificato allegato PDF...",
                    "Composizione dei destinatari...",
                  ],
                });

                try {
                  const payload = {
                    report: emailDialogReport,
                    toSede,
                    sedeEmail: toSede ? sedeEmail.trim() : "",
                    toControllato,
                    controllatoEmail: toControllato
                      ? controllatoEmail.trim()
                      : "",
                    toGuard1,
                    guard1Email: toGuard1 ? guard1Email.trim() : "",
                    toGuard2,
                    guard2Email: toGuard2 ? guard2Email.trim() : "",
                  };

                  const res = await fetch("/api/send-report-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });

                  if (res.ok) {
                    const data = await res.json();
                    const successes = data.successes || [];
                    const failures = data.failures || [];
                    const errorsList = data.errors || [];
                    const finalErrors = [...failures, ...errorsList];

                    setEmailFeedback({
                      isOpen: true,
                      status: finalErrors.length > 0 ? "warning" : "success",
                      title: "Esito Trasmissione",
                      message:
                        "Processo di notifica e recapito del verbale ultimato con i seguenti riscontri dal server SMTP.",
                      successes:
                        successes.length > 0
                          ? successes
                          : ["Archiviazione Nucleo completata"],
                      errors: finalErrors.length > 0 ? finalErrors : undefined,
                      log: [
                        "SMTP OK.",
                        "Salvataggio log completato.",
                        "Sessione chiusa.",
                      ],
                    });

                    setEmailDialogReport(null);
                  } else {
                    const errData = await res.json().catch(() => ({}));
                    setEmailFeedback({
                      isOpen: true,
                      status: "error",
                      title: "Errore e-mail bloccata",
                      message:
                        "La trasmissione telematica a uno o più indirizzi è stata bloccata o respinta per rifiuto delle credenziali SMTP o casella inesistente.",
                      errors: [
                        errData.error ||
                          "Rifiuto del destinatario o credenziali SMTP non valide.",
                      ],
                      log: [
                        "Server: Errore di autenticazione",
                        `Dettagli: ${errData.error || "Unknown Error"}`,
                      ],
                    });
                  }
                } catch (err: any) {
                  setEmailFeedback({
                    isOpen: true,
                    status: "error",
                    title: "Errore Connessione Rete",
                    message:
                      "Mancata connessione di rete o timeout del server SMTP d'ufficio durante la spedizione.",
                    errors: [err.message || String(err)],
                    log: [`Errore di rete: ${err.message || err}`],
                  });
                } finally {
                  setIsSendingEmail(false);
                }
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-12 uppercase tracking-widest text-xs font-semibold shadow-lg shadow-purple-950"
            >
              {isSendingEmail ? "Invio in corso..." : "Invia E-mail"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EmailFeedbackModal
        state={emailFeedback}
        onClose={() => setEmailFeedback(null)}
      />

      {/* Visual document uploader Dialog */}
      <Dialog
        open={!!uploadModalData}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalData(null);
            setIsModalProcessing(false);
            setModalSuccessMessage(null);
            setModalErrorMessage(null);
          }
        }}
      >
        <DialogContent className="bg-slate-950 border-slate-800 text-white w-[95vw] sm:max-w-md p-6 rounded-3xl font-sans">
          <DialogHeader className="pb-4 border-b border-slate-900 select-none">
            <DialogTitle className="text-xs font-bold italic tracking-widest text-purple-400 uppercase flex items-center gap-2">
              <FileUp className="h-4 w-4 text-purple-500 animate-bounce" />
              Acquisizione Documento
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-normal uppercase text-[8px] tracking-wider leading-relaxed mt-1">
              Fascicolo Unificato • Tipo:{" "}
              {uploadModalData?.documentType || "Sconosciuto"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            {!isModalProcessing &&
              !modalSuccessMessage &&
              !modalErrorMessage && (
                <>
                  <div
                    className="w-full border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-900/40 hover:bg-purple-950/5 transition-all p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer relative"
                    onClick={() => {
                      const uploader = document.getElementById(
                        "hq-modal-only-uploader",
                      ) as HTMLInputElement;
                      if (uploader) {
                        uploader.value = "";
                        uploader.click();
                      }
                    }}
                  >
                    <Upload className="h-8 w-8 text-slate-500 mb-3" />
                    <span className="text-xs font-bold text-slate-300 uppercase">
                      Seleziona File o Foto
                    </span>
                    <p className="text-[9px] text-slate-500 uppercase mt-1 leading-relaxed">
                      Scegli Certificati, Ricevute, Scannerizzazioni o Foto
                      dell'animale da associare
                    </p>
                    <input
                      type="file"
                      id="hq-modal-only-uploader"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (uploadModalData) {
                          handleModalFileChange(
                            e,
                            uploadModalData.reportId,
                            uploadModalData.documentType,
                          );
                        }
                      }}
                    />
                  </div>
                </>
              )}

            {isModalProcessing && (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-3" />
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest animate-pulse">
                  Salvataggio in corso...
                </span>
                <p className="text-[9px] text-slate-500 uppercase mt-1">
                  Acquisizione ed inserimento nel database sicuro
                </p>
              </div>
            )}

            {modalSuccessMessage && (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {modalSuccessMessage}
                </span>
                <p className="text-[9px] text-slate-500 uppercase mt-2 select-none">
                  Il file è ora accessibile per amministratore e operatori sotto
                  la voce allegati.
                </p>
              </div>
            )}

            {modalErrorMessage && (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <AlertTriangle className="h-12 w-12 text-rose-500 mb-3" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  {modalErrorMessage}
                </span>
                <p className="text-[9px] text-slate-500 uppercase mt-2">
                  Verifica il formato del file o la tua connessione internet e
                  riprova.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-900 select-none">
            <Button
              variant="outline"
              onClick={() => {
                setUploadModalData(null);
                setModalSuccessMessage(null);
                setModalErrorMessage(null);
              }}
              className="w-full bg-slate-900 border-slate-800 text-slate-300 hover:text-white h-10 text-[10px] uppercase font-bold"
            >
              {modalSuccessMessage ? "Completo / Chiudi" : "Annulla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating windows desk/workspace */}
      {activeWindows.length > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-[9999]"
          id="floating-attachment-desk"
        >
          {activeWindows.map((win) => {
            const isPdf =
              win.url.startsWith("blob:") ||
              win.url.startsWith("data:application/pdf") ||
              win.name.toLowerCase().endsWith(".pdf") ||
              win.type === "document";

            return (
              <div
                key={win.id}
                style={{
                  position: "fixed",
                  left: `${win.x}px`,
                  top: `${win.y}px`,
                  zIndex: win.zIndex,
                  width: `${win.width}px`,
                  height: `${win.height}px`,
                  resize: "both",
                  overflow: "hidden",
                  minWidth: "320px",
                  minHeight: "240px",
                }}
                className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col pointer-events-auto select-none overflow-hidden"
                onMouseDown={() => bringToFront(win.id)}
              >
                {/* Header Bar */}
                <div
                  className="bg-slate-950 px-3 py-2.5 flex items-center justify-between cursor-move border-b border-slate-800 shrink-0"
                  onMouseDown={(e) => {
                    bringToFront(win.id);
                    if ((e.target as HTMLElement).closest(".window-no-drag"))
                      return;

                    setIsDragging(win.id);
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startLeft = win.x;
                    const startTop = win.y;

                    const handleMouseMove = (moveE: MouseEvent) => {
                      const dx = moveE.clientX - startX;
                      const dy = moveE.clientY - startY;
                      setActiveWindows((curr) =>
                        curr.map((w) =>
                          w.id === win.id
                            ? { ...w, x: startLeft + dx, y: startTop + dy }
                            : w,
                        ),
                      );
                    };

                    const handleMouseUp = () => {
                      setIsDragging(null);
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove,
                      );
                      document.removeEventListener("mouseup", handleMouseUp);
                    };

                    document.addEventListener("mousemove", handleMouseMove);
                    document.addEventListener("mouseup", handleMouseUp);
                  }}
                >
                  <div className="flex items-center gap-2 truncate pr-4">
                    {win.type === "photo" ? (
                      <Camera className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                    )}
                    <span className="text-xs text-slate-200 uppercase tracking-wide truncate max-w-[280px] font-normal">
                      {win.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 window-no-drag shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        window.open(win.url, "_blank");
                      }}
                      className="text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-900/40 px-2 py-1 rounded text-[10px] tracking-wider uppercase transition-all flex items-center gap-1 font-normal"
                      title="Apri documento in un'altra scheda del browser (Stampa/Zoom completo)"
                    >
                      <FolderOpen className="h-3 w-3 text-purple-400 shrink-0" />
                      <span>Apri Tab</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWindows((curr) =>
                          curr.map((w) =>
                            w.id === win.id
                              ? { ...w, width: 550, height: 450 }
                              : w,
                          ),
                        );
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-all font-normal"
                      title="Ripristina dimensioni"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWindows((curr) =>
                          curr.filter((w) => w.id !== win.id),
                        );
                      }}
                      className="text-rose-400 hover:text-rose-350 p-1 rounded hover:bg-rose-950/25 transition-all font-normal"
                      title="Chiudi"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  {isPdf ? (
                    <iframe
                      src={win.url}
                      className="w-full h-full border-none"
                      style={{
                        pointerEvents: isDragging ? "none" : "auto",
                        background: "white",
                      }}
                      title={win.name}
                    />
                  ) : (
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-2 bg-slate-950/40">
                      <img
                        src={win.url}
                        alt={win.name}
                        className="max-h-full max-w-full object-contain"
                        style={{ pointerEvents: isDragging ? "none" : "auto" }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {/* Footer resize handle layout indicator */}
                <div className="h-2 bg-slate-950 flex justify-end items-end p-0.5 pointer-events-none shrink-0">
                  <div className="w-1.5 h-1.5 border-r border-b border-slate-700 mr-0.5 mb-0.5"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

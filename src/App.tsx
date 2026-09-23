import { RadarLateralPanel } from "./RadarLateralPanel";
import React, { useState, useEffect, ChangeEvent, useRef } from "react";
import { createPortal } from "react-dom";
import { VerbaleAIDialog } from "./VerbaleAIDialog";
import { VerbaleSanzioneDialog } from "./components/VerbaleSanzioneDialog";
import { generateVerbalePDF } from "./lib/pdfUtils";
import { EmailFeedbackModal, EmailFeedbackState } from "./components/EmailFeedbackModal";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
  where,
  setDoc,
  getDocs,
  updateDoc,
  limit,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import {
  signInAnonymously,
  onAuthStateChanged,
  type User as FirebaseUser,
  signOut,
} from "firebase/auth";
import { db, auth } from "./lib/firebase";
import { DiplomaModal } from "./components/DiplomaModal";
import { ServiceReportsTab } from "./components/ServiceReportsTab";
import { ReportHeader } from "./components/ReportHeader";
import { VerbaliHQTab } from "./components/VerbaliHQTab";
import { StatsAndControlsTab } from "./components/StatsAndControlsTab";
import { ControlloTerritorioDialog } from "./components/ControlloTerritorioDialog";
import { AcquisizioneAttiDialog } from "./components/AcquisizioneAttiDialog";
import { VerbalisticaSelectorDialog } from "./components/VerbalisticaSelectorDialog";
import { PendingDocumentsDialog } from "./components/PendingDocumentsDialog";
import { VehicleLogDialog } from "./components/VehicleLogDialog";
import { syncMicrochipToArchive } from "./lib/microchipSync";
import { CentraleOperativaTab } from "./components/CentraleOperativaTab";
import { AnimaliaCensusTab } from "./components/AnimaliaCensusTab";
import { PatrolDashboard } from "./components/PatrolDashboard";
import { OperationalCalendar } from "./components/OperationalCalendar";
import { SosRotationTab } from "./components/SosRotationTab";
import { PendingDocumentsTab } from "./components/PendingDocumentsTab";
import { DocumentsBachecaTab } from "./components/DocumentsBachecaTab";
import { AnagraficaGuardieTab } from "./components/AnagraficaGuardieTab";
import { RichiestaInterventoDialog } from "./components/RichiestaInterventoDialog";
import { DetailInterventoDialog } from "./components/DetailInterventoDialog";
import { MicrochipLookupModal } from "./components/MicrochipLookupModal";
import { ForbiddenDrugsAndSymptomsModal } from "./components/ForbiddenDrugsAndSymptomsModal";
import { ArchivioTurniDialog } from "./components/ArchivioTurniDialog";
import { OperatoGuardieDialog } from "./components/OperatoGuardieDialog";
import { ManualModal } from "./components/ManualModal";
import { VideoCallDialog } from "./components/VideoCallDialog";
import { LoginScreen } from "./components/LoginScreen";
import { BackupRestoreModal } from "./components/BackupRestoreModal";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";

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
import {
  Home,
  HardDrive,
  Calendar as CalendarIcon,
  Plus,
  ArrowLeft,
  ChevronLeft,
  Trash2,
  Ban,
  UserX,
  LogOut,
  LogIn,
  Clock,
  User as UserIcon,
  Briefcase,
  Scissors,
  Info,
  Download,
  Upload,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Fish,
  Bird,
  PawPrint,
  Trees,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Pencil,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Signal,
  Bell,
  Siren,
  Truck,
  FileText,
  Trash,
  PlusCircle,
  ClipboardList,
  ClipboardCheck,
  CircleAlert,
  BarChart3,
  Printer,
  Lock,
  LifeBuoy,
  Eye,
  EyeOff,
  Activity,
  UserPlus,
  UserCircle,
  HelpCircle,
  UserCog,
  ExternalLink,
  DatabaseZap,
  FileSearch,
  Globe,
  Wrench,
  Mail,
  History as HistoryIcon,
  LayoutGrid,
  Camera,
  RefreshCcw,
  Save,
  Loader2,
  MessageSquare,
  MessageCircle,
  Video,
  CreditCard,
  BadgeCheck,
  Scan,
  ScanLine,
  PhoneCall,
  PhoneForwarded,
  Search,
  Heart,
  Building2,
  Hotel,
  ShieldPlus,
  Maximize2,
  Minimize2,
  Menu,
  CalendarClock,
  BookOpen,
  Folder,
  BookOpenText,
  Scale,
  Smartphone,
  Radio,
  Award,
  Wifi,
  WifiOff,
  Send,
  User,
  Users,
  Sparkles,
  RefreshCw,
  FileUp,
  ChevronDown,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons in Vite to prevent blank screen crashes on mobile
if (typeof window !== "undefined" && L && L.Icon && L.Icon.Default) {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  } catch (err) {
    console.warn("Leaflet default icons failover error in App.tsx:", err);
  }
}

const MapResizeTrigger = ({ watch }: { watch?: any }) => {
  const map = useMap();
  useEffect(() => {
    // Immediate invalidate
    map.invalidateSize();
    
    // Sequence to catch transitions
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 150);
    const t3 = setTimeout(() => map.invalidateSize(), 300);
    const t4 = setTimeout(() => map.invalidateSize(), 500);
    const t5 = setTimeout(() => map.invalidateSize(), 1000);
    const t6 = setTimeout(() => map.invalidateSize(), 2000);
    
    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(t => clearTimeout(t));
    };
  }, [map, watch]);
  return null;
};

const MapAutoCenter = ({ markers }: { markers: any[] }) => {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    try {
      if (markers.length > 0 && !hasCentered.current) {
        const validMarkers = markers.filter(m => m && typeof m.lat === 'number' && typeof m.lng === 'number');
        if (validMarkers.length > 0) {
          const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          hasCentered.current = true;
        }
      } else if (markers.length === 0 && !hasCentered.current) {
        // Posizionamento predefinito se non ci sono guardie online (Provincia di Massa-Carrara)
        map.setView([44.15, 10.13], 11);
        hasCentered.current = true;
      }
    } catch (e) {
      console.error("MapAutoCenter error:", e);
    }
  }, [markers, map]);
  return null;
};

const MapCenterController = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
};

export function isGuardQualifiedForSector(guard: any, sectorId: string): boolean {
  if (!guard) return false;
  if (!sectorId) return true;
  const quals: string[] = Array.isArray(guard.qualifications) ? guard.qualifications : [];
  const sec = sectorId.toLowerCase();
  const qLower = quals.map(q => typeof q === 'string' ? q.toLowerCase().trim() : String(q).toLowerCase().trim());
  
  if (sec === "ittica") {
    // Solo chi ha abilitazione specifica Ittica può fare Ittica
    return qLower.includes("ittica");
  }
  if (sec === "venatoria") {
    // Abbinamento consentito: Venatoria o Zoofila (in quanto i cacciatori hanno cani)
    return qLower.includes("venatoria") || qLower.includes("zoofila");
  }
  if (sec === "zoofila") {
    // Abbinamento consentito: Zoofila o Venatoria (i cacciatori hanno cani)
    return qLower.includes("zoofila") || qLower.includes("venatoria");
  }
  if (sec === "ambientale") {
    // Ambientale è aperto o su qualifica ambientale/tutti
    return qLower.includes("ambientale") || qLower.includes("zoofila") || qLower.includes("venatoria") || qLower.includes("ittica");
  }
  return true;
}

const MapClickSelector = ({ onSelectPoint }: { onSelectPoint: (address: string, lat: number, lng: number) => void }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      onSelectPoint("Ricerca indirizzo in corso...", lat, lng);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        if (data && data.display_name) {
          onSelectPoint(data.display_name, lat, lng);
        } else {
          onSelectPoint(`Punto su Mappa (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`, lat, lng);
        }
      } catch (err) {
        onSelectPoint(`Punto su Mappa (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`, lat, lng);
      }
    }
  });
  return null;
};
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isHoliday, formatItalianDate } from "./lib/date-utils";
import { motion, AnimatePresence, useDragControls } from "motion/react";

import { SplashScreen } from "./components/SplashScreen";
import { EkoclubLogo } from "./components/EkoclubLogo";

import { processVerbaleImage } from "./services/aiService";

import { cn } from "./lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Shift,
  Guard,
  GuardPrivateInfo,
  Alert,
  Report as AppReport,
  Vehicle,
  EnvironmentalReport,
  Document as AppDocument,
  VehicleLog,
  VehicleMaintenanceRecord,
  ServiceReport,
  Mission,
  UsefulContact,
  SosDutyShift,
  TerritoryControl,
  SanctionReport,
} from "./types";

const SosDutyManager = ({ guards, sosDutyShifts }: { guards: Guard[], sosDutyShifts: SosDutyShift[] }) => {
  const [selectedSosDay, setSelectedSosDay] = useState<Date | undefined>(new Date());
  const [selectedGuardForSos, setSelectedGuardForSos] = useState<string>("");
  const [sosOrder, setSosOrder] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  // Calcolo dei turni con risoluzione nomi infallibile
  const dutiesForSelectedDay = React.useMemo(() => {
    if (!selectedSosDay || !sosDutyShifts) return [];
    return sosDutyShifts
      .filter(s => {
        try {
          if (!s.date) return false;
          const shiftDate = typeof s.date === 'string' ? parseISO(s.date) : (s.date as any).toDate?.();
          return shiftDate && isSameDay(shiftDate, selectedSosDay);
        } catch (e) {
          return false;
        }
      })
      .map(duty => {
        const guard = guards?.find(g => g.id === duty.guardId);
        // Risoluzione nome: preferenza ai dati della guardia caricati
        let name = duty.guardName || "Nominativo Assente";
        if (guard) {
          name = `${guard.surname || ""} ${guard.name || ""}`.trim() || guard.name || name;
        }
        return { ...duty, resolvedName: name };
      })
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [selectedSosDay, sosDutyShifts, guards]);

  const supervisors = guards?.filter(g => g.role === 'responsabile' || g.role === 'admin') || [];

  const handleAddShift = async () => {
    if (!selectedSosDay || !selectedGuardForSos) return;
    setIsAdding(true);
    try {
      const guard = guards.find(g => g.id === selectedGuardForSos);
      if (!guard) return;

      const dateStr = format(selectedSosDay, "yyyy-MM-dd");
      const fullName = `${guard.surname || ""} ${guard.name || ""}`.trim() || guard.name || "Senza Nome";
      
      await addDoc(collection(db, "sos_duty_shifts"), {
        guardId: guard.id,
        guardName: fullName,
        matricola: guard.matricola || "",
        date: dateStr,
        order: Number(sosOrder) || 1
      });
      setSelectedGuardForSos("");
    } catch (e) {
      console.error("Error adding SOS shift:", e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveShift = async (id: string) => {
    console.log("Attempting to remove SOS shift with ID:", id);
    if (!id) {
      console.error("Null ID passed to handleRemoveShift");
      return;
    }
    try {
      await deleteDoc(doc(db, "sos_duty_shifts", id));
      console.log("SOS shift successfully removed from Firestore");
    } catch (e) {
      console.error("CRITICAL ERROR removing SOS shift:", e);
      if (typeof handleFirestoreError === 'function') {
        handleFirestoreError(e, OperationType.DELETE, `sos_duty_shifts/${id}`);
      }
    }
  };

  if (!guards) return <div className="p-10 text-white italic">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl flex items-center gap-3 text-white">
            <ShieldPlus className="h-8 w-8 text-red-500" />
            Controllo Turni SOS
          </h2>
          <p className="text-sm text-white mt-1 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded inline-block">
            Organizzazione della risposta rapida escalation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-slate-900 border-slate-400 p-6 shadow-2xl">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-sm uppercase tracking-widest text-white border-b border-red-500 pb-2 font-normal">1. Scegli Data</CardTitle>
            </CardHeader>
            <Calendar
              mode="single"
              selected={selectedSosDay}
              onSelect={setSelectedSosDay}
              locale={it}
              className="rounded-xl border border-slate-500 bg-black p-3 mx-auto"
            />
          </Card>

          <Card className="bg-slate-900 border-slate-400 p-6 shadow-2xl">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-sm uppercase tracking-widest text-white border-b border-red-500 pb-2 font-normal">2. Aggiungi Responsabile</CardTitle>
            </CardHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-white tracking-widest block mb-1">Seleziona Responsabile:</Label>
                <Select value={selectedGuardForSos} onValueChange={setSelectedGuardForSos}>
                  <SelectTrigger className="bg-black border-slate-200 text-white h-14 rounded-xl text-lg w-full">
                    <SelectValue placeholder="Scegli dalla lista..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-400 text-white">
                    {supervisors.map((g, idx) => (
                      <SelectItem key={`${g.id}_${idx}`} value={g.id} className="text-xl py-3 border-b border-slate-800">
                        {g.surname} {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-white tracking-widest block mb-1">Ordine Priorità (1 = Primo):</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={sosOrder} 
                  onChange={(e) => setSosOrder(Number(e.target.value))}
                  className="bg-black border-slate-200 text-white h-14 rounded-xl text-2xl font-mono"
                />
              </div>
              <Button 
                onClick={handleAddShift} 
                disabled={isAdding || !selectedGuardForSos}
                className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xl border-4 border-red-400 text-lg tracking-widest transition-all uppercase font-normal"
              >
                {isAdding ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Plus className="h-6 w-6 mr-3" />}
                AGGIUNGI TURNO
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="bg-black border-4 border-slate-600 min-h-[600px] flex flex-col shadow-2xl">
            <CardHeader className="p-8 border-b border-slate-600 bg-slate-900">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl text-white italic">
                    {selectedSosDay ? format(selectedSosDay, "EEEE d MMMM", { locale: it }) : "Seleziona una data"}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-widest mt-1">Responsabili attivi per l'SOS</CardDescription>
                </div>
                <div className="bg-red-600 text-white px-4 py-2 text-sm border border-white rounded-xl font-normal">
                   {dutiesForSelectedDay.length} ASSEGNATI
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 flex-1">
              {dutiesForSelectedDay.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-24 text-center space-y-10">
                  <ShieldAlert className="h-48 w-48 text-red-500 opacity-90" />
                  <div className="max-w-xl space-y-6">
                    <p className="text-3xl text-white uppercase italic">Nessun turno programmato</p>
                    <p className="text-xl text-white bg-red-950/50 p-10 rounded-2xl border-2 border-red-600 leading-relaxed shadow-2xl">
                      ATTENZIONE: In questa data l'allarme SOS contatterà <span className="text-red-500 underline underline-offset-8">TUTTI</span> i responsabili contemporaneamente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {dutiesForSelectedDay.map((duty, idx) => (
                    <div 
                      key={`${duty.id}_${idx}`} 
                      className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-lg transition-all hover:bg-slate-800/80"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center text-[10px] border shadow-md shrink-0",
                          duty.order === 1 
                            ? "bg-red-600 border-white text-white" 
                            : "bg-black border-slate-600 text-white"
                        )}>
                          #{duty.order}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-white uppercase tracking-tight font-normal truncate">
                            {duty.resolvedName}
                          </p>
                          <div className="flex items-center gap-2">
                             <div className="bg-black px-1.5 py-0.5 rounded border border-slate-700">
                                <span className="text-[7px] text-slate-500 uppercase tracking-widest mr-1">Matricola:</span>
                                <span className="text-[10px] text-white font-mono">{duty.matricola || '---'}</span>
                             </div>
                             {duty.order === 1 && (
                               <span className="bg-white text-red-600 text-[7px] px-1.5 py-0.5 rounded-full border border-red-600 uppercase font-normal">
                                 Soggetto Prioritario
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          console.log("Delete button clicked for:", duty);
                          if (window.confirm(`ELIMINARE TURNO DI ${duty.resolvedName}?`)) {
                            handleRemoveShift(duty.id);
                          }
                        }}
                        className="h-10 w-24 bg-red-600 hover:bg-red-700 text-white rounded-lg flex flex-col items-center justify-center shadow-md border border-red-400 shrink-0 ml-4"
                      >
                        <Trash2 className="h-4 w-4 mb-0.5" />
                        <span className="text-[8px] tracking-tighter uppercase font-normal">ELIMINA</span>
                      </Button>
                    </div>
                  ))}
                  
                  <div className="mt-8 p-6 bg-blue-950/20 border border-blue-500/30 rounded-2xl shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-600/80 p-3 rounded-xl border border-white/20 shadow-md">
                        <Info className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-3">
                        <p className="text-base text-blue-300 uppercase tracking-widest italic font-normal">Escalation SOS</p>
                        <ul className="text-xs text-slate-300 space-y-2 list-none">
                          <li className="flex gap-2">
                            <span className="text-blue-500">▶</span>
                            L'allarme chiama prima il <span className="text-white font-normal">Referente #1</span>.
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500">▶</span>
                            In caso di mancata risposta, scala agli altri in lista.
                          </li>
                          <li className="flex gap-2 p-3 bg-red-950/30 rounded-lg border border-red-600/30 mt-4">
                            <span className="text-red-500">⚠</span>
                            <span className="text-red-200 text-xs italic font-normal">Se nessuno risponde, l'allarme viene esteso a tutto il personale.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const DraggableWindow = ({ 
  title, 
  children, 
  onClose, 
  icon: Icon = Settings,
  className = "",
  isMaximized = false,
  noPadding = false,
  defaultWidth = "95vw",
  defaultHeight = "auto"
}: { 
  title: string, 
  children: React.ReactNode, 
  onClose: () => void,
  icon?: any,
  className?: string,
  isMaximized?: boolean,
  noPadding?: boolean,
  defaultWidth?: string,
  defaultHeight?: string
}) => {
  const dragControls = useDragControls();

  return (
    <motion.div
      drag={!isMaximized && (typeof window !== 'undefined' && window.innerWidth > 768)}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%", top: "50%", left: "50%" }}
      animate={isMaximized ? { 
        opacity: 1,
        scale: 1,
        top: 0, 
        left: 0, 
        x: 0, 
        y: 0, 
        width: "100%", 
        height: "100%",
        borderRadius: 0,
        zIndex: 100000
      } : { 
        opacity: 1,
        scale: 1,
        top: "50%",
        left: "50%",
        x: "-50%", 
        y: "-50%",
        width: (typeof window !== 'undefined' && window.innerWidth < 768) ? "92vw" : defaultWidth,
        height: (typeof window !== 'undefined' && window.innerWidth < 768) ? "85vh" : defaultHeight,
        borderRadius: "1.5rem",
        zIndex: 99999
      }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ 
        position: 'fixed'
      }}
      className={cn(
        "bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col pointer-events-auto",
        !isMaximized && "md:w-[900px] max-h-[95vh]",
        className
      )}
    >
      <div 
        onPointerDown={(e) => {
          if (!isMaximized && typeof window !== 'undefined' && window.innerWidth > 768) {
            dragControls.start(e);
          }
        }}
        className={cn(
          "bg-slate-950 p-4 md:p-6 flex justify-between items-center border-b border-white/5 select-none font-sans shrink-0",
          (!isMaximized && typeof window !== 'undefined' && window.innerWidth > 768) && "cursor-move active:cursor-grabbing"
        )}
      >
        <div className="flex items-center gap-3 text-white font-normal italic uppercase tracking-widest text-sm md:text-base">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
          {title}
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-white transition-colors p-3 hover:bg-slate-900 rounded-xl cursor-pointer"
        >
          <X className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
      <div className={cn(
        "flex-1 overflow-y-auto overscroll-contain bg-slate-900/40 relative",
        noPadding ? "p-0" : "p-4 md:p-8"
      )}>
        {children}
      </div>
    </motion.div>
  );
};

const SECTORS = [
  {
    id: "ittica",
    label: "GUARDIA ITTICA",
    icon: Fish,
    color: "blue",
    hours: { start: "07:00", end: "23:00" },
  },
  {
    id: "venatoria",
    label: "GUARDIA VENATORIA",
    icon: Bird,
    color: "green",
    hours: { start: "05:00", end: "19:00" },
  },
  {
    id: "zoofila",
    label: "GUARDIA ZOOFILA",
    icon: PawPrint,
    color: "orange",
    hours: { start: "07:00", end: "23:00" },
  },
  {
    id: "ambientale",
    label: "VIGILANZA AMBIENTALE",
    icon: ShieldCheck,
    color: "emerald",
    hours: { start: "06:00", end: "22:00" },
  },
] as const;

// --- RESPONSABILE DELEGATO PER SETTORE VENATORIA E ITTICA ---
// Inserire l'email del responsabile che riceverà le notifiche e autorizzerà questi settori.
const DELEGATED_VI_RESPONSIBLE_EMAIL: string = ""; // Es: "nome.cognome@gmail.com"
// -----------------------------------------------------------

const CANCELLATION_REASONS = [
  "Malattia",
  "Impegno Imprevisto",
  "Guasto Mezzo",
  "Altra motivazione (specifica sotto)",
];

const MUNICIPALITIES = [
  "Generale / Provincia", "Carrara", "Massa", "Aulla", "Fivizzano", "Pontremoli", 
  "Fosdinovo", "Podenzana", "Villafranca in Lunigiana", "Bagnone", 
  "Licciana Nardi", "Mulazzo", "Comano", "Filattiera", 
  "Tresana", "Zeri", "Casola in Lunigiana"
];

const CONTACT_CATEGORIES = [
  "Emergenza", 
  "Veterinari", 
  "Farmacie Veterinarie", 
  "Forze dell'Ordine", 
  "Pet Friendly (Hotel/B&B)", 
  "Servizi Comunità",
  "Toelettatura", 
  "Altro"
];

import { VehicleDamageMap } from "./components/VehicleDamageMap";
import { VehiclesTab } from "./components/VehiclesTab";

// Firebase Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  if (errMessage.includes("resource-exhausted") || errMessage.includes("Quota limit exceeded")) {
    console.warn("Quota limit reached for Firestore. Operating with local cached data.");
  }
}

// ============================================================================
// DATASET DI EMERGENZA & PUNTI DI INTERESSE (P.O.I.) MASSA-CARRARA (SUPER PAZZIA)
// ============================================================================
export const POI_DATA = [
  // 1. Ambulatori / Cliniche veterinarie (vet_clinics)
  {
    id: "vet_1",
    name: "AniCura Clinica Veterinaria Apuana (H24)",
    category: "vet_clinics",
    comune: "Carrara",
    address: "Via Arezzo 9, Carrara (Avenza)",
    phone: "0585855491",
    hours: "Aperto 24 ore su 24 (Pronto Soccorso Continuo)",
    coordinates: [44.0610, 10.0758]
  },
  {
    id: "vet_2",
    name: "Clinica Veterinaria Città del Marmo (H24)",
    category: "vet_clinics",
    comune: "Carrara",
    address: "Viale Giovanni da Verrazzano 2, Marina di Carrara",
    phone: "0585788642",
    hours: "Aperto 24 ore su 24 (Pronto Intervento H24)",
    coordinates: [44.0378, 10.0415]
  },
  {
    id: "vet_3",
    name: "Clinica Veterinaria Malaspina",
    category: "vet_clinics",
    comune: "Massa",
    address: "Viale Malaspina 1, Massa",
    phone: "05851980108",
    hours: "Aperto | Chiude alle ore 19:00",
    coordinates: [44.0375, 10.1360]
  },
  {
    id: "vet_4",
    name: "Ricci Dr. Marco - Veterinario",
    category: "vet_clinics",
    comune: "Carrara",
    address: "Via Giuseppe Mazzini 12, Carrara",
    phone: "0585777751",
    hours: "Aperto | Chiude alle ore 19:15",
    coordinates: [44.0772, 10.0982]
  },
  {
    id: "vet_5",
    name: "Ambulatorio Veterinario Dr. Fruzzetti Roberto",
    category: "vet_clinics",
    comune: "Massa",
    address: "Via dei Limoni 34, Massa",
    phone: "0585241055",
    hours: "Aperto | Chiude alle ore 19:00",
    coordinates: [44.0255, 10.1215]
  },
  {
    id: "vet_6",
    name: "Ambulatorio Veterinario San Francesco Dott. Ricci",
    category: "vet_clinics",
    comune: "Massa",
    address: "Viale Roma 250, Massa",
    phone: "0585877854",
    hours: "Aperto | Disponibile per emergenze",
    coordinates: [44.0381, 10.1245]
  },
  {
    id: "vet_7",
    name: "Ambulatorio Veterinario Dr. Bogazzi",
    category: "vet_clinics",
    comune: "Carrara",
    address: "Via Provinciale Carrara-Avenza 112, Carrara",
    phone: "0585631365",
    hours: "Aperto | Chiude alle ore 19:00",
    coordinates: [44.0665, 10.0815]
  },
  {
    id: "vet_8",
    name: "Ambulatorio Medico Veterinario Associato Dr. Santo & Dr. Sinatti",
    category: "vet_clinics",
    comune: "Massa",
    address: "Viale della Repubblica 22, Massa",
    phone: "0585254549",
    hours: "Pronto Intervento | Chiude alle ore 19:30",
    coordinates: [44.0222, 10.1212]
  },
  {
    id: "vet_9",
    name: "Studio Associato Perfetti e Stoppa",
    category: "vet_clinics",
    comune: "Carrara",
    address: "Via VII Luglio 15, Carrara",
    phone: "0585788287",
    hours: "Apre alle ore 16:30 | Consulenze e Visite",
    coordinates: [44.0782, 10.0965]
  },
  {
    id: "vet_10",
    name: "Clinica Veterinaria Lunigiana (Aulla)",
    category: "vet_clinics",
    comune: "Aulla",
    address: "Via Nazionale 45, Aulla",
    phone: "0187420220",
    hours: "Lun-Sab 09:00-12:30, 15:00-19:00 | Reperibilità festivi",
    coordinates: [44.212, 9.974]
  },
  {
    id: "vet_11",
    name: "Ambulatorio Veterinario Dr. Ghelardoni (Pontremoli)",
    category: "vet_clinics",
    comune: "Pontremoli",
    address: "Via Sforza 5, Pontremoli",
    phone: "0187831002",
    hours: "Lun-Ven 10:00-12:30, 16:00-19:00",
    coordinates: [44.375, 9.882]
  },

  // 2. Forze dell'Ordine (law_enforcement)
  {
    id: "law_1",
    name: "Comando Provinciale Carabinieri Massa",
    category: "law_enforcement",
    comune: "Massa",
    address: "Via Marina Vecchia 150, Massa",
    phone: "05858211",
    hours: "Aperto 24 ore su 24 (Centrale Operativa 112)",
    coordinates: [44.029, 10.118]
  },
  {
    id: "law_2",
    name: "Compagnia Carabinieri Carrara",
    category: "law_enforcement",
    comune: "Carrara",
    address: "Via Eugenio Chiesa 3, Carrara",
    phone: "0585779500",
    hours: "Aperto 24 ore (Pronto Intervento 112)",
    coordinates: [44.0758, 10.0988]
  },
  {
    id: "law_3",
    name: "Questura di Massa-Carrara (Polizia di Stato)",
    category: "law_enforcement",
    comune: "Massa",
    address: "Via del Patriota 1, Massa",
    phone: "05854941",
    hours: "Aperto 24 ore (Soccorso Pubblico 113)",
    coordinates: [44.037, 10.141]
  },
  {
    id: "law_4",
    name: "Commissariato Polizia di Stato Carrara",
    category: "law_enforcement",
    comune: "Carrara",
    address: "Via Don Minzoni 13, Carrara",
    phone: "058564051",
    hours: "Aperto 24 ore",
    coordinates: [44.079, 10.096]
  },
  {
    id: "law_5",
    name: "Stazione Carabinieri Pontremoli",
    category: "law_enforcement",
    comune: "Pontremoli",
    address: "Piazza Italia 1, Pontremoli",
    phone: "0187830015",
    hours: "Reperibilità 24h",
    coordinates: [44.372, 9.884]
  },
  {
    id: "law_6",
    name: "Stazione Carabinieri Fivizzano",
    category: "law_enforcement",
    comune: "Fivizzano",
    address: "Via Roma 42, Fivizzano",
    phone: "0187928010",
    hours: "Servizio continuativo",
    coordinates: [44.238, 10.125]
  },

  // 3. Polizia Locale (local_police)
  {
    id: "local_1",
    name: "Polizia Locale Comando di Massa",
    category: "local_police",
    comune: "Massa",
    address: "Via Sforza 14, Massa",
    phone: "0585490230",
    hours: "Lun-Sab 07:30-20:00 (Estivo fino alle 24:00)",
    coordinates: [44.036, 10.134]
  },
  {
    id: "local_2",
    name: "Polizia Locale Comando di Carrara",
    category: "local_police",
    comune: "Carrara",
    address: "Via San Martino 1, Carrara (Comando Centrale)",
    phone: "058570000",
    hours: "Lun-Sab 07:30-20:30",
    coordinates: [44.0765, 10.1030]
  },
  {
    id: "local_3",
    name: "Polizia Locale Montignoso",
    category: "local_police",
    comune: "Montignoso",
    address: "Via Sforza 1, Montignoso",
    phone: "05858271228",
    hours: "Lun-Sab 08:00-19:00",
    coordinates: [44.015, 10.165]
  },
  {
    id: "local_4",
    name: "Polizia Locale Aulla",
    category: "local_police",
    comune: "Aulla",
    address: "Piazza Gramsci 1, Aulla",
    phone: "0187401222",
    hours: "Orario d'ufficio",
    coordinates: [44.213, 9.972]
  },

  // 4. Farmacie Veterinarie (vet_pharmacies)
  {
    id: "pharm_1",
    name: "Farmacia San Lorenzo (Reparto Veterinario)",
    category: "vet_pharmacies",
    comune: "Massa",
    address: "Via Aurelia Nord 10, Massa",
    phone: "058541011",
    hours: "Lun-Sab 08:00-20:00",
    coordinates: [44.039, 10.129]
  },
  {
    id: "pharm_2",
    name: "Farmacia Comunale di Via Farini (Avenza)",
    category: "vet_pharmacies",
    comune: "Carrara",
    address: "Via Farini 2, Carrara (Avenza - Zona Sant'Antonio)",
    phone: "0585857585",
    hours: "Aperta 24 ore su 24",
    coordinates: [44.0592, 10.0691]
  },
  {
    id: "pharm_3",
    name: "Farmacia Dr. Bottiglioni (Prodotti Veterinari)",
    category: "vet_pharmacies",
    comune: "Montignoso",
    address: "Via Carlo Sforza 12, Montignoso",
    phone: "0585348004",
    hours: "Lun-Sab 08:30-13:00, 15:30-19:30",
    coordinates: [44.018, 10.162]
  },
  {
    id: "pharm_4",
    name: "Farmacia Comunale Pontremoli",
    category: "vet_pharmacies",
    comune: "Pontremoli",
    address: "Via Garibaldi 10, Pontremoli",
    phone: "0187830133",
    hours: "Lun-Sab 08:30-12:30, 15:30-19:30",
    coordinates: [44.377, 9.881]
  },
  {
    id: "pharm_5",
    name: "Farmacia dello Stadio",
    category: "vet_pharmacies",
    comune: "Carrara",
    address: "Via Piave 18, Carrara",
    phone: "0585840210",
    hours: "Aperto | Chiude alle ore 20:00",
    coordinates: [44.0792, 10.0825]
  },
  {
    id: "pharm_6",
    name: "Farmacia Dott. Ugurgieri",
    category: "vet_pharmacies",
    comune: "Carrara",
    address: "Viale XX Settembre 45, Carrara",
    phone: "0585842902",
    hours: "Aperto | Chiude alle ore 19:30",
    coordinates: [44.0712, 10.0880]
  },
  {
    id: "pharm_7",
    name: "Lafarmacia. Massa",
    category: "vet_pharmacies",
    comune: "Massa",
    address: "Viale Roma 10, Massa",
    phone: "0585791218",
    hours: "Aperto | Chiude alle ore 22:00",
    coordinates: [44.0322, 10.1285]
  },
  {
    id: "pharm_8",
    name: "Farmacia Apuane",
    category: "vet_pharmacies",
    comune: "Carrara",
    address: "Via Bedizzano 7, Carrara",
    phone: "0585779728",
    hours: "Aperto | Chiude alle ore 19:30",
    coordinates: [44.0815, 10.1110]
  },
  {
    id: "pharm_9",
    name: "Farmacia dei Marmi",
    category: "vet_pharmacies",
    comune: "Massa",
    address: "Viale Roma 171, Massa",
    phone: "05851980404",
    hours: "Aperto | Chiude alle ore 20:00",
    coordinates: [44.0310, 10.1380]
  },
  {
    id: "pharm_10",
    name: "Farmacia Biso",
    category: "vet_pharmacies",
    comune: "Carrara",
    address: "Piazza Accademia 1, Carrara",
    phone: "058571088",
    hours: "Aperto | Chiude alle ore 19:30",
    coordinates: [44.0790, 10.0990]
  },
  {
    id: "pharm_11",
    name: "Farmacia Comunale la Perla",
    category: "vet_pharmacies",
    comune: "Carrara",
    address: "Via Bonascola 35, Carrara",
    phone: "0585841113",
    hours: "Aperto | Chiude alle ore 19:30",
    coordinates: [44.0725, 10.0760]
  },
  {
    id: "pharm_12",
    name: "Farmacia Comunale N.3",
    category: "vet_pharmacies",
    comune: "Massa",
    address: "Viale Roma 250, Massa",
    phone: "0585258923",
    hours: "Aperto | Chiude alle ore 20:30",
    coordinates: [44.0350, 10.1220]
  },

  // 5. ASL Territoriale (asl)
  {
    id: "asl_1",
    name: "Dipartimento Prevenzione Veterinaria ASL Toscana Nord Ovest",
    category: "asl",
    comune: "Massa",
    address: "Via Democrazia 10, Massa",
    phone: "05854931",
    hours: "Lun-Ven 08:30-13:30 (Reperibilità via 118)",
    coordinates: [44.033, 10.127]
  },
  {
    id: "asl_2",
    name: "Servizio Sanità Animale ASL Carrara",
    category: "asl",
    comune: "Carrara",
    address: "Piazza Sacco e Vanzetti 5, Carrara",
    phone: "05857671",
    hours: "Lun-Ven 08:30-13:30",
    coordinates: [44.061, 10.069]
  },
  {
    id: "asl_3",
    name: "Presidio Sanità Animale ASL Lunigiana",
    category: "asl",
    comune: "Aulla",
    address: "Piazza della Vittoria, Aulla",
    phone: "01874061",
    hours: "Lun-Ven 09:00-13:00",
    coordinates: [44.214, 9.971]
  }
];

const loadCacheData = <T,>(key: string): T[] => {
  try {
    const item = localStorage.getItem("cache_" + key);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    return [];
  }
};

const saveCacheData = (key: string, data: any[]) => {
  try {
    if (data && Array.isArray(data) && data.length > 0) {
      localStorage.setItem("cache_" + key, JSON.stringify(data));
    }
  } catch (e) {}
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>(() => loadCacheData("shifts"));
  const [guards, setGuards] = useState<Guard[]>(() => loadCacheData("guards"));
  const [alerts, setAlerts] = useState<Alert[]>(() => loadCacheData("alerts"));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadCacheData("vehicles"));
  const [sosDutyShifts, setSosDutyShifts] = useState<SosDutyShift[]>(() => loadCacheData("sos_duty_shifts"));
  const [envReports, setEnvReports] = useState<EnvironmentalReport[]>(() => loadCacheData("environmental_reports"));
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [animaliaCensus, setAnimaliaCensus] = useState<any[]>(() => loadCacheData("animalia_census"));
  const [isAnimaliaUnlocked, setIsAnimaliaUnlocked] = useState(false);
  const [animaliaPassword, setAnimaliaPassword] = useState("");
  const [showAnimaliaPassword, setShowAnimaliaPassword] = useState(false);
  const [animaliaError, setAnimaliaError] = useState("");
  const [documents, setDocuments] = useState<AppDocument[]>(() => loadCacheData("documents"));
  const [vehicleLogs, setVehicleLogs] = useState<VehicleLog[]>(() => loadCacheData("vehicle_logs"));
  const [currentGuard, setCurrentGuard] = useState<Guard | null>(null);
  const [session, setSession] = useState<{
    matricola: string;
    role: string;
    name: string;
  } | null>(null);
  const [isInstanceVerified, setIsInstanceVerified] = useState(false);
  const [hasAttemptedAutoLogin, setHasAttemptedAutoLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [activeSector, setActiveSector] =
    useState<(typeof SECTORS)[number]["id"]>("zoofila");
  const [calendarSectorFilter, setCalendarSectorFilter] = useState<string>("tutti");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [guardsLoaded, setGuardsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [showEmergencySkip, setShowEmergencySkip] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<EmailFeedbackState | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setIsInstallGuideOpen(true);
    }
  };

  const [matricolaInput, setMatricolaInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [sosProgress, setSosProgress] = useState(0);
  const [isSosActive, setIsSosActive] = useState(false);
  const [sosStage, setSosStage] = useState<'none' | 'holding' | 'pre-alarm' | 'broadcast'>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const announcedMissionIdsRef = useRef<Set<string>>(new Set());

  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(true);
  const [macroMode, setMacroMode] = useState<"patrol" | "hq">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "patrol" || params.get("tab") === "emergencies") {
        return "patrol";
      }
    }
    return "hq";
  });
  const [isMacroModulisticaOpen, setIsMacroModulisticaOpen] = useState(false);
  const [isMacroArchiviOpen, setIsMacroArchiviOpen] = useState(false);
  const [isMacroForenseOpen, setIsMacroForenseOpen] = useState(false);
  const [isAnagraficaDecretiOpen, setIsAnagraficaDecretiOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [radarPopupTabs, setRadarPopupTabs] = useState<Record<string, 'emergency' | 'work'>>({});
  const [isRubricaFloatingOpen, setIsRubricaFloatingOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") && params.get("tab") !== "radar") {
        return params.get("tab")!;
      }
    }
    return "centrale_operativa";
  });
  const isRadarMapOnly = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "map_only";
  const [openAdminMenu, setOpenAdminMenu] = useState<string | null>(null);
  const [isMicrochipLookupOpen, setIsMicrochipLookupOpen] = useState(false);
  const [sosRotationSubTab, setSosRotationSubTab] = useState<"calendar" | "approvals">("calendar");
  const [areaRiservataSubTab, setAreaRiservataSubTab] = useState<"black_box" | "cancellations" | "stats">("black_box");
  const [hqVerbaliSearchQuery, setHqVerbaliSearchQuery] = useState("");
  const [hqDossierSearchQuery, setHqDossierSearchQuery] = useState("");
  const [hqVerbaliInitialViewMode, setHqVerbaliInitialViewMode] = useState<"archive" | "map" | "cartella_unica">("archive");
  const [hqVerbaliActiveTab, setHqVerbaliActiveTab] = useState<"operative" | "environmental" | "sanctions">("operative");
  const [activeHqFolder, setActiveHqFolder] = useState<string | null>(null);
  const [hqViewMode, setHqViewMode] = useState<'hq' | 'guard' | null>(null);
  const [hqServiceSearchQuery, setHqServiceSearchQuery] = useState("");
  const [selectedSosIdForDetail, setSelectedSosIdForDetail] = useState<string | null>(null);
  const [emergenciesViewTab, setEmergenciesViewTab] = useState<"active" | "resolved">("active");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isStatsUnlocked, setIsStatsUnlocked] = useState(false);
  const [statsPassword, setStatsPassword] = useState("");
  const [selectedStatGuard, setSelectedStatGuard] = useState<string | null>(
    null,
  );
  const [showManual, setShowManual] = useState(false);
  const [showStatsPassword, setShowStatsPassword] = useState(false);
  const [statsError, setStatsError] = useState("");

  // Censimento Animalia Form States
  const [newCensusSpecie, setNewCensusSpecie] = useState<"gatti" | "cani" | "uccelli">("gatti");
  const [newCensusNome, setNewCensusNome] = useState("");
  const [newCensusLocalita, setNewCensusLocalita] = useState("");
  const [newCensusCount, setNewCensusCount] = useState<number>(1);
  const [newCensusDettagli, setNewCensusDettagli] = useState("");
  const [newCensusPhoto, setNewCensusPhoto] = useState<string>("");
  const [newCensusNotes, setNewCensusNotes] = useState("");
  const [newCensusCoords, setNewCensusCoords] = useState<{lat?: number, lng?: number}>({});

  // Admin Form State
  const [newGuard, setNewGuard] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    matricola: "",
    rank: "",
    role: "guardia" as const,
    qualifications: [] as string[],
    section: "",
  });
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [searchTermGuards, setSearchTermGuards] = useState<string>("");
  const [statusFilterGuards, setStatusFilterGuards] = useState<'all' | 'active' | 'notActive'>('all');
  const [isEditGuardDialogOpen, setIsEditGuardDialogOpen] = useState(false);
  const [isMoreFunctionsOpen, setIsMoreFunctionsOpen] = useState(false);
  
  // Detailed Guard Data States
  const [selectedGuardForSheet, setSelectedGuardForSheet] = useState<Guard | null>(null);
  const [activeGuardSheetSection, setActiveGuardSheetSection] = useState<'anagrafica' | 'operativo' | 'fisico' | 'vestiario'>('anagrafica');
  const [guardPrivateInfoMap, setGuardPrivateInfoMap] = useState<Record<string, GuardPrivateInfo>>({});
  const [isGuardSheetOpen, setIsGuardSheetOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [myProfileData, setMyProfileData] = useState({ phone: '', telegramChatId: '' });
  const [isGuardSheetViewOnly, setIsGuardSheetViewOnly] = useState(false);
  const [showBadgeBack, setShowBadgeBack] = useState(false);
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [isSavingGuardSheet, setIsSavingGuardSheet] = useState(false);
  const [editingPrivateInfo, setEditingPrivateInfo] = useState<GuardPrivateInfo>({});
  const [isBachecaOpen, setIsBachecaOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupModalMode, setBackupModalMode] = useState<"save" | "restore" | "all">("all");
  const [subTabGuards, setSubTabGuards] = useState<'personnel' | 'scadenze'>('personnel');
  const [isCheckingExpirations, setIsCheckingExpirations] = useState(false);

  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [selectedCallGuardId, setSelectedCallGuardId] = useState<string>("");
  const [isRadarMaximized, setIsRadarMaximized] = useState(false);
  const [radarMapCenter, setRadarMapCenter] = useState<[number, number] | null>(null);
  const [radarSearchAddress, setRadarSearchAddress] = useState("");
  const [radarSearchedPoint, setRadarSearchedPoint] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isSearchingRadarAddress, setIsSearchingRadarAddress] = useState(false);
  const [isSquadsPanelCollapsed, setIsSquadsPanelCollapsed] = useState(true);
  const [isVehiclesPanelCollapsed, setIsVehiclesPanelCollapsed] = useState(true);
  const [isSquadModeOnMap, setIsSquadModeOnMap] = useState(false);
  const [isSquadTableOpen, setIsSquadTableOpen] = useState(false);
  const [selectedSquadForMission, setSelectedSquadForMission] = useState<{
    squadName: string;
    timeSpan?: string;
    members: Array<{
      guardId: string;
      name: string;
      surname?: string;
      matricola: string;
      phone?: string;
    }>;
  } | null>(null);
  const [mobileRadarTab, setMobileRadarTab] = useState<'none' | 'search' | 'squads' | 'vehicles' | 'poi' | 'actions'>('none');
  const [isTracking, setIsTracking] = useState(false);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("TUTTI");

  // State per console di controllo e meteo ora-per-ora/minuto-per-minuto
  const [selectedWeatherArea, setSelectedWeatherArea] = useState<'coast' | 'lunigiana'>('coast');
  const [weatherSentAlert, setWeatherSentAlert] = useState(false);
  const [nowcastMinute, setNowcastMinute] = useState(0);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [isCloudRadarActive, setIsCloudRadarActive] = useState(false);
  const [cloudBodies, setCloudBodies] = useState<Array<{ id: number; lat: number; lng: number; radius: number; color: string; opacity: number }>>([
    { id: 1, lat: 44.05, lng: 9.82, radius: 5500, color: "#0284c7", opacity: 0.38 },
    { id: 2, lat: 44.18, lng: 9.88, radius: 7000, color: "#0284c7", opacity: 0.38 },
    { id: 3, lat: 44.12, lng: 9.78, radius: 4000, color: "#0284c7", opacity: 0.38 },
    { id: 4, lat: 44.26, lng: 9.80, radius: 6500, color: "#0284c7", opacity: 0.38 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowcastMinute(m => (m + 1) % 60);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Animazione fluida dei corpi nuvolosi lungo la provincia di Massa-Carrara
  useEffect(() => {
    if (!isCloudRadarActive) return;
    const interval = setInterval(() => {
      setCloudBodies(prev =>
        prev.map(cloud => {
          let nextLng = cloud.lng + 0.0006; // Spostamento lento verso Est
          let nextLat = cloud.lat + 0.0002; // Spostamento leggero verso Nord

          // Se esce dai confini orientali di Massa-Carrara (es. Garfagnana/Appennino Est)
          if (nextLng > 10.35) {
            nextLng = 9.72; // Rientra da Ovest (Golfo dei Poeti / Mare)
          }
          if (nextLat > 44.38) {
            nextLat = 44.00; // Rientra da Sud
          }

          return {
            ...cloud,
            lat: nextLat,
            lng: nextLng
          };
        })
      );
    }, 1500); // Aggiorna la posizione ogni 1.5 secondi per un moto realistico e fluido
    return () => clearInterval(interval);
  }, [isCloudRadarActive]);

  // P.O.I. Mappa "Super Pazzia" States
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<"vet_clinics" | "law_enforcement" | "local_police" | "vet_pharmacies" | "asl" | "none">("none");
  const [selectedPoiComune, setSelectedPoiComune] = useState<string>("Tutti");
  const [customPois, setCustomPois] = useState<any[]>([]);
  const [isPoiPanelCollapsed, setIsPoiPanelCollapsed] = useState(true);
  const [isAddPoiDialogOpen, setIsAddPoiDialogOpen] = useState(false);
  const [newPoi, setNewPoi] = useState<any>({
    name: "",
    category: "vet_clinics",
    comune: "Massa",
    address: "",
    phone: "",
    hours: "",
    lat: 44.035,
    lng: 10.14
  });

  const handleComuneSelect = (comuneName: string) => {
    setSelectedPoiComune(comuneName);
    
    const comuneCoordinates: Record<string, [number, number]> = {
      "Massa": [44.035, 10.14],
      "Carrara": [44.078, 10.098],
      "Montignoso": [44.015, 10.16],
      "Aulla": [44.215, 9.970],
      "Pontremoli": [44.378, 9.880],
      "Fivizzano": [44.24, 10.12],
      "Fosdinovo": [44.135, 10.02],
      "Licciana Nardi": [44.26, 10.03],
      "Villafranca in Lunigiana": [44.28, 9.95],
      "Bagnone": [44.31, 9.99],
      "Filattiera": [44.33, 9.93],
      "Mulazzo": [44.31, 9.89],
      "Podenzana": [44.20, 9.94],
      "Tresana": [44.20, 9.90],
      "Casola in Lunigiana": [44.20, 10.17],
      "Comano": [44.29, 10.13],
      "Zeri": [44.35, 9.76]
    };
    
    if (comuneCoordinates[comuneName]) {
      setRadarMapCenter(comuneCoordinates[comuneName]);
    }
  };

  const handleRadarAddressSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!radarSearchAddress.trim()) return;
    setIsSearchingRadarAddress(true);
    try {
      const queryStr = `${radarSearchAddress.trim()}, Massa-Carrara, Toscana, Italia`;
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setRadarSearchedPoint({ lat, lng: lon, address: radarSearchAddress.trim() });
        setRadarMapCenter([lat, lon]);
      } else {
        const secondaryQueryStr = `${radarSearchAddress.trim()}, Toscana, Italia`;
        const resp2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(secondaryQueryStr)}&limit=1`);
        const data2 = await resp2.json();
        if (data2 && data2.length > 0) {
          const lat = parseFloat(data2[0].lat);
          const lon = parseFloat(data2[0].lon);
          setRadarSearchedPoint({ lat, lng: lon, address: radarSearchAddress.trim() });
          setRadarMapCenter([lat, lon]);
        } else {
          alert("Indirizzo non trovato su mappa. Prova ad inserire il nome della via o località più specifica.");
        }
      }
    } catch (err) {
      console.error("Geocoding radar search error:", err);
      alert("Errore durante la ricerca geografica.");
    } finally {
      setIsSearchingRadarAddress(false);
    }
  };

  const getPoiMarkerIcon = (category: string) => {
    let colorClass = "";
    let pulseClass = "";
    let iconSymbol = "";
    
    switch(category) {
      case "vet_clinics":
        colorClass = "bg-cyan-500 text-cyan-900";
        pulseClass = "glowing-pulse-vet";
        iconSymbol = "🏥";
        break;
      case "law_enforcement":
        colorClass = "bg-blue-600 text-blue-100";
        pulseClass = "glowing-pulse-law";
        iconSymbol = "👮";
        break;
      case "local_police":
        colorClass = "bg-sky-400 text-sky-950";
        pulseClass = "glowing-pulse-local";
        iconSymbol = "🚔";
        break;
      case "vet_pharmacies":
        colorClass = "bg-emerald-500 text-emerald-950";
        pulseClass = "glowing-pulse-pharm";
        iconSymbol = "💊";
        break;
      case "asl":
        colorClass = "bg-violet-500 text-violet-950";
        pulseClass = "glowing-pulse-asl";
        iconSymbol = "🏢";
        break;
      default:
        colorClass = "bg-indigo-500 text-indigo-950";
        pulseClass = "glowing-pulse-asl";
        iconSymbol = "📍";
    }
    
    return L.divIcon({
      className: "custom-poi-marker-icon bg-transparent border-transparent",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <div class="${pulseClass}" style="
            position: absolute;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            opacity: 0.8;
          "></div>
          <div class="${colorClass}" style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 5;
            font-size: 11px;
          ">
            ${iconSymbol}
          </div>
        </div>
      `
    });
  };

  const [missions, setMissions] = useState<Mission[]>(() => loadCacheData("missions"));
  const [isCleaningRadar, setIsCleaningRadar] = useState(false);
  const [contacts, setContacts] = useState<UsefulContact[]>(() => loadCacheData("contacts"));
  const [emergencyCalls, setEmergencyCalls] = useState<any[]>(() => loadCacheData("emergency_calls"));
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<any | null>(null);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isArchivioTurniOpen, setIsArchivioTurniOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<UsefulContact>>({
    municipality: "Carrara",
    category: "Emergenza",
    title: "",
    phone: "",
  });
  const [selectedMunicipalityForContacts, setSelectedMunicipalityForContacts] = useState<string>("Carrara");
  const [isMissionDialogOpen, setIsMissionDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [targetVideoGuard, setTargetVideoGuard] = useState<Guard | null>(null);
  const [selectedTacticalGuard, setSelectedTacticalGuard] = useState<Guard | null>(null);
  const [forceNewMission, setForceNewMission] = useState(false);
  const [selectedGuardForMission, setSelectedGuardForMission] = useState<Guard | null>(null);
  const [newMission, setNewMission] = useState<Partial<Mission>>({
    address: "",
    description: "",
    priority: "medium",
  });
  const watchIdRef = useRef<number | null>(null);
  const [rejectingMissionId, setRejectingMissionId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>("");
  const [missionToasts, setMissionToasts] = useState<Array<{
    id: string;
    guardId: string;
    guardName: string;
    address: string;
    status: 'accepted' | 'completed' | 'cancelled' | 'rejected';
    rejectionReason?: string;
    timestamp: Date;
  }>>([]);
  const prevMissionsStateRef = useRef<Record<string, 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rejected'>>({});
  const [dismissedMissionIds, setDismissedMissionIds] = useState<string[]>([]);

  const handleAddPoi = async () => {
    if (!newPoi.name || !newPoi.address || !newPoi.phone) {
      alert("Compila tutti i campi obbligatori: Nome, Indirizzo e Telefono.");
      return;
    }
    
    try {
      const poiDoc = {
        name: newPoi.name,
        category: newPoi.category,
        comune: newPoi.comune,
        address: newPoi.address,
        phone: newPoi.phone,
        hours: newPoi.hours || "Disponibilità oraria non indicata",
        lat: Number(newPoi.lat) || 44.035,
        lng: Number(newPoi.lng) || 10.14
      };
      
      await addDoc(collection(db, "custom_pois"), poiDoc);
      setIsAddPoiDialogOpen(false);
      setNewPoi({
        name: "",
        category: "vet_clinics",
        comune: "Massa",
        address: "",
        phone: "",
        hours: "",
        lat: 44.035,
        lng: 10.14
      });
      
      await logAction("Aggiunta Presidio P.O.I.", "create", { 
        name: poiDoc.name, 
        category: poiDoc.category, 
        comune: poiDoc.comune 
      });
    } catch (err) {
      console.error("Errore salvataggio POI custom:", err);
      alert("Errore durante il salvataggio.");
    }
  };

  const speakMissionTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "it-IT";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis error:", err);
    }
  };

  const handleSendMission = async (sendWhatsApp: boolean = false) => {
    if ((!selectedGuardForMission && !selectedSquadForMission) || !newMission.address) return;
    try {
      let finalLat: number | null = null;
      let finalLng: number | null = null;
      
      try {
        const queryStr = `${newMission.address}, Massa-Carrara, Toscana, Italia`;
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`);
        const data = await resp.json();
        if (data && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
        } else {
          const secondaryQueryStr = `${newMission.address}, Italia`;
          const resp2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(secondaryQueryStr)}&limit=1`);
          const data2 = await resp2.json();
          if (data2 && data2.length > 0) {
            finalLat = parseFloat(data2[0].lat);
            finalLng = parseFloat(data2[0].lon);
          }
        }
      } catch (err) {
        console.error("Geocoding failed for mission address:", err);
      }

      let priorityLabel = "NORMALE";
      if (newMission.priority === "low") priorityLabel = "🟢 BASSA";
      if (newMission.priority === "medium") priorityLabel = "🟡 MEDIA";
      if (newMission.priority === "high") priorityLabel = "🔴 ALTA";
      if (newMission.priority === "emergency") priorityLabel = "🚨 URGENTE / SOS";

      if (selectedSquadForMission) {
        const squadName = selectedSquadForMission.squadName;
        const members = selectedSquadForMission.members;
        
        for (const member of members) {
          await addDoc(collection(db, "missions"), {
            ...newMission,
            guardId: member.guardId,
            guardMatricola: (member.matricola || "").replace(/\s+/g, "").toUpperCase(),
            guardName: `${member.surname || ''} ${member.name || ''}`.trim() || member.name,
            squadName: squadName,
            status: "pending",
            assignedBy: auth.currentUser?.uid || "admin",
            assignedByName: session?.name || "Centrale Operativa",
            createdAt: serverTimestamp(),
            lat: finalLat,
            lng: finalLng,
          });
        }
        
        logAction("Invio Missione a Squadra", "create", { squad: squadName, membersCount: members.length, address: newMission.address });

        if (sendWhatsApp) {
          const membersListStr = members.map(m => `${m.surname || ''} ${m.name || ''}`.trim()).join(", ");
          const phones = members.map(m => m.phone).filter(Boolean);
          const firstPhone = phones[0] || "";

          const messageText = `*NUCLEO VIGILANZA BERTOLUCCI* 🛡️\n` + 
            `*COMANDO MISSIONE PER ${squadName.toUpperCase()}*\n\n` +
            `• *Squadra Destinataria:* ${squadName} (${membersListStr})\n` +
            `• *Priorità:* ${priorityLabel}\n` +
            `• *Zona / Località:* ${newMission.address}\n` +
            `• *Descrizione:* ${newMission.description || "Nessun dettaglio aggiuntivo"}\n` +
            (newMission.notes ? `• *Note Centrale:* ${newMission.notes}\n\n` : `\n`) +
            `⚠️ *ACCESSO DIRETTO SMARTPHONE / ACCETTAZIONE:*\n` +
            `I componenti della ${squadName} possono accedere all'App dal cellulare per **ACCETTARE** il comando operativo:\n\n` +
            `🔗 ${window.location.origin}${window.location.pathname}`;

          if (firstPhone) {
            openWhatsApp(firstPhone, messageText);
          }
        }

        speakMissionTTS(`Missione inviata con successo alla ${squadName}.`);
        setIsMissionDialogOpen(false);
        setSelectedGuardForMission(null);
        setSelectedSquadForMission(null);
        setNewMission({ address: "", description: "", priority: "medium" });
        setRadarSearchedPoint(null);
        alert(`Missione inviata con successo a tutti i componenti della ${squadName} (${members.length} operatori)!`);

      } else if (selectedGuardForMission) {
        await addDoc(collection(db, "missions"), {
          ...newMission,
          guardId: selectedGuardForMission.id,
          guardMatricola: (selectedGuardForMission.matricola || "").replace(/\s+/g, "").toUpperCase(),
          guardName: `${selectedGuardForMission.surname} ${selectedGuardForMission.name}`,
          status: "pending",
          assignedBy: auth.currentUser?.uid || "admin",
          assignedByName: session?.name || "Centrale Operativa",
          createdAt: serverTimestamp(),
          lat: finalLat,
          lng: finalLng,
        });
        logAction("Invio Missione Operativa", "create", { guard: selectedGuardForMission.surname + " " + selectedGuardForMission.name, address: newMission.address });

        if (sendWhatsApp) {
          const privateInfo = guardPrivateInfoMap[selectedGuardForMission.id];
          const phone = privateInfo?.cellulare || privateInfo?.phone || selectedGuardForMission?.phone || "";
          
          const directAccessUrl = `${window.location.origin}${window.location.pathname}?m=${encodeURIComponent(selectedGuardForMission.matricola || "")}`;
          const messageText = `*NUCLEO VIGILANZA BERTOLUCCI* 🛡️\n` + 
            `*NUOVO COMANDO MISSIONE IN ATTESA DI ACCETTAZIONE*\n\n` +
            `• *Destinatario:* ${selectedGuardForMission.surname} ${selectedGuardForMission.name}\n` +
            `• *Priorità:* ${priorityLabel}\n` +
            `• *Zona / Località:* ${newMission.address}\n` +
            `• *Descrizione:* ${newMission.description || "Nessun dettaglio aggiuntivo"}\n` +
            (newMission.notes ? `• *Note Centrale:* ${newMission.notes}\n\n` : `\n`) +
            `⚠️ *ACCESSO DIRETTO SMARTPHONE / ACCETTAZIONE:*\n` +
            `Tocca il link qui sotto dal tuo cellulare per entrare direttamente nell'App già identificato con la tua matricola e **ACCETTARE** il comando:\n\n` +
            `🔗 *Clicca qui per accedere ed accertare il comando:*\n` +
            `${directAccessUrl}\n\n` +
            `_Solo dopo aver confermato l'accettazione sull'App, riceverai il percorso stradale di navigazione e avrai il tasto Navigatore attivo!_`;

          openWhatsApp(phone, messageText);
        }

        speakMissionTTS(`Missione inviata con successo alla pattuglia ${selectedGuardForMission.surname} ${selectedGuardForMission.name}.`);
        setIsMissionDialogOpen(false);
        setSelectedGuardForMission(null);
        setSelectedSquadForMission(null);
        setNewMission({ address: "", description: "", priority: "medium" });
        setRadarSearchedPoint(null);
        alert("Missione inviata ed in attesa di conferma da parte dell'operatore sull'App.\n\nAppena l'operatore accetta dal cellulare, nel riquadro in alto a destra sulla Centrale si attiverà il pulsante verde per trasmettere il tragitto stradale.");
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "missions");
    }
  };

  const handleAddContact = async () => {
    if (!newContact.title || !newContact.phone) return;
    try {
      await addDoc(collection(db, "contacts"), {
        ...newContact,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      logAction("Aggiunta Contatto Rapido", "create", { title: newContact.title });
      setIsAddContactDialogOpen(false);
      setNewContact({
        municipality: selectedMunicipalityForContacts || "Carrara",
        category: "Emergenza",
        title: "",
        phone: "",
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "contacts");
    }
  };

  const handleSeedContacts = async () => {
    const lunigianaMunicipalityList = [
      "Aulla", "Fivizzano", "Pontremoli", "Fosdinovo", "Podenzana", 
      "Villafranca in Lunigiana", "Bagnone", "Licciana Nardi", 
      "Mulazzo", "Comano", "Filattiera", "Tresana", "Zeri", 
      "Casola in Lunigiana"
    ];

    const unifiedLunigianaPolice = {
      category: "Forze dell'Ordine",
      title: "Polizia Locale Unione Lunigiana",
      phone: "0187 423120",
      notes: "Servizio unificato per i comuni della Lunigiana. Pronto Intervento: 800 665 520",
      address: "Piazza De Gasperi, 17 - Fivizzano (Sede Centrale)"
    };

    const specificContacts: any[] = [
      // CARRARA
      { municipality: "Carrara", category: "Forze dell'Ordine", title: "Carabinieri Carrara", phone: "0585 1011", address: "Via Eugenio Chiesa, 1" },
      { municipality: "Carrara", category: "Forze dell'Ordine", title: "Polizia Municipale", phone: "0585 70000", address: "Via S. Maria, 1" },
      { municipality: "Carrara", category: "Forze dell'Ordine", title: "Guardia di Finanza", phone: "0585 843180", address: "Viale XX Settembre" },
      { municipality: "Carrara", category: "Forze dell'Ordine", title: "Commissariato P.S.", phone: "0585 64011", address: "Via G. Pinelli" },
      { municipality: "Carrara", category: "Emergenza", title: "Canile Municipale", phone: "0585 844475", address: "Via d'Ancona" },
      { municipality: "Carrara", category: "Veterinari", title: "SOS Animali Massa Carrara", phone: "320 034 5057", notes: "Pronto intervento e segnalazioni" },
      { municipality: "Carrara", category: "Farmacie", title: "Farmacia Comunale Porto", phone: "0585 633111", notes: "Aperta H24" },
      
      // MASSA
      { municipality: "Massa", category: "Forze dell'Ordine", title: "Carabinieri Massa", phone: "0585 8131", address: "Via Aurelia Ovest" },
      { municipality: "Massa", category: "Forze dell'Ordine", title: "Polizia Municipale Massa", phone: "0585 44722", address: "Via S. Sisto" },
      { municipality: "Massa", category: "Veterinari", title: "Ambulatorio Vet Ponticello", phone: "0585 790400", address: "Via Ponticello" },
      { municipality: "Massa", category: "Emergenza", title: "Ospedale NOA", phone: "0585 4931", address: "Via Pellegrini" },
      
      // LUNIGIANA SPECIFIC (NON-UNIFIED)
      { municipality: "Aulla", category: "Forze dell'Ordine", title: "Carabinieri Aulla", phone: "0187 408104", address: "Piazza Garibaldi" },
      { municipality: "Aulla", category: "Emergenza", title: "Pubblica Assistenza Aulla", phone: "0187 420800", address: "Via Lunigiana" },
      { municipality: "Pontremoli", category: "Forze dell'Ordine", title: "Carabinieri Pontremoli", phone: "0187 830335", address: "Piazza Italia" },
      { municipality: "Pontremoli", category: "Emergenza", title: "Ospedale Pontremoli", phone: "0187 4621", address: "Via dei Veterani" },
      { municipality: "Fivizzano", category: "Emergenza", title: "Pronto Soccorso Fivizzano", phone: "0585 9181", address: "Salita dell'Ospedale" },
      
      // COMUNITÀ E PET FRIENDLY
      { municipality: "Generale / Provincia", category: "Servizi Comunità", title: "IAT Ambito Turistico Lunigiana", phone: "0187 833309", notes: "Informazioni turistiche e servizi per il territorio" },
      { municipality: "Aulla", category: "Pet Friendly (Hotel/B&B)", title: "Hotel Dalla Pasquino", phone: "0187 420500", notes: "Struttura pet-friendly segnalata in zona Aulla" },
      { municipality: "Pontremoli", category: "Pet Friendly (Hotel/B&B)", title: "Agriturismo Ca' del Moro", phone: "0187 830560", notes: "Immerso nel verde, ideale per chi viaggia con animali" },
      { municipality: "Carrara", category: "Farmacie Veterinarie", title: "Farmacia Comunale Cavallotti", phone: "0585 70258", notes: "Ampio reparto veterinario e prodotti per animali" },
    ];

    // Create the final seed list
    const finalSeed: any[] = [...specificContacts];
    
    // Add unified police to all Lunigiana municipalities
    lunigianaMunicipalityList.forEach(m => {
      finalSeed.push({
        municipality: m,
        ...unifiedLunigianaPolice
      });
    });

    try {
      let addedCount = 0;
      for (const contact of finalSeed) {
        // Verifica se esiste già (stessa intestazione E stesso comune OR stesso numero e stesso comune)
        const exists = contacts.some(c => 
          (c.title === contact.title && c.municipality === contact.municipality) ||
          (c.phone === contact.phone && c.municipality === contact.municipality)
        );
        
        if (!exists) {
          await addDoc(collection(db, "contacts"), {
            ...contact,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          addedCount++;
        }
      }
      alert(`Rubrica aggiornata! Aggiunti ${addedCount} nuovi contatti istituzionali.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "contacts");
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo numero?")) return;
    try {
      await deleteDoc(doc(db, "contacts", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `contacts/${id}`);
    }
  };

  // ROBUST PERMISSION CHECK: Role is the authority
  const isSuperPina = user?.email?.toLowerCase() === "giulianodellapina@gmail.com";

  const isAnimaliaAuthorized = 
    user?.email?.toLowerCase() === "giulianodellapina@gmail.com" || 
    user?.email?.toLowerCase() === "nausica.cf@gmail.com" || 
    ["DPG917", "FC918"].includes((session?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    ["DPG917", "FC918"].includes((currentGuard?.matricola || "").replace(/\s+/g, "").toUpperCase());

  const isGiulianoOrConsuelo = isAnimaliaAuthorized;

  const isAdmin = 
    user?.email?.toLowerCase() === "giulianodellapina@gmail.com" || 
    user?.email?.toLowerCase() === "nausica.cf@gmail.com" || 
    ["DPG917", "FC918"].includes((session?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    ["DPG917", "FC918"].includes((currentGuard?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    session?.role === "admin" ||
    currentGuard?.role === "admin";

  // isResponsabile: Gestione dinamica dei supervisori
  const isResponsabile =
    isAdmin ||
    ["BA906", "CEA913", "FF943"].includes((session?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    ["BA906", "CEA913", "FF943"].includes((currentGuard?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    session?.role === "responsabile" ||
    currentGuard?.role === "responsabile";

  // Controllo specifico per Fabrizio Finali (FF 943) e Baratta Andrea (BA 906)
  const isFF943 = 
    ["FF943"].includes((session?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    ["FF943"].includes((currentGuard?.matricola || "").replace(/\s+/g, "").toUpperCase());

  const isBarattaAndrea =
    ["BA906"].includes((session?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
    ["BA906"].includes((currentGuard?.matricola || "").replace(/\s+/g, "").toUpperCase());

  // isApprovatore: Ha piena facoltà di approvare richieste di turno/assenza
  // Fabrizio Finali (FF 943) NON può approvare turni
  const isApprovatore =
    !isFF943 && (
      isResponsabile ||
      ["BA906", "CEA913"].includes((session?.matricola || "").replace(/\s+/g, "").toUpperCase()) ||
      ["BA906", "CEA913"].includes((currentGuard?.matricola || "").replace(/\s+/g, "").toUpperCase())
    );

  // Verifica se l'utente corrente può approvare uno specifico turno
  const canUserApproveThisShift = (sh: any) => {
    if (isFF943) return false;

    const isVI = sh?.sector === "ittica" || sh?.sector === "venatoria";
    if (isVI) {
      // Baratta Andrea ha la priorità assoluta per autorizzare e convalidare ittica e venatoria
      if (isBarattaAndrea) return true;
      // In caso di ritardo o assenza prolungata, gli amministratori generali possono intervenire in via sostitutiva
      if (isAdmin) return true;
      return false;
    }

    if (isAdmin) return true;
    return isApprovatore;
  };

  const isReadOnlyForResponsabile = isResponsabile && !isAdmin;

  // canEditGuardSheet: Solo gli amministratori o il proprietario del profilo possono modificare la scheda
  const canEditGuardSheet =
    !!isAdmin ||
    !!(currentGuard && selectedGuardForSheet && selectedGuardForSheet.id === currentGuard.id);

  const isSectorAllowed = (sectorId: string) => {
    if (isAdmin || isResponsabile) return true;
    if (!currentGuard) return false;
    const q = currentGuard.qualifications || [];
    return q.some((val) => (val || "").toLowerCase() === (sectorId || "").toLowerCase());
  };

  const logAction = async (action: string, type: 'access' | 'create' | 'update' | 'delete' | 'system', details: any = {}) => {
    try {
      const uMatricola = currentGuard?.matricola || session?.matricola || matricolaInput || "N/A";
      const uName = currentGuard ? `${currentGuard.surname} ${currentGuard.name}` : (session?.name || "Anonimo");
      const uEmail = user?.email?.toLowerCase() || "";

      // Riconoscimento infallibile di Giuliano e Consuelo
      const isGiulianoOrConsuelo = 
        uEmail === "giulianodellapina@gmail.com" || 
        uEmail === "nausica.cf@gmail.com" ||
        ["DPG917", "FC918"].includes(uMatricola.replace(/\s+/g, "").toUpperCase()) ||
        uName.toLowerCase().includes("giuliano") ||
        uName.toLowerCase().includes("consuelo") ||
        (details?.matricola && ["DPG917", "FC918"].includes(String(details.matricola).replace(/\s+/g, "").toUpperCase()));

      // 1. Evita qualsiasi registrazione di accessi (logins, logouts, consultazioni)
      if (type === 'access') {
        return;
      }

      // 2. Per Giuliano e Consuelo registriamo SOLO in caso di cancellazione o modifica (delete o update)
      if (isGiulianoOrConsuelo) {
        const isDeleteOrUpdate = type === 'delete' || type === 'update';
        if (!isDeleteOrUpdate) {
          return;
        }
      }

      const logData = {
        timestamp: serverTimestamp(),
        action,
        type,
        details: {
          ...details,
          context: activeAdminTab || "N/A",
          area: isAdminPortalOpen ? "Portale Admin" : "App Principale",
          role: session?.role || currentGuard?.role || "N/A"
        },
        userMatricola: uMatricola,
        userName: uName,
        userId: auth.currentUser?.uid || "anonymous"
      };

      await addDoc(collection(db, "access_logs"), logData);

      // Notifica Telegram per eventi critici (Cancellazioni o cambiamenti stato)
      const isSensitiveAction = (type === 'delete') || 
                                (type === 'update' && action.toLowerCase().includes("stato guardia")) ||
                                (action.toLowerCase().includes("emergenza"));

      if (isSensitiveAction) {
        const title = type === 'delete' ? "🗑️ CANCELLAZIONE RILEVATA" : "⚠️ AZIONE CRITICA";
        const message = `*Operatore:* ${uName} (${uMatricola})\n*Azione:* ${action}\n*Area:* ${isAdminPortalOpen ? "Portale Admin" : "App Principale"}`;
        
        fetch("/api/telegram/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            message,
            type: "alert",
            onlySupervisors: true
          })
        }).catch(err => console.error("Telegram log notify error", err));
      }
    } catch (e) {
      console.error("Black Box Log Error:", e);
    }
  };

  const sendSecurityAlert = async (
    type: 'verbali' | 'anagrafica', 
    actionType: 'create' | 'update' | 'delete', 
    docId: string, 
    authorMatricola: string, 
    details: string
  ) => {
    // Keep alerts only for unauthorized attempts (tampering) or deletions (removals)
    const isTamperingOrCritical = 
      details.toUpperCase().includes("NON AUTORIZZATO") || 
      actionType === 'delete';

    if (!isTamperingOrCritical) {
      console.log(`[sendSecurityAlert] Ignorata allerta ordinaria (non è manomissione o rimozione): ${details}`);
      return;
    }

    try {
      const title = `🚨 [ALLERTA SICUREZZA - ${type.toUpperCase()}]`;
      const message = `⚠️ *Tentativo di Modifica Dati*\n\n` +
                      `👤 *Operatore:* ${authorMatricola}\n` +
                      `📦 *Ambito:* ${type.toUpperCase()}\n` +
                      `🔧 *Operazione:* ${actionType.toUpperCase()}\n` +
                      `📝 *Dettagli:* ${details}\n` +
                      `🆔 *ID Documento:* ${docId}\n` +
                      `📅 *Data/Ora:* ${new Date().toLocaleString('it-IT')}`;

      // Notify Giuliano Della Pina & Consuelo dynamically via Telegram using their Chat IDs in DB
      const adminsToNotify = guards.filter(g => 
        g.email?.toLowerCase() === "giulianodellapina@gmail.com" || 
        g.email?.toLowerCase() === "nausica.cf@gmail.com"
      );

      console.log("[SECURITY ALERT] Invio notifiche a:", adminsToNotify.map(a => a.email));

      adminsToNotify.forEach(admin => {
        const chatId = admin.telegramChatId || admin.privateInfo?.telegramChatId;
        if (chatId) {
          fetch("/api/telegram/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              message,
              type: "alert",
              onlyTarget: true,
              chatId: chatId
            })
          }).catch(err => console.error("Error sending individual security alert", err));
        }
      });

      // Also send to main group so they get it immediately
      fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          type: "alert"
        })
      }).catch(err => console.error("Error sending fallback group security alert", err));

    } catch (err) {
      console.error("Security Alert Error:", err);
    }
  };

  const handleClearLogsExecution = async () => {
    console.log(">>> ESECUZIONE PULIZIA AVVIATA");
    setLoading(true);
    
    try {
      let totalDeleted = 0;
      let iterations = 0;
      const maxIterations = 20; 
      let hasMore = true;

      while (hasMore && iterations < maxIterations) {
        const q = query(collection(db, "access_logs"), limit(500));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.size;
        iterations++;
        
        if (snapshot.size < 500) {
          hasMore = false;
        }
      }

      setAccessLogs([]);
      
      await logAction("Svuotamento Scatola Nera", "delete", { 
        recordsDeleted: totalDeleted,
        status: "success"
      });

    } catch (e: any) {
      console.error("ERRORE PULIZIA:", e);
      alert("ERRORE: " + e.message);
    } finally {
      setLoading(false);
      setDeleteConfirmation(null);
    }
  };

  const handleUpdateMissionStatus = async (
    missionId: string, 
    status: 'accepted' | 'completed' | 'cancelled' | 'rejected',
    rejectionReason?: string,
    routeSent?: boolean
  ) => {
    try {
      const missionRef = doc(db, 'missions', missionId);
      const updateData: any = { status };
      if (status === 'accepted') updateData.acceptedAt = serverTimestamp();
      if (status === 'completed') updateData.completedAt = serverTimestamp();
      if (status === 'rejected' || status === 'cancelled') {
        updateData.rejectedAt = serverTimestamp();
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
      }
      if (routeSent !== undefined) {
        updateData.routeSent = routeSent;
        updateData.routeSentAt = serverTimestamp();
      }
      
      await updateDoc(missionRef, updateData);
      logAction("Aggiornamento Missione", "update", { missionId, newStatus: status, rejectionReason, routeSent });
    } catch (error) {
      console.error("Error updating mission status:", error);
    }
  };

  const isShiftOfCurrentGuard = (s: any) => {
    if (!currentGuard) return false;
    if (s.guardId === currentGuard.id) return true;
    if (currentGuard.matricola && s.matricola) {
      return s.matricola.replace(/\s+/g, "").toUpperCase() === currentGuard.matricola.replace(/\s+/g, "").toUpperCase();
    }
    return false;
  };

  const isCurrentlyInShift = (shift: any) => {
    try {
      if (!shift.date || !shift.startTime || !shift.endTime) return false;
      const now = new Date();
      
      const [startH, startM] = shift.startTime.split(":").map(Number);
      const [endH, endM] = shift.endTime.split(":").map(Number);
      
      const [y, m, d] = shift.date.split("-").map(Number);
      const startDate = new Date(y, m - 1, d, startH, startM, 0, 0);
      
      const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);
      if (endH < startH || (endH === startH && endM < startM)) {
        // Crosses midnight (night shift)
        endDate.setDate(endDate.getDate() + 1);
      }
      
      // Tolleranza: 30 minuti prima dell'inizio e 30 minuti dopo la fine del turno
      const startWithBuffer = new Date(startDate.getTime() - 30 * 60 * 1000); 
      const endWithBuffer = new Date(endDate.getTime() + 30 * 60 * 1000);   
      
      return now >= startWithBuffer && now <= endWithBuffer;
    } catch (err) {
      return false;
    }
  };

  const canActivateGpsForShift = (guard: Guard | null) => {
    if (!guard) return false;
    if (isAdmin || isResponsabile) return true;

    // In caso di SOS attivo, l'attivazione GPS è sempre consentita per sicurezza
    const hasActiveSos = alerts.some(a => 
      a.status === 'active' && 
      (a.guardId === guard.id || (guard.matricola && a.matricola && a.matricola.replace(/\s+/g, "").toUpperCase() === guard.matricola.replace(/\s+/g, "").toUpperCase()))
    );
    if (hasActiveSos) return true;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const now = new Date();

    return shifts.some(s => {
      if (s.status === 'cancelled') return false;
      const isThisGuard = s.guardId === guard.id || (guard.matricola && s.matricola && s.matricola.replace(/\s+/g, "").toUpperCase() === guard.matricola.replace(/\s+/g, "").toUpperCase());
      if (!isThisGuard || s.date !== todayStr) return false;

      if (!s.startTime || !s.endTime) return false;

      try {
        const [startH, startM] = s.startTime.split(":").map(Number);
        const [endH, endM] = s.endTime.split(":").map(Number);
        const [y, m, d] = s.date.split("-").map(Number);

        const startDate = new Date(y, m - 1, d, startH, startM, 0, 0);
        const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);

        if (endH < startH || (endH === startH && endM < startM)) {
          endDate.setDate(endDate.getDate() + 1);
        }

        const startWindow = new Date(startDate.getTime() - 30 * 60 * 1000);
        const endWindow = new Date(endDate.getTime() + 30 * 60 * 1000);

        return now >= startWindow && now <= endWindow;
      } catch (e) {
        return false;
      }
    });
  };

  const isShiftCompletedOrExpired = (shift: any) => {
    if (shift.status === 'completed' || shift.status === 'cancelled') return true;
    try {
      if (!shift.date || !shift.endTime) return false;
      const now = new Date();
      const [endH, endM] = shift.endTime.split(":").map(Number);
      const [startH, startM] = (shift.startTime || "00:00").split(":").map(Number);
      const [y, m, d] = shift.date.split("-").map(Number);
      
      const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);
      if (endH < startH || (endH === startH && endM < startM)) {
        // Crosses midnight (night shift)
        endDate.setDate(endDate.getDate() + 1);
      }
      
      return now >= endDate;
    } catch (err) {
      return false;
    }
  };

  const getGuardDocRef = (guard: Guard | null) => {
    if (!guard) return null;
    let targetId = guard.id;
    if (!targetId || targetId.startsWith("bootstrap_") || targetId.startsWith("local_")) {
      const normMat = (guard.matricola || "").replace(/\s+/g, "").toUpperCase();
      const foundInList = guards.find(g => (g.matricola || "").replace(/\s+/g, "").toUpperCase() === normMat);
      if (foundInList && foundInList.id && !foundInList.id.startsWith("bootstrap_") && !foundInList.id.startsWith("local_")) {
        targetId = foundInList.id;
      } else {
        targetId = normMat ? `guard_${normMat}` : guard.id;
      }
    }
    return doc(db, "guards", targetId);
  };

  const toggleTracing = async () => {
    if (!currentGuard) return;
    const newState = !currentGuard.isTracingAuthorized;

    if (newState && !canActivateGpsForShift(currentGuard)) {
      alert("⛔ Attivazione GPS non consentita:\n\nNon risultano turni di servizio programmati per la tua matricola in questa fascia oraria.\n\nIl tracciamento GPS può essere attivato esclusivamente durante il turno di servizio (da 30 minuti prima dell'inizio a 30 minuti dopo il termine di servizio).");
      return;
    }

    const guardDocRef = getGuardDocRef(currentGuard);

    setCurrentGuard(prev => prev ? { ...prev, isTracingAuthorized: newState } : null);

    try {
      if (guardDocRef) {
        await setDoc(guardDocRef, {
          isTracingAuthorized: newState
        }, { merge: true });
      }
      if (newState && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => updatePosition(pos),
          (err) => console.warn("Initial position get failed", err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
      if (!newState && watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsTracking(false);
      }
    } catch (e) {
      console.error("Error toggling tracing", e);
    }
  };

  // Calcolo per avviso di scadenza o superamento orario turno (con GPS attivo)
  const getShiftEndWarningInfo = () => {
    if (!currentGuard?.isTracingAuthorized) return null;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const activeShiftToday = shifts.find(s => {
      if ((s.status !== 'approved' && s.status !== 'pending') || !isShiftOfCurrentGuard(s)) return false;
      return s.date === todayStr;
    });
    if (!activeShiftToday || !activeShiftToday.endTime) return null;
    try {
      const [endH, endM] = activeShiftToday.endTime.split(":").map(Number);
      const [startH, startM] = (activeShiftToday.startTime || "00:00").split(":").map(Number);
      const [y, m, d] = activeShiftToday.date.split("-").map(Number);
      const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);
      if (endH < startH || (endH === startH && endM < startM)) {
        endDate.setDate(endDate.getDate() + 1);
      }
      const now = new Date();
      const diffMinutes = Math.round((endDate.getTime() - now.getTime()) / (1000 * 60));
      
      // Avviso visivo attivo da 30 minuti prima fino a 120 minuti dopo il turno
      if (diffMinutes <= 30 && diffMinutes >= -120) {
        return {
          diffMinutes,
          shiftEndStr: activeShiftToday.endTime
        };
      }
    } catch (e) {}
    return null;
  };
  const shiftEndWarning = getShiftEndWarningInfo();

  const updatePosition = async (pos: GeolocationPosition) => {
    if (!currentGuard) return;
    const guardDocRef = getGuardDocRef(currentGuard);
    if (!guardDocRef) return;
    try {
      await setDoc(guardDocRef, {
        lastLocation: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: serverTimestamp()
        }
      }, { merge: true });
      setIsTracking(true);
      setCurrentGuard(prev => prev ? {
        ...prev,
        lastLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: new Date() }
      } : null);
    } catch (e) {
      console.error("Position update failed", e);
    }
  };

  // Tracking Effect with automatic guard-on-duty check and periodic auto-shutdown
  useEffect(() => {
    let checkInterval: any = null;

    const checkTrackingValidity = async () => {
      if (!currentGuard) return;

      // Verifichiamo se c'è un turno attivo o un SOS attivo
      const hasActiveShift = shifts.some(s => {
        if ((s.status !== 'approved' && s.status !== 'pending') || !isShiftOfCurrentGuard(s)) return false;
        return isCurrentlyInShift(s);
      });

      const hasActiveSos = alerts.some(a => 
        a.status === 'active' && 
        (
          a.guardId === currentGuard.id || 
          (currentGuard.matricola && a.matricola && a.matricola.replace(/\s+/g, "").toUpperCase() === currentGuard.matricola.replace(/\s+/g, "").toUpperCase())
        )
      );

      // Il GPS NON si avvia mai da solo: deve essere abilitato esplicitamente dalla guardia (isTracingAuthorized), oppure da un allarme SOS attivo
      const shouldBeTracking = (hasActiveShift && Boolean(currentGuard.isTracingAuthorized)) || hasActiveSos;

      if (shouldBeTracking) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          if (watchIdRef.current === null) {
            console.log("[Tracing] Avvio monitoraggio GPS autorizzato per guardia...");
            navigator.geolocation.getCurrentPosition(
              updatePosition,
              (err) => console.warn("[Tracing] Initial position error", err),
              { enableHighAccuracy: true, timeout: 10000 }
            );

            watchIdRef.current = navigator.geolocation.watchPosition(
              updatePosition,
              (err) => console.warn("[Tracing] Watch position error", err),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
            setIsTracking(true);
          }
        }
      } else {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsTracking(false);

        if (currentGuard.isTracingAuthorized) {
          console.log("[Tracing] Disattivazione automatica GPS: nessun turno o SOS attivo per la guardia.");
          const docRef = getGuardDocRef(currentGuard);
          if (docRef) {
            try {
              await setDoc(docRef, { isTracingAuthorized: false }, { merge: true });
            } catch (e) {}
          }
          setCurrentGuard(prev => prev ? { ...prev, isTracingAuthorized: false } : null);
        }
      }

      // Avviso automatico 20/30 minuti prima dello scadere del turno
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const activeShiftToday = shifts.find(s => {
        if ((s.status !== 'approved' && s.status !== 'pending') || !isShiftOfCurrentGuard(s)) return false;
        return s.date === todayStr;
      });
      if (activeShiftToday && activeShiftToday.endTime) {
        try {
          const [endH, endM] = activeShiftToday.endTime.split(":").map(Number);
          const [startH, startM] = (activeShiftToday.startTime || "00:00").split(":").map(Number);
          const [y, m, d] = activeShiftToday.date.split("-").map(Number);
          const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);
          if (endH < startH || (endH === startH && endM < startM)) {
            endDate.setDate(endDate.getDate() + 1);
          }
          const now = new Date();
          const diffMinutes = Math.round((endDate.getTime() - now.getTime()) / (1000 * 60));
          
          if (diffMinutes >= 20 && diffMinutes <= 30) {
            const warnKey = `shift_warned_${activeShiftToday.id}_${activeShiftToday.date}`;
            if (!sessionStorage.getItem(warnKey)) {
              sessionStorage.setItem(warnKey, "true");
              alert(`⏰ AVVISO FINE TURNO (Mancano circa ${diffMinutes} minuti)\n\nFra 20/30 minuti alla fine del turno, ricordati di disattivare il GPS di servizio premendo il pulsante dedicato.`);
            }
          }
        } catch (e) {}
      }
    };

    // Eseguiamo un controllo immediato
    checkTrackingValidity();

    // Impostiamo l'intervallo ogni 30 secondi
    checkInterval = setInterval(checkTrackingValidity, 30000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [currentGuard?.isTracingAuthorized, currentGuard?.id, shifts, alerts]);

  // Automatismo AI: Chiusura e archiviazione automatica turni dopo 1 ora dalla scadenza
  useEffect(() => {
    if (!shifts) return;

    const cleanupExpiredShifts = async () => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");

      // 1. Chiusura turni scaduti da 1 ora
      for (const s of shifts) {
        if (s.status === 'approved' || s.status === 'pending') {
          if (!s.date || !s.endTime) continue;

          const canUpdateThisShift = isAdmin || isResponsabile || (currentGuard && isShiftOfCurrentGuard(s));
          if (!canUpdateThisShift) continue;

          try {
            const [endH, endM] = s.endTime.split(":").map(Number);
            const [startH, startM] = (s.startTime || "00:00").split(":").map(Number);
            const [y, m, d] = s.date.split("-").map(Number);
            
            let isExpired = false;

            if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(endH) && !isNaN(endM)) {
              const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);
              if (!isNaN(startH) && !isNaN(startM)) {
                if (endH < startH || (endH === startH && endM < startM)) {
                  endDate.setDate(endDate.getDate() + 1);
                }
              }
              const expireTime = new Date(endDate.getTime() + 60 * 60 * 1000);
              isExpired = now >= expireTime;

              if (!isExpired) {
                const shiftDateObj = new Date(y, m - 1, d);
                const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const diffTime = todayDateObj.getTime() - shiftDateObj.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                if (diffDays >= 2) {
                  isExpired = true;
                }
              }
            } else {
              if (s.date && s.date < todayStr) {
                isExpired = true;
              }
            }

            if (isExpired) {
              // Il turno rimane approvato in archivio e calendario, si disattiva solo il tracciamento GPS della guardia
              const guardId = s.guardId;
              if (guardId) {
                const guardObj = guards.find(g => g.id === guardId || (g.matricola && s.matricola && g.matricola.replace(/\s+/g, "").toUpperCase() === s.matricola.replace(/\s+/g, "").toUpperCase()));
                const canUpdateThisGuard = isAdmin || isResponsabile || (currentGuard && isShiftOfCurrentGuard(s));
                if (canUpdateThisGuard && guardObj && guardObj.isTracingAuthorized) {
                  const docRef = getGuardDocRef(guardObj);
                  if (docRef) {
                    await setDoc(docRef, { isTracingAuthorized: false }, { merge: true });
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error in auto cleanup:", err);
          }
        }
      }

      // 2. Chiusura SOS bloccati/vecchi di sessioni passate (> 12 ore fa) - Riservato a Admin/Responsabile
      if (isAdmin || isResponsabile) {
        for (const a of alerts) {
          if (a.status === 'active' && a.timestamp) {
            try {
              const alertTime = new Date(a.timestamp).getTime();
              if (now.getTime() - alertTime > 12 * 60 * 60 * 1000) {
                await updateDoc(doc(db, "alerts", a.id), { status: "resolved" });
              }
            } catch (e) {}
          }
        }
      }

      // 3. Reset automatico GPS in Firestore per guardie senza turno né SOS attivo
      for (const g of guards) {
        if (g.isTracingAuthorized) {
          const gHasShift = shifts.some(s => {
            if (s.status !== 'approved' && s.status !== 'pending') return false;
            const matchMatricola = g.matricola && s.matricola && g.matricola.replace(/\s+/g, "").toUpperCase() === s.matricola.replace(/\s+/g, "").toUpperCase();
            const matchId = g.id && s.guardId && g.id === s.guardId;
            if (!matchMatricola && !matchId) return false;
            return isCurrentlyInShift(s);
          });
          const gHasSos = alerts.some(a => 
            a.status === 'active' && 
            (a.guardId === g.id || (g.matricola && a.matricola && a.matricola.replace(/\s+/g, "").toUpperCase() === g.matricola.replace(/\s+/g, "").toUpperCase()))
          );

          if (!gHasShift && !gHasSos) {
            console.log(`[AI Auto-Cleanup] Disattivazione GPS in DB per ${g.surname || ''} ${g.name || g.matricola}: nessun turno o SOS attivo.`);
            const docRef = getGuardDocRef(g);
            if (docRef) {
              try {
                await setDoc(docRef, { isTracingAuthorized: false }, { merge: true });
              } catch (e) {}
            }
          }
        }
      }
    };

    cleanupExpiredShifts();
    const interval = setInterval(cleanupExpiredShifts, 60000);
    return () => clearInterval(interval);
  }, [shifts, guards, alerts, isAdmin, isResponsabile, currentGuard, user]);

  // Synchronize local SOS state with active Firestore alerts for this specific guard
  useEffect(() => {
    if (!user) return;
    
    const activeAlert = alerts.find(
      (a) =>
        a.status === "active" &&
        (a.guardId === user.uid ||
          (currentGuard && a.guardId === currentGuard.id) ||
          (currentGuard?.matricola && a.matricola === currentGuard.matricola) ||
          (session?.matricola && a.matricola === session.matricola))
    );

    if (activeAlert) {
      if (!isSosActive) {
        setIsSosActive(true);
      }
      if (activeSosId !== activeAlert.id) {
        setActiveSosId(activeAlert.id);
      }
      
      const targetStage = activeAlert.isGlobal ? "broadcast" : "pre-alarm";
      setSosStage((prev) => (prev === "holding" ? "holding" : targetStage));
    } else {
      setSosStage((prev) => {
        if (prev === "holding") return "holding";
        if (isSosActive) {
          setIsSosActive(false);
          setActiveSosId(null);
          setSosProgress(0);
        }
        return "none";
      });
    }
  }, [alerts, user, currentGuard, session, isSosActive, activeSosId]);

  // Mission Alert Effect for Sound & TTS (Guard Side / Mobile)
  useEffect(() => {
    const myMat = (currentGuard?.matricola || session?.matricola || "").replace(/\s+/g, "").toUpperCase();
    const sessionName = (session?.name || "").replace(/\s+/g, "").toUpperCase();
    const myNameClean = `${currentGuard?.surname || ""} ${currentGuard?.name || ""}`.replace(/\s+/g, "").toUpperCase();
    const myNameRevClean = `${currentGuard?.name || ""} ${currentGuard?.surname || ""}`.replace(/\s+/g, "").toUpperCase();
    const myId = currentGuard?.id || (session as any)?.id || "";

    if (!myId && !myMat && !myNameClean && !sessionName) return;

    const pendingMissions = missions.filter(m => {
      if (m.status !== 'pending') return false;
      const missionMat = (m.guardMatricola || "").replace(/\s+/g, "").toUpperCase();
      const missionNameClean = (m.guardName || "").replace(/\s+/g, "").toUpperCase();
      
      const isMyId = Boolean(myId && m.guardId && (m.guardId === myId || myId.includes(m.guardId) || m.guardId.includes(myId)));
      const isMyMatricola = Boolean(myMat && missionMat && myMat === missionMat);
      const isMyName = Boolean(
        (myNameClean && missionNameClean && (missionNameClean.includes(myNameClean) || myNameClean.includes(missionNameClean))) ||
        (myNameRevClean && missionNameClean && (missionNameClean.includes(myNameRevClean) || myNameRevClean.includes(missionNameClean))) ||
        (sessionName && missionNameClean && (missionNameClean.includes(sessionName) || sessionName.includes(missionNameClean)))
      );
      return isMyId || isMyMatricola || isMyName;
    });

    if (pendingMissions.length > 0) {
      const latest = pendingMissions[0];
      const ttsKey = `tts_spoken_mission_${latest.id}`;
      if (!sessionStorage.getItem(ttsKey)) {
        sessionStorage.setItem(ttsKey, "true");
        playBeep();
        if ('vibrate' in navigator) navigator.vibrate([300, 150, 300, 150, 300]);
        speakMissionTTS(`Centrale Operativa. Nuova disposizione per ${latest.address || "destinazione non specificata"}. Confermare la presa in carico o comunicare motivo del rifiuto.`);
      }
    }

    const routeSentMissions = missions.filter(m => {
      if (m.status !== 'accepted' || !m.routeSent) return false;
      const missionMat = (m.guardMatricola || "").replace(/\s+/g, "").toUpperCase();
      const missionNameClean = (m.guardName || "").replace(/\s+/g, "").toUpperCase();
      
      const isMyId = Boolean(myId && m.guardId && (m.guardId === myId || myId.includes(m.guardId) || m.guardId.includes(myId)));
      const isMyMatricola = Boolean(myMat && missionMat && myMat === missionMat);
      const isMyName = Boolean(
        (myNameClean && missionNameClean && (missionNameClean.includes(myNameClean) || myNameClean.includes(missionNameClean))) ||
        (myNameRevClean && missionNameClean && (missionNameClean.includes(myNameRevClean) || myNameRevClean.includes(missionNameClean))) ||
        (sessionName && missionNameClean && (missionNameClean.includes(sessionName) || sessionName.includes(missionNameClean)))
      );
      return isMyId || isMyMatricola || isMyName;
    });

    if (routeSentMissions.length > 0) {
      const latestRoute = routeSentMissions[0];
      const ttsRouteKey = `tts_spoken_route_${latestRoute.id}`;
      if (!sessionStorage.getItem(ttsRouteKey)) {
        sessionStorage.setItem(ttsRouteKey, "true");
        playBeep();
        speakMissionTTS("Itinerario stradale ricevuto dalla Centrale Operativa. Puoi aprire il navigatore GPS.");
      }
    }

    // ANNOUNCEMENTS FOR CENTRAL HQ (When a guard accepts or rejects a mission)
    if (isAdmin || isResponsabile || isAdminMode) {
      missions.forEach(m => {
        if (m.status === 'accepted') {
          const keyAccepted = `hq_spoken_accepted_${m.id}`;
          if (!sessionStorage.getItem(keyAccepted)) {
            sessionStorage.setItem(keyAccepted, "true");
            playBeep();
            speakMissionTTS(`Attenzione Centrale Operativa: la pattuglia ${m.guardName || "di servizio"} ha confermato il comando per ${m.address || "l'obiettivo"}. Trasmettere itinerario.`);
          }
        } else if (m.status === 'rejected') {
          const keyRejected = `hq_spoken_rejected_${m.id}`;
          if (!sessionStorage.getItem(keyRejected)) {
            sessionStorage.setItem(keyRejected, "true");
            playBeep();
            speakMissionTTS(`Attenzione Centrale Operativa: la missione per ${m.address || "l'obiettivo"} è stata RIFIUTATA da ${m.guardName || "operatore"}. Motivo: ${m.rejectionReason || "non specificato"}`);
          }
        }
      });
    }
  }, [missions, currentGuard, session, isAdmin, isResponsabile, isAdminMode]);

  // Auto-seed useful contacts if empty when window opens
  useEffect(() => {
    if (isContactsOpen || isCommunityOpen) {
      document.body.style.overflow = "hidden";
      if (contacts.length === 0) {
        handleSeedContacts();
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isContactsOpen, isCommunityOpen, contacts.length]);



  // New Management State
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    name: "",
    plate: "",
    status: "available",
    fuelType: "benzina",
    registrationDate: "",
    revisionExpiry: "",
    insuranceExpiry: "",
    lastOilChangeKm: 0,
    nextOilChangeKm: 0,
    lastTyreChangeDate: "",
    maintenanceHistory: [],
  });
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isVehicleDetailOpen, setIsVehicleDetailOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: "",
    description: "",
    url: "",
    category: "comunicazioni" as const,
  });
  const [isAddingReport, setIsAddingReport] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id?: string, name: string, type: 'guard' | 'shift' | 'logs' } | null>(null);
  const [isAddingVehicleLog, setIsAddingVehicleLog] = useState(false);
  const [reportForm, setReportForm] = useState({
    type: "discarica" as const,
    description: "",
    address: "",
    externalAuthority: "",
    notes: "",
    photo: null as string | null,
    coords: null as { lat: number, lng: number } | null,
  });
  const [vehicleLogForm, setVehicleLogForm] = useState({
    vehicleId: "",
    date: "",
    startKm: "" as string | number,
    endKm: "" as string | number,
    startTime: "",
    endTime: "",
    fuelAmount: "" as string | number,
    fuelCost: "" as string | number,
    anomalies: "",
    location: "",
    damagePoints: {} as Record<string, string>,
  });

  const [reports, setReports] = useState<AppReport[]>(() => loadCacheData("reports"));
  const [sanctionReports, setSanctionReports] = useState<SanctionReport[]>(() => loadCacheData("sanction_reports"));
  const [serviceReports, setServiceReports] = useState<ServiceReport[]>(() => loadCacheData("service_reports"));
  const [territoryControls, setTerritoryControls] = useState<TerritoryControl[]>(() => loadCacheData("territory_controls"));
  const [isAddingServiceReport, setIsAddingServiceReport] = useState(false);

  const [newServiceReport, setNewServiceReport] = useState<Partial<ServiceReport>>({
    data: "",
    oraInizio: "",
    oraFine: "",
    settore: [],
    guardie: "",
    guardia1: "",
    guardia2: "",
    guardia3: "",
    localita: "",
    comune: "",
    provincia: "MS",
    veicoloTarga: "",
    veicoloProprieta: "EKOCLUB",
    note: "",
  });

  const [serviceReportsSearch, setServiceReportsSearch] = useState("");
  const [serviceReportsDateFilter, setServiceReportsDateFilter] = useState("");
  const [reportsSearch, setReportsSearch] = useState("");
  const [reportsDateFilter, setReportsDateFilter] = useState("");

  // Nuovi stati per VERBALISTICA / ARCHIVIO, RESPONSABILI e AREA 51
  const [isVerbalisticaOpen, setIsVerbalisticaOpen] = useState(false);
  const [isOperatoGuardieOpen, setIsOperatoGuardieOpen] = useState(false);
  const [isVerbalisticaSelectorOpen, setIsVerbalisticaSelectorOpen] = useState(false);
  const [isAddingTerritoryControl, setIsAddingTerritoryControl] = useState(false);
  const [isVerbaleDialogOpen, setIsVerbaleDialogOpen] = useState(false);
  const [isVerbaleSanzioneDialogOpen, setIsVerbaleSanzioneDialogOpen] = useState(false);
  const [verbaleSanzioneInitialMode, setVerbaleSanzioneInitialMode] = useState<"immediata" | "differita">("immediata");
  const [isRichiestaInterventoOpen, setIsRichiestaInterventoOpen] = useState(false);
  const [richiestaInterventoAddress, setRichiestaInterventoAddress] = useState("");
  const [richiestaInterventoLat, setRichiestaInterventoLat] = useState<number | undefined>(undefined);
  const [richiestaInterventoLng, setRichiestaInterventoLng] = useState<number | undefined>(undefined);
  const [verbalisticaTab, setVerbalisticaTab] = useState("scrivi");
  const [statsSubTab, setStatsSubTab] = useState<"stats" | "controls">("controls");
  const [isRiservataAuthDialogOpen, setIsRiservataAuthDialogOpen] = useState(false);
  const [showRiservataPassword, setShowRiservataPassword] = useState(false);
  const [riservataPassword, setRiservataPassword] = useState("");
  const [riservataError, setRiservataError] = useState("");
  const [isRiservataUnlocked, setIsRiservataUnlocked] = useState(false);

  // Stati per Ricerca OSINT e Ricerca Forense (Protetta da Password)
  const [centraleSubTab, setCentraleSubTab] = useState<"radar" | "forensics" | "missions_register" | "osint">("radar");
  const [ricercaAuthTarget, setRicercaAuthTarget] = useState<"osint" | "forensics">("osint");
  const [isRicercaAvanzataAuthOpen, setIsRicercaAvanzataAuthOpen] = useState(false);
  const [showRicercaAvanzataPassword, setShowRicercaAvanzataPassword] = useState(false);
  const [ricercaAvanzataPassword, setRicercaAvanzataPassword] = useState("");
  const [ricercaAvanzataError, setRicercaAvanzataError] = useState("");

  // Stati per Acquisizione Atti / Scanner Hub
  
  // FUNZIONI DIRETTE PER SALVA E RIPRISTINA (PER GIULIANO E CONSUELO)
  const [isDirectSaving, setIsDirectSaving] = useState(false);
  const [isDirectRestoring, setIsDirectRestoring] = useState(false);
  const [directRestoreFile, setDirectRestoreFile] = useState<File | null>(null);
  const [directRestoreData, setDirectRestoreData] = useState<any | null>(null);
  const [showDirectRestoreConfirm, setShowDirectRestoreConfirm] = useState(false);
  const directRestoreInputRef = useRef<HTMLInputElement>(null);

  const handleDirectSave = async () => {
    setIsDirectSaving(true);
    const collectionsToBackup = [
      'shifts', 'guards', 'reports', 'sanction_reports', 'service_reports',
      'territory_controls', 'environmental_reports', 'missions',
      'canine_certificates', 'contacts', 'vehicles', 'vehicle_logs',
      'documents', 'custom_pois', 'sos_duty_shifts', 'emergency_calls',
      'alerts', 'animalia_census'
    ];

    try {
      const backupData: Record<string, any[]> = {};
      let totalDocuments = 0;

      for (const colName of collectionsToBackup) {
        try {
          const snap = await getDocs(collection(db, colName));
          const list: any[] = [];
          snap.forEach(dSnap => {
            list.push({ _docId: dSnap.id, ...dSnap.data() });
          });
          backupData[colName] = list;
          totalDocuments += list.length;
        } catch (e) {
          console.warn('Errore salvataggio ' + colName, e);
          backupData[colName] = [];
        }
      }

      const fullPayload = {
        metadata: {
          app: 'VIGILANZA_BERTOLUCCI_EKOCLUB',
          version: '2.0.0',
          exportDate: new Date().toISOString(),
          exportedBy: {
            uid: user?.uid || 'N/A',
            email: user?.email || 'N/A',
            guardName: currentGuard?.name || 'Giuliano / Consuelo',
            matricola: currentGuard?.matricola || 'N/A'
          },
          totalCollections: collectionsToBackup.length,
          totalDocuments
        },
        database: backupData
      };

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const hoursStr = String(now.getHours()).padStart(2, '0');
      const minsStr = String(now.getMinutes()).padStart(2, '0');
      const filename = 'SALVATAGGIO_BERTOLUCCI_' + dateStr + '_' + hoursStr + '-' + minsStr + '.json';
      const jsonContent = JSON.stringify(fullPayload, null, 2);

      // Tentativo apertura finestra di selezione cartella / chiavetta USB nativa
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'File Backup JSON',
                accept: { 'application/json': ['.json'] }
              }
            ]
          });
          const writableStream = await handle.createWritable();
          await writableStream.write(jsonContent);
          await writableStream.close();
          alert("✅ SALVATAGGIO COMPLETATO!\n\nIl file è stato salvato con successo nella cartella o chiavetta USB scelta:\n" + filename + "\n\nTotale record salvati: " + totalDocuments);
          return;
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') {
            // L'utente ha premuto annulla nella finestra di salvataggio
            return;
          }
          console.warn('showSaveFilePicker non riuscito, fallback download standard', pickerErr);
        }
      }

      // Fallback per browser o contesti iframe che non supportano showSaveFilePicker
      const blob = new Blob([jsonContent], {
        type: 'application/json;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ SALVATAGGIO AVVIATO!\n\nFile: " + filename + "\nRecord salvati: " + totalDocuments + "\n\n(Se il browser non ha aperto la finestra 'Salva con nome', puoi impostare Chrome/Edge su 'Chiedi dove salvare ogni file' per scegliere sempre la chiavetta USB).");
    } catch (err: any) {
      alert('❌ Errore durante il salvataggio: ' + (err?.message || 'Errore sconosciuto'));
    } finally {
      setIsDirectSaving(false);
    }
  };

  const handleDirectFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (!json.database || typeof json.database !== 'object') {
          throw new Error('File non valido: struttura database assente.');
        }
        setDirectRestoreFile(file);
        setDirectRestoreData(json);
        setShowDirectRestoreConfirm(true);
      } catch (err: any) {
        alert('❌ File non valido o corrotto: ' + (err?.message || 'JSON non corretto'));
      }
    };
    reader.readAsText(file);
    if (directRestoreInputRef.current) directRestoreInputRef.current.value = '';
  };

  const handleExecuteDirectRestore = async () => {
    if (!directRestoreData || !directRestoreData.database) return;
    setIsDirectRestoring(true);

    try {
      let totalRestored = 0;
      const dbObj = directRestoreData.database;

      for (const colName of Object.keys(dbObj)) {
        const items = dbObj[colName];
        if (!Array.isArray(items) || items.length === 0) continue;

        for (const item of items) {
          const { _docId, ...docData } = item;
          if (_docId) {
            const docRef = doc(db, colName, _docId);
            await setDoc(docRef, {
              ...docData,
              restoredAt: serverTimestamp(),
              restoredFrom: directRestoreData.metadata?.exportDate || new Date().toISOString()
            }, { merge: true });
            totalRestored++;
          }
        }
      }

      setShowDirectRestoreConfirm(false);
      const fileNameRestored = directRestoreFile?.name || 'File JSON';
      setDirectRestoreFile(null);
      setDirectRestoreData(null);
      alert();
    } catch (err: any) {
      alert('❌ Errore durante il ripristino: ' + (err?.message || 'Errore sconosciuto'));
    } finally {
      setIsDirectRestoring(false);
    }
  };

  const [isAcquisizioneAttiOpen, setIsAcquisizioneAttiOpen] = useState(false);
  const [forceCanineCreateScanner, setForceCanineCreateScanner] = useState(false);
  const [forceCanineBulkScanner, setForceCanineBulkScanner] = useState(false);

  // Stato per i Documenti in Sospeso (Offline drafts)
  const [isPendingDocumentsOpen, setIsPendingDocumentsOpen] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("pending_documents");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isTransmitting, setIsTransmitting] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const transmitPendingDocument = async (pnd: any) => {
    if (isTransmitting) return;
    setIsTransmitting(true);
    try {
      if (pnd.type === "verbale") {
        const report = pnd.data;
        const emailPayload = pnd.emailPayload;
        const scannedImageBase64 = report.scannedImageBase64;
        
        const cleanReport: any = {};
        Object.keys(report).forEach((key) => {
          if (key !== "scannedImageBase64" && report[key] !== undefined) {
            cleanReport[key] = report[key];
          }
        });

        const docRef = await addDoc(collection(db, "reports"), {
          ...cleanReport,
          tipo: "verbale_ai",
          creatoAl: serverTimestamp(),
          creatoDa: user?.uid || "anon",
          creatoDaNome: currentGuard 
            ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
            : (session?.matricola || session?.name || "Admin"),
        });

        // Se c'è un intervento collegato, lo risolviamo sul Radar
        if (cleanReport.emergencyCallId) {
          try {
            await updateDoc(doc(db, "emergency_calls", cleanReport.emergencyCallId), { status: "risolto" });
            setEmergencyCalls(prev => prev.map(item => item.id === cleanReport.emergencyCallId ? { ...item, status: 'risolto' } : item));
          } catch (callErr) {
            console.error("Errore risoluzione chiamata collegata in transmitPendingDocument:", callErr);
          }
        }

        if (scannedImageBase64) {
          const chunkLength = 500000;
          const isChunked = scannedImageBase64.length > chunkLength;
          const newAttachment: any = {
            name: `Verbale Cartaceo Scansionato N. ${report.numeroVerbale || "ND"}.jpg`,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentGuard 
              ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
              : (session?.matricola || session?.name || "Centrale"),
            type: "document",
            reportId: docRef.id,
            isChunked,
            ...(isChunked
              ? { url: "", totalChunks: Math.ceil(scannedImageBase64.length / chunkLength) }
              : { url: scannedImageBase64 }),
          };

          const attRef = await addDoc(collection(db, "intervention_attachments"), newAttachment);

          if (isChunked) {
            const totalChunks = Math.ceil(scannedImageBase64.length / chunkLength);
            for (let i = 0; i < totalChunks; i++) {
              const chunkData = scannedImageBase64.substring(
                i * chunkLength,
                (i + 1) * chunkLength
              );
              await addDoc(collection(db, "attachment_chunks"), {
                attachmentId: attRef.id,
                chunkIndex: i,
                data: chunkData,
                uploadedAt: new Date().toISOString(),
              });
            }
          }
        }

        const operMatricola = currentGuard?.matricola || session?.matricola || "Centrale";
        sendSecurityAlert('verbali', 'create', docRef.id, operMatricola, `Nuovo Verbale di Sopralluogo N° ${report.numeroVerbale || "N/A"} compilato per il soggetto ${report.soggettoNome || "N/A"}`);
        logAction("Archiviazione Verbale", "create", { numeroVerbale: report.numeroVerbale, soggetto: report.soggettoNome });

        const compiledByName = currentGuard 
          ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
          : (session?.matricola || session?.name || "Admin");

        const finalEmailPayload = emailPayload ? {
          report: { ...report, id: docRef.id, creatoDaNome: compiledByName },
          ...emailPayload
        } : { 
          report: { ...report, id: docRef.id, creatoDaNome: compiledByName },
          guardEmail: user?.email || currentGuard?.email || ""
        };

        try {
          await fetch("/api/send-report-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalEmailPayload),
          });
        } catch (e) {
          console.error("Email send failed during transmit:", e);
        }
        
        // Remove from queue
        setPendingDocuments(prev => {
          const filtered = prev.filter(x => x.id !== pnd.id);
          localStorage.setItem("pending_documents", JSON.stringify(filtered));
          return filtered;
        });
        alert(`Verbale N° ${report.numeroVerbale || "ND"} inviato con successo!`);
      } else if (pnd.type === "rapporto") {
        const reportContent = pnd.data;
        
        const docRef = await addDoc(collection(db, "service_reports"), {
          ...reportContent,
          creatoAl: serverTimestamp(),
          creatoDa: user?.uid || "unknown",
          creatoDaNome: currentGuard?.matricola || user?.displayName || currentGuard?.name || "Anonimo",
        });

        logAction("Archiviazione Rapporto di Servizio", "create", { numeroRapporto: reportContent.numeroRapporto, settore: reportContent.settore?.join(", ") });
        logAction("Salvataggio Rapporto di Servizio", "create", { numeroRapporto: reportContent.numeroRapporto });

        try {
          await fetch("/api/send-service-report-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              report: { ...reportContent, id: docRef.id },
              guardEmail: user?.email || currentGuard?.email || ""
            })
          });
        } catch (e) {
          console.error("Email send failed during transmit:", e);
        }

        try {
          await fetch("/api/telegram/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "📋 NUOVO RAPPORTO DI SERVIZIO",
              message: `🆔 *Rapporto:* ${reportContent.numeroRapporto}\n📅 *Giorno:* ${reportContent.data}\n📡 *Settore:* ${reportContent.settore?.join(", ")}\n👥 *Pattuglia:* ${reportContent.guardie}\n📍 *Località:* ${reportContent.localita}`,
              type: "report",
              onlySupervisors: false
            })
          });
        } catch (e) {
          console.error("Telegram fail during transmit:", e);
        }

        // Remove from queue
        setPendingDocuments(prev => {
          const filtered = prev.filter(x => x.id !== pnd.id);
          localStorage.setItem("pending_documents", JSON.stringify(filtered));
          return filtered;
        });
        alert(`Rapporto di Servizio del ${reportContent.data || "ND"} inviato con successo!`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Errore nell'invio del documento "${pnd.title}": ${e.message || String(e)}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  // Monitor connection and auto-send
  useEffect(() => {
    const handleOnline = async () => {
      console.log("Internet connection is back online!");
      
      let currentPending: any[] = [];
      try {
        const stored = localStorage.getItem("pending_documents");
        currentPending = stored ? JSON.parse(stored) : [];
      } catch {
        currentPending = [];
      }

      if (currentPending.length === 0) return;

      alert(`Connessione ripristinata! Invio automatico di ${currentPending.length} documenti in sospeso in corso...`);

      for (const pnd of currentPending) {
        try {
          await transmitPendingDocument(pnd);
        } catch (err) {
          console.error("Auto-transmission failed for document:", pnd.title, err);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Date and report status helpers (safe & crash-resistant)
  const parseReportDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    if (typeof dateStr !== "string") return null;
    
    // Try custom DD/MM/YYYY parsing
    const dmyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
      const year = parseInt(dmyMatch[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fallback to standard Date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  const getReportDateFormatted = (dateStr: any) => {
    try {
      const parsedDate = parseReportDate(dateStr);
      if (parsedDate) {
        return format(parsedDate, "dd MMMM yyyy", { locale: it });
      }
    } catch (e) {
      console.warn("Date formatting error for value:", dateStr, e);
    }
    return typeof dateStr === 'string' ? dateStr : "N.D.";
  };

  const [readReportIds, setReadReportIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("read_report_ids");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const markReportAsRead = (id: string | undefined) => {
    if (!id) return;
    setReadReportIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("read_report_ids", JSON.stringify(next));
      return next;
    });
  };

  const isReportNew = (r: AppReport) => {
    if (r.id && readReportIds.includes(r.id)) {
      return false;
    }
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    if (r.creatoAl) {
      const ts = r.creatoAl as any;
      if (typeof ts.toDate === "function") {
        try {
          return ts.toDate() >= fiveDaysAgo;
        } catch (e) {}
      } else if (ts instanceof Date) {
        return ts >= fiveDaysAgo;
      } else {
        const parsed = new Date(ts);
        if (!isNaN(parsed.getTime())) {
          return parsed >= fiveDaysAgo;
        }
      }
    }
    if (r.data) {
      const parsed = parseReportDate(r.data);
      if (parsed) {
        return parsed >= fiveDaysAgo;
      }
    }
    return false;
  };

  const countNewReports = () => {
    return reports.filter(isReportNew).length;
  };


  // Handlers for new features
  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.plate) return;
    try {
      await addDoc(collection(db, "vehicles"), {
        ...newVehicle,
        createdAt: serverTimestamp(),
        maintenanceHistory: [],
      });
      logAction("Creazione nuovo veicolo", "create", { plate: newVehicle.plate });
      setNewVehicle({
        name: "",
        plate: "",
        status: "available",
        fuelType: "benzina",
        registrationDate: "",
        revisionExpiry: "",
        insuranceExpiry: "",
        lastOilChangeKm: 0,
        nextOilChangeKm: 0,
        lastTyreChangeDate: "",
        maintenanceHistory: [],
      });
      alert("Veicolo aggiunto al database.");
    } catch (e) {
      console.error(e);
      alert("Errore durante l'aggiunta del veicolo.");
    }
  };

  const handleUpdateVehicle = async (vehicleId: string, data: Partial<Vehicle>) => {
    try {
      await updateDoc(doc(db, "vehicles", vehicleId), data);
      alert("Dati veicolo aggiornati.");
    } catch (e) {
      console.error(e);
      alert("Errore durante l'aggiornamento.");
    }
  };

  const removeVehicle = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocument.title || !newDocument.url) return;
    try {
      await addDoc(collection(db, "documents"), {
        ...newDocument,
        createdAt: serverTimestamp(),
        createdBy: session?.name || "Admin",
      });
      setNewDocument({
        title: "",
        description: "",
        url: "",
        category: "comunicazioni",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleGpsCapture = async (isManual: boolean = false) => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setReportForm(prev => ({ ...prev, coords }));
      return coords;
    } catch (e) {
      console.warn("GPS non disponibile", e);
      if (isManual) {
        alert("Impossibile rilevare la posizione GPS. Assicurati che il GPS sia attivo.");
      }
      return null;
    }
  };

  const handlePhotoCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setReportForm(prev => ({ ...prev, photo: dataUrl }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEnvReport = async () => {
    if (!reportForm.description) {
      alert("Inserire una descrizione.");
      return;
    }

    try {
      console.log("Calcolo numero progressivo segnalazione...");
      const q = query(
        collection(db, "environmental_reports"),
        orderBy("reportNumber", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      let nextNumber = 1;
      if (!querySnapshot.empty) {
        const lastReport = querySnapshot.docs[0].data();
        nextNumber = (lastReport.reportNumber || 0) + 1;
      }

      console.log("Salvataggio segnalazione ambientale su Firestore n°", nextNumber);
      
      // 1. Salva su Firestore
      const reportData = {
        ...reportForm,
        reportNumber: nextNumber,
        reporterId: currentGuard?.id || auth.currentUser?.uid || "unknown",
        reporterMatricola: currentGuard?.matricola || "N/A",
        reporterName: currentGuard?.name || auth.currentUser?.displayName || "Anonimo",
        timestamp: serverTimestamp(),
        status: "invio_in_corso",
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, "environmental_reports"), reportData);
        logAction("Inserimento Segnalazione Ambientale", "create", { type: reportForm.type, address: reportForm.address });
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.CREATE, "environmental_reports");
      }

      console.log("Segnalazione salvata con ID:", docRef.id);

      // 2. Invia Email (Real Integration)
      try {
        console.log("Inviando email segnalazione ambientale con dati completi...");
        const res = await fetch("/api/send-env-report-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report: {
              ...reportForm,
              id: docRef.id,
              reportNumber: nextNumber,
              guard: currentGuard?.name || auth.currentUser?.displayName || "Anonimo",
              matricola: currentGuard?.matricola || "N/A",
              guardEmail: currentGuard?.email || user?.email || auth.currentUser?.email || "",
              date: new Date().toLocaleString("it-IT"),
              // Assicuriamoci che i campi opzionali siano stringhe vuote se nulli
              notes: reportForm.notes || "",
              externalAuthority: reportForm.externalAuthority || "",
              address: reportForm.address || "Località non specificata"
            }
          })
        });
        
        // 3. Notifica Telegram
        fetch("/api/telegram/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "⚠️ NUOVA SEGNALAZIONE REATO AMBIENTALE",
            message: `🆔 *Segnalazione:* #${nextNumber}\n📅 *Data:* ${new Date().toLocaleString("it-IT")}\n👤 *Guardia:* ${currentGuard?.name || "Anonimo"}\n📍 *Località:* ${reportForm.address || "N/A"}\n📝 *Tipo:* ${reportForm.type}\n📄 *Descrizione:* ${reportForm.description}`,
            type: "alert",
            onlySupervisors: false
          })
        }).catch(e => console.error("Telegram notification failed", e));

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Errore invio email segnalazione:", errData);
        } else {
          console.log("Email inviata correttamente con allegati.");
    try {
      await updateDoc(doc(db, "environmental_reports", docRef.id), { status: "aperta" });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "environmental_reports/" + docRef.id);
    }
        }
      } catch (err) {
        console.error("Errore rete invio email:", err);
      }

      setReportForm({
        type: "discarica",
        description: "",
        address: "",
        externalAuthority: "",
        notes: "",
        photo: null,
        coords: null,
      });
      setIsAddingReport(false);
      alert("Segnalazione inviata con successo!\n\nEmail inoltrata alla centrale con foto e coordinate GPS.");
    } catch (e: any) {
      console.error("Errore completo durante l'invio:", e);
      let userMessage = "Errore durante l'invio. Riprova più tardi.";
      
      try {
        const detail = JSON.parse(e.message);
        if (detail.error.includes("insufficient permissions")) {
          userMessage = "Permesso negato: Assicurati di essere loggato con l'email autorizzata.";
        } else if (detail.error.includes("Quota exceeded")) {
          userMessage = "Limite giornaliero raggiunto. Riprova domani.";
        }
      } catch {
        if (e.message?.includes("too large")) {
          userMessage = "La foto è troppo pesante per il database. Ne ho attivato la compressione, riprova ora.";
        } else {
          userMessage = "Errore: " + (e.message || "riprova tra poco");
        }
      }
      
      alert(userMessage);
    }
  };

  useEffect(() => {
    if (vehicles.length === 1 && !vehicleLogForm.vehicleId) {
      setVehicleLogForm((prev) => ({ ...prev, vehicleId: vehicles[0].id }));
    }
  }, [vehicles, vehicleLogForm.vehicleId]);

  useEffect(() => {
    if (isAddingReport) {
      handleGpsCapture(false); // background capture is silent / NOT manual
    }
  }, [isAddingReport]);

  const handleSubmitVehicleLog = async () => {
    if (!user || !currentGuard) {
      alert("Devi essere loggato come guardia per compilare il diario.");
      return;
    }
    if (!vehicleLogForm.vehicleId) {
      alert("Seleziona un mezzo.");
      return;
    }

    if (!vehicleLogForm.date) {
      alert("Inserire la data di uscita.");
      return;
    }

    const selectedVehicle = vehicles.find(
      (v) => v.id === vehicleLogForm.vehicleId,
    );

    try {
        await addDoc(collection(db, "vehicle_logs"), {
          ...vehicleLogForm,
          startKm: Number(vehicleLogForm.startKm) || 0,
          endKm: Number(vehicleLogForm.endKm) || 0,
          fuelAmount: Number(vehicleLogForm.fuelAmount) || 0,
          fuelCost: Number(vehicleLogForm.fuelCost) || 0,
          vehicleName: selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.plate})` : "Mezzo Ignoto",
          guardId: currentGuard.id,
          guardName: currentGuard.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard.matricola || currentGuard.name),
          timestamp: serverTimestamp(),
        });
      logAction("Inserimento Diario di Bordo", "create", { vehicle: selectedVehicle?.plate });
      setIsAddingVehicleLog(false);
      setVehicleLogForm({
        vehicleId: "",
        date: "",
        startKm: "",
        endKm: "",
        startTime: "",
        endTime: "",
        fuelAmount: "",
        fuelCost: "",
        anomalies: "",
        location: "",
        damagePoints: {},
      });
      alert("Registro salvato con successo nel database!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "vehicle_logs");
    }
  };

  const handleShareReport = (report: any) => {
    const text = `Segnalazione Ambientale\nTipo: ${report.type}\nDescrizione: ${report.description}\nLocalità: ${report.address || "N/D"}\nNote: ${report.notes}\nInviata da: ${report.guardName} il ${format(report.timestamp.toDate(), "dd/MM/yyyy HH:mm")}`;
    const mailto = `mailto:?subject=Segnalazione Ambientale&body=${encodeURIComponent(text)}`;
    window.open(mailto);
  };

  const handleShareVehicleLog = (log: any) => {
    const text = `Uscita Mezzo e Segnalazione Guasti\nMezzo: ${log.vehicleName}\nGuardia: ${log.guardName}\nKm: ${log.startKm} - ${log.endKm}\nOra: ${log.startTime} - ${log.endTime}\nCarburante: ${log.fuelAmount}L (${log.fuelCost}€)\nAnomalie: ${log.anomalies}\nLocalità: ${log.location}\nData: ${log.date}`;
    const mailto = `mailto:?subject=Uscita Mezzo&body=${encodeURIComponent(text)}`;
    window.open(mailto);
  };

  const [isCheckupDialogOpen, setIsCheckupDialogOpen] = useState(false);
  const [selectedVehicleForCheckup, setSelectedVehicleForCheckup] =
    useState<Vehicle | null>(null);
  const [checkupData, setCheckupData] = useState({
    engine: "Ok",
    electrical: "Ok",
    tires: "Ok",
    bodyDamage: [] as string[],
  });


  const saveReportFromAI = async (report: Partial<AppReport>, emailPayload?: any) => {
    if (!report.soggettoNome && !report.numeroVerbale) {
      alert("Attenzione: Inserire almeno il nome del controllato o il numero del verbale prima di salvare.");
      return;
    }

    if (!navigator.onLine) {
      const localId = `pnd-${Date.now()}`;
      const title = `Verbale di Sopralluogo N° ${report.numeroVerbale || "ND"} - ${report.soggettoNome || "Anonimo"}`;
      const newPending = {
        id: localId,
        type: "verbale",
        data: report,
        emailPayload,
        title,
        createdAt: new Date().toISOString(),
        status: "pending"
      };
      
      const updatedList = [...pendingDocuments, newPending];
      setPendingDocuments(updatedList);
      localStorage.setItem("pending_documents", JSON.stringify(updatedList));
      
      alert(`Nessuna connessione rilevata. Il documento "${title}" è stato salvato nei 'Documenti in Sospeso' e verrà inviato non appena tornerà il segnale.`);
      return;
    }

    // Apri subito il monitor con stato "invio in corso"
    setEmailFeedback({
      isOpen: true,
      status: 'sending',
      title: "Archiviazione e Invio Copie...",
      message: "Il verbale è stato registrato nel database di Massa-Carrara. Avvio trasmissione della notifica telematiche ai soggetti designati.",
      log: [
        "Inizializzazione connessione di rete...",
        "Composizione pacchetto dati verbale...",
        "Generazione allegato PDF conforme..."
      ]
    });

    const scannedImageBase64 = report.scannedImageBase64;
    const cleanReport: any = {};
    Object.keys(report).forEach((key) => {
      if (key !== "scannedImageBase64" && report[key as keyof AppReport] !== undefined) {
        cleanReport[key] = report[key as keyof AppReport];
      }
    });

    try {
      const docRef = await addDoc(collection(db, "reports"), {
        ...cleanReport,
        tipo: "verbale_ai",
        creatoAl: serverTimestamp(),
        creatoDa: user?.uid || "anon",
        creatoDaNome: currentGuard 
          ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
          : (session?.matricola || session?.name || "Admin"),
      });

      // Sincronizzazione automatica microchip nell'Anagrafe Canina se presente nel verbale
      const repAny = report as any;
      const chipToSync = repAny.microchip || repAny.secondoMicrochip;
      if (chipToSync) {
        syncMicrochipToArchive({
          microchip: chipToSync,
          specieRazza: repAny.specieRazza || repAny.caneRazza || "Cane",
          nomeCane: repAny.nomeCane || repAny.caneNome || "",
          proprietarioCognome: repAny.soggettoCognome || repAny.soggettoNome || "",
          proprietarioNome: repAny.soggettoNome || "",
          comune: report.comune,
          localita: report.localita,
          fonte: `Verbale N° ${report.numeroVerbale || docRef.id}`
        });
      }

      // Se c'è un intervento collegato, lo risolviamo sul Radar
      if (cleanReport.emergencyCallId) {
        try {
          await updateDoc(doc(db, "emergency_calls", cleanReport.emergencyCallId), { status: "risolto" });
          setEmergencyCalls(prev => prev.map(item => item.id === cleanReport.emergencyCallId ? { ...item, status: 'risolto' } : item));
        } catch (callErr) {
          console.error("Errore risoluzione chiamata collegata in saveReportFromAI:", callErr);
        }
      }

      // Se era presente un'immagine scansionata via AI OCR, la salviamo come allegato dell'intervento
      if (scannedImageBase64) {
        try {
          const chunkLength = 500000;
          const isChunked = scannedImageBase64.length > chunkLength;
          const newAttachment: any = {
            name: `Verbale Cartaceo Scansionato N. ${report.numeroVerbale || "ND"}.jpg`,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentGuard 
              ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
              : (session?.matricola || session?.name || "Centrale"),
            type: "document",
            reportId: docRef.id,
            isChunked,
            ...(isChunked
              ? { url: "", totalChunks: Math.ceil(scannedImageBase64.length / chunkLength) }
              : { url: scannedImageBase64 }),
          };

          const attRef = await addDoc(collection(db, "intervention_attachments"), newAttachment);

          if (isChunked) {
            const totalChunks = Math.ceil(scannedImageBase64.length / chunkLength);
            const chunkPromises = [];
            for (let i = 0; i < totalChunks; i++) {
              const chunkData = scannedImageBase64.substring(
                i * chunkLength,
                (i + 1) * chunkLength
              );
              chunkPromises.push(
                addDoc(collection(db, "attachment_chunks"), {
                  attachmentId: attRef.id,
                  chunkIndex: i,
                  data: chunkData,
                  uploadedAt: new Date().toISOString(),
                })
              );
            }
            await Promise.all(chunkPromises);
          }
        } catch (attErr) {
          console.error("Errore salvataggio allegato scansionato:", attErr);
        }
      }
      
      const operMatricola = currentGuard?.matricola || session?.matricola || "Centrale";
      sendSecurityAlert('verbali', 'create', docRef.id, operMatricola, `Nuovo Verbale di Sopralluogo N° ${report.numeroVerbale || "N/A"} compilato per il soggetto ${report.soggettoNome || "N/A"}`);

      logAction("Archiviazione Verbale", "create", { numeroVerbale: report.numeroVerbale, soggetto: report.soggettoNome });
      
      console.log("Verbale salvato con ID:", docRef.id);
      
      // Invia E-mail e notifica con feedback trasparente
      const compiledByName = currentGuard 
        ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
        : (session?.matricola || session?.name || "Admin");

      const finalEmailPayload = emailPayload ? {
        report: { ...report, id: docRef.id, creatoDaNome: compiledByName },
        ...emailPayload
      } : { 
        report: { ...report, id: docRef.id, creatoDaNome: compiledByName },
        guardEmail: user?.email || currentGuard?.email || ""
      };

      setEmailFeedback(prev => prev ? {
        ...prev,
        log: [...(prev.log || []), "Connessione server SMTP...", "Autorizzazione credenziali d'ufficio..."]
      } : null);

      try {
        const emailRes = await fetch("/api/send-report-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalEmailPayload),
        });
        
        if (emailRes.ok) {
          const emailData = await emailRes.json();
          const successes = emailData.successes || [];
          const failures = emailData.failures || [];
          
          if (successes.length > 0) {
            setEmailFeedback({
              isOpen: true,
              status: failures.length > 0 ? 'warning' : 'success',
              title: "Trasmissione Completata",
              message: "Il verbale è stato archiviato correttamente in cloud e le notifiche e-mail sono state recapitate.",
              successes: successes,
              errors: failures.length > 0 ? failures : undefined,
              log: ["Archiviazione salvata.", "Connessione SMTP OK.", "File inviati con successo!"]
            });
          } else {
            setEmailFeedback({
              isOpen: true,
              status: 'success',
              title: "Archiviazione e Notifica Nucleo",
              message: "Verbale salvato con successo. La copia di cortesia è stata instradata alla casella della sede d'ufficio.",
              successes: ["ekoclub.massacarrara@gmail.com (Sede Centrale)"],
              log: ["Archiviazione completata.", "Email inviata al Nucleo Centrale."]
            });
          }
        } else {
          const errData = await emailRes.json().catch(() => ({}));
          setEmailFeedback({
            isOpen: true,
            status: 'error',
            title: "Errore Invio E-mail",
            message: "Il verbale è stato salvato in archivio con successo, ma la trasmissione telematiche SMTP è stata bloccata dal server di posta o ha riscontrato problemi.",
            errors: [errData.error || "Impossibile autenticarsi sul server SMTP o indirizzo rifiutato."],
            log: ["Salvataggio database: OK", "Connessione SMTP: KO", `Errore: ${errData.error || "Errore generic SMTP"}`]
          });
        }
      } catch (err: any) {
        setEmailFeedback({
          isOpen: true,
          status: 'error',
          title: "Errore di Rete / SMTP",
          message: "Il verbale è stato salvato localmente nel database, ma l'invio delle e-mail è stato interrotto per un errore di connessione internet o timeout.",
          errors: [err.message || String(err)],
          log: ["Notifica di rete: Fallita.", `Dettaglio: ${err.message || err}`]
        });
      }
      return docRef.id;
    } catch (e: any) {
      console.error("Errore salvataggio verbale:", e);
      const isNetworkError = !navigator.onLine || e.message?.toLowerCase().includes("network") || e.message?.toLowerCase().includes("offline") || e.message?.toLowerCase().includes("fetch");
      
      if (isNetworkError) {
        const localId = `pnd-${Date.now()}`;
        const title = `Verbale di Sopralluogo N° ${report.numeroVerbale || "ND"} - ${report.soggettoNome || "Anonimo"}`;
        const newPending = {
          id: localId,
          type: "verbale",
          data: report,
          emailPayload,
          title,
          createdAt: new Date().toISOString(),
          status: "pending"
        };
        
        const updatedList = [...pendingDocuments, newPending];
        setPendingDocuments(updatedList);
        localStorage.setItem("pending_documents", JSON.stringify(updatedList));
        
        alert(`Connessione instabile. Il documento "${title}" è stato salvato nei 'Documenti in Sospeso'.`);
        return;
      }
      
      setEmailFeedback({
        isOpen: true,
        status: 'error',
        title: "Errore Grave Salvataggio",
        message: "Impossibile salvare il verbale nel database. Verificare la connessione, le autorizzazioni di sicurezza di Massa-Carrara o riprovare.",
        errors: [e.message || String(e)]
      });
    }
  };

  const handleAddServiceReport = async () => {
    if (!newServiceReport.data || newServiceReport.settore?.length === 0) {
      alert("Completare almeno la data e selezionare un settore.");
      return;
    }

    if (!navigator.onLine) {
      const localId = `pnd-${Date.now()}`;
      const title = `Rapporto di Servizio del ${newServiceReport.data || "ND"} - Settore ${newServiceReport.settore?.join(", ") || "ND"}`;
      const newPending = {
        id: localId,
        type: "rapporto",
        data: newServiceReport,
        title,
        createdAt: new Date().toISOString(),
        status: "pending"
      };
      
      const updatedList = [...pendingDocuments, newPending];
      setPendingDocuments(updatedList);
      localStorage.setItem("pending_documents", JSON.stringify(updatedList));
      
      setIsAddingServiceReport(false);
      setNewServiceReport({
        data: "",
        oraInizio: "",
        oraFine: "",
        settore: [],
        guardie: "",
        guardia1: "",
        guardia2: "",
        guardia3: "",
        localita: "",
        comune: "",
        provincia: "MS",
        veicoloTarga: "",
        veicoloProprieta: "EKOCLUB",
        note: "",
      });
      
      alert(`Nessuna connessione rilevata. Il documento "${title}" è stato salvato nei 'Documenti in Sospeso' e verrà inviato non appena tornerà il segnale.`);
      return;
    }

    try {
      setLoading(true);
      const numeroRapporto = `RS-${Date.now().toString().slice(-6)}`;
      const reportContent = { ...newServiceReport, numeroRapporto };
      
      const docRef = await addDoc(collection(db, "service_reports"), {
        ...reportContent,
        creatoAl: serverTimestamp(),
        creatoDa: user?.uid || "unknown",
        creatoDaNome: currentGuard?.matricola || user?.displayName || currentGuard?.name || "Anonimo",
      });

      logAction("Archiviazione Rapporto di Servizio", "create", { numeroRapporto, settore: newServiceReport.settore?.join(", ") });

      logAction("Salvataggio Rapporto di Servizio", "create", { numeroRapporto });

      // 📧 Invio automatico email per archiviazione
      try {
        const emailRes = await fetch("/api/send-service-report-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            report: { ...reportContent, id: docRef.id },
            guardEmail: user?.email || currentGuard?.email || ""
          })
        });

        // 📱 Notifica Telegram Gruppo
        fetch("/api/telegram/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "📋 NUOVO RAPPORTO DI SERVIZIO",
            message: `🆔 *Rapporto:* ${numeroRapporto}\n📅 *Giorno:* ${newServiceReport.data}\n📡 *Settore:* ${newServiceReport.settore?.join(", ")}\n👥 *Pattuglia:* ${newServiceReport.guardie}\n📍 *Località:* ${newServiceReport.localita}`,
            type: "report",
            onlySupervisors: false
          })
        }).catch(e => console.error("Telegram error", e));

        if (!emailRes.ok) {
          const emailData = await emailRes.json();
          console.warn("Invio email automatica fallito:", emailData.error);
          alert("Attenzione: Rapporto salvato ma l'invio dell'email per l'archivio è fallito: " + emailData.error);
        } else {
          console.log("Email automatica inviata correttamente.");
        }
      } catch (emailErr: any) {
        console.error("Errore invio email automatica:", emailErr);
        alert("Errore tecnico invio email: " + (emailErr.message || "Connessione fallita"));
      }

      setIsAddingServiceReport(false);
      setLoading(false);

      setNewServiceReport({
        data: "",
        oraInizio: "",
        oraFine: "",
        settore: [],
        guardie: "",
        guardia1: "",
        guardia2: "",
        guardia3: "",
        localita: "",
        comune: "",
        provincia: "MS",
        veicoloTarga: "",
        veicoloProprieta: "EKOCLUB",
        note: "",
      });

      if (window.confirm("Rapporto salvato con successo. Vuoi inviarlo subito via email alla centrale?")) {
        fetch("/api/send-service-report-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            report: reportContent,
            guardEmail: user?.email || currentGuard?.email || ""
          }),
        })
        .then(res => {
          if (res.ok) alert("Email inviata alla centrale con successo.");
          else alert("Rapporto salvato, ma si è verificato un errore nell'invio automatico.");
        })
        .catch(err => {
          console.error("Email send failed:", err);
          alert("Rapporto salvato, ma l'invio email è fallito. Controlla la connessione.");
        });
      }
    } catch (e: any) {
      console.error(e);
      const isNetworkError = !navigator.onLine || e.message?.toLowerCase().includes("network") || e.message?.toLowerCase().includes("offline") || e.message?.toLowerCase().includes("fetch");
      
      if (isNetworkError) {
        const localId = `pnd-${Date.now()}`;
        const title = `Rapporto di Servizio del ${newServiceReport.data || "ND"} - Settore ${newServiceReport.settore?.join(", ") || "ND"}`;
        const newPending = {
          id: localId,
          type: "rapporto",
          data: newServiceReport,
          title,
          createdAt: new Date().toISOString(),
          status: "pending"
        };
        
        const updatedList = [...pendingDocuments, newPending];
        setPendingDocuments(updatedList);
        localStorage.setItem("pending_documents", JSON.stringify(updatedList));
        
        setIsAddingServiceReport(false);
        setNewServiceReport({
          data: "",
          oraInizio: "",
          oraFine: "",
          settore: [],
          guardie: "",
          guardia1: "",
          guardia2: "",
          guardia3: "",
          localita: "",
          comune: "",
          provincia: "MS",
          veicoloTarga: "",
          veicoloProprieta: "EKOCLUB",
          note: "",
        });
        
        alert(`Connessione instabile. Il documento "${title}" è stato salvato nei 'Documenti in Sospeso'.`);
        return;
      }
      
      alert("Errore durante il salvataggio.");
    }
  };

  const removeServiceReport = async (id: string) => {
    if (!id) return;
    
    // Check permissions
    if (!isAdmin && !isResponsabile) {
      alert("Permessi insufficienti per eliminare. Contatta l'amministratore.");
      return;
    }

    let isConfirmed = false;
    try {
      isConfirmed = window.confirm("Sei sicuro di voler eliminare definitivamente questo rapporto dall'archivio?");
    } catch (e) {
      console.warn("window.confirm blocked by sandbox, auto-confirming.", e);
      isConfirmed = true;
    }
    if (!isConfirmed) return;
    
    try {
      setLoading(true);
      const docRef = doc(db, "service_reports", id);
      await deleteDoc(docRef);
      setLoading(false);
      alert("✅ Rapporto eliminato.");
    } catch (e: any) {
      setLoading(false);
      console.error("Delete error:", e);
      alert("❌ Errore eliminazione: " + (e.message || "Permesso negato"));
    }
  };

  const removeReport = async (id: string) => {
    const operatorMatricola = currentGuard?.matricola || session?.matricola || "Sconosciuto";
    if (!isAdmin) {
      alert("Operazione non autorizzata: solo gli Amministratori possono eliminare i verbali.");
      sendSecurityAlert('verbali', 'delete', id, operatorMatricola, "TENTATIVO NON AUTORIZZATO di eliminazione Verbale");
      return;
    }
    let isConfirmed = false;
    try {
      isConfirmed = window.confirm("Sei sicuro di voler eliminare permanentemente questo verbale?");
    } catch (e) {
      console.warn("window.confirm blocked by sandbox, auto-confirming.", e);
      isConfirmed = true;
    }
    if (!isConfirmed) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      sendSecurityAlert('verbali', 'delete', id, operatorMatricola, `Verbale ID ${id} eliminato con successo dall'archivio`);
    } catch (e: any) {
      console.error(e);
      alert("Errore eliminazione: " + e.message);
    }
  };

  const removeSanctionReport = async (id: string) => {
    const operatorMatricola = currentGuard?.matricola || session?.matricola || "Sconosciuto";
    if (!isAdmin) {
      alert("Operazione non autorizzata: solo gli Amministratori possono eliminare i verbali sanzionatori.");
      sendSecurityAlert('verbali', 'delete', id, operatorMatricola, "TENTATIVO NON AUTORIZZATO di eliminazione Verbale Sanzionatorio");
      return;
    }
    let isConfirmed = false;
    try {
      isConfirmed = window.confirm("Sei sicuro di voler eliminare permanentemente questo verbale sanzionatorio?");
    } catch (e) {
      console.warn("window.confirm blocked by sandbox, auto-confirming.", e);
      isConfirmed = true;
    }
    if (!isConfirmed) return;
    try {
      await deleteDoc(doc(db, "sanction_reports", id));
      sendSecurityAlert('verbali', 'delete', id, operatorMatricola, `Verbale Sanzionatorio ID ${id} eliminato con successo`);
    } catch (e: any) {
      console.error(e);
      alert("Errore eliminazione: " + e.message);
    }
  };

  const handleOpenCheckup = (v: Vehicle) => {
    setSelectedVehicleForCheckup(v);
    setCheckupData(
      v.lastCheckup || {
        engine: "Ok",
        electrical: "Ok",
        tires: "Ok",
        bodyDamage: [],
      },
    );
    setIsCheckupDialogOpen(true);
  };

  const saveCheckup = async () => {
    if (!selectedVehicleForCheckup) return;
    try {
      await updateDoc(doc(db, "vehicles", selectedVehicleForCheckup.id), {
        lastCheckup: {
          ...checkupData,
          date: format(new Date(), "yyyy-MM-dd HH:mm"),
        },
      });
      setIsCheckupDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const bodyParts = [
    { id: "front", label: "Anteriore", x: 20, y: 10 },
    { id: "hood", label: "Cofano", x: 20, y: 30 },
    { id: "roof", label: "Tetto", x: 20, y: 50 },
    { id: "trunk", label: "Bagagliaio", x: 20, y: 70 },
    { id: "rear", label: "Posteriore", x: 20, y: 85 },
    { id: "left_front", label: "Lato Sx Ant", x: 5, y: 25 },
    { id: "left_mid", label: "Lato Sx Central", x: 5, y: 50 },
    { id: "left_rear", label: "Lato Sx Post", x: 5, y: 75 },
    { id: "right_front", label: "Lato Dx Ant", x: 35, y: 25 },
    { id: "right_mid", label: "Lato Dx Central", x: 35, y: 50 },
    { id: "right_rear", label: "Lato Dx Post", x: 35, y: 75 },
  ];
  const [cancellationTargetId, setCancellationTargetId] = useState<
    string | null
  >(null);
  const [cancellationReason, setCancellationReason] = useState("Malattia");
  const [customCancellationReason, setCustomCancellationReason] = useState("");

  // Shift Form State
  const [newShift, setNewShift] = useState({
    startTime: "08:00",
    endTime: "12:00",
    notes: "",
    guardId: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });


  useEffect(() => {
    if (isAdminPortalOpen && !isAdmin && !isResponsabile && activeAdminTab === "guards") {
      setActiveAdminTab("service_reports");
    }
  }, [isAdminPortalOpen, isAdmin]);

  // Black Box Listener
  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, "access_logs"), orderBy("timestamp", "desc"), limit(200));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAccessLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      
      if (isAdminPortalOpen && activeAdminTab === "black_box") {
        logAction("Consultazione Scatola Nera", "access");
      }
      
      return unsubscribe;
    }
  }, [isAdmin, isAdminPortalOpen, activeAdminTab]);

  // 0. Persistence & URL Logic
  useEffect(() => {
    const checkPersistence = async () => {
      try {
        console.log("[App] Controllo persistenza sessione...");
        if (isInstanceVerified || hasAttemptedAutoLogin) return;

        const params = new URLSearchParams(window.location.search);
        const urlMatricola = params.get("m");
        let localMatricola = null;
        try {
          localMatricola = localStorage.getItem("last_matricola");
        } catch (e) {
          console.warn("localStorage non accessibile:", e);
        }
        const savedMatricola = urlMatricola || localMatricola;

        if (savedMatricola) {
          console.log("[App] Tentativo login automatico per:", savedMatricola);
          setHasAttemptedAutoLogin(true);
          setIsAutoLoggingIn(true);
          setLoading(true);
          
          // Timeout per il login automatico - sblocco forzato
          const autoLoginTimeout = setTimeout(() => {
            console.warn("[App] Timeout login automatico - sblocco forzato");
            setIsAutoLoggingIn(false);
            setLoading(false);
            setIsInitializing(false);
          }, 4500);

          try {
            await performLogin(savedMatricola);
          } catch (err) {
            console.error("[App] Login automatico failed:", err);
          } finally {
            clearTimeout(autoLoginTimeout);
            setIsAutoLoggingIn(false);
            setLoading(false);
            setIsInitializing(false);
          }
          console.log("[App] Login automatico completato.");

          if (params.get("stats") === "1") setIsStatsUnlocked(true);
          if (params.get("print") === "1") {
            setTimeout(() => window.print(), 1500);
          }
        } else {
          console.log("[App] Nessuna sessione salvata trovata.");
          setHasAttemptedAutoLogin(true);
          setIsAutoLoggingIn(false);
          setLoading(false);
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("[App] Auto-login error:", err);
        setIsAutoLoggingIn(false);
        setLoading(false);
        setIsInitializing(false);
      }
    };
    checkPersistence();
  }, [isInstanceVerified, hasAttemptedAutoLogin]);

  // 0. Consolidation of Initialization and Safety Timers
  useEffect(() => {
    console.log("[App] Inizializzazione timers di sicurezza...");
    // Safety fallback to unlock UI after 3 seconds regardless of what happens
    const mainSafetyTimer = setTimeout(() => {
      console.warn("[App] Safety Timer: Sblocco forzato attivato.");
      setLoading(false);
      setIsAutoLoggingIn(false);
      setIsInitializing(false);
      setShowSplash(false);
      setShowEmergencySkip(true);
    }, 3000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("[App] Auth State Changed:", currentUser?.uid);
      setUser(currentUser);

      if (!currentUser) {
        try {
          console.log("[App] Tentativo accesso anonimo...");
          await signInAnonymously(auth);
        } catch (e) {
          console.error("[App] Initial auth failed", e);
        }
      }

      // Check if saved matricola exists before disabling auto login indicator prematurely
      const localMat = localStorage.getItem("last_matricola");
      if (!localMat) {
        setLoading(false);
        setIsInitializing(false);
        setIsAutoLoggingIn(false);
      } else {
        setLoading(false);
        setIsInitializing(false);
      }
    });

    return () => {
      clearTimeout(mainSafetyTimer);
      unsubscribeAuth();
    };
  }, []);

  // 2. Data Listeners (Always active if Firebase auth is ready)
  useEffect(() => {
    if (!user) return;

    const unsubscribeShifts = onSnapshot(
      query(collection(db, "shifts"), orderBy("date", "asc")),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Shift[];
        setShifts(data);
        saveCacheData("shifts", data);
      },
      (error) => {
        console.error("Shifts listener error:", error);
        const cached = loadCacheData<Shift>("shifts");
        if (cached.length > 0) setShifts(cached);
      },
    );

    const unsubscribeGuards = onSnapshot(
      collection(db, "guards"),
      (snapshot) => {
        const guardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Guard[];
        // Ordinamento alfabetico rigoroso per Cognome e poi Nome con gestione robusta dei tipi
        guardsData.sort((a, b) => {
          try {
            const cognomeA = String(a.surname || "").trim().toLowerCase();
            const cognomeB = String(b.surname || "").trim().toLowerCase();
            const nomeA = String(a.name || "").trim().toLowerCase();
            const nomeB = String(b.name || "").trim().toLowerCase();

            const fullA = `${cognomeA} ${nomeA}`.trim();
            const fullB = `${cognomeB} ${nomeB}`.trim();

            return fullA.localeCompare(fullB, 'it', { sensitivity: 'base' });
          } catch (e) {
            console.warn("Sorting guards error:", e);
            return 0;
          }
        });
        setGuards(guardsData);
        saveCacheData("guards", guardsData);
        setCurrentGuard((prev) => {
          if (!prev) return null;
          const prevMat = (prev.matricola || "").replace(/\s+/g, "").toUpperCase();
          const found = guardsData.find(g => g.id === prev.id || (prevMat && (g.matricola || "").replace(/\s+/g, "").toUpperCase() === prevMat));
          return found || prev;
        });
        setGuardsLoaded(true);
      },
      (error) => {
        console.error("Guards listener error:", error);
        const cached = loadCacheData<Guard>("guards");
        if (cached.length > 0) setGuards(cached);
        setGuardsLoaded(true);
      },
    );

    const unsubscribeMissions = onSnapshot(
      collection(db, "missions"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Mission[];
        setMissions(list);
        saveCacheData("missions", list);
      },
      (error) => {
        console.error("Missions listener error:", error);
        const cached = loadCacheData<Mission>("missions");
        if (cached.length > 0) setMissions(cached);
      },
    );

    const unsubscribeContacts = onSnapshot(
      collection(db, "contacts"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UsefulContact[];
        setContacts(list);
        saveCacheData("contacts", list);
      },
      (error) => {
        console.error("Contacts listener error:", error);
        const cached = loadCacheData<UsefulContact>("contacts");
        if (cached.length > 0) setContacts(cached);
      },
    );

    const unsubscribeEmergencyCalls = onSnapshot(
      collection(db, "emergency_calls"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmergencyCalls(list);
        saveCacheData("emergency_calls", list);
      },
      (error) => {
        console.error("EmergencyCalls listener error:", error);
        const cached = loadCacheData<any>("emergency_calls");
        if (cached.length > 0) setEmergencyCalls(cached);
      },
    );

    return () => {
      unsubscribeShifts();
      unsubscribeGuards();
      unsubscribeMissions();
      unsubscribeContacts();
      unsubscribeEmergencyCalls();
    };
  }, [user]);

  // Auto-heal incorrect roles for Triscornia Alex and Triscornia Giuliano in Firestore
  useEffect(() => {
    if (!guards || guards.length === 0 || !user) return;

    const repairRoles = async () => {
      const faultyGuards = guards.filter((g) => {
        const mat = (g.matricola || "").replace(/\s+/g, "").toUpperCase();
        return (
          (mat === "TA928" && g.role !== "guardia") ||
          (mat === "TG930" && g.role !== "guardia")
        );
      });

      if (faultyGuards.length === 0) return;

      console.log("Rilevati operatori con ruolo errato nel database (Triscornia Alex / Giuliano), avvio correzione automatica...", faultyGuards);
      for (const g of faultyGuards) {
        try {
          await updateDoc(doc(db, "guards", g.id), { role: "guardia" });
          console.log(`Corretto ruolo per operatore ${g.name} (${g.matricola}) a 'guardia'.`);
        } catch (e) {
          console.warn(`Errore durante l'auto-correzione del ruolo per ${g.name}:`, e);
        }
      }
    };

    repairRoles();
  }, [guards, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // REAL-TIME STREAMING LISTENERS (Keep Active: SOS Alerts, Reperibilità SOS, Mappa POI)
    const unsubscribeAlerts = onSnapshot(
      query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(30)),
      (snapshot) => {
        const alertsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Alert[];
        setAlerts(alertsData);
        saveCacheData("alerts", alertsData);
      },
      (error) => {
        console.warn("Alerts listener fallback to cache:", error?.message || error);
        const cached = loadCacheData<Alert>("alerts");
        if (cached.length > 0) setAlerts(cached);
      },
    );

    const unsubscribeSosDuty = onSnapshot(
      query(collection(db, "sos_duty_shifts"), orderBy("date", "asc"), limit(100)),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SosDutyShift[];
        setSosDutyShifts(data);
        saveCacheData("sos_duty_shifts", data);
      },
      (error) => {
        console.warn("SosDuty listener fallback to cache:", error?.message || error);
        const cached = loadCacheData<SosDutyShift>("sos_duty_shifts");
        if (cached.length > 0) setSosDutyShifts(cached);
      },
    );

    const unsubscribeCustomPois = onSnapshot(
      collection(db, "custom_pois"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomPois(data);
        saveCacheData("custom_pois", data);
      },
      (error) => {
        console.error("CustomPois listener error:", error);
        const cached = loadCacheData<any>("custom_pois");
        if (cached.length > 0) setCustomPois(cached);
      }
    );

    // STANDBY ARCHIVAL COLLECTIONS (One-Shot Initial Fetch + Local Cache to maximize app speed)
    const loadStandbyArchives = async () => {
      try {
        // Load cached data first for 0ms render time
        const cachedVehicles = loadCacheData<Vehicle>("vehicles");
        if (cachedVehicles.length > 0) setVehicles(cachedVehicles);

        const cachedEnv = loadCacheData<EnvironmentalReport>("environmental_reports");
        if (cachedEnv.length > 0) setEnvReports(cachedEnv);

        const cachedDocs = loadCacheData<AppDocument>("documents");
        if (cachedDocs.length > 0) setDocuments(cachedDocs);

        const cachedVLogs = loadCacheData<VehicleLog>("vehicle_logs");
        if (cachedVLogs.length > 0) setVehicleLogs(cachedVLogs);

        const cachedReports = loadCacheData<AppReport>("reports");
        if (cachedReports.length > 0) setReports(cachedReports);

        const cachedSReports = loadCacheData<ServiceReport>("service_reports");
        if (cachedSReports.length > 0) setServiceReports(cachedSReports);

        const cachedTerritory = loadCacheData<TerritoryControl>("territory_controls");
        if (cachedTerritory.length > 0) setTerritoryControls(cachedTerritory);

        const cachedSanctions = loadCacheData<SanctionReport>("sanction_reports");
        if (cachedSanctions.length > 0) setSanctionReports(cachedSanctions);

        if (isAnimaliaAuthorized) {
          const cachedAnim = loadCacheData<any>("animalia_census");
          if (cachedAnim.length > 0) setAnimaliaCensus(cachedAnim);
        }

        // Single background fetch (no open streaming socket, error-resilient)
        const getTimeVal = (val: any): number => {
          if (!val) return 0;
          if (typeof val?.toDate === "function") return val.toDate().getTime();
          if (typeof val?.seconds === "number") return val.seconds * 1000;
          if (val instanceof Date) return val.getTime();
          const parsed = Date.parse(val);
          return isNaN(parsed) ? 0 : parsed;
        };

        const safeFetchCollection = async (collName: string, dateField?: string) => {
          try {
            const snap = await getDocs(collection(db, collName));
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (dateField) {
              docs.sort((a: any, b: any) => getTimeVal(b[dateField]) - getTimeVal(a[dateField]));
            }
            return docs;
          } catch (err) {
            console.warn(`Safe fetch for ${collName} notice:`, err);
            return [];
          }
        };

        const [
          vehiclesData,
          envData,
          docsData,
          vLogsData,
          reportsData,
          sReportsData,
          territoryData,
          sanctionsData
        ] = await Promise.all([
          safeFetchCollection("vehicles"),
          safeFetchCollection("environmental_reports", "timestamp"),
          safeFetchCollection("documents", "createdAt"),
          safeFetchCollection("vehicle_logs", "timestamp"),
          safeFetchCollection("reports", "creatoAl"),
          safeFetchCollection("service_reports", "creatoAl"),
          safeFetchCollection("territory_controls", "creatoAl"),
          safeFetchCollection("sanction_reports", "creatoAl")
        ]);

        if (vehiclesData.length > 0 || loadCacheData<Vehicle>("vehicles").length === 0) {
          setVehicles(vehiclesData as Vehicle[]);
          saveCacheData("vehicles", vehiclesData);
        }
        if (envData.length > 0 || loadCacheData<EnvironmentalReport>("environmental_reports").length === 0) {
          setEnvReports(envData as EnvironmentalReport[]);
          saveCacheData("environmental_reports", envData);
        }
        if (docsData.length > 0 || loadCacheData<AppDocument>("documents").length === 0) {
          setDocuments(docsData as AppDocument[]);
          saveCacheData("documents", docsData);
        }
        if (vLogsData.length > 0 || loadCacheData<VehicleLog>("vehicle_logs").length === 0) {
          setVehicleLogs(vLogsData as VehicleLog[]);
          saveCacheData("vehicle_logs", vLogsData);
        }
        if (reportsData.length > 0 || loadCacheData<AppReport>("reports").length === 0) {
          setReports(reportsData as AppReport[]);
          saveCacheData("reports", reportsData);
        }
        if (sReportsData.length > 0 || loadCacheData<ServiceReport>("service_reports").length === 0) {
          setServiceReports(sReportsData as ServiceReport[]);
          saveCacheData("service_reports", sReportsData);
        }
        if (territoryData.length > 0 || loadCacheData<TerritoryControl>("territory_controls").length === 0) {
          setTerritoryControls(territoryData as TerritoryControl[]);
          saveCacheData("territory_controls", territoryData);
        }
        if (sanctionsData.length > 0 || loadCacheData<SanctionReport>("sanction_reports").length === 0) {
          setSanctionReports(sanctionsData as SanctionReport[]);
          saveCacheData("sanction_reports", sanctionsData);
        }

        if (isAnimaliaAuthorized) {
          const animData = await safeFetchCollection("animalia_census", "creatoAl");
          if (animData.length > 0 || loadCacheData<any>("animalia_census").length === 0) {
            setAnimaliaCensus(animData);
            saveCacheData("animalia_census", animData);
          }
        }
      } catch (err) {
        console.warn("Archive fetch standby notice:", err);
      }
    };

    loadStandbyArchives();

    return () => {
      unsubscribeAlerts();
      unsubscribeSosDuty();
      unsubscribeCustomPois();
    };
  }, [user, isAdmin, isResponsabile, isAnimaliaAuthorized]);

  // Inizializza o ricalcola la vista per Giuliano o Consuelo (Sede vs Operatore)
  useEffect(() => {
    if (hqViewMode === null) {
      const isMobileDevice = window.innerWidth < 1024;
      setHqViewMode(isMobileDevice ? 'guard' : 'hq');
    }
  }, [hqViewMode]);

  // Helper per calcolo giorni rimanenti a scadenza decreto
  const countDaysRemaining = (expDateStr: string) => {
    try {
      const expDate = parseISO(expDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      const diffTime = expDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      console.error("Data per decreto non valida:", expDateStr, e);
      return 999;
    }
  };

  // Helper per formattare la scadenza come Mese Anno in Italiano (es: Giugno 2026)
  const formatMonthYear = (dateStr?: string) => {
    if (!dateStr) return "N/D";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const months = [
          "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
          "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${months[monthNum - 1]} ${year}`;
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr || "N/D";
    }
  };

  // Caricamento in background delle info private di tutte le guardie per il tracciamento scadenze
  useEffect(() => {
    if (!user || guards.length === 0) return;

    const loadPrivateInfos = async () => {
      if (isAdmin || isResponsabile) {
        console.log("[DECREES] Caricamento anagrafica privata in corso per controllo scadenze...");
        const promises = guards.map(async (g) => {
          if (guardPrivateInfoMap[g.id]) return null;
          try {
            const docRef = doc(db, "guards", g.id, "private", "data");
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              return { id: g.id, data: snap.data() as GuardPrivateInfo };
            }
          } catch (err) {
            console.error(`Errore caricamento info scadenze guardia ${g.id}:`, err);
          }
          return null;
        });

        const results = await Promise.all(promises);
        const newMap = { ...guardPrivateInfoMap };
        let updated = false;
        for (const res of results) {
          if (res && res.data) {
            newMap[res.id] = res.data;
            updated = true;
          }
        }
        if (updated) {
          setGuardPrivateInfoMap(newMap);
        }
      } else if (currentGuard) {
        // Carica dati scadenze solo per l'operatore corrente
        if (guardPrivateInfoMap[currentGuard.id]) return;
        try {
          console.log("[DECREES] Caricamento anagrafica privata per operatore corrente:", currentGuard.id);
          const docRef = doc(db, "guards", currentGuard.id, "private", "data");
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setGuardPrivateInfoMap((prev) => ({
              ...prev,
              [currentGuard.id]: snap.data() as GuardPrivateInfo,
            }));
          }
        } catch (err) {
          console.error(`Errore caricamento info scadenze guardia corrente:`, err);
        }
      }
    };

    loadPrivateInfos();
  }, [guards, user, isAdmin, isResponsabile, currentGuard]);

  // Esecuzione controllo scadenze ed invio automatico email
  useEffect(() => {
    if (!user || guards.length === 0 || Object.keys(guardPrivateInfoMap).length === 0) return;
    // Solo amministratori o Baratta Andrea (BA906) avviano il controllo automatico degli allarmi
    if (!(isAdmin || isBarattaAndrea)) return;
    if (isCheckingExpirations) return;

    const runCheckAndNotify = async () => {
      setIsCheckingExpirations(true);
      console.log("[DECREES] Avvio scansione automatica scadenze biennali...");
      
      let emailsSentCount = 0;
      
      for (const guard of guards) {
        const pInfo = guardPrivateInfoMap[guard.id];
        if (!pInfo) continue;

        const gName = guard.surname ? `${guard.surname} ${guard.name}` : guard.name;
        const guardEmail = pInfo.email || guard.email || "";

        // Tipi di decreti e date collegate
        const decreeTypes = [
          { type: "ittica", date: pInfo.scadenzaIttica },
          { type: "venatoria", date: pInfo.scadenzaVenatoria },
          { type: "zoofila", date: pInfo.scadenzaZoofila },
          { type: "ambientale", date: pInfo.scadenzaAmbientale }
        ];

        for (const d of decreeTypes) {
          if (!d.date) continue; // Salta se date non presente

          const daysLeft = countDaysRemaining(d.date);
          // Soglia 60 giorni, fino a 2 anni scaduto
          const isWarnZone = daysLeft <= 60 && daysLeft > -730;
          const alertKey = `${d.type}_60`;

          const notifiedArray = pInfo.notifiedExpirations || [];

          if (isWarnZone && !notifiedArray.includes(alertKey)) {
            console.log(`[DECREES] Allarme rilevato per ${gName} su decreto ${d.type}. Giorni: ${daysLeft}`);
            
            let emailSentToGuard = false;
            // 1. Invio email alla guardia interessata
            if (guardEmail) {
              try {
                const response = await fetch("/api/send-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: guardEmail,
                    subject: `⚠️ CORPO VIGILANZA: AVVISO SCADENZA DECRETO ${d.type.toUpperCase()}`,
                    html: `
                      <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #020617; color: #f1f5f9; border-radius: 16px; border: 2px solid #ef4444; max-width: 600px; margin: auto;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; margin: 0;">Corpo Guardia e Vigilanza Bertolucci</p>
                          <h2 style="font-weight: normal; color: #f87171; text-transform: uppercase; margin: 5px 0 0 0;">Avviso di Scadenza Prelevamento Decreto</h2>
                        </div>
                        <p style="font-size: 15px; margin-top: 15px;">Gentile Guardia <strong>${gName}</strong>,</p>
                        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                          La presente notifica automatica fa fede legale per avvisarti che il tuo decreto biennale di qualifica 
                          <strong style="color: #38bdf8; text-transform: uppercase; font-size: 16px;">${d.type}</strong> scadrà in data 
                          <strong style="color: #f87171; font-size: 16px;">${safeFormatDate(d.date, "dd/MM/yyyy")}</strong> (tra <strong>${daysLeft} giorni</strong>).
                        </p>
                        <div style="background-color: #7f1d1d; border: 1px solid #b91c1c; padding: 15px; border-radius: 10px; text-align: center; margin: 25px 0;">
                          <p style="font-size: 15px; font-weight: bold; color: #fef08a; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
                            Scadenza decreto il ${safeFormatDate(d.date, "dd/MM/yyyy")}. Si prega di contattare il responsabile per il ritiro o consegnarlo personalmente.
                          </p>
                        </div>
                        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 30px;">
                          * Si ricorda che, secondo regolamento, una volta superato l'ultimo giorno di validità, lo stato di qualifica passerà inoperoso fino ad avvenuto riscontro cartaceo dell'ASL / Polizia Municipale.
                        </p>
                        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
                        <p style="font-size: 10px; color: #475569; text-align: center; margin: 0;">Servizio Tracciamento Automatico Scadenze - Centrale Operativa HQ</p>
                      </div>
                    `
                  })
                });
                if (response.ok) {
                  emailSentToGuard = true;
                }
              } catch (e) {
                console.error("Errore invio email a guardia:", e);
              }
            }

            // 2. Invio avviso a Baratta Andrea (Responsabile)
            try {
              const barattaGuard = guards.find(g => (g.matricola || "").replace(/\s+/g, "").toUpperCase() === "BA906");
              const barattaEmail = (barattaGuard && guardPrivateInfoMap[barattaGuard.id]?.email) || barattaGuard?.email || "andrea61.baratta@gmail.com";

              await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: barattaEmail,
                  subject: `📢 Notifica Rinnovo Decreto: Inviato avviso a ${gName}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #020617; color: #f1f5f9; border-radius: 16px; border: 1px solid #1e293b; max-width: 600px; margin: auto;">
                      <h3 style="font-weight: normal; color: #10b981; border-b: 1px solid #334155; padding-bottom: 10px;">Notifica Log Tracciamento Scadenze</h3>
                      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                        Inviato messaggio automatico a <strong style="color: #ffffff;">${gName}</strong> per informarlo dell'imminente scadenza del suo decreto:
                      </p>
                      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; background-color: #0f172a; border-radius: 8px;">
                        <tr>
                          <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #64748b;">Guardia</td>
                          <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: bold;">${gName} (Matricola ${guard.matricola || "N/D"})</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #64748b;">Decreto</td>
                          <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-weight: bold; text-transform: uppercase;">${d.type}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #64748b;">Scadenza</td>
                          <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #ef4444; font-weight: bold;">${safeFormatDate(d.date, "dd/MM/yyyy")}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px; color: #64748b;">Giorni Rimasti</td>
                          <td style="padding: 10px; color: #fbbf24; font-weight: bold;">${daysLeft} giorni</td>
                        </tr>
                      </table>
                      <div style="background-color: #064e3b; border: 1px solid #059669; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; color: #34d399; font-size: 14px; margin-top: 15px;">
                        Inviato messaggio a ${gName} avvisato scadenza decreto ${d.type.toUpperCase()}.
                      </div>
                      <p style="font-size: 10px; color: #475569; text-align: center; margin-top: 25px;">Modulo Automatizzato Rinnovi - Vigilanza Bertolucci</p>
                    </div>
                  `
                })
              });
            } catch (err) {
              console.error("Errore invio avviso a Baratta Andrea:", err);
            }

            // 3. Salvataggio stato inviato su Firestore
            try {
              const updatedNotified = [...notifiedArray, alertKey];
              const docRef = doc(db, "guards", guard.id, "private", "data");
              await setDoc(docRef, { notifiedExpirations: updatedNotified }, { merge: true });
              
              // Cambio locale della mappa
              setGuardPrivateInfoMap(prev => {
                const inner = prev[guard.id] || {};
                return {
                  ...prev,
                  [guard.id]: {
                    ...inner,
                    notifiedExpirations: updatedNotified
                  }
                };
              });

              logAction("Notifica Automatica Scadenza", "create", {
                guardName: gName,
                decreeType: d.type,
                expirationDate: d.date,
                daysLeft
              });

              emailsSentCount++;
            } catch (err) {
              console.error("Errore salvataggio flag notificato:", err);
            }
          }
        }
      }
      
      if (emailsSentCount > 0) {
        alert(`📢 SCADENZA DECRETI: Rilevate scadenze sotto i 60gg. Trasmessi automaticamente ${emailsSentCount} messaggi di preavviso alle guardie ed al Responsabile Baratta Andrea.`);
      }
      setIsCheckingExpirations(false);
    };

    runCheckAndNotify();
  }, [guardPrivateInfoMap, guards, user, isAdmin, isBarattaAndrea]);

  // Aggiornamento rapido delle date scadenze decreti dal pannello di controllo
  const handleQuickSaveDecreeDates = async (guardId: string, dates: { scadenzaIttica?: string, scadenzaVenatoria?: string, scadenzaZoofila?: string, scadenzaAmbientale?: string }) => {
    if (!isAdmin && !isBarattaAndrea) {
      alert("Solo gli amministratori o il Responsabile Baratta Andrea possono modificare le scadenze dei decreti.");
      return;
    }
    try {
      const privateDocRef = doc(db, "guards", guardId, "private", "data");
      await setDoc(privateDocRef, dates, { merge: true });
      
      setGuardPrivateInfoMap(prev => {
        const currentPInfo = prev[guardId] || {};
        return {
          ...prev,
          [guardId]: {
            ...currentPInfo,
            ...dates
          }
        };
      });
      alert("Scadenze aggiornate correttamente nel database cartelle anagrafi ufficiale!");
      logAction("Quick Update Scadenze Decreti", "update", { guardId, ...dates });
    } catch (e: any) {
      console.error("Errore quick save scadenze:", e);
      alert("Errore nel salvataggio: " + e.message);
    }
  };

  // Session listener: restores session if doc exists
  useEffect(() => {
    if (!user) {
      setSession(null);
      setIsInstanceVerified(false);
      return;
    }
    const unsubSession = onSnapshot(
      doc(db, "user_sessions", user.uid),
      (snap) => {
        if (snap.exists()) {
          const sessionData = snap.data();
          if (sessionData && sessionData.matricola) {
            setSession(sessionData as any);
            setIsInstanceVerified(true);
            const role = sessionData.role;
            const matNormalized = (sessionData.matricola || "").replace(/\s+/g, "").toUpperCase();
            if (role === "admin" || role === "responsabile" || ["FC918", "DPG917", "BA906"].includes(matNormalized)) {
              setIsAdminMode(true);
            }
          }
        }
      },
      (err) => {
        console.warn("[App] Session listener warning:", err);
      }
    );
    return () => unsubSession();
  }, [user]);

  // 3. Admin Acoustic Alerts
  useEffect(() => {
    if (session?.matricola && guards.length > 0) {
      const found = guards.find(g => 
        (g.matricola || "").replace(/\s+/g, "").toUpperCase() === 
        (session.matricola || "").replace(/\s+/g, "").toUpperCase()
      );
      if (found) {
        if (found.matricola?.replace(/\s+/g, "").toUpperCase() === "TG930" && 
            (found.qualifications.length !== 1 || found.qualifications[0] !== "zoofila")) {
          // Silent DB update to fix TG930
          updateDoc(doc(db, "guards", found.id), {
            qualifications: ["zoofila"]
          }).catch(err => console.error("Error updating TG930 qualifications", err));
          // Update local state in-place as well
          setCurrentGuard({
            ...found,
            qualifications: ["zoofila"]
          });
        } else {
          setCurrentGuard(found);
        }
      }
    }
  }, [session, guards]);

  // Redirect guard to an allowed sector if they are currently on an unauthorized one
  useEffect(() => {
    if (currentGuard && !isAdmin && !isResponsabile) {
      const allowedSectors = SECTORS.filter(s => {
        const q = currentGuard.qualifications || [];
        return q.some((val) => (val || "").toLowerCase() === (s.id || "").toLowerCase());
      });
      if (allowedSectors.length > 0 && !allowedSectors.some(s => s.id === activeSector)) {
        setActiveSector(allowedSectors[0].id);
      }
    }
  }, [currentGuard, isAdmin, isResponsabile, activeSector]);

  const lastAlarmCount = useRef(0);
  const lastPendingCount = useRef(0);
  useEffect(() => {
    if (!user || (!isAdmin && !isResponsabile)) return;

    const activeAlarms = alerts.filter(a => a.status === "active");
    const pendingShifts = shifts.filter(s => s.status === "pending");

    if (activeAlarms.length > lastAlarmCount.current) {
      // New EMERGENCY SOS
      const alarmSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
      alarmSound.play().catch(e => console.log("Sound block", e));
    } else if (pendingShifts.length > lastPendingCount.current) {
      // New shift request
      const notifySound = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
      notifySound.play().catch(e => console.log("Sound block", e));
    }

    lastAlarmCount.current = activeAlarms.length;
    lastPendingCount.current = pendingShifts.length;
  }, [alerts, shifts, isAdmin, isResponsabile]);

  // Real-time tracking of missions status changes for dispatchers/admins
  useEffect(() => {
    if (!user || (!isAdmin && !isResponsabile && !isSuperPina)) return;

    if (missions.length === 0) {
      return;
    }

    const prevMap = prevMissionsStateRef.current;
    
    // Silently fill the mapping on first load to prevent flash of notifications
    if (Object.keys(prevMap).length === 0) {
      const initialMap: Record<string, 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rejected'> = {};
      missions.forEach((m) => {
        initialMap[m.id] = m.status;
      });
      prevMissionsStateRef.current = initialMap;
      return;
    }

    const newToasts: Array<{
      id: string;
      guardId: string;
      guardName: string;
      address: string;
      status: 'accepted' | 'completed' | 'cancelled' | 'rejected';
      rejectionReason?: string;
      timestamp: Date;
    }> = [];
    let playedSound = false;

    missions.forEach((m) => {
      const prevStatus = prevMap[m.id];
      if (prevStatus && prevStatus !== m.status) {
        let showToast = false;
        
        if (m.status === "accepted" && prevStatus === "pending") {
          showToast = true;
        } else if (m.status === "completed" && prevStatus === "accepted") {
          showToast = true;
        } else if ((m.status === "cancelled" || m.status === "rejected") && prevStatus === "pending") {
          showToast = true;
        }

        if (showToast) {
          newToasts.push({
            id: `${m.id}-${Date.now()}-${Math.random()}`,
            guardId: m.guardId || "",
            guardName: m.guardName || "Una guardia",
            address: m.address,
            status: m.status as 'accepted' | 'completed' | 'cancelled' | 'rejected',
            rejectionReason: m.rejectionReason,
            timestamp: new Date()
          });

          if (!playedSound) {
            if (m.status === "rejected" || m.status === "cancelled") {
              const alertSound = new Audio("https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3");
              alertSound.play().catch(e => console.log("Sound play skipped", e));
            } else {
              const confirmSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
              confirmSound.play().catch(e => console.log("Sound play skipped", e));
            }
            playedSound = true;
          }
        }
      }
    });

    if (newToasts.length > 0) {
      setMissionToasts((prev) => [...prev, ...newToasts]);
    }

    // Capture states for the next updates
    const nextMap: Record<string, 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rejected'> = {};
    missions.forEach((m) => {
      nextMap[m.id] = m.status;
    });
    prevMissionsStateRef.current = nextMap;
  }, [missions, user, isAdmin, isResponsabile, isSuperPina]);

  // Toast automatic dismiss lifecycle
  useEffect(() => {
    if (missionToasts.length === 0) return;

    const timer = setTimeout(() => {
      setMissionToasts((prev) => prev.slice(1));
    }, 10000);

    return () => clearTimeout(timer);
  }, [missionToasts]);

  // Statistics helpers
  const getGuardStats = (guardId: string) => {
    const guardShifts = shifts.filter(
      (s) =>
        s.guardId === guardId ||
        s.matricola === guards.find((g) => g.id === guardId)?.matricola,
    );
    const approved = guardShifts.filter((s) => s.status === "approved");
    const cancelled = guardShifts.filter((s) => s.status === "cancelled");

    // Habitus: Preferred days
    const daysCount: Record<string, number> = {};
    approved.forEach((s) => {
      const day = safeFormatDate(s.date, "EEEE");
      daysCount[day] = (daysCount[day] || 0) + 1;
    });

    const sortedDays = Object.entries(daysCount).sort((a, b) => b[1] - a[1]);

    return {
      total: guardShifts.length,
      approved: approved.length,
      cancelled: cancelled.length,
      cancelledList: cancelled.sort((a, b) => b.date.localeCompare(a.date)),
      preferredDay: sortedDays[0]?.[0] || "N.D.",
      hoursTotal: approved.reduce((acc, s) => {
        const start = parseInt((s.startTime || "00:00").split(":")[0], 10) || 0;
        const end = parseInt((s.endTime || "00:00").split(":")[0], 10) || 0;
        return acc + (end >= start ? end - start : 24 - start + end);
      }, 0),
    };
  };

  const handleStatsUnlock = () => {
    if (statsPassword === "Tenente1197") {
      setIsStatsUnlocked(true);
      setStatsError("");
    } else {
      setStatsError("Password non corretta. Verifica maiuscole e minuscole.");
    }
  };

  const handleRiservataUnlock = () => {
    if (riservataPassword === "Tenente1197") {
      setIsRiservataUnlocked(true);
      setRiservataError("");
      setIsRiservataAuthDialogOpen(false);
      setStatsPassword("Tenente1197");
      setIsStatsUnlocked(true);
      setActiveAdminTab("guards");
      setIsAdminPortalOpen(true);
    } else {
      setRiservataError("Password non corretta. Verifica maiuscole e minuscole.");
    }
  };

  const handleRicercaAvanzataUnlock = () => {
    const pass = ricercaAvanzataPassword.trim();
    if (pass === "Tenente1197" || pass === "1234" || pass === "Giosue2026@" || pass === "admin") {
      setRicercaAvanzataError("");
      setIsRicercaAvanzataAuthOpen(false);
      setRicercaAvanzataPassword("");
      setCentraleSubTab(ricercaAuthTarget);
      setActiveAdminTab("centrale_operativa");
      setIsAdminPortalOpen(true);
    } else {
      setRicercaAvanzataError("Password non corretta. Verifica maiuscole e minuscole.");
    }
  };

  const handleAnimaliaUnlock = () => {
    if (animaliaPassword === "Giosue2026@") {
      setIsAnimaliaUnlocked(true);
      setAnimaliaError("");
    } else {
      setAnimaliaError("Password non corretta. Verifica caratteri speciali.");
    }
  };

  const handleSaveCensus = async () => {
    if (!newCensusNome.trim()) {
      alert("Inserire il nome della colonia o la zona.");
      return;
    }
    setLoading(true);
    try {
      const uName = session?.name || currentGuard?.name || "Utente Autorizzato";
      const uMatricola = session?.matricola || currentGuard?.matricola || "N.A.";
      
      const collectionRef = collection(db, "animalia_census");
      await addDoc(collectionRef, {
        specie: newCensusSpecie,
        nomeColoniaZona: newCensusNome,
        localita: newCensusLocalita,
        conteggioConfermato: Number(newCensusCount),
        dettagliConteggio: newCensusDettagli,
        photo: newCensusPhoto || "",
        coords: newCensusCoords,
        operatoreMatricola: uMatricola,
        operatoreNome: uName,
        note: newCensusNotes,
        creatoAl: new Date().toISOString()
      });

      // Clear Form state
      setNewCensusNome("");
      setNewCensusLocalita("");
      setNewCensusCount(1);
      setNewCensusDettagli("");
      setNewCensusPhoto("");
      setNewCensusNotes("");
      setNewCensusCoords({});
      
      logAction(`Creato censimento animalia per ${newCensusSpecie}`, "create");
    } catch(e) {
      console.error("Save census failed:", e);
      handleFirestoreError(e, OperationType.CREATE, "animalia_census");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCensus = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo record di censimento?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "animalia_census", id));
      logAction("Eliminato censimento animalia", "delete");
    } catch(e) {
      console.error("Delete census failed:", e);
      handleFirestoreError(e, OperationType.DELETE, `animalia_census/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCensusLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewCensusCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Errore geolocalizzazione:", error);
          alert("Impossibile rilevare la posizione GPS. Assicurati che le autorizzazioni siano attive.");
        }
      );
    } else {
      alert("Geolocalizzazione non supportata da questo browser.");
    }
  };

  const handlePrint = (contentSelector: string = ".printable-content") => {
    logAction("Richiesta stampa documento", "system", { area: contentSelector });
    const printableElement = document.querySelector(contentSelector);
    if (!printableElement) {
      window.focus();
      window.print();
      return;
    }

    // 1. Crea contenitore temporaneo nel body principale per mantenere stili Tailwind attivi
    const printContainer = document.createElement("div");
    printContainer.className = "print-temp-container";
    printContainer.innerHTML = printableElement.innerHTML;
    document.body.appendChild(printContainer);

    // 2. Inietta regole media print ottimizzate per nascondere il resto del sito e formattare in A4
    const style = document.createElement("style");
    style.id = "print-temp-style";
    style.innerHTML = `
      @media print {
        body > *:not(.print-temp-container) {
          display: none !important;
        }
        body {
          background: white !important;
          color: black !important;
        }
        .print-temp-container {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          background: white !important;
          color: black !important;
          padding: 5mm 0mm !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        /* Garantisce contrasto ottimale per tutti i testi e converte gli sfondi in bianco */
        .print-temp-container * {
          color: black !important;
          background-color: transparent !important;
          background: transparent !important;
          border-color: #94a3b8 !important; /* border-slate-400 */
          box-shadow: none !important;
          text-shadow: none !important;
          opacity: 1 !important;
        }
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        .print\\:hidden, button, .DialogFooter, footer, nav {
          display: none !important;
        }
        /* Rendering nitido delle foto dei documenti o avatar inviati */
        img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 10px auto !important;
          page-break-inside: avoid !important;
        }
        .page-break {
          page-break-before: always !important;
        }
      }
    `;
    document.head.appendChild(style);

    // 3. Esegui la stampa
    window.focus();
    window.print();

    // 4. Ripristino del DOM originale dopo la chiusura del prompt di stampa del computer/telefono
    setTimeout(() => {
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
      const existingStyle = document.getElementById("print-temp-style");
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    }, 1500);
  };

  const playBeep = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const performLogin = async (matricola: string) => {
    if (!matricola.trim()) {
      setLoginError("Inserisci la tua matricola");
      return;
    }

    setLoading(true);
    setLoginError("");

    const matricolaNormalized = (matricola || "").replace(/\s+/g, "").toUpperCase();

    // 1. Cerca prima nella memoria locale (state) o nella cache salvata in localStorage
    const cachedGuards = loadCacheData<Guard>("guards") || [];
    const foundLocalGuard = 
      guards.find((g) => (g.matricola || "").replace(/\s+/g, "").toUpperCase() === matricolaNormalized) ||
      cachedGuards.find((g) => (g.matricola || "").replace(/\s+/g, "").toUpperCase() === matricolaNormalized);

    const isBootstrap = ["DPG917", "FC918", "BA906", "BA 906", "CEA913", "FF943"].includes(matricolaNormalized);

    let guardData: Guard | null = foundLocalGuard || null;
    let guardDocId = foundLocalGuard?.id || "";

    if (!guardData && isBootstrap) {
      const placeholderRole = (matricolaNormalized === "BA906" || matricolaNormalized === "BA 906" || matricolaNormalized === "CEA913") ? "responsabile" : "admin";
      const placeholderName = (matricolaNormalized === "DPG917") ? "Della Pina Giulio" : 
                              (matricolaNormalized === "FC918") ? "Fruendi Consuelo" : 
                              (matricolaNormalized === "BA906" || matricolaNormalized === "BA 906") ? "Baratta Andrea" :
                              matricolaNormalized;

      guardData = {
        id: "bootstrap_" + matricolaNormalized,
        name: placeholderName,
        surname: "",
        matricola: (matricolaNormalized === "BA906" || matricolaNormalized === "BA 906") ? "BA 906" : matricolaNormalized,
        role: placeholderRole,
        qualifications: []
      } as Guard;
      guardDocId = guardData.id;
    }

    // 2. Se non trovata in locale e non bootstrap, tenta ricerca online su Firestore
    if (!guardData) {
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const userCredential = await signInAnonymously(auth);
          currentUser = userCredential.user;
        }

        let q = query(
          collection(db, "guards"),
          where("matricola", "==", matricolaNormalized),
        );
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log("[App] Fallback: Ricerca tollerante su Firestore...");
          const allDocs = await getDocs(collection(db, "guards"));
          const matchedDoc = allDocs.docs.find(doc => {
            const dbMat = (doc.data().matricola || "").replace(/\s+/g, "").toUpperCase();
            return dbMat === matricolaNormalized;
          });
          if (matchedDoc) {
            guardDocId = matchedDoc.id;
            guardData = { id: matchedDoc.id, ...matchedDoc.data() } as Guard;
          }
        } else {
          const docSnap = querySnapshot.docs[0];
          guardDocId = docSnap.id;
          guardData = { id: docSnap.id, ...docSnap.data() } as Guard;
        }
      } catch (e) {
        console.warn("[App] Ricerca Firestore durante login non riuscita o offline:", e);
      }
    }

    // 3. Verifichiamo se abbiamo identificato la guardia
    if (!guardData) {
      setLoginError("Matricola non trovata. Verifica il codice e riprova.");
      setLoading(false);
      return;
    }

    // 4. Verifichiamo se l'utenza è disabilitata
    if (guardData.isDisabled) {
      setLoginError(`Accesso negato: questa utenza è stata disabilitata. ${guardData.banReason ? `Motivo: ${guardData.banReason}` : "Contatta la direzione per chiarimenti."}`);
      setLoading(false);
      return;
    }

    // 5. Stabilisce la sessione immediatamente in locale
    try {
      localStorage.setItem("last_matricola", matricolaNormalized);
    } catch (e) {
      console.warn("localStorage.setItem fallito:", e);
    }

    const sessionData = {
      matricola: guardData.matricola,
      role: guardData.role,
      name: guardData.name,
      lastLogin: new Date().toISOString(),
    };

    setSession(sessionData as any);
    setCurrentGuard(guardData);
    setIsInstanceVerified(true);
    if (guardData.role === "admin" || guardData.role === "responsabile" || ["FC918", "DPG917", "BA906", "CEA913", "FF943"].includes(matricolaNormalized)) {
      setIsAdminMode(true);
      setMacroMode("hq");
      setActiveAdminTab("shifts");
    } else {
      setIsAdminMode(false);
      setMacroMode("patrol");
      setActiveAdminTab("emergencies");
    }
    logAction("Accesso al sistema effettuato", "access", { matricola: matricolaNormalized });
    setMatricolaInput("");
    setLoginError("");
    setLoading(false);

    // 6. Sincronizzazione in background asincrona con Firestore per non bloccare l'esperienza utente
    (async () => {
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const userCredential = await signInAnonymously(auth);
          currentUser = userCredential.user;
        }
        if (currentUser) {
          const uid = currentUser.uid;
          await setDoc(doc(db, "user_sessions", uid), {
            ...sessionData,
            lastLogin: serverTimestamp(),
          });

          if (guardDocId && !guardDocId.startsWith("bootstrap_") && !guardDocId.startsWith("local_")) {
            await setDoc(
              doc(db, "guards", guardDocId),
              {
                uid: uid,
                lastLogin: serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
      } catch (error) {
        console.warn("[App] Sincronizzazione sessione in background non critica:", error);
      }
    })();
  };

  const handleLogin = () => performLogin(matricolaInput);

  const handleForceClearCache = () => {
    if (window.confirm("Sei sicuro di voler forzare l'aggiornamento dell'applicazione? Tutti i file temporanei e la memoria cache locale saranno eliminati per costringere il browser (Edge/Safari/Chrome) a scaricare la versione più recente.")) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if (navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
        }
      } catch (e) {
        console.warn("Errore pulitura cache:", e);
      }
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("last_matricola");
    } catch (e) {
      console.warn("localStorage.removeItem fallito:", e);
    }

    // Clear URL parameters to prevent auto-login
    if (typeof window !== "undefined" && window.history.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("m");
      url.searchParams.delete("print");
      url.searchParams.delete("stats");
      window.history.pushState({}, "", url.toString());
    }

    setIsInstanceVerified(false);
    logAction("Chiusura sessione utente", "access");
    setSession(null);
    setCurrentGuard(null);
    setShowSplash(false);

    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  const handleAddShift = async (forceApproval = false) => {
    if (!user) return;

    // Determine the date to use
    const targetDate =
      forceApproval && (newShift as any).date
        ? parseISO((newShift as any).date)
        : selectedDate;

    if (!targetDate) {
      alert("Seleziona una data per il turno.");
      return;
    }

    // Identify the guard being assigned
    const selectedGuard = guards.find((g) => g.id === newShift.guardId);
    const targetGuard = selectedGuard || currentGuard || (session?.matricola ? {
      id: "temp-" + session.matricola,
      name: session.name || "Utente Test",
      surname: "",
      matricola: session.matricola,
      qualifications: [],
      phone: ""
    } as any : null);

    if (!targetGuard) {
      alert("Impossibile identificare la guardia. Assicurati di essere loggato correttamente.");
      return;
    }

    // Qualification check for the TARGET guard using central sector rules
    const isQualified = isGuardQualifiedForSector(targetGuard, activeSector);
    let autoNote = "";

    // Enforce qualifications for the guard being assigned
    if (!isQualified) {
      alert(
        `La guardia ${targetGuard.surname ? `${targetGuard.surname} ${targetGuard.name}` : targetGuard.name} non possiede l'abilitazione per il settore ${activeSector.toUpperCase()}.\nIn base al regolamento operativo, non è possibile procedere.`
      );
      return;
    }

    const dateStr = format(targetDate, "yyyy-MM-dd");
    const guardName = targetGuard.surname ? `${targetGuard.surname} ${targetGuard.name}` : targetGuard.name;
    const guardId = targetGuard.id;

    const localShiftObj: Shift = {
      id: `local_shift_${Date.now()}`,
      guardId,
      matricola: targetGuard.matricola,
      guardName,
      sector: activeSector,
      date: dateStr,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      notes: autoNote + newShift.notes,
      createdBy: user?.uid || auth.currentUser?.uid || currentGuard?.id || "anonymous",
      createdAt: new Date() as any,
      status: forceApproval ? "approved" : "pending",
      approvedBy: forceApproval ? (currentGuard?.name || session?.name || "Admin") : null,
      approvedAt: forceApproval ? (new Date() as any) : null,
    };
    setShifts(prev => [...prev.filter(s => s.id !== localShiftObj.id), localShiftObj]);

    try {
      await addDoc(collection(db, "shifts"), {
        guardId,
        matricola: targetGuard.matricola,
        guardName,
        sector: activeSector,
        date: dateStr,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        notes: autoNote + newShift.notes,
        createdBy: user?.uid || auth.currentUser?.uid || currentGuard?.id || "anonymous",
        createdAt: serverTimestamp(),
        status: forceApproval ? "approved" : "pending",
        approvedBy: forceApproval
          ? currentGuard?.name || session?.name || "Admin"
          : null,
        approvedAt: forceApproval ? serverTimestamp() : null,
      });

      logAction("Inserimento nuovo turno", "create", { guard: guardName, sector: activeSector, date: dateStr, forced: forceApproval });

      // 📧 Notifica Email NUOVO TURNO
      if (!forceApproval) {
        console.log("[EMAIL] Avvio procedura...");
        
        // Protezione contro dati mancanti
        const safeGuards = Array.isArray(guards) ? guards : [];
        const safeTargetGuard = targetGuard || { matricola: 'N/A' };

        // Determiniamo i destinatari in base alle regole di governance richieste
        let targetEmails: string[] = [];
        const isVI = activeSector.toLowerCase() === "ittica" || activeSector.toLowerCase() === "venatoria";

        if (isVI) {
          // L'avviso per Venatoria/Ittica deve arrivare solamente a BA906 (Baratta Andrea) e Amministratori
          const barattaGuard = safeGuards.find(g => (g.matricola || "").replace(/\s+/g, "").toUpperCase() === "BA906");
          const barattaEmail = barattaGuard?.privateInfo?.email || barattaGuard?.email;

          const admins = safeGuards
            .filter(g => g.role === 'admin' || g.privateInfo?.email?.toLowerCase() === "giulianodellapina@gmail.com" || g.privateInfo?.email?.toLowerCase() === "nausica.cf@gmail.com")
            .map(g => g.privateInfo?.email || g.email)
            .filter(Boolean) as string[];

          targetEmails = [...admins];
          if (barattaEmail && !targetEmails.includes(barattaEmail)) {
            targetEmails.push(barattaEmail);
          }
        } else {
          // Standard: Amministratori
          targetEmails = safeGuards
            .filter(g => g.role === 'admin' || g.privateInfo?.email?.toLowerCase() === "giulianodellapina@gmail.com" || g.privateInfo?.email?.toLowerCase() === "nausica.cf@gmail.com")
            .map(g => g.privateInfo?.email || g.email)
            .filter(Boolean) as string[];
        }

        if (targetEmails.length === 0) {
          targetEmails.push("giulianodellapina@gmail.com");
        }

        // AVVISO IMMEDIATO rimosso come richiesto
        // alert("INVIANDO EMAIL A: " + targetEmails.join(", "));

        try {
          const emailRes = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              to: targetEmails.join(","),
              subject: `📅 Richiesta Turno: ${guardName}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #3b82f6; border-radius: 10px;">
                  <h2 style="color: #1d4ed8;">📅 Nuova Richiesta di Turno</h2>
                  <p><strong>Guardia:</strong> ${guardName} (${safeTargetGuard.matricola})</p>
                  <p><strong>Settore:</strong> ${activeSector.toUpperCase()}</p>
                  <p><strong>Data:</strong> ${dateStr}</p>
                  <p><strong>Orario:</strong> ${newShift.startTime} - ${newShift.endTime}</p>
                  <p><strong>Note:</strong> ${newShift.notes || 'Nessuna'}</p>
                  <hr />
                  <p>Accedi al portale per approvare o rifiutare la richiesta.</p>
                </div>
              `
            }),
          });

          let emailData;
          try {
            emailData = await emailRes.json();
          } catch (e) {
            throw new Error("Il server ha risposto in modo illeggibile.");
          }

          if (!emailRes.ok) {
            const errorMsg = emailData.hint || emailData.details || emailData.error || "Login fallito o timeout";
            throw new Error(errorMsg);
          }
          
          console.log("Email success:", emailData.messageId);
          alert("✅ EMAIL INVIATA CON SUCCESSO!\nDestinatari: " + targetEmails.join(", "));
        } catch (err: any) {
          console.error("Email failure:", err);
          alert("❌ EMAIL FALLITA: " + err.message + "\n\nIl turno è comunque salvato!");
        }
      }

      if (forceApproval) {
        alert("TURNO ASSEGNATO D'UFFICIO E APPROVATO!");
      } else {
        alert("Richiesta di turno inviata con successo! In attesa di approvazione.");
      }

      // Notify Telegram via backend
      try {
        fetch("/api/telegram/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            title: forceApproval ? "Turno Assegnato d'Ufficio" : "Nuova Richiesta Turno", 
            message: `👤 Guardia: ${guardName}\n📡 Settore: ${activeSector.toUpperCase()}\n📅 Data: ${dateStr}\n⏰ Orario: ${newShift.startTime} - ${newShift.endTime}`,
            type: "shift",
            onlySupervisors: !forceApproval
          }),
        }).catch((err) => console.error("Notification fetch error:", err));
      } catch (e) {
        console.error("Notification trigger error:", e);
      }

      playBeep();
      setIsAddDialogOpen(false);
      // Keep guardId and date for batch assignments as requested by user
      setNewShift((prev) => ({
        ...prev,
        notes: "",
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "shifts");
    }
  };

  const [isEmailTesting, setIsEmailTesting] = useState(false);
  const [testResultMessage, setTestResultMessage] = useState<{ text: string, type: 'success' | 'error' | 'pending' | null }>({ text: "", type: null });

  const handleTestEmail = async () => {
    setIsEmailTesting(true);
    setTestResultMessage({ text: "Invio in corso...", type: 'pending' });
    console.log("[DEBUG] Inizio test email...");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); 

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          to: "giulianodellapina@gmail.com",
          subject: "🧪 TEST CREDENZIALI APP GUARDIE",
          html: `<div style="padding:20px; border:2px solid #22c55e; border-radius:10px; font-family: sans-serif;">
                  <h2 style="color:#22c55e;">✅ CONNESSIONE RIUSCITA!</h2>
                  <p>Se leggi questo messaggio, la tua <b>App Password</b> di Google è configurata correttamente.</p>
                  <hr style="border:none; border-top:1px solid #eee; margin:20px 0;"/>
                  <p style="color:#666; font-size:12px;">Data invio: ${new Date().toLocaleString()}</p>
                 </div>`
        })
      });
      
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.hint || data.details || data.error || "Errore sconosciuto");
      
      setTestResultMessage({ 
        text: `INVIATA! Risposta: ${data.response}`, 
        type: 'success' 
      });
      // alert(`✅ EMAIL INVIATA CON SUCCESSO!`);
      console.log("✅ EMAIL INVIATA CON SUCCESSO!");
    } catch (err: any) {
      console.error("Test email failed:", err);
      let msg = err.message;
      if (err.name === 'AbortError') {
        msg = "Timeout di 25 secondi scaduto. Password errata o blocco Gmail.";
      }
      setTestResultMessage({ text: `ERRORE: ${msg}`, type: 'error' });
      // alert("❌ ERRORE: " + msg);
      console.error("❌ ERRORE:", msg);
    } finally {
      setIsEmailTesting(false);
    }
  };

  const handleApproveShift = async (e: React.MouseEvent, id: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log("APPROVE ATTEMPT:", id, {
      isAdmin,
      isResponsabile,
      uid: user?.uid,
      sessionRole: session?.role,
      guardRole: currentGuard?.role,
    });

    const targetShift = shifts.find(sh => sh.id === id);
    if (!targetShift) {
      alert("Turno non trovato.");
      return;
    }

    const canApprove = canUserApproveThisShift(targetShift);

    if (!canApprove) {
      alert(
        "Non hai i permessi per approvare questo settore o questo turno.",
      );
      return;
    }

    try {
      // Immediate feedback
      const originalText = (e.currentTarget as HTMLButtonElement).innerText;
      (e.currentTarget as HTMLButtonElement).innerText = "INVIO IN CORSO...";
      (e.currentTarget as HTMLButtonElement).disabled = true;

      const shiftRef = doc(db, "shifts", id);
      const baseApproverName =
        currentGuard?.name ||
        session?.name ||
        user?.displayName ||
        user?.email ||
        "Responsabile";

      let approverName = baseApproverName;
      const isVI = targetShift.sector === "ittica" || targetShift.sector === "venatoria";
      if (isVI) {
        if (isBarattaAndrea) {
          approverName = `${baseApproverName} (Resp. Settore Ittica e Venatoria)`;
        } else if (isAdmin) {
          approverName = `${baseApproverName} (Coordinamento Generale - Convalida Sostitutiva)`;
        }
      }

      await setDoc(
        shiftRef,
        {
          status: "approved",
          approvedBy: approverName,
          approvedAt: serverTimestamp(),
        },
        { merge: true },
      );

      logAction("Approvazione turno", "update", { shiftId: id });

      // 📧 Notifica Email APPROVAZIONE
      try {
        const targetShift = shifts.find(s => s.id === id);
        const guardOfShift = guards.find(g => g.id === targetShift?.guardId);
        const recipient = guardOfShift?.email || "giulianodellapina@gmail.com";
        
        console.log("[EMAIL] Notifica approvazione a:", recipient);
        // alert("📩 Invio notifica email di approvazione...");
        console.log("📩 Invio notifica email di approvazione...");
        
        const emailRes = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient,
            subject: `✅ Turno Approvato: ${targetShift?.date}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 10px;">
                <h2 style="color: #059669;">✅ Turno Confermato</h2>
                <p>Ciao ${targetShift?.guardName}, il tuo turno è stato approvato.</p>
                <p><strong>Data:</strong> ${targetShift?.date}</p>
                <p><strong>Orario:</strong> ${targetShift?.startTime} - ${targetShift?.endTime}</p>
                <hr/>
                <p>Approvato da: ${approverName}</p>
              </div>
            `
          }),
        });

        const emailData = await emailRes.json();
        if (emailRes.ok) {
          // alert(`✅ EMAIL INVIATA CON SUCCESSO!\n\nDestinatario: ${emailData.to}\nRisposta Server: ${emailData.response}`);
          console.log("✅ EMAIL INVIATA CON SUCCESSO!", emailData);
        } else {
          // alert("⚠️ EMAIL FALLITA: " + (emailData.hint || emailData.details || "Errore sconosciuto"));
          console.error("⚠️ EMAIL FALLITA:", emailData);
        }
      } catch (err: any) {
        console.error("Approval email notify failed:", err);
        alert("⚠️ TURNO APPROVATO, MA ERRORE INVIO EMAIL: " + err.message);
      }

      // Notifica Telegram Approvazione (Al Gruppo Responsabili per semplicità)
      try {
        const targetShift = shifts.find(s => s.id === id);
        if (targetShift) {
          fetch("/api/telegram/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              title: "Approvazione Turno ✅", 
              message: `Il turno di ${(targetShift as any).guardName || "un collega"} è stato approvato.\n📅 Data: ${targetShift.date}\n⏰ Orario: ${targetShift.startTime} - ${targetShift.endTime}\n✍️ Approvato da: ${approverName}`,
              type: "shift_approval",
              onlySupervisors: true // Invia al gruppo responsabili
            }),
          }).catch((err) => console.error("Telegram approval notify fetch error:", err));
        }
      } catch (e) {
        console.error("Telegram approval notify trigger error:", e);
      }

      playBeep();
      alert("TURNO APPROVATO CON SUCCESSO!");
      console.log("Shift approved successfully:", id);
      setIsDetailsOpen(false); // Close details after approval to refresh view
    } catch (error: any) {
      console.error("FIREBASE ERROR DURING APPROVAL:", error);
      alert(
        "ERRORE DI SISTEMA: " +
          (error.message ||
            "Permessi insufficienti. Prova a ricaricare la pagina."),
      );
    }
  };

  const bootstrapData = async () => {
    if (!isAdmin) return;
    const initialGuards = [
      {
        name: "Triscornia (Baratta) Andrea",
        matricola: "BA906",
        phone: "3281857610",
        email: "andrea61.baratta@gmail.com",
        role: "responsabile",
        qualifications: ["ittica", "venatoria", "zoofila"],
      },
      {
        name: "Baratta Chiara",
        matricola: "BC907",
        phone: "3292945287",
        email: "chiara.baratta87@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Barattini Fabio",
        matricola: "BF935",
        phone: "3356786550",
        email: "houseservice-barattini@virgilio.it",
        role: "guardia",
        qualifications: ["ittica", "zoofila"],
      },
      {
        name: "Bertini Katia",
        matricola: "BK937",
        phone: "3471254398",
        email: "katiabertini2@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Bertoloni Corrado",
        matricola: "BC909",
        phone: "3386731762",
        email: "bertolonicorrado@gmail.com",
        role: "guardia",
        qualifications: ["venatoria", "zoofila"],
      },
      {
        name: "Bogazzi Mauro",
        matricola: "BM931",
        phone: "347912825",
        email: "mauroboga@icloud.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Calamai Andrea",
        matricola: "CA936",
        phone: "3804109814",
        email: "calamaiman@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Cappe' Maria Donatella",
        matricola: "CMD914",
        phone: "3201743545",
        email: "donatellacappe@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Ceccarelli Andrea Emilio",
        matricola: "CEA913",
        phone: "3334276384",
        email: "Ceccarelli.a@hotmail.it",
        role: "responsabile",
        qualifications: ["ittica", "zoofila"],
      },
      {
        name: "Cecchinelli Serena",
        matricola: "CS915",
        phone: "3464053122",
        email: "serecec74@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Colonnata Arturo",
        matricola: "CA940",
        phone: "3488002554",
        email: "arturo.49@hotmail.it",
        role: "guardia",
        qualifications: ["ittica", "zoofila"],
      },
      {
        name: "Della Pina Giulio",
        matricola: "DPG917",
        phone: "3475122678",
        email: "giulianodellapina@gmail.com",
        role: "admin",
        qualifications: ["ittica", "zoofila"],
      },
      {
        name: "Finali Fabrizio",
        matricola: "FF943",
        phone: "3661807069",
        email: "fabrizio.finali@libero.it",
        role: "guardia",
        qualifications: ["venatoria", "zoofila"],
      },
      {
        name: "Fruendi Consuelo",
        matricola: "FC918",
        phone: "3290925789",
        email: "Nausica.cf@gmail.com",
        role: "admin",
        qualifications: ["zoofila"],
      },
      {
        name: "Giannaccini Marino",
        matricola: "GM945",
        phone: "3387629203",
        email: "",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Ginesi Claudio",
        matricola: "GC941",
        phone: "3388803038",
        email: "ginesiclaudio@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Labori Massimo",
        matricola: "LM921",
        phone: "3287565737",
        email: "massimolabori@virgilio.it",
        role: "guardia",
        qualifications: ["venatoria", "zoofila"],
      },
      {
        name: "Lopresto Romina",
        matricola: "LR919",
        phone: "3334625119",
        email: "loprestoromina517@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Maggiani Luciano",
        matricola: "ML921",
        phone: "3273643332",
        email: "maggianiluciano@gmail.com",
        role: "guardia",
        qualifications: ["ittica", "zoofila"],
      },
      {
        name: "Mannucci Virna",
        matricola: "MV922",
        phone: "3397747749",
        email: "mannuccivirna@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Marcesini Christian",
        matricola: "MCH940",
        phone: "3661335964",
        email: "christianmarcesini05@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Marcesini Massimo",
        matricola: "MM939",
        phone: "3388180056",
        email: "massimomarcesini@tim.it",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Marchini Manuele",
        matricola: "MM923",
        phone: "3491703553",
        email: "marchinimanuele@hotmail.it",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Masi Rosella",
        matricola: "MR932",
        phone: "3331751622",
        email: "rosellamasi.68@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Morelli Claudio",
        matricola: "MC924",
        phone: "3245877928",
        email: "morellicla.spencer@gmail.com",
        role: "guardia",
        qualifications: ["venatoria", "zoofila"],
      },
      {
        name: "Moscatelli Aldo",
        matricola: "MA942",
        phone: "3491943746",
        email: "aldomosvatelli@tim.it",
        role: "guardia",
        qualifications: ["venatoria", "zoofila"],
      },
      {
        name: "Narra Daniele",
        matricola: "ND934",
        phone: "3342042482",
        email: "daniele.narra@libero.it",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Narra Vasco",
        matricola: "NV911",
        phone: "3383705318",
        email: "vasco.narra@libero.it",
        role: "guardia",
        qualifications: ["ittica", "zoofila"],
      },
      {
        name: "Pietrini Ermenegildo",
        matricola: "PE944",
        phone: "3332751609",
        email: "",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Tosi Giulia",
        matricola: "TG929",
        phone: "3338916440",
        email: "tosigiulia8@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Triscornia Alex",
        matricola: "TA928",
        phone: "3923891700",
        email: "triscornia76@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
      {
        name: "Triscornia Giuliano",
        matricola: "TG930",
        phone: "3319753655",
        email: "triscornia76@gmail.com",
        role: "guardia",
        qualifications: ["zoofila"],
      },
    ];

    try {
      for (const g of initialGuards) {
        // Check if already exists by matricola
        const exists = guards.find(
          (existing) => existing.matricola === g.matricola,
        );
        if (!exists) {
          await addDoc(collection(db, "guards"), {
            ...g,
            createdAt: serverTimestamp(),
          });
        } else if (exists.role !== g.role) {
          await updateDoc(doc(db, "guards", exists.id), {
            role: g.role,
          });
        }
      }
      alert("Sincronizzazione completata (v4.4.0)");
    } catch (error) {
      console.error("Bootstrap error", error);
      alert("Errore durante il caricamento");
    }
  };

  const handleSosStart = () => {
    if (!user) return;
    setIsSosActive(true);
    setSosStage('holding');
    setSosProgress(0);

    let progress = 0;
    sosTimerRef.current = setInterval(() => {
      progress += 2;
      setSosProgress(progress);
      if (progress >= 100) {
        if (sosTimerRef.current) clearInterval(sosTimerRef.current);
        triggerSos();
      }
    }, 60); 
  };

  const handleSosEnd = () => {
    if (sosStage === 'holding') {
      if (sosTimerRef.current) clearInterval(sosTimerRef.current);
      setIsSosActive(false);
      setSosStage('none');
      setSosProgress(0);
    }
  };

  const triggerSos = async () => {
    if (!user && !currentGuard && !session) return;
    setSosStage('pre-alarm');
    setIsSosActive(true);

    let location = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (err) => {
          console.warn("SOS High accuracy location failed, retrying with low accuracy...", err);
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          });
        }, {
          timeout: 7000,
          enableHighAccuracy: true,
          maximumAge: 0
        });
      });
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      console.warn("SOS Geolocation totally failed", e);
    }

    try {
      const gName = currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || user?.displayName || "Utente Ignoto");
      const docRef = await addDoc(collection(db, "alerts"), {
        guardId: currentGuard?.id || user?.uid || auth.currentUser?.uid || "anonymous",
        guardName: gName,
        matricola: currentGuard?.matricola || session?.matricola || "",
        location,
        timestamp: serverTimestamp(),
        status: "active",
        isGlobal: false,
        contactAttempts: 0,
        contactNotes: [],
        signatures: [],
        auditTrail: [{
          msTimestamp: Date.now(),
          timestamp: new Date().toISOString(),
          operatorId: currentGuard?.id || user?.uid || auth.currentUser?.uid || "anonymous",
          operatorName: gName,
          eventType: "SOS_ACTIVATED",
          description: `SOS attivato alle ${new Date().toLocaleTimeString('it-IT')}. Posizione GPS: ${location ? `lat: ${location.lat}, lng: ${location.lng}` : "non disponibile"}`
        }],
      });
      logAction("EMERGENZA SOS LANCIATA", "create", { location: location ? "GPS Active" : "No GPS" });

      setActiveSosId(docRef.id);

      // Notifica Telegram SOS (Inizialmente solo ai Responsabili)
      try {
        await fetch("/api/telegram/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            guardName: currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || user.displayName),
            matricola: currentGuard?.matricola || session?.matricola || "N/A",
            location,
            sector: activeSector,
            isEmergency: true,
            urgency: 'HIGH',
            title: "🆘 SOS EMERGENZA - SOLO PER RESPONSABILI 🆘",
            onlySupervisors: true
          }),
        });
      } catch (err) {
        console.error("SOS Telegram notification failed:", err);
      }

      // Suono di alert se possibile
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
      audio.play().catch((e) => console.log("Audio play blocked", e));

      setSosStage('pre-alarm'); // Passiamo alla fase delle chiamate
      setSosProgress(0);
    } catch (error: any) {
      console.error("SOS failed", error);
      alert("Errore invio SOS (Database): " + error.message);
      setIsSosActive(false);
      setSosStage('none');
    }
  };

  const handleUpdateAlertContact = async (alertId: string, note?: string) => {
    const alertRef = doc(db, "alerts", alertId);
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (!targetAlert) return;

    const newAttempts = (targetAlert.contactAttempts || 0) + 1;
    const finalNote = note || `Tentativo di contatto #${newAttempts} alle ${new Date().toLocaleTimeString('it-IT')}`;
    const newNotes = [
      ...(targetAlert.contactNotes || []),
      finalNote,
    ];

    const operatorId = currentGuard?.id || user?.uid || "anon-operator";
    const operatorName = currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || user?.displayName || "Centrale Operativa");

    const auditEvent = {
      msTimestamp: Date.now(),
      timestamp: new Date().toISOString(),
      operatorId,
      operatorName,
      eventType: "CONTACT_ATTEMPT",
      description: finalNote,
    };

    await setDoc(
      alertRef,
      {
        contactAttempts: newAttempts,
        contactNotes: newNotes,
        auditTrail: arrayUnion(auditEvent),
      },
      { merge: true },
    );
  };

  const handleActivateGlobalSOS = async (alertId: string) => {
    const alertRef = doc(db, "alerts", alertId);
    const operatorId = currentGuard?.id || user?.uid || "anon-operator";
    const operatorName = currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || user?.displayName || "Centrale Operativa");

    const auditEvent = {
      msTimestamp: Date.now(),
      timestamp: new Date().toISOString(),
      operatorId,
      operatorName,
      eventType: "GLOBAL_SOS_ACTIVATED",
      description: "Allerta globale SOS attivata a tutte le guardie operative."
    };

    await setDoc(
      alertRef,
      {
        isGlobal: true,
        activatedAt: serverTimestamp(),
        auditTrail: arrayUnion(auditEvent),
      },
      { merge: true },
    );
  };

  const upgradeToGlobalSos = async () => {
    if (!activeSosId) return;
    try {
      const gName = currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || user?.displayName || "Guardia");
      const auditEvent = {
        msTimestamp: Date.now(),
        timestamp: new Date().toISOString(),
        operatorId: currentGuard?.id || user?.uid || "guardia",
        operatorName: gName,
        eventType: "GLOBAL_SOS_ACTIVATED",
        description: "Allarme globale SOS attivato direttamente dall'operatore in pericolo."
      };

      await updateDoc(doc(db, "alerts", activeSosId), {
        isGlobal: true,
        upgradedAt: serverTimestamp(),
        auditTrail: arrayUnion(auditEvent)
      });

      // Notifica Telegram SOS GLOBALE
      await fetch("/api/telegram/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          guardName: currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || user.displayName),
          matricola: currentGuard?.matricola || session?.matricola || "N/A",
          location: currentGuard?.lastLocation || null,
          sector: activeSector,
          isEmergency: true,
          urgency: 'CRITICAL',
          title: "🚨 SOS EMERGENZA GLOBALE - INTERVENTO IMMEDIATO 🚨",
          onlySupervisors: false
        }),
      });

      setSosStage('broadcast');
      alert("⚠️ Allarme Generale Inviato!");
    } catch (err) {
      console.error("Upgrade SOS failed:", err);
    }
  };

  const cancelSos = async () => {
    if (activeSosId) {
      const gName = currentGuard?.surname ? `${currentGuard.surname} ${currentGuard.name}` : (currentGuard?.name || "Guardia");
      const auditEvent = {
        msTimestamp: Date.now(),
        timestamp: new Date().toISOString(),
        operatorId: currentGuard?.id || user?.uid || "guardia",
        operatorName: gName,
        eventType: "SOS_RESOLVED",
        description: "SOS annullato direttamente dall'operatore sul campo."
      };

      await updateDoc(doc(db, "alerts", activeSosId), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        auditTrail: arrayUnion(auditEvent)
      });
    }
    setIsSosActive(false);
    setSosStage('none');
    setSosProgress(0);
    setActiveSosId(null);
  };

  const handleResolveSOS = async (alertId: string) => {
    const alertRef = doc(db, "alerts", alertId);
    const resolverName = currentGuard ? `${currentGuard.surname} ${currentGuard.name}` : (session?.name || "Responsabile");
    const operatorId = currentGuard?.id || user?.uid || "anon-operator";

    const auditEvent = {
      msTimestamp: Date.now(),
      timestamp: new Date().toISOString(),
      operatorId,
      operatorName: resolverName,
      eventType: "SOS_RESOLVED",
      description: `SOS risolto e archiviato con successo da ${resolverName}.`
    };

    await setDoc(
      alertRef,
      {
        status: "resolved",
        resolvedBy: resolverName,
        resolvedAt: serverTimestamp(),
        auditTrail: arrayUnion(auditEvent),
      },
      { merge: true },
    );
    if (activeSosId === alertId) {
      setActiveSosId(null);
    }
  };

  const handleSignSos = async (alertId: string) => {
    const targetAlert = alerts.find(a => a.id === alertId);
    if (!targetAlert) return;
    
    // Admin or Responsabile check
    const isResponsabileOrAdmin = isAdmin || isResponsabile;
    if (!isResponsabileOrAdmin) {
      alert("Solo un Responsabile o un Amministratore della centrale può convalidare ed apporre la firma digitale.");
      return;
    }

    const operatorId = currentGuard?.id || user?.uid;
    if (!operatorId) {
      alert("Operatore non autenticato.");
      return;
    }

    const currentSignatures = targetAlert.signatures || [];
    if (currentSignatures.some(s => s.operatorId === operatorId)) {
      alert("Hai già apposto la tua firma digitale su questo verbale SOS.");
      return;
    }

    const operatorName = currentGuard?.surname 
      ? `${currentGuard.surname} ${currentGuard.name}` 
      : (session?.name || "Responsabile Ekoclub");

    const newSignature = {
      operatorId,
      operatorName,
      signedAt: new Date().toISOString(),
      msTimestamp: Date.now(),
    };

    const auditEvent = {
      msTimestamp: Date.now(),
      timestamp: new Date().toISOString(),
      operatorId,
      operatorName,
      eventType: "DIGITAL_SIGNATURE",
      description: `Apposta firma digitale conforme da parte di ${operatorName}.`
    };

    const alertRef = doc(db, "alerts", alertId);
    try {
      await setDoc(
        alertRef,
        {
          signatures: arrayUnion(newSignature),
          auditTrail: arrayUnion(auditEvent),
        },
        { merge: true }
      );
      alert("✅ Convalida e Firma Digitale registrate e sigillate con timestamp millisecondo.");
    } catch (err: any) {
      console.error(err);
      alert("Errore inserimento firma: " + err.message);
    }
  };

  const handleSaveMyProfile = async () => {
    if (!currentGuard) return;
    try {
      const guardRef = doc(db, "guards", currentGuard.id);
      await updateDoc(guardRef, {
        phone: myProfileData.phone,
        telegramChatId: myProfileData.telegramChatId,
        updatedAt: serverTimestamp()
      });
      
      logAction("Salvataggio modifiche profilo", "update", { phone: myProfileData.phone });

      // Update privateInfo too if available
      try {
        const privateRef = doc(db, "guards", currentGuard.id, "private", "data");
        await updateDoc(privateRef, {
          telegramChatId: myProfileData.telegramChatId
        });
      } catch (e) {
        // If no private subcollection yet, just ignore or create it
      }

      setIsMyProfileOpen(false);
    } catch (err: any) {
      console.error("Save profile error:", err);
      window.alert("Errore salvataggio: " + err.message);
    }
  };

  const handleJoinVideoCall = (targetAlert: Alert) => {
    // Messaggio predefinito per SOS su Telegram
    const sosMessage = `🆘 *SOS BERTOLUCCI - EMERGENZA*\n\nRichiesta connessione per SOS ID: ${targetAlert.id}\nMatricola: ${targetAlert.matricola || 'N/A'}\n\n_Richiesta videochiamata immediata. Clicca sull'icona video della chat._`;
    
    const guard = guards.find(g => g.id === targetAlert.guardId || g.matricola === targetAlert.matricola);
    const privateInfo = targetAlert.guardId ? guardPrivateInfoMap[targetAlert.guardId] : null;
    const targetPhone = privateInfo?.cellulare || privateInfo?.phone || guard?.phone;
    const tgUsername = privateInfo?.telegramChatId || (guard as any)?.privateInfo?.telegramChatId || guard?.telegramChatId;

    if (targetPhone || tgUsername) {
      openTelegram(targetPhone || "", tgUsername, sosMessage);
    } else {
      window.alert("Dati contatto della guardia non disponibili per avviare la chat diretta di Telegram.");
    }
  };

  const resolveAlert = async (id: string) => {
    if (!isAdmin && !isResponsabile) return;
    try {
      await setDoc(
        doc(db, "alerts", id),
        {
          status: "resolved",
          resolvedBy: user?.displayName || "Admin",
        },
        { merge: true },
      );
      logAction("Risoluzione Allarme SOS", "update", { alertId: id });
    } catch (error) {
      console.error("Error resolving alert", error);
    }
  };

  const handleCancelShift = async (id: string) => {
    setCancellationTargetId(id);
    setCancellationReason("Malattia");
    setCustomCancellationReason("");
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancellationRequest = async (id: string) => {
    const targetShift = shifts.find(sh => sh.id === id);
    if (!targetShift) return;

    if (!canUserApproveThisShift(targetShift)) {
      alert("Non hai i permessi per approvare l'annullamento di questo turno.");
      return;
    }

    try {
      console.log("APPROVING CANCELLATION REQUEST:", id);
      const shiftRef = doc(db, "shifts", id);
      await setDoc(
        shiftRef,
        {
          status: "cancelled",
          archivedAt: serverTimestamp(),
          archivedBy: session?.name || "Responsabile",
        },
        { merge: true },
      );

      logAction("Annullamento Turno", "update", { shiftId: id, action: "approval" });
      playBeep();
      alert("Richiesta archiviata con successo. Il turno è ora annullato.");
      setIsDetailsOpen(false);
    } catch (error: any) {
      console.error("Error archiving cancellation:", error);
      alert("Errore durante l'archiviazione.");
    }
  };

  const handleExecuteCancellation = async () => {
    if (!cancellationTargetId) return;

    const finalReason =
      cancellationReason === "Altra motivazione (specifica sotto)"
        ? customCancellationReason
        : cancellationReason;
    if (
      cancellationReason === "Altra motivazione (specifica sotto)" &&
      !customCancellationReason.trim()
    ) {
      alert("Per favore specifica la motivazione.");
      return;
    }

    try {
      const shiftRef = doc(db, "shifts", cancellationTargetId);
      const targetShift = shifts.find(sh => sh.id === cancellationTargetId);
      // Approvatore cancels directly for sectors they can approve, other guards/responsabili request it
      const status =
        (targetShift && canUserApproveThisShift(targetShift)) ? "cancelled" : "cancellation_request";

      await setDoc(
        shiftRef,
        {
          status,
          cancelledAt: serverTimestamp(),
          cancelledBy: session?.name || currentGuard?.name || "Utente",
          cancellationReason: finalReason,
        },
        { merge: true },
      );

      playBeep();
      alert(
        isAdmin || isResponsabile
          ? "Turno archiviato/annullato."
          : "Segnalazione di impossibilità inviata al responsabile.",
      );
      setIsCancelDialogOpen(false);
      setIsDetailsOpen(false);
    } catch (error: any) {
      console.error("Cancellation execution error:", error);
      alert("Errore durante la segnalazione: " + error.message);
    }
  };

  const handleDeleteShift = async (e: any, id: string) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    if (!id) {
      window.alert("ERRORE: ID turno nullo.");
      return;
    }

    setDeleteConfirmation({ id, name: "il turno selezionato", type: 'shift' });
  };

  const executeDeleteShift = async (id: string) => {
    try {
      console.log("[DELETE_SHIFT] Executing deleteDoc...");
      // Aggiornamento immediato dello stato locale
      setShifts((prev) => prev.filter((s) => s.id !== id));

      if (!id.startsWith("local_")) {
        await deleteDoc(doc(db, "shifts", id));
      }
      logAction("Eliminazione Turno", "delete", { shiftId: id });
      console.log("[DELETE_SHIFT] Success");
      if (typeof playBeep === 'function') playBeep();
      window.alert("ELIMINATO: Il turno è stato rimosso con successo.");
      setDeleteConfirmation(null);
      if (typeof setIsDetailsOpen === 'function') setIsDetailsOpen(false);
    } catch (error: any) {
      console.error("[DELETE_SHIFT] Firestore Error:", error);
      window.alert("ERRORE: " + (error.message || "Accesso negato."));
    }
  };

  const handleAddGuard = async () => {
    const authorMatricola = currentGuard?.matricola || session?.matricola || "Sconosciuto";
    if (!isAdmin) {
      alert("Operazione non autorizzata.");
      sendSecurityAlert('anagrafica', 'create', 'guards', authorMatricola, "TENTATIVO NON AUTORIZZATO di creazione nuova guardia");
      return;
    }
    if (!newGuard.name || !newGuard.matricola) {
      alert("Inserisci nome e matricola della guardia.");
      return;
    }

    try {
      const addedDoc = await addDoc(collection(db, "guards"), {
        name: newGuard.name.trim(),
        surname: newGuard.surname.trim(),
        phone: newGuard.phone.trim(),
        matricola: newGuard.matricola.trim(),
        rank: newGuard.rank.trim() || "Guardia Giurata",
        role: newGuard.role,
        qualifications: newGuard.qualifications,
        section: newGuard.section || "",
        isDisabled: false,
        isNotActive: false,
        createdAt: serverTimestamp(),
      });
      sendSecurityAlert('anagrafica', 'create', addedDoc.id, authorMatricola, `Creata nuova guardia ${newGuard.surname.trim()} ${newGuard.name.trim()} (Matricola: ${newGuard.matricola.trim()})`);
      logAction("Creazione Nuova Guardia", "create", { matricola: newGuard.matricola, name: newGuard.name + " " + newGuard.surname });
      setNewGuard({
        name: "",
        surname: "",
        email: "",
        phone: "",
        matricola: "",
        rank: "",
        role: "guardia",
        qualifications: [],
        section: "",
      });
      alert("Guardia aggiunta con successo!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "guards");
    }
  };

  const handleUpdateGuard = async () => {
    const authorMatricola = currentGuard?.matricola || session?.matricola || "Sconosciuto";
    if (!isAdmin && !isResponsabile) {
      sendSecurityAlert('anagrafica', 'update', editingGuard?.id || 'unknown', authorMatricola, "TENTATIVO NON AUTORIZZATO di aggiornamento anagrafica guardia");
      return;
    }
    if (!editingGuard) return;
    try {
      await setDoc(
        doc(db, "guards", editingGuard.id),
        {
          name: editingGuard.name || "",
          surname: editingGuard.surname || "",
          email: editingGuard.email?.toLowerCase().trim() || "",
          phone: editingGuard.phone?.trim() || "",
          matricola: editingGuard.matricola?.trim() || "",
          rank: editingGuard.rank?.trim() || "Guardia Giurata",
          role: editingGuard.role || "guardia",
          qualifications: editingGuard.qualifications || [],
          isDisabled: typeof editingGuard.isDisabled === 'boolean' ? editingGuard.isDisabled : false,
          isNotActive: typeof editingGuard.isNotActive === 'boolean' ? editingGuard.isNotActive : false,
          banReason: editingGuard.banReason || "",
          section: editingGuard.section || "",
        },
        { merge: true },
      );
      sendSecurityAlert('anagrafica', 'update', editingGuard.id, authorMatricola, `Anagrafica di ${editingGuard.surname} ${editingGuard.name} (Matricola: ${editingGuard.matricola}) modificata con successo`);
      logAction("Aggiornamento Anagrafica Guardia", "update", { matricola: editingGuard.matricola });
      setIsEditGuardDialogOpen(false);
      setEditingGuard(null);
      alert("Dati aggiornati con successo!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "guards/" + editingGuard.id);
    }
  };

  const toggleGuardStatus = async (guard: Guard) => {
    if (!isAdmin && !isResponsabile) return;
    const newStatus = !guard.isDisabled;
    const action = newStatus ? "disabilitare" : "riabilitare";
    
    let reason = "";
    if (newStatus) {
      reason = prompt("Motivo della disabilitazione (opzionale):") || "";
    }

    if (!confirm(`Sei sicuro di voler ${action} l'accesso per ${guard.surname} ${guard.name}?`)) return;

    try {
      await updateDoc(doc(db, "guards", guard.id), {
        isDisabled: newStatus,
        banReason: reason
      });
      logAction("Cambio Stato Guardia", "update", { matricola: guard.matricola, isDisabled: newStatus, reason });
      alert(`Guardia ${newStatus ? 'disabilitata' : 'riabilitata'} con successo.`);
    } catch (error) {
      console.error("Error toggling guard status", error);
      alert("Errore durante l'operazione.");
    }
  };

  const fetchGuardPrivateInfo = async (guardId: string) => {
    try {
      const infoRef = doc(db, "guards", guardId, "private", "data");
      // Use getDocs because getDoc is not imported currently? 
      // Actually getDoc is better. Let's check imports.
      // It's not imported. I'll add it.
    } catch (e) {
      console.error("Fetch private info error", e);
    }
  };

  const handleToggleGuardStatus = async (guard: Guard) => {
    if (!isAdmin && !isResponsabile) {
      alert("Non hai i permessi per disabilitare le guardie.");
      return;
    }
    try {
      const newStatus = !guard.isDisabled;
      await updateDoc(doc(db, "guards", guard.id), { isDisabled: newStatus });
      logAction("Cambio Stato Guardia", "update", { matricola: guard.matricola, isDisabled: newStatus });
      setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isDisabled: newStatus } : g));
      alert(`Guardia ${newStatus ? 'disabilitata' : 'riabilitata'} con successo.`);
    } catch (error) {
      console.error("Error toggling guard status:", error);
      alert("Errore durante l'aggiornamento dello stato.");
    }
  };

  const handleDeleteGuard = async (id: string, name: string) => {
    // LOUD DEBUGGING
    console.log("%c[DELETE_GUARD_ACTION]", "color: red; font-size: 20px; font-weight: bold", id, name);
    
    if (!isAdmin && !isResponsabile) {
      window.alert("ERRORE: Solo gli amministratori possono eliminare guardie.");
      return;
    }

    if (!id) {
      window.alert("ERRORE: ID guardia mancante.");
      return;
    }

    setDeleteConfirmation({ id, name, type: 'guard' });
  };

  const executeDeleteGuard = async (id: string, name: string) => {
    const authorMatricola = currentGuard?.matricola || session?.matricola || "Sconosciuto";
    try {
      console.log("[DELETE_GUARD] Cleaning sub-collections...");
      const privatePaths = ["data", "info", "vestry"];
      for (const p of privatePaths) {
         try {
           await deleteDoc(doc(db, "guards", id, "private", p));
         } catch (e) {
           console.warn("[DELETE_GUARD] Skip private path", p);
         }
      }
      
      console.log("[DELETE_GUARD] Executing final deleteDoc...");
      await deleteDoc(doc(db, "guards", id));
      sendSecurityAlert('anagrafica', 'delete', id, authorMatricola, `Guardia ${name} eliminata permanentemente dal sistema`);
      logAction("Eliminazione Guardia", "delete", { guardId: id, name });
      
      console.log("[DELETE_GUARD] Success");
      setGuards(prev => prev.filter(g => g.id !== id));
      window.alert("SUCCESSO: Guardia rimossa.");
      setDeleteConfirmation(null);
      
      if (selectedGuardForSheet?.id === id) {
        setIsGuardSheetOpen(false);
      }
    } catch (error) {
      console.error("Error deleting guard:", error);
      window.alert("Errore durante l'eliminazione.");
    }
  };

  const handleOpenGuardSheet = async (guard: Guard, viewOnly: boolean = false) => {
    if (!guard) return;
    
    // Prova a splittare il nome se il cognome è vuoto (per gestire dati legacy)
    let initialName = guard.name || "";
    let initialSurname = guard.surname || "";
    
    if (initialName && !initialSurname) {
      const parts = initialName.trim().split(/\s+/);
      if (parts.length >= 2) {
        initialSurname = parts.pop() || "";
        initialName = parts.join(" ");
      }
    }

    setSelectedGuardForSheet(guard);
    setIsGuardSheetOpen(true);
    setIsGuardSheetViewOnly(viewOnly);
    setShowBadgeBack(false);
    setActiveGuardSheetSection('anagrafica');
    
    // Inizializza con i dati pubblici attuali
    const initialInfo = {
      name: initialName,
      surname: initialSurname,
      photo: guard.photo || "",
      grado: guard.rank || "",
      phone: guard.phone || "",
      ...(guardPrivateInfoMap[guard.id] || {})
    };
    
    setEditingPrivateInfo(initialInfo);
    
    // Carica dati privati asincronamente
    try {
      const docRef = doc(db, "guards", guard.id, "private", "data");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as GuardPrivateInfo;
        setEditingPrivateInfo(prev => ({
          ...prev,
          ...data,
          name: data.name || prev.name,
          surname: data.surname || prev.surname,
          photo: data.photo || prev.photo
        }));
        setGuardPrivateInfoMap(prev => ({ ...prev, [guard.id]: data }));
      }
    } catch (e) {
      console.error("Error loading private info", e);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'idCardFront' | 'idCardBack' = 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Il file è troppo grande. Massimo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64String = canvas.toDataURL('image/jpeg', 0.7);
        setEditingPrivateInfo(prev => ({ ...prev, [type]: base64String }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleDirectTesserinoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'idCardFront' | 'idCardBack') => {
    const file = e.target.files?.[0];
    if (!file || !selectedGuardForSheet) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Il file è troppo grande. Massimo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64String = canvas.toDataURL('image/jpeg', 0.7);

        const updatedInfo = { ...editingPrivateInfo, [type]: base64String };
        setEditingPrivateInfo(updatedInfo);

        // Salvataggio immediato nel database Firestore
        try {
          const privateDocRef = doc(db, "guards", selectedGuardForSheet.id, "private", "data");
          await setDoc(privateDocRef, updatedInfo, { merge: true });
          setGuardPrivateInfoMap(prev => ({ ...prev, [selectedGuardForSheet.id]: updatedInfo }));
        } catch (err) {
          console.error("Errore salvataggio foto tesserino:", err);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTesserinoImage = async (type: 'idCardFront' | 'idCardBack') => {
    if (!selectedGuardForSheet) return;
    if (!window.confirm("Rimuovere questa foto del tesserino?")) return;

    const updatedInfo = { ...editingPrivateInfo };
    delete updatedInfo[type];
    setEditingPrivateInfo(updatedInfo);

    try {
      const privateDocRef = doc(db, "guards", selectedGuardForSheet.id, "private", "data");
      await setDoc(privateDocRef, updatedInfo, { merge: true });
      setGuardPrivateInfoMap(prev => ({ ...prev, [selectedGuardForSheet.id]: updatedInfo }));
    } catch (err) {
      console.error("Errore rimozione foto tesserino:", err);
    }
  };

  const openTelegram = (phoneNumber?: string, username?: string, message: string = "") => {
    const encodedMsg = encodeURIComponent(message);
    const cleanUsername = username ? username.trim().replace("@", "") : "";
    const isNumericChatId = cleanUsername && /^\d+$/.test(cleanUsername);

    // If we have a valid non-numeric username, open directly via username
    if (cleanUsername && !isNumericChatId) {
      const url = `https://t.me/${cleanUsername}${message ? `?text=${encodedMsg}` : ''}`;
      window.open(url, '_blank');
      return;
    }

    // Otherwise, use the standard phone number format without a + sign (e.g., https://t.me/393290925789)
    if (!phoneNumber) {
      alert("Contatto Telegram non disponibile (manca il numero di cellulare per rintracciarlo)");
      return;
    }

    const cleaned = phoneNumber.replace(/\D/g, "");
    if (!cleaned) {
      alert("Numero di telefono non valido per Telegram");
      return;
    }

    // Standardize Italian mobile numbers for Telegram t.me format (no plus sign/symbols: country_code + number)
    let targetPhone = "";
    if (cleaned.startsWith("39") && cleaned.length > 10) {
      targetPhone = cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith("3")) {
      targetPhone = "39" + cleaned;
    } else {
      targetPhone = cleaned;
    }

    const url = `https://t.me/${targetPhone}${message ? `?text=${encodedMsg}` : ''}`;
    window.open(url, '_blank');
  };

  const openWhatsApp = (phoneNumber?: string, message: string = "") => {
    if (!phoneNumber) {
      window.alert("Contatto WhatsApp non disponibile (manca il numero di cellulare)");
      return;
    }
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (!cleaned) {
      window.alert("Numero di telefono non valido per WhatsApp");
      return;
    }

    let targetPhone = "";
    if (cleaned.startsWith("39") && cleaned.length > 10) {
      targetPhone = cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith("3")) {
      targetPhone = "39" + cleaned;
    } else {
      if (cleaned.length === 10) {
        targetPhone = "39" + cleaned;
      } else {
        targetPhone = cleaned;
      }
    }

    const encodedMsg = encodeURIComponent(message);
    const webUrl = `https://wa.me/${targetPhone}${message ? `?text=${encodedMsg}` : ''}`;

    // Usiamo wa.me con window.open, che è universale, supporta correttamente gli iframe delle app sandbox
    // e apre istantaneamente la chat diretta ufficiale con il numero e il testo precompilato.
    window.open(webUrl, '_blank');
  };

  const getIsSelf = (guardId?: string, matricola?: string) => {
    if (!guardId && !matricola) return false;
    
    const currentMatricola = (currentGuard?.matricola || session?.matricola || "").replace(/\s+/g, "").toUpperCase();
    const currentUserId = auth.currentUser?.uid;
    
    if (guardId && currentUserId && guardId === currentUserId) return true;
    if (guardId && currentGuard?.id && guardId === currentGuard.id) return true;
    
    if (matricola && currentMatricola) {
      const normMat = matricola.replace(/\s+/g, "").toUpperCase();
      if (normMat === currentMatricola) return true;
    }
    
    return false;
  };

  const handleOpenWhatsAppAndLog = async (phoneNumber?: string, message: string = "", guardId?: string, alertId?: string) => {
    if (!phoneNumber) {
      window.alert("Contatto WhatsApp non disponibile (manca il numero di cellulare)");
      return;
    }
    
    // Prevent talking to self
    const uPhone = currentGuard?.phone || "";
    const uMat = (currentGuard?.matricola || session?.matricola || "").replace(/\s+/g, "").toUpperCase();
    const cleanTarget = phoneNumber.replace(/\D/g, "");
    const cleanUser = uPhone.replace(/\D/g, "");
    
    // Checks
    if (cleanTarget === cleanUser && cleanTarget.length > 5) {
      window.alert("⚠️ Questa è la tua utenza (non puoi contattare te stesso).");
      return;
    }
    if (guardId && getIsSelf(guardId)) {
      window.alert("⚠️ Questa è la tua utenza (non puoi contattare te stesso).");
      return;
    }
    
    let targetAlertId = alertId;
    if (!targetAlertId) {
      if (guardId) {
        const activeAlert = alerts.find(a => a.guardId === guardId && a.status === 'active');
        if (activeAlert) {
          targetAlertId = activeAlert.id;
        }
      }
      if (!targetAlertId) {
        const anyActiveAlert = alerts.find(a => a.status === 'active');
        if (anyActiveAlert) {
          targetAlertId = anyActiveAlert.id;
        }
      }
    }
    
    if (targetAlertId) {
      const uName = currentGuard ? `${currentGuard.surname} ${currentGuard.name}` : (session?.name || "Operatore");
      await handleUpdateAlertContact(targetAlertId, `Contatto WhatsApp avviato alle ${new Date().toLocaleTimeString('it-IT')} da ${uName}`);
    }
    
    openWhatsApp(phoneNumber, message);
  };

  const handleMakeCallAndLog = async (phoneNumber?: string, guardId?: string, alertId?: string) => {
    if (!phoneNumber) {
      window.alert("Numero di telefono non configurato.");
      return;
    }
    
    // Prevent talking to self
    const uPhone = currentGuard?.phone || "";
    const cleanTarget = phoneNumber.replace(/\D/g, "");
    const cleanUser = uPhone.replace(/\D/g, "");
    if (cleanTarget === cleanUser && cleanTarget.length > 5) {
      window.alert("⚠️ Questa è la tua utenza (non puoi telefonare a te stesso).");
      return;
    }
    if (guardId && getIsSelf(guardId)) {
      window.alert("⚠️ Questa è la tua utenza (non puoi telefonare a te stesso).");
      return;
    }
    
    let targetAlertId = alertId;
    if (!targetAlertId) {
      if (guardId) {
        const activeAlert = alerts.find(a => a.guardId === guardId && a.status === 'active');
        if (activeAlert) {
          targetAlertId = activeAlert.id;
        }
      }
      if (!targetAlertId) {
        const anyActiveAlert = alerts.find(a => a.status === 'active');
        if (anyActiveAlert) {
          targetAlertId = anyActiveAlert.id;
        }
      }
    }
    
    if (targetAlertId) {
      const uName = currentGuard ? `${currentGuard.surname} ${currentGuard.name}` : (session?.name || "Operatore");
      await handleUpdateAlertContact(targetAlertId, `Chiamata GSM avviata alle ${new Date().toLocaleTimeString('it-IT')} da ${uName}`);
    }
    
    window.open(`tel:${phoneNumber.replace(/\s+/g, "")}`, "_self");
  };

  const handleSaveGuardSheet = async () => {
    if (!selectedGuardForSheet) return;
    const isOwner = currentGuard && selectedGuardForSheet.id === currentGuard.id;
    const authorMatricola = currentGuard?.matricola || session?.matricola || "Sconosciuto";
    if (!isAdmin && !isOwner) {
      alert("Non hai i permessi per modificare questa scheda.");
      sendSecurityAlert('anagrafica', 'update', selectedGuardForSheet.id, authorMatricola, `TENTATIVO NON AUTORIZZATO di modifica scheda di ${selectedGuardForSheet.surname || ""} ${selectedGuardForSheet.name}`);
      return;
    }
    setIsSavingGuardSheet(true);
    try {
      // 1. Aggiorniamo i dati PUBBLICI (quelli che si vedono nella lista)
      const guardRef = doc(db, "guards", selectedGuardForSheet.id);
      
      // Se l'utente ha inserito un nome e un cognome, usiamoli. Altrimenti manteniamo quelli vecchi se non vuoti.
      const updatedName = (editingPrivateInfo.name || "").trim() || selectedGuardForSheet.name;
      const updatedSurname = (editingPrivateInfo.surname || "").trim() || selectedGuardForSheet.surname || "";
      
      // Gestione corretta della cancellazione foto: se è una stringa vuota, l'intento è rimuoverla
      let updatedPhoto = selectedGuardForSheet.photo;
      if (editingPrivateInfo.photo === "") {
        updatedPhoto = null;
      } else if (editingPrivateInfo.photo) {
        updatedPhoto = editingPrivateInfo.photo;
      }
      
      const updatedRank = (editingPrivateInfo.grado || "").trim() || selectedGuardForSheet.rank || "Guardia Giurata";

      const newPublicData = {
        name: updatedName,
        surname: updatedSurname,
        photo: updatedPhoto as string | null,
        rank: updatedRank
      };

      try {
        await updateDoc(guardRef, newPublicData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, "guards/" + selectedGuardForSheet.id);
      }

      // 2. Aggiorniamo i dati PRIVATI
      const privateDocRef = doc(db, "guards", selectedGuardForSheet.id, "private", "data");
      try {
        await setDoc(privateDocRef, editingPrivateInfo, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "guards/" + selectedGuardForSheet.id + "/private/data");
      }
      
      setGuardPrivateInfoMap(prev => ({ ...prev, [selectedGuardForSheet.id]: editingPrivateInfo }));
      
      // Aggiorniamo lo stato locale globale per riflettere le modifiche ovunque nell'app
      setGuards(prev => prev.map(g => g.id === selectedGuardForSheet.id ? {
        ...g,
        ...newPublicData,
        photo: newPublicData.photo as string // Cast per compatibilità tipo
      } : g));

      alert("Scheda salvata con successo!");
      sendSecurityAlert('anagrafica', 'update', selectedGuardForSheet.id, authorMatricola, `Scheda anagrafica di ${updatedSurname} ${updatedName} aggiornata con successo`);
      logAction("Aggiornamento Scheda Guardia", "update", { guardId: selectedGuardForSheet.id, name: `${updatedSurname} ${updatedName}` });
      setIsGuardSheetOpen(false);
    } catch (e: any) {
      console.error("Error saving guard sheet:", e);
      alert("Errore durante il salvataggio: " + e.message);
    } finally {
      setIsSavingGuardSheet(false);
    }
  };

  const clearAllShifts = async () => {
    if (!isAdmin) return;
    if (
      !confirm(
        "ATTENZIONE: Stai per cancellare DEFINITIVAMENTE tutti i turni presenti nel database. Procedere?",
      )
    )
      return;

    try {
      setLoading(true);
      const q = query(collection(db, "shifts"));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map((d) =>
        deleteDoc(doc(db, "shifts", d.id)),
      );
      await Promise.all(deletePromises);
      alert("Database turni ripulito con successo!");
      logAction("Pulizia totale turni", "delete");
    } catch (e: any) {
      alert("Errore durante la pulizia: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ shifts, guards }, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute(
      "download",
      `backup_guardie_${format(new Date(), "yyyy-MM-dd")}.json`,
    );
    linkElement.click();
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAdmin) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (content.guards) {
          for (const g of content.guards) {
            await addDoc(collection(db, "guards"), {
              name: g.name,
              email: g.email,
              phone: g.phone || "",
              qualifications: g.qualifications,
              createdAt: serverTimestamp(),
            });
          }
        }
        alert("Importazione completata!");
      } catch (error) {
        alert("Errore importazione");
      }
    };
    reader.readAsText(file);
  };

  const shiftsForSelectedDateAndSector = shifts.filter(
    (s) =>
      selectedDate &&
      s.date === format(selectedDate, "yyyy-MM-dd") &&
      s.sector === activeSector,
  );

  const currentSectorInfo = SECTORS.find((s) => s.id === activeSector)!;

  // Calendar Grid Logic
  const [viewDate, setViewDate] = useState(new Date());
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale: it });
  const calendarEnd = endOfWeek(monthEnd, { locale: it });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getShiftsForDay = (date: Date, sector?: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const targetSector = sector !== undefined ? sector : (calendarSectorFilter === "tutti" ? undefined : calendarSectorFilter);
    return shifts.filter(
      (s) =>
        s.date === dateStr && (!targetSector || s.sector === targetSector) && s.status !== "cancelled",
    );
  };


  // Helper di Raggruppamento Automatico Squadre: Se 2+ guardie dello stesso settore sono nello stesso giorno e orario/luogo sovrapposto
  const getDaySquadsAndPatrols = (dayShifts: Shift[]) => {
    const active = dayShifts.filter(s => s.status !== "cancelled");
    const grouped: {
      isSquad: boolean;
      sector: string;
      startTime: string;
      endTime: string;
      notes: string;
      guards: { name: string; surname?: string; matricola?: string; id: string; status: string }[];
      shiftIds: string[];
      status: string;
    }[] = [];

    const visited = new Set<string>();

    for (let i = 0; i < active.length; i++) {
      const s1 = active[i];
      if (visited.has(s1.id)) continue;

      // Find matching shifts (same sector, same start/end time, same or similar notes)
      const squadShifts = [s1];
      visited.add(s1.id);

      for (let j = i + 1; j < active.length; j++) {
        const s2 = active[j];
        if (visited.has(s2.id)) continue;

        // Check matching sector & overlapping time (or same time)
        const sameSector = s1.sector === s2.sector;
        const sameTime = s1.startTime === s2.startTime;
        const sameNotes = (!s1.notes && !s2.notes) || (s1.notes && s2.notes && (s1.notes.toLowerCase().trim() === s2.notes.toLowerCase().trim() || s1.notes.toLowerCase().includes(s2.notes.toLowerCase()) || s2.notes.toLowerCase().includes(s1.notes.toLowerCase())));

        if (sameSector && (sameTime || sameNotes)) {
          squadShifts.push(s2);
          visited.add(s2.id);
        }
      }

      const allApproved = squadShifts.every(s => s.status === "approved");
      grouped.push({
        isSquad: squadShifts.length > 1,
        sector: s1.sector,
        startTime: s1.startTime,
        endTime: s1.endTime,
        notes: squadShifts.map(s => s.notes).filter(Boolean).join(" • ") || "",
        guards: squadShifts.map(s => {
          const gObj = guards.find(g => g.id === s.guardId);
          return {
            name: s.guardName,
            surname: gObj?.surname,
            matricola: s.matricola || gObj?.matricola,
            id: s.guardId,
            status: s.status
          };
        }),
        shiftIds: squadShifts.map(s => s.id),
        status: allApproved ? "approved" : "pending"
      });
    }

    return grouped;
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    const chosenSector = calendarSectorFilter !== "tutti" ? (calendarSectorFilter as any) : activeSector;
    setActiveSector(chosenSector);
    setNewShift(prev => ({
      ...prev,
      date: format(day, "yyyy-MM-dd"),
      sector: chosenSector,
      guardId: currentGuard ? currentGuard.id : (prev.guardId || (guards.length > 0 ? guards[0].id : ""))
    }));
    setIsAddDialogOpen(true);
  };

  if (showSplash) {
    return (
      <SplashScreen
        onComplete={() => {
          setShowSplash(false);
        }}
      />
    );
  }

  if (!session || !currentGuard) {
    return (
      <LoginScreen
        matricolaInput={matricolaInput}
        setMatricolaInput={setMatricolaInput}
        onLogin={performLogin}
        guards={guards}
        loginError={loginError}
        loading={loading || isAutoLoggingIn}
      />
    );
  }

  // Caricamento istantaneo: nessun blocco di attesa a tutto schermo

  const handleOpenNavigator = (destination: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        () => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const setGuardGpsTracingState = async (guardId: string, isAuthorized: boolean, matricola?: string) => {
    const gObj = guards.find(g => g.id === guardId || (g.matricola && matricola && g.matricola.replace(/\s+/g, "").toUpperCase() === matricola.replace(/\s+/g, "").toUpperCase()));
    const normMat = (matricola || gObj?.matricola || "").replace(/\s+/g, "").toUpperCase();
    const targetGuard = gObj || { id: guardId, matricola: normMat } as Guard;

    const docRef1 = guardId ? doc(db, "guards", guardId) : null;
    const docRef2 = getGuardDocRef(targetGuard);

    if (docRef1) {
      try {
        await setDoc(docRef1, { isTracingAuthorized: isAuthorized }, { merge: true });
      } catch (e) {
        console.warn("Err docRef1 GPS update:", e);
      }
    }

    if (docRef2 && docRef2.id !== guardId) {
      try {
        await setDoc(docRef2, { isTracingAuthorized: isAuthorized }, { merge: true });
      } catch (e) {
        console.warn("Err docRef2 GPS update:", e);
      }
    }

    if (normMat) {
      const matching = guards.filter(g => (g.matricola || "").replace(/\s+/g, "").toUpperCase() === normMat);
      for (const mg of matching) {
        if (mg.id && mg.id !== guardId && mg.id !== docRef2?.id) {
          try {
            await setDoc(doc(db, "guards", mg.id), { isTracingAuthorized: isAuthorized }, { merge: true });
          } catch (e) {}
        }
      }
    }

    setGuards(prev => prev.map(guard => {
      const mMat = guard.matricola ? guard.matricola.replace(/\s+/g, "").toUpperCase() : "";
      if (guard.id === guardId || (normMat && mMat === normMat)) {
        return { ...guard, isTracingAuthorized: isAuthorized };
      }
      return guard;
    }));

    if (currentGuard) {
      const currMat = currentGuard.matricola ? currentGuard.matricola.replace(/\s+/g, "").toUpperCase() : "";
      if (currentGuard.id === guardId || (normMat && currMat === normMat)) {
        setCurrentGuard(prev => prev ? { ...prev, isTracingAuthorized: isAuthorized } : null);
        if (!isAuthorized && watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setIsTracking(false);
        }
      }
    }
  };

  const handleToggleGpsForGuard = async (guardId: string, matricola?: string, guardName?: string) => {
    const gObj = guards.find(g => g.id === guardId || (g.matricola && matricola && g.matricola.replace(/\s+/g, "").toUpperCase() === matricola.replace(/\s+/g, "").toUpperCase()));
    const currentlyActive = gObj ? !!gObj.isTracingAuthorized : false;
    const nextState = !currentlyActive;

    let isConfirmed = false;
    try {
      isConfirmed = window.confirm(
        nextState 
          ? `Attivare il tracciamento GPS (GPS ON) per ${guardName || gObj?.surname || 'l\'operatore'}?`
          : `Disattivare il tracciamento GPS (GPS OFF) per ${guardName || gObj?.surname || 'l\'operatore'}?`
      );
    } catch (e) {
      isConfirmed = true;
    }

    if (isConfirmed) {
      try {
        await setGuardGpsTracingState(guardId, nextState, matricola);
        alert(`Stato GPS per ${guardName || gObj?.surname || 'l\'operatore'}: ${nextState ? '🟢 GPS ON (ACCESO)' : '🔴 GPS OFF (SPENTO)'}.`);
      } catch (err: any) {
        alert("Errore aggiornamento GPS: " + err.message);
      }
    }
  };

  const handleDisableGpsForGuard = async (guardId: string, matricola?: string, guardName?: string) => {
    await handleToggleGpsForGuard(guardId, matricola, guardName);
  };

  const handleCleanRadar = async () => {
    let isConfirmed = false;
    try {
      isConfirmed = window.confirm(`Confermi la pulizia completa del Radar?\n\nQuesta operazione:\n1. Risolve e archivia tutti gli interventi, missioni e SOS attivi sul Radar.\n2. Disattiva e spegne il tracciamento GPS (GPS OFF) per tutti gli operatori.`);
    } catch (e) {
      console.warn("window.confirm blocked by sandbox, auto-confirming.", e);
      isConfirmed = true;
    }

    if (!isConfirmed) return;

    setIsCleaningRadar(true);

    try {
      let successCalls = 0;
      let failCalls = 0;
      let successMissions = 0;
      let failMissions = 0;
      let successAlerts = 0;
      let failAlerts = 0;
      let deactivatedGpsCount = 0;

      const openCalls = emergencyCalls.filter(c => c.status !== 'risolto' && c.status !== 'archiviato');
      const openMissions = missions.filter(m => m.status === 'pending' || m.status === 'accepted');
      const openAlerts = alerts.filter(a => a.status === 'active');

      for (const c of openCalls) {
        try {
          await updateDoc(doc(db, "emergency_calls", c.id), { status: "risolto" });
          successCalls++;
        } catch (err) {
          console.error("Errore pulizia emergency_call " + c.id, err);
          failCalls++;
        }
      }
      setEmergencyCalls(prev => prev.map(item => openCalls.some(oc => oc.id === item.id) ? { ...item, status: 'risolto' } : item));

      for (const m of openMissions) {
        try {
          await updateDoc(doc(db, "missions", m.id), { status: "completed" });
          successMissions++;
        } catch (err) {
          console.error("Errore pulizia mission " + m.id, err);
          failMissions++;
        }
      }

      for (const a of openAlerts) {
        try {
          await updateDoc(doc(db, "alerts", a.id), { status: "resolved" });
          successAlerts++;
        } catch (err) {
          console.error("Errore pulizia alert " + a.id, err);
          failAlerts++;
        }
      }

      setIsSosActive(false);
      setSosStage('none');
      setActiveSosId(null);

      // Scansione esaustiva Firestore di TUTTE le guardie per spegnere il GPS (GPS OFF)
      try {
        const allGuardDocs = await getDocs(collection(db, "guards"));
        for (const gdoc of allGuardDocs.docs) {
          if (gdoc.data().isTracingAuthorized) {
            try {
              await updateDoc(doc(db, "guards", gdoc.id), { isTracingAuthorized: false });
              deactivatedGpsCount++;
            } catch (err) {
              console.warn("Errore reset GPS doc " + gdoc.id, err);
            }
          }
        }
      } catch (err) {
        console.error("Errore scansione guards Firestore:", err);
      }

      // Spegnimento GPS per tutte le guardie nella lista locale
      setGuards(prev => prev.map(g => ({ ...g, isTracingAuthorized: false })));

      if (currentGuard) {
        setCurrentGuard(prev => prev ? { ...prev, isTracingAuthorized: false } : null);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setIsTracking(false);
        }
      }

      let msg = "🧹 Pulizia radar completata con successo!";
      msg += `\n• Risolti: ${successCalls} Interventi, ${successMissions} Missioni, ${successAlerts} SOS.`;
      if (deactivatedGpsCount > 0) {
        msg += `\n• Disattivato GPS (GPS OFF) per ${deactivatedGpsCount} operatore/i.`;
      }
      if (failCalls > 0 || failMissions > 0 || failAlerts > 0) {
        msg += `\n• Nota: ${failCalls} Interventi, ${failMissions} Missioni, ${failAlerts} SOS con errore permessi.`;
      }
      alert(msg);
    } catch (err: any) {
      alert("Errore durante la pulizia radar: " + err.message);
    } finally {
      setIsCleaningRadar(false);
    }
  };

  const todayStrForRadar = format(new Date(), "yyyy-MM-dd");
  const activeGuardsOnDuty = guards
    .filter(g => {
      // 1. SOS attivo (prevale per sicurezza)
      const isGuardInActiveSos = alerts.some(a => 
        a.status === 'active' && 
        (a.guardId === g.id || (g.matricola && a.matricola && a.matricola.replace(/\s+/g, "").toUpperCase() === g.matricola.replace(/\s+/g, "").toUpperCase()))
      );
      if (isGuardInActiveSos) return true;

      // VERIFICA ABILITAZIONE SETTORE: Esclude automaticamente chi non appartiene al settore attivo (es. Ittica)
      if (!isGuardQualifiedForSector(g, activeSector)) {
        return false;
      }

      // 2. L'operatore appare geolocalizzato online sul radar SE E SOLO SE ha il GPS acceso/autorizzato (GPS ON)
      if (g.isTracingAuthorized) return true;

      return false;
    })
    .filter(g => !!g.lastLocation && typeof g.lastLocation.lat === 'number' && typeof g.lastLocation.lng === 'number' && g.lastLocation.lat !== 0 && g.lastLocation.lng !== 0);

  // Se siamo in modalità 2° Monitor Dedicato (Solo Mappa), rendi unicamente la mappa a tutto schermo senza header, menu o card secondarie
  if (isRadarMapOnly) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0f19] text-slate-200 font-sans">
        <CentraleOperativaTab 
          guards={guards} 
          shifts={shifts} 
          contacts={contacts} 
          user={user} 
          currentGuard={currentGuard} 
          missions={missions}
          initialSubTab="radar"
          isRadarMonitorOnly={true}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0f172a] text-slate-200 font-sans transition-all duration-300">
      <div className="h-full overflow-y-auto overscroll-none p-0 md:p-3 lg:p-4">
        <div className="w-full max-w-[99%] mx-auto space-y-3 md:space-y-5 pb-24">
        {/* Header Centrato C.O.E.T.A. con Pulsantiera Orizzontale */}
        <header className="bg-[#1e293b] p-3 sm:p-5 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col items-center justify-center text-center gap-3">
          {/* Logo e Titolo Istituzionale C.O.E.T.A. Centrati */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 flex items-center justify-center bg-white rounded-full p-1 shadow-inner ring-2 ring-cyan-500/30">
              <EkoclubLogo />
            </div>
            <div className="text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-widest text-[#06b6d4] leading-none">
                  C.O.E.T.A.
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-600/40 uppercase tracking-widest">
                  Centrale Operativa
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-semibold uppercase tracking-wider mt-0.5">
                Centrale Operativa Ekoclub Tutela Animali, Ambiente e Territorio
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-[10px] sm:text-[11px] text-blue-300 uppercase font-medium tracking-wider">
                  {isAdmin ? (isAdminMode ? "MODALITÀ: SUPER-ADMIN (CENTRALE HQ)" : "MODALITÀ: SUPER-ADMIN (PATTUGLIA)") : isResponsabile ? (isAdminMode ? "MODALITÀ: RESPONSABILE (CENTRALE HQ)" : "MODALITÀ: RESPONSABILE (PATTUGLIA)") : "MODALITÀ: GUARDIA SUL CAMPO"}
                </span>
                {currentGuard && (
                  <span className="text-[10px] bg-slate-900/90 text-yellow-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                    👤 {currentGuard.surname} {currentGuard.name} (Matr. {currentGuard.matricola})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pulsantiera Orizzontale Allineata Sotto la Scritta Centrata */}
          <div className="w-full pt-2 border-t border-slate-700/60 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            {(isAdmin || isResponsabile) && (
              <Button
                size="sm"
                onClick={() => {
                  const nextMode = !isAdminMode;
                  setIsAdminMode(nextMode);
                  setIsAdminPortalOpen(true);
                  if (nextMode) {
                    setActiveAdminTab("centrale_operativa");
                  } else {
                    setActiveAdminTab("emergencies");
                  }
                }}
                className={cn(
                  "h-9 px-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider border flex items-center gap-1.5 shadow-sm cursor-pointer",
                  isAdminMode 
                    ? "bg-indigo-950/60 border-indigo-500/80 text-indigo-200 hover:bg-indigo-900" 
                    : "bg-amber-950/60 border-amber-500/80 text-amber-200 hover:bg-amber-900 animate-pulse"
                )}
                title="Passa tra vista Centrale (PC) e vista Pattuglia sul Campo (Cellulare)"
              >
                <span>{isAdminMode ? "💻 Vista Centrale" : "📱 Vista Pattuglia"}</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => window.open(window.location.href, '_blank')}
              className="h-9 px-3 rounded-xl font-bold transition-all text-cyan-300 text-xs uppercase tracking-wider border bg-cyan-950/40 border-cyan-500/50 hover:bg-cyan-900/60 flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Apri in nuova scheda esterna a schermo intero"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Nuova Scheda</span>
            </Button>

            <Button
              size="sm"
              onClick={() => window.location.reload()}
              className="h-9 px-3 rounded-xl font-bold transition-all text-emerald-400 text-xs uppercase tracking-wider border bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/60 flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              title="Aggiorna e ricarica istantaneamente l'applicazione con gli ultimi dati e turni"
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              <span>Aggiorna Dati</span>
            </Button>

            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-9 px-3 rounded-xl font-bold transition-all text-emerald-300 text-xs uppercase tracking-wider border bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/60 flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Installa come App PWA su Cellulare o Tablet"
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" />
              <span>Installa PWA</span>
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManual(true)}
                className="h-9 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>Guida</span>
              </Button>
            )}

            {/* Logout / Esci */}
            {currentGuard || session ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-red-950/70 border-red-700 text-red-200 hover:bg-red-900 hover:text-white h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto sm:ml-0"
                title="Disconnetti e torna alla schermata iniziale"
              >
                <LogOut className="h-3.5 w-3.5 text-red-300" />
                <span>Esci</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleLogout()}
                className="h-9 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" /> Accedi
              </Button>
            )}
          </div>
        </header>



        {/* DIALOG INSERIMENTO TURNO OPERATIVO - COMPATTO CON SCROLL PROTETTO */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md sm:max-w-lg w-[95vw] max-h-[88vh] flex flex-col bg-slate-950 border border-slate-700 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl z-[10000] overflow-hidden">
            <DialogHeader className="border-b border-slate-800 pb-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
                    <CalendarIcon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-normal uppercase tracking-wider text-white">
                      {isAdmin || isResponsabile ? "Assegna Turno di Servizio" : "Richiedi Turno di Servizio"}
                    </DialogTitle>
                    <p className="text-xs text-blue-400 font-semibold capitalize">
                      {selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona Data"}
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 py-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {/* Selettore Settore */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Settore Operativo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SECTORS.map((sec) => {
                    const isSecActive = activeSector === sec.id;
                    const IconComp = sec.icon;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveSector(sec.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
                          isSecActive
                            ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-900/40"
                            : "bg-slate-900/90 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <IconComp className="h-3 w-3 shrink-0" />
                        <span className="capitalize truncate">{sec.label.replace("GUARDIA ", "").replace("VIGILANZA ", "")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selettore Guardia */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Guardia Verbalizzante / Operatore
                </label>
                <select
                  value={newShift.guardId || (currentGuard ? currentGuard.id : "")}
                  onChange={(e) => setNewShift(prev => ({ ...prev, guardId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Seleziona Guardia dal Ruolo --</option>
                  {guards.map((g) => {
                    const qualified = isGuardQualifiedForSector(g, activeSector);
                    return (
                      <option key={g.id} value={g.id}>
                        {g.surname} {g.name} (Matr. {g.matricola}) {g.role ? `- ${g.role}` : ""} {!qualified ? "⚠️ [Non abilitato]" : ""}
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const targetGuardId = newShift.guardId || (currentGuard ? currentGuard.id : "");
                  const targetGuardObj = guards.find(g => g.id === targetGuardId) || currentGuard;
                  if (targetGuardObj && !isGuardQualifiedForSector(targetGuardObj, activeSector)) {
                    return (
                      <p className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 rounded-lg p-1.5 mt-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Attenzione: L'operatore selezionato non risulta abilitato al settore <strong>{activeSector.toUpperCase()}</strong> (Consentiti: Ittica solo per Ittica, Venatoria e Zoofila abbinabili).</span>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Fascia Oraria */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Ora Inizio Servizio
                  </label>
                  <Input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-slate-900 border-slate-700 text-white text-xs h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Ora Fine Servizio
                  </label>
                  <Input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-slate-900 border-slate-700 text-white text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Pulsanti Fasce Rapide */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Fasce Rapide:</span>
                <button
                  type="button"
                  onClick={() => setNewShift(prev => ({ ...prev, startTime: "08:00", endTime: "12:00" }))}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono cursor-pointer"
                >
                  08:00 - 12:00
                </button>
                <button
                  type="button"
                  onClick={() => setNewShift(prev => ({ ...prev, startTime: "14:00", endTime: "18:00" }))}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono cursor-pointer"
                >
                  14:00 - 18:00
                </button>
                <button
                  type="button"
                  onClick={() => setNewShift(prev => ({ ...prev, startTime: "20:00", endTime: "24:00" }))}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono cursor-pointer"
                >
                  20:00 - 24:00
                </button>
              </div>

              {/* Località e Note Operative */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Località di Presidio / Note Operative
                </label>
                <Input
                  type="text"
                  placeholder="Es. Molo di Ponente, Marina di Carrara, Controllo Microchip..."
                  value={newShift.notes}
                  onChange={(e) => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center gap-2 border-t border-slate-800 pt-3 shrink-0 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold uppercase h-10 px-4 rounded-xl cursor-pointer"
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={() => handleAddShift(isAdmin || isResponsabile)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal uppercase tracking-wider h-10 rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isAdmin || isResponsabile ? "Conferma e Assegna Turno" : "Invia Richiesta Turno"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isInstallGuideOpen} onOpenChange={setIsInstallGuideOpen}>
          <DialogContent className="max-w-md bg-[#020617] border border-slate-800 text-slate-200 p-6 md:p-8 rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-emerald-400" />
                Guida Installazione App PWA
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs md:text-sm text-slate-300 leading-relaxed mt-2">
              <p>
                Per installare l'applicazione direttamente sul tuo cellulare o tablet come App autonoma (senza browser):
              </p>
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div>
                  <strong className="text-emerald-400 block mb-1">📱 Android (Chrome / Edge):</strong>
                  Apri il menu in alto a destra (<span className="text-white">⋮</span>) e seleziona <span className="font-bold text-white">"Aggiungi a schermata Home"</span> oppure <span className="font-bold text-white">"Installa app"</span>.
                </div>
                <div className="border-t border-slate-800 pt-3">
                  <strong className="text-blue-400 block mb-1">🍎 iPhone / iPad (Safari):</strong>
                  Tocca l'icona di condivisione in basso (<span className="text-white">□↑</span>) e seleziona <span className="font-bold text-white">"Aggiungi alla Home"</span>.
                </div>
                <div className="border-t border-slate-800 pt-3">
                  <strong className="text-yellow-400 block mb-1">💻 Computer Desktop:</strong>
                  Clicca sull'icona di installazione nella barra degli indirizzi del browser in alto a destra.
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={() => setIsInstallGuideOpen(false)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider h-11 rounded-xl">
                Ho Capito, Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isRiservataAuthDialogOpen} onOpenChange={setIsRiservataAuthDialogOpen}>
          <DialogContent className="max-w-md bg-[#020617] border border-slate-800 text-slate-200 p-6 md:p-8 rounded-3xl shadow-2xl">
            <DialogHeader className="text-center">
              <div className="mx-auto bg-orange-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 border border-orange-500/20">
                <Lock className="h-6 w-6 text-orange-500" />
              </div>
              <DialogTitle className="text-xl font-normal text-white uppercase italic tracking-tight">Accesso Area 51</DialogTitle>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">Identificazione di Sicurezza</p>
            </DialogHeader>
            
            <div className="space-y-4 py-6">
              <div className="relative">
                <Input
                  type={showRiservataPassword ? "text" : "password"}
                  placeholder="Inserisci Password..."
                  value={riservataPassword}
                  onChange={(e) => setRiservataPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRiservataUnlock()}
                  className="bg-black border-slate-700 pr-10 text-white h-12 text-center text-lg tracking-widest"
                />
                <Button
                  variant="ghost"
                  type="button"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-white hover:bg-transparent"
                  onClick={() => setShowRiservataPassword(!showRiservataPassword)}
                >
                  {showRiservataPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {riservataError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-2.5 rounded-xl bg-red-900/10 border border-red-950">
                  <AlertCircle className="h-4 w-4" />
                  <span>{riservataError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsRiservataAuthDialogOpen(false);
                  setRiservataPassword("");
                  setRiservataError("");
                }}
                className="flex-1 text-slate-400 hover:text-white h-12"
              >
                Annulla
              </Button>
              <Button
                onClick={handleRiservataUnlock}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 rounded-xl"
              >
                Accedi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODALE DI AUTENTICAZIONE: RICERCA AVANZATA / FORENSE */}
        <Dialog open={isRicercaAvanzataAuthOpen} onOpenChange={setIsRicercaAvanzataAuthOpen}>
          <DialogContent className="max-w-md bg-[#020617] border border-indigo-800 text-slate-200 p-6 md:p-8 rounded-3xl shadow-2xl z-[9999]">
            <DialogHeader className="text-center">
              <div className="mx-auto bg-indigo-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3 border border-indigo-500/20">
                {ricercaAuthTarget === "forensics" ? (
                  <Camera className="h-6 w-6 text-purple-400" />
                ) : (
                  <Search className="h-6 w-6 text-indigo-400" />
                )}
              </div>
              <DialogTitle className="text-xl font-black text-white uppercase italic tracking-tight">
                {ricercaAuthTarget === "forensics" ? "Ricerca Forense AI & OSINT" : "Ricerca OSINT AI"}
              </DialogTitle>
              <div className="mt-3 p-3 rounded-2xl bg-amber-950/50 border border-amber-800/60 text-amber-300">
                <p className="text-xs font-bold uppercase tracking-wider text-center leading-snug">
                  Accesso consentito agli amministratori, inserire password
                </p>
              </div>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="relative">
                <Input
                  type={showRicercaAvanzataPassword ? "text" : "password"}
                  placeholder="Inserisci Password..."
                  value={ricercaAvanzataPassword}
                  onChange={(e) => setRicercaAvanzataPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRicercaAvanzataUnlock()}
                  className="bg-black border-slate-700 pr-10 text-white h-12 text-center text-lg tracking-widest rounded-xl focus:border-indigo-500"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  type="button"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-white hover:bg-transparent"
                  onClick={() => setShowRicercaAvanzataPassword(!showRicercaAvanzataPassword)}
                >
                  {showRicercaAvanzataPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {ricercaAvanzataError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 rounded-xl bg-red-900/20 border border-red-800/60">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{ricercaAvanzataError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsRicercaAvanzataAuthOpen(false);
                  setRicercaAvanzataPassword("");
                  setRicercaAvanzataError("");
                }}
                className="flex-1 text-slate-400 hover:text-white h-12 rounded-xl"
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={handleRicercaAvanzataUnlock}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black h-12 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-indigo-900/40 cursor-pointer"
              >
                Accedi alla Ricerca
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG DI CONFERMA ELIMINAZIONE GLOBALE */}
        <Dialog open={Boolean(deleteConfirmation)} onOpenChange={(open) => { if (!open) setDeleteConfirmation(null); }}>
          <DialogContent className="max-w-md bg-[#020617] border border-red-900/80 text-slate-200 p-6 rounded-3xl shadow-2xl z-[9999]">
            <DialogHeader className="text-center">
              <div className="mx-auto bg-red-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2 border border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <DialogTitle className="text-xl font-black text-white uppercase italic tracking-tight">
                Conferma Eliminazione
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-2">
                Sei sicuro di voler eliminare permanentemente <span className="text-red-400 font-bold">{deleteConfirmation?.name}</span>? L'operazione non può essere annullata.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex gap-2 mt-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 text-slate-400 hover:text-white h-11 rounded-xl"
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!deleteConfirmation) return;
                  if (deleteConfirmation.type === 'shift' && deleteConfirmation.id) {
                    executeDeleteShift(deleteConfirmation.id);
                  } else if (deleteConfirmation.type === 'guard' && deleteConfirmation.id) {
                    executeDeleteGuard(deleteConfirmation.id, deleteConfirmation.name);
                  } else {
                    setDeleteConfirmation(null);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black h-11 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-red-950/60 cursor-pointer"
              >
                Elimina Definitivamente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        


        {/* CONSOLE OPERATIVA HQ / PANNELLO GESTIONALE PRINCIPALE */}
        <div className="w-full bg-[#020617] border border-slate-800 rounded-3xl text-slate-200 p-0 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[850px] flex-1">
          <div className="p-4 md:p-6 border-b border-slate-800 shrink-0 bg-slate-900/40">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                  className="border-slate-800 bg-slate-900 text-white hover:bg-slate-800 h-10 w-10 flex items-center justify-center shrink-0 rounded-xl"
                  title="Menu Gestione"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className={cn(
                  "p-2.5 rounded-xl shadow-lg transition-colors hidden xs:block",
                  (isAdmin || isResponsabile) && macroMode === "hq" 
                    ? "bg-red-600 shadow-red-900/30" 
                    : "bg-amber-600 shadow-amber-900/30"
                )}>
                  {(isAdmin || isResponsabile) && macroMode === "hq" ? (
                    <Radio className="h-6 w-6 text-white animate-pulse" />
                  ) : (
                    <Shield className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm xs:text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight italic flex items-center gap-2">
                    {(isAdmin || isResponsabile) && macroMode === "hq" ? (
                      <>
                        <span>CENTRALE OPERATIVA HQ</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 font-bold uppercase tracking-wider not-italic">
                          Radar Live & Gestione
                        </span>
                      </>
                    ) : (
                      <>
                        <span>POSTAZIONE PATTUGLIA</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/30 border border-amber-500/50 text-amber-300 font-bold uppercase tracking-wider not-italic">
                          Servizio sul Campo
                        </span>
                      </>
                    )}
                  </h2>
                  <p className="text-[10px] xs:text-xs text-slate-400 font-medium tracking-wide">
                    {(isAdmin || isResponsabile) && macroMode === "hq" 
                      ? "Controllo squadre in tempo reale, radar missioni, anagrafica decreti e atti" 
                      : "Tesserino di servizio, verbali di sopralluogo zoofilo, sanzioni e relazioni"}
                  </p>
                </div>
              </div>

              {/* BARRA DI NAVIGAZIONE PRINCIPALE: HOME + 4 SETTORI OPERATIVI */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                {/* 1. HOME CENTRALE OPERATIVA (CALENDARIO & QUADRO COMANDO) */}
                {(isAdmin || isResponsabile) && (
                  <button
                    type="button"
                    id="btn-nav-home"
                    onClick={() => {
                      setMacroMode("hq");
                      setActiveAdminTab("shifts");
                    }}
                    className={cn(
                      "px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border",
                      activeAdminTab === "shifts"
                        ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/60 ring-2 ring-red-400/50"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                    title="Home: Calendario Turni e Quadro Comando"
                  >
                    <Home className="h-4 w-4 text-red-300" />
                    <span>Home</span>
                  </button>
                )}

                {/* 2. RADAR MAPPA */}
                <button
                  type="button"
                  id="btn-nav-mappa-radar"
                  onClick={() => {
                    setMacroMode("hq");
                    setActiveAdminTab("centrale_operativa");
                    setCentraleSubTab("radar");
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border",
                    activeAdminTab === "centrale_operativa" && centraleSubTab === "radar"
                      ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/50"
                      : "bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:text-white hover:bg-emerald-900/60"
                  )}
                  title="Mappa Radar in diretta, pattuglie e gestione chiamate"
                >
                  <span className="text-sm">🗺️</span>
                  <span>Mappa Radar</span>
                </button>

                {/* 3. ARCHIVI */}
                <button
                  type="button"
                  id="btn-nav-archivi"
                  onClick={() => {
                    setMacroMode("hq");
                    setActiveAdminTab("reports");
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border",
                    activeAdminTab === "reports" || activeAdminTab === "verbali"
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-950/60 ring-2 ring-blue-400/50"
                      : "bg-blue-950/40 border-blue-800/60 text-blue-300 hover:text-white hover:bg-blue-900/60"
                  )}
                  title="Archivi completi di consultazione per i 5 settori operativi"
                >
                  <Folder className="h-4 w-4 text-blue-300" />
                  <span>Archivi</span>
                </button>

                {/* 4. FORENSE */}
                <button
                  type="button"
                  id="btn-nav-forense"
                  onClick={() => {
                    setMacroMode("hq");
                    setActiveAdminTab("centrale_operativa");
                    setCentraleSubTab("forensics");
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border",
                    activeAdminTab === "centrale_operativa" && centraleSubTab === "forensics"
                      ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-950/60 ring-2 ring-purple-400/50"
                      : "bg-purple-950/40 border-purple-800/60 text-purple-300 hover:text-white hover:bg-purple-900/60"
                  )}
                  title="Centrale Forense Scientifica, Analisi Reperti e Atti PG"
                >
                  <Scale className="h-4 w-4 text-purple-300" />
                  <span>Forense</span>
                </button>

                {/* 5. VERBALE SANZIONATORIO (UFFICIO - ZOOFILA) */}
                <button
                  type="button"
                  id="btn-nav-verbale-sanzione-ufficio"
                  onClick={() => {
                    setIsVerbaleSanzioneDialogOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border bg-rose-950/40 border-rose-800/60 text-rose-300 hover:text-white hover:bg-rose-700 shadow-md"
                  title="Redigi Verbale di Sanzione Amministrativa (Ufficio / Zoofila)"
                >
                  <FileText className="h-4 w-4 text-rose-300" />
                  <span>Verbale Sanzionatorio (Ufficio)</span>
                </button>

                {/* Tasto switch rapido per Pattuglia sul Campo (per Admin / Resp che alternano tra HQ e Campo) */}
                {(isAdmin || isResponsabile) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (macroMode === "patrol" && activeAdminTab === "emergencies") {
                        setMacroMode("hq");
                        setActiveAdminTab("centrale_operativa");
                        setCentraleSubTab("radar");
                      } else {
                        setMacroMode("patrol");
                        setActiveAdminTab("emergencies");
                      }
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border shrink-0",
                      macroMode === "patrol" && activeAdminTab === "emergencies"
                        ? "bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-950/60 ring-2 ring-amber-400/50"
                        : "bg-slate-900/90 border-slate-800 text-amber-300 hover:text-white hover:bg-slate-800"
                    )}
                    title="Alterna tra Centrale Operativa HQ e Cruscotto Pattuglia sul campo"
                  >
                    <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="inline">Pattuglia Campo</span>
                  </button>
                )}

                {/* PULSANTI DIRETTI: SALVA IN... & CARICA DA... (CHIAVETTA USB) - Riservati ad Amministratori */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 ml-auto shrink-0 border-l border-slate-800 pl-2">
                    <button
                      type="button"
                      id="btn-salva-programma-usb"
                      onClick={() => {
                        setBackupModalMode("save");
                        setIsBackupModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border bg-blue-600 border-blue-400 text-white hover:bg-blue-500 shadow-md shadow-blue-950/60"
                      title="Salva l'intero programma sulla chiavetta USB (Salva in...)"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      <span>Salva in...</span>
                    </button>

                    <button
                      type="button"
                      id="btn-ripristina-programma-usb"
                      onClick={() => {
                        setBackupModalMode("restore");
                        setIsBackupModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border bg-amber-500 border-amber-300 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-950/60"
                      title="Ripristina il programma dalla chiavetta USB (Carica da...)"
                    >
                      <Upload className="h-4 w-4 text-slate-950 shrink-0" />
                      <span>Carica da...</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

            <div className="flex flex-1 overflow-hidden relative">
              {/* Main Content Area in Dialog - EXPANDED FOR PC (100% FULL WIDTH) */}
              <div className="flex-1 bg-[#020617] overflow-hidden flex flex-col relative custom-scrollbar">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/5 blur-[120px] rounded-full -ml-30 -mb-30 pointer-events-none" />
                
                {/* INTESTAZIONE A TUTTO SCHERMO SENZA DISTURBI VISIVI */}
                {activeAdminTab !== "centrale_operativa" && (
                  <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between gap-3 shadow-xl sticky top-0 z-30 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      {(isAdmin || isResponsabile) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMacroMode("hq");
                            setActiveAdminTab("centrale_operativa");
                            setCentraleSubTab("radar");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg border border-emerald-400 flex items-center gap-2 transition-all active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>⬅️ Torna alla Home</span>
                        </button>
                      ) : activeAdminTab !== "emergencies" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMacroMode("patrol");
                            setActiveAdminTab("emergencies");
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg border border-amber-400 flex items-center gap-2 transition-all active:scale-95 cursor-pointer ring-2 ring-amber-400/40"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>⬅️ Torna a Pattuglia</span>
                        </button>
                      ) : null}

                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-200">
                          {activeAdminTab === "reports" && "📂 ARCHIVIO: VERBALI & CARTELLA UNICA DOSSIER"}
                          {activeAdminTab === "service_reports" && "📑 ARCHIVIO: RELAZIONI DI SERVIZIO"}
                          {activeAdminTab === "stats" && "📊 REGISTRO CONTROLLI TERRITORIALI A4 LANDSCAPE"}
                          {activeAdminTab === "microchip" && "🐕 BANCA DATI MICROCHIP & ANAGRAFE CANINA"}
                          {activeAdminTab === "shifts" && "⏰ CALENDARIO TURNI & SERVIZI"}
                          {activeAdminTab === "sos_rotation" && "🚨 REPERIBILITÀ & TURNI SOS"}
                          {activeAdminTab === "vehicles" && "🚒 PARCO MEZZI & VEICOLI DI SERVIZIO"}
                          {activeAdminTab === "guards" && "👥 ANAGRAFICA GUARDIE & DECRETI PREFETTIZI"}
                          {activeAdminTab === "pending_documents" && "📤 BACHECA ATTI OFFLINE IN ATTESA"}
                          {activeAdminTab === "black_box" && "🔒 AREA RISERVATA: BLACK BOX & PG"}
                          {activeAdminTab === "emergencies" && "🛡️ PATTUGLIA OPERATIVA SUL CAMPO"}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:inline">
                          Visualizzazione a tutto schermo priva di distrazioni
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMacroModulisticaOpen(true)}
                        className="bg-amber-950/60 border border-amber-500/60 text-amber-200 hover:bg-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-400" />
                        <span className="hidden md:inline">Modulistica</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMacroArchiviOpen(true)}
                        className="bg-cyan-950/60 border border-cyan-500/60 text-cyan-200 hover:bg-cyan-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="hidden md:inline">Archivi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMacroForenseOpen(true)}
                        className="bg-purple-950/60 border border-purple-500/60 text-purple-200 hover:bg-purple-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Camera className="h-3.5 w-3.5 text-purple-400" />
                        <span className="hidden md:inline">Forense</span>
                      </button>
                    </div>
                  </div>
                )}
                
                <div className={cn(
                  "flex-1 overflow-y-auto relative z-10 admin-content pb-20",
                  activeAdminTab === "centrale_operativa" ? "p-2 md:p-3" : "p-3 md:p-6"
                )}>
                  <div className={cn(
                    "mx-auto w-full",
                    activeAdminTab === "centrale_operativa" ? "max-w-none" : "max-w-[1550px]"
                  )}>
                {activeAdminTab === "animalia_census" ? (
                    <AnimaliaCensusTab
                      animaliaPassword={animaliaPassword}
                      setAnimaliaPassword={setAnimaliaPassword}
                      showAnimaliaPassword={showAnimaliaPassword}
                      setShowAnimaliaPassword={setShowAnimaliaPassword}
                      handleAnimaliaUnlock={handleAnimaliaUnlock}
                      animaliaError={animaliaError}
                      isAnimaliaUnlocked={isAnimaliaUnlocked}
                      setIsAnimaliaUnlocked={setIsAnimaliaUnlocked}
                      animaliaCensus={animaliaCensus}
                      newCensusSpecie={newCensusSpecie}
                      setNewCensusSpecie={setNewCensusSpecie}
                      newCensusNome={newCensusNome}
                      setNewCensusNome={setNewCensusNome}
                      newCensusLocalita={newCensusLocalita}
                      setNewCensusLocalita={setNewCensusLocalita}
                      newCensusCount={newCensusCount}
                      setNewCensusCount={setNewCensusCount}
                      newCensusDettagli={newCensusDettagli}
                      setNewCensusDettagli={setNewCensusDettagli}
                      newCensusCoords={newCensusCoords}
                      newCensusPhoto={newCensusPhoto}
                      setNewCensusPhoto={setNewCensusPhoto}
                      newCensusNotes={newCensusNotes}
                      setNewCensusNotes={setNewCensusNotes}
                      handleGetCensusLocation={handleGetCensusLocation}
                      handleSaveCensus={handleSaveCensus}
                      handleDeleteCensus={handleDeleteCensus}
                      loading={loading}
                    />
                  ) : ["stats", "cancellations"].includes(
                  activeAdminTab,
                ) && !isStatsUnlocked ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-slate-700 mx-auto max-w-2xl">
                    <Lock className="h-12 w-12 text-blue-500 mb-4" />
                    <h2 className="text-2xl font-normal mb-8 text-white">Area 51</h2>
                    <div className="flex gap-2 max-w-sm w-full px-4">
                      <div className="relative flex-1">
                        <Input
                          type={showStatsPassword ? "text" : "password"}
                          placeholder="Inserisci Password..."
                          value={statsPassword}
                          onChange={(e) => setStatsPassword(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleStatsUnlock()
                          }
                          className="bg-black border-slate-700 pr-10 text-white"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-white"
                          onClick={() =>
                            setShowStatsPassword(!showStatsPassword)
                          }
                        >
                          {showStatsPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        onClick={handleStatsUnlock}
                        className="bg-blue-600"
                      >
                        Sblocca
                      </Button>
                    </div>
                    {statsError && (
                      <div className="mt-4 flex items-center gap-2 text-red-400 text-xs p-2 rounded-lg bg-red-900/20 border border-red-900/30">
                        <AlertCircle className="h-3 w-3" />
                        {statsError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {activeAdminTab === "black_box" && (
                        <div className="space-y-6">
                          {/* Sub-tab selection bar for AREA RISERVATA HQ */}
                          <div className="flex border-b border-slate-800 gap-6 mb-4 pb-0">
                            <button
                              onClick={() => setAreaRiservataSubTab("black_box")}
                              className={cn(
                                "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition-all cursor-pointer flex items-center gap-2",
                                areaRiservataSubTab === "black_box"
                                  ? "border-yellow-500 text-white"
                                  : "border-transparent text-slate-400 hover:text-white"
                              )}
                            >
                              <DatabaseZap className="h-4 w-4 text-yellow-500" />
                              Scatola Nera
                            </button>
                            <button
                              onClick={() => setAreaRiservataSubTab("cancellations")}
                              className={cn(
                                "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition-all cursor-pointer flex items-center gap-2",
                                areaRiservataSubTab === "cancellations"
                                  ? "border-yellow-500 text-white"
                                  : "border-transparent text-slate-400 hover:text-white"
                              )}
                            >
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              Turni Annullati
                            </button>
                            <button
                              onClick={() => setAreaRiservataSubTab("stats")}
                              className={cn(
                                "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition-all cursor-pointer flex items-center gap-2",
                                areaRiservataSubTab === "stats"
                                  ? "border-yellow-500 text-white"
                                  : "border-transparent text-slate-400 hover:text-white"
                              )}
                            >
                              <BarChart3 className="h-4 w-4 text-blue-500" />
                              Analitica Dati
                            </button>
                          </div>

                          {areaRiservataSubTab === "black_box" && (
                            <div className="space-y-6">
                              {/* PULSANTE PULIZIA - SEMPLICE E FUNZIONANTE */}
                              <div className="fixed bottom-6 right-6 z-[50]">
                                {(isAdmin || isSuperPina) && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleClearLogsExecution();
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" /> 
                                    <span className="text-[10px] uppercase font-black tracking-widest">Svuota Cestino Ora</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex justify-between items-center bg-slate-900/80 p-6 rounded-2xl border border-yellow-500/50 shadow-xl shadow-yellow-900/10 mb-4">
                                <div>
                                  <h2 className="text-2xl font-bold flex items-center gap-3 text-yellow-500 italic uppercase tracking-tighter">
                                    <DatabaseZap className="h-8 w-8 text-yellow-500" />
                                    SCATOLA NERA - REGISTRO DI CONTROLLO
                                  </h2>
                                  <p className="text-sm text-yellow-400 font-medium uppercase tracking-widest mt-1">Tracciamento accessi e modifiche al database h24</p>
                                </div>
                              </div>

                          <Card className="bg-slate-950 border-yellow-500/20">
                             <CardContent className="p-0">
                               <ScrollArea className="h-[650px]">
                                 <Table>
                                   <TableHeader>
                                     <TableRow className="border-yellow-500/20 bg-slate-900">
                                       <TableHead className="text-xs font-bold text-yellow-500 uppercase">Data/Ora Evento</TableHead>
                                       <TableHead className="text-xs font-bold text-yellow-500 uppercase">Operatore</TableHead>
                                       <TableHead className="text-xs font-bold text-yellow-500 uppercase">Azione</TableHead>
                                       <TableHead className="text-xs font-bold text-yellow-500 uppercase">Dettagli Operazione</TableHead>
                                     </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                     {accessLogs.map((log, lIdx) => (
                                        <TableRow key={`${log.id}_${lIdx}`} className="border-yellow-500/20 hover:bg-yellow-500/5 h-20">
                                           <TableCell className="text-sm font-bold font-mono text-yellow-400">
                                             {log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd/MM/yyyy HH:mm:ss") : "Ora..."}
                                           </TableCell>
                                           <TableCell className="text-sm text-white">
                                             <div className="font-extrabold text-white text-base">
                                               {log.userName}
                                               {log.details?.role && log.details.role !== "N/A" && (
                                                 <span className={cn(
                                                   "ml-2 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-tighter align-middle font-black",
                                                   log.details.role === 'admin' ? "bg-red-950/40 text-red-400 border border-red-900/30" :
                                                   log.details.role === 'responsabile' ? "bg-purple-950/40 text-purple-400 border border-purple-900/30" :
                                                   "bg-slate-800 text-slate-400"
                                                 )}>
                                                   {log.details.role}
                                                 </span>
                                               )}
                                             </div>
                                             <div className="text-[11px] text-yellow-500/80 font-mono font-bold tracking-widest mt-0.5 uppercase">ID MATRICOLA: {log.userMatricola}</div>
                                           </TableCell>
                                           <TableCell className="text-xs">
                                             <Badge className={cn(
                                               "text-[11px] font-black uppercase py-1 px-3 shadow-sm",
                                               log.type === 'access' ? "bg-amber-500 text-black border border-amber-600" :
                                               log.type === 'create' ? "bg-emerald-600 text-white" :
                                               log.type === 'update' ? "bg-yellow-500 text-black border border-yellow-600" :
                                               log.type === 'delete' ? "bg-red-600 text-white" : "bg-slate-700 text-white"
                                             )}>
                                               {log.action}
                                             </Badge>
                                           </TableCell>
                                           <TableCell className="max-w-md py-4">
                                             <div className="flex flex-wrap gap-2">
                                               {log.details && Object.entries(log.details).map(([key, value]) => {
                                                 if (['context', 'area', 'role'].includes(key)) return null;
                                                 return (
                                                   <div key={key} className="bg-slate-900 border border-yellow-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-inner">
                                                     <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest border-r border-yellow-500/20 pr-2">{key === 'recordsDeleted' ? 'RECORD' : key}</span>
                                                     <span className="text-sm text-yellow-50 font-bold">{String(value)}</span>
                                                   </div>
                                                 );
                                               })}
                                             </div>
                                           </TableCell>
                                        </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                               </ScrollArea>
                             </CardContent>
                          </Card>
                        </div>
                      )}

                        {areaRiservataSubTab === "cancellations" && (
                          <div className="space-y-6">
                            <h2 className="text-xl font-normal flex items-center gap-2 text-red-400">
                              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
                              Turni Annullati e Note
                            </h2>
                            <Card className="bg-[#0f172a] border-slate-700 overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-slate-800 bg-slate-900/50">
                                    <TableHead className="text-slate-400">
                                      Data
                                    </TableHead>
                                    <TableHead className="text-slate-400">
                                      Operatore
                                    </TableHead>
                                    <TableHead className="text-slate-400">
                                      Motivo Annullamento
                                    </TableHead>
                                    <TableHead className="text-right text-slate-400">
                                      Azioni
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {shifts
                                    .filter((sh) => sh.status === "cancelled")
                                    .sort((a, b) => b.date.localeCompare(a.date))
                                    .map((sh, idx) => (
                                      <TableRow
                                        key={`${sh.id}_${idx}`}
                                        className="border-slate-800"
                                      >
                                        <TableCell className="text-white">
                                          {formatItalianDate(
                                            parseISO(sh.date),
                                            "dd/MM/yyyy",
                                          )}
                                        </TableCell>
                                        <TableCell className="text-white font-normal text-xs uppercase tracking-wider">
                                          {sh.guardName}
                                        </TableCell>
                                        <TableCell className="text-red-400 italic">
                                          "
                                          {sh.cancellationReason ||
                                            "Nessuna specifica"}
                                          "
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {/* Rimosso pulsante elimina duplicato per evitare conflitti. Usare i dettagli calendario */}
                                          <p className="text-[10px] text-slate-500">Solo Visualizzazione</p>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </Card>
                          </div>
                        )}

                        {areaRiservataSubTab === "stats" && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center">
                              <h2 className="text-xl font-normal flex items-center gap-2 text-white">
                                <BarChart3 className="h-6 w-6 text-blue-400" />
                                Statistiche Operative
                              </h2>
                              <Button
                                onClick={() => setIsStatsUnlocked(false)}
                                variant="ghost"
                                className="text-slate-400 hover:text-white"
                              >
                                Blocca Area
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
                                <CardHeader className="p-4 bg-slate-800/20 border-b border-slate-800">
                                  <CardTitle className="text-base font-normal uppercase tracking-wider text-white">
                                    Riepilogo Guardie
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                  <ScrollArea className="h-[400px]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-slate-800 bg-slate-950/30">
                                          <TableHead className="text-[10px] py-2">
                                            Guardia
                                          </TableHead>
                                          <TableHead className="text-[10px] text-right py-2">
                                            Annullati
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {guards.map((g, idx) => {
                                            const s = getGuardStats(g.id);
                                            const isSelected =
                                              selectedStatGuard === g.id;
                                            return (
                                              <TableRow
                                                key={`${g.id}_${idx}`}
                                                className={cn(
                                                  "border-slate-800 cursor-pointer",
                                                  isSelected
                                                    ? "bg-blue-600/20"
                                                    : "hover:bg-slate-800/50",
                                                )}
                                                onClick={() =>
                                                  setSelectedStatGuard(g.id)
                                                }
                                              >
                                                <TableCell className="py-3 text-sm text-slate-100">
                                                  {g.surname ? `${g.surname} ${g.name}` : g.name}
                                                </TableCell>
                                                <TableCell className="py-3 text-right">
                                                  <Badge
                                                    variant={
                                                      s.cancelled > 2
                                                        ? "destructive"
                                                        : "secondary"
                                                    }
                                                    className="text-[10px]"
                                                  >
                                                    {s.cancelled}
                                                  </Badge>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </CardContent>
                              </Card>

                              <Card className="md:col-span-2 bg-slate-900/50 border-slate-800 p-6">
                                {selectedStatGuard ? (
                                  <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h3 className="text-2xl font-normal text-white">
                                          {
                                            guards.find(
                                              (g) => g.id === selectedStatGuard,
                                            )?.name
                                          }
                                        </h3>
                                        <p className="text-sm text-slate-400">
                                          Dettaglio operativo
                                        </p>
                                      </div>
                                      <Badge className="bg-blue-600">
                                        Matricola:{" "}
                                        {
                                          guards.find(
                                            (g) => g.id === selectedStatGuard,
                                          )?.matricola
                                        }
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-300 uppercase font-normal mb-1">
                                          Ore Totali
                                        </p>
                                        <p className="text-xl font-normal text-white">
                                          {
                                            getGuardStats(selectedStatGuard)
                                              .hoursTotal
                                          }
                                          h
                                        </p>
                                      </div>
                                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-300 uppercase font-normal mb-1">
                                          Turni Appr.
                                        </p>
                                        <p className="text-xl font-normal text-green-400">
                                          {
                                            getGuardStats(selectedStatGuard)
                                              .approved
                                          }
                                        </p>
                                      </div>
                                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-300 uppercase font-normal mb-1">
                                          Giorno Pref.
                                        </p>
                                        <p className="text-base font-normal capitalize">
                                          {
                                            getGuardStats(selectedStatGuard)
                                              .preferredDay
                                          }
                                        </p>
                                      </div>
                                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-300 uppercase font-normal mb-1">
                                          Affidabilità
                                        </p>
                                        <p className="text-base font-normal">
                                          {Math.round(
                                            (getGuardStats(selectedStatGuard)
                                              .approved /
                                              (getGuardStats(selectedStatGuard)
                                                .total || 1)) *
                                              100,
                                          )}
                                          %
                                        </p>
                                      </div>
                                    </div>

                                    {(() => {
                                      const selectedGuardObj = guards.find((g) => g.id === selectedStatGuard);
                                      if (!selectedGuardObj) return null;

                                      const gSurname = (selectedGuardObj.surname || "").toLowerCase().trim();
                                      const gName = (selectedGuardObj.name || "").toLowerCase().trim();

                                      // Helper matcher to see if a report includes our guard
                                      const isGuardInReport = (rep: any) => {
                                        if (rep.creatoDa === selectedStatGuard) return true;
                                        const creatorLower = (rep.creatoDaNome || "").toLowerCase();
                                        if (gSurname && creatorLower.includes(gSurname)) return true;
                                        if (gName && creatorLower.includes(gName)) return true;

                                        const verbalLower = (rep.verbalizzanti || "").toLowerCase();
                                        if (gSurname && verbalLower.includes(gSurname)) return true;
                                        if (gName && verbalLower.includes(gName)) return true;

                                        return false;
                                      };

                                      // Helper matcher to see if a service report includes our guard
                                      const isGuardInServiceReport = (sr: any) => {
                                        if (sr.creatoDa === selectedStatGuard) return true;
                                        const creatorLower = (sr.creatoDaNome || "").toLowerCase();
                                        if (gSurname && creatorLower.includes(gSurname)) return true;
                                        if (gName && creatorLower.includes(gName)) return true;

                                        const guardieLower = (sr.guardie || "").toLowerCase();
                                        if (gSurname && guardieLower.includes(gSurname)) return true;
                                        if (gName && guardieLower.includes(gName)) return true;

                                        return false;
                                      };

                                      // Gather all matching verbali (reports)
                                      const matchingVerbali = reports.filter(isGuardInReport).map(r => ({
                                        id: r.id,
                                        docId: r.numeroVerbale || r.id,
                                        type: "verbale" as const,
                                        subType: r.tipoVerbale, // 'zoofila' | 'ittica' | 'venatoria'
                                        date: r.data, // YYYY-MM-DD
                                        localita: r.localita || "N.D.",
                                        comune: r.comune || "Massa/Carrara",
                                        otherOperators: r.verbalizzanti || ""
                                      }));

                                      // Gather all matching service reports
                                      const matchingService = serviceReports.filter(isGuardInServiceReport).map(sr => ({
                                        id: sr.id,
                                        docId: sr.numeroRapporto || sr.id,
                                        type: "rapporto" as const,
                                        subType: (sr.settore && sr.settore[0]) || "Generico", 
                                        date: sr.data, // YYYY-MM-DD
                                        localita: sr.localita || "N.D.",
                                        comune: sr.comune || "Massa/Carrara",
                                        otherOperators: sr.guardie || ""
                                      }));

                                      // Combine both arrays & sort by date descending
                                      const combinedInterventions = [...matchingVerbali, ...matchingService].sort((a, b) => b.date.localeCompare(a.date));

                                      // Calculate details for partners (collega di squadra)
                                      const getTeamPartner = (item: typeof combinedInterventions[0]) => {
                                        const ops = item.otherOperators;
                                        if (!ops) return "Solo / Autonomo";
                                        
                                        const list = ops.split(/[,;\n\+]/).map(x => x.trim()).filter(Boolean);
                                        const partnersList = list.filter(p => {
                                          const pl = (p || "").toLowerCase();
                                          if (gSurname && pl.includes(gSurname)) return false;
                                          if (gName && pl.includes(gName)) return false;
                                          return true;
                                        });

                                        return partnersList.length > 0 ? partnersList.join(", ") : "Solo / Autonomo";
                                      };

                                      return (
                                        <div className="mt-8 space-y-4 pt-6 border-t border-slate-800">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                              <h4 className="text-sm font-normal uppercase tracking-widest text-emerald-400 italic flex items-center gap-2">
                                                <ClipboardList className="h-4 w-4 text-emerald-500" />
                                                Registro Interventi & Archivio di Servizio
                                              </h4>
                                              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 font-semibold">
                                                Riepilogo cronologico delle uscite sul campo e documenti associati (Zoofila, Ittica, Venatoria)
                                              </p>
                                            </div>
                                            <Badge className="bg-slate-950 text-emerald-400 border border-emerald-950/50 text-[10px] py-1 px-2.5 font-bold uppercase tracking-widest">
                                              Uscite Rilevate: {combinedInterventions.length}
                                            </Badge>
                                          </div>

                                          {combinedInterventions.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900 border-dashed">
                                              Nessun intervento o rapporto registrato a nome di questo operatore.
                                            </div>
                                          ) : (
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                                              <ScrollArea className="h-[280px]">
                                                <Table>
                                                  <TableHeader className="bg-slate-950/80 sticky top-0 z-10 border-b border-slate-800/80">
                                                    <TableRow className="border-slate-800/80 hover:bg-transparent">
                                                      <TableHead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-3 pl-4">Anno</TableHead>
                                                      <TableHead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-3">Data</TableHead>
                                                      <TableHead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-3">Località / Comune</TableHead>
                                                      <TableHead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-3">Tipologia</TableHead>
                                                      <TableHead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-3">Collega di Squadra</TableHead>
                                                      <TableHead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-3 text-right pr-4">Azione</TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {combinedInterventions.map((item, idy) => {
                                                      const itemYear = item.date ? item.date.split("-")[0] : "N.D.";
                                                      const formattedDate = item.date ? item.date.split("-").reverse().join("/") : "N.D.";
                                                      const partnerStr = getTeamPartner(item);

                                                      return (
                                                        <TableRow key={`${item.id}_${idy}`} className="border-slate-850 hover:bg-slate-900/30">
                                                          <TableCell className="font-mono text-[10px] text-slate-400 py-2.5 pl-4">{itemYear}</TableCell>
                                                          <TableCell className="font-mono text-[10px] text-slate-200 py-2.5 font-bold">{formattedDate}</TableCell>
                                                          <TableCell className="py-2.5">
                                                            <div className="flex flex-col">
                                                              <span className="text-xs text-white capitalize font-semibold">{(item.localita || "").toLowerCase()}</span>
                                                              <span className="text-[9px] text-slate-400 capitalize">{(item.comune || "").toLowerCase()}</span>
                                                            </div>
                                                          </TableCell>
                                                          <TableCell className="py-2.5">
                                                            <Badge className={cn(
                                                              "text-[8px] uppercase font-bold tracking-widest px-1.5 py-0.5",
                                                              item.type === "verbale" 
                                                                ? "bg-blue-900/40 text-blue-300 border border-blue-800/40" 
                                                                : "bg-emerald-900/40 text-emerald-300 border border-emerald-800/40"
                                                            )}>
                                                              {item.type === "verbale" ? `Verbale ${item.subType}` : `Rapporto ${item.subType}`}
                                                            </Badge>
                                                          </TableCell>
                                                          <TableCell className="text-[10px] text-slate-300 py-2.5 capitalize italic font-light truncate max-w-[120px]" title={partnerStr}>
                                                            {partnerStr}
                                                          </TableCell>
                                                          <TableCell className="py-2.5 text-right pr-4">
                                                            <Button
                                                              size="sm"
                                                              onClick={() => {
                                                                if (item.type === "verbale") {
                                                                  setHqVerbaliSearchQuery(item.docId);
                                                                  setHqDossierSearchQuery(item.localita);
                                                                  setHqVerbaliInitialViewMode("archive");
                                                                  setActiveAdminTab("reports");
                                                                } else {
                                                                  setHqServiceSearchQuery(item.docId);
                                                                  setActiveAdminTab("service_reports");
                                                                }
                                                              }}
                                                              variant="outline"
                                                              className="text-[9px] hover:bg-emerald-600 hover:text-white h-6 px-2 border-slate-800 hover:border-emerald-600 rounded-lg uppercase tracking-widest flex items-center gap-1 font-bold inline-flex"
                                                            >
                                                              Vedi Doc
                                                            </Button>
                                                          </TableCell>
                                                        </TableRow>
                                                      );
                                                    })}
                                                  </TableBody>
                                                </Table>
                                              </ScrollArea>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                                    <UserIcon className="h-12 w-12 mb-2 opacity-20" />
                                    Seleziona un membro dalla lista per vedere i
                                    dettagli
                                  </div>
                                )}
                              </Card>
                            </div>
                          </div>
                        )}
                      </div>
                    )}





                    
                  {activeAdminTab === "centrale_operativa" && (
                      <CentraleOperativaTab 
                        guards={guards} 
                        shifts={shifts} 
                        contacts={contacts} 
                        user={user} 
                        currentGuard={currentGuard} 
                        missions={missions}
                        initialSubTab={centraleSubTab}
                        onOpenVerbaleSanzione={() => {
                          setVerbaleSanzioneInitialMode("differita");
                          setIsVerbaleSanzioneDialogOpen(true);
                        }}
                      />
                    )}

                    {activeAdminTab === "sos_rotation" && (
                    <SosRotationTab
                      sosRotationSubTab={sosRotationSubTab}
                      setSosRotationSubTab={setSosRotationSubTab}
                      guards={guards}
                      shifts={shifts}
                      sosDutyShifts={sosDutyShifts}
                      SosDutyManager={SosDutyManager}
                      canUserApproveThisShift={canUserApproveThisShift}
                      handleApproveShift={handleApproveShift}
                                            formatItalianDate={formatItalianDate}
                    />
                  )}
                  {activeAdminTab === "emergencies" && (
                      <PatrolDashboard
                        currentGuard={currentGuard}
                        guardPrivateInfo={currentGuard ? guardPrivateInfoMap[currentGuard.id] : null}
                        activeSector={activeSector || "zoofila"}
                        onSelectSector={(sec) => setActiveSector(sec as any)}
                        isSectorAllowed={isSectorAllowed}
                        onOpenVerbaleSanzione={() => setIsVerbaleSanzioneDialogOpen(true)}
                        onOpenSopralluogo={() => {
                          setIsVerbaleDialogOpen(true);
                        }}
                        onOpenRelazione={() => {
                          const today = new Date().toISOString().split("T")[0];
                          const guardLabel = currentGuard
                            ? `${currentGuard.surname || ""} ${currentGuard.name || ""} (Matr. ${currentGuard.matricola || "-"})`.trim()
                            : "";
                          const sectorMap: Record<string, string> = {
                            zoofila: "GUARDIA ZOOFILA",
                            ittica: "GUARDIA ITTICA",
                            venatoria: "GUARDIA VENATORIA",
                            ambientale: "VIGILANZA AMBIENTALE",
                            protezione_civile: "PROTEZIONE CIVILE",
                          };
                          const defaultSector =
                            activeSector && sectorMap[activeSector]
                              ? [sectorMap[activeSector]]
                              : ["GUARDIA ZOOFILA"];

                          setNewServiceReport((prev) => ({
                            ...prev,
                            data: prev?.data || today,
                            guardia1: prev?.guardia1 || guardLabel,
                            guardie: prev?.guardie || guardLabel,
                            settore:
                              prev?.settore && prev.settore.length > 0
                                ? prev.settore
                                : (defaultSector as any),
                            provincia: prev?.provincia || "MS",
                            veicoloProprieta: prev?.veicoloProprieta || "EKOCLUB",
                          }));
                          setActiveAdminTab("service_reports");
                          setIsAddingServiceReport(true);
                        }}
                        onOpenControlliTerritorio={() => setIsAddingTerritoryControl(true)}
                        onOpenArchivioSopralluoghi={() => {
                          setActiveAdminTab("reports");
                        }}
                        onOpenMicrochipArchive={() => setIsMicrochipLookupOpen(true)}
                        pendingCount={pendingDocuments.length}
                        onOpenPendingDocuments={() => setIsPendingDocumentsOpen(true)}
                        onOpenSos={() => triggerSos()}
                        isTracking={isTracking}
                        onToggleGps={() => {
                          if (currentGuard) {
                            handleToggleGpsForGuard(currentGuard.id, currentGuard.matricola || "", `${currentGuard.surname || ""} ${currentGuard.name || ""}`.trim());
                          } else {
                            setIsTracking(!isTracking);
                          }
                        }}
                        renderCalendar={() => (
                          <OperationalCalendar
                            viewDate={viewDate}
                            setViewDate={setViewDate}
                            selectedDate={selectedDate}
                            calendarDays={calendarDays}
                            calendarSectorFilter={calendarSectorFilter}
                            setCalendarSectorFilter={setCalendarSectorFilter}
                            shifts={shifts}
                            pendingShifts={shifts.filter(s => s.status === "pending")}
                            guards={guards}
                            isAdmin={isAdmin}
                            isResponsabile={isResponsabile}
                            currentGuard={currentGuard}
                            handleDayClick={handleDayClick}
                            handleApproveShift={handleApproveShift}
                            handleDeleteShift={handleDeleteShift}
                            safeFormatDate={safeFormatDate}
                            getShiftsForDay={getShiftsForDay}
                            getDaySquadsAndPatrols={getDaySquadsAndPatrols}
                          />
                        )}
                      />
                    )}
                    {/* TAB: GESTIONE TURNI & CALENDARIO */}
                    {activeAdminTab === "shifts" && (
                      <OperationalCalendar
                        viewDate={viewDate}
                        setViewDate={setViewDate}
                        selectedDate={selectedDate}
                        calendarDays={calendarDays}
                        calendarSectorFilter={calendarSectorFilter}
                        setCalendarSectorFilter={setCalendarSectorFilter}
                        shifts={shifts}
                        pendingShifts={shifts.filter(s => s.status === "pending")}
                        guards={guards}
                        isAdmin={isAdmin}
                        isResponsabile={isResponsabile}
                        currentGuard={currentGuard}
                        handleDayClick={handleDayClick}
                        handleApproveShift={handleApproveShift}
                        handleDeleteShift={handleDeleteShift}
                        safeFormatDate={safeFormatDate}
                        getShiftsForDay={getShiftsForDay}
                        getDaySquadsAndPatrols={getDaySquadsAndPatrols}
                      />
                    )}

                    {/* TAB: ANAGRAFICA GUARDIE & DECRETI */}
                    {activeAdminTab === "guards" && (
                      <AnagraficaGuardieTab
                        guards={guards}
                        guardPrivateInfoMap={guardPrivateInfoMap}
                        currentGuard={currentGuard}
                        isAdmin={isAdmin}
                        isResponsabile={isResponsabile}
                        onRefreshPrivateInfo={fetchGuardPrivateInfo}
                        shifts={shifts}
                      />
                    )}

                    {/* TAB: ARCHIVIO VERBALI & DOSSIER */}
                    {(activeAdminTab === "reports" || activeAdminTab === "verbali") && (
                      <VerbaliHQTab
                        reports={reports}
                        envReports={envReports}
                        sanctionReports={sanctionReports}
                        db={db}
                        isAdmin={isAdmin}
                        isResponsabile={isResponsabile}
                        countNewReports={countNewReports}
                        isReportNew={isReportNew}
                        markReportAsRead={markReportAsRead}
                        getReportDateFormatted={getReportDateFormatted}
                        generateVerbalePDF={generateVerbalePDF}
                        removeReport={removeReport}
                        removeSanctionReport={removeSanctionReport}
                        handleShareReport={handleShareReport}
                        saveReportFromAI={saveReportFromAI}
                        isAnimaliaAuthorized={isAnimaliaAuthorized}
                        searchQuery={hqVerbaliSearchQuery}
                        searchDossierQuery={hqDossierSearchQuery}
                        initialViewMode={hqVerbaliInitialViewMode}
                        currentGuard={currentGuard}
                        emergencyCalls={emergencyCalls}
                        guards={guards}
                        onOpenOperatoGuardie={() => setIsOperatoGuardieOpen(true)}
                        onOpenVerbalistica={() => setIsVerbalisticaSelectorOpen(true)}
                        onOpenArchivioTurni={() => setIsArchivioTurniOpen(true)}
                      />
                    )}

                    {/* TAB: RELAZIONI DI SERVIZIO */}
                    {activeAdminTab === "service_reports" && (
                      <ServiceReportsTab
                        serviceReports={serviceReports}
                        guards={guards}
                        isAddingServiceReport={isAddingServiceReport}
                        setIsAddingServiceReport={setIsAddingServiceReport}
                        newServiceReport={newServiceReport}
                        setNewServiceReport={setNewServiceReport}
                        handleAddServiceReport={handleAddServiceReport}
                        removeServiceReport={removeServiceReport}
                        currentGuard={currentGuard}
                        isAdmin={isAdmin}
                        isAnimaliaAuthorized={isAnimaliaAuthorized}
                        searchQuery={hqServiceSearchQuery}
                      />
                    )}

                    {/* TAB: CONTROLLI SUL TERRITORIO & STATISTICHE */}
                    {activeAdminTab === "stats" && (
                      <StatsAndControlsTab
                        reports={reports}
                        serviceReports={serviceReports}
                        territoryControls={territoryControls}
                        guards={guards}
                        currentGuard={currentGuard}
                        isAdmin={isAdmin}
                        isSuperUser={isAdmin || isResponsabile}
                        activeSector={activeSector}
                        initialSubTab={statsSubTab}
                      />
                    )}

                    {/* TAB: ARCHIVIO MICROCHIP & ANAGRAFE CANINA */}
                    {(activeAdminTab === "microchip" || activeAdminTab === "animalia") && (
                      <div className="w-full">
                        <MicrochipLookupModal
                          userEmail={currentGuard?.email || user?.email || auth.currentUser?.email || "operatore@guardieambientali.it"}
                          userName={currentGuard ? `${currentGuard.surname || ""} ${currentGuard.name || ""}`.trim() : (user?.displayName || "Operatore")}
                          userMatricola={currentGuard?.matricola}
                          isLoggedIn={Boolean(user || currentGuard)}
                          isInline={true}
                        />
                      </div>
                    )}

                    {/* TAB: PARCO MEZZI & VEICOLI */}
                    {activeAdminTab === "vehicles" && (
                      <VehiclesTab
                        activeTab="vehicles"
                        vehicles={vehicles}
                        vehicleLogs={vehicleLogs}
                        newVehicle={newVehicle}
                        setNewVehicle={setNewVehicle}
                        vehicleFilter={vehicleFilter}
                        setVehicleFilter={setVehicleFilter}
                        isAnimaliaAuthorized={isAnimaliaAuthorized}
                        isAdmin={isAdmin}
                        handleAddVehicle={handleAddVehicle}
                        handleUpdateVehicle={handleUpdateVehicle}
                        removeVehicle={removeVehicle}
                        handleShareVehicleLog={handleShareVehicleLog}
                        handlePrint={handlePrint}
                      />
                    )}

                    {/* TAB: DOCUMENTI IN ATTESA */}
                    {activeAdminTab === "pending_documents" && (
                      <PendingDocumentsTab
                        pendingDocuments={pendingDocuments}
                        setPendingDocuments={setPendingDocuments}
                        isTransmitting={isTransmitting}
                        transmitPendingDocument={transmitPendingDocument}
                      />
                    )}

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
        <AnimatePresence>
          {isSquadTableOpen && (() => {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const natoNames = ["Alfa", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet"];
            const todayShifts = shifts.filter(s => s.date === todayStr && (s.status === 'approved' || s.status === 'pending'));
            const squadGroupsMap: Record<string, typeof todayShifts> = {};
            todayShifts.forEach(s => {
              const key = `${s.startTime || '08:00'} - ${s.endTime || '20:00'}`;
              if (!squadGroupsMap[key]) squadGroupsMap[key] = [];
              squadGroupsMap[key].push(s);
            });

            const guardsInShiftIds = new Set(todayShifts.map(s => s.guardId));
            const extraGuardsWithGps = activeGuardsOnDuty.filter(g => !guardsInShiftIds.has(g.id));

            const operationalSquads = Object.entries(squadGroupsMap).map(([timeSpan, squadShifts], index) => {
              const natoCode = natoNames[index] || `Squadra ${index + 1}`;
              const members = squadShifts.map(s => {
                const gObj = guards.find(g => g.id === s.guardId || (g.matricola && s.matricola && g.matricola.replace(/\s+/g,"").toUpperCase() === s.matricola.replace(/\s+/g,"").toUpperCase()));
                const activeG = activeGuardsOnDuty.find(ag => ag.id === (gObj?.id || s.guardId));
                const privateInfo = gObj ? guardPrivateInfoMap[gObj.id] : null;
                const phone = privateInfo?.cellulare || privateInfo?.phone || gObj?.phone || (s as any).telefono || "";

                let sectorLabel = "";
                let sectorColor = "#2563eb";
                if (s.sector) {
                  switch(s.sector) {
                    case 'ittica': sectorLabel = "ITT"; sectorColor = "#2563eb"; break;
                    case 'venatoria': sectorLabel = "VEN"; sectorColor = "#059669"; break;
                    case 'zoofila': sectorLabel = "ZOOF"; sectorColor = "#ea580c"; break;
                    case 'ambientale': sectorLabel = "AMB"; sectorColor = "#10b981"; break;
                  }
                }

                const surnameStr = gObj?.surname || s.guardName?.split(' ')[0] || "";
                const nameStr = gObj?.name || s.guardName?.split(' ')[1] || "";
                const fullName = s.guardName || `${surnameStr} ${nameStr}`.trim() || `Guardia ${s.matricola || s.guardId}`;

                return {
                  guardId: gObj?.id || s.guardId,
                  name: nameStr,
                  surname: surnameStr,
                  fullName,
                  matricola: gObj?.matricola || s.matricola || "N/A",
                  phone,
                  role: gObj?.role || "guardia",
                  rank: gObj?.rank || "Guardia",
                  isOnline: !!activeG,
                  lastLocation: activeG?.lastLocation,
                  sectorLabel,
                  sectorColor,
                  hasSos: activeG ? alerts.some(a => a.guardId === activeG.id && a.status !== 'resolved') : false,
                  hasMission: activeG ? missions.some(m => m.guardId === activeG.id && (m.status === 'pending' || m.status === 'accepted')) : false,
                };
              });

              const onlineMembersWithGps = members.filter(m => m.isOnline && m.lastLocation);
              let centerLoc: { lat: number; lng: number } | undefined = undefined;
              if (onlineMembersWithGps.length > 0) {
                const sumLat = onlineMembersWithGps.reduce((acc, curr) => acc + curr.lastLocation!.lat, 0);
                const sumLng = onlineMembersWithGps.reduce((acc, curr) => acc + curr.lastLocation!.lng, 0);
                centerLoc = {
                  lat: sumLat / onlineMembersWithGps.length,
                  lng: sumLng / onlineMembersWithGps.length
                };
              }

              const sectorsSet = new Set<string>();
              squadShifts.forEach(s => {
                if (s.sector) sectorsSet.add(s.sector.toUpperCase());
              });

              return {
                id: `squad-${index}-${timeSpan.replace(/\s+/g, '')}`,
                natoCode,
                name: `Squadra ${natoCode}`,
                timeSpan,
                members,
                centerLocation: centerLoc,
                sectors: Array.from(sectorsSet),
                isBusy: members.some(m => m.hasMission),
                hasSos: members.some(m => m.hasSos),
              };
            });

            if (extraGuardsWithGps.length > 0) {
              const extraMembers = extraGuardsWithGps.map(g => {
                const privateInfo = guardPrivateInfoMap[g.id];
                const phone = privateInfo?.cellulare || privateInfo?.phone || g.phone || "";
                const fullName = `${g.surname || ''} ${g.name || ''}`.trim() || `Guardia ${g.matricola || g.id}`;

                return {
                  guardId: g.id,
                  name: g.name || "",
                  surname: g.surname || "",
                  fullName,
                  matricola: g.matricola || "N/A",
                  phone,
                  role: g.role || "guardia",
                  rank: g.rank || "Guardia",
                  isOnline: true,
                  lastLocation: g.lastLocation,
                  sectorLabel: "SUP",
                  sectorColor: "#64748b",
                  hasSos: alerts.some(a => a.guardId === g.id && a.status !== 'resolved'),
                  hasMission: missions.some(m => m.guardId === g.id && (m.status === 'pending' || m.status === 'accepted')),
                };
              });

              const gpsMembers = extraMembers.filter(m => m.lastLocation);
              let centerLoc: { lat: number; lng: number } | undefined = undefined;
              if (gpsMembers.length > 0) {
                const sumLat = gpsMembers.reduce((acc, curr) => acc + curr.lastLocation!.lat, 0);
                const sumLng = gpsMembers.reduce((acc, curr) => acc + curr.lastLocation!.lng, 0);
                centerLoc = {
                  lat: sumLat / gpsMembers.length,
                  lng: sumLng / gpsMembers.length
                };
              }

              operationalSquads.push({
                id: 'squad-supporto-extra',
                natoCode: 'Supporto',
                name: 'Squadra Supporto Extraturno',
                timeSpan: 'Flessibile GPS',
                members: extraMembers,
                centerLocation: centerLoc,
                sectors: ['SUPPORTO'],
                isBusy: extraMembers.some(m => m.hasMission),
                hasSos: extraMembers.some(m => m.hasSos),
              });
            }

            return (
              <DraggableWindow
                title="🛡️ REGISTRO COMPOSIZIONE SQUADRE & PATTUGLIE (HQ)"
                onClose={() => setIsSquadTableOpen(false)}
                defaultWidth="760px"
                defaultHeight="620px"
                className="z-[9500] bg-slate-950 border-2 border-indigo-500/60 shadow-2xl rounded-2xl overflow-hidden font-sans flex flex-col"
              >
              <div className="p-4 bg-slate-950 text-white h-full flex flex-col justify-between space-y-4 overflow-hidden">
                {/* TOOLBAR SUPERIORE FINESTRA SQUADRE */}
                <div className="bg-slate-900 border border-indigo-500/30 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-950 border border-indigo-500/40 rounded-lg text-indigo-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-indigo-200">
                        Squadre Formate Automaticamente
                      </h3>
                      <p className="text-[10.5px] text-slate-400 font-mono">
                        Accoppiamento basato su stesso orario, giorno e settore
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRichiestaInterventoAddress("");
                        setRichiestaInterventoLat(undefined);
                        setRichiestaInterventoLng(undefined);
                        setIsRichiestaInterventoOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Registra nuova chiamata o richiesta d'intervento della cittadinanza"
                    >
                      <span>📋 Nuova Richiesta d'Intervento</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSquadModeOnMap(!isSquadModeOnMap)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer",
                        isSquadModeOnMap
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      )}
                    >
                      <span>{isSquadModeOnMap ? "🛡️ Modalità Squadra Attiva" : "👤 Modalità Singoli"}</span>
                    </button>
                  </div>
                </div>

                {/* LISTA SQUADRE OPERATIVE */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {operationalSquads.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                      <ShieldAlert className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400 uppercase">Nessuna Squadra Rilevata nei Turni Odierni</p>
                      <p className="text-[10px] text-slate-500 mt-1">Le guardie in servizio singolo verranno comunque visualizzate individualmente sulla mappa.</p>
                    </div>
                  ) : (
                    operationalSquads.map((sq) => {
                      const totalMembers = sq.members.length;
                      const onlineMembers = sq.members.filter(m => m.isOnline).length;
                      const primaryPhone = sq.members.map(m => m.phone).filter(Boolean)[0] || "";

                      return (
                        <div key={sq.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 hover:border-indigo-500/40 transition-all shadow-lg">
                          {/* SQUAD HEADER */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🛡️</span>
                              <div>
                                <h4 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                  <span>{sq.name}</span>
                                  <span className="bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded text-[9.5px] font-mono">
                                    {sq.timeSpan}
                                  </span>
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {sq.sectors.map((sec, sIdx) => (
                                    <span key={sIdx} className="bg-slate-800 text-slate-300 text-[9px] font-extrabold px-2 py-0.5 rounded border border-slate-700 uppercase">
                                      {sec}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[9.5px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1",
                                onlineMembers > 0 ? "bg-emerald-950 text-emerald-300 border-emerald-700" : "bg-slate-950 text-slate-400 border-slate-800"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", onlineMembers > 0 ? "bg-emerald-400 animate-ping" : "bg-slate-600")} />
                                {onlineMembers}/{totalMembers} Operatori In Linea
                              </span>
                            </div>
                          </div>

                          {/* MEMBERS LIST TABLE */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Componenti della Squadra ({totalMembers}):</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                              {sq.members.map((m, mIdx) => {
                                const gObj = guards.find(g => g.id === m.guardId || g.matricola === m.matricola);
                                const privateInfo = guardPrivateInfoMap[m.guardId];
                                const phone = privateInfo?.cellulare || privateInfo?.phone || m.phone || gObj?.phone;
                                const loc = gObj?.lastLocation;

                                return (
                                <div key={mIdx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2.5 shadow-md">
                                  {/* INTESTAZIONE OPERATORE */}
                                  <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", m.isOnline ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-slate-600")} />
                                      <div className="min-w-0">
                                        <p className="font-black text-slate-100 truncate uppercase text-xs tracking-tight">
                                          {m.fullName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                          <span className="text-amber-400 font-bold">Matricola: [{m.matricola}]</span>
                                          {phone && <span className="text-slate-300">• 📞 {phone}</span>}
                                        </p>
                                      </div>
                                    </div>
                                    {m.sectorLabel && (
                                      <span className="text-[8.5px] font-black px-2 py-0.5 rounded text-white shrink-0 uppercase" style={{ backgroundColor: m.sectorColor }}>
                                        {m.sectorLabel}
                                      </span>
                                    )}
                                  </div>

                                  {/* TABELLA UNIFORME A 2 COLONNE: EMERGENZA A SX, SERVIZIO A DX */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {/* COLONNA 1: EMERGENZA */}
                                    <div className="bg-rose-950/30 border border-rose-600/40 p-2 rounded-xl flex flex-col gap-1.5 text-center">
                                      <p className="text-[9px] text-rose-300 font-black uppercase tracking-widest leading-none pb-0.5 m-0">EMERGENZA</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenWhatsAppAndLog(phone, "Centrale Operativa: Comunicazione di servizio/emergenza.", m.guardId);
                                        }}
                                        className="h-7 w-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleMakeCallAndLog(phone, m.guardId);
                                        }}
                                        className="h-7 w-full bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <Phone className="h-3 w-3 shrink-0" /> Chiama
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTargetVideoGuard(gObj || ({ id: m.guardId, name: m.fullName, surname: "", matricola: m.matricola, phone: phone } as any));
                                          setVideoDialogOpen(true);
                                        }}
                                        className="h-7 w-full bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <Video className="h-3 w-3 shrink-0" /> Video Live
                                      </button>
                                    </div>

                                    {/* COLONNA 2: SERVIZIO */}
                                    <div className="bg-indigo-950/30 border border-indigo-600/40 p-2 rounded-xl flex flex-col gap-1.5 text-center">
                                      <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest leading-none pb-0.5 m-0">SERVIZIO</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedGuardForMission(gObj || ({ id: m.guardId, name: m.fullName, surname: "", matricola: m.matricola } as any));
                                          setIsMissionDialogOpen(true);
                                          if (radarSearchedPoint) {
                                            setNewMission({
                                              address: radarSearchedPoint.address,
                                              description: "",
                                              priority: "medium"
                                            });
                                          }
                                        }}
                                        className="h-7 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <ShieldAlert className="h-3 w-3 shrink-0" /> Missione
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (loc) {
                                            window.open("https://www.google.com/maps?q=" + loc.lat + "," + loc.lng);
                                          } else {
                                            alert("Posizione GPS dell'operatore non disponibile al momento.");
                                          }
                                        }}
                                        className="h-7 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-medium uppercase tracking-wider rounded-lg border border-white/10 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <ExternalLink className="h-3 w-3 shrink-0" /> G. Maps
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleGpsForGuard(m.guardId, m.matricola, m.fullName)}
                                        className={cn(
                                          "h-7 w-full text-[9px] font-black uppercase tracking-wider rounded-lg shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none border",
                                          m.isOnline
                                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400"
                                            : "bg-red-950/80 hover:bg-red-900 text-red-200 border-red-500/30"
                                        )}
                                      >
                                        {m.isOnline ? "🟢 GPS ON" : "🔴 GPS OFF"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>

                          {/* SQUAD ACTIONS BAR */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                if (sq.centerLocation) {
                                  setRadarMapCenter([sq.centerLocation.lat, sq.centerLocation.lng]);
                                }
                              }}
                              disabled={!sq.centerLocation}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                            >
                              📍 Centra Mappa
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSquadForMission({
                                  squadName: sq.name,
                                  timeSpan: sq.timeSpan,
                                  members: sq.members
                                });
                                setIsMissionDialogOpen(true);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-400 shadow flex items-center gap-1.5 cursor-pointer"
                            >
                              📋 Invia Missione alla Squadra
                            </button>

                            {primaryPhone && (
                              <button
                                type="button"
                                onClick={() => openWhatsApp(primaryPhone, `Centrale Operativa HQ per ${sq.name}`)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-500 shadow flex items-center gap-1.5 cursor-pointer"
                              >
                                💬 WhatsApp Pattuglia
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* BOTTOM FOOTER SUMMARY */}
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-mono">
                  <span>🛡️ Squadre Attive: {operationalSquads.length}</span>
                  <span>📍 Mappa Radar Aggiornata in Tempo Reale</span>
                </div>
              </div>
            </DraggableWindow>
          ); })()}
        </AnimatePresence>

        {/* COMANDO MISSIONE DIALOG (ADMIN SIDE) - SCHERMO INTERO TABELLA ORIZZONTALE */}
        {isMissionDialogOpen && (selectedGuardForMission || selectedSquadForMission) && (
          <Dialog open={isMissionDialogOpen} onOpenChange={(open) => {
            setIsMissionDialogOpen(open);
            if (!open) {
              setSelectedGuardForMission(null);
              setSelectedSquadForMission(null);
              setForceNewMission(false);
            }
          }}>
            <DialogContent className="bg-slate-950 border-2 border-slate-700 text-white p-3 sm:p-5 w-[99vw] max-w-[99vw] sm:max-w-none h-[96vh] max-h-[96vh] rounded-none z-[10000] flex flex-col overflow-hidden shadow-2xl">
              {(() => {
                const isSquad = !!selectedSquadForMission;
                const activeMission = !isSquad && selectedGuardForMission ? missions.find(m => m.guardId === selectedGuardForMission.id && (m.status === 'pending' || m.status === 'accepted')) : null;
                if (activeMission && selectedGuardForMission && !forceNewMission) {
                  return (
                    <div className="py-8 text-center space-y-4 animate-in fade-in overflow-y-auto my-auto">
                      <div className={`w-16 h-16 rounded-none ${activeMission.status === 'pending' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'} border-2 flex items-center justify-center mx-auto`}>
                        {activeMission.status === 'pending' ? <Clock className="h-8 w-8 animate-spin" /> : <CheckCircle2 className="h-8 w-8" />}
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-wider text-white">
                        {activeMission.status === 'pending' ? 'MISSIONE GIÀ IN ATTESA DI CONFERMA' : 'MISSIONE IN CORSO (GIÀ ACCETTATA)'}
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto px-4">
                        Per la pattuglia <strong className="text-white">{selectedGuardForMission.surname} {selectedGuardForMission.name}</strong> c'è già un comando operativo attivo:<br />
                        <span className="text-amber-300 font-bold">"{activeMission.address}"</span>
                      </p>
                      
                      <div className="flex flex-wrap gap-3 pt-4 justify-center max-w-3xl mx-auto">
                        {activeMission.status === 'accepted' && (
                          <Button
                            type="button"
                            onClick={() => {
                              handleUpdateMissionStatus(activeMission.id, 'accepted', undefined, true);
                              alert("Itinerario stradale e guida vocale trasmessi all'App della pattuglia!");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-black uppercase tracking-wider h-11 px-6 shadow-lg border border-indigo-400"
                          >
                            📍 Trasmetti Subito Tragitto su App
                          </Button>
                        )}

                        <Button
                          type="button"
                          onClick={() => setForceNewMission(true)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-black uppercase tracking-wider h-11 px-6 shadow-lg border border-emerald-400"
                        >
                          ➕ Forza Invio Nuova Missione
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            handleUpdateMissionStatus(activeMission.id, 'cancelled');
                            setForceNewMission(true);
                          }}
                          className="bg-red-950/40 border-red-800 text-red-400 hover:bg-red-900/60 rounded-none text-xs font-bold uppercase tracking-wider h-11 px-6"
                        >
                          ❌ Annulla Esistente e Crea Nuova
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setIsMissionDialogOpen(false);
                            setSelectedGuardForMission(null);
                            setSelectedSquadForMission(null);
                            setForceNewMission(false);
                            setNewMission({ address: "", description: "", priority: "medium" });
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-none text-xs font-bold uppercase tracking-wider h-11 px-6"
                        >
                          Chiudi Finestra
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                    {/* INTESTAZIONE TABELLA UFFICIALE (FULL SCREEN TOP BAR) */}
                    <div className="shrink-0 border border-slate-700 bg-slate-900 p-3 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600/30 border border-indigo-500 text-indigo-300">
                          <Navigation className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            NUCLEO VIGILANZA BERTOLUCCI • CENTRALE OPERATIVA (HQ)
                          </div>
                          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                            SCHEDA DI TRASMISSIONE COMANDO MISSIONE OPERATIVA
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 font-mono font-bold">
                              {isSquad ? "SQUADRA PATTUGLIA" : "TABELLA ORIZZONTALE"}
                            </span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 border border-slate-700">
                          <ShieldAlert className="h-5 w-5 text-indigo-400" />
                          <div className="text-left">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pattuglia / Operatore Destinatario</div>
                            <div className="text-sm font-black text-indigo-300 uppercase tracking-wide">
                              {selectedSquadForMission ? (
                                <span>🛡️ {selectedSquadForMission.squadName} ({selectedSquadForMission.members.map(m => m.surname || m.name).join(", ")})</span>
                              ) : selectedGuardForMission ? (
                                <span>{selectedGuardForMission.surname} {selectedGuardForMission.name} {selectedGuardForMission.matricola && <span className="font-mono text-slate-400 ml-1.5">[{selectedGuardForMission.matricola}]</span>}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMissionDialogOpen(false);
                            setSelectedGuardForMission(null);
                            setSelectedSquadForMission(null);
                            setNewMission({ address: "", description: "", priority: "medium", notes: "" });
                          }}
                          className="h-10 px-3 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 hover:text-white rounded-none font-black text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Chiudi Scheda Missione"
                        >
                          <X className="h-5 w-5 shrink-0" />
                          <span className="hidden sm:inline">CHIUDI</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* TABELLA ORIZZONTALE A SCHERMO INTERO PER I 4 DATI */}
                    <div className="flex-1 min-h-0 border border-slate-700 bg-slate-950/80 overflow-y-auto custom-scrollbar my-1">
                      <div className="grid grid-cols-1 lg:grid-cols-12 h-full min-h-[380px] divide-y lg:divide-y-0 lg:divide-x divide-slate-700">
                        
                        {/* CELLA 1: INDIRIZZO & PRIORITÀ (3 COLONNE / 12) */}
                        <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900/40">
                          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between shrink-0">
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                              📍 1. Località & Indirizzo Destinazione
                            </span>
                            <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 font-bold uppercase">Campo Obbligatorio</span>
                          </div>

                          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <Label className="text-xs uppercase font-bold tracking-wider text-slate-200">Indirizzo, Via, N. Civico e Località:</Label>
                              <Input 
                                value={newMission.address} 
                                onChange={e => setNewMission({...newMission, address: e.target.value})}
                                placeholder="Es: Via Roma 10, Massa"
                                className="bg-slate-950 border-slate-700 rounded-none h-12 text-sm text-white focus:border-indigo-500 font-bold"
                              />
                              <p className="text-[10px] text-slate-400 font-mono">
                                🌐 La geolocalizzazione verrà calcolata in automatico dalla centrale sulla Mappa.
                              </p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-800">
                              <Label className="text-xs uppercase font-bold tracking-wider text-slate-200">Priorità Intervento Operativo:</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'low', label: '🟢 BASSA', desc: 'Rientro / Controllo routine' },
                                  { id: 'medium', label: '🟡 MEDIA', desc: 'Sopralluogo standard' },
                                  { id: 'high', label: '🔴 ALTA', desc: 'Segnalazione urgente' },
                                  { id: 'emergency', label: '🚨 URGENTE', desc: 'Intervento immediato' }
                                ].map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setNewMission({...newMission, priority: p.id as any})}
                                    className={`p-2.5 rounded-none text-left transition-all border ${
                                      newMission.priority === p.id 
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                    }`}
                                  >
                                    <div className="text-xs font-black uppercase">{p.label}</div>
                                    <div className="text-[9px] text-slate-300 font-sans mt-0.5 opacity-90">{p.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CELLA 2: SITUAZIONE DICHIARATA / MOTIVO CHIAMATA (5 COLONNE / 12) */}
                        <div className="lg:col-span-5 flex flex-col bg-slate-900/40">
                          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 shrink-0">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                              📋 2. Motivo della Chiamata / Situazione Dichiarata dall'Utente
                            </span>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                            <Label className="text-xs uppercase font-bold tracking-wider text-slate-200">Descrizione Dettagliata dell'Evento / Chiamata:</Label>
                            <Textarea 
                              value={newMission.description} 
                              onChange={e => setNewMission({...newMission, description: e.target.value})}
                              placeholder="Descrivere il motivo dell'intervento, le indicazioni fornite dal richiedente o i dettagli rilevati dalla centrale..."
                              className="bg-slate-950 border-slate-700 rounded-none flex-1 min-h-[180px] text-sm text-white p-3 font-sans resize-none focus:border-amber-500 leading-relaxed"
                            />
                            <div className="text-[10px] text-slate-400 font-mono text-right">
                              Righe testo libere per la pattuglia
                            </div>
                          </div>
                        </div>

                        {/* CELLA 3: ANNOTAZIONI CENTRALE & TTS (3 COLONNE / 12) */}
                        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900/40">
                          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 shrink-0">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                              📝 3. Annotazioni & Vocale TTS
                            </span>
                          </div>

                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5 flex-1 flex flex-col">
                              <Label className="text-xs uppercase font-bold tracking-wider text-slate-200">Note Aggiuntive / Avvertenze:</Label>
                              <Textarea 
                                value={newMission.notes || ""} 
                                onChange={e => setNewMission({...newMission, notes: e.target.value})}
                                placeholder="Esempio: attenzione cane libero in cortile, citofono al primo piano..."
                                className="bg-slate-950 border-slate-700 rounded-none flex-1 min-h-[100px] text-xs text-white p-3 resize-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const textToSpeak = `Centrale Operativa. Nuova missione per ${selectedGuardForMission ? `${selectedGuardForMission.surname} ${selectedGuardForMission.name}` : (selectedSquadForMission?.squadName || "Pattuglia")}. Destinazione: ${newMission.address || "non specificata"}. ${newMission.description || ""}`;
                                  speakMissionTTS(textToSpeak);
                                }}
                                disabled={!newMission.address}
                                className="w-full h-10 bg-indigo-950 hover:bg-indigo-900 border-indigo-600 text-indigo-300 hover:text-white rounded-none text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                              >
                                🔊 Ascolta Anteprima Vocale (TTS)
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenNavigator(newMission.address)}
                                disabled={!newMission.address}
                                className="w-full h-10 bg-blue-950 hover:bg-blue-900 border-blue-600 text-blue-300 hover:text-white rounded-none text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <ExternalLink className="h-4 w-4 shrink-0" /> 🗺️ Test Navigatore GPS
                              </Button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* BARRA AZIONI FISSA IN BASSO SU TUTTA LA LARGHEZZA */}
                    <div className="shrink-0 pt-3 border border-slate-700 bg-slate-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-slate-400 font-mono hidden md:block">
                        📡 TRASMISSIONE IN TEMPO REALE • REGISTRO PROTOCOLLO CENTRALE OPERATIVA
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button 
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setIsMissionDialogOpen(false);
                            setSelectedGuardForMission(null);
                            setNewMission({ address: "", description: "", priority: "medium", notes: "" });
                          }}
                          className="flex-1 sm:flex-none h-12 px-6 rounded-none border-slate-700 bg-slate-950 text-slate-300 hover:text-white font-bold uppercase tracking-wider text-xs"
                        >
                          Annulla
                        </Button>

                        <Button 
                          type="button"
                          onClick={() => handleSendMission(true)}
                          disabled={!newMission.address}
                          className="flex-1 sm:flex-none h-12 px-6 rounded-none bg-emerald-700 hover:bg-emerald-600 font-black uppercase tracking-wider text-xs text-white shadow-lg flex items-center justify-center gap-2 border border-emerald-500"
                          title="Invia missione e apri notifica WhatsApp"
                        >
                          📲 Invia + WhatsApp
                        </Button>

                        <Button 
                          type="button"
                          onClick={() => handleSendMission(false)}
                          disabled={!newMission.address}
                          className="flex-1 sm:flex-none h-12 px-8 rounded-none bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-widest text-xs text-white shadow-xl flex items-center justify-center gap-2 border border-indigo-400 cursor-pointer"
                        >
                          <ShieldAlert className="h-5 w-5 shrink-0" />
                          INVIA MISSIONE OPERATIVA
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}

        {/* NOTIFICA MISSIONE PER LA GUARDIA (GUARD SIDE - SOLO CELLULARE O MODALITÀ OPERATORE) */}
        {(() => {
          const myMat = (currentGuard?.matricola || session?.matricola || "").replace(/\s+/g, "").toUpperCase();
          const sessionName = (session?.name || "").replace(/\s+/g, "").toUpperCase();
          const myNameClean = `${currentGuard?.surname || ""} ${currentGuard?.name || ""}`.replace(/\s+/g, "").toUpperCase();
          const myNameRevClean = `${currentGuard?.name || ""} ${currentGuard?.surname || ""}`.replace(/\s+/g, "").toUpperCase();
          const myId = currentGuard?.id || (session as any)?.id || "";

          const myActiveMissions = missions.filter(m => {
            if (dismissedMissionIds.includes(m.id)) return false;

            const missionMat = (m.guardMatricola || "").replace(/\s+/g, "").toUpperCase();
            const missionNameClean = (m.guardName || "").replace(/\s+/g, "").toUpperCase();
            
            const isMyId = Boolean(myId && m.guardId && (m.guardId === myId || myId.includes(m.guardId) || m.guardId.includes(myId)));
            const isMyMatricola = Boolean(myMat && missionMat && myMat === missionMat);
            const isMyName = Boolean(
              (myNameClean && missionNameClean && (missionNameClean.includes(myNameClean) || myNameClean.includes(missionNameClean))) ||
              (myNameRevClean && missionNameClean && (missionNameClean.includes(myNameRevClean) || myNameRevClean.includes(missionNameClean))) ||
              (sessionName && missionNameClean && (missionNameClean.includes(sessionName) || sessionName.includes(missionNameClean)))
            );

            return (isMyId || isMyMatricola || isMyName) && (m.status === 'pending' || m.status === 'accepted');
          });

          if (myActiveMissions.length === 0) return null;

          return (
            <div className="fixed inset-x-4 top-16 md:inset-x-auto md:top-auto md:bottom-24 md:right-10 md:w-96 z-[99999] animate-in slide-in-from-bottom-10 duration-500 max-h-[85vh] overflow-y-auto">
              {myActiveMissions.map(m => (
                <div key={m.id} className={`p-6 rounded-[32px] border-2 shadow-2xl backdrop-blur-xl mb-4 relative ${
                  m.status === 'pending' ? 'bg-indigo-950/95 border-indigo-400 ring-4 ring-indigo-500/30' : 'bg-slate-950/95 border-emerald-500'
                }`}>
                  <button
                    type="button"
                    onClick={() => setDismissedMissionIds(prev => [...prev, m.id])}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors z-10 cursor-pointer"
                    title="Chiudi / Minimizza notifica"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-4 mb-4 pr-8">
                    <div className={`p-3 rounded-2xl ${m.status === 'pending' ? 'bg-indigo-600' : 'bg-emerald-600'} animate-pulse`}>
                      <ShieldAlert className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-black italic uppercase tracking-widest text-xl">
                          {m.status === 'pending' ? 'NUOVA MISSIONE' : 'MISSIONE ATTIVA'}
                        </h3>
                        {m.priority === 'emergency' && (
                          <div className="bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-bounce uppercase">SOS</div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Assegnata da: {m.assignedByName}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Località / Obiettivo</p>
                      <p className="text-white font-bold text-lg leading-tight">{m.address}</p>
                    </div>
                    
                    {m.description && (
                      <div className="px-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Dettagli</p>
                        <p className="text-slate-200 text-sm italic">{m.description}</p>
                      </div>
                    )}

                    {m.status === 'accepted' && (
                      <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
                          <span>✅ Comando Accettato</span>
                        </div>
                        <p className="text-[11px] text-emerald-200/80 mt-1">Accettazione registrata in Centrale Operativa.</p>
                        {m.routeSent && (
                          <div className="mt-2 bg-blue-900/60 border border-blue-400/50 p-2 rounded-xl text-blue-200 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                            <span>📍 Itinerario stradale sbloccato dalla Centrale!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mb-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenNavigator(m.address)}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" /> 🗺️ AVVIA NAVIGATORE GPS (Google Maps)
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = m.status === 'pending'
                          ? `Centrale Operativa. Nuova disposizione per ${m.address}. Confermare la presa in carico o comunicare motivo del rifiuto.`
                          : `Centrale Operativa. Missione per ${m.address}. ${m.description || ""}`;
                        speakMissionTTS(text);
                      }}
                      className="w-full bg-indigo-900/40 hover:bg-indigo-900/70 border-indigo-500/30 text-indigo-300 rounded-xl h-9 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      🔊 Ascolta Disposizione Vocale (TTS)
                    </Button>
                  </div>

                  {/* AZIONI ACCETTAZIONE / RIFIUTO */}
                  {rejectingMissionId === m.id ? (
                    <div className="bg-red-950/90 border border-red-500/60 p-4 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-red-300">Motivo del Rifiuto (Obbligatorio)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingMissionId(null);
                            setRejectionReasonText("");
                          }}
                          className="text-slate-400 hover:text-white text-xs font-bold"
                        >
                          Annulla
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          "Impegnati in altro intervento di emergenza",
                          "Guasto / anomalia al mezzo di servizio",
                          "Soccorso animale / rilievo in corso",
                          "Pattuglia fuori zona di intervento"
                        ].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setRejectionReasonText(opt)}
                            className={`text-left text-[11px] p-2 rounded-xl border font-bold transition-all ${
                              rejectionReasonText === opt 
                                ? 'bg-red-600 text-white border-red-400' 
                                : 'bg-black/40 text-red-200 border-red-900/50 hover:bg-red-900/40'
                            }`}
                          >
                            • {opt}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={rejectionReasonText}
                        onChange={(e) => setRejectionReasonText(e.target.value)}
                        placeholder="Oppure scrivi una motivazione dettagliata..."
                        className="w-full bg-black/60 border border-red-800/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 resize-none h-16"
                      />

                      <Button
                        type="button"
                        onClick={() => {
                          if (!rejectionReasonText.trim()) {
                            alert("Fornisci una motivazione per il rifiuto del comando.");
                            return;
                          }
                          handleUpdateMissionStatus(m.id, 'rejected', rejectionReasonText.trim());
                          speakMissionTTS("Disposizione rifiutata. Motivazione trasmessa alla Centrale Operativa.");
                          setRejectingMissionId(null);
                          setRejectionReasonText("");
                        }}
                        className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs rounded-xl shadow-lg cursor-pointer"
                      >
                        🚨 CONFERMA RIFIUTO COMANDO
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {m.status === 'pending' ? (
                        <>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setRejectingMissionId(m.id);
                              setRejectionReasonText("");
                            }}
                            className="flex-1 h-13 bg-red-950/40 border-red-900/60 text-red-400 hover:bg-red-900/50 rounded-2xl font-bold uppercase tracking-wider text-[11px]"
                          >
                            Rifiuta
                          </Button>
                          <Button 
                            onClick={() => {
                              handleUpdateMissionStatus(m.id, 'accepted');
                              speakMissionTTS("Comando preso in carico. In attesa dell'itinerario dalla Centrale Operativa.");
                            }}
                            className="flex-[2] h-13 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                          >
                            Accetta Comando
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleUpdateMissionStatus(m.id, 'completed')}
                            className="w-full h-13 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                          >
                            Completata
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* PANNELLO CONTROLLO MISSIONI DELLA CENTRALE (PC/ADMIN SIDE) */}
        {(isAdmin || isResponsabile) && missions.some(m => (m.status === 'pending' || m.status === 'accepted' || m.status === 'rejected') && !dismissedMissionIds.includes(m.id)) && (
          <div className="fixed top-24 right-6 left-6 md:left-auto md:right-10 md:w-[420px] z-[9999] space-y-3 max-h-[80vh] overflow-y-auto">
            {missions.filter(m => (m.status === 'pending' || m.status === 'accepted' || m.status === 'rejected') && !dismissedMissionIds.includes(m.id)).map(m => {
              const guard = guards.find(g => g.id === m.guardId) || null;
              const privateInfo = guardPrivateInfoMap[m.guardId];
              const phone = privateInfo?.cellulare || privateInfo?.phone || guard?.phone || "";
              const isPending = m.status === 'pending';
              const isRejected = m.status === 'rejected';
              const isAccepted = m.status === 'accepted';
              
              return (
                <div key={m.id} className={`p-5 rounded-3xl border-2 shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative ${
                  isRejected ? 'bg-red-950 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)] ring-4 ring-red-500/20' :
                  isPending ? 'bg-slate-900 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.25)]' : 
                  'bg-emerald-950 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setDismissedMissionIds(prev => [...prev, m.id]);
                      if (m.status === 'rejected') {
                        handleUpdateMissionStatus(m.id, 'cancelled');
                      }
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors z-10 cursor-pointer"
                    title="Chiudi / Archivia notifica"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-3 mb-3 pr-8">
                    <div className={`p-2.5 rounded-2xl ${
                      isRejected ? 'bg-red-600 text-white' :
                      isPending ? 'bg-amber-500 text-slate-950' : 
                      'bg-emerald-500 text-slate-950'
                    } font-black animate-pulse`}>
                      {isRejected ? '🚨' : isPending ? '⏳' : '✅'}
                    </div>
                    <div className="flex-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isRejected ? 'text-red-300 bg-red-900/80 border border-red-500/40' :
                        isPending ? 'text-amber-300 bg-amber-950/80 border border-amber-500/30' : 
                        'text-emerald-300 bg-emerald-900/80 border border-emerald-500/30'
                      }`}>
                        {isRejected ? 'MISSIONE RIFIUTATA' : isPending ? 'IN ATTESA SU APP' : 'COMANDO CONFERMATO'}
                      </span>
                      <h4 className="text-white font-black uppercase tracking-tight text-base mt-1">
                        {m.guardName}
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-2 bg-black/40 p-3 rounded-xl border border-white/10">
                    Destinazione: <strong className="text-white">{m.address}</strong>
                  </p>

                  {isRejected && (
                    <div className="mb-3 bg-red-900/50 border border-red-500/50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-black text-red-300 mb-0.5">Motivo dichiarato del Rifiuto:</p>
                      <p className="text-xs font-bold text-white italic">"{m.rejectionReason || "Nessuna motivazione specificata"}"</p>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="mb-3 flex items-center justify-between bg-emerald-900/40 border border-emerald-500/30 p-2.5 rounded-xl text-[11px]">
                      <span className="text-emerald-300 font-bold">Stato Itinerario:</span>
                      <span className="font-bold text-white">
                        {m.routeSent ? "📍 Inviato su App (Vocale)" : "⏳ In attesa invio"}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenNavigator(m.address)}
                      className="h-10 bg-blue-950/40 border-blue-700/60 text-blue-300 hover:bg-blue-900/60 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> 🗺️ Navigatore GPS
                    </Button>

                    {isRejected ? (
                      <div className="flex gap-2 flex-1">
                        <Button
                          type="button"
                          onClick={() => {
                            handleUpdateMissionStatus(m.id, 'cancelled');
                            setNewMission({ address: m.address, description: m.description, priority: m.priority || "medium" });
                            setIsMissionDialogOpen(true);
                          }}
                          className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[10px] rounded-xl"
                        >
                          🔄 Riassegna Squadra
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            handleUpdateMissionStatus(m.id, 'cancelled');
                            setDismissedMissionIds(prev => [...prev, m.id]);
                          }}
                          className="h-10 px-3 bg-red-900/60 hover:bg-red-800 border border-red-500/50 text-red-200 font-bold uppercase tracking-wider text-[10px] rounded-xl cursor-pointer"
                          title="Archivia e rimuovi definitivamente questa notifica di rifiuto"
                        >
                          ❌ Archivia Rifiuto
                        </Button>
                      </div>
                    ) : isPending ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateMissionStatus(m.id, 'cancelled')}
                          className="flex-1 h-10 bg-red-950/30 border-red-900/50 text-red-400 hover:bg-red-900/40 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                        >
                          Annulla Comando
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={() => {
                            handleUpdateMissionStatus(m.id, 'accepted', undefined, true);
                            alert("Itinerario stradale trasmesso all'App della pattuglia! Il dispositivo emetterà la guida vocale.");
                          }}
                          className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-1 shadow-lg cursor-pointer"
                          title="Trasmetti itinerario e guida vocale direttamente all'App cellulare della pattuglia"
                        >
                          📍 Invia Tragitto su App
                        </Button>
                        <Button
                          onClick={() => {
                            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(m.address)}&travelmode=driving`;
                            const msg = `*NUCLEO VIGILANZA BERTOLUCCI* 🛡️\n\n` +
                              `✅ *COMANDO ACCETTATO - ITINERARIO OPERATIVO*\n\n` +
                              `• *Operatore:* ${m.guardName}\n` +
                              `• *Obiettivo:* ${m.address}\n\n` +
                              `📍 *AVVIA NAVIGAZIONE GPS STRADALE:*\n` +
                              `Tocca il link qui sotto dal tuo cellulare per aprire direttamente Google Maps e avviare il tragitto:\n` +
                              `${mapsUrl}\n\n` +
                              `_Al termine del servizio o arrivati sull'obiettivo premi il tasto "Completata" sull'App._`;
                            openWhatsApp(phone, msg);
                          }}
                          className="h-10 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black uppercase tracking-wider text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-lg cursor-pointer"
                        >
                          📲 WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateMissionStatus(m.id, 'completed')}
                          className="h-10 px-3 border-emerald-500/40 hover:bg-emerald-900/50 text-emerald-300 rounded-xl text-[10px] font-bold uppercase"
                          title="Chiudi o Segna come Completata"
                        >
                          Completata
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* MODALI E DIALOGHI OPERATIVI MONTATI */}
        <VerbalisticaSelectorDialog
          open={isVerbalisticaSelectorOpen}
          onOpenChange={setIsVerbalisticaSelectorOpen}
          activeSector={activeSector || "zoofila"}
          onSelectSopralluogo={() => {
            setIsVerbalisticaSelectorOpen(false);
            setIsVerbaleDialogOpen(true);
          }}
          onSelectServiceReport={(selectedSector) => {
            setIsVerbalisticaSelectorOpen(false);
            const sec = selectedSector === "ambiente" ? "ambientale" : (selectedSector as any);
            const targetSec = sec || activeSector || "zoofila";
            setActiveSector(targetSec);
            let sectorLabel: any = "GUARDIA ZOOFILA";
            if (targetSec === "ittica") sectorLabel = "GUARDIA ITTICA";
            else if (targetSec === "venatoria") sectorLabel = "GUARDIA VENATORIA";
            else if (targetSec === "ambientale") sectorLabel = "GUARDIA AMBIENTALE";
            setNewServiceReport(prev => ({
              ...prev,
              settore: [sectorLabel]
            }));
            setActiveAdminTab("service_reports");
            setIsAddingServiceReport(true);
          }}
          onSelectTerritoryControl={() => {
            setIsVerbalisticaSelectorOpen(false);
            setIsAddingTerritoryControl(true);
          }}
          onSelectSanzione={(selectedSector) => {
            setIsVerbalisticaSelectorOpen(false);
            if (selectedSector) {
              const sec = selectedSector === "ambiente" ? "ambientale" : (selectedSector as any);
              setActiveSector(sec);
            }
            setIsVerbaleSanzioneDialogOpen(true);
          }}
          onSelectRapidReport={() => {
            setIsVerbalisticaSelectorOpen(false);
            setIsAddingReport(true);
          }}
        />

        <VerbaleAIDialog
          open={isVerbaleDialogOpen}
          onOpenChange={setIsVerbaleDialogOpen}
          onSave={saveReportFromAI}
          reports={reports}
          guards={guards}
          currentGuard={currentGuard}
          noTrigger
        />

        <VerbaleSanzioneDialog
          open={isVerbaleSanzioneDialogOpen}
          onOpenChange={setIsVerbaleSanzioneDialogOpen}
          currentGuard={currentGuard}
          sanctionReports={sanctionReports}
          activeSector={activeSector}
          guards={guards}
          initialContestazioneTipo={verbaleSanzioneInitialMode}
          onSuccess={() => setIsVerbaleSanzioneDialogOpen(false)}
        />

        <ControlloTerritorioDialog
          open={isAddingTerritoryControl}
          onOpenChange={setIsAddingTerritoryControl}
          currentGuard={currentGuard}
          territoryControls={territoryControls}
          onSuccess={() => setIsAddingTerritoryControl(false)}
        />

        <ArchivioTurniDialog
          isOpen={isArchivioTurniOpen}
          onClose={() => setIsArchivioTurniOpen(false)}
          shifts={shifts}
          guards={guards}
        />

        <OperatoGuardieDialog
          isOpen={isOperatoGuardieOpen}
          onClose={() => setIsOperatoGuardieOpen(false)}
          guards={guards}
          reports={reports}
          serviceReports={serviceReports}
          territoryControls={territoryControls}
        />

        <ManualModal
          open={showManual}
          onOpenChange={setShowManual}
          handlePrint={() => window.print()}
        />

        <PendingDocumentsDialog
          open={isPendingDocumentsOpen}
          onOpenChange={setIsPendingDocumentsOpen}
          pendingDocuments={pendingDocuments}
          setPendingDocuments={setPendingDocuments}
          isTransmitting={isTransmitting}
          transmitPendingDocument={transmitPendingDocument}
        />

        <AcquisizioneAttiDialog
          open={isAcquisizioneAttiOpen}
          onOpenChange={setIsAcquisizioneAttiOpen}
          onOpenVerbaleScanner={() => {
            setIsAcquisizioneAttiOpen(false);
            setIsVerbaleDialogOpen(true);
          }}
          onOpenCanineSingleScanner={() => {
            setIsAcquisizioneAttiOpen(false);
            setActiveAdminTab("animalia");
            setIsAdminPortalOpen(true);
          }}
          onOpenCanineBulkScanner={() => {
            setIsAcquisizioneAttiOpen(false);
            setActiveAdminTab("animalia");
            setIsAdminPortalOpen(true);
          }}
          onOpenArchivioHQ={() => {
            setIsAcquisizioneAttiOpen(false);
            setActiveAdminTab("verbali");
            setIsAdminPortalOpen(true);
          }}
        />

        <MicrochipLookupModal
          open={isMicrochipLookupOpen}
          onOpenChange={setIsMicrochipLookupOpen}
          hideTrigger={true}
          userEmail={currentGuard?.email || user?.email || auth.currentUser?.email || "operatore@guardieambientali.it"}
          userName={currentGuard ? `${currentGuard.surname || ""} ${currentGuard.name || ""}`.trim() : (user?.displayName || "Operatore")}
          userMatricola={currentGuard?.matricola}
          isLoggedIn={Boolean(user || currentGuard)}
        />

        <VehicleLogDialog
          open={isAddingVehicleLog}
          onOpenChange={setIsAddingVehicleLog}
          vehicleLogForm={vehicleLogForm}
          setVehicleLogForm={setVehicleLogForm}
          handleSubmitVehicleLog={handleSubmitVehicleLog}
          vehicles={vehicles}
        />

        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          user={user}
          currentGuard={currentGuard}
          initialMode={backupModalMode}
        />

        {/* MODALE MACRO-AREA: 📝 MODULISTICA */}
        {isMacroModulisticaOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>📝 MODULISTICA ATTI & VERBALI</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold uppercase">
                        Compilazione
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Seleziona il modulo da redigere: ogni atto si aprirà a tutto schermo per facilitare la compilazione sul campo o da ufficio.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMacroModulisticaOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Cards Grid */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Verbale Sanzionatorio sul Campo */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      setVerbaleSanzioneInitialMode("immediata");
                      setIsVerbaleSanzioneDialogOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/20 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-105 transition-transform shrink-0 border border-rose-500/30">
                      <Scale className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-rose-200 uppercase tracking-wide group-hover:text-white">
                          Verbale Sanzionatorio (Campo)
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-900/60 border border-rose-500/50 text-rose-300 font-bold uppercase">
                          Immediato
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Contestazione immediata al trasgressore per Zoofila (L.R. 59/09), Caccia (L. 157/92), Pesca (R.D. 1604/31) e Ambiente con calcolo automatico sanzione in misura ridotta.
                      </p>
                    </div>
                  </button>

                  {/* Sanzione d'Ufficio Zoofila (Differita) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      setVerbaleSanzioneInitialMode("differita");
                      setIsVerbaleSanzioneDialogOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-rose-600/50 hover:border-rose-400 hover:bg-rose-950/30 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-rose-600/30 text-rose-300 group-hover:scale-105 transition-transform shrink-0 border border-rose-500/40">
                      <Scale className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-rose-200 uppercase tracking-wide group-hover:text-white">
                          Sanzione d'Ufficio (Zoofila)
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-900/80 border border-rose-400 text-rose-200 font-bold uppercase">
                          D'Ufficio / Differita
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Emissione d'ufficio da Centrale HQ con contestazione differita (art. 14 L. 689/81) per tensioni sul campo, motivi di sicurezza o rilievi anagrafici successivi.
                      </p>
                    </div>
                  </button>

                  {/* Verbale di Sopralluogo */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      setIsVerbaleDialogOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/20 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform shrink-0 border border-indigo-500/30">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-indigo-200 uppercase tracking-wide group-hover:text-white">
                          Verbale di Sopralluogo
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-500/50 text-indigo-300 font-bold uppercase">
                          1° & 2° Controllo
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Accertamento benessere animale, detenzione, prescrizioni ad horas, verifica ottemperanza e accorpamento nella Cartella Unica d'intervento.
                      </p>
                    </div>
                  </button>

                  {/* Relazione di Servizio */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      const today = new Date().toISOString().split("T")[0];
                      const guardLabel = currentGuard
                        ? `${currentGuard.surname || ""} ${currentGuard.name || ""} (Matr. ${currentGuard.matricola || "-"})`.trim()
                        : "";
                      setNewServiceReport((prev) => ({
                        ...prev,
                        data: prev?.data || today,
                        guardia1: prev?.guardia1 || guardLabel,
                        guardie: prev?.guardie || guardLabel,
                        provincia: prev?.provincia || "MS",
                        veicoloProprieta: prev?.veicoloProprieta || "EKOCLUB",
                      }));
                      setActiveAdminTab("service_reports");
                      setIsAddingServiceReport(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/20 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0 border border-emerald-500/30">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-emerald-200 uppercase tracking-wide group-hover:text-white">
                          Relazione di Servizio
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 font-bold uppercase">
                          Ufficiale
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Compilazione del rapporto ufficiale di turno di servizio: orari, pattuglia, itinerario, controlli svolti ed eventi salienti.
                      </p>
                    </div>
                  </button>

                  {/* Registro Controlli Territoriali Rapido */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      setIsAddingTerritoryControl(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/20 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform shrink-0 border border-cyan-500/30">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-cyan-200 uppercase tracking-wide group-hover:text-white">
                          Controllo Rapido Territorio
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 font-bold uppercase">
                          A4 Landscape
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Registrazione rapida di cani controllati, microchip, pescatori o cacciatori (per il foglio orizzontale stile Excel a stampa continua).
                      </p>
                    </div>
                  </button>

                  {/* Missioni & Ordini di Servizio */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      setActiveAdminTab("centrale_operativa");
                      setCentraleSubTab("missions_register");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/20 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0 border border-amber-500/30">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-amber-200 uppercase tracking-wide group-hover:text-white">
                          Ordini di Servizio & Missioni
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-500/50 text-amber-300 font-bold uppercase">
                          C.O.E.T.A.
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Assegnazione ordini operativi alle squadre in pattuglia sul territorio con coordinate GPS e istruzioni di ingaggio.
                      </p>
                    </div>
                  </button>

                  {/* Segnalazione Ambientale Rapida */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroModulisticaOpen(false);
                      setIsAddingReport(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-orange-500/40 hover:border-orange-400 hover:bg-orange-950/20 text-left transition-all group flex items-start gap-3.5 shadow-md cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 group-hover:scale-105 transition-transform shrink-0 border border-orange-500/30">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-orange-200 uppercase tracking-wide group-hover:text-white">
                          Segnalazione Ambientale Rapida
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-900/60 border border-orange-500/50 text-orange-300 font-bold uppercase">
                          GPS & Foto
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Rilevamento immediato con fotocamera e coordinate geolocalizzate per discariche abusive, carcasse o pericoli imminenti.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODALE MACRO-AREA: 📂 ARCHIVI */}
        {isMacroArchiviOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <HardDrive className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>📂 ARCHIVI & REGISTRI CENTRALI</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                        Consultazione
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tutti gli archivi e i registri ufficiali centralizzati: visualizzazione a tutto schermo con ricerca, filtri e stampe A4.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMacroArchiviOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Cards Grid */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Verbali & Dossier Completo */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("reports");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform shrink-0 border border-purple-500/30">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-purple-200 uppercase tracking-wide group-hover:text-white">
                          Verbali & Cartella Unica
                        </h4>
                        {countNewReports() > 0 && (
                          <span className="px-1.5 py-0.2 bg-purple-500 text-[9px] text-white font-bold rounded-full">
                            {countNewReports()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Fascicolo unico 1° e 2° sopralluogo, sanzioni amministrative, allegati fotografici e stampa A4.
                      </p>
                    </div>
                  </button>

                  {/* Relazioni di Servizio */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("service_reports");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0 border border-emerald-500/30">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-emerald-200 uppercase tracking-wide group-hover:text-white">
                        Relazioni di Servizio
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Raccolta cronologica dei rapporti di servizio redatti da tutte le pattuglie con filtri e stampe.
                      </p>
                    </div>
                  </button>

                  {/* Registro Controlli A4 Landscape */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("stats");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform shrink-0 border border-cyan-500/30">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-cyan-200 uppercase tracking-wide group-hover:text-white">
                        Controlli A4 Landscape
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Registro orizzontale a foglio continuo stile Excel con intestazione del Comune e azzeramento spreco carta.
                      </p>
                    </div>
                  </button>

                  {/* Banca Dati Microchip */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("microchip");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0 border border-amber-500/30">
                      <PawPrint className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-amber-200 uppercase tracking-wide group-hover:text-white">
                        Anagrafe Canina Microchip
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Ricerca rapida cani censiti, numeri microchip, nominativi proprietari e recapiti telefonici.
                      </p>
                    </div>
                  </button>

                  {/* Turni & Servizi */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("shifts");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/40 hover:border-blue-400 hover:bg-blue-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform shrink-0 border border-blue-500/30">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-blue-200 uppercase tracking-wide group-hover:text-white">
                          Calendario Turni & Servizi
                        </h4>
                        {shifts.filter((s) => s.status === "pending").length > 0 && (
                          <span className="px-1.5 py-0.2 bg-amber-500 text-[9px] text-slate-950 font-black rounded-full">
                            {shifts.filter((s) => s.status === "pending").length}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Pianificazione orari, settori operativi, presidi e autorizzazione turni dei responsabili.
                      </p>
                    </div>
                  </button>

                  {/* Reperibilità & SOS */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("sos_rotation");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/40 hover:border-red-400 hover:bg-red-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 group-hover:scale-105 transition-transform shrink-0 border border-red-500/30">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-red-200 uppercase tracking-wide group-hover:text-white">
                        Reperibilità & SOS
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Turni di pronta disponibilità per emergenze notturne e festive, rotazione e allarmi SOS.
                      </p>
                    </div>
                  </button>

                  {/* Parco Mezzi & Veicoli */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("vehicles");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform shrink-0 border border-indigo-500/30">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-indigo-200 uppercase tracking-wide group-hover:text-white">
                        Parco Mezzi & Veicoli
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Stato autovetture di servizio, diario di bordo chilometrico, rifornimenti e manutenzioni.
                      </p>
                    </div>
                  </button>

                  {/* Anagrafica Guardie & Decreti */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("guards");
                      setSubTabGuards("personnel");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-sky-500/40 hover:border-sky-400 hover:bg-sky-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform shrink-0 border border-sky-500/30">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-sky-200 uppercase tracking-wide group-hover:text-white">
                        Anagrafica & Decreti
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Fascicoli personali delle guardie, matricole, settori (Zoofila, Ittica, Caccia) e scadenze prefettizie.
                      </p>
                    </div>
                  </button>

                  {/* Bacheca Atti Offline */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroArchiviOpen(false);
                      setActiveAdminTab("pending_documents");
                    }}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-amber-600/40 hover:border-amber-400 hover:bg-amber-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0 border border-amber-600/30">
                      <FileUp className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-amber-200 uppercase tracking-wide group-hover:text-white">
                        Bacheca Atti Offline
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Buffer locale per verbali e relazioni salvate senza connessione internet, in attesa di sincronizzazione.
                      </p>
                    </div>
                  </button>

                  {/* Backup USB & Reset (Admin) */}
                  {(isAdmin || isResponsabile) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMacroArchiviOpen(false);
                        setIsBackupModalOpen(true);
                      }}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-600/40 hover:border-cyan-400 hover:bg-cyan-950/20 text-left transition-all group flex items-start gap-3 shadow-md cursor-pointer col-span-1 md:col-span-2 lg:col-span-3"
                    >
                      <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 group-hover:scale-105 transition-transform shrink-0 border border-cyan-600/30">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-black text-cyan-200 uppercase tracking-wide group-hover:text-white">
                            💾 Backup USB, Ripristino & Reset Collaudo
                          </h4>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                            Admin HQ
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Esportazione file JSON per chiavetta USB, ripristino dati e pulizia selettiva delle simulazioni di test.
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODALE MACRO-AREA: 🔬 SEZIONE FORENSE & P.G. */}
        {isMacroForenseOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-purple-500/50 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🔬 SEZIONE FORENSE & POLIZIA GIUDIZIARIA</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold uppercase">
                        Riservato
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Rilievi probatori ai sensi dell'art. 354 c.p.p., analisi metadati EXIF, hash SHA-256 e audit trail riservato.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMacroForenseOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Cards Grid */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Centrale Forense Scientifica HQ */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroForenseOpen(false);
                      setActiveAdminTab("centrale_operativa");
                      setCentraleSubTab("forensics");
                    }}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-950/20 text-left transition-all group flex items-start gap-4 shadow-xl cursor-pointer"
                  >
                    <div className="p-3.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform shrink-0 border border-purple-500/30">
                      <Camera className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-purple-200 uppercase tracking-wide group-hover:text-white">
                          Centrale Forense HQ
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/50 text-purple-300 font-bold uppercase">
                          Art. 354 c.p.p.
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Analisi scientifica reperti (bocconi avvelenati, carcasse, lesioni), estrazione metadati EXIF, calcolo impronta crittografica SHA-256 probatoria e verbale peritale AI multidisciplinare.
                      </p>
                    </div>
                  </button>

                  {/* Area Riservata (Black Box PG) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMacroForenseOpen(false);
                      setActiveAdminTab("black_box");
                    }}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-yellow-500/40 hover:border-yellow-400 hover:bg-yellow-950/20 text-left transition-all group flex items-start gap-4 shadow-xl cursor-pointer"
                  >
                    <div className="p-3.5 rounded-xl bg-yellow-500/20 text-yellow-400 group-hover:scale-105 transition-transform shrink-0 border border-yellow-500/30">
                      <DatabaseZap className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-yellow-200 uppercase tracking-wide group-hover:text-white">
                          Area Riservata (Black Box)
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-900/60 border border-yellow-500/50 text-yellow-300 font-bold uppercase">
                          Sicurezza
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Registro immodificabile di sicurezza, audit trail delle cancellazioni e accessi riservati di Polizia Giudiziaria.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


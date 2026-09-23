import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  arrayUnion 
} from "firebase/firestore";
import { db, sanitizeFirestorePayload } from "../lib/firebase";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";
import { 
  PhoneCall, 
  Phone, 
  MapPin, 
  Activity, 
  User, 
  Clock, 
  Calendar as CalendarIcon, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Check,
  AlertTriangle, 
  Printer, 
  Radio, 
  PlusCircle, 
  X, 
  FileText, 
  Navigation,
  ExternalLink,
  Users,
  Video,
  ShieldAlert,
  Eye,
  EyeOff,
  Send,
  MessageSquare,
  Settings2,
  Sliders,
  Play,
  Pause,
  Camera,
  Mail,
  FileSignature,
  History,
  Scale,
  FileWarning,
  CloudSun,
  Leaf,
  Heart,
  Compass,
  Maximize2,
  Minimize2,
  Crosshair,
  Monitor,
  Layers,
  Sparkles,
  FolderOpen,
  Fish,
  Trees
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents, Polyline } from "react-leaflet";
import L from "leaflet";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { VideoCallDialog } from "./VideoCallDialog";
import { AudioCallRecorder, AudioRecordData } from "./AudioCallRecorder";
import { ArchivioChiamateDossierView } from "./ArchivioChiamateDossierView";
import { cn } from "@/lib/utils";





const safeFormatDate = (dateVal: any, pattern: string, fallback: string = "N.D."): string => {
  if (!dateVal) return fallback;
  try {
    let d: Date;
    if (typeof dateVal === 'string') {
      d = parseISO(dateVal);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else if (typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else {
      d = new Date(dateVal);
    }
    
    if (isNaN(d.getTime())) {
      return fallback;
    }
    return format(d, pattern, { locale: it });
  } catch (e) {
    console.error("Errore formattazione data:", dateVal, e);
    return fallback;
  }
};

interface AuditEvent {
  timestamp: string;
  operatorMatricola: string;
  operatorName: string;
  action: string;
}

import { Guard, UsefulContact, Mission, EmergencyCall, AudioRecordItem, DossierIntegrationEvent } from "../types";

// Map Event Listener for picking coordinates
const MapClickEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to dynamically manage map lifecycle, bounds and resize invalidation without fighting user zoom
const MapController = ({ 
  bounds, 
  onMapReady 
}: { 
  bounds: [[number, number], [number, number]]; 
  onMapReady: (map: L.Map) => void;
}) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.setMaxBounds(bounds);
    }
    onMapReady(map);

    // Initial immediate invalidation
    map.invalidateSize();

    // Multi-stage progressive invalidation to guarantee full tile rendering
    // across container layout calculations, CSS transitions, and tab switches
    const timeouts = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
      setTimeout(() => map.invalidateSize(), 1000),
      setTimeout(() => map.invalidateSize(), 1500),
    ];

    // ResizeObserver on the container DOM element so Leaflet dynamically catches exact pixel dimensions
    const container = map.getContainer();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      timeouts.forEach(clearTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [map, bounds, onMapReady]);
  return null;
};

const getTakeChargeTimeLocal = (call: EmergencyCall) => {
  const event = call.auditTrail?.find(
    ev => ev.action?.toLowerCase().includes("assegnata") || 
          ev.action?.toLowerCase().includes("pattuglia")
  );
  if (event && event.timestamp) {
    try {
      const dt = new Date(event.timestamp);
      return dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    } catch {
      // ignore
    }
  }
  if (call.createdAt) {
    try {
      const dt = new Date(call.createdAt);
      return dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    } catch {
      // ignore
    }
  }
  return "";
};

export const CentraleOperativaTab = ({
  guards,
  shifts,
  contacts,
  user,
  currentGuard,
  missions = [],
  initialSubTab,
  isRadarMonitorOnly = false,
  onOpenVerbaleSanzione,
}: {
  guards: Guard[];
  shifts: any[];
  contacts: UsefulContact[];
  user: any;
  currentGuard: any;
  missions?: Mission[];
  initialSubTab?: "radar" | "forensics" | "missions_register" | "osint";
  isRadarMonitorOnly?: boolean;
  onOpenVerbaleSanzione?: () => void;
}) => {
  // Current operator identity for Audit Trail
  const operatorName = `${currentGuard?.surname || ""} ${currentGuard?.name || ""}`.trim() || user?.email || "Operatore Sede";
  const operatorMatricola = currentGuard?.matricola || "HQ-OP";

  // State declaration
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<EmergencyCall | null>(null);
  const [isDossierArchiveOpen, setIsDossierArchiveOpen] = useState(false);

  // Modal Pulisci Simulazioni / Test Mappa
  const [isCleanSimulationsModalOpen, setIsCleanSimulationsModalOpen] = useState(false);
  const [selectedCleanIds, setSelectedCleanIds] = useState<string[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);

  // Form State
  const [selectedSector, setSelectedSector] = useState<"zoofila" | "ittica" | "venatoria" | "ambientale">("zoofila");
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [comune, setComune] = useState("");
  const [localita, setLocalita] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"bassa" | "media" | "alta" | "emergenza">("media");
  const [assignedGuardId, setAssignedGuardId] = useState("");
  const [notes, setNotes] = useState("");
  const [customDateTime, setCustomDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isNonUrgentForm, setIsNonUrgentForm] = useState(false); // Flag se la nuova chiamata è differibile / non urgente (SLA 5gg)
  const [isNonUrgentModalOpen, setIsNonUrgentModalOpen] = useState(false); // Apertura finestra gestione interventi 5 giorni / Da Fare

  // Draggable Intake Form State (aperto al click del pulsante Nuova Richiesta)
  const [formPos, setFormPos] = useState({ x: 20, y: 70 });
  const [isFormMinimized, setIsFormMinimized] = useState(false);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // State for drop-down contacts tracker
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedContactObj, setSelectedContactObj] = useState<UsefulContact | null>(null);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

  // Video Call State
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [targetVideoGuard, setTargetVideoGuard] = useState<Guard | null>(null);

  // Full Screen Map State
  const [isFullScreenMap, setIsFullScreenMap] = useState(() => isRadarMonitorOnly);

  // Hidden call markers state (allows hiding specific pins from the map while keeping them in the list)
  const [hiddenCallMarkerIds, setHiddenCallMarkerIds] = useState<string[]>([]);
  const [pendingRequestGuardIdByCall, setPendingRequestGuardIdByCall] = useState<Record<string, string>>({});

  // Funzioni gestione ed eliminazione simulazioni / chiamate di prova
  const handleDeleteCallDirect = async (callId: string) => {
    if (!window.confirm("Vuoi eliminare DEFINITIVAMENTE questa chiamata/simulazione da Firestore?\nIl bersaglio verrà rimosso per sempre dalla mappa.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "emergency_calls", callId));
      setCalls(prev => prev.filter(c => c.id !== callId));
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    }
  };

  const handleResolveCallDirect = async (callId: string) => {
    try {
      await updateDoc(doc(db, "emergency_calls", callId), { status: "risolto" });
      setCalls(prev => prev.map(c => c.id === callId ? { ...c, status: "risolto" } : c));
    } catch (err: any) {
      alert("Errore durante l'archiviazione: " + err.message);
    }
  };

  const handlePurgeSelectedCalls = async () => {
    if (selectedCleanIds.length === 0) {
      alert("Nessun elemento selezionato per l'eliminazione.");
      return;
    }
    if (!window.confirm(`Vuoi eliminare definitivamente ${selectedCleanIds.length} elementi di prova/simulazione da Firestore?\nQuesta azione non può essere annullata.`)) {
      return;
    }
    setIsCleaning(true);
    try {
      for (const id of selectedCleanIds) {
        await deleteDoc(doc(db, "emergency_calls", id));
      }
      setCalls(prev => prev.filter(c => !selectedCleanIds.includes(c.id)));
      setSelectedCleanIds([]);
      alert(`✓ ${selectedCleanIds.length} simulazioni eliminate con successo dalla mappa e dal database!`);
      setIsCleanSimulationsModalOpen(false);
    } catch (err: any) {
      alert("Errore durante l'eliminazione batch: " + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handlePurgeAllTestCalls = async () => {
    const testCalls = calls.filter(c => {
      const text = `${c.callerName || ""} ${c.description || ""} ${c.notes || ""} ${c.localita || ""}`.toLowerCase();
      return text.includes("test") || text.includes("prova") || text.includes("simula");
    });

    if (testCalls.length === 0) {
      alert("Nessuna chiamata con dicitura 'Test', 'Prova' o 'Simulazione' trovata nel sistema.");
      return;
    }

    if (!window.confirm(`Trovate ${testCalls.length} chiamate di test/simulazione nel sistema.\nVuoi eliminarle tutte definitivamente da Firestore?`)) {
      return;
    }

    setIsCleaning(true);
    try {
      for (const c of testCalls) {
        await deleteDoc(doc(db, "emergency_calls", c.id));
      }
      const ids = testCalls.map(c => c.id);
      setCalls(prev => prev.filter(c => !ids.includes(c.id)));
      alert(`✓ ${testCalls.length} chiamate di test eliminate con successo!`);
      setIsCleanSimulationsModalOpen(false);
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleResetTempMarkers = () => {
    setLat(undefined);
    setLng(undefined);
    setHiddenCallMarkerIds([]);
    alert("✓ Bersagli temporanei e filtri locali azzerati.");
  };





  // Helper to format Guard name as COGNOME Nome - Matr. [Number]
  const formatGuardOptionName = (g: Guard) => {
    let cognome = (g.surname || g.privateInfo?.surname || "").trim();
    let nome = (g.name || g.privateInfo?.name || "").trim();

    if (!cognome && nome) {
      const parts = nome.split(/\s+/);
      if (parts.length > 1) {
        cognome = parts[parts.length - 1];
        nome = parts.slice(0, -1).join(" ");
      } else {
        cognome = nome;
        nome = "";
      }
    }

    const fullStr = `${cognome.toUpperCase()}${nome ? ` ${nome}` : ""}`.trim();
    const matrStr = g.matricola ? ` - Matr. ${g.matricola}` : "";
    return `${fullStr}${matrStr}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const handle = (e.target as HTMLElement).closest(".drag-handle");
    if (handle) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - formPos.x,
        y: e.clientY - formPos.y,
      });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const handle = (e.target as HTMLElement).closest(".drag-handle");
    if (handle && e.touches[0]) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - formPos.x,
        y: e.touches[0].clientY - formPos.y,
      });
      e.stopPropagation();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setFormPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      setFormPos({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragStart]);

  // UI state filters
  const [callFilter, setCallFilter] = useState<"tutte" | "attive" | "risolte" | "annullate" | "non_urgenti">("attive");
  const [searchTerm, setSearchTerm] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactCategory, setContactCategory] = useState<string>("Tutti");

  // Stato per Modulo Mappa Radar, Analisi Forense AI & Registro Missioni
  const [subTab, setSubTab] = useState<"radar" | "missions_register" | "forensics" | "osint">(
    initialSubTab === "missions_register"
      ? "missions_register"
      : initialSubTab === "forensics"
      ? "forensics"
      : initialSubTab === "osint"
      ? "osint"
      : "radar"
  );

  useEffect(() => {
    if (initialSubTab === "forensics" || initialSubTab === "missions_register" || initialSubTab === "radar") {
      setSubTab(initialSubTab);
    } else if (initialSubTab === "osint") {
      setSubTab("forensics");
    }
  }, [initialSubTab]);

  // Verifica esplicita per autorizzazione Amministratori / Responsabili HQ
  const isAdminOrResponsabile = Boolean(
    user?.role === "admin" || 
    user?.isAdmin || 
    currentGuard?.role === "admin" || 
    currentGuard?.isAdmin || 
    user?.email === "giulianodellapina@gmail.com" || 
    user?.email?.includes("admin") ||
    currentGuard?.isResponsabile ||
    user?.isResponsabile
  );

  const [missionFilter, setMissionFilter] = useState<"all" | "pending" | "accepted" | "completed" | "cancelled">("all");
  const [missionSearch, setMissionSearch] = useState("");

  // Stato Avanzato Modulo Centrale Forense Scientifica & Analisi Reperti (HQ)
  const [forensicImage, setForensicImage] = useState<string | null>(null);
  const [forensicExtraDetails, setForensicExtraDetails] = useState("");
  const [forensicRepertoType, setForensicRepertoType] = useState<string>("Boccone / Esca Avvelenata Sospetta");
  const [forensicComune, setForensicComune] = useState<string>("Massa");
  const [forensicLocalita, setForensicLocalita] = useState<string>("");
  const [forensicSigillo, setForensicSigillo] = useState<string>(() => `SIG-PG-${Math.floor(1000 + Math.random() * 9000)}`);
  const [forensicConservazione, setForensicConservazione] = useState<string>("Freezer / Sotto Zero (-20°C)");
  const [forensicSha256, setForensicSha256] = useState<string>("");
  const [forensicRepertoCode] = useState<string>(() => `REP-2026-MC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forensicResult, setForensicResult] = useState<any | null>(null);
  const [forensicFileMeta, setForensicFileMeta] = useState<any | null>(null);
  const [activeExpertTab, setActiveExpertTab] = useState<string>("veterinary");

  // Coordinate baricentriche e limiti provinciali blindati per Massa-Carrara
  const MASSA_CARRARA_DEFAULT_CENTER: [number, number] = [44.15, 10.05];
  const MASSA_CARRARA_BOUNDS: [[number, number], [number, number]] = [
    [43.95, 9.75],  // Sud-Ovest (costa mare / confine Spezia - Versilia)
    [44.52, 10.35]  // Nord-Est (crinale Appennino Tosco-Emiliano / Cisa / Cerreto)
  ];

  // Map state
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MASSA_CARRARA_DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(11);
  // Selettore livello mappa: 'standard' (OpenStreetMap) o 'satellite' (Esri World Imagery alta risoluzione)
  const [mapLayerType, setMapLayerType] = useState<'standard' | 'satellite'>('standard');

  // Helper per centrare o muovere la mappa in modo reattivo e stabile
  const flyToCoords = (targetCenter: [number, number], targetZoom: number = 14) => {
    setMapCenter(targetCenter);
    setMapZoom(targetZoom);
    if (mapInstance) {
      mapInstance.flyTo(targetCenter, targetZoom, { duration: 1.2 });
    }
  };

  // Apertura istantanea di Google Street View alle coordinate esatte
  const openGoogleStreetView = (latitude: number, longitude: number) => {
    const svUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
    window.open(svUrl, "_blank", "noopener,noreferrer");
  };

  // Apertura Radar dedicato su secondo monitor (solo visuale mappa a schermo intero)
  const handleOpenRadarSecondMonitor = () => {
    const targetUrl = window.location.origin + window.location.pathname + "?view=map_only";
    const newWindow = window.open(targetUrl, "RadarMonitorSecondario", "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no");
    if (!newWindow) {
      alert("La finestra pop-out è stata bloccata dal browser. Autorizza i popup per aprire la mappa sul secondo monitor.");
    }
  };

  const [localTime, setLocalTime] = useState("");

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(format(new Date(), "HH:mm:ss"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch emergency calls from firebase real-time
  useEffect(() => {
    const q = query(collection(db, "emergency_calls"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const callsList: EmergencyCall[] = [];
      snapshot.forEach((doc) => {
        callsList.push({ id: doc.id, ...doc.data() } as EmergencyCall);
      });
      setCalls(callsList);
    });
    return () => unsubscribe();
  }, []);

  // Set selected call for map focus
  const focusCallOnMap = (call: EmergencyCall) => {
    if (call.lat && call.lng) {
      flyToCoords([call.lat, call.lng], 15);
      setSelectedCall(call);
    }
  };

  // Map-click coords handler - only active when intake form is open
  const handleMapClick = (clickLat: number, clickLng: number) => {
    if (!showIntakeForm) return;
    setLat(parseFloat(clickLat.toFixed(6)));
    setLng(parseFloat(clickLng.toFixed(6)));
  };

  // Automated geocoding using OSM Nominatim
  const handleGeocodeAddress = async () => {
    if (!comune && !localita) {
      alert("Inserisci almeno il Comune o la Località per poter geolocalizzare l'intervento.");
      return;
    }
    
    setIsGeocoding(true);
    try {
      // Prioritize searching within Massa-Carrara province
      const queryStr = `${localita}, ${comune}, Massa-Carrara, Toscana, Italia`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        setLat(foundLat);
        setLng(foundLng);
        flyToCoords([foundLat, foundLng], 16);
        alert(`Indirizzo identificato con successo!\nCoordinate: ${foundLat.toFixed(6)}, ${foundLng.toFixed(6)}\nMappa riposizionata.`);
      } else {
        // Broad search fallback
        const secondaryQueryStr = `${localita}, ${comune}, Italia`;
        const resp2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(secondaryQueryStr)}&limit=1`);
        const data2 = await resp2.json();
        
        if (data2 && data2.length > 0) {
          const foundLat = parseFloat(data2[0].lat);
          const foundLng = parseFloat(data2[0].lon);
          setLat(foundLat);
          setLng(foundLng);
          flyToCoords([foundLat, foundLng], 16);
          alert(`Indirizzo identificato (ricerca allargata)!\nCoordinate: ${foundLat.toFixed(6)}, ${foundLng.toFixed(6)}\nMappa riposizionata.`);
        } else {
          alert("Impossibile trovare le coordinate precise per questo indirizzo. Verrà mantenuto il punto predefinito o puoi cliccare direttamente sulla mappa per posizionare il segnaposto manuale.");
        }
      }
    } catch (err: any) {
      alert("Errore di rete durante la geolocalizzazione: " + err.message);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Retrieve selected guard name and phone
  const selectedGuardObj = useMemo(() => {
    if (!assignedGuardId) return null;
    return guards.find(g => g.id === assignedGuardId);
  }, [assignedGuardId, guards]);

  const guardName = selectedGuardObj 
    ? `${selectedGuardObj.surname || ""} ${selectedGuardObj.name || ""}`.trim() 
    : "";
  const guardPhone = selectedGuardObj?.privateInfo?.cellulare || selectedGuardObj?.phone || "N.D.";

  // Submit Call Draft
  const handleCreateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerName || !localita) {
      alert("Errore: Inserire nome del richiedente e località d'intervento!");
      return;
    }

    let finalLat = lat;
    let finalLng = lng;

    // Automated geocoding fallback if coordinate is undefined/null or exactly 0
    if (!finalLat || !finalLng || finalLat === 0 || finalLng === 0) {
      try {
        const queryStr = `${localita}, ${comune}, Massa-Carrara, Toscana, Italia`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
        } else {
          // Broad fallback
          const secondaryQueryStr = `${localita}, ${comune}, Italia`;
          const resp2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(secondaryQueryStr)}&limit=1`);
          const data2 = await resp2.json();
          if (data2 && data2.length > 0) {
            finalLat = parseFloat(data2[0].lat);
            finalLng = parseFloat(data2[0].lon);
          }
        }
      } catch (err) {
        console.error("Auto geocoding failed, setting default center", err);
      }
    }

    // Default to Center of Massa-Carrara if completely unresolved
    if (!finalLat || !finalLng) {
      finalLat = 44.035;
      finalLng = 10.14;
    }

    // Calcolo scadenza 5 giorni per interventi non urgenti / differibili
    const createdAtIso = customDateTime ? new Date(customDateTime).toISOString() : new Date().toISOString();
    let deadlineAtIso: string | undefined = undefined;
    if (isNonUrgentForm) {
      const d = new Date(createdAtIso);
      d.setDate(d.getDate() + 5);
      deadlineAtIso = d.toISOString();
    }

    const payload: Omit<EmergencyCall, "id"> = {
      callerName,
      callerPhone,
      comune,
      localita,
      lat: finalLat,
      lng: finalLng,
      sector: selectedSector,
      description,
      priority: isNonUrgentForm ? "bassa" : priority,
      status: assignedGuardId ? "pattuglia" : "in_attesa",
      assignedGuardId,
      assignedGuardName: guardName,
      assignedGuardPhone: guardPhone,
      createdAt: createdAtIso,
      notes,
      isNonUrgent: Boolean(isNonUrgentForm),
      deadlineAt: deadlineAtIso,
      lastReminderPhase: assignedGuardId ? 1 : undefined,
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          operatorMatricola,
          operatorName,
          action: isNonUrgentForm 
            ? "Apertura INTERVENTO DIFFERIBILE (SLA 5 giorni per evasione/verbale)" 
            : "Apertura chiamata di emergenza in centrale"
        }
      ]
    };

    if (assignedGuardId) {
      payload.auditTrail.push({
        timestamp: new Date().toISOString(),
        operatorMatricola,
        operatorName,
        action: `Pattuglia ${guardName} (${selectedGuardObj?.matricola}) assegnata all'intervento${isNonUrgentForm ? ' differibile (fase 1: 5 giorni)' : ''}`
      });
    }

    try {
      const cleanPayload = sanitizeFirestorePayload(payload);
      const docRef = await addDoc(collection(db, "emergency_calls"), cleanPayload);
      // Auto center map on the newly registered emergency with high-zoom detail focus
      flyToCoords([payload.lat, payload.lng], 16);
      setSelectedCall({ id: docRef.id, ...cleanPayload } as EmergencyCall);

      // Reset form fields
      setCallerName("");
      setCallerPhone("");
      setComune("");
      setLocalita("");
      setLat(undefined);
      setLng(undefined);
      setDescription("");
      setAssignedGuardId("");
      setSelectedSector("zoofila");
      setNotes("");
      setCustomDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setIsNonUrgentForm(false);

      // Chiudi e libera completamente la mappa
      setIsFormMinimized(false);
      setShowIntakeForm(false);

      alert("Centrale Operativa: Intervento salvato e localizzato sulla mappa. Modulo liberato!");
    } catch (err: any) {
      alert("Errore durante il salvataggio: " + err.message);
    }
  };

  // Stampa Foglio di Missione / Intervento A4 prima o durante la presa in carico
  const handlePrintMissionDraft = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Errore: Impossibile avviare il driver stampa (popup bloccato dal browser)!");
      return;
    }

    const assignedG = guards.find(g => g.id === assignedGuardId);
    const assignedName = assignedG ? `${assignedG.surname} ${assignedG.name}` : "Da designare sul posto / Centrale";
    const assignedPhone = assignedG ? (assignedG.phone || (assignedG as any).privateInfo?.cellulare || "N/D") : "N/D";
    const assignedMatricola = assignedG?.matricola || "N/D";
    const formattedDate = customDateTime ? safeFormatDate(new Date(customDateTime).toISOString(), "dd/MM/yyyy HH:mm") : safeFormatDate(new Date().toISOString(), "dd/MM/yyyy HH:mm");

    printWindow.document.write(`
      <html>
        <head>
          <title>ORDINE DI MISSIONE E INTERVENTO - ${comune ? comune.toUpperCase() : 'TERRITORIO'} - ${formattedDate}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            .header { border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
            .badge-priority { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
            .meta-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .meta-item strong { text-transform: uppercase; color: #475569; font-size: 10px; display: block; margin-bottom: 3px; letter-spacing: 0.5px; }
            .meta-item span { font-weight: 700; font-size: 14px; color: #0f172a; }
            .section-title { font-size: 13px; text-transform: uppercase; font-weight: 900; padding-bottom: 5px; border-bottom: 2px solid #2563eb; margin-top: 24px; margin-bottom: 12px; color: #1e3a8a; letter-spacing: 0.5px; }
            .content-box { padding: 14px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; background-color: #f8fafc; border-radius: 0 8px 8px 0; font-size: 13px; margin-bottom: 20px; }
            .signature-blocks { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-line { width: 45%; border-top: 1px solid #0f172a; text-align: center; padding-top: 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body onload="window.print();">
          ${getOfficialPrintHeaderHtml("NUCLEO GUARDIE GIURATE VOLONTARIE", "FOGLIO DI SERVIZIO E MISSIONE OPERATIVA")}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #64748b;">
              DATA / ORA ASSEGNAZIONE: <span style="color: #0f172a; font-family: monospace;">${formattedDate}</span>
              &nbsp;•&nbsp; SETTORE: <span style="color: #1e3a8a; font-weight: 900; text-transform: uppercase;">${selectedSector.toUpperCase()}</span>
            </div>
            <div>
              <span class="badge-priority" style="background-color: ${priority === 'emergenza' ? '#fee2e2; color: #991b1b; border: 1px solid #ef4444;' : priority === 'alta' ? '#ffedd5; color: #9a3412; border: 1px solid #f97316;' : '#e0e7ff; color: #3730a3; border: 1px solid #6366f1;'}">
                PRIORITÀ: ${priority.toUpperCase()}
              </span>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item">
              <strong>Pattuglia / Guardia Designata</strong>
              <span>${assignedName}</span>
              <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
                Matricola: <strong>${assignedMatricola}</strong> • Tel: <strong>${assignedPhone}</strong>
              </div>
            </div>
            <div class="meta-item">
              <strong>Destinazione / Obiettivo</strong>
              <span>${comune ? `${comune.toUpperCase()} - ` : ""}${localita || "Da definire"}</span>
              ${lat && lng ? `<div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>` : ""}
            </div>
            <div class="meta-item">
              <strong>Richiedente / Segnalante</strong>
              <span>${callerName || "Centrale Operativa"}</span>
              ${callerPhone ? `<div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Recapito telefonico: <strong>${callerPhone}</strong></div>` : ""}
            </div>
            <div class="meta-item">
              <strong>Operatore Centrale Emittente</strong>
              <span>${operatorName}</span>
              <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Matricola: <strong>${operatorMatricola}</strong></div>
            </div>
          </div>

          <div class="section-title">1. Descrizione Intervento / Motivo della Missione</div>
          <div class="content-box">
            ${description || "Intervento di vigilanza, controllo e accertamento sul territorio di competenza."}
          </div>

          ${notes ? `
            <div class="section-title">2. Istruzioni Operative & Note della Centrale</div>
            <div class="content-box" style="border-left-color: #f59e0b; background-color: #fffbeb;">
              ${notes}
            </div>
          ` : ""}

          <div class="section-title">3. Esito del Servizio (A cura della Pattuglia)</div>
          <div style="border: 1px dashed #94a3b8; height: 120px; border-radius: 6px; padding: 10px; margin-bottom: 25px; background: #fafafa;">
            <span style="font-size: 10px; color: #94a3b8; font-style: italic;">Annotare qui sul posto l'orario di arrivo, rilievi, persone identificate, targhe o provvedimenti adottati...</span>
          </div>

          <div class="signature-blocks">
            <div class="sig-line">
              Firma Operatore Centrale<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">(Disponente: ${operatorName})</span>
            </div>
            <div class="sig-line">
              Firma della Guardia / Capopattuglia<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">(Ricevente sul posto)</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px dotted #cbd5e1; padding-top: 10px;">
            Documento generato telematicamente dalla Centrale Operativa C.O.E.T.A. • Progetto Massa-Carrara
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Delete/Cancel emergency call request
  const handleDeleteCall = async (callId: string) => {
    let isConfirmed = false;
    try {
      isConfirmed = confirm("Sei veramente sicuro di voler ANNULLARE questa richiesta di intervento? Rimarrà registrata in sola lettura nell'archivio storico (Audit Trail) ai fini di Pubblica Sicurezza e Polizia Giudiziaria.");
    } catch (e) {
      isConfirmed = true;
    }
    if (isConfirmed) {
      const trailEvent: AuditEvent = {
        timestamp: new Date().toISOString(),
        operatorMatricola,
        operatorName,
        action: `Richiesta di intervento ANNULLATA / RECONCILIATA dall'operatore di Centrale. Record d'archivio bloccato.`
      };

      try {
        await updateDoc(doc(db, "emergency_calls", callId), {
          status: "annullata",
          auditTrail: arrayUnion(trailEvent)
        });
        if (selectedCall?.id === callId) {
          setSelectedCall(prev => prev ? { ...prev, status: "annullata", auditTrail: [...prev.auditTrail, trailEvent] } : null);
        }
        alert("Richiesta d'intervento annullata con successo e registrata nell'archivio storico non modificabile!");
      } catch (err: any) {
        alert("Errore durante l'annullamento della richiesta: " + err.message);
      }
    }
  };

  // Aggiornamento dello stato di una missione
  const handleUpdateMissionStatus = async (
    missionId: string, 
    newStatus: "pending" | "accepted" | "completed" | "cancelled" | "rejected",
    rejectionReason?: string
  ) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completedAt = new Date().toISOString();
      }
      if (newStatus === "rejected" || newStatus === "cancelled") {
        updateData.rejectedAt = new Date().toISOString();
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
      }
      await updateDoc(doc(db, "missions", missionId), updateData);
      alert(`Stato missione aggiornato con successo a: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      alert("Errore nell'aggiornamento della missione: " + err.message);
    }
  };

  // Eliminazione definitiva di una missione dal database per svuotare i marker persistenti
  const handleDeleteMission = async (missionId: string) => {
    const isConfirmed = confirm("Sei veramente sicuro di voler ELIMINARE DEFINITIVAMENTE questa missione dal database? Questa azione è irreversibile e rimuoverà immediatamente il marker dal Radar.");
    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "missions", missionId));
        alert("Missione eliminata definitivamente dal database.");
      } catch (err: any) {
        alert("Errore durante l'eliminazione della missione: " + err.message);
      }
    }
  };

  // Update notes or status of a call
  const handleUpdateCallStatus = async (callId: string, newStatus: "in_attesa" | "pattuglia" | "inoltrata" | "risolto" | "annullata") => {
    const callUpdate: Partial<EmergencyCall> = {
      status: newStatus
    };

    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: `Stato intervento variato a: ${newStatus.toUpperCase()}`
    };

    try {
      await updateDoc(doc(db, "emergency_calls", callId), {
        ...callUpdate,
        auditTrail: arrayUnion(trailEvent)
      });
      // Update selected call state too if matched
      if (selectedCall && selectedCall.id === callId) {
        setSelectedCall(prev => prev ? { ...prev, status: newStatus, auditTrail: [...prev.auditTrail, trailEvent] } : null);
      }
    } catch (err: any) {
      alert("Errore aggiornamento stato: " + err.message);
    }
  };

  const handleUpdateCallNotes = async (callId: string, extraNotes: string) => {
    if (!extraNotes.trim()) return;
    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: `Aggiunta annotazione: ${extraNotes}`
    };

    try {
      await updateDoc(doc(db, "emergency_calls", callId), {
        notes: extraNotes,
        auditTrail: arrayUnion(trailEvent)
      });
      // Live reload details
      if (selectedCall && selectedCall.id === callId) {
        setSelectedCall(prev => prev ? { ...prev, notes: extraNotes, auditTrail: [...prev.auditTrail, trailEvent] } : null);
      }
      alert("Annotazione registrata nella scheda di sicurezza.");
    } catch (err: any) {
      alert("Errore salvataggio annotazione: " + err.message);
    }
  };

  // Helper to send availability request to patrol
  const handleRequestAvailability = async (call: EmergencyCall, guardId: string) => {
    if (!guardId || guardId === "none") {
      alert("Seleziona una pattuglia a cui inviare la richiesta di disponibilità.");
      return;
    }
    const selectedG = guards.find(g => g.id === guardId);
    if (!selectedG) return;
    const guardName = `${selectedG.surname} ${selectedG.name}`;
    const guardPhone = selectedG.phone || (selectedG as any).privateInfo?.cellulare || "";
    
    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: `Inviata richiesta di disponibilità a ${guardName.toUpperCase()} (${selectedG.matricola || "N/D"}) - In attesa di riscontro`
    };

    try {
      await updateDoc(doc(db, "emergency_calls", call.id), {
        assignedGuardId: guardId,
        assignedGuardName: guardName,
        assignedGuardPhone: guardPhone,
        status: "richiesta_inviata",
        auditTrail: arrayUnion(trailEvent)
      });
      if (selectedCall && selectedCall.id === call.id) {
        setSelectedCall(prev => prev ? {
          ...prev,
          assignedGuardId: guardId,
          assignedGuardName: guardName,
          assignedGuardPhone: guardPhone,
          status: "richiesta_inviata",
          auditTrail: [...prev.auditTrail, trailEvent]
        } : null);
      }
      
      // Compose WhatsApp prompt asking for availability
      const textMsg = encodeURIComponent(
        `🚨 *CENTRALE OPERATIVA C.O.E.T.A. - RICHIESTA DISPONIBILITÀ*\n\n` +
        `Gentile *${guardName}*,\n` +
        `ti chiediamo la disponibilità per un intervento urgente:\n` +
        `📍 *Località:* ${call.comune ? `${call.comune.toUpperCase()} - ` : ""}${call.localita}\n` +
        `⚠️ *Priorità:* ${call.priority.toUpperCase()}\n` +
        `📝 *Tipo evento:* ${call.description}\n\n` +
        `Sei in grado di assumere l'incarico?\n` +
        `_Rispondi affermativamente per ricevere subito indirizzo completo, scheda dettagli e link itinerario GPS._`
      );

      if (guardPhone) {
        const cleanPhone = guardPhone.replace(/\D/g, "");
        window.open(`https://wa.me/${cleanPhone}?text=${textMsg}`, "_blank");
      } else {
        alert(`Richiesta registrata! Attenzione: ${guardName} non ha un numero cellulare registrato.`);
      }
    } catch (err: any) {
      alert("Errore invio richiesta disponibilità: " + err.message);
    }
  };

  // Helper to confirm patrol assignment once guard accepted
  const handleConfirmAssignment = async (callId: string, guard: Guard) => {
    const guardName = `${guard.surname} ${guard.name}`;
    const guardPhone = guard.phone || (guard as any).privateInfo?.cellulare || "";

    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: `Pattuglia ${guardName.toUpperCase()} (${guard.matricola || "N/D"}) HA ACCETTATO L'INTERVENTO. Assegnazione convalidata.`
    };

    try {
      await updateDoc(doc(db, "emergency_calls", callId), {
        status: "pattuglia",
        auditTrail: arrayUnion(trailEvent)
      });
      if (selectedCall && selectedCall.id === callId) {
        setSelectedCall(prev => prev ? {
          ...prev,
          status: "pattuglia",
          auditTrail: [...prev.auditTrail, trailEvent]
        } : null);
      }
      alert(`Assegnazione convalidata! Ora puoi inviare i dettagli completi e l'itinerario a ${guardName}.`);
    } catch (err: any) {
      alert("Errore conferma assegnazione: " + err.message);
    }
  };

  // Helper to send complete mission details and GPS navigation itinerary to the assigned guard
  const handleSendFullDetailsAndItinerary = async (call: EmergencyCall, guard: Guard) => {
    const guardName = `${guard.surname} ${guard.name}`;
    const guardPhone = guard.phone || (guard as any).privateInfo?.cellulare || "";

    const hasCoords = Boolean(call.lat && call.lng);
    const navUrl = hasCoords 
      ? `https://www.google.com/maps/dir/?api=1&destination=${call.lat},${call.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${call.localita} ${call.comune || "Massa Carrara"}`)}`;

    // BLINDATURA PRIVACY: L'operatore in strada non riceve MAI il nome o il cellulare del richiedente
    const isDifferibile = Boolean(call.isNonUrgent);
    const deadlineStr = call.deadlineAt ? safeFormatDate(call.deadlineAt, "dd/MM/yyyy") : "entro 5 giorni dall'assegnazione";

    const textMsg = encodeURIComponent(
      `🚨 *CENTRALE OPERATIVA C.O.E.T.A. - ${isDifferibile ? 'INTERVENTO DIFFERIBILE (SLA 5 GG)' : 'FOGLIO MISSIONE ASSEGNATO'}*\n\n` +
      `👤 *Pattuglia Incaricata:* ${guardName} (${guard.matricola || "N/D"})\n` +
      `📅 *Data/Ora Assegnazione:* ${safeFormatDate(call.createdAt, "dd/MM/yyyy HH:mm")}\n` +
      (isDifferibile ? `⏳ *TERMINE CHIUSURA INTERVENTO:* Entro il ${deadlineStr} (max 5 giorni)\n` : '') +
      `⚠️ *Priorità:* ${isDifferibile ? 'DIFFERIBILE (5 GIORNI)' : call.priority.toUpperCase()}\n\n` +
      `📍 *DESTINAZIONE:* ${call.comune ? `${call.comune.toUpperCase()} - ` : ""}${call.localita}\n` +
      (hasCoords ? `🌐 *Coordinate GPS:* ${call.lat}, ${call.lng}\n` : "") +
      `\n👤 *Richiedente:* [DATO RISERVATO CENTRALE C.O.E.T.A.]\n` +
      `📞 *Contatto:* [GESTITO ESCLUSIVAMENTE DALLA CENTRALE]\n` +
      `📝 *Descrizione Evento:* ${call.description}\n\n` +
      `🧭 *LINK ITINERARIO NAVIGAZIONE GPS:*\n${navUrl}\n\n` +
      (isDifferibile 
        ? `_Si richiede di effettuare il controllo e redigere il verbale o la relazione di servizio entro 5 giorni. Contattare la Centrale per qualsiasi informazione integrativa._`
        : `_Procedere con prudenza. Mantenere contatto radio/telefonico con la Centrale._`)
    );

    await trackCommunication(call.id, guard, "WhatsApp");

    if (guardPhone) {
      const cleanPhone = guardPhone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}?text=${textMsg}`, "_blank");
    } else {
      window.open(navUrl, "_blank");
      alert(`Link itinerario aperto! Per inviarlo alla guardia inserire il cellulare nel profilo.`);
    }
  };

  // Helper per invio messaggi delle 3 Fasi per interventi differibili (Fase 1: Assegnazione, Fase 2: Promemoria 3° giorno, Fase 3: Allarme 5° giorno)
  const handleSendPhaseReminder = async (call: EmergencyCall, phase: 2 | 3) => {
    const assignedG = guards.find(g => g.id === call.assignedGuardId);
    const guardPhone = assignedG?.phone || (assignedG as any)?.privateInfo?.cellulare || call.assignedGuardPhone || "";
    const guardName = assignedG ? `${assignedG.surname} ${assignedG.name}` : call.assignedGuardName || "Pattuglia";
    const deadlineStr = call.deadlineAt ? safeFormatDate(call.deadlineAt, "dd/MM/yyyy") : "imminente";

    let subject = "";
    let bodyText = "";

    if (phase === 2) {
      subject = "⚠️ PROMEMORIA FASE 2: SCADENZA INTERVENTO DIFFERIBILE (3° GIORNO)";
      bodyText = 
        `*CENTRALE OPERATIVA C.O.E.T.A. - PROMEMORIA FASE 2*\n\n` +
        `Gentile *${guardName}*,\n` +
        `ti ricordiamo l'intervento differibile assegnato:\n` +
        `📍 *Luogo:* ${call.comune ? `${call.comune.toUpperCase()} - ` : ""}${call.localita}\n` +
        `📝 *Evento:* ${call.description}\n` +
        `⏳ *Scadenza tassativa:* ${deadlineStr} (restano circa 48 ore)\n\n` +
        `_Si prega di completare il sopralluogo e trasmettere il verbale o la relazione di servizio per la chiusura della pratica._`;
    } else {
      subject = "🚨 ALLARME FASE 3: SCADENZA 5 GIORNI RAGGIUNTA - CONTATTARE LA CENTRALE";
      bodyText = 
        `*CENTRALE OPERATIVA C.O.E.T.A. - ALLARME FASE 3 (SCADENZA RAGGIUNTA)*\n\n` +
        `🚨 *ATTENZIONE ${guardName.toUpperCase()}*,\n` +
        `l'intervento differibile ha superato i *5 GIORNI* senza riscontro di verbale di chiusura:\n` +
        `📍 *Luogo:* ${call.comune ? `${call.comune.toUpperCase()} - ` : ""}${call.localita}\n` +
        `📝 *Evento:* ${call.description}\n\n` +
        `⚠️ *AZIONE RICHIESTA:* CONTATTARE IMMEDIATAMENTE LA CENTRALE OPERATIVA o caricare subito il relativo verbale per evitare segnalazione ai responsabili di settore.`;
    }

    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: `Inviato avviso ${phase === 2 ? 'Fase 2 (Promemoria 3° gg)' : 'Fase 3 (Allarme 5° gg)'} a ${guardName}`
    };

    try {
      await updateDoc(doc(db, "emergency_calls", call.id), {
        lastReminderPhase: phase,
        lastReminderSentAt: new Date().toISOString(),
        auditTrail: arrayUnion(trailEvent)
      });

      if (selectedCall && selectedCall.id === call.id) {
        setSelectedCall(prev => prev ? {
          ...prev,
          lastReminderPhase: phase,
          lastReminderSentAt: new Date().toISOString(),
          auditTrail: [...prev.auditTrail, trailEvent]
        } : null);
      }

      if (guardPhone) {
        const cleanPhone = guardPhone.replace(/\D/g, "");
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(bodyText)}`, "_blank");
      } else {
        alert(`Avviso ${phase === 2 ? 'Fase 2' : 'Fase 3'} registrato nel log di centrale! Nessun cellulare registrato per la guardia.`);
      }
    } catch (err: any) {
      alert("Errore registrazione invio promemoria: " + err.message);
    }
  };

  const handleUpdateCallGuard = async (callId: string, guardId: string) => {
    const selectedG = guards.find(g => g.id === guardId);
    const guardName = selectedG ? `${selectedG.surname} ${selectedG.name}` : "";
    const guardPhone = selectedG ? (selectedG.phone || (selectedG as any).privateInfo?.cellulare || "") : "";
    
    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: !guardId || guardId === "none" || !guardName
        ? "Rimossa assegnazione della pattuglia sul posto"
        : `Assegnata alla pattuglia ${guardName.toUpperCase()} (${selectedG?.matricola || "N/D"})`
    };

    try {
      await updateDoc(doc(db, "emergency_calls", callId), {
        assignedGuardId: guardId === "none" ? "" : guardId,
        assignedGuardName: guardId === "none" ? "" : guardName,
        assignedGuardPhone: guardId === "none" ? "" : guardPhone,
        status: (guardId && guardId !== "none") ? "pattuglia" : "in_attesa",
        auditTrail: arrayUnion(trailEvent)
      });
      // Live reload details
      if (selectedCall && selectedCall.id === callId) {
        setSelectedCall(prev => prev ? { 
          ...prev, 
          assignedGuardId: guardId === "none" ? "" : guardId, 
          assignedGuardName: guardId === "none" ? "" : guardName,
          assignedGuardPhone: guardId === "none" ? "" : guardPhone,
          status: (guardId && guardId !== "none") ? "pattuglia" : "in_attesa",
          auditTrail: [...prev.auditTrail, trailEvent] 
        } : null);
      }
      alert(guardId === "none" ? "Pattuglia rimossa correttamente." : `Incarico assegnato con successo a ${guardName}!`);
    } catch (err: any) {
      alert("Errore riassegnazione pattuglia: " + err.message);
    }
  };

  // Log communication tracking (Call or WhatsApp clicked)
  const trackCommunication = async (callId: string, guard: Guard, type: "Telefono" | "WhatsApp") => {
    const actionText = type === "Telefono" 
      ? `Tentativo di contatto telefonico diretto con ${guard.surname} ${guard.name} (${guard.matricola})`
      : `Invio coordinate e dettagli via WhatsApp a ${guard.surname} ${guard.name} (${guard.matricola})`;

    const trailEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      operatorMatricola,
      operatorName,
      action: actionText
    };

    try {
      await updateDoc(doc(db, "emergency_calls", callId), {
        auditTrail: arrayUnion(trailEvent)
      });
      if (selectedCall && selectedCall.id === callId) {
        setSelectedCall(prev => prev ? { ...prev, auditTrail: [...prev.auditTrail, trailEvent] } : null);
      }
    } catch (err) {
      console.error("Errore tracciamento automatico contatti:", err);
    }
  };

  // Print single Call to A4 PG format
  const handlePrintCallSummary = (call: EmergencyCall) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Errore: Impossibile avviare il driver stampa (popup bloccato dal browser)!");
      return;
    }

    const formattedDate = safeFormatDate(call.createdAt, "dd/MM/yyyy HH:mm");
    const auditRows = call.auditTrail?.map((evt) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-family: monospace; font-size: 11px;">${safeFormatDate(evt.timestamp, "HH:mm:ss.SSS")}</td>
        <td style="padding: 10px; font-weight: bold; font-size: 11px;">${evt.operatorName} (${evt.operatorMatricola})</td>
        <td style="padding: 10px; font-size: 11px;">${evt.action}</td>
      </tr>
    `).join("") || "<tr><td colspan='3' style='padding:10px; text-align:center;'>Nessuna voce di log registrata</td></tr>";

    const cancelBadge = call.status === 'annullata' ? `
      <div style="border: 3px solid #dc2626; color: #dc2626; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px; background-color: #fef2f2;">
        ⚠️ ATTENZIONE: REGISTRAZIONE DI INTERVENTO ANNULLATA E RECONCILIATA ⚠️<br/>
        <span style="font-size: 9.5px; font-weight: normal; text-transform: none; color: #7f1d1d;">
          Questo record d'archivio storico di PS o PG è stato congelato per verifiche amministrative. Non è più modificabile da alcun operatore.
        </span>
      </div>
    ` : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>PROGETTO MASSA-CARRARA - VERBALE DISPATCH ${call.id} ${call.status === 'annullata' ? '[ANNULLATO]' : ''}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 3px double #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; color: #1e3a8a; text-transform: uppercase; }
            .header p { margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #666; }
            .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-item { font-size: 13px; }
            .meta-item strong { text-transform: uppercase; color: #475569; font-size: 11px; display: block; margin-bottom: 4px; }
            .meta-item span { font-weight: 500; font-size: 14px; }
            .section-title { font-size: 14px; text-transform: uppercase; font-weight: bold; padding-bottom: 6px; border-bottom: 2px solid #3b82f6; margin-top: 40px; margin-bottom: 15px; color: #1e293b; }
            .description-box { padding: 15px; border-left: 4px solid #3b82f6; background-color: #eff6ff; border-radius: 0 8px 8px 0; font-size: 14px; font-style: italic; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #1e293b; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .stamp { text-align: right; margin-top: 60px; font-size: 11px; color: #888; border-top: 1px dotted #ccc; padding-top: 20px; }
            .signature-blocks { display: flex; justify-content: space-between; margin-top: 80px; }
            .sig-line { width: 45%; border-top: 1px solid #1e293b; text-align: center; padding-top: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body onload="window.print();">
          ${getOfficialPrintHeaderHtml("CENTRALE OPERATIVA INTEGRATA MASSA-CARRARA", "REGISTRO INTERVENTI E SCHEDA DISPATCH")}
          
          ${cancelBadge}

          <div style="text-align: right; font-size: 13px; font-weight: bold; margin-bottom: 20px;">
            REGISTRO DISPATCH CODICE: <span style="font-family: monospace;">${call.id.toUpperCase()}</span>
          </div>
 
          <div class="meta-box">
            <div class="meta-item">
              <strong>Data e Ora Ricezione</strong>
              <span>${formattedDate}</span>
            </div>
            <div class="meta-item">
              <strong>Priorità Assegnata</strong>
              <span style="color: ${call.priority === 'emergenza' ? '#dc2626' : call.priority === 'alta' ? '#ea580c' : '#334155'}; text-transform: uppercase; font-weight: bold;">
                ● ${call.priority}
              </span>
            </div>
            <div class="meta-item">
              <strong>Comunente / Richiedente</strong>
              <span>${call.callerName} (${call.callerPhone || "Nessun recapito"})</span>
            </div>
            <div class="meta-item">
              <strong>Località d'Intervento</strong>
              <span>${call.comune ? `${call.comune.toUpperCase()} - ` : ""}${call.localita} (Lat: ${call.lat}, Lng: ${call.lng})</span>
            </div>
            <div class="meta-item">
              <strong>Unità Operativa Designata</strong>
              <span>${call.assignedGuardName || "Nessuna pattuglia sul posto"}</span>
            </div>
            <div class="meta-item">
              <strong>Stato dell'Intervento</strong>
              <span style="text-transform: uppercase; font-weight: bold; ${call.status === 'annullata' ? 'color: #dc2626; text-decoration: line-through;' : ''}">${call.status}</span>
            </div>
          </div>

          <div class="section-title">Motivazione ed Evento Segnalato</div>
          <div class="description-box">
            ${call.description || "Nessuna descrizione o motivazione inserita all'apertura."}
          </div>

          ${call.notes ? `
            <div class="section-title">Note Tecnico-Risolutive del nucleo</div>
            <div style="background-color: #fafafa; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; font-size: 13px; margin-bottom: 30px;">
              ${call.notes}
            </div>
          ` : ""}

          <div class="section-title">Log Di Sicurezza & Audit Trail (Blindato)</div>
          <p style="font-size: 11px; color:#666; margin-top:-10px;">Le marcature temporali sottostanti fanno fede ai fini di Polizia Giudiziaria per la ricostruzione dei fatti.</p>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Timestamp Codice</th>
                <th style="width: 30%;">Operatore Accreditato</th>
                <th style="width: 50%;">Azione e Tracciamento automatico</th>
              </tr>
            </thead>
            <tbody>
              ${auditRows}
            </tbody>
          </table>

          <div class="signature-blocks">
            <div class="sig-line">
              Firma dell'Operatore di Centrale<br/>
              <span style="font-family: monospace; font-size: 10px; color: #666; font-weight: normal;">(Matricola: ${operatorMatricola})</span>
            </div>
            <div class="sig-line">
              Firma del Responsabile Nucleo<br/>
              <span style="font-family: monospace; font-size: 10px; color: #666; font-weight: normal;">(Visto di Approvazione)</span>
            </div>
          </div>

          <div class="stamp">
            Documento generato telematicamente dalla Centrale Operativa. Massa-Carrara, ${format(new Date(), "dd/MM/yyyy HH:mm:ss")} UTC.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter calls
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      // 1. Status Filter
      if (callFilter === "attive" && (c.status === "risolto" || c.status === "annullata")) return false;
      if (callFilter === "risolte" && c.status !== "risolto") return false;
      if (callFilter === "annullate" && c.status !== "annullata") return false;
      if (callFilter === "non_urgenti" && !c.isNonUrgent) return false;

      // 2. Search Term Focus
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (c.callerName || "").toLowerCase().includes(s) ||
        (c.callerPhone || "").toLowerCase().includes(s) ||
        (c.localita || "").toLowerCase().includes(s) ||
        (c.description || "").toLowerCase().includes(s) ||
        (c.assignedGuardName || "").toLowerCase().includes(s)
      );
    });
  }, [calls, callFilter, searchTerm]);

  const handleForensicImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForensicFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    });

    // Calcolo Impronta Criptografica SHA-256 per garanzia d'integrità del reperto (Art. 354 c.p.p.)
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      setForensicSha256(hashHex);
    } catch {
      setForensicSha256(`SHA256-${Math.random().toString(36).substring(2, 12).toUpperCase()}`);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForensicImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunForensicAnalysis = async () => {
    if (!forensicImage) return;
    setIsAnalyzing(true);
    setForensicResult(null);

    try {
      const response = await fetch("/api/forensics/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: forensicImage,
          extraDetails: `[PROTOCOLLO PG] Tipologia Reperto: ${forensicRepertoType} | Codice Reperto: ${forensicRepertoCode} | Sigillo Contenitore: ${forensicSigillo} | Conservazione: ${forensicConservazione} | Comune: ${forensicComune} (${forensicLocalita || "Massa-Carrara"}) | Hash SHA-256: ${forensicSha256} || Note Sopralluogo: ${forensicExtraDetails}`,
          fileMetadata: forensicFileMeta,
          key: user?.email || "giulianodellapina@gmail.com",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Errore sconosciuto del server");
      }
      setForensicResult(data);
    } catch (err: any) {
      console.error(err);
      alert("Errore nell'analisi dell'immagine: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrintForensicReport = () => {
    if (!forensicResult) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permetti i popup nel browser per stampare il report!");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>VERBALE DI REPERTAMENTO E RELAZIONE FORENSE AI - HQ</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 35px;
            font-size: 11px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px double #1f2937;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 16px;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header p {
            margin: 3px 0 0 0;
            font-size: 9.5px;
            color: #374151;
            font-weight: 700;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .meta-table td {
            border: 1px solid #d1d5db;
            padding: 6px 10px;
          }
          .meta-table td.label {
            font-weight: 700;
            background-color: #f3f4f6;
            width: 22%;
            text-transform: uppercase;
            font-size: 8.5px;
            color: #1f2937;
          }
          .section-title {
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #111827;
            color: #ffffff;
            padding: 5px 10px;
            margin-top: 18px;
            margin-bottom: 8px;
            border-radius: 4px;
          }
          .expert-box {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 12px;
            background-color: #fafafa;
          }
          .sub-item {
            margin-bottom: 5px;
          }
          .sub-label {
            font-weight: 700;
            color: #374151;
            font-size: 8.5px;
            text-transform: uppercase;
          }
          .footer-signs {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .sign-col {
            width: 42%;
            text-align: center;
            border-top: 1px solid #111827;
            padding-top: 6px;
            font-size: 9.5px;
            font-weight: 700;
          }
          @media print {
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${getOfficialPrintHeaderHtml("VERBALE DI REPERTAMENTO E CONSULENZA FORENSE (Art. 354 c.p.p.)", "SEZIONE SCIENTIFICA HQ MASSA-CARRARA - REPARTO POLIZIA GIUDIZIARIA")}

        <table class="meta-table">
          <tr>
            <td class="label">Codice Reperto Unico</td>
            <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold;">${forensicRepertoCode}</td>
            <td class="label">Sigillo Busta / Contenitore</td>
            <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #991b1b;">${forensicSigillo}</td>
          </tr>
          <tr>
            <td class="label">Tipologia Reperto</td>
            <td style="font-weight: bold;">${forensicRepertoType}</td>
            <td class="label">Stato Conservazione</td>
            <td>${forensicConservazione}</td>
          </tr>
          <tr>
            <td class="label">Luogo di Repertamento</td>
            <td>${forensicComune} ${forensicLocalita ? `(${forensicLocalita})` : ""} - Prov. Massa-Carrara</td>
            <td class="label">Operatore Verbalizzante PG</td>
            <td>${operatorName} (${operatorMatricola})</td>
          </tr>
          <tr>
            <td class="label">File Immagine & Peso</td>
            <td>${forensicFileMeta?.name || "Fotografia di Sopralluogo"} (${forensicFileMeta?.size ? Math.round(forensicFileMeta.size / 1024) + " KB" : "N.D."})</td>
            <td class="label">Data / Ora Repertamento</td>
            <td>${new Date().toLocaleString("it-IT")}</td>
          </tr>
          <tr>
            <td class="label">Impronta SHA-256 Integrità</td>
            <td colspan="3" style="font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: bold; color: #1e3a8a; word-break: break-all;">
              ${forensicSha256 || "N.D. (Calcolato in memoria locale)"}
            </td>
          </tr>
          ${forensicExtraDetails ? `
          <tr>
            <td class="label">Note / Contesto Sopralluogo</td>
            <td colspan="3">${forensicExtraDetails}</td>
          </tr>
          ` : ""}
        </table>

        <div class="section-title">Riassunto Forense Generale</div>
        <p style="font-style: italic; font-size: 10.5px; margin: 4px 0 10px 0;">${forensicResult.summary || "Analisi scientifica e repertamento completato con successo."}</p>

        <div class="section-title">1. Consulto Veterinario Forense</div>
        <div class="expert-box">
          <div class="sub-item">
            <span class="sub-label">Postura e Stato di Salute Visibile:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.veterinary?.healthStatus || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Presenza di Ferite/Lesioni/Patologie:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.veterinary?.injuries || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Indicatori di Malnutrizione/Privazione:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.veterinary?.malnutrition || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Evidenze di Maltrattamento o Incuria Grave:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.veterinary?.abuseEvidence || "N.D."}</p>
          </div>
          <div class="sub-item" style="margin-top: 6px; font-weight: bold; font-family: 'JetBrains Mono', monospace; background-color: #fee2e2; padding: 6px; border-radius: 4px; border-left: 3px solid #dc2626;">
            <span class="sub-label" style="color: #991b1b;">GIUDIZIO CLINICO VISIVO SINTETICO:</span>
            <p style="margin: 2px 0 0 0; color: #7f1d1d; font-size: 10px;">${forensicResult.veterinary?.verdict || "N.D."}</p>
          </div>
        </div>

        <div class="section-title">2. Valutazione Giuridica e Sanzioni Ambientali/Penali</div>
        <div class="expert-box">
          <div class="sub-item">
            <span class="sub-label">Riferimenti di Legge ed Articoli di Rilevanza Penale:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.legal?.applicableLaws || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Reati o Violazioni Ipotizzate:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.legal?.crimesIdentified || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Solidità del Quadro Probatorio Fotografico:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.legal?.evidenceLevel || "N.D."}</p>
          </div>
          <div class="sub-item" style="margin-top: 6px; font-weight: bold; background-color: #fef3c7; padding: 6px; border-radius: 4px; border-left: 3px solid #d97706;">
            <span class="sub-label" style="color: #92400e;">Azioni Consigliate di Polizia Giudiziaria:</span>
            <p style="margin: 2px 0 0 0; color: #78350f; font-size: 10px;">${forensicResult.legal?.prosecutionAction || "N.D."}</p>
          </div>
        </div>

        <div class="section-title">3. Indagine Botanica, Vegetazionale ed Ambientale</div>
        <div class="expert-box">
          <div class="sub-item">
            <span class="sub-label">Flora e Piante Identificate:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.botanical?.floraIdentified || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Caratteristiche del Terreno e Habitat:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.botanical?.soilAndHabitat || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Compatibilità Geografica con Massa-Carrara / Toscana:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.botanical?.geographicAreaEstimate || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Stima Temporale (Stagione/Mese):</span>
            <p style="margin: 2px 0 0 0; font-weight: bold; color: #047857;">${forensicResult.botanical?.seasonEstimate || "N.D."}</p>
          </div>
        </div>

        <div class="section-title">4. Perizia Tecnico-Informatica ed EXIF</div>
        <div class="expert-box">
          <div class="sub-item">
            <span class="sub-label">Data e Ora di Scatto Dedotta/Lettura:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.exif?.dateTime || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Coordinate/Area Geografica Rilevata:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.exif?.gps || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Sensore e Tipo di Dispositivo:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.exif?.camera || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Analisi Integrità del File e Assenza di Manipolazione:</span>
            <p style="margin: 2px 0 0 0;">${forensicResult.exif?.technicalNotes || "N.D."}</p>
          </div>
        </div>

        <div class="section-title">5. Consulenza Climatologica e Meteo Storica</div>
        <div class="expert-box">
          <div class="sub-item">
            <span class="sub-label">Condizioni Meteorologiche Visibili:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.weather?.estimatedConditions || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Ricostruzione Microclima e Temperatura Approssimativa:</span>
            <p style="margin: 2px 0 5px 0;">${forensicResult.weather?.reconstructedMeteo || "N.D."}</p>
          </div>
          <div class="sub-item">
            <span class="sub-label">Fascia Oraria e Punti Cardinali (Analisi Ombre):</span>
            <p style="margin: 2px 0 0 0;">${forensicResult.weather?.lightingAndTimeOfDay || "N.D."}</p>
          </div>
        </div>

        <p style="font-size: 8.5px; color: #4b5563; text-align: center; margin-top: 30px; font-family: 'JetBrains Mono', monospace;">
          Documento redatto ex Art. 354 c.p.p. ed elaborato con il supporto della Centrale Forense Scientifica AI HQ.
        </p>

        <div class="footer-signs">
          <div class="sign-col">
            L'Operatore Verbalizzante di PG<br/>
            <span style="font-size: 8px; font-weight: normal; color: #6b7280;">(Firma autografa o digitale)</span>
          </div>
          <div class="sign-col">
            Il Comandante della Sezione<br/>
            <span style="font-size: 8px; font-weight: normal; color: #6b7280;">(Firma autografa o digitale)</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesCategory = contactCategory === "Tutti" || c.category === contactCategory;
      if (!contactSearch) return matchesCategory;
      const s = contactSearch.toLowerCase();
      return (
        matchesCategory && (
          (c.title || "").toLowerCase().includes(s) ||
          (c.municipality || "").toLowerCase().includes(s) ||
          (c.phone || "").toLowerCase().includes(s)
        )
      );
    });
  }, [contacts, contactSearch, contactCategory]);

  return (
    <div className="space-y-2 flex flex-col h-full bg-transparent p-0">
      <style>{`
        .custom-tooltip-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .custom-tooltip-label::before {
          display: none !important;
        }
        .leaflet-tooltip-pane {
          z-index: 650 !important;
        }
      `}</style>

      {/* Super compact header row to save maximal vertical space - hidden in dedicated 2nd monitor */}
      {!isRadarMonitorOnly && (
        <div className="flex flex-row justify-between items-center gap-2 bg-slate-950/20 p-2 rounded-xl mb-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-red-500 animate-pulse shrink-0" />
            <h1 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
              CENTRALE OPERATIVA HQ
              <Badge className="bg-red-600 border-none text-[8px] py-0 px-1.5 rounded-full text-white animate-pulse">
                RADAR ATTIVO
              </Badge>
            </h1>
            <Button
              type="button"
              onClick={() => {
                setShowIntakeForm(true);
                setIsFormMinimized(false);
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase px-3.5 py-1.5 h-8 rounded-lg shadow-lg border border-red-500 flex items-center gap-1.5 transition-transform active:scale-95"
              title="Apri Modulo Registrazione Nuova Richiesta d'Intervento / Chiamata"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nuova Richiesta d'Intervento</span>
            </Button>

            <Button
              type="button"
              onClick={() => setIsDossierArchiveOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase px-3.5 py-1.5 h-8 rounded-lg shadow-lg border border-indigo-400 flex items-center gap-1.5 transition-transform active:scale-95"
              title="Apri a tutto schermo l'Archivio Completo Richieste d'Intervento, Dossier Chiamate & Vocali"
            >
              <FolderOpen className="h-4 w-4 text-indigo-200" />
              <span>Archivio Richieste & Dossier Chiamate</span>
            </Button>

            {onOpenVerbaleSanzione && (
              <Button
                type="button"
                onClick={onOpenVerbaleSanzione}
                className="bg-rose-700 hover:bg-rose-600 text-white font-black text-xs uppercase px-3.5 py-1.5 h-8 rounded-lg shadow-lg border border-rose-500 flex items-center gap-1.5 transition-transform active:scale-95"
                title="Redigi Verbale di Sanzione Amministrativa (Tutti i Settori)"
              >
                <Scale className="h-4 w-4 text-rose-200" />
                <span>Verbale Sanzionatorio</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400 text-[10px] hidden sm:inline">OP: {operatorMatricola} ({operatorName})</span>
            <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
            <span className="text-md text-red-500 font-bold tracking-tight">{localTime || "14:26:00"}</span>
          </div>
        </div>
      )}

      {/* Sub-tab Selection Bar - hidden in dedicated 2nd monitor */}
      {!isRadarMonitorOnly && (
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-3 shrink-0 max-w-max flex-wrap shadow-lg">
          <Button
            type="button"
            size="sm"
            onClick={() => setSubTab("radar")}
            className={`text-xs font-bold py-1.5 h-9 px-4 rounded-xl transition-all ${
              subTab === "radar"
                ? "bg-red-600 text-white border border-red-500 shadow-md shadow-red-950/50 scale-102"
                : "bg-transparent text-slate-300 hover:text-white"
            }`}
          >
            🛰️ Mappa Radar & Pattuglie Territorio
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setSubTab("missions_register")}
            className={`text-xs font-bold py-1.5 h-9 px-4 rounded-xl transition-all ${
              subTab === "missions_register"
                ? "bg-amber-600 text-white border border-amber-500 shadow-md shadow-amber-950/50 scale-102"
                : "bg-transparent text-slate-300 hover:text-white"
            }`}
          >
            📋 Registro Missioni & Ordini
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setSubTab("forensics")}
            className={`text-xs font-bold py-1.5 h-9 px-4 rounded-xl transition-all ${
              subTab === "forensics"
                ? "bg-purple-600 text-white border border-purple-500 shadow-md shadow-purple-950/50 scale-102"
                : "bg-transparent text-slate-300 hover:text-white"
            }`}
          >
            🔬 Centrale Forense Scientifica & Analisi Reperti (HQ)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCleanSimulationsModalOpen(true)}
            className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/80 text-amber-200 text-xs font-bold py-1.5 h-9 px-3.5 rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5 ml-auto"
            title="Pulisci simulazioni e chiamate di test dalla mappa e da Firestore"
          >
            <Trash2 className="h-3.5 w-3.5 text-amber-400" />
            <span>🧹 Pulisci Simulazioni</span>
          </Button>
        </div>
      )}

      {/* Mappa Radar Squadre & Emergenze */}
      {subTab === "radar" && (
        <>
          {/* Map Section - Takes full length of screen as requested */}
          <div className={cn(
            "w-full transition-all duration-300",
            isRadarMonitorOnly
              ? "fixed inset-0 z-[9999] bg-[#020617] p-0 flex flex-col h-screen w-screen"
              : (isFullScreenMap 
                  ? "fixed inset-0 z-[9999] bg-[#020617] p-2 md:p-3 flex flex-col h-screen w-screen" 
                  : "relative")
          )}>
        <div className={cn(
          "bg-slate-950 overflow-hidden relative shadow-2xl border-0 border-transparent outline-none flex-1 flex flex-col",
          isRadarMonitorOnly ? "rounded-none h-full w-full" : (isFullScreenMap ? "rounded-xl h-full w-full" : "rounded-2xl")
        )}>
          {/* Top-Right Fullscreen & Quick Actions Bar */}
          <div className="absolute top-3 right-3 z-[1001] flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                flyToCoords(MASSA_CARRARA_DEFAULT_CENTER, 11);
              }}
              className="h-9 px-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer border bg-slate-950/90 hover:bg-slate-900 text-emerald-400 border-slate-700/80 hover:border-emerald-500 shadow-black/80"
              title="Centra e blocca visuale su Provincia di Massa-Carrara"
            >
              <Crosshair className="h-4 w-4 text-emerald-400" />
              <span>Centra Massa-Carrara</span>
            </Button>

            {/* Selettore Livello Mappa: Stradale / Vista Aerea Satellite */}
            <div className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-700/80 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setMapLayerType('standard')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                  mapLayerType === 'standard' 
                    ? "bg-blue-600 text-white shadow" 
                    : "text-slate-300 hover:text-white"
                )}
                title="Mappa Stradale Operativa"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stradale</span>
              </button>
              <button
                type="button"
                onClick={() => setMapLayerType('satellite')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                  mapLayerType === 'satellite' 
                    ? "bg-amber-600 text-white shadow" 
                    : "text-slate-300 hover:text-white"
                )}
                title="Mappa Satellitare / Vista Aerea ad Alta Risoluzione"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Satellite</span>
              </button>
            </div>

            {/* Tasto Secondo Monitor Pop-Out (nascosto se siamo già sul 2° monitor) */}
            {!isRadarMonitorOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenRadarSecondMonitor}
                className="h-9 px-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer border bg-slate-950/90 hover:bg-slate-900 text-cyan-300 border-cyan-800/80 hover:border-cyan-400 shadow-black/80"
                title="Apri Radar su Secondo Monitor in finestra separata"
              >
                <Monitor className="h-4 w-4 text-cyan-400" />
                <span className="hidden md:inline">2° Monitor</span>
              </Button>
            )}

            {!isRadarMonitorOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullScreenMap(!isFullScreenMap)}
                className={cn(
                  "h-9 px-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer border",
                  isFullScreenMap
                    ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-amber-950/60 ring-2 ring-amber-400/50"
                    : "bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-950/60 ring-1 ring-blue-400/40"
                )}
                title={isFullScreenMap ? "Riduci visualizzazione mappa" : "Clicca per aprire la visualizzazione mappa"}
              >
                {isFullScreenMap ? (
                  <>
                    <Minimize2 className="h-4 w-4 text-amber-100" />
                    <span>Riduci Mappa</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 text-white" />
                    <span>Apri Mappa</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Legend Widget */}
          <div className="absolute top-3 left-3 z-50 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-2xl backdrop-blur-md max-w-[240px] pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[9px] font-bold text-slate-300 tracking-wider uppercase">Provincia di Massa-Carrara</p>
            </div>
            <p className="text-[8px] text-slate-400 mt-0.5">
              {mapLayerType === 'satellite' ? "Livello Satellitare Esri World Imagery" : "Area operativa blindata Costa & Lunigiana"}
            </p>
          </div>

          <div 
            id="radar-map-wrapper"
            className={cn(
              "w-full relative flex-1",
              isRadarMonitorOnly ? "h-screen min-h-[500px]" : (isFullScreenMap ? "h-[calc(100vh-2rem)] min-h-[500px]" : "h-[750px] min-h-[550px]")
            )}
            style={{ minHeight: isRadarMonitorOnly ? "100vh" : (isFullScreenMap ? "calc(100vh - 2rem)" : "750px"), height: isRadarMonitorOnly ? "100vh" : (isFullScreenMap ? "calc(100vh - 2rem)" : "750px") }}
          >
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              minZoom={10}
              maxZoom={18}
              maxBounds={MASSA_CARRARA_BOUNDS}
              maxBoundsViscosity={1.0}
              className={cn("h-full w-full", isRadarMonitorOnly ? "rounded-none" : "rounded-2xl")}
              style={{ width: "100%", height: "100%", minHeight: "100%", background: "#0b0f19" }}
            >
              {mapLayerType === 'satellite' ? (
                <TileLayer
                  key="layer-satellite"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
              ) : (
                <TileLayer
                  key="layer-osm"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
              )}
              <MapController 
                bounds={MASSA_CARRARA_BOUNDS} 
                onMapReady={(map) => setMapInstance(map)} 
              />
              <MapClickEvents onMapClick={handleMapClick} />

              {/* Marker of temporary coordinate selection for caller */}
              {lat && lng && (
                <Marker 
                  key="temp-caller-marker"
                  position={[lat, lng]}
                  icon={L.divIcon({
                    className: "target-click-icon",
                    html: `
                      <div class="relative flex items-center justify-center">
                        <div class="absolute h-10 w-10 bg-red-400/20 rounded-full animate-ping"></div>
                        <div class="h-6 w-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/></svg>
                        </div>
                      </div>
                    `
                  })}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 text-xs space-y-1.5 min-w-[190px]">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold uppercase text-red-600 text-[10px]">Bersaglio Intervento</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLat(undefined);
                            setLng(undefined);
                          }}
                          className="text-slate-400 hover:text-red-600 text-[10px] font-bold px-1 rounded"
                          title="Rimuovi questo bersaglio temporaneo"
                        >
                          ✕ Chiudi
                        </button>
                      </div>
                      <p className="font-mono text-slate-700 text-[11px]">Lat: {lat.toFixed(6)}</p>
                      <p className="font-mono text-slate-700 text-[11px]">Lng: {lng.toFixed(6)}</p>
                      <button
                        type="button"
                        onClick={() => openGoogleStreetView(lat, lng)}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold p-1 rounded text-center flex items-center justify-center gap-1 text-[10px] shadow cursor-pointer transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Street View 360°
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLat(undefined);
                          setLng(undefined);
                        }}
                        className="w-full bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 font-bold p-1 rounded text-center flex items-center justify-center gap-1 text-[10px] border border-slate-300 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Rimuovi dalla Mappa
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Plot Geolocalized Guards with valid coordinates and active approved shift */}
              {(() => {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const activeOnMapGuards = guards.filter(g => {
                  const gLat = Number(g.lastLocation?.lat);
                  const gLng = Number(g.lastLocation?.lng);
                  const hasValidCoords = g.lastLocation && !isNaN(gLat) && !isNaN(gLng) && gLat !== 0 && gLng !== 0;
                  if (!hasValidCoords) return false;

                  // Considera in mappa solo le guardie con turno approvato per la data odierna
                  // che non sia terminato da più di 30 minuti (dopo 30 min la guardia scompare dal radar)
                  const hasApprovedShiftToday = shifts.some(s => {
                    const matchGuard = s.guardId === g.id || (g.matricola && s.matricola && g.matricola.replace(/\s+/g, "").toUpperCase() === s.matricola.replace(/\s+/g, "").toUpperCase());
                    if (!matchGuard || s.status !== 'approved' || s.date !== todayStr) return false;

                    if (!s.endTime) return true;
                    try {
                      const [endH, endM] = s.endTime.split(":").map(Number);
                      const [startH, startM] = (s.startTime || "00:00").split(":").map(Number);
                      const now = new Date();
                      const [y, m, d] = s.date.split("-").map(Number);
                      const endDate = new Date(y, m - 1, d, endH, endM, 0, 0);
                      if (endH < startH || (endH === startH && endM < startM)) {
                        endDate.setDate(endDate.getDate() + 1);
                      }
                      // 30 minuti dopo la fine del turno il marcatore scompare dalla mappa
                      const cutoff = new Date(endDate.getTime() + 30 * 60 * 1000);
                      return now <= cutoff;
                    } catch (e) {
                      return true;
                    }
                  });
                  return hasApprovedShiftToday;
                });

                return activeOnMapGuards.map((g, idx) => {
                  const isActiveOnDuty = true;
                  const gLatOriginal = Number(g.lastLocation!.lat);
                  const gLngOriginal = Number(g.lastLocation!.lng);

                  // DISACCOPPIAMENTO AUTOMATICO ANTI-SOVRAPPOSIZIONE INTELLETTIVO
                  let overlappingCount = 0;
                  for (let i = 0; i < idx; i++) {
                    const prevG = activeOnMapGuards[i];
                    if (prevG && prevG.lastLocation) {
                      const prevLat = Number(prevG.lastLocation.lat);
                      const prevLng = Number(prevG.lastLocation.lng);
                      const distance = Math.sqrt(Math.pow(prevLat - gLatOriginal, 2) + Math.pow(prevLng - gLngOriginal, 2));
                      if (distance < 0.00015) { // circa 15 metri di tolleranza
                        overlappingCount++;
                      }
                    }
                  }

                  let displayLat = gLatOriginal;
                  let displayLng = gLngOriginal;
                  if (overlappingCount > 0) {
                    const angle = overlappingCount * 0.8 + (overlappingCount * Math.PI * 0.45);
                    const radius = 0.00012 + (overlappingCount * 0.00004);
                    displayLat += Math.sin(angle) * radius;
                    displayLng += Math.cos(angle) * radius;
                  }

                  const gLat = displayLat;
                  const gLng = displayLng;
                  const activeCall = calls.find(c => c.assignedGuardId === g.id && c.status === 'pattuglia');
                  const pendingCall = calls.find(c => c.assignedGuardId === g.id && c.status === 'richiesta_inviata');
                  const takeChargeTime = activeCall ? getTakeChargeTimeLocal(activeCall) : "";
                  return (
                    <React.Fragment key={g.id}>
                      {activeCall && activeCall.lat && activeCall.lng && (
                        <Polyline
                          key={`cop-dest-poly-${g.id}-${activeCall.id}`}
                          positions={[[gLat, gLng], [Number(activeCall.lat), Number(activeCall.lng)]]}
                          color="#f43f5e"
                          weight={3}
                          dashArray="5, 10"
                        >
                          <Popup>
                            <div className="font-sans text-xs p-1 text-slate-900">
                              <p className="font-extrabold text-red-600 uppercase">Intervento In Corso</p>
                              <p className="text-slate-400 text-[9px] font-bold mt-0.5 bg-slate-100 p-1 rounded border">DIREGESI VERSO: {activeCall.localita}</p>
                            </div>
                          </Popup>
                        </Polyline>
                      )}
                      <Marker
                        key={`cop-guard-marker-${g.id}`}
                        position={[gLat, gLng]}
                        icon={L.divIcon({
                          className: "guard-active-marker",
                          html: `
                            <div class="relative flex flex-col items-center">
                              <div class="absolute h-8 w-8 ${isActiveOnDuty ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-400/20 border-slate-500'} border rounded-full animate-ping"></div>
                              ${takeChargeTime ? `
                                <div class="px-1.5 py-0.5 rounded text-[7px] font-black text-rose-200 bg-red-950 border border-red-500/35 uppercase tracking-wider leading-none mb-1 shadow-lg whitespace-nowrap">
                                  ⏱️ H:${takeChargeTime}
                                </div>
                              ` : ''}
                              <div class="px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider shadow-sm ${isActiveOnDuty ? 'bg-emerald-600' : 'bg-slate-600'}">
                                ${g.matricola}
                              </div>
                              <div class="h-4 w-4 bg-slate-950 border border-white rounded-full flex items-center justify-center shadow-md">
                                <span class="h-2 w-2 rounded-full ${isActiveOnDuty ? 'bg-emerald-400' : 'bg-slate-400'}"></span>
                              </div>
                            </div>
                          `
                        })}
                      >
                      <Popup>
                        <div className="p-2.5 space-y-2 text-xs min-w-[240px]">
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <div>
                              <p className="font-bold text-slate-900 text-sm leading-tight">{g.surname} {g.name}</p>
                              <p className="font-mono text-[10px] text-slate-600">Matr: <span className="font-bold">{g.matricola}</span></p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              activeCall 
                                ? "bg-rose-100 text-rose-700 border border-rose-300" 
                                : pendingCall
                                ? "bg-amber-100 text-amber-700 border border-amber-300"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            }`}>
                              {activeCall ? "🔴 Impegnata" : pendingCall ? "🟡 Attesa Accettaz." : "🟢 Libera"}
                            </span>
                          </div>

                          {/* Sezione Gestione Missione a 2 Fasi */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                              Gestione Incarico / Missione
                            </span>
                            
                            {selectedCall ? (
                              <div className="space-y-1.5">
                                <div className="text-[10px] bg-white p-1.5 rounded border border-slate-200">
                                  <p className="font-bold text-slate-800 truncate">📍 Chiamata: {selectedCall.localita}</p>
                                  <p className="text-[9px] text-slate-500">Stato: <span className="uppercase font-semibold">{selectedCall.status}</span></p>
                                </div>

                                {selectedCall.assignedGuardId === g.id ? (
                                  <div className="flex flex-col gap-1">
                                    {selectedCall.status === "richiesta_inviata" && (
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmAssignment(selectedCall.id, g)}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold p-1.5 rounded text-center text-[10px] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Check className="h-3 w-3" /> Convalida Accettazione Pattuglia
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleSendFullDetailsAndItinerary(selectedCall, g)}
                                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black p-1.5 rounded text-center text-[10px] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Navigation className="h-3 w-3" /> Invia Itinerario Navigazione GPS (Fase 2)
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestAvailability(selectedCall, g.id)}
                                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold p-1.5 rounded text-center text-[10px] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Send className="h-3 w-3" /> Invia Missione / Richiesta Disponibilità (Fase 1)
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div>
                                {calls.filter(c => c.status === "in_attesa").length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-[9px] text-slate-600">Seleziona una chiamata in standby da assegnare:</p>
                                    <select
                                      className="w-full text-[10px] p-1 rounded border border-slate-300 bg-white"
                                      onChange={(e) => {
                                        const c = calls.find(item => item.id === e.target.value);
                                        if (c) setSelectedCall(c);
                                      }}
                                      defaultValue=""
                                    >
                                      <option value="" disabled>-- Assegna richiesta in standby --</option>
                                      {calls.filter(c => c.status === "in_attesa").map(c => (
                                        <option key={c.id} value={c.id}>
                                          {c.localita} ({c.priority})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-slate-500 italic">Nessuna richiesta in attesa da assegnare.</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-1.5 flex flex-col gap-1.5 border-t">
                            <a
                              href={`tel:${g.phone || g.privateInfo?.cellulare}`}
                              onClick={() => selectedCall && trackCommunication(selectedCall.id, g, "Telefono")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium p-1.5 rounded text-center flex items-center justify-center gap-1.5 text-[10px]"
                            >
                              <Phone className="h-3 w-3" /> Chiama Cellulare
                            </a>
                            <a
                              href={`https://wa.me/${g.phone || g.privateInfo?.cellulare}?text=${encodeURIComponent(
                                `PROGETTO MASSA CARRARA:\nRichiesto contatto operativo:\nGuardia: ${g.surname} ${g.name} (Matr. ${g.matricola})`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => selectedCall && trackCommunication(selectedCall.id, g, "WhatsApp")}
                              className="bg-green-600 hover:bg-green-500 text-white font-medium p-1.5 rounded text-center flex items-center justify-center gap-1.5 text-[10px]"
                            >
                              <PhoneCall className="h-3 w-3" /> Invia WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetVideoGuard(g);
                                setVideoDialogOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-1.5 rounded text-center flex items-center justify-center gap-1.5 text-[10px] cursor-pointer"
                            >
                              <Video className="h-3 w-3" /> Videochiamata Bodycam
                            </button>
                            <button
                              type="button"
                              onClick={() => openGoogleStreetView(gLat, gLng)}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold p-1.5 rounded text-center flex items-center justify-center gap-1.5 text-[10px] cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3" /> Street View 360° Posizione
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              });
            })()}

              {/* Plot Emergency Calls under management */}
              {calls
                .filter(c => {
                  if (hiddenCallMarkerIds.includes(c.id)) return false;
                  const cLat = Number(c.lat);
                  const cLng = Number(c.lng);
                  if (c.status === 'risolto' || c.status === 'annullata' || isNaN(cLat) || isNaN(cLng) || cLat === 0 || cLng === 0) {
                    return false;
                  }

                  // Regola per interventi differibili / non urgenti (SLA 5 giorni):
                  // Trascorsi i 5 giorni, il marker scompare dalla mappa e rimane nell'Archivio Richieste Aperte (Da Fare)
                  if (c.isNonUrgent) {
                    const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : Date.now();
                    const nowMs = Date.now();
                    const diffDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);
                    if (diffDays >= 5 || c.isExpiredArchive) {
                      return false; // Rimosso dalla mappa radar dopo 5 giorni
                    }
                  }

                  return true;
                })
                .map((c) => {
                  const cLat = Number(c.lat);
                  const cLng = Number(c.lng);
                  const isDiff = Boolean(c.isNonUrgent);

                  // Calcolo giorni trascorsi e rimanenti per interventi differibili
                  let daysRemaining = 5;
                  let daysElapsed = 0;
                  if (isDiff && c.createdAt) {
                    const createdMs = new Date(c.createdAt).getTime();
                    const elapsedMs = Date.now() - createdMs;
                    daysElapsed = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
                    daysRemaining = Math.max(0, 5 - daysElapsed);
                  }

                  // Determinazione stile fumetto / icona in base all'urgenza e ai giorni
                  const markerColorBg = isDiff 
                    ? (daysRemaining <= 1 ? 'bg-red-700' : daysRemaining <= 2 ? 'bg-amber-600' : 'bg-blue-600')
                    : (c.priority === 'emergenza' ? 'bg-[#991b1b]' : c.priority === 'alta' ? 'bg-[#c2410c]' : 'bg-[#1e293b]');

                  const pulseColor = isDiff
                    ? (daysRemaining <= 1 ? 'bg-red-500/40' : 'bg-blue-500/25')
                    : (c.priority === 'emergenza' ? 'bg-red-500/30' : 'bg-amber-500/30');

                  return (
                    <Marker
                      key={c.id}
                      position={[cLat, cLng]}
                      icon={L.divIcon({
                        className: "emergency-incident-marker",
                        html: `
                          <div class="relative flex items-center justify-center">
                            <div class="absolute h-9 w-9 ${pulseColor} rounded-full animate-pulse"></div>
                            <div class="h-7 w-7 rounded-lg border border-white flex items-center justify-center shadow-2xl ${markerColorBg}">
                              ${isDiff 
                                ? `<span class="text-[10px] font-black text-white font-mono">${daysRemaining}g</span>`
                                : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
                              }
                            </div>
                          </div>
                        `
                      })}
                    >
                      {/* Fumetto con data di assegnazione e giorni rimanenti */}
                      <Tooltip permanent direction="top" className="custom-tooltip-label">
                        <div className={`border text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap font-sans tracking-wide ${
                          isDiff 
                            ? (daysRemaining <= 1 
                                ? 'bg-red-950/95 border-red-500 text-red-200' 
                                : daysRemaining <= 2 
                                ? 'bg-amber-950/95 border-amber-500 text-amber-200' 
                                : 'bg-blue-950/95 border-blue-500 text-blue-200')
                            : 'bg-red-950/95 border-red-500/50 text-red-200'
                        }`}>
                          {isDiff && (
                            <span className="mr-1 text-[8.5px] bg-black/40 px-1 py-0.2 rounded border border-white/20">
                              📅 Ass: {safeFormatDate(c.createdAt, "dd/MM")} • {daysRemaining}g rim.
                            </span>
                          )}
                          {c.comune ? `${c.comune.toUpperCase()} - ` : ""}{c.localita} {c.priority === 'emergenza' ? '🚨' : ''}
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-2 space-y-1.5 text-xs text-slate-950 min-w-[230px]">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className={`font-bold uppercase text-[10px] ${isDiff ? 'text-blue-700' : 'text-red-600'}`}>
                              {isDiff ? '🗓️ Intervento Differibile (5gg)' : '!! EMERGENZA SOS !!'}
                            </span>
                            <span className="font-mono text-[9px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded">{c.priority}</span>
                          </div>

                          {isDiff && (
                            <div className={`p-1.5 rounded border text-[10.5px] font-medium leading-tight ${
                              daysRemaining <= 1 
                                ? 'bg-red-50 border-red-300 text-red-800' 
                                : daysRemaining <= 2 
                                ? 'bg-amber-50 border-amber-300 text-amber-800' 
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                              <p className="font-bold flex items-center justify-between">
                                <span>📅 Assegnato il: {safeFormatDate(c.createdAt, "dd/MM/yyyy HH:mm")}</span>
                                <span className="font-mono font-black">{daysRemaining} gg rimanenti</span>
                              </p>
                              <p className="text-[9.5px] mt-0.5 text-slate-600">
                                Scadenza max: {c.deadlineAt ? safeFormatDate(c.deadlineAt, "dd/MM/yyyy") : '5 giorni'}
                              </p>
                              {c.assignedGuardName && (
                                <p className="text-[10px] font-bold text-slate-900 mt-1">
                                  🛡️ Pattuglia: {c.assignedGuardName}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Blindatura Privacy: I dati anagrafici del richiedente sono protetti */}
                          <div className="border border-slate-200 p-1 rounded bg-slate-50 text-[10.5px]">
                            {isAdminOrResponsabile ? (
                              <>
                                <p className="font-bold text-slate-900">Richiedente: <span className="font-normal">{c.callerName || "Anonimo"}</span></p>
                                {c.callerPhone && <p className="font-mono text-[10px] text-slate-600">Tel: {c.callerPhone}</p>}
                              </>
                            ) : (
                              <p className="font-semibold text-slate-700 flex items-center gap-1">
                                🔒 Richiedente: <span className="italic text-slate-500 font-normal">[Riservato Centrale]</span>
                              </p>
                            )}
                          </div>

                          <p className="text-slate-800 font-medium">Luogo: <span className="font-normal">{c.comune ? `${c.comune.toUpperCase()} - ` : ""}{c.localita}</span></p>
                          <p className="text-slate-700 bg-slate-100 p-1.5 rounded font-sans leading-tight text-[11px] border border-slate-200">{c.description}</p>
                          
                          <Button 
                            onClick={() => {
                              setSelectedCall(c);
                              setMapCenter([c.lat, c.lng]);
                            }}
                            className="w-full bg-slate-900 text-white font-semibold hover:bg-slate-800 text-[10px] py-1 h-7 rounded"
                          >
                            Visualizza Scheda Dettaglio
                          </Button>
                          
                          {/* Pulsanti Solleciti e Allarme 3 Fasi per Centrale */}
                          {isDiff && c.assignedGuardId && (
                            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSendPhaseReminder(c, 2)}
                                className="bg-amber-600 hover:bg-amber-500 text-white text-[8.5px] font-bold h-6 px-1"
                                title="Invia Promemoria 3° Giorno (Fase 2)"
                              >
                                ⚠️ Fase 2 (3° gg)
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSendPhaseReminder(c, 3)}
                                className="bg-red-600 hover:bg-red-500 text-white text-[8.5px] font-bold h-6 px-1"
                                title="Invia Allarme 5° Giorno Scadenza (Fase 3)"
                              >
                                🚨 Fase 3 (5° gg)
                              </Button>
                            </div>
                          )}

                          <Button 
                            type="button"
                            onClick={() => openGoogleStreetView(cLat, cLng)}
                            className="w-full bg-amber-600 text-white font-bold hover:bg-amber-500 text-[10px] py-1 h-7 rounded flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Street View Luogo
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              setHiddenCallMarkerIds(prev => [...prev, c.id]);
                            }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1 px-2 rounded text-[9.5px] border border-slate-300 flex items-center justify-center gap-1 transition-colors"
                            title="Nasconde il bersaglio dalla mappa, mantenendo l'intervento salvato nella lista"
                          >
                            <EyeOff className="h-3 w-3" /> Nascondi Bersaglio da Mappa
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResolveCallDirect(c.id)}
                            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-1 px-2 rounded text-[9.5px] border border-emerald-300 flex items-center justify-center gap-1 transition-colors"
                            title="Archivia l'intervento come risolto"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Risolvi & Archivia Intervento
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCallDirect(c.id)}
                            className="w-full bg-red-100 hover:bg-red-200 text-red-800 font-black py-1 px-2 rounded text-[9.5px] border border-red-300 flex items-center justify-center gap-1 transition-colors"
                            title="Elimina definitivamente questa chiamata o simulazione da Firestore"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" /> 🗑️ Elimina Definitivamente (Simulazione)
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

              {/* Plot Active Missions - REGOLA BLINDATA: Il bersaglio/marker viene rimosso una volta che la missione viene accettata/presa in carico (status !== 'pending') */}
              {missions
                .filter(m => {
                  const mLat = Number(m.lat);
                  const mLng = Number(m.lng);
                  return m.status === 'pending' && !isNaN(mLat) && !isNaN(mLng) && mLat !== 0 && mLng !== 0;
                })
                .map((m) => {
                  const mLat = Number(m.lat);
                  const mLng = Number(m.lng);
                  const assignedG = guards.find(g => g.id === m.guardId);
                  const gLat = assignedG ? Number(assignedG.lastLocation?.lat) : null;
                  const gLng = assignedG ? Number(assignedG.lastLocation?.lng) : null;
                  
                  return (
                    <React.Fragment key={m.id}>
                      {gLat && gLng && !isNaN(gLat) && !isNaN(gLng) && gLat !== 0 && gLng !== 0 && (
                        <Polyline
                          key={`cop-mission-poly-${m.id}`}
                          positions={[[gLat, gLng], [mLat, mLng]]}
                          color="#a5b4fc"
                          weight={3}
                          dashArray="5, 10"
                        >
                          <Popup>
                            <div className="font-sans text-xs p-1 text-slate-900">
                              <p className="font-extrabold text-indigo-600 uppercase">Missione In Corso</p>
                              <p className="text-slate-500 text-[9px] mt-0.5 leading-tight">MESSA IN CARICO A: {m.guardName.toUpperCase()}</p>
                              <p className="text-slate-600 text-[9px] uppercase font-bold mt-1">Destinazione: {m.address}</p>
                            </div>
                          </Popup>
                        </Polyline>
                      )}
                      <Marker
                        key={`cop-mission-marker-${m.id}`}
                        position={[mLat, mLng]}
                        icon={L.divIcon({
                          className: "mission-marker-icon",
                          html: `
                            <div class="relative flex items-center justify-center">
                              <div class="absolute h-9 w-9 bg-indigo-500/30 rounded-full animate-pulse"></div>
                              <div class="h-7 w-7 rounded-full border border-white flex items-center justify-center shadow-2xl bg-indigo-900">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                              </div>
                            </div>
                          `
                        })}
                      >
                        <Tooltip permanent direction="top" className="custom-tooltip-label">
                          <div className="bg-indigo-950/95 border border-indigo-500/50 text-indigo-200 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap font-sans tracking-wide">
                            📌 MISSIONE: {assignedG ? assignedG.matricola : m.guardName.toUpperCase()}
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="p-2 space-y-1 text-xs text-slate-950 w-52">
                            <div className="flex justify-between items-center border-b pb-1">
                              <span className="font-bold uppercase text-indigo-600 font-sans tracking-wider text-[10px]">📋 Missione Operativa Al Campo</span>
                              <span className="font-mono text-[9px] bg-indigo-100 px-1 rounded uppercase font-bold">{m.priority}</span>
                            </div>
                            <p className="font-bold mt-1">Destinatario: {m.guardName}</p>
                            <p className="italic text-[10px] text-slate-600">Località: {m.address}</p>
                            <p className="text-slate-700 bg-indigo-50/50 p-1.5 rounded my-1 font-sans text-[10px] leading-tight">{m.description || "Nessuna descrizione"}</p>
                            <div className="text-[8.5px] text-slate-500 uppercase font-bold pt-1 border-t">Stato: {m.status === 'pending' ? '🟡 IN ATTESA' : '🟢 INIZIATA'}</div>
                            
                            <div className="pt-2 flex flex-col gap-1.5">
                              <button
                                onClick={() => handleUpdateMissionStatus(m.id, "completed")}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] py-1.5 px-2 rounded uppercase transition-colors cursor-pointer"
                              >
                                ✓ Completa / Chiudi
                              </button>
                              <button
                                type="button"
                                onClick={() => openGoogleStreetView(mLat, mLng)}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1.5 px-2 rounded uppercase transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <ExternalLink className="h-2.5 w-2.5" /> Street View Destinazione
                              </button>
                              <button
                                onClick={() => handleDeleteMission(m.id)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] py-1 px-2 rounded uppercase transition-colors cursor-pointer"
                              >
                                ❌ Elimina Definitivamente
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}


            </MapContainer>
          </div>
        </div>

        {/* DRAGGABLE PRESENZA IN CARICO INTERVENTO - ORIZZONTALE */}
        {showIntakeForm && (
          <div 
            className="absolute z-[1000] w-[95vw] max-w-[1100px] max-h-[88vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md"
            style={{ left: `${formPos.x}px`, top: `${formPos.y}px` }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Drag Handle Title Bar */}
            <div 
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="drag-handle bg-slate-950 p-2.5 px-4 cursor-grab active:cursor-grabbing flex justify-between items-center border-b border-slate-800 select-none shrink-0"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Presa in Carico e Invio Missione Intervento (Layout Orizzontale)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setIsFormMinimized(!isFormMinimized)}
                  className="h-6 px-2 text-[10px] text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-1 font-semibold"
                  title="Riduci/Espandi"
                >
                  {isFormMinimized ? "📂 Espandi" : "➖ Riduci"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setShowIntakeForm(false)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Form Fields & Fixed Footer (hidden when minimized) */}
            {!isFormMinimized && (
              <form onSubmit={handleCreateCall} className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                <div className="p-3.5 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex-1 space-y-3">
                  {/* SELETTORE SETTORE MISSIONE (4 PULSANTI) */}
                  <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Sezione / Specialità Missione:
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedSector("zoofila")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                          selectedSector === "zoofila"
                            ? "bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/50"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <span>🐾</span>
                        <span>Zoofila</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedSector("ittica")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                          selectedSector === "ittica"
                            ? "bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-900/50"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <Fish className="h-3.5 w-3.5" />
                        <span>Ittica</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedSector("venatoria")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                          selectedSector === "venatoria"
                            ? "bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-900/50"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <span>🦅</span>
                        <span>Venatoria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedSector("ambientale")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                          selectedSector === "ambientale"
                            ? "bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-900/50"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <Trees className="h-3.5 w-3.5" />
                        <span>Ambiente</span>
                      </button>
                    </div>
                  </div>

                  {/* HORIZONTAL 4-COLUMN GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-start">
                    
                    {/* COLUMN 1: RICHIEDENTE E CONTATTI */}
                    <div className="space-y-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 border-b border-slate-800/60 pb-1">
                        1. Richiedente & Contatto
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 uppercase block font-bold">Nome e Cognome *</Label>
                        <Input 
                          placeholder="es. Mario Rossi"
                          value={callerName}
                          onChange={(e) => setCallerName(e.target.value)}
                          required
                          className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg h-8 px-2 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 uppercase block font-bold">Telefono / Cellulare</Label>
                        <Input 
                          type="tel"
                          placeholder="es. 3331234567"
                          value={callerPhone}
                          onChange={(e) => setCallerPhone(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg font-mono h-8 px-2 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 block font-bold font-mono">Data e Ora Chiamata:</Label>
                        <Input 
                          type="datetime-local"
                          value={customDateTime}
                          onChange={(e) => setCustomDateTime(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-[10px] text-slate-300 rounded-lg h-8 px-1 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* COLUMN 2: LOCALIZZAZIONE E INDIRIZZO */}
                    <div className="space-y-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400 border-b border-slate-800/60 pb-1">
                        2. Territorio & Indirizzo
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 uppercase block font-bold">Comune *</Label>
                        <Input 
                          placeholder="es. Massa, Carrara"
                          value={comune}
                          onChange={(e) => setComune(e.target.value)}
                          required
                          className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg h-8 px-2 focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 uppercase block font-bold">Località / Indirizzo *</Label>
                        <Input 
                          placeholder="Via / Piazza e N. civico"
                          value={localita}
                          onChange={(e) => setLocalita(e.target.value)}
                          required
                          className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg h-8 px-2 font-semibold focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 block font-bold">Note Operative Extra:</Label>
                        <Input 
                          placeholder="es. Riferimenti o indicazioni stradali..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg h-8 px-2 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* COLUMN 3: GPS E MAPPA */}
                    <div className="space-y-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                          3. Coordinate GPS
                        </span>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={handleGeocodeAddress}
                          disabled={isGeocoding || (!comune && !localita)}
                          className="h-5 px-2 text-[8px] bg-indigo-950/50 border-indigo-800 text-indigo-300 hover:bg-indigo-900 hover:text-white transition-all font-bold uppercase"
                        >
                          {isGeocoding ? "..." : "🔍 Cerca GPS"}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <div className="space-y-0.5">
                          <Label className="text-[8px] text-slate-400 block font-mono">Latitudine:</Label>
                          <Input 
                            type="number"
                            step="0.000001"
                            placeholder="44.035..."
                            value={lat ?? ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setLat(isNaN(val) ? undefined : val);
                            }}
                            className="bg-slate-900 border-slate-800 text-xs text-slate-200 rounded-lg font-mono h-7 px-1.5 focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[8px] text-slate-400 block font-mono">Longitudine:</Label>
                          <Input 
                            type="number"
                            step="0.000001"
                            placeholder="10.140..."
                            value={lng ?? ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setLng(isNaN(val) ? undefined : val);
                            }}
                            className="bg-slate-900 border-slate-800 text-xs text-slate-200 rounded-lg font-mono h-7 px-1.5 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="text-[8px] text-slate-400 italic bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                        {lat && lng ? `✓ Punto fisso GPS impostato: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : "⚠️ Clicca sulla mappa o inserisci indirizzo per coordinate fissee"}
                      </div>
                    </div>

                    {/* COLUMN 4: ASSEGNAZIONE, CHIAMATA PATTUGLIA E DETTAGLI EVENTO */}
                    <div className="space-y-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 border-b border-slate-800/60 pb-1 flex justify-between items-center">
                        <span>4. Assegnazione & Pattuglia</span>
                        {assignedGuardId && assignedGuardId !== "none" && (
                          <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded">
                            SELEZIONATO
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-slate-400 block font-bold">Priorità:</Label>
                          <Select 
                            value={isNonUrgentForm ? "bassa" : priority} 
                            disabled={isNonUrgentForm}
                            onValueChange={(v: any) => setPriority(v)}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg h-7 px-1.5">
                              <SelectValue placeholder="Priorità..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-xs text-white">
                              <SelectItem value="bassa">BASSA</SelectItem>
                              <SelectItem value="media">MEDIA</SelectItem>
                              <SelectItem value="alta">ALTA</SelectItem>
                              <SelectItem value="emergenza">EMERGENZA 🚨</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-slate-400 block font-bold">Assegna Pattuglia:</Label>
                          <Select value={assignedGuardId} onValueChange={setAssignedGuardId}>
                            <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg h-7 px-1.5">
                              <SelectValue placeholder="Seleziona..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-xs text-white">
                              <SelectItem value="none">Centrale / Sospeso</SelectItem>
                              {guards
                                .filter(g => g.isAvailable !== false)
                                .slice()
                                .sort((a, b) => formatGuardOptionName(a).localeCompare(formatGuardOptionName(b)))
                                .map((g) => {
                                  const gPhone = g.phone || (g as any).privateInfo?.cellulare || "";
                                  return (
                                    <SelectItem key={g.id} value={g.id}>
                                      {formatGuardOptionName(g)} {gPhone ? "📞" : ""}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* TOGGLE INTERVENTO DIFFERIBILE (SLA 5 GIORNI) */}
                      <div className="p-1.5 rounded-lg border border-blue-500/40 bg-blue-950/30 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isNonUrgentForm}
                            onChange={(e) => setIsNonUrgentForm(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-blue-400 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                          />
                          <div className="text-[9.5px]">
                            <span className="font-black text-blue-300 uppercase">Intervento Differibile</span>
                            <p className="text-[8px] text-slate-400">SLA 5 giorni per evasione e verbale</p>
                          </div>
                        </label>
                        {isNonUrgentForm && (
                          <span className="text-[8px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded shadow">
                            5 GIORNI
                          </span>
                        )}
                      </div>

                      {/* QUICK CALL / WHATSAPP ACTIONS FOR SELECTED GUARD */}
                      {(() => {
                        const selectedG = guards.find(g => g.id === assignedGuardId);
                        const selectedPhone = selectedG ? (selectedG.phone || (selectedG as any).privateInfo?.cellulare || "") : "";
                        if (selectedG && selectedPhone) {
                          const cleanPhone = selectedPhone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
                          const fullNumber = cleanPhone.startsWith('+') ? cleanPhone : cleanPhone.startsWith('00') ? `+${cleanPhone.slice(2)}` : `+39${cleanPhone.replace(/^0+/, '')}`;
                          const waText = encodeURIComponent(
                            `*CENTRALE OPERATIVA C.O.E.T.A. - DISPATCH MISSIONE*\n\n` +
                            `🛡️ *Operatore:* ${selectedG.surname} ${selectedG.name} [${selectedG.matricola || 'N/D'}]\n` +
                            `🏷️ *Settore:* ${selectedSector.toUpperCase()}\n` +
                            `📍 *Destinazione:* ${comune ? `${comune.toUpperCase()} - ` : ''}${localita || 'Territorio'}\n` +
                            `🚨 *Priorità:* ${isNonUrgentForm ? 'DIFFERIBILE (SLA 5 GIORNI)' : priority.toUpperCase()}\n` +
                            (isNonUrgentForm ? `⏳ *Termine:* 5 giorni per evasione e verbale\n` : '') +
                            `👤 *Richiedente:* [DATO RISERVATO CENTRALE C.O.E.T.A.]\n` +
                            (description ? `📝 *Evento:* ${description}\n` : '') +
                            (notes ? `ℹ️ *Note:* ${notes}\n` : '') +
                            (lat && lng ? `🗺️ *Coordinate GPS:* https://maps.google.com/?q=${lat},${lng}\n` : '') +
                            `\n_Si richiede conferma di ricezione e presa in carico._`
                          );
                          return (
                            <div className="bg-slate-900/90 border border-indigo-500/40 p-1.5 rounded-lg flex items-center justify-between gap-1.5">
                              <span className="text-[8.5px] font-mono text-indigo-300 truncate">
                                📞 {selectedPhone}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow transition-all active:scale-95"
                                  title="Chiama direttamente la Guardia al telefono"
                                >
                                  <Phone className="h-2.5 w-2.5" /> Chiama
                                </a>
                                <a
                                  href={`https://wa.me/${fullNumber.replace('+', '')}?text=${waText}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 rounded text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow transition-all active:scale-95"
                                  title="Invia dettagli missione via WhatsApp"
                                >
                                  📲 WhatsApp
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetVideoGuard(selectedG);
                                    setVideoDialogOpen(true);
                                  }}
                                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow transition-all active:scale-95 cursor-pointer"
                                  title="Avvia Videochiamata o Streaming Bodycam"
                                >
                                  <Video className="h-2.5 w-2.5" /> Video
                                </button>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-slate-400 uppercase block font-bold">Descrizione Evento *</Label>
                        <Textarea 
                          required
                          placeholder="Dettagli sintetici dell'intervento..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={2}
                          className="bg-slate-900 border-slate-800 text-xs text-white rounded-lg p-1.5 resize-none h-10 focus:border-amber-500"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* FIXED ALWAYS-VISIBLE HORIZONTAL BOTTOM ACTION BAR */}
                <div className="shrink-0 bg-slate-950 p-2.5 px-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-[10px] text-slate-400 font-mono hidden sm:flex items-center gap-2">
                    <span>💡 Modalità Orizzontale • Schermo Tablet/PC ottimizzato</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handlePrintMissionDraft}
                      className="flex-1 sm:flex-none bg-indigo-950/60 border-indigo-700/80 text-indigo-200 hover:bg-indigo-900 hover:text-white text-xs uppercase font-bold h-9 px-3 rounded-xl flex items-center gap-1.5"
                      title="Stampa Scheda / Foglio di Missione A4 per la pattuglia"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Stampa Foglio Missione</span>
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCallerName("");
                        setCallerPhone("");
                        setComune("");
                        setLocalita("");
                        setLat(undefined);
                        setLng(undefined);
                        setDescription("");
                        setAssignedGuardId("");
                        setSelectedSector("zoofila");
                        setNotes("");
                        setIsFormMinimized(false);
                        setShowIntakeForm(false);
                      }}
                      className="flex-1 sm:flex-none bg-slate-900 border-slate-800 text-slate-300 hover:text-white text-xs uppercase font-bold h-9 px-4 rounded-xl"
                    >
                      Annulla / Svuota
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1 sm:flex-none bg-red-600 hover:bg-red-500 text-white font-black h-9 px-6 rounded-xl border border-red-500 shadow-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      ✓ SALVA ED INVIA MISSIONE
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Floating FAB to reopen Form if closed (nascosto su 2° monitor) */}
        {!showIntakeForm && !isRadarMonitorOnly && (
          <Button
            type="button"
            onClick={() => {
              setShowIntakeForm(true);
              setIsFormMinimized(false);
            }}
            className="absolute bottom-4 left-4 z-[999] bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-2xl border border-red-500 px-3 py-2 text-[10px] tracking-wider uppercase flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Nuova Presa In Carico
          </Button>
        )}
      </div>

      {/* Columns: Active Incident list, Useful/Territorial items - Hidden in dedicated 2nd monitor */}
      {!isRadarMonitorOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Real-time Incidents Grid/List - Full Screen Width 12 Columns */}
          <div className="lg:col-span-12 space-y-4">
            <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center">
              <h2 className="text-base font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-500" />
                Registro Emergenze territoriali
              </h2>
             <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0 shadow-lg">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCallFilter("attive")}
                className={`text-xs font-bold py-1 h-8 px-3.5 rounded-lg transition-all ${
                  callFilter === 'attive' 
                    ? 'bg-red-600 text-white shadow-md border border-red-500 scale-105' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                🚨 In Corso
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCallFilter("risolte")}
                className={`text-xs font-bold py-1 h-8 px-3.5 rounded-lg transition-all ${
                  callFilter === 'risolte' 
                    ? 'bg-emerald-600 text-white shadow-md border border-emerald-500 scale-105' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                ✅ Risolte
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCallFilter("annullate")}
                className={`text-xs font-bold py-1 h-8 px-3.5 rounded-lg transition-all ${
                  callFilter === 'annullate' 
                    ? 'bg-amber-650 text-white shadow-md border border-amber-500 scale-105' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                ⚠️ Annullate
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCallFilter("non_urgenti")}
                className={`text-xs font-bold py-1 h-8 px-3.5 rounded-lg transition-all ${
                  callFilter === 'non_urgenti' 
                    ? 'bg-blue-600 text-white shadow-md border border-blue-400 scale-105' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Visualizza interventi differibili con scadenza 5 giorni"
              >
                🗓️ Differibili 5gg ({calls.filter(c => c.isNonUrgent && c.status !== 'risolto' && c.status !== 'annullata').length})
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCallFilter("tutte")}
                className={`text-xs font-bold py-1 h-8 px-3.5 rounded-lg transition-all ${
                  callFilter === 'tutte' 
                    ? 'bg-indigo-600 text-white shadow-md border border-indigo-500 scale-105' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                📑 Tutte ({calls.length})
              </Button>

              <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => setIsNonUrgentModalOpen(true)}
                className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 hover:text-white font-bold h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 uppercase text-[10px] tracking-wider transition-all"
                title="Gestione e Controllo Scadenze Interventi Non Urgenti (SLA 5 Giorni / Da Fare)"
              >
                <Clock className="h-4 w-4 text-amber-400" />
                Dossier 5 Giorni / Da Fare
              </Button>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsContactsModalOpen(true)}
                className="bg-indigo-950/40 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 hover:text-white font-bold h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 uppercase text-[10px] tracking-wider transition-all"
              >
                <Users className="h-4 w-4 text-indigo-400" />
                Rubrica Rapida Contatti
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cerca per Richiedente, Capo pattuglia, Località, Dettaglio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border-slate-800 pl-10 text-xs text-white placeholder-slate-500 h-10 rounded-xl"
            />
          </div>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredCalls.length === 0 ? (
              <div className="py-20 border border-slate-900 border-dashed rounded-2xl bg-slate-950/20 text-center text-xs italic text-slate-500">
                Nessuna chiamata nel database per questo filtro.
              </div>
            ) : (
              filteredCalls.map((call) => {
                const priorityColor = 
                  call.priority === 'emergenza' ? 'border-red-600 bg-red-950/20 text-red-500' :
                  call.priority === 'alta' ? 'border-amber-600 bg-amber-950/20 text-amber-500' :
                  'border-slate-800 bg-slate-950/50 text-slate-400';

                const statusBadge = 
                  call.status === 'risolto' ? 'bg-emerald-600 text-white' :
                  call.status === 'annullata' ? 'bg-slate-700 text-slate-200 line-through' :
                  call.status === 'richiesta_inviata' ? 'bg-amber-500 text-slate-950 font-black animate-pulse' :
                  call.status === 'pattuglia' ? 'bg-blue-600 text-white animate-pulse' :
                  call.status === 'inoltrata' ? 'bg-amber-600 text-white' :
                  'bg-red-600 text-white';

                const isSelected = selectedCall?.id === call.id;

                return (
                  <div
                    key={call.id}
                    onClick={() => focusCallOnMap(call)}
                    className={`p-4 border rounded-2xl transition-all cursor-pointer flex flex-col gap-3 relative hover:border-slate-700 ${
                      isSelected ? 'border-red-500 bg-slate-900/50' : 'border-slate-900 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusBadge} uppercase tracking-widest text-[8.5px] font-mono px-2 py-0.5`}>
                            {call.status}
                          </Badge>
                          <Badge variant="outline" className={`${priorityColor} uppercase text-[8.5px] font-mono border`}>
                            {call.priority}
                          </Badge>
                          {call.isNonUrgent && (
                            <Badge className="bg-blue-900/80 text-blue-200 border border-blue-600 text-[8.5px] font-mono px-2 py-0.5">
                              🗓️ DIFFERIBILE (5 GG)
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-200 mt-1 flex items-center gap-1.5 uppercase tracking-wide">
                          {isAdminOrResponsabile ? (
                            <span>{call.callerName || "Anonimo"}</span>
                          ) : (
                            <span className="text-slate-400 font-medium">[DATO RISERVATO CENTRALE]</span>
                          )}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {safeFormatDate(call.createdAt, "dd/MM/yy HH:mm")}
                        </span>
                        {call.isNonUrgent && call.createdAt && (
                          <span className="text-[9px] font-black text-amber-400 font-mono block mt-0.5">
                            {(() => {
                              const createdMs = new Date(call.createdAt).getTime();
                              const elapsedDays = Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24));
                              const remaining = Math.max(0, 5 - elapsedDays);
                              return `${remaining} gg rimanenti (su 5)`;
                            })()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-400">
                      <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="font-medium">
                        {call.comune ? `${call.comune.toUpperCase()} - ` : ""}{call.localita}
                      </span>
                    </div>

                    <p className="text-slate-400 text-xs leading-relaxed italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 max-h-24 overflow-y-auto">
                      {call.description}
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="h-3 w-3 text-blue-400 shrink-0" />
                        <span>Pattuglia: {call.assignedGuardName ? (
                          <span className={call.status === 'richiesta_inviata' ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                            {call.assignedGuardName} {call.status === 'richiesta_inviata' ? '(In attesa)' : ''}
                          </span>
                        ) : (
                          <span className="text-red-500 font-bold">DA ASSEGNARE</span>
                        )}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Hide / Show Target Marker Toggle */}
                        {call.lat && call.lng && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hiddenCallMarkerIds.includes(call.id)) {
                                setHiddenCallMarkerIds(prev => prev.filter(id => id !== call.id));
                              } else {
                                setHiddenCallMarkerIds(prev => [...prev, call.id]);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-bold flex items-center gap-1 transition-all ${
                              hiddenCallMarkerIds.includes(call.id)
                                ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                : 'bg-red-950/60 text-red-300 hover:bg-red-900 border border-red-800/60'
                            }`}
                            title={hiddenCallMarkerIds.includes(call.id) ? "Mostra bersaglio sulla mappa" : "Nascondi bersaglio dalla mappa"}
                          >
                            {hiddenCallMarkerIds.includes(call.id) ? (
                              <>
                                <Eye className="h-3 w-3 text-slate-400" /> Mostra Mappa
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 text-red-400" /> Nascondi Mappa
                              </>
                            )}
                          </button>
                        )}
                        <span className="text-[9px] text-slate-600">ID: {call.id.substring(0, 6)}</span>
                      </div>
                    </div>

                    {/* Expand Details Panel inside list if selected */}
                    {isSelected && (
                      <div className="mt-2 pt-3 border-t border-slate-800 space-y-4 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Contatto Cittadino / Telefono Richiedente:</Label>
                          <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={isAdminOrResponsabile ? (call.callerPhone || "Non inserito") : "[RISERVATO CENTRALE / SEGRETO D'UFFICIO]"} 
                              className="bg-slate-950 border-slate-800 text-slate-300 font-mono text-xs h-9"
                            />
                            {isAdminOrResponsabile && call.callerPhone && (
                              <a 
                                href={`tel:${call.callerPhone}`}
                                className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl h-9 w-9 border border-emerald-500"
                                title="Chiama richiedente (esclusivo Centrale)"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {call.status !== "annullata" && (
                          <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] text-indigo-400 uppercase tracking-wider block font-extrabold">
                                Gestione Assegnazione Pattuglia (Workflow 3 Fasi):
                              </Label>
                              {call.status === 'richiesta_inviata' && (
                                <span className="text-[9.5px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded-full animate-pulse">
                                  ⏳ In attesa di risposta
                                </span>
                              )}
                              {call.status === 'pattuglia' && (
                                <span className="text-[9.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2 py-0.5 rounded-full">
                                  ✓ Incarico Accettato
                                </span>
                              )}
                            </div>

                            {/* Guard Selector */}
                            <div className="space-y-1">
                              <span className="text-[9.5px] text-slate-400 font-medium">1. Seleziona Pattuglia / Guardia:</span>
                              <Select 
                                value={pendingRequestGuardIdByCall[call.id] || call.assignedGuardId || "none"} 
                                onValueChange={(val) => {
                                  setPendingRequestGuardIdByCall(prev => ({ ...prev, [call.id]: val }));
                                  if (val === "none") {
                                    handleUpdateCallGuard(call.id, "none");
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white rounded-xl h-9">
                                  <SelectValue placeholder="Seleziona pattuglia..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-xs text-white">
                                  <SelectItem value="none">Senza assegnazione</SelectItem>
                                  {guards
                                    .filter(g => g.isAvailable !== false)
                                    .slice()
                                    .sort((a, b) => formatGuardOptionName(a).localeCompare(formatGuardOptionName(b)))
                                    .map((g) => (
                                      <SelectItem key={g.id} value={g.id}>
                                        {formatGuardOptionName(g)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Workflow Actions */}
                            {(() => {
                              const activeGuardId = pendingRequestGuardIdByCall[call.id] || call.assignedGuardId;
                              const targetG = guards.find(g => g.id === activeGuardId);
                              if (!targetG || activeGuardId === "none") return null;

                              return (
                                <div className="space-y-2 pt-1 border-t border-slate-850">
                                  {/* Step A: Invia richiesta di disponibilità */}
                                  {call.status !== 'pattuglia' && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRequestAvailability(call, targetG.id);
                                        }}
                                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] h-8 rounded-lg shadow flex items-center justify-center gap-1.5"
                                      >
                                        <Send className="h-3 w-3" />
                                        Invia Richiesta Disponibilità
                                      </Button>

                                      {/* Step B: Conferma accettazione */}
                                      {call.status === 'richiesta_inviata' && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleConfirmAssignment(call.id, targetG);
                                          }}
                                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] h-8 rounded-lg shadow flex items-center justify-center gap-1.5"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Ha Accettato (Conferma)
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {/* Step C: Invia Dettagli Completi e Itinerario Navigazione GPS */}
                                  {call.status === 'pattuglia' && (
                                    <div className="space-y-1.5 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                                      <div className="flex items-center justify-between text-emerald-300 text-[10px] font-bold">
                                        <span>2. Trasmissione Dati & Navigazione:</span>
                                        <span className="font-mono text-[9px] text-emerald-400">Assegnato a {targetG.surname}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSendFullDetailsAndItinerary(call, targetG);
                                          }}
                                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] h-8 rounded-lg shadow flex items-center justify-center gap-1.5"
                                        >
                                          <MessageSquare className="h-3.5 w-3.5" />
                                          Invia Indirizzo, Dettagli e Itinerario GPS
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const hasCoords = Boolean(call.lat && call.lng);
                                            const navUrl = hasCoords 
                                              ? `https://www.google.com/maps/dir/?api=1&destination=${call.lat},${call.lng}`
                                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${call.localita} ${call.comune || "Massa Carrara"}`)}`;
                                            window.open(navUrl, "_blank");
                                          }}
                                          className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white text-[10px] h-8 px-2.5 rounded-lg"
                                          title="Apri itinerario GPS direttamente su Google Maps"
                                        >
                                          <Navigation className="h-3 w-3" />
                                        </Button>
                                      </div>

                                      {/* Iter Solleciti SLA 5 Giorni */}
                                      {call.isNonUrgent && (
                                        <div className="pt-2 mt-1 border-t border-emerald-900/50 space-y-1.5">
                                          <div className="flex items-center justify-between text-[9px]">
                                            <span className="text-amber-300 font-bold uppercase">Solleciti SLA 5 Giorni:</span>
                                            {call.lastReminderPhase && (
                                              <span className="text-slate-400 font-mono text-[8px]">
                                                Inviato: FASE {call.lastReminderPhase}
                                              </span>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 gap-1.5">
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendPhaseReminder(call, 2);
                                              }}
                                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] h-7 px-1.5 rounded-lg flex items-center justify-center gap-1"
                                              title="Fase 2: Promemoria 3° giorno (imminenza scadenza)"
                                            >
                                              <Clock className="h-3 w-3" />
                                              2. Promemoria 3° Gg
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendPhaseReminder(call, 3);
                                              }}
                                              className="bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] h-7 px-1.5 rounded-lg flex items-center justify-center gap-1"
                                              title="Fase 3: Allarme 5° giorno (scadenza perentoria)"
                                            >
                                              <AlertTriangle className="h-3 w-3" />
                                              3. Allarme 5° Gg
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Assign Patrol directly under call */}
                        {call.status === "annullata" ? (
                          <div className="bg-rose-950/25 border border-rose-900/40 p-3 rounded-xl flex items-center gap-2.5 text-slate-300 my-1 font-sans">
                            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 animate-pulse" />
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-rose-400 font-extrabold uppercase tracking-wider">CHIAMATA ANNULLATA (SOLA LETTURA)</p>
                              <p className="text-[9px] text-slate-400 leading-tight">Questo elemento d'archivio storico di PS è bloccato e non modificabile per verifiche.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[9px] text-indigo-400 uppercase tracking-widest block font-medium">Aggiorna Stato:</Label>
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateCallStatus(call.id, "pattuglia");
                                  }}
                                  className={`text-[8.5px] p-0 h-7 ${call.status === 'pattuglia' ? 'bg-blue-600 text-white' : 'text-slate-400 border-slate-800'}`}
                                >
                                  Pattuglia
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateCallStatus(call.id, "inoltrata");
                                  }}
                                  className={`text-[8.5px] p-0 h-7 ${call.status === 'inoltrata' ? 'bg-amber-600 text-white' : 'text-slate-400 border-slate-800'}`}
                                >
                                  Forze Ext
                                </Button>
                              </div>
                            </div>

                            <div>
                              <Label className="text-[9px] text-emerald-400 uppercase tracking-widest block font-medium">Risoluzione:</Label>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let isConfirmed = false;
                                  try {
                                    isConfirmed = confirm("Sei certo di voler RISOLVERE definitivamente l'emergenza?");
                                  } catch (err) {
                                    isConfirmed = true;
                                  }
                                  if(isConfirmed) {
                                    handleUpdateCallStatus(call.id, "risolto");
                                  }
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] h-7 mt-1 font-bold"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> CHIUDI
                              </Button>
                            </div>

                            <div>
                              <Label className="text-[9px] text-red-400 uppercase tracking-widest block font-medium">Annullamento:</Label>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCall(call.id);
                                }}
                                className="w-full bg-red-600 hover:bg-red-700 text-white text-[9px] h-7 mt-1 font-bold"
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> ELIMINA
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Extra Interne Notes */}
                        {call.status !== "annullata" && (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Aggiungi Log/Annotazione Centrale:</Label>
                            <div className="flex gap-2">
                              <Input 
                                placeholder="es. Pattuglia sul posto, adempimenti avviati." 
                                id={`extraNotes-${call.id}`}
                                className="bg-slate-950 border-slate-800 text-xs h-9"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    handleUpdateCallNotes(call.id, val);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }}
                              />
                              <Button 
                                size="sm"
                                className="bg-slate-800 hover:bg-slate-700 text-xs h-9 text-slate-200 font-normal"
                                onClick={() => {
                                  const input = document.getElementById(`extraNotes-${call.id}`) as HTMLInputElement;
                                  if (input && input.value) {
                                    handleUpdateCallNotes(call.id, input.value);
                                    input.value = "";
                                  }
                                }}
                              >
                                Registra
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Audit Trail Viewer */}
                        <div className="space-y-2.5 p-3 bg-slate-950 rounded-xl border border-slate-900">
                          <div className="flex justify-between items-center">
                            <Label className="text-[9px] text-slate-400 uppercase tracking-[0.15em] block font-bold">Audit Trail di PG (Real-Time):</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintCallSummary(call);
                              }}
                              className="h-6 text-[9px] text-indigo-400 font-normal uppercase hover:bg-slate-900"
                            >
                              <Printer className="h-3 w-3 mr-1" /> Stampa A4
                            </Button>
                          </div>
                          
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {call.auditTrail?.map((evt, idx) => (
                              <div key={idx} className="border-l border-red-500 pl-2 py-0.5 space-y-0.5">
                                <span className="text-[8.5px] font-mono text-slate-500 block">
                                  {safeFormatDate(evt.timestamp, "HH:mm:ss")} - {evt.operatorName} ({evt.operatorMatricola})
                                </span>
                                <span className="text-[10px] text-slate-300 block leading-tight">
                                  {evt.action}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}
        </>
      )}

      {/* OSINT MODULE REMOVED */}

      {subTab === "forensics" && (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pb-4 bg-slate-950/90 rounded-2xl p-4 border border-slate-900 shadow-2xl">
          {!isAdminOrResponsabile ? (
            <div className="p-8 text-center space-y-4 max-w-lg mx-auto my-12 bg-slate-950 border border-red-900/60 rounded-3xl shadow-2xl">
              <ShieldAlert className="h-12 w-12 text-red-500 mx-auto animate-pulse" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Accesso Riservato Amministratori HQ</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                La Centrale Forense Scientifica ed il Modulo Analisi Reperti sono riservati esclusivamente agli Amministratori e Responsabili di Settore per ragioni di riservatezza e Polizia Giudiziaria.
              </p>
              <Button
                type="button"
                onClick={() => setSubTab("missions_register")}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-6 py-2 rounded-xl"
              >
                Torna al Registro Missioni
              </Button>
            </div>
          ) : (
            <>
              {/* BARRA SUPERIORE DI CONTROLLO FORENSICS */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-900/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-950 border border-purple-700/80 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        CENTRALE FORENSE SCIENTIFICA HQ & ANALISI REPERTI
                      </h3>
                      <Badge className="bg-red-950 text-red-400 border border-red-800 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5">
                        🔴 RISERVATO AMMINISTRATORI HQ
                      </Badge>
                    </div>
                    <p className="text-[10.5px] text-purple-200/80 mt-0.5">
                      Pool Scientifico Multidisciplinare & Catena di Custodia Reperti (Art. 354 c.p.p. per uso Polizia Giudiziaria)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSubTab("missions_register")}
                    className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-[11px] font-bold h-8 px-3 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <span>❌</span>
                    <span>Chiudi Modulo</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            
            {/* Sinistra: File Upload & Inputs */}
            <div className="xl:col-span-5 space-y-4">
              <Card className="bg-slate-950/80 border-slate-900 shadow-xl rounded-2xl">
                <CardHeader className="pb-3 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-purple-400" />
                    <div>
                      <CardTitle className="text-sm font-extrabold text-white uppercase tracking-wider">
                        Acquisizione Reperto Fotografico & Metadati
                      </CardTitle>
                      <CardDescription className="text-[10px] text-purple-400 font-semibold uppercase tracking-widest mt-0.5">
                        Centrale Forense Scientifica HQ - Protocollo P.G.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  
                  {/* File Drop area */}
                  <div 
                    onClick={() => document.getElementById("forensic-file-input")?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[150px] ${
                      forensicImage 
                        ? "border-purple-500 bg-purple-950/20" 
                        : "border-slate-800 bg-slate-950/40 hover:border-purple-500/50 hover:bg-slate-950/90"
                    }`}
                  >
                    <input 
                      type="file" 
                      id="forensic-file-input" 
                      accept="image/*" 
                      onChange={handleForensicImageChange} 
                      className="hidden" 
                    />
                    
                    {forensicImage ? (
                      <div className="relative group w-full">
                        <img 
                          src={forensicImage} 
                          alt="Reperto da analizzare" 
                          referrerPolicy="no-referrer"
                          className="max-h-44 mx-auto rounded-lg shadow-lg border border-slate-850" 
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white font-bold uppercase tracking-widest">Sostituisci Immagine</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-400 border border-slate-800">
                          📸
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-300">Trascina qui la foto del reperto o fai clic</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Generazione automatica Impronta SHA-256 e Metadati P.G.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {forensicFileMeta && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 font-mono text-[9px] text-slate-300 space-y-1">
                      <p className="font-semibold text-purple-300 truncate">🗂️ FILE: {forensicFileMeta.name}</p>
                      <div className="grid grid-cols-2 gap-1 text-[8.5px] text-slate-400">
                        <p>DIMENSIONE: {Math.round(forensicFileMeta.size / 1024)} KB</p>
                        <p>FORMATO: {forensicFileMeta.type}</p>
                      </div>
                      {forensicSha256 && (
                        <div className="pt-1 border-t border-slate-900">
                          <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">🔒 IMPRONTA SHA-256 INTEGRITÀ DIGITALE:</p>
                          <p className="text-[8px] text-emerald-300 font-mono break-all bg-emerald-950/40 p-1 rounded border border-emerald-900/50 mt-0.5">
                            {forensicSha256}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CAMPI CATENA DI CUSTODIA & PROTOCOLLO P.G. */}
                  <div className="space-y-2 text-xs pt-1 border-t border-slate-900">
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                      📋 Protocollo & Catena di Custodia (Art. 354 c.p.p.):
                    </p>

                    <div>
                      <Label className="text-[9.5px] text-slate-400 uppercase font-bold block mb-1">
                        Tipologia Reperto:
                      </Label>
                      <select
                        value={forensicRepertoType}
                        onChange={(e) => setForensicRepertoType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white text-xs h-8 rounded-md px-2 focus:ring-1 focus:ring-purple-500 font-sans"
                      >
                        <option value="Boccone / Esca Avvelenata Sospetta">Boccone / Esca Avvelenata Sospetta (L. 189/04)</option>
                        <option value="Carcassa / Animale Deceduto">Carcassa / Animale Deceduto (Maltrattamento/Avvelenamento)</option>
                        <option value="Ferita / Lesione Corporea">Ferita / Lesione Corporea (Art. 544-ter c.p.)</option>
                        <option value="Trappola / Laccio / Rete di Uccellagione">Trappola / Laccio / Rete di Uccellagione Clandestina</option>
                        <option value="Discarica Abusiva / Rifiuti Pericolosi">Discarica Abusiva / Rifiuti Pericolosi (Art. 256 D.Lgs. 152/06)</option>
                        <option value="Veicolo / Targa Sospetta">Veicolo / Targa Sospetta per Abbandono Animale</option>
                        <option value="Documento / Modulo Ispezione">Documento / Modulo Ispezione Sospetto</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9.5px] text-slate-400 uppercase font-bold block mb-1">
                          N° Sigillo / Busta B:
                        </Label>
                        <Input
                          type="text"
                          placeholder="Es. SIG-2026-99"
                          value={forensicSigillo}
                          onChange={(e) => setForensicSigillo(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-white text-xs h-8 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[9.5px] text-slate-400 uppercase font-bold block mb-1">
                          Comune:
                        </Label>
                        <Input
                          type="text"
                          placeholder="Es. Massa, Carrara"
                          value={forensicComune}
                          onChange={(e) => setForensicComune(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-white text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9.5px] text-slate-400 uppercase font-bold block mb-1">
                          Stato Conservazione:
                        </Label>
                        <select
                          value={forensicConservazione}
                          onChange={(e) => setForensicConservazione(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs h-8 rounded-md px-2 focus:ring-1 focus:ring-purple-500 font-sans"
                        >
                          <option value="Sacca Sigillata A Tenuta Stagna">Sacca Sigillata A Tenuta Stagna</option>
                          <option value="Refrigerato Freezer (-20°C)">Refrigerato Freezer (-20°C)</option>
                          <option value="Contenitore Ermetico Rigido">Contenitore Ermetico Rigido</option>
                          <option value="Reperto Fotografico Digitale HQ">Reperto Fotografico Digitale HQ</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-[9.5px] text-slate-400 uppercase font-bold block mb-1">
                          Località / Indirizzo:
                        </Label>
                        <Input
                          type="text"
                          placeholder="Es. Via Molo di Ponente"
                          value={forensicLocalita}
                          onChange={(e) => setForensicLocalita(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-white text-xs h-8"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[9.5px] text-slate-400 uppercase font-bold block mb-1"> Note Operative & Contesto Sopralluogo: </Label>
                      <textarea
                        placeholder="Fornisci dettagli sul sopralluogo, stato del reperto, testimoni presenti, intervento veterinario ASL, ecc."
                        value={forensicExtraDetails}
                        onChange={(e) => setForensicExtraDetails(e.target.value)}
                        className="w-full h-16 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg p-2 focus:ring-1 focus:ring-purple-500 font-sans resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setForensicImage(null);
                        setForensicExtraDetails("");
                        setForensicFileMeta(null);
                        setForensicResult(null);
                        setForensicSigillo("");
                        setForensicSha256("");
                      }}
                      disabled={isAnalyzing}
                      className="border-slate-800 text-slate-400 hover:bg-slate-900 text-xs py-1.5 h-9"
                    >
                      Reset Campi
                    </Button>
                    <Button
                      type="button"
                      onClick={handleRunForensicAnalysis}
                      disabled={isAnalyzing || !forensicImage}
                      className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-black py-1.5 h-9 shadow-lg shadow-purple-950/50 uppercase tracking-wider"
                    >
                      {isAnalyzing ? "Analisi in corso..." : "🔬 Esegui Perizia Forense AI"}
                    </Button>
                  </div>

                </CardContent>
              </Card>

              {/* Guida Metodologica */}
              <Card className="bg-slate-950/40 border-slate-900 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Il Pool di Esperti Forensi</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 text-[11px] text-slate-400 leading-relaxed">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0">🔬</span>
                    <div>
                      <p className="font-bold text-slate-300">Modulo OSINT & Forensics</p>
                      <p className="text-[10px] text-slate-500">Analizza l'immagine per dedurre lesioni, reati, piante locali, orario solare e meteo storico.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0">🩺</span>
                    <div>
                      <p className="font-bold text-slate-300">Veterinario Forense</p>
                      <p className="text-[10px] text-slate-500">Valuta lo stato di salute, nutrizione, eventuali lesioni visibili o maltrattamenti fisici.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0">⚖️</span>
                    <div>
                      <p className="font-bold text-slate-300">Legale Penalista</p>
                      <p className="text-[10px] text-slate-500">Inquadra i reati penali (es. Art. 727 c.p.) e amministrativi, consigliando l'azione immediata di PG.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0">🌿</span>
                    <div>
                      <p className="font-bold text-slate-300">Biologo & Botanico</p>
                      <p className="text-[10px] text-slate-500">Riconosce la flora locale, l'habitat e stima il periodo dell'anno e la compatibilità territoriale.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0">💻</span>
                    <div>
                      <p className="font-bold text-slate-300">Perito Informatico (OSINT)</p>
                      <p className="text-[10px] text-slate-500">Esamina metadati, prospettiva visiva, integrità fotografica ed evita alterazioni.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0">🌦️</span>
                    <div>
                      <p className="font-bold text-slate-300">Consulente Climatologo</p>
                      <p className="text-[10px] text-slate-500">Analizza ombre, nuvolosità e illuminazione solare per stimare orario e condizioni climatiche.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Destra: Risultato dell'analisi */}
            <div className="xl:col-span-7 space-y-4">
              {isAnalyzing && (
                <Card className="bg-slate-950/60 border-slate-900 min-h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border-dashed">
                  <div className="relative flex items-center justify-center mb-6 animate-pulse">
                    <div className="absolute h-16 w-16 bg-indigo-500/20 rounded-full animate-ping"></div>
                    <div className="h-10 w-10 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center shadow-lg text-white">
                      🔬
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">
                    CONVOCAZIONE IN CORSO POOL DI INVESTIGAZIONE SCIENTIFICA
                  </h3>
                  <p className="text-[11px] text-slate-400 max-w-md mt-2 leading-relaxed">
                    Gemini sta analizzando pixel per pixel il reperto fotografico, consultando la normativa nazionale (Codice Penale), l'anagrafe floristica toscana e la perizia veterinaria clinica...
                  </p>
                </Card>
              )}

              {!isAnalyzing && !forensicResult && (
                <Card className="bg-slate-950/20 border-slate-900 min-h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border-dashed border-2">
                  <div className="h-12 w-12 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center mb-4 text-slate-500">
                    🔬
                  </div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nessun reperto analizzato</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                    Carica un'immagine scattata sul campo o inviata da un segnalante per avviare il pool scientifico e generare un verbale di sopralluogo multidisciplinare pronto per la stampa.
                  </p>
                </Card>
              )}

              {!isAnalyzing && forensicResult && (
                <div className="space-y-4">
                  
                  {/* General Summary Card */}
                  <Card className="bg-slate-950/80 border-slate-900 shadow-xl rounded-2xl border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <Badge className="bg-indigo-950 text-indigo-400 border border-indigo-900 text-[8px] font-bold tracking-widest uppercase mb-1.5">
                            VERBALE DI SOPRALLUOGO FORENSE AI
                          </Badge>
                          <CardTitle className="text-sm font-bold text-white uppercase tracking-wide">
                            RIASSUNTO FORENSE GENERALE
                          </CardTitle>
                        </div>
                        <Button
                          type="button"
                          onClick={handlePrintForensicReport}
                          className="bg-indigo-600 hover:bg-indigo-505 text-white text-[10px] font-bold h-8 px-3 uppercase tracking-wider shrink-0 flex items-center gap-1.5"
                        >
                          <Printer className="h-3 w-3" /> Stampa Verbale A4
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-slate-300 text-xs leading-relaxed italic bg-slate-950/50 p-3 rounded-xl border border-slate-900">
                        "{forensicResult.summary}"
                      </p>
                    </CardContent>
                  </Card>

                  {/* Experts Tabs Card */}
                  <Card className="bg-slate-950/80 border-slate-900 shadow-xl rounded-2xl overflow-hidden">
                    {/* Horizontal tab header */}
                    <div className="flex bg-slate-950 border-b border-slate-900 overflow-x-auto shrink-0 custom-scrollbar">
                      {[
                        { id: "veterinary", label: "🩺 Veterinario", color: "text-red-400" },
                        { id: "legal", label: "⚖️ Legale / PG", color: "text-amber-400" },
                        { id: "botanical", label: "🌿 Botanica", color: "text-emerald-400" },
                        { id: "exif", label: "💻 Metadati", color: "text-blue-400" },
                        { id: "weather", label: "🌦️ Meteo", color: "text-sky-400" },
                      ].map((tb) => (
                        <button
                          key={tb.id}
                          onClick={() => setActiveExpertTab(tb.id)}
                          className={`flex-1 min-w-[90px] py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                            activeExpertTab === tb.id
                              ? "bg-slate-900/40 border-b-indigo-500 text-white"
                              : "border-b-transparent text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <span className={`${tb.color} mr-1`}>{tb.label.split(" ")[0]}</span>
                          {tb.label.split(" ").slice(1).join(" ")}
                        </button>
                      ))}
                    </div>

                    <CardContent className="p-4 space-y-4">
                      
                      {/* TABS CONTENT: Veterinario */}
                      {activeExpertTab === "veterinary" && forensicResult.veterinary && (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Stato di salute dell'animale</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.veterinary.healthStatus}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Presenza di lesioni / ferite</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.veterinary.injuries}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Indizi di malnutrizione o privazione</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.veterinary.malnutrition}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Evidenze di incuria o maltrattamento</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.veterinary.abuseEvidence}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 mt-2 space-y-0.5">
                            <span className="text-[9px] text-red-400 uppercase tracking-wider font-extrabold font-mono">VERDETTO CLINICO SINTETICO:</span>
                            <p className="text-red-200 text-xs font-bold font-sans">{forensicResult.veterinary.verdict}</p>
                          </div>
                        </div>
                      )}

                      {/* TABS CONTENT: Legale */}
                      {activeExpertTab === "legal" && forensicResult.legal && (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Articoli applicabili (Codice Penale / Regolamenti)</span>
                            <p className="text-slate-300 text-xs leading-relaxed font-mono">{forensicResult.legal.applicableLaws}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Reati identificati / Violazioni amministrative</span>
                            <p className="text-slate-300 text-xs leading-relaxed font-bold text-amber-300">{forensicResult.legal.crimesIdentified}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Livello di efficacia probatoria dell'immagine</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.legal.evidenceLevel}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 mt-2 space-y-0.5">
                            <span className="text-[9px] text-amber-400 uppercase tracking-wider font-extrabold font-mono">AZIONI DI POLIZIA GIUDIZIARIA CONSIGLIATE:</span>
                            <p className="text-amber-200 text-xs font-bold">{forensicResult.legal.prosecutionAction}</p>
                          </div>
                        </div>
                      )}

                      {/* TABS CONTENT: Botanica */}
                      {activeExpertTab === "botanical" && forensicResult.botanical && (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Flora e piante identificate</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.botanical.floraIdentified}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Caratteristiche del terreno ed habitat</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.botanical.soilAndHabitat}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Compatibilità territoriale (Provincia Massa-Carrara / Toscana)</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.botanical.geographicAreaEstimate}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 mt-2 space-y-0.5">
                            <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-extrabold font-mono">STIMA DEL PERIODO DELL'ANNO:</span>
                            <p className="text-emerald-200 text-xs font-bold">{forensicResult.botanical.seasonEstimate}</p>
                          </div>
                        </div>
                      )}

                      {/* TABS CONTENT: Metadati */}
                      {activeExpertTab === "exif" && forensicResult.exif && (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Data e ora dello scatto stimate o lette</span>
                            <p className="text-slate-300 text-xs leading-relaxed font-mono">{forensicResult.exif.dateTime}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Coordinate o area GPS stimata</span>
                            <p className="text-slate-300 text-xs leading-relaxed font-mono">{forensicResult.exif.gps}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Dispositivo o sensore fotografico stimato</span>
                            <p className="text-slate-300 text-xs leading-relaxed font-mono">{forensicResult.exif.camera}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40 mt-2 space-y-0.5">
                            <span className="text-[9px] text-blue-400 uppercase tracking-wider font-extrabold font-mono">ANALISI INTEGRITÀ DIGITALE & PROSPETTIVA:</span>
                            <p className="text-blue-200 text-xs font-mono">{forensicResult.exif.technicalNotes}</p>
                          </div>
                        </div>
                      )}

                      {/* TABS CONTENT: Climatologia */}
                      {activeExpertTab === "weather" && forensicResult.weather && (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Condizioni meteorologiche visibili</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.weather.estimatedConditions}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Fascia oraria ed inclinazione luce (analisi delle ombre)</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{forensicResult.weather.lightingAndTimeOfDay}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-900/40 mt-2 space-y-0.5">
                            <span className="text-[9px] text-sky-400 uppercase tracking-wider font-extrabold font-mono">RICOSTRUZIONE METEO STORICA COMPATIBILE:</span>
                            <p className="text-sky-200 text-xs font-bold font-mono">{forensicResult.weather.reconstructedMeteo}</p>
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>

                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )}

      {/* OVERLAY MODAL FOR RUBRICA RAPIDA CONTATTI */}
      {isContactsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Rubrica Rapida Contatti
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">PG & ASL Territoriale</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsContactsModalOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters Bar */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-850 flex flex-col sm:flex-row gap-3 shrink-0">
              {/* Text Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Cerca per titolo, comune o telefono..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="bg-slate-950 border-slate-800 pl-10 text-xs text-white placeholder-slate-500 h-9 rounded-xl"
                />
              </div>

              {/* Category selector */}
              <div className="w-full sm:w-[200px]">
                <Select
                  value={contactCategory}
                  onValueChange={setContactCategory}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-slate-200 h-9 rounded-xl">
                    <SelectValue placeholder="Filtra categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-850 text-xs text-white max-h-[220px]">
                    <SelectItem value="Tutti">Tutte le Categorie</SelectItem>
                    {Array.from(new Set(contacts.map(c => c.category))).map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* List and Quick Preview */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredContacts.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs italic text-slate-500">
                    Nessun contatto corrisponde ai criteri di ricerca.
                  </div>
                ) : (
                  filteredContacts.map((contact, idx) => {
                    const isSelected = selectedContactObj?.phone === contact.phone && selectedContactObj?.title === contact.title;
                    return (
                      <div
                        key={`${contact.title}-${contact.phone || idx}`}
                        onClick={() => setSelectedContactObj(contact)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? "bg-indigo-950/40 border-indigo-550 shadow-md shadow-indigo-950/50"
                            : "bg-slate-950/60 border-slate-850 hover:bg-slate-950/90 hover:border-slate-800"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/30">
                              {contact.category}
                            </span>
                            {contact.municipality && (
                              <span className="text-[8px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                                📍 {contact.municipality}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-white text-xs mt-1.5 line-clamp-1">{contact.title}</h4>
                          <span className="text-teal-300 font-mono text-[11px] font-bold mt-1 block select-all">{contact.phone || "N.D."}</span>
                        </div>

                        {contact.phone && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-900/50">
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] transition-all border border-emerald-500/30"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" /> Chiama
                            </a>
                            <a
                              href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px] transition-all border border-green-500/30"
                              onClick={(e) => e.stopPropagation()}
                            >
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer with selected contact context */}
            {selectedContactObj && (
              <div className="bg-slate-950 p-3 px-4 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">Contatto Selezionato:</p>
                  <p className="font-bold text-white text-xs truncate">{selectedContactObj.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (selectedContactObj.phone) {
                        setCallerPhone(selectedContactObj.phone);
                        setCallerName(selectedContactObj.title);
                      }
                      setIsContactsModalOpen(false);
                    }}
                    className="border-indigo-850 text-indigo-400 hover:bg-indigo-950/40 text-[10px] h-8 px-3 uppercase text-center font-normal"
                  >
                    Usa come richiedente
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsContactsModalOpen(false)}
                    className="bg-indigo-600 hover:bg-indigo-505 text-white text-[10px] h-8 px-4 uppercase font-bold"
                  >
                    Chiudi
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === "missions_register" && (
        <div className="flex-1 flex flex-col gap-4 pb-4 animate-in fade-in duration-300">
          <Card className="bg-slate-950 border-slate-900 shadow-2xl rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-400 animate-pulse" />
                  Registro Generale Comandi e Missioni Operative
                </CardTitle>
                <CardDescription className="text-[10px] uppercase text-slate-500 mt-1">
                  Tracciamento blindato dei tragitti, conferme di ricezione, e chiusura dossier per le pattuglie sul campo.
                </CardDescription>
              </div>

              {/* Sub-filters for missions */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/40 p-1.5 rounded-xl border border-slate-900/60 shrink-0">
                {(["all", "pending", "accepted", "completed", "cancelled"] as const).map((f) => (
                  <Button
                    key={f}
                    variant="ghost"
                    size="sm"
                    onClick={() => setMissionFilter(f)}
                    className={`text-[9.5px] font-bold py-1 h-7 px-3 rounded-lg transition-all uppercase ${
                      missionFilter === f
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f === "all" ? "📑 Tutte" : f === "pending" ? "⏳ In Attesa" : f === "accepted" ? "🟢 In Corso" : f === "completed" ? "✅ Chiuse" : "❌ Annullate"}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Mission Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Cerca missione per pattuglia, indirizzo, obiettivi, note..."
                  value={missionSearch}
                  onChange={(e) => setMissionSearch(e.target.value)}
                  className="bg-slate-950 border-slate-900 pl-10 text-xs text-white placeholder-slate-500 h-10 rounded-xl"
                />
              </div>

              {/* Mission Grid/List */}
              {(() => {
                const filteredMissions = (missions || []).filter((m) => {
                  // status filter
                  if (missionFilter !== "all" && m.status !== missionFilter) return false;

                  // text search
                  const term = missionSearch.toLowerCase().trim();
                  if (!term) return true;

                  return (
                    m.guardName?.toLowerCase().includes(term) ||
                    m.guardMatricola?.toLowerCase().includes(term) ||
                    m.address?.toLowerCase().includes(term) ||
                    m.description?.toLowerCase().includes(term) ||
                    m.assignedByName?.toLowerCase().includes(term)
                  );
                });

                if (filteredMissions.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-slate-900 rounded-2xl">
                      <ShieldAlert className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Nessuna missione trovata</p>
                      <p className="text-[10px] text-slate-600 mt-1">Nessun comando registrato corrisponde ai filtri selezionati.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredMissions.map((m) => {
                      const isPending = m.status === "pending";
                      const isAccepted = m.status === "accepted";
                      const isCompleted = m.status === "completed";
                      const isRejected = m.status === "rejected";
                      const isCancelled = m.status === "cancelled";

                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                            isRejected
                              ? "bg-red-950/40 border-red-500/60"
                              : isPending
                              ? "bg-slate-900/60 border-amber-500/30 hover:border-amber-500/50"
                              : isAccepted
                              ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50"
                              : isCompleted
                              ? "bg-slate-900/30 border-slate-900 opacity-80"
                              : "bg-slate-900/30 border-slate-900 opacity-60"
                          }`}
                        >
                          <div>
                            {/* Header: Patrol Name and Status Badge */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                                  <span>👤 {m.guardName}</span>
                                  {m.guardMatricola && (
                                    <span className="text-[8.5px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase font-bold">
                                      {m.guardMatricola}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[9px] text-slate-500 uppercase mt-0.5 font-mono">
                                  Inviata da: {m.assignedByName} • {m.createdAt ? new Date(m.createdAt.seconds ? m.createdAt.seconds * 1000 : m.createdAt).toLocaleString("it-IT") : ""}
                                </p>
                              </div>

                              <span
                                className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isRejected
                                    ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                                    : isPending
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                                    : isAccepted
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : isCompleted
                                    ? "bg-slate-900 text-slate-400 border border-slate-800"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}
                              >
                                {isRejected ? "🚨 Rifiutata" : isPending ? "⏳ In Attesa" : isAccepted ? "🟢 In Corso" : isCompleted ? "✅ Chiusa" : "❌ Annullata"}
                              </span>
                            </div>

                            {/* Destination */}
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-1 my-3">
                              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">🎯 Obiettivo / Località:</p>
                              <p className="text-xs text-white font-semibold flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                {m.address}
                              </p>
                              {m.description && (
                                <p className="text-[10px] text-slate-300 italic pt-1 border-t border-white/5 leading-relaxed">
                                  {m.description}
                                </p>
                              )}
                              {isRejected && m.rejectionReason && (
                                <div className="mt-2 bg-red-950/80 p-2 rounded-lg border border-red-500/40">
                                  <p className="text-[9px] font-bold text-red-300 uppercase">Motivo Rifiuto:</p>
                                  <p className="text-[10px] text-white font-semibold italic">"{m.rejectionReason}"</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions / Timestamps */}
                          <div className="pt-3 border-t border-slate-900/60 flex flex-col gap-2">
                            {/* Timestamps if any */}
                            {m.completedAt && (
                              <p className="text-[8.5px] font-mono text-slate-500 uppercase">
                                ✓ Completata alle ore: {new Date(m.completedAt).toLocaleString("it-IT")}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              {isAccepted && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, "missions", m.id), {
                                        routeSent: true,
                                        routeSentAt: new Date().toISOString()
                                      });
                                      alert("Itinerario stradale e guida vocale trasmessi all'App della pattuglia!");
                                    } catch (err: any) {
                                      alert("Errore nell'invio tragitto: " + err.message);
                                    }
                                  }}
                                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[9.5px] font-bold uppercase h-8 rounded-lg flex items-center justify-center gap-1 shadow-md"
                                >
                                  📍 Invia Tragitto su App
                                </Button>
                              )}

                              {/* Open mission controls */}
                              {(isPending || isAccepted) && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateMissionStatus(m.id, "completed")}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-bold uppercase h-8 rounded-lg"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Chiudi / Completa
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateMissionStatus(m.id, "cancelled")}
                                    className="bg-slate-950 border-red-950/40 text-red-400 hover:bg-red-950/20 text-[9.5px] font-bold uppercase h-8 rounded-lg"
                                  >
                                    Annulla
                                  </Button>
                                </>
                              )}

                              {isRejected && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateMissionStatus(m.id, "pending")}
                                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-[9.5px] font-bold uppercase h-8 rounded-lg flex items-center justify-center gap-1"
                                >
                                  🔄 Rimetti in Attesa / Riassegna
                                </Button>
                              )}

                              {/* GPS redirection for active */}
                              {isAccepted && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(m.address)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-indigo-900 hover:bg-indigo-800 text-white font-bold h-8 px-2.5 rounded-lg flex items-center justify-center gap-1 text-[9.5px] uppercase transition-all"
                                >
                                  <Navigation className="h-3.5 w-3.5" /> GPS
                                </a>
                              )}

                              {/* Delete permanently (Physical removal) */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteMission(m.id)}
                                className="text-red-500 hover:text-red-400 hover:bg-red-950/20 p-1 px-2.5 h-8 rounded-lg ml-auto border border-red-950/30"
                                title="Elimina definitivamente dal database"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> ELIMINA
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Call Dialog for Field Guards */}
      <VideoCallDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        targetGuard={targetVideoGuard}
        currentOperator={currentGuard}
      />

      {/* MODALE DOSSIER INTERVENTI DIFFERIBILI (SLA 5 GIORNI) / RICHIESTE APERTE (DA FARE) */}
      {isNonUrgentModalOpen && (
        <div className="fixed inset-0 z-[1050] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-amber-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Dossier Interventi Differibili & Richieste Aperte (SLA 5 Giorni / Da Fare)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Tracciamento perentorio delle chiamate non urgenti: accordo interno 5 giorni per evasione o comunicazione verbale.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNonUrgentModalOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Sub-Filters / Stats Bar */}
            <div className="p-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {(() => {
                const nonUrgentCalls = calls.filter(c => c.isNonUrgent && c.status !== 'risolto' && c.status !== 'annullata');
                const expiredCalls = nonUrgentCalls.filter(c => {
                  const ms = c.createdAt ? new Date(c.createdAt).getTime() : Date.now();
                  return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)) >= 5;
                });
                const activeCalls = nonUrgentCalls.filter(c => {
                  const ms = c.createdAt ? new Date(c.createdAt).getTime() : Date.now();
                  return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)) < 5;
                });

                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800/80 text-[10px] uppercase">
                        Totali in gestione: {nonUrgentCalls.length}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/80 text-[10px] uppercase">
                        Entro i 5 gg: {activeCalls.length}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border ${
                        expiredCalls.length > 0 
                          ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' 
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        ⚠️ Scaduti (&gt;5 gg): {expiredCalls.length}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 italic">
                      * Le chiamate scadute restano registrate qui e nel database per gli adempimenti d'ufficio.
                    </div>
                  </>
                );
              })()}
            </div>

            {/* List of Non Urgent Calls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/40">
              {(() => {
                const nonUrgentList = calls.filter(c => c.isNonUrgent);

                if (nonUrgentList.length === 0) {
                  return (
                    <div className="py-16 text-center text-xs italic text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      Nessun intervento differibile (SLA 5 giorni) attualmente registrato a sistema.
                    </div>
                  );
                }

                return nonUrgentList.map((c) => {
                  const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : Date.now();
                  const elapsedDays = Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24));
                  const isExpired = elapsedDays >= 5;
                  const remainingDays = Math.max(0, 5 - elapsedDays);
                  const assignedGuard = guards.find(g => g.id === c.assignedGuardId);

                  return (
                    <div 
                      key={c.id} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        c.status === 'risolto' 
                          ? 'bg-emerald-950/20 border-emerald-900/50' 
                          : isExpired 
                            ? 'bg-red-950/30 border-red-700/80 shadow-lg shadow-red-950/40' 
                            : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-850 pb-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${
                            c.status === 'risolto' ? 'bg-emerald-600' :
                            c.status === 'annullata' ? 'bg-slate-700' :
                            isExpired ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
                          } text-white uppercase text-[8.5px] font-mono px-2`}>
                            {c.status === 'risolto' ? 'Risolto' : isExpired ? 'SCADUTO (>5 GG)' : 'IN ATTESA (5 GG)'}
                          </Badge>
                          <span className="font-bold text-xs text-white">
                            {c.comune ? `${c.comune.toUpperCase()} - ` : ""}{c.localita}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Assegnato il: {safeFormatDate(c.createdAt, "dd/MM/yyyy HH:mm")})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10.5px] font-mono font-black px-2 py-0.5 rounded ${
                            c.status === 'risolto' ? 'bg-emerald-950 text-emerald-400' :
                            isExpired ? 'bg-red-900/80 text-red-200' :
                            'bg-amber-950/80 text-amber-300'
                          }`}>
                            {c.status === 'risolto' 
                              ? '✓ Evaso' 
                              : isExpired 
                                ? `Scaduto da ${elapsedDays - 5} gg` 
                                : `${remainingDays} gg rimanenti (su 5)`}
                          </span>
                        </div>
                      </div>

                      {/* Content & Privacy Protected info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="md:col-span-2 space-y-1">
                          <p className="text-slate-300 italic bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 text-[11px]">
                            {c.description || "Nessun dettaglio specificato."}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                            <span>🛡️ Pattuglia: <strong className="text-slate-200">{c.assignedGuardName || "NON ASSEGNATO"}</strong></span>
                            <span>👤 Richiedente: <strong className="text-slate-200">{isAdminOrResponsabile ? (c.callerName || "Anonimo") : "[RISERVATO CENTRALE]"}</strong></span>
                          </div>
                        </div>

                        {/* Fast Actions / Reminders */}
                        <div className="flex flex-col justify-between gap-2 border-t md:border-t-0 md:border-l border-slate-850 md:pl-3 pt-2 md:pt-0">
                          {assignedGuard && c.status !== 'risolto' && c.status !== 'annullata' ? (
                            <div className="space-y-1.5">
                              <span className="text-[9px] uppercase font-bold text-indigo-300 block">
                                Invia Sollecito WhatsApp:
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSendPhaseReminder(c, 2)}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] h-7 px-1 rounded flex items-center justify-center gap-1"
                                  title="Fase 2: Promemoria 3° giorno (imminenza scadenza)"
                                >
                                  <Clock className="h-3 w-3" />
                                  Fase 2 (3° Gg)
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSendPhaseReminder(c, 3)}
                                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] h-7 px-1 rounded flex items-center justify-center gap-1"
                                  title="Fase 3: Allarme 5° giorno (scadenza perentoria)"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Fase 3 (5° Gg)
                                </Button>
                              </div>
                              {c.lastReminderPhase && (
                                <span className="text-[8px] text-slate-400 font-mono block">
                                  Ultimo sollecito: FASE {c.lastReminderPhase}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9.5px] text-slate-500 italic">
                              {c.status === 'risolto' ? 'Pratica archiviata con successo.' : 'Assegna una pattuglia per inviare solleciti.'}
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 justify-end mt-auto pt-1">
                            {c.lat && c.lng && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  flyToCoords([c.lat!, c.lng!], 15);
                                  setIsNonUrgentModalOpen(false);
                                }}
                                className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white text-[9.5px] h-6 px-2"
                              >
                                🗺️ Mappa
                              </Button>
                            )}
                            {c.status !== 'risolto' && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleUpdateCallStatus(c.id, "risolto")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-bold h-6 px-2.5"
                              >
                                ✓ Chiudi
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[10px]">
                Centrale Operativa C.O.E.T.A. - SLA di Competenza Zonale (Provincia di Massa-Carrara)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNonUrgentModalOpen(false)}
                className="bg-slate-900 border-slate-800 text-slate-200 hover:text-white text-xs h-8 px-4"
              >
                Chiudi Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pulizia Simulazioni & Bersagli di Test */}
      {isCleanSimulationsModalOpen && (
        <div className="fixed inset-0 z-[1060] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    Pulizia Bersagli Mappa & Chiamate di Simulazione / Test
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    Rimuovi definitivamente le chiamate di prova, i test di centrale o archivia gli interventi rimasti visibili sulla mappa radar.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCleanSimulationsModalOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const testIds = calls
                      .filter(c => {
                        const text = `${c.callerName || ""} ${c.description || ""} ${c.notes || ""} ${c.localita || ""}`.toLowerCase();
                        return text.includes("test") || text.includes("prova") || text.includes("simula") || text.includes("simulazione");
                      })
                      .map(c => c.id);
                    setSelectedCleanIds(testIds);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-600/40 text-[11px] h-8 px-3 font-semibold rounded-lg"
                >
                  ⚡ Seleziona Automaticamente i "Test / Simulazioni"
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (selectedCleanIds.length === calls.length) {
                      setSelectedCleanIds([]);
                    } else {
                      setSelectedCleanIds(calls.map(c => c.id));
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] h-8 px-3 font-semibold rounded-lg"
                >
                  {selectedCleanIds.length === calls.length ? "Deseleziona Tutti" : "Seleziona Tutti"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleResetTempMarkers}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 text-[11px] h-8 px-3 font-semibold rounded-lg"
                  title="Resetta coordinate manuali e ripristina bersagli nascosti"
                >
                  🔄 Reset Coordinate & Bersagli Mappa
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedCleanIds.length === 0 || isCleaning}
                  onClick={handlePurgeSelectedCalls}
                  className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs h-8 px-4 rounded-lg shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Elimina Selezionate ({selectedCleanIds.length})
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isCleaning}
                  onClick={handlePurgeAllTestCalls}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs h-8 px-3.5 rounded-lg shadow cursor-pointer"
                >
                  🧹 Elimina Tutti i Test (1-Click)
                </Button>
              </div>
            </div>

            {/* List of Calls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/40">
              {calls.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nessuna chiamata registrata nel sistema.
                </div>
              ) : (
                calls.map(c => {
                  const isSelected = selectedCleanIds.includes(c.id);
                  const isTestCandidate = `${c.callerName || ""} ${c.description || ""} ${c.notes || ""} ${c.localita || ""}`.toLowerCase().includes("test") ||
                    `${c.callerName || ""} ${c.description || ""} ${c.notes || ""} ${c.localita || ""}`.toLowerCase().includes("prova") ||
                    `${c.callerName || ""} ${c.description || ""} ${c.notes || ""} ${c.localita || ""}`.toLowerCase().includes("simula");

                  return (
                    <div
                      key={c.id}
                      className={`pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-red-950/30 border-red-800/80"
                          : isTestCandidate
                          ? "bg-amber-950/20 border-amber-800/50"
                          : "bg-slate-950/40 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCleanIds(prev => [...prev, c.id]);
                            } else {
                              setSelectedCleanIds(prev => prev.filter(id => id !== c.id));
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500 cursor-pointer"
                        />

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                              {(c as any).protocolCode || `CALL-${c.id.slice(0, 6)}`}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              c.priority === 'emergenza' ? 'bg-red-900/80 text-red-200 border border-red-600' :
                              c.priority === 'alta' ? 'bg-orange-900/80 text-orange-200 border border-orange-600' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {c.priority}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                              c.status === 'risolto' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                              'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              Stato: {c.status || 'aperta'}
                            </span>
                            {isTestCandidate && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                ⚠️ Riconosciuta come Simulazione
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-slate-100 truncate">
                            📍 {c.comune ? `${c.comune.toUpperCase()} - ` : ""}{c.localita || "Posizione geografica"}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {c.description || "Nessuna descrizione specificata"}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span>📞 Richiedente: {c.callerName || "Anonimo"} ({c.callerPhone || "N/D"})</span>
                            {c.lat && c.lng && (
                              <span className="font-mono text-cyan-400">🌐 Coordinate: {c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons per row */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {c.lat && c.lng && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              flyToCoords([c.lat!, c.lng!], 15);
                              setIsCleanSimulationsModalOpen(false);
                            }}
                            className="bg-slate-900 border-slate-700 text-cyan-300 hover:text-white text-[10px] h-7 px-2"
                            title="Centra questo bersaglio sulla mappa radar"
                          >
                            🗺️ Mappa
                          </Button>
                        )}

                        {c.status !== 'risolto' && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleResolveCallDirect(c.id)}
                            className="bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/70 text-emerald-200 text-[10px] font-bold h-7 px-2.5 rounded-lg"
                            title="Segna come risolto e archivia senza eliminare"
                          >
                            <Check className="h-3 w-3 mr-1" /> Archivia
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleDeleteCallDirect(c.id)}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 text-[10px] font-bold h-7 px-2.5 rounded-lg"
                          title="Elimina definitivamente da Firestore"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Elimina
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[10px]">
                Totale chiamate in archivio: {calls.length} • Selezionate: {selectedCleanIds.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCleanSimulationsModalOpen(false)}
                className="bg-slate-900 border-slate-800 text-slate-200 hover:text-white text-xs h-8 px-4 rounded-xl cursor-pointer"
              >
                Chiudi Pannello
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA A TUTTO SCHERMO: ARCHIVIO RICHIESTE D'INTERVENTO & DOSSIER CHIAMATE CON VOCALI */}
      {isDossierArchiveOpen && (
        <div className="fixed inset-0 z-[1200] bg-slate-950 flex flex-col animate-in fade-in duration-200">
          <ArchivioChiamateDossierView
            calls={calls}
            guards={guards}
            currentGuard={currentGuard}
            user={user}
            onClose={() => setIsDossierArchiveOpen(false)}
            onNewRequestClick={() => {
              setIsDossierArchiveOpen(false);
              setShowIntakeForm(true);
              setIsFormMinimized(false);
            }}
          />
        </div>
      )}

    </div>
  );
};

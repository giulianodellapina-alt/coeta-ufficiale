import React, { useState, ChangeEvent, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignatureCanvas from 'react-signature-canvas';
import { 
  PlusCircle, FileSearch, Camera, Activity, Loader2, Plus, Trash2, ClipboardList, MapPin, ZoomIn, ZoomOut, Maximize2, Printer, Save, X, PenTool, Eraser, LayoutGrid, BookOpenText, Upload, Download, CheckCircle2, FileText, Sparkles
} from "lucide-react";
import { printElementById } from "@/lib/utils";
import { getProvinceFromComune } from "./lib/geo-utils";
import { capitalizeWords } from "./lib/string-utils";
import { generateVerbalePDF } from "./lib/pdfUtils";
import { Report, Guard } from "./types";
import { processVerbaleImage } from "./services/aiService";
import { EkoclubLogo } from "./components/EkoclubLogo";
import { ReportHeader } from "./components/ReportHeader";
import { db } from "./lib/firebase";
import { collection, addDoc, query, where, onSnapshot, getDocs } from "firebase/firestore";

interface VerbaleAIDialogProps {
  onSave: (report: Partial<Report>, emailPayload?: any) => Promise<string | undefined>;
  reports?: Report[];
  guards?: Guard[];
  currentGuard?: any;
  user?: any;
  rectangular?: boolean;
  dashboardMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  noTrigger?: boolean;
}

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
      // No match found, keep original text (but normalize with MATR. if it looks like a code or contains numbers)
      const uppercasePart = part.toUpperCase();
      if (/[\d]/.test(uppercasePart) && !uppercasePart.includes("MATR")) {
        resolved.push(`MATR. ${uppercasePart}`);
      } else {
        resolved.push(uppercasePart);
      }
    }
  }

  return resolved.join(" - ");
};

// Spacing helper for printed output vs on-screen interactive form
interface UnderlineFieldProps {
  value: string;
  onChange?: (val: string) => void;
  width: string;
  placeholder?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
  maxLength?: number;
  className?: string;
  appendSlashes?: boolean;
}

const UnderlineField = React.memo(({ 
  value, 
  onChange, 
  width, 
  placeholder = "", 
  textAlign = "left", 
  fontWeight = "normal", 
  maxLength, 
  className = "",
  appendSlashes = false
}: UnderlineFieldProps) => {
  return (
    <>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${className} no-print`}
        style={{
          borderBottom: '0.5pt solid black',
          width: width,
          textAlign: textAlign,
          fontWeight: fontWeight as any,
          fontStyle: 'italic',
          fontFamily: '"Times New Roman", Times, serif',
          background: 'transparent',
          outline: 'none',
          padding: '0 1mm',
          marginLeft: '1mm',
          marginRight: '1mm',
        }}
      />
      <span 
        className="print-only hidden" 
        style={{ 
          borderBottom: '0.5pt solid black', 
          fontWeight: fontWeight as any, 
          fontStyle: 'italic',
          fontFamily: '"Times New Roman", Times, serif',
          textAlign: textAlign,
          minWidth: value ? 'auto' : '10mm',
          paddingLeft: '1.5mm',
          paddingRight: '1.5mm',
          display: 'none', // hidden on screen
          marginLeft: '1mm',
          marginRight: '1mm',
        }}
      >
        {value ? (appendSlashes ? `${value} /////` : value) : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
      </span>
    </>
  );
});
UnderlineField.displayName = "UnderlineField";

export const VerbaleAIDialog: React.FC<VerbaleAIDialogProps> = ({ 
  onSave, 
  reports = [], 
  guards = [],
  currentGuard, 
  user, 
  rectangular = false, 
  dashboardMode = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  noTrigger = false
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiTimer, setAiTimer] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const [scannedImageBase64, setScannedImageBase64] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showImage, setShowImage] = useState(true);
  const [compilationMode, setCompilationMode] = useState<'mobile' | 'paper'>('mobile');

  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Fotografie dell'intervento scattate/allegate DURANTE la compilazione (prima del salvataggio)
  const [pendingFormPhotos, setPendingFormPhotos] = useState<Array<{
    id: string;
    base64: string;
    name: string;
    timestamp: string;
    lat?: number;
    lng?: number;
  }>>([]);
  const [isCapturingFormPhoto, setIsCapturingFormPhoto] = useState(false);

  // Barra di progresso salvataggio telematico
  const [isSavingInProgress, setIsSavingInProgress] = useState(false);
  const [saveProgressPercent, setSaveProgressPercent] = useState(0);
  const [saveProgressMessage, setSaveProgressMessage] = useState("");
  const [showOcrScanBox, setShowOcrScanBox] = useState(false);

  const handleCaptureFormPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCapturingFormPhoto(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 960;
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
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

            const addPhoto = (lat?: number, lng?: number) => {
              const photoItem = {
                id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                base64: compressedBase64,
                name: `Foto ${pendingFormPhotos.length + 1} (${new Date().toLocaleTimeString("it-IT")})`,
                timestamp: new Date().toISOString(),
                lat,
                lng,
              };
              setPendingFormPhotos(prev => [...prev, photoItem]);
              setIsCapturingFormPhoto(false);
            };

            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => addPhoto(pos.coords.latitude, pos.coords.longitude),
                () => addPhoto(),
                { enableHighAccuracy: true, timeout: 5000 }
              );
            } else {
              addPhoto();
            }
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert("Errore acquisizione foto: " + (err.message || String(err)));
      setIsCapturingFormPhoto(false);
    }
  };

  useEffect(() => {
    if (!db || !savedReportId) {
      setUploadedPhotos([]);
      return;
    }
    const q = query(
      collection(db, "intervention_attachments"),
      where("reportId", "==", savedReportId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setUploadedPhotos(list);
    });
    return () => unsubscribe();
  }, [savedReportId]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedReportId) return;

    try {
      setIsUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 960;

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
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.55);

            const saveWithCoords = async (lat?: number, lng?: number) => {
              const chunkLength = 500000;
              const isChunked = compressedBase64.length > chunkLength;

              const newAttachment = {
                name: `Foto sul Campo - ${new Date().toLocaleTimeString("it-IT")}.jpg`,
                uploadedAt: new Date().toISOString(),
                uploadedBy: currentGuard 
                  ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
                  : (user?.displayName || "Guardia Ekoclub"),
                type: "photo" as const,
                reportId: savedReportId,
                isChunked,
                url: isChunked ? "" : compressedBase64,
                totalChunks: isChunked ? Math.ceil(compressedBase64.length / chunkLength) : 1,
                ...(lat ? { latitude: lat } : {}),
                ...(lng ? { longitude: lng } : {}),
              };

              const attRef = await addDoc(collection(db, "intervention_attachments"), newAttachment);

              if (isChunked) {
                const totalChunks = Math.ceil(compressedBase64.length / chunkLength);
                const chunkPromises = [];
                for (let i = 0; i < totalChunks; i++) {
                  const chunkData = compressedBase64.substring(i * chunkLength, (i + 1) * chunkLength);
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
              setIsUploadingPhoto(false);
            };

            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  await saveWithCoords(position.coords.latitude, position.coords.longitude);
                },
                async (err) => {
                  console.warn("GPS fallito, procedo senza coordinate:", err);
                  await saveWithCoords();
                },
                { enableHighAccuracy: true, timeout: 5000 }
              );
            } else {
              await saveWithCoords();
            }
          } else {
            throw new Error("Canvas context error");
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert("Errore durante l'acquisizione della foto: " + (err.message || String(err)));
      setIsUploadingPhoto(false);
    }
  };

  // Gestione email destinatari al momento del salvataggio
  const [toSede, setToSede] = useState(true);
  const [sedeEmail, setSedeEmail] = useState("turniguardie493@gmail.com");
  const [toControllato, setToControllato] = useState(false);
  const [toGuard1, setToGuard1] = useState(true);
  const [guard1Email, setGuard1Email] = useState("");
  const [toGuard2, setToGuard2] = useState(false);
  const [guard2Email, setGuard2Email] = useState("");

  const [newReport, setNewReport] = useState<Partial<Report>>({
    numeroVerbale: "",
    data: "",
    oraInizio: "",
    oraFine: "",
    tipoVerbale: "zoofila",
    verbalizzanti: "",
    comune: "",
    provincia: "",
    localita: "",
    recatPresso: "",
    soggettoNome: "",
    soggettoNatoA: "",
    soggettoIl: "",
    soggettoResidenteA: "",
    soggettoProv: "",
    soggettoIndirizzo: "",
    soggettoDocumentoTipo: "",
    soggettoDocumentoNumero: "",
    soggettoDocScadenza: "",
    soggettoEmail: "",
    numeroAnimali: "",
    proprietarioPossessore: "proprietario",
    esito: "consenso",
    constatazioni: "",
    giorniRegolarizzazione: undefined,
    isFollowUp: false,
    parentReportId: "",
    emergencyCallId: "",
    chips: [
      { numero: "", nominativo: "" },
      { numero: "", nominativo: "" },
      { numero: "", nominativo: "" }
    ],
    // Campi per le flessioni grammaticali/articoli
    fI: "",
    fSottoscritt: "",
    fDa: "",
    fSi: "",
    fE: "",
    fRecat: "",
    fPresso: "",
    fDe: "",
    fAnimal: "",
    fDescritt: "",
    fVerbalizzant: "",
    fInteressat: "",
    fH: "",
    fHa: "",
    fChiesto: "",
    fEsser: "",
    fQualificat: "",
  });

  const [localEmergencyCalls, setLocalEmergencyCalls] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    getDocs(collection(db, "emergency_calls")).then((snapshot) => {
      if (!isMounted) return;
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLocalEmergencyCalls(list);
    }).catch((err) => console.error("Error fetching emergency calls inside VerbaleAIDialog:", err));
    return () => { isMounted = false; };
  }, [open]);

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

  const getNextNumeroVerbale = (reportsList: Report[], tipo: 'zoofila' | 'ittica' | 'venatoria'): string => {
    const sectorReports = reportsList.filter(r => r.tipoVerbale === tipo);
    let maxNum = 0;
    for (const r of sectorReports) {
      if (!r.numeroVerbale) continue;
      const match = r.numeroVerbale.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      } else {
        const digits = r.numeroVerbale.replace(/\D/g, "");
        if (digits) {
          const num = parseInt(digits, 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    const nextNum = maxNum + 1;
    return nextNum.toString();
  };

  useEffect(() => {
    if (isOpen) {
      // Lascia vuoto all'apertura se non impostato, consentendo all'operatore di digitarlo manualmente
      setNewReport(prev => ({
        ...prev,
        numeroVerbale: prev.numeroVerbale || ""
      }));

      // Inizializza email guardie operative
      if (currentGuard?.email) {
        setGuard1Email(currentGuard.email);
        setToGuard1(true);
      } else if (user?.email) {
        setGuard1Email(user.email);
        setToGuard1(true);
      }
    }
  }, [isOpen, currentGuard, user]);

  useEffect(() => {
    if (newReport.soggettoEmail) {
      setToControllato(true);
    } else {
      setToControllato(false);
    }
  }, [newReport.soggettoEmail]);
  


  const [signatureData, setSignatureData] = useState<string | null>(null);
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  // Caricamento iniziale da localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('draft_verbale');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNewReport(parsed);
          if (parsed.signatureData) {
            setSignatureData(parsed.signatureData);
          }
        } catch (e) {
          console.error("Errore parsing bozza locale", e);
        }
      }
    } catch (err) {
      console.warn("Accesso a localStorage non disponibile:", err);
    }
  }, []);

  // Salvataggio automatico ad ogni modifica
  useEffect(() => {
    try {
      const dataToSave = { ...newReport, signatureData };
      localStorage.setItem('draft_verbale', JSON.stringify(dataToSave));
    } catch (err) {
      console.warn("Salvataggio su localStorage non disponibile:", err);
    }
  }, [newReport, signatureData]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (sigCanvas.current) {
      setSignatureData(sigCanvas.current.toDataURL());
    }
  };

  const formatDateInput = (value: string) => {
    // Remove all non-digits
    const cleanValue = value.replace(/\D/g, '');
    let formatted = '';
    
    if (cleanValue.length > 0) {
      formatted += cleanValue.substring(0, 2);
      if (cleanValue.length >= 3) {
        formatted += '/' + cleanValue.substring(2, 4);
      }
      if (cleanValue.length >= 5) {
        formatted += '/' + cleanValue.substring(4, 8);
      }
    }
    return formatted;
  };

  const formatTimeInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    let formatted = '';
    
    if (cleanValue.length > 0) {
      formatted += cleanValue.substring(0, 2);
      if (cleanValue.length >= 3) {
        formatted += ':' + cleanValue.substring(2, 4);
      }
    }
    return formatted;
  };

  const convertYMDToDMY = (dateStr?: string) => {
    if (!dateStr) return dateStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return dateStr;
  };

  const handleSelectEmergencyCall = (callId: string) => {
    setNewReport(prev => {
      const updated = { ...prev, emergencyCallId: callId };
      const selectedCall = localEmergencyCalls.find(c => c.id === callId);
      if (selectedCall) {
        if (!updated.localita && selectedCall.localita) updated.localita = selectedCall.localita;
        if (!updated.comune && selectedCall.comune) updated.comune = selectedCall.comune.toUpperCase();
        if (!updated.soggettoNome && selectedCall.callerName) updated.soggettoNome = selectedCall.callerName;
        if (!updated.constatazioni && selectedCall.description) updated.constatazioni = `Intervento Radar: ${selectedCall.description}`;
      }
      return updated;
    });
  };

  const handlePrint = () => {
    try {
      printElementById('printable-verbale', `Verbale_N_${newReport.numeroVerbale || 'ND'}`);
    } catch (e) {
      console.warn("Native print blocked or errored inside sandbox. Falling back to PDF generate.", e);
    }
    // Generiamo e facciamo sempre scaricare anche il PDF A4 ufficiale per garantire la stampa fisica
    generateVerbalePDF(newReport);
  };

  const resetForm = () => {
    setPreviewUrl(null);
    setExtractionSuccess(false);
    setNewReport({
      numeroVerbale: "",
      data: "",
      oraInizio: "",
      oraFine: "",
      tipoVerbale: "zoofila",
      verbalizzanti: "",
      comune: "",
      provincia: "",
      localita: "",
      recatPresso: "",
      soggettoNome: "",
      soggettoNatoA: "",
      soggettoIl: "",
      soggettoResidenteA: "",
      soggettoProv: "",
      soggettoIndirizzo: "",
      soggettoDocumentoTipo: "",
      soggettoDocumentoNumero: "",
      soggettoDocScadenza: "",
      soggettoEmail: "",
      numeroAnimali: "",
      proprietarioPossessore: "proprietario",
      esito: "consenso",
      constatazioni: "",
      giorniRegolarizzazione: undefined,
      isFollowUp: false,
      parentReportId: "",
      emergencyCallId: "",
      chips: [
        { numero: "", nominativo: "" },
        { numero: "", nominativo: "" },
        { numero: "", nominativo: "" }
      ],
      fI: "",
      fSottoscritt: "",
      fDa: "",
      fSi: "",
      fE: "",
      fRecat: "",
      fPresso: "",
      fDe: "",
      fAnimal: "",
      fDescritt: "",
      fVerbalizzant: "",
      fInteressat: "",
      fH: "",
      fHa: "",
      fChiesto: "",
      fEsser: "",
      fQualificat: "",
    });
  };

  const exportDraft = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ ...newReport, signatureData }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `bozza_verbale_${newReport.numeroVerbale || 'nuovo'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importDraft = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setNewReport(json);
        if (json.signatureData) setSignatureData(json.signatureData);
      } catch (err) {
        alert("File non valido");
      }
    };
    reader.readAsText(file);
  };

  const processFile = async (file: File) => {
    // Genera preview locale immediata
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setExtractionSuccess(false);

    setIsAnalyzingAI(true);
    setAiTimer(0);
    const timerId = setInterval(() => setAiTimer(prev => prev + 1), 1000);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        let base64 = reader.result as string;
        try {
          const { compressImage } = await import("./lib/imageUtils");
          base64 = await compressImage(base64);
          
          const aiData = await processVerbaleImage(base64);
          if (aiData) {
            setScannedImageBase64(base64);
            const formattedAiData = { ...aiData };
            if (formattedAiData.data) formattedAiData.data = convertYMDToDMY(formattedAiData.data);
            if (formattedAiData.soggettoIl) formattedAiData.soggettoIl = convertYMDToDMY(formattedAiData.soggettoIl);
            if (formattedAiData.soggettoDocScadenza) formattedAiData.soggettoDocScadenza = convertYMDToDMY(formattedAiData.soggettoDocScadenza);
            
            setNewReport(prev => ({ ...prev, ...formattedAiData }));
            setExtractionSuccess(true);
            // Nascondi il messaggio di successo dopo 5 secondi
            setTimeout(() => setExtractionSuccess(false), 5000);
          } else {
            alert("⚠️ L'IA non è riuscita a leggere il verbale. Riprova con una foto più nitida.");
          }
        } catch (err) {
          alert("Errore nell'analisi IA.");
        } finally {
          clearInterval(timerId);
          setIsAnalyzingAI(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      clearInterval(timerId);
      setIsAnalyzingAI(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={setIsOpen}
    >
      {!noTrigger && (
        <DialogTrigger 
          nativeButton={true}
          render={
            dashboardMode ? (
              <button className="h-28 w-full bg-[#3b0764]/20 hover:bg-[#3b0764]/45 border-2 border-purple-500/30 text-white rounded-2xl flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 group shadow-xl cursor-pointer">
                <PlusCircle className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs uppercase font-black tracking-wider text-center leading-tight">
                  COMPILA <br /> VERBALE
                </span>
              </button>
            ) : rectangular ? (
              <button className="w-full h-full group bg-[#090d1a] hover:bg-[#11162b] border border-slate-800 hover:border-purple-500/30 text-white rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 shadow-xl cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-all">
                  <PlusCircle className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-base font-normal tracking-wide uppercase text-white group-hover:text-purple-400 transition-colors">Verbale di Sopralluogo</h4>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mt-2 max-w-[300px]">Compilazione assistita da IA con foto, dati cane, violazioni e prescrizioni</p>
                </div>
              </button>
            ) : (
              <button className="w-32 h-32 bg-purple-700/60 hover:bg-purple-600 border-2 border-purple-500/30 text-white rounded-full flex flex-col items-center justify-center gap-1 group shadow-xl shadow-purple-950/20 transition-all active:scale-95">
                <PlusCircle className="h-7 w-7 group-hover:scale-110 transition-transform mx-auto text-purple-400" />
                <span className="text-[9px] uppercase font-black text-center leading-tight tracking-[0.1em]">
                  VERBALE DI <br /> SOPRALLUOGO
                </span>
              </button>
            )
          }
        />
      )}
      
      <DialogContent className="fixed inset-0 z-50 bg-slate-950 text-slate-200 p-0 flex flex-col overflow-hidden w-full h-[100dvh] max-h-none md:w-full md:max-w-none md:h-full md:rounded-none shadow-none left-0 top-0 translate-x-0 translate-y-0 border-none">
        {savedReportId ? (
          <div className="flex-1 flex flex-col p-6 items-center justify-center bg-slate-950 font-sans text-center max-w-2xl mx-auto overflow-y-auto">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold uppercase tracking-wider text-white mb-2">
              ✓ Verbale Salvato con Successo!
            </h2>
            <p className="text-slate-400 text-sm mb-6 uppercase tracking-wide leading-relaxed">
              Il verbale di sopralluogo è stato registrato nel database di Massa-Carrara.<br />
              Ora puoi scattare le foto degli allegati (foto dell'animale, passaporto, documenti) ed inviarle istantaneamente.
            </p>

            {/* Upload form and camera button */}
            <div className="w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-6">
              {isUploadingPhoto ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-2" />
                  <span className="text-xs uppercase tracking-widest text-purple-400 font-bold animate-pulse">
                    Compressione e Caricamento in corso...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      const input = document.getElementById("post-save-camera-input") as HTMLInputElement;
                      if (input) {
                        input.value = "";
                        input.click();
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.15em] h-14 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <Camera className="h-5 w-5 animate-pulse" />
                    📸 Scatta Foto Allegato
                  </Button>
                  <input
                    type="file"
                    id="post-save-camera-input"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleUploadPhoto}
                  />
                  <p className="text-[10px] text-slate-500 uppercase leading-normal">
                    La foto verrà automaticamente geotaggata e allegata a questo verbale
                  </p>
                </div>
              )}
            </div>

            {/* List of uploaded photos for this report */}
            <div className="w-full bg-slate-900/40 border border-slate-900 rounded-2xl p-4 mb-6 text-left max-h-[220px] overflow-y-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3 border-b border-slate-800 pb-1.5">
                📎 Foto / Allegati Inviati ({uploadedPhotos.length})
              </span>
              {uploadedPhotos.length === 0 ? (
                <p className="text-xs text-slate-500 uppercase italic text-center py-3">
                  Nessuna foto ancora inviata per questo verbale.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {uploadedPhotos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-900 text-slate-200">
                      <div className="flex items-center gap-2 text-xs truncate">
                        <Camera className="h-4 w-4 text-emerald-400" />
                        <span className="truncate uppercase font-medium">{p.name}</span>
                      </div>
                      {p.latitude && (
                        <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900 px-1.5 rounded font-bold uppercase shrink-0">
                          📍 Geotag
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Complete action */}
            <Button
              onClick={() => {
                try {
                  localStorage.removeItem('draft_verbale');
                } catch (e) {
                  console.warn(e);
                }
                setScannedImageBase64(null);
                resetForm();
                setSavedReportId(null);
                setIsOpen(false);
              }}
              variant="outline"
              className="w-full border-slate-700 bg-slate-900 text-slate-200 hover:text-white uppercase tracking-widest font-black h-12 rounded-xl"
            >
              Completa ed Esci
            </Button>
          </div>
        ) : (
          <>
        {/* OVERLAY DI CARICAMENTO AI - MASSIMA VISIBILITÀ */}
        {isAnalyzingAI && (
          <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="h-32 w-32 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-purple-500 text-[10px] font-black uppercase text-center w-full px-4">
                Analisi...
              </div>
            </div>
            
            <div className="text-center space-y-6 max-w-md">
              <div className="space-y-2">
                <h3 className="text-3xl font-normal italic uppercase tracking-[0.2em] text-white">Lettura in corso</h3>
                <p className="text-purple-400 font-mono text-sm uppercase tracking-widest animate-pulse">Gemini 1.5 Pro sta decifrando la grafia...</p>
              </div>

              <div className="bg-slate-900/80 border border-white/5 p-6 rounded-3xl space-y-4 shadow-2xl">
                <div className="flex items-center justify-center gap-4 text-white">
                  <span className="text-4xl font-mono">{aiTimer}</span>
                  <span className="text-xs uppercase opacity-40 tracking-tighter w-20 text-left">Secondi elaborazione</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-purple-600 transition-all duration-1000" 
                    style={{ width: `${Math.min((aiTimer / 45) * 100, 100)}%` }}
                   ></div>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => setIsAnalyzingAI(false)}
                className="border-red-900/30 text-red-400 hover:bg-red-900/20 rounded-full px-8 h-12 uppercase text-[10px] tracking-widest font-bold"
              >
                Annulla Analisi
              </Button>
            </div>
          </div>
        )}

        <DialogHeader className="p-4 border-b border-white/5 bg-slate-900/50 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-xl shrink-0">
                <FileSearch className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xs md:text-sm font-bold text-white uppercase italic tracking-tight">Compilazione Verbale di Sopralluogo</DialogTitle>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest italic">Dati salvati automaticamente</p>
                  <div className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetForm}
                className="text-red-400 hover:bg-red-500/10 text-[9px] uppercase font-bold tracking-widest h-8 px-2"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Nuovo
              </Button>
              <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exportDraft}
                className="text-blue-400 hover:bg-blue-500/10 text-[9px] uppercase font-bold tracking-widest h-8 px-2"
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Esporta
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".json" onChange={importDraft} className="hidden" />
                <div className="inline-flex items-center justify-center rounded-md text-slate-300 hover:bg-white/10 px-2 h-8 text-[9px] uppercase font-bold tracking-widest">
                  <Upload className="h-3.5 w-3.5 mr-1" /> Importa
                </div>
              </label>
            </div>

            {extractionSuccess && (
              <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full animate-in zoom-in duration-300">
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Lettura Completata</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 md:grid-cols-2 divide-x divide-white/10">
            
            {/* COLONNA SINISTRA: FOTO ORIGINALE O INTERFACCIA DI CARICAMENTO DRAG & DROP */}
            {previewUrl && showImage ? (
              <div className="hidden md:flex flex-col bg-black h-full overflow-hidden relative group/viewer">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:bg-white/10" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-[10px] font-mono text-slate-400 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:bg-white/10" onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.25))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:bg-white/10" onClick={() => setZoomLevel(1)}>
                      Reset
                    </Button>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-4 right-4 z-20 h-10 w-10 rounded-xl bg-red-600/20 text-red-400 border border-red-600/20 hover:bg-red-600/40"
                  onClick={() => setShowImage(false)}
                  title="Ingrandisci modulo dati"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>

                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10 flex items-center justify-center p-4 bg-slate-950">
                  <div 
                    className="flex items-center justify-center transition-transform duration-300 ease-out origin-center"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    <img 
                      src={previewUrl} 
                      alt="Originale" 
                      className="shadow-2xl border border-white/10 max-w-full max-h-[75vh] object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full opacity-0 group-hover/viewer:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-[9px] text-slate-300 uppercase tracking-[0.2em]">Scorri per navigare nel documento originale</p>
                </div>
              </div>
            ) : (
              <div 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                className="hidden md:flex flex-col items-center justify-center p-8 bg-[#090d16] text-center gap-6 relative overflow-hidden h-full group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px]" />
                
                <div className="p-6 bg-purple-950/20 border border-purple-500/20 rounded-full text-purple-400 group-hover:scale-105 transition-transform duration-300">
                  <Camera className="h-10 w-10 animate-pulse" />
                </div>
                
                <div className="space-y-2 max-w-sm z-10">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    SCANSIONE VERBALE CARTACEO
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Trascina qui la foto nitida o la scansione del verbale di sopralluogo cartaceo compilato a mano (JPEG, PNG o PDF).
                  </p>
                  <p className="text-[10px] text-purple-400 font-mono uppercase tracking-widest bg-purple-500/10 py-1 px-3 rounded-full inline-block mt-2">
                    L'IA decifrerà la grafia in tempo reale
                  </p>
                </div>

                <label className="cursor-pointer z-10">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <div className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs uppercase font-black tracking-widest transition-all shadow-lg active:scale-95">
                    Seleziona File o Foto
                  </div>
                </label>
              </div>
            )}

            {/* COLONNA DESTRA: MODULO DATI */}
            <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
              {!showImage && previewUrl && (
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowImage(true)}
                  className="m-3 border-purple-500/30 text-purple-400 h-8 text-[10px] uppercase font-bold tracking-widest"
                >
                  <Maximize2 className="h-4 w-4 mr-2" /> Mostra Verbale Originale
                </Button>
              )}

              {/* SELETTORE MODALITÀ DI COMPILAZIONE (COMPLETA SU TUTTI I DISPOSITIVI) */}
              <div className="flex bg-slate-900 border-b border-slate-800 p-2 sm:p-2.5 flex-col md:flex-row items-center justify-between gap-1.5 shrink-0">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-purple-400">Modalità editor:</span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                  <button 
                    type="button"
                    onClick={() => setCompilationMode('mobile')}
                    className={`flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      compilationMode === 'mobile' 
                        ? "bg-purple-600 text-white shadow-lg font-bold" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Compilatore Rapido (Smartphone/Tablet)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCompilationMode('paper')}
                    className={`flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      compilationMode === 'paper' 
                        ? "bg-purple-600 text-white shadow-lg font-bold" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Printer className="h-3.5 w-3.5" /> Anteprima Cartacea (A4)
                  </button>
                </div>
              </div>
              
              <div 
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-900/10"
                onKeyDown={handleAutoNavigationKeyDown}
                onFocus={handleAutoNavigationFocus}
              >
                {extractionSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">IA: Trascrizione Completata</p>
                        <p className="text-[9px] text-emerald-500/60 uppercase mt-1">Controlla e correggi i dati estratti</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODALITÀ MOBILE: COMPILAZIONE FACILE ED INTERATTIVA */}
                {compilationMode === 'mobile' && (
                  <div className="space-y-6 text-slate-300">
                    
                    {/* SEZIONE FOTOGRAFIE DELL'INTERVENTO (Cane, Luogo, Documenti) */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4 text-emerald-400" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-white">Fotografie dell'Intervento ({pendingFormPhotos.length})</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Cane, Luogo, Documenti</span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              onChange={handleCaptureFormPhoto} 
                              className="hidden" 
                            />
                            <div className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs uppercase font-black tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95">
                              <Camera className="h-4 w-4" /> Scatta o Allega Foto
                            </div>
                          </label>
                          <span className="text-[11px] text-slate-400">
                            Le foto scattate verranno salvate automaticamente nel fascicolo senza alterare i campi compilati.
                          </span>
                        </div>

                        {/* Galleria anteprime foto allegate */}
                        {pendingFormPhotos.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                            {pendingFormPhotos.map((p, idx) => (
                              <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex flex-col justify-end">
                                <img src={p.base64} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                                <div className="relative p-1.5 flex items-center justify-between text-[9px] text-white">
                                  <span className="truncate font-bold">Foto #{idx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setPendingFormPhotos(prev => prev.filter(item => item.id !== p.id))}
                                    className="p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* BLOCCO SCANSIONE IA OPZIONALE PER FOGLIO CARTACEO */}
                      <div className="border-t border-white/5 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowOcrScanBox(!showOcrScanBox)}
                          className="text-[11px] uppercase font-bold text-purple-400 hover:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{showOcrScanBox ? "▼ Chiudi Trascrizione IA Cartaceo" : "► Hai un foglio cartaceo compilato a mano? Clicca per trascrivere con IA"}</span>
                        </button>

                        {showOcrScanBox && (
                          <div className="mt-3 bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl space-y-2">
                            <p className="text-[11px] text-slate-300 leading-normal">
                              Usa questa funzione <strong>solo</strong> per scansionare un verbale di sopralluogo cartaceo compilato a penna. L'IA Gemini decifrerà la scrittura per compilare i campi del modulo.
                            </p>
                            <label className="inline-block pt-1 cursor-pointer">
                              <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                capture="environment" 
                                onChange={handleFileChange} 
                                className="hidden" 
                              />
                              <div className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] uppercase font-black tracking-wider transition-all shadow flex items-center gap-2 active:scale-95">
                                <Sparkles className="h-3.5 w-3.5" /> Carica Foglio Cartaceo per Trascrizione
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SEZIONE 1: ESTREMI DEL VERBALE */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <ClipboardList className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">1. Estremi del Verbale</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Settore Attività / Servizio</Label>
                          <Select 
                            value={newReport.tipoVerbale || "zoofila"} 
                            onValueChange={(val: 'zoofila' | 'ittica' | 'venatoria') => {
                              setNewReport(prev => ({ 
                                ...prev, 
                                tipoVerbale: val
                              }));
                            }}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500 uppercase">
                              <SelectValue placeholder="Seleziona Settore" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-white">
                              <SelectItem value="zoofila" className="uppercase text-xs font-bold text-orange-400">Vigilanza Zoofila</SelectItem>
                              <SelectItem value="ittica" className="uppercase text-xs font-bold text-blue-400">Vigilanza Ittica</SelectItem>
                              <SelectItem value="venatoria" className="uppercase text-xs font-bold text-green-400">Vigilanza Venatoria</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Tipo di Sopralluogo</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setNewReport(prev => ({
                                  ...prev,
                                  isFollowUp: false,
                                  parentReportId: ""
                                }));
                              }}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                !newReport.isFollowUp 
                                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-950/20' 
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                              }`}
                            >
                              1° Sopralluogo (Iniziale)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewReport(prev => ({
                                  ...prev,
                                  isFollowUp: true
                                }));
                              }}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                newReport.isFollowUp 
                                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/20' 
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                              }`}
                            >
                              2° Sopralluogo (Verifica)
                            </button>
                          </div>
                        </div>

                        {newReport.isFollowUp && (
                          <div className="sm:col-span-2 border border-amber-500/10 bg-amber-500/5 p-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
                            <Label className="text-[10px] uppercase text-amber-400 font-bold block">
                              Collega a 1° Sopralluogo Esistente
                            </Label>
                            <Select
                              value={newReport.parentReportId || "none"}
                              onValueChange={(val) => {
                                if (val === "none") {
                                  setNewReport(prev => ({
                                    ...prev,
                                    parentReportId: ""
                                  }));
                                  return;
                                }
                                const selectedParent = reports.find(r => r.id === val);
                                if (selectedParent) {
                                  setNewReport(prev => ({
                                    ...prev,
                                    parentReportId: val,
                                    // Copia solo i dati stabili, NON quelli del possessore come richiesto
                                    comune: selectedParent.comune || prev.comune,
                                    provincia: selectedParent.provincia || prev.provincia,
                                    localita: selectedParent.localita || prev.localita,
                                    recatPresso: selectedParent.recatPresso || prev.recatPresso,
                                    numeroAnimali: selectedParent.numeroAnimali || prev.numeroAnimali,
                                    chips: selectedParent.chips && selectedParent.chips.length > 0 
                                      ? selectedParent.chips.map(c => ({ numero: c.numero || "", nominativo: c.nominativo || "" })) 
                                      : prev.chips,
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger className="bg-slate-950 border-amber-500/30 text-white rounded-xl h-11 text-xs font-semibold focus:border-amber-500 uppercase w-full flex items-center justify-between px-3">
                                <SelectValue placeholder="Seleziona Verbale Iniziale...">
                                  {newReport.parentReportId && reports.find(r => r.id === newReport.parentReportId) ? (
                                    <span className="text-amber-300 font-bold">
                                      {(() => {
                                        const r = reports.find(r => r.id === newReport.parentReportId);
                                        return r ? `${r.numeroVerbale ? `VERB. N. ${r.numeroVerbale}` : "VERB. SENZA NUMERO"} del ${r.data || "N/D"}` : "VERBALE SELEZIONATO";
                                      })()}
                                    </span>
                                  ) : undefined}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-slate-800 text-white max-h-[250px]">
                                <SelectItem value="none" className="text-xs">-- Nessun collegamento --</SelectItem>
                                {reports
                                  .filter(r => r.tipoVerbale === (newReport.tipoVerbale || "zoofila") && !r.isFollowUp)
                                  .map(r => (
                                    <SelectItem key={r.id} value={r.id} className="text-xs">
                                      {r.numeroVerbale ? `Verb. N. ${r.numeroVerbale}` : "Senza Numero"} - {r.data || "N/D"} ({r.localita || "Luogo N/D"})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-amber-500/80 italic leading-relaxed">
                              * Verranno copiati automaticamente solo i dati stabili (Comune, Località, Microchip, ecc.). I dati personali del possessore/proprietario rimarranno vuoti per consentire la compilazione di un eventuale nuovo soggetto presente.
                            </p>

                            {/* PREVIEW COMPLETA E DETTAGLIATA DEL 1° SOPRALLUOGO PER LA GUARDIA SUL CAMPO */}
                            {(() => {
                              const parentReport = newReport.parentReportId ? reports.find(r => r.id === newReport.parentReportId) : null;
                              if (!parentReport) return null;
                              return (
                                <div className="mt-4 border border-amber-500/30 bg-amber-950/20 p-4 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-300 text-left">
                                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block"></span>
                                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                                        DETTAGLI & PRESCRIZIONI 1° SOPRALLUOGO
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/20">
                                      VERB. N. {parentReport.numeroVerbale || "SENZA NUMERO"}
                                    </span>
                                  </div>

                                  {/* Info Generali */}
                                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                                    <div>
                                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Eseguito il</span>
                                      <span className="font-bold text-white">{parentReport.data || "N/D"} alle ore {parentReport.oraInizio || "N/D"}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Località e Comune</span>
                                      <span className="font-bold text-white">{parentReport.localita || "N/D"} ({parentReport.comune || "N/D"})</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Recatosi Presso</span>
                                      <span className="italic text-slate-200">{parentReport.recatPresso || "N/D"}</span>
                                    </div>
                                  </div>

                                  {/* QUADRO FATTUALI & PRESCRIZIONI - VISIBILE TOTALMENTE SENZA SCORRIMENTO */}
                                  <div className="bg-slate-950/90 border border-amber-500/20 p-3 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                      <span className="text-[9px] uppercase text-amber-400 font-extrabold tracking-wider">
                                        Fatti Accertati & Prescrizioni Impartite
                                      </span>
                                      {parentReport.giorniRegolarizzazione && (
                                        <span className="bg-amber-500/20 text-amber-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border border-amber-500/30">
                                          Termine Adeguamento: {parentReport.giorniRegolarizzazione} Giorni
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-amber-100 font-medium whitespace-pre-wrap leading-relaxed">
                                      {parentReport.constatazioni || "Nessuna constatazione o prescrizione registrata nel 1° sopralluogo."}
                                    </div>
                                  </div>

                                  {/* Soggetto Precedente Controllato */}
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-[11px]">
                                    <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1">
                                      Soggetto Identificato nel 1° Sopralluogo
                                    </span>
                                    <div className="font-bold text-slate-200 uppercase">
                                      {parentReport.soggettoNome || "Soggetto non censito"}
                                    </div>
                                    {parentReport.soggettoResidenteA && (
                                      <div className="text-slate-400 text-[10px] mt-0.5">
                                        Residente a {parentReport.soggettoResidenteA} {parentReport.soggettoIndirizzo ? `, ${parentReport.soggettoIndirizzo}` : ""}
                                      </div>
                                    )}
                                  </div>

                                  {/* Animali e Microchips */}
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] uppercase text-slate-400 font-bold block">
                                      Animali Censiti ({parentReport.tipoAnimale || "N/D"} - N. {parentReport.numeroAnimali || "N/D"})
                                    </span>
                                    {parentReport.chips && parentReport.chips.length > 0 ? (
                                      <div className="grid grid-cols-1 gap-1.5">
                                        {parentReport.chips.filter(c => c.numero || c.nominativo).map((c, idx) => (
                                          <div key={idx} className="flex justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 font-mono text-[10px]">
                                            <span className="text-amber-300 font-bold">{c.numero}</span>
                                            <span className="text-slate-400 uppercase font-semibold">{c.nominativo || "Senza Nome"}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[9px] text-slate-500 italic">Nessun microchip inserito nel 1° sopralluogo.</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        <div className="sm:col-span-2 bg-slate-900/40 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                          <Label className="text-[10px] uppercase text-amber-400 font-extrabold block">
                            Collega a Richiesta Intervento / SOS (Radar)
                          </Label>
                          <Select 
                            value={newReport.emergencyCallId || "none"} 
                            onValueChange={(val) => {
                              if (val === "none") {
                                setNewReport(prev => ({ ...prev, emergencyCallId: "" }));
                              } else {
                                handleSelectEmergencyCall(val);
                              }
                            }}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500">
                              <SelectValue placeholder="Seleziona un intervento attivo...">
                                {newReport.emergencyCallId ? (() => {
                                  const c = localEmergencyCalls.find(item => item.id === newReport.emergencyCallId);
                                  return c ? `${(c.priority || 'media').toUpperCase()} - Richiedente: ${c.callerName || 'Anonimo'} (${c.localita || 'N/D'})` : "Selezionato";
                                })() : "-- Nessun collegamento --"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-white max-h-[250px]">
                              <SelectItem value="none" className="text-xs">-- Nessun collegamento --</SelectItem>
                              {localEmergencyCalls
                                .filter(c => {
                                  const st = (c.status || '').toLowerCase().trim();
                                  return st !== 'risolto' && st !== 'risolta' && st !== 'annullata' && st !== 'annullato';
                                })
                                .map(c => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">
                                    {(c.priority || 'media').toUpperCase()} | {c.callerName || "Anonimo"} - {c.localita || "Luogo N/D"}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[9px] text-slate-400 leading-normal">
                            * L'indicatore sul Radar verrà impostato su <strong>Risolto</strong> e rimosso automaticamente al salvataggio definitivo del verbale.
                          </p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">N. Verbale</Label>
                          <Input 
                            value={newReport.numeroVerbale || ""} 
                            onChange={(e) => setNewReport({...newReport, numeroVerbale: e.target.value.toUpperCase()})}
                            placeholder="..."
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500 uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Data Sopralluogo</Label>
                          <Input 
                            value={newReport.data || ""} 
                            onChange={(e) => setNewReport({...newReport, data: formatDateInput(e.target.value)})}
                            placeholder="GG/MM/AAAA"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Ora Inizio</Label>
                          <Input 
                            value={newReport.oraInizio || ""} 
                            onChange={(e) => setNewReport({...newReport, oraInizio: formatTimeInput(e.target.value)})}
                            placeholder="HH:MM"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Ora Fine</Label>
                          <Input 
                            value={newReport.oraFine || ""} 
                            onChange={(e) => setNewReport({...newReport, oraFine: formatTimeInput(e.target.value)})}
                            placeholder="HH:MM"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">I Sottoscritti (Agenti)</Label>
                          <Input 
                            value={newReport.verbalizzanti || ""} 
                            onChange={(e) => setNewReport({...newReport, verbalizzanti: e.target.value.toUpperCase()})}
                            placeholder="ES. GR 01 - GR 05"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SEZIONE 2: LUOGO E SCOPO */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">2. Luogo e Scopo Sopralluogo</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Comune DI</Label>
                          <Input 
                            value={newReport.comune || ""} 
                            onChange={(e) => setNewReport({...newReport, comune: e.target.value.toUpperCase()})}
                            placeholder="ES. MASSA"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Provincia</Label>
                          <Input 
                            value={newReport.provincia || ""} 
                            onChange={(e) => setNewReport({...newReport, provincia: e.target.value.toUpperCase().substring(0, 2)})}
                            placeholder="MS"
                            maxLength={2}
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">In Località / Frazione</Label>
                          <Input 
                            value={newReport.localita || ""} 
                            onChange={(e) => setNewReport({...newReport, localita: e.target.value.toUpperCase()})}
                            placeholder="ES. ALTANON"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Ci siamo recati presso</Label>
                          <Input 
                            value={newReport.recatPresso || ""} 
                            onChange={(e) => setNewReport({...newReport, recatPresso: e.target.value.toUpperCase()})}
                            placeholder="ES. VIA DELLA VIGNA, PODERE ROSSO"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">N° Animali Custoditi</Label>
                          <Input 
                            value={newReport.numeroAnimali || ""} 
                            onChange={(e) => setNewReport({...newReport, numeroAnimali: e.target.value})}
                            placeholder="ES. 3"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SEZIONE 3: SOGGETTO CONTROLLATO */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <PenTool className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">3. Soggetto Controllato</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Nome e Cognome</Label>
                          <Input 
                            value={newReport.soggettoNome || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoNome: capitalizeWords(e.target.value)})}
                            placeholder="Es. Mario Rossi"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Nato A</Label>
                          <Input 
                            value={newReport.soggettoNatoA || ""} 
                            onChange={(e) => {
                              const val = capitalizeWords(e.target.value);
                              const autoProv = getProvinceFromComune(val);
                              setNewReport({
                                ...newReport,
                                soggettoNatoA: val,
                                ...(autoProv && !newReport.soggettoProv ? { soggettoProv: autoProv } : {})
                              });
                            }}
                            placeholder="Es. Massa"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">In Data</Label>
                          <Input 
                            value={newReport.soggettoIl || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoIl: formatDateInput(e.target.value)})}
                            placeholder="GG/MM/AAAA"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Residente A</Label>
                          <Input 
                            value={newReport.soggettoResidenteA || ""} 
                            onChange={(e) => {
                              const val = capitalizeWords(e.target.value);
                              const autoProv = getProvinceFromComune(val);
                              setNewReport({
                                ...newReport,
                                soggettoResidenteA: val,
                                ...(autoProv ? { soggettoProv: autoProv } : {})
                              });
                            }}
                            placeholder="Es. Massa"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Provincia</Label>
                          <Input 
                            value={newReport.soggettoProv || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoProv: e.target.value.toUpperCase().substring(0, 2)})}
                            placeholder="MS"
                            maxLength={2}
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Indirizzo di Residenza</Label>
                          <Input 
                            value={newReport.soggettoIndirizzo || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoIndirizzo: capitalizeWords(e.target.value)})}
                            placeholder="Es. Via Carducci 4"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Tipo Documento</Label>
                          <Input 
                            value={newReport.soggettoDocumentoTipo || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoDocumentoTipo: e.target.value.toUpperCase()})}
                            placeholder="CARTA D'IDENTITÀ"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Documento N°</Label>
                          <Input 
                            value={newReport.soggettoDocumentoNumero || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoDocumentoNumero: e.target.value.toUpperCase()})}
                            placeholder="ES. AX 998811"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Scadenza Documento</Label>
                          <Input 
                            value={newReport.soggettoDocScadenza || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoDocScadenza: formatDateInput(e.target.value)})}
                            placeholder="GG/MM/AAAA"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">E-mail Soggetto / Trasgressore (firme e invio copia automatica)</Label>
                          <Input 
                            value={newReport.soggettoEmail || ""} 
                            onChange={(e) => setNewReport({...newReport, soggettoEmail: e.target.value.toLowerCase()})}
                            placeholder="ES. TRASGRESSORE@DOMAIN.COM"
                            type="email"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                          />
                        </div>

                        {/* RUOLO DETENTORE/PROPRIETARIO CON FRECCETTA E BOX STILIZZATO */}
                        <div className="sm:col-span-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-extrabold mb-2 block">La persona controllata risulta essere:</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {['proprietario', 'detentore'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setNewReport({...newReport, proprietarioPossessore: role as any})}
                                className={`py-3 px-2 rounded-xl border font-black uppercase tracking-wider text-[9px] text-center transition-all ${
                                  newReport.proprietarioPossessore === role 
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-bold scale-[1.03]' 
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SEZIONE 4: CONSENSO E ESITO */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Camera className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">4. Consenso e Esito Sopralluogo</h4>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-bold mb-2 block">Riguardo al Sopralluogo:</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setNewReport({...newReport, esito: 'consenso'})}
                            className={`py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                              newReport.esito === 'consenso' 
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg scale-[1.02]' 
                                : 'bg-slate-950 text-emerald-500/60 border-slate-800 hover:text-emerald-400'
                            }`}
                          >
                            <span className="text-md font-sans">✓</span>
                            Hanno Prestato Consenso
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewReport({...newReport, esito: 'rifiuto'})}
                            className={`py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                              newReport.esito === 'rifiuto' 
                                ? 'bg-red-600 text-white border-red-500 shadow-lg scale-[1.02]' 
                                : 'bg-slate-950 text-red-500/60 border-slate-800 hover:text-red-400'
                            }`}
                          >
                            <span className="text-md font-sans">✗</span>
                            Hanno Rifiutato Accesso
                          </button>
                        </div>
                      </div>

                      {(newReport.esito === 'consenso' || !newReport.esito) && (
                        <div className="space-y-2 pt-2">
                          <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Esito Sopralluogo / Constatato quanto appresso:</Label>
                          <textarea
                            value={newReport.constatazioni || ""}
                            onChange={(e) => setNewReport({...newReport, constatazioni: e.target.value.toUpperCase()})}
                            placeholder="SCRIVI CON MASSIMO DETTAGLIO... (VIENE FORZATO IN MAIUSCOLO AUTOMATICAMENTE)"
                            className="bg-slate-950 border border-slate-800 text-white rounded-xl w-full p-4 h-40 resize-y focus:outline-none focus:border-purple-500 text-xs font-mono tracking-wide uppercase leading-relaxed"
                          />
                          <p className="text-[9px] text-slate-500 italic font-mono uppercase tracking-widest leading-none">Ottimizzato a 9.5pt sulla bozza cartacea per permettere più righe di scrittura.</p>
                        </div>
                      )}
                    </div>

                    {/* SEZIONE 5: MICROCHIP ESISTENTI */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Activity className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">5. Anagrafe Canina (Microchip)</h4>
                      </div>
                      
                      <div className="space-y-4">
                        {newReport.chips?.map((chip, index) => (
                          <div key={index} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 pb-1 border-b border-slate-900 flex justify-between">
                              <span>Cane / Chip {index + 1}</span>
                              <span className="text-[9px] text-slate-600 font-mono">15 CIFRE DISPONIBILI</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Codice Microchip</Label>
                                <Input 
                                  value={chip.numero || ""}
                                  maxLength={15}
                                  onChange={(e) => {
                                    const nc = [...(newReport.chips || [])];
                                    nc[index].numero = e.target.value.replace(/\D/g, '').substring(0, 15);
                                    setNewReport({...newReport, chips: nc});
                                  }}
                                  placeholder="ES. 380260000..."
                                  className="bg-slate-900 border-slate-800 text-white rounded-xl h-11 text-xs font-mono tracking-widest focus:border-purple-500"
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nome Unità / Cane</Label>
                                <Input 
                                  value={chip.nominativo || ""}
                                  onChange={(e) => {
                                    const nc = [...(newReport.chips || [])];
                                    nc[index].nominativo = e.target.value.toUpperCase();
                                    setNewReport({...newReport, chips: nc});
                                  }}
                                  placeholder="ES. BOBBY"
                                  className="bg-slate-900 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500 uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SEZIONE 6: PRESCRIZIONI E FIRMA */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl space-y-5">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <PenTool className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">6. Prescrizioni e Firma</h4>
                      </div>
                      
                      <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Giorni Massimi per Regolarizzazione</Label>
                        <Input 
                          type="number"
                          value={newReport.giorniRegolarizzazione || ""}
                          onChange={(e) => setNewReport({...newReport, giorniRegolarizzazione: e.target.value ? parseInt(e.target.value) : undefined})}
                          placeholder="ES. 10 (lascia vuoto se nessuna infrazione)"
                          className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-semibold focus:border-purple-500"
                        />
                      </div>

                      <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl relative">
                        <Label className="text-[10px] uppercase text-slate-400 font-black tracking-wider block mb-2">Firma sul Display (Usa il dito o una penna da schermo):</Label>
                        
                        <div className="border-2 border-slate-700 rounded-xl overflow-hidden bg-white mb-2 shadow-inner">
                          <SignatureCanvas 
                            ref={sigCanvas}
                            penColor='black'
                            canvasProps={{ 
                              height: 120, 
                              className: 'sigCanvas w-full bg-white cursor-pointer touch-none' 
                            }}
                            onEnd={saveSignature}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center bg-slate-950 p-1 rounded-xl">
                          <button 
                            type="button"
                            onClick={clearSignature} 
                            className="text-red-400 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-900/30 hover:bg-red-950/40 text-[9px] uppercase font-black tracking-widest transition-colors flex items-center"
                          >
                            <Eraser className="h-3.5 w-3.5 mr-1" /> Azzera Firma
                          </button>
                          {signatureData && (
                            <span className="text-[9px] text-emerald-400 uppercase font-black tracking-widest flex items-center gap-1">
                              ✓ Firma Registrata
                            </span>
                          )}
                        </div>
                        {signatureData && (
                          <div className="mt-3 text-center bg-slate-900/50 p-3 rounded-xl border border-slate-900">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">Firma Attuale Registrata:</p>
                            <div className="bg-white p-1.5 rounded-lg inline-block shadow">
                              <img src={signatureData} alt="Firma" className="max-h-12 mx-auto" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                      {/* NUOVA SEZIONE: INVIO COPIE VIA E-MAIL */}
                      <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl relative space-y-4">
                        <Label className="text-[10px] uppercase text-purple-400 font-black tracking-wider block mb-1 flex items-center gap-1.5">
                          <PlusCircle className="h-4 w-4 text-purple-500" /> Opzioni Invio E-mail al Salvataggio
                        </Label>
                        <p className="text-[10px] text-slate-400 font-sans leading-normal">
                          Configura a quali indirizzi destinatari inviare automaticamente la copia conforme in PDF del verbale al momento del clic su "SALVA".
                        </p>

                        <div className="space-y-3">
                          {/* Sede Centrale */}
                          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800/50 text-left">
                            <input 
                              type="checkbox" 
                              id="toSedeComp"
                              checked={toSede}
                              onChange={(e) => setToSede(e.target.checked)}
                              className="mt-1 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="flex-1">
                              <label htmlFor="toSedeComp" className="text-xs font-bold text-slate-300 cursor-pointer block">Archivio Sede Centrale (Sede)</label>
                              <Input 
                                disabled={!toSede}
                                value={sedeEmail}
                                onChange={(e) => setSedeEmail(e.target.value)}
                                className="h-8 text-[11px] bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1 w-full"
                              />
                            </div>
                          </div>

                          {/* Trasgressore / Cittadino */}
                          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800/50 text-left">
                            <input 
                              type="checkbox" 
                              id="toControllatoComp"
                              checked={toControllato}
                              onChange={(e) => setToControllato(e.target.checked)}
                              className="mt-1 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="flex-1">
                              <label htmlFor="toControllatoComp" className="text-xs font-bold text-slate-300 cursor-pointer block">Cittadino Controllato</label>
                              <Input 
                                disabled={!toControllato}
                                value={newReport.soggettoEmail || ""}
                                onChange={(e) => setNewReport({ ...newReport, soggettoEmail: e.target.value.toLowerCase() })}
                                placeholder="Nessun indirizzo impostato nel modulo"
                                className="h-8 text-[11px] bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1 w-full"
                              />
                            </div>
                          </div>

                          {/* Prima Guardia */}
                          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800/50 text-left">
                            <input 
                              type="checkbox" 
                              id="toGuard1Comp"
                              checked={toGuard1}
                              onChange={(e) => setToGuard1(e.target.checked)}
                              className="mt-1 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="flex-1">
                              <label htmlFor="toGuard1Comp" className="text-xs font-bold text-slate-300 cursor-pointer block">Prima Guardia Verbalizzante</label>
                              <Input 
                                disabled={!toGuard1}
                                value={guard1Email}
                                onChange={(e) => setGuard1Email(e.target.value)}
                                placeholder="Inserisci indirizzo email..."
                                className="h-8 text-[11px] bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1 w-full"
                              />
                            </div>
                          </div>

                          {/* Seconda Guardia */}
                          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800/50 text-left">
                            <input 
                              type="checkbox" 
                              id="toGuard2Comp"
                              checked={toGuard2}
                              onChange={(e) => setToGuard2(e.target.checked)}
                              className="mt-1 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="flex-1">
                              <label htmlFor="toGuard2Comp" className="text-xs font-bold text-slate-300 cursor-pointer block">Seconda Guardia Verbalizzante</label>
                              <Input 
                                disabled={!toGuard2}
                                value={guard2Email}
                                onChange={(e) => setGuard2Email(e.target.value)}
                                placeholder="Inserisci indirizzo email..."
                                className="h-8 text-[11px] bg-slate-950 border-slate-800 focus:border-purple-500 text-slate-300 rounded-lg mt-1 w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* IL MODULO CARTACEO DIGITALE DI PDF/STAMPA - SEMPRE DISPONIBILE NEL DOM PER STAMPA/EXPORT */}
                <div className={`${compilationMode === 'paper' ? 'flex' : 'hidden'} justify-center overflow-x-auto overflow-y-hidden bg-slate-900/50 p-2 md:p-8`}>
                  <div className="origin-top scale-[0.45] sm:scale-[0.6] md:scale-100 transition-transform">
                    <div 
                      id="printable-verbale" 
                      style={{ 
                        width: '190mm', 
                        padding: '2mm 6mm 2mm 6mm',
                        fontSize: '10.5pt', 
                        lineHeight: '1.35',
                        boxSizing: 'border-box',
                        backgroundColor: 'white',
                        color: 'black',
                        fontFamily: '"Times New Roman", Times, serif',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                      }}
                    >
                    <div>
                    {/* INTESTAZIONE */}
                    <ReportHeader 
                      numeroVerbale={newReport.numeroVerbale} 
                      onNumeroVerbaleChange={(val) => setNewReport({...newReport, numeroVerbale: val})}
                      sopralluogoTipo={newReport.sopralluogoTipo || "1"}
                      onSopralluogoTipoChange={(val) => setNewReport({...newReport, sopralluogoTipo: val})}
                    />

                    {/* CORPO VERBALE - STRUTTURA A RIGHE PULITA */}
                    <div style={{ marginTop: '2mm', display: 'flex', flexDirection: 'column', gap: '2mm' }}>
                      {/* RIGA 1 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '2mm', rowGap: '1mm' }}>
                        <span>L'anno </span>
                        <UnderlineField 
                          value={newReport.data || ""} 
                          onChange={(val) => setNewReport({...newReport, data: formatDateInput(val)})}
                          width="28mm" 
                          textAlign="left" 
                          maxLength={10}
                        />
                        <span> alle ore </span>
                        <UnderlineField 
                          value={newReport.oraInizio || ""} 
                          onChange={(val) => setNewReport({...newReport, oraInizio: formatTimeInput(val)})}
                          width="16mm" 
                          textAlign="center" 
                        />
                        <span> con termine ore </span>
                        <UnderlineField 
                          value={newReport.oraFine || ""} 
                          onChange={(val) => setNewReport({...newReport, oraFine: formatTimeInput(val)})}
                          width="16mm" 
                          textAlign="center" 
                        />
                        <span> i sottoscritti </span>
                        <UnderlineField 
                          value={newReport.verbalizzanti || ""} 
                          placeholder="ES: GR 01 - GR 05"
                          onChange={(val) => setNewReport({...newReport, verbalizzanti: val})}
                          width="52mm" 
                          textAlign="center"
                          appendSlashes={true}
                        />
                      </div>

                      {/* RIGA 2 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '2mm', rowGap: '1mm' }}>
                        <span>nel Comune di </span>
                        <UnderlineField 
                          value={newReport.comune || ""} 
                          onChange={(val) => setNewReport({...newReport, comune: val})}
                          width="34mm" 
                        />
                        <span> prov. (</span>
                        <UnderlineField 
                          value={newReport.provincia || ""} 
                          onChange={(val) => setNewReport({...newReport, provincia: val.toUpperCase()})}
                          width="10mm" 
                          textAlign="center" 
                          maxLength={2}
                        />
                        <span>) in località </span>
                        <UnderlineField 
                          value={newReport.localita || ""} 
                          onChange={(val) => setNewReport({...newReport, localita: val})}
                          width="40mm" 
                        />
                      </div>

                      {/* RIGA 3 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '2mm', rowGap: '1mm' }}>
                        <span>Ci siamo recati presso </span>
                        <UnderlineField 
                          value={newReport.recatPresso || ""} 
                          onChange={(val) => setNewReport({...newReport, recatPresso: val})}
                          width="60mm" 
                        />
                        <span> allo scopo di constatare le condizioni di custodia di n. </span>
                        <UnderlineField 
                          value={newReport.numeroAnimali || ""} 
                          onChange={(val) => setNewReport({...newReport, numeroAnimali: val})}
                          width="12mm" 
                          textAlign="center" 
                        />
                        <span> animali.</span>
                      </div>

                      {/* RIGA 4 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '2mm', rowGap: '1mm' }}>
                        <span>Dopo esserci qualificati al Sig. </span>
                        <UnderlineField 
                          value={newReport.soggettoNome || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoNome: val})}
                          width="65mm" 
                        />
                        <span> nato a </span>
                        <UnderlineField 
                          value={newReport.soggettoNatoA || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoNatoA: val})}
                          width="38mm" 
                        />
                        <span> il </span>
                        <UnderlineField 
                          value={newReport.soggettoIl || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoIl: formatDateInput(val)})}
                          width="28mm" 
                          textAlign="center" 
                        />
                      </div>

                      {/* RIGA 5 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '2mm', rowGap: '1mm' }}>
                        <span>residente a </span>
                        <UnderlineField 
                          value={newReport.soggettoResidenteA || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoResidenteA: val})}
                          width="50mm" 
                        />
                        <span> prov. </span>
                        <UnderlineField 
                          value={newReport.soggettoProv || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoProv: val.toUpperCase()})}
                          width="12mm" 
                          textAlign="center" 
                        />
                        <span> via/piazza </span>
                        <UnderlineField 
                          value={newReport.soggettoIndirizzo || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoIndirizzo: val})}
                          width="68mm" 
                        />
                      </div>

                      {/* RIGA 6 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '2mm', rowGap: '1mm' }}>
                        <span>doc. </span>
                        <UnderlineField 
                          value={newReport.soggettoDocumentoTipo || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoDocumentoTipo: val})}
                          width="35mm" 
                        />
                        <span> n. </span>
                        <UnderlineField 
                          value={newReport.soggettoDocumentoNumero || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoDocumentoNumero: val})}
                          width="35mm" 
                        />
                        <span> scad. </span>
                        <UnderlineField 
                          value={newReport.soggettoDocScadenza || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoDocScadenza: formatDateInput(val)})}
                          width="28mm" 
                          textAlign="center" 
                        />
                        <span> che risulta </span>
                        <span className="no-print inline-block relative mx-1 align-baseline">
                          <select 
                            value={newReport.proprietarioPossessore} 
                            onChange={(e) => setNewReport({...newReport, proprietarioPossessore: e.target.value as any})}
                            className="bg-amber-50/60 text-slate-950 border border-slate-700 rounded pl-2 pr-7 py-0.5 text-[10pt] font-medium cursor-pointer outline-none transition-all shadow-sm italic hover:bg-amber-100"
                            style={{ 
                              appearance: 'none', 
                              WebkitAppearance: 'none', 
                              MozAppearance: 'none',
                              fontFamily: 'serif',
                              lineHeight: '1.2'
                            }}
                          >
                            <option value="proprietario">proprietario</option>
                            <option value="detentore">detentore</option>
                          </select>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-700">
                            <svg className="h-3.5 w-3.5 fill-current stroke-current" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </span>
                        <span className="print-only hidden italic border-b" style={{ display: 'none' }}>
                          {newReport.proprietarioPossessore || "proprietario"}
                        </span>
                        <span> degli animali in oggetto di controllo.</span>
                      </div>

                      {/* INDIRIZZO E-MAIL TRASGRESSORE (NO-PRINT) */}
                      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '1.5mm', rowGap: '1mm', marginTop: '3.3mm', padding: '2mm', borderRadius: '8px', backgroundColor: 'rgba(124, 58, 237, 0.05)', border: '1px dashed rgba(124, 58, 237, 0.2)' }}>
                        <span className="text-xs font-semibold text-slate-300">INVIO TELEMATICO COPIA: </span>
                        <UnderlineField 
                          value={newReport.soggettoEmail || ""} 
                          onChange={(val) => setNewReport({...newReport, soggettoEmail: val.toLowerCase()})}
                          width="80mm" 
                          placeholder="INSERIRE INDIRIZZO E-MAIL TRASGRESSORE"
                        />
                        <span className="text-[10px] text-slate-400 italic">(la copia del verbale firmato verrà spedita in automatico a questa email)</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '2.5mm', fontStyle: 'italic' }}>
                      I verbalizzanti hanno chiesto il consenso al sopralluogo.
                    </div>

                    {/* SELEZIONE ESITO (VISIBLE SOLO A SCHERMO) */}
                    <div className="no-print" style={{ display: 'flex', gap: '5mm', marginTop: '2mm' }}>
                      <div 
                        onClick={() => setNewReport({...newReport, esito: 'consenso'})}
                        style={{ cursor: 'pointer', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '5px', background: newReport.esito === 'consenso' ? '#e0ffe0' : 'white', fontWeight: '500' }}
                      >
                        CONSENSO
                      </div>
                      <div 
                        onClick={() => setNewReport({...newReport, esito: 'rifiuto'})}
                        style={{ cursor: 'pointer', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '5px', background: newReport.esito === 'rifiuto' ? '#ffe0e0' : 'white', fontWeight: '500' }}
                      >
                        RIFIUTO
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: '2mm', 
                      fontStyle: 'italic', 
                      fontSize: '11pt', 
                      lineHeight: '1.4',
                      maxWidth: '180mm' 
                    }}>
                      {newReport.esito === 'rifiuto' ? 
                        "Avendo ricevuto rifiuto i verbalizzanti non hanno potuto procedere al sopralluogo." : 
                        "Avendo ricevuto consenso esplicito i verbalizzanti hanno potuto procedere al sopralluogo ed hanno constatato quanto appresso."}
                    </div>

                    {/* COSTATAZIONI - LAYOUT PULITO SENZA RIQUADRO OPEN OFFICE */}
                    {(newReport.esito === 'consenso' || !newReport.esito) && (
                      <div style={{ marginTop: '2.5mm' }}>
                        <div style={{ fontWeight: '600', borderBottom: '1.5pt solid black', paddingBottom: '0.8mm', letterSpacing: '0.3px', fontSize: '11pt' }}>
                          Esito sopralluogo / constatato quanto appresso:
                        </div>
                        <div style={{ marginTop: '1.5mm', padding: '0.5mm 0', minHeight: '50px' }}>
                          <textarea 
                            value={newReport.constatazioni} 
                            onChange={(e) => setNewReport({...newReport, constatazioni: e.target.value})}
                            className="no-print"
                            style={{ 
                              width: '100%', 
                              minHeight: '45px', 
                              border: 'none',
                              lineHeight: '1.4',
                              fontSize: '11pt',
                              fontStyle: 'italic',
                              background: 'transparent',
                              resize: 'none',
                              outline: 'none',
                              fontFamily: '"Times New Roman", Times, serif'
                            }}
                            placeholder="INSERIRE DETTAGLI DEL SOPRALLUOGO ED ESITO..."
                          />
                          <div 
                            className="print-only"
                            style={{ 
                              display: 'none',
                              width: '100%', 
                              lineHeight: '1.4',
                              fontSize: '11pt',
                              fontStyle: 'italic',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {newReport.constatazioni || 'Nessuna constatazione particolare_'}
                          </div>
                        </div>

                        {/* MICROCHIPS - Layout Professionale e Compatto */}
                        <div style={{ marginTop: '2mm', display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
                          {newReport.chips?.map((chip, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', rowGap: '1mm', columnGap: '2mm' }}>
                              <span style={{ fontSize: '11pt' }}>Chip {index + 1}:</span>
                              <UnderlineField 
                                value={chip.numero || ""} 
                                onChange={(val) => {
                                  const nc = [...(newReport.chips || [])];
                                  nc[index].numero = val.replace(/\D/g, '').substring(0, 15);
                                  setNewReport({...newReport, chips: nc});
                                }}
                                width="44mm" 
                                textAlign="center"
                                placeholder="15 CIFRE MICROCHIP"
                              />
                              <span style={{ fontSize: '11pt', marginLeft: '1.5mm' }}>Nome animale:</span>
                              <UnderlineField 
                                value={chip.nominativo || ""} 
                                onChange={(val) => {
                                  const nc = [...(newReport.chips || [])];
                                  nc[index].nominativo = val;
                                  setNewReport({...newReport, chips: nc});
                                }}
                                width="68mm" 
                                placeholder="NOME ANIMALE"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '2mm', display: 'flex', alignItems: 'baseline', columnGap: '2mm', flexWrap: 'wrap', lineHeight: '1.4' }}>
                      <span>Vengono concessi giorni </span>
                      <input 
                        value={newReport.giorniRegolarizzazione || ""} 
                        onChange={(e) => setNewReport({...newReport, giorniRegolarizzazione: e.target.value ? parseInt(e.target.value) : undefined})}
                        className="no-print"
                        style={{ border: 'none', borderBottom: '1.5pt solid black', width: '22mm', textAlign: 'center', background: 'transparent', fontSize: '11pt', fontStyle: 'italic' }}
                      />
                      <span className="print-only" style={{ display: 'none', borderBottom: '1.5pt solid black', minWidth: '18mm', textAlign: 'center', fontStyle: 'italic' }}>
                        {newReport.giorniRegolarizzazione || '///'}
                      </span>
                      <span> per la regolarizzazione dalla notifica del presente atto.</span>
                    </div>
                    </div>

                    {/* FIRME E PIÈ DI PAGINA IN BASSO */}
                    <div style={{ marginTop: '2.5mm' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15mm' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ borderTop: '1.5pt solid black', paddingTop: '1mm' }}>
                            <div style={{ fontWeight: '600', fontSize: '10pt' }}>Il detentore / proprietario</div>
                          </div>
                          {/* Area Firma Digitale */}
                          {signatureData ? (
                            <div style={{ marginTop: '1mm', textAlign: 'center' }}>
                              <img src={signatureData} alt="Firma Detentore" style={{ maxHeight: '14mm', maxWidth: '100%', margin: '0 auto' }} />
                            </div>
                          ) : (
                            <div className="no-print" style={{ marginTop: '1.5mm', border: '1px dashed #ccc', padding: '1.5mm', borderRadius: '6px', backgroundColor: '#f9f9f9', fontSize: '8pt', color: '#666' }}>
                              Firma sul display nel modulo a sinistra
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div>
                            <div style={{ borderTop: '1.5pt solid black', paddingTop: '1mm' }}>
                              <div style={{ fontWeight: '600', fontSize: '10pt' }}>I verbalizzanti</div>
                            </div>
                            <div style={{ marginTop: '2.5mm', fontSize: '11pt', fontStyle: 'italic' }}>
                              {newReport.verbalizzanti ? `${resolveVerbalizzantiToMatricole(newReport.verbalizzanti, guards)} /////` : '____________________'}
                            </div>
                            <div style={{ fontSize: '7.5pt', color: '#666', marginTop: '1mm' }}>(Firma non richiesta)</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '2.5mm', fontSize: '7.5pt', color: '#555', textAlign: 'center', lineHeight: '1.2', borderTop: '0.5pt solid #ddd', paddingTop: '1.5mm' }}>
                        Il trattamento dei dati riportati nel presente verbale viene effettuato nel rispetto di finalità di rilevante interesse pubblico, ai sensi degli artt. 70 e 73 del D.Lgs. 30/06/2003 n. 196 e s.m.i.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <DialogFooter className="p-4 md:p-6 border-t border-white/10 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 w-full overflow-hidden">
          <Button 
            variant="ghost" 
            onClick={() => setIsOpen(false)} 
            className="text-slate-400 hover:text-white uppercase text-[10px] tracking-widest font-bold h-12 bg-slate-950/50 md:bg-transparent w-full md:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>

          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="border-emerald-600/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300 h-12 px-6 uppercase text-[10px] tracking-[0.2em] font-black w-full md:w-auto"
            >
              <Printer className="h-4 w-4 mr-2" />
              Stampa Verbale
            </Button>
            
            <Button 
              disabled={isSavingInProgress}
              onClick={async () => {
                try {
                  setIsSavingInProgress(true);
                  setSaveProgressPercent(15);
                  setSaveProgressMessage("Validazione estremi del verbale e firme...");

                  const emailPayload = {
                    toSede,
                    sedeEmail: toSede ? sedeEmail.trim() : "",
                    toControllato: toControllato && !!newReport.soggettoEmail,
                    controllatoEmail: toControllato ? (newReport.soggettoEmail || "").trim() : "",
                    toGuard1,
                    guard1Email: toGuard1 ? guard1Email.trim() : "",
                    toGuard2,
                    guard2Email: toGuard2 ? guard2Email.trim() : ""
                  };
                  const resolvedVerbalizzanti = resolveVerbalizzantiToMatricole(newReport.verbalizzanti, guards);

                  setSaveProgressPercent(40);
                  setSaveProgressMessage("Registrazione del verbale in archivio telematico...");

                  const reportId = await onSave({ 
                    ...newReport, 
                    verbalizzanti: resolvedVerbalizzanti, 
                    signatureData: signatureData || undefined, 
                    scannedImageBase64: scannedImageBase64 || undefined 
                  }, emailPayload);

                  if (reportId && db) {
                    setSavedReportId(reportId);

                    // Se sono state scattate fotografie durante la compilazione, le salviamo nel fascicolo
                    if (pendingFormPhotos.length > 0) {
                      setSaveProgressMessage(`Caricamento di ${pendingFormPhotos.length} foto dell'intervento...`);
                      for (let i = 0; i < pendingFormPhotos.length; i++) {
                        const p = pendingFormPhotos[i];
                        const chunkLength = 500000;
                        const isChunked = p.base64.length > chunkLength;
                        const newAttachment: any = {
                          name: `${p.name}.jpg`,
                          uploadedAt: p.timestamp,
                          uploadedBy: currentGuard 
                            ? `${currentGuard.surname || ""} ${currentGuard.name}`.trim() 
                            : (user?.matricola || user?.name || "Centrale"),
                          type: "photo",
                          reportId: reportId,
                          isChunked,
                          url: isChunked ? "" : p.base64,
                          totalChunks: isChunked ? Math.ceil(p.base64.length / chunkLength) : 1,
                          ...(p.lat ? { latitude: p.lat } : {}),
                          ...(p.lng ? { longitude: p.lng } : {}),
                        };
                        const attRef = await addDoc(collection(db, "intervention_attachments"), newAttachment);
                        if (isChunked) {
                          const totalChunks = Math.ceil(p.base64.length / chunkLength);
                          for (let c = 0; c < totalChunks; c++) {
                            const chunkData = p.base64.substring(c * chunkLength, (c + 1) * chunkLength);
                            await addDoc(collection(db, "attachment_chunks"), {
                              attachmentId: attRef.id,
                              chunkIndex: c,
                              data: chunkData,
                              uploadedAt: new Date().toISOString(),
                            });
                          }
                        }
                        const currentPerc = 40 + Math.round(((i + 1) / pendingFormPhotos.length) * 50);
                        setSaveProgressPercent(currentPerc);
                      }
                    }

                    setSaveProgressPercent(100);
                    setSaveProgressMessage("Verbale e fotografie salvati con successo!");
                    setTimeout(() => {
                      setIsSavingInProgress(false);
                    }, 1000);
                  } else {
                    setSaveProgressPercent(100);
                    setSaveProgressMessage("Salvataggio completato.");
                    setTimeout(() => {
                      setIsSavingInProgress(false);
                      try {
                        localStorage.removeItem('draft_verbale');
                      } catch (e) {
                        console.warn(e);
                      }
                      setScannedImageBase64(null);
                      setPendingFormPhotos([]);
                      resetForm();
                      setIsOpen(false);
                    }, 1000);
                  }
                } catch (saveErr: any) {
                  setIsSavingInProgress(false);
                  alert("Errore durante il salvataggio: " + (saveErr?.message || String(saveErr)));
                }
              }} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] px-10 h-14 md:h-12 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 w-full md:w-auto flex items-center justify-center gap-2"
            >
              {isSavingInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Salvataggio in Corso...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva in Archivio
                </>
              )}
            </Button>
          </div>
        </DialogFooter>

        {/* OVERLAY BARRA DI AVANZAMENTO SALVATAGGIO */}
        {isSavingInProgress && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="h-16 w-16 mx-auto rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white uppercase tracking-wider">Salvataggio Verbale</h4>
                <p className="text-xs text-slate-400 mt-1">{saveProgressMessage}</p>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${saveProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Stato: Trasmissione telematica</span>
                  <span className="font-bold text-purple-400">{saveProgressPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

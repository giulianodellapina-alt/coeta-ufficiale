import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Phone, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Printer, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Mic, 
  PlusCircle, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  ChevronRight, 
  Trash2, 
  ExternalLink,
  Volume2,
  Sparkles,
  Filter,
  Check,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { EmergencyCall, AudioRecordItem, DossierIntegrationEvent, Guard } from "../types";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";
import { db } from "../lib/firebase";
import { doc, updateDoc, deleteDoc, arrayUnion } from "firebase/firestore";

interface ArchivioChiamateDossierViewProps {
  calls: EmergencyCall[];
  guards: Guard[];
  currentGuard: Guard | null;
  user: any;
  onClose: () => void;
  onNewRequestClick?: () => void;
}

export const ArchivioChiamateDossierView: React.FC<ArchivioChiamateDossierViewProps> = ({
  calls,
  guards,
  currentGuard,
  user,
  onClose,
  onNewRequestClick
}) => {
  const operatorName = `${currentGuard?.surname || ""} ${currentGuard?.name || ""}`.trim() || user?.email || "Operatore Centrale";
  const operatorMatricola = currentGuard?.matricola || "HQ-OP";

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  // Active Dossier in inspection
  const [selectedCallId, setSelectedCallId] = useState<string | null>(() => calls[0]?.id || null);

  // New Integration / Note state
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventContent, setEventContent] = useState("");
  const [eventType, setEventType] = useState<"nota" | "vocale_whatsapp" | "riscontro_pg" | "variazione_stato">("nota");
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // WhatsApp audio upload modal & transcription state
  const [isUploadAudioOpen, setIsUploadAudioOpen] = useState(false);
  const [audioSourceTitle, setAudioSourceTitle] = useState("Nota Vocale WhatsApp");
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioTranscription, setAudioTranscription] = useState("");
  const [audioFileName, setAudioFileName] = useState<string>("");
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/ogg");
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState<string | null>(null);
  const [globalSuccessMsg, setGlobalSuccessMsg] = useState<string | null>(null);
  const [transcribingAudioId, setTranscribingAudioId] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Modal Audio Preview state
  const [isPlayingModalPreview, setIsPlayingModalPreview] = useState(false);
  const modalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);

  // Inline deletion confirmation modal (non-blocking for iframes)
  const [callToDelete, setCallToDelete] = useState<EmergencyCall | null>(null);
  const [isDeletingCall, setIsDeletingCall] = useState(false);

  // Keep selectedCallId synced when calls array updates
  useEffect(() => {
    if (!selectedCallId && calls.length > 0) {
      setSelectedCallId(calls[0].id);
    }
  }, [calls, selectedCallId]);

  // Filtered Calls list
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchText = 
        !q ||
        (c.callerName || "").toLowerCase().includes(q) ||
        (c.callerPhone || "").toLowerCase().includes(q) ||
        (c.localita || "").toLowerCase().includes(q) ||
        (c.comune || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.protocolCode || "").toLowerCase().includes(q) ||
        (c.id || "").toLowerCase().includes(q);

      const matchSector = filterSector === "all" || c.sector === filterSector;
      const matchPriority = filterPriority === "all" || c.priority === filterPriority;
      const matchStatus = filterStatus === "all" || c.status === filterStatus;
      
      let matchDate = true;
      if (filterDate && c.createdAt) {
        matchDate = c.createdAt.startsWith(filterDate);
      }

      return matchText && matchSector && matchPriority && matchStatus && matchDate;
    });
  }, [calls, searchQuery, filterSector, filterPriority, filterStatus, filterDate]);

  // Selected Call Object
  const activeCall = useMemo(() => {
    return calls.find((c) => c.id === selectedCallId) || filteredCalls[0] || null;
  }, [calls, selectedCallId, filteredCalls]);

  // Handle Play/Pause Audio
  const handleTogglePlayAudio = (audioId: string, base64Url: string) => {
    if (playingAudioId === audioId) {
      if (activeAudioElRef.current) {
        activeAudioElRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioElRef.current) {
      activeAudioElRef.current.pause();
    }

    const audio = new Audio(base64Url);
    activeAudioElRef.current = audio;
    setPlayingAudioId(audioId);

    audio.onended = () => {
      setPlayingAudioId(null);
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
    });
  };

  // Play/Pause Preview inside upload modal
  const handleToggleModalPreview = () => {
    if (!audioBase64) return;
    if (isPlayingModalPreview) {
      if (modalAudioRef.current) modalAudioRef.current.pause();
      setIsPlayingModalPreview(false);
      return;
    }

    if (modalAudioRef.current) {
      modalAudioRef.current.pause();
    }

    const audio = new Audio(audioBase64);
    modalAudioRef.current = audio;
    setIsPlayingModalPreview(true);
    audio.onended = () => setIsPlayingModalPreview(false);
    audio.onerror = () => setIsPlayingModalPreview(false);
    audio.play().catch(() => setIsPlayingModalPreview(false));
  };

  // Trascrizione Fonica Diretta con Modello IA Gemini
  const handleTranscribeAudio = async (base64ToUse?: string, mimeToUse?: string, nameToUse?: string) => {
    const targetBase64 = base64ToUse || audioBase64;
    if (!targetBase64) {
      alert("Seleziona prima un file audio da trascrivere.");
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);
    setTranscriptionSuccess(null);

    try {
      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: targetBase64,
          mimeType: mimeToUse || audioMimeType || "audio/ogg",
          fileName: nameToUse || audioFileName || "vocale_whatsapp"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Errore del server (${res.status}) durante la trascrizione`);
      }

      const data = await res.json();
      if (data.transcription) {
        setAudioTranscription(data.transcription);
        setTranscriptionSuccess(
          data.summary 
            ? `Trascrizione completata con successo! Sintesi: "${data.summary}"` 
            : "Trascrizione completata con successo tramite intelligenza artificiale!"
        );
        // Se il titolo era generico, aggiungiamo il riferimento estratto
        if (data.subject && (!audioSourceTitle || audioSourceTitle === "Nota Vocale WhatsApp")) {
          setAudioSourceTitle(`Vocale: ${data.subject.slice(0, 35)}`);
        }
      } else {
        throw new Error("Nessuna trascrizione generata dal modello IA.");
      }
    } catch (err: any) {
      console.error("Errore trascrizione vocale:", err);
      setTranscriptionError(err.message || "Errore durante la trascrizione automatica.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Trascrizione per vocali già salvati nel fascicolo ma privi di testo
  const handleTranscribeExistingAudio = async (audioItem: AudioRecordItem) => {
    if (!activeCall || !audioItem.audioBase64) return;
    setTranscribingAudioId(audioItem.id);

    try {
      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: audioItem.audioBase64,
          mimeType: "audio/ogg",
          fileName: audioItem.title || "vocale_whatsapp"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Errore del server durante la trascrizione");
      }

      const data = await res.json();
      if (!data.transcription) throw new Error("Trascrizione non disponibile.");

      const updatedRecordings = (activeCall.audioRecordings || []).map((a) => {
        if (a.id === audioItem.id) {
          return {
            ...a,
            transcription: data.transcription,
            transcribedBy: `${operatorName} (Matr. ${operatorMatricola})`,
            transcribedAt: new Date().toISOString()
          };
        }
        return a;
      });

      await updateDoc(doc(db, "emergency_calls", activeCall.id), {
        audioRecordings: updatedRecordings
      });

      setGlobalSuccessMsg("✓ Trascrizione vocale aggiornata e salvata con successo nel fascicolo!");
      setTimeout(() => setGlobalSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Errore trascrizione vocale: " + (err.message || err));
    } finally {
      setTranscribingAudioId(null);
    }
  };

  // Handle audio file selection (WhatsApp .opus, .ogg, .mp3, .m4a, .wav)
  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedMime = file.type || "audio/ogg";
    setAudioFileName(file.name);
    setAudioMimeType(detectedMime);
    setTranscriptionError(null);
    setTranscriptionSuccess(null);

    if (!audioSourceTitle || audioSourceTitle === "Nota Vocale WhatsApp") {
      setAudioSourceTitle(`Vocale WhatsApp (${file.name.replace(/\.[^/.]+$/, "")})`);
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setAudioBase64(base64);

      // Probe audio duration
      try {
        const tempAudio = new Audio(base64);
        tempAudio.onloadedmetadata = () => {
          setAudioDuration(Math.round(tempAudio.duration) || 0);
        };
      } catch (e) {
        console.warn("Audio duration probing:", e);
      }

      // TRASCRIZIONE AUTOMATICA DIRETTA (senza attese o trascrizione manuale)
      handleTranscribeAudio(base64, detectedMime, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Save Audio Record & Transcription into Call Dossier (con eliminazione sicura di campi undefined per Firestore)
  const handleSaveAudioToDossier = async () => {
    if (!activeCall || !audioBase64) {
      alert("Seleziona prima un file audio valido.");
      return;
    }
    setIsSavingAudio(true);

    try {
      const cleanTranscription = audioTranscription.trim();
      const currentOpName = operatorName || "Operatore Centrale";
      const currentOpMatr = operatorMatricola || "HQ";

      const newAudioItem: AudioRecordItem = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        audioBase64,
        durationSeconds: audioDuration || 0,
        recordedAt: new Date().toISOString(),
        operatorName: currentOpName,
        operatorMatricola: currentOpMatr,
        source: "whatsapp_import",
        title: audioSourceTitle.trim() || "Nota Vocale WhatsApp",
        ...(cleanTranscription ? {
          transcription: cleanTranscription,
          transcribedBy: `${currentOpName} (Matr. ${currentOpMatr})`,
          transcribedAt: new Date().toISOString(),
        } : {})
      };

      const integrationEvent: DossierIntegrationEvent = {
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        operatorName: currentOpName,
        operatorMatricola: currentOpMatr,
        type: "vocale_whatsapp",
        title: `Allegato Vocale WhatsApp: ${newAudioItem.title}`,
        content: cleanTranscription 
          ? `[TRASCRIZIONE IA VOCALE]: "${cleanTranscription}"`
          : "Acquisito file vocale WhatsApp agli atti di Centrale.",
        attachmentAudioId: newAudioItem.id,
      };

      // Aggiorna Firestore
      await updateDoc(doc(db, "emergency_calls", activeCall.id), {
        audioRecordings: arrayUnion(newAudioItem),
        dossierEvents: arrayUnion(integrationEvent),
      });

      // Reset stato modale
      setIsUploadAudioOpen(false);
      setAudioBase64(null);
      setAudioTranscription("");
      setAudioDuration(0);
      setAudioFileName("");
      setAudioSourceTitle("Nota Vocale WhatsApp");
      setTranscriptionSuccess(null);
      setTranscriptionError(null);
      if (modalAudioRef.current) {
        modalAudioRef.current.pause();
      }
      setIsPlayingModalPreview(false);

      setGlobalSuccessMsg("✓ File vocale WhatsApp e Trascrizione salvati nel Dossier con successo!");
      setTimeout(() => setGlobalSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Errore salvataggio vocale:", err);
      alert("Errore durante il salvataggio del vocale nel dossier: " + (err.message || err));
    } finally {
      setIsSavingAudio(false);
    }
  };

  // Save text integration event to dossier
  const handleSaveIntegrationEvent = async () => {
    if (!activeCall || !eventTitle.trim()) return;
    setIsSavingEvent(true);

    try {
      const newEvt: DossierIntegrationEvent = {
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        operatorName,
        operatorMatricola,
        type: eventType,
        title: eventTitle.trim(),
        content: eventContent.trim() || "Nessun testo specificato.",
      };

      await updateDoc(doc(db, "emergency_calls", activeCall.id), {
        dossierEvents: arrayUnion(newEvt),
      });

      setIsAddEventOpen(false);
      setEventTitle("");
      setEventContent("");
      setEventType("nota");
    } catch (err: any) {
      console.error("Errore salvataggio evento dossier:", err);
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Execute deletion directly on Firestore
  const handleExecuteDelete = async () => {
    if (!callToDelete) return;
    setIsDeletingCall(true);
    try {
      await deleteDoc(doc(db, "emergency_calls", callToDelete.id));
      setCallToDelete(null);
      if (selectedCallId === callToDelete.id) {
        setSelectedCallId(null);
      }
    } catch (err: any) {
      console.error("Errore eliminazione chiamata:", err);
    } finally {
      setIsDeletingCall(false);
    }
  };

  // Stampa A4 Completa del Dossier con Intestazione Aquila e Trascrizioni
  const handlePrintDossier = (call: EmergencyCall) => {
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const protocolCode = call.protocolCode || `RIC-${new Date(call.createdAt || Date.now()).getFullYear()}-${call.id.slice(0, 5).toUpperCase()}`;
    const originalTitle = document.title;
    document.title = `Dossier_Intervento_${protocolCode}`;

    const dateFormatted = new Date(call.createdAt || Date.now()).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const audios = call.audioRecordings || [];
    const events = call.dossierEvents || [];

    const printHtml = `
      <html>
        <head>
          <title>Dossier Intervento ${protocolCode}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 6mm 8mm 6mm 8mm; }
              body { 
                margin: 0; 
                padding: 0; 
                background: white !important; 
                color: black !important; 
                font-family: Arial, sans-serif;
                font-size: 8.5pt;
                line-height: 1.3;
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .avoid-break { page-break-inside: avoid; }
            }
            body { 
              font-family: Arial, sans-serif; 
              color: #111; 
              margin: 6mm 10mm;
              line-height: 1.3;
              font-size: 9pt;
            }
            .protocol-badge {
              border: 2px solid #000;
              display: inline-block;
              padding: 5px 16px;
              font-weight: 900;
              font-size: 11pt;
              margin: 4px 0 10px 0;
              text-align: center;
              background-color: #f3f4f6;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            h2 { 
              font-size: 9.5pt; 
              border-bottom: 1.5px solid #222; 
              padding-bottom: 3px; 
              margin-top: 10px; 
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000;
              font-weight: bold;
            }
            .meta-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 4px 0 8px 0; 
            }
            .meta-table th, .meta-table td { 
              border: 1px solid #777; 
              padding: 4px 8px; 
              text-align: left; 
              font-size: 8.5pt;
            }
            .meta-table th { 
              background-color: #f3f4f6; 
              width: 25%; 
              font-weight: bold;
            }
            .text-block { 
              background: #fafafa; 
              border: 1px solid #777; 
              padding: 8px 10px; 
              font-size: 8.5pt;
              margin: 4px 0 8px 0;
              white-space: pre-wrap;
              min-height: 35px;
            }
            .audio-box {
              border: 1.5px dashed #444;
              padding: 8px 10px;
              background: #fdfdfd;
              margin-bottom: 8px;
              border-radius: 4px;
            }
            .audio-header {
              font-weight: bold;
              font-size: 8.5pt;
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #ccc;
              padding-bottom: 3px;
              margin-bottom: 5px;
            }
            .transcription-text {
              font-style: italic;
              background: #f8fafc;
              border-left: 3px solid #0284c7;
              padding: 5px 8px;
              margin-top: 4px;
              font-size: 8.5pt;
            }
            .footer-sig { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 25px; 
              font-size: 8.5pt;
              font-weight: bold;
              page-break-inside: avoid;
            }
            .sig-box { 
              border-top: 1px dashed #333; 
              width: 6cm; 
              text-align: center; 
              padding-top: 4px; 
            }
          </style>
        </head>
        <body>
          ${getOfficialPrintHeaderHtml("REGISTRO GENERALE RICHIESTE D'INTERVENTO • DOSSIER UFFICIALE", "FASCICOLO TELEFONICO ED ATTI DI CENTRALE OPERATIVA")}

          <div style="text-align: center;">
            <div class="protocol-badge">
              DOSSIER RICHIESTA D'INTERVENTO PROTOCOLLO N° ${protocolCode}
            </div>
          </div>

          <h2>1. Estremi della Chiamata e Operatore Ricevente</h2>
          <table class="meta-table">
            <tr>
              <th>Data e Ora Ricezione</th>
              <td>${dateFormatted}</td>
              <th>Orario Chiamata</th>
              <td>Inizio: ${call.callStartTime || "00:00"} — Fine: ${call.callEndTime || "00:00"}</td>
            </tr>
            <tr>
              <th>Settore / Ambito</th>
              <td>VIGILANZA ${(call.sector || "zoofila").toUpperCase()}</td>
              <th>Grado Priorità</th>
              <td><strong style="text-transform: uppercase;">${call.priority || "media"}</strong></td>
            </tr>
            <tr>
              <th>Operatore Ricevente</th>
              <td>${call.operatorName || operatorName}</td>
              <th>Matricola Operatore</th>
              <td>${call.operatorMatricola || operatorMatricola}</td>
            </tr>
          </table>

          <h2>2. Generalità del Richiedente e Recapiti</h2>
          <table class="meta-table">
            <tr>
              <th>Cognome e Nome</th>
              <td><strong>${(call.callerName || "Anonimo / Non fornito").toUpperCase()}</strong></td>
              <th>Recapito Telefonico</th>
              <td><strong>${call.callerPhone || "Non fornito"}</strong></td>
            </tr>
          </table>

          <h2>3. Localizzazione dell'Intervento</h2>
          <table class="meta-table">
            <tr>
              <th>Comune</th>
              <td>${(call.comune || "Massa").toUpperCase()}</td>
              <th>Località / Indirizzo</th>
              <td>${call.localita || "N.D."}</td>
            </tr>
            <tr>
              <th>Coordinate GPS</th>
              <td colspan="3">LAT: ${Number(call.lat || 0).toFixed(5)} — LNG: ${Number(call.lng || 0).toFixed(5)}</td>
            </tr>
          </table>

          <h2>4. Sintesi della Richiesta / Fatti Segnalati</h2>
          <div class="text-block">
${call.description || "Nessuna descrizione specificata."}
          </div>

          ${audios.length > 0 ? `
          <h2>5. Allegati Fonici e Trascrizioni Vocali WhatsApp (${audios.length} presenti)</h2>
          <div style="margin-bottom: 8px;">
            ${audios.map((a, idx) => `
              <div class="audio-box avoid-break">
                <div class="audio-header">
                  <span>Allegato #${idx + 1}: ${a.title || "Nota Vocale WhatsApp"} (${a.durationSeconds || 0} sec.)</span>
                  <span>Acquisito: ${new Date(a.recordedAt).toLocaleString("it-IT", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style="font-size: 8pt; color: #444;">
                  Operatore acquisizione: ${a.operatorName || "Centrale"} ${a.operatorMatricola ? `(Matr. ${a.operatorMatricola})` : ""}
                </div>
                <div class="transcription-text">
                  <strong>Trascrizione Fedele del Messaggio Fonico:</strong><br/>
                  ${a.transcription ? `"${a.transcription}"` : "<em>[Nessuna trascrizione testuale inserita - Traccia audio originale archiviata nei registri telematici di Centrale]</em>"}
                </div>
              </div>
            `).join("")}
          </div>
          ` : ""}

          ${events.length > 0 ? `
          <h2>6. Registro Cronologico Integrazioni e Note Successive (${events.length})</h2>
          <table class="meta-table avoid-break">
            <thead>
              <tr>
                <th style="width: 20%;">Data / Ora</th>
                <th style="width: 25%;">Operatore</th>
                <th style="width: 20%;">Tipologia</th>
                <th>Note / Contenuto Tracciato</th>
              </tr>
            </thead>
            <tbody>
              ${events.map(ev => `
                <tr>
                  <td>${new Date(ev.timestamp).toLocaleString("it-IT", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${ev.operatorName} (${ev.operatorMatricola})</td>
                  <td style="text-transform: uppercase; font-size: 8pt;">${ev.type}</td>
                  <td><strong>${ev.title}</strong><br/>${ev.content}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ` : ""}

          <h2>7. Esito Operativo e Disposizioni di Centrale</h2>
          <table class="meta-table avoid-break">
            <tr>
              <th>Stato del Fascicolo</th>
              <td><strong>${(call.status || "in_attesa").toUpperCase()}</strong></td>
              <th>Pattuglia Assegnata</th>
              <td>${call.assignedGuardName ? `${call.assignedGuardName} (Tel. ${call.assignedGuardPhone || "N.D."})` : "Nessuna pattuglia assegnata"}</td>
            </tr>
            ${call.notes ? `
            <tr>
              <th>Note Operative</th>
              <td colspan="3">${call.notes}</td>
            </tr>
            ` : ""}
          </table>

          <div style="font-size: 8pt; font-style: italic; margin-top: 10px; color: #333;" class="avoid-break">
            Attestazione: Il presente estratto costituisce riproduzione fedele degli atti registrati nella banca dati telematica della Centrale Operativa C.O.E.T.A. Ekoclub Massa-Carrara. Gli eventuali file fonici originali rimangono custoditi nei server di sicurezza a disposizione della competente Autorità Giudiziaria e di Polizia.
          </div>

          <div class="footer-sig">
            <div class="sig-box">
              L'Operatore di Centrale Verbalizzante<br/><br/>
              ____________________________________
            </div>
            <div class="sig-box">
              Il Responsabile di Centrale / Coordinatore<br/><br/>
              ____________________________________
            </div>
          </div>
        </body>
      </html>
    `;

    portal.innerHTML = printHtml;
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
      if (portal) portal.innerHTML = "";
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#020617] text-slate-100 flex flex-col w-screen h-screen overflow-hidden font-sans">
      {/* Testata Superiore con Logo e Titolo Istituzionale */}
      <header className="h-16 px-4 md:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Phone className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                Archivio Richieste Interventi & Dossier Chiamate
              </h1>
              <Badge className="bg-red-600/30 text-red-300 border-red-500/50 text-[10px] uppercase font-mono">
                {filteredCalls.length} Fascicoli
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide hidden sm:block">
              Centrale Operativa C.O.E.T.A. • Registro atti fonici, trascrizioni vocali WhatsApp e modulistica ufficiale A4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNewRequestClick && (
            <Button
              type="button"
              size="sm"
              onClick={onNewRequestClick}
              className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase px-3.5 h-9 rounded-xl shadow-lg border border-red-500 flex items-center gap-1.5 cursor-pointer"
              title="Apri Modulo Nuova Richiesta d'Intervento"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Nuova Chiamata</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <X className="h-4 w-4 text-slate-400" />
            <span>Chiudi Archivio</span>
          </Button>
        </div>
      </header>

      {/* Banner Notifica Azione Globale */}
      {globalSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-md shrink-0 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
            <span>{globalSuccessMsg}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setGlobalSuccessMsg(null)}
            className="text-white hover:text-emerald-200 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Corpo Principale Diviso in Due Colonne: 
          SX: Indice Cronologico Ricercabile 
          DX: Fascicolo / Dossier Dettagliato a Tutto Schermo */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* COLONNA SINISTRA: Elenco & Ricerca */}
        <div className="w-full md:w-96 lg:w-[420px] bg-slate-950/90 border-r border-slate-800/80 flex flex-col shrink-0 overflow-hidden">
          {/* Barra Ricerca & Filtri */}
          <div className="p-3 border-b border-slate-800/80 space-y-2 bg-slate-900/40 shrink-0">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca numero, nome, via o comune..."
                className="pl-9 h-9 bg-slate-950 border-slate-800 text-xs rounded-xl text-white placeholder:text-slate-500 focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtri Rapidi */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10.5px]">
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[10.5px] cursor-pointer"
              >
                <option value="all">Tutti i Settori</option>
                <option value="zoofila">Zoofilo</option>
                <option value="ittica">Ittico</option>
                <option value="venatoria">Venatorio</option>
                <option value="ambientale">Ambientale</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[10.5px] cursor-pointer"
              >
                <option value="all">Tutte le Priorità</option>
                <option value="emergenza">Emergenza 🚨</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="bassa">Bassa</option>
              </select>

              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-28 h-7 text-[10px] bg-slate-950 border-slate-800 text-slate-300 rounded-lg px-1.5 py-0"
              />

              {filterDate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFilterDate("")}
                  className="h-7 px-1.5 text-[10px] text-slate-400 hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Lista Schede Chiamate */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1.5">
            {filteredCalls.length === 0 ? (
              <div className="text-center py-16 px-4 text-slate-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-bold text-slate-400">Nessuna richiesta trovata</p>
                <p className="text-[11px] text-slate-500 mt-1">Verifica i filtri impostati o registra una nuova chiamata.</p>
              </div>
            ) : (
              filteredCalls.map((c) => {
                const isSelected = activeCall?.id === c.id;
                const protocolCode = c.protocolCode || `RIC-${new Date(c.createdAt || Date.now()).getFullYear()}-${c.id.slice(0, 5).toUpperCase()}`;
                const audioCount = (c.audioRecordings || []).length;
                const eventCount = (c.dossierEvents || []).length;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCallId(c.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-red-950/30 border-red-500/80 shadow-md shadow-red-950/40 ring-1 ring-red-500/50"
                        : "bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[10.5px] font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                        {protocolCode}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          c.priority === "emergenza" ? "bg-red-900 text-red-200" :
                          c.priority === "alta" ? "bg-amber-900 text-amber-200" : "bg-slate-800 text-slate-300"
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "N.D."}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        {c.callerName || "Richiedente Anonimo"}
                      </p>
                      <span className="text-[10px] text-cyan-300 font-mono truncate">
                        {c.callerPhone || "N.D."}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                      {c.comune ? `${c.comune.toUpperCase()} - ` : ""}{c.localita || "Posizione geografica"}
                    </p>

                    {/* Badge presenze fonici e integrazioni */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[9.5px]">
                      {audioCount > 0 && (
                        <span className="bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <Volume2 className="h-2.5 w-2.5" /> {audioCount} {audioCount === 1 ? "Vocale" : "Vocali"}
                        </span>
                      )}
                      {eventCount > 0 && (
                        <span className="bg-indigo-950/70 border border-indigo-600/50 text-indigo-300 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" /> {eventCount} {eventCount === 1 ? "Integrazione" : "Integrazioni"}
                        </span>
                      )}
                      <span className="ml-auto text-slate-500 font-mono text-[9px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: Dettaglio / Fascicolo del Dossier */}
        <div className="flex-1 bg-[#030712] flex flex-col overflow-hidden">
          {activeCall ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar Fascicolo */}
              <div className="p-3 md:p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700">
                        {activeCall.protocolCode || `RIC-${new Date(activeCall.createdAt || Date.now()).getFullYear()}-${activeCall.id.slice(0, 5).toUpperCase()}`}
                      </span>
                      <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                        Dossier Ufficiale Intervento
                      </h2>
                      <Badge className="bg-slate-800 text-slate-300 text-[10px] uppercase">
                        Settore: {activeCall.sector || "zoofila"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ricevuta il {new Date(activeCall.createdAt || Date.now()).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} • Operatore: {activeCall.operatorName || operatorName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Stampa Dossier Ufficiale A4 con Intestazione Aquila */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handlePrintDossier(activeCall)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase text-xs h-9 px-3.5 rounded-xl shadow-lg border-0 flex items-center gap-1.5 cursor-pointer"
                    title="Stampa Scheda Dossier Completa in Formato Ufficiale A4 (con Aquila)"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Stampa Scheda A4 🖨️</span>
                  </Button>

                  {/* Carica Vocale WhatsApp */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setAudioBase64(null);
                      setAudioTranscription("");
                      setIsUploadAudioOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                    title="Allega messaggio vocale ricevuto su WhatsApp"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>+ Vocale WhatsApp</span>
                  </Button>

                  {/* Aggiungi Integrazione / Nota nel Tempo */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEventTitle("");
                      setEventContent("");
                      setIsAddEventOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-3 rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                    title="Aggiungi una nuova nota o integrazione al fascicolo"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>+ Integrazione</span>
                  </Button>

                  {/* Elimina Chiamata / Simulazione */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCallToDelete(activeCall)}
                    className="bg-red-950/40 hover:bg-red-900 border-red-800/80 text-red-300 h-9 px-3 rounded-xl text-xs font-bold cursor-pointer"
                    title="Elimina definitivamente questo fascicolo o test da Firestore"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Elimina</span>
                  </Button>
                </div>
              </div>

              {/* Contenuto Scorrevole del Dossier */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* 1. Scheda Informazioni Chiamante & Località */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Richiedente */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <User className="h-4 w-4 text-cyan-400" />
                      1. Generalità del Richiedente
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nome / Cognome:</span>
                        <strong className="text-white font-bold">{activeCall.callerName || "Anonimo / Rifiuta generalità"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recapito Telefonico:</span>
                        <strong className="text-cyan-300 font-mono">{activeCall.callerPhone || "Non fornito"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Orario Telefonata:</span>
                        <span className="text-slate-200 font-mono">
                          Inizio: {activeCall.callStartTime || "00:00"} — Fine: {activeCall.callEndTime || "00:00"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Operatore Ricevente:</span>
                        <span className="text-slate-300">{activeCall.operatorName || operatorName} ({activeCall.operatorMatricola || operatorMatricola})</span>
                      </div>
                    </div>
                  </div>

                  {/* Località */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                      2. Localizzazione Evento
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Comune:</span>
                        <strong className="text-white font-bold uppercase">{activeCall.comune || "Massa"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Località / Indirizzo:</span>
                        <strong className="text-slate-200">{activeCall.localita || "N.D."}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Coordinate GPS:</span>
                        <span className="text-cyan-400 font-mono">
                          {Number(activeCall.lat || 0).toFixed(5)}, {Number(activeCall.lng || 0).toFixed(5)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stato Gestione:</span>
                        <strong className="uppercase text-amber-400 font-bold">{activeCall.status || "in_attesa"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Descrizione Fatti / Segnalazione */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <FileText className="h-4 w-4 text-amber-400" />
                    3. Descrizione della Segnalazione
                  </h3>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {activeCall.description || "Nessuna descrizione inserita per questa chiamata."}
                  </div>
                  {activeCall.notes && (
                    <div className="pt-2 text-xs text-slate-400">
                      <strong className="text-slate-300">Note Aggiuntive:</strong> {activeCall.notes}
                    </div>
                  )}
                </div>

                {/* 3. Sezione Vocali WhatsApp & Trascrizioni */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-emerald-400" />
                      4. Allegati Fonici & Trascrizioni Vocali WhatsApp ({(activeCall.audioRecordings || []).length})
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setAudioBase64(null);
                        setAudioTranscription("");
                        setIsUploadAudioOpen(true);
                      }}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold h-7 px-2.5 rounded-lg flex items-center gap-1"
                    >
                      <PlusCircle className="h-3 w-3" /> Aggiungi Vocale
                    </Button>
                  </div>

                  {(activeCall.audioRecordings || []).length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      Nessun file fonico o vocale WhatsApp allegato a questa richiesta d'intervento.
                      <p className="text-[11px] text-slate-600 mt-1">Puoi caricare le registrazioni vocali ricevute dal cittadino su WhatsApp.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(activeCall.audioRecordings || []).map((audio, idx) => {
                        const isPlaying = playingAudioId === audio.id;
                        return (
                          <div
                            key={audio.id || idx}
                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleTogglePlayAudio(audio.id, audio.audioBase64)}
                                  className={`h-8 w-8 rounded-full p-0 flex items-center justify-center cursor-pointer ${
                                    isPlaying 
                                      ? "bg-red-600 text-white animate-pulse" 
                                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                  }`}
                                >
                                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                                </Button>
                                <div>
                                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                    {audio.title || `Nota Vocale #${idx + 1}`}
                                    <span className="text-[10px] text-slate-400 font-mono">({audio.durationSeconds || 0}s)</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-400">
                                    Caricato il {new Date(audio.recordedAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} da {audio.operatorName || "Centrale"}
                                  </p>
                                </div>
                              </div>

                              <a
                                href={audio.audioBase64}
                                download={`Vocale_${activeCall.protocolCode || activeCall.id}_${idx + 1}.ogg`}
                                className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg"
                              >
                                <Download className="h-3 w-3" /> Scarica File
                              </a>
                            </div>

                            {/* Trascrizione del Testo (Fondamentale per la stampa A4 e atti legali) */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[10.5px] flex-wrap gap-1">
                                <span className="font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1">
                                  <Sparkles className="h-3 w-3 text-cyan-400" />
                                  Trascrizione Fonica per Stampa A4 / Polizia Giudiziaria
                                </span>
                                <div className="flex items-center gap-2">
                                  {audio.transcribedBy && (
                                    <span className="text-[9.5px] text-slate-500">
                                      Trascritto da: {audio.transcribedBy}
                                    </span>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={transcribingAudioId === audio.id}
                                    onClick={() => handleTranscribeExistingAudio(audio)}
                                    className="h-6 px-2 text-[10px] bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-800/80 text-cyan-300 font-bold rounded-md flex items-center gap-1 cursor-pointer"
                                  >
                                    {transcribingAudioId === audio.id ? (
                                      <>
                                        <Loader2 className="h-2.5 w-2.5 animate-spin text-cyan-400" />
                                        <span>Trascrizione IA in corso...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                                        <span>{audio.transcription ? "Rianalizza con IA" : "Trascrivi con IA"}</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs italic text-slate-200 leading-relaxed font-sans bg-slate-950/50 p-2 rounded border border-slate-800/80">
                                {audio.transcription ? `"${audio.transcription}"` : "Nessuna trascrizione testuale salvata. Clicca su 'Trascrivi con IA' per trascrivere automaticamente questo vocale."}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Storico Integrazioni & Registro Aggiornamenti nel Tempo */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-400" />
                      5. Registro Cronologico delle Integrazioni & Note Successive ({(activeCall.dossierEvents || []).length})
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setEventTitle("");
                        setEventContent("");
                        setIsAddEventOpen(true);
                      }}
                      className="bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-bold h-7 px-2.5 rounded-lg flex items-center gap-1"
                    >
                      <PlusCircle className="h-3 w-3" /> Nuova Integrazione
                    </Button>
                  </div>

                  {(activeCall.dossierEvents || []).length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      Nessuna integrazione registrata nel tempo.
                      <p className="text-[11px] text-slate-600 mt-1">Puoi aggiungere sviluppi successivi, riscontri della Polizia o contatti con altri operatori.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(activeCall.dossierEvents || []).map((ev, idx) => (
                        <div
                          key={ev.id || idx}
                          className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                            <strong className="text-white font-bold">{ev.title}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(ev.timestamp).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {ev.content}
                          </p>
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                            <span>Operatore: {ev.operatorName} (Matr. {ev.operatorMatricola})</span>
                            <span className="uppercase text-indigo-400 font-mono">{ev.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Phone className="h-12 w-12 text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-400">Seleziona una richiesta dall'elenco a sinistra</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Potrai consultare gli atti, ascoltare i vocali WhatsApp registrati, aggiungere integrazioni e stampare il dossier ufficiale in A4.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG AGGIUNGI VOCALE WHATSAPP & TRASCRIZIONE IA DIRETTA */}
      <Dialog open={isUploadAudioOpen} onOpenChange={(open) => {
        setIsUploadAudioOpen(open);
        if (!open) {
          if (modalAudioRef.current) modalAudioRef.current.pause();
          setIsPlayingModalPreview(false);
          setTranscriptionError(null);
          setTranscriptionSuccess(null);
        }
      }}>
        <DialogContent className="max-w-lg w-[95vw] bg-slate-950 border border-slate-800 text-white rounded-3xl p-5 md:p-6 shadow-2xl">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-black uppercase text-white flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Volume2 className="h-4 w-4" />
              </div>
              <span>Carica Vocale WhatsApp & Trascrizione IA</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 leading-relaxed">
              Carica la nota vocale WhatsApp (.opus, .ogg, .mp3, .m4a): il sistema avvia la <strong>trascrizione automatica immediata con IA</strong> per consentire la stampa A4 e gli atti legali.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Titolo del Vocale */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
                Titolo / Oggetto del Vocale
              </label>
              <Input
                value={audioSourceTitle}
                onChange={(e) => setAudioSourceTitle(e.target.value)}
                placeholder="Es. Vocale segnalante ore 16:30"
                className="bg-slate-900 border-slate-800 text-xs rounded-xl"
              />
            </div>

            {/* 2. Selezione File Audio */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
                File Audio da WhatsApp o Telefono
              </label>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.opus,.ogg,.mp3,.m4a,.wav"
                onChange={handleAudioFileSelect}
                className="hidden"
              />

              {!audioBase64 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full bg-slate-900/90 border-dashed border-2 border-slate-700 text-slate-200 text-xs h-16 rounded-2xl hover:bg-slate-800/80 hover:border-emerald-500/80 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold">Seleziona Vocale WhatsApp (.opus, .ogg, .mp3, .m4a)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Alla selezione, la trascrizione vocale partirà in automatico!
                  </span>
                </Button>
              ) : (
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleToggleModalPreview}
                      className={`h-9 w-9 rounded-full p-0 flex items-center justify-center cursor-pointer ${
                        isPlayingModalPreview 
                          ? "bg-red-600 text-white animate-pulse" 
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                      title={isPlayingModalPreview ? "Pausa Ascolto" : "Ascolta Vocale"}
                    >
                      {isPlayingModalPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[200px]">
                        {audioFileName || "File Audio Pronto"}
                      </p>
                      <p className="text-[10.5px] text-slate-400 font-mono">
                        Durata: ~{audioDuration} sec • Tipo: {audioMimeType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => audioInputRef.current?.click()}
                      className="text-[11px] text-slate-300 hover:text-white h-7 px-2"
                    >
                      Cambia
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (modalAudioRef.current) modalAudioRef.current.pause();
                        setIsPlayingModalPreview(false);
                        setAudioBase64(null);
                        setAudioDuration(0);
                        setAudioFileName("");
                        setAudioTranscription("");
                        setTranscriptionError(null);
                        setTranscriptionSuccess(null);
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 h-7 px-2"
                    >
                      Rimuovi
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Banner Stato Trascrizione IA */}
            {isTranscribing && (
              <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-3 flex items-center gap-3 text-cyan-200 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-400 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Trascrizione automatica con Intelligenza Artificiale in corso...</p>
                  <p className="text-[11px] text-cyan-300/80 mt-0.5">
                    Ascolto fonico del messaggio in atto, non è richiesta alcuna trascrizione manuale.
                  </p>
                </div>
              </div>
            )}

            {transcriptionSuccess && !isTranscribing && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 flex items-center gap-2.5 text-emerald-200 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <p className="font-medium leading-tight">{transcriptionSuccess}</p>
              </div>
            )}

            {transcriptionError && !isTranscribing && (
              <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-3 flex items-center justify-between gap-2 text-red-200 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="leading-tight">{transcriptionError}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleTranscribeAudio()}
                  className="h-7 px-2.5 bg-red-900/50 border-red-700 text-white text-[11px] flex-shrink-0"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Riprova
                </Button>
              </div>
            )}

            {/* 3. Area Trascrizione con pulsante IA dedicato */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  Testo Trascritto (Ufficiale per Stampata A4 / PG)
                </label>
                {audioBase64 && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isTranscribing}
                    onClick={() => handleTranscribeAudio()}
                    className="h-6 px-2 text-[10.5px] bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{isTranscribing ? "Trascrivendo..." : "Trascrivi con IA"}</span>
                  </Button>
                )}
              </div>
              <Textarea
                rows={4}
                value={audioTranscription}
                onChange={(e) => setAudioTranscription(e.target.value)}
                placeholder="Il testo apparirà automaticamente qui tramite IA. Puoi comunque modificarlo o integrarlo se necessario..."
                className="bg-slate-900 border-slate-800 text-xs rounded-xl placeholder:text-slate-600 resize-none leading-relaxed"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Il testo viene salvato nel fascicolo ed inserito automaticamente nella sezione <strong>"3. Registrazioni Foniche & Trascrizioni WhatsApp"</strong> della stampa A4.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (modalAudioRef.current) modalAudioRef.current.pause();
                setIsPlayingModalPreview(false);
                setIsUploadAudioOpen(false);
              }}
              className="border-slate-800 text-slate-300 text-xs rounded-xl"
            >
              Annulla
            </Button>
            <Button
              type="button"
              disabled={!audioBase64 || isSavingAudio || isTranscribing}
              onClick={handleSaveAudioToDossier}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              {isSavingAudio ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvataggio nel Dossier...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Salva Vocale nel Fascicolo</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG AGGIUNGI INTEGRAZIONE CRONOLOGICA */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-md w-[95vw] bg-slate-950 border border-slate-800 text-white rounded-3xl p-5 shadow-2xl">
          <DialogHeader className="border-b border-slate-800 pb-2.5">
            <DialogTitle className="text-base font-black uppercase text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-400" />
              Nuova Integrazione nel Fascicolo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Registra un aggiornamento, contatto successivo o riscontro di Polizia Giudiziaria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Tipologia di Integrazione</label>
              <select
                value={eventType}
                onChange={(e: any) => setEventType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2 text-xs"
              >
                <option value="nota">Nota Operativa di Centrale</option>
                <option value="vocale_whatsapp">Telefonata di Aggiornamento</option>
                <option value="riscontro_pg">Riscontro con Forze di Polizia / PG</option>
                <option value="variazione_stato">Aggiornamento Stato Intervento</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Oggetto dell'Integrazione</label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Es. Richiamato richiedente per conferma indirizzo"
                className="bg-slate-900 border-slate-800 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Dettaglio / Testo</label>
              <Textarea
                rows={4}
                value={eventContent}
                onChange={(e) => setEventContent(e.target.value)}
                placeholder="Descrivi dettagliatamente l'accaduto..."
                className="bg-slate-900 border-slate-800 text-xs rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEventOpen(false)}
              className="border-slate-800 text-slate-300 text-xs rounded-xl"
            >
              Annulla
            </Button>
            <Button
              type="button"
              disabled={!eventTitle.trim() || isSavingEvent}
              onClick={handleSaveIntegrationEvent}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
            >
              {isSavingEvent ? "Salvataggio..." : "Salva Integrazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG CONFERMA ELIMINAZIONE INLINE (NO WINDOW.CONFIRM PER COMPATIBILITÀ IFRAME) */}
      <Dialog open={Boolean(callToDelete)} onOpenChange={(open) => !open && setCallToDelete(null)}>
        <DialogContent className="max-w-md w-[95vw] bg-slate-950 border border-red-900/80 text-white rounded-3xl p-5 shadow-2xl">
          <DialogHeader className="border-b border-slate-800 pb-2.5">
            <DialogTitle className="text-base font-black uppercase text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Conferma Eliminazione Definitiva
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 pt-1">
              Sei certo di voler eliminare DEFINITIVAMENTE questa chiamata/simulazione dal database?
            </DialogDescription>
          </DialogHeader>

          {callToDelete && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3 my-2 text-xs space-y-1">
              <p><strong className="text-white">Richiedente:</strong> {callToDelete.callerName || "Anonimo"} ({callToDelete.callerPhone || "N.D."})</p>
              <p><strong className="text-white">Località:</strong> {callToDelete.comune} - {callToDelete.localita}</p>
              <p className="text-slate-400 text-[11px] truncate"><strong className="text-white">Descrizione:</strong> {callToDelete.description}</p>
              <p className="text-[10px] text-amber-300 pt-1 font-bold">⚠️ Il bersaglio verrà rimosso per sempre dalla mappa radar e dall'archivio.</p>
            </div>
          )}

          <DialogFooter className="border-t border-slate-800 pt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCallToDelete(null)}
              className="border-slate-800 text-slate-300 text-xs rounded-xl"
            >
              Annulla
            </Button>
            <Button
              type="button"
              disabled={isDeletingCall}
              onClick={handleExecuteDelete}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl"
            >
              {isDeletingCall ? "Eliminazione..." : "Elimina Definitivamente 🗑️"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, User, FileText, Phone, AlertCircle, Shield, Printer, Check, X, Clock, Maximize2, Minimize2, Radio 
} from "lucide-react";
import { db, sanitizeFirestorePayload } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Guard } from "../types";
import { cn } from "@/lib/utils";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";
import { AudioCallRecorder, AudioRecordData } from "./AudioCallRecorder";

interface RichiestaInterventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: string;
  lat?: number;
  lng?: number;
  guards: Guard[];
  shifts: any[];
  currentGuard: Guard | null;
  emergencyCalls?: any[];
  onSuccess?: () => void;
}

export const RichiestaInterventoDialog: React.FC<RichiestaInterventoDialogProps> = ({
  open,
  onOpenChange,
  address = "",
  lat,
  lng,
  guards,
  shifts,
  currentGuard,
  emergencyCalls = [],
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdCall, setCreatedCall] = useState<any | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Form Fields State
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [comune, setComune] = useState("Massa");
  const [localita, setLocalita] = useState("");
  const [sector, setSector] = useState<"zoofila" | "ittica" | "venatoria" | "ambientale" | "altro">("zoofila");
  const [priority, setPriority] = useState<"bassa" | "media" | "alta" | "emergenza">("media");
  const [description, setDescription] = useState("");
  const [assignedGuardId, setAssignedGuardId] = useState("");
  const [notes, setNotes] = useState("");
  const [customDateTime, setCustomDateTime] = useState("");
  const [audioRecordings, setAudioRecordings] = useState<AudioRecordData[]>([]);

  const comuniMassaCarrara = [
    "Aulla", "Bagnone", "Carrara", "Casola in Lunigiana", "Comano", "Filattiera", 
    "Fivizzano", "Fosdinovo", "Licciana Nardi", "Massa", "Montignoso", "Mulazzo", 
    "Podenzana", "Pontremoli", "Tresana", "Villafranca in Lunigiana", "Zeri"
  ];

  // Set default current date/time on open
  useEffect(() => {
    if (open) {
      const now = new Date();
      // Format to local ISO-like string for datetime-local inputs: YYYY-MM-DDTHH:MM
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
      setCustomDateTime(localISOTime);
      
      // Form starts completely clean as requested (no automatic data entry)
      setLocalita("");
      setComune("Massa");

      setCallerName("");
      setCallerPhone("");
      setDescription("");
      setAssignedGuardId("");
      setNotes("");
      setAudioRecordings([]);
      setSuccess(false);
      setCreatedCall(null);
    }
  }, [open, address]);

  // Helper to format Guard name as COGNOME Nome - Matr. [Number]
  const formatGuardOptionName = (g: Guard) => {
    let cognome = (g.surname || g.privateInfo?.surname || "").trim();
    let nome = (g.name || g.privateInfo?.name || "").trim();

    // If surname is missing or empty, attempt to parse from full name string
    if (!cognome && nome) {
      const parts = nome.split(/\s+/);
      if (parts.length > 1) {
        // Last part is likely surname, or first part if capitalized
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

  // Generate unique progressive protocol code
  const generateProtocolNumber = () => {
    const year = new Date().getFullYear();
    const countThisYear = (emergencyCalls || []).length;
    const progressive = String(countThisYear + 1).padStart(4, "0");
    return `RI-${year}-${progressive}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerName || !localita) {
      alert("⚠️ Errore: Inserire nome del richiedente e località d'intervento!");
      return;
    }

    setIsSubmitting(true);
    const protNum = generateProtocolNumber();
    const operatorName = currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}`.trim() : "Centrale Operativa";
    const operatorMatricola = currentGuard?.matricola || "HQ-CO";

    const selectedGuardObj = guards.find(g => g.id === assignedGuardId);
    const guardName = selectedGuardObj ? `${selectedGuardObj.surname || ""} ${selectedGuardObj.name || ""}`.trim() : "";
    const guardPhone = selectedGuardObj?.privateInfo?.cellulare || selectedGuardObj?.phone || "N.D.";

    const payload: any = {
      protocolCode: protNum,
      callerName,
      callerPhone,
      comune,
      localita,
      lat: lat || 44.035,
      lng: lng || 10.14,
      sector,
      description,
      priority,
      status: assignedGuardId ? "pattuglia" : "in_attesa",
      assignedGuardId,
      assignedGuardName: guardName,
      assignedGuardPhone: guardPhone,
      createdAt: customDateTime ? new Date(customDateTime).toISOString() : new Date().toISOString(),
      notes,
      audioRecordings: (audioRecordings || []).map(a => ({
        id: a.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        audioBase64: a.audioBase64,
        durationSeconds: a.durationSeconds || 0,
        recordedAt: a.recordedAt || new Date().toISOString(),
        operatorName: a.operatorName || operatorName,
        source: a.source || "mic_call",
        title: a.title || "Registrazione Audio"
      })),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          operatorMatricola,
          operatorName,
          action: `Apertura richiesta d'intervento registrata a protocollo N° ${protNum}`
        }
      ]
    };

    if (assignedGuardId) {
      payload.auditTrail.push({
        timestamp: new Date().toISOString(),
        operatorMatricola,
        operatorName,
        action: `Pattuglia sul campo ${guardName} (${selectedGuardObj?.matricola || "N.D."}) assegnata all'evento.`
      });
    }

    try {
      const cleanPayload = sanitizeFirestorePayload(payload);
      const docRef = await addDoc(collection(db, "emergency_calls"), cleanPayload);
      const savedCall = { id: docRef.id, ...cleanPayload };
      setCreatedCall(savedCall);
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error creating emergency call:", err);
      alert("❌ Errore durante il salvataggio in Firestore.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Printing engine for the single A4 Intervention Request
  const handlePrintRequest = (callData: any) => {
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const originalTitle = document.title;
    const protocolCode = callData.protocolCode || `RI-${new Date(callData.createdAt).getFullYear()}-${callData.id?.slice(0, 4).toUpperCase()}`;
    document.title = `Richiesta_Intervento_${protocolCode}`;

    const isAssigned = !!callData.assignedGuardId || (callData.status && callData.status.toLowerCase().trim() === "pattuglia");

    const htmlContent = `
      <html>
        <head>
          <title>Richiesta d'Intervento N. ${protocolCode}</title>
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
                line-height: 1.25;
              }
              .no-print { display: none !important; }
              .page-container { width: 100%; }
              .meta-table { page-break-inside: avoid; }
              .handover-box { page-break-inside: avoid; }
            }
            body { 
              font-family: Arial, sans-serif; 
              color: #111; 
              margin: 6mm 10mm;
              line-height: 1.3;
              font-size: 9pt;
            }
            .protocol-badge {
              border: 1.5px solid #222;
              display: inline-block;
              padding: 4px 12px;
              font-weight: 900;
              font-size: 10pt;
              margin: 4px 0 8px 0;
              text-align: center;
              background-color: #f3f4f6;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            h2 { 
              font-size: 9pt; 
              border-bottom: 1.2px solid #333; 
              padding-bottom: 2px; 
              margin-top: 8px; 
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000;
              font-weight: bold;
            }
            .meta-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 4px 0 6px 0; 
            }
            .meta-table th, .meta-table td { 
              border: 1px solid #999; 
              padding: 3px 6px; 
              text-align: left; 
              font-size: 8pt;
            }
            .meta-table th { 
              background-color: #f3f4f6; 
              width: 28%; 
              font-weight: bold;
            }
            .text-block { 
              background: #fafafa; 
              border: 1px solid #999; 
              padding: 6px 8px; 
              font-style: italic; 
              font-size: 8pt;
              margin: 4px 0 6px 0;
              white-space: pre-wrap;
              min-height: 40px;
            }
            .handover-box {
              margin-top: 8px;
              border: 1.5px dashed #333;
              padding: 6px 8px;
              background-color: #fafafa;
              border-radius: 4px;
            }
            .footer-sig { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 15px; 
              font-size: 8pt;
              font-weight: bold;
            }
            .sig-box { 
              border-top: 1px dashed #333; 
              width: 5.5cm; 
              text-align: center; 
              padding-top: 3px; 
            }
          </style>
        </head>
        <body>
          ${getOfficialPrintHeaderHtml("REGISTRO CENTRALE OPERATIVA • MASSA-CARRARA", "SCHEDA RICHIESTA D'INTERVENTO PROTOCOLLARE")}

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
              <th>Ambito / Settore</th>
              <td>VIGILANZA ${(callData.sector || "zoofila").toUpperCase()}</td>
            </tr>
            <tr>
              <th>Richiedente</th>
              <td><strong>${(callData.callerName || "N.D.").toUpperCase()}</strong></td>
              <th>Grado Priorità</th>
              <td><strong style="color: ${callData.priority === 'emergenza' || callData.priority === 'alta' ? '#b91c1c' : '#000'};">${(callData.priority || "media").toUpperCase()}</strong></td>
            </tr>
            <tr>
              <th>Recapito Telefonico</th>
              <td colspan="3">${callData.callerPhone || "N.D."}</td>
            </tr>
          </table>

          <h2>2. Localizzazione dell'Intervento</h2>
          <table class="meta-table">
            <tr>
              <th>Comune</th>
              <td>${(callData.comune || "Massa").toUpperCase()}</td>
              <th>Coordinate GPS</th>
              <td>LAT: ${Number(callData.lat || 44.035).toFixed(5)} / LNG: ${Number(callData.lng || 10.14).toFixed(5)}</td>
            </tr>
            <tr>
              <th>Località / Indirizzo</th>
              <td colspan="3"><strong>${(callData.localita || "").toUpperCase()}</strong></td>
            </tr>
          </table>

          <h2>3. Descrizione del Fatto e Motivazione Segnalazione</h2>
          <div class="text-block">${callData.description || "Nessun dettaglio aggiuntivo fornito."}</div>

          <h2>4. Assegnazione Operativa e Disposizioni</h2>
          <table class="meta-table">
            <tr>
              <th>Stato Richiesta</th>
              <td><strong>${isAssigned ? "PATTUGLIA SUL POSTO ASSEGNATA" : "IN ATTESA DI ASSEGNAZIONE (DA ASSEGNARE A SQUADRA IN TURNO)"}</strong></td>
            </tr>
            <tr>
              <th>Pattuglia Incaricata</th>
              <td><strong>${isAssigned ? (callData.assignedGuardName?.toUpperCase() || "PATTUGLIA ASSEGNATA") : "DA ASSEGNARE ALLA PRIMA SQUADRA DISPONIBILE"}</strong></td>
            </tr>
            <tr>
              <th>Disposizioni Operative / Note HQ</th>
              <td>${callData.notes || "Disposizione di sopralluogo ispettivo e verifica sul posto."}</td>
            </tr>
          </table>

          <!-- 5. Modulo Presa in Carico e Passaggio Consegne Manuale -->
          <div class="handover-box">
            <div style="font-weight: bold; font-size: 8pt; text-transform: uppercase; margin-bottom: 4px; color: #111; border-bottom: 1px dotted #999; padding-bottom: 2px;">
              Presa in Carico ed Esecuzione Pattuglia sul Campo (Compilazione a cura della squadra montante):
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-top: 3px;">
              <tr>
                <td style="padding: 2px 0; width: 55%;"><strong>Pattuglia / Operatori Assegnati:</strong> ___________________________</td>
                <td style="padding: 2px 0; width: 45%;"><strong>Data/Ora Presa in Carico:</strong> _____/_____/_________ Ore: _______</td>
              </tr>
              <tr>
                <td style="padding: 2px 0;" colspan="2"><strong>Esito Intervento:</strong> [ ] Regolare &nbsp;&nbsp;&nbsp; [ ] Redatto Verbale Sopralluogo N° ________ &nbsp;&nbsp;&nbsp; [ ] Sanzione N° ________ &nbsp;&nbsp;&nbsp; [ ] Negativo / Rientro</td>
              </tr>
            </table>
            <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 7.5pt; font-weight: bold;">
              <div style="width: 45%; border-top: 1px solid #444; text-align: center; padding-top: 2px;">Firma Capopattuglia</div>
              <div style="width: 45%; border-top: 1px solid #444; text-align: center; padding-top: 2px;">Firma 2° Operatore</div>
            </div>
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
              Stampa Modulo Richiesta d'Intervento (A4)
            </span>
          </div>
          <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.4;">
            Rassegna la Richiesta d'Intervento istituzionale. Clicca sul pulsante giallo per avviare la stampa A4 o salvare come PDF.
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <button 
            id="start-print-btn"
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

    // Listeners for CSP compliance
    const startBtn = portal.querySelector("#start-print-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
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

  // Focus advancement on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      // Allow default behavior for textarea, buttons, and submit
      if (
        target.tagName.toLowerCase() === "textarea" || 
        target.tagName.toLowerCase() === "button" || 
        target.getAttribute("type") === "submit"
      ) {
        return;
      }
      
      e.preventDefault();
      
      // Query all focusable form fields in visual order
      const form = e.currentTarget;
      const elements = Array.from(
        form.querySelectorAll<HTMLElement>(
          "input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), button[type='submit']:not([disabled])"
        )
      );
      
      const currentIndex = elements.indexOf(target);
      if (currentIndex > -1 && currentIndex < elements.length - 1) {
        const nextElement = elements[currentIndex + 1];
        nextElement.focus();
        if (nextElement instanceof HTMLInputElement) {
          nextElement.select();
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "!p-0 !gap-0 !bg-slate-950 !text-white flex flex-col border-slate-800 shadow-2xl transition-all duration-200 overflow-hidden",
          isFullscreen
            ? "!fixed !inset-0 !top-0 !left-0 !right-0 !bottom-0 !w-screen !h-[100dvh] !max-w-none !max-h-none !translate-x-0 !translate-y-0 !rounded-none !border-none !z-[9999]"
            : "!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-[96vw] !max-w-7xl !h-[90vh] !max-h-[920px] !rounded-3xl !border !border-slate-800 !z-[9999]"
        )}
      >
        <div className="p-4 md:p-6 flex flex-col h-full w-full overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-slate-900 pb-3 mb-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                  Richiesta d'Intervento Ufficiale
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                    <Radio className="h-3 w-3 animate-pulse" /> CENTRALE OPERATIVA HQ
                  </span>
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest mt-0.5">
                  Modulistica centrale operativa • Presa in carico, assegnazione pattuglia e protocollazione
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 pr-8">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                title={isFullscreen ? "Riduci a Finestra" : "Ingrandisci a Tutto Schermo"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Riduci Finestra</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Tutto Schermo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogHeader>

        {success && createdCall ? (
          <div className="flex-1 overflow-y-auto space-y-6 py-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-emerald-400">✓ Richiesta Registrata Con Successo!</h3>
              <p className="text-xs text-slate-400 uppercase tracking-wider max-w-md mx-auto">
                La segnalazione è stata inserita a protocollo con codice <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded font-black">{createdCall.protocolCode}</span> ed è ora consultabile sul radar operativo.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-2 max-w-md mx-auto text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5 font-mono">
                <span className="text-slate-400">DATA/ORA:</span>
                <span className="font-bold text-white">{new Date(createdCall.createdAt).toLocaleString("it-IT")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">RICHIEDENTE:</span>
                <span className="font-bold text-white uppercase">{createdCall.callerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">INDIRIZZO:</span>
                <span className="font-bold text-white uppercase truncate max-w-[250px]">{createdCall.localita}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center pt-2">
              <Button
                type="button"
                onClick={() => handlePrintRequest(createdCall)}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase tracking-wider text-xs px-6 py-5 rounded-2xl flex items-center gap-2 shadow-lg border-0 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Stampa Modulo A4 🖨
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white px-6 py-5 rounded-2xl text-xs uppercase font-extrabold cursor-pointer"
              >
                Chiudi
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} onKeyDown={handleKeyDown} className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden gap-3">
            {/* Scrollable / Flexible form body filling entire screen */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 flex flex-col">
              {/* Quick Tips Banner */}
              <div className="shrink-0 bg-blue-950/30 border border-blue-800/40 rounded-2xl px-4 py-2.5 flex justify-between items-center text-xs uppercase tracking-wider text-blue-300 shadow-sm">
                <span className="flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4 animate-pulse text-blue-400" />
                  💡 Compilazione rapida: Premi il tasto INVIO per passare velocemente al campo successivo
                </span>
                <span className="font-mono font-black text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-900">
                  POSTAZIONE CENTRALE A TUTTO SCHERMO
                </span>
              </div>

              {/* Top Row: 3 Grandi Colonne Operative (Richiedente, Luogo, Classificazione) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shrink-0">
                
                {/* Blocco 1: Anagrafica & Richiedente */}
                <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="text-slate-300 uppercase tracking-wider font-black text-xs flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-400" /> 1. Richiedente & Chiamata
                    </span>
                    <span className="font-mono text-blue-300 font-black bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 rounded-lg text-xs tracking-wider">
                      RI: {generateProtocolNumber()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider">
                      Nome e Cognome Segnalante / Cittadino *
                    </Label>
                    <Input
                      required
                      placeholder="Es. Mario Rossi"
                      value={callerName}
                      onChange={(e) => setCallerName(e.target.value)}
                      className="bg-slate-900 border-slate-700/80 rounded-xl focus:border-blue-500 text-white text-sm h-11 font-semibold px-3.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-blue-400" /> Recapito Telefonico *
                    </Label>
                    <Input
                      required
                      type="tel"
                      placeholder="Es. 333 1234567 / 0585 123456"
                      value={callerPhone}
                      onChange={(e) => setCallerPhone(e.target.value)}
                      className="bg-slate-900 border-slate-700/80 rounded-xl focus:border-blue-500 text-white text-sm h-11 font-mono font-bold px-3.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400" /> Data e Ora Ricezione Chiamata
                    </Label>
                    <Input
                      type="datetime-local"
                      required
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="bg-slate-900 border-slate-700/80 rounded-xl focus:border-blue-500 text-white text-sm h-11 font-mono px-3.5"
                    />
                  </div>
                </div>

                {/* Blocco 2: Luogo Intervento & Territorio */}
                <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg">
                  <div className="border-b border-slate-800/80 pb-2.5">
                    <span className="text-slate-300 uppercase tracking-wider font-black text-xs flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-400" /> 2. Luogo & Territorio
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider">
                      Comune di Competenza Territoriale
                    </Label>
                    <select
                      value={comune}
                      onChange={(e) => setComune(e.target.value)}
                      className="w-full h-11 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                    >
                      {comuniMassaCarrara.map((com) => (
                        <option key={com} value={com}>
                          {com}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Indirizzo Esatto / Località / Riferimento *
                    </Label>
                    <Input
                      required
                      placeholder="Es. Via Aurelia Nord 45 / Presso Parco della Rinchiostra"
                      value={localita}
                      onChange={(e) => setLocalita(e.target.value)}
                      className="bg-slate-900 border-slate-700/80 rounded-xl focus:border-blue-500 text-white text-sm h-11 font-semibold px-3.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider">
                      Note Operative Riservate (HQ / Ente Richiedente)
                    </Label>
                    <Input
                      placeholder="Es. Richiesta pervenuta da Polizia Municipale / ASL / Ente Parco"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-slate-900 border-slate-700/80 rounded-xl focus:border-blue-500 text-white text-sm h-11 px-3.5"
                    />
                  </div>
                </div>

                {/* Blocco 3: Settore, Priorità & Assegnazione Pattuglia */}
                <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg">
                  <div className="border-b border-slate-800/80 pb-2.5">
                    <span className="text-slate-300 uppercase tracking-wider font-black text-xs flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-400" /> 3. Classificazione & Assegnazione
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider">
                        Settore Vigilanza
                      </Label>
                      <select
                        value={sector}
                        onChange={(e) => setSector(e.target.value as any)}
                        className="w-full h-11 bg-slate-900 border border-slate-700/80 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                      >
                        <option value="zoofila">🐕 Zoofila</option>
                        <option value="ambientale">🍃 Ambientale</option>
                        <option value="ittica">🐟 Ittica</option>
                        <option value="venatoria">🦌 Venatoria</option>
                        <option value="altro">❓ Altro</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider">
                        Grado Priorità
                      </Label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className={cn(
                          "w-full h-11 bg-slate-900 border rounded-xl px-3 text-sm font-black focus:outline-none focus:border-blue-500 cursor-pointer",
                          priority === "emergenza" && "border-red-500 text-red-400 bg-red-950/40",
                          priority === "alta" && "border-amber-500 text-amber-300 bg-amber-950/30",
                          priority === "media" && "border-blue-700 text-blue-300 bg-blue-950/30",
                          priority === "bassa" && "border-slate-700 text-slate-300"
                        )}
                      >
                        <option value="bassa">🟢 Bassa (Ordinaria)</option>
                        <option value="media">🔵 Media (Standard)</option>
                        <option value="alta">🟡 Alta (Prioritaria)</option>
                        <option value="emergenza">🔴 Emergenza 🚨 (Immediata)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-blue-400" /> Pattuglia / Squadra sul Campo
                    </Label>
                    <select
                      value={assignedGuardId}
                      onChange={(e) => setAssignedGuardId(e.target.value)}
                      className="w-full h-11 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    >
                      <option value="">⏳ In Attesa (Salva come "Da Assegnare")</option>
                      {guards
                        .slice()
                        .sort((a, b) => formatGuardOptionName(a).localeCompare(formatGuardOptionName(b)))
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {formatGuardOptionName(g)}
                          </option>
                        ))}
                    </select>
                    
                    {!assignedGuardId && (
                      <p className="text-xs text-amber-300/90 font-medium italic bg-amber-950/30 border border-amber-900/40 p-2 rounded-xl">
                        ℹ️ Richiesta protocollata come <b>"Da Assegnare"</b> per la prima squadra montante.
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Large Section: Descrizione del Fatto e Dettagli Operativi (A Tutto Schermo) */}
              <div className="flex-1 flex flex-col bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg min-h-[180px]">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 shrink-0">
                  <span className="text-slate-300 uppercase tracking-wider font-black text-xs flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-400" /> 4. Descrizione Dettagliata dell'Accaduto e Indicazioni Operative *
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {description.length} caratteri
                  </span>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <Textarea
                    required
                    placeholder="Inserire qui tutti i dettagli descrittivi della segnalazione riferiti dal cittadino: dinamica del fatto, condizioni degli animali o dello stato dei luoghi, presunti responsabili, indicazioni stradali precise e ogni informazione indispensabile per l'intervento delle guardie..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-900 border-slate-700/80 rounded-2xl flex-1 w-full p-4 focus:border-blue-500 text-white text-sm font-normal leading-relaxed resize-none shadow-inner min-h-[120px]"
                  />
                </div>
              </div>

              {/* Sezione 5: Registrazione Chiamata Vocale & Note Audio */}
              <div className="shrink-0">
                <AudioCallRecorder
                  onAudioSaved={(newAud) => setAudioRecordings((prev) => [...prev, newAud])}
                  existingAudios={audioRecordings}
                  onDeleteAudio={(idx) => setAudioRecordings((prev) => prev.filter((_, i) => i !== idx))}
                  operatorName={currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}`.trim() : "Centrale Operativa"}
                />
              </div>

            </div>

            {/* Barra Inferiore Fissa */}
            <DialogFooter className="shrink-0 pt-3.5 border-t border-slate-850 gap-4 bg-slate-950 flex flex-col sm:flex-row items-center justify-between">
              <div className="text-xs text-slate-400 font-mono hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Postazione Operativa C.O.E.T.A. • Premi [Tab] o [Invio] per compilare
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white px-6 py-5 rounded-2xl uppercase font-extrabold text-xs cursor-pointer transition-all"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-sm px-8 py-5 rounded-2xl border-0 shadow-xl shadow-emerald-950/50 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <>Registrazione in corso...</>
                  ) : (
                    <>
                      ✓ Registra e Protocolla Richiesta d'Intervento
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

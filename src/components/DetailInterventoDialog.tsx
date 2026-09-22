import React, { useState } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  MapPin, User, FileText, Phone, AlertCircle, Shield, Printer, Check, X, Clock, MessageSquare, ExternalLink, UserCheck, Video, MessageCircle, Mic, Trash2
} from "lucide-react";
import { db } from "../lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Guard } from "../types";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";
import { AudioCallRecorder, AudioRecordData } from "./AudioCallRecorder";
import { VideoCallDialog } from "./VideoCallDialog";

interface DetailInterventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: any | null;
  guards?: Guard[];
  shifts?: any[];
  currentGuard?: Guard | null;
  onOpenVerbale: () => void;
  onOpenSanzione: () => void;
  onSuccessQuickResolve?: (callId: string) => void;
  onCallUpdated?: (updatedCall: any) => void;
}

export const DetailInterventoDialog: React.FC<DetailInterventoDialogProps> = ({
  open,
  onOpenChange,
  call,
  guards = [],
  shifts = [],
  currentGuard,
  onOpenVerbale,
  onOpenSanzione,
  onSuccessQuickResolve,
  onCallUpdated,
}) => {
  const [selectedNewGuardId, setSelectedNewGuardId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [targetVideoGuard, setTargetVideoGuard] = useState<Guard | null>(null);

  if (!call) return null;

  const protocolCode = call.protocolCode || `RI-${new Date(call.createdAt || Date.now()).getFullYear()}-${call.id?.slice(0, 4).toUpperCase()}`;
  const isAssigned = !!call.assignedGuardId || (call.status && call.status.toLowerCase().trim() === "pattuglia");
  const assignedGuardObj = guards.find((g) => g.id === call.assignedGuardId);

  const handleSaveNewAudio = async (newAudio: AudioRecordData) => {
    const existing: AudioRecordData[] = call.audioRecordings || [];
    const updatedAudios = [...existing, newAudio];
    const operatorName = currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}`.trim() : "Centrale Operativa";
    const operatorMatricola = currentGuard?.matricola || "HQ-CO";

    const updatedAuditTrail = [
      ...(call.auditTrail || []),
      {
        timestamp: new Date().toISOString(),
        operatorMatricola,
        operatorName,
        action: `Nuovo file audio / registrazione chiamata allegato (${newAudio.title || "Audio"}).`
      }
    ];

    try {
      await updateDoc(doc(db, "emergency_calls", call.id), {
        audioRecordings: updatedAudios,
        auditTrail: updatedAuditTrail,
      });

      const updatedObj = { ...call, audioRecordings: updatedAudios, auditTrail: updatedAuditTrail };
      if (onCallUpdated) {
        onCallUpdated(updatedObj);
      }
    } catch (err: any) {
      alert("Errore nel salvataggio dell'audio: " + err.message);
    }
  };

  const handleDeleteAudio = async (indexToDelete: number) => {
    if (!window.confirm("Confermi l'eliminazione di questa traccia audio?")) return;
    const existing: AudioRecordData[] = call.audioRecordings || [];
    const updatedAudios = existing.filter((_, i) => i !== indexToDelete);

    try {
      await updateDoc(doc(db, "emergency_calls", call.id), {
        audioRecordings: updatedAudios,
      });
      const updatedObj = { ...call, audioRecordings: updatedAudios };
      if (onCallUpdated) {
        onCallUpdated(updatedObj);
      }
    } catch (err: any) {
      alert("Errore nell'eliminazione dell'audio: " + err.message);
    }
  };

  const handleStartVideoCall = (guardToCall: Guard) => {
    setTargetVideoGuard(guardToCall);
    setVideoDialogOpen(true);
  };

  const handleAssignGuard = async () => {
    if (!selectedNewGuardId) {
      alert("Seleziona una pattuglia da assegnare all'intervento!");
      return;
    }

    const selectedGuardObj = guards.find((g) => g.id === selectedNewGuardId);
    if (!selectedGuardObj) return;

    const guardName = `${selectedGuardObj.surname || ""} ${selectedGuardObj.name || ""}`.trim();
    const guardPhone = selectedGuardObj.privateInfo?.cellulare || selectedGuardObj.phone || "N.D.";
    const operatorName = currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}`.trim() : "Centrale Operativa";
    const operatorMatricola = currentGuard?.matricola || "HQ-CO";

    setIsAssigning(true);
    try {
      const updatedAuditTrail = [
        ...(call.auditTrail || []),
        {
          timestamp: new Date().toISOString(),
          operatorMatricola,
          operatorName,
          action: `Pattuglia sul campo ${guardName} (Matr. ${selectedGuardObj.matricola || "N.D."}) assegnata all'intervento.`
        }
      ];

      const payloadUpdate = {
        status: "pattuglia",
        assignedGuardId: selectedGuardObj.id,
        assignedGuardName: guardName,
        assignedGuardPhone: guardPhone,
        assignedGuardMatricola: selectedGuardObj.matricola || "",
        auditTrail: updatedAuditTrail,
      };

      await updateDoc(doc(db, "emergency_calls", call.id), payloadUpdate);

      const updatedObj = { ...call, ...payloadUpdate };
      if (onCallUpdated) {
        onCallUpdated(updatedObj);
      }
      setSelectedNewGuardId("");
      alert(`✓ Intervento ${protocolCode} assegnato con successo a ${guardName}!`);
    } catch (err: any) {
      alert("Errore durante l'assegnazione: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleQuickResolve = async () => {
    let isConfirmed = false;
    try {
      isConfirmed = window.confirm(`Confermi la risoluzione e archiviazione rapida dell'intervento ${protocolCode}?\n(Il segnale verrà rimosso dal monitor delle richieste attive)`);
    } catch (e) {
      isConfirmed = true;
    }

    if (isConfirmed) {
      try {
        await updateDoc(doc(db, "emergency_calls", call.id), { status: "risolto" });
        if (onSuccessQuickResolve) {
          onSuccessQuickResolve(call.id);
        }
        onOpenChange(false);
      } catch (err: any) {
        alert("Errore durante l'archiviazione: " + err.message);
      }
    }
  };

  // Single A4 Intervention Request printing engine
  const handlePrintRequest = () => {
    let portal = document.getElementById("global-print-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "global-print-portal";
      document.body.appendChild(portal);
    }

    const originalTitle = document.title;
    document.title = `Richiesta_Intervento_${protocolCode}`;

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
              <td>${new Date(call.createdAt || Date.now()).toLocaleString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <th>Ambito / Settore</th>
              <td>VIGILANZA ${(call.sector || "zoofila").toUpperCase()}</td>
            </tr>
            <tr>
              <th>Richiedente</th>
              <td><strong>${(call.callerName || "N.D.").toUpperCase()}</strong></td>
              <th>Grado Priorità</th>
              <td><strong style="color: ${call.priority === 'emergenza' || call.priority === 'alta' ? '#b91c1c' : '#000'};">${(call.priority || "media").toUpperCase()}</strong></td>
            </tr>
            <tr>
              <th>Recapito Telefonico</th>
              <td colspan="3">${call.callerPhone || "N.D."}</td>
            </tr>
          </table>

          <h2>2. Localizzazione dell'Intervento</h2>
          <table class="meta-table">
            <tr>
              <th>Comune</th>
              <td>${(call.comune || "Massa").toUpperCase()}</td>
              <th>Coordinate GPS</th>
              <td>LAT: ${Number(call.lat || 44.035).toFixed(5)} / LNG: ${Number(call.lng || 10.14).toFixed(5)}</td>
            </tr>
            <tr>
              <th>Località / Indirizzo</th>
              <td colspan="3"><strong>${(call.localita || "").toUpperCase()}</strong></td>
            </tr>
          </table>

          <h2>3. Descrizione del Fatto e Motivazione Segnalazione</h2>
          <div class="text-block">${call.description || "Nessun dettaglio aggiuntivo fornito."}</div>

          <h2>4. Assegnazione Operativa e Disposizioni</h2>
          <table class="meta-table">
            <tr>
              <th>Stato Richiesta</th>
              <td><strong>${isAssigned ? "PATTUGLIA SUL POSTO ASSEGNATA" : "IN ATTESA DI ASSEGNAZIONE (DA ASSEGNARE A SQUADRA IN TURNO)"}</strong></td>
            </tr>
            <tr>
              <th>Pattuglia Incaricata</th>
              <td><strong>${isAssigned ? (call.assignedGuardName?.toUpperCase() || "PATTUGLIA ASSEGNATA") : "DA ASSEGNARE ALLA PRIMA SQUADRA DISPONIBILE"}</strong></td>
            </tr>
            <tr>
              <th>Disposizioni Operative / Note HQ</th>
              <td>${call.notes || "Disposizione di sopralluogo ispettivo e verifica sul posto."}</td>
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
            <span style="width: 10px; height: 10px; background-color: #eab308; border-radius: 50%; display: inline-block;"></span>
            <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #eab308; letter-spacing: 0.5px;">
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

  const handleDeleteCall = async () => {
    if (!window.confirm(`Vuoi eliminare DEFINITIVAMENTE questa chiamata/intervento (Protocollo: ${protocolCode}) dal database?\nL'operazione è irreversibile e rimuoverà anche il bersaglio dalla mappa.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "emergency_calls", call.id));
      onOpenChange(false);
      alert("✓ Intervento eliminato con successo dal database.");
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        <DialogHeader className="border-b border-slate-900 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${isAssigned ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                <Shield className="h-6 w-6" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-md font-bold tracking-wider uppercase text-white">
                  Dettagli Richiesta d'Intervento
                </DialogTitle>
                <DialogDescription className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                  Centrale Operativa • Protocollazione {protocolCode}
                </DialogDescription>
              </div>
            </div>
            <span className={`font-mono text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider ${
              isAssigned ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isAssigned ? "🚨 Pattuglia Attiva" : "⏳ Da Assegnare / In Attesa"}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-left">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-3.5 border border-slate-900 rounded-2xl text-xs">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black">Data/Ora Ricezione</p>
              <p className="font-bold text-white mt-1">
                {call.createdAt ? new Date(call.createdAt).toLocaleString("it-IT") : "N.D."}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black">Settore & Priorità</p>
              <p className="font-bold text-white mt-1 flex items-center gap-2">
                <span className="uppercase text-blue-400 font-extrabold">{call.sector || "Zoofila"}</span>
                <span>•</span>
                <span className="uppercase text-red-400 font-extrabold">{call.priority || "Media"}</span>
              </p>
            </div>
            <div className="col-span-2 border-t border-slate-800/60 pt-2">
              <p className="text-[9px] text-slate-400 uppercase font-black flex items-center gap-1">
                <MapPin className="h-3 w-3 text-red-400" /> Località & Comune
              </p>
              <p className="font-bold text-white uppercase mt-1">
                {call.localita}, {call.comune || "Massa"}
              </p>
            </div>
          </div>

          {/* Segnalatore (Richiedente) */}
          <div className="bg-slate-900/40 p-3.5 border border-slate-900 rounded-2xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase block">🗣️ DATI RICHIEDENTE / SEGNALATORE</span>
              {call.callerPhone && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${call.callerPhone.replace(/[^0-9+]/g, '')}`}
                    className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Phone className="h-3 w-3" /> Chiama
                  </a>
                  <a
                    href={`https://wa.me/${call.callerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Centrale C.O.E.T.A. - Riscontro per segnalazione ${protocolCode}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 bg-emerald-700/60 hover:bg-emerald-600/80 border border-emerald-500/30 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold">Nominativo</p>
                <p className="font-semibold text-slate-200 mt-0.5 uppercase">{call.callerName || "N.D."}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold">Recapito Telefonico</p>
                <p className="font-semibold text-slate-200 mt-0.5">{call.callerPhone || "N.D."}</p>
              </div>
            </div>
          </div>

          {/* Squadra e Assegnazione */}
          <div className="bg-slate-900/40 p-3.5 border border-slate-900 rounded-2xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase block">👥 SQUADRA & DETTAGLI ASSEGNAZIONE</span>
              {assignedGuardObj && (
                <div className="flex items-center gap-1.5">
                  {(assignedGuardObj.phone || assignedGuardObj.privateInfo?.cellulare) && (
                    <>
                      <a
                        href={`tel:${(assignedGuardObj.phone || assignedGuardObj.privateInfo?.cellulare || "").replace(/[^0-9+]/g, '')}`}
                        className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Phone className="h-3 w-3" /> Chiama
                      </a>
                      <a
                        href={`https://wa.me/${(assignedGuardObj.phone || assignedGuardObj.privateInfo?.cellulare || "").replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Centrale C.O.E.T.A. - Aggiornamento Intervento ${protocolCode} in ${call.localita}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-emerald-700/60 hover:bg-emerald-600/80 border border-emerald-500/30 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleStartVideoCall(assignedGuardObj)}
                    className="h-6 px-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 shadow"
                  >
                    <Video className="h-3 w-3" /> Videochiamata
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold">Pattuglia Incaricata</p>
                <p className="font-bold text-slate-100 mt-0.5 uppercase">
                  {call.assignedGuardName || (isAssigned ? "CENTRALE OPERATIVA" : "NESSUNA (DA ASSEGNARE)")}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold">Contatto Telefonico Squadra</p>
                <p className="font-bold text-slate-100 mt-0.5">{call.assignedGuardPhone || "N.D."}</p>
              </div>
            </div>
            {call.notes && (
              <div className="border-t border-slate-800/60 pt-2">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Disposizioni Operative HQ</p>
                <p className="font-medium text-slate-300 mt-0.5 italic">"{call.notes}"</p>
              </div>
            )}

            {/* Assegnazione / Riaffidamento Rapido Squadra */}
            {guards.length > 0 && (
              <div className="border-t border-slate-800/60 pt-2.5 mt-2 space-y-2">
                <label className="text-[9px] text-amber-400 uppercase font-bold flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-amber-400" />
                  {isAssigned ? "Riassegna ad altra Pattuglia" : "Assegna a Pattuglia Montante sul Campo"}
                </label>
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedNewGuardId}
                    onChange={(e) => setSelectedNewGuardId(e.target.value)}
                    className="flex-1 h-8 bg-slate-950 border border-slate-800 rounded-lg px-2 text-[11px] text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleziona guardia/squadra in turno...</option>
                    {guards.map((g) => {
                      const isTodayOnDuty = shifts.some(s => 
                        (s.guardId === g.id || (s.matricola && g.matricola && s.matricola.replace(/\s+/g,"").toUpperCase() === g.matricola.replace(/\s+/g,"").toUpperCase()))
                        && s.date === new Date().toISOString().split("T")[0]
                      );
                      return (
                        <option key={g.id} value={g.id}>
                          {g.surname} {g.name} ({g.matricola}) {isTodayOnDuty ? "🟢 In Turno" : "🔘 Off-Duty"}
                        </option>
                      );
                    })}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedNewGuardId || isAssigning}
                    onClick={handleAssignGuard}
                    className="h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg px-3 shrink-0 cursor-pointer shadow"
                  >
                    {isAssigning ? "Assegnazione..." : "Assegna 🚨"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Descrizione Segnalazione */}
          <div className="space-y-1 bg-slate-900/20 p-3 border border-slate-900 rounded-2xl">
            <label className="text-[9px] text-slate-400 uppercase font-black block">Descrizione Fatto / Accaduto</label>
            <p className="text-xs text-slate-200 font-normal leading-relaxed whitespace-pre-wrap">
              {call.description || "Nessun dettaglio aggiuntivo fornito."}
            </p>
          </div>

          {/* Registrazioni Chiamate & Note Vocali */}
          <div className="pt-1">
            <AudioCallRecorder
              onAudioSaved={handleSaveNewAudio}
              existingAudios={call.audioRecordings || []}
              onDeleteAudio={handleDeleteAudio}
              operatorName={currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}`.trim() : "Centrale Operativa"}
            />
          </div>

          {/* Chiusura / Azione Operativa */}
          <div className="border-t border-slate-900 pt-4 space-y-3">
            <span className="text-[10px] text-red-400 font-black tracking-wider uppercase block text-center">
              🛡️ AZIONI DI CHIUSURA INTERVENTO (VINCOLO SOPRALLUOGO/SANZIONE)
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenVerbale();
                }}
                className="bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 text-purple-200 uppercase text-xs h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                📋 Redigi Verbale Sopralluogo (1°/2°)
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenSanzione();
                }}
                className="bg-orange-950/40 hover:bg-orange-900/50 border border-orange-500/30 text-orange-200 uppercase text-xs h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                ⚖️ Redigi Verbale di Sanzione
              </Button>
            </div>

            <Button
              type="button"
              onClick={handleQuickResolve}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs py-3 rounded-xl border-0 shadow flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Check className="h-4 w-4 shrink-0" />
              Sopralluogo Effettuato / Sanzionato - Risoluzione Rapida
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-900 gap-2 flex-col xs:flex-row justify-between items-center w-full">
          <div className="flex items-center gap-2 w-full xs:w-auto">
            <Button
              type="button"
              onClick={handlePrintRequest}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase tracking-wider text-[10px] py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-md border-0 transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Stampa Richiesta A4 🖨
            </Button>

            <Button
              type="button"
              onClick={handleDeleteCall}
              className="bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 font-bold uppercase text-[10px] py-2 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              title="Elimina definitivamente questa chiamata o test da Firestore"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Elimina Intervento / Simulazione
            </Button>
          </div>
          
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full xs:w-auto border border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white px-5 rounded-xl uppercase font-bold text-xs h-9 cursor-pointer"
          >
            Chiudi Dettagli
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <VideoCallDialog
      open={videoDialogOpen}
      onOpenChange={setVideoDialogOpen}
      targetGuard={targetVideoGuard}
      currentOperator={currentGuard}
    />
    </>
  );
};

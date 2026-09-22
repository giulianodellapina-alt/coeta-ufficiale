import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, User, CheckSquare, Camera, RefreshCw, Check, X, ClipboardList, Plus, Trash2, Printer, Table, FileText, Layers
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { TerritoryControl, Guard } from "../types";
import { cn } from "@/lib/utils";
import { syncMicrochipToArchive } from "../lib/microchipSync";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";

interface ControlloTerritorioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGuard: Guard | null;
  territoryControls: TerritoryControl[];
  onSuccess?: () => void;
}

export interface BulkControlRow {
  id: string;
  ora: string;
  localitaDettaglio: string;
  specieRazza: string;
  nomeSoggetto: string;
  microchip: string;
  proprietario: string;
  documentoEsibito: string;
  esito: "regolare" | "con_prescrizioni" | "violazione";
  note: string;
}

export const ControlloTerritorioDialog: React.FC<ControlloTerritorioDialogProps> = ({
  open,
  onOpenChange,
  currentGuard,
  territoryControls,
  onSuccess,
}) => {
  const [viewMode, setViewMode] = useState<"bulk" | "single">("bulk");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [controlImage, setControlImage] = useState<string>("");

  // Common Header State
  const [dataControllo, setDataControllo] = useState<string>("");
  const [oraInizio, setOraInizio] = useState<string>("");
  const [comune, setComune] = useState<string>("");
  const [localitaGenerale, setLocalitaGenerale] = useState<string>("");
  const [guardie, setGuardie] = useState<string>("");
  const [settore, setSettore] = useState<"zoofila" | "ittica" | "venatoria" | "ambientale">("zoofila");

  // Bulk Rows State (Modulo Orizzontale Tabellare Excel)
  const createEmptyRow = (index: number): BulkControlRow => ({
    id: `row-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
    ora: "",
    localitaDettaglio: "",
    specieRazza: "",
    nomeSoggetto: "",
    microchip: "",
    proprietario: "",
    documentoEsibito: "",
    esito: "regolare",
    note: ""
  });

  const [bulkRows, setBulkRows] = useState<BulkControlRow[]>([
    createEmptyRow(1),
    createEmptyRow(2),
    createEmptyRow(3)
  ]);

  // Single Control State
  const [newSingleControl, setNewSingleControl] = useState<Partial<TerritoryControl>>({
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

  const comuniMassaCarrara = [
    "Aulla", "Bagnone", "Carrara", "Casola in Lunigiana", "Comano", "Filattiera", 
    "Fivizzano", "Fosdinovo", "Licciana Nardi", "Massa", "Montignoso", "Mulazzo", 
    "Podenzana", "Pontremoli", "Tresana", "Villafranca in Lunigiana", "Zeri"
  ];

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

  const generateControlNumber = (offset = 0) => {
    const year = new Date().getFullYear();
    const countCurrentYear = (territoryControls || []).filter(c => c.data?.startsWith(String(year))).length;
    const progressive = String(countCurrentYear + 1 + offset).padStart(4, "0");
    return `CT-${year}-${progressive}`;
  };

  const addBulkRow = () => {
    setBulkRows(prev => [...prev, createEmptyRow(prev.length + 1)]);
  };

  const addFiveBulkRows = () => {
    setBulkRows(prev => [
      ...prev,
      createEmptyRow(prev.length + 1),
      createEmptyRow(prev.length + 2),
      createEmptyRow(prev.length + 3),
      createEmptyRow(prev.length + 4),
      createEmptyRow(prev.length + 5),
    ]);
  };

  const removeBulkRow = (id: string) => {
    if (bulkRows.length <= 1) {
      alert("Il registro deve contenere almeno una riga.");
      return;
    }
    setBulkRows(prev => prev.filter(r => r.id !== id));
  };

  const updateBulkRow = (id: string, field: keyof BulkControlRow, value: any) => {
    if (field === "microchip") {
      const digitsOnly = String(value).replace(/\D/g, "").slice(0, 15);
      setBulkRows(prev => prev.map(r => r.id === id ? { ...r, microchip: digitsOnly } : r));
      return;
    }
    setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const clearBulkRows = () => {
    if (confirm("Vuoi azzerare tutte le righe del modulo?")) {
      setBulkRows([createEmptyRow(1), createEmptyRow(2), createEmptyRow(3)]);
    }
  };

  // Salva Registro Multiplo (Modulo Orizzontale)
  const handleSaveBulkControls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comune || !localitaGenerale) {
      alert("Si prega di inserire Comune e Località Generale del servizio.");
      return;
    }

    // Filtra righe che hanno almeno un dato compilato
    const validRows = bulkRows.filter(r => 
      r.microchip.trim() !== "" || 
      r.nomeSoggetto.trim() !== "" || 
      r.proprietario.trim() !== "" || 
      r.localitaDettaglio.trim() !== ""
    );

    if (validRows.length === 0) {
      alert("Compilare almeno una riga del modulo prima di salvare (Nome Cane, Microchip o Proprietario).");
      return;
    }

    // Validazione rigida: se il microchip è compilato dev'essere di ESATTAMENTE 15 cifre
    for (let i = 0; i < validRows.length; i++) {
      const chip = validRows[i].microchip.trim();
      if (chip.length > 0 && chip.length !== 15) {
        alert(`⚠️ ATTENZIONE: MICROCHIP INCOMPLETO (Riga ${i + 1})\n\nIl codice Microchip inserito "${chip}" contiene ${chip.length} cifre anziché 15.\n\nI codici dei microchip per cani DEVONO essere di ESATTAMENTE 15 cifre numeriche (es. 380260001234567).\n\nVerifica il numero inserito prima di proseguire.`);
        return;
      }
    }

    setIsSubmitting(true);
    let savedCount = 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const r = validRows[i];
        const generatedNum = generateControlNumber(i);
        const targetLocalita = r.localitaDettaglio.trim() !== "" ? r.localitaDettaglio : localitaGenerale;

        const savePayload: Partial<TerritoryControl> = {
          numeroControllo: generatedNum,
          data: dataControllo,
          ora: r.ora || oraInizio,
          comune: comune,
          localita: targetLocalita,
          settore: settore,
          guardie: guardie,
          specieRazza: r.specieRazza || "Cane",
          nomeCane: r.nomeSoggetto || "",
          proprietario: r.proprietario || "",
          nomeSoggetto: r.proprietario || r.nomeSoggetto || "Cane Controllato",
          microchip: r.microchip.trim(),
          documentoEsibito: r.documentoEsibito || (r.microchip.trim() ? "LETTURA MICROCHIP" : ""),
          esito: r.esito,
          note: r.note,
          creatoAl: new Date(),
          creatoDa: currentGuard?.id || "admin",
          creatoDaNome: currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}` : "Guardia di Servizio",
        };

        await addDoc(collection(db, "territory_controls"), savePayload);
        savedCount++;

        // Sincronizzazione automatica nell'Archivio Anagrafe Canina se presente un microchip
        if (r.microchip.trim()) {
          syncMicrochipToArchive({
            microchip: r.microchip.trim(),
            specieRazza: r.specieRazza || "Cane",
            nomeCane: r.nomeSoggetto,
            proprietarioCognome: r.proprietario,
            comune: comune,
            localita: targetLocalita,
            fonte: `Registro Controlli ${comune} (${generatedNum})`
          });
        }
      }

      alert(`✅ REGISTRO SALVATO CON SUCCESSO!\n\nIstruzioni eseguite:\n- Registrati ${savedCount} controlli sul territorio nel Comune di ${comune}.\n- Estrapolati e memorizzati i cani e microchip nell'Archivio Anagrafe Canina.`);
      
      // Reset
      setBulkRows([createEmptyRow(1), createEmptyRow(2), createEmptyRow(3)]);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Errore salvataggio registro controlli:", err);
      alert("Impossibile salvare il registro controlli. Verifica la connessione internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salva Controllo Singolo Dettagliato
  const handleSaveSingleControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSingleControl.comune || !newSingleControl.localita) {
      alert("Si prega di completare i campi obbligatori (Comune e Località)");
      return;
    }

    if (newSingleControl.microchip) {
      const chip = newSingleControl.microchip.trim();
      if (chip.length > 0 && chip.length !== 15) {
        alert(`⚠️ ATTENZIONE: MICROCHIP INCOMPLETO\n\nIl codice Microchip inserito "${chip}" contiene ${chip.length} cifre anziché 15.\n\nI codici dei microchip per cani DEVONO essere di ESATTAMENTE 15 cifre numeriche (es. 380260001234567).\n\nVerifica il numero inserito prima di proseguire.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const generatedNum = generateControlNumber();
      const savePayload: Partial<TerritoryControl> = {
        ...newSingleControl,
        numeroControllo: generatedNum,
        specieRazza: newSingleControl.specieRazza || "Cane",
        nomeCane: newSingleControl.nomeCane || "",
        proprietario: newSingleControl.proprietario || newSingleControl.nomeSoggetto || "",
        nomeSoggetto: newSingleControl.proprietario || newSingleControl.nomeSoggetto || newSingleControl.nomeCane || "Cane Controllato",
        documentoEsibito: newSingleControl.documentoEsibito || (newSingleControl.microchip?.trim() ? "LETTURA MICROCHIP" : ""),
        image: controlImage,
        creatoAl: new Date(),
        creatoDa: currentGuard?.id || "admin",
        creatoDaNome: currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}` : "Guardia di Servizio",
      };

      await addDoc(collection(db, "territory_controls"), savePayload);

      // Sincronizzazione automatica nell'Archivio Anagrafe Canina se presente un microchip
      if (newSingleControl.microchip) {
        syncMicrochipToArchive({
          microchip: newSingleControl.microchip,
          specieRazza: newSingleControl.specieRazza,
          nomeCane: newSingleControl.nomeCane || newSingleControl.nomeSoggetto,
          proprietarioCognome: newSingleControl.proprietario || newSingleControl.nomeSoggetto,
          comune: newSingleControl.comune,
          localita: newSingleControl.localita,
          fonte: `Controllo Territoriale (${generatedNum})`
        });
      }

      alert(`Controllo sul territorio ${generatedNum} registrato e inviato alla Sede con successo!`);
      
      // Reset
      setNewSingleControl({
        data: "",
        ora: "",
        comune: "",
        localita: "",
        guardie: "",
        settore: "zoofila",
        specieRazza: "",
        microchip: "",
        nomeCane: "",
        proprietario: "",
        nomeSoggetto: "",
        documentoEsibito: "",
        esito: "regolare",
        prescrizioneTesto: "",
        giorniAdeguamento: 10,
        note: "",
      });
      setControlImage("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Errore salvataggio controllo territorio:", err);
      alert("Impossibile salvare il controllo. Controlla la connessione internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const printCurrentBulkRows = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permesso popup bloccato. Consenti l'apertura delle popup per stampare.");
      return;
    }

    const rowsHtml = bulkRows.map((r, idx) => {
      const specieVal = r.specieRazza && r.specieRazza.trim() !== "" ? r.specieRazza : "Cane";
      const nomeCaneVal = r.nomeSoggetto && r.nomeSoggetto.trim() !== "" ? r.nomeSoggetto : "—";
      const microchipVal = r.microchip && r.microchip.trim() !== "" ? r.microchip.trim() : "NON DETECTED";
      const proprietarioVal = r.proprietario && r.proprietario.trim() !== "" ? r.proprietario : "—";
      const docVal = r.documentoEsibito && r.documentoEsibito.trim() !== "" 
        ? r.documentoEsibito 
        : (r.microchip && r.microchip.trim() !== "" ? "LETTURA MICROCHIP" : "—");
      const esitoLabel = r.esito === 'con_prescrizioni' ? 'Con Prescrizioni' : r.esito === 'violazione' ? 'Violazione' : 'Regolare';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; font-family: monospace;">${idx + 1}</td>
          <td style="font-size: 8.5pt;">${r.ora || oraInizio || "—"}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${r.localitaDettaglio || localitaGenerale || "—"}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${specieVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase; font-weight: bold;">${nomeCaneVal}</td>
          <td style="font-size: 8.5pt; font-family: monospace; font-weight: bold; text-align: center;">${microchipVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${proprietarioVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${docVal}</td>
          <td style="font-size: 8.5pt; text-transform: uppercase;">${esitoLabel}</td>
          <td style="font-size: 8pt; font-family: monospace;">${guardie || "—"}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>REGISTRO CONTROLLI NEL COMUNE DI ${comune.toUpperCase()}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Times New Roman', serif; color: #000; padding: 10px; font-size: 9pt; }
            .container { border: 1px solid #000; padding: 12px; }
            .header-text-top { text-align: center; font-size: 7.5pt; margin-bottom: 2px; text-transform: uppercase; font-style: italic; }
            .header-main { display: flex; align-items: center; justify-content: center; gap: 15px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
            .header-logo { width: 44px; height: 44px; object-fit: contain; }
            .header-titles h1 { font-size: 13.5pt; font-weight: 900; text-transform: uppercase; margin: 0; }
            .doc-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 6px 0 10px 0; background: #f1f5f9; padding: 6px; text-align: center; border: 1px solid #000; }
            table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
            th { background: #e2e8f0; border: 1px solid #000; padding: 5px; text-transform: uppercase; font-size: 8pt; text-align: left; }
            td { border: 1px solid #000; padding: 4.5px; vertical-align: middle; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="container">
            ${getOfficialPrintHeaderHtml(`REGISTRO CONTROLLI TERRITORIALI — COMUNE DI ${comune.toUpperCase()}`, `LOCALITÀ: ${localitaGenerale.toUpperCase()} (${dataControllo})`)}
            <table>
              <thead>
                <tr>
                  <th style="width: 25px;">#</th>
                  <th style="width: 55px;">Ora</th>
                  <th>Località / Postazione</th>
                  <th>Specie / Razza</th>
                  <th>Nome Cane</th>
                  <th style="width: 120px;">Codice Microchip</th>
                  <th>Proprietario / Detentore</th>
                  <th>Doc. Esibito</th>
                  <th>Esito</th>
                  <th>Guardie</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 z-50 bg-[#020617] text-slate-200 p-0 flex flex-col overflow-hidden w-full h-[100dvh] max-h-none md:w-full md:max-w-none md:h-full md:rounded-none shadow-none left-0 top-0 translate-x-0 translate-y-0 border-none">
        
        {/* HEADER MODALE */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/40 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Table className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white uppercase italic tracking-wider flex items-center gap-2">
                Controlli nel Comune — Modulo Orizzontale Multi-Cani
              </DialogTitle>
              <DialogDescription className="text-[10.5px] text-slate-400 uppercase tracking-widest mt-0.5">
                Compilazione tabellare a righe multiple (stile Excel) per pattugliamenti sul territorio (es. Molo di Ponente, Passeggiata Mare)
              </DialogDescription>
            </div>
          </div>

          {/* TOGGLE VISTA E PULSANTE CHIUDI */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("bulk")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "bulk" 
                    ? "bg-purple-700 text-white shadow-lg shadow-purple-950/50" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Table className="h-3.5 w-3.5" />
                Modulo Orizzontale Excel ({bulkRows.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "single" 
                    ? "bg-purple-700 text-white shadow-lg shadow-purple-950/50" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Scheda Singola
              </button>
            </div>

            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-950/50 border border-red-500/50 cursor-pointer shrink-0"
            >
              <X className="h-4.5 w-4.5" />
              <span>CHIUDI</span>
            </Button>
          </div>
        </DialogHeader>

        {/* CONTENUTO MODULO ORIZZONTALE (BULK TABELLARE) */}
        {viewMode === "bulk" ? (
          <form onSubmit={handleSaveBulkControls} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-slate-950/20">
            
            {/* INTESTAZIONE GENERALE SERVIZIO */}
            <div className="bg-[#080d19] border border-slate-800 p-4 rounded-2xl space-y-4 shadow-xl">
              <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-400" />
                1. Dati di Inizio Servizio &amp; Ubicazione Territoriale (Intestazione Registro)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Data Servizio *</Label>
                  <Input
                    type="date"
                    required
                    value={dataControllo}
                    onChange={(e) => setDataControllo(e.target.value)}
                    className="bg-[#030712] border-slate-800 text-xs h-9 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Ora Inizio *</Label>
                  <Input
                    required
                    placeholder="10:30"
                    value={oraInizio}
                    onChange={(e) => setOraInizio(e.target.value)}
                    className="bg-[#030712] border-slate-800 text-xs h-9 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Comune MS *</Label>
                  <select
                    value={comune}
                    onChange={(e) => setComune(e.target.value)}
                    className="bg-[#030712] border border-slate-800 rounded-lg px-3 h-9 text-xs text-purple-300 font-bold outline-none w-full"
                  >
                    <option value="">-- Seleziona Comune --</option>
                    {comuniMassaCarrara.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Località / Postazione Generale *</Label>
                  <Input
                    required
                    placeholder="Es: Molo di Ponente / Passeggiata a Mare"
                    value={localitaGenerale}
                    onChange={(e) => setLocalitaGenerale(e.target.value)}
                    className="bg-[#030712] border-slate-800 text-xs h-9 uppercase font-mono text-purple-300 font-bold"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Guardie Verbalizzanti in Servizio *</Label>
                  <Input
                    required
                    placeholder="Es: Guardie Bianchi, Neri"
                    value={guardie}
                    onChange={(e) => setGuardie(e.target.value)}
                    className="bg-[#030712] border-slate-800 text-xs h-9 uppercase font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Settore Ispezione *</Label>
                  <select
                    value={settore}
                    onChange={(e) => setSettore(e.target.value as any)}
                    className="bg-[#030712] border border-slate-800 rounded-lg px-3 h-9 text-xs text-slate-200 outline-none w-full"
                  >
                    <option value="zoofila">ZOOFILO (Cani/Gatti/Animali affezione)</option>
                    <option value="ittica">ITTICO (Fiumi/Acque)</option>
                    <option value="venatoria">VENATORIO (Caccia/Boschi)</option>
                    <option value="ambientale">AMBIENTALE (Discariche/Inquinamento)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABELLA REGISTRO ORIZZONTALE EXCEL */}
            <div className="bg-[#080d19] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Table className="h-4 w-4 text-emerald-400" />
                    2. Modulo Registrazione Orizzontale ({bulkRows.length} controlli inseriti)
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Compila una riga per ogni cane o soggetto controllato. I dati verranno salvati in blocchi e migrati all'Anagrafe Canina.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={addBulkRow}
                    className="bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider h-8 px-3 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> +1 Riga
                  </Button>
                  <Button
                    type="button"
                    onClick={addFiveBulkRows}
                    className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/30 text-xs font-bold uppercase tracking-wider h-8 px-3 rounded-lg flex items-center gap-1"
                  >
                    <Layers className="h-3.5 w-3.5" /> +5 Righe
                  </Button>
                  <Button
                    type="button"
                    onClick={printCurrentBulkRows}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider h-8 px-3 rounded-lg flex items-center gap-1"
                  >
                    <Printer className="h-3.5 w-3.5" /> Anteprima Stampa
                  </Button>
                </div>
              </div>

              {/* GRIGLIA TABELLARE SCROLLABILE */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-300 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="py-2.5 px-2 text-center w-8">#</th>
                      <th className="py-2.5 px-2 w-20">Ora</th>
                      <th className="py-2.5 px-2 w-36">Specie / Razza</th>
                      <th className="py-2.5 px-2 w-32">Nome Cane</th>
                      <th className="py-2.5 px-2 w-48 font-mono text-purple-300">Codice Microchip (15 cifre)</th>
                      <th className="py-2.5 px-2 w-44">Proprietario / Detentore</th>
                      <th className="py-2.5 px-2 w-36">Doc. Esibito</th>
                      <th className="py-2.5 px-2 w-32">Esito</th>
                      <th className="py-2.5 px-2 text-center w-10">Rimuovi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {bulkRows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2 px-2 text-center font-bold text-slate-500 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            value={row.ora}
                            onChange={(e) => updateBulkRow(row.id, "ora", e.target.value)}
                            placeholder="10:35"
                            className="bg-[#030712] border-slate-800 text-[11px] h-8 font-mono text-white p-1.5"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            value={row.specieRazza}
                            onChange={(e) => updateBulkRow(row.id, "specieRazza", e.target.value)}
                            placeholder="Cane / Pastore"
                            className="bg-[#030712] border-slate-800 text-[11px] h-8 uppercase p-1.5 text-slate-200"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            value={row.nomeSoggetto}
                            onChange={(e) => updateBulkRow(row.id, "nomeSoggetto", e.target.value)}
                            placeholder="Nome cane (es. Fido)"
                            className="bg-[#030712] border-slate-800 text-[11px] h-8 uppercase font-bold text-white p-1.5"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <div className="relative flex items-center">
                            <Input
                              value={row.microchip}
                              onChange={(e) => updateBulkRow(row.id, "microchip", e.target.value)}
                              maxLength={15}
                              placeholder="38026000..."
                              className={cn(
                                "bg-[#030712] text-[11px] h-8 font-mono tracking-wider font-bold p-1.5 pr-11",
                                row.microchip.length === 15 
                                  ? "border-emerald-500 text-emerald-300" 
                                  : row.microchip.length > 0 
                                    ? "border-amber-500 text-amber-300" 
                                    : "border-purple-900/50 text-purple-300"
                              )}
                            />
                            {row.microchip.length > 0 && (
                              <span className={cn(
                                "absolute right-1 text-[9px] font-mono font-bold px-1 py-0.5 rounded pointer-events-none",
                                row.microchip.length === 15 ? "text-emerald-400 bg-emerald-950/90 border border-emerald-500/40" : "text-amber-400 bg-amber-950/90 border border-amber-500/40"
                              )}>
                                {row.microchip.length}/15
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            value={row.proprietario}
                            onChange={(e) => updateBulkRow(row.id, "proprietario", e.target.value)}
                            placeholder="Cognome e Nome"
                            className="bg-[#030712] border-slate-800 text-[11px] h-8 uppercase p-1.5 text-slate-200"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            value={row.documentoEsibito}
                            onChange={(e) => updateBulkRow(row.id, "documentoEsibito", e.target.value)}
                            placeholder="Anagrafe / Libretto"
                            className="bg-[#030712] border-slate-800 text-[11px] h-8 uppercase p-1.5 text-slate-300"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <select
                            value={row.esito}
                            onChange={(e) => updateBulkRow(row.id, "esito", e.target.value)}
                            className="bg-[#030712] border border-slate-800 rounded text-[10px] h-8 px-1 text-slate-200 font-bold outline-none w-full"
                          >
                            <option value="regolare">Regolare</option>
                            <option value="con_prescrizioni">Con Prescrizioni</option>
                            <option value="violazione">Violazione</option>
                          </select>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeBulkRow(row.id)}
                            className="text-slate-600 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                            title="Rimuovi questa riga"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 font-mono">
                <span>Nota: Per i cani con codice microchip, i dati verranno migrati direttamente nell'Archivio Anagrafe Canina.</span>
                <button
                  type="button"
                  onClick={clearBulkRows}
                  className="text-red-400 hover:underline cursor-pointer uppercase text-[10px]"
                >
                  Pulisci Tabella
                </button>
              </div>
            </div>

            {/* FOOTER AZIONE */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 italic">
                Sincronizzazione telematica istantanea con l'Archivio C.O.E.T.A. e il registro del Comune di {comune}.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-slate-400 text-xs"
                >
                  Annulla
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs px-6 py-2.5 rounded-xl h-10 shadow-lg shadow-emerald-950/50"
                >
                  {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  {isSubmitting ? "Invio e Sincronizzazione..." : `SALVA E REGISTRA CONTROLLI (${bulkRows.filter(r => r.microchip.trim() !== "" || r.nomeSoggetto.trim() !== "").length})`}
                </Button>
              </div>
            </div>

          </form>
        ) : (
          /* FORM SINGOLO DETTAGLIATO (FOTO & PRESCRIZIONE) */
          <form onSubmit={handleSaveSingleControl} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/20">
            {/* Sezione 1: Tempistiche e Geolocalizzazione */}
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
                    value={newSingleControl.data}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, data: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Ora Accertamento *</Label>
                  <Input
                    required
                    placeholder="Es: 11:45"
                    value={newSingleControl.ora}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, ora: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Comune MS *</Label>
                  <select
                    value={newSingleControl.comune || ""}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, comune: e.target.value })}
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
                    value={newSingleControl.localita}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, localita: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase font-mono text-purple-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Settore Controllo *</Label>
                  <select
                    value={newSingleControl.settore}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, settore: e.target.value as any })}
                    className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-200 outline-none w-full"
                  >
                    <option value="zoofila">ZOOFILO (Cani/Gatti/Animali affezione)</option>
                    <option value="ittica">ITTICO (Fiumi/Acque)</option>
                    <option value="venatoria">VENATORIO (Caccia/Boschi)</option>
                    <option value="ambientale">AMBIENTALE (Discariche/Inquinamento)</option>
                  </select>
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Guardie di Servizio sul campo *</Label>
                  <Input
                    required
                    placeholder="Es: Guardie Bianchi, Neri"
                    value={newSingleControl.guardie}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, guardie: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Sezione 2: Istanza Soggetti & Rilievo Anagrafico */}
            <div className="bg-slate-950/65 border border-slate-900 p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Sezione 2: Istanza Soggetti &amp; Rilievo Anagrafico
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Nome Cane</Label>
                  <Input
                    placeholder="Es: Fido, Rex..."
                    value={newSingleControl.nomeCane || ""}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, nomeCane: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase font-bold text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Nome Proprietario / Detentore</Label>
                  <Input
                    placeholder="Cognome e Nome proprietario cane"
                    value={newSingleControl.proprietario || newSingleControl.nomeSoggetto || ""}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, proprietario: e.target.value, nomeSoggetto: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Documento Esibito sul Posto</Label>
                  <Input
                    placeholder="Es: Iscrizione ASL / Passaporto"
                    value={newSingleControl.documentoEsibito}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, documentoEsibito: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-mono text-purple-300">Numero Microchip (Cane)</Label>
                    {newSingleControl.microchip && (
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                        newSingleControl.microchip.length === 15 ? "text-emerald-400 bg-emerald-950 border border-emerald-500/30" : "text-amber-400 bg-amber-950 border border-amber-500/30"
                      )}>
                        {newSingleControl.microchip.length} / 15 cifre {newSingleControl.microchip.length === 15 ? "✓" : "⚠️ Incompleto"}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="Codice microchip di 15 cifre"
                    maxLength={15}
                    value={newSingleControl.microchip || ""}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 15);
                      setNewSingleControl({ ...newSingleControl, microchip: digitsOnly });
                    }}
                    className={cn(
                      "bg-[#0b0f19] text-xs h-10 font-mono tracking-wider font-bold",
                      (newSingleControl.microchip?.length || 0) === 15 
                        ? "border-emerald-500 text-emerald-300" 
                        : (newSingleControl.microchip?.length || 0) > 0 
                          ? "border-amber-500 text-amber-300" 
                          : "border-slate-800 text-white"
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Specie / Razza Animale</Label>
                  <Input
                    placeholder="Es: Cane / Pastore Tedesco"
                    value={newSingleControl.specieRazza}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, specieRazza: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs h-10 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Sezione 3: Esito del Controllo e Foto Geotagged */}
            <div className="bg-slate-950/65 border border-slate-900 p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Sezione 3: Esito del Controllo e Foto Geotagged
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Valutazione Finale Ispettiva *</Label>
                  <select
                    value={newSingleControl.esito}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, esito: e.target.value as any })}
                    className="bg-[#0b0f19] border border-slate-800 rounded-lg px-3 h-10 text-xs text-slate-100 outline-none w-full font-bold text-purple-400"
                  >
                    <option value="regolare">REGOLARE (Nessuna anomalia)</option>
                    <option value="con_prescrizioni">CON PRESCRIZIONI D'ADEGUAMENTO</option>
                    <option value="violazione">ACCERTATA VIOLAZIONE</option>
                  </select>
                </div>

                {newSingleControl.esito === "con_prescrizioni" && (
                  <div className="space-y-1.5 animate-fadeIn sm:col-span-2">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-bold text-yellow-500">Giorni concessi per Adeguamento *</Label>
                    <Input
                      type="number"
                      required
                      value={newSingleControl.giorniAdeguamento}
                      onChange={(e) => setNewSingleControl({ ...newSingleControl, giorniAdeguamento: Number(e.target.value) })}
                      className="bg-[#0b0f19] border-slate-800 text-xs h-10 text-yellow-500"
                    />
                  </div>
                )}

                {newSingleControl.esito === "con_prescrizioni" && (
                  <div className="sm:col-span-2 space-y-1.5 animate-fadeIn">
                    <Label className="text-slate-400 text-[10px] uppercase tracking-widest font-bold text-yellow-500">Dettaglio Prescrizioni Accollate *</Label>
                    <Textarea
                      required
                      placeholder="Descrivi cosa il proprietario deve adeguare (es. ricovero idoneo o iscrizione anagrafe canina entro x giorni)..."
                      value={newSingleControl.prescrizioneTesto}
                      onChange={(e) => setNewSingleControl({ ...newSingleControl, prescrizioneTesto: e.target.value })}
                      className="bg-[#0b0f19] border-slate-800 text-xs min-h-[80px]"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest">Note Aggiuntive / Constatazioni</Label>
                  <Textarea
                    placeholder="Eventuali note integrative d'ufficio..."
                    value={newSingleControl.note}
                    onChange={(e) => setNewSingleControl({ ...newSingleControl, note: e.target.value })}
                    className="bg-[#0b0f19] border-slate-800 text-xs min-h-[80px]"
                  />
                </div>

                {/* Acquisizione Foto */}
                <div className="sm:col-span-2 space-y-3">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5 text-purple-400" /> Acquisizione Documento / Foto sul posto
                  </Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                    <div className="relative w-full sm:w-auto">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="dialog-control-photo"
                      />
                      <Label
                        htmlFor="dialog-control-photo"
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
                onClick={() => onOpenChange(false)}
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
                {isSubmitting ? "Salvataggio..." : "Invia ed Archivia"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

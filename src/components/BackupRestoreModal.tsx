import React, { useState, useEffect } from "react";
import { 
  Download, 
  Upload, 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileJson, 
  RefreshCw, 
  Loader2, 
  Database,
  Lock,
  Trash2,
  AlertOctagon
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentGuard: any;
  initialMode?: "save" | "restore" | "all";
}

const BACKUP_COLLECTIONS = [
  "shifts",
  "guards",
  "reports",
  "sanction_reports",
  "service_reports",
  "territory_controls",
  "environmental_reports",
  "missions",
  "canine_certificates",
  "contacts",
  "vehicles",
  "vehicle_logs",
  "documents",
  "custom_pois",
  "sos_duty_shifts",
  "emergency_calls",
  "alerts",
  "animalia_census"
];

// Collezioni di simulazione da azzerare per il collaudo
// NOTA: guards, guards_private_info, documents, contacts, vehicles, canine_certificates, animalia_census, forbidden_drugs, animal_symptoms sono PRESERVATE!
const SIMULATION_PURGE_COLLECTIONS = [
  { name: "shifts", label: "Turni Operativi" },
  { name: "sos_duty_shifts", label: "Turni Reperibilità SOS" },
  { name: "reports", label: "Verbali Sopralluogo (1° e 2°)" },
  { name: "sanction_reports", label: "Verbali Sanzionatori" },
  { name: "service_reports", label: "Relazioni di Servizio" },
  { name: "territory_controls", label: "Registro Controlli Territoriali" },
  { name: "emergency_calls", label: "Chiamate di Emergenza & Dossier" },
  { name: "missions", label: "Missioni Assegnate" },
  { name: "alerts", label: "Allarmi SOS Storici" },
  { name: "vehicle_logs", label: "Log e Danni Veicoli Simulati" },
  { name: "environmental_reports", label: "Segnalazioni Ambientali Rapide" }
];

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  user,
  currentGuard,
  initialMode = "all"
}) => {
  const [activeTab, setActiveTab] = useState<"save" | "restore" | "all">(initialMode);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setStatusMessage(null);
      setErrorMessage(null);
      setSelectedFile(null);
      setParsedData(null);
    }
  }, [isOpen, initialMode]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [showConfirmPurge, setShowConfirmPurge] = useState(false);
  const [purgeStats, setPurgeStats] = useState<{ [key: string]: number } | null>(null);
  const [exportStats, setExportStats] = useState<{ [key: string]: number } | null>(null);
  const [importStats, setImportStats] = useState<{ [key: string]: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  // Esecuzione azzeramento simulazioni per collaudo
  const handleExecutePurgeSimulations = async () => {
    setShowConfirmPurge(false);
    setIsPurging(true);
    setErrorMessage(null);
    setStatusMessage("Avvio azzeramento dati di simulazione...");
    setPurgeStats(null);

    try {
      const stats: { [key: string]: number } = {};
      let totalDeleted = 0;

      for (const item of SIMULATION_PURGE_COLLECTIONS) {
        const colName = item.name;
        setStatusMessage(`Cancellazione archivio di test: ${item.label} (${colName})...`);
        try {
          const colRef = collection(db, colName);
          const snapshot = await getDocs(colRef);
          let count = 0;

          // Cancellazione a batch (fino a 400 per batch per rispettare i limiti Firestore)
          let batch = writeBatch(db);
          let batchCount = 0;

          for (const docSnap of snapshot.docs) {
            batch.delete(doc(db, colName, docSnap.id));
            count++;
            batchCount++;

            if (batchCount >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }

          stats[item.label] = count;
          totalDeleted += count;
        } catch (colErr: any) {
          console.warn(`Errore pulizia ${colName}:`, colErr.message);
          stats[item.label] = 0;
        }
      }

      // Svuota code locali offline se presenti
      try {
        localStorage.removeItem("pending_reports_offline");
        localStorage.removeItem("offline_territory_controls");
        localStorage.removeItem("pending_documents_queue");
      } catch {
        // Ignora se localStorage non accessibile
      }

      setPurgeStats(stats);
      setStatusMessage(`✅ Azzeramento completato! Rimossi ${totalDeleted} record di simulazione. Anagrafiche guardie, modulistica e prontuari preservati.`);
    } catch (err: any) {
      console.error("Errore durante l'azzeramento simulazioni:", err);
      setErrorMessage("Errore durante l'eliminazione dei dati: " + (err.message || "Errore sconosciuto"));
    } finally {
      setIsPurging(false);
    }
  };

  // Esportazione totale di tutte le collezioni del database
  const handleExportBackup = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage("Avvio estrazione dei dati da Firestore...");
    setExportStats(null);

    try {
      const backupData: { [key: string]: any[] } = {};
      const stats: { [key: string]: number } = {};
      let totalDocuments = 0;

      for (const colName of BACKUP_COLLECTIONS) {
        setStatusMessage(`Esportazione archivio: ${colName}...`);
        try {
          const colRef = collection(db, colName);
          const snapshot = await getDocs(colRef);
          const docsList: any[] = [];

          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            docsList.push({
              _docId: docSnap.id,
              ...d
            });
          });

          backupData[colName] = docsList;
          stats[colName] = docsList.length;
          totalDocuments += docsList.length;
        } catch (colErr: any) {
          console.warn(`Impossibile leggere ${colName} (permessi o vuoto):`, colErr.message);
          backupData[colName] = [];
          stats[colName] = 0;
        }
      }

      const fullPayload = {
        metadata: {
          app: "VIGILANZA_BERTOLUCCI_EKOCLUB",
          version: "2.0.0",
          exportDate: new Date().toISOString(),
          exportedBy: {
            uid: user?.uid || "N/A",
            email: user?.email || "N/A",
            guardName: currentGuard?.name || "Giuliano / Consuelo",
            matricola: currentGuard?.matricola || "N/A"
          },
          totalCollections: BACKUP_COLLECTIONS.length,
          totalDocuments
        },
        database: backupData
      };

      setExportStats(stats);
      setStatusMessage(`Esportazione completata! ${totalDocuments} record estratti. Creazione file JSON...`);

      // Creazione del file con nome chiaro basato sulla data odierna (es. SALVATAGGIO_PROGRAMMA_13-09-2026_15-30.json)
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const filename = `SALVATAGGIO_PROGRAMMA_${day}-${month}-${year}_ore_${hours}-${minutes}.json`;

      const blob = new Blob([JSON.stringify(fullPayload, null, 2)], {
        type: "application/json;charset=utf-8;"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage(`✅ Salvataggio pronto! Si è aperta la finestra del tuo computer: scegli la tua CHIAVETTA USB e premi Salva.`);
    } catch (err: any) {
      console.error("Errore durante l'esportazione:", err);
      setErrorMessage("Errore durante la creazione del salvataggio: " + (err.message || "Errore sconosciuto"));
    } finally {
      setIsExporting(false);
    }
  };

  // Caricamento del file JSON da chiavetta USB
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setStatusMessage(null);
    setImportStats(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        if (!json.database || typeof json.database !== "object") {
          throw new Error("Il file selezionato non contiene una struttura di database valida.");
        }

        setParsedData(json);
        setStatusMessage(`File valido: "${file.name}" pronto per il ripristino.`);
      } catch (err: any) {
        console.error("Errore lettura file JSON:", err);
        setErrorMessage("File non valido o corrotto: " + (err.message || "Formato JSON errato."));
        setSelectedFile(null);
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Esecuzione ripristino nel database Firestore
  const handleExecuteRestore = async () => {
    if (!parsedData || !parsedData.database) {
      setErrorMessage("Nessun dato valido da ripristinare.");
      return;
    }

    setShowConfirmRestore(false);
    setIsImporting(true);
    setErrorMessage(null);
    setStatusMessage("Avvio ripristino dati su Firestore...");
    setImportStats(null);

    try {
      const stats: { [key: string]: number } = {};
      let totalRestored = 0;
      const dbObj = parsedData.database;

      for (const colName of Object.keys(dbObj)) {
        const items = dbObj[colName];
        if (!Array.isArray(items) || items.length === 0) {
          stats[colName] = 0;
          continue;
        }

        setStatusMessage(`Ripristino collezione: ${colName} (${items.length} record)...`);
        let count = 0;

        for (const item of items) {
          const { _docId, ...docData } = item;
          if (_docId) {
            const docRef = doc(db, colName, _docId);
            await setDoc(docRef, {
              ...docData,
              restoredAt: serverTimestamp(),
              restoredFrom: parsedData.metadata?.exportDate || new Date().toISOString()
            }, { merge: true });
            count++;
          }
        }

        stats[colName] = count;
        totalRestored += count;
      }

      setImportStats(stats);
      setStatusMessage(`🎉 Programma ripristinato con successo! Tutti i dati della data selezionata sono ora operativi.`);
    } catch (err: any) {
      console.error("Errore durante il ripristino:", err);
      setErrorMessage("Errore durante il ripristino dei dati: " + (err.message || "Errore sconosciuto"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!w-[96vw] !max-w-6xl md:!max-w-7xl !h-[92vh] bg-[#020617] border-2 border-blue-600/70 text-slate-200 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-2xl z-[10000] overflow-y-auto flex flex-col">
        <DialogHeader className="border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400 shrink-0">
              <HardDrive className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>Salvataggio e Caricamento su Chiavetta USB</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-300 mt-1">
                Usa questa schermata per salvare tutto sulla tua chiavetta USB o per ricaricare un salvataggio precedente.
              </DialogDescription>
            </div>
          </div>

          {/* Selettore Rapido "Salva in..." / "Carica da..." */}
          <div className="flex items-center gap-2 sm:gap-3 mt-4 bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <button
              type="button"
              id="tab-btn-salva-in"
              onClick={() => setActiveTab("save")}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                activeTab === "save"
                  ? "bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-950/60"
                  : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Download className="h-5 w-5 shrink-0" />
              <span>1. Salva in... (Chiavetta USB)</span>
            </button>
            <button
              type="button"
              id="tab-btn-carica-da"
              onClick={() => setActiveTab("restore")}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                activeTab === "restore"
                  ? "bg-amber-500 border-amber-300 text-slate-950 shadow-xl shadow-amber-950/60"
                  : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Upload className="h-5 w-5 shrink-0 text-slate-950" />
              <span>2. Carica da... (Chiavetta USB)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                activeTab === "all"
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900"
              }`}
              title="Opzioni aggiuntive (azzeramento dati di prova per collaudo)"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Altro</span>
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* SEZIONE 1: SALVA IN... SULLA CHIAVETTA */}
          {(activeTab === "save" || activeTab === "all") && (
            <div className="bg-slate-900/90 border-2 border-blue-500/40 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl">
              <div>
                <h3 className="text-base sm:text-lg font-black text-blue-300 uppercase tracking-wide flex items-center gap-2">
                  <Download className="h-6 w-6 text-blue-400" /> Salva Tutto sulla Chiavetta USB
                </h3>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                  Premi il pulsante qui sotto: il computer preparerà automaticamente il file con la data di oggi e potrai scegliere direttamente la tua <strong>chiavetta USB</strong> dove conservarlo.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  type="button"
                  id="btn-azione-salva-in"
                  onClick={handleExportBackup}
                  disabled={isExporting || isImporting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider h-14 px-8 rounded-2xl shadow-xl shadow-blue-950/70 flex items-center gap-3 cursor-pointer text-base"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Salvataggio in corso...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      <span>Salva in... (Scegli Chiavetta USB)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* SEZIONE 2: CARICA DA... CHIAVETTA */}
          {(activeTab === "restore" || activeTab === "all") && (
            <div className="bg-slate-900/90 border-2 border-amber-500/40 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl">
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <Upload className="h-6 w-6 text-amber-400" /> Carica un Salvataggio dalla Chiavetta USB
                </h3>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                  Premi su <strong>"Carica da... (Scegli Chiavetta USB)"</strong>: si aprirà la finestra del computer per andare nella chiavetta USB e scegliere il file con la data che vuoi ripristinare.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    disabled={isExporting || isImporting}
                    className="hidden"
                  />
                  <div className="h-14 px-5 rounded-2xl border-2 border-dashed border-amber-500/60 bg-slate-950 hover:bg-slate-900 text-slate-200 text-sm font-bold flex items-center justify-center gap-3 transition-colors">
                    <FileJson className="h-6 w-6 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {selectedFile ? `File scelto: ${selectedFile.name}` : "Carica da... (Scegli il file dalla Chiavetta USB)"}
                    </span>
                  </div>
                </label>

                <Button
                  type="button"
                  id="btn-azione-carica-da"
                  onClick={() => setShowConfirmRestore(true)}
                  disabled={!parsedData || isExporting || isImporting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider h-14 px-8 rounded-2xl shadow-xl shadow-amber-950/70 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-30 shrink-0"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
                      <span>Ripristino in corso...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 text-slate-950" />
                      <span>Applica Questo Salvataggio</span>
                    </>
                  )}
                </Button>
              </div>

              {parsedData?.metadata && (
                <div className="bg-slate-950/90 border border-amber-500/30 p-4 rounded-2xl text-sm flex items-center justify-between flex-wrap gap-2 text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span>Salvataggio valido del: <strong>{new Date(parsedData.metadata.exportDate).toLocaleString("it-IT")}</strong></span>
                  </div>
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-bold">
                    Pronto per il caricamento
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SEZIONE 3: AZZERAMENTO DATI SIMULAZIONE PER COLLAUDO */}
          {activeTab === "all" && (
            <div className="bg-red-950/20 border border-red-500/40 p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> 3. Azzeramento Dati di Simulazione per Collaudo
                  </h3>
                  <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Pronto Collaudo
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Elimina in modo selettivo <strong>tutti i dati di prova generati durante i test</strong> (Turni, Verbali di Sopralluogo e Sanzioni, Relazioni di Servizio, Chiamate di Emergenza, Allarmi SOS e Log Veicoli).
                </p>
                <div className="mt-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> ARCHIVI TOTALMENTE PRESERVATI (NON VERRANNO TOCCATI):
                  </div>
                  <div className="text-slate-300 font-medium">
                    ✓ Anagrafica Guardie, Decreti e Ruoli &nbsp;|&nbsp; ✓ Modulistica Ufficiale &nbsp;|&nbsp; ✓ Anagrafe Canina &nbsp;|&nbsp; ✓ Veicoli di Servizio &nbsp;|&nbsp; ✓ Rubrica Contatti &nbsp;|&nbsp; ✓ Normative e Prontuari
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-4">
              <Button
                type="button"
                onClick={() => setShowConfirmPurge(true)}
                disabled={isPurging || isExporting || isImporting}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider h-11 px-6 rounded-xl shadow-lg shadow-red-950/60 flex items-center gap-2 cursor-pointer"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Azzeramento Simulazioni in Corso...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 text-white" />
                    <span>Azzera Dati di Simulazione</span>
                  </>
                )}
              </Button>
            </div>

            {purgeStats && (
              <div className="bg-slate-950/90 border border-red-500/30 p-3 rounded-xl mt-3 text-xs space-y-1.5 font-mono">
                <div className="text-red-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Risultato Azzeramento Archivi di Test:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-slate-300 text-[11px]">
                  {Object.entries(purgeStats).map(([label, count]) => (
                    <div key={label} className="flex justify-between border-b border-slate-900 pb-0.5">
                      <span className="text-slate-400 truncate mr-2">{label}:</span>
                      <span className="font-bold text-red-300">{count} eliminati</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MESSAGGI DI STATO / ERRORE */}
          {statusMessage && (
            <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* MODALE DI CONFERMA DIRETTA PRIMA DI SOVRASCRIVERE/RIPRISTINARE */}
        {showConfirmRestore && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10010] flex items-center justify-center p-4">
            <div className="bg-[#020617] border border-amber-500 text-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h4 className="text-base font-black uppercase tracking-tight">Conferma Ripristino</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Stai per sovrascrivere o riallineare i dati attuali con il file di backup selezionato: 
                <strong className="block text-white mt-1 bg-slate-900 p-2 rounded border border-slate-800 font-mono">
                  {selectedFile?.name}
                </strong>
                Vuoi procedere con il caricamento nel database?
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowConfirmRestore(false)}
                  className="text-slate-400 hover:text-white text-xs h-10 px-4 rounded-xl"
                >
                  Annulla
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider h-10 px-5 rounded-xl shadow-lg shadow-amber-950/60"
                >
                  Conferma e Ripristina
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DI CONFERMA PER AZZERAMENTO SIMULAZIONI */}
        {showConfirmPurge && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10010] flex items-center justify-center p-4">
            <div className="bg-[#020617] border border-red-600 text-slate-200 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertOctagon className="h-7 w-7 shrink-0 text-red-500" />
                <div>
                  <h4 className="text-base font-black uppercase tracking-tight text-white">Conferma Azzeramento Simulazioni</h4>
                  <span className="text-[11px] text-red-400 font-semibold">Operazione di Preparazione al Collaudo Ufficiale</span>
                </div>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  Stai per eliminare definitivamente tutti i dati inseriti durante la fase di test e simulazione:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px] font-mono">
                  <li>Tutti i turni operativi e le reperibilità SOS di prova</li>
                  <li>Tutti i verbali di sopralluogo (1° e 2°), sanzioni e relazioni di servizio</li>
                  <li>Tutti i controlli territoriali, chiamate di centrale, missioni e allarmi radar</li>
                </ul>
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px]">
                  <strong>Garanzia di Sicurezza:</strong> L'Anagrafica Guardie (con scadenze decreti e abilitazioni), la modulistica, i veicoli e l'anagrafe canina <strong>NON</strong> verranno cancellati.
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowConfirmPurge(false)}
                  className="text-slate-400 hover:text-white text-xs h-10 px-4 rounded-xl"
                >
                  Annulla
                </Button>
                <Button
                  type="button"
                  onClick={handleExecutePurgeSimulations}
                  className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider h-10 px-5 rounded-xl shadow-lg shadow-red-950/60 flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Conferma e Azzera Simulazioni
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

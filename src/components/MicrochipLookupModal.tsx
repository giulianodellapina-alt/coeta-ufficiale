import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { capitalizeWords } from "../lib/string-utils";
import { CanineCertificate } from "../types";
import { getOfficialPrintHeaderHtml } from "./ReportHeader";
import { printElementById } from "../lib/utils";
import { 
  PawPrint, Search, Plus, Trash2, Pencil, Calendar, Printer, Camera, Loader2, Check, X, Shield, RefreshCcw, FileText, CheckCircle2, AlertCircle, Phone, Info
} from "lucide-react";
import { format } from "date-fns";

interface MicrochipLookupModalProps {
  userEmail: string;
  userName: string;
  userMatricola?: string;
  isLoggedIn: boolean;
  forceOpenCreateScanner?: boolean;
  forceOpenBulkScanner?: boolean;
  onForceOpenCreateScannerHandled?: () => void;
  onForceOpenBulkScannerHandled?: () => void;
  variant?: "standard" | "yellow";
  isInline?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const MicrochipLookupModal: React.FC<MicrochipLookupModalProps> = ({ 
  userEmail, 
  userName, 
  userMatricola,
  isLoggedIn,
  forceOpenCreateScanner = false,
  forceOpenBulkScanner = false,
  onForceOpenCreateScannerHandled,
  onForceOpenBulkScannerHandled,
  variant = "standard",
  isInline = false,
  open,
  onOpenChange,
  hideTrigger = false
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (val: boolean) => {
    setInternalOpen(val);
    if (onOpenChange) onOpenChange(val);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [certificates, setCertificates] = useState<CanineCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CanineCertificate | null>(null);
  
  // Form state for creating/editing
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  // Bulk Scanner State variables
  const [isBulkScannerOpen, setIsBulkScannerOpen] = useState(false);
  const [isBulkExtracting, setIsBulkExtracting] = useState(false);
  const [bulkExtractionError, setBulkExtractionError] = useState("");
  const [extractedComune, setExtractedComune] = useState("");
  const [extractedRows, setExtractedRows] = useState<any[]>([]);
  const [importingRows, setImportingRows] = useState<{ [key: number]: boolean }>({});
  const [importedRowsIndices, setImportedRowsIndices] = useState<number[]>([]);

  // Form Fields
  const [proprietarioCognome, setProprietarioCognome] = useState("");
  const [proprietarioNome, setProprietarioNome] = useState("");
  const [proprietarioLuogoNascita, setProprietarioLuogoNascita] = useState("");
  const [proprietarioDataNascita, setProprietarioDataNascita] = useState("");
  const [proprietarioCodiceFiscale, setProprietarioCodiceFiscale] = useState("");
  const [proprietarioIndirizzo, setProprietarioIndirizzo] = useState("");
  const [proprietarioTelefono, setProprietarioTelefono] = useState("");

  const [caneNome, setCaneNome] = useState("");
  const [caneDataNascita, setCaneDataNascita] = useState("");
  const [caneSesso, setCaneSesso] = useState("Maschio");
  const [caneRazza, setCaneRazza] = useState("");
  const [caneMantello, setCaneMantello] = useState("");
  const [caneTaglia, setCaneTaglia] = useState("");
  const [canePelo, setCanePelo] = useState("");
  const [caneSegniParticolari, setCaneSegniParticolari] = useState("");
  const [caneNote, setCaneNote] = useState("");
  const [caneMicrochip, setCaneMicrochip] = useState("");
  const [caneImpiantatoIl, setCaneImpiantatoIl] = useState("");
  const [caneSitoImpianto, setCaneSitoImpianto] = useState("Collo Sinistro");

  const [rifArchivioFisico, setRifArchivioFisico] = useState("");
  const [matricolaCertificato, setMatricolaCertificato] = useState("");
  const [luogoDetenzione, setLuogoDetenzione] = useState("");
  const [veterinarioNome, setVeterinarioNome] = useState("");
  const [dataRilascio, setDataRilascio] = useState("");
  const [dataMovimento, setDataMovimento] = useState("");

  // Physical file upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync index canine_certificates
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "canine_certificates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CanineCertificate[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CanineCertificate);
      });
      setCertificates(list);
      setLoading(false);
    }, (error) => {
      console.error("Errore sinc. certificati canini:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (forceOpenCreateScanner) {
      openCreateForm();
      onForceOpenCreateScannerHandled?.();
    }
  }, [forceOpenCreateScanner]);

  useEffect(() => {
    if (forceOpenBulkScanner) {
      setIsOpen(false);
      setIsBulkScannerOpen(true);
      onForceOpenBulkScannerHandled?.();
    }
  }, [forceOpenBulkScanner]);

  // Filter local certificates based on search
  const filteredCertificates = certificates.filter((cert) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      cert.caneMicrochip?.toLowerCase().includes(term) ||
      cert.caneNome?.toLowerCase().includes(term) ||
      cert.proprietarioCognome?.toLowerCase().includes(term) ||
      cert.proprietarioNome?.toLowerCase().includes(term) ||
      cert.rifArchivioFisico?.toLowerCase().includes(term) ||
      cert.caneRazza?.toLowerCase().includes(term)
    );
  });

  // Reset form helper
  const resetForm = () => {
    setProprietarioCognome("");
    setProprietarioNome("");
    setProprietarioLuogoNascita("");
    setProprietarioDataNascita("");
    setProprietarioCodiceFiscale("");
    setProprietarioIndirizzo("");
    setProprietarioTelefono("");
    setCaneNome("");
    setCaneDataNascita("");
    setCaneSesso("Maschio");
    setCaneRazza("");
    setCaneMantello("");
    setCaneTaglia("");
    setCanePelo("");
    setCaneSegniParticolari("");
    setCaneNote("");
    setCaneMicrochip("");
    setCaneImpiantatoIl("");
    setCaneSitoImpianto("Collo Sinistro");
    setRifArchivioFisico("");
    setMatricolaCertificato("");
    setLuogoDetenzione("");
    setVeterinarioNome("");
    setDataRilascio("");
    setDataMovimento("");
    setExtractionError("");
    setExtractionSuccess(false);
  };

  const openCreateForm = () => {
    resetForm();
    setFormMode("create");
    setIsOpen(false); // Chiude temporaneamente la lista per evitare conflitti di Dialog/Focus Trap
    setIsFormOpen(true);
  };

  const openEditForm = (cert: CanineCertificate) => {
    setProprietarioCognome(cert.proprietarioCognome || "");
    setProprietarioNome(cert.proprietarioNome || "");
    setProprietarioLuogoNascita(cert.proprietarioLuogoNascita || "");
    setProprietarioDataNascita(cert.proprietarioDataNascita || "");
    setProprietarioCodiceFiscale(cert.proprietarioCodiceFiscale || "");
    setProprietarioIndirizzo(cert.proprietarioIndirizzo || "");
    setProprietarioTelefono(cert.proprietarioTelefono || "");
    setCaneNome(cert.caneNome || "");
    setCaneDataNascita(cert.caneDataNascita || "");
    setCaneSesso(cert.caneSesso || "Maschio");
    setCaneRazza(cert.caneRazza || "");
    setCaneMantello(cert.caneMantello || "");
    setCaneTaglia(cert.caneTaglia || "");
    setCanePelo(cert.canePelo || "");
    setCaneSegniParticolari(cert.caneSegniParticolari || "");
    setCaneNote(cert.caneNote || "");
    setCaneMicrochip(cert.caneMicrochip || "");
    setCaneImpiantatoIl(cert.caneImpiantatoIl || "");
    setCaneSitoImpianto(cert.caneSitoImpianto || "Collo Sinistro");
    setRifArchivioFisico(cert.rifArchivioFisico || "");
    setMatricolaCertificato(cert.matricolaCertificato || "");
    setLuogoDetenzione(cert.luogoDetenzione || "");
    setVeterinarioNome(cert.veterinarioNome || "");
    setDataRilascio(cert.dataRilascio || "");
    setDataMovimento(cert.dataMovimento || "");
    setExtractionError("");
    setExtractionSuccess(false);
    
    setFormMode("edit");
    setSelectedCert(cert);
    setIsOpen(false); // Chiude temporaneamente la lista per evitare conflitti di Dialog/Focus Trap
    setIsFormOpen(true);
  };

  // Safe file scanner OCR using Gemini
  const handleFileScanAndAutofill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionError("");
    setExtractionSuccess(false);

    try {
      // Direct base64 conversion
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        try {
          const response = await fetch("/api/extract-microchip", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ base64Image }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Errore sconosciuto di estrazione");
          }

          const data = await response.json();

          // Prepopulate and autofill fields nicely!
          if (data.proprietarioCognome) setProprietarioCognome(data.proprietarioCognome);
          if (data.proprietarioNome) setProprietarioNome(data.proprietarioNome);
          if (data.proprietarioLuogoNascita) setProprietarioLuogoNascita(data.proprietarioLuogoNascita);
          if (data.proprietarioDataNascita) setProprietarioDataNascita(data.proprietarioDataNascita);
          if (data.proprietarioCodiceFiscale) setProprietarioCodiceFiscale(data.proprietarioCodiceFiscale);
          if (data.proprietarioIndirizzo) setProprietarioIndirizzo(data.proprietarioIndirizzo);
          if (data.proprietarioTelefono) setProprietarioTelefono(data.proprietarioTelefono);

          if (data.caneNome) setCaneNome(data.caneNome);
          if (data.caneDataNascita) setCaneDataNascita(data.caneDataNascita);
          if (data.caneSesso) setCaneSesso(data.caneSesso);
          if (data.caneRazza) setCaneRazza(data.caneRazza);
          if (data.caneMantello) setCaneMantello(data.caneMantello);
          if (data.caneTaglia) setCaneTaglia(data.caneTaglia);
          if (data.canePelo) setCanePelo(data.canePelo);
          if (data.caneSegniParticolari) setCaneSegniParticolari(data.caneSegniParticolari);
          if (data.caneNote) setCaneNote(data.caneNote);
          if (data.caneMicrochip) setCaneMicrochip(data.caneMicrochip);
          if (data.caneImpiantatoIl) setCaneImpiantatoIl(data.caneImpiantatoIl);
          if (data.caneSitoImpianto) setCaneSitoImpianto(data.caneSitoImpianto);

          if (data.rifArchivioFisico) setRifArchivioFisico(data.rifArchivioFisico);
          if (data.matricolaCertificato) setMatricolaCertificato(data.matricolaCertificato);
          if (data.luogoDetenzione) setLuogoDetenzione(data.luogoDetenzione);
          if (data.veterinarioNome) setVeterinarioNome(data.veterinarioNome);
          if (data.dataRilascio) setDataRilascio(data.dataRilascio);
          if (data.dataMovimento) setDataMovimento(data.dataMovimento);

          setExtractionSuccess(true);
        } catch (err: any) {
          console.error("Extraction request failed:", err);
          setExtractionError(err.message || "Errore durante l'interpretazione del documento. Riprova o compila manualmente.");
        } finally {
          setIsExtracting(false);
        }
      };

      reader.onerror = () => {
        setExtractionError("Impossibile leggere il file.");
        setIsExtracting(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setExtractionError("Errore durante il caricamento.");
      setIsExtracting(false);
    }
  };

  // Safe bulk file scanner OCR using Gemini
  const handleBulkFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkExtracting(true);
    setBulkExtractionError("");
    setExtractedRows([]);
    setExtractedComune("");
    setImportedRowsIndices([]);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        try {
          const response = await fetch("/api/extract-control-sheet", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ base64Image }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Errore sconosciuto di estrazione");
          }

          const data = await response.json();
          setExtractedComune(data.comune || "");
          setExtractedRows(data.controlli || []);
        } catch (err: any) {
          console.error("Bulk extraction request failed:", err);
          setBulkExtractionError(err.message || "Errore durante l'interpretazione del registro. Assicurati che l'immagine sia nitida e ben illuminata.");
        } finally {
          setIsBulkExtracting(false);
        }
      };

      reader.onerror = () => {
        setBulkExtractionError("Impossibile leggere il file.");
        setIsBulkExtracting(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setBulkExtractionError("Errore durante il caricamento.");
      setIsBulkExtracting(false);
    }
  };

  // Import single row from extracted bulk rows
  const handleImportRow = async (row: any, index: number) => {
    try {
      setImportingRows(prev => ({ ...prev, [index]: true }));

      // Clean microchip
      const cleanedMicrochip = row.microchip.trim().replace(/\s+/g, "");
      
      // Double check if already imported or exists
      const alreadyExists = certificates.some(c => c.caneMicrochip.replace(/\s+/g, "") === cleanedMicrochip);
      if (alreadyExists) {
        alert("Questo microchip è già presente nel database!");
        setImportedRowsIndices(prev => [...prev, index]);
        return;
      }

      const dataPayload = {
        proprietarioCognome: (row.proprietarioCognome || "SCONOSCIUTO").trim().toUpperCase(),
        proprietarioNome: (row.proprietarioNome || "").trim(),
        proprietarioLuogoNascita: "",
        proprietarioDataNascita: "",
        proprietarioCodiceFiscale: "",
        proprietarioIndirizzo: "",
        proprietarioTelefono: "",
        caneNome: (row.nomeCane || "SCONOSCIUTO").trim().toUpperCase(),
        caneDataNascita: "",
        caneSesso: "Maschio",
        caneRazza: (row.razza || "Meticcio").trim(),
        caneMantello: "",
        caneTaglia: "",
        canePelo: "",
        caneSegniParticolari: "",
        caneNote: `Trascritto da Registro Controlli (${extractedComune || "Comune N/D"}). Doc: ${row.documento || "Nessuno"}. Guardie: ${row.guardie?.join(", ") || "Nessuna"}.`.trim(),
        caneMicrochip: cleanedMicrochip,
        caneImpiantatoIl: "",
        caneSitoImpianto: "Collo Sinistro",
        rifArchivioFisico: "REGISTRO_CONTROLLI",
        matricolaCertificato: "",
        luogoDetenzione: extractedComune || "",
        veterinarioNome: "",
        dataRilascio: new Date().toISOString().split('T')[0],
        dataMovimento: "",
        createdAt: serverTimestamp(),
        createdBy: userEmail || "anonymous",
        createdByGuardName: userName || "Operatore"
      };

      await addDoc(collection(db, "canine_certificates"), dataPayload);

      try {
        await addDoc(collection(db, "access_logs"), {
          timestamp: serverTimestamp(),
          action: `Importato Certificato Cane da Registro: ${dataPayload.caneNome} - MC: ${dataPayload.caneMicrochip}`,
          type: "create",
          userMatricola: userMatricola || "N/D",
          userName: userName || "Utente Ospite",
          userId: userEmail || "anonymous",
          details: { context: "Certificato Canino", microchip: dataPayload.caneMicrochip, method: "bulk_import" }
        });
      } catch (le) {
        console.warn("Log update failed:", le);
      }

      setImportedRowsIndices(prev => [...prev, index]);
    } catch (err: any) {
      console.error("Errore importazione riga:", err);
      alert("Errore durante l'importazione: " + err.message);
    } finally {
      setImportingRows(prev => ({ ...prev, [index]: false }));
    }
  };

  // Import all non-existing and non-imported rows
  const handleImportAll = async () => {
    let count = 0;
    for (let i = 0; i < extractedRows.length; i++) {
      const row = extractedRows[i];
      const cleanedMicrochip = row.microchip.trim().replace(/\s+/g, "");
      const alreadyExists = certificates.some(c => c.caneMicrochip.replace(/\s+/g, "") === cleanedMicrochip);
      const alreadyImported = importedRowsIndices.includes(i);
      
      if (!alreadyExists && !alreadyImported && cleanedMicrochip.length >= 10) {
        await handleImportRow(row, i);
        count++;
      }
    }
    alert(`Importazione completata! ${count} nuovi certificati aggiunti.`);
  };

  // Handle Save
  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caneMicrochip || !proprietarioCognome || !caneNome) {
      alert("I campi Microchip, Cognome Proprietario e Nome Cane sono obbligatori.");
      return;
    }

    try {
      const dataPayload: Omit<CanineCertificate, "id"> = {
        proprietarioCognome: proprietarioCognome.trim().toUpperCase(),
        proprietarioNome: proprietarioNome.trim(),
        proprietarioLuogoNascita: proprietarioLuogoNascita.trim(),
        proprietarioDataNascita: proprietarioDataNascita,
        proprietarioCodiceFiscale: proprietarioCodiceFiscale.trim().toUpperCase(),
        proprietarioIndirizzo: proprietarioIndirizzo.trim(),
        proprietarioTelefono: proprietarioTelefono.trim(),
        caneNome: caneNome.trim().toUpperCase(),
        caneDataNascita: caneDataNascita,
        caneSesso: caneSesso,
        caneRazza: caneRazza.trim(),
        caneMantello: caneMantello.trim(),
        caneTaglia: caneTaglia.trim(),
        canePelo: canePelo.trim(),
        caneSegniParticolari: caneSegniParticolari.trim(),
        caneNote: caneNote.trim(),
        caneMicrochip: caneMicrochip.trim().replace(/\s+/g, ""), // remove spaces
        caneImpiantatoIl: caneImpiantatoIl,
        caneSitoImpianto: caneSitoImpianto.trim(),
        rifArchivioFisico: rifArchivioFisico.trim().toUpperCase(),
        matricolaCertificato: matricolaCertificato.trim(),
        luogoDetenzione: luogoDetenzione.trim(),
        veterinarioNome: veterinarioNome.trim(),
        dataRilascio: dataRilascio,
        dataMovimento: dataMovimento,
        createdAt: formMode === "create" ? serverTimestamp() : selectedCert?.createdAt || new Date(),
        createdBy: userEmail || "anonymous",
        createdByGuardName: userName || "Operatore"
      };

      if (formMode === "create") {
        await addDoc(collection(db, "canine_certificates"), dataPayload);
        // Logging trace
        try {
          await addDoc(collection(db, "access_logs"), {
            timestamp: serverTimestamp(),
            action: `Registrato Certificato Cane: ${dataPayload.caneNome} - MC: ${dataPayload.caneMicrochip}`,
            type: "create",
            userMatricola: userMatricola || "N/D",
            userName: userName || "Utente Ospite",
            userId: userEmail || "anonymous",
            details: { context: "Certificato Canino", microchip: dataPayload.caneMicrochip }
          });
        } catch (le) {
          console.warn("Log update failed:", le);
        }
      } else if (formMode === "edit" && selectedCert) {
        const docRef = doc(db, "canine_certificates", selectedCert.id);
        await updateDoc(docRef, dataPayload);
        try {
          await addDoc(collection(db, "access_logs"), {
            timestamp: serverTimestamp(),
            action: `Modificato Certificato Cane: ${dataPayload.caneNome} - MC: ${dataPayload.caneMicrochip}`,
            type: "update",
            userMatricola: userMatricola || "N/D",
            userName: userName || "Utente Ospite",
            userId: userEmail || "anonymous",
            details: { context: "Certificato Canino", microchip: dataPayload.caneMicrochip }
          });
        } catch (le) {
          console.warn("Log update failed:", le);
        }
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Errore durante il salvataggio: " + err.message);
    }
  };

  // Delete certificate
  const handleDeleteCertificate = async (cert: CanineCertificate) => {
    if (!window.confirm(`Sei sicuro di voler eliminare definitivamente il certificato del cane ${cert.caneNome}?`)) return;

    try {
      await deleteDoc(doc(db, "canine_certificates", cert.id));
      try {
        await addDoc(collection(db, "access_logs"), {
          timestamp: serverTimestamp(),
          action: `Eliminato Certificato Cane: ${cert.caneNome} (MC: ${cert.caneMicrochip})`,
          type: "delete",
          userMatricola: userMatricola || "N/D",
          userName: userName || "Utente Ospite",
          userId: userEmail || "anonymous",
          details: { context: "Certificato Canino", microchip: cert.caneMicrochip }
        });
      } catch (le) {
        console.warn("Log update failed:", le);
      }
      setSelectedCert(null);
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    }
  };

  // Elegant Print form layout function
  const handlePrintCertificate = (cert: CanineCertificate) => {
    try {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Certificato di Iscrizione - ${cert.caneNome || 'Cane'}</title>
              <style>
                @media print {
                  @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
                  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; line-height: 1.35; padding: 0; margin: 0; background-color: white !important; }
                  .no-print-bar { display: none !important; }
                }
                body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; line-height: 1.35; padding: 20px; margin: 0; background-color: #f8fafc; }
                .no-print-bar {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 12px 20px;
                  background-color: #0f172a;
                  color: white;
                  border-radius: 10px;
                  margin-bottom: 20px;
                  font-family: ui-sans-serif, system-ui, sans-serif;
                }
                .section { margin-bottom: 10px; border: 1px solid #cbd5e0; padding: 8px 12px; border-radius: 6px; background-color: white; page-break-inside: avoid; }
                .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e0; padding-bottom: 2px; margin-bottom: 6px; color: #2b6cb0; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 9pt; }
                .grid-full { grid-column: span 2; }
                .label { font-weight: bold; color: #4a5568; text-transform: uppercase; font-size: 7.5pt; display: block; }
                .value { font-size: 9.5pt; color: #1a202c; font-family: monospace; font-weight: bold; }
                .footer { margin-top: 20px; text-align: right; font-size: 8.5pt; color: #718096; page-break-inside: avoid; }
                .microchip-badge { text-align: center; background-color: #ebf8ff; border: 1.5px dashed #2b6cb0; padding: 6px; margin-bottom: 10px; border-radius: 6px; page-break-inside: avoid; }
                .microchip-badge .val { font-size: 14pt; font-weight: bold; font-family: monospace; color: #2b6cb0; letter-spacing: 2px; }
              </style>
            </head>
            <body>
              <div class="no-print-bar">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 12px; font-weight: bold; color: #38bdf8; text-transform: uppercase;">
                    ANTEPRIMA CERTIFICATO ANAGRAFE CANINA
                  </span>
                  <span style="font-size: 11px; color: #94a3b8;">
                    Se la finestra di stampa non si apre automaticamente, premi "Avvia Stampa".
                  </span>
                </div>
                <div style="display: flex; gap: 10px;">
                  <button onclick="window.focus(); window.print();" style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px; text-transform: uppercase;">
                    AVVIA STAMPA A4 🖨
                  </button>
                  <button onclick="window.close();" style="padding: 8px 16px; background-color: #e11d48; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px; text-transform: uppercase;">
                    CHIUDI ✕
                  </button>
                </div>
              </div>

              ${getOfficialPrintHeaderHtml("ANAGRAFE CANINA REGIONALE", "REGIONE TOSCANA - CERTIFICATO DI ISCRIZIONE BANCA DATI CANINA")}

              <div class="microchip-badge">
                <span class="label">MICROCHIP ANAGRAFICO CANE</span>
                <div class="val">${cert.caneMicrochip || "NON PRESENTE"}</div>
                ${cert.rifArchivioFisico ? `<p style="margin: 4px 0 0 0; font-size: 8.5pt; font-weight: bold; color: #4a5568;">RIFERIMENTO ARCHIVIO FISICO: ${cert.rifArchivioFisico}</p>` : ""}
              </div>

              <div class="section">
                <div class="section-title">Dati del Detentore / Proprietario</div>
                <div class="grid">
                  <div>
                    <span class="label">Cognome / Ragione Sociale</span>
                    <span class="value">${cert.proprietarioCognome || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Nome</span>
                    <span class="value">${cert.proprietarioNome || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Codice Fiscale</span>
                    <span class="value">${cert.proprietarioCodiceFiscale || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Recapito Telefonico</span>
                    <span class="value">${cert.proprietarioTelefono || "N/D"}</span>
                  </div>
                  <div class="grid-full">
                    <span class="label">Residenza / Indirizzo</span>
                    <span class="value">${cert.proprietarioIndirizzo || "N/D"}</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Dati del Cane</div>
                <div class="grid">
                  <div>
                    <span class="label">Nome Cane</span>
                    <span class="value">${cert.caneNome || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Razza</span>
                    <span class="value">${cert.caneRazza || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Sesso</span>
                    <span class="value">${cert.caneSesso || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Data Nascita</span>
                    <span class="value">${cert.caneDataNascita ? cert.caneDataNascita : "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Mantello</span>
                    <span class="value">${cert.caneMantello || "-"}</span>
                  </div>
                  <div>
                    <span class="label">Taglia / Pelo</span>
                    <span class="value">${cert.caneTaglia || "-"} / ${cert.canePelo || "-"}</span>
                  </div>
                  <div class="grid-full">
                    <span class="label">Segni Particolari</span>
                    <span class="value">${cert.caneSegniParticolari || "Nessuno"}</span>
                  </div>
                  <div class="grid-full">
                    <span class="label">Note / Dettagli aggiuntivi</span>
                    <span class="value">${cert.caneNote || "Nessuna nota aggiunta"}</span>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Dettagli del Registro</div>
                <div class="grid">
                  <div>
                    <span class="label">Veterinario che ha eseguito l'impianto / rilascio</span>
                    <span class="value">${cert.veterinarioNome || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Sito di Impianto chip</span>
                    <span class="value">${cert.caneSitoImpianto || "Collo Sinistro"}</span>
                  </div>
                  <div>
                    <span class="label">Data Impianto</span>
                    <span class="value">${cert.caneImpiantatoIl || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Matricola / Numero Certificato</span>
                    <span class="value">${cert.matricolaCertificato || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Luogo di Detenzione Animale</span>
                    <span class="value">${cert.luogoDetenzione || "N/D"}</span>
                  </div>
                  <div>
                    <span class="label">Data Rilascio</span>
                    <span class="value">${cert.dataRilascio || "N/D"}</span>
                  </div>
                </div>
              </div>

              <div class="footer">
                <p>Documento stampato dall'archivio della Vigilanza Ambientale il ${new Date().toLocaleString('it-IT')}</p>
                <p style="margin-top:20px;">Firma dell'operatore: ____________________________________</p>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(function() {
                    try {
                      window.focus();
                      window.print();
                    } catch (e) {
                      console.error("Print trigger error:", e);
                    }
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }
    } catch (e) {
      console.warn("Popup print blocked or failed, using portal fallback:", e);
    }

    // Fallback if window.open fails or is blocked
    printElementById("printable-canine-cert", `Certificato_Microchip_${cert.caneMicrochip || cert.caneNome}`);
  };

  const renderInnerContent = () => {
    return (
      <>
        <DialogHeader className="p-4 md:p-6 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-2.5 rounded-xl">
                <PawPrint className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-normal text-white uppercase italic tracking-tight">Ricerche Microchip & Anagrafe Canina</DialogTitle>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                  Portale Pubblico Aperto a Tutti &bull; Nucleo Vigilanza Bertolucci
                </p>
              </div>
            </div>
            
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsBulkScannerOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 uppercase font-normal text-xs h-10 px-4 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-emerald-400" /> Scansione Registro Controlli
                </Button>
                <Button
                  onClick={openCreateForm}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase font-normal text-xs h-10 px-4 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Registra Nuovo Certificato
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Dialog Main Content Grid */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left side list pane */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-1/2 md:h-full bg-slate-950/20">
            
            {/* Search input field bar */}
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca Microchip, Nome o Cognome..."
                  className="bg-slate-900 border-slate-800 pl-10 pr-4 h-11 text-xs italic text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-2 pl-1">
                Corrispondenze trovate: <span className="font-bold text-emerald-400">{filteredCertificates.length}</span> certificati
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-2">
                  <Loader2 className="h-6 w-6 text-slate-600 animate-spin" />
                  <span className="text-xs text-slate-500">Lettura Archivio...</span>
                </div>
              ) : filteredCertificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-2 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-600" />
                  <span className="text-xs text-slate-400 font-bold">Nessun certificato in archivio</span>
                  <p className="text-[10px] text-slate-500 max-w-xs uppercase">Raffina la ricerca per codice microchip intero o parziale.</p>
                </div>
              ) : (
                filteredCertificates.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                      selectedCert?.id === cert.id 
                        ? "bg-slate-900 border-emerald-500/45 shadow justify-start" 
                        : "border-slate-800/40 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                        <PawPrint className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white uppercase italic tracking-tight truncate">Cane: {cert.caneNome}</div>
                        <div className="text-[11px] font-mono text-emerald-400 tracking-wider truncate font-semibold">Chip: {cert.caneMicrochip}</div>
                        <div className="text-[10px] text-slate-400 truncate uppercase tracking-widest mt-0.5">Prop: {cert.proprietarioCognome} {cert.proprietarioNome}</div>
                      </div>
                    </div>
                    {cert.rifArchivioFisico && (
                      <div className="hidden lg:flex flex-col items-end shrink-0 pl-1 text-[9px] text-[#047857] font-black uppercase bg-emerald-900/10 border border-emerald-500/10 px-2 py-0.5 rounded-md">
                        Binder: {cert.rifArchivioFisico}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right side detail pane */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col h-1/2 md:h-full bg-slate-950/40 custom-scrollbar">
            {selectedCert ? (
              <div id="printable-canine-cert" className="space-y-6">
                {/* Top Buttons Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="text-xs text-slate-400 uppercase tracking-widest">
                    Certificato ID: <span className="text-slate-200 font-mono text-xs font-bold">{selectedCert.id.substring(0, 8)}...</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handlePrintCertificate(selectedCert)}
                      className="bg-slate-900 hover:bg-slate-800 text-white uppercase font-normal text-xs border border-slate-800 rounded-xl px-3 h-9 flex items-center gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" /> Stampa
                    </Button>
                    {isLoggedIn && (
                      <>
                        <Button
                          onClick={() => openEditForm(selectedCert)}
                          className="bg-slate-900 hover:bg-slate-800 text-yellow-500 hover:text-yellow-400 border border-yellow-500/20 uppercase font-normal text-xs rounded-xl px-3 h-9 flex items-center gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifica
                        </Button>
                        <Button
                          onClick={() => handleDeleteCertificate(selectedCert)}
                          variant="destructive"
                          className="uppercase font-normal text-xs rounded-xl px-3 h-9 flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Elimina
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Certificate visual mockup card container */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 md:p-6 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px]" />
                  
                  {/* Header doc mock */}
                  <div className="text-center border-b border-slate-800 pb-3 mb-6">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Archivio Certificati Iscrizioni</div>
                    <h3 className="text-base font-bold text-white uppercase italic tracking-normal mt-1">Anagrafe Canina Regionale (Mod. Toscana)</h3>
                    <p className="text-[9px] text-slate-500 uppercase mt-0.5">Controllo di Vigilanza Ambientale della Provincia</p>
                  </div>

                  {/* Microchip Badge Box */}
                  <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-4 text-center shadow-inner mb-6 relative group">
                    <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest pl-1">Numero Microchip cane</div>
                    <div className="text-2xl md:text-3xl font-black font-mono tracking-[0.1em] text-white my-1 cursor-pointer select-all select-none">
                      {selectedCert.caneMicrochip}
                    </div>
                    {selectedCert.rifArchivioFisico && (
                      <div className="text-xs text-amber-500 uppercase italic font-bold tracking-widest mt-1">
                        Riferimento Faldone Fisico: "{selectedCert.rifArchivioFisico}"
                      </div>
                    )}
                  </div>

                  {/* Double grid details layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    
                    {/* Owner Column Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-1">DATI DEL DETENTORE</h4>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Cognome e Nome</span>
                        <p className="text-sm font-bold text-slate-200">
                          {selectedCert.proprietarioCognome} {selectedCert.proprietarioNome}
                        </p>
                      </div>

                      {selectedCert.proprietarioCodiceFiscale && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Codice Fiscale</span>
                          <p className="text-sm font-mono text-slate-300">{selectedCert.proprietarioCodiceFiscale}</p>
                        </div>
                      )}

                      {selectedCert.proprietarioIndirizzo && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Indirizzo Residenza</span>
                          <p className="text-sm text-slate-300">{selectedCert.proprietarioIndirizzo}</p>
                        </div>
                      )}

                      {selectedCert.proprietarioTelefono && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recapito Telefonico</span>
                          <p className="text-sm text-emerald-400 font-bold flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {selectedCert.proprietarioTelefono}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dog Column Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-1">DATI DEL CANE</h4>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Nome Cane</span>
                        <p className="text-sm font-black text-white italic">{selectedCert.caneNome}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Razza</span>
                          <p className="text-xs text-slate-300 truncate">{selectedCert.caneRazza || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Sesso</span>
                          <p className="text-xs text-slate-200 uppercase font-black tracking-widest">{selectedCert.caneSesso}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {selectedCert.caneDataNascita && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Nato il</span>
                            <p className="text-xs text-slate-300">{selectedCert.caneDataNascita}</p>
                          </div>
                        )}
                        {selectedCert.caneMantello && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Mantello</span>
                            <p className="text-xs text-slate-300 truncate">{selectedCert.caneMantello}</p>
                          </div>
                        )}
                        {selectedCert.caneTaglia && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Taglia</span>
                            <p className="text-xs text-slate-300 truncate">{selectedCert.caneTaglia}</p>
                          </div>
                        )}
                      </div>

                      {selectedCert.caneSegniParticolari && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Segni Particolari</span>
                          <p className="text-xs text-slate-300">{selectedCert.caneSegniParticolari}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Registry footer layout */}
                  <div className="border-t border-slate-800/80 mt-6 pt-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Impianto / Luogo</span>
                      <p className="text-slate-300 text-xs font-semibold">{selectedCert.caneSitoImpianto || "Collo Sinistro"}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{selectedCert.caneImpiantatoIl ? `Impianto: ${selectedCert.caneImpiantatoIl}` : ""}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Emettitore / Registro</span>
                      <p className="text-slate-300 text-xs truncate">{selectedCert.veterinarioNome || "Dott. Veterinario ASL / Libero"}</p>
                      <p className="text-[10px] text-slate-400">{selectedCert.matricolaCertificato ? `Matricola Cert: ${selectedCert.matricolaCertificato}` : ""}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Rilascio e Movimento</span>
                      <p className="text-xs text-slate-400">{selectedCert.dataRilascio ? `Rilascio: ${selectedCert.dataRilascio}` : "N/D"}</p>
                      <p className="text-xs text-slate-400">{selectedCert.dataMovimento ? `Movimento: ${selectedCert.dataMovimento}` : "N/D"}</p>
                    </div>
                  </div>

                  {/* Creator tags info */}
                  <div className="border-t border-slate-800/40 mt-4 pt-3 flex flex-col md:flex-row justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                    <span>Registrato da: {selectedCert.createdByGuardName || selectedCert.createdBy || "Ospite"}</span>
                    {selectedCert.createdAt?.toDate ? (
                      <span>Data Sincr: {format(selectedCert.createdAt.toDate(), "dd/MM/yyyy HH:mm")}</span>
                    ) : (
                      <span>Autocompilato tramite AI</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <PawPrint className="h-16 w-16 text-slate-800 animate-pulse mb-4" />
                <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Archivio Digitale Cani</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 uppercase">
                  Seleziona un cane dall'elenco a sinistra per visualizzarne la scheda certificata o inserisci un termine di ricerca per trovare un microchip specifico.
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Dynamic Radar Trigger style in the actions grid */}
      {!isInline && !hideTrigger && (variant === "standard" ? (
        <button
          onClick={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          id="btn-microchip-trigger"
          className="h-28 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 hover:from-emerald-900/40 border-2 border-emerald-500/20 hover:border-emerald-500/50 text-white rounded-2xl flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 group shadow-xl cursor-pointer w-full"
        >
          <PawPrint className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs uppercase font-black tracking-wider text-center leading-tight">
            Archivio <br /> Microchip
          </span>
        </button>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          id="btn-microchip-trigger-yellow"
          className="h-28 bg-[#047857]/20 hover:bg-[#047857]/40 border-2 border-emerald-500/35 text-yellow-400 rounded-2xl flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 group shadow-xl cursor-pointer w-full"
        >
          <PawPrint className="h-6 w-6 text-yellow-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs uppercase font-black tracking-wider text-center leading-tight text-yellow-400">
            ARCHIVIO <br /> MICROCHIP
          </span>
        </button>
      ))}

      {isInline ? (
        <div className="flex flex-col h-[78vh] w-full bg-[#020617] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {renderInnerContent()}
        </div>
      ) : (
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
          }} 
        >
          <DialogContent className="bg-[#020617] border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden w-[95vw] h-[92vh] md:max-w-6xl md:h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {renderInnerContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Scanner Dialog */}
      <Dialog 
        open={isBulkScannerOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsBulkScannerOpen(false);
            if (!isInline) setIsOpen(true); // Riapre la lista principale quando si chiude il bulk scanner
          }
        }}
      >
        <DialogContent className="bg-[#020617] border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden w-[95vw] h-[92vh] md:max-w-5xl md:h-[88vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader className="p-4 md:p-6 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-normal text-white uppercase italic tracking-tight flex items-center gap-2">
                    Scansione Registro Controlli
                  </DialogTitle>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                    ESTRAZIONE ED IMPORTAZIONE AUTOMATICA DA FOGLI DI SERVIZIO SUL CAMPO
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setIsBulkScannerOpen(false);
                  setIsOpen(true);
                }}
                variant="ghost" 
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* If not extracting and no rows, show upload area */}
            {!isBulkExtracting && extractedRows.length === 0 && (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-10 bg-slate-950/40 text-center transition-all min-h-[40vh] relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBulkFileScan}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="bg-slate-900 p-4 rounded-full border border-slate-800 group-hover:border-emerald-500/30 transition-colors mb-4">
                  <Camera className="h-10 w-10 text-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Trascina o Seleziona la Scansione</h3>
                <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
                  Carica una foto nitida o una scansione del foglio registro dei controlli cartacei sul campo. L'AI estrarrà l'anagrafica, i microchip, la razza e le guardie.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3 text-[10px] font-mono text-slate-500 uppercase">
                  <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">Supporto Scrittura a Mano</span>
                  <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">Cattura Righe Multiple</span>
                  <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">Verifica Duplicati Automatica</span>
                </div>
              </div>
            )}

            {/* Loading / Extraction State */}
            {isBulkExtracting && (
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[40vh] space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 bg-emerald-500/10 rounded-full animate-ping" />
                  <div className="absolute w-16 h-16 bg-emerald-500/20 rounded-full animate-pulse" />
                  <div className="bg-emerald-600 p-5 rounded-2xl relative shadow-2xl">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Elaborazione IA in corso...</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                    Gemini 3.5 sta decodificando la scrittura a mano, analizzando la struttura della tabella ed estraendo i dati dei controlli. Attendi qualche secondo...
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {bulkExtractionError && (
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">Errore di Trascrizione</h4>
                  <p className="text-xs text-slate-400 mt-1">{bulkExtractionError}</p>
                </div>
                <div className="flex justify-center">
                  <Button 
                    onClick={() => {
                      setBulkExtractionError("");
                      setExtractedRows([]);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-xs text-white border border-slate-800 rounded-xl px-4 py-2"
                  >
                    Riprova con un'altra immagine
                  </Button>
                </div>
              </div>
            )}

            {/* Extracted Rows Table Display */}
            {extractedRows.length > 0 && (
              <div className="space-y-6">
                {/* Information Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-widest">Località Rilevata:</span>
                      <span className="bg-emerald-950 text-emerald-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md border border-emerald-500/20">
                        {extractedComune || "Comune di Carrara"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                      Rilevati <span className="text-emerald-400 font-bold">{extractedRows.length}</span> controlli sul registro cartaceo.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setExtractedRows([]);
                        setExtractedComune("");
                        setImportedRowsIndices([]);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 uppercase font-normal text-xs rounded-xl px-4 h-10 flex items-center gap-1.5"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> Cambia Foglio
                    </Button>
                    <Button
                      onClick={handleImportAll}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase font-normal text-xs rounded-xl px-4 h-10 flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
                    >
                      <Check className="h-4 w-4" /> Importa Nuovi ({
                        extractedRows.filter((r, i) => {
                          const cleaned = r.microchip.trim().replace(/\s+/g, "");
                          const exists = certificates.some(c => c.caneMicrochip.replace(/\s+/g, "") === cleaned);
                          return !exists && !importedRowsIndices.includes(i);
                        }).length
                      })
                    </Button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                          <th className="p-4">Dati Cane & Razza</th>
                          <th className="p-4">Codice Microchip</th>
                          <th className="p-4">Proprietario & Documento</th>
                          <th className="p-4">Guardie Co-Verbalizzanti</th>
                          <th className="p-4 text-center">Stato / Importazione</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {extractedRows.map((row, index) => {
                          const cleanedMicrochip = row.microchip.trim().replace(/\s+/g, "");
                          const alreadyExists = certificates.some(c => c.caneMicrochip.replace(/\s+/g, "") === cleanedMicrochip);
                          const isImported = importedRowsIndices.includes(index);
                          const isLoading = importingRows[index];

                          return (
                            <tr key={index} className="hover:bg-slate-900/20 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-white uppercase tracking-tight">{row.nomeCane || "SCONOSCIUTO"}</div>
                                <div className="text-[10px] text-slate-400 uppercase italic mt-0.5">{row.razza || "Meticcio"}</div>
                              </td>
                              <td className="p-4 font-mono font-bold text-emerald-400 text-sm tracking-widest">
                                {row.microchip}
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-slate-200">
                                  {row.proprietarioCognome} {row.proprietarioNome}
                                </div>
                                {row.documento && (
                                  <div className="text-[10px] text-slate-500 uppercase mt-0.5">Doc: {row.documento}</div>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  {row.guardie && row.guardie.length > 0 ? (
                                    row.guardie.map((g: string, gi: number) => (
                                      <span key={gi} className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded-md">
                                        {g}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-600 italic">Nessuna</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {alreadyExists ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg">
                                    <Check className="h-3 w-3" /> Già Presente
                                  </span>
                                ) : isImported ? (
                                  <span className="inline-flex items-center gap-1 bg-green-950/40 text-green-400 border border-green-500/20 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg">
                                    <CheckCircle2 className="h-3 w-3" /> Importato
                                  </span>
                                ) : isLoading ? (
                                  <Loader2 className="h-4 w-4 text-emerald-500 animate-spin mx-auto" />
                                ) : (
                                  <Button
                                    onClick={() => handleImportRow(row, index)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold px-3 h-8 rounded-lg cursor-pointer"
                                  >
                                    Importa
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Structured dialog form for Create or Edit certificates */}
      <Dialog 
        open={isFormOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            setIsOpen(true); // Riapre la lista principale quando si chiude il form
          }
        }}
      >
        <DialogContent className="bg-[#020617] border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden w-[95vw] h-[92vh] md:max-w-4xl md:h-[88vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader className="p-4 md:p-6 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-2 rounded-xl">
                  {formMode === 'create' ? <Plus className="h-5 w-5 text-white" /> : <Pencil className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-normal text-white uppercase italic tracking-tight">
                    {formMode === "create" ? "Registra Nuovo Certificato Canino" : "Salva Modifiche Certificato Canino"}
                  </DialogTitle>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                    Database Centrale della Vigilanza Ambientale
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Form main container with scrolling */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/10 space-y-6 custom-scrollbar">
            
            {/* Intelligent AI Autofill scanner uploader section (Only in Create mode!) */}
            {formMode === "create" && (
              <div className="border border-emerald-500/10 bg-emerald-950/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-[20px]" />
                <Camera className="h-8 w-8 text-emerald-400 mb-2 animate-pulse" />
                <h4 className="text-xs font-black uppercase text-white tracking-widest">Lettura Automatica da Scansione / Foto Documento</h4>
                <p className="text-[10px] text-slate-400 max-w-lg mt-1 uppercase">
                  Procedura Consigliata: Scatta una foto nitida della risposta del modulo USL della Toscana, oppure carica un file immagine/PDF. L'intelligenza Gemini estrarrà automaticamente tutti i dati, compilandoli qui sotto istantaneamente.
                </p>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileScanAndAutofill}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                <div className="flex items-center gap-4 mt-3">
                  <Button
                    type="button"
                    disabled={isExtracting}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-xs h-9 px-4 rounded-xl flex items-center gap-2 font-normal"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Elaborazione Documento...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Seleziona file o Scatta Foto
                      </>
                    )}
                  </Button>
                </div>

                {isExtracting && (
                  <div className="text-[10px] text-emerald-400 uppercase italic font-bold tracking-wider mt-2.5 flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" /> Analisi documentale in corso con gemini-3.5-flash... Attendere qualche istante.
                  </div>
                )}

                {extractionSuccess && (
                  <div className="text-[10px] text-emerald-400 uppercase font-black mt-2.5 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Compilazione avvenuta con successo! Controlla i campi qui sotto prima di salvare.
                  </div>
                )}

                {extractionError && (
                  <div className="text-[10px] text-red-500 uppercase italic font-bold tracking-wider mt-2.5 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {extractionError}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveCertificate} className="space-y-6">
              
              {/* Box Microchip ed Archivio Fisico (Dati Indice Obbligatori) */}
              <div className="bg-slate-900/80 border border-emerald-500/25 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[#047857]">Codice Microchip Cane *</Label>
                  <Input 
                    required
                    value={caneMicrochip}
                    onChange={(e) => setCaneMicrochip(e.target.value)}
                    placeholder="Es: 977200004526020 (15 cifre)"
                    className="bg-[#020617] border-slate-800 text-emerald-400 font-mono font-bold tracking-widest text-sm focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Riferimento Faldone / Archivio Fisico</Label>
                  <Input 
                    value={rifArchivioFisico}
                    onChange={(e) => setRifArchivioFisico(e.target.value)}
                    placeholder="Es: BINDER B-10"
                    className="bg-[#020617] border-slate-800 text-amber-500 font-bold uppercase focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Matricola / Numero Certificato</Label>
                  <Input 
                    value={matricolaCertificato}
                    onChange={(e) => setMatricolaCertificato(e.target.value)}
                    placeholder="Es: MCFR-1520"
                    className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Sezione Detentore / Proprietario */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#047857] uppercase tracking-widest border-b border-slate-800 pb-1">Dati Anagrafici del Detentore / Proprietario</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Cognome *</Label>
                    <Input 
                      required
                      value={proprietarioCognome}
                      onChange={(e) => setProprietarioCognome(e.target.value)}
                      placeholder="Cognome"
                      className="bg-[#020617] border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Nome *</Label>
                    <Input 
                      required
                      value={proprietarioNome}
                      onChange={(e) => setProprietarioNome(capitalizeWords(e.target.value))}
                      placeholder="Nome"
                      className="bg-[#020617] border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Codice Fiscale</Label>
                    <Input 
                      value={proprietarioCodiceFiscale}
                      onChange={(e) => setProprietarioCodiceFiscale(e.target.value)}
                      placeholder="Codice Fiscale"
                      className="bg-[#020617] border-slate-800 text-xs font-mono uppercase tracking-widest text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Luogo di Nascita</Label>
                    <Input 
                      value={proprietarioLuogoNascita}
                      onChange={(e) => setProprietarioLuogoNascita(capitalizeWords(e.target.value))}
                      placeholder="Comune nascita"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Data di Nascita</Label>
                    <Input 
                      value={proprietarioDataNascita}
                      onChange={(e) => setProprietarioDataNascita(e.target.value)}
                      placeholder="Ex: DD/MM/YYYY"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Recapito Telefonico Direct</Label>
                    <Input 
                      value={proprietarioTelefono}
                      onChange={(e) => setProprietarioTelefono(e.target.value)}
                      placeholder="Telefono"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2 col-span-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-400">Indirizzo Residenza Completo</Label>
                  <Input 
                    value={proprietarioIndirizzo}
                    onChange={(e) => setProprietarioIndirizzo(capitalizeWords(e.target.value))}
                    placeholder="Via, Civico, Comune, CAP, Provincia"
                    className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Sezione Cane */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#047857] uppercase tracking-widest border-b border-slate-800 pb-1">Dati del Cane Iscritto</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Nome del Cane *</Label>
                    <Input 
                      required
                      value={caneNome}
                      onChange={(e) => setCaneNome(capitalizeWords(e.target.value))}
                      placeholder="Nome dell'animale"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Sesso</Label>
                    <select
                      value={caneSesso}
                      onChange={(e) => setCaneSesso(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 text-xs rounded-xl h-12 px-3 text-slate-200 focus:border-emerald-500/50 uppercase outline-none"
                    >
                      <option value="Maschio">Maschio</option>
                      <option value="Femmina">Femmina</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Nato il</Label>
                    <Input 
                      value={caneDataNascita}
                      onChange={(e) => setCaneDataNascita(e.target.value)}
                      placeholder="Ex: DD/MM/YYYY"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Razza dichiarata</Label>
                    <Input 
                      value={caneRazza}
                      onChange={(e) => setCaneRazza(e.target.value)}
                      placeholder="Es: Pastore Tedesco"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Mantello / Colore</Label>
                    <Input 
                      value={caneMantello}
                      onChange={(e) => setCaneMantello(e.target.value)}
                      placeholder="Es: Nero-focato"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Taglia</Label>
                      <Input 
                        value={caneTaglia}
                        onChange={(e) => setCaneTaglia(e.target.value)}
                        placeholder="Media"
                        className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Pelo</Label>
                      <Input 
                        value={canePelo}
                        onChange={(e) => setCanePelo(e.target.value)}
                        placeholder="Corto"
                        className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Data Impianto Chip</Label>
                    <Input 
                      value={caneImpiantatoIl}
                      onChange={(e) => setCaneImpiantatoIl(e.target.value)}
                      placeholder="Ex: DD/MM/YYYY"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Sito Applicazione Chip</Label>
                    <Input 
                      value={caneSitoImpianto}
                      onChange={(e) => setCaneSitoImpianto(e.target.value)}
                      placeholder="Es: Sotto La Pelle Collo Sinistro"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Luogo Detenzione Cane</Label>
                    <Input 
                      value={luogoDetenzione}
                      onChange={(e) => setLuogoDetenzione(e.target.value)}
                      placeholder="Es: Come sopra / Recinto est"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-400">Segni Particolari Generali</Label>
                  <Input 
                    value={caneSegniParticolari}
                    onChange={(e) => setCaneSegniParticolari(e.target.value)}
                    placeholder="Dettagli fisici di rilievo"
                    className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-400">Note Extra e Osservazioni</Label>
                  <textarea
                    value={caneNote}
                    onChange={(e) => setCaneNote(e.target.value)}
                    placeholder="Digita annotazioni cliniche o d'indagine..."
                    className="w-full bg-[#020617] border border-slate-800 text-xs rounded-xl h-20 p-3 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 outline-none"
                  />
                </div>
              </div>

              {/* Sezione Registro e date emissione */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#047857] uppercase tracking-widest border-b border-slate-800 pb-1">Veterinario Emettitore & Registri Temporali</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Nome Medico Veterinario</Label>
                    <Input 
                      value={veterinarioNome}
                      onChange={(e) => setVeterinarioNome(e.target.value)}
                      placeholder="Dott. Rossi Mario"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Data emissione Certificato</Label>
                    <Input 
                      value={dataRilascio}
                      onChange={(e) => setDataRilascio(e.target.value)}
                      placeholder="Ex: DD/MM/YYYY"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Data Movimento Veterinario</Label>
                    <Input 
                      value={dataMovimento}
                      onChange={(e) => setDataMovimento(e.target.value)}
                      placeholder="Ex: DD/MM/YYYY"
                      className="bg-[#020617] border-slate-800 text-xs focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Bottoni submit */}
              <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFormOpen(false)}
                  className="uppercase text-xs"
                >
                  Annulla ed Esci
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-xs px-6 h-10 font-bold rounded-xl"
                >
                  {formMode === "create" ? "Sincronizza e Salva" : "Salva Modifiche"}
                </Button>
              </div>

            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

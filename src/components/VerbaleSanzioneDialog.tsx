import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, User, CheckSquare, ClipboardList, Printer, Save, Trash2, Scale, Calendar, Clock, BookOpen, AlertCircle, Eye, ShieldAlert, Check, X, CreditCard, Loader2
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { syncMicrochipToArchive } from "../lib/microchipSync";
import { SanctionReport, Guard, SanctionArticle } from "../types";
import { SANCTION_ARTICLES } from "../data/laws";
import { cn } from "@/lib/utils";
import { formatDateToISO } from "../lib/date-utils";
import { getProvinceFromComune } from "../lib/geo-utils";
import { capitalizeWords } from "../lib/string-utils";
import { EkoclubLogo } from "./EkoclubLogo";
import { ProntuarioSearchWidget } from "./ProntuarioSearchWidget";

interface VerbaleSanzioneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGuard: Guard | null;
  sanctionReports: SanctionReport[];
  onSuccess?: (report?: SanctionReport) => void;
  activeSector?: string;
  guards?: Guard[];
  initialContestazioneTipo?: "immediata" | "differita";
}

export const VerbaleSanzioneDialog: React.FC<VerbaleSanzioneDialogProps> = ({
  open,
  onOpenChange,
  currentGuard,
  sanctionReports,
  onSuccess,
  activeSector,
  guards,
  initialContestazioneTipo,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<"general" | "soggetto" | "violazione" | "contestazione" | "pagamento" | "firme">("general");

  const [hasObbligato, setHasObbligato] = useState(false);

  // States for 3 Guard Dropdowns (used to compile matricole without displaying full names)
  const [selectedGuard1, setSelectedGuard1] = useState("");
  const [selectedGuard2, setSelectedGuard2] = useState("");
  const [selectedGuard3, setSelectedGuard3] = useState("");

  // Signatures State (Base64)
  const [firmaTrasgressoreData, setFirmaTrasgressoreData] = useState<string>("");
  const [firmaObbligatoData, setFirmaObbligatoData] = useState<string>("");
  const [firmaGuardiaData, setFirmaGuardiaData] = useState<string>("");

  // Refs for Canvas Signatures
  const canvasTrasgressoreRef = useRef<HTMLCanvasElement | null>(null);
  const canvasObbligatoRef = useRef<HTMLCanvasElement | null>(null);
  const canvasGuardiaRef = useRef<HTMLCanvasElement | null>(null);

  const [formData, setFormData] = useState<Partial<SanctionReport>>({
    numeroVerbale: "",
    data: "",
    oraInizio: "",
    verbalizzantiMatricole: "",
    verbalizzantiQualifica: "",
    dataAccertamento: "",
    oraAccertamento: "",
    localita: "",
    comune: "",
    provincia: "",
    gpsRef: "",

    // Trasgressore
    soggettoNome: "",
    soggettoNatoA: "",
    soggettoNatoProv: "",
    soggettoNatoIl: "",
    soggettoResidenteA: "",
    soggettoResidenteProv: "",
    soggettoResidenteIndirizzo: "",
    soggettoResidenteCivico: "",
    soggettoDocumentoTipo: "Carta d'Identità",
    soggettoDocumentoNumero: "",
    soggettoDocumentoRilasciatoDa: "Comune",
    soggettoDocumentoRilasciatoIl: "",

    // Obbligato in solido
    obbligatoNome: "",
    obbligatoNatoA: "",
    obbligatoNatoProv: "",
    obbligatoNatoIl: "",
    obbligatoResidenteA: "",
    obbligatoResidenteProv: "",
    obbligatoResidenteIndirizzo: "",
    obbligatoResidenteCivico: "",
    obbligatoQualita: "Proprietario dell'animale",
    obbligatoDocumentoTipo: "Carta d'Identità",
    obbligatoDocumentoNumero: "",
    obbligatoDocumentoRilasciatoDa: "Comune",
    obbligatoDocumentoRilasciatoIl: "",

    // Violazione
    trasgreditoLeggeRegolamento: "",
    trasgreditoArt: "",
    sanzionatoLeggeRegolamento: "",
    sanzionatoArt: "",
    altreDisposizioni: "",
    sanzioneMin: 0,
    sanzioneMax: 0,
    sanzioneMinLettere: "",
    sanzioneMaxLettere: "",
    motiviFatti: "",

    // Contestazione
    contestazioneTipo: "immediata",
    dichiarazioniSpontanee: "",
    motivoMancataContestazione: "",
    sequestroAmministrativo: false,
    sequestroVerbaleNumero: "",
    sequestroVerbaleDel: "",

    // Pagamento ridotto (PMR)
    pagamentoMisuraRidotta: 0,
    pagamentoMisuraRidottaLettere: "",
    speseNotifica: 0,
    pagamentoTotale: 0,
    metodoPagamento: "regione_toscana",

    regioneIban: "IT 93 O 01030 02800 000000288505",
    regioneCcPostale: "288505",
    regioneIntestatario: "REGIONE TOSCANA - TESORERIA REGIONALE, Piazza Duomo 10, Firenze",

    comuneNome: "Comune di Massa",
    comuneIban: "IT 12 A 03069 24502 100000098765",
    comuneCcPostale: "12345678",
    comuneIntestatario: "COMUNE DI MASSA - SERVIZIO TESORERIA",
    comuneLinkPagoPa: "https://massa.toscana.pagopa.it",

    ricorsoAutorita: "regione_toscana",
    ricorsoComuneNome: "Sindaco del Comune di Massa",
    ricorsoComunePec: "comune.massa@postacert.toscana.it",

    accettaContenutoERitira: true,
    rifiutaFirmareMaRitira: false,
  });

  const comuniMassaCarrara = [
    "Aulla", "Bagnone", "Carrara", "Casola in Lunigiana", "Comano", "Filattiera", 
    "Fivizzano", "Fosdinovo", "Licciana Nardi", "Massa", "Montignoso", "Mulazzo", 
    "Podenzana", "Pontremoli", "Tresana", "Villafranca in Lunigiana", "Zeri"
  ];

  // Sync verbalizzantiMatricole based on the 3 dropdowns
  useEffect(() => {
    const parts = [selectedGuard1, selectedGuard2, selectedGuard3]
      .filter(Boolean)
      .map(m => `Matr. ${m}`);
    
    setFormData(prev => ({
      ...prev,
      verbalizzantiMatricole: parts.join(" - ")
    }));
  }, [selectedGuard1, selectedGuard2, selectedGuard3]);

  // Reset dropdown selections and apply initial contestazione mode when the modal opens
  useEffect(() => {
    if (open) {
      setSelectedGuard1("");
      setSelectedGuard2("");
      setSelectedGuard3("");
      if (initialContestazioneTipo === "differita") {
        setFormData(prev => ({
          ...prev,
          contestazioneTipo: "differita",
          motivoMancataContestazione: prev.motivoMancataContestazione || "Motivi di sicurezza pubblica e incolumità degli agenti operanti sul campo."
        }));
      } else if (initialContestazioneTipo === "immediata") {
        setFormData(prev => ({
          ...prev,
          contestazioneTipo: "immediata"
        }));
      }
    }
  }, [open, initialContestazioneTipo]);

  // Handle preset article selection by object
  const handleArticleObjectSelect = (article: SanctionArticle) => {
    if (!article) return;

    const pmr = article.sanzioneRidotta || Math.min(article.sanzioneMin * 2, article.sanzioneMax / 3);
    const pmrLettere = numeroInLettere(pmr);
    
    let pagamentoEnte: 'regione_toscana' | 'comune_carrara' | 'altro_comune' = "regione_toscana";
    let ricorsoAutorita: 'regione_toscana' | 'comune' = "regione_toscana";
    const targetComune = article.comune || formData.comune || "Massa";
    const targetUpper = targetComune.toUpperCase();
    
    let comNome = `Comune di ${targetComune}`;
    let comPec = `comune.${targetComune.toLowerCase().replace(/\s+/g, "")}@postacert.toscana.it`;
    let cIban = formData.comuneIban || "IT 12 A 03069 24502 100000098765";
    let cCc = formData.comuneCcPostale || "12345678";
    let cIntestatario = formData.comuneIntestatario || "COMUNE DI MASSA - SERVIZIO ENTRATE";
    let cLink = formData.comuneLinkPagoPa || "https://massa.toscana.pagopa.it";

    if (article.ambito === "comunale") {
      ricorsoAutorita = "comune";
      if (targetUpper === "CARRARA") {
        pagamentoEnte = "comune_carrara";
        comNome = "Comune di Carrara";
        comPec = "comune.carrara@postacert.toscana.it";
        cIban = "IT 45 K 03069 24502 100000012345";
        cCc = "13154546";
        cIntestatario = "COMUNE DI CARRARA - SERVIZIO ENTRATE";
        cLink = "https://carrara.toscana.pagopa.it";
      } else if (targetUpper === "MASSA") {
        pagamentoEnte = "altro_comune";
        comNome = "Comune di Massa";
        comPec = "comune.massa@postacert.toscana.it";
        cIban = "IT 12 A 03069 24502 100000098765";
        cCc = "12345678";
        cIntestatario = "COMUNE DI MASSA - SERVIZIO ENTRATE";
        cLink = "https://massa.toscana.pagopa.it";
      } else {
        pagamentoEnte = "altro_comune";
        comNome = `Comune di ${targetComune}`;
        comPec = `comune.${targetComune.toLowerCase().replace(/\s+/g, "")}@postacert.toscana.it`;
        cIban = `IT 00 X 03069 00000 000000000000 (${targetComune})`;
        cCc = `Tesoreria ${targetComune}`;
        cIntestatario = `COMUNE DI ${targetComune.toUpperCase()} - SERVIZIO ENTRATE`;
        cLink = `https://${targetComune.toLowerCase().replace(/\s+/g, "")}.toscana.pagopa.it`;
      }
    }

    setFormData(prev => ({
      ...prev,
      comune: targetComune,
      trasgreditoLeggeRegolamento: article.legge,
      trasgreditoArt: `${article.articolo} ${article.comma || ""}`.trim(),
      sanzionatoLeggeRegolamento: article.legge,
      sanzionatoArt: `${article.articolo} ${article.comma || ""}`.trim(),
      sanzioneMin: article.sanzioneMin,
      sanzioneMax: article.sanzioneMax,
      sanzioneMinLettere: numeroInLettere(article.sanzioneMin),
      sanzioneMaxLettere: numeroInLettere(article.sanzioneMax),
      pagamentoMisuraRidotta: pmr,
      pagamentoMisuraRidottaLettere: pmrLettere,
      pagamentoTotale: pmr + (prev.speseNotifica || 0),
      metodoPagamento: pagamentoEnte,
      ricorsoAutorita: ricorsoAutorita,
      comuneNome: comNome,
      comuneIban: cIban,
      comuneCcPostale: cCc,
      comuneIntestatario: cIntestatario,
      comuneLinkPagoPa: cLink,
      ricorsoComuneNome: `Sindaco del ${comNome}`,
      ricorsoComunePec: comPec,
      motiviFatti: `Durante il controllo nel territorio del ${comNome} si accertava la seguente violazione: ${article.descrizione}`,
    }));
  };

  const handleArticleSelect = (articleId: string) => {
    if (!articleId) return;
    const article = SANCTION_ARTICLES.find(a => a.id === articleId);
    if (article) handleArticleObjectSelect(article);
  };

  // Generate unique Progressive Sanction Number
  const generateSanctionNumber = () => {
    const year = new Date().getFullYear();
    const countCurrentYear = (sanctionReports || []).filter(c => c.data?.startsWith(String(year))).length;
    const progressive = String(countCurrentYear + 1).padStart(4, "0");
    return `SANZ-${year}-${progressive}`;
  };

  useEffect(() => {
    if (open && !formData.numeroVerbale) {
      setFormData(prev => ({
        ...prev,
        numeroVerbale: generateSanctionNumber(),
      }));
    }
  }, [open, sanctionReports]);

  // Calculate payment totals when P.M.R. or Spese change
  useEffect(() => {
    const pmr = Number(formData.pagamentoMisuraRidotta) || 0;
    const spese = Number(formData.speseNotifica) || 0;
    setFormData(prev => ({
      ...prev,
      pagamentoTotale: pmr + spese,
    }));
  }, [formData.pagamentoMisuraRidotta, formData.speseNotifica]);

  // Adjust details based on contestazioneType (immediata vs differita)
  useEffect(() => {
    if (formData.contestazioneTipo === "immediata") {
      setFormData(prev => ({
        ...prev,
        speseNotifica: 0,
        motivoMancataContestazione: "",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        speseNotifica: 15, // Costo standard notifiche amministrative
        dichiarazioniSpontanee: "",
      }));
    }
  }, [formData.contestazioneTipo]);

  // Helper conversion for numbers to Italian word strings (simplified for sanzioni numbers)
  const numeroInLettere = (num: number): string => {
    if (num === 0) return "zero";
    const units = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"];
    const teens = ["dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"];
    const tens = ["", "dieci", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];
    const hundreds = ["", "cento", "duecento", "trecento", "quattrocento", "cinquecento", "seicento", "settecento", "ottocento", "novecento"];

    let intero = Math.floor(num);
    if (intero > 9999) return String(num); // fallback per numeri enormi

    let result = "";
    
    // Thousands
    if (intero >= 1000) {
      const th = Math.floor(intero / 1000);
      if (th === 1) result += "mille";
      else result += units[th] + "mila";
      intero %= 1000;
    }

    // Hundreds
    if (intero >= 100) {
      const h = Math.floor(intero / 100);
      result += hundreds[h];
      intero %= 100;
    }

    // Tens & Units
    if (intero >= 20) {
      const t = Math.floor(intero / 10);
      const u = intero % 10;
      if (u === 1 || u === 8) {
        result += tens[t].slice(0, -1) + units[u];
      } else {
        result += tens[t] + units[u];
      }
    } else if (intero >= 10) {
      result += teens[intero - 10];
    } else if (intero > 0) {
      result += units[intero];
    }

    // Decimals
    const decimali = Math.round((num - Math.floor(num)) * 100);
    if (decimali > 0) {
      result += " virgola " + decimali + "/00";
    } else {
      result += "/00";
    }

    return result.toUpperCase();
  };

  // Drawing Canvas logic for Signatures
  const startDrawing = (ref: React.RefObject<HTMLCanvasElement | null>, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#ffffff";
    if (ref === canvasGuardiaRef || ref === canvasTrasgressoreRef || ref === canvasObbligatoRef) {
      ctx.strokeStyle = "#0ea5e9"; // Sky blue signatures for clean visual matching
    }
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    let x = 0, y = 0;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    (canvas as any).isDrawing = true;
  };

  const draw = (ref: React.RefObject<HTMLCanvasElement | null>, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas || !(canvas as any).isDrawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x = 0, y = 0;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (ref: React.RefObject<HTMLCanvasElement | null>, saveFn: (data: string) => void) => {
    const canvas = ref.current;
    if (!canvas) return;
    (canvas as any).isDrawing = false;
    saveFn(canvas.toDataURL("image/png"));
  };

  const clearCanvas = (ref: React.RefObject<HTMLCanvasElement | null>, saveFn: (data: string) => void) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveFn("");
  };

  // Submit report to Firebase Firestore
  const handleSaveSanction = async () => {
    if (!formData.soggettoNome) {
      alert("Si prega di inserire le generalità del Trasgressore!");
      return;
    }
    if (!formData.trasgreditoLeggeRegolamento) {
      alert("Si prega di compilare i dati della Violazione!");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalReport: SanctionReport;

      const generatedNum = formData.numeroVerbale?.trim() || `SANZ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (db) {
        const docRef = doc(collection(db, "sanction_reports"));
        finalReport = {
          ...(formData as SanctionReport),
          id: docRef.id,
          numeroVerbale: generatedNum,
          firmaTrasgressore: firmaTrasgressoreData || "",
          firmaObbligato: hasObbligato ? (firmaObbligatoData || "") : "",
          firmaGuardie: firmaGuardiaData || "",
          creatoAl: new Date().toISOString(),
          creatoDa: currentGuard?.id || "ospite",
          creatoDaNome: currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}` : "Ospite",
          settore: activeSector || "zoofila",
        };

        // Filter out any undefined fields so Firestore setDoc does not fail
        const cleanPayload = Object.fromEntries(
          Object.entries(finalReport).filter(([_, v]) => v !== undefined)
        );

        await setDoc(docRef, cleanPayload);
        console.log("Verbale sanzione salvato in Firestore con ID: ", docRef.id);
      } else {
        const localId = String(Date.now());
        finalReport = {
          ...(formData as SanctionReport),
          id: localId,
          numeroVerbale: generatedNum,
          firmaTrasgressore: firmaTrasgressoreData || "",
          firmaObbligato: hasObbligato ? (firmaObbligatoData || "") : "",
          firmaGuardie: firmaGuardiaData || "",
          creatoAl: new Date().toISOString(),
          creatoDa: currentGuard?.id || "ospite",
          creatoDaNome: currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}` : "Ospite",
          settore: activeSector || "zoofila",
        };
      }

      // Sync microchip to archive if provided
      const rawMicrochip = (formData as any).microchipCane || (formData as any).microchip;
      if (rawMicrochip && typeof rawMicrochip === "string" && rawMicrochip.trim()) {
        try {
          await syncMicrochipToArchive({
            microchip: rawMicrochip.trim(),
            specieRazza: (formData as any).specieRazzaCane || (formData as any).specieRazza || "Cane",
            nomeCane: (formData as any).nomeCane || "",
            proprietarioCognome: (formData as any).proprietarioCane || formData.soggettoNome || "",
            comune: formData.comune || "",
            localita: formData.localita || "",
            fonte: `Verbale Sanzione (${generatedNum})`
          });
        } catch (mErr) {
          console.error("Sincronizzazione microchip fallita:", mErr);
        }
      }

      alert("Verbale Sanzionatorio correttamente trasmesso al server e archiviato in sede HQ!");
      
      // Reset State
      setFormData({
        numeroVerbale: "",
        data: "",
        oraInizio: "",
        verbalizzantiMatricole: "",
        verbalizzantiQualifica: "",
        dataAccertamento: "",
        oraAccertamento: "",
        localita: "",
        comune: "",
        provincia: "",
        gpsRef: "",
        soggettoNome: "",
        soggettoNatoA: "",
        soggettoNatoProv: "",
        soggettoNatoIl: "",
        soggettoResidenteA: "",
        soggettoResidenteProv: "",
        soggettoResidenteIndirizzo: "",
        soggettoResidenteCivico: "",
        soggettoDocumentoTipo: "Carta d'Identità",
        soggettoDocumentoNumero: "",
        soggettoDocumentoRilasciatoDa: "Comune",
        soggettoDocumentoRilasciatoIl: "",
        trasgreditoLeggeRegolamento: "",
        trasgreditoArt: "",
        sanzionatoLeggeRegolamento: "",
        sanzionatoArt: "",
        sanzioneMin: 0,
        sanzioneMax: 0,
        motiviFatti: "",
        contestazioneTipo: "immediata",
        sequestroAmministrativo: false,
        pagamentoMisuraRidotta: 0,
        speseNotifica: 0,
        pagamentoTotale: 0,
        metodoPagamento: "regione_toscana",
      });
      setFirmaTrasgressoreData("");
      setFirmaObbligatoData("");
      setFirmaGuardiaData("");
      setActiveStep("general");

      if (onSuccess) onSuccess(finalReport);
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio verbale sanzione:", err);
      alert("Errore durante il salvataggio del verbale. Verificare la connessione e riprovare.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 z-50 bg-[#020617] text-slate-200 p-0 flex flex-col overflow-hidden w-full h-[100dvh] max-h-none md:w-full md:max-w-none md:h-full md:rounded-none shadow-none left-0 top-0 translate-x-0 translate-y-0 border-none">
        
        {/* Intestazione */}
        <DialogHeader className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg md:text-xl font-normal text-white uppercase italic tracking-tight flex items-center gap-2">
                Verbale di Accertamento & Contestazione
              </DialogTitle>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                Modello Sanzionatorio Unificato (Legge 24 Novembre 1981, n. 689)
              </p>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-right hidden sm:block">
            <span className="text-[9px] text-slate-500 uppercase block">Numero Atto</span>
            <span className="font-mono text-xs font-bold text-sky-400">{formData.numeroVerbale}</span>
          </div>
        </DialogHeader>

        {/* Step Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto bg-slate-950/80 px-4 py-2 border-b border-slate-900 shrink-0 custom-scrollbar text-xs">
          <button 
            onClick={() => setActiveStep("general")}
            className={cn("px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-semibold whitespace-nowrap", 
              activeStep === "general" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900")}
          >
            1. Generale
          </button>
          <button 
            onClick={() => setActiveStep("soggetto")}
            className={cn("px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-semibold whitespace-nowrap", 
              activeStep === "soggetto" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900")}
          >
            2. Soggetti
          </button>
          <button 
            onClick={() => setActiveStep("violazione")}
            className={cn("px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-semibold whitespace-nowrap", 
              activeStep === "violazione" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900")}
          >
            3. Violazione
          </button>
          <button 
            onClick={() => setActiveStep("contestazione")}
            className={cn("px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-semibold whitespace-nowrap", 
              activeStep === "contestazione" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900")}
          >
            4. Contestazione
          </button>
          <button 
            onClick={() => setActiveStep("pagamento")}
            className={cn("px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-semibold whitespace-nowrap", 
              activeStep === "pagamento" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900")}
          >
            5. Sanzioni & PMR
          </button>
          <button 
            onClick={() => setActiveStep("firme")}
            className={cn("px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-semibold whitespace-nowrap", 
              activeStep === "firme" ? "bg-sky-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-900")}
          >
            6. Sottoscrizioni
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-950/20">
          
          {/* STEP 1: GENERAL INFO */}
          {activeStep === "general" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <ShieldAlert className="h-4 w-4" />
                  Dati dei Verbalizzanti e Qualifica
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal block">
                      Selezione Rapida 3 Guardie Accertatrici (Seleziona per compilare le Matricole)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Guardia 1</span>
                        <select
                          value={selectedGuard1}
                          onChange={e => setSelectedGuard1(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">— Nessuna —</option>
                          {(guards || []).map(g => (
                            <option key={g.id} value={g.matricola}>
                              {g.name} {g.surname || ""} ({g.matricola})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Guardia 2</span>
                        <select
                          value={selectedGuard2}
                          onChange={e => setSelectedGuard2(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">— Nessuna —</option>
                          {(guards || []).map(g => (
                            <option key={g.id} value={g.matricola}>
                              {g.name} {g.surname || ""} ({g.matricola})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Guardia 3</span>
                        <select
                          value={selectedGuard3}
                          onChange={e => setSelectedGuard3(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">— Nessuna —</option>
                          {(guards || []).map(g => (
                            <option key={g.id} value={g.matricola}>
                              {g.name} {g.surname || ""} ({g.matricola})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Identificativi Accertatori (Matricola)</Label>
                      <Input 
                        value={formData.verbalizzantiMatricole || ""}
                        onChange={e => setFormData(p => ({ ...p, verbalizzantiMatricole: e.target.value }))}
                        className="bg-slate-950 border-slate-800 text-white focus:ring-sky-500 font-mono"
                        placeholder="Seleziona le guardie sopra o scrivi es. Matr. BA906 - Matr. TG930"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Qualifica Operativa / Funzioni PG</Label>
                      <Input 
                        value={formData.verbalizzantiQualifica || ""}
                        onChange={e => setFormData(p => ({ ...p, verbalizzantiQualifica: e.target.value }))}
                        className="bg-slate-950 border-slate-800 text-white focus:ring-sky-500"
                        placeholder="es. Agenti di Polizia Giudiziaria nei limiti del servizio"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <MapPin className="h-4 w-4" />
                  Data, Ora e Luogo del Controllo
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Data Redazione</Label>
                    <Input 
                      type="date"
                      value={formData.data || ""}
                      onChange={e => setFormData(p => ({ ...p, data: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Ora Inizio Redazione</Label>
                    <Input 
                      type="time"
                      value={formData.oraInizio || ""}
                      onChange={e => setFormData(p => ({ ...p, oraInizio: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Data Accertamento</Label>
                    <Input 
                      type="date"
                      value={formData.dataAccertamento || ""}
                      onChange={e => setFormData(p => ({ ...p, dataAccertamento: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Ora Accertamento</Label>
                    <Input 
                      type="time"
                      value={formData.oraAccertamento || ""}
                      onChange={e => setFormData(p => ({ ...p, oraAccertamento: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Comune</Label>
                    <select
                      value={formData.comune || ""}
                      onChange={e => {
                        const newComune = e.target.value;
                        const upper = newComune.toUpperCase();
                        let update: Partial<SanctionReport> = { comune: newComune };

                        if (upper === "CARRARA") {
                          update.comuneNome = "Comune di Carrara";
                          update.comuneIban = "IT 45 K 03069 24502 100000012345";
                          update.comuneCcPostale = "13154546";
                          update.comuneIntestatario = "COMUNE DI CARRARA - SERVIZIO ENTRATE";
                          update.comuneLinkPagoPa = "https://carrara.toscana.pagopa.it";
                          update.ricorsoComuneNome = "Sindaco del Comune di Carrara";
                          update.ricorsoComunePec = "comune.carrara@postacert.toscana.it";
                          if (formData.metodoPagamento !== "regione_toscana") {
                            update.metodoPagamento = "comune_carrara";
                          }
                        } else if (upper === "MASSA") {
                          update.comuneNome = "Comune di Massa";
                          update.comuneIban = "IT 12 A 03069 24502 100000098765";
                          update.comuneCcPostale = "12345678";
                          update.comuneIntestatario = "COMUNE DI MASSA - SERVIZIO ENTRATE";
                          update.comuneLinkPagoPa = "https://massa.toscana.pagopa.it";
                          update.ricorsoComuneNome = "Sindaco del Comune di Massa";
                          update.ricorsoComunePec = "comune.massa@postacert.toscana.it";
                          if (formData.metodoPagamento !== "regione_toscana") {
                            update.metodoPagamento = "altro_comune";
                          }
                        } else if (newComune) {
                          update.comuneNome = `Comune di ${newComune}`;
                          update.comuneIban = `IT 00 X 03069 00000 000000000000 (${newComune})`;
                          update.comuneCcPostale = `Tesoreria ${newComune}`;
                          update.comuneIntestatario = `COMUNE DI ${upper} - SERVIZIO ENTRATE`;
                          update.comuneLinkPagoPa = `https://${newComune.toLowerCase().replace(/\s+/g, "")}.toscana.pagopa.it`;
                          update.ricorsoComuneNome = `Sindaco del Comune di ${newComune}`;
                          update.ricorsoComunePec = `comune.${newComune.toLowerCase().replace(/\s+/g, "")}@postacert.toscana.it`;
                          if (formData.metodoPagamento !== "regione_toscana") {
                            update.metodoPagamento = "altro_comune";
                          }
                        }

                        setFormData(p => ({ ...p, ...update }));
                      }}
                      className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">— Seleziona —</option>
                      {comuniMassaCarrara.map(com => (
                        <option key={com} value={com}>{com}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Provincia</Label>
                    <Input 
                      value={formData.provincia || ""}
                      onChange={e => setFormData(p => ({ ...p, provincia: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-sky-500 font-mono"
                      placeholder="es. MS"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Località / Indirizzo</Label>
                    <Input 
                      value={formData.localita || ""}
                      onChange={e => setFormData(p => ({ ...p, localita: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-sky-500"
                      placeholder="es. Via Marina Vecchia n. 45"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Coordinate GPS (Opzionale)</Label>
                    <Input 
                      value={formData.gpsRef || ""}
                      onChange={e => setFormData(p => ({ ...p, gpsRef: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono focus:ring-sky-500"
                      placeholder="44.0371, 10.0435"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SOGGETTI (TRASGRESSORE & OBBLIGATO IN SOLIDO) */}
          {activeStep === "soggetto" && (
            <div className="space-y-6 animate-fadeIn">
              {/* TRASGRESSORE */}
              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <User className="h-4 w-4" />
                  Generalità del Trasgressore (Soggetto Controllato)
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Nome e Cognome Completo</Label>
                    <Input 
                      value={formData.soggettoNome || ""}
                      onChange={e => {
                        const val = capitalizeWords(e.target.value);
                        setFormData(p => ({ ...p, soggettoNome: val }));
                      }}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-sky-500 font-medium"
                      placeholder="es. Mario Rossi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Data di Nascita</Label>
                    <Input 
                      type="date"
                      value={formatDateToISO(formData.soggettoNatoIl)}
                      onChange={e => setFormData(p => ({ ...p, soggettoNatoIl: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Luogo di Nascita (Provincia)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={formData.soggettoNatoA || ""}
                        onChange={e => {
                          const val = capitalizeWords(e.target.value);
                          const autoProv = getProvinceFromComune(val);
                          setFormData(p => ({
                            ...p,
                            soggettoNatoA: val,
                            ...(autoProv ? { soggettoNatoProv: autoProv } : {})
                          }));
                        }}
                        className="bg-slate-950 border-slate-800 text-white flex-1"
                        placeholder="Massa"
                      />
                      <Input 
                        value={formData.soggettoNatoProv || ""}
                        onChange={e => setFormData(p => ({ ...p, soggettoNatoProv: e.target.value.toUpperCase() }))}
                        className="bg-slate-950 border-slate-800 text-white w-14 uppercase font-mono text-center"
                        maxLength={2}
                        placeholder="MS"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Residente a (Via, Corso, Piazza)</Label>
                    <Input 
                      value={formData.soggettoResidenteIndirizzo || ""}
                      onChange={e => {
                        const val = capitalizeWords(e.target.value);
                        setFormData(p => ({ ...p, soggettoResidenteIndirizzo: val }));
                      }}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="Via Dante Alighieri"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Civico</Label>
                    <Input 
                      value={formData.soggettoResidenteCivico || ""}
                      onChange={e => setFormData(p => ({ ...p, soggettoResidenteCivico: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                      placeholder="12/B"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Comune (Prov.)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={formData.soggettoResidenteA || ""}
                        onChange={e => {
                          const val = capitalizeWords(e.target.value);
                          const autoProv = getProvinceFromComune(val);
                          setFormData(p => ({
                            ...p,
                            soggettoResidenteA: val,
                            ...(autoProv ? { soggettoResidenteProv: autoProv } : {})
                          }));
                        }}
                        className="bg-slate-950 border-slate-800 text-white flex-1"
                        placeholder="Massa"
                      />
                      <Input 
                        value={formData.soggettoResidenteProv || ""}
                        onChange={e => setFormData(p => ({ ...p, soggettoResidenteProv: e.target.value.toUpperCase() }))}
                        className="bg-slate-950 border-slate-800 text-white w-14 uppercase font-mono text-center"
                        maxLength={2}
                        placeholder="MS"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Tipo Documento</Label>
                    <select
                      value={formData.soggettoDocumentoTipo || "Carta d'Identità"}
                      onChange={e => setFormData(p => ({ ...p, soggettoDocumentoTipo: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="Carta d'Identità">Carta d'Identità</option>
                      <option value="Patente di Guida">Patente di Guida</option>
                      <option value="Passaporto">Passaporto</option>
                      <option value="Tessera Sanitaria">Tessera Sanitaria / CF</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Numero Documento</Label>
                    <Input 
                      value={formData.soggettoDocumentoNumero || ""}
                      onChange={e => setFormData(p => ({ ...p, soggettoDocumentoNumero: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono uppercase"
                      placeholder="CA12345XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Rilasciato Da</Label>
                    <Input 
                      value={formData.soggettoDocumentoRilasciatoDa || ""}
                      onChange={e => setFormData(p => ({ ...p, soggettoDocumentoRilasciatoDa: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="Comune di Massa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Rilasciato il</Label>
                    <Input 
                      type="date"
                      value={formData.soggettoDocumentoRilasciatoIl || ""}
                      onChange={e => setFormData(p => ({ ...p, soggettoDocumentoRilasciatoIl: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* OBBLIGATO IN SOLIDO TOGGLE */}
              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                    <User className="h-4 w-4 text-emerald-400" />
                    Obbligato in solido (Art. 6 L. 689/81)
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="hasObbligato"
                      checked={hasObbligato}
                      onChange={e => setHasObbligato(e.target.checked)}
                      className="h-4 w-4 rounded bg-slate-950 border-slate-850 text-sky-500 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="hasObbligato" className="text-xs text-slate-300 font-medium cursor-pointer uppercase tracking-wider">
                      Abilita Obbligato in Solido
                    </label>
                  </div>
                </div>

                {hasObbligato && (
                  <div className="space-y-4 pt-2 border-t border-slate-800/40 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Nome e Cognome Obbligato</Label>
                        <Input 
                          value={formData.obbligatoNome || ""}
                          onChange={e => {
                            const val = capitalizeWords(e.target.value);
                            setFormData(p => ({ ...p, obbligatoNome: val }));
                          }}
                          className="bg-slate-950 border-slate-800 text-white focus:ring-sky-500 font-medium"
                          placeholder="es. Francesca Bianchi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">In qualità di (Titolo)</Label>
                        <select
                          value={formData.obbligatoQualita || "Proprietario dell'animale"}
                          onChange={e => setFormData(p => ({ ...p, obbligatoQualita: e.target.value }))}
                          className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="Proprietario dell'animale">Proprietario dell'animale</option>
                          <option value="Genitore dell'infrazione minore">Esercente la potestà genitoriale</option>
                          <option value="Proprietario del veicolo">Proprietario del veicolo</option>
                          <option value="Datore di Lavoro">Datore di Lavoro</option>
                          <option value="Altro">Altro (specificare)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Data Nascita</Label>
                        <Input 
                          type="date"
                          value={formatDateToISO(formData.obbligatoNatoIl)}
                          onChange={e => setFormData(p => ({ ...p, obbligatoNatoIl: e.target.value }))}
                          className="bg-slate-950 border-slate-800 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Residente a (Via, Corso, Piazza)</Label>
                        <Input 
                          value={formData.obbligatoResidenteIndirizzo || ""}
                          onChange={e => {
                            const val = capitalizeWords(e.target.value);
                            setFormData(p => ({ ...p, obbligatoResidenteIndirizzo: val }));
                          }}
                          className="bg-slate-950 border-slate-800 text-white"
                          placeholder="Via Cavour"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Civico</Label>
                        <Input 
                          value={formData.obbligatoResidenteCivico || ""}
                          onChange={e => setFormData(p => ({ ...p, obbligatoResidenteCivico: e.target.value }))}
                          className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                          placeholder="8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Comune (Prov.)</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={formData.obbligatoResidenteA || ""}
                            onChange={e => {
                              const val = capitalizeWords(e.target.value);
                              const autoProv = getProvinceFromComune(val);
                              setFormData(p => ({
                                ...p,
                                obbligatoResidenteA: val,
                                ...(autoProv ? { obbligatoResidenteProv: autoProv } : {})
                              }));
                            }}
                            className="bg-slate-950 border-slate-800 text-white flex-1"
                            placeholder="Massa"
                          />
                          <Input 
                            value={formData.obbligatoResidenteProv || ""}
                            onChange={e => setFormData(p => ({ ...p, obbligatoResidenteProv: e.target.value.toUpperCase() }))}
                            className="bg-slate-950 border-slate-800 text-white w-14 uppercase font-mono text-center"
                            maxLength={2}
                            placeholder="MS"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: VIOLAZIONE & PRESET LAWS */}
          {activeStep === "violazione" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Prontuario Smart Beta Search Engine */}
              <ProntuarioSearchWidget
                selectedComune={formData.comune}
                activeSector={activeSector}
                onSelectArticle={handleArticleObjectSelect}
                selectedArticleId={
                  SANCTION_ARTICLES.find(
                    a => a.legge === formData.trasgreditoLeggeRegolamento && `${a.articolo} ${a.comma || ""}`.trim() === formData.trasgreditoArt
                  )?.id
                }
              />

              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <BookOpen className="h-4 w-4" />
                  Riferimenti di Legge Dettagliati (Compilati o Modificabili)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Disposizione Violata (Legge/Regolamento)</Label>
                    <Input 
                      value={formData.trasgreditoLeggeRegolamento || ""}
                      onChange={e => setFormData(p => ({ ...p, trasgreditoLeggeRegolamento: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="Legge Regionale n. 59/2009"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Articolo e Comma Violato</Label>
                    <Input 
                      value={formData.trasgreditoArt || ""}
                      onChange={e => setFormData(p => ({ ...p, trasgreditoArt: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                      placeholder="Art. 5 Comma 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Norma Sanzionatoria</Label>
                    <Input 
                      value={formData.sanzionatoLeggeRegolamento || ""}
                      onChange={e => setFormData(p => ({ ...p, sanzionatoLeggeRegolamento: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white"
                      placeholder="Legge Regionale n. 59/2009"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Articolo Sanzionatorio</Label>
                    <Input 
                      value={formData.sanzionatoArt || ""}
                      onChange={e => setFormData(p => ({ ...p, sanzionatoArt: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                      placeholder="Art. 5 Comma 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Sanzione Minima (€)</Label>
                    <Input 
                      type="number"
                      value={formData.sanzioneMin || 0}
                      onChange={e => setFormData(p => ({ ...p, sanzioneMin: Number(e.target.value) }))}
                      className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Sanzione Massima (€)</Label>
                    <Input 
                      type="number"
                      value={formData.sanzioneMax || 0}
                      onChange={e => setFormData(p => ({ ...p, sanzioneMax: Number(e.target.value) }))}
                      className="bg-slate-950 border-slate-800 text-white text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Sommaria Descrizione dei Fatti (Motivi e Circostanze)</Label>
                <Textarea 
                  value={formData.motiviFatti || ""}
                  onChange={e => setFormData(p => ({ ...p, motiviFatti: e.target.value }))}
                  rows={5}
                  className="bg-slate-950 border-slate-800 text-white font-sans text-sm focus:ring-sky-500 custom-scrollbar"
                  placeholder="Descrivere qui le circostanze di tempo e di luogo, la condotta del soggetto, l'eventuale presenza di animali con relativo numero di microchip, testimoni presenti, reazioni o riscontri sul posto..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: CONTESTAZIONE & SEQUESTRO */}
          {activeStep === "contestazione" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <ShieldAlert className="h-4 w-4" />
                  Modalità di Contestazione
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <label 
                    onClick={() => setFormData(p => ({ ...p, contestazioneTipo: "immediata" }))}
                    className={cn("p-4 border rounded-xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all",
                      formData.contestazioneTipo === "immediata" ? "bg-sky-500/10 border-sky-500 text-white" : "border-slate-800 text-slate-400 hover:bg-slate-900")}
                  >
                    <CheckSquare className="h-5 w-5 text-sky-400" />
                    <span className="text-sm font-bold uppercase">Immediata</span>
                    <span className="text-[10px] text-slate-400">Accertamento e notifica sul posto in presenza del trasgressore</span>
                  </label>
                  <label 
                    onClick={() => setFormData(p => ({ ...p, contestazioneTipo: "differita" }))}
                    className={cn("p-4 border rounded-xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all",
                      formData.contestazioneTipo === "differita" ? "bg-sky-500/10 border-sky-500 text-white" : "border-slate-800 text-slate-400 hover:bg-slate-900")}
                  >
                    <X className="h-5 w-5 text-red-400" />
                    <span className="text-sm font-bold uppercase">Differita</span>
                    <span className="text-[10px] text-slate-400">Notifica entro 90 giorni per impossibilità di contestazione sul posto</span>
                  </label>
                </div>

                {formData.contestazioneTipo === "immediata" ? (
                  <div className="space-y-2 pt-2 animate-fadeIn">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Eventuali Dichiarazioni Spontanee del Trasgressore</Label>
                    <Textarea 
                      value={formData.dichiarazioniSpontanee || ""}
                      onChange={e => setFormData(p => ({ ...p, dichiarazioniSpontanee: e.target.value }))}
                      rows={4}
                      className="bg-slate-950 border-slate-800 text-white text-sm"
                      placeholder="es. Il trasgressore dichiara: 'Non sapevo che fosse necessaria l'iscrizione immediata dell'animale...'"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 animate-fadeIn">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Motivo della Mancata Contestazione Immediata</Label>
                    <select
                      value={formData.motivoMancataContestazione || ""}
                      onChange={e => setFormData(p => ({ ...p, motivoMancataContestazione: e.target.value }))}
                      className="w-full h-11 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none"
                    >
                      <option value="">-- Seleziona il motivo legale --</option>
                      <option value="Assenza del trasgressore al momento dell'accertamento.">Soggetto assente</option>
                      <option value="Allontanamento repentino del trasgressore per sottrarsi all'identificazione.">Allontanatosi improvvisamente</option>
                      <option value="Necessità di completare i rilievi tecnici ed anagrafici successivi sui registri.">Rilievi anagrafici successivi</option>
                      <option value="Motivi di sicurezza pubblica e incolumità degli agenti operanti sul campo.">Sicurezza degli operatori</option>
                    </select>
                  </div>
                )}
              </div>

              {/* SEQUESTRO AMMINISTRATIVO */}
              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Sequestro Amministrativo Cautelare (Art. 13 L. 689/81)
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="sequestroAmministrativo"
                      checked={formData.sequestroAmministrativo || false}
                      onChange={e => setFormData(p => ({ ...p, sequestroAmministrativo: e.target.checked }))}
                      className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="sequestroAmministrativo" className="text-xs text-slate-300 font-medium cursor-pointer uppercase tracking-wider">
                      Sequestro Effettuato
                    </label>
                  </div>
                </div>

                {formData.sequestroAmministrativo && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40 animate-fadeIn">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Numero Verbale Sequestro</Label>
                      <Input 
                        value={formData.sequestroVerbaleNumero || ""}
                        onChange={e => setFormData(p => ({ ...p, sequestroVerbaleNumero: e.target.value }))}
                        className="bg-slate-950 border-slate-800 text-white font-mono"
                        placeholder="SEQ-2026-0012"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Verbale di Sequestro del (Data)</Label>
                      <Input 
                        type="date"
                        value={formData.sequestroVerbaleDel || ""}
                        onChange={e => setFormData(p => ({ ...p, sequestroVerbaleDel: e.target.value }))}
                        className="bg-slate-950 border-slate-800 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: PAGAMENTO RIDOTTO & ENTI */}
          {activeStep === "pagamento" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <CreditCard className="h-4 w-4" />
                  Calcolo Pagamento in Misura Ridotta (P.M.R.)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Sanzione in Misura Ridotta (€)</Label>
                    <Input 
                      type="number"
                      value={formData.pagamentoMisuraRidotta || 0}
                      onChange={e => setFormData(p => ({ ...p, pagamentoMisuraRidotta: Number(e.target.value), pagamentoMisuraRidottaLettere: numeroInLettere(Number(e.target.value)) }))}
                      className="bg-slate-950 border-slate-800 text-sky-400 font-mono text-center font-bold text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Spese di Notifica (€)</Label>
                    <Input 
                      type="number"
                      value={formData.speseNotifica || 0}
                      onChange={e => setFormData(p => ({ ...p, speseNotifica: Number(e.target.value) }))}
                      className="bg-slate-950 border-slate-800 text-white font-mono text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal font-bold">Importo Totale da Pagare (€)</Label>
                    <div className="h-10 px-3 bg-sky-950/40 border border-sky-500/20 text-sky-400 font-mono flex items-center justify-center font-bold text-lg rounded-md">
                      € {formData.pagamentoTotale?.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Sanzione in Lettere</Label>
                  <Input 
                    value={formData.pagamentoMisuraRidottaLettere || ""}
                    onChange={e => setFormData(p => ({ ...p, pagamentoMisuraRidottaLettere: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-slate-300 font-mono uppercase text-xs"
                    readOnly
                  />
                </div>
              </div>

              <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                  <CreditCard className="h-4 w-4" />
                  Modalità di Pagamento & Ente Beneficiario
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Seleziona Ente Destinatario</Label>
                  <select
                    value={formData.metodoPagamento || "regione_toscana"}
                    onChange={e => {
                      const val = e.target.value as any;
                      let update: Partial<SanctionReport> = { metodoPagamento: val };
                      if (val === "regione_toscana") {
                        update.regioneIban = "IT 93 O 01030 02800 000000288505";
                        update.regioneCcPostale = "288505";
                        update.regioneIntestatario = "REGIONE TOSCANA - TESORERIA REGIONALE, Piazza Duomo 10, Firenze";
                        update.ricorsoAutorita = "regione_toscana";
                      } else if (val === "comune_carrara") {
                        update.comuneNome = "Comune di Carrara";
                        update.comuneIban = "IT 45 K 03069 24502 100000012345";
                        update.comuneCcPostale = "13154546";
                        update.comuneIntestatario = "COMUNE DI CARRARA - SERVIZIO ENTRATE";
                        update.comuneLinkPagoPa = "https://carrara.toscana.pagopa.it";
                        update.ricorsoAutorita = "comune";
                        update.ricorsoComuneNome = "Sindaco del Comune di Carrara";
                        update.ricorsoComunePec = "comune.carrara@postacert.toscana.it";
                      } else {
                        update.comuneNome = "Comune di Massa";
                        update.comuneIban = "IT 12 A 03069 24502 100000098765";
                        update.comuneCcPostale = "12345678";
                        update.comuneIntestatario = "COMUNE DI MASSA - SERVIZIO ENTRATE";
                        update.comuneLinkPagoPa = "https://massa.toscana.pagopa.it";
                        update.ricorsoAutorita = "comune";
                        update.ricorsoComuneNome = "Sindaco del Comune di Massa";
                        update.ricorsoComunePec = "comune.massa@postacert.toscana.it";
                      }
                      setFormData(p => ({ ...p, ...update }));
                    }}
                    className="w-full h-11 px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none"
                  >
                    <option value="regione_toscana">REGIONE TOSCANA (Sanzione Zoofila/Ittica/Venatoria Regionale)</option>
                    <option value="comune_carrara">COMUNE DI CARRARA (Sanzione Regolamento Comunale Carrara)</option>
                    <option value="altro_comune">COMUNE DI MASSA (Sanzione Regolamento Comunale Massa)</option>
                  </select>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-2 text-xs">
                  {formData.metodoPagamento === "regione_toscana" ? (
                    <>
                      <p><strong className="text-white">Coordinate di Pagamento:</strong> Pagamento su C/C Postale n. <span className="font-mono text-sky-400 font-bold">{formData.regioneCcPostale}</span> intestato a: <span className="text-slate-300 font-medium">{formData.regioneIntestatario}</span></p>
                      <p><strong className="text-white">Codice IBAN:</strong> <span className="font-mono text-emerald-400 select-all font-semibold">{formData.regioneIban}</span></p>
                    </>
                  ) : (
                    <>
                      <p><strong className="text-white">Ente Beneficiario:</strong> {formData.comuneNome}</p>
                      <p><strong className="text-white">Coordinate di Pagamento:</strong> Pagamento su C/C Postale n. <span className="font-mono text-sky-400 font-bold">{formData.comuneCcPostale}</span> intestato a: <span className="text-slate-300 font-medium">{formData.comuneIntestatario}</span></p>
                      <p><strong className="text-white">Codice IBAN:</strong> <span className="font-mono text-emerald-400 select-all font-semibold">{formData.comuneIban}</span></p>
                      <p><strong className="text-white">Portale Online:</strong> <a href={formData.comuneLinkPagoPa} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">{formData.comuneLinkPagoPa} (PagoPA)</a></p>
                    </>
                  )}
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider pt-2 border-t border-slate-900/60 mt-2">
                    N.B. Il pagamento deve essere effettuato entro il termine perentorio di 60 (sessanta) giorni dalla data di contestazione o notificazione del presente verbale.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DIGITAL SIGNATURES & SUBMIT */}
          {activeStep === "firme" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* SIGNATURE 1: TRASGRESSORE */}
                <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Firma del Trasgressore</Label>
                    <button 
                      type="button" 
                      onClick={() => clearCanvas(canvasTrasgressoreRef, setFirmaTrasgressoreData)}
                      className="text-[10px] text-red-400 hover:underline flex items-center gap-1 uppercase"
                    >
                      <Trash2 className="h-3 w-3" /> Cancella
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-850 h-40 relative">
                    <canvas 
                      ref={canvasTrasgressoreRef}
                      width={300}
                      height={160}
                      className="w-full h-full cursor-crosshair"
                      onMouseDown={(e) => startDrawing(canvasTrasgressoreRef, e)}
                      onMouseMove={(e) => draw(canvasTrasgressoreRef, e)}
                      onMouseUp={() => stopDrawing(canvasTrasgressoreRef, setFirmaTrasgressoreData)}
                      onMouseLeave={() => stopDrawing(canvasTrasgressoreRef, setFirmaTrasgressoreData)}
                      onTouchStart={(e) => startDrawing(canvasTrasgressoreRef, e)}
                      onTouchMove={(e) => draw(canvasTrasgressoreRef, e)}
                      onTouchEnd={() => stopDrawing(canvasTrasgressoreRef, setFirmaTrasgressoreData)}
                    />
                    {!firmaTrasgressoreData && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs pointer-events-none uppercase tracking-widest italic">
                        Firma Trasgressore qui
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="accettaContenuto"
                        checked={formData.accettaContenutoERitira || false}
                        onChange={e => setFormData(p => ({ ...p, accettaContenutoERitira: e.target.checked, rifiutaFirmareMaRitira: !e.target.checked }))}
                        className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
                      />
                      <label htmlFor="accettaContenuto" className="text-[10px] text-slate-400 font-medium cursor-pointer uppercase tracking-wider">
                        Sottoscrive e ritira copia
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="rifiutaFirmare"
                        checked={formData.rifiutaFirmareMaRitira || false}
                        onChange={e => setFormData(p => ({ ...p, rifiutaFirmareMaRitira: e.target.checked, accettaContenutoERitira: !e.target.checked }))}
                        className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
                      />
                      <label htmlFor="rifiutaFirmare" className="text-[10px] text-slate-400 font-medium cursor-pointer uppercase tracking-wider">
                        Rifiuta firmare ma ritira
                      </label>
                    </div>
                  </div>
                </div>

                {/* SIGNATURE 2: OBBLIGATO IN SOLIDO (Conditional) */}
                {hasObbligato ? (
                  <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Firma Obbligato in solido</Label>
                      <button 
                        type="button" 
                        onClick={() => clearCanvas(canvasObbligatoRef, setFirmaObbligatoData)}
                        className="text-[10px] text-red-400 hover:underline flex items-center gap-1 uppercase"
                      >
                        <Trash2 className="h-3 w-3" /> Cancella
                      </button>
                    </div>
                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-850 h-40 relative">
                      <canvas 
                        ref={canvasObbligatoRef}
                        width={300}
                        height={160}
                        className="w-full h-full cursor-crosshair"
                        onMouseDown={(e) => startDrawing(canvasObbligatoRef, e)}
                        onMouseMove={(e) => draw(canvasObbligatoRef, e)}
                        onMouseUp={() => stopDrawing(canvasObbligatoRef, setFirmaObbligatoData)}
                        onMouseLeave={() => stopDrawing(canvasObbligatoRef, setFirmaObbligatoData)}
                        onTouchStart={(e) => startDrawing(canvasObbligatoRef, e)}
                        onTouchMove={(e) => draw(canvasObbligatoRef, e)}
                        onTouchEnd={() => stopDrawing(canvasObbligatoRef, setFirmaObbligatoData)}
                      />
                      {!firmaObbligatoData && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs pointer-events-none uppercase tracking-widest italic">
                          Firma Obbligato qui
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#05070f] border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col justify-center items-center text-center text-slate-500 h-full">
                    <User className="h-8 w-8 text-slate-700 mb-2" />
                    <p className="text-xs uppercase tracking-wider">Obbligato in solido non abilitato</p>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-[180px]">Attivabile dallo Step 2 qualora sia presente un secondo soggetto responsabile civile.</p>
                  </div>
                )}

                {/* SIGNATURE 3: AGENTE ACCERTATORE */}
                <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-normal">Firma del Verbalizzante</Label>
                    <button 
                      type="button" 
                      onClick={() => clearCanvas(canvasGuardiaRef, setFirmaGuardiaData)}
                      className="text-[10px] text-red-400 hover:underline flex items-center gap-1 uppercase"
                    >
                      <Trash2 className="h-3 w-3" /> Cancella
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-850 h-40 relative">
                    <canvas 
                      ref={canvasGuardiaRef}
                      width={300}
                      height={160}
                      className="w-full h-full cursor-crosshair"
                      onMouseDown={(e) => startDrawing(canvasGuardiaRef, e)}
                      onMouseMove={(e) => draw(canvasGuardiaRef, e)}
                      onMouseUp={() => stopDrawing(canvasGuardiaRef, setFirmaGuardiaData)}
                      onMouseLeave={() => stopDrawing(canvasGuardiaRef, setFirmaGuardiaData)}
                      onTouchStart={(e) => startDrawing(canvasGuardiaRef, e)}
                      onTouchMove={(e) => draw(canvasGuardiaRef, e)}
                      onTouchEnd={() => stopDrawing(canvasGuardiaRef, setFirmaGuardiaData)}
                    />
                    {!firmaGuardiaData && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs pointer-events-none uppercase tracking-widest italic">
                        Firma Accertatore qui
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest mt-1">
                    {currentGuard ? `${currentGuard.name} ${currentGuard.surname || ""}` : "Agente Accertatore"}
                  </div>
                </div>

              </div>

              {/* WARNING BOX */}
              <div className="bg-sky-500/5 border border-sky-500/10 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="text-white font-bold uppercase tracking-wider">Verifica Giuridica prima del Deposito</p>
                  <p className="text-slate-400 mt-1">
                    Una volta premuto "Invia e Archivia", l'atto assume valore di documento ufficiale del Nucleo Guardie. Verrà trasmesso istantaneamente all'archivio della Sede HQ e sincronizzato in Cloud. Assicurarsi della correttezza delle generalità e delle sanzioni comminate.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950 flex flex-row justify-between items-center shrink-0">
          <div>
            {activeStep !== "general" && (
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => {
                  if (activeStep === "soggetto") setActiveStep("general");
                  else if (activeStep === "violazione") setActiveStep("soggetto");
                  else if (activeStep === "contestazione") setActiveStep("violazione");
                  else if (activeStep === "pagamento") setActiveStep("contestazione");
                  else if (activeStep === "firme") setActiveStep("pagamento");
                }}
                className="text-slate-400 hover:text-white uppercase tracking-wider text-xs font-semibold"
              >
                Indietro
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 text-slate-400 hover:text-white uppercase tracking-wider text-xs font-semibold"
            >
              Annulla
            </Button>

            {activeStep !== "firme" ? (
              <Button 
                type="button"
                onClick={() => {
                  if (activeStep === "general") setActiveStep("soggetto");
                  else if (activeStep === "soggetto") setActiveStep("violazione");
                  else if (activeStep === "violazione") setActiveStep("contestazione");
                  else if (activeStep === "contestazione") setActiveStep("pagamento");
                  else if (activeStep === "pagamento") setActiveStep("firme");
                }}
                className="bg-sky-500 hover:bg-sky-600 text-white uppercase tracking-wider text-xs font-bold"
              >
                Avanti
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={handleSaveSanction}
                disabled={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white uppercase tracking-wider text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/10"
              >
                {isSubmitting ? "Salvataggio..." : "Invia e Archivia"}
                <Save className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>

        {/* OVERLAY PROGRESSO SALVATAGGIO */}
        {isSubmitting && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-sky-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="h-16 w-16 mx-auto rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white uppercase tracking-wider">Salvataggio Verbale Sanzionatorio</h4>
                <p className="text-xs text-slate-400 mt-1">Registrazione dell'atto, firme e sincronizzazione microchip...</p>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div className="bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 h-full rounded-full animate-pulse w-4/5 transition-all" />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Archiviazione telematica</span>
                  <span className="font-bold text-sky-400">Invio in corso...</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};

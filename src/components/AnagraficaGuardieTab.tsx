import React, { useState, useMemo } from "react";
import { 
  Users, UserPlus, Shield, Award, Search, Filter, Calendar, Clock, 
  Phone, Mail, FileText, Edit, Trash2, Printer, CheckCircle2, 
  AlertTriangle, XCircle, BadgeCheck, QrCode, Eye, Save, Download, 
  ExternalLink, ChevronRight, X, Sparkles, AlertCircle, RefreshCw,
  Lock, Unlock, Check, Compass, MapPin
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Guard, GuardPrivateInfo, Shift } from "../types";
import { cn } from "../lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { ReportHeader, getOfficialPrintHeaderHtml } from "./ReportHeader";

interface AnagraficaGuardieTabProps {
  guards: Guard[];
  guardPrivateInfoMap: Record<string, GuardPrivateInfo>;
  currentGuard: Guard | null;
  isAdmin: boolean;
  isResponsabile: boolean;
  onRefreshPrivateInfo?: (guardId: string) => void;
  shifts?: Shift[];
}

export const parseAnyDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  if (typeof dateVal === "object" && typeof dateVal.toDate === "function") {
    try {
      const d = dateVal.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof dateVal === "number") {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Check Italian date format: DD/MM/YYYY or DD-MM-YYYY (with optional time)
    const itMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (itMatch) {
      const day = parseInt(itMatch[1], 10);
      const month = parseInt(itMatch[2], 10) - 1;
      const year = parseInt(itMatch[3], 10);
      const hour = itMatch[4] ? parseInt(itMatch[4], 10) : 0;
      const min = itMatch[5] ? parseInt(itMatch[5], 10) : 0;
      const sec = itMatch[6] ? parseInt(itMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      return isNaN(d.getTime()) ? null : d;
    }

    // Try parseISO
    try {
      const iso = parseISO(trimmed);
      if (!isNaN(iso.getTime())) return iso;
    } catch {}

    // Try native Date constructor
    try {
      const fallback = new Date(trimmed);
      if (!isNaN(fallback.getTime())) return fallback;
    } catch {}
  }
  return null;
};

export const safeFormatDate = (dateVal: any, formatTemplate: string = "dd/MM/yyyy", fallback: string = "—", options?: any): string => {
  try {
    const d = parseAnyDate(dateVal);
    if (!d) return fallback;
    return format(d, formatTemplate, options);
  } catch {
    return fallback;
  }
};

export const safeDifferenceInDays = (dateVal: any, baseDate: Date = new Date()): number | null => {
  const d = parseAnyDate(dateVal);
  if (!d) return null;
  return differenceInDays(d, baseDate);
};

export const AnagraficaGuardieTab: React.FC<AnagraficaGuardieTabProps> = ({
  guards,
  guardPrivateInfoMap,
  currentGuard,
  isAdmin,
  isResponsabile,
  onRefreshPrivateInfo,
  shifts = [],
}) => {
  // Filters & search state
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("tutti");
  const [statusFilter, setStatusFilter] = useState<string>("tutti"); // "tutti", "attivi", "disabilitati", "in_scadenza"
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Selected guard for details / edit / dossier modal
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isDecreeAlertModalOpen, setIsDecreeAlertModalOpen] = useState(false);
  const [decreeAlertTab, setDecreeAlertTab] = useState<"tutti" | "scaduti" | "in_scadenza">("tutti");
  const [dossierActiveTab, setDossierActiveTab] = useState<"anagrafica" | "contatti" | "connotati" | "vestiario" | "servizio" | "decreti">("anagrafica");
  const [localPrivateMap, setLocalPrivateMap] = useState<Record<string, GuardPrivateInfo>>({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<"anagrafica" | "decreti" | "recapiti" | "connotati" | "vestiario" | "carriera">("anagrafica");

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    surname: string;
    matricola: string;
    role: "guardia" | "responsabile" | "admin";
    rank: string;
    qualifications: string[];
    phone: string;
    email: string;
    photo: string;
    isDisabled: boolean;
    section: string;
    // Private Info
    codiceFiscale: string;
    birthDate: string;
    birthPlace: string;
    address: string;
    city: string;
    cap: string;
    province: string;
    cellulare: string;
    emergencyContact: string;
    emergencyPhone: string;
    titoloStudio: string;
    linguaConosciuta: string;
    statura: string;
    tipoCapelli: string;
    coloreCapelli: string;
    coloreOcchi: string;
    gradoAssunto: string;
    passaggioGrado: string;
    matricolaOperativa: string;
    dataSospensione: string;
    motivoSospensione: string;
    dataAllontanamento: string;
    motivoAllontanamento: string;
    dataRiammissione: string;
    telegramChatId: string;
    scadenzaZoofila: string;
    scadenzaIttica: string;
    scadenzaVenatoria: string;
    scadenzaAmbientale: string;
    tagliaCamicia: string;
    tagliaCalzoni: string;
    tagliaMaglione: string;
    misuraScarponi: string;
    notes: string;
  }>({
    name: "",
    surname: "",
    matricola: "",
    role: "guardia",
    rank: "Guardia Particolare Giurata",
    qualifications: ["Zoofila"],
    phone: "",
    email: "",
    photo: "",
    isDisabled: false,
    section: "Massa-Carrara",
    codiceFiscale: "",
    birthDate: "",
    birthPlace: "",
    address: "",
    city: "",
    cap: "",
    province: "MS",
    cellulare: "",
    emergencyContact: "",
    emergencyPhone: "",
    titoloStudio: "",
    linguaConosciuta: "",
    statura: "",
    tipoCapelli: "",
    coloreCapelli: "",
    coloreOcchi: "",
    gradoAssunto: "",
    passaggioGrado: "",
    matricolaOperativa: "",
    dataSospensione: "",
    motivoSospensione: "",
    dataAllontanamento: "",
    motivoAllontanamento: "",
    dataRiammissione: "",
    telegramChatId: "",
    scadenzaZoofila: "",
    scadenzaIttica: "",
    scadenzaVenatoria: "",
    scadenzaAmbientale: "",
    tagliaCamicia: "",
    tagliaCalzoni: "",
    tagliaMaglione: "",
    misuraScarponi: "",
    notes: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Helper to get decree status: "valido" | "in_scadenza" | "scaduto" | "mancante"
  const getDecreeStatus = (dateStr?: string) => {
    if (!dateStr) return { status: "mancante", label: "Non registrato", color: "text-slate-500 bg-slate-800/40 border-slate-700" };
    const d = parseAnyDate(dateStr);
    if (!d) return { status: "mancante", label: "Non registrato", color: "text-slate-500 bg-slate-800/40 border-slate-700" };
    try {
      const days = differenceInDays(d, new Date());
      if (days < 0) {
        return { status: "scaduto", label: `Scaduto (${Math.abs(days)} gg fa)`, color: "text-red-400 bg-red-950/60 border-red-800" };
      }
      if (days <= 60) {
        return { status: "in_scadenza", label: `In scadenza (${days} gg)`, color: "text-amber-300 bg-amber-950/60 border-amber-800 animate-pulse" };
      }
      return { status: "valido", label: `Valido (${safeFormatDate(d, "dd/MM/yyyy")})`, color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" };
    } catch {
      return { status: "mancante", label: "Non registrato", color: "text-slate-500 bg-slate-800/40 border-slate-700" };
    }
  };

  // Helper to obtain full private info merging state, local cache and doc
  const getGuardPrivate = (guardOrId: Guard | string): GuardPrivateInfo => {
    const id = typeof guardOrId === "string" ? guardOrId : guardOrId.id;
    const basePrivate = typeof guardOrId === "object" ? guardOrId.privateInfo : undefined;
    return localPrivateMap[id] || guardPrivateInfoMap[id] || basePrivate || {};
  };

  // Check if guard has any expiring or expired decree
  const checkGuardDecreeAlert = (g: Guard) => {
    const priv = getGuardPrivate(g);
    const dates = [
      priv.scadenzaZoofila,
      priv.scadenzaIttica,
      priv.scadenzaVenatoria,
      priv.scadenzaAmbientale,
    ].filter(Boolean);

    let hasExpired = false;
    let hasExpiring = false;

    for (const dStr of dates) {
      const st = getDecreeStatus(dStr);
      if (st.status === "scaduto") hasExpired = true;
      if (st.status === "in_scadenza") hasExpiring = true;
    }

    return { hasExpired, hasExpiring };
  };

  // Filtered guards
  const filteredGuards = useMemo(() => {
    return guards.filter((g) => {
      const priv = getGuardPrivate(g);
      const fullName = `${g.surname || ""} ${g.name || ""}`.toLowerCase();
      const mat = (g.matricola || "").toLowerCase();
      const cf = (priv.codiceFiscale || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || fullName.includes(search) || mat.includes(search) || cf.includes(search);

      // Sector filter
      let matchesSector = true;
      if (sectorFilter !== "tutti") {
        const quals = (g.qualifications || []).map((q) => q.toLowerCase());
        matchesSector = quals.some((q) => q.includes(sectorFilter.toLowerCase()));
      }

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "attivi") {
        matchesStatus = !g.isDisabled && !g.isNotActive;
      } else if (statusFilter === "disabilitati") {
        matchesStatus = Boolean(g.isDisabled || g.isNotActive);
      } else if (statusFilter === "in_scadenza") {
        const { hasExpired, hasExpiring } = checkGuardDecreeAlert(g);
        matchesStatus = hasExpired || hasExpiring;
      } else if (statusFilter === "solo_scaduti") {
        const { hasExpired } = checkGuardDecreeAlert(g);
        matchesStatus = hasExpired;
      } else if (statusFilter === "solo_in_scadenza") {
        const { hasExpiring } = checkGuardDecreeAlert(g);
        matchesStatus = hasExpiring;
      }

      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [guards, guardPrivateInfoMap, localPrivateMap, searchTerm, sectorFilter, statusFilter]);

  // List of all guards with expiring or expired decrees with detailed items
  const decreeAlertsList = useMemo(() => {
    const list: Array<{
      guard: Guard;
      items: Array<{
        sector: string;
        dateStr: string;
        status: "in_scadenza" | "scaduto" | "valido" | "mancante";
        label: string;
        color: string;
      }>;
      hasExpired: boolean;
      hasExpiring: boolean;
    }> = [];

    guards.forEach((g) => {
      const priv = getGuardPrivate(g);
      const decreeEntries = [
        { sector: "Zoofilo", dateStr: priv.scadenzaZoofila },
        { sector: "Ittico", dateStr: priv.scadenzaIttica },
        { sector: "Venatorio", dateStr: priv.scadenzaVenatoria },
        { sector: "Ambientale", dateStr: priv.scadenzaAmbientale },
      ];

      const problemItems: Array<{
        sector: string;
        dateStr: string;
        status: "in_scadenza" | "scaduto" | "valido" | "mancante";
        label: string;
        color: string;
      }> = [];

      let hasExpired = false;
      let hasExpiring = false;

      decreeEntries.forEach((entry) => {
        if (entry.dateStr) {
          const st = getDecreeStatus(entry.dateStr);
          if (st.status === "scaduto") {
            hasExpired = true;
            problemItems.push({ sector: entry.sector, dateStr: entry.dateStr, status: st.status, label: st.label, color: st.color });
          } else if (st.status === "in_scadenza") {
            hasExpiring = true;
            problemItems.push({ sector: entry.sector, dateStr: entry.dateStr, status: st.status, label: st.label, color: st.color });
          }
        }
      });

      if (hasExpired || hasExpiring) {
        list.push({
          guard: g,
          items: problemItems,
          hasExpired,
          hasExpiring,
        });
      }
    });

    // Sort: expired first, then expiring
    return list.sort((a, b) => {
      if (a.hasExpired && !b.hasExpired) return -1;
      if (!a.hasExpired && b.hasExpired) return 1;
      return a.guard.surname.localeCompare(b.guard.surname);
    });
  }, [guards, guardPrivateInfoMap, localPrivateMap]);

  // General statistics
  const stats = useMemo(() => {
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    guards.forEach((g) => {
      if (!g.isDisabled && !g.isNotActive) activeCount++;
      const { hasExpired, hasExpiring } = checkGuardDecreeAlert(g);
      if (hasExpired) expiredCount++;
      if (hasExpiring) expiringCount++;
    });

    return {
      total: guards.length,
      active: activeCount,
      expiring: expiringCount,
      expired: expiredCount,
    };
  }, [guards, guardPrivateInfoMap, localPrivateMap]);

  // Open Full Guard Dossier
  const handleOpenDossier = async (guard: Guard) => {
    setSelectedGuard(guard);
    setIsDossierModalOpen(true);
    setDossierActiveTab("anagrafica");

    if (onRefreshPrivateInfo) {
      onRefreshPrivateInfo(guard.id);
    }

    if (!localPrivateMap[guard.id] && !guardPrivateInfoMap[guard.id]) {
      try {
        const snap = await getDoc(doc(db, "guards", guard.id, "private", "data"));
        if (snap.exists()) {
          const pData = snap.data() as GuardPrivateInfo;
          setLocalPrivateMap((prev) => ({ ...prev, [guard.id]: pData }));
        }
      } catch (err) {
        console.warn("Dati anagrafici privati non reperibili:", err);
      }
    }
  };

  // Official A4 Printout for Single Guard Dossier
  const handlePrintSingleGuardDossier = (guard: Guard) => {
    const priv = getGuardPrivate(guard);
    const stZoo = getDecreeStatus(priv.scadenzaZoofila);
    const stItt = getDecreeStatus(priv.scadenzaIttica);
    const stVen = getDecreeStatus(priv.scadenzaVenatoria);
    const stAmb = getDecreeStatus(priv.scadenzaAmbientale);

    const printWin = window.open("", "_blank", "width=900,height=1100");
    if (!printWin) {
      alert("Abilita i popup nel browser per stampare il fascicolo della guardia.");
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Fascicolo Personale - ${guard.matricola} ${guard.surname} ${guard.name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.4; }
    .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
    .title-box { text-align: center; margin: 10px 0 14px; }
    .title { font-size: 14pt; font-weight: 900; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.5px; margin: 0; }
    .subtitle { font-size: 9.5pt; font-weight: 700; color: #475569; text-transform: uppercase; margin: 2px 0 0; }
    .grid-2 { display: flex; gap: 16px; margin-bottom: 12px; }
    .col-left { flex: 1; }
    .col-right { width: 120px; text-align: center; }
    .photo-box { width: 110px; height: 130px; border: 1.5px solid #64748b; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f8fafc; margin: 0 auto; font-size: 8.5pt; color: #94a3b8; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .section-title { font-size: 10pt; font-weight: 800; text-transform: uppercase; background: #f1f5f9; border-left: 4px solid #1e3a8a; padding: 4px 8px; margin: 10px 0 5px; letter-spacing: 0.5px; color: #1e3a8a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
    table.data-table td { padding: 3.5px 6px; font-size: 9.5pt; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    table.data-table td.label { width: 32%; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 8pt; }
    table.data-table td.val { font-weight: 600; color: #0f172a; }
    table.decree-table th { background: #e2e8f0; font-size: 8pt; font-weight: 800; text-transform: uppercase; padding: 4px 6px; text-align: left; border: 1px solid #cbd5e1; }
    table.decree-table td { padding: 4px 6px; font-size: 9pt; border: 1px solid #cbd5e1; }
    .signatures { margin-top: 26px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .sig-box { width: 45%; text-align: center; border-top: 1px solid #0f172a; padding-top: 5px; font-size: 9pt; font-weight: 600; }
  </style>
</head>
<body>
  ${getOfficialPrintHeaderHtml()}
  <div class="title-box">
    <div class="title">Fascicolo Personale di Servizio</div>
    <div class="subtitle">Scheda Anagrafica Ufficiale e Stato di Servizio</div>
  </div>

  <div class="grid-2">
    <div class="col-left">
      <table class="data-table">
        <tr>
          <td class="label">Matricola Ruolo:</td>
          <td class="val"><strong>${guard.matricola}</strong> ${priv.matricolaOperativa ? `(Matr. Operativa: ${priv.matricolaOperativa})` : ""}</td>
        </tr>
        <tr>
          <td class="label">Nominativo:</td>
          <td class="val"><strong>${guard.surname.toUpperCase()} ${guard.name.toUpperCase()}</strong></td>
        </tr>
        <tr>
          <td class="label">Grado / Ruolo:</td>
          <td class="val">${guard.rank || "Guardia Particolare Giurata"} • ${guard.role.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Sezione di Appartenenza:</td>
          <td class="val">${guard.section || "Massa-Carrara"}</td>
        </tr>
        <tr>
          <td class="label">Settori Qualificati:</td>
          <td class="val">${(guard.qualifications || []).join(", ") || "Zoofila"}</td>
        </tr>
      </table>
    </div>
    <div class="col-right">
      <div class="photo-box">
        ${guard.photo ? `<img src="${guard.photo}" alt="Foto" />` : `<span>FOTOTESSERA<br>UFFICIALE</span>`}
      </div>
    </div>
  </div>

  <div class="section-title">1. Dati Anagrafici e Personali</div>
  <table class="data-table">
    <tr>
      <td class="label">Codice Fiscale:</td>
      <td class="val" style="font-family: monospace; letter-spacing: 1px;">${priv.codiceFiscale || "—"}</td>
      <td class="label">Data di Nascita:</td>
      <td class="val">${safeFormatDate(priv.birthDate, "dd/MM/yyyy", priv.birthDate || "—")}</td>
    </tr>
    <tr>
      <td class="label">Luogo di Nascita:</td>
      <td class="val">${priv.birthPlace || "—"}</td>
      <td class="label">Titolo di Studio:</td>
      <td class="val">${priv.titoloStudio || "—"}</td>
    </tr>
    <tr>
      <td class="label">Lingua Conosciuta:</td>
      <td class="val" colspan="3">${priv.linguaConosciuta || "Italiano (madrelingua)"}</td>
    </tr>
  </table>

  <div class="section-title">2. Residenza e Recapiti di Servizio</div>
  <table class="data-table">
    <tr>
      <td class="label">Indirizzo Residenza:</td>
      <td class="val" colspan="3">${priv.address || "—"} - ${priv.city || priv.comune || ""} (${priv.province || "MS"}) CAP ${priv.cap || ""}</td>
    </tr>
    <tr>
      <td class="label">Cellulare Servizio:</td>
      <td class="val">${guard.phone || priv.cellulare || "—"}</td>
      <td class="label">Email Istituzionale:</td>
      <td class="val">${guard.email || priv.email || "—"}</td>
    </tr>
    <tr>
      <td class="label">Contatto Emergenza (ICE):</td>
      <td class="val">${priv.emergencyContact || "—"}</td>
      <td class="label">Telefono Emergenza:</td>
      <td class="val">${priv.emergencyPhone || "—"}</td>
    </tr>
  </table>

  <div class="section-title">3. Connotati Fisici e Dotazioni Vestiario</div>
  <table class="data-table">
    <tr>
      <td class="label">Statura:</td>
      <td class="val">${priv.statura ? priv.statura + " cm" : "—"}</td>
      <td class="label">Tipo / Colore Capelli:</td>
      <td class="val">${priv.tipoCapelli || "—"} / ${priv.coloreCapelli || "—"}</td>
    </tr>
    <tr>
      <td class="label">Colore Occhi:</td>
      <td class="val">${priv.coloreOcchi || "—"}</td>
      <td class="label">Taglia Camicia / Calzoni:</td>
      <td class="val">${priv.tagliaCamicia || "—"} / ${priv.tagliaCalzoni || "—"}</td>
    </tr>
    <tr>
      <td class="label">Taglia Maglione:</td>
      <td class="val">${priv.tagliaMaglione || "—"}</td>
      <td class="label">Misura Scarponi:</td>
      <td class="val">${priv.misuraScarponi || "—"}</td>
    </tr>
  </table>

  <div class="section-title">4. Decreti Prefettizi e Titoli Autorizzativi</div>
  <table class="decree-table">
    <thead>
      <tr>
        <th>Settore Operativo</th>
        <th>Data Scadenza Decreto</th>
        <th>Stato di Validità Giuridica</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Settore Zoofilo</strong></td>
        <td>${safeFormatDate(priv.scadenzaZoofila, "dd/MM/yyyy", priv.scadenzaZoofila || "Non registrata")}</td>
        <td>${stZoo.label}</td>
      </tr>
      <tr>
        <td><strong>Settore Ittico</strong></td>
        <td>${safeFormatDate(priv.scadenzaIttica, "dd/MM/yyyy", priv.scadenzaIttica || "Non registrata")}</td>
        <td>${stItt.label}</td>
      </tr>
      <tr>
        <td><strong>Settore Venatorio</strong></td>
        <td>${safeFormatDate(priv.scadenzaVenatoria, "dd/MM/yyyy", priv.scadenzaVenatoria || "Non registrata")}</td>
        <td>${stVen.label}</td>
      </tr>
      <tr>
        <td><strong>Settore Ambientale</strong></td>
        <td>${safeFormatDate(priv.scadenzaAmbientale, "dd/MM/yyyy", priv.scadenzaAmbientale || "Non registrata")}</td>
        <td>${stAmb.label}</td>
      </tr>
    </tbody>
  </table>

  ${priv.notes ? `
  <div class="section-title">5. Note Riservate e Abilitazioni</div>
  <div style="font-size: 9pt; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px;">
    ${priv.notes}
  </div>` : ""}

  <div class="signatures">
    <div class="sig-box">
      Firma della Guardia Particolare Giurata<br><br><br>
      ___________________________________
    </div>
    <div class="sig-box">
      Il Responsabile / Comandante del Nucleo<br><br><br>
      ___________________________________
    </div>
  </div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  // Open Edit modal
  const handleOpenEdit = (guard: Guard) => {
    setSelectedGuard(guard);
    const priv = getGuardPrivate(guard);

    setFormData({
      name: guard.name || "",
      surname: guard.surname || "",
      matricola: guard.matricola || "",
      role: guard.role || "guardia",
      rank: guard.rank || "Guardia Particolare Giurata",
      qualifications: guard.qualifications || ["Zoofila"],
      phone: guard.phone || priv.cellulare || "",
      email: guard.email || priv.email || "",
      photo: guard.photo || priv.photo || "",
      isDisabled: Boolean(guard.isDisabled),
      section: guard.section || "Massa-Carrara",
      codiceFiscale: priv.codiceFiscale || "",
      birthDate: priv.birthDate || "",
      birthPlace: priv.birthPlace || "",
      address: priv.address || "",
      city: priv.city || priv.comune || "",
      cap: priv.cap || "",
      province: priv.province || "MS",
      cellulare: priv.cellulare || guard.phone || "",
      emergencyContact: priv.emergencyContact || "",
      emergencyPhone: priv.emergencyPhone || "",
      titoloStudio: priv.titoloStudio || "",
      linguaConosciuta: priv.linguaConosciuta || "",
      statura: priv.statura || "",
      tipoCapelli: priv.tipoCapelli || "",
      coloreCapelli: priv.coloreCapelli || "",
      coloreOcchi: priv.coloreOcchi || "",
      gradoAssunto: priv.gradoAssunto || "",
      passaggioGrado: priv.passaggioGrado || "",
      matricolaOperativa: priv.matricolaOperativa || "",
      dataSospensione: priv.dataSospensione || "",
      motivoSospensione: priv.motivoSospensione || "",
      dataAllontanamento: priv.dataAllontanamento || "",
      motivoAllontanamento: priv.motivoAllontanamento || "",
      dataRiammissione: priv.dataRiammissione || "",
      telegramChatId: priv.telegramChatId || "",
      scadenzaZoofila: priv.scadenzaZoofila || "",
      scadenzaIttica: priv.scadenzaIttica || "",
      scadenzaVenatoria: priv.scadenzaVenatoria || "",
      scadenzaAmbientale: priv.scadenzaAmbientale || "",
      tagliaCamicia: priv.tagliaCamicia || "",
      tagliaCalzoni: priv.tagliaCalzoni || "",
      tagliaMaglione: priv.tagliaMaglione || "",
      misuraScarponi: priv.misuraScarponi || "",
      notes: priv.notes || "",
    });

    setActiveFormTab("anagrafica");
    setIsEditModalOpen(true);
  };

  // Open Create modal
  const handleOpenCreate = () => {
    setSelectedGuard(null);
    setFormData({
      name: "",
      surname: "",
      matricola: "",
      role: "guardia",
      rank: "Guardia Particolare Giurata",
      qualifications: ["Zoofila"],
      phone: "",
      email: "",
      photo: "",
      isDisabled: false,
      section: "Massa-Carrara",
      codiceFiscale: "",
      birthDate: "",
      birthPlace: "",
      address: "",
      city: "Massa",
      cap: "54100",
      province: "MS",
      cellulare: "",
      emergencyContact: "",
      emergencyPhone: "",
      titoloStudio: "",
      linguaConosciuta: "",
      statura: "",
      tipoCapelli: "",
      coloreCapelli: "",
      coloreOcchi: "",
      gradoAssunto: "",
      passaggioGrado: "",
      matricolaOperativa: "",
      dataSospensione: "",
      motivoSospensione: "",
      dataAllontanamento: "",
      motivoAllontanamento: "",
      dataRiammissione: "",
      telegramChatId: "",
      scadenzaZoofila: "",
      scadenzaIttica: "",
      scadenzaVenatoria: "",
      scadenzaAmbientale: "",
      tagliaCamicia: "",
      tagliaCalzoni: "",
      tagliaMaglione: "",
      misuraScarponi: "",
      notes: "",
    });

    setActiveFormTab("anagrafica");
    setIsCreateModalOpen(true);
  };

  // Save changes (Update or Create)
  const handleSaveGuard = async (isNew: boolean) => {
    if (!formData.name.trim() || !formData.surname.trim()) {
      alert("Inserire Nome e Cognome della guardia.");
      return;
    }
    if (!formData.matricola.trim()) {
      alert("Inserire la Matricola identificativa della guardia.");
      return;
    }

    setIsSaving(true);
    try {
      const publicPayload = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        matricola: formData.matricola.trim().toUpperCase(),
        role: formData.role,
        rank: formData.rank,
        qualifications: formData.qualifications,
        phone: formData.cellulare || formData.phone,
        email: formData.email,
        photo: formData.photo,
        isDisabled: formData.isDisabled,
        section: formData.section,
        updatedAt: new Date().toISOString(),
      };

      const privatePayload: GuardPrivateInfo = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        codiceFiscale: formData.codiceFiscale.trim().toUpperCase(),
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace,
        address: formData.address,
        city: formData.city,
        cap: formData.cap,
        province: formData.province,
        cellulare: formData.cellulare || formData.phone,
        email: formData.email,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        titoloStudio: formData.titoloStudio,
        linguaConosciuta: formData.linguaConosciuta,
        statura: formData.statura,
        tipoCapelli: formData.tipoCapelli,
        coloreCapelli: formData.coloreCapelli,
        coloreOcchi: formData.coloreOcchi,
        gradoAssunto: formData.gradoAssunto,
        passaggioGrado: formData.passaggioGrado,
        matricolaOperativa: formData.matricolaOperativa,
        dataSospensione: formData.dataSospensione,
        motivoSospensione: formData.motivoSospensione,
        dataAllontanamento: formData.dataAllontanamento,
        motivoAllontanamento: formData.motivoAllontanamento,
        dataRiammissione: formData.dataRiammissione,
        telegramChatId: formData.telegramChatId,
        scadenzaZoofila: formData.scadenzaZoofila,
        scadenzaIttica: formData.scadenzaIttica,
        scadenzaVenatoria: formData.scadenzaVenatoria,
        scadenzaAmbientale: formData.scadenzaAmbientale,
        tagliaCamicia: formData.tagliaCamicia,
        tagliaCalzoni: formData.tagliaCalzoni,
        tagliaMaglione: formData.tagliaMaglione,
        misuraScarponi: formData.misuraScarponi,
        notes: formData.notes,
      };

      let targetId = selectedGuard?.id;

      if (isNew || !targetId) {
        // Create new guard document
        const newDocRef = await addDoc(collection(db, "guards"), publicPayload);
        targetId = newDocRef.id;
      } else {
        // Update existing public doc
        await updateDoc(doc(db, "guards", targetId), publicPayload);
      }

      // Update private sub-collection
      if (targetId) {
        await setDoc(doc(db, "guards", targetId, "private", "data"), privatePayload, { merge: true });
        setLocalPrivateMap((prev) => ({
          ...prev,
          [targetId!]: privatePayload,
        }));
        if (onRefreshPrivateInfo) {
          onRefreshPrivateInfo(targetId);
        }
      }

      alert(`✓ Scheda anagrafica di ${formData.surname} ${formData.name} salvata con successo!`);
      setIsEditModalOpen(false);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error("Errore salvataggio guardia:", err);
      alert("Errore durante il salvataggio: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active/disabled status
  const handleToggleStatus = async (guard: Guard) => {
    if (!isAdmin && !isResponsabile) {
      alert("Azione riservata ad Amministratori e Responsabili.");
      return;
    }
    const newStatus = !guard.isDisabled;
    const confirmMsg = newStatus
      ? `Vuoi DISABILITARE la guardia ${guard.surname} ${guard.name} (Matr. ${guard.matricola})? Non potrà accedere o prendere turni.`
      : `Vuoi RIABILITARE la guardia ${guard.surname} ${guard.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, "guards", guard.id), { isDisabled: newStatus });
      alert(`Guardia ${newStatus ? "disabilitata" : "riabilitata"} con successo.`);
    } catch (err: any) {
      alert("Errore aggiornamento stato: " + err.message);
    }
  };

  // Delete guard
  const handleDelete = async (guard: Guard) => {
    if (!isAdmin) {
      alert("ERRORE: Solo l'Amministratore può eliminare una guardia dal ruolino.");
      return;
    }
    if (!window.confirm(`⚠️ ATTENZIONE: Sei sicuro di voler eliminare DEFINITIVAMENTE la guardia ${guard.surname} ${guard.name} (Matr. ${guard.matricola})?\nQuesta azione non può essere annullata.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "guards", guard.id));
      alert("✓ Guardia eliminata con successo dal sistema.");
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    }
  };

  // Official A4 Printout
  const handlePrintRuolino = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Abilita i popup nel browser per visualizzare la stampa del ruolino.");
      return;
    }

    const todayStr = format(new Date(), "dd/MM/yyyy HH:mm");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ruolino Ufficiale Guardie - EKOCLUB Vigilanza</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #000; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 4px 0; }
          .subtitle { font-size: 10pt; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
          th, td { border: 1px solid #666; padding: 5px 6px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 8pt; }
          .status-valido { color: #065f46; font-weight: bold; }
          .status-scaduto { color: #991b1b; font-weight: bold; }
          .status-scadenza { color: #92400e; font-weight: bold; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 9pt; }
          .sign-box { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-weight: 800; font-size: 13pt; letter-spacing: 1px;">EKOCLUB INTERNATIONAL ODV</div>
          <div style="font-size: 9pt; font-weight: 600;">CORPO DI VIGILANZA AMBIENTALE, ITTICA, VENATORIA E ZOOFILA</div>
          <div class="title">RUOLINO UFFICIALE GUARDIE E STATO DECRETI PREFETTIZI / REGIONALI</div>
          <div class="subtitle">Provincia di Massa-Carrara • Estratto Ufficiale del ${todayStr}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="width: 80px;">Matricola</th>
              <th>Cognome e Nome</th>
              <th style="width: 90px;">Qualifica / Ruolo</th>
              <th>Settori Abilitati</th>
              <th style="width: 90px;">Cellulare</th>
              <th style="width: 85px;">Decr. Zoofila</th>
              <th style="width: 85px;">Decr. Ittica</th>
              <th style="width: 85px;">Decr. Venatoria</th>
              <th style="width: 85px;">Decr. Ambientale</th>
              <th style="width: 60px;">Stato</th>
            </tr>
          </thead>
          <tbody>
            ${guards.map((g, idx) => {
              const priv = guardPrivateInfoMap[g.id] || g.privateInfo || {};
              const stZoo = getDecreeStatus(priv.scadenzaZoofila);
              const stItt = getDecreeStatus(priv.scadenzaIttica);
              const stVen = getDecreeStatus(priv.scadenzaVenatoria);
              const stAmb = getDecreeStatus(priv.scadenzaAmbientale);

              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-family: monospace; font-weight: bold;">${g.matricola}</td>
                  <td style="font-weight: bold;">${(g.surname || "").toUpperCase()} ${g.name || ""}</td>
                  <td>${g.rank || g.role}</td>
                  <td>${(g.qualifications || []).join(", ") || "Generico"}</td>
                  <td style="font-family: monospace;">${g.phone || priv.cellulare || "—"}</td>
                  <td class="${stZoo.status === 'valido' ? 'status-valido' : stZoo.status === 'scaduto' ? 'status-scaduto' : stZoo.status === 'in_scadenza' ? 'status-scadenza' : ''}">
                    ${priv.scadenzaZoofila ? safeFormatDate(priv.scadenzaZoofila, "dd/MM/yyyy") : "—"}
                  </td>
                  <td class="${stItt.status === 'valido' ? 'status-valido' : stItt.status === 'scaduto' ? 'status-scaduto' : stItt.status === 'in_scadenza' ? 'status-scadenza' : ''}">
                    ${priv.scadenzaIttica ? safeFormatDate(priv.scadenzaIttica, "dd/MM/yyyy") : "—"}
                  </td>
                  <td class="${stVen.status === 'valido' ? 'status-valido' : stVen.status === 'scaduto' ? 'status-scaduto' : stVen.status === 'in_scadenza' ? 'status-scadenza' : ''}">
                    ${priv.scadenzaVenatoria ? safeFormatDate(priv.scadenzaVenatoria, "dd/MM/yyyy") : "—"}
                  </td>
                  <td class="${stAmb.status === 'valido' ? 'status-valido' : stAmb.status === 'scaduto' ? 'status-scaduto' : stAmb.status === 'in_scadenza' ? 'status-scadenza' : ''}">
                    ${priv.scadenzaAmbientale ? safeFormatDate(priv.scadenzaAmbientale, "dd/MM/yyyy") : "—"}
                  </td>
                  <td>${g.isDisabled ? '<span style="color: red; font-weight: bold;">Sospeso</span>' : '<span style="color: green; font-weight: bold;">Attivo</span>'}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <div style="margin-top: 14px; font-size: 8pt; color: #555;">
          Documento ufficiale conforme al registro dei ruoli prefettizi per il Nucleo di Vigilanza Giurata della Provincia di Massa-Carrara.
        </div>

        <div class="footer">
          <div>
            <p>Data di redazione: ${todayStr}</p>
          </div>
          <div class="sign-box">
            <p style="margin: 0; font-weight: bold;">Il Responsabile del Nucleo</p>
            <p style="margin: 2px 0 0 0; font-size: 8pt;">(Firma autografa o digitale)</p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER DELLA SCHEDA ANAGRAFICA */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950/80 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
                Ruolino Ufficiale & Anagrafica Personale
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <Users className="h-7 w-7 text-blue-400" />
              Anagrafica Guardie & Decreti
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl font-normal">
              Gestione blindata del personale di vigilanza giurata: qualifiche prefettizie, scadenze decreti settoriali (Zoofila, Ittica, Venatoria, Ambientale) e recapiti di servizio protetti.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintRuolino}
              className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold h-10 px-3.5 rounded-xl flex items-center gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4 text-blue-400" />
              <span>Stampa Ruolino A4</span>
            </Button>

            {(isAdmin || isResponsabile) && (
              <Button
                type="button"
                onClick={handleOpenCreate}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider h-10 px-4 rounded-xl shadow-lg shadow-blue-950/50 flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Inserisci Nuova Guardia</span>
              </Button>
            )}
          </div>
        </div>

        {/* STATISTICHE QUICK KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div 
            onClick={() => setStatusFilter("tutti")}
            className={cn(
              "bg-slate-900/60 border p-3 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/60 hover:scale-[1.02] active:scale-[0.98]",
              statusFilter === "tutti" ? "border-blue-500 ring-1 ring-blue-500/50 bg-blue-950/20" : "border-slate-800"
            )}
            title="Mostra tutte le guardie"
          >
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest flex items-center justify-between">
              <span>Totale Guardie</span>
              <span className="text-[9px] text-slate-500">TUTTI</span>
            </p>
            <p className="text-xl md:text-2xl font-black text-white mt-0.5">{stats.total}</p>
          </div>

          <div 
            onClick={() => setStatusFilter("attivi")}
            className={cn(
              "bg-slate-900/60 border p-3 rounded-2xl cursor-pointer transition-all hover:bg-emerald-950/40 hover:scale-[1.02] active:scale-[0.98]",
              statusFilter === "attivi" ? "border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-950/30" : "border-emerald-900/40"
            )}
            title="Filtra solo guardie attive in servizio"
          >
            <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest flex items-center justify-between">
              <span>Attive in Servizio</span>
              <span className="text-[9px] text-emerald-500">FILTRA</span>
            </p>
            <p className="text-xl md:text-2xl font-black text-emerald-300 mt-0.5">{stats.active}</p>
          </div>

          <div 
            onClick={() => {
              setDecreeAlertTab("in_scadenza");
              setIsDecreeAlertModalOpen(true);
            }}
            className={cn(
              "bg-slate-900/60 border p-3 rounded-2xl cursor-pointer transition-all hover:bg-amber-950/40 hover:scale-[1.02] active:scale-[0.98] relative group",
              stats.expiring > 0 ? "border-amber-600/70 bg-amber-950/20 shadow-lg shadow-amber-950/30" : "border-amber-900/40"
            )}
            title="Clicca per aprire il riepilogo decreti in scadenza"
          >
            <p className="text-[10px] text-amber-400 font-mono uppercase tracking-widest flex items-center justify-between">
              <span>In Scadenza (&lt;60gg)</span>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 group-hover:bg-amber-500/40 transition-colors">
                APRI LISTA ↗
              </span>
            </p>
            <p className="text-xl md:text-2xl font-black text-amber-300 mt-0.5 flex items-center gap-2">
              <span>{stats.expiring}</span>
              {stats.expiring > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/40 animate-pulse">
                  DA RINNOVARE
                </span>
              )}
            </p>
          </div>

          <div 
            onClick={() => {
              setDecreeAlertTab("scaduti");
              setIsDecreeAlertModalOpen(true);
            }}
            className={cn(
              "bg-slate-900/60 border p-3 rounded-2xl cursor-pointer transition-all hover:bg-red-950/40 hover:scale-[1.02] active:scale-[0.98] relative group",
              stats.expired > 0 ? "border-red-600/80 bg-red-950/30 shadow-lg shadow-red-950/40 ring-1 ring-red-500/50" : "border-red-900/40"
            )}
            title="Clicca per aprire il riepilogo decreti scaduti"
          >
            <p className="text-[10px] text-red-400 font-mono uppercase tracking-widest flex items-center justify-between">
              <span>Decreti Scaduti</span>
              <span className="text-[9px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/40 group-hover:bg-red-500/40 transition-colors">
                APRI LISTA ↗
              </span>
            </p>
            <p className="text-xl md:text-2xl font-black text-red-400 mt-0.5 flex items-center gap-2">
              <span>{stats.expired}</span>
              {stats.expired > 0 && (
                <span className="text-[10px] bg-red-600/30 text-red-300 px-2 py-0.5 rounded-full font-bold border border-red-500/50 animate-pulse">
                  BLOCCATI
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* BARRA FILTRI E RICERCA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Input Ricerca */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca per cognome, nome o matricola..."
            className="pl-9 bg-slate-950 border-slate-700 text-white text-xs h-10 rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtri Settore e Stato */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Settore */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {["tutti", "zoofila", "ittica", "venatoria", "ambientale"].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSectorFilter(sec)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer",
                  sectorFilter === sec
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Stato */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs h-9 rounded-xl px-2.5 font-medium focus:ring-1 focus:ring-blue-500"
          >
            <option value="tutti">Tutti gli stati</option>
            <option value="attivi">Solo Attivi</option>
            <option value="disabilitati">Disabilitati / Sospesi</option>
            <option value="in_scadenza">Decreti Critici (Scaduti o in Scadenza)</option>
            <option value="solo_in_scadenza">Solo in Scadenza (&lt;60 gg)</option>
            <option value="solo_scaduti">Solo Scaduti (Bloccati)</option>
          </select>

          {/* Switch Vista Cards / Tabella */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 ml-auto md:ml-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "cards" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Schede
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "table" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Tabella
            </button>
          </div>
        </div>
      </div>

      {/* ELENCO GUARDIE - VISTA CARDS */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGuards.map((g) => {
            const priv = getGuardPrivate(g.id);
            const { hasExpired, hasExpiring } = checkGuardDecreeAlert(g);
            const isMe = currentGuard?.id === g.id;

            return (
              <div
                key={g.id}
                onClick={() => handleOpenDossier(g)}
                className={cn(
                  "bg-slate-900/90 border rounded-3xl p-5 shadow-xl transition-all duration-200 hover:border-blue-500/60 hover:shadow-blue-950/30 flex flex-col justify-between relative overflow-hidden cursor-pointer group",
                  g.isDisabled
                    ? "border-red-900/40 bg-slate-950/80 opacity-75"
                    : hasExpired
                    ? "border-red-600/50"
                    : hasExpiring
                    ? "border-amber-500/50"
                    : "border-slate-800"
                )}
              >
                {/* Badge Allerta Scadenza in alto */}
                {(hasExpired || hasExpiring) && (
                  <div className={cn(
                    "absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-bl-xl border-l border-b",
                    hasExpired
                      ? "bg-red-950 text-red-200 border-red-700 animate-pulse"
                      : "bg-amber-950 text-amber-200 border-amber-700"
                  )}>
                    {hasExpired ? "🚨 Decreto Scaduto" : "⚠️ In Scadenza"}
                  </div>
                )}

                <div>
                  {/* Top Bar della Card: Foto, Matricola, Nome */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      {g.photo ? (
                        <img
                          src={g.photo}
                          alt={g.name}
                          className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md group-hover:border-blue-400 transition-colors"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-900 to-slate-800 border-2 border-slate-700 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:border-blue-400 transition-colors">
                          {(g.surname?.[0] || "")}{(g.name?.[0] || "")}
                        </div>
                      )}
                      <span className={cn(
                        "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-900 flex items-center justify-center",
                        g.isDisabled ? "bg-red-500" : "bg-emerald-500"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-black bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-lg tracking-wider">
                          MATR. {g.matricola}
                        </span>
                        {isMe && (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            TU
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide truncate group-hover:text-blue-300 transition-colors">
                        {g.surname} {g.name}
                      </h3>

                      <p className="text-xs text-slate-400 font-medium">
                        {g.rank || "Guardia Particolare Giurata"}
                      </p>
                    </div>
                  </div>

                  {/* Settori Operativi Abilitati */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80">
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1.5">Settori di Competenza</p>
                    <div className="flex items-center flex-wrap gap-1.5">
                      {(g.qualifications && g.qualifications.length > 0 ? g.qualifications : ["Zoofila"]).map((q) => (
                        <Badge
                          key={q}
                          variant="outline"
                          className="bg-slate-950/70 border-slate-700 text-slate-300 text-[10px] font-semibold py-0.5 px-2"
                        >
                          {q}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          g.role === "admin"
                            ? "bg-purple-950/60 text-purple-300 border-purple-700"
                            : g.role === "responsabile"
                            ? "bg-amber-950/60 text-amber-300 border-amber-700"
                            : "bg-slate-950/60 text-slate-400 border-slate-800"
                        )}
                      >
                        {g.role}
                      </Badge>
                    </div>
                  </div>

                  {/* Monitoraggio Decreti Prefettizi */}
                  <div className="mt-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-800">
                      <span>DECRETO SETTORIALE</span>
                      <span>STATO VALIDITÀ</span>
                    </div>

                    {[
                      { name: "Zoofila", date: priv.scadenzaZoofila },
                      { name: "Ittica", date: priv.scadenzaIttica },
                      { name: "Venatoria", date: priv.scadenzaVenatoria },
                      { name: "Ambientale", date: priv.scadenzaAmbientale },
                    ].map((sec) => {
                      const st = getDecreeStatus(sec.date);
                      return (
                        <div key={sec.name} className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300">{sec.name}</span>
                          <span className={cn("px-1.5 py-0.2 rounded border font-mono text-[9.5px]", st.color)}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dati Rapidi e Recapito */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono text-slate-300 text-[11px] truncate">{g.phone || priv.cellulare || "Nessun cellulare"}</span>
                    </div>
                    {priv.city && (
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                        📍 {priv.city} {priv.province ? `(${priv.province})` : ""}
                      </span>
                    )}
                  </div>

                  {/* Pulsante Esplicito Apertura Fascicolo */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDossier(g);
                      }}
                      className="w-full py-1.5 px-3 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/60 hover:border-blue-600 text-blue-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-400" />
                      <span>Fascicolo & Dati Anagrafici Completi</span>
                    </button>
                  </div>
                </div>

                {/* PULSANTI AZIONE IN BASSO */}
                <div 
                  className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    {(g.phone || priv.cellulare) && (
                      <a
                        href={`tel:${g.phone || priv.cellulare}`}
                        className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 transition-colors"
                        title="Chiama cellulare"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {(g.phone || priv.cellulare) && (
                      <a
                        href={`https://wa.me/${(g.phone || priv.cellulare || "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 w-8 rounded-lg bg-green-950 border border-green-800 flex items-center justify-center text-green-300 hover:bg-green-900 transition-colors"
                        title="Invia WhatsApp"
                      >
                        <Compass className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGuard(g);
                        setIsBadgeModalOpen(true);
                      }}
                      className="h-8 px-2 bg-slate-950 border-slate-700 text-slate-300 text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-slate-800 hover:text-white"
                      title="Visualizza Tesserino di Servizio"
                    >
                      <QrCode className="h-3 w-3 text-blue-400" />
                      <span>Badge</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(isAdmin || isResponsabile || isMe) && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenEdit(g)}
                        className="h-8 px-2.5 bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Modifica</span>
                      </Button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(g)}
                        className={cn(
                          "h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer",
                          g.isDisabled
                            ? "bg-emerald-950/70 border-emerald-700 text-emerald-300 hover:bg-emerald-900"
                            : "bg-red-950/70 border-red-700 text-red-300 hover:bg-red-900"
                        )}
                        title={g.isDisabled ? "Riabilita guardia" : "Disabilita guardia"}
                      >
                        {g.isDisabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(g)}
                        className="h-8 w-8 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center justify-center text-red-400 hover:bg-red-900 hover:text-white transition-colors cursor-pointer"
                        title="Elimina guardia definitivamente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA TABELLARE */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  <th className="p-3.5">Matricola</th>
                  <th className="p-3.5">Nominativo</th>
                  <th className="p-3.5">Grado / Ruolo</th>
                  <th className="p-3.5">Settori</th>
                  <th className="p-3.5">Cellulare</th>
                  <th className="p-3.5">Decr. Zoofila</th>
                  <th className="p-3.5">Decr. Ittica</th>
                  <th className="p-3.5">Decr. Venatoria</th>
                  <th className="p-3.5">Decr. Ambientale</th>
                  <th className="p-3.5">Stato</th>
                  <th className="p-3.5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredGuards.map((g) => {
                  const priv = getGuardPrivate(g.id);
                  const stZoo = getDecreeStatus(priv.scadenzaZoofila);
                  const stItt = getDecreeStatus(priv.scadenzaIttica);
                  const stVen = getDecreeStatus(priv.scadenzaVenatoria);
                  const stAmb = getDecreeStatus(priv.scadenzaAmbientale);

                  return (
                    <tr 
                      key={g.id} 
                      onClick={() => handleOpenDossier(g)}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                      title="Clicca per visualizzare la Scheda e il Fascicolo Anagrafico Completo"
                    >
                      <td className="p-3.5 font-mono font-bold text-blue-400">{g.matricola}</td>
                      <td className="p-3.5 font-bold text-white uppercase">{g.surname} {g.name}</td>
                      <td className="p-3.5 text-slate-300">{g.rank || g.role}</td>
                      <td className="p-3.5 text-slate-400">{(g.qualifications || []).join(", ") || "—"}</td>
                      <td className="p-3.5 font-mono text-slate-300">{g.phone || priv.cellulare || "—"}</td>
                      <td className="p-3.5"><span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-mono", stZoo.color)}>{stZoo.label}</span></td>
                      <td className="p-3.5"><span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-mono", stItt.color)}>{stItt.label}</span></td>
                      <td className="p-3.5"><span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-mono", stVen.color)}>{stVen.label}</span></td>
                      <td className="p-3.5"><span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-mono", stAmb.color)}>{stAmb.label}</span></td>
                      <td className="p-3.5">
                        <Badge variant="outline" className={g.isDisabled ? "bg-red-950 text-red-400 border-red-800" : "bg-emerald-950 text-emerald-400 border-emerald-800"}>
                          {g.isDisabled ? "Sospeso" : "Attivo"}
                        </Badge>
                      </td>
                      <td 
                        className="p-3.5 text-right space-x-1 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDossier(g)}
                          className="h-7 px-2 text-blue-400 hover:text-white hover:bg-blue-900/40 text-[11px] font-bold"
                          title="Fascicolo & Anagrafica"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>Scheda</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(g)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                          title="Modifica"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGuard(g);
                            setIsBadgeModalOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-emerald-400 hover:text-white"
                          title="Badge"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALE INSERIMENTO / MODIFICA GUARDIA COMPLETA */}
      <Dialog
        open={isEditModalOpen || isCreateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditModalOpen(false);
            setIsCreateModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {isCreateModalOpen ? "Inserimento Nuova Guardia nel Ruolino" : `Scheda Anagrafica & Decreti: ${formData.surname} ${formData.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Compilare tutti i campi d'ufficio e verificare le date dei decreti rilasciati dalla Prefettura o dalla Regione Toscana.
            </DialogDescription>
          </DialogHeader>

          {/* Sub-tabs del form */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 my-3 overflow-x-auto">
            {[
              { id: "anagrafica", label: "Dati Anagrafici", icon: Users },
              { id: "recapiti", label: "Recapiti & Residenza", icon: MapPin },
              { id: "connotati", label: "Connotati Fisici", icon: Eye },
              { id: "decreti", label: "Decreti & Settori", icon: Award },
              { id: "carriera", label: "Carriera & Servizio", icon: Shield },
              { id: "vestiario", label: "Vestiario & Note", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap",
                    activeFormTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveGuard(isCreateModalOpen);
            }}
            className="space-y-4"
          >
            {/* TAB 1: DATI ANAGRAFICI */}
            {activeFormTab === "anagrafica" && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Matricola Ruolino *</Label>
                    <Input
                      required
                      value={formData.matricola}
                      onChange={(e) => setFormData({ ...formData, matricola: e.target.value })}
                      placeholder="Es: DPG917"
                      className="bg-slate-950 border-slate-700 text-white uppercase font-mono font-bold mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Cognome *</Label>
                    <Input
                      required
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      placeholder="Cognome"
                      className="bg-slate-950 border-slate-700 text-white uppercase font-bold mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Nome *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome"
                      className="bg-slate-950 border-slate-700 text-white uppercase font-bold mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Codice Fiscale</Label>
                    <Input
                      value={formData.codiceFiscale}
                      onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
                      placeholder="Codice Fiscale"
                      className="bg-slate-950 border-slate-700 text-white font-mono uppercase mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Data di Nascita</Label>
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Luogo di Nascita</Label>
                    <Input
                      value={formData.birthPlace}
                      onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                      placeholder="Comune (Prov)"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Titolo di Studio</Label>
                    <Input
                      value={formData.titoloStudio}
                      onChange={(e) => setFormData({ ...formData, titoloStudio: e.target.value })}
                      placeholder="Diploma Superiore / Laurea..."
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Lingue Conosciute</Label>
                    <Input
                      value={formData.linguaConosciuta}
                      onChange={(e) => setFormData({ ...formData, linguaConosciuta: e.target.value })}
                      placeholder="Italiano, Inglese..."
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Grado / Qualifica Istituzionale</Label>
                    <Input
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                      placeholder="Es. Guardia Particolare Giurata"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Ruolo nel Sistema</Label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs h-9 rounded-md px-2.5 mt-1 font-bold"
                    >
                      <option value="guardia">Guardia Operativa</option>
                      <option value="responsabile">Responsabile di Settore</option>
                      <option value="admin">Amministratore Generale</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Sezione Territoriale</Label>
                    <Input
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      placeholder="Massa-Carrara"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-300 font-bold">Foto Profilo (URL o Base64)</Label>
                  <Input
                    value={formData.photo}
                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                    placeholder="https://... oppure data:image/..."
                    className="bg-slate-950 border-slate-700 text-white text-xs font-mono mt-1"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: RECAPITI & RESIDENZA */}
            {activeFormTab === "recapiti" && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Cellulare di Servizio *</Label>
                    <Input
                      value={formData.cellulare}
                      onChange={(e) => setFormData({ ...formData, cellulare: e.target.value })}
                      placeholder="333 1234567"
                      className="bg-slate-950 border-slate-700 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Telefono Fisso</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0585 123456"
                      className="bg-slate-950 border-slate-700 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Email Istituzionale / Privata</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nome.cognome@guardie.it"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-slate-300 font-bold">Indirizzo Residenza (Via/Piazza e Civico)</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Via Roma 10"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">C.A.P.</Label>
                    <Input
                      value={formData.cap}
                      onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                      placeholder="54100"
                      className="bg-slate-950 border-slate-700 text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-slate-300 font-bold">Comune di Residenza</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Massa / Carrara"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Provincia</Label>
                    <Input
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder="MS"
                      className="bg-slate-950 border-slate-700 text-white uppercase mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Contatto di Emergenza (ICE)</Label>
                    <Input
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="Nome e Grado parentela"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Telefono Emergenza</Label>
                    <Input
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="Numero telefonico ICE"
                      className="bg-slate-950 border-slate-700 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Telegram Chat ID (Opzionale)</Label>
                    <Input
                      value={formData.telegramChatId}
                      onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                      placeholder="ID numerico Telegram"
                      className="bg-slate-950 border-slate-700 text-white font-mono mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONNOTATI FISICI */}
            {activeFormTab === "connotati" && (
              <div className="space-y-3.5 animate-fadeIn">
                <p className="text-xs text-slate-400">
                  Dati dei connotati somatici utili all'identificazione della Guardia Particolare Giurata nel registro ufficiale di vigilanza.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Statura (cm o formato standard)</Label>
                    <Input
                      value={formData.statura}
                      onChange={(e) => setFormData({ ...formData, statura: e.target.value })}
                      placeholder="Es. 178 cm"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Tipo Capelli</Label>
                    <Input
                      value={formData.tipoCapelli}
                      onChange={(e) => setFormData({ ...formData, tipoCapelli: e.target.value })}
                      placeholder="Es. Lisci / Corti / Brizzolati"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Colore Capelli</Label>
                    <Input
                      value={formData.coloreCapelli}
                      onChange={(e) => setFormData({ ...formData, coloreCapelli: e.target.value })}
                      placeholder="Es. Castani / Neri / Biondi"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Colore Occhi</Label>
                    <Input
                      value={formData.coloreOcchi}
                      onChange={(e) => setFormData({ ...formData, coloreOcchi: e.target.value })}
                      placeholder="Es. Castani / Azzurri / Verdi"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DECRETI & SETTORI */}
            {activeFormTab === "decreti" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-2xl text-xs text-blue-200">
                  <p className="font-bold">Scadenze Decreti Prefettizi & Regionali</p>
                  <p className="text-[11px] text-blue-300 mt-0.5">
                    Il sistema invia avvisi preventivi 60 giorni prima della data di scadenza registrata per consentire il tempestivo rinnovo in Prefettura/Regione.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-amber-300 uppercase">Settore Zoofilo (L.R. 59/09)</Label>
                      <input
                        type="checkbox"
                        checked={formData.qualifications.includes("Zoofila")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.qualifications, "Zoofila"]
                            : formData.qualifications.filter((q) => q !== "Zoofila");
                          setFormData({ ...formData, qualifications: updated });
                        }}
                        className="rounded border-slate-700"
                      />
                    </div>
                    <Label className="text-[11px] text-slate-400">Data Scadenza Decreto Zoofilo</Label>
                    <Input
                      type="date"
                      value={formData.scadenzaZoofila}
                      onChange={(e) => setFormData({ ...formData, scadenzaZoofila: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-blue-300 uppercase">Settore Ittico (R.D. 1604/31)</Label>
                      <input
                        type="checkbox"
                        checked={formData.qualifications.includes("Ittica")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.qualifications, "Ittica"]
                            : formData.qualifications.filter((q) => q !== "Ittica");
                          setFormData({ ...formData, qualifications: updated });
                        }}
                        className="rounded border-slate-700"
                      />
                    </div>
                    <Label className="text-[11px] text-slate-400">Data Scadenza Decreto Ittico</Label>
                    <Input
                      type="date"
                      value={formData.scadenzaIttica}
                      onChange={(e) => setFormData({ ...formData, scadenzaIttica: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-emerald-300 uppercase">Settore Venatorio (L. 157/92)</Label>
                      <input
                        type="checkbox"
                        checked={formData.qualifications.includes("Venatoria")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.qualifications, "Venatoria"]
                            : formData.qualifications.filter((q) => q !== "Venatoria");
                          setFormData({ ...formData, qualifications: updated });
                        }}
                        className="rounded border-slate-700"
                      />
                    </div>
                    <Label className="text-[11px] text-slate-400">Data Scadenza Decreto Venatorio</Label>
                    <Input
                      type="date"
                      value={formData.scadenzaVenatoria}
                      onChange={(e) => setFormData({ ...formData, scadenzaVenatoria: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-cyan-300 uppercase">Settore Ambientale</Label>
                      <input
                        type="checkbox"
                        checked={formData.qualifications.includes("Ambientale")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.qualifications, "Ambientale"]
                            : formData.qualifications.filter((q) => q !== "Ambientale");
                          setFormData({ ...formData, qualifications: updated });
                        }}
                        className="rounded border-slate-700"
                      />
                    </div>
                    <Label className="text-[11px] text-slate-400">Data Scadenza Decreto Ambientale</Label>
                    <Input
                      type="date"
                      value={formData.scadenzaAmbientale}
                      onChange={(e) => setFormData({ ...formData, scadenzaAmbientale: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: CARRIERA & STATO */}
            {activeFormTab === "carriera" && (
              <div className="space-y-3.5 animate-fadeIn">
                <p className="text-xs text-slate-400">
                  Stato di servizio, avanzamento di grado e storico dei provvedimenti per ruolino interno.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Matricola Operativa</Label>
                    <Input
                      value={formData.matricolaOperativa}
                      onChange={(e) => setFormData({ ...formData, matricolaOperativa: e.target.value })}
                      placeholder="Es. OP-04"
                      className="bg-slate-950 border-slate-700 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Grado Assunto</Label>
                    <Input
                      value={formData.gradoAssunto}
                      onChange={(e) => setFormData({ ...formData, gradoAssunto: e.target.value })}
                      placeholder="Es. Allieva Guardia"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Data Passaggio Grado</Label>
                    <Input
                      type="date"
                      value={formData.passaggioGrado}
                      onChange={(e) => setFormData({ ...formData, passaggioGrado: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-2xl space-y-3 mt-3">
                  <p className="text-xs font-bold text-red-300 uppercase tracking-wider">Provvedimenti Disciplinari / Sospensioni (Riservato HQ)</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-slate-300">Data Sospensione</Label>
                      <Input
                        type="date"
                        value={formData.dataSospensione}
                        onChange={(e) => setFormData({ ...formData, dataSospensione: e.target.value })}
                        className="bg-slate-950 border-slate-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Motivo Sospensione</Label>
                      <Input
                        value={formData.motivoSospensione}
                        onChange={(e) => setFormData({ ...formData, motivoSospensione: e.target.value })}
                        placeholder="Motivazione del provvedimento"
                        className="bg-slate-950 border-slate-700 text-white mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-slate-300">Data Allontanamento</Label>
                      <Input
                        type="date"
                        value={formData.dataAllontanamento}
                        onChange={(e) => setFormData({ ...formData, dataAllontanamento: e.target.value })}
                        className="bg-slate-950 border-slate-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Motivo Allontanamento</Label>
                      <Input
                        value={formData.motivoAllontanamento}
                        onChange={(e) => setFormData({ ...formData, motivoAllontanamento: e.target.value })}
                        placeholder="Motivo dimissioni/revoca"
                        className="bg-slate-950 border-slate-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Data Riammissione</Label>
                      <Input
                        type="date"
                        value={formData.dataRiammissione}
                        onChange={(e) => setFormData({ ...formData, dataRiammissione: e.target.value })}
                        className="bg-slate-950 border-slate-700 text-white mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: VESTIARIO & NOTE */}
            {activeFormTab === "vestiario" && (
              <div className="space-y-3.5 animate-fadeIn">
                <p className="text-xs text-slate-400">
                  Informazioni riservate per l'ordinativo del vestiario operativo e delle dotazioni del Nucleo.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Taglia Camicia</Label>
                    <Input
                      value={formData.tagliaCamicia}
                      onChange={(e) => setFormData({ ...formData, tagliaCamicia: e.target.value })}
                      placeholder="Es. L / 42"
                      className="bg-slate-950 border-slate-700 text-white mt-1 uppercase"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Taglia Pantaloni</Label>
                    <Input
                      value={formData.tagliaCalzoni}
                      onChange={(e) => setFormData({ ...formData, tagliaCalzoni: e.target.value })}
                      placeholder="Es. 48 / 50"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Taglia Maglione</Label>
                    <Input
                      value={formData.tagliaMaglione}
                      onChange={(e) => setFormData({ ...formData, tagliaMaglione: e.target.value })}
                      placeholder="Es. XL"
                      className="bg-slate-950 border-slate-700 text-white mt-1 uppercase"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Misura Scarponi</Label>
                    <Input
                      value={formData.misuraScarponi}
                      onChange={(e) => setFormData({ ...formData, misuraScarponi: e.target.value })}
                      placeholder="Es. 43"
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-300 font-bold">Note & Annotazioni di Servizio (Riservate HQ)</Label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Eventuali note interne, abilitazioni specifiche, porto d'armi, corsi seguiti..."
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs p-3 rounded-xl mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsCreateModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                Annulla
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-5 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-950/50"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{isCreateModalOpen ? "Inserisci nel Ruolino" : "Salva Modifiche"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE FASCICOLO ANAGRAFICO COMPLETO DELLA GUARDIA (A TUTTO SCHERMO SENZA SCROLLBAR ESTERNE) */}
      {selectedGuard && isDossierModalOpen && (
        <div className="fixed inset-0 z-[100] w-screen h-screen m-0 p-0 bg-slate-950 text-white flex flex-col overflow-hidden select-none">
          {(() => {
            const priv = getGuardPrivate(selectedGuard.id);
            const { hasExpired, hasExpiring } = checkGuardDecreeAlert(selectedGuard);
            const isMe = currentGuard?.id === selectedGuard.id;

            return (
              <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 select-text">
                {/* INTESTAZIONE SUPERIORE FISSA */}
                <div className="shrink-0 px-6 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md z-10">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2.5 flex-wrap">
                        <span>Fascicolo Personale G.P.G.</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 font-mono">
                          MATR. {selectedGuard.matricola}
                        </span>
                        {selectedGuard.isDisabled && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400 font-bold">
                            SOSPESO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Corpo Guardie Particolari Giurate • Scheda di Vigilanza e Stato di Servizio
                      </p>
                    </div>
                  </div>

                  {/* AZIONI RAPIDE: STAMPA A4, BADGE, MODIFICA E CHIUDI */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePrintSingleGuardDossier(selectedGuard)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 h-9 px-3.5"
                      title="Stampa Fascicolo Ufficiale A4"
                    >
                      <Printer className="h-4 w-4 text-blue-400" />
                      <span>Stampa A4</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsBadgeModalOpen(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 h-9 px-3.5"
                      title="Visualizza Tesserino Badge"
                    >
                      <QrCode className="h-4 w-4 text-emerald-400" />
                      <span>Badge</span>
                    </Button>

                    {(isAdmin || isResponsabile || isMe) && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setIsDossierModalOpen(false);
                          handleOpenEdit(selectedGuard);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow h-9 px-3.5"
                        title="Modifica Dati Guardia"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Modifica</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDossierModalOpen(false)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl h-9 px-3 text-xs font-bold ml-1"
                    >
                      Chiudi ✕
                    </Button>
                  </div>
                </div>

                {/* CONTENITORE CENTRALE A PIENO SCHERMO CON SCROLL VERTICALE INTERNO */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 overflow-x-hidden">
                  <div className="max-w-6xl mx-auto space-y-6">

                  {/* SCHEDA TESTATA GUARDIA */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative shrink-0">
                      {selectedGuard.photo ? (
                        <img
                          src={selectedGuard.photo}
                          alt={selectedGuard.name}
                          className="h-20 w-20 rounded-2xl object-cover border-2 border-slate-700 shadow-lg"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-900 to-slate-800 border-2 border-slate-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                          {(selectedGuard.surname?.[0] || "")}{(selectedGuard.name?.[0] || "")}
                        </div>
                      )}
                      <span className={cn(
                        "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-950 flex items-center justify-center",
                        selectedGuard.isDisabled ? "bg-red-500" : "bg-emerald-500"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-0.5 rounded-lg">
                          MATR. {selectedGuard.matricola}
                        </span>
                        {priv.matricolaOperativa && (
                          <span className="font-mono text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-lg">
                            OP: {priv.matricolaOperativa}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            selectedGuard.role === "admin"
                              ? "bg-purple-950/60 text-purple-300 border-purple-700"
                              : selectedGuard.role === "responsabile"
                              ? "bg-amber-950/60 text-amber-300 border-amber-700"
                              : "bg-slate-950 text-slate-400 border-slate-800"
                          )}
                        >
                          {selectedGuard.role}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={selectedGuard.isDisabled ? "bg-red-950 text-red-400 border-red-800" : "bg-emerald-950 text-emerald-400 border-emerald-800"}
                        >
                          {selectedGuard.isDisabled ? "Sospeso dal Servizio" : "In Servizio Attivo"}
                        </Badge>
                      </div>

                      <h2 className="text-xl font-black text-white uppercase tracking-wide">
                        {selectedGuard.surname} {selectedGuard.name}
                      </h2>

                      <p className="text-xs text-blue-300 font-semibold">
                        {selectedGuard.rank || "Guardia Particolare Giurata"} • {selectedGuard.section || "Massa-Carrara"}
                      </p>

                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        {(selectedGuard.qualifications && selectedGuard.qualifications.length > 0 ? selectedGuard.qualifications : ["Zoofila"]).map((q) => (
                          <Badge
                            key={q}
                            variant="outline"
                            className="bg-slate-900 border-slate-700 text-slate-300 text-[10px] font-semibold py-0.5 px-2"
                          >
                            Settore {q}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* NAVIGAZIONE SUB-TABS DEL FASCICOLO */}
                  <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
                    {[
                      { id: "anagrafica", label: "Dati Anagrafici", icon: Users },
                      { id: "contatti", label: "Recapiti & Residenza", icon: MapPin },
                      { id: "connotati", label: "Connotati Fisici", icon: Eye },
                      { id: "decreti", label: "Decreti Prefettizi", icon: Award },
                      { id: "servizio", label: "Stato di Servizio", icon: Shield },
                      { id: "vestiario", label: "Vestiario & Misure", icon: FileText },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDossierActiveTab(tab.id as any)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap",
                            dossierActiveTab === tab.id
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CONTENUTI DEI SUB-TABS */}
                  <div className="min-h-[260px]">
                    {/* TAB 1: DATI ANAGRAFICI */}
                    {dossierActiveTab === "anagrafica" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Cognome e Nome</span>
                            <span className="text-sm font-bold text-white uppercase">{selectedGuard.surname} {selectedGuard.name}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Codice Fiscale</span>
                            <span className="text-sm font-mono font-bold text-blue-300">{priv.codiceFiscale || "Non registrato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Matricola Ufficiale</span>
                            <span className="text-sm font-mono font-bold text-emerald-400">{selectedGuard.matricola}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Data di Nascita</span>
                            <span className="text-sm font-bold text-white">
                              {priv.birthDate ? safeFormatDate(priv.birthDate, "dd MMMM yyyy", "Non registrata", { locale: it }) : "Non registrata"}
                            </span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Luogo di Nascita</span>
                            <span className="text-sm font-bold text-white">{priv.birthPlace || "Non registrato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Titolo di Studio</span>
                            <span className="text-sm font-bold text-white">{priv.titoloStudio || "Non registrato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Lingue Conosciute</span>
                            <span className="text-sm font-bold text-white">{priv.linguaConosciuta || "Italiano"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Sezione Territoriale</span>
                            <span className="text-sm font-bold text-white">{selectedGuard.section || "Massa-Carrara"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: RECAPITI & RESIDENZA */}
                    {dossierActiveTab === "contatti" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Cellulare di Servizio</span>
                            <span className="text-sm font-mono font-bold text-emerald-400">
                              {selectedGuard.phone || priv.cellulare || "Non registrato"}
                            </span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Telefono Fisso</span>
                            <span className="text-sm font-mono font-bold text-white">{priv.phone || "Non registrato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Email Istituzionale / Privata</span>
                            <span className="text-sm font-medium text-blue-300 truncate block">{selectedGuard.email || priv.email || "Non registrata"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Indirizzo di Residenza</span>
                            <span className="text-sm font-bold text-white">{priv.address || "Non registrato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">C.A.P.</span>
                            <span className="text-sm font-mono font-bold text-white">{priv.cap || "—"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Comune di Residenza</span>
                            <span className="text-sm font-bold text-white">{priv.city || priv.comune || "Non registrato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Provincia</span>
                            <span className="text-sm font-bold text-white">{priv.province || "MS"}</span>
                          </div>
                        </div>

                        {/* Contatti di Emergenza ICE */}
                        <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-2xl">
                          <p className="text-xs font-bold text-red-300 uppercase tracking-wider mb-2">Contatto di Emergenza (ICE)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[11px]">Nominativo / Parentela:</span>
                              <span className="font-bold text-white text-sm">{priv.emergencyContact || "Nessun contatto indicato"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Numero di Telefono:</span>
                              <span className="font-mono font-bold text-emerald-400 text-sm">{priv.emergencyPhone || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: CONNOTATI FISICI */}
                    {dossierActiveTab === "connotati" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Statura</span>
                            <span className="text-base font-bold text-white">{priv.statura || "Non indicata"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Tipo Capelli</span>
                            <span className="text-base font-bold text-white">{priv.tipoCapelli || "Non indicato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Colore Capelli</span>
                            <span className="text-base font-bold text-white">{priv.coloreCapelli || "Non indicato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Colore Occhi</span>
                            <span className="text-base font-bold text-white">{priv.coloreOcchi || "Non indicato"}</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-xs text-slate-400">
                          <p className="font-semibold text-slate-300">Conformità Connotati Somatici</p>
                          <p className="text-[11px] mt-0.5">
                            I dati fisici e descrittivi sopra riportati sono memorizzati ad uso esclusivo del ruolino di servizio e dell'identificazione istituzionale della Guardia Particolare Giurata.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: DECRETI PREFETTIZI */}
                    {dossierActiveTab === "decreti" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {[
                            { name: "Zoofila", law: "L.R. Toscana 59/2009 e Regolamenti", date: priv.scadenzaZoofila, color: "border-amber-700/60 bg-amber-950/20" },
                            { name: "Ittica", law: "R.D. 1604/1931 - Pesca Acque Interne", date: priv.scadenzaIttica, color: "border-blue-700/60 bg-blue-950/20" },
                            { name: "Venatoria", law: "L. 157/1992 e L.R. Toscana 3/1994", date: priv.scadenzaVenatoria, color: "border-emerald-700/60 bg-emerald-950/20" },
                            { name: "Ambientale", law: "Codice Ambiente D.Lgs 152/2006", date: priv.scadenzaAmbientale, color: "border-cyan-700/60 bg-cyan-950/20" },
                          ].map((sec) => {
                            const st = getDecreeStatus(sec.date);
                            const days = sec.date ? safeDifferenceInDays(sec.date) : null;

                            return (
                              <div key={sec.name} className={cn("p-4 rounded-2xl border space-y-2", sec.color)}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-sm font-black uppercase text-white tracking-wide">
                                      Decreto Settore {sec.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-400">{sec.law}</p>
                                  </div>
                                  <span className={cn("px-2 py-0.5 rounded-lg border font-mono text-[10px] font-bold", st.color)}>
                                    {st.label}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                                  <span className="text-slate-400 text-[11px]">Scadenza Prefettizia:</span>
                                  <span className="font-mono font-bold text-white text-sm">
                                    {sec.date ? safeFormatDate(sec.date, "dd/MM/yyyy", "Non programmato") : "Non programmato"}
                                  </span>
                                </div>

                                {days !== null && (
                                  <p className="text-[10.5px] font-mono text-slate-400 text-right">
                                    {days < 0 ? `Scaduto da ${Math.abs(days)} giorni` : `Mancano ${days} giorni al rinnovo`}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TAB 5: STATO DI SERVIZIO */}
                    {dossierActiveTab === "servizio" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Grado Attuale</span>
                            <span className="text-sm font-bold text-white">{selectedGuard.rank || "Guardia Particolare Giurata"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Grado Assunto</span>
                            <span className="text-sm font-bold text-white">{priv.gradoAssunto || "Non indicato"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Data Passaggio Grado</span>
                            <span className="text-sm font-mono font-bold text-white">
                              {priv.passaggioGrado ? safeFormatDate(priv.passaggioGrado, "dd/MM/yyyy", "—") : "—"}
                            </span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Matricola Operativa</span>
                            <span className="text-sm font-mono font-bold text-blue-300">{priv.matricolaOperativa || "—"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Sezione Territoriale</span>
                            <span className="text-sm font-bold text-white">{selectedGuard.section || "Massa-Carrara"}</span>
                          </div>
                        </div>

                        {/* Storico Provvedimenti Disciplinari / Amministrativi */}
                        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
                          <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                            Provvedimenti di Servizio & Sospensioni (Archivio HQ)
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px] font-mono uppercase">Data Sospensione</span>
                              <span className="font-bold text-white font-mono">{priv.dataSospensione || "Nessuna"}</span>
                              {priv.motivoSospensione && (
                                <span className="text-[10px] text-slate-400 block mt-1">Motivo: {priv.motivoSospensione}</span>
                              )}
                            </div>
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px] font-mono uppercase">Data Allontanamento</span>
                              <span className="font-bold text-white font-mono">{priv.dataAllontanamento || "Nessuna"}</span>
                              {priv.motivoAllontanamento && (
                                <span className="text-[10px] text-slate-400 block mt-1">Motivo: {priv.motivoAllontanamento}</span>
                              )}
                            </div>
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px] font-mono uppercase">Data Riammissione</span>
                              <span className="font-bold text-white font-mono">{priv.dataRiammissione || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 6: VESTIARIO & MISURE */}
                    {dossierActiveTab === "vestiario" && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Taglia Camicia</span>
                            <span className="text-lg font-bold text-white">{priv.tagliaCamicia || "—"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Taglia Pantaloni</span>
                            <span className="text-lg font-bold text-white">{priv.tagliaCalzoni || "—"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Taglia Maglione</span>
                            <span className="text-lg font-bold text-white">{priv.tagliaMaglione || "—"}</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">Misura Scarponi</span>
                            <span className="text-lg font-bold text-white">{priv.misuraScarponi || "—"}</span>
                          </div>
                        </div>

                        {priv.notes && (
                          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Note di Servizio Riservate HQ</span>
                            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{priv.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* FOOTER DEL FASCICOLO */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsDossierModalOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        Chiudi
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handlePrintSingleGuardDossier(selectedGuard)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-5 h-10 rounded-xl flex items-center gap-2 shadow"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Stampa Fascicolo Completo (A4)</span>
                      </Button>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
        </div>
      )}

      {/* MODALE RIEPILOGO DECRETI IN SCADENZA E SCADUTI */}
      <Dialog open={isDecreeAlertModalOpen} onOpenChange={setIsDecreeAlertModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Quadro Allerte Decreti Prefettizi</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Posizioni amministrative da regolarizzare per rinnovi in Prefettura o sospensioni.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Sub-filtri interni della modale */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDecreeAlertTab("tutti")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
                  decreeAlertTab === "tutti"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Tutti ({decreeAlertsList.length})
              </button>
              <button
                type="button"
                onClick={() => setDecreeAlertTab("scaduti")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  decreeAlertTab === "scaduti"
                    ? "bg-red-600 text-white shadow"
                    : "text-red-400 hover:text-red-300"
                )}
              >
                <span>Scaduti</span>
                <span className="bg-red-950/80 border border-red-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {stats.expired}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDecreeAlertTab("in_scadenza")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  decreeAlertTab === "in_scadenza"
                    ? "bg-amber-600 text-white shadow"
                    : "text-amber-400 hover:text-amber-300"
                )}
              >
                <span>In Scadenza (&lt;60gg)</span>
                <span className="bg-amber-950/80 border border-amber-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {stats.expiring}
                </span>
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDecreeAlertModalOpen(false);
                if (decreeAlertTab === "scaduti") {
                  setStatusFilter("solo_scaduti");
                } else if (decreeAlertTab === "in_scadenza") {
                  setStatusFilter("solo_in_scadenza");
                } else {
                  setStatusFilter("in_scadenza");
                }
              }}
              className="border-slate-700 bg-slate-900 text-blue-300 hover:bg-slate-800 text-xs font-bold rounded-xl h-8 px-3"
            >
              Filtra nell'Anagrafe ↗
            </Button>
          </div>

          {/* LISTA GUARDIE CON DECRETI CRITICI */}
          <div className="space-y-3 mt-4">
            {(() => {
              const filteredList = decreeAlertsList.filter((item) => {
                if (decreeAlertTab === "scaduti") return item.hasExpired;
                if (decreeAlertTab === "in_scadenza") return item.hasExpiring;
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-10 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-bold text-white uppercase tracking-wider">Nessuna Allerta Rilevata</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {decreeAlertTab === "scaduti" 
                        ? "Non ci sono decreti scaduti registrati." 
                        : decreeAlertTab === "in_scadenza"
                        ? "Nessun decreto in scadenza nei prossimi 60 giorni."
                        : "Tutti i decreti delle guardie risultano regolari o non registrati."}
                    </p>
                  </div>
                );
              }

              return filteredList.map(({ guard, items, hasExpired, hasExpiring }) => (
                <div
                  key={guard.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    hasExpired 
                      ? "bg-red-950/20 border-red-900/60 hover:border-red-600" 
                      : "bg-amber-950/20 border-amber-900/60 hover:border-amber-600"
                  )}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {guard.photo ? (
                      <img
                        src={guard.photo}
                        alt={guard.name}
                        className="h-12 w-12 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(guard.surname?.[0] || "")}{(guard.name?.[0] || "")}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white uppercase">
                          {guard.surname} {guard.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                          MATR. {guard.matricola}
                        </span>
                        {hasExpired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white uppercase">
                            Scaduto
                          </span>
                        )}
                        {!hasExpired && hasExpiring && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white uppercase">
                            In Scadenza
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {items.map((it, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "text-[11px] font-medium px-2 py-0.5 rounded-lg border flex items-center gap-1",
                              it.color
                            )}
                          >
                            <span className="font-bold uppercase text-[10px]">{it.sector}:</span>
                            <span>{it.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsDecreeAlertModalOpen(false);
                        handleOpenDossier(guard);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Fascicolo</span>
                    </Button>

                    {(isAdmin || isResponsabile) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsDecreeAlertModalOpen(false);
                          handleOpenEdit(guard);
                        }}
                        className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold h-9 px-3 rounded-xl flex items-center gap-1.5"
                        title="Modifica Decreto"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Rinnova</span>
                      </Button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Totale posizioni segnalate: <strong className="text-white">{decreeAlertsList.length}</strong>
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDecreeAlertModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE TESSERINO DI SERVIZIO / BADGE */}
      {selectedGuard && (
        <Dialog open={isBadgeModalOpen} onOpenChange={setIsBadgeModalOpen}>
          <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-center font-black uppercase text-base tracking-wider flex items-center justify-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Tesserino di Servizio Ufficiale
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-400">
                Tessera di riconoscimento conforme al Regolamento di Vigilanza Giurata.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {/* Fronte del Badge */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-2 border-blue-500/40 rounded-2xl p-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-blue-500/30 pb-2 mb-3">
                  <div>
                    <p className="text-[9px] font-mono text-blue-300 font-bold uppercase tracking-widest">EKOCLUB INTERNATIONAL</p>
                    <p className="text-[8px] text-slate-400">Corpo di Vigilanza • Sez. Massa-Carrara</p>
                  </div>
                  <Badge className="bg-blue-600 text-white text-[9px] font-mono font-bold">
                    MATR. {selectedGuard.matricola}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  {selectedGuard.photo ? (
                    <img
                      src={selectedGuard.photo}
                      alt={selectedGuard.name}
                      className="h-20 w-20 rounded-xl object-cover border-2 border-white/80 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-slate-800 border-2 border-white/80 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                      {(selectedGuard.surname?.[0] || "")}{(selectedGuard.name?.[0] || "")}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Guardia Giurata</p>
                    <p className="text-lg font-black text-white uppercase tracking-wide truncate">
                      {selectedGuard.surname} {selectedGuard.name}
                    </p>
                    <p className="text-[11px] text-blue-300 font-semibold mt-0.5">
                      {selectedGuard.rank || "Guardia Particolare Giurata"}
                    </p>
                    <p className="text-[9.5px] text-slate-400 mt-1">
                      Settori: {(selectedGuard.qualifications || []).join(", ") || "Zoofilo"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-blue-500/30 flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
                  <span>Decreto Prefettura MS</span>
                  <span className="text-emerald-400 font-bold">AUTORIZZATO</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-center">
              <Button
                type="button"
                onClick={() => window.print()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider h-10 rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Stampa Tesserino di Servizio</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

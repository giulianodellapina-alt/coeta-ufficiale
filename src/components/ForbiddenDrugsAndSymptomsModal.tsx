import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ForbiddenDrug, AnimalSymptom } from "../types";
import {
  ShieldAlert,
  Activity,
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  AlertTriangle,
  Heart,
  FileText,
  Loader2,
  Save,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_DRUGS: ForbiddenDrug[] = [
  {
    id: "default-d1",
    name: "Tachipirina (Tempra, Efferalgan)",
    category: "Febbre e Dolore (Uso Umano)",
    dangerLevel: "Altamente Tossico",
    notes: "Molto tossico per i cani e mortale per i gatti. Distrugge i globuli rossi nel sangue (l'animale non respira più bene) e gli rovina il fegato in modo irreversibile. Non dare mai medicinali umani per la febbre.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-d2",
    name: "Brufen (Moment, Spididol, Nurofen)",
    category: "Antinfiammatorio (Uso Umano)",
    dangerLevel: "Altamente Tossico",
    notes: "Causa gravissime ulcere nello stomaco con emorragie di sangue interne e blocco dei reni nei cani e nei gatti. Una sola pillola può uccidere un cagnolino piccolo.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-d3",
    name: "Ivomec (Antiparassitario forte)",
    category: "Antiparassitario",
    dangerLevel: "Letale / Critico",
    notes: "Estremamente velenoso per cani tipo Collie, Border Collie, Pastore Tedesco e simili. Può causare cecità, coma e morte immediata anche con una dose piccolissima. Da usare solo se lo dice espressamente il veterinario.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-d4",
    name: "Plasil (Antivomito)",
    category: "Farmaco per lo Stomaco",
    dangerLevel: "Pericolo da Ostruzione",
    notes: "Molto pericoloso se l'animale ha ingoiato un pezzo di plastica, un osso o un sasso (cosa comunissima per strada). Questo medicinale forza lo stomaco a muoversi e rischia di spaccare l'intestino da dentro.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-d5",
    name: "Aspirina (Cardioaspirina)",
    category: "Antinfiammatorio / Fluidificante",
    dangerLevel: "Elevato Pericolo",
    notes: "Provoca forti perdite di sangue dallo stomaco che non si riescono a fermare. Nei gatti è velenosissimo perché il loro corpo lo smaltisce molto lentamente accumulandosi nei giorni.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-d6",
    name: "Advantix (Fialette antipulci cane)",
    category: "Antiparassitario Esterno",
    dangerLevel: "Letale per i gatti",
    notes: "Le fialette antipulci dei cani sono MORTALI per i gatti. Se un gatto tocca un cane appena trattato o se gli viene messa la fiala del cane per sbaglio, comincia ad avere forti convulsioni e può morire in poche ore. Lavare subito con tanto sapone e correre dal veterinario.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  }
];

const DEFAULT_SYMPTOMS: AnimalSymptom[] = [
  {
    id: "default-s1",
    title: "Sussulto o guaito se accarezzato (Sospetto Abuso)",
    type: "maltrattamento",
    description: "Quando provi ad allungare la mano per fargli una carezza e il cane si rannicchia terrorizzato, mette la coda tra le gambe, trema forte o fa un verso/guaito di dolore in un punto preciso del corpo. Tipico test sul campo: fingi di accarezzare l'animale sul dorso o sui fianchi e nota se ha reazioni di dolore o sussulti improvvisi.",
    whatToDo: "Avvicinati piano, di lato e senza guardarlo fisso negli occhi. Parla a voce bassa e dolce. Fai un video col telefono per far vedere come reagisce male alla presenza del padrone o alle carezze: è una prova fondamentale di maltrattamento psicofisico e botte passate.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-s2",
    title: "Schiuma alla bocca o bava eccessiva",
    type: "malattia",
    description: "Può significare che l'animale ha mangiato del veleno (veleno per topi, lumachicidi, diserbante nei campi) oppure che ha un fortissimo colpo di calore o qualcosa incastrato in gola.",
    whatToDo: "Spostare subito il cane all'ombra e al fresco. Se pensi ci sia del veleno in giro, blocca subito l'area per non far avvicinare altri animali. Chiama subito il veterinario d'urgenza.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-s3",
    title: "Cane debolissimo che non riesce ad alzarsi",
    type: "malattia",
    description: "L'animale è moscio, non risponde se lo chiami e non riesce a stare in piedi sulle zampe dietro. Spesso ha un'emorragia interna invisibile (dovuta a un trauma o incidente) o un'infezione grave.",
    whatToDo: "Non costringerlo a camminare. Coprilo con una coperta per non farlo raffreddare e portalo immediatamente alla prima clinica veterinaria vicina.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-s4",
    title: "Segni sul collo, catene corte o piaghe sulla pelle",
    type: "maltrattamento",
    description: "Ferite rosse o senza pelo intorno al collo causate da catene corte, corde di plastica strette o collari che sono penetrati nella carne perché mai allentati mentre il cane cresceva.",
    whatToDo: "Fai foto ravvicinate della ferita e dello strumento (catena o corda). Sequestra subito la catena se è illegale e scrivi il verbale di maltrattamento d'ufficio per togliere l'animale da quella situazione.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-s5",
    title: "Cane magrissimo (si vedono tutte le costole e le ossa)",
    type: "maltrattamento",
    description: "Forte denutrizione perché non gli viene dato da mangiare da giorni, pelle secca e senza elasticità per la disidratazione (mancanza d'acqua pulita, spesso la ciotola è vuota o piena di fango).",
    whatToDo: "Fai foto dettagliate delle ciotole vuote, dello sporco circostante e delle ossa sporgenti del cane. Se l'animale rischia la vita, portalo via subito facendolo sequestrare d'urgenza e affidandolo a una struttura sicura.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  },
  {
    id: "default-s6",
    title: "Respiro affannato e veloce a bocca aperta (senza aver corso)",
    type: "malattia",
    description: "Il cane respira velocemente tenendo il collo teso e sembra soffocare. Può essere un colpo di calore grave, problemi al cuore o avvelenamento da sostanze tossiche.",
    whatToDo: "Se l'ambiente è caldissimo, bagna le zampe e la pancia con acqua fresca (NON ghiacciata, se no rischia un infarto). Tienilo ventilato e calmo e chiama subito il veterinario.",
    updatedAt: new Date().toISOString(),
    updatedBy: "Sistema HQ",
  }
];

interface ForbiddenDrugsAndSymptomsModalProps {
  userEmail: string;
  userName: string;
  isAdmin: boolean;
  variant?: "button" | "card" | "standard" | "yellow";
}

export const ForbiddenDrugsAndSymptomsModal: React.FC<ForbiddenDrugsAndSymptomsModalProps> = ({
  userEmail,
  userName,
  isAdmin,
  variant = "button",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"drugs" | "symptoms">("drugs");

  // Search & Filtering
  const [drugSearch, setDrugSearch] = useState("");
  const [symptomSearch, setSymptomSearch] = useState("");
  const [symptomTypeFilter, setSymptomTypeFilter] = useState<"all" | "malattia" | "maltrattamento">("all");

  // Data States
  const [drugs, setDrugs] = useState<ForbiddenDrug[]>(DEFAULT_DRUGS);
  const [symptoms, setSymptoms] = useState<AnimalSymptom[]>(DEFAULT_SYMPTOMS);
  const [loadingDrugs, setLoadingDrugs] = useState(false);
  const [loadingSymptoms, setLoadingSymptoms] = useState(false);

  // Form States
  const [isDrugFormOpen, setIsDrugFormOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<ForbiddenDrug | null>(null);
  const [drugForm, setDrugForm] = useState({
    name: "",
    category: "",
    dangerLevel: "Altamente Tossico",
    notes: "",
  });

  const [isSymptomFormOpen, setIsSymptomFormOpen] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<AnimalSymptom | null>(null);
  const [symptomForm, setSymptomForm] = useState({
    title: "",
    type: "malattia" as "malattia" | "maltrattamento",
    description: "",
    whatToDo: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);

  // 1. Sync Drugs from Firestore & Auto-Seed
  useEffect(() => {
    const q = query(collection(db, "forbidden_drugs"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ForbiddenDrug[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ForbiddenDrug);
        });
        if (list.length > 0) {
          setDrugs(list);
        } else {
          setDrugs(DEFAULT_DRUGS);
          // Auto-seed if database is empty and we are admin
          if (!snapshot.metadata.fromCache && isAdmin) {
            seedDefaultDrugs();
          }
        }
      },
      (error) => {
        console.error("Errore sinc. farmaci:", error);
      }
    );
    return () => unsubscribe();
  }, [isAdmin]);

  // 2. Sync Symptoms from Firestore & Auto-Seed
  useEffect(() => {
    const q = query(collection(db, "animal_symptoms"), orderBy("title", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AnimalSymptom[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AnimalSymptom);
        });
        if (list.length > 0) {
          setSymptoms(list);
        } else {
          setSymptoms(DEFAULT_SYMPTOMS);
          // Auto-seed if database is empty and we are admin
          if (!snapshot.metadata.fromCache && isAdmin) {
            seedDefaultSymptoms();
          }
        }
      },
      (error) => {
        console.error("Errore sinc. sintomi:", error);
      }
    );
    return () => unsubscribe();
  }, [isAdmin]);

  // Seed default drugs function
  const seedDefaultDrugs = async () => {
    try {
      console.log("Inizializzazione automatica elenco farmaci predefiniti...");
      const batch = writeBatch(db);
      const defaultDrugs = [
        {
          name: "Ivomec (Antiparassitario forte)",
          category: "Antiparassitario",
          dangerLevel: "Letale / Critico",
          notes: "Estremamente velenoso per cani tipo Collie, Border Collie, Pastore Tedesco e simili. Può causare cecità, coma e morte immediata anche con una dose piccolissima. Da usare solo se lo dice espressamente il veterinario.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          name: "Tachipirina / Tempra / Paracetamolo",
          category: "Febbre e Dolore (Uso Umano)",
          dangerLevel: "Altamente Tossico",
          notes: "Molto tossico per i cani e mortale per i gatti. Distrugge i globuli rossi nel sangue (l'animale non respira più bene) e gli rovina il fegato in modo irreversibile. Non dare mai medicinali umani per la febbre.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          name: "Brufen / Moment / Spididol / Nurofen",
          category: "Antinfiammatorio (Uso Umano)",
          dangerLevel: "Altamente Tossico",
          notes: "Causa gravissime ulcere nello stomaco con emorragie di sangue interne e blocco dei reni nei cani e nei gatti. Una sola pillola può uccidere un cagnolino piccolo.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          name: "Plasil / Antivomito",
          category: "Farmaco per lo Stomaco",
          dangerLevel: "Pericolo da Ostruzione",
          notes: "Molto pericoloso se l'animale ha ingoiato un pezzo di plastica, un osso o un sasso (cosa comunissima per strada). Questo medicinale forza lo stomaco a muoversi e rischia di spaccare l'intestino da dentro.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          name: "Aspirina / Cardioaspirina",
          category: "Antinfiammatorio / Fluidificante",
          dangerLevel: "Elevato Pericolo",
          notes: "Provoca forti perdite di sangue dallo stomaco che non si riescono a fermare. Nei gatti è velenosissimo perché il loro corpo lo smaltisce molto lentamente accumulandosi nei giorni.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          name: "Advantix / Fiale antipulci per cani",
          category: "Antiparassitario Esterno",
          dangerLevel: "Letale per i gatti",
          notes: "Le fialette antipulci dei cani sono MORTALI per i gatti. Se un gatto tocca un cane appena trattato o se gli viene messa la fiala del cane per sbaglio, comincia ad avere forti convulsioni e può morire in poche ore. Lavare subito con tanto sapone e correre dal veterinario.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
      ];

      defaultDrugs.forEach((drug) => {
        const docRef = doc(collection(db, "forbidden_drugs"));
        batch.set(docRef, drug);
      });

      await batch.commit();
      console.log("Seed farmaci completato con successo!");
    } catch (e) {
      console.error("Errore durante il seed dei farmaci:", e);
    }
  };

  // Seed default symptoms function
  const seedDefaultSymptoms = async () => {
    try {
      console.log("Inizializzazione automatica elenco sintomi e comportamenti predefiniti...");
      const batch = writeBatch(db);
      const defaultSymptoms: Omit<AnimalSymptom, 'id'>[] = [
        {
          title: "Schiuma alla bocca o bava eccessiva",
          type: "malattia",
          description: "Può significare che l'animale ha mangiato del veleno (veleno per topi, lumachicidi, diserbante nei campi) oppure che ha un fortissimo colpo di calore o qualcosa incastrato in gola.",
          whatToDo: "Spostare subito il cane all'ombra e al fresco. Se pensi ci sia del veleno in giro, blocca subito l'area per non far avvicinare altri animali. Chiama subito il veterinario d'urgenza.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          title: "Il cane ha paura delle carezze o si lamenta se lo tocchi",
          type: "maltrattamento",
          description: "Quando provi ad allungare la mano per fargli una carezza e il cane si rannicchia terrorizzato, mette la coda tra le gambe, trema forte o fa un verso/guaito di dolore in un punto preciso del corpo.",
          whatToDo: "Avvicinati piano, di lato e senza guardarlo fisso negli occhi. Parla a voce bassa e dolce. Fai un video col telefono per far vedere come reagisce male alla presenza del padrone: è una prova importante di maltrattamento psicofisico e botte passate.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          title: "Cane debolissimo che non riesce ad alzarsi",
          type: "malattia",
          description: "L'animale è moscio, non risponde se lo chiami e non riesce a stare in piedi sulle zampe dietro. Spesso ha un'emorragia interna invisibile (dovuta a un trauma o incidente) o un'infezione grave.",
          whatToDo: "Non costringerlo a camminare. Coprilo con una coperta per non farlo raffreddare e portalo immediatamente alla clinica veterinaria più vicina.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          title: "Segni sul collo, catene corte o piaghe sulla pelle",
          type: "maltrattamento",
          description: "Ferite rosse o senza pelo intorno al collo causate da catene corte, corde di plastica strette o collari che sono penetrati nella carne perché mai allentati mentre il cane cresceva.",
          whatToDo: "Fai foto ravvicinate della ferita e dello strumento (catena o corda). Sequestra subito la catena se è illegale e scrivi il verbale di maltrattamento d'ufficio per togliere l'animale da quella situazione.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          title: "Cane magrissimo (si vedono tutte le costole e le ossa)",
          type: "maltrattamento",
          description: "Forte denutrizione perché non gli viene dato da mangiare da giorni, pelle secca e senza elasticità per la disidratazione (mancanza d'acqua pulita, spesso la ciotola è vuota o piena di fango).",
          whatToDo: "Fai foto dettagliate delle ciotole vuote, dello sporco circostante e delle ossa sporgenti del cane. Se l'animale rischia la vita, portalo via subito facendolo sequestrare d'urgenza e affidandolo a una struttura sicura.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
        {
          title: "Respiro affannato e veloce a bocca aperta (senza aver corso)",
          type: "malattia",
          description: "Il cane respira velocemente tenendo il collo teso e sembra soffocare. Può essere un colpo di calore grave, problemi al cuore o avvelenamento da sostanze tossiche.",
          whatToDo: "Se l'ambiente è caldissimo, bagna le zampe e la pancia con acqua fresca (NON ghiacciata, se no rischia un infarto). Tienilo ventilato e calmo e chiama subito il veterinario.",
          updatedAt: new Date().toISOString(),
          updatedBy: "Sistema HQ",
        },
      ];

      defaultSymptoms.forEach((symptom) => {
        const docRef = doc(collection(db, "animal_symptoms"));
        batch.set(docRef, symptom);
      });

      await batch.commit();
      console.log("Seed sintomi completato con successo!");
    } catch (e) {
      console.error("Errore durante il seed dei sintomi:", e);
    }
  };

  // 3. Drug Form Submit
  const handleDrugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugForm.name || !drugForm.category) return;

    setIsSaving(true);
    try {
      const data = {
        ...drugForm,
        updatedAt: new Date().toISOString(),
        updatedBy: userName || userEmail,
      };

      if (editingDrug && editingDrug.id) {
        await updateDoc(doc(db, "forbidden_drugs", editingDrug.id), data);
      } else {
        await addDoc(collection(db, "forbidden_drugs"), data);
      }

      // Reset form
      setDrugForm({
        name: "",
        category: "",
        dangerLevel: "Altamente Tossico",
        notes: "",
      });
      setEditingDrug(null);
      setIsDrugFormOpen(false);
    } catch (err) {
      console.error("Errore salvataggio farmaco:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Symptom Form Submit
  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomForm.title || !symptomForm.description) return;

    setIsSaving(true);
    try {
      const data = {
        ...symptomForm,
        updatedAt: new Date().toISOString(),
        updatedBy: userName || userEmail,
      };

      if (editingSymptom && editingSymptom.id) {
        await updateDoc(doc(db, "animal_symptoms", editingSymptom.id), data);
      } else {
        await addDoc(collection(db, "animal_symptoms"), data);
      }

      // Reset form
      setSymptomForm({
        title: "",
        type: "malattia",
        description: "",
        whatToDo: "",
      });
      setEditingSymptom(null);
      setIsSymptomFormOpen(false);
    } catch (err) {
      console.error("Errore salvataggio sintomo:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Delete handlers
  const handleDeleteDrug = async (id: string) => {
    if (!window.confirm("Sicuro di voler eliminare questo farmaco?")) return;
    try {
      await deleteDoc(doc(db, "forbidden_drugs", id));
    } catch (err) {
      console.error("Errore eliminazione farmaco:", err);
    }
  };

  const handleDeleteSymptom = async (id: string) => {
    if (!window.confirm("Sicuro di voler eliminare questo sintomo?")) return;
    try {
      await deleteDoc(doc(db, "animal_symptoms", id));
    } catch (err) {
      console.error("Errore eliminazione sintomo:", err);
    }
  };

  // Filter lists based on real-time search
  const filteredDrugs = drugs.filter((d) => {
    const term = drugSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      d.name.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term) ||
      d.notes.toLowerCase().includes(term) ||
      d.dangerLevel.toLowerCase().includes(term)
    );
  });

  const filteredSymptoms = symptoms.filter((s) => {
    const term = symptomSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      s.title.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.whatToDo.toLowerCase().includes(term);

    const matchesType = symptomTypeFilter === "all" || s.type === symptomTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        nativeButton={true}
        render={
          variant === "card" ? (
            <button
              type="button"
              id="btn-farmaci-vietati-card"
              className="group relative h-42 bg-gradient-to-br from-[#991b1b]/25 to-[#0f172a]/80 hover:from-[#991b1b]/40 hover:to-[#0f172a]/90 border-2 border-red-500/20 hover:border-red-500/45 text-left p-4 rounded-3xl flex flex-col justify-between shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer w-full"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                </div>
                <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Salute</span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">Farmaci Vietati &amp; Sintomi</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 leading-relaxed h-8 line-clamp-2 overflow-hidden">
                  Sostanze tossiche, farmaci vietati e indicatori di maltrattamento animale
                </p>
              </div>
            </button>
          ) : variant === "standard" ? (
            <button
              type="button"
              id="btn-farmaci-vietati-standard"
              className="h-28 bg-gradient-to-br from-red-950/20 to-slate-900/60 hover:from-red-900/40 border-2 border-red-500/20 hover:border-red-500/50 text-white rounded-2xl flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 group shadow-xl cursor-pointer w-full"
            >
              <ShieldAlert className="h-6 w-6 text-red-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs uppercase font-black tracking-wider text-center leading-tight">
                Farmaci Vietati <br /> &amp; Sintomi
              </span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-farmaci-vietati"
              className="h-28 bg-[#991b1b]/15 hover:bg-[#991b1b]/30 border-2 border-red-500/30 text-yellow-400 rounded-2xl flex flex-col items-center justify-center p-4 gap-2 transition-all active:scale-95 group shadow-xl cursor-pointer w-full"
            >
              <ShieldAlert className="h-6 w-6 text-yellow-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs uppercase font-black tracking-wider text-center leading-tight text-yellow-400">
                FARMACI VIETATI <br /> & SINTOMI
              </span>
            </button>
          )
        }
      />

      <DialogContent className="max-w-[98vw] w-full md:max-w-[1750px] h-[94vh] max-h-[95vh] bg-[#030712] text-slate-200 border border-slate-800 flex flex-col p-0 overflow-hidden shadow-2xl rounded-3xl">
        <DialogHeader className="p-3.5 md:p-4 border-b border-slate-800 bg-slate-950/80 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <DialogTitle className="text-lg font-normal text-white uppercase italic tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Guida Rapida Salute Animale
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              Farmaci vietati, tossici o da somministrare solo sotto controllo medico e segnali di sofferenza
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("drugs")}
                className={`px-3 py-1 text-xs uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "drugs"
                    ? "bg-red-700 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                💊 Farmaci Pericolosi
              </button>
              <button
                onClick={() => setActiveTab("symptoms")}
                className={`px-3 py-1 text-xs uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "symptoms"
                    ? "bg-purple-700 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🐾 Sintomi &amp; Abusi
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-200 hover:text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ml-1"
              title="Chiudi finestra"
            >
              <X className="h-4 w-4 text-red-400" />
              <span>Chiudi</span>
            </button>
          </div>
        </DialogHeader>

        {/* DRUGS TAB VIEW */}
        {activeTab === "drugs" && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4.5 gap-3">
            {/* Search and Action Header */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-center shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Cerca farmaco, categoria o effetto..."
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 focus:border-red-500 text-xs text-white h-9 rounded-xl w-full"
                />
                {drugSearch && (
                  <button
                    onClick={() => setDrugSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingDrug(null);
                    setDrugForm({
                      name: "",
                      category: "",
                      dangerLevel: "Altamente Tossico",
                      notes: "",
                    });
                    setIsDrugFormOpen(true);
                  }}
                  className="bg-red-800 hover:bg-red-700 text-white text-xs uppercase tracking-wider font-bold h-9 px-4 rounded-xl w-full sm:w-auto shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Aggiungi Farmaco
                </Button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950/10 [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-700">
              {loadingDrugs ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-red-500" />
                  <span className="text-[11px] uppercase tracking-wider">Caricamento banca dati...</span>
                </div>
              ) : filteredDrugs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                  <HelpCircle className="h-8 w-8 text-slate-600 mx-auto mb-2.5" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nessun farmaco trovato</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Prova a modificare i termini della ricerca
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">
                  {filteredDrugs.map((drug) => {
                    const isExpanded = expandedDrugId === drug.id;
                    return (
                      <motion.div
                        layout
                        key={drug.id}
                        onClick={() => setExpandedDrugId(isExpanded ? null : (drug.id || null))}
                        className={`bg-slate-900/65 border rounded-2xl p-3 md:p-3.5 flex flex-col justify-between transition-all shadow-md group relative cursor-pointer select-none ${
                          isExpanded ? "border-red-500/80 bg-red-950/15" : "border-slate-800/80 hover:border-slate-700/85 hover:bg-slate-900/90"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-white tracking-wide leading-snug">
                                {drug.name}
                              </h4>
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mt-0.5">
                                {drug.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 self-start mt-0.5">
                              {isExpanded ? (
                                <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                  Nascondi <span className="text-[10px]">▲</span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-500 group-hover:text-slate-300 font-bold uppercase tracking-wider flex items-center gap-0.5 transition-colors">
                                  Dettagli <span className="text-[10px]">▼</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-2"
                              >
                                <div className="mb-2 flex items-center gap-1.5">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    Pericolo:
                                  </span>
                                  <Badge
                                    className={`text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold border ${
                                      drug.dangerLevel.toLowerCase().includes("letale") ||
                                      drug.dangerLevel.toLowerCase().includes("altamente")
                                        ? "bg-red-950/40 text-red-400 border-red-900/40"
                                        : "bg-orange-950/40 text-orange-400 border-orange-900/40"
                                    }`}
                                  >
                                    {drug.dangerLevel}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed font-normal bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/40">
                                  {drug.notes}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                          <span>Modificato da: {drug.updatedBy || "N/A"}</span>
                          {isAdmin && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingDrug(drug);
                                  setDrugForm({
                                    name: drug.name,
                                    category: drug.category,
                                    dangerLevel: drug.dangerLevel,
                                    notes: drug.notes,
                                  });
                                  setIsDrugFormOpen(true);
                                }}
                                className="h-6.5 w-6.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => drug.id && handleDeleteDrug(drug.id)}
                                className="h-6.5 w-6.5 text-red-400 hover:text-red-300 hover:bg-red-950/35 rounded-lg"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SYMPTOMS TAB VIEW */}
        {activeTab === "symptoms" && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4.5 gap-3">
            {/* Search and Action Header */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-center shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Cerca sintomo, indizio o cosa fare..."
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 focus:border-purple-500 text-xs text-white h-9 rounded-xl w-full"
                />
                {symptomSearch && (
                  <button
                    onClick={() => setSymptomSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => setSymptomTypeFilter("all")}
                  className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                    symptomTypeFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setSymptomTypeFilter("malattia")}
                  className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                    symptomTypeFilter === "malattia" ? "bg-blue-900/50 text-blue-300 border border-blue-800/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Malattie
                </button>
                <button
                  onClick={() => setSymptomTypeFilter("maltrattamento")}
                  className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                    symptomTypeFilter === "maltrattamento" ? "bg-purple-900/50 text-purple-300 border border-purple-800/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Maltrattamenti
                </button>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingSymptom(null);
                    setSymptomForm({
                      title: "",
                      type: "malattia",
                      description: "",
                      whatToDo: "",
                    });
                    setIsSymptomFormOpen(true);
                  }}
                  className="bg-purple-800 hover:bg-purple-700 text-white text-xs uppercase tracking-wider font-bold h-9 px-4 rounded-xl w-full sm:w-auto shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Aggiungi Sintomo
                </Button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950/10 [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-700">
              {loadingSymptoms ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
                  <span className="text-[11px] uppercase tracking-wider">Caricamento banca dati...</span>
                </div>
              ) : filteredSymptoms.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                  <HelpCircle className="h-8 w-8 text-slate-600 mx-auto mb-2.5" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nessun sintomo trovato</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Prova a modificare i termini della ricerca o i filtri
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 pb-3">
                  {filteredSymptoms.map((sym) => (
                    <motion.div
                      layout
                      key={sym.id}
                      className="bg-slate-900/65 border border-slate-800/80 rounded-2xl p-3.5 hover:border-slate-700/85 transition-all shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-xl border ${
                              sym.type === "maltrattamento" 
                                ? "bg-purple-950/40 text-purple-400 border-purple-900/30" 
                                : "bg-blue-950/40 text-blue-400 border-blue-900/30"
                            }`}>
                              {sym.type === "maltrattamento" ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <Activity className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white tracking-wide">
                                {sym.title}
                              </h4>
                              <span className="text-[8px] uppercase tracking-widest font-black text-slate-500">
                                {sym.type === "maltrattamento" ? "Sospetto Maltrattamento (Reato)" : "Sintomatologia Comune Malessere"}
                              </span>
                            </div>
                          </div>
                          <Badge
                            className={`text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold ${
                              sym.type === "maltrattamento"
                                ? "bg-purple-950/60 text-purple-400 border border-purple-900/40"
                                : "bg-blue-950/60 text-blue-400 border border-blue-900/40"
                            }`}
                          >
                            {sym.type}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1 block">
                              <HelpCircle className="h-3 w-3 text-slate-500 inline-block mr-1" />
                              Significato pratico:
                            </span>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                              {sym.description}
                            </p>
                          </div>

                          <div className="bg-emerald-950/10 p-3 rounded-xl border border-emerald-900/20">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1 mb-1 block">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 inline-block mr-1" />
                              Cosa fare sul posto:
                            </span>
                            <p className="text-[11px] text-emerald-100/90 leading-relaxed font-normal italic">
                              {sym.whatToDo}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                        <span>Modificato da: {sym.updatedBy || "N/A"}</span>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingSymptom(sym);
                                setSymptomForm({
                                  title: sym.title,
                                  type: sym.type,
                                  description: sym.description,
                                  whatToDo: sym.whatToDo,
                                });
                                setIsSymptomFormOpen(true);
                              }}
                              className="h-6.5 w-6.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => sym.id && handleDeleteSymptom(sym.id)}
                              className="h-6.5 w-6.5 text-red-400 hover:text-red-300 hover:bg-red-950/35 rounded-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER BAR WITH CLOSE BUTTON */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold hidden sm:inline">
            Guida Veloce Operativa • Guardie Eco-Zoofile
          </span>
          <Button
            type="button"
            onClick={() => setIsOpen(false)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs uppercase font-bold px-4 py-1.5 h-auto rounded-xl flex items-center gap-1.5 active:scale-95 transition-all ml-auto"
          >
            <X className="h-4 w-4 text-red-400" />
            Chiudi Finestra
          </Button>
        </div>
      </DialogContent>

      {/* DRUG ADD/EDIT DIALOG */}
      <Dialog open={isDrugFormOpen} onOpenChange={setIsDrugFormOpen}>
        <DialogContent className="max-w-md bg-[#090d16] text-slate-200 border border-slate-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base uppercase font-bold text-white tracking-wider">
              {editingDrug ? "📝 Modifica Farmaco" : "➕ Registra Nuovo Farmaco"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDrugSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Nome Comune / Commerciale
              </Label>
              <Input
                type="text"
                required
                value={drugForm.name}
                onChange={(e) => setDrugForm({ ...drugForm, name: e.target.value })}
                className="bg-slate-900 border-slate-800 text-xs text-white"
                placeholder="es: Paracetamolo (Tachipirina)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Categoria
                </Label>
                <Input
                  type="text"
                  required
                  value={drugForm.category}
                  onChange={(e) => setDrugForm({ ...drugForm, category: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs text-white"
                  placeholder="es: Antinfiammatorio"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Livello di Pericolo
                </Label>
                <Select
                  value={drugForm.dangerLevel}
                  onValueChange={(v) => setDrugForm({ ...drugForm, dangerLevel: v })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="Moderato">Moderato</SelectItem>
                    <SelectItem value="Elevato Pericolo">Elevato Pericolo</SelectItem>
                    <SelectItem value="Altamente Tossico">Altamente Tossico</SelectItem>
                    <SelectItem value="Letale / Critico">Letale / Critico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Note & Effetti (Parole Semplici)
              </Label>
              <textarea
                required
                value={drugForm.notes}
                onChange={(e) => setDrugForm({ ...drugForm, notes: e.target.value })}
                rows={4}
                className="w-full rounded-md bg-slate-900 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Spiega in parole semplici perché è pericoloso e quali danni produce..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDrugFormOpen(false)}
                className="bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300 text-xs uppercase"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-red-800 hover:bg-red-700 text-white text-xs uppercase"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salva Farmaco
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SYMPTOM ADD/EDIT DIALOG */}
      <Dialog open={isSymptomFormOpen} onOpenChange={setIsSymptomFormOpen}>
        <DialogContent className="max-w-md bg-[#090d16] text-slate-200 border border-slate-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base uppercase font-bold text-white tracking-wider">
              {editingSymptom ? "📝 Modifica Sintomo" : "➕ Registra Nuovo Sintomo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSymptomSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Titolo Sintomo / Atteggiamento
              </Label>
              <Input
                type="text"
                required
                value={symptomForm.title}
                onChange={(e) => setSymptomForm({ ...symptomForm, title: e.target.value })}
                className="bg-slate-900 border-slate-800 text-xs text-white"
                placeholder="es: Tremori continui e coda tra le gambe"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Tipo
              </Label>
              <Select
                value={symptomForm.type}
                onValueChange={(v: "malattia" | "maltrattamento") =>
                  setSymptomForm({ ...symptomForm, type: v })
                }
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200 text-xs">
                  <SelectItem value="malattia">🩺 Sintomo Malattia</SelectItem>
                  <SelectItem value="maltrattamento">⚖️ Sospetto Maltrattamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Spiegazione Semplice
              </Label>
              <textarea
                required
                value={symptomForm.description}
                onChange={(e) => setSymptomForm({ ...symptomForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-md bg-slate-900 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Che cosa significa per un non esperto? Spiegalo come mangeresti pane e mortadella..."
              />
            </div>

            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Guida Operativa (Cosa deve fare la guardia sul campo)
              </Label>
              <textarea
                required
                value={symptomForm.whatToDo}
                onChange={(e) => setSymptomForm({ ...symptomForm, whatToDo: e.target.value })}
                rows={3}
                className="w-full rounded-md bg-slate-900 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Passi d'azione immediata (es. bagnare il cane, fotografare ferite, sequestrare)..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSymptomFormOpen(false)}
                className="bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300 text-xs uppercase"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-purple-850 hover:bg-purple-700 text-white text-xs uppercase"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salva Sintomo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

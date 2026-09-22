import React from "react";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Layers, 
  Search, 
  Plus, 
  PlusCircle,
  Trash, 
  Camera, 
  MapPin, 
  Calendar, 
  User, 
  FileText, 
  Filter, 
  CheckCircle, 
  Download, 
  AlertTriangle, 
  AlertCircle,
  Navigation,
  Upload,
  Save,
  Loader2,
  Image as ImageIcon 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "../lib/utils";

export interface AnimaliaCensusTabProps {
  animaliaPassword: string;
  setAnimaliaPassword: (val: string) => void;
  showAnimaliaPassword: boolean;
  setShowAnimaliaPassword: (val: boolean) => void;
  handleAnimaliaUnlock: () => void;
  animaliaError?: string;
  isAnimaliaUnlocked: boolean;
  setIsAnimaliaUnlocked: (val: boolean) => void;
  animaliaCensus: any[];
  newCensusSpecie: "gatti" | "cani" | "uccelli";
  setNewCensusSpecie: (val: "gatti" | "cani" | "uccelli") => void;
  newCensusNome: string;
  setNewCensusNome: (val: string) => void;
  newCensusLocalita: string;
  setNewCensusLocalita: (val: string) => void;
  newCensusCount: number;
  setNewCensusCount: (val: number) => void;
  newCensusDettagli: string;
  setNewCensusDettagli: (val: string) => void;
  newCensusCoords: { lat?: number; lng?: number };
  newCensusPhoto: string;
  setNewCensusPhoto: (val: string) => void;
  newCensusNotes: string;
  setNewCensusNotes: (val: string) => void;
  handleGetCensusLocation: () => void;
  handleSaveCensus: () => Promise<void>;
  handleDeleteCensus: (id: string) => Promise<void>;
  loading: boolean;
}

export const AnimaliaCensusTab: React.FC<AnimaliaCensusTabProps> = ({
  animaliaPassword,
  setAnimaliaPassword,
  showAnimaliaPassword,
  setShowAnimaliaPassword,
  handleAnimaliaUnlock,
  animaliaError,
  isAnimaliaUnlocked,
  setIsAnimaliaUnlocked,
  animaliaCensus,
  newCensusSpecie,
  setNewCensusSpecie,
  newCensusNome,
  setNewCensusNome,
  newCensusLocalita,
  setNewCensusLocalita,
  newCensusCount,
  setNewCensusCount,
  newCensusDettagli,
  setNewCensusDettagli,
  newCensusCoords,
  newCensusPhoto,
  setNewCensusPhoto,
  newCensusNotes,
  setNewCensusNotes,
  handleGetCensusLocation,
  handleSaveCensus,
  handleDeleteCensus,
  loading,
}) => {
  if (!isAnimaliaUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-slate-700 mx-auto max-w-2xl animate-in fade-in zoom-in duration-300">
                    <Lock className="h-12 w-12 text-emerald-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2 text-white italic uppercase tracking-tight">Progetto Arca / Animalia</h2>
                    <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest text-center px-6">Richiesta password di autorizzazione per Giuliano e Consuelo</p>
                    <div className="flex gap-2 max-w-sm w-full px-4">
                      <div className="relative flex-1">
                        <Input
                          type={showAnimaliaPassword ? "text" : "password"}
                          placeholder="Inserisci password di sblocco..."
                          value={animaliaPassword}
                          onChange={(e) => setAnimaliaPassword(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAnimaliaUnlock()
                          }
                          className="bg-black border-slate-700 pr-10 text-white"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-white"
                          onClick={() =>
                            setShowAnimaliaPassword(!showAnimaliaPassword)
                          }
                        >
                          {showAnimaliaPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAnimaliaUnlock}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Sblocca
                      </Button>
                    </div>
                    {animaliaError && (
                      <div className="mt-4 flex items-center gap-2 text-red-400 text-xs p-2 rounded-lg bg-red-900/20 border border-red-900/30">
                        <AlertCircle className="h-3 w-3" />
                        {animaliaError}
                      </div>
                    )}
                  </div>
    );
  }

  return (
    <div className="space-y-6">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/80 p-6 rounded-2xl border border-emerald-500/50 shadow-xl shadow-emerald-900/10 mb-4 gap-4">
                             <div>
                               <h2 className="text-2xl font-normal flex items-center gap-3 text-emerald-300 italic uppercase tracking-normal">
                                 <Camera className="h-8 w-8 text-emerald-400" />
                                 PROGETTO ARCA & ANIMALIA
                               </h2>
                               <p className="text-sm text-emerald-400 font-normal uppercase tracking-wider mt-1">Censimento e Monitoraggio Colonie Feline, Cani ed Uccelli</p>
                             </div>
                             <div className="flex gap-4">
                               <div className="bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-xl text-center">
                                 <div className="text-[11px] text-emerald-400 uppercase tracking-widest font-normal">Totale Censiti</div>
                                 <div className="text-2xl font-normal text-white tracking-widest leading-none mt-1">
                                    {animaliaCensus.reduce((a, b) => a + Number(b.conteggioConfermato || 0), 0)}
                                 </div>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   setIsAnimaliaUnlocked(false);
                                   setAnimaliaPassword("");
                                 }}
                                 className="bg-slate-800 hover:bg-slate-700 text-white font-normal py-2 px-4 rounded-xl border border-slate-700 flex items-center gap-2 transition-all active:scale-95 cursor-pointer text-xs uppercase"
                               >
                                 Blocca Area
                               </button>
                             </div>
                           </div>

                           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                             {/* Form di Inserimento */}
                             <Card className="lg:col-span-5 bg-slate-950 border-emerald-500/20 text-white shadow-lg">
                               <CardHeader className="border-b border-slate-800 pb-4">
                                 <CardTitle className="text-sm font-normal text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
                                   <PlusCircle className="h-4 w-4 text-emerald-400" /> Nuovo Tracciamento sul Campo
                                 </CardTitle>
                               </CardHeader>
                               <CardContent className="p-6 space-y-5">
                                 {/* Specie */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Specie Animale</label>
                                   <div className="grid grid-cols-3 gap-2">
                                     {[
                                       { id: "gatti", label: "🐈 GATTI" },
                                       { id: "cani", label: "🐕 CANI" },
                                       { id: "uccelli", label: "🐦 UCCELLI" }
                                     ].map((item) => (
                                       <button
                                         key={item.id}
                                         type="button"
                                         onClick={() => setNewCensusSpecie(item.id as any)}
                                         className={cn(
                                           "py-2.5 px-2 rounded-xl border font-normal text-xs transition-all uppercase text-center cursor-pointer",
                                           newCensusSpecie === item.id 
                                             ? "bg-emerald-600 border-emerald-400 text-white shadow-md" 
                                             : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                         )}
                                       >
                                         {item.label}
                                       </button>
                                     ))}
                                   </div>
                                 </div>

                                 {/* Nome Colonia o Zona */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Nome Colonia o Zona</label>
                                   <Input
                                     value={newCensusNome}
                                     onChange={(e) => setNewCensusNome(e.target.value)}
                                     placeholder="es. Colonia Felina Centro, Recinto Nord..."
                                     className="bg-slate-900 border-slate-800 text-slate-100 text-sm py-2"
                                   />
                                 </div>

                                 {/* Localita */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Località / Comune</label>
                                   <Input
                                     value={newCensusLocalita}
                                     onChange={(e) => setNewCensusLocalita(e.target.value)}
                                     placeholder="es. Lucca, Capannori..."
                                     className="bg-slate-900 border-slate-800 text-slate-100 text-sm py-2"
                                   />
                                 </div>

                                 {/* Conteggio */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Numero Esemplari Rilevati</label>
                                   <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                                     <button
                                       type="button"
                                       onClick={() => setNewCensusCount(Math.max(1, newCensusCount - 1))}
                                       className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white font-normal rounded-lg flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer"
                                     >
                                       -
                                     </button>
                                     <span className="flex-1 text-center text-xl font-normal text-emerald-300">
                                       {newCensusCount}
                                     </span>
                                     <button
                                       type="button"
                                       onClick={() => setNewCensusCount(newCensusCount + 1)}
                                       className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white font-normal rounded-lg flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer"
                                     >
                                       +
                                     </button>
                                   </div>
                                 </div>

                                 {/* Composizione / Dettagli del Conteggio */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Dettagli del Conteggio</label>
                                   <Input
                                     value={newCensusDettagli}
                                     onChange={(e) => setNewCensusDettagli(e.target.value)}
                                     placeholder="es. 3 maschi, 2 femmine sterilizzate, 1 cucciolo"
                                     className="bg-slate-900 border-slate-800 text-slate-100 text-sm py-2"
                                   />
                                 </div>

                                 {/* GPS Coords */}
                                 <div className="space-y-3">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide flex justify-between items-center block">
                                     <span>Rilevamento GPS</span>
                                     <button
                                       type="button"
                                       onClick={handleGetCensusLocation}
                                       className="text-[11px] text-emerald-400 font-normal hover:underline uppercase tracking-wide flex items-center gap-1 cursor-pointer"
                                     >
                                       <Navigation className="h-3 w-3" /> Rileva Coordinate Ora
                                     </button>
                                   </label>
                                   <div className="grid grid-cols-2 gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs">
                                     <div className="p-2 border-r border-slate-800 text-center">
                                       <span className="text-slate-400 font-normal block mb-0.5">LATITUDINE (LAT)</span>
                                       <span className="text-emerald-300 font-mono break-all">{newCensusCoords.lat ? newCensusCoords.lat.toFixed(6) : "Non rilevato"}</span>
                                     </div>
                                     <div className="p-2 text-center">
                                       <span className="text-slate-400 font-normal block mb-0.5">LONGITUDINE (LNG)</span>
                                       <span className="text-emerald-300 font-mono break-all">{newCensusCoords.lng ? newCensusCoords.lng.toFixed(6) : "Non rilevato"}</span>
                                     </div>
                                   </div>
                                 </div>

                                 {/* Photo Upload with Base64 preview */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Fotografia della Rilevazione (da Cellulare o Archivio)</label>
                                   
                                   {newCensusPhoto ? (
                                     <div className="relative border border-slate-800 bg-slate-900 rounded-xl p-3">
                                       <img src={newCensusPhoto} referrerPolicy="no-referrer" alt="Anteprima censimento" className="max-h-48 mx-auto rounded-lg object-cover shadow-md" />
                                       <button
                                         type="button"
                                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewCensusPhoto(""); }}
                                         className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-md active:scale-95 transition-all cursor-pointer"
                                         title="Rimuovi foto"
                                       >
                                         <Trash className="h-4 w-4" />
                                       </button>
                                       <p className="text-[11px] text-slate-400 text-center mt-2 font-normal uppercase">Immagine acquisita correttamente</p>
                                     </div>
                                   ) : (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       {/* Opzione 1: Scatta Foto sul posto */}
                                       <div className="border border-dashed border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/25 transition-all rounded-xl p-4 text-center cursor-pointer relative group flex flex-col items-center justify-center min-h-[110px]">
                                         <Camera className="h-7 w-7 text-emerald-400 mb-2 group-hover:scale-105 transition-all" />
                                         <span className="text-xs text-white block font-normal uppercase tracking-wide">📸 Scatta Foto</span>
                                         <span className="text-[10px] text-slate-400 block mt-1">Avvia fotocamera cellulare</span>
                                         <input
                                           type="file"
                                           accept="image/*"
                                           capture="environment"
                                           onChange={(e) => {
                                             const file = e.target.files?.[0];
                                             if (file) {
                                               const reader = new FileReader();
                                               reader.onloadend = () => {
                                                 setNewCensusPhoto(reader.result as string);
                                               };
                                               reader.readAsDataURL(file);
                                             }
                                           }}
                                           className="absolute inset-0 opacity-0 cursor-pointer"
                                         />
                                       </div>

                                       {/* Opzione 2: Seleziona da Galleria */}
                                       <div className="border border-dashed border-slate-850 bg-slate-900/40 hover:bg-slate-900/70 transition-all rounded-xl p-4 text-center cursor-pointer relative group flex flex-col items-center justify-center min-h-[110px]">
                                         <Upload className="h-7 w-7 text-slate-400 mb-2 group-hover:scale-105 transition-all" />
                                         <span className="text-xs text-slate-200 block font-normal uppercase tracking-wide">📂 Scegli Foto</span>
                                         <span className="text-[10px] text-slate-400 block mt-1">Da memoria o galleria cellulare</span>
                                         <input
                                           type="file"
                                           accept="image/*"
                                           onChange={(e) => {
                                             const file = e.target.files?.[0];
                                             if (file) {
                                               const reader = new FileReader();
                                               reader.onloadend = () => {
                                                 setNewCensusPhoto(reader.result as string);
                                               };
                                               reader.readAsDataURL(file);
                                             }
                                           }}
                                           className="absolute inset-0 opacity-0 cursor-pointer"
                                         />
                                       </div>
                                     </div>
                                   )}
                                 </div>

                                 {/* Note */}
                                 <div className="space-y-2">
                                   <label className="text-sm uppercase font-normal text-slate-200 tracking-wide block">Note Operative</label>
                                   <textarea
                                     value={newCensusNotes}
                                     onChange={(e) => setNewCensusNotes(e.target.value)}
                                     placeholder="Inserisci eventuali prescrizioni sanitarie o dettagli aggiuntivi..."
                                     className="bg-slate-900 border-slate-800 text-slate-100 text-sm w-full rounded-xl p-3 h-20 outline-none focus:border-emerald-500/40 transition-all resize-none"
                                   />
                                 </div>

                                 <button
                                   type="button"
                                   onClick={handleSaveCensus}
                                   disabled={loading}
                                   className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-normal py-3.5 px-4 rounded-xl shadow-lg border border-emerald-400/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                                 >
                                   {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                                   Salva Censimento Arca
                                 </button>
                               </CardContent>
                             </Card>

                             {/* Storico del Censimento in grid */}
                             <div className="lg:col-span-7 space-y-4">
                               <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                                 <span className="text-xs uppercase font-normal text-slate-300 tracking-widest">Database Censimenti</span>
                                 <span className="text-xs bg-emerald-950 text-emerald-300 font-normal px-2.5 py-1 rounded-full border border-emerald-950">
                                   {animaliaCensus.length} record memorizzati
                                 </span>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {animaliaCensus.length === 0 ? (
                                   <div className="col-span-full bg-slate-950/40 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 italic text-sm">
                                     Nessun censimento registrato. Compila il modulo a sinistra per inserire la prima rilevazione sul campo.
                                   </div>
                                 ) : (
                                   animaliaCensus.map((census) => (
                                     <Card key={census.id} className="bg-slate-950 border-slate-800 hover:border-emerald-500/20 transition-all flex flex-col justify-between overflow-hidden relative group">
                                       <div className="p-4 space-y-3 font-normal">
                                         {/* Intestazione Card */}
                                         <div className="flex justify-between items-start">
                                           <div className="space-y-1">
                                             <span className={cn(
                                               "text-[10px] font-normal px-2 py-0.5 rounded-full uppercase tracking-widest border",
                                               census.specie === "gatti" ? "bg-amber-950 text-amber-300 border-amber-950" :
                                               census.specie === "cani" ? "bg-blue-950 text-blue-300 border-blue-950" :
                                               "bg-purple-950 text-purple-300 border-purple-950"
                                             )}>
                                               {census.specie === "gatti" ? "🐈 Gatti" :
                                                census.specie === "cani" ? "🐕 Cani" :
                                                "🐦 Uccelli"}
                                             </span>
                                             <h3 className="text-md font-normal text-white tracking-tight mt-1 leading-tight break-all">
                                               {census.nomeColoniaZona}
                                             </h3>
                                             {census.localita && (
                                               <p className="text-xs text-slate-300 flex items-center gap-1 italic break-all">
                                                 <MapPin className="h-3 w-3 text-emerald-400" /> {census.localita}
                                               </p>
                                             )}
                                           </div>
                                           <div className="bg-emerald-900/20 border border-emerald-500/20 px-3 py-2 rounded-xl text-center min-w-[50px]">
                                             <span className="text-[9px] uppercase font-normal text-slate-300 block tracking-widest">Tot</span>
                                             <span className="text-lg font-normal text-emerald-300 leading-none">{census.conteggioConfermato}</span>
                                           </div>
                                         </div>

                                         {/* Foto in card if present */}
                                         {census.photo && (
                                           <div className="relative rounded-lg overflow-hidden h-32 w-full bg-slate-900 border border-slate-800">
                                             <img src={census.photo} referrerPolicy="no-referrer" alt={census.nomeColoniaZona} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                                           </div>
                                         )}

                                         {/* Descrizione / Composizione */}
                                         {census.dettagliConteggio && (
                                           <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 text-xs">
                                             <span className="text-slate-400 font-normal block mb-0.5 uppercase tracking-wider text-[8px]">Composizione:</span>
                                             <p className="text-slate-100 break-all">{census.dettagliConteggio}</p>
                                           </div>
                                         )}

                                         {/* Note */}
                                         {census.note && (
                                           <p className="text-xs text-slate-300 italic break-all border-l-2 border-emerald-500/30 pl-2">
                                             "{census.note}"
                                           </p>
                                         )}
                                       </div>

                                       {/* Footer Card */}
                                       <div className="bg-slate-900 border-t border-slate-800/60 p-3 flex justify-between items-center text-[10px]">
                                         <div>
                                           <span className="text-slate-400 block font-normal">Rilevatore:</span>
                                           <span className="text-slate-200 font-normal">{census.operatoreNome} ({census.operatoreMatricola})</span>
                                         </div>
                                         <div className="flex items-center gap-1.5">
                                           {census.creatoAl && (
                                             <span className="text-slate-300 font-normal">{new Date(census.creatoAl).toLocaleDateString("it-IT")}</span>
                                           )}
                                           <button
                                             type="button"
                                             onClick={() => handleDeleteCensus(census.id)}
                                             className="bg-red-950/40 border border-red-900/30 text-red-300 hover:bg-red-900 hover:text-white p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer"
                                             title="Elimina record"
                                           >
                                             <Trash className="h-3.5 w-3.5" />
                                           </button>
                                         </div>
                                       </div>
                                     </Card>
                                   ))
                                 )}
                               </div>
                             </div>
                           </div>
                        </div>
  );
};

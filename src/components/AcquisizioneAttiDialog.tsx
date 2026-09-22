import React from "react";
import { 
  Scan, 
  X, 
  Camera, 
  FileText, 
  Folder, 
  Upload, 
  PawPrint,
  Scale
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface AcquisizioneAttiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenVerbaleScanner: () => void;
  onOpenCanineSingleScanner: () => void;
  onOpenCanineBulkScanner: () => void;
  onOpenArchivioHQ: () => void;
}

export const AcquisizioneAttiDialog: React.FC<AcquisizioneAttiDialogProps> = ({
  open,
  onOpenChange,
  onOpenVerbaleScanner,
  onOpenCanineSingleScanner,
  onOpenCanineBulkScanner,
  onOpenArchivioHQ,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
                  <DialogContent className="bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden max-w-[98vw] w-full md:max-w-[1750px] h-[94vh] max-h-[95vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl">
                    <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/10 shrink-0 flex flex-row justify-between items-center">
                      <div>
                        <DialogTitle className="text-2xl font-normal text-white uppercase italic tracking-wider flex items-center gap-2">
                          <Scan className="h-6 w-6 text-emerald-400 animate-pulse" />
                          HUB ACQUISIZIONE ATTI & SCANNER
                        </DialogTitle>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                          Digitializzazione e Trascrizione AI &bull; Nucleo Vigilanza Bertolucci
                        </p>
                      </div>
                      <button 
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </DialogHeader>

                    {/* Content area with grid of scanners */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-gradient-to-b from-slate-950 to-slate-900/30">
                      <div className="text-sm text-slate-400 mb-2 leading-relaxed">
                        Seleziona lo strumento di scansione in base al documento cartaceo che desideri digitalizzare. L'intelligenza artificiale integrata estrarrà le informazioni in tempo reale popolando l'archivio ufficiale.
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 1. SCANSIONE VERBALE DI SOPRALLUOGO */}
                        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-[30px]" />
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-500/20 text-purple-400">
                                <Scale className="h-6 w-6" />
                              </div>
                              <span className="text-[9px] bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                                AI OCR Attivo
                              </span>
                            </div>
                            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">
                              Verbale di Sopralluogo / Sanzione
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Esegui lo scanner di un verbale di sopralluogo cartaceo compilato a mano. L'intelligenza artificiale decifrerà la grafia e popolerà l'intero atto (soggetto, constatazioni, sanzione e microchip).
                            </p>
                          </div>
                          <div className="mt-6">
                            <Button
                              onClick={onOpenVerbaleScanner}
                              className="w-full bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 text-purple-200 hover:text-white uppercase text-xs h-10 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                            >
                              <Camera className="h-4 w-4" /> Avvia Scansione Verbale
                            </Button>
                          </div>
                        </div>

                        {/* 2. SCANSIONE CERTIFICATO ANAGRAFE CANINA */}
                        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px]" />
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20 text-emerald-400">
                                <PawPrint className="h-6 w-6" />
                              </div>
                              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                                Estrazione Chip
                              </span>
                            </div>
                            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">
                              Certificato Anagrafe Canina (Singolo)
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Inquadra il foglio di iscrizione all'Anagrafe Canina regionale o della USL. Gemini estrarrà automaticamente i dati del proprietario, le specifiche dell'animale e il numero di microchip.
                            </p>
                          </div>
                          <div className="mt-6">
                            <Button
                              onClick={onOpenCanineSingleScanner}
                              className="w-full bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/30 text-emerald-200 hover:text-white uppercase text-xs h-10 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                            >
                              <Camera className="h-4 w-4" /> Acquisisci Certificato Canino
                            </Button>
                          </div>
                        </div>

                        {/* 3. SCANSIONE REGISTRO CONTROLLI / RIGHE MULTIPLE */}
                        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[30px]" />
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-500/20 text-blue-400">
                                <FileText className="h-6 w-6" />
                              </div>
                              <span className="text-[9px] bg-blue-500/15 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                                Tabella Bulk Row
                              </span>
                            </div>
                            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">
                              Registro Tabellare Controlli Campo
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Esegui l'upload o scatta una foto di un foglio di controlli anagrafe canina con righe multiple. L'algoritmo identificherà la tabella estraendo righe di cani e microchip per l'importazione in blocco.
                            </p>
                          </div>
                          <div className="mt-6">
                            <Button
                              onClick={onOpenCanineBulkScanner}
                              className="w-full bg-blue-900/40 hover:bg-blue-800/50 border border-blue-500/30 text-blue-200 hover:text-white uppercase text-xs h-10 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                            >
                              <Upload className="h-4 w-4" /> Scannerizza Registro Controlli
                            </Button>
                          </div>
                        </div>

                        {/* 4. ALLEGATI DOCUMENTALI HQ */}
                        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-[30px]" />
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-500/20 text-slate-400">
                                <Folder className="h-6 w-6" />
                              </div>
                              <span className="text-[9px] bg-slate-500/15 border border-slate-500/30 text-slate-300 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                                Ufficio HQ
                              </span>
                            </div>
                            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">
                              Caricamento Allegati HQ & ASL
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Associa riscontri scannerizzati della Polizia Municipale, risposte scritte ASL, o relazioni mediche veterinarie direttamente all'interno delle singole Cartelle Uniche dall'Archivio HQ.
                            </p>
                          </div>
                          <div className="mt-6">
                            <Button
                              onClick={onOpenArchivioHQ}
                              className="w-full bg-slate-950/80 hover:bg-slate-800 border border-slate-700/50 text-slate-200 hover:text-white uppercase text-xs h-10 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                            >
                              <Folder className="h-4 w-4" /> Vai all'Archivio HQ Verbali
                            </Button>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="p-6 border-t border-slate-800 bg-slate-950 shrink-0 flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-widest">
                      <span>Stato Connessione: Sincronizzato con Server AI</span>
                      <span>Nucleo Massa-Carrara</span>
                    </div>
                  </DialogContent>
                </Dialog>

                
  );
};

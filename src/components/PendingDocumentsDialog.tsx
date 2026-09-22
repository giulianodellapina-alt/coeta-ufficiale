import React from "react";
import { 
  WifiOff, 
  Wifi, 
  Send, 
  Trash2, 
  Clock, 
  User, 
  MapPin, 
  AlertCircle, 
  CheckCircle,
  FileText,
  UploadCloud,
  ClipboardCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "../lib/utils";
import { format } from "date-fns";

export interface PendingDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingDocuments: any[];
  setPendingDocuments: React.Dispatch<React.SetStateAction<any[]>>;
  isTransmitting: boolean;
  transmitPendingDocument: (pnd: any) => Promise<void>;
}

export const PendingDocumentsDialog: React.FC<PendingDocumentsDialogProps> = ({
  open,
  onOpenChange,
  pendingDocuments,
  setPendingDocuments,
  isTransmitting,
  transmitPendingDocument,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
                  <DialogContent className="bg-[#020617] border border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden max-w-[98vw] w-full md:max-w-[1750px] h-[94vh] max-h-[95vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl">
                    <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/10 shrink-0 flex flex-row justify-between items-center">
                      <div>
                        <DialogTitle className="text-2xl font-normal text-white uppercase italic tracking-wider flex items-center gap-2">
                          <WifiOff className="h-6 w-6 text-amber-500 mr-2 animate-pulse" />
                          Documenti in Sospeso
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                          Gestione verbali e rapporti salvati offline per mancanza di campo / segnale
                        </DialogDescription>
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-slate-950/20">
                      {/* Stato segnale */}
                      <div className={cn(
                        "p-4 rounded-xl border flex items-center gap-4 transition-all duration-300",
                        navigator.onLine 
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                          : "bg-red-950/20 border-red-500/30 text-red-400"
                      )}>
                        <div className={cn(
                          "p-2 rounded-full",
                          navigator.onLine ? "bg-emerald-500/10" : "bg-red-500/10"
                        )}>
                          {navigator.onLine ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold uppercase tracking-wider">
                            Stato Rete: {navigator.onLine ? "CONNESSO / SEGNALE ATTIVO" : "DISCONNESSO / NESSUN CAMPO"}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 normal-case">
                            {navigator.onLine 
                              ? "La rete è attiva. Qualsiasi documento salvato in sospeso verrà trasmesso automaticamente o può essere inviato manualmente." 
                              : "Nessun segnale rilevato. L'app salverà automaticamente i rapporti e i verbali in questa sezione. Verranno inviati in automatico non appena tornerà la connessione."
                            }
                          </p>
                        </div>
                      </div>

                      {pendingDocuments.length === 0 ? (
                        <div className="bg-[#090d1a] border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                          <div className="mx-auto h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-600">
                            <ClipboardCheck className="h-8 w-8" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Nessun documento in sospeso</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 uppercase tracking-wide leading-relaxed">
                              Tutti i verbali di sopralluogo e i rapporti di servizio giornalieri sono stati correttamente archiviati nel database centrale.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {pendingDocuments.map((docItem) => (
                            <div 
                              key={docItem.id} 
                              className="bg-[#090d1a] border border-slate-800 hover:border-slate-700 rounded-2xl p-6 space-y-4 transition-all flex flex-col justify-between"
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <span className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider",
                                    docItem.type === "verbale" 
                                      ? "bg-purple-950/40 text-purple-400 border border-purple-500/20" 
                                      : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                  )}>
                                    {docItem.type === "verbale" ? "Verbale Sopralluogo" : "Rapporto Servizio"}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {docItem.createdAt ? format(new Date(docItem.createdAt), "dd/MM HH:mm") : "N/D"}
                                  </span>
                                </div>

                                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide leading-snug">
                                  {docItem.title}
                                </h3>
                              </div>

                              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                <Button 
                                  onClick={() => transmitPendingDocument(docItem)}
                                  disabled={isTransmitting}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider py-2 rounded-xl border-none flex items-center justify-center gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" /> Invia
                                </Button>
                                
                                <Button 
                                  onClick={() => {
                                    if (window.confirm("Sei sicuro di voler eliminare definitivamente questa bozza? L'operazione non è reversibile.")) {
                                      setPendingDocuments(prev => {
                                        const filtered = prev.filter(x => x.id !== docItem.id);
                                        localStorage.setItem("pending_documents", JSON.stringify(filtered));
                                        return filtered;
                                      });
                                    }
                                  }}
                                  disabled={isTransmitting}
                                  variant="ghost" 
                                  className="text-red-400 hover:text-red-300 hover:bg-red-950/20 p-2 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center gap-4">
                      <div>
                        {pendingDocuments.length > 0 && (
                          <Button 
                            onClick={async () => {
                              if (!navigator.onLine) {
                                alert("Attenzione: Sei ancora offline. Impossibile avviare la trasmissione cumulativa.");
                                return;
                              }
                              if (window.confirm(`Vuoi trasmettere tutti i ${pendingDocuments.length} documenti in sospeso?`)) {
                                alert(`Avvio trasmissione di ${pendingDocuments.length} documenti...`);
                                for (const pnd of [...pendingDocuments]) {
                                  try {
                                    await transmitPendingDocument(pnd);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }
                            }}
                            disabled={isTransmitting || !navigator.onLine}
                            className="bg-amber-600 hover:bg-amber-700 text-white border-none rounded-xl font-bold text-xs uppercase tracking-wider px-6 py-2.5 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" /> Invia Tutti ({pendingDocuments.length})
                          </Button>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-white uppercase tracking-wider text-xs font-semibold"
                      >
                        Chiudi
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
  );
};

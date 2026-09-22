import { VehicleDamageMap } from "./VehicleDamageMap";
import React from "react";
import { 
  Truck, 
  Car, 
  MapPin, 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Calendar 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface VehicleLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleLogForm: any;
  setVehicleLogForm: React.Dispatch<React.SetStateAction<any>>;
  handleSubmitVehicleLog: () => Promise<void>;
  vehicles: any[];
}

export const VehicleLogDialog: React.FC<VehicleLogDialogProps> = ({
  open,
  onOpenChange,
  vehicleLogForm,
  setVehicleLogForm,
  handleSubmitVehicleLog,
  vehicles,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
                  <DialogContent className="bg-[#020617] border-slate-800 text-slate-200 p-0 flex flex-col overflow-hidden max-w-[95vw] md:max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <DialogHeader className="p-6 border-b border-white/5 bg-slate-900/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2 rounded-xl">
                          <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-normal text-white uppercase italic tracking-tight">Diario Bordo Mezzo</DialogTitle>
                          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Sottoscrizione attività e manutenzione mezzo</p>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Data Servizio</Label>
                              <Input
                                type="date"
                                value={vehicleLogForm.date}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    date: e.target.value,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Mezzo Utilizzato</Label>
                              <Select
                                value={vehicleLogForm.vehicleId}
                                onValueChange={(v) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    vehicleId: v,
                                  })
                                }
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-white h-12 rounded-xl">
                                  <SelectValue placeholder="Scegli..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                  {vehicles.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                      {v.name} ({v.plate})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Km Partenza</Label>
                              <Input
                                type="number"
                                value={vehicleLogForm.startKm}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    startKm: e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12 text-sm font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Km Rientro</Label>
                              <Input
                                type="number"
                                value={vehicleLogForm.endKm}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    endKm: e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12 text-sm font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Ora Partenza</Label>
                              <Input
                                type="time"
                                value={vehicleLogForm.startTime}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    startTime: e.target.value,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Ora Rientro</Label>
                              <Input
                                type="time"
                                value={vehicleLogForm.endTime}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    endTime: e.target.value,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Rifornimento (Litri)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={vehicleLogForm.fuelAmount}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    fuelAmount: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Costo (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={vehicleLogForm.fuelCost}
                                onChange={(e) =>
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    fuelCost: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="bg-slate-900 border-slate-800 h-12 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Località di Intervento</Label>
                            <Input
                              placeholder="Es: Carrara est, Foce..."
                              value={vehicleLogForm.location}
                              onChange={(e) =>
                                setVehicleLogForm({
                                  ...vehicleLogForm,
                                  location: e.target.value,
                                })
                              }
                              className="bg-slate-900 border-slate-800 h-12 text-sm italic"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Mappa Danni / Check-up</Label>
                            <div className="p-3 bg-slate-950/50 rounded-2xl border border-white/5">
                              <p className="text-[10px] text-slate-500 italic mb-2">Tocca le icone sulla mappa per segnalare anomalie.</p>
                              <VehicleDamageMap
                                damagePoints={vehicleLogForm.damagePoints}
                                onPointClick={(id, desc) => {
                                  const newPoints = { ...vehicleLogForm.damagePoints };
                                  if (desc) newPoints[id] = desc;
                                  else delete newPoints[id];
                                  setVehicleLogForm({
                                    ...vehicleLogForm,
                                    damagePoints: newPoints,
                                  });
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-normal uppercase tracking-widest text-slate-400">Altre Anomalie o Note</Label>
                            <textarea
                              placeholder="Es: Rumore freni, lampadina bruciata..."
                              value={vehicleLogForm.anomalies}
                              onChange={(e) =>
                                setVehicleLogForm({
                                  ...vehicleLogForm,
                                  anomalies: e.target.value,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-800 text-white p-4 rounded-xl min-h-[100px] font-medium text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="p-6 border-t border-white/5 bg-slate-900/50">
                      <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-white uppercase text-[10px] tracking-widest font-normal"
                      >
                        Annulla
                      </Button>
                      <Button
                        onClick={handleSubmitVehicleLog}
                        className="bg-blue-600 hover:bg-blue-500 text-white uppercase italic tracking-widest px-8 rounded-xl h-12 font-normal shadow-lg shadow-blue-900/20"
                      >
                        Invia Rapporto Mezzo
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
  );
};

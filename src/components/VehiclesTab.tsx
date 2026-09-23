import React, { useState } from "react";
import { format } from "date-fns";
import { 
  Truck, Printer, Plus, History as HistoryIcon, Clock, Mail, 
  AlertTriangle, CheckCircle2, AlertCircle, Settings, Trash2, 
  X, Info, Wrench, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Vehicle, VehicleLog, VehicleMaintenanceRecord } from "../types";
import { VehicleDamageMap } from "./VehicleDamageMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

interface VehiclesTabProps {
  activeTab: string;
  vehicles: Vehicle[];
  vehicleLogs: VehicleLog[];
  newVehicle: Partial<Vehicle>;
  setNewVehicle: React.Dispatch<React.SetStateAction<Partial<Vehicle>>>;
  vehicleFilter: string;
  setVehicleFilter: (filter: string) => void;
  isAnimaliaAuthorized: boolean;
  isAdmin: boolean;
  handleAddVehicle: () => Promise<void>;
  handleUpdateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  handleShareVehicleLog: (log: any) => void;
  handlePrint: (className: string) => void;
}

export const VehiclesTab = ({
  activeTab,
  vehicles,
  vehicleLogs,
  newVehicle,
  setNewVehicle,
  vehicleFilter,
  setVehicleFilter,
  isAnimaliaAuthorized,
  isAdmin,
  handleAddVehicle,
  handleUpdateVehicle,
  removeVehicle,
  handleShareVehicleLog,
  handlePrint
}: VehiclesTabProps) => {
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  return (
    <div className="space-y-6">
      {activeTab === "vehicles" && (
        <div className="space-y-6 lg:space-y-10">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Truck className="h-32 w-32 text-blue-500" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl font-normal italic tracking-tighter flex items-center gap-4 text-white">
                <Truck className="h-10 w-10 text-blue-500" />
                PARCO AUTO AZIENDALE
              </h2>
              <p className="text-slate-300 text-sm mt-2 uppercase tracking-[0.2em] font-normal">Management e Scadenziario Tecnico Flotta Nucleo</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 relative z-10 w-full xl:w-auto">
              {isAnimaliaAuthorized && (
                <Button 
                  onClick={() => handlePrint(".vehicle-table-print")}
                  variant="outline" 
                  className="h-14 px-6 border-slate-700 text-white font-normal uppercase tracking-widest text-xs rounded-2xl flex-1 xl:flex-none hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4 mr-2" /> Esporta Lista
                </Button>
              )}
              
              <Dialog>
                <DialogTrigger 
                  nativeButton={true}
                  render={
                    <Button className="bg-blue-700 hover:bg-blue-600 h-14 px-8 rounded-2xl font-normal uppercase tracking-tighter shadow-xl shadow-blue-900/30 flex-1 xl:flex-none text-white border-none">
                      <Plus className="h-5 w-5 mr-3" />
                      Nuovo Mezzo
                    </Button>
                  }
                />
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-normal italic uppercase">Aggiungi Veicolo alla Flotta</DialogTitle>
                    <DialogDescription className="text-slate-500">Configurazione parametri tecnici e scadenze</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Marca/Modello</Label>
                      <Input 
                        className="bg-slate-950 border-slate-700 text-white" 
                        value={newVehicle.name || ""}
                        onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                        placeholder="Es: Fiat Panda 4x4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Targa</Label>
                      <Input 
                        className="bg-slate-950 border-slate-700 font-mono uppercase text-white" 
                        value={newVehicle.plate || ""}
                        onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
                        placeholder="Es: AB 123 CD"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alimentazione</Label>
                      <Select value={newVehicle.fuelType || "benzina"} onValueChange={(v) => setNewVehicle({...newVehicle, fuelType: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white">
                          <SelectItem value="benzina" className="focus:bg-blue-600 focus:text-white">Benzina</SelectItem>
                          <SelectItem value="diesel" className="focus:bg-blue-600 focus:text-white">Diesel</SelectItem>
                          <SelectItem value="gpl" className="focus:bg-blue-600 focus:text-white">GPL</SelectItem>
                          <SelectItem value="metano" className="focus:bg-blue-600 focus:text-white">Metano</SelectItem>
                          <SelectItem value="ibrida" className="focus:bg-blue-600 focus:text-white">Ibrida</SelectItem>
                          <SelectItem value="elettrica" className="focus:bg-blue-600 focus:text-white">Elettrica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data Immatricolazione</Label>
                      <Input 
                        type="date"
                        className="bg-slate-950 border-slate-700 text-white" 
                        value={newVehicle.registrationDate || ""}
                        onChange={(e) => setNewVehicle({...newVehicle, registrationDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scadenza Assicurazione</Label>
                      <Input 
                        type="date"
                        className="bg-slate-950 border-slate-700 text-white" 
                        value={newVehicle.insuranceExpiry || ""}
                        onChange={(e) => setNewVehicle({...newVehicle, insuranceExpiry: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scadenza Revisione</Label>
                      <Input 
                        type="date"
                        className="bg-slate-950 border-slate-700 text-white" 
                        value={newVehicle.revisionExpiry || ""}
                        onChange={(e) => setNewVehicle({...newVehicle, revisionExpiry: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddVehicle} className="bg-blue-700 hover:bg-blue-600 w-full font-normal uppercase py-6 text-xl shadow-xl shadow-blue-500/20 text-white border-none">Salva in Anagrafica</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* DASHBOARD RAPIDA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/50 border-slate-800 p-6 flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-xs text-yellow-500 uppercase font-normal tracking-widest mb-1">Mezzi Disponibili</p>
                <h3 className="text-4xl font-normal text-green-500 italic uppercase">
                  {vehicles.filter(v => v.status === "available").length}
                </h3>
                <div className="flex -space-x-1 mt-2">
                  {vehicles.filter(v => v.status === "available").map((v, idx) => (
                    <div key={`${v.id}_${idx}`} className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xs font-normal text-green-400 font-mono" title={v.plate}>
                      {v.plate.slice(-2)}
                    </div>
                  ))}
                </div>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500/20 absolute -right-2 top-1/2 -translate-y-1/2" />
            </Card>
            
            <Card className="bg-slate-900/50 border-slate-800 p-6 flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-xs text-red-500 uppercase font-normal tracking-widest mb-1">Mezzi in Officina</p>
                <h3 className="text-4xl font-normal text-red-500 italic uppercase">
                  {vehicles.filter(v => v.status === "maintenance").length}
                </h3>
                <div className="flex flex-col gap-1 mt-2">
                  {vehicles.filter(v => v.status === "maintenance").map((v, idx) => (
                    <Badge key={`${v.id}_${idx}`} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-2 py-0.5">
                      {v.plate} - {v.maintenanceReason || "Guasto generico"}
                    </Badge>
                  ))}
                </div>
              </div>
              <Wrench className="h-10 w-10 text-red-500/20 absolute -right-2 top-1/2 -translate-y-1/2" />
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 p-6 flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-xs text-blue-400 uppercase font-normal tracking-widest mb-1">Mezzi Operativi</p>
                <h3 className="text-4xl font-normal text-blue-400 italic uppercase">
                  {vehicles.filter(v => v.status === "in_use").length}
                </h3>
                <div className="flex flex-col gap-1 mt-2 text-[10px] text-slate-400">
                  {vehicles.filter(v => v.status === "in_use").map((v, idx) => (
                    <div key={`${v.id}_${idx}`} className="flex items-center gap-1">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-1 py-0">{v.plate}</Badge>
                      <span>{v.assignedToName || "Segnale debole..."}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Activity className="h-10 w-10 text-blue-400/20 absolute -right-2 top-1/2 -translate-y-1/2" />
            </Card>
          </div>

          {/* TABELLA DETTAGLIATA */}
          <Card className="bg-slate-950 border-slate-800 overflow-hidden shadow-2xl vehicle-table-print">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-900/40 hover:bg-slate-900/40">
                  <TableHead className="text-slate-300 uppercase text-xs font-normal italic tracking-widest px-6">Veicolo / Targa</TableHead>
                  <TableHead className="text-slate-300 uppercase text-xs font-normal italic tracking-widest">Alimentazione</TableHead>
                  <TableHead className="text-slate-300 uppercase text-xs font-normal italic tracking-widest">Scad. Assicurazione</TableHead>
                  <TableHead className="text-slate-300 uppercase text-xs font-normal italic tracking-widest">Scad. Revisione</TableHead>
                  <TableHead className="text-slate-300 uppercase text-xs font-normal italic tracking-widest">Ultimo Tagliando</TableHead>
                  <TableHead className="text-slate-300 uppercase text-xs font-normal italic tracking-widest">Stato</TableHead>
                  <TableHead className="text-right text-slate-300 uppercase text-xs font-normal italic tracking-widest px-6">Manutenzione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v, idx) => {
                  const isInsuranceExp = v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date();
                  const isInsuranceNear = v.insuranceExpiry && !isInsuranceExp && 
                    (new Date(v.insuranceExpiry).getTime() - new Date().getTime()) < (30 * 24 * 3600 * 1000);
                  
                  const isRevisionExp = v.revisionExpiry && new Date(v.revisionExpiry) < new Date();
                  const isRevisionNear = v.revisionExpiry && !isRevisionExp && 
                    (new Date(v.revisionExpiry).getTime() - new Date().getTime()) < (30 * 24 * 3600 * 1000);

                  return (
                    <TableRow key={`${v.id}_${idx}`} className="border-slate-800 hover:bg-slate-900/20 transition-all group">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 group-hover:border-blue-500/50 transition-colors">
                            <Truck className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-white font-normal text-lg leading-none mb-1">{v.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{v.plate}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-900/50 border-slate-700 text-slate-400 capitalize text-[10px]">
                          {v.fuelType || "Benzina"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "text-xs font-mono font-normal px-2 py-0.5 rounded border border-white/5",
                          isInsuranceExp ? "bg-red-500 text-white animate-pulse" : 
                          isInsuranceNear ? "bg-yellow-500 text-black border border-yellow-400" : "text-slate-300"
                        )}>
                          {v.insuranceExpiry ? format(new Date(v.insuranceExpiry), "dd/MM/yyyy") : "---"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "text-xs font-mono font-normal px-2 py-0.5 rounded border border-white/5",
                          isRevisionExp ? "bg-red-500 text-white animate-pulse" : 
                          isRevisionNear ? "bg-yellow-500 text-black border border-yellow-400" : "text-slate-300"
                        )}>
                          {v.revisionExpiry ? format(new Date(v.revisionExpiry), "dd/MM/yyyy") : "---"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-400 text-xs font-mono">
                          {v.lastOilChangeKm ? `${v.lastOilChangeKm} Km` : "N/D"}
                        </div>
                        <div className="text-xs text-slate-300 uppercase font-normal flex items-center gap-1">
                          Prossimo: <span className="text-blue-500/70">{v.nextOilChangeKm || "---"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            v.status === "available"
                              ? "bg-green-600"
                              : v.status === "maintenance"
                                ? "bg-red-600"
                                : "bg-blue-600",
                            "px-2 py-0 text-xs uppercase font-normal italic tracking-tight text-white border-slate-600"
                          )}
                        >
                          {v.status === "available"
                            ? "DISPONIBILE"
                            : v.status === "maintenance"
                              ? "MANUTENZIONE"
                              : "IN USO"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger 
                              nativeButton={true}
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-blue-400 hover:text-white hover:bg-blue-600/20"
                                  onClick={() => setEditingVehicle(v)}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DialogContent className="fixed inset-0 z-50 bg-[#020617] text-white p-6 overflow-y-auto w-full h-[100dvh] max-h-none md:w-full md:max-w-none md:h-full md:rounded-none shadow-none left-0 top-0 translate-x-0 translate-y-0 border-none">
                              {editingVehicle && editingVehicle.id === v.id && (
                                <>
                                  <DialogHeader className="border-b border-slate-800 pb-4">
                                    <div className="flex items-center gap-4">
                                      <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20">
                                        <Truck className="h-6 w-6 text-white" />
                                      </div>
                                      <div>
                                        <DialogTitle className="text-3xl font-normal italic uppercase tracking-tighter text-white">
                                          SCHEDA TECNICA: {editingVehicle.name}
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-400 uppercase tracking-[0.2em] font-normal text-xs mt-1">Management Avanzato e Log Manutenzioni</DialogDescription>
                                      </div>
                                    </div>
                                  </DialogHeader>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 py-6">
                                    {/* COLONNA 1: INFO BASE */}
                                    <div className="space-y-6">
                                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                                        <h4 className="text-xs uppercase font-normal italic text-blue-400 tracking-widest border-b border-slate-800 pb-2">Parametri Anagrafici</h4>
                                        <div className="space-y-3">
                                          <div>
                                            <Label className="text-slate-400 text-xs uppercase font-normal tracking-wider">Stato Attuale</Label>
                                            <Select 
                                              value={editingVehicle.status} 
                                              onValueChange={(v: any) => setEditingVehicle({...editingVehicle, status: v})}
                                            >
                                              <SelectTrigger className="bg-slate-950 border-slate-800 mt-1 text-white">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                <SelectItem value="available" className="focus:bg-blue-600 focus:text-white">Disponibile</SelectItem>
                                                <SelectItem value="maintenance" className="focus:bg-blue-600 focus:text-white">In Manutenzione</SelectItem>
                                                <SelectItem value="in_use" className="focus:bg-blue-600 focus:text-white">In Uso</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {editingVehicle.status === "maintenance" && (
                                            <div>
                                              <Label className="text-slate-400 text-xs uppercase font-normal tracking-wider">Motivo Fermo Tecnico</Label>
                                              <Input 
                                                className="bg-slate-950 border-slate-800 mt-1 text-white" 
                                                value={editingVehicle.maintenanceReason || ""}
                                                onChange={(e) => setEditingVehicle({...editingVehicle, maintenanceReason: e.target.value})}
                                                placeholder="Es: Cambio Gomme..."
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                                        <h4 className="text-xs uppercase font-normal italic text-orange-400 tracking-widest border-b border-slate-800 pb-2">Meccanica</h4>
                                        <div className="space-y-3">
                                          <div>
                                            <Label className="text-slate-400 text-xs uppercase font-normal tracking-wider">Ultimo Cambio Olio (Km)</Label>
                                            <Input 
                                              type="number"
                                              className="bg-slate-950 border-slate-800 mt-1 font-mono text-white" 
                                              value={editingVehicle.lastOilChangeKm || 0}
                                              onChange={(e) => setEditingVehicle({...editingVehicle, lastOilChangeKm: Number(e.target.value)})}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-slate-400 text-xs uppercase font-normal tracking-wider">Prossimo Cambio Olio (Km)</Label>
                                            <Input 
                                              type="number"
                                              className="bg-slate-950 border-slate-800 mt-1 font-mono text-blue-400" 
                                              value={editingVehicle.nextOilChangeKm || 0}
                                              onChange={(e) => setEditingVehicle({...editingVehicle, nextOilChangeKm: Number(e.target.value)})}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-slate-400 text-xs uppercase font-normal tracking-wider">Sostituzione Gomme (Data)</Label>
                                            <Input 
                                              type="date"
                                              className="bg-slate-950 border-slate-800 mt-1 font-mono text-white" 
                                              value={editingVehicle.lastTyreChangeDate || ""}
                                              onChange={(e) => setEditingVehicle({...editingVehicle, lastTyreChangeDate: e.target.value})}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* COLONNA 2 & 3: STORICO INTERVENTI */}
                                    <div className="md:col-span-2 space-y-6">
                                      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                        <div className="flex justify-between items-center mb-6">
                                          <h4 className="text-xs uppercase font-normal italic text-red-500 tracking-[0.2em] flex items-center gap-2">
                                            <HistoryIcon className="h-4 w-4" />
                                            LOG INTERVENTI ESTERNI
                                          </h4>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs uppercase font-normal px-4 py-5"
                                            onClick={() => {
                                              const newRecord: VehicleMaintenanceRecord = {
                                                id: Math.random().toString(36).substr(2, 9),
                                                type: "officina",
                                                reason: "",
                                                sentDate: new Date().toISOString().split('T')[0],
                                                paymentRef: "",
                                              };
                                              setEditingVehicle({
                                                ...editingVehicle,
                                                maintenanceHistory: [newRecord, ...(editingVehicle.maintenanceHistory || [])]
                                              });
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" /> Nuovo Intervento
                                          </Button>
                                        </div>

                                        <div className="space-y-4">
                                          {(editingVehicle.maintenanceHistory || []).map((record, rIdx) => (
                                            <div key={record.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl relative group/item">
                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                  <Label className="text-xs uppercase font-normal text-slate-300">Reparto</Label>
                                                  <Select 
                                                    value={record.type} 
                                                    onValueChange={(v: any) => {
                                                      const history = [...(editingVehicle.maintenanceHistory || [])];
                                                      history[rIdx] = {...record, type: v};
                                                      setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                    }}
                                                  >
                                                    <SelectTrigger className="bg-slate-900 border-slate-800 h-8 text-xs mt-1 text-white">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                      <SelectItem value="officina" className="focus:bg-blue-600 focus:text-white">Officina (Mecc.)</SelectItem>
                                                      <SelectItem value="elettrauto" className="focus:bg-blue-600 focus:text-white">Elettrauto</SelectItem>
                                                      <SelectItem value="carrozzeria" className="focus:bg-blue-600 focus:text-white">Carrozzeria</SelectItem>
                                                      <SelectItem value="gommista" className="focus:bg-blue-600 focus:text-white">Gommista</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div className="md:col-span-2">
                                                  <Label className="text-xs uppercase font-normal text-slate-300">Motivazione / Lavoro Svolto</Label>
                                                  <textarea 
                                                    className="w-full bg-slate-900 border-slate-800 rounded-md text-xs mt-1 p-2 min-h-[60px] text-white" 
                                                    value={record.reason}
                                                    onChange={(e) => {
                                                      const history = [...(editingVehicle.maintenanceHistory || [])];
                                                      history[rIdx] = {...record, reason: e.target.value};
                                                      setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                    }}
                                                    placeholder="Descrizione dettagliata dell'intervento..."
                                                  />
                                                </div>
                                                <div>
                                                  <Label className="text-xs uppercase font-normal text-slate-300">Inviato il</Label>
                                                  <Input 
                                                    type="date"
                                                    className="bg-slate-900 border-slate-800 h-8 text-xs mt-1 font-mono text-white" 
                                                    value={record.sentDate}
                                                    onChange={(e) => {
                                                      const history = [...(editingVehicle.maintenanceHistory || [])];
                                                      history[rIdx] = {...record, sentDate: e.target.value};
                                                      setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                    }}
                                                  />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 md:col-start-1">
                                                  <div>
                                                    <Label className="text-xs uppercase font-normal text-slate-300">Costo (€)</Label>
                                                    <Input 
                                                      type="number"
                                                      className="bg-slate-900 border-slate-800 h-8 text-xs mt-1 font-mono text-white" 
                                                      value={record.cost || 0}
                                                      onChange={(e) => {
                                                        const history = [...(editingVehicle.maintenanceHistory || [])];
                                                        history[rIdx] = {...record, cost: Number(e.target.value)};
                                                        setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs uppercase font-normal text-slate-300">Pagam. / Fattura</Label>
                                                    <Input 
                                                      className="bg-slate-900 border-slate-800 h-8 text-xs mt-1 text-white" 
                                                      value={record.paymentRef || ""}
                                                      onChange={(e) => {
                                                        const history = [...(editingVehicle.maintenanceHistory || [])];
                                                        history[rIdx] = {...record, paymentRef: e.target.value};
                                                        setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                      }}
                                                      placeholder="Rif. Pagamento..."
                                                    />
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs uppercase font-normal text-slate-300">Riconsegnato il</Label>
                                                  <Input 
                                                    type="date"
                                                    className="bg-slate-900 border-slate-800 h-8 text-xs mt-1 font-mono text-green-500" 
                                                    value={record.returnDate || ""}
                                                    onChange={(e) => {
                                                      const history = [...(editingVehicle.maintenanceHistory || [])];
                                                      history[rIdx] = {...record, returnDate: e.target.value};
                                                      setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                              <button 
                                                onClick={() => {
                                                  const history = (editingVehicle.maintenanceHistory || []).filter(r => r.id !== record.id);
                                                  setEditingVehicle({...editingVehicle, maintenanceHistory: history});
                                                }}
                                                className="absolute -right-2 -top-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border-2 border-slate-950"
                                              >
                                                <X className="h-3 w-3 text-white" />
                                              </button>
                                            </div>
                                          ))}
                                          
                                          {(editingVehicle.maintenanceHistory || []).length === 0 && (
                                            <div className="py-12 text-center text-slate-600 italic text-sm">
                                              Nessun intervento registrato nello storico.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <DialogFooter className="bg-slate-900/50 -mx-6 -mb-6 p-6 border-t border-slate-800 rounded-b-xl gap-4">
                                    <div className="flex-1 text-slate-400 text-xs uppercase font-normal flex items-center gap-2">
                                      <Info className="h-4 w-4 text-blue-400" />
                                      Modifica i campi desiderati e salva per aggiornare il database cloud.
                                    </div>
                                    <DialogClose 
                                      render={
                                        <Button variant="ghost" className="text-slate-400">Annulla</Button>
                                      }
                                    />
                                    <Button 
                                      className="bg-blue-700 hover:bg-blue-600 px-8 font-normal uppercase italic tracking-widest shadow-lg shadow-blue-600/20 text-white border-none"
                                      onClick={() => {
                                        handleUpdateVehicle(editingVehicle.id, editingVehicle);
                                      }}
                                    >
                                      Sincronizza Dati
                                    </Button>
                                  </DialogFooter>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-white hover:bg-red-600/20"
                            onClick={() => removeVehicle(v.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center bg-slate-900/10">
                      <div className="flex flex-col items-center gap-2 text-slate-600">
                        <Truck className="h-10 w-10 opacity-20" />
                        <span className="font-normal uppercase tracking-widest text-xs text-slate-500">Nessun veicolo censito nel database flotta.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "vehicle_logs" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-2xl font-normal flex items-center gap-2 text-white">
                <HistoryIcon className="h-6 w-6 text-blue-400" />
                Registro Uscite
              </h2>
              <p className="text-xs text-slate-500 mt-1">Storico chilometraggi e orari</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="w-full md:w-[200px] bg-slate-950 border-slate-700 text-white">
                  <SelectValue placeholder="Tutti i mezzi" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="all">Tutti i mezzi</SelectItem>
                  {vehicles.map((v, idx) => (
                    <SelectItem key={`${v.id}_${idx}`} value={v.id}>{v.name} ({v.plate})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className="bg-blue-600 shrink-0 text-white">
                {vehicleLogs.filter(log => vehicleFilter === "all" || log.vehicleId === vehicleFilter).length}
              </Badge>
            </div>
          </div>

          <Card className="bg-[#0f172a] border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-900/50">
                  <TableHead className="text-slate-400">Data/Ora</TableHead>
                  <TableHead className="text-slate-400">Mezzo</TableHead>
                  <TableHead className="text-slate-400">Conducente</TableHead>
                  <TableHead className="text-slate-400">Km</TableHead>
                  <TableHead className="text-right text-slate-400">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...vehicleLogs]
                  .filter(log => vehicleFilter === "all" || log.vehicleId === vehicleFilter)
                  .sort((a: any, b: any) => {
                    const t1 = a.timestamp?.seconds || 0;
                    const t2 = b.timestamp?.seconds || 0;
                    return t2 - t1;
                  })
                  .map((log, idx) => (
                    <TableRow
                      key={`${log.id}_${idx}`}
                      className="border-slate-800 hover:bg-slate-800/20 transition-colors"
                    >
                      <TableCell className="text-white">
                        <div className="font-normal text-sm text-white">
                          {log.date ? format(new Date(log.date), "dd/MM/yyyy") : "Data NCA"}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-blue-400 font-mono mt-1">
                          <Clock className="h-3 w-3" />
                          {log.startTime || "--:--"} ➔ {log.endTime || "--:--"}
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {log.vehicleName || "Sconosciuto"}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {log.guardName}
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs">
                        {log.startKm} - {log.endKm}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleShareVehicleLog(log)}
                          variant="ghost"
                          size="icon"
                          className="text-blue-400"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {vehicleLogs.filter(log => vehicleFilter === "all" || log.vehicleId === vehicleFilter).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      Nessun rapporto trovato.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "vehicle_status" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map(v => {
              const latestLogWithIssue = [...vehicleLogs]
                .filter(log => log.vehicleId === v.id && (log.anomalies || (log.damagePoints && Object.values(log.damagePoints).some(val => val))))
                .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
              
              return (
                <Card key={v.id} className="bg-slate-900 border-slate-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-normal text-lg italic uppercase tracking-widest">{v.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">{v.plate}</p>
                    </div>
                    <Badge className={cn(
                      v.status === "available" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    )}>
                      {v.status === "available" ? "Disponibile" : "In Manutenzione"}
                    </Badge>
                  </div>
                  
                  {latestLogWithIssue ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400 text-xs uppercase font-normal tracking-wider">
                        <AlertTriangle className="h-3 w-3" />
                        Ultima Segnalazione
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 italic">
                        "{latestLogWithIssue.anomalies || "Danni alla carrozzeria"}"
                      </p>
                      <p className="text-xs text-slate-300">
                        {latestLogWithIssue.date ? format(new Date(latestLogWithIssue.date), "dd/MM/yyyy") : "Data NCA"} - {latestLogWithIssue.guardName}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-500 text-xs uppercase font-normal tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      Nessuna Anomalia
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-2xl font-normal flex items-center gap-2 text-white text-red-400">
                <Truck className="h-6 w-6 text-red-500" />
                Stato Mezzi / Guasti
              </h2>
              <p className="text-xs text-slate-500 mt-1">Segnalazioni anomalie e danni</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="w-full md:w-[200px] bg-slate-950 border-slate-700 text-white">
                  <SelectValue placeholder="Tutti i mezzi" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="all">Tutti i mezzi</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.plate})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="bg-[#0f172a] border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-900/50">
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Mezzo</TableHead>
                  <TableHead className="text-slate-400">Dettagli Segnalazione</TableHead>
                  <TableHead className="text-right text-slate-400">Mappa Danni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...vehicleLogs]
                  .filter(log => (vehicleFilter === "all" || log.vehicleId === vehicleFilter) && 
                    (log.anomalies || (log.damagePoints && Object.values(log.damagePoints).some(v => v && typeof v === "string" && v.trim() !== ""))))
                  .sort((a: any, b: any) => {
                    const t1 = a.timestamp?.seconds || 0;
                    const t2 = b.timestamp?.seconds || 0;
                    return t2 - t1;
                  })
                  .map((log, idx) => (
                    <TableRow
                      key={`${log.id}_${idx}`}
                      className="border-slate-800 hover:bg-slate-800/20 transition-colors"
                    >
                      <TableCell className="text-white align-top">
                        <div className="font-medium">
                          {log.date ? format(new Date(log.date), "dd/MM/yyyy") : "Data NCA"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {log.guardName}
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium align-top">
                        {log.vehicleName || "Sconosciuto"}
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-[300px]">
                        {log.anomalies ? (
                          <div className="bg-slate-800/40 p-2 rounded border border-slate-700 mb-2">
                            <div className="text-xs uppercase text-slate-400 font-normal mb-1 flex items-center gap-1 tracking-wider">
                              <AlertCircle className="h-3 w-3 text-red-400" />
                              Anomalie riportate
                            </div>
                            <p className="text-sm italic text-slate-300 line-clamp-3">{log.anomalies}</p>
                          </div>
                        ) : null}
                        {!log.anomalies && "Nessuna anomalia descritta."}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {log.damagePoints &&
                          Object.values(log.damagePoints).some(v => v && typeof v === "string" && v.trim() !== "") ? (
                          <Dialog>
                            <DialogTrigger
                              nativeButton={true}
                              render={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 gap-2"
                                >
                                  <Truck className="h-4 w-4" />
                                  Vedi Danni
                                </Button>
                              }
                            />
                            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Stato Danni Riscontrati - {log.vehicleName}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500">
                                  ID Log: {log.id} - Segnalato da {log.guardName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4">
                                <VehicleDamageMap
                                  damagePoints={log.damagePoints}
                                  readOnly
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 border-slate-800 uppercase text-[10px]">
                            Nessun Danno Visibile
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                {vehicleLogs.filter(log => (vehicleFilter === "all" || log.vehicleId === vehicleFilter) && 
                  (log.anomalies || (log.damagePoints && Object.values(log.damagePoints).some(v => v && typeof v === "string" && v.trim() !== "")))).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                      Nessuna segnalazione guasti trovata per i criteri selezionati.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
};

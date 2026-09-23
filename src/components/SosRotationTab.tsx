import React from "react";
import { 
  CalendarClock, 
  Clock, 
  Check, 
  X, 
  User as UserIcon, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "../lib/utils";
import { Guard, Shift } from "../types";
import { parseISO } from "date-fns";

export interface SosRotationTabProps {
  sosRotationSubTab: "calendar" | "approvals";
  setSosRotationSubTab: (tab: "calendar" | "approvals") => void;
  guards: Guard[];
  shifts: Shift[];
  sosDutyShifts: any[];
  SosDutyManager: React.ComponentType<any>;
  canUserApproveThisShift: (shift: Shift) => boolean;
  handleApproveShift: (e: React.MouseEvent, id: string) => Promise<void>;
    formatItalianDate: (date: Date, pattern: string) => string;
  isApprovalPendingModalOpen?: boolean;
}

export const SosRotationTab: React.FC<SosRotationTabProps> = ({
  sosRotationSubTab,
  setSosRotationSubTab,
  guards,
  shifts,
  sosDutyShifts,
  SosDutyManager,
  canUserApproveThisShift,
  handleApproveShift,
    formatItalianDate,
}) => {
  return (
    
                      <div className="space-y-6">
                        <div className="flex border-b border-slate-800 gap-6 mb-4 pb-0">
                          <button
                            onClick={() => setSosRotationSubTab("calendar")}
                            className={cn(
                              "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition-all cursor-pointer flex items-center gap-2",
                              sosRotationSubTab === "calendar"
                                ? "border-blue-500 text-white"
                                : "border-transparent text-slate-400 hover:text-white"
                            )}
                          >
                            <CalendarClock className="h-4 w-4 text-blue-500" />
                            Pianificazione Turni SOS
                          </button>
                          <button
                            onClick={() => setSosRotationSubTab("approvals")}
                            className={cn(
                              "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition-all cursor-pointer flex items-center gap-2",
                              sosRotationSubTab === "approvals"
                                ? "border-blue-500 text-white"
                                : "border-transparent text-slate-400 hover:text-white"
                            )}
                          >
                            <Clock className="h-4 w-4 text-orange-500" />
                            Turni in attesa d'Approvazione
                            {shifts.filter((s) => s.status === "pending").length > 0 && (
                              <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                {shifts.filter((s) => s.status === "pending").length}
                              </span>
                            )}
                          </button>
                        </div>

                        {sosRotationSubTab === "calendar" ? (
                          <SosDutyManager guards={guards} sosDutyShifts={sosDutyShifts} />
                        ) : (
                          <div className="space-y-6">
                            <h2 className="text-xl font-normal flex items-center gap-2 text-white">
                              <Clock className="h-6 w-6 text-orange-400 mr-2" />
                              Approvazione Turni Guardie
                            </h2>
                            <Card className="bg-[#0f172a] border-slate-700 p-0 shadow-xl overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-slate-800 bg-slate-900/50">
                                    <TableHead className="text-slate-400">Data</TableHead>
                                    <TableHead className="text-slate-400">Guardia</TableHead>
                                    <TableHead className="text-slate-400">Settore</TableHead>
                                    <TableHead className="text-slate-400">Orario</TableHead>
                                    <TableHead className="text-right text-slate-400">Azioni</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {shifts
                                    .filter((sh) => sh.status === "pending")
                                    .map((sh, idx) => (
                                      <TableRow
                                        key={`${sh.id}_${idx}`}
                                        className="border-slate-800 hover:bg-slate-800/30"
                                      >
                                        <TableCell className="text-white">
                                          {formatItalianDate(
                                            parseISO(sh.date),
                                            "dd/MM/yyyy",
                                          )}
                                        </TableCell>
                                        <TableCell className="text-white font-normal text-xs uppercase tracking-wider">
                                          {sh.matricola || sh.guardName}
                                        </TableCell>
                                        <TableCell className="capitalize text-slate-400">
                                          {sh.sector}
                                        </TableCell>
                                        <TableCell className="text-slate-400">
                                          {sh.startTime} - {sh.endTime}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            {(() => {
                                              const canAuthorize = canUserApproveThisShift(sh);

                                              if (!canAuthorize) {
                                                return (
                                                  <span className="text-[10px] text-amber-500/80 italic font-normal uppercase tracking-normal">
                                                    In attesa di approvazione dal responsabile/admin
                                                  </span>
                                                );
                                              }

                                              return (
                                                <Button
                                                  onClick={(e) =>
                                                    handleApproveShift(e, sh.id)
                                                  }
                                                  className="bg-green-600 hover:bg-green-700 h-8 text-xs cursor-pointer"
                                                >
                                                  Approva
                                                </Button>
                                              );
                                            })()}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  {shifts.filter((sh) => sh.status === "pending").length === 0 && (
                                    <TableRow>
                                      <TableCell
                                        colSpan={5}
                                        className="text-center py-20 text-slate-600 italic"
                                      >
                                        Nessun turno in attesa di approvazione.
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

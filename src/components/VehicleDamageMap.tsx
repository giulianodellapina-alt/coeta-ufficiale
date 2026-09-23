import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const VehicleDamageMap = ({
  damagePoints = {},
  onPointClick,
  readOnly = false,
}: {
  damagePoints?: Record<string, string>;
  onPointClick?: (id: string, description: string) => void;
  readOnly?: boolean;
}) => {
  const views = [
    {
      id: "top",
      label: "Vista dall'alto",
      spots: [
        { id: "hood", x: "50%", y: "20%", label: "Cofano" },
        { id: "roof", x: "50%", y: "50%", label: "Tetto" },
        { id: "trunk", x: "50%", y: "85%", label: "Bagagliaio" },
      ],
    },
    {
      id: "left",
      label: "Lato Sinistro",
      spots: [
        { id: "f_left", x: "15%", y: "50%", label: "Parafango Ant. SX" },
        { id: "d_front_l", x: "40%", y: "50%", label: "Portiera Ant. SX" },
        { id: "d_rear_l", x: "65%", y: "50%", label: "Portiera Post. SX" },
        { id: "r_left", x: "85%", y: "50%", label: "Parafango Post. SX" },
      ],
    },
    {
      id: "right",
      label: "Lato Destro",
      spots: [
        { id: "f_right", x: "15%", y: "50%", label: "Parafango Ant. DX" },
        { id: "d_front_r", x: "40%", y: "50%", label: "Portiera Ant. DX" },
        { id: "d_rear_r", x: "65%", y: "50%", label: "Portiera Post. DX" },
        { id: "r_right", x: "85%", y: "50%", label: "Parafango Post. DX" },
      ],
    },
    {
      id: "rear",
      label: "Retro",
      spots: [
        { id: "bumper_r", x: "50%", y: "70%", label: "Paraurti Post." },
        { id: "glass_r", x: "50%", y: "30%", label: "Lunotto" },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 p-2">
      {views.map((view, vIdx) => (
        <div key={`${view.id}_${vIdx}`} className="space-y-1">
          <div className="text-[11px] uppercase font-normal text-slate-300 text-center">
            {view.label}
          </div>
          <div className="h-28 bg-slate-800/40 rounded-lg border border-slate-700/50 relative overflow-hidden flex items-center justify-center">
            <div className="w-10/12 h-16 border border-slate-600/30 rounded-xl bg-slate-800/20"></div>
            {view.spots.map((spot, sIdx) => {
              const hasDamage = !!damagePoints[spot.id];
              return (
                <Dialog key={`${spot.id}_${sIdx}`}>
                  <DialogTrigger
                    render={
                      <button
                        type="button"
                        style={{ left: spot.x, top: spot.y }}
                        className={cn(
                          "absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer z-20",
                          hasDamage
                            ? "bg-red-500 border-white text-white scale-110 shadow-lg"
                            : "bg-slate-700/30 border-slate-500 text-transparent hover:border-white",
                        )}
                      >
                        {hasDamage && <AlertCircle className="h-3 w-3" />}
                      </button>
                    }
                  />
                  <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-xs z-[100]">
                    <DialogHeader>
                      <DialogTitle className="text-sm">{spot.label}</DialogTitle>
                    </DialogHeader>
                    {!readOnly ? (
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400 uppercase">Descrizione Danno</Label>
                          <Input
                            value={damagePoints[spot.id] || ""}
                            onChange={(e) =>
                              onPointClick?.(spot.id, e.target.value)
                            }
                            placeholder="Es: Graffio profondo, ammaccatura..."
                            className="bg-slate-800 border-slate-700 h-9 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <DialogClose
                            className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none transition-colors h-8 cursor-pointer"
                          >
                            Salva Punto
                          </DialogClose>
                          {hasDamage && (
                            <DialogClose
                              onClick={() => onPointClick?.(spot.id, "")}
                              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-[10px] font-medium text-white hover:bg-red-700 focus:outline-none transition-colors h-8 cursor-pointer"
                            >
                              Rimuovi
                            </DialogClose>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <p className="text-sm text-slate-300">
                          {damagePoints[spot.id] || "Nessun danno."}
                        </p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

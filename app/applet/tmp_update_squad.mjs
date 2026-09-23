import fs from "fs";

let text = fs.readFileSync("src/App.tsx", "utf8");

const startStr = `<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {sq.members.map((m, mIdx) => (
                                <div key={mIdx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">`;

const endStr = `</div>
                              ))}
                            </div>`;

const searchIndex = text.indexOf(startStr);
console.log("Search index:", searchIndex);

if (searchIndex !== -1) {
  const endIndex = text.indexOf(endStr, searchIndex);
  if (endIndex !== -1) {
    const fullEnd = endIndex + endStr.length;
    
    const replacement = `<div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                              {sq.members.map((m, mIdx) => {
                                const gObj = guards.find(g => g.id === m.guardId || g.matricola === m.matricola);
                                const privateInfo = guardPrivateInfoMap[m.guardId];
                                const phone = privateInfo?.cellulare || privateInfo?.phone || m.phone || gObj?.phone;
                                const loc = gObj?.lastLocation;

                                return (
                                <div key={mIdx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2.5 shadow-md">
                                  {/* INTESTAZIONE OPERATORE */}
                                  <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", m.isOnline ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-slate-600")} />
                                      <div className="min-w-0">
                                        <p className="font-black text-slate-100 truncate uppercase text-xs tracking-tight">
                                          {m.fullName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                          <span className="text-amber-400 font-bold">Matricola: [{m.matricola}]</span>
                                          {phone && <span className="text-slate-300">• 📞 {phone}</span>}
                                        </p>
                                      </div>
                                    </div>
                                    {m.sectorLabel && (
                                      <span className="text-[8.5px] font-black px-2 py-0.5 rounded text-white shrink-0 uppercase" style={{ backgroundColor: m.sectorColor }}>
                                        {m.sectorLabel}
                                      </span>
                                    )}
                                  </div>

                                  {/* TABELLA UNIFORME A 2 COLONNE: EMERGENZA A SX, SERVIZIO A DX */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {/* COLONNA 1: EMERGENZA */}
                                    <div className="bg-rose-950/30 border border-rose-600/40 p-2 rounded-xl flex flex-col gap-1.5 text-center">
                                      <p className="text-[9px] text-rose-300 font-black uppercase tracking-widest leading-none pb-0.5 m-0">EMERGENZA</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenWhatsAppAndLog(phone, "Centrale Operativa: Comunicazione di servizio/emergenza.", m.guardId);
                                        }}
                                        className="h-7 w-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleMakeCallAndLog(phone, m.guardId);
                                        }}
                                        className="h-7 w-full bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <Phone className="h-3 w-3 shrink-0" /> Chiama
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTargetVideoGuard(gObj || ({ id: m.guardId, name: m.fullName, surname: "", matricola: m.matricola, phone: phone } as any));
                                          setVideoDialogOpen(true);
                                        }}
                                        className="h-7 w-full bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <Video className="h-3 w-3 shrink-0" /> Video Live
                                      </button>
                                    </div>

                                    {/* COLONNA 2: SERVIZIO */}
                                    <div className="bg-indigo-950/30 border border-indigo-600/40 p-2 rounded-xl flex flex-col gap-1.5 text-center">
                                      <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest leading-none pb-0.5 m-0">SERVIZIO</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedGuardForMission(gObj || ({ id: m.guardId, name: m.fullName, surname: "", matricola: m.matricola } as any));
                                          setIsMissionDialogOpen(true);
                                          if (radarSearchedPoint) {
                                            setNewMission({
                                              address: radarSearchedPoint.address,
                                              description: "",
                                              priority: "medium"
                                            });
                                          }
                                        }}
                                        className="h-7 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg border-0 shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <ShieldAlert className="h-3 w-3 shrink-0" /> Missione
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (loc) {
                                            window.open("https://www.google.com/maps?q=" + loc.lat + "," + loc.lng);
                                          } else {
                                            alert("Posizione GPS dell'operatore non disponibile al momento.");
                                          }
                                        }}
                                        className="h-7 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-medium uppercase tracking-wider rounded-lg border border-white/10 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none"
                                      >
                                        <ExternalLink className="h-3 w-3 shrink-0" /> G. Maps
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleGpsForGuard(m.guardId, m.matricola, m.fullName)}
                                        className={cn(
                                          "h-7 w-full text-[9px] font-black uppercase tracking-wider rounded-lg shadow flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center select-none border",
                                          m.isOnline
                                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400"
                                            : "bg-red-950/80 hover:bg-red-900 text-red-200 border-red-500/30"
                                        )}
                                      >
                                        {m.isOnline ? "🟢 GPS ON" : "🔴 GPS OFF"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>`;
                            
    text = text.substring(0, searchIndex) + replacement + text.substring(fullEnd);
    fs.writeFileSync("src/App.tsx", text, "utf8");
    console.log("Successfully replaced squad member section!");
  }
}

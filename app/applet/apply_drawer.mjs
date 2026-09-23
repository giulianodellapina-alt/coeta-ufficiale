import fs from "fs";

let text = fs.readFileSync("src/App.tsx", "utf8");

const insertPoint = `</MapContainer>`;

const tacticalDrawerCode = `</MapContainer>

                  {/* PANNELLO DI COMANDO TATTICO LATERALE (RADAR DRAWER) */}
                  {selectedTacticalGuard && (
                    <div className="absolute top-4 right-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] z-[1001] bg-slate-950/95 border-2 border-indigo-500/50 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 pointer-events-auto">
                      {/* HEADER PANNELLO */}
                      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-indigo-600 border border-indigo-400 flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0">
                            {selectedTacticalGuard.surname ? selectedTacticalGuard.surname.slice(0, 2).toUpperCase() : (selectedTacticalGuard.matricola?.slice(-2) || "G")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-black px-2 py-0.5 rounded border border-indigo-500/30 uppercase">
                                Matr. [{selectedTacticalGuard.matricola || "N/D"}]
                              </span>
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded uppercase border",
                                selectedTacticalGuard.isTracingAuthorized ? "bg-emerald-950 text-emerald-300 border-emerald-500/40" : "bg-red-950 text-red-300 border-red-500/40"
                              )}>
                                {selectedTacticalGuard.isTracingAuthorized ? "🟢 GPS ON" : "🔴 GPS OFF"}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight truncate mt-0.5">
                              {selectedTacticalGuard.surname} {selectedTacticalGuard.name}
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTacticalGuard(null)}
                          className="h-8 w-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          title="Chiudi pannello di comando"
                        >
                          ✕
                        </button>
                      </div>

                      {/* BODY PANNELLO */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                        {/* SEGNALATORE SOS SE ATTIVO */}
                        {activeEmergencies.some(em => em.guardId === selectedTacticalGuard.id && em.status === "active") && (
                          <div className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-3 text-center shadow-lg shadow-rose-950/50 animate-pulse">
                            <p className="text-xs text-rose-200 font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
                              🚨 SOS EMERGENZA ATTIVO SUL BERSAGLIO!
                            </p>
                          </div>
                        )}

                        {/* SE C È UN TARGET SELEZIONATO SULLA MAPPA (RADAR SEARCHED POINT) */}
                        {radarSearchedPoint && selectedTacticalGuard.lastLocation && (
                          <div className="bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/40 rounded-2xl p-3 space-y-2 shadow-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider flex items-center gap-1">
                                🎯 TARGET / BERSAGLIO INTERVENTO
                              </span>
                              <span className="text-[9px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                                ROTTA ATTIVA
                              </span>
                            </div>
                            <p className="text-xs text-white font-bold leading-tight line-clamp-2">
                              {radarSearchedPoint.address}
                            </p>
                            <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950/80 p-2 rounded-xl border border-white/5">
                              <span className="text-slate-300 font-bold">
                                📏 Distanza: {(() => {
                                  const R = 6371;
                                  const dLat = (radarSearchedPoint.lat - selectedTacticalGuard.lastLocation.lat) * Math.PI / 180;
                                  const dLon = (radarSearchedPoint.lng - selectedTacticalGuard.lastLocation.lng) * Math.PI / 180;
                                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                            Math.cos(selectedTacticalGuard.lastLocation.lat * Math.PI / 180) * Math.cos(radarSearchedPoint.lat * Math.PI / 180) *
                                            Math.sin(dLon/2) * Math.sin(dLon/2);
                                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                  return (R * c).toFixed(1) + " km";
                                })()}
                              </span>
                              <span className="text-amber-400 font-bold">
                                ⏱️ ETA: ~{(() => {
                                  const R = 6371;
                                  const dLat = (radarSearchedPoint.lat - selectedTacticalGuard.lastLocation.lat) * Math.PI / 180;
                                  const dLon = (radarSearchedPoint.lng - selectedTacticalGuard.lastLocation.lng) * Math.PI / 180;
                                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                            Math.cos(selectedTacticalGuard.lastLocation.lat * Math.PI / 180) * Math.cos(radarSearchedPoint.lat * Math.PI / 180) *
                                            Math.sin(dLon/2) * Math.sin(dLon/2);
                                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                  return Math.max(1, Math.round((R * c) / 40 * 60)) + " min";
                                })()}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuardForMission(selectedTacticalGuard as any);
                                setIsMissionDialogOpen(true);
                                setNewMission({
                                  address: radarSearchedPoint.address,
                                  description: "Intervento su target geolocalizzato",
                                  priority: "high"
                                });
                              }}
                              className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-blue-400"
                            >
                              🛡️ Invia Questo Target come Missione
                            </button>
                          </div>
                        )}

                        {/* TABELLA UNIFORME A 2 COLONNE: EMERGENZA A SX, SERVIZIO A DX */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* COLONNA 1: EMERGENZA */}
                          <div className="bg-rose-950/40 border-2 border-rose-500/40 p-2.5 rounded-2xl flex flex-col gap-2 text-center shadow-lg">
                            <p className="text-[10px] text-rose-300 font-black uppercase tracking-widest pb-0.5 m-0 border-b border-rose-500/20">
                              🚨 EMERGENZA
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const privateInfo = guardPrivateInfoMap[selectedTacticalGuard.id];
                                const phone = privateInfo?.cellulare || privateInfo?.phone || selectedTacticalGuard?.phone;
                                handleOpenWhatsAppAndLog(phone, "Centrale Operativa C.O.E.T.A.: Richiesta contatto su mappa radar.", selectedTacticalGuard.id);
                              }}
                              className="h-9 w-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-0 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center select-none"
                            >
                              <MessageCircle className="h-3.5 w-3.5 shrink-0" /> WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const privateInfo = guardPrivateInfoMap[selectedTacticalGuard.id];
                                const phone = privateInfo?.cellulare || privateInfo?.phone || selectedTacticalGuard?.phone;
                                handleMakeCallAndLog(phone, selectedTacticalGuard.id);
                              }}
                              className="h-9 w-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-0 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center select-none"
                            >
                              <Phone className="h-3.5 w-3.5 shrink-0" /> Chiama GSM
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetVideoGuard(selectedTacticalGuard as any);
                                setVideoDialogOpen(true);
                              }}
                              className="h-9 w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-0 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center select-none"
                            >
                              <Video className="h-3.5 w-3.5 shrink-0" /> Video Live
                            </button>
                          </div>

                          {/* COLONNA 2: SERVIZIO */}
                          <div className="bg-indigo-950/40 border-2 border-indigo-500/40 p-2.5 rounded-2xl flex flex-col gap-2 text-center shadow-lg">
                            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest pb-0.5 m-0 border-b border-indigo-500/20">
                              📋 SERVIZIO
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuardForMission(selectedTacticalGuard as any);
                                setIsMissionDialogOpen(true);
                                if (radarSearchedPoint) {
                                  setNewMission({
                                    address: radarSearchedPoint.address,
                                    description: "",
                                    priority: "medium"
                                  });
                                }
                              }}
                              className="h-9 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-0 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center select-none"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Missione
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedTacticalGuard.lastLocation) {
                                  window.open("https://www.google.com/maps?q=" + selectedTacticalGuard.lastLocation.lat + "," + selectedTacticalGuard.lastLocation.lng);
                                } else {
                                  alert("Posizione GPS dell'operatore non disponibile al momento.");
                                }
                              }}
                              className="h-9 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium uppercase tracking-wider rounded-xl border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center select-none"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" /> G. Maps
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleGpsForGuard(selectedTacticalGuard.id, selectedTacticalGuard.matricola, selectedTacticalGuard.surname + " " + selectedTacticalGuard.name)}
                              className={cn(
                                "h-9 w-full text-[10px] font-black uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center select-none border",
                                selectedTacticalGuard.isTracingAuthorized
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400"
                                  : "bg-red-950/80 hover:bg-red-900 text-red-200 border-red-500/30"
                              )}
                            >
                              {selectedTacticalGuard.isTracingAuthorized ? "🟢 GPS ON" : "🔴 GPS OFF"}
                            </button>
                          </div>
                        </div>

                        {/* TELEMETRIA & CENTRA MAPPA */}
                        <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>📡 Coordinate:</span>
                            <span className="text-slate-200">
                              {selectedTacticalGuard.lastLocation ? selectedTacticalGuard.lastLocation.lat.toFixed(5) + ", " + selectedTacticalGuard.lastLocation.lng.toFixed(5) : "In attesa segnale"}
                            </span>
                          </div>
                          {selectedTacticalGuard.lastLocation && (
                            <button
                              type="button"
                              onClick={() => setRadarMapCenter([selectedTacticalGuard.lastLocation.lat, selectedTacticalGuard.lastLocation.lng])}
                              className="w-full h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase rounded-xl border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              📍 Centra Visuale Mappa sulla Guardia
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}`;

if (text.includes(insertPoint) && !text.includes("PANNELLO DI COMANDO TATTICO LATERALE")) {
  text = text.replace(insertPoint, tacticalDrawerCode);
  fs.writeFileSync("src/App.tsx", text, "utf8");
  console.log("Successfully inserted Tactical Drawer into Radar Squadra!");
} else {
  console.log("Insert point not found or already existing");
}

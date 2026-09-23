const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = "{activeMainTab === 'calendar' ? (";
const endMarker = "{/* --- GLOBAL DIALOGS (Moved Outside for Stability) --- */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find markers", { startIndex, endIndex });
    process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

const replacement = `{activeMainTab === 'calendar' ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e293b] p-4 rounded-xl border border-slate-700">
                  <div className="flex flex-wrap items-center gap-3">
                    {SECTORS.map(s => (
                      <Button
                        key={s.id}
                        onClick={() => setActiveSector(s.id)}
                        className={cn(
                          "h-10 px-4 rounded-xl font-normal transition-all text-xs tracking-widest",
                          activeSector === s.id 
                            ? (s.id === 'ittica' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : 
                               s.id === 'venatoria' ? "bg-green-600 text-white shadow-lg shadow-green-900/40" : 
                               "bg-orange-600 text-white shadow-lg shadow-orange-900/40")
                            : "bg-[#0f172a] border border-slate-700 text-slate-400 hover:bg-slate-800"
                        )}
                      >
                        <s.icon className="h-4 w-4 mr-2" />
                        {s.label}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sei loggato come</span>
                      <span className="text-sm font-normal text-blue-400 uppercase">{session.name}</span>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={clearAllShifts} className="text-red-500 hover:bg-red-950/30 text-[10px] uppercase">
                        <Trash2 className="h-3 w-3 mr-2" /> Ripulisci Turni
                      </Button>
                    )}
                  </div>
                </div>

                {activeSector && (
                  <div className={cn(
                      "px-4 py-2 rounded-lg font-normal uppercase tracking-widest text-sm flex items-center gap-2 shadow-lg",
                      activeSector === 'ittica' ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" :
                      activeSector === 'venatoria' ? "bg-green-600/20 text-green-400 border border-green-500/30" :
                      "bg-orange-600/20 text-orange-400 border border-orange-500/30"
                    )}>
                      {SECTORS.find(s => s.id === activeSector)?.icon && (
                        <div className={cn(
                          "p-1 rounded-md",
                          activeSector === 'ittica' ? "bg-blue-600 text-white" :
                          activeSector === 'venatoria' ? "bg-green-600 text-white" :
                          "bg-orange-600 text-white"
                        )}>
                          {React.createElement(SECTORS.find(s => s.id === activeSector)!.icon, { className: "h-4 w-4" })}
                        </div>
                      )}
                      <span>Settore {SECTORS.find(s => s.id === activeSector)?.label}</span>
                    </div>
                  )}

                {activeSector && (
                  <motion.div 
                    key={activeSector}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 md:mt-6"
                  >
                    {(() => {
                      const s = SECTORS.find(sec => sec.id === activeSector)!;
                      return (
                        <Card className="border-slate-700 shadow-2xl overflow-hidden bg-[#1e293b] text-slate-200">
                          <div className={cn(
                            "h-2 w-full",
                            s.id === 'ittica' ? "bg-blue-600" :
                            s.id === 'venatoria' ? "bg-green-600" :
                            "bg-orange-600"
                          )} />
                          
                          <div className="p-4 flex items-center justify-between border-b border-slate-700 bg-[#1e293b]">
                            <div className="flex items-center gap-4">
                              <h2 className="text-lg md:text-xl font-normal capitalize text-white">
                                {format(viewDate, 'MMMM yyyy', { locale: it })}
                              </h2>
                              <div className="flex gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 bg-[#0f172a] text-slate-300 hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>
                                  <span className="sr-only">Mese precedente</span>
                                  <Plus className="h-4 w-4 rotate-45" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 bg-[#0f172a] text-slate-300 hover:bg-slate-800" onClick={() => setViewDate(new Date())}>
                                  <span className="text-[10px] font-normal">Oggi</span>
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 bg-[#0f172a] text-slate-300 hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>
                                  <span className="sr-only">Mese successivo</span>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              <span>Orario: {s.hours.start} - {s.hours.end}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 border-b border-r border-slate-700">
                            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                              <div key={day} className="p-2 text-center text-xs md:text-sm font-normal uppercase tracking-wider text-slate-400 bg-[#0f172a] border-l border-t border-slate-700">
                                {day}
                              </div>
                            ))}
                            
                            {calendarDays.map((day, idx) => {
                              const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
                              const dayShifts = getShiftsForDay(day, s.id);
                              const holiday = isHoliday(day);
                              const isToday = isSameDay(day, new Date());

                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => handleDayClick(day)}
                                  className={cn(
                                    "min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-l border-t border-slate-700 transition-colors cursor-pointer relative group",
                                    !isCurrentMonth ? "bg-[#0f172a]/40" : "bg-[#1e293b]",
                                    isSameDay(day, selectedDate || new Date()) ? "ring-2 ring-inset ring-blue-500 z-10" : "hover:bg-slate-800",
                                    isToday && "bg-blue-900/20"
                                  )}
                                >
                                  <div className="flex justify-between items-start">
                                    <span className={cn(
                                      "text-sm md:text-base font-normal h-8 w-8 flex items-center justify-center rounded-full transition-transform active:scale-90",
                                      isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : holiday ? "text-red-400 font-normal" : "text-slate-400",
                                      !isCurrentMonth && "opacity-20"
                                    )}>
                                      {format(day, 'd')}
                                    </span>
                                    {holiday && (
                                      <span className="hidden md:block text-[8px] text-red-500 font-bold uppercase truncate max-w-[60px]">
                                        {holiday.name}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 space-y-0.5 md:space-y-1">
                                    {dayShifts.map(sh => (
                                      <div 
                                        key={sh.id} 
                                        className={cn(
                                          "text-[9px] md:text-[10px] p-0.5 md:p-1 rounded border leading-tight truncate shadow-lg flex items-center justify-between",
                                          (sh as any).status === 'pending' ? "bg-slate-800/40 border-slate-700 border-dashed text-slate-500" :
                                          s.id === 'ittica' ? "bg-blue-600 border-blue-500 text-white" :
                                          s.id === 'venatoria' ? "bg-green-600 border-green-500 text-white" :
                                          "bg-orange-600 border-orange-500 text-white"
                                        )}
                                      >
                                        <div className="flex items-center gap-1 truncate">
                                          {(sh as any).status === 'pending' && <Clock className="h-2 w-2" />}
                                          <span className="font-normal">{sh.guardName.split(' ')[0]}</span>
                                        </div>
                                        <span className="hidden md:inline ml-1 opacity-90">{sh.startTime}</span>
                                      </div>
                                    ))}
                                    {dayShifts.length === 0 && isCurrentMonth && (
                                      <div className="hidden group-hover:flex items-center justify-center h-full opacity-10">
                                        <Plus className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      );
                    })()}
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 flex items-center gap-4 bg-[#1e293b] border-slate-700">
                    <div className="h-10 w-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 border border-blue-800/50">
                      <Fish className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-normal text-slate-500">Totale Ittica</p>
                      <p className="text-xl font-normal text-white">{shifts.filter(sh => sh.sector === 'ittica').length}</p>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-[#1e293b] border-slate-700">
                    <div className="h-10 w-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 border border-green-800/50">
                      <Bird className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-normal text-slate-500">Totale Venatoria</p>
                      <p className="text-xl font-normal text-white">{shifts.filter(sh => sh.sector === 'venatoria').length}</p>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4 bg-[#1e293b] border-slate-700">
                    <div className="h-10 w-10 rounded-full bg-orange-900/30 flex items-center justify-center text-orange-400 border border-orange-800/50">
                      <PawPrint className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-normal text-slate-500">Totale Zoofila</p>
                      <p className="text-xl font-normal text-white">{shifts.filter(sh => sh.sector === 'zoofila').length}</p>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <Modulistica 
                reports={reports}
                isNewReportDialogOpen={isNewReportDialogOpen}
                setIsNewReportDialogOpen={setIsNewReportDialogOpen}
                reportForm={reportForm}
                setReportForm={setReportForm}
                onSubmitReport={handleSubmitReport}
              />
            )}
            `;

fs.writeFileSync('src/App.tsx', before + replacement + after);
console.log("App.tsx fixed successfully!");

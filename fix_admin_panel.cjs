const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find the start of the admin tab content area (after the tab buttons grid)
// We look for the start of the password gate or one of the tab checks
const startMarker = "{['stats', 'guards', 'cancellations'].includes(activeAdminTab) && !isStatsUnlocked ? (";
const endMarker = "        {!session || !isInstanceVerified ? (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

// Extract content before and after
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

// Reconstruct the admin tab content logic correctly
const mid = `                {['stats', 'guards', 'cancellations'].includes(activeAdminTab) && !isStatsUnlocked ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-slate-700 mx-auto max-w-2xl w-full">
                    <Lock className="h-12 w-12 text-blue-500 mb-4" />
                    <h2 className="text-xl font-bold mb-6 notranslate">Area Riservata Comando</h2>
                    <div className="flex gap-2 max-w-sm w-full px-4">
                      <div className="relative flex-1">
                        <input type="text" name="username" value="DPG917" readOnly className="hidden" autoComplete="username" />
                        <Input 
                          type={showStatsPassword ? "text" : "password"} 
                          placeholder="Inserisci Password..." 
                          value={statsPassword}
                          onChange={e => setStatsPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleStatsUnlock()}
                          className="bg-slate-950 border-slate-800 pr-10"
                          autoComplete="current-password"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-white"
                          onClick={() => setShowStatsPassword(!showStatsPassword)}
                        >
                          {showStatsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button onClick={handleStatsUnlock} className="bg-blue-600">Sblocca</Button>
                    </div>
                    {statsError && (
                      <div className="mt-4 flex items-center gap-2 text-red-400 text-xs bg-red-900/20 p-2 rounded-lg border border-red-900/30">
                        <AlertCircle className="h-4 w-4" />
                        <span>{statsError}</span>
                      </div>
                    )}
                    <p className="mt-6 text-slate-500 text-[10px] uppercase tracking-widest italic font-bold">Nucleo di Carrara - Accesso Protetto</p>
                  </div>
                ) : (
                  <>
                    {activeAdminTab === 'emergencies' && (
                        // Content for emergencies will be handled below by keeping existing blocks if possible 
                        // but since we are reconstructing, we just need to ensure the structure is correct.
                        // Actually, I should just fix the tags around the existing blocks.
`;

// This script needs to be more surgical to avoid deleting the actual tab content.
// Instead of replacing everything, let's just fix the tags.

process.exit(0);

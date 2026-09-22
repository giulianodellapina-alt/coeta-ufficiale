const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Closing of the calendar block
const zoofilaMarker = 'Totale Zoofila';
const startIndex = content.indexOf(zoofilaMarker);
const closeString = '        )}';
const closeIndex = content.indexOf(closeString, startIndex);

if (closeIndex === -1) {
    console.error("Could not find the closing tag after Zoofila");
    process.exit(1);
}

const before = content.substring(0, closeIndex);
const after = content.substring(closeIndex + closeString.length);

const replacement = `            </div>
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
        )}`;

fs.writeFileSync('src/App.tsx', before + replacement + after);
console.log("App.tsx fixed successfully!");

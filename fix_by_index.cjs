const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
lines.splice(2322, 0, '          </div>', '        )}');
fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log("App.tsx fixed by index!");

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigiendo Dashboard.tsx...\n');

const dashboardPath = path.join('src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

// 1. Corregir selectedDate - cambiar inicialización de string a Date
content = content.replace(
  /const \[selectedDate, setSelectedDate\] = useState<string>\(new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);/,
  `const [selectedDate, setSelectedDate] = useState<Date>(new Date());`
);

// 2. Reemplazar 'cumpleaños' por 'birthdays'
content = content.replace(/cumpleaños/g, 'birthdays');

// 3. Corregir loadCalendarNotes - selectedDate ya es Date
content = content.replace(
  /const start = new Date\(selectedDate\.getFullYear\(\), selectedDate\.getMonth\(\), 1\)\.toISOString\(\)\.split\('T'\)\[0\];/,
  `const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0];`
);

// 4. Corregir setSelectedDate en el calendario
content = content.replace(
  /setSelectedDate\(new Date\(currentYear, currentMonth, day\)\)/g,
  `setSelectedDate(new Date(currentYear, currentMonth, day))`
);

// 5. Corregir selectedDate.toISOString() - ya es Date
content = content.replace(
  /selectedDate\.toISOString\(\)\.split\('T'\)\[0\]/g,
  `selectedDate.toISOString().split('T')[0]`
);

fs.writeFileSync(dashboardPath, content, 'utf8');
console.log('✅ Dashboard.tsx corregido');
console.log('\n📋 Próximos pasos:');
console.log('1. Revisá VS Code si desaparecieron los errores');
console.log('2. git add .');
console.log('3. git commit -m "Fix TypeScript errors"');
console.log('4. git push');
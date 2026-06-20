const fs = require('fs');
const path = require('path');

console.log('🔧 Arreglando Dashboard.tsx...\n');

const dashboardPath = path.join('src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

// Arreglar la línea del useEffect de alerts
// Reemplazar la llamada problemática a daysUntil con new Date()
content = content.replace(
  /payments\.filter\(p\s*=>\s*daysUntil\(new Date\(new Date\(\)\.getFullYear\(\),\s*new Date\(\)\.getMonth\(\),\s*p\.payment_day\)\)\s*<=\s*2\)/g,
  `payments.filter(p => {
    const today = new Date();
    const paymentDate = new Date(today.getFullYear(), today.getMonth(), p.payment_day);
    const diff = Math.ceil((paymentDate.getTime() - today.getTime()) / 86400000);
    return diff >= 0 && diff <= 2;
  })`
);

fs.writeFileSync(dashboardPath, content, 'utf8');
console.log('✅ Dashboard.tsx corregido');

// Verificar utils.ts
const utilsPath = path.join('src', 'lib', 'utils.ts');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

if (utilsContent.includes('export function daysUntil(date: any)')) {
  console.log('✅ utils.ts está correcto');
} else {
  console.log('⚠️ utils.ts podría necesitar revisión');
}

console.log('\n📋 Próximos pasos:');
console.log('1. git add .');
console.log('2. git commit -m "Fix Dashboard errors"');
console.log('3. git push');
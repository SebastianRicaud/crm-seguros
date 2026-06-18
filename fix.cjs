const fs = require('fs');

console.log('🔧 Corrigiendo error de sintaxis...\n');

const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Corregir la línea con el error
content = content.replace(
  /\.not\('payment_day', 'is', null'\)\.order\('payment_day'\)/g,
  `.not('payment_day', 'is', null).order('payment_day')`
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Error corregido en Dashboard.tsx');
console.log('\n📋 Reiniciá el servidor: Ctrl+C → npm run dev');
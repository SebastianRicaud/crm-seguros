const fs = require('fs');
const path = require('path');

console.log('🔧 Arreglando errores de build...\n');

// 1. Crear src/vite-env.d.ts (tipos de Vite)
const viteEnvPath = path.join('src', 'vite-env.d.ts');
fs.writeFileSync(viteEnvPath, `/// <reference types="vite/client" />\n`, 'utf8');
console.log('✅ Creado src/vite-env.d.ts');

// 2. Actualizar tsconfig.json para incluir vite/client
const tsconfigPath = 'tsconfig.json';
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

if (!tsconfig.compilerOptions.types) {
  tsconfig.compilerOptions.types = [];
}
if (!tsconfig.compilerOptions.types.includes('vite/client')) {
  tsconfig.compilerOptions.types.push('vite/client');
}
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8');
console.log('✅ Actualizado tsconfig.json con vite/client');

// 3. Corregir utils.ts (función parseLocalDate)
const utilsPath = path.join('src', 'lib', 'utils.ts');
let utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Reemplazar la función parseLocalDate problemática
const oldFunction = `export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Si viene como "YYYY-MM-DD", parsear manualmente para evitar shift de zona horaria
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const match = str.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (match) {
    const [_, y, m, d] = match;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(dateStr);
}`;

const newFunction = `export function parseLocalDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr);
  const match = str.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (match) {
    const [_, y, m, d] = match;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}`;

utilsContent = utilsContent.replace(oldFunction, newFunction);
fs.writeFileSync(utilsPath, utilsContent, 'utf8');
console.log('✅ Corregido src/lib/utils.ts');

console.log('\n📋 Próximos pasos:');
console.log('1. git add .');
console.log('2. git commit -m "Fix build errors"');
console.log('3. git push');
console.log('4. Vercel redeployará automáticamente');
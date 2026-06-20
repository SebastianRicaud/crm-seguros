const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigiendo tsconfig.json...\n');

const tsconfigPath = path.join('tsconfig.json');
const config = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

// Eliminar baseUrl de compilerOptions
if (config.compilerOptions.baseUrl) {
  delete config.compilerOptions.baseUrl;
  console.log('✅ Eliminado baseUrl');
}

// Asegurar que paths esté configurado correctamente si existe
if (config.compilerOptions.paths) {
  // Mantener paths pero sin baseUrl
  console.log('✅ Paths mantenidos');
}

// Guardar configuración actualizada
fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, 2), 'utf8');

console.log('\n📋 tsconfig.json actualizado');
console.log('📋 Próximos pasos:');
console.log('1. Revisá VS Code si desapareció el error');
console.log('2. git add .');
console.log('3. git commit -m "Fix tsconfig deprecation"');
console.log('4. git push');
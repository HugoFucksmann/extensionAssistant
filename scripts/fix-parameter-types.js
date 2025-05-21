const fs = require('fs');
const path = require('path');

// Archivos a procesar
const filesToFix = [
  'srcV4/modules/tools/filesystem/listFiles.ts',
  'srcV4/modules/tools/filesystem/readFile.ts',
  'srcV4/modules/tools/filesystem/writeToFile.ts',
  'srcV4/modules/tools/project/searchWorkspace.ts'
];

// Tipos válidos según la definición de ParameterDefinition
const validTypes = ['"string"', '"number"', '"boolean"', '"object"', '"array"', '"any"'];

// Función para corregir un archivo
function fixFile(filePath) {
  console.log(`Procesando: ${filePath}`);
  
  // Leer el contenido del archivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Buscar y reemplazar los tipos de parámetros
  // Patrón: type: 'string' -> type: "string" as "string"
  const typePattern = /type:\s*['"](\w+)['"]/g;
  content = content.replace(typePattern, (match, type) => {
    return `type: "${type}" as "${type}"`;
  });
  
  // Guardar el archivo modificado
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Archivo corregido: ${filePath}`);
}

// Procesar cada archivo
filesToFix.forEach(relativeFilePath => {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (fs.existsSync(filePath)) {
    fixFile(filePath);
  } else {
    console.warn(`  Archivo no encontrado: ${filePath}`);
  }
});

console.log('Proceso de corrección de tipos completado.');

const fs = require('fs');
const path = require('path');

// Función para asegurar que un directorio existe
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    // Crear el directorio y cualquier directorio padre que no exista
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directorio creado: ${dirPath}`);
  }
}

// Función para copiar un archivo
function copyFile(source, target) {
  try {
    // Leer el archivo de origen
    const data = fs.readFileSync(source);
    // Escribir el archivo de destino
    fs.writeFileSync(target, data);
    console.log(`Archivo copiado: ${source} -> ${target}`);
  } catch (error) {
    console.error(`Error al copiar el archivo ${source}:`, error);
    process.exit(1);
  }
}

// Ruta del directorio de destino
const wasmDir = path.join(__dirname, '..', 'out', 'wasm');

// Asegurar que el directorio de destino existe
ensureDirectoryExists(wasmDir);

// Rutas de los archivos WASM de origen
const treeSitterWasmSource = path.join(__dirname, '..', 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
const typescriptWasmSource = path.join(__dirname, '..', 'node_modules', 'tree-sitter-typescript', 'tree-sitter-typescript.wasm');

// Rutas de los archivos WASM de destino
const treeSitterWasmTarget = path.join(wasmDir, 'tree-sitter.wasm');
const typescriptWasmTarget = path.join(wasmDir, 'tree-sitter-typescript.wasm');

// Copiar los archivos WASM
copyFile(treeSitterWasmSource, treeSitterWasmTarget);
copyFile(typescriptWasmSource, typescriptWasmTarget);

console.log('Archivos WASM copiados correctamente.');

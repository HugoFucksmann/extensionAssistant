const fs = require('fs');
const path = require('path');

// Mapeo de importaciones viejas a nuevas
const importMappings = [
  {
    oldPath: "from ['\"](?:\.\./)*tools/toolRegistry['\"]",
    newPath: "from '../../modules/tools'"
  },
  {
    oldPath: "from ['\"](?:\.\./)*tools/toolRegistryAdapter['\"]",
    newPath: "from '../../modules/tools'"
  }
];

// Directorios a procesar
const directoriesToProcess = [
  'srcV4/agents',
  'srcV4/core/adapters',
  'srcV4/core/controller',
  'srcV4/core/factory',
  'srcV4/langgraph'
];

// Procesar cada directorio
directoriesToProcess.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`Procesando directorio: ${dir}`);
    
    // Leer archivos .ts en el directorio
    const files = fs.readdirSync(fullPath)
      .filter(file => file.endsWith('.ts'))
      .map(file => path.join(fullPath, file));
    
    // Procesar cada archivo
    files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      let updated = false;
      
      // Aplicar cada mapeo
      importMappings.forEach(({ oldPath, newPath }) => {
        const regex = new RegExp(oldPath, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newPath);
          updated = true;
          console.log(`  Actualizado: ${path.basename(file)}`);
        }
      });
      
      // Guardar cambios si hubo actualizaciones
      if (updated) {
        fs.writeFileSync(file, content, 'utf8');
      }
    });
  } else {
    console.warn(`Directorio no encontrado: ${dir}`);
  }
});

console.log('Proceso de actualización de importaciones completado.');

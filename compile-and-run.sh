#!/bin/bash

# Limpiar el directorio de salida
rm -rf out
mkdir -p out

# Compilar la extensión con webpack
echo "Compilando la extensión con webpack..."
npm run webpack

# Verificar si la compilación fue exitosa
if [ $? -eq 0 ]; then
  echo "Compilación exitosa. Abriendo VS Code..."
  
  # Abrir VS Code con la extensión
  code --extensionDevelopmentPath=$(pwd)
else
  echo "Error durante la compilación. Por favor revisa los errores."
fi

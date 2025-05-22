const path = require("path");

// Configuración base común
const baseConfig = {
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      '@vscode': path.resolve(__dirname, 'src/vscode'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      // Alias más específicos si los necesitas:
      '@ai': path.resolve(__dirname, 'src/features/ai'),
      '@memory': path.resolve(__dirname, 'src/features/memory'),
      '@tools': path.resolve(__dirname, 'src/features/tools'),
      '@events': path.resolve(__dirname, 'src/features/events'),
    }
  },
  // Añadir caché para mejorar el rendimiento de compilación
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
    // Aumentar el tiempo de caché para reducir recompilaciones innecesarias
    maxAge: 5184000000, // 60 días en milisegundos
  },
  // Optimizar la compilación
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
  },
  // Añadir estadísticas para ver el progreso de la compilación
  stats: {
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },
};

// Configuración para la extensión (backend)
const extensionConfig = {
  ...baseConfig,
  target: "node",
  entry: {
    extension: "./src/extension.ts",
  },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode",
    child_process: "commonjs child_process",
    path: "commonjs path",
    fs: "commonjs fs",
    sqlite3: "commonjs sqlite3",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true, // Acelera la compilación omitiendo la verificación de tipos
              experimentalWatchApi: true, // Mejora el rendimiento en modo watch
            },
          },
        ],
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },
};

// Configuración para el webview (frontend)
const webviewConfig = {
  ...baseConfig,
  target: "web",
  entry: {
    webview: "./src/ui/react/webview.jsx",
  },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "webview.js",
    // Configurar publicPath para que los chunks se carguen correctamente
    publicPath: "",
    // Evitar chunks separados para solucionar el problema de carga en VS Code
    chunkFilename: "[name].js"
  },
  // Desactivar la división de código para evitar problemas de carga en VS Code
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true, // Acelera la compilación omitiendo la verificación de tipos
              experimentalWatchApi: true, // Mejora el rendimiento en modo watch
            },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-react"],
              cacheDirectory: true, // Habilitar caché para babel
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
};

// Exportar ambas configuraciones como un array
module.exports = [extensionConfig, webviewConfig];
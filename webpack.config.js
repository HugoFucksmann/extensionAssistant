const path = require("path");

// Configuración base común
const baseConfig = {
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    // Añadir alias para reducir la longitud de las importaciones
   /*  alias: {
      '@agents': path.resolve(__dirname, 'src/agents'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@vscode': path.resolve(__dirname, 'src/vscode_integration'),
      '@commands': path.resolve(__dirname, 'src/commands'),
      '@db': path.resolve(__dirname, 'src/db'),
    } */
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
    extension: "./srcV3/extension.ts",
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
    webview: "./srcV3/ui/react/webview.jsx",
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
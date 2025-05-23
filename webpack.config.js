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
      '@ai': path.resolve(__dirname, 'src/features/ai'),
      '@memory': path.resolve(__dirname, 'src/features/memory'),
      '@tools': path.resolve(__dirname, 'src/features/tools'),
      '@events': path.resolve(__dirname, 'src/features/events'),
      // Asegurarse de que React y ReactDOM se resuelvan correctamente
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
    maxAge: 5184000000,
  },
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
  },
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
              transpileOnly: true,
              experimentalWatchApi: true,
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
    webview: "./src/vscode/react/webview.jsx",
  },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "webview.js",
    publicPath: "",
    chunkFilename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                ["@babel/preset-react", { "runtime": "automatic" }],
                "@babel/preset-typescript"
              ],
              plugins: []
            }
          }
        ]
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                ["@babel/preset-react", { "runtime": "automatic" }]
              ]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      }
    ]
  },
  // Asegurarse de que las dependencias de React no se incluyan en el bundle
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  // Configuración de optimización para el webview
  optimization: {
    ...baseConfig.optimization,
    // Deshabilitar la división de código para evitar problemas de carga
    splitChunks: false,
    runtimeChunk: false,
  },
};

module.exports = [extensionConfig, webviewConfig];
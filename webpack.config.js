const path = require("path");

const baseConfig = {
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      // Alias para módulos de la aplicación
      '@shared/types': path.resolve(__dirname, 'src/shared/types.ts'),
      '@components': path.resolve(__dirname, 'src/vscode/react/Components'),
      '@context': path.resolve(__dirname, 'src/vscode/react/context'),
      // Alias para compatibilidad con rutas antiguas (mantener si es necesario para imports existentes)
      '@vscode/react/context/AppContext': path.resolve(__dirname, 'src/vscode/react/context/AppContext.tsx')
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


const extensionConfig = {
  ...baseConfig,
  target: "node",
  entry: {
    extension: "./src/extension.ts",
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'out'),
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  externals: {
    vscode: "commonjs vscode",
    child_process: "commonjs child_process",
    path: "commonjs path",
    fs: "commonjs fs",
    sqlite3: "commonjs sqlite3",
    // react y react-dom eliminados de aquí
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
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


const webviewConfig = {
  ...baseConfig,
  entry: {
    webview: './src/vscode/react/webview.jsx',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'out', 'webView'),
  },
  externals: {
   
  },
  module: {
    rules: [
     
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
    
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-react',
              '@babel/preset-env',
              '@babel/preset-typescript'
            ]
          }
        }
      },
    ],
  },
};

module.exports = [extensionConfig, webviewConfig];
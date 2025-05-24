const path = require("path");

// Configuración base común
const baseConfig = {
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      '../../context/VSCodeContext': path.resolve(__dirname, 'src/vscode/react/context/AppContext.tsx'),
      '../../../context/VSCodeContext': path.resolve(__dirname, 'src/vscode/react/context/AppContext.tsx'),
      '../context/VSCodeContext': path.resolve(__dirname, 'src/vscode/react/context/AppContext.tsx'),
      '@shared/types': path.resolve(__dirname, 'src/shared/types.ts')
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
    react: "commonjs react",
    "react-dom": "commonjs react-dom",
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
  entry: {
    webview: './src/vscode/webView/webview.tsx',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'out', 'webView'),
  },
  externals: {
    // React será incluido en el bundle para el webview
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      },
    ],
  },
};

module.exports = [extensionConfig, webviewConfig];
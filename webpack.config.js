const path = require("path");

// Configuración base común
const baseConfig = {
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
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
    webview: "./src/ui/webview.jsx",
  },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "webview.js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
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
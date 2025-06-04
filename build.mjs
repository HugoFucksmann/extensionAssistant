// build.mjs
import { build, context } from 'esbuild';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// CSS plugin to inline styles
const cssPlugin = {
  name: 'css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await readFileSync(args.path, 'utf8');
      return {
        contents: `
          const style = document.createElement('style');
          style.textContent = ${JSON.stringify(css)};
          document.head.appendChild(style);
        `,
        loader: 'js',
      };
    });
  },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Read tsconfig paths for aliases
const tsconfig = JSON.parse(readFileSync(resolve(__dirname, 'tsconfig.json'), 'utf8'));
const tsconfigPaths = tsconfig.compilerOptions.paths || {};

// Convert tsconfig paths to esbuild aliases
const alias = {};
Object.entries(tsconfigPaths).forEach(([key, value]) => {
  const cleanKey = key.replace('/*', '');
  const cleanValue = value[0].replace('/*', '');
  alias[cleanKey] = resolve(__dirname, cleanValue);
});

// Agregar alias explícito para UI
alias['@vscode/ui'] = resolve(__dirname, 'src/vscode/UI');
alias['@vscode/react'] = resolve(__dirname, 'src/vscode/UI');

// Common esbuild configuration
const baseConfig = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  target: 'node18',
  logLevel: 'info',
  alias,
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'jsx',
    '.jsx': 'jsx',
  },
};

// Extension configuration
const extensionConfig = {
  ...baseConfig,
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.js',
  external: ['vscode', 'sqlite3', 'fs', 'path', 'child_process'],
  format: 'cjs',
};

// Webview configuration
const webviewConfig = {
  ...baseConfig,
  entryPoints: ['src/vscode/UI/webview.jsx'],
  outfile: 'out/webView/webview.js',
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  external: [],
  plugins: [cssPlugin],
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'jsx',
    '.jsx': 'jsx',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
  },
};

async function buildAll() {
  try {
    console.log('Building extension...');
    await build(extensionConfig);
    
    console.log('Building webview...');
    await build(webviewConfig);
    
    console.log('✓ Build completed successfully');
  } catch (error) {
    console.error('✗ Build failed:', error);
    process.exit(1);
  }
}

async function watchAll() {
  try {
    console.log('Starting watch mode...');
    
    const extensionContext = await context(extensionConfig);
    const webviewContext = await context(webviewConfig);
    
    await extensionContext.watch();
    await webviewContext.watch();
    
    console.log('✓ Watching for changes...');
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('\nStopping watchers...');
      await extensionContext.dispose();
      await webviewContext.dispose();
      process.exit(0);
    });
  } catch (error) {
    console.error('✗ Watch setup failed:', error);
    process.exit(1);
  }
}

if (watch) {
  watchAll();
} else {
  buildAll();
}
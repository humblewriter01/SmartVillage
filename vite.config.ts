import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';

// Include all generated chunks (including lazy and legacy chunks) in the web
// offline shell. The revision changes with the shell, worker, or recordings.
function offlineAssetManifest(): Plugin {
  const assetNames = new Set<string>();
  let dir = resolve('dist');
  return {
    name: 'smartvillage-offline-assets',
    apply: 'build',
    writeBundle(output, bundle) {
      dir = resolve(output.dir || 'dist');
      for (const name of Object.keys(bundle)) {
        if (name.startsWith('assets/')) assetNames.add(name);
      }
    },
    async closeBundle() {
      if (!assetNames.size) return;
      const assets = [...assetNames].sort();
      const workerPath = resolve(dir, 'service-worker.js');
      const worker = await readFile(workerPath, 'utf8');
      const revision = createHash('sha256')
        .update(await readFile(resolve(dir, 'index.html')))
        .update(worker)
        .update(JSON.stringify(assets));
      for (const file of ['manifest.json', 'favicon.ico', 'logo192.png', 'logo512.png', 'app-icon.png']) {
        revision.update(await readFile(resolve(dir, file)));
      }
      for (const file of (await readdir(resolve(dir, 'sounds'))).filter(name => name.endsWith('.mp3')).sort()) {
        revision.update(await readFile(resolve(dir, 'sounds', file)));
      }
      await writeFile(resolve(dir, 'precache-assets.json'), JSON.stringify(assets));
      await writeFile(workerPath, worker.replace('__BUILD_VERSION__', revision.digest('hex').slice(0, 12)));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ['defaults', 'not IE 11', 'chrome >= 52', 'android >= 5'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
    offlineAssetManifest(),
  ],
  build: {
    target: 'es2015',
    cssTarget: 'chrome61',
  },
  resolve: {
    alias: {
      '@capacitor/voice-recorder': 'capacitor-voice-recorder',
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

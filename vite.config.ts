import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Link previews read og:title and og:description (X falls back to them), so
// they are copied from the <title> and description in index.html. A tag the
// page sets itself is kept.
function shareTags(): Plugin {
  return {
    name: 'share-tags',
    transformIndexHtml(html: string) {
      const values: Record<string, string | undefined> = {
        'og:title': /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1],
        'og:description': /<meta\s+name=["']description["']\s+content=(["'])([\s\S]*?)\1/i.exec(html)?.[2],
      };
      let tags = '';
      for (const [property, value] of Object.entries(values)) {
        if (!value?.trim() || new RegExp(`["']${property}["']`).test(html)) continue;
        tags += `    <meta property="${property}" content="${value.trim().replace(/"/g, '&quot;')}" />\n`;
      }
      return tags ? html.replace(/[ \t]*<\/head>/i, `${tags}  </head>`) : html;
    },
  };
}

// Node's process, declared so this file type-checks without @types/node.
declare const process: { argv: string[] };

export default defineConfig({
  plugins: [react(), tailwindcss(), shareTags()],
  resolve: {
    // `@/lib/utils` is `src/lib/utils` (tsconfig.json carries the same path).
    alias: { '@': '/src' },
    // Keep one React instance when dependencies add peers.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Bundled at start, so the first page that imports them does not make Vite
    // bundle again and reload, which briefly ran two Reacts ("dispatcher.useContext").
    include: [
      'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime',
      'lucide-react', 'motion/react', 'radix-ui', 'clsx', 'tailwind-merge',
      'class-variance-authority', 'embla-carousel-react', 'sonner',
    ],
  },
  build: {
    // Reporting compressed sizes slows builds without changing their output.
    reportCompressedSize: false,
  },
  server: {
    // Accept any Host header. Needed when a proxy sits in front of the dev
    // server; on your own machine you can delete this line, or replace it with
    // the hostnames you actually use: allowedHosts: ['dev.example.com'].
    allowedHosts: true,
    // Refuse to move only when a port was asked for on the command line.
    // `pnpm dev` with no --port lets Vite take the next free port, which is
    // what you want on a machine where something else may hold 5173.
    strictPort: process.argv.some((a) => a === '--port' || a.startsWith('--port=')),
    // Update these paths if the entry files change.
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx'],
    },
    watch: {
      ignored: ['**/.*/**'],
    },
  },
});

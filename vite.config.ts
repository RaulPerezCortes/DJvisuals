import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function inlineBuildAssets(): Plugin {
  return {
    name: 'inline-build-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const htmlAsset = bundle['index.html'];

      if (!htmlAsset || htmlAsset.type !== 'asset' || typeof htmlAsset.source !== 'string') {
        return;
      }

      let html = htmlAsset.source;

      html = html.replace(
        /<script type="module" crossorigin src="\.\/(.+?\.js)"><\/script>/g,
        (_tag, fileName: string) => {
          const chunk = bundle[fileName];

          if (!chunk || chunk.type !== 'chunk') {
            return _tag;
          }

          delete bundle[fileName];
          delete bundle[`${fileName}.map`];

          const code = chunk.code.replace(/\n?\/\/# sourceMappingURL=.+\.map\s*$/u, '');

          return `<script type="module">\n${code}\n</script>`;
        },
      );

      html = html.replace(
        /<link rel="stylesheet" crossorigin href="\.\/(.+?\.css)">/g,
        (_tag, fileName: string) => {
          const asset = bundle[fileName];

          if (!asset || asset.type !== 'asset' || typeof asset.source !== 'string') {
            return _tag;
          }

          delete bundle[fileName];

          return `<style>\n${asset.source}\n</style>`;
        },
      );

      htmlAsset.source = html;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), inlineBuildAssets()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
  },
});

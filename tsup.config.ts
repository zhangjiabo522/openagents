import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  external: ['react', 'ink', 'ink-text-input', 'ink-spinner'],
});

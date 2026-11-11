/// <reference types="vitest/config" />
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  css: {
    // Prevent loading unrelated PostCSS configurations from parent directories.
    postcss: { plugins: [] },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  test: {
    // Los tests leen migraciones, imágenes y pantallas con import.meta.glob; la
    // caché de módulos de Vitest guardaba la lista de archivos y no veía los nuevos.
    fsModuleCache: false,
  },
})

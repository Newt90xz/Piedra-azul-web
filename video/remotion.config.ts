import { Config } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind-v4'

// Tailwind se activa solo para leer el @theme de la app (frontend/src/index.css):
// los gráficos usan esos colores y fuentes, sin copiar valores.
Config.overrideWebpackConfig(enableTailwind)
Config.setVideoImageFormat('jpeg')
// Dos procesos y una caché de video acotada: con más, el decodificador se quedó sin
// memoria a mitad del render en un equipo de 16 GB.
Config.setConcurrency(2)
Config.setOffthreadVideoCacheSizeInBytes(1024 * 1024 * 1024)

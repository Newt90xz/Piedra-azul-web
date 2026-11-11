# Video de recorrido de Leer para Todos

Produce el video que muestra la app por dentro: capturas de la interfaz real con Playwright,
edición en Remotion. El guion y las decisiones están en [PLAN.md](PLAN.md) (ojo: todavía habla
de tablets; hoy la app es solo para computador).

En git están los scripts y el montaje. **No están** las capturas, los audios ni los renders
(pesan mucho y se regeneran): quien clone el repo tiene que producirlos de nuevo con los pasos
de abajo, o pedirle la carpeta `video/` completa a quien ya los tiene.

## Qué hay

| Carpeta | Qué es |
|---|---|
| `scripts/capturas/` | Una toma por archivo (`cNN-*.mjs`). `lib.mjs` graba pantalla y anota lo que suena; `juego.mjs` hace jugar a los niños |
| `scripts/datos/` | Arma y desarma el curso de prueba «Kínder A» en Supabase |
| `scripts/voz/` | Voz en off (ElevenLabs) y pregeneración de la voz de la app (Pocket-TTS) |
| `scripts/preparar.mjs` | Convierte las capturas y arma el audio de la app para la edición |
| `src/linea.ts` | La línea de tiempo: cada plano, con cortes dados por marcas de las tomas |
| `src/Recorrido.tsx`, `src/graficos.tsx` | El montaje y los gráficos (rótulos, tarjetas, subtítulos) |
| `src/guion.json` | Texto de la voz en off, por partes |

## Qué se necesita

- `pnpm install` en la raíz del repo.
- Variables de entorno (nunca en archivos): `ELEVENLABS_API_KEY`, y `VIDEO_DOCENTE_EMAIL` /
  `VIDEO_DOCENTE_CLAVE` con la cuenta de la educadora de prueba.
- Pocket-TTS para la voz de la app: `uv venv .venv-voz --python 3.12` y
  `uv pip install --python .venv-voz/Scripts/python.exe pocket-tts`.

## Cómo se produce (desde `video/`)

1. **Servidores**, cada uno en su terminal:
   - `.venv-voz/Scripts/pocket-tts.exe serve --language spanish --port 8000`
   - backend con `VOZ_CACHE` apuntando a `video/.cache-voz`: `pnpm dev:backend`
   - frontend con `VITE_VOZ_EN_VIVO=si`: `pnpm dev:frontend`
2. **Datos:** `node --env-file=../frontend/.env scripts/datos/montar.mjs`. Crea el curso con sus
   seis niños e historial y, mientras se graba, desactiva los demás perfiles, retira las
   plantillas y renombra la cuenta a «Educadora» (deja respaldo en `.respaldo/`).
3. **Voz de la app al instante:** `node scripts/voz/calentar-app.mjs`.
4. **Tomas, en este orden** (cada una deja el estado de la siguiente):
   `node scripts/capturas/correr.mjs c02 c03 c05 c08 c12 c13 c16 c17 c20`
5. **Devolver la base:** `node --env-file=../frontend/.env scripts/datos/restaurar.mjs --ocultar-video`.
   No saltarse este paso: sin él los perfiles del equipo quedan ocultos.
6. **Voz en off:** `node scripts/voz/generar.mjs` (solo genera las partes que falten).
7. **Edición:** `node scripts/preparar.mjs`, luego `node scripts/linea.mjs` (muestra la línea de
   tiempo y escribe `subtitulos.srt`; con `corto` hace lo mismo para la versión corta).
8. **Render:** `pnpm render:borrador` para revisar; el final con
   `npx remotion render src/index.ts Recorrido final_4min.mp4` y
   `npx remotion render src/index.ts Corto corto_90s.mp4`.

Para repetir tomas: `scripts/datos/reiniciar.mjs --todo` y `montar.mjs` dejan todo desde cero;
`volver-a-sala.mjs` y `preparar-recreo.mjs` reponen el estado de c08 y c13.

## Para cambiar algo sin regrabar

- Texto o ritmo de la narración: `src/guion.json` y `node scripts/voz/generar.mjs <parte> --forzar`.
- Orden, duración o encuadre de un plano, tarjetas y notas: `src/linea.ts`.
- Aspecto de los gráficos: `src/graficos.tsx` (colores y fuentes salen de `frontend/src/index.css`).
- Música: dejar `video/musica.mp3` y correr `node scripts/preparar.mjs --solo-datos`.

## Limitaciones conocidas

- Playwright no graba sonido: el audio de la app se rearma con el registro de cada toma y los
  audios que guardó el servidor de voz.
- La grabación ignora el zoom del navegador: la educadora se graba a 1920×1080 con la fuente al 125 %.
- El render a 1080p tarda cerca de una hora y necesita poco paralelismo (ver `remotion.config.ts`).

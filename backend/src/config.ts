// Las claves de Supabase con privilegios (service_role) viven solo aqui,
// nunca en el frontend.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  // Servidor de Pocket-TTS (`pocket-tts serve`): la voz en tiempo real.
  pocketTtsUrl: (process.env.POCKET_TTS_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
  // Comando que levanta ese servidor junto con el backend (opcional): así `pnpm dev`
  // deja la voz lista sin abrir otra terminal. Vacío = se levanta aparte.
  pocketTtsComando: process.env.POCKET_TTS_COMANDO ?? '',
  // Frases ya generadas: se reutilizan sin volver a pedirlas al modelo.
  vozCache: process.env.VOZ_CACHE ?? '.cache-voz',
}

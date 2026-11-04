// Las claves de Supabase con privilegios (service_role) viven solo aqui,
// nunca en el frontend.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  // Servidor de Pocket-TTS (`pocket-tts serve`): la voz en tiempo real.
  // 127.0.0.1 y no «localhost»: Node puede probar primero ::1 (IPv6), donde
  // Pocket-TTS no escucha, y el fetch falla con «TypeError: fetch failed».
  pocketTtsUrl: (process.env.POCKET_TTS_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '').replace('//localhost', '//127.0.0.1'),
  // Comando que levanta ese servidor junto con el backend: así `pnpm dev` deja la
  // voz lista sin abrir otra terminal. «no» = se levanta aparte.
  pocketTtsComando: process.env.POCKET_TTS_COMANDO ?? 'pocket-tts serve --language spanish --host 127.0.0.1 --port 8000',
  // Frases ya generadas: se reutilizan sin volver a pedirlas al modelo.
  vozCache: process.env.VOZ_CACHE ?? '.cache-voz',
}

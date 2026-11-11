// Sesión de la educadora de prueba, con la misma clave pública que usa la app (RLS aplica).
// Correo y contraseña llegan por variables de entorno; no se escriben en archivos.
import { createClient } from '@supabase/supabase-js'

export async function sesionDocente() {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: clave, VIDEO_DOCENTE_EMAIL: email, VIDEO_DOCENTE_CLAVE: password } = process.env
  if (!url || !clave) throw new Error('Corre con --env-file=../frontend/.env')
  if (!email || !password) throw new Error('Faltan VIDEO_DOCENTE_EMAIL y VIDEO_DOCENTE_CLAVE.')
  const s = createClient(url, clave, { auth: { persistSession: false } })
  const { error } = await s.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`)
  return s
}

export const ok = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

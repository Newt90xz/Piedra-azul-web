// Las claves de Supabase con privilegios (service_role) viven solo aqui,
// nunca en el frontend.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
}

import { repositorioDemo } from './repositorioDemo.ts'
import { repositorioSupabase } from './repositorioSupabase.ts'
import type { Repositorio } from './repositorio.ts'

// Punto único para cambiar entre la demo y la implementación conectada.
// VITE_DEMO=si (en frontend/.env.local) prueba las pantallas sin tocar la base.
export const repo: Repositorio = import.meta.env.VITE_DEMO === 'si' ? repositorioDemo : repositorioSupabase

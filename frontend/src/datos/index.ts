import { repositorioSupabase } from './repositorioSupabase.ts'
import type { Repositorio } from './repositorio.ts'

// Punto único para cambiar entre la demo (`repositorioDemo`) y la implementación conectada.
export const repo: Repositorio = repositorioSupabase

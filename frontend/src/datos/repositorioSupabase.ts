import { createClient } from '@supabase/supabase-js'
import type {
  Ajustes,
  Curso,
  Docente,
  Estudiante,
  IntentoRonda,
  Nivel,
  Observacion,
  RegistroEmocion,
  ResultadoActividad,
} from '../dominio/tipos.ts'
import type { Database } from './baseDatos.ts'
import { AJUSTES_POR_DEFECTO, type Repositorio } from './repositorio.ts'

// Implementación conectada: Supabase Auth (RF-03) + PostgreSQL con RLS.
// Todo corre con la sesión de la docente; las políticas limitan cada consulta
// a sus cursos (RNF-10). Solo se usa la clave pública (anon).

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
if (!url || !clavePublica) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en frontend/.env (ver .env.example).')
}

const supabase = createClient<Database>(url, clavePublica)

type FilaEstudiante = Database['public']['Tables']['estudiantes']['Row']

// Sin error, PostgREST siempre trae `data` (salvo `maybeSingle`, que se trata aparte).
function sinError<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message)
  return data as NonNullable<T>
}

const aEstudiante = (f: FilaEstudiante): Estudiante => ({
  id: f.id,
  cursoId: f.curso_id,
  nombre: f.nombre,
  avatar: f.avatar,
  color: f.color,
  fotoUrl: f.foto_url ?? undefined,
  activo: f.activo,
  nivelHabilitado: f.nivel_habilitado as Nivel,
  monedas: f.monedas,
  ajustes: { ...AJUSTES_POR_DEFECTO, ...(f.ajustes as Partial<Ajustes>) },
})

// `monedas` no se envía: solo la suma el trigger al guardar un resultado (RF-25).
const aFila = (e: Omit<Estudiante, 'id' | 'monedas'>) => ({
  curso_id: e.cursoId,
  nombre: e.nombre.trim(),
  avatar: e.avatar,
  color: e.color,
  foto_url: e.fotoUrl ?? null,
  activo: e.activo,
  nivel_habilitado: e.nivelHabilitado,
  ajustes: { ...e.ajustes },
})

const aCurso = (f: { id: string; nombre: string; docente_id: string }): Curso => ({ id: f.id, nombre: f.nombre, docenteId: f.docente_id })

async function cargarDocente(id: string): Promise<Docente> {
  const f = sinError(await supabase.from('docentes').select('id, nombre, email').eq('id', id).single())
  return { id: f.id, nombre: f.nombre, email: f.email }
}

// `docenteActual()` es síncrono: la sesión guardada se resuelve una vez al
// cargar el módulo y luego se mantiene en memoria.
let actual: Docente | null = null
{
  const { data } = await supabase.auth.getSession()
  if (data.session) actual = await cargarDocente(data.session.user.id).catch(() => null)
}
supabase.auth.onAuthStateChange((evento) => {
  if (evento === 'SIGNED_OUT') actual = null
})

export const repositorioSupabase: Repositorio = {
  async iniciarSesion(email, clave) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error) throw new Error(error.status === 400 ? 'Correo o contraseña incorrectos.' : error.message)
    actual = await cargarDocente(data.user.id)
    return actual
  },
  async cerrarSesion() {
    await supabase.auth.signOut()
    actual = null
  },
  docenteActual() {
    return actual
  },
  alCambiarSesion(cb) {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') cb(null)
    })
    return () => data.subscription.unsubscribe()
  },

  async listarCursos() {
    const filas = sinError(await supabase.from('cursos').select('id, nombre, docente_id').order('nombre'))
    return filas.map(aCurso)
  },
  async crearCurso(nombre) {
    // docente_id lo pone la base (auth.uid()).
    return aCurso(sinError(await supabase.from('cursos').insert({ nombre: nombre.trim() }).select('id, nombre, docente_id').single()))
  },
  async listarEstudiantes(cursoId) {
    const filas = sinError(await supabase.from('estudiantes').select().eq('curso_id', cursoId).order('nombre'))
    return filas.map(aEstudiante)
  },
  async obtenerEstudiante(id) {
    const { data, error } = await supabase.from('estudiantes').select().eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? aEstudiante(data) : null
  },
  async guardarEstudiante(datos) {
    const consulta =
      'id' in datos
        ? supabase.from('estudiantes').update(aFila(datos)).eq('id', datos.id)
        : supabase.from('estudiantes').insert(aFila(datos))
    return aEstudiante(sinError(await consulta.select().single()))
  },

  async registrarEmocion(estudianteId, emocion) {
    sinError(await supabase.from('registros_emocion').insert({ estudiante_id: estudianteId, emocion }))
  },
  async listarEmociones(estudianteId) {
    const filas = sinError(
      await supabase.from('registros_emocion').select().eq('estudiante_id', estudianteId).order('fecha', { ascending: false }),
    )
    return filas.map(
      (f): RegistroEmocion => ({ id: f.id, estudianteId: f.estudiante_id, emocion: f.emocion, fecha: f.fecha }),
    )
  },

  async guardarResultado(r) {
    // Con el mismo id, la función hace `on conflict do nothing`.
    sinError(
      await supabase.rpc('guardar_resultado', {
        p_id: r.id,
        p_estudiante_id: r.estudianteId,
        p_actividad_id: r.actividadId,
        p_fecha: r.fecha,
        p_duracion_ms: Math.round(r.duracionMs),
        p_estrellas: r.estrellas,
        p_monedas: r.monedas,
        p_rondas: r.rondas.map(({ item, intentos, acertada }) => ({ item, intentos, acertada })),
      }),
    )
  },
  async listarResultados({ estudianteId, cursoId }) {
    let consulta = supabase
      .from('resultados_actividad')
      .select('*, rondas_resultado(orden, item, intentos, acertada), estudiantes!inner(curso_id)')
      .order('fecha', { ascending: false })
      .order('orden', { referencedTable: 'rondas_resultado' })
    if (estudianteId) consulta = consulta.eq('estudiante_id', estudianteId)
    if (cursoId) consulta = consulta.eq('estudiantes.curso_id', cursoId)
    const filas = sinError(await consulta)
    return filas.map(
      (f): ResultadoActividad => ({
        id: f.id,
        estudianteId: f.estudiante_id,
        actividadId: f.actividad_id,
        fecha: f.fecha,
        duracionMs: f.duracion_ms,
        rondas: f.rondas_resultado.map(
          ({ item, intentos, acertada }): IntentoRonda => ({ item, intentos, acertada }),
        ),
        estrellas: f.estrellas,
        monedas: f.monedas,
      }),
    )
  },

  async agregarObservacion(estudianteId, texto) {
    sinError(await supabase.from('observaciones').insert({ estudiante_id: estudianteId, texto }))
  },
  async listarObservaciones(estudianteId) {
    const filas = sinError(
      await supabase.from('observaciones').select().eq('estudiante_id', estudianteId).order('fecha', { ascending: false }),
    )
    return filas.map(
      (f): Observacion => ({ id: f.id, estudianteId: f.estudiante_id, texto: f.texto, fecha: f.fecha }),
    )
  },
}

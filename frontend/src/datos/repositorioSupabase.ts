import { createClient } from '@supabase/supabase-js'
import type {
  Ajustes,
  Conectado,
  Curso,
  Docente,
  EstadoAlumno,
  Estudiante,
  IntentoRonda,
  MensajeSala,
  MiembroSala,
  Nivel,
  Observacion,
  PerfilAlumno,
  ProgresoSala,
  RegistroEmocion,
  ResultadoActividad,
  Sala,
  TipoSala,
} from '../dominio/tipos.ts'
import type { Database } from './baseDatos.ts'
import { guardarCredencial, leerCredencial, olvidarCredencial } from './dispositivo.ts'
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

// Igual al max-rows por defecto de Supabase (API > Settings).
const POR_PAGINA = 1000

// Sin error, PostgREST siempre trae `data` (salvo `maybeSingle`, que se trata aparte).
// El código SQL se conserva para distinguir un rechazo del servidor de un fallo de red.
function sinError<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
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
  avatarTienda: f.avatar_tienda ?? undefined,
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

type FilaSala = Database['public']['Tables']['salas']['Row']
const aSala = (f: FilaSala): Sala => ({
  id: f.id,
  cursoId: f.curso_id,
  nombre: f.nombre,
  tipo: f.tipo as TipoSala,
  contenidos: f.contenidos,
  juegos: f.juegos,
  asignacion: f.asignacion,
})

type FilaAlumno = Database['public']['Functions']['alumno_actual']['Returns'][number]

// Dispositivo del alumno: ajustes y datos llegan por la función del alumno (sin foto).
const aEstudianteDelDispositivo = (f: FilaAlumno): Estudiante => aEstudiante({ ...f, foto_url: null, creado_en: '' })

const aEstadoAlumno = (f: FilaAlumno): EstadoAlumno => ({
  estudiante: aEstudianteDelDispositivo(f),
  sala: f.sala_id
    ? {
        id: f.sala_id,
        nombre: f.sala_nombre ?? '',
        tipo: (f.sala_tipo ?? 'trabajo') as TipoSala,
        contenidos: f.contenidos ?? [],
        juegos: f.juegos ?? [],
        asignacion: f.asignacion ?? '',
      }
    : null,
  progreso: { paso: f.paso, repeticiones: f.repeticiones },
  avataresComprados: f.comprados,
})

type FilaMensaje = Database['public']['Functions']['mensajes_playground']['Returns'][number]
const aMensaje = (f: FilaMensaje): MensajeSala => ({
  id: f.id,
  estudianteId: f.estudiante_id,
  nombre: f.nombre,
  avatar: f.avatar,
  avatarTienda: f.avatar_tienda ?? undefined,
  color: f.color,
  picto: f.picto,
  enviadoEn: f.enviado_en,
})

const aCurso = (f: { id: string; nombre: string; docente_id: string }): Curso => ({ id: f.id, nombre: f.nombre, docenteId: f.docente_id })

// Token del dispositivo para ese alumno. Si la credencial es de otro niño (p. ej.
// un resultado pendiente de quien usó antes la tableta), falla igual que el servidor.
function tokenDe(estudianteId: string) {
  const c = leerCredencial()
  if (c?.estudianteId !== estudianteId) throw new Error('sin_sala')
  return c.token
}

// Credencial del alumno de este dispositivo; sin ella no hay nada que pedir.
function credencial() {
  const c = leerCredencial()
  if (!c) throw new Error('sin_sesion')
  return { p_estudiante: c.estudianteId, p_token: c.token }
}


async function cargarDocente(id: string): Promise<Docente> {
  const f = sinError(await supabase.from('docentes').select('id, nombre, email').eq('id', id).single())
  return { id: f.id, nombre: f.nombre, email: f.email }
}

// `docenteActual()` es síncrono: la sesión guardada se resuelve una vez al
// cargar el módulo, en segundo plano (sin red no debe dejar la app en blanco),
// y luego se mantiene en memoria. Lo que depende de `actual` espera a `sesionLista`.
let actual: Docente | null = null
const sesionLista: Promise<void> = supabase.auth.getSession().then(
  async ({ data }) => {
    if (!data.session) return
    const docente = await cargarDocente(data.session.user.id).catch(() => null)
    // Si entretanto inició sesión a mano, manda esa.
    actual ??= docente
  },
  () => {},
)
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
  esperarSesion() {
    return sesionLista
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
    await sesionLista
    // Sin sesión de docente solo se ve al alumno conectado desde este dispositivo.
    if (!actual) {
      const c = leerCredencial()
      if (c?.estudianteId !== id) return null
      const filas = sinError(await supabase.rpc('alumno_actual', { p_estudiante: id, p_token: c.token }))
      return filas[0] ? aEstudianteDelDispositivo(filas[0]) : null
    }
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

  async eliminarEstudiante(id) {
    sinError(await supabase.from('estudiantes').delete().eq('id', id))
  },

  async registrarEmocion(estudianteId, emocion) {
    await sesionLista
    if (!actual) {
      sinError(
        await supabase.rpc('registrar_emocion_sala', { p_estudiante: estudianteId, p_token: tokenDe(estudianteId), p_emocion: emocion }),
      )
      return
    }
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
  async ultimasEmociones(cursoId) {
    const filas = sinError(
      await supabase
        .from('ultimas_emociones')
        .select('estudiante_id, emocion, fecha, estudiantes!inner(curso_id)')
        .eq('estudiantes.curso_id', cursoId),
    )
    // Las columnas de una vista se generan como anulables; estas nunca lo son.
    return filas.map((f) => ({ estudianteId: f.estudiante_id!, emocion: f.emocion!, fecha: f.fecha! }))
  },

  async guardarResultado(r) {
    await sesionLista
    // Con el mismo id, la función hace `on conflict do nothing`.
    const datos = {
      p_id: r.id,
      p_estudiante_id: r.estudianteId,
      p_actividad_id: r.actividadId,
      p_fecha: r.fecha,
      p_duracion_ms: Math.round(r.duracionMs),
      p_estrellas: r.estrellas,
      p_monedas: r.monedas,
      p_rondas: r.rondas.map(({ item, intentos, acertada }) => ({ item, intentos, acertada })),
    }
    sinError(
      actual
        ? await supabase.rpc('guardar_resultado', datos)
        : await supabase.rpc('guardar_resultado_sala', { ...datos, p_token: tokenDe(r.estudianteId) }),
    )
  },
  async listarResultados({ estudianteId, cursoId, desde }) {
    // PostgREST corta cada respuesta en POR_PAGINA filas (max-rows del
    // proyecto): sin paginar, el historial quedaría truncado en silencio.
    const resultados: ResultadoActividad[] = []
    for (let pagina = 0; ; pagina++) {
      let consulta = supabase
        .from('resultados_actividad')
        .select('*, rondas_resultado(orden, item, intentos, acertada), estudiantes!inner(curso_id)')
        .order('fecha', { ascending: false })
        .order('id')
        .order('orden', { referencedTable: 'rondas_resultado' })
        .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)
      if (estudianteId) consulta = consulta.eq('estudiante_id', estudianteId)
      if (cursoId) consulta = consulta.eq('estudiantes.curso_id', cursoId)
      if (desde) consulta = consulta.gte('fecha', desde.toISOString())
      const filas = sinError(await consulta)
      resultados.push(
        ...filas.map(
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
        ),
      )
      if (filas.length < POR_PAGINA) return resultados
    }
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
  async actualizarObservacion(id, texto) {
    sinError(await supabase.from('observaciones').update({ texto }).eq('id', id))
  },
  async eliminarObservacion(id) {
    sinError(await supabase.from('observaciones').delete().eq('id', id))
  },

  async listarSalas(cursoId) {
    const filas = sinError(await supabase.from('salas').select().eq('curso_id', cursoId).order('creado_en'))
    return filas.map(aSala)
  },
  async crearSala(cursoId, nombre, tipo) {
    return aSala(sinError(await supabase.from('salas').insert({ curso_id: cursoId, nombre: nombre.trim(), tipo }).select().single()))
  },
  async renombrarSala(id, nombre) {
    sinError(await supabase.from('salas').update({ nombre: nombre.trim() }).eq('id', id))
  },
  async asignarPlan(salaId, contenidos, juegos) {
    sinError(await supabase.from('salas').update({ contenidos, juegos, asignacion: crypto.randomUUID() }).eq('id', salaId))
  },
  async eliminarSala(id) {
    sinError(await supabase.from('salas').delete().eq('id', id))
  },
  async listarMiembros(cursoId) {
    const filas = sinError(
      await supabase.from('sala_miembros').select('estudiante_id, sala_id, salas!inner(curso_id)').eq('salas.curso_id', cursoId),
    )
    return filas.map((f): MiembroSala => ({ estudianteId: f.estudiante_id, salaId: f.sala_id }))
  },
  async conectarEstudiante(salaId, estudianteId) {
    // Un alumno está en una sola sala: conectarlo a otra lo mueve.
    sinError(await supabase.from('sala_miembros').upsert({ estudiante_id: estudianteId, sala_id: salaId, unido_en: new Date().toISOString() }))
  },
  async desconectarEstudiante(estudianteId) {
    sinError(await supabase.from('sala_miembros').delete().eq('estudiante_id', estudianteId))
  },
  async vaciarSala(salaId) {
    sinError(await supabase.from('sala_miembros').delete().eq('sala_id', salaId))
  },
  async listarConectados(cursoId) {
    const filas = sinError(
      await supabase
        .from('sesiones_alumno')
        .select('estudiante_id, iniciada_en, visto_en, estudiantes!inner(curso_id)')
        .eq('estudiantes.curso_id', cursoId),
    )
    return filas.map((f): Conectado => ({ estudianteId: f.estudiante_id, desde: f.iniciada_en, vistoEn: f.visto_en }))
  },
  async cerrarDispositivo(estudianteId) {
    sinError(await supabase.from('sesiones_alumno').delete().eq('estudiante_id', estudianteId))
  },
  async listarProgreso(cursoId) {
    const filas = sinError(
      await supabase
        .from('progreso_sala')
        .select('estudiante_id, sala_id, asignacion, paso, repeticiones, necesita_ayuda, actualizado, salas!inner(curso_id)')
        .eq('salas.curso_id', cursoId),
    )
    return filas.map(
      (f): ProgresoSala => ({
        estudianteId: f.estudiante_id,
        salaId: f.sala_id,
        asignacion: f.asignacion,
        paso: f.paso,
        repeticiones: f.repeticiones,
        necesitaAyuda: f.necesita_ayuda,
        actualizado: f.actualizado,
      }),
    )
  },
  async marcarApoyado(estudianteId) {
    sinError(await supabase.from('progreso_sala').update({ necesita_ayuda: false }).eq('estudiante_id', estudianteId))
  },
  async mensajesSala(salaId) {
    const filas = sinError(
      await supabase
        .from('mensajes_sala')
        .select('id, estudiante_id, picto, enviado_en, estudiantes!inner(nombre, avatar, avatar_tienda, color)')
        .eq('sala_id', salaId)
        .order('id', { ascending: false })
        .limit(40),
    )
    return filas.map((f) => aMensaje({ ...f, ...f.estudiantes }))
  },

  async perfilesAlumnos() {
    const filas = sinError(await supabase.rpc('perfiles_alumnos'))
    return filas.map(
      (f): PerfilAlumno => ({
        id: f.id,
        nombre: f.nombre,
        avatar: f.avatar,
        avatarTienda: f.avatar_tienda ?? undefined,
        color: f.color,
        ocupado: f.ocupado,
      }),
    )
  },
  async entrarComoAlumno(estudianteId) {
    const token = sinError(await supabase.rpc('entrar_alumno', { p_estudiante: estudianteId }))
    guardarCredencial({ estudianteId, token })
  },
  alumnoDelDispositivo() {
    return leerCredencial()?.estudianteId ?? null
  },
  async salirComoAlumno() {
    const c = leerCredencial()
    olvidarCredencial()
    if (c) sinError(await supabase.rpc('salir_alumno', { p_estudiante: c.estudianteId, p_token: c.token }))
  },
  olvidarAlumno() {
    olvidarCredencial()
  },
  async estadoAlumno() {
    const c = leerCredencial()
    if (!c) return null
    const filas = sinError(await supabase.rpc('alumno_actual', { p_estudiante: c.estudianteId, p_token: c.token }))
    return filas[0] ? aEstadoAlumno(filas[0]) : null
  },
  async registrarProgreso(asignacion, paso, aprobado, resultadoId) {
    const filas = sinError(
      await supabase.rpc('registrar_progreso', {
        ...credencial(),
        p_asignacion: asignacion,
        p_paso: paso,
        p_aprobado: aprobado,
        p_resultado: resultadoId,
      }),
    )
    return { paso: filas[0].paso, repeticiones: filas[0].repeticiones }
  },
  async comprarAvatar(avatarId) {
    sinError(await supabase.rpc('comprar_avatar', { ...credencial(), p_avatar: avatarId }))
  },
  async usarAvatar(avatarId) {
    sinError(await supabase.rpc('usar_avatar', { ...credencial(), p_avatar: avatarId }))
  },
  async mensajesPlayground() {
    const filas = sinError(await supabase.rpc('mensajes_playground', credencial()))
    return filas.map(aMensaje)
  },
  async enviarMensaje(picto) {
    sinError(await supabase.rpc('enviar_mensaje', { ...credencial(), p_picto: picto }))
  },
}

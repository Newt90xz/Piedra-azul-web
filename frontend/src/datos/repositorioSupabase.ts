import { createClient } from '@supabase/supabase-js'
import type { BancoRemoto } from '../contenido/banco.ts'
import { contenidosDePlan, pasosDeContenidos } from '../contenido/contenidos.ts'
import type {
  ActividadRecreo,
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
  PasoSala,
  PerfilAlumno,
  Personaje,
  PosicionParque,
  ProgresoSala,
  RegistroEmocion,
  ResultadoActividad,
  Sala,
  TipoSala,
} from '../dominio/tipos.ts'
import { capitalizar } from '../lib/texto.ts'
import type { Database, Json } from './baseDatos.ts'
import { guardarCredencial, leerCredencial as leerCredencialGuardada, olvidarCredencial } from './dispositivo.ts'
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

// Las columnas nuevas de cada ronda llegan con las migraciones. Si la base todavía
// no las tiene, los reportes se piden con las que haya en vez de fallar.
const COLUMNAS_RESULTADO = [
  '*, rondas_resultado(orden, item, intentos, acertada, error, categoria, tiempo_ms, revelada), estudiantes!inner(curso_id)',
  '*, rondas_resultado(orden, item, intentos, acertada, error), estudiantes!inner(curso_id)',
  '*, rondas_resultado(orden, item, intentos, acertada), estudiantes!inner(curso_id)',
] as const
let columnasResultado = 0
// Sin la migración de métricas, los resultados se guardan sin su foto de la partida.
let conContexto = true

// El modo demo guarda ids como «est-1» en este mismo navegador: esa credencial no
// vale aquí, y mandarla a la base solo da un error tras otro.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function leerCredencial() {
  const c = leerCredencialGuardada()
  if (c && (!UUID.test(c.estudianteId) || !UUID.test(c.token))) {
    olvidarCredencial()
    return null
  }
  return c
}

// Sin error, PostgREST siempre trae `data` (salvo `maybeSingle`, que se trata aparte).
// El código SQL se conserva para distinguir un rechazo del servidor de un fallo de red.
function sinError<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data as NonNullable<T>
}

// El plan de la sala. Sin la migración, o en una sala antigua, sale de sus contenidos.
const aPlan = (plan: Json | null | undefined, contenidos: string[] | null): PasoSala[] =>
  Array.isArray(plan) && plan.length > 0 ? (plan as unknown as PasoSala[]) : pasosDeContenidos(contenidos ?? [])

// Lo valida la base (guardar_personaje); null: aún no tiene uno guardado.
const aPersonaje = (j: Json | null | undefined) => (j ? (j as unknown as Personaje) : undefined)

// Los nombres (de niños y salas) se muestran siempre con mayúscula inicial,
// también los que se guardaron antes en minúscula.
const aEstudiante = (f: FilaEstudiante): Estudiante => ({
  id: f.id,
  cursoId: f.curso_id,
  nombre: capitalizar(f.nombre),
  avatar: f.avatar,
  color: f.color,
  fotoUrl: f.foto_url ?? undefined,
  activo: f.activo,
  nivelHabilitado: f.nivel_habilitado as Nivel,
  monedas: f.monedas,
  personaje: aPersonaje(f.personaje),
  // Ya no se elige foto o pictograma: siempre el pictograma primero (la foto queda de respaldo).
  ajustes: { ...AJUSTES_POR_DEFECTO, ...(f.ajustes as Partial<Ajustes>), modoImagen: 'picto' },
})

// `monedas` no se envía: solo la suma el trigger al guardar un resultado (RF-25).
const aFila = (e: Omit<Estudiante, 'id' | 'monedas'>) => ({
  curso_id: e.cursoId,
  nombre: capitalizar(e.nombre.trim()),
  avatar: e.avatar,
  color: e.color,
  foto_url: e.fotoUrl ?? null,
  activo: e.activo,
  nivel_habilitado: e.nivelHabilitado,
  personaje: (e.personaje ?? null) as unknown as Json,
  ajustes: { ...e.ajustes },
})

type FilaSala = Database['public']['Tables']['salas']['Row']
const aSala = (f: FilaSala): Sala => ({
  id: f.id,
  cursoId: f.curso_id,
  nombre: capitalizar(f.nombre),
  tipo: f.tipo as TipoSala,
  actividad: f.actividad as ActividadRecreo,
  siguienteSala: f.siguiente_sala ?? undefined,
  plan: aPlan(f.plan, f.contenidos),
  contenidos: f.contenidos,
  juegos: f.juegos,
  asignacion: f.asignacion,
})

type FilaAlumno = Database['public']['Functions']['alumno_actual']['Returns'][number]

// Dispositivo del alumno: ajustes y datos llegan por la función del alumno (sin foto).
const aEstudianteDelDispositivo = (f: FilaAlumno): Estudiante => aEstudiante({ ...f, foto_url: null, creado_en: '' } as FilaEstudiante)

const aEstadoAlumno = (f: FilaAlumno): EstadoAlumno => ({
  estudiante: aEstudianteDelDispositivo(f),
  sala: f.sala_id
    ? {
        id: f.sala_id,
        nombre: capitalizar(f.sala_nombre ?? ''),
        tipo: (f.sala_tipo ?? 'trabajo') as TipoSala,
        actividad: (f.sala_actividad ?? 'parque') as ActividadRecreo,
        siguienteSala: f.siguiente_sala ?? undefined,
        siguienteTipo: (f.siguiente_tipo ?? undefined) as TipoSala | undefined,
        plan: aPlan(f.plan, f.contenidos),
        contenidos: f.contenidos ?? [],
        juegos: f.juegos ?? [],
        asignacion: f.asignacion ?? '',
      }
    : null,
  progreso: { paso: f.paso, repeticiones: f.repeticiones },
  articulosComprados: f.comprados,
})

const aMensaje = (f: { id: number; estudiante_id: string; nombre: string; personaje: Json | null; color: string; picto: string; enviado_en: string }): MensajeSala => ({
  id: f.id,
  estudianteId: f.estudiante_id,
  nombre: capitalizar(f.nombre),
  personaje: aPersonaje(f.personaje),
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
  async eliminarCurso(id) {
    sinError(await supabase.from('estudiantes').delete().eq('curso_id', id))
    sinError(await supabase.from('cursos').delete().eq('id', id))
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
      // Una base sin migrar lee solo los campos que conoce de cada ronda.
      p_rondas: r.rondas.map(({ item, intentos, acertada, error, categoria, tiempoMs, revelada, detalle }) => ({
        item,
        intentos,
        acertada,
        error: error?.slice(0, 20),
        categoria,
        tiempo_ms: tiempoMs === undefined ? undefined : Math.round(tiempoMs),
        revelada,
        detalle,
      })) as unknown as Json,
    }
    const guardar = (contexto: { p_contexto?: Json }) =>
      actual ? supabase.rpc('guardar_resultado', { ...datos, ...contexto }) : supabase.rpc('guardar_resultado_sala', { ...datos, ...contexto, p_token: tokenDe(r.estudianteId) })
    const respuesta = await guardar(conContexto && r.contexto ? { p_contexto: r.contexto as unknown as Json } : {})
    // PGRST202: la función aún no acepta p_contexto.
    if (respuesta.error?.code === 'PGRST202' && conContexto) {
      conContexto = false
      sinError(await guardar({}))
      return
    }
    sinError(respuesta)
  },
  async listarResultados({ estudianteId, cursoId, desde }) {
    // PostgREST corta cada respuesta en POR_PAGINA filas (max-rows del
    // proyecto): sin paginar, el historial quedaría truncado en silencio.
    const resultados: ResultadoActividad[] = []
    for (let pagina = 0; ; pagina++) {
      let consulta = supabase
        .from('resultados_actividad')
        .select(COLUMNAS_RESULTADO[columnasResultado] as (typeof COLUMNAS_RESULTADO)[0])
        .order('fecha', { ascending: false })
        .order('id')
        .order('orden', { referencedTable: 'rondas_resultado' })
        .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)
      if (estudianteId) consulta = consulta.eq('estudiante_id', estudianteId)
      if (cursoId) consulta = consulta.eq('estudiantes.curso_id', cursoId)
      if (desde) consulta = consulta.gte('fecha', desde.toISOString())
      const respuesta = await consulta
      // 42703: columna inexistente. La base aún no tiene esa migración: se repite
      // la página sin esas columnas y se recuerda para las siguientes.
      if (columnasResultado < COLUMNAS_RESULTADO.length - 1 && respuesta.error?.code === '42703') {
        columnasResultado++
        pagina--
        continue
      }
      const filas = sinError(respuesta)
      resultados.push(
        ...filas.map(
          (f): ResultadoActividad => ({
            id: f.id,
            estudianteId: f.estudiante_id,
            actividadId: f.actividad_id,
            fecha: f.fecha,
            duracionMs: f.duracion_ms,
            rondas: f.rondas_resultado.map(
              ({ item, intentos, acertada, error, categoria, tiempo_ms, revelada }): IntentoRonda => ({
                item,
                intentos,
                acertada,
                error: error ?? undefined,
                categoria: (categoria ?? undefined) as IntentoRonda['categoria'],
                tiempoMs: tiempo_ms ?? undefined,
                revelada: revelada ?? undefined,
              }),
            ),
            estrellas: f.estrellas,
            monedas: f.monedas,
            contexto: f.practica === undefined ? undefined : { practica: f.practica, contenidoId: f.contenido_id ?? undefined, nivel: (f.nivel ?? undefined) as Nivel | undefined },
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
    return aSala(sinError(await supabase.from('salas').insert({ curso_id: cursoId, nombre: capitalizar(nombre.trim()), tipo }).select().single()))
  },
  async renombrarSala(id, nombre) {
    sinError(await supabase.from('salas').update({ nombre: capitalizar(nombre.trim()) }).eq('id', id))
  },
  async asignarPlan(salaId, plan) {
    const datos = { contenidos: contenidosDePlan(plan), asignacion: crypto.randomUUID() }
    const { error } = await supabase.from('salas').update({ ...datos, plan: plan as unknown as Json }).eq('id', salaId)
    if (!error) return
    if (error.code !== 'PGRST204') throw new Error(error.message)
    // La base aún no tiene `plan`: los contenidos se guardan como antes, y lo configurable debe esperar.
    if (pasosDeContenidos(datos.contenidos).length !== plan.length) {
      throw new Error('Para usar actividades configurables falta aplicar la migración 20261103180000 en la base.')
    }
    sinError(await supabase.from('salas').update(datos).eq('id', salaId))
  },
  async configurarRecreo(salaId, actividad, juegos) {
    sinError(await supabase.from('salas').update({ actividad, juegos }).eq('id', salaId))
  },
  async conectarSalas(salaId, destino) {
    sinError(await supabase.from('salas').update({ siguiente_sala: destino }).eq('id', salaId))
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
        .select('id, estudiante_id, picto, enviado_en, estudiantes!inner(nombre, personaje, color)')
        .eq('sala_id', salaId)
        .order('id', { ascending: false })
        .limit(40),
    )
    return filas.map((f) => aMensaje({ ...f, ...f.estudiantes }))
  },

  async cargarBanco(): Promise<BancoRemoto | null> {
    const [palabras, letras] = await Promise.all([supabase.from('palabras').select(), supabase.from('letras').select()])
    if (palabras.error || letras.error || palabras.data.length === 0) return null
    return {
      palabras: palabras.data.map((f) => ({ id: f.id, texto: f.texto, silabas: f.silabas, emoji: f.emoji, fotoUrl: f.foto_url ?? undefined, pictoUrl: f.picto_url ?? undefined })),
      letras: letras.data.map((f) => ({ id: f.id, fonema: f.fonema, apoyoArticulatorio: f.apoyo_articulatorio })),
    }
  },

  async perfilesAlumnos() {
    const filas = sinError(await supabase.rpc('perfiles_alumnos'))
    return filas.map(
      (f): PerfilAlumno => ({
        id: f.id,
        nombre: capitalizar(f.nombre),
        personaje: aPersonaje(f.personaje),
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
  async pasarSalaConectada() {
    sinError(await supabase.rpc('pasar_sala_conectada', credencial()))
  },
  async comprarArticulo(articuloId) {
    sinError(await supabase.rpc('comprar_articulo', { ...credencial(), p_articulo: articuloId }))
  },
  async guardarPersonaje(personaje) {
    sinError(await supabase.rpc('guardar_personaje', { ...credencial(), p_personaje: personaje as unknown as Json }))
  },
  async enviarMensaje(picto) {
    sinError(await supabase.rpc('enviar_mensaje', { ...credencial(), p_picto: picto }))
  },
  async datosParque() {
    const filas = sinError(await supabase.rpc('parque_alumno', credencial()))
    return {
      canal: filas[0]?.canal ?? null,
      miembros: filas.map((f) => ({ ficha: f.ficha, mia: f.mia, nombre: capitalizar(f.nombre), color: f.color, personaje: aPersonaje(f.personaje) })),
    }
  },
  // Presence entrega a cada niño quiénes están y a dónde van, también a quien
  // llega tarde; nada pasa por la base (RNF-09). El nombre del canal es secreto y
  // lo entrega parque_alumno: los niños no tienen sesión para un canal privado.
  conectarParque(canal, ficha, inicio, avisos) {
    let posicion = inicio
    const sala = supabase.channel(`parque:${canal}`, { config: { presence: { key: ficha } } })
    sala
      .on('presence', { event: 'sync' }, () => {
        const estado = sala.presenceState<{ x: number; y: number }>()
        avisos.alMoverse(
          Object.entries(estado).flatMap(([f, [p]]): PosicionParque[] => (p ? [{ ficha: f, x: p.x, y: p.y }] : [])),
        )
      })
      .on('broadcast', { event: 'picto' }, ({ payload }: { payload: { ficha: string; picto: string } }) => avisos.alDecir(payload.ficha, payload.picto))
      // También al reconectar: el canal olvida la posición de quien se cayó.
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') void sala.track(posicion)
      })
    return {
      mover(x, y) {
        posicion = { x, y }
        void sala.track(posicion)
      },
      decir(picto) {
        void sala.send({ type: 'broadcast', event: 'picto', payload: { ficha, picto } })
      },
      cerrar() {
        void supabase.removeChannel(sala)
      },
    }
  },
}

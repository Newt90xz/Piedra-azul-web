import { planDeSala } from '../contenido/contenidos.ts'
import type { ActividadRecreo, Conectado, Emocion, Estudiante, MiembroSala, ProgresoSala, ResultadoActividad, Sala } from '../dominio/tipos.ts'
import { UMBRAL_LE_CUESTA, avancePorItem, porCategoria } from './avance.ts'

// Lo que pasa en la clase ahora, para el panel docente (Clase y Salas). Sin
// React: se prueba en lib/clase.test.ts.

// Igual que la base: un dispositivo sin señales por 10 minutos se da por apagado.
export const VIGENTE_MS = 10 * 60_000
export const enLinea = (c: Conectado | undefined) => !!c && Date.now() - new Date(c.vistoEn).getTime() < VIGENTE_MS

// Avance que vale para la sala y el plan actuales; otro plan o sala parte en cero.
export function avanceEn(sala: Pick<Sala, 'id' | 'asignacion'>, p: ProgresoSala | undefined) {
  return p && p.salaId === sala.id && p.asignacion === sala.asignacion ? p : undefined
}

// Destino «Sin sala» al mover a un niño: queda fuera de toda sala y en su tablet
// ve la espera con globos.
export const SIN_SALA = ''

// La foto de la clase que se consulta cada pocos segundos.
export interface DatosClase {
  salas: Sala[]
  miembros: MiembroSala[]
  // Solo los activos.
  estudiantes: Estudiante[]
  resultadosHoy: ResultadoActividad[]
  emocionDe: Map<string, Emocion>
  conectados: Map<string, Conectado>
  progresoDe: Map<string, ProgresoSala>
}

// Cómo llegó hoy, sin género («llegó enojado» no sirve para una niña).
export const CON_EMOCION: Record<Emocion, string> = {
  alegria: 'con alegría',
  calma: 'con calma',
  tristeza: 'con tristeza',
  enojo: 'con enojo',
}
export const llego = (e: Emocion) => `Llegó ${CON_EMOCION[e]}`

// En el tablero solo se marcan las emociones que piden una mirada de la docente.
export const convieneMirar =(e: Emocion | undefined): e is 'tristeza' | 'enojo' => e === 'tristeza' || e === 'enojo'

// Qué se hace en un recreo, en palabras de la docente.
export const RECREO: Record<ActividadRecreo, { nombre: string; ayuda: string; estado: string }> = {
  parque: { nombre: 'Parque', ayuda: 'Caminan con su personaje, se ven y se saludan.', estado: 'En el parque' },
  dibujo: { nombre: 'Dibujo', ayuda: 'Dibujo libre, sellos y letras para repasar.', estado: 'Dibujando' },
  globos: { nombre: 'Globos', ayuda: 'Revientan globos y pueden ir a la tienda.', estado: 'Con los globos' },
  juegos: { nombre: 'Juegos', ayuda: 'Los juegos que elijas, las veces que quieran.', estado: 'Jugando' },
}

// Salas de una ruta en orden: cada una seguida de la sala a la que pasan al
// terminar. Un recreo al que llegan varias rutas va solo en la primera.
export function armarRutas(salas: Sala[]) {
  const porId = new Map(salas.map((s) => [s.id, s]))
  const destinos = new Set(salas.map((s) => s.siguienteSala))
  const vistas = new Set<string>()
  const rutas: { salas: Sala[]; compartida?: Sala }[] = []
  const inicios = [...salas.filter((s) => s.tipo === 'trabajo' && !destinos.has(s.id)), ...salas.filter((s) => s.tipo === 'trabajo')]
  for (const inicio of inicios) {
    if (vistas.has(inicio.id)) continue
    const ruta: Sala[] = []
    let actual: Sala | undefined = inicio
    while (actual && !vistas.has(actual.id)) {
      vistas.add(actual.id)
      ruta.push(actual)
      actual = actual.siguienteSala ? porId.get(actual.siguienteSala) : undefined
    }
    rutas.push({ salas: ruta, compartida: actual })
  }
  return { rutas, sueltas: salas.filter((s) => !vistas.has(s.id)) }
}

// Todas las salas una vez: primero las de trabajo y después los recreos, cada
// grupo en el orden en que los niños los recorren (así varios grupos que van al
// mismo parque quedan juntos, y el parque después). Al final, los recreos a los
// que no llega ninguna sala.
export function salasEnOrden(salas: Sala[]) {
  const { rutas, sueltas } = armarRutas(salas)
  const orden = [...rutas.flatMap((r) => r.salas), ...sueltas]
  return [...orden.filter((s) => s.tipo === 'trabajo'), ...orden.filter((s) => s.tipo !== 'trabajo')]
}

// El color de cada sala, el mismo en Clase y en Salas: los recreos en menta y
// las salas de actividades con los demás colores, en el orden del tablero.
export interface ColorSala {
  fondo: string
  acento: string
}
const COLORES_TRABAJO = ['amarillo', 'celeste', 'lila', 'durazno', 'rosa']
const color = (nombre: string): ColorSala => ({ fondo: `var(--color-sala-${nombre})`, acento: `var(--color-sala-${nombre}-acento)` })
export function coloresDeSalas(salas: Sala[]) {
  const mapa = new Map<string, ColorSala>()
  let n = 0
  for (const s of salasEnOrden(salas)) mapa.set(s.id, s.tipo === 'recreo' ? color('menta') : color(COLORES_TRABAJO[n++ % COLORES_TRABAJO.length]))
  return mapa
}

// ¿Conectar `origen` con `destino` cerraría un círculo?
export function hariaCirculo(salas: Sala[], origen: string, destino: string) {
  for (let id: string | undefined = destino, n = 0; id && n <= salas.length; n++) {
    if (id === origen) return true
    id = salas.find((s) => s.id === id)?.siguienteSala
  }
  return false
}

// En qué sala está un niño según el servidor (SIN_SALA si en ninguna).
export const salaSegunServidor = (datos: Pick<DatosClase, 'miembros'>, estudianteId: string) =>
  datos.miembros.find((m) => m.estudianteId === estudianteId)?.salaId ?? SIN_SALA

// Qué está haciendo un niño ahora, para mostrarlo en una línea.
export type EstadoNino =
  | { tipo: 'sin-sala' }
  | { tipo: 'recreo'; texto: string }
  | { tipo: 'sin-plan' }
  | { tipo: 'termino'; pasa: boolean }
  | { tipo: 'actividad'; numero: number; total: number; contenido: string; actividad: string; icono: string; intento: number; necesitaAyuda: boolean }

export function estadoNino(sala: Sala | undefined, progreso: ProgresoSala | undefined): EstadoNino {
  if (!sala) return { tipo: 'sin-sala' }
  if (sala.tipo === 'recreo') return { tipo: 'recreo', texto: RECREO[sala.actividad].estado }
  const plan = planDeSala(sala.plan)
  if (plan.length === 0) return { tipo: 'sin-plan' }
  const p = avanceEn(sala, progreso)
  const paso = p?.paso ?? 0
  if (paso >= plan.length) return { tipo: 'termino', pasa: Boolean(sala.siguienteSala) }
  const actual = plan[paso]
  return {
    tipo: 'actividad',
    numero: paso + 1,
    total: plan.length,
    contenido: actual.contenido.titulo,
    actividad: actual.contenido.pasos[actual.numero - 1]?.titulo ?? `Actividad ${actual.numero}`,
    icono: actual.contenido.icono,
    intento: (p?.repeticiones ?? 0) + 1,
    necesitaAyuda: Boolean(p?.necesitaAyuda),
  }
}

// Los que repitieron 2 veces la misma actividad sin lograrla y esperan a la docente.
export function necesitanApoyo(datos: DatosClase) {
  return datos.miembros.flatMap((m) => {
    const sala = datos.salas.find((s) => s.id === m.salaId)
    const estudiante = datos.estudiantes.find((e) => e.id === m.estudianteId)
    if (!sala || !estudiante) return []
    const estado = estadoNino(sala, datos.progresoDe.get(m.estudianteId))
    return estado.tipo === 'actividad' && estado.necesitaAyuda ? [{ estudiante, sala, estado }] : []
  })
}

// Partidas y minutos de hoy de un niño.
export function hoyDe(datos: Pick<DatosClase, 'resultadosHoy'>, estudianteId: string) {
  const propias = datos.resultadosHoy.filter((r) => r.estudianteId === estudianteId)
  return { partidas: propias.length, minutos: Math.round(propias.reduce((n, r) => n + r.duracionMs, 0) / 60_000) }
}

// Lo de hoy en el curso, solo con los estudiantes activos: cuántos jugaron,
// cuántas partidas y con qué emoción llegaron (y cuántos aún no responden).
export function resumenHoy(datos: Pick<DatosClase, 'estudiantes' | 'resultadosHoy' | 'emocionDe'>) {
  const ids = new Set(datos.estudiantes.map((e) => e.id))
  const partidas = datos.resultadosHoy.filter((r) => ids.has(r.estudianteId))
  const llegaron: Record<Emocion, number> = { alegria: 0, calma: 0, tristeza: 0, enojo: 0 }
  let sinResponder = 0
  for (const e of datos.estudiantes) {
    const emocion = datos.emocionDe.get(e.id)
    if (emocion) llegaron[emocion] += 1
    else sinResponder += 1
  }
  return { jugaron: new Set(partidas.map((r) => r.estudianteId)).size, partidas: partidas.length, llegaron, sinResponder }
}

// Lo que cabe en el resumen de Clase; el detalle completo está en Avance.
const RESUMEN_CATEGORIAS = 3
const RESUMEN_ITEMS = 3

// La semana del curso, solo con los estudiantes activos: cuántos jugaron (y
// quiénes no), cuántas partidas y lo que más les cuesta. Por categoría, porque
// una letra no se compara con una rima; primero la categoría con el ítem más
// difícil.
export function resumenSemana(estudiantes: Estudiante[], resultados: ResultadoActividad[]) {
  const ids = new Set(estudiantes.map((e) => e.id))
  const delCurso = resultados.filter((r) => ids.has(r.estudianteId))
  const jugaron = new Set(delCurso.map((r) => r.estudianteId))
  const cuestan = porCategoria(avancePorItem(delCurso).filter((a) => a.tasa < UMBRAL_LE_CUESTA))
    .sort((a, b) => a.items[0].tasa - b.items[0].tasa)
    .slice(0, RESUMEN_CATEGORIAS)
    .map((g) => ({ ...g, items: g.items.slice(0, RESUMEN_ITEMS) }))
  const sinJugar = estudiantes.filter((e) => !jugaron.has(e.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return { jugaron: jugaron.size, sinJugar, partidas: delCurso.length, cuestan }
}

// Lo que cambió entre dos consultas, en una frase para el lector de pantalla:
// quién cambió de sala o empezó a pedir apoyo.
export function cambiosEntre(antes: DatosClase, datos: DatosClase) {
  const ayuda = (d: DatosClase, id: string) => Boolean(d.progresoDe.get(id)?.necesitaAyuda)
  const frases: string[] = []
  for (const e of datos.estudiantes) {
    const [desde, hacia] = [salaSegunServidor(antes, e.id), salaSegunServidor(datos, e.id)]
    if (desde !== hacia) frases.push(hacia === SIN_SALA ? `${e.nombre} quedó sin sala` : `${e.nombre} pasó a ${datos.salas.find((s) => s.id === hacia)?.nombre ?? 'otra sala'}`)
    if (ayuda(datos, e.id) && !ayuda(antes, e.id)) frases.push(`${e.nombre} necesita apoyo`)
  }
  if (frases.length === 0) return ''
  return frases.length > 4 ? `${frases.slice(0, 3).join('. ')}. Y ${frases.length - 3} cambios más.` : `${frases.join('. ')}.`
}

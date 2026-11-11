// Prepara el curso del video (PLAN.md, secciones 2 y 6): «Kínder A» con Sofía, Tomás,
// Martina, Benjamín, Isidora y Lucas, y un historial de varios días para las métricas.
// Mientras se graba, los perfiles y plantillas que ya existían quedan fuera de la vista;
// `restaurar.mjs` los devuelve tal como estaban (el respaldo queda en .respaldo/).
//
// Uso: node --env-file=../frontend/.env scripts/datos/montar.mjs
// Se puede correr varias veces: no duplica nada.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ok, sesionDocente } from './sesion.mjs'

export const CURSO = 'Kínder A'
const RESPALDO = fileURLToPath(new URL('../../.respaldo/estado-previo.json', import.meta.url))
export const DATOS = fileURLToPath(new URL('../../.respaldo/curso-video.json', import.meta.url))

const base = (pelo, piel, colorPelo, ojos) => ({ expresion: 'feliz', manoArriba: false, apoyos: [], puestos: {}, piel, colorPelo, pelo, ojos })
const ajustes = (tematica, exigencia = 'intermedio') => ({ modoImagen: 'mixto', tamanoLetra: 'normal', altoContraste: false, reducirAnimaciones: false, silenciarEfectos: false, tematica, exigencia })

// Los seis del plan. Martina parte en Intermedio: la toma C2 la pasa a Inicial.
const NINOS = [
  { nombre: 'Sofía', avatar: '🦊', color: '#fde2c8', personaje: base('pelo_colitas', 3, 'cafe_claro', 'ojos_alegres'), ajustes: ajustes('animales'), acierto: 0.93, b: 0.9 },
  { nombre: 'Tomás', avatar: '🦖', color: '#d3f2e3', personaje: base('pelo_corto', 2, 'negro', 'ojos_redondos'), ajustes: ajustes('dinosaurios'), acierto: 0.68, b: 0.22 },
  { nombre: 'Martina', avatar: '🐬', color: '#cfe8fb', personaje: base('pelo_trenza', 5, 'negro', 'ojos_redondos'), ajustes: ajustes('oceano'), acierto: 0.66, b: 0.5 },
  { nombre: 'Benjamín', avatar: '🚒', color: '#fff3c4', personaje: base('pelo_rulos', 4, 'cafe_oscuro', 'ojos_alegres'), ajustes: ajustes('vehiculos', 'avanzado'), acierto: 0.88, b: 0.8 },
  { nombre: 'Isidora', avatar: '🦄', color: '#e4dcf7', personaje: base('pelo_melena', 3, 'rubio', 'ojos_alegres'), ajustes: ajustes('animales'), acierto: 0.8, b: 0.7 },
  { nombre: 'Lucas', avatar: '⚽', color: '#f6d1d1', personaje: base('pelo_puntas', 4, 'cafe_claro', 'ojos_alegres'), ajustes: ajustes('futbol'), acierto: 0.72, b: 0.45 },
]

// Días con clases antes de hoy (hora de Chile, UTC−3): la semana pasada y el lunes.
const DIAS = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09']
const EMOCIONES = {
  Sofía: ['alegria', 'alegria', 'calma', 'alegria', 'alegria'],
  Tomás: ['calma', 'tristeza', 'enojo', 'calma', 'tristeza'],
  Martina: ['calma', 'alegria', 'calma', 'tristeza', 'calma'],
  Benjamín: ['alegria', 'calma', 'alegria', 'alegria', 'calma'],
  Isidora: ['alegria', 'alegria', 'tristeza', 'calma', 'alegria'],
  Lucas: ['enojo', 'calma', 'alegria', 'calma', 'alegria'],
}
const OBSERVACIONES = [
  { dia: '2026-11-05', texto: 'Confunde la B con la P cuando solo escucha el sonido. Practicar con palabras que empiezan con B: boca, bote, burro.' },
  { dia: '2026-11-09', texto: 'Trabajó más tranquilo sentado cerca de mí. Le ayuda mirar la boca al decir el sonido de la B.' },
]

// Lo que jugó cada niño cada día: la actividad de letras y las sílabas de la semana.
const LETRAS = ['M', 'P', 'L', 'S', 'T', 'B']
const PARTIDAS_POR_DIA = [
  [{ id: 'escucha-letra' }, { id: 'silabas-m-1' }],
  [{ id: 'escucha-letra' }, { id: 'silabas-m-2' }],
  [{ id: 'silabas-m-1' }, { id: 'escucha-letra' }, { id: 'silabas-p-1' }],
  [{ id: 'escucha-letra' }, { id: 'silabas-p-2' }],
  [{ id: 'escucha-letra' }, { id: 'silabas-m-2' }, { id: 'escucha-letra' }],
]
const NIVELES = { inicial: { rondas: 4, revelarTras: 1 }, intermedio: { rondas: 5, revelarTras: 2 }, avanzado: { rondas: 6, revelarTras: 3 } }

// Azar repetible: el mismo niño y día dan siempre la misma partida.
function azarDe(semilla) {
  let h = createHash('sha256').update(semilla).digest().readUInt32LE(0)
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const uuidDe = (semilla) => {
  const h = createHash('sha256').update(semilla).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

// Una partida con las mismas reglas de puntaje que la app (actividades/Partida.tsx).
function partida(nino, actividadId, semilla) {
  const r = azarDe(semilla)
  const nivel = NIVELES[nino.ajustes.exigencia]
  const letras = actividadId === 'escucha-letra'
  const consonante = actividadId.split('-')[1]?.toUpperCase()
  const items = letras ? LETRAS : ['A', 'E', 'I', 'O', 'U'].map((v) => consonante + v)
  const barajados = [...items].sort(() => r() - 0.5)
  let racha = 0
  let monedas = 0
  let estrellas = 0
  const rondas = Array.from({ length: nivel.rondas }, (_, i) => {
    // La B siempre aparece en la partida de letras: es lo que se quiere medir.
    const item = letras && i === 0 ? 'B' : barajados[i % barajados.length] === 'B' ? barajados[(i + 1) % barajados.length] : barajados[i % barajados.length]
    const p = item === 'B' ? nino.b : nino.acierto
    const intentos = r() < p ? 1 : r() < 0.6 ? 2 : 3
    const otros = items.filter((x) => x !== item && x !== 'V')
    const error = intentos === 1 ? undefined : item === 'B' && r() < 0.8 ? 'P' : otros[Math.floor(r() * otros.length)]
    racha = intentos === 1 ? racha + 1 : 0
    monedas += [10, 5, 2][Math.min(intentos, 3) - 1] + (racha >= 3 ? 2 : 0)
    estrellas += [3, 2, 1][Math.min(intentos, 3) - 1]
    return { item, intentos, acertada: intentos <= nivel.revelarTras, error, categoria: letras ? 'letras' : 'silabas', tiempo_ms: Math.round(2500 + r() * 6000 + (intentos - 1) * 3500), revelada: intentos > nivel.revelarTras }
  })
  const promedio = estrellas / rondas.length
  const paso = Number(actividadId.split('-')[2])
  return {
    rondas,
    estrellas: promedio >= 2.5 ? 3 : promedio >= 1.75 ? 2 : 1,
    monedas,
    duracion: rondas.reduce((s, x) => s + x.tiempo_ms, 0) + rondas.length * 4000 + 9000,
    contexto: letras
      ? { mecanica: 'elegir', nivel: 1, oa: ['OA 7'], practica: false, version: 1, parametros: { letras: LETRAS.map((l) => l.toLowerCase()) } }
      : { mecanica: 'elegir', contenidoId: actividadId.slice(0, -2), paso, nivel: 2, oa: ['OA 7', 'OA 3'], practica: false, version: 1 },
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await sesionDocente()
  await mkdir(fileURLToPath(new URL('../../.respaldo/', import.meta.url)), { recursive: true })

  // 1 · Respaldo de lo que había, una sola vez.
  const cursos = ok(await s.from('cursos').select('id, nombre'))
  const ajenos = ok(await s.from('estudiantes').select('id, nombre, activo, curso_id')).filter((e) => cursos.find((c) => c.id === e.curso_id)?.nombre !== CURSO)
  const plantillas = ok(await s.from('plantillas_actividad').select('*'))
  const yo = ok(await s.from('docentes').select('id, nombre').single())
  if (!existsSync(RESPALDO)) {
    await writeFile(RESPALDO, JSON.stringify({ fecha: new Date().toISOString(), docente: yo.nombre, estudiantes: ajenos, plantillas }, null, 1))
    console.log(`Respaldo: ${ajenos.length} perfiles y ${plantillas.length} plantillas → .respaldo/estado-previo.json`)
  }
  const previo = JSON.parse(await readFile(RESPALDO, 'utf8'))
  if (!('docente' in previo)) {
    previo.docente = yo.nombre
    await writeFile(RESPALDO, JSON.stringify(previo, null, 1))
  }
  // En pantalla la cuenta se llama «Educadora», como en el plan (sin nombre propio).
  if (yo.nombre !== 'Educadora') ok(await s.from('docentes').update({ nombre: 'Educadora' }).eq('id', yo.id).select('id'))

  // 2 · Fuera de la vista mientras se graba: perfiles de otros cursos y plantillas de prueba.
  const activos = ajenos.filter((e) => e.activo).map((e) => e.id)
  if (activos.length) ok(await s.from('estudiantes').update({ activo: false }).in('id', activos).select('id'))
  const viejas = plantillas.filter((p) => previo.plantillas.some((x) => x.id === p.id)).map((p) => p.id)
  if (viejas.length) ok(await s.from('plantillas_actividad').delete().in('id', viejas).select('id'))
  console.log(`Ocultos: ${activos.length} perfiles desactivados, ${viejas.length} plantillas retiradas (vuelven con restaurar.mjs)`)

  // 3 · El curso y sus seis niños.
  let curso = cursos.find((c) => c.nombre === CURSO)
  curso ??= ok(await s.from('cursos').insert({ nombre: CURSO }).select('id, nombre').single())
  const existentes = ok(await s.from('estudiantes').select('id, nombre').eq('curso_id', curso.id))
  const ids = {}
  for (const n of NINOS) {
    const ya = existentes.find((e) => e.nombre === n.nombre)
    ids[n.nombre] = ya?.id ?? ok(await s.from('estudiantes').insert({ curso_id: curso.id, nombre: n.nombre, avatar: n.avatar, color: n.color, activo: true, nivel_habilitado: 2, personaje: n.personaje, ajustes: n.ajustes }).select('id').single()).id
  }
  // Si quedaron ocultos tras una sesión anterior (restaurar.mjs --ocultar-video), vuelven.
  ok(await s.from('estudiantes').update({ activo: true }).eq('curso_id', curso.id).select('id'))
  console.log(`Curso «${CURSO}»: ${Object.keys(ids).join(', ')}`)

  // 4 · Historial: emociones, partidas y observaciones de los días anteriores.
  let partidas = 0
  for (const n of NINOS) {
    const id = ids[n.nombre]
    const yaEmociones = ok(await s.from('registros_emocion').select('id').eq('estudiante_id', id).limit(1)).length > 0
    for (const [d, dia] of DIAS.entries()) {
      const r = azarDe(`${n.nombre}|${dia}`)
      const llegada = new Date(`${dia}T09:0${Math.floor(r() * 9)}:00-03:00`)
      if (!yaEmociones) ok(await s.from('registros_emocion').insert({ estudiante_id: id, emocion: EMOCIONES[n.nombre][d], fecha: llegada.toISOString() }).select('id'))
      let hora = llegada.getTime() + 4 * 60_000
      for (const [k, a] of PARTIDAS_POR_DIA[d].entries()) {
        const p = partida(n, a.id, `${n.nombre}|${dia}|${k}`)
        hora += p.duracion + 60_000 + Math.floor(r() * 120_000)
        const { error } = await s.rpc('guardar_resultado', {
          p_id: uuidDe(`${n.nombre}|${dia}|${k}`),
          p_estudiante_id: id,
          p_actividad_id: a.id,
          p_fecha: new Date(hora).toISOString(),
          p_duracion_ms: p.duracion,
          p_estrellas: p.estrellas,
          p_monedas: p.monedas,
          p_rondas: p.rondas,
          p_contexto: p.contexto,
        })
        if (error) throw new Error(`guardar_resultado: ${error.message}`)
        partidas++
      }
    }
  }
  const tomas = ids['Tomás']
  if (ok(await s.from('observaciones').select('id').eq('estudiante_id', tomas).limit(1)).length === 0) {
    for (const o of OBSERVACIONES) ok(await s.from('observaciones').insert({ estudiante_id: tomas, texto: o.texto, fecha: new Date(`${o.dia}T13:10:00-03:00`).toISOString() }).select('id'))
  }
  console.log(`Historial: ${partidas} partidas en ${DIAS.length} días (las repetidas no se duplican), emociones y 2 observaciones de Tomás`)

  await writeFile(DATOS, JSON.stringify({ cursoId: curso.id, ninos: ids }, null, 1))
  const visibles = ok(await s.rpc('perfiles_alumnos'))
  console.log('Perfiles visibles en /alumno:', visibles.map((p) => p.nombre).join(', '))
  const monedas = ok(await s.from('estudiantes').select('nombre, monedas').eq('curso_id', curso.id).order('nombre'))
  console.log('Monedas:', monedas.map((m) => `${m.nombre} ${m.monedas}`).join(' · '))
}

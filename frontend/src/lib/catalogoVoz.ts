import { COMO_SE_JUEGA, JUEGOS, type Ronda } from '../contenido/actividades.ts'
import { CONTENIDOS } from '../contenido/contenidos.ts'
import { COLORES, GROSORES, LETRAS as LETRAS_DIBUJO } from '../contenido/dibujo.ts'
import { MONEDAS_PARTIDA } from '../contenido/exigencia.ts'
import * as FRASES from '../contenido/frases.ts'
import { PICTOS_MENSAJE } from '../contenido/mensajes.ts'
import { JUEGOS_PARQUE } from '../contenido/parque.ts'
import { COLORES_PELO, EXPRESIONES, PIELES } from '../contenido/personaje.ts'
import { JUEGOS_CONFIGURABLES, PLANTILLAS_SISTEMA } from '../contenido/plantillas.ts'
import { ARTICULOS, MAX_FALTAN_CON_NUMERO, faltanMonedas } from '../contenido/tienda.ts'
import { EMOCIONES } from './avance.ts'
import { enFrase, paraVoz } from './textoVoz.ts'

// Catálogo de lo que la voz dice una y otra vez, para dejarlo generado de
// antemano (backend/scripts/precargarVoz.ts): así suena al instante desde la
// primera vez. Lo que no está aquí se genera igual al pedirlo (y la app
// precarga la ronda siguiente mientras el niño responde).
//
// Tres fuentes:
//   1. Pantallas: las frases fijas escritas en el código («¡Empezar!»,
//      voz="Seguir"…), leídas directo de los archivos: si cambia una pantalla,
//      el catálogo cambia con ella.
//   2. Datos: títulos, instrucciones, emociones, tienda, dibujo, parque, premios.
//   3. Actividades: se juegan muchas partidas de cada una y se quedan las frases
//      que se repiten (al menos en 1 de cada 100 partidas). Las que salen de
//      combinar palabras al azar («Escucha: sol… mariposa… pato. ¿Cuál es la más
//      larga?») casi nunca se repiten: esas se generan en vivo.

export interface Fuente {
  // Ruta relativa a src/, con «/».
  ruta: string
  texto: string
}

export type Origen = 'pantallas' | 'datos' | 'actividades' | 'premios' | 'nombres'

export interface FraseVoz {
  // Tal como la pide la app (después de paraVoz): con esto se arma la clave del audio.
  texto: string
  origen: Origen
}

export interface OpcionesCatalogo {
  // Nombres de pila de los niños: su saludo y su perfil también se dicen cada día.
  nombres?: string[]
  partidasPorActividad?: number
  // Fracción mínima de partidas en que aparece una frase para considerarla recurrente.
  umbral?: number
}

// Mismo límite que el backend (backend/src/voz.ts): más largo no se genera.
export const MAX_CARACTERES = 300

// ---------- 1. Frases fijas escritas en las pantallas ----------

// Donde la app habla: hablar(…), hablarAlApuntar(…), precargar(…) y las
// propiedades voz= / saludo= / voz: de los botones y pestañas.
const SITIOS = /\b(?:hablar|hablarAlApuntar|precargar)\(|\b(?:voz|saludo)=|\bvoz:/g

const COMILLAS = `'"\``

// Lo que va desde `i` hasta el primer `,` `)` `]` `}` que no esté dentro de
// paréntesis, llaves o un literal: una expresión suelta. En un objeto
// (`voz: 'Yo'`) también termina en el salto de línea.
function hastaElFin(texto: string, i: number, cortaEnLinea = false) {
  let nivel = 0
  let j = i
  while (j < texto.length) {
    const c = texto[j]
    if (COMILLAS.includes(c)) {
      j = finDeLiteral(texto, j)
      continue
    }
    if ('([{'.includes(c)) nivel++
    else if (')]}'.includes(c)) {
      if (nivel === 0) break
      nivel--
    } else if (nivel === 0 && (c === ',' || (cortaEnLinea && c === '\n'))) break
    j++
  }
  return texto.slice(i, j)
}

// La expresión de un sitio de voz: lo de adentro de hablar(…), el literal o las
// llaves de voz="…" / voz={…}, o el valor de voz: … en un objeto.
function expresionDelSitio(texto: string, sitio: string, desde: number) {
  if (sitio.endsWith('(')) return hastaElFin(texto, desde)
  if (sitio.endsWith('=')) {
    if (COMILLAS.includes(texto[desde])) return texto.slice(desde, finDeLiteral(texto, desde))
    if (texto[desde] === '{') return hastaElFin(texto, desde + 1)
    return ''
  }
  return hastaElFin(texto, desde, true)
}

// Índice justo después del literal que empieza en `i` (respeta \' y ${…}).
function finDeLiteral(texto: string, i: number) {
  const comilla = texto[i]
  let j = i + 1
  while (j < texto.length && texto[j] !== comilla) {
    if (texto[j] === '\\') j++
    else if (comilla === '`' && texto[j] === '$' && texto[j + 1] === '{') {
      let nivel = 1
      j += 2
      while (j < texto.length && nivel > 0) {
        if (texto[j] === '{') nivel++
        else if (texto[j] === '}') nivel--
        j++
      }
      continue
    }
    j++
  }
  return j + 1
}

const LITERAL = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g
// Códigos que se comparan («monedas_insuficientes»), rutas y nombres de clase: no se dicen.
const NO_SE_DICE = /^[a-z0-9_./-]*$/

export interface ResultadoPantallas {
  fijas: string[]
  // Frases armadas con ${…}: las cubre el catálogo con contenido/frases.ts.
  dinamicas: { ruta: string; linea: number; texto: string }[]
}

// La maquinaria de la voz (no lo que se dice), las pruebas y el panel docente, que no habla.
const NO_HABLAN = /^(lib\/(audio|catalogoVoz|textoVoz)\.ts|ui\/voz\.ts|paginas\/docente\/)|\.test\.tsx?$/

export function frasesDePantallas(fuentes: Fuente[]): ResultadoPantallas {
  const fijas = new Set<string>()
  const dinamicas: ResultadoPantallas['dinamicas'] = []
  for (const { ruta, texto } of fuentes) {
    if (NO_HABLAN.test(ruta)) continue
    for (const m of texto.matchAll(SITIOS)) {
      const expr = expresionDelSitio(texto, m[0], m.index + m[0].length)
      for (const l of expr.matchAll(LITERAL)) {
        const crudo = l[0]
        const contenido = crudo.slice(1, -1)
        const antes = expr.slice(0, l.index).trimEnd()
        const despues = expr.slice(l.index + crudo.length).trimStart()
        if (antes.endsWith('==') || despues.startsWith('==') || despues.startsWith('!=')) continue
        if (NO_SE_DICE.test(contenido)) continue
        if (crudo.startsWith('`') && contenido.includes('${')) {
          dinamicas.push({ ruta, linea: texto.slice(0, m.index).split('\n').length, texto: contenido })
          continue
        }
        fijas.add(contenido.replace(/\\(.)/g, '$1'))
      }
    }
  }
  return { fijas: [...fijas], dinamicas }
}

// ---------- 3. Lo que se dice en cada ronda (como en actividades/rondas.tsx y Partida.tsx) ----------

export function frasesDeRonda(r: Ronda): string[] {
  const f = [r.instruccion, r.refuerzo, 'pista' in r ? r.pista : undefined]
  switch (r.tipo) {
    case 'elegir':
      // Tocar el estímulo lo repite; tocar una sílaba la dice.
      if (r.estimulo.audio && !r.estimulo.silabas) f.push(enFrase(r.estimulo.audio))
      for (const [i, s] of (r.estimulo.silabas ?? []).entries()) if (i !== r.estimulo.hueco) f.push(enFrase(s.toLowerCase()))
      break
    case 'aplausos':
      f.push(...r.palabra.silabas)
      break
    case 'marcar':
      // Tocar una tarjeta la dice: la palabra como frase corta, la oración tal cual.
      f.push(...r.tarjetas.map((t) => (t.texto ? enFrase(t.audio) : t.audio)))
      break
    case 'choque':
      f.push(r.consonante + r.vocal)
      break
    case 'escribir':
      f.push(enFrase(r.audio))
      break
  }
  return f.filter((x): x is string => Boolean(x))
}

type Generador = () => Ronda[]

function generadores(): Generador[] {
  return [
    ...CONTENIDOS.flatMap((c) => c.pasos.map((p) => p.generar)),
    ...JUEGOS.map((j) => j.generar),
    // Las configurables, con lo que trae cada plantilla del sistema.
    ...JUEGOS_CONFIGURABLES.flatMap((j) => [j.porDefecto, ...PLANTILLAS_SISTEMA.filter((p) => p.juegoId === j.id).map((p) => p.parametros)].map((p) => () => j.generar(p))),
  ]
}

function frasesRecurrentes(partidas: number, umbral: number) {
  const recurrentes = new Set<string>()
  for (const generar of generadores()) {
    const veces = new Map<string, number>()
    for (let i = 0; i < partidas; i++) {
      const enEsta = new Set(generar().flatMap(frasesDeRonda))
      for (const f of enEsta) veces.set(f, (veces.get(f) ?? 0) + 1)
    }
    for (const [f, n] of veces) if (n / partidas >= umbral) recurrentes.add(f)
  }
  return recurrentes
}

// ---------- Catálogo completo ----------

export function frasesDeLaApp(fuentes: Fuente[], opciones: OpcionesCatalogo = {}): FraseVoz[] {
  const { nombres = [], partidasPorActividad = 1500, umbral = 0.01 } = opciones
  const vistas = new Map<string, FraseVoz>()
  const agregar = (origen: Origen, ...textos: (string | undefined)[]) => {
    for (const t of textos) {
      const texto = t && paraVoz(t)
      if (texto && texto.length <= MAX_CARACTERES && !vistas.has(texto)) vistas.set(texto, { texto, origen })
    }
  }

  // 1. Pantallas, y las frases fijas de contenido/frases.ts (se usan por nombre, no escritas).
  agregar('pantallas', ...frasesDePantallas(fuentes).fijas)
  for (const valor of Object.values(FRASES)) {
    if (typeof valor === 'string') agregar('pantallas', valor)
    else if (valor && typeof valor === 'object') agregar('pantallas', ...Object.values(valor as Record<string, string>))
  }

  // 2. Datos.
  agregar('datos', ...Object.values(EMOCIONES).map((e) => e.texto))
  for (const c of CONTENIDOS) for (const p of c.pasos) agregar('datos', p.titulo, p.instrucciones, FRASES.fraseCamino(p.titulo, false), FRASES.fraseCamino(p.titulo, true))
  for (const j of JUEGOS_CONFIGURABLES) agregar('datos', j.titulo, j.instrucciones, FRASES.fraseCamino(j.titulo, false), FRASES.fraseCamino(j.titulo, true))
  for (const j of JUEGOS) agregar('datos', j.titulo, j.instrucciones)
  agregar('datos', ...Object.values(COMO_SE_JUEGA))
  for (const a of ARTICULOS) agregar('datos', a.nombre, a.precio ? FRASES.articuloConPrecio(a.nombre, a.precio) : undefined)
  agregar('datos', ...[...new Set(ARTICULOS.map((a) => a.precio).filter(Boolean))].map(FRASES.frasePrecio))
  agregar('datos', ...Array.from({ length: MAX_FALTAN_CON_NUMERO + 1 }, (_, i) => faltanMonedas(i + 1)))
  agregar('datos', ...PIELES.map((_, i) => FRASES.colorDePiel(i)), ...COLORES_PELO.map((c) => c.nombre), ...EXPRESIONES.map((e) => e.nombre))
  agregar('datos', ...COLORES.map((c) => c.nombre), ...GROSORES.map((g) => g.nombre), ...LETRAS_DIBUJO.map(FRASES.letraParaRepasar))
  agregar('datos', ...JUEGOS_PARQUE.map((j) => j.voz), ...PICTOS_MENSAJE.map((p) => p.voz))

  // Premios: todas las monedas que se pueden ganar en una partida.
  for (let n = MONEDAS_PARTIDA.min; n <= MONEDAS_PARTIDA.max; n++) {
    agregar('premios', FRASES.frasePremio('logrado', n), FRASES.frasePremio('repetir', n), FRASES.frasePremio('juego', n))
  }

  // 3. Actividades.
  agregar('actividades', ...frasesRecurrentes(partidasPorActividad, umbral))

  // Nombres: el saludo al entrar, su perfil y su nombre en el parque.
  for (const n of nombres) agregar('nombres', FRASES.saludoAlumno(n), FRASES.nombreEnPerfil(n, false), FRASES.nombreEnPerfil(n, true))

  return [...vistas.values()]
}

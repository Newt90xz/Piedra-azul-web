// Mapa del parque del recreo. Todo va en porcentaje del mapa (16:9): así se ve
// igual en cualquier pantalla. Los dibujos están en public/parque/.

export interface Punto {
  x: number
  y: number
}

export type TipoJuego = 'tienda' | 'columpio' | 'resbalin' | 'balancin' | 'cama' | 'arenero'

interface Objeto extends Punto {
  img: string
  ancho: number
  // Lo que ocupa en el suelo [ancho, alto]: por ahí no se camina.
  pie?: [number, number]
}

// Lo que se puede tocar: el niño camina hasta un puesto libre y juega ahí.
export interface JuegoParque extends Objeto {
  id: TipoJuego
  voz: string
  icono: string
  // Dónde va el ícono flotante.
  marca: Punto
  puestos: Punto[]
}

export const LIMITES = { xMin: 2, xMax: 98, yMin: 37, yMax: 92 }

// Quien está más lejos se ve más chico: esto da la profundidad.
export const escalaEn = (y: number) => 0.6 + ((y - LIMITES.yMin) / (LIMITES.yMax - LIMITES.yMin)) * 0.55

export const DECORADO: Objeto[] = [
  { img: 'arbol_2', x: 3, y: 38, ancho: 5 },
  { img: 'arbol_1', x: 9, y: 37, ancho: 5.5 },
  { img: 'arbol_2', x: 27, y: 36, ancho: 4 },
  { img: 'arbol_1', x: 47, y: 36, ancho: 5 },
  { img: 'arbol_2', x: 68, y: 36, ancho: 4.5 },
  { img: 'arbol_1', x: 76, y: 37, ancho: 6 },
  { img: 'arbol_2', x: 96, y: 38, ancho: 5.5 },
  { img: 'arbusto', x: 25, y: 41, ancho: 5 },
  { img: 'arbusto', x: 71, y: 42, ancho: 5 },
  { img: 'arbol_1', x: 4, y: 58, ancho: 11, pie: [3, 3] },
  { img: 'arbol_2', x: 96, y: 66, ancho: 11, pie: [3, 3] },
  { img: 'pileta', x: 49, y: 58, ancho: 11, pie: [9, 4] },
  { img: 'banca', x: 30, y: 60, ancho: 6, pie: [5, 2] },
  { img: 'banca', x: 89, y: 83, ancho: 8, pie: [7, 2.5] },
  { img: 'flores', x: 65, y: 55, ancho: 6 },
  { img: 'flores', x: 26, y: 88, ancho: 8 },
  { img: 'flores', x: 8, y: 63, ancho: 6 },
  { img: 'arco', x: 40, y: 72, ancho: 7 },
  { img: 'arco', x: 58, y: 72, ancho: 7 },
  { img: 'balon', x: 50, y: 82, ancho: 1.6 },
]

export const JUEGOS_PARQUE: JuegoParque[] = [
  {
    id: 'columpio',
    voz: 'Columpio',
    icono: 'columpio',
    img: 'columpio',
    x: 16,
    y: 49,
    ancho: 13,
    pie: [12, 2],
    marca: { x: 16, y: 25 },
    puestos: [{ x: 13.6, y: 49.5 }, { x: 18.6, y: 49.5 }],
  },
  {
    id: 'resbalin',
    voz: 'Resbalín',
    icono: 'resbalin',
    img: 'resbalin',
    x: 36,
    y: 47,
    ancho: 13,
    pie: [12, 3],
    marca: { x: 32, y: 26 },
    puestos: [{ x: 41.5, y: 48 }],
  },
  {
    id: 'balancin',
    voz: 'Balancín',
    icono: 'balancin',
    img: 'balancin',
    x: 60,
    y: 46,
    ancho: 12,
    pie: [11, 2],
    marca: { x: 60, y: 33 },
    puestos: [{ x: 55.6, y: 45.5 }, { x: 64.4, y: 45.5 }],
  },
  {
    id: 'tienda',
    voz: 'Tienda',
    icono: 'tienda',
    img: 'kiosko',
    x: 85,
    y: 53,
    ancho: 13,
    pie: [12, 4],
    marca: { x: 85, y: 24 },
    puestos: [{ x: 85, y: 56.5 }],
  },
  {
    id: 'cama',
    voz: 'Cama elástica',
    icono: 'cama',
    img: 'cama',
    x: 75,
    y: 75,
    ancho: 14,
    pie: [13, 7],
    marca: { x: 75, y: 56 },
    puestos: [{ x: 72, y: 72 }, { x: 75, y: 71 }, { x: 78, y: 72 }],
  },
  {
    id: 'arenero',
    voz: 'Arenero',
    icono: 'arenero',
    img: 'arenero',
    x: 15,
    y: 82,
    ancho: 19,
    pie: [18, 9],
    marca: { x: 15, y: 62 },
    puestos: [{ x: 10.5, y: 79 }, { x: 15, y: 78 }, { x: 19.5, y: 79 }],
  },
]

const COLUMNAS = 96
const FILAS = 54
const celdaX = 100 / COLUMNAS
const celdaY = 100 / FILAS

const OBSTACULOS = [...DECORADO, ...JUEGOS_PARQUE].flatMap((o) =>
  o.pie ? [{ x0: o.x - o.pie[0] / 2, x1: o.x + o.pie[0] / 2, y0: o.y - o.pie[1], y1: o.y }] : [],
)

export const dentroDelMapa = ({ x, y }: Punto): Punto => ({
  x: Math.min(LIMITES.xMax, Math.max(LIMITES.xMin, x)),
  y: Math.min(LIMITES.yMax, Math.max(LIMITES.yMin, y)),
})

const libre = (x: number, y: number) =>
  x >= LIMITES.xMin && x <= LIMITES.xMax && y >= LIMITES.yMin && y <= LIMITES.yMax && !OBSTACULOS.some((o) => x > o.x0 && x < o.x1 && y > o.y0 && y < o.y1)

const LIBRES = Array.from({ length: COLUMNAS * FILAS }, (_, i) => libre((i % COLUMNAS) * celdaX + celdaX / 2, Math.floor(i / COLUMNAS) * celdaY + celdaY / 2))

const indice = ({ x, y }: Punto) => Math.min(FILAS - 1, Math.max(0, Math.floor(y / celdaY))) * COLUMNAS + Math.min(COLUMNAS - 1, Math.max(0, Math.floor(x / celdaX)))
const centro = (i: number): Punto => ({ x: (i % COLUMNAS) * celdaX + celdaX / 2, y: Math.floor(i / COLUMNAS) * celdaY + celdaY / 2 })

function celdaLibreCerca(p: Punto) {
  const i = indice(p)
  if (LIBRES[i]) return i
  let mejor = -1
  let menor = Infinity
  LIBRES.forEach((l, k) => {
    if (!l) return
    const c = centro(k)
    const d = (c.x - p.x) ** 2 + (((c.y - p.y) * 9) / 16) ** 2
    if (d < menor) {
      menor = d
      mejor = k
    }
  })
  return mejor
}

// ¿Se puede ir en línea recta? Se revisa el camino a pasos cortos.
function hayVista(a: Punto, b: Punto) {
  const pasos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5)
  for (let k = 1; k < pasos; k++) {
    if (!libre(a.x + ((b.x - a.x) * k) / pasos, a.y + ((b.y - a.y) * k) / pasos)) return false
  }
  return true
}

// Puntos por donde pasar para ir de `a` a `b` rodeando lo que haya en medio
// (búsqueda A* sobre una grilla). Si `b` está sobre un objeto, como un asiento
// del columpio, llega hasta el lado y da el último paso directo.
export function rutaEntre(a: Punto, b: Punto): Punto[] {
  if (Math.hypot(b.x - a.x, b.y - a.y) < 0.05) return []
  if (hayVista(a, b)) return [b]
  const inicio = celdaLibreCerca(a)
  const fin = celdaLibreCerca(b)
  const previo = new Map<number, number>()
  const costo = new Map([[inicio, 0]])
  const abiertos = new Set([inicio])
  const estimado = (i: number) => {
    const c = centro(i)
    const f = centro(fin)
    return Math.hypot(c.x - f.x, ((c.y - f.y) * 9) / 16)
  }
  while (abiertos.size) {
    let i = -1
    let menor = Infinity
    for (const k of abiertos) {
      const v = costo.get(k)! + estimado(k)
      if (v < menor) {
        menor = v
        i = k
      }
    }
    if (i === fin) break
    abiertos.delete(i)
    const cx = i % COLUMNAS
    const cy = Math.floor(i / COLUMNAS)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx
        const ny = cy + dy
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= COLUMNAS || ny >= FILAS) continue
        const n = ny * COLUMNAS + nx
        if (!LIBRES[n]) continue
        const total = costo.get(i)! + Math.hypot(dx * celdaX, (dy * celdaY * 9) / 16)
        if (total < (costo.get(n) ?? Infinity)) {
          costo.set(n, total)
          previo.set(n, i)
          abiertos.add(n)
        }
      }
    }
  }
  if (inicio !== fin && !previo.has(fin)) return [b]
  const celdas = [fin]
  while (celdas[0] !== inicio) celdas.unshift(previo.get(celdas[0])!)
  // Se quitan los puntos intermedios innecesarios para que no camine en zigzag.
  const ruta: Punto[] = []
  let desde = a
  let k = 0
  while (k < celdas.length) {
    let lejos = k
    for (let j = celdas.length - 1; j > k; j--) {
      if (hayVista(desde, centro(celdas[j]))) {
        lejos = j
        break
      }
    }
    desde = centro(celdas[lejos])
    ruta.push(desde)
    k = lejos + 1
  }
  ruta.push(b)
  return ruta
}

export function puestoLibre(juego: JuegoParque, ocupados: Punto[]) {
  return juego.puestos.find((p) => !ocupados.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 0.3)) ?? juego.puestos[0]
}

// Si está parado en un puesto de un juego, qué juego es y en cuál.
export function juegoEn(p: Punto) {
  for (const j of JUEGOS_PARQUE) {
    const i = j.puestos.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.3)
    if (i >= 0) return { tipo: j.id, puesto: i }
  }
  return null
}

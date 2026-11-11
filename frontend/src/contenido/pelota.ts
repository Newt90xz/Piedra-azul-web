import { ASPECTO, LIMITES, escalaEn, libre, type Punto } from './parque.ts'

// La pelota del parque: cuando un niño pasa por encima sale empujada hacia donde
// él iba, bota un poco si el golpe fue fuerte, rebota en los bordes y en los
// juegos, gira al rodar y el pasto la va frenando. Las distancias van en % del
// ancho del mapa (un % de alto mide ASPECTO de uno de ancho) y el tiempo en
// segundos.

export interface Pelota extends Punto {
  vx: number
  vy: number
  // Altura sobre el pasto y su velocidad hacia arriba.
  alto: number
  vAlto: number
  // Cuánto ha girado al rodar, en grados.
  giro: number
}

// Un niño, con la velocidad a la que camina.
export interface Pie extends Punto {
  vx: number
  vy: number
}

// Medidas a escala 1: lejos todo se ve (y choca) más chico.
export const RADIO_PELOTA = 0.8
const RADIO_PIE = 1.3
const ROCE = 1.5 // cuánto frena el pasto
const ROCE_AIRE = 0.3
const GRAVEDAD = 80
const REBOTE = 0.6 // contra un niño, un borde o un juego
const BOTE = 0.45 // contra el suelo
const SALTO = 0.6 // cuánto de un golpe se va hacia arriba
const QUIETA = 0.4

export const pelotaEn = (p: Punto): Pelota => ({ x: p.x, y: p.y, vx: 0, vy: 0, alto: 0, vAlto: 0, giro: 0 })

export const quieta = (b: Pelota) => b.vx === 0 && b.vy === 0 && b.alto === 0 && b.vAlto === 0

export function moverPelota(antes: Pelota, pies: Pie[], dt: number): Pelota {
  let { x, y, vx, vy, alto, vAlto, giro } = antes

  // Los niños la empujan: el pie es un círculo y la pelota sale por el otro lado
  // con la velocidad que lleva el niño, como si chocara con algo mucho más pesado.
  if (alto < RADIO_PELOTA * 2) {
    for (const p of pies) {
      const r = (RADIO_PIE + RADIO_PELOTA) * escalaEn(p.y)
      const dx = x - p.x
      const dy = (y - p.y) * ASPECTO
      const d = Math.hypot(dx, dy)
      if (d >= r) continue
      // Si quedó justo debajo, sale hacia donde camina el niño.
      const rapidez = Math.hypot(p.vx, p.vy)
      const [nx, ny] = d > 0.01 ? [dx / d, dy / d] : rapidez > 0.01 ? [p.vx / rapidez, p.vy / rapidez] : [1, 0]
      const acerca = (vx - p.vx) * nx + (vy - p.vy) * ny
      if (acerca < 0) {
        const golpe = -(1 + REBOTE) * acerca
        vx += golpe * nx
        vy += golpe * ny
        vAlto = Math.max(vAlto, golpe * SALTO)
      }
      const fx = p.x + nx * r
      const fy = p.y + (ny * r) / ASPECTO
      if (libre(fx, fy)) {
        x = fx
        y = fy
      }
    }
  }

  // Avanza eje por eje: así rebota solo en la dirección en que topó. Si quedó
  // dentro de algo (la empujaron contra un juego) la deja salir.
  const atrapada = !libre(x, y)
  const nx = x + vx * dt
  if (atrapada || libre(nx, y)) x = nx
  else vx = -vx * REBOTE
  const ny = y + (vy * dt) / ASPECTO
  if (atrapada || libre(x, ny)) y = ny
  else vy = -vy * REBOTE
  if (x < LIMITES.xMin || x > LIMITES.xMax) {
    x = Math.min(LIMITES.xMax, Math.max(LIMITES.xMin, x))
    vx = -vx * REBOTE
  }
  if (y < LIMITES.yMin || y > LIMITES.yMax) {
    y = Math.min(LIMITES.yMax, Math.max(LIMITES.yMin, y))
    vy = -vy * REBOTE
  }

  // En el aire casi no frena; en el suelo, el pasto la detiene.
  const roce = Math.exp(-(alto > 0 ? ROCE_AIRE : ROCE) * dt)
  vx *= roce
  vy *= roce
  vAlto -= GRAVEDAD * dt
  alto += vAlto * dt
  if (alto <= 0) {
    alto = 0
    vAlto = vAlto < -4 ? -vAlto * BOTE : 0
  }
  const rapidez = Math.hypot(vx, vy)
  if (alto === 0 && rapidez < QUIETA) {
    vx = 0
    vy = 0
  }

  // Rueda: gira lo que avanzó dividido por su radio, hacia el lado al que va.
  giro += (((Math.sign(vx) || 1) * rapidez * dt) / (RADIO_PELOTA * escalaEn(y))) * (180 / Math.PI)

  return { x, y, vx, vy, alto, vAlto, giro: giro % 360 }
}

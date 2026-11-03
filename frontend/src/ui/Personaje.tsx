import { COLORES_PELO, PIELES, colorRopa } from '../contenido/personaje.ts'
import { articulo } from '../contenido/tienda.ts'
import type { Personaje } from '../dominio/tipos.ts'

// Personaje por capas (RF-24). Cada parte es un SVG en src/assets/personaje que
// usa las variables --piel, --pelo y --ropa; por eso se incrusta en vez de usar
// <img>. Solo se incrustan archivos propios del proyecto, nunca datos del usuario.

const ARCHIVOS = import.meta.glob<string>('../assets/personaje/**/*.svg', { query: '?raw', import: 'default', eager: true })

// Contenido de un archivo sin su etiqueta <svg>. La clave es 'carpeta/id'.
const PARTES = new Map(
  Object.entries(ARCHIVOS).map(([ruta, svg]) => [ruta.replace(/^.*personaje\/|\.svg$/g, ''), svg.replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')]),
)

// Contenido de <g id="grupo">, contando los <g> anidados para hallar su cierre.
function grupo(cuerpo: string, id: string) {
  const apertura = `<g id="${id}">`
  const inicio = cuerpo.indexOf(apertura)
  if (inicio < 0) return null
  const desde = inicio + apertura.length
  const etiquetas = /<g[\s>]|<\/g>/g
  etiquetas.lastIndex = desde
  let abiertos = 1
  for (let m = etiquetas.exec(cuerpo); m; m = etiquetas.exec(cuerpo)) {
    abiertos += m[0] === '</g>' ? -1 : 1
    if (abiertos === 0) return cuerpo.slice(desde, m.index)
  }
  return null
}

// Un archivo sin grupos es todo «adelante».
function parte(ruta: string | undefined, capa: 'atras' | 'adelante' = 'adelante') {
  const cuerpo = ruta ? PARTES.get(ruta) : undefined
  if (!cuerpo) return ''
  return grupo(cuerpo, capa) ?? (capa === 'adelante' ? cuerpo : '')
}

const rutaDe = (id: string | undefined) => {
  const a = articulo(id)
  return a ? `${a.espacio}/${a.id}` : undefined
}

const MASCOTA = 'translate(356 346) scale(0.3)'

function armarPersonaje(p: Personaje) {
  const { cabeza, cara, ropa, traje, zapatos, espalda, mano, mascota, vehiculo } = p.puestos
  const silla = p.apoyos.includes('silla_ruedas') ? 'apoyo/silla_ruedas' : undefined
  // Con silla de ruedas no se suma un vehículo: no se verían bien juntos.
  const rodado = silla ?? rutaDe(vehiculo)
  const cubrePelo = articulo(cabeza)?.cubrePelo
  const puesta = traje ? rutaDe(traje) : rutaDe(ropa)

  return [
    parte(rodado, 'atras'),
    parte(rutaDe(espalda)),
    parte(rutaDe(p.pelo), 'atras'),
    parte(rutaDe(cabeza), 'atras'),
    parte('base/cuerpo'),
    parte(zapatos ? rutaDe(zapatos) : 'base/zapatos'),
    traje ? '' : parte('base/pantalon'),
    parte(puesta ?? 'base/ropa'),
    parte('base/brazo_izq'),
    parte(p.manoArriba ? 'base/brazo_arriba' : 'base/brazo_der'),
    parte(rodado),
    p.manoArriba ? '' : parte(rutaDe(mano)),
    parte('base/cabeza'),
    parte(rutaDe(p.ojos)),
    parte(`expresion/${p.expresion}`),
    parte(rutaDe(cara)),
    p.apoyos.includes('lentes_opticos') ? parte('apoyo/lentes_opticos') : '',
    cubrePelo ? '' : parte(rutaDe(p.pelo)),
    parte(rutaDe(cabeza)),
    p.apoyos.includes('audifono_medico') ? parte('apoyo/audifono_medico') : '',
    mascota ? `<g transform="${MASCOTA}">${parte(rutaDe(mascota))}</g>` : '',
  ].join('')
}

const VISTAS = { cuerpo: '-8 -8 528 536', busto: '76 4 360 360' }

export function DibujoPersonaje({
  personaje,
  color,
  vista = 'cuerpo',
  className = '',
}: {
  personaje: Personaje
  color: string
  vista?: keyof typeof VISTAS
  className?: string
}) {
  const estilo = {
    '--piel': PIELES[personaje.piel - 1] ?? PIELES[0],
    '--pelo': COLORES_PELO.find((c) => c.id === personaje.colorPelo)?.valor ?? COLORES_PELO[0].valor,
    '--ropa': colorRopa(color),
  } as React.CSSProperties
  return (
    <svg
      viewBox={VISTAS[vista]}
      className={`block ${className}`}
      style={estilo}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: armarPersonaje(personaje) }}
    />
  )
}

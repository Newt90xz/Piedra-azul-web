import { useEffect, useState } from 'react'
import { COLORES_PELO, EXPRESIONES, PIELES, personajePorDefecto, vestir } from '../../contenido/personaje.ts'
import { articulosDe, faltanMonedas, type Articulo, type EspacioOpcional } from '../../contenido/tienda.ts'
import { repo } from '../../datos/index.ts'
import type { Personaje } from '../../dominio/tipos.ts'
import { efecto, hablar } from '../../lib/audio.ts'
import { Icono } from '../../ui/Icono.tsx'
import { DibujoPersonaje } from '../../ui/Personaje.tsx'
import { BotonNino, useNino } from '../../ui/nino.tsx'

// RF-24: tienda y vestidor. Tocar algo lo prueba al instante en el personaje; lo
// gratis o ya comprado queda puesto, lo demás pide confirmar. Cada pantalla
// muestra como máximo 4 opciones (RNF-02) y todo se dice en voz alta.

interface Opcion {
  id: string
  voz: string
  aplicar: (p: Personaje) => Personaje
  puesto: (p: Personaje) => boolean
  articulo?: Articulo
}

const POR_PAGINA = 4

// Lo más caro se nota de lejos, sin tener que leer el precio.
function fondoPorPrecio(precio: number) {
  if (precio >= 400) return 'bg-gradient-to-b from-[#fff3c4] to-[#ffd976]'
  if (precio >= 250) return 'bg-gradient-to-b from-[#f1ebff] to-[#d8cbf7]'
  if (precio >= 150) return 'bg-gradient-to-b from-[#e8f5ff] to-[#c6e4fb]'
  return 'bg-gradient-to-b from-white to-[#eef6fb]'
}

function deArticulos(espacio: EspacioOpcional | 'pelo' | 'ojos'): Opcion[] {
  const ordenados = articulosDe(espacio).toSorted((a, b) => a.precio - b.precio)
  const opciones = ordenados.map(
    (a): Opcion =>
      espacio === 'pelo' || espacio === 'ojos'
        ? { id: a.id, voz: a.nombre, articulo: a, aplicar: (p) => ({ ...p, [espacio]: a.id }), puesto: (p) => p[espacio] === a.id }
        : { id: a.id, voz: a.nombre, articulo: a, aplicar: (p) => vestir(p, espacio, a.id), puesto: (p) => p.puestos[espacio] === a.id },
  )
  if (espacio === 'pelo' || espacio === 'ojos') return opciones
  const quitar: Opcion = { id: `sin_${espacio}`, voz: 'Quitar', aplicar: (p) => vestir(p, espacio, undefined), puesto: (p) => !p.puestos[espacio] }
  return [quitar, ...opciones]
}

const pieles: Opcion[] = PIELES.map((_, i) => ({
  id: `piel_${i + 1}`,
  voz: `Color de piel ${i + 1}`,
  aplicar: (p) => ({ ...p, piel: i + 1 }),
  puesto: (p) => p.piel === i + 1,
}))

const coloresPelo: Opcion[] = COLORES_PELO.map((c) => ({
  id: c.id,
  voz: c.nombre,
  aplicar: (p) => ({ ...p, colorPelo: c.id }),
  puesto: (p) => p.colorPelo === c.id,
}))

const caras: Opcion[] = [
  ...EXPRESIONES.map(
    (x): Opcion => ({ id: x.id, voz: x.nombre, aplicar: (p) => ({ ...p, expresion: x.id }), puesto: (p) => p.expresion === x.id }),
  ),
  { id: 'mano', voz: 'Levantar la mano', aplicar: (p) => ({ ...p, manoArriba: !p.manoArriba }), puesto: (p) => p.manoArriba },
]

const apoyos: Opcion[] = articulosDe('apoyo').map((a) => ({
  id: a.id,
  voz: a.nombre,
  aplicar: (p) => ({ ...p, apoyos: p.apoyos.includes(a.id) ? p.apoyos.filter((x) => x !== a.id) : [...p.apoyos, a.id] }),
  puesto: (p) => p.apoyos.includes(a.id),
}))

interface Seccion {
  icono: string
  voz: string
  vista: 'cuerpo' | 'busto'
  opciones: Opcion[]
}

const PESTANAS: { icono: string; voz: string; secciones: Seccion[] }[] = [
  {
    icono: '🙂',
    voz: 'Yo',
    secciones: [
      { icono: '✋', voz: 'Piel', vista: 'busto', opciones: pieles },
      { icono: '🎨', voz: 'Color de pelo', vista: 'busto', opciones: coloresPelo },
      { icono: '😊', voz: 'Mi cara', vista: 'cuerpo', opciones: caras },
      { icono: '👓', voz: 'Lo que uso', vista: 'cuerpo', opciones: apoyos },
    ],
  },
  {
    icono: '💇',
    voz: 'Cabeza',
    secciones: [
      { icono: '💇', voz: 'Pelo', vista: 'busto', opciones: deArticulos('pelo') },
      { icono: '👀', voz: 'Ojos', vista: 'busto', opciones: deArticulos('ojos') },
      { icono: '👑', voz: 'Gorros y coronas', vista: 'busto', opciones: deArticulos('cabeza') },
      { icono: '🕶️', voz: 'Lentes y antifaces', vista: 'busto', opciones: deArticulos('cara') },
    ],
  },
  {
    icono: '👕',
    voz: 'Ropa',
    secciones: [
      { icono: '👕', voz: 'Poleras', vista: 'cuerpo', opciones: deArticulos('ropa') },
      { icono: '👗', voz: 'Trajes', vista: 'cuerpo', opciones: deArticulos('traje') },
      { icono: '👟', voz: 'Zapatos', vista: 'cuerpo', opciones: deArticulos('zapatos') },
      { icono: '🦸', voz: 'Capas y alas', vista: 'cuerpo', opciones: deArticulos('espalda') },
    ],
  },
  {
    icono: '🐾',
    voz: 'Amigos y juguetes',
    secciones: [
      { icono: '⚽', voz: 'En la mano', vista: 'cuerpo', opciones: deArticulos('mano') },
      { icono: '🐾', voz: 'Mascotas', vista: 'cuerpo', opciones: deArticulos('mascota') },
      { icono: '🚗', voz: 'Vehículos', vista: 'cuerpo', opciones: deArticulos('vehiculo') },
    ],
  },
]

export function Tienda({ alCerrar }: { alCerrar?: () => void }) {
  const { estudiante, estado, silenciado, recargar } = useNino()
  const [iPestana, setPestana] = useState(0)
  const [iSeccion, setSeccion] = useState(0)
  const [pagina, setPagina] = useState(0)
  // Lo que se está probando y aún no se compra.
  const [probando, setProbando] = useState<Opcion | null>(null)
  // Muestra el cambio al instante, sin esperar al próximo refresco del estado.
  const [local, setLocal] = useState<Personaje | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const guardado = local ?? estudiante.personaje ?? personajePorDefecto(estudiante.nombre)
  const comprados = estado.articulosComprados
  const pestana = PESTANAS[iPestana]
  const seccion = pestana.secciones[iSeccion]
  const total = Math.ceil(seccion.opciones.length / POR_PAGINA)
  const visibles = seccion.opciones.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const lucido = probando ? probando.aplicar(guardado) : guardado

  useEffect(() => hablar('¡La tienda! Toca algo para probártelo.'), [])

  const irA = (pest: number, sec: number) => {
    setPestana(pest)
    setSeccion(sec)
    setPagina(0)
    setProbando(null)
  }

  const guardar = async (p: Personaje) => {
    const previo = local
    setLocal(p)
    try {
      await repo.guardarPersonaje(p)
      recargar()
      return true
    } catch {
      setLocal(previo)
      hablar('No se pudo cambiar. Intenta otra vez.')
      return false
    }
  }

  const tiene = (o: Opcion) => !o.articulo?.precio || comprados.includes(o.articulo.id)

  const tocar = async (o: Opcion) => {
    if (!tiene(o)) {
      const precio = o.articulo!.precio
      setProbando(o)
      hablar(estudiante.monedas >= precio ? `${o.voz}, ${precio} monedas` : faltanMonedas(precio - estudiante.monedas))
      return
    }
    setProbando(null)
    setOcupado(true)
    if (await guardar(o.aplicar(guardado))) {
      efecto('toque', silenciado)
      hablar(o.voz)
    }
    setOcupado(false)
  }

  const comprar = async (o: Opcion) => {
    setOcupado(true)
    try {
      await repo.comprarArticulo(o.articulo!.id)
      if (await guardar(o.aplicar(guardado))) {
        efecto('premio', silenciado)
        hablar('¡Ya es tuyo!')
      }
    } catch (e) {
      hablar((e as Error).message === 'monedas_insuficientes' ? '¡Te faltan monedas!' : 'No se pudo comprar. Intenta otra vez.')
    }
    setProbando(null)
    setOcupado(false)
    recargar()
  }

  const alcanza = probando && estudiante.monedas >= probando.articulo!.precio

  return (
    <main className="mx-auto grid h-full max-w-6xl grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 px-5 py-3">
      <div className="flex min-h-0 flex-col items-center gap-3">
        {/* El personaje se luce en un escenario, de pie sobre el podio. */}
        <div
          className="tarjeta-nino grid min-h-0 w-full flex-1 place-items-end justify-items-center overflow-hidden rounded-[2rem] border-3 border-nino-azul bg-cover bg-bottom"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}tienda/escenario.svg)` }}
        >
          <DibujoPersonaje personaje={lucido} color={estudiante.color} className="mb-[3%] max-h-[86%] w-[72%] max-w-[22rem]" />
        </div>
        {probando ? (
          <div className="flex shrink-0 items-center gap-4" role="group" aria-label={`Comprar ${probando.voz}`}>
            <span className="flex items-center gap-2 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-4 py-1 text-[0.9em] font-bold">
              <span aria-hidden="true">🪙</span> {probando.articulo!.precio}
            </span>
            <BotonNino voz="No, gracias" disabled={ocupado} onClick={() => setProbando(null)} className="grid size-20 place-items-center bg-[#f6d1d1]">
              <span aria-hidden="true" className="text-[1.3em]">✖️</span>
            </BotonNino>
            {alcanza && (
              <BotonNino voz="¡Sí, comprar!" disabled={ocupado} onClick={() => void comprar(probando)} className="grid size-20 place-items-center border-nino-ok bg-nino-menta">
                <Icono nombre="check" className="size-10" />
              </BotonNino>
            )}
          </div>
        ) : (
          alCerrar && (
            <BotonNino voz="Volver al parque" onClick={alCerrar} className="grid h-20 w-40 shrink-0 place-items-center bg-nino-menta">
              <span aria-hidden="true" className="text-[1.5em]">🌳</span>
            </BotonNino>
          )
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <nav aria-label="Secciones de la tienda" className="flex shrink-0 justify-between gap-3">
          {PESTANAS.map((p, i) => (
            <BotonNino key={p.voz} voz={p.voz} aria-pressed={i === iPestana} onClick={() => irA(i, 0)} className={`centro-emoji h-16 flex-1 text-[1.4em] ${i === iPestana ? 'bg-nino-amarillo' : 'opacity-75'}`}>
              <span aria-hidden="true">{p.icono}</span>
            </BotonNino>
          ))}
        </nav>
        <nav aria-label={pestana.voz} className="flex shrink-0 gap-3">
          {pestana.secciones.map((s, i) => (
            <BotonNino key={s.voz} voz={s.voz} aria-pressed={i === iSeccion} onClick={() => irA(iPestana, i)} className={`centro-emoji h-16 flex-1 rounded-2xl text-[1.2em] ${i === iSeccion ? 'bg-nino-lila' : 'opacity-75'}`}>
              <span aria-hidden="true">{s.icono}</span>
            </BotonNino>
          ))}
        </nav>
        <ul key={`${iPestana}-${iSeccion}-${pagina}`} className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
          {visibles.map((o) => {
            const propio = tiene(o)
            const puesto = !probando && o.puesto(guardado)
            const elegido = probando?.id === o.id
            const precio = o.articulo?.precio ?? 0
            return (
              <li key={o.id} className="min-h-0">
                <BotonNino
                  voz={propio || !precio ? o.voz : `${o.voz}, ${precio} monedas`}
                  aria-pressed={puesto}
                  disabled={ocupado}
                  onClick={() => void tocar(o)}
                  className={`relative grid size-full place-items-center overflow-hidden p-1 ${puesto ? 'bg-nino-menta ring-4 ring-nino-ok' : fondoPorPrecio(precio)} ${elegido ? 'ring-4 ring-[#e6c84d]' : ''}`}
                >
                  <DibujoPersonaje personaje={o.aplicar(guardado)} color={estudiante.color} vista={seccion.vista} className={`size-full min-h-0 ${!propio && estudiante.monedas < precio ? 'opacity-50 grayscale' : ''}`} />
                  {!propio && (
                    <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-2.5 text-[0.75em] font-bold">
                      <span aria-hidden="true">{estudiante.monedas < precio ? '🔒' : '🪙'}</span> {precio}
                    </span>
                  )}
                </BotonNino>
              </li>
            )
          })}
        </ul>
        {total > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-5">
            <BotonNino voz="Anteriores" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)} className="grid h-16 w-24 place-items-center text-[1.2em] disabled:opacity-40">
              <span aria-hidden="true">◀️</span>
            </BotonNino>
            <span className="text-[0.8em] font-bold" aria-label={`Página ${pagina + 1} de ${total}`}>
              {pagina + 1} / {total}
            </span>
            <BotonNino voz="Siguientes" disabled={pagina >= total - 1} onClick={() => setPagina(pagina + 1)} className="grid h-16 w-24 place-items-center text-[1.2em] disabled:opacity-40">
              <span aria-hidden="true">▶️</span>
            </BotonNino>
          </div>
        )}
      </div>
    </main>
  )
}

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react'
import { COLORES, GROSORES, LETRAS, SELLOS } from '../../contenido/dibujo.ts'
import { efecto, hablar } from '../../lib/audio.ts'
import { Icono } from '../../ui/Icono.tsx'
import { BotonNino, useNino } from '../../ui/nino.tsx'

// Sala de dibujo: dibujo libre con colores grandes, grosores, goma y sellos.
// «Repasar» pone una letra tenue de fondo para seguirla con el dedo (apresto
// para la escritura). Todo sin texto: cada botón dice su nombre al apuntarlo.
// El dibujo se guarda en coordenadas relativas, así sobrevive a girar la tableta
// o cambiar el tamaño de la ventana.

// Tamaño del sello, como fracción del lado menor de la hoja.
const TAM_SELLO = 0.09

type Punto = [number, number]
type Trazo =
  | { tipo: 'linea'; color: string; grosor: number; borrar: boolean; puntos: Punto[] }
  | { tipo: 'sello'; emoji: string; x: number; y: number }

type Herramienta = 'lapiz' | 'goma' | 'sello'

export default function Dibujo() {
  const { silenciado } = useNino()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const trazos = useRef<Trazo[]>([])
  const actual = useRef<Trazo | null>(null)
  // Cuántos trazos hay (para habilitar deshacer y hoja nueva); los trazos viven en una ref.
  const [cantidad, setCantidad] = useState(0)
  const [color, setColor] = useState(COLORES[5].color)
  const [grosor, setGrosor] = useState(GROSORES[1].valor)
  const [herramienta, setHerramienta] = useState<Herramienta>('lapiz')
  const [sello, setSello] = useState(SELLOS[0])
  const [letra, setLetra] = useState<string | null>(null)
  const [bandeja, setBandeja] = useState<'sellos' | 'letras' | null>(null)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const hayTrazos = cantidad > 0

  useEffect(() => hablar('¡La sala de dibujo! Elige un color y dibuja.'), [])

  const redibujar = () => {
    const c = lienzo.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    for (const t of trazos.current) pintar(ctx, c, t)
    if (actual.current) pintar(ctx, c, actual.current)
  }

  // El lienzo sigue el tamaño de su caja (y la densidad de la pantalla) y se repinta.
  useLayoutEffect(() => {
    const c = lienzo.current
    if (!c) return
    const ajustar = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = Math.max(1, Math.round(r.width * dpr))
      c.height = Math.max(1, Math.round(r.height * dpr))
      redibujar()
    }
    ajustar()
    const obs = new ResizeObserver(ajustar)
    obs.observe(c)
    return () => obs.disconnect()
    // redibujar solo lee refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const punto = (e: EventoPuntero<HTMLCanvasElement>): Punto => {
    const r = e.currentTarget.getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
  }

  const alBajar = (e: EventoPuntero<HTMLCanvasElement>) => {
    setBandeja(null)
    const [x, y] = punto(e)
    if (herramienta === 'sello') {
      trazos.current.push({ tipo: 'sello', emoji: sello, x, y })
      efecto('toque', silenciado)
      redibujar()
      setCantidad(trazos.current.length)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    actual.current = { tipo: 'linea', color, grosor: herramienta === 'goma' ? grosor * 2.5 : grosor, borrar: herramienta === 'goma', puntos: [[x, y]] }
    redibujar()
  }

  const alMover = (e: EventoPuntero<HTMLCanvasElement>) => {
    const t = actual.current
    if (t?.tipo !== 'linea') return
    // Con lápiz o dedo rápido llegan puntos agrupados: se usan todos para un trazo suave.
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    const r = e.currentTarget.getBoundingClientRect()
    for (const ev of eventos) t.puntos.push([(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height])
    redibujar()
  }

  const alSubir = () => {
    if (!actual.current) return
    trazos.current.push(actual.current)
    actual.current = null
    setCantidad(trazos.current.length)
  }

  const deshacer = () => {
    trazos.current.pop()
    redibujar()
    setCantidad(trazos.current.length)
  }

  const hojaNueva = () => {
    trazos.current = []
    setConfirmarBorrar(false)
    redibujar()
    setCantidad(trazos.current.length)
    hablar('¡Hoja nueva!')
  }

  const elegirColor = (c: string) => {
    setColor(c)
    if (herramienta !== 'lapiz') setHerramienta('lapiz')
  }

  return (
    // Pantalla horizontal: colores a la izquierda y herramientas a la derecha.
    // Vertical (tablet de pie): colores arriba y herramientas abajo, la hoja al medio.
    <main className="flex h-full flex-col gap-3 px-4 py-3 landscape:flex-row">
      {/* Colores */}
      <div role="group" aria-label="Colores" className="flex shrink-0 flex-wrap justify-center gap-2 landscape:grid landscape:grid-cols-2 landscape:content-center">
        {COLORES.map((c) => {
          const activo = herramienta === 'lapiz' && color === c.color
          return (
            <BotonNino
              key={c.color}
              voz={c.nombre}
              aria-pressed={activo}
              onClick={() => elegirColor(c.color)}
              className={`size-14 rounded-full border-white ${activo ? 'ring-4 ring-nino-tinta ring-offset-2' : ''}`}
              style={{ background: c.color }}
            />
          )
        })}
      </div>

      {/* Hoja */}
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="tarjeta-nino relative h-full overflow-hidden rounded-[2rem] border-3 border-nino-azul bg-white" style={{ containerType: 'size' }}>
          {letra && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid place-items-center font-escolar leading-none font-bold text-[#cfd8e3] select-none"
              style={{ fontSize: 'min(70cqh, 45cqw)', WebkitTextStroke: '3px #b7c4d4' }}
            >
              {letra}
            </span>
          )}
          <canvas
            ref={lienzo}
            aria-label="Hoja para dibujar"
            className={`absolute inset-0 size-full touch-none ${herramienta === 'sello' ? 'cursor-copy' : 'cursor-crosshair'}`}
            onPointerDown={alBajar}
            onPointerMove={alMover}
            onPointerUp={alSubir}
            onPointerCancel={alSubir}
          />
        </div>

        {bandeja && (
          <div role="group" aria-label={bandeja === 'sellos' ? 'Sellos' : 'Letras para repasar'} className="animate-pop absolute inset-x-0 top-3 flex justify-center px-3">
            <div className="tarjeta-nino flex flex-wrap justify-center gap-2 rounded-3xl border-3 border-nino-azul bg-white p-3">
              {bandeja === 'sellos'
                ? SELLOS.map((s) => (
                    <BotonNino
                      key={s}
                      voz="Sello"
                      onClick={() => {
                        setSello(s)
                        setHerramienta('sello')
                        setBandeja(null)
                      }}
                      className={`grid size-14 place-items-center text-[1.4em] ${herramienta === 'sello' && sello === s ? 'bg-nino-amarillo' : ''}`}
                    >
                      <span aria-hidden="true">{s}</span>
                    </BotonNino>
                  ))
                : [
                    <BotonNino
                      key="ninguna"
                      voz="Sin letra"
                      onClick={() => {
                        setLetra(null)
                        setBandeja(null)
                      }}
                      className={`grid size-14 place-items-center ${letra === null ? 'bg-nino-amarillo' : ''}`}
                    >
                      <span aria-hidden="true" className="text-[1.2em]">⬜</span>
                    </BotonNino>,
                    ...LETRAS.map((l) => (
                      <BotonNino
                        key={l}
                        voz={`Letra ${l}`}
                        onClick={() => {
                          setLetra(l)
                          setBandeja(null)
                          hablar('Sigue la letra con tu dedo.')
                        }}
                        className={`grid size-14 place-items-center text-[1.2em] font-bold ${letra === l ? 'bg-nino-amarillo' : ''}`}
                      >
                        {l}
                      </BotonNino>
                    )),
                  ]}
            </div>
          </div>
        )}

        {confirmarBorrar && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-[2rem] bg-nino-tinta/30">
            <div className="tarjeta-nino animate-pop flex gap-6 rounded-[2rem] border-3 border-nino-azul bg-white p-6">
              <BotonNino voz="No, seguir dibujando" onClick={() => setConfirmarBorrar(false)} className="grid size-24 place-items-center bg-[#f6d1d1]">
                <span aria-hidden="true" className="text-[1.6em]">✖️</span>
              </BotonNino>
              <BotonNino voz="Sí, hoja nueva" onClick={hojaNueva} className="grid size-24 place-items-center border-nino-ok bg-nino-menta">
                <Icono nombre="check" className="size-12" />
              </BotonNino>
            </div>
          </div>
        )}
      </div>

      {/* Herramientas */}
      <div role="group" aria-label="Herramientas" className="flex shrink-0 flex-wrap justify-center gap-2 landscape:grid landscape:grid-cols-2 landscape:content-center">
        {GROSORES.map((g, i) => {
          const activo = herramienta === 'lapiz' && grosor === g.valor
          return (
            <BotonNino
              key={g.valor}
              voz={g.nombre}
              aria-pressed={activo}
              onClick={() => {
                setGrosor(g.valor)
                setHerramienta('lapiz')
              }}
              className={`grid size-14 place-items-center ${activo ? 'bg-nino-amarillo' : ''}`}
            >
              <span aria-hidden="true" className="rounded-full" style={{ background: color, width: `${8 + i * 9}px`, height: `${8 + i * 9}px` }} />
            </BotonNino>
          )
        })}
        <BotonNino
          voz="Goma"
          aria-pressed={herramienta === 'goma'}
          onClick={() => setHerramienta('goma')}
          className={`grid size-14 place-items-center text-[1.3em] ${herramienta === 'goma' ? 'bg-nino-amarillo' : ''}`}
        >
          <span aria-hidden="true">🧽</span>
        </BotonNino>
        <BotonNino
          voz="Sellos"
          aria-pressed={herramienta === 'sello'}
          onClick={() => setBandeja(bandeja === 'sellos' ? null : 'sellos')}
          className={`grid size-14 place-items-center text-[1.3em] ${herramienta === 'sello' ? 'bg-nino-amarillo' : ''}`}
        >
          <span aria-hidden="true">{herramienta === 'sello' ? sello : '⭐'}</span>
        </BotonNino>
        <BotonNino
          voz="Repasar letras"
          aria-pressed={letra !== null}
          onClick={() => setBandeja(bandeja === 'letras' ? null : 'letras')}
          className={`grid size-14 place-items-center text-[1.1em] font-bold ${letra ? 'bg-nino-lila' : ''}`}
        >
          {letra ?? 'Aa'}
        </BotonNino>
        <BotonNino voz="Deshacer" disabled={!hayTrazos} onClick={deshacer} className="grid size-14 place-items-center disabled:opacity-40">
          <span aria-hidden="true" className="text-[1.3em]">↩️</span>
        </BotonNino>
        <BotonNino voz="Hoja nueva" disabled={!hayTrazos} onClick={() => setConfirmarBorrar(true)} className="grid size-14 place-items-center bg-[#f6d1d1] disabled:opacity-40">
          <span aria-hidden="true" className="text-[1.3em]">🗑️</span>
        </BotonNino>
      </div>
    </main>
  )
}

function pintar(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, t: Trazo) {
  const lado = Math.min(c.width, c.height)
  if (t.tipo === 'sello') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.font = `${Math.round(lado * TAM_SELLO)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(t.emoji, t.x * c.width, t.y * c.height)
    return
  }
  // La goma borra solo lo dibujado: la letra de fondo para repasar no está en el lienzo.
  ctx.globalCompositeOperation = t.borrar ? 'destination-out' : 'source-over'
  ctx.strokeStyle = t.color
  ctx.fillStyle = t.color
  ctx.lineWidth = Math.max(1, t.grosor * lado)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const [x0, y0] = t.puntos[0]
  if (t.puntos.length === 1) {
    ctx.beginPath()
    ctx.arc(x0 * c.width, y0 * c.height, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(x0 * c.width, y0 * c.height)
  for (const [x, y] of t.puntos.slice(1)) ctx.lineTo(x * c.width, y * c.height)
  ctx.stroke()
}

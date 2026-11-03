import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { PICTOS_MENSAJE, pictoMensaje, type PictoMensaje } from '../../contenido/mensajes.ts'
import { DECORADO, JUEGOS_PARQUE, dentroDelMapa, escalaEn, juegoEn, puestoLibre, rutaEntre, type JuegoParque, type Punto } from '../../contenido/parque.ts'
import { personajePorDefecto } from '../../contenido/personaje.ts'
import { articulo } from '../../contenido/tienda.ts'
import { repo } from '../../datos/index.ts'
import type { ConexionParque, MiembroParque, Personaje, PosicionParque } from '../../dominio/tipos.ts'
import { efecto, hablar } from '../../lib/audio.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { DibujoPersonaje } from '../../ui/Personaje.tsx'
import { BotonNino, useNino, useVozAlApuntar } from '../../ui/nino.tsx'
import { Tienda } from './Tienda.tsx'

// Parque del recreo: un mapa amplio donde caminan hasta unos 20 niños con su
// personaje y se ven en tiempo real. Quien está más lejos se ve más chico, los
// objetos tapan a quien pasa detrás y se camina rodeándolos. Tocar un juego lleva
// al niño hasta él. Se conversa solo con pictogramas predefinidos que suenan al
// tocarlos: nada que leer ni escribir, y nada que moderar.

const REFRESCO_MS = 5000
const VELOCIDAD = 14 // % del mapa por segundo, a tamaño normal
const BURBUJA_MS = 3500
const PASO_TECLA = 6
const PICTOS_POR_PAGINA = 4
const SOBRE_TODO = 2000

const imagen = (n: string) => `${import.meta.env.BASE_URL}parque/${n}.svg`
const inicioAlAzar = (): Punto => ({ x: 30 + Math.random() * 40, y: 62 + Math.random() * 6 })

export default function Playground() {
  const { estudiante, silenciado, estado } = useNino()
  const { datos, recargar } = useConsulta(() => repo.datosParque(), [])
  const [tienda, setTienda] = useState(false)
  const [yo, setYo] = useState(inicioAlAzar)
  const [otros, setOtros] = useState<PosicionParque[]>([])
  const [dichos, setDichos] = useState<Record<string, string>>({})
  const [paginaPictos, setPaginaPictos] = useState(0)
  const [marca, setMarca] = useState<(Punto & { n: number }) | null>(null)
  const conexion = useRef<ConexionParque | null>(null)
  // Dónde parte al conectarse o reconectarse (mover ya avisa los cambios).
  const posicion = useRef(yo)
  const vaALaTienda = useRef(false)

  const canal = datos?.canal ?? null
  const miembros = datos?.miembros
  const ficha = miembros?.find((m) => m.mia)?.ficha ?? null
  const reducido = estudiante.ajustes.reducirAnimaciones

  useEffect(() => hablar('¡Llegaste al recreo! Toca el pasto para caminar.'), [])
  // Con dependencias: con 20 niños moviéndose hay renders seguidos que, sin ellas,
  // reiniciarían el temporizador antes de que alcance a dispararse.
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  }, [recargar])

  const decirEnPantalla = (quien: string, picto: string) => {
    setDichos((d) => ({ ...d, [quien]: picto }))
    window.setTimeout(() => setDichos((d) => (d[quien] === picto ? Object.fromEntries(Object.entries(d).filter(([k]) => k !== quien)) : d)), BURBUJA_MS)
  }

  // Sin canal (sin conexión o aún cargando) el niño igual camina solo.
  useEffect(() => {
    if (!canal || !ficha) return
    const c = repo.conectarParque(canal, ficha, posicion.current, {
      alMoverse: (lista) => setOtros(lista.filter((p) => p.ficha !== ficha)),
      alDecir: decirEnPantalla,
    })
    conexion.current = c
    return () => {
      conexion.current = null
      c.cerrar()
    }
  }, [canal, ficha])

  const caminarA = (destino: Punto) => {
    posicion.current = destino
    setYo(destino)
    conexion.current?.mover(destino.x, destino.y)
  }

  const tocarPasto = (e: MouseEvent<HTMLButtonElement>) => {
    // Enter o espacio sobre el botón no traen un punto: se camina con las flechas.
    if (e.detail === 0) return
    const r = e.currentTarget.getBoundingClientRect()
    const destino = dentroDelMapa({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
    vaALaTienda.current = false
    setMarca({ ...destino, n: (marca?.n ?? 0) + 1 })
    caminarA(destino)
  }

  // Quien usa teclado también puede caminar.
  const conFlechas = (e: KeyboardEvent<HTMLElement>) => {
    const pasos: Record<string, [number, number]> = {
      ArrowLeft: [-PASO_TECLA, 0],
      ArrowRight: [PASO_TECLA, 0],
      ArrowUp: [0, -PASO_TECLA],
      ArrowDown: [0, PASO_TECLA],
    }
    const paso = pasos[e.key]
    if (!paso) return
    e.preventDefault()
    vaALaTienda.current = false
    caminarA(dentroDelMapa({ x: yo.x + paso[0], y: yo.y + paso[1] }))
  }

  const tocarJuego = (j: JuegoParque) => {
    efecto('toque', silenciado)
    hablar(j.voz)
    const ya = j.puestos.some((p) => Math.hypot(p.x - yo.x, p.y - yo.y) < 0.3)
    if (j.id === 'tienda' && ya) return setTienda(true)
    if (ya) return
    vaALaTienda.current = j.id === 'tienda'
    setMarca(null)
    caminarA(puestoLibre(j, otros))
  }

  const alLlegar = () => {
    if (!vaALaTienda.current) return
    vaALaTienda.current = false
    setTienda(true)
  }

  const enviar = (p: PictoMensaje) => {
    hablar(p.voz)
    efecto('toque', silenciado)
    decirEnPantalla('yo', p.id)
    conexion.current?.decir(p.id)
    // Queda en la base para que la docente vea los últimos en su panel.
    void repo.enviarMensaje(p.id).catch(() => {})
  }

  const paginasPictos = Math.ceil(PICTOS_MENSAJE.length / PICTOS_POR_PAGINA)
  const pictos = PICTOS_MENSAJE.slice(paginaPictos * PICTOS_POR_PAGINA, (paginaPictos + 1) * PICTOS_POR_PAGINA)

  if (tienda) return <Tienda alCerrar={() => setTienda(false)} />

  const propio: MiembroParque = {
    ficha: 'yo',
    mia: true,
    nombre: estudiante.nombre,
    color: estudiante.color,
    personaje: estudiante.personaje,
  }

  return (
    <main className="h-full px-3 pb-3" aria-label={`Recreo ${estado.sala?.nombre ?? ''}`}>
      {/* El mapa es 16:9 y usa el mayor tamaño que quepa, sin scroll. */}
      <div className="flex size-full items-center justify-center" style={{ containerType: 'size' }}>
        <div
          className="relative aspect-video overflow-hidden rounded-[1.5rem] border-3 border-nino-azul"
          onKeyDown={conFlechas}
          style={{ containerType: 'size', width: 'min(100cqw, calc(100cqh * 16 / 9))' }}
        >
          <img src={imagen('fondo')} alt="" className="absolute inset-0 size-full" />
          <button aria-label="Caminar por el parque. También puedes usar las flechas." onClick={tocarPasto} className="absolute inset-0 size-full cursor-pointer" />
          {marca && <span key={marca.n} aria-hidden="true" className="parque-destino absolute" style={{ left: `${marca.x}%`, top: `${marca.y}%` }} />}
          {DECORADO.map((d, i) => (
            <img
              key={i}
              src={imagen(d.img)}
              alt=""
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-[97%]"
              style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.ancho}%`, zIndex: Math.round(d.y * 10) }}
            />
          ))}
          {JUEGOS_PARQUE.map((j) => (
            <Juego key={j.id} juego={j} alTocar={() => tocarJuego(j)} />
          ))}
          {miembros
            ?.filter((m) => !m.mia)
            .flatMap((m) => {
              const p = otros.find((o) => o.ficha === m.ficha)
              return p ? [<Monito key={m.ficha} miembro={m} destino={p} picto={dichos[m.ficha]} reducido={reducido} />] : []
            })}
          <Monito miembro={propio} destino={yo} picto={dichos.yo} reducido={reducido} alLlegar={alLlegar} />
          {/* Lo más cercano: tapa un poco el borde y hace ver el mapa más hondo. */}
          <img src={imagen('primer_plano')} alt="" className="pointer-events-none absolute bottom-0 left-0 w-[20%]" style={{ zIndex: SOBRE_TODO }} />
          <img src={imagen('primer_plano')} alt="" className="pointer-events-none absolute right-0 bottom-0 w-[20%] -scale-x-100" style={{ zIndex: SOBRE_TODO }} />
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2" style={{ zIndex: SOBRE_TODO + 1 }} role="group" aria-label="Saludar">
            {pictos.map((p) => (
              <BotonNino key={p.id} voz={p.voz} onClick={() => enviar(p)} className="grid h-16 w-24 place-content-center justify-items-center gap-0.5 text-[1.1em] leading-none">
                <span aria-hidden="true">{p.emoji}</span>
                <span aria-hidden="true" className="text-[0.42em] leading-none font-bold">{palabraPicto(p.voz)}</span>
              </BotonNino>
            ))}
            <BotonNino voz="Otros dibujos" onClick={() => setPaginaPictos((paginaPictos + 1) % paginasPictos)} className="centro-emoji size-16 bg-nino-lila text-[1em]">
              <span aria-hidden="true">🔄</span>
            </BotonNino>
          </div>
        </div>
      </div>
    </main>
  )
}

// La palabra del pictograma, en mayúscula y sin signos: «¡Te quiero!» → «TE QUIERO».
function palabraPicto(voz: string) {
  return voz.replace(/[¡!¿?,]/g, '').toUpperCase()
}

function Juego({ juego, alTocar }: { juego: JuegoParque; alTocar: () => void }) {
  const voz = useVozAlApuntar(juego.voz)
  return (
    <>
      <img
        src={imagen(juego.img)}
        alt=""
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-[97%]"
        style={{ left: `${juego.x}%`, top: `${juego.y}%`, width: `${juego.ancho}%`, zIndex: Math.round(juego.y * 10) }}
      />
      {/* El ícono flota sobre el juego y es lo que se toca: al menos 64 px (RNF-02). */}
      <button
        {...voz}
        aria-label={juego.voz}
        onClick={alTocar}
        className={`parque-icono parque-icono-${juego.id} absolute grid size-[max(64px,5.4cqw)] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center`}
        style={{ left: `${juego.marca.x}%`, top: `${juego.marca.y}%`, zIndex: SOBRE_TODO - 1 }}
      >
        <span className="grid size-[78%] place-items-center rounded-full border-[3px] border-white shadow-[0_3px_0_rgba(60,50,80,0.35)]">
          <img src={imagen(`iconos/${juego.icono}`)} alt="" className="size-[72%]" />
        </span>
      </button>
    </>
  )
}

const pintar = (el: HTMLElement, p: Punto) => {
  el.style.transform = `translate(calc(${p.x}cqw - 50%), calc(${p.y}cqh - 100%)) scale(${escalaEn(p.y)})`
  el.style.zIndex = String(Math.round(p.y * 10) + 1)
}

// Con vestido, cola, vehículo o silla no hay dos piernas que mover: se balancea entero.
const tienePiernas = (p: Personaje) =>
  !p.puestos.vehiculo && !p.apoyos.includes('silla_ruedas') && !['vestido_princesa', 'vestido_estrellas', 'cola_sirena'].includes(articulo(p.puestos.traje)?.id ?? '')

function Monito({ miembro, destino, picto, reducido, alLlegar }: { miembro: MiembroParque; destino: Punto; picto?: string; reducido: boolean; alLlegar?: () => void }) {
  const nodo = useRef<HTMLDivElement>(null)
  const actual = useRef(destino)
  // La posición la lleva cuadro a cuadro el efecto de abajo, sin pasar por React.
  const [inicial] = useState(() => `translate(calc(${destino.x}cqw - 50%), calc(${destino.y}cqh - 100%)) scale(${escalaEn(destino.y)})`)
  const [caminando, setCaminando] = useState(false)
  const [mirada, setMirada] = useState(1)
  const [llegado, setLlegado] = useState(destino)
  const voz = useVozAlApuntar(miembro.nombre)
  const avisar = useRef(alLlegar)
  useEffect(() => {
    avisar.current = alLlegar
  })

  const { x, y } = destino
  useEffect(() => {
    const el = nodo.current
    if (!el) return
    const objetivo = { x, y }
    if (reducido) {
      actual.current = objetivo
      pintar(el, objetivo)
      setLlegado(objetivo)
      avisar.current?.()
      return
    }
    const ruta = rutaEntre(actual.current, objetivo)
    if (ruta.length === 0) return
    let i = 0
    let antes = performance.now()
    let cuadro = 0
    setCaminando(true)
    const avanzar = (ahora: number) => {
      let queda = VELOCIDAD * escalaEn(actual.current.y) * Math.min(0.05, (ahora - antes) / 1000)
      antes = ahora
      while (queda > 0 && i < ruta.length) {
        const meta = ruta[i]
        const dx = meta.x - actual.current.x
        const dy = meta.y - actual.current.y
        // Un % de alto mide menos que uno de ancho: 9/16 mantiene pareja la velocidad.
        const d = Math.hypot(dx, (dy * 9) / 16)
        if (Math.abs(dx) > 0.05) setMirada(Math.sign(dx))
        if (d <= queda) {
          actual.current = meta
          i++
          queda -= d
        } else {
          actual.current = { x: actual.current.x + (dx / d) * queda, y: actual.current.y + (dy / d) * queda }
          queda = 0
        }
      }
      pintar(el, actual.current)
      if (i < ruta.length) {
        cuadro = requestAnimationFrame(avanzar)
      } else {
        setCaminando(false)
        setLlegado(objetivo)
        avisar.current?.()
      }
    }
    cuadro = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(cuadro)
  }, [x, y, reducido])

  const personaje = miembro.personaje ?? personajePorDefecto(miembro.nombre)
  const dicho = picto ? pictoMensaje(picto) : undefined
  const juego = !caminando ? juegoEn(llegado) : null
  const conPiernas = caminando && tienePiernas(personaje)

  return (
    <div ref={nodo} className="group pointer-events-none absolute top-0 left-0 w-[6.2cqw] origin-bottom" style={{ transform: inicial, zIndex: Math.round(y * 10) + 1 }}>
      {dicho && (
        <span aria-label={`${miembro.nombre} dice: ${dicho.voz}`} role="status" className="animate-pop absolute bottom-[88%] left-1/2 grid size-[52%] -translate-x-1/2 place-items-center rounded-full border-3 border-nino-azul bg-white text-[2cqw]">
          <span aria-hidden="true">{dicho.emoji}</span>
        </span>
      )}
      {miembro.mia && !dicho && <span aria-hidden="true" className="parque-yo absolute bottom-[92%] left-1/2" />}
      <span aria-hidden="true" className="monito-sombra absolute bottom-[2%] left-1/2 h-[10%] w-[58%] -translate-x-1/2 rounded-[50%]" />
      {/* Tocar a un compañero dice su nombre; el propio no tapa el pasto. */}
      <div
        {...(miembro.mia ? {} : voz)}
        onClick={miembro.mia ? undefined : () => hablar(miembro.nombre, { respaldo: '¡Hola!' })}
        className={`relative ${miembro.mia ? '' : 'pointer-events-auto'} ${caminando ? (conPiernas ? 'monito-camina' : 'monito-desliza') : ''} ${juego ? `juega-${juego.tipo} juega-puesto-${juego.puesto}` : ''}`}
      >
        <div style={{ transform: `scaleX(${mirada})` }}>
          {conPiernas ? (
            <div className="relative">
              <DibujoPersonaje personaje={personaje} color={miembro.color} className="monito-parte-arriba relative" />
              <DibujoPersonaje personaje={personaje} color={miembro.color} className="monito-pierna-izq absolute inset-0" />
              <DibujoPersonaje personaje={personaje} color={miembro.color} className="monito-pierna-der absolute inset-0" />
            </div>
          ) : (
            <DibujoPersonaje personaje={personaje} color={miembro.color} />
          )}
        </div>
      </div>
      <span
        className={`absolute top-[97%] left-1/2 -translate-x-1/2 rounded-full px-[0.5cqw] text-[1.25cqw] leading-tight font-bold whitespace-nowrap ${miembro.mia ? 'bg-nino-amarillo' : 'bg-white/90 opacity-0 group-hover:opacity-100'}`}
        style={{ transition: 'opacity 0.15s' }}
      >
        {miembro.nombre}
      </span>
    </div>
  )
}

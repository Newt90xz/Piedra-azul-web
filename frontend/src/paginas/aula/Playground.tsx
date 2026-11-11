import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type Ref } from 'react'
import { PICTOS_MENSAJE, pictoMensaje, type PictoMensaje } from '../../contenido/mensajes.ts'
import {
  ASPECTO,
  BALANCIN,
  COLUMPIO,
  DECORADO,
  INICIO_PELOTA,
  JUEGOS_PARQUE,
  capaDe,
  dentroDelMapa,
  escalaEn,
  juegoEn,
  profundidad,
  puestoLibre,
  rutaEntre,
  type JuegoParque,
  type Punto,
} from '../../contenido/parque.ts'
import { RADIO_PELOTA, moverPelota, pelotaEn, quieta, type Pie } from '../../contenido/pelota.ts'
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
// tocarlos: nada que leer ni escribir, y nada que moderar. El columpio y el
// balancín se mueven con quien juega en ellos, y la pelota rueda si la patean.

const REFRESCO_MS = 5000
const VELOCIDAD = 14 // % del mapa por segundo, a tamaño normal
const BURBUJA_MS = 3500
const PASO_TECLA = 6
const PICTOS_POR_PAGINA = 4
const SOBRE_TODO = 2000
// Ancho del niño a escala 1, en % del mapa.
const ANCHO_NINO = 6.2
// Más rápido que esto no se camina: es alguien que apareció o saltó de lugar, y no patea.
const PASO_MAXIMO = 60

const imagen = (n: string) => `${import.meta.env.BASE_URL}parque/${n}.svg`
const inicioAlAzar = (): Punto => ({ x: 30 + Math.random() * 36, y: 62 + Math.random() * 6 })

// El niño, las cadenas, el asiento y la tabla empiezan a moverse en momentos
// distintos. Adelantar cada animación según el reloj común deja a todas las
// que duran lo mismo al mismo compás. Se pone una vez, al empezar, justo antes
// de pintar (React no toca el retraso).
function useCompas<T extends HTMLElement>(activo: unknown, ms: number) {
  const nodo = useRef<T>(null)
  useLayoutEffect(() => {
    if (nodo.current) nodo.current.style.animationDelay = activo ? `${-(performance.now() % (2 * ms))}ms` : ''
  }, [activo, ms])
  return nodo
}

const vaiven = (m: { grados: number; ms: number }) => ({ '--grados': `${m.grados}deg`, animationDuration: `${m.ms}ms` })

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
  // Qué puesto usa cada niño ('columpio:0'): el columpio y el balancín se
  // mueven solo con alguien encima.
  const [jugando, setJugando] = useState<Record<string, string>>({})
  // Dónde pisa cada niño, cuadro a cuadro: con esto patean la pelota.
  const [pies] = useState(() => new Map<string, Punto>())
  const anotarJuego = useCallback((ficha: string, puesto: string) => setJugando((j) => ((j[ficha] ?? '') === puesto ? j : { ...j, [ficha]: puesto })), [])

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
            <Juego
              key={j.id}
              juego={j}
              ocupados={Object.values(jugando).flatMap((c) => (c.startsWith(`${j.id}:`) ? [Number(c.split(':')[1])] : []))}
              alTocar={() => tocarJuego(j)}
            />
          ))}
          <Pelota pies={pies} reducido={reducido} />
          {miembros
            ?.filter((m) => !m.mia)
            .flatMap((m) => {
              const p = otros.find((o) => o.ficha === m.ficha)
              return p
                ? [<Monito key={m.ficha} miembro={m} destino={p} picto={dichos[m.ficha]} reducido={reducido} pies={pies} alJugar={anotarJuego} />]
                : []
            })}
          <Monito miembro={propio} destino={yo} picto={dichos.yo} reducido={reducido} alLlegar={alLlegar} pies={pies} alJugar={anotarJuego} />
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

// Un dibujo del juego, o una pieza suya que calza encima (mismo tamaño), corrida `dx`.
function Dibujo({
  juego,
  img,
  capa = 0,
  dx = 0,
  className = '',
  style,
  ref,
}: {
  juego: JuegoParque
  img: string
  capa?: number
  dx?: number
  className?: string
  style?: CSSProperties
  ref?: Ref<HTMLImageElement>
}) {
  return (
    <img
      ref={ref}
      src={imagen(img)}
      alt=""
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-[97%] ${className}`}
      style={{ left: `${juego.x + dx}%`, top: `${juego.y}%`, width: `${juego.ancho}%`, zIndex: capaDe(juego) + capa, ...style }}
    />
  )
}

// Cadenas y asiento de un puesto del columpio: se mecen solo con alguien sentado.
// Las cadenas van detrás del niño (que va en la capa 2) y el asiento delante.
function AsientoColumpio({ juego, puesto, ocupado }: { juego: JuegoParque; puesto: number; ocupado: boolean }) {
  const cadenas = useCompas<HTMLImageElement>(ocupado, COLUMPIO.ms)
  const asiento = useCompas<HTMLImageElement>(ocupado, COLUMPIO.ms)
  const dx = juego.puestos[puesto].x - juego.puestos[0].x
  const clase = `columpio-pieza ${ocupado ? 'mece' : ''}`
  const estilo = vaiven(COLUMPIO) as CSSProperties
  return (
    <>
      <Dibujo ref={cadenas} juego={juego} img="columpio_cadenas" capa={1} dx={dx} className={clase} style={estilo} />
      <Dibujo ref={asiento} juego={juego} img="columpio_asiento" capa={3} dx={dx} className={clase} style={estilo} />
    </>
  )
}

// La tabla del balancín: delante de los niños (capa 1), que la montan a horcajadas.
function TablaBalancin({ juego, ocupado }: { juego: JuegoParque; ocupado: boolean }) {
  const tabla = useCompas<HTMLImageElement>(ocupado, BALANCIN.ms)
  return (
    <Dibujo
      ref={tabla}
      juego={juego}
      img="balancin_tabla"
      capa={2}
      className={`balancin-tabla ${ocupado ? 'mece' : ''}`}
      style={{ ...vaiven(BALANCIN), '--reposo': `${BALANCIN.reposo}deg` } as CSSProperties}
    />
  )
}

function Juego({ juego, ocupados, alTocar }: { juego: JuegoParque; ocupados: number[]; alTocar: () => void }) {
  const voz = useVozAlApuntar(juego.voz)
  return (
    <>
      <Dibujo juego={juego} img={juego.img} />
      {juego.id === 'columpio' && juego.puestos.map((_, k) => <AsientoColumpio key={k} juego={juego} puesto={k} ocupado={ocupados.includes(k)} />)}
      {juego.id === 'balancin' && <TablaBalancin juego={juego} ocupado={ocupados.length > 0} />}
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

const ubicar = (p: Punto) => `translate(calc(${p.x}cqw - 50%), calc(${p.y}cqh - 100%)) scale(${escalaEn(p.y)})`

const pintar = (el: HTMLElement, p: Punto) => {
  el.style.transform = ubicar(p)
  el.style.zIndex = String(profundidad(p))
}

// Cómo se mueve el niño en el columpio o el balancín para ir pegado a su puesto.
// Lo que se mide en el mapa se divide por su escala: el dibujo se achica después.
function pose(juego: JuegoParque, p: Punto): CSSProperties | undefined {
  const eje = juego.eje
  if (!eje) return undefined
  const escala = escalaEn(p.y)
  // Cuánto más arriba que sus pies está la barra de la que cuelga.
  if (juego.id === 'columpio') return { ...vaiven(COLUMPIO), '--cuerda': `${(p.y - eje.y) / escala}cqh` } as CSSProperties
  // Cuánto se aleja del perno: tanto sube o baja su punta de la tabla.
  if (juego.id === 'balancin') {
    return { ...vaiven(BALANCIN), '--reposo': `${BALANCIN.reposo}deg`, '--brazo': `${(p.x - eje.x) / ASPECTO / escala}cqh` } as CSSProperties
  }
  return undefined
}

// Con vestido, cola, vehículo o silla no hay dos piernas que mover: se balancea entero.
const tienePiernas = (p: Personaje) =>
  !p.puestos.vehiculo && !p.apoyos.includes('silla_ruedas') && !['vestido_princesa', 'vestido_estrellas', 'cola_sirena'].includes(articulo(p.puestos.traje)?.id ?? '')

function Monito({
  miembro,
  destino,
  picto,
  reducido,
  alLlegar,
  pies,
  alJugar,
}: {
  miembro: MiembroParque
  destino: Punto
  picto?: string
  reducido: boolean
  alLlegar?: () => void
  pies: Map<string, Punto>
  alJugar: (ficha: string, puesto: string) => void
}) {
  const nodo = useRef<HTMLDivElement>(null)
  const actual = useRef(destino)
  // La posición la lleva cuadro a cuadro el efecto de abajo, sin pasar por React.
  const [inicial] = useState(() => ({ transform: ubicar(destino), zIndex: profundidad(destino) }))
  const [caminando, setCaminando] = useState(false)
  const [mirada, setMirada] = useState(1)
  const [llegado, setLlegado] = useState(destino)
  const voz = useVozAlApuntar(miembro.nombre)
  const avisar = useRef(alLlegar)
  useEffect(() => {
    avisar.current = alLlegar
  })

  const { ficha } = miembro
  useEffect(() => {
    pies.set(ficha, actual.current)
    return () => {
      pies.delete(ficha)
    }
  }, [pies, ficha])

  const { x, y } = destino
  useEffect(() => {
    const el = nodo.current
    if (!el) return
    const objetivo = { x, y }
    if (reducido) {
      actual.current = objetivo
      pintar(el, objetivo)
      pies.set(ficha, objetivo)
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
      pies.set(ficha, actual.current)
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
  }, [x, y, reducido, pies, ficha])

  const personaje = miembro.personaje ?? personajePorDefecto(miembro.nombre)
  const dicho = picto ? pictoMensaje(picto) : undefined
  const juego = !caminando ? juegoEn(llegado) : null
  const conPiernas = caminando && tienePiernas(personaje)
  const puesto = juego ? `${juego.tipo}:${juego.puesto}` : ''
  // Avisa dónde juega para que el columpio o el balancín se muevan con él.
  useEffect(() => {
    alJugar(ficha, puesto)
    return () => alJugar(ficha, '')
  }, [alJugar, ficha, puesto])
  const meneo = useCompas<HTMLDivElement>(juego?.juego.eje && puesto, juego?.tipo === 'columpio' ? COLUMPIO.ms : BALANCIN.ms)

  return (
    <div ref={nodo} className="group pointer-events-none absolute top-0 left-0 origin-bottom" style={{ ...inicial, width: `${ANCHO_NINO}cqw` }}>
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
        onClick={miembro.mia ? undefined : () => hablar(miembro.nombre)}
        className={`relative ${miembro.mia ? '' : 'pointer-events-auto'} ${caminando ? (conPiernas ? 'monito-camina' : 'monito-desliza') : ''} ${juego ? `juega-${juego.tipo} juega-puesto-${juego.puesto}` : ''}`}
        ref={meneo}
        style={juego ? pose(juego.juego, llegado) : undefined}
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

// La pelota: la física está en pelota.ts; aquí se le pasa dónde pisa cada niño y
// a qué velocidad va, y se dibuja cuadro a cuadro sin pasar por React. Cada
// pantalla la mueve por su cuenta con los niños que ve.
function Pelota({ pies, reducido }: { pies: Map<string, Punto>; reducido: boolean }) {
  const nodo = useRef<HTMLDivElement>(null)
  const bola = useRef<HTMLDivElement>(null)
  const sombra = useRef<HTMLSpanElement>(null)
  const [inicial] = useState(() => ({ transform: ubicar(INICIO_PELOTA), zIndex: capaDe(INICIO_PELOTA) + 1 }))

  useEffect(() => {
    let pelota = pelotaEn(INICIO_PELOTA)
    const antes = new Map<string, Punto>()
    let previo = performance.now()
    let cuadro = 0
    const paso = (ahora: number) => {
      const dt = Math.min(0.05, Math.max(0, (ahora - previo) / 1000))
      previo = ahora
      const lista: Pie[] = []
      for (const [ficha, p] of pies) {
        const a = antes.get(ficha) ?? p
        antes.set(ficha, p)
        let vx = dt > 0 ? (p.x - a.x) / dt : 0
        let vy = dt > 0 ? ((p.y - a.y) * ASPECTO) / dt : 0
        // Con animaciones reducidas solo se corre del camino, sin salir rodando.
        if (reducido || Math.hypot(vx, vy) > PASO_MAXIMO) vx = vy = 0
        lista.push({ x: p.x, y: p.y, vx, vy })
      }
      const antesDelPaso = pelota
      pelota = moverPelota(pelota, lista, dt)
      if (reducido) pelota = { ...pelota, vx: 0, vy: 0, alto: 0, vAlto: 0 }
      const el = nodo.current
      if (el && !(quieta(pelota) && quieta(antesDelPaso) && pelota.x === antesDelPaso.x && pelota.y === antesDelPaso.y)) {
        const escala = escalaEn(pelota.y)
        el.style.transform = ubicar(pelota)
        el.style.zIndex = String(capaDe(pelota) + 1)
        // Sube sin mover la sombra, que se achica mientras más alto va.
        if (bola.current) bola.current.style.transform = `translateY(${-pelota.alto / escala}cqw) rotate(${pelota.giro}deg)`
        if (sombra.current) sombra.current.style.transform = `scale(${1 / (1 + pelota.alto * 0.5)})`
      }
      cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [pies, reducido])

  return (
    <div ref={nodo} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 origin-bottom" style={{ ...inicial, width: `${RADIO_PELOTA * 2}cqw` }}>
      <span ref={sombra} className="monito-sombra absolute -bottom-[12%] left-1/2 h-[28%] w-[95%] -translate-x-1/2 rounded-[50%]" />
      <div ref={bola}>
        <svg viewBox="0 0 100 100" className="block">
          <circle cx="50" cy="50" r="44" fill="#fff" stroke="#4a3f55" strokeWidth="6" />
          <path d="M50 30 L69 44 L62 66 L38 66 L31 44Z" fill="#4a3f55" />
          <path d="M50 30 L50 8 M69 44 L90 37 M62 66 L75 85 M38 66 L25 85 M31 44 L10 37" stroke="#4a3f55" strokeWidth="5" />
        </svg>
      </div>
    </div>
  )
}

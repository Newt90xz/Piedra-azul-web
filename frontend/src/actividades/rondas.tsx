import { useState, type CSSProperties } from 'react'
import type { Opcion, Ronda } from '../contenido/actividades.ts'
import { fonemaDe } from '../contenido/banco.ts'
import { hablar } from '../lib/audio.ts'
import { Icono } from '../ui/Icono.tsx'
import { BotonNino, ImagenNino, useVozAlApuntar } from '../ui/nino.tsx'

interface PropsRonda<T extends Ronda['tipo']> {
  ronda: Extract<Ronda, { tipo: T }>
  resuelta: boolean
  revelar: boolean
  // `respuesta`: lo que eligió si se equivocó, para el registro de errores.
  alIntentar: (correcto: boolean, respuesta?: string) => void
}

export function RondaActual({ ronda, ...resto }: Omit<PropsRonda<Ronda['tipo']>, 'ronda'> & { ronda: Ronda }) {
  switch (ronda.tipo) {
    case 'elegir':
      return <RondaElegir ronda={ronda} {...resto} />
    case 'construir':
      return <RondaConstruir ronda={ronda} {...resto} />
    case 'aplausos':
      return <RondaAplausos ronda={ronda} {...resto} />
    case 'explorar':
      return <RondaExplorar ronda={ronda} {...resto} />
    case 'choque':
      return <RondaChoque ronda={ronda} {...resto} />
  }
}

const tile = 'tarjeta-nino grid place-items-center rounded-3xl border-3 font-bold'
const normal = 'border-nino-azul bg-white'
const MAYUS = (s: string) => s.toUpperCase()

// ---------- Elegir una opción (sonido inicial, caza de letras, sílaba inicial, ¿qué dice?, completar) ----------

function RondaElegir({ ronda, resuelta, revelar, alIntentar }: PropsRonda<'elegir'>) {
  const [descartadas, setDescartadas] = useState<string[]>([])
  const [sacudir, setSacudir] = useState<string | null>(null)
  const { estimulo } = ronda

  const tocar = (o: Opcion) => {
    if (resuelta || descartadas.includes(o.id)) return
    if (o.id === ronda.correctaId) return alIntentar(true)
    setDescartadas((d) => [...d, o.id])
    setSacudir(o.id)
    window.setTimeout(() => setSacudir(null), 450)
    alIntentar(false, o.texto ?? o.audio)
  }

  const conImagen = ronda.opciones.some((o) => o.imagen)

  return (
    <div className="grid justify-items-center gap-10">
      {!estimulo.silabas && (estimulo.audio || estimulo.texto || estimulo.imagen) && <Estimulo ronda={ronda} resuelta={resuelta} />}
      {estimulo.silabas && (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {estimulo.imagen && <ImagenNino imagen={estimulo.imagen} className="text-[4em]" />}
          {estimulo.texto && <span className={`${tile} ${normal} min-w-[2.6em] px-6 py-2 text-[3em]`}>{estimulo.texto}</span>}
          {estimulo.silabas.map((s, i) =>
            i === estimulo.hueco ? (
              <span key={i} className={`${tile} min-h-[2.4em] min-w-[3em] px-4 text-[1.6em] ${resuelta ? 'animate-pop border-nino-ok bg-nino-menta' : 'border-dashed border-nino-borde bg-white'}`}>
                {resuelta ? s : ''}
              </span>
            ) : (
              <SilabaTocable key={i} silaba={s} />
            ),
          )}
        </div>
      )}
      <div
        className={`grid w-full gap-6 ${ronda.opciones.length === 2 ? 'max-w-2xl' : 'max-w-4xl'}`}
        style={{ gridTemplateColumns: `repeat(${ronda.opciones.length}, minmax(0, 1fr))` }}
      >
        {ronda.opciones.map((o, i) => {
          const correcta = o.id === ronda.correctaId
          const descartada = descartadas.includes(o.id)
          return (
            <span key={o.id} className="animate-aparecer relative" style={{ animationDelay: `${i * 90}ms`, animationFillMode: 'backwards' }}>
              <BotonNino
                voz={o.audio}
                disabled={descartada || resuelta}
                onClick={() => tocar(o)}
                className={`grid w-full place-items-center p-4 ${conImagen ? 'min-h-[5.2em]' : 'min-h-[3.6em]'} ${descartada ? 'opacity-35 grayscale' : ''} ${
                  sacudir === o.id ? 'animate-sacudir' : ''
                } ${resuelta && correcta ? 'animate-pop border-nino-ok bg-nino-menta' : ''} ${revelar && correcta ? 'revelada border-[#e6c84d] bg-nino-amarillo' : ''}`}
              >
                {o.imagen ? <ImagenNino imagen={o.imagen} className="text-[3.4em]" /> : <span className="text-[2em] font-bold">{o.texto}</span>}
              </BotonNino>
              {resuelta && correcta && (
                <span aria-hidden="true" className="chispas pointer-events-none absolute inset-0">
                  {['✨', '⭐', '✨', '⭐'].map((c, k) => (
                    <span key={k} style={{ '--k': k } as CSSProperties}>
                      {c}
                    </span>
                  ))}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Lo que se pregunta: una imagen, una letra o sílaba, o solo un sonido. Se toca
// para escucharlo otra vez (sin depender de la lectura).
function Estimulo({ ronda, resuelta }: { ronda: Extract<Ronda, { tipo: 'elegir' }>; resuelta: boolean }) {
  const { estimulo } = ronda
  const voz = useVozAlApuntar(estimulo.audio ?? '')
  const contenido = estimulo.imagen ? (
    <ImagenNino imagen={estimulo.imagen} className="text-[4.2em]" />
  ) : estimulo.texto ? (
    <span className="text-[3em] font-bold">{estimulo.texto}</span>
  ) : (
    <span aria-hidden="true" className="estimulo-oreja text-[3.4em] leading-none">👂</span>
  )
  const clase = `${tile} relative min-h-[3.4em] min-w-[3.4em] px-8 py-4 ${resuelta ? 'animate-pop border-nino-ok bg-nino-menta' : 'border-nino-azul bg-white'}`
  if (!estimulo.audio) return <span className={clase}>{contenido}</span>
  return (
    <button {...voz} onClick={() => hablar(estimulo.audio!)} aria-label={`Escuchar: ${estimulo.audio}`} className={`${clase} hover:-translate-y-1`}>
      {contenido}
      <span aria-hidden="true" className="absolute -right-3 -bottom-3 grid size-12 place-items-center rounded-full border-3 border-nino-ok bg-nino-menta text-[0.6em]">
        🔊
      </span>
    </button>
  )
}

function SilabaTocable({ silaba }: { silaba: string }) {
  const voz = useVozAlApuntar(silaba.toLowerCase())
  return (
    <button {...voz} onClick={() => hablar(silaba.toLowerCase())} className={`${tile} ${normal} min-h-[2.4em] min-w-[3em] px-4 text-[1.6em]`} aria-label={`Escuchar ${silaba}`}>
      {silaba}
    </button>
  )
}

// ---------- Constructor de palabras ----------

function RondaConstruir({ ronda, resuelta, revelar, alIntentar }: PropsRonda<'construir'>) {
  const { palabra } = ronda
  const [usadas, setUsadas] = useState<number[]>([])
  const [sacudir, setSacudir] = useState<number | null>(null)
  const colocadas = usadas.map((i) => ronda.fichas[i])
  const siguiente = palabra.silabas[colocadas.length]

  const tocar = (ficha: string, i: number) => {
    if (resuelta || usadas.includes(i)) return
    hablar(ficha)
    if (ficha !== siguiente) {
      setSacudir(i)
      window.setTimeout(() => setSacudir(null), 450)
      return alIntentar(false, MAYUS(ficha))
    }
    const nuevas = [...usadas, i]
    setUsadas(nuevas)
    if (nuevas.length === palabra.silabas.length) alIntentar(true)
  }

  return (
    <div className="grid justify-items-center gap-8">
      <ImagenNino imagen={palabra.imagen} className={`text-[4.5em] ${resuelta ? 'animate-pop' : ''}`} />
      <div className={`flex gap-3 rounded-3xl p-2 ${resuelta ? 'animate-pop bg-nino-menta' : ''}`}>
        {palabra.silabas.map((_, i) => (
          <span key={i} className={`${tile} min-h-[2.4em] min-w-[3.2em] px-4 text-[1.6em] ${colocadas[i] ? 'border-nino-ok bg-nino-menta' : 'border-dashed border-nino-borde bg-white'}`}>
            {colocadas[i] ? MAYUS(colocadas[i]) : ''}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-5 rounded-3xl bg-nino-lila p-5">
        {ronda.fichas.map((f, i) => (
          <BotonNino
            key={i}
            voz={f}
            disabled={usadas.includes(i) || resuelta}
            onClick={() => tocar(f, i)}
            className={`min-h-[2.4em] min-w-[3.4em] px-5 text-[1.6em] font-bold ${usadas.includes(i) ? 'invisible' : ''} ${sacudir === i ? 'animate-sacudir' : ''} ${
              revelar && f === siguiente ? 'border-[#e6c84d] bg-nino-amarillo' : ''
            }`}
          >
            {MAYUS(f)}
          </BotonNino>
        ))}
      </div>
    </div>
  )
}

// ---------- Aplausos silábicos ----------

function RondaAplausos({ ronda, resuelta, revelar, alIntentar }: PropsRonda<'aplausos'>) {
  const { palabra } = ronda
  const [encendidas, setEncendidas] = useState(0)
  const [descartadas, setDescartadas] = useState<number[]>([])
  const total = palabra.silabas.length

  const aplaudir = () => {
    const n = encendidas >= total ? 1 : encendidas + 1
    setEncendidas(n)
    hablar(palabra.silabas[n - 1])
  }

  const responder = (n: number) => {
    if (resuelta || descartadas.includes(n)) return
    if (n === total) return alIntentar(true)
    setDescartadas((d) => [...d, n])
    alIntentar(false, String(n))
  }

  return (
    <div className="grid justify-items-center gap-8">
      <ImagenNino imagen={palabra.imagen} className="text-[4.5em]" />
      <div className="flex gap-4">
        {palabra.silabas.map((s, i) => (
          <BotonNino
            key={i}
            voz="Aplaudir"
            onClick={aplaudir}
            className={`grid size-[2.8em] place-items-center rounded-full text-[1.4em] ${i < encendidas ? 'animate-pop border-nino-ok bg-nino-menta' : ''}`}
          >
            <span aria-hidden="true">{i < encendidas ? MAYUS(s) : '👏'}</span>
          </BotonNino>
        ))}
      </div>
      <div className="grid w-full max-w-3xl grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((n) => (
          <BotonNino
            key={n}
            voz={String(n)}
            disabled={descartadas.includes(n) || resuelta}
            onClick={() => responder(n)}
            className={`grid min-h-[3em] place-items-center gap-1 py-3 ${descartadas.includes(n) ? 'opacity-35' : ''} ${resuelta && n === total ? 'animate-pop border-nino-ok bg-nino-menta' : ''} ${
              revelar && n === total ? 'border-[#e6c84d] bg-nino-amarillo' : ''
            }`}
          >
            <span className="text-[1.5em] font-bold">{n}</span>
            <span aria-hidden="true" className="flex gap-1">
              {Array.from({ length: n }, (_, k) => (
                <span key={k} className="size-3 rounded-full bg-nino-tinta/70" />
              ))}
            </span>
          </BotonNino>
        ))}
      </div>
    </div>
  )
}

// ---------- Explorar el sonido (RF-04, RF-19) ----------

function RondaExplorar({ ronda, resuelta, alIntentar }: PropsRonda<'explorar'>) {
  const [escuchada, setEscuchada] = useState(false)

  const tocar = () => {
    setEscuchada(true)
    hablar(ronda.fonema, { alTerminar: () => window.setTimeout(() => hablar(ronda.ejemplo.texto), 300) })
  }

  return (
    <div className="grid justify-items-center gap-8">
      <BotonNino voz={ronda.fonema} onClick={tocar} className="grid size-[4.5em] place-items-center text-[2.2em] font-bold">
        {ronda.grafema}
      </BotonNino>
      {escuchada && (
        <div className="animate-aparecer flex flex-wrap items-center justify-center gap-8">
          <span className="flex flex-col items-center gap-2 rounded-3xl bg-white p-5">
            <ImagenNino imagen={ronda.ejemplo.imagen} className="text-[3.5em]" />
            <span className="text-[0.9em] font-bold">{ronda.ejemplo.texto}</span>
          </span>
          {/* RF-19: marcador hasta tener la ilustración de labios y lengua. */}
          <span className="flex max-w-xs items-center gap-3 rounded-3xl bg-nino-lila p-5 font-sans text-base">
            <span aria-hidden="true" className="text-5xl">👄</span>
            {ronda.apoyo}
          </span>
        </div>
      )}
      {escuchada && !resuelta && <Siguiente alTocar={() => alIntentar(true)} />}
    </div>
  )
}

// ---------- El choque de sonidos (RF-05) ----------

function RondaChoque({ ronda, resuelta, alIntentar }: PropsRonda<'choque'>) {
  const [fase, setFase] = useState<'separadas' | 'juntando' | 'unidas'>('separadas')
  const silaba = MAYUS(ronda.consonante + ronda.vocal)

  const juntar = () => {
    if (fase !== 'separadas') return
    setFase('juntando')
    hablar(`${fonemaDe(ronda.consonante)}${fonemaDe(ronda.vocal)}… ${ronda.consonante + ronda.vocal}`)
    window.setTimeout(() => setFase('unidas'), 1100)
  }

  return (
    <div className="grid justify-items-center gap-10">
      <div className="flex h-[3em] items-center justify-center gap-[3em] text-[2.4em]">
        {fase === 'unidas' ? (
          <span className={`${tile} animate-pop h-full border-nino-ok bg-nino-menta px-8`}>{silaba}</span>
        ) : (
          <>
            <span className={`${tile} ${normal} h-full w-[2.2em] transition-transform duration-1000`} style={{ transform: fase === 'juntando' ? 'translateX(1.6em)' : undefined }}>
              {MAYUS(ronda.consonante)}
            </span>
            <span className={`${tile} ${normal} h-full w-[2.2em] transition-transform duration-1000`} style={{ transform: fase === 'juntando' ? 'translateX(-1.6em)' : undefined }}>
              {MAYUS(ronda.vocal)}
            </span>
          </>
        )}
      </div>
      {fase === 'separadas' && (
        <BotonNino voz="Juntar" onClick={juntar} className="grid size-[3.4em] place-items-center rounded-full border-nino-ok bg-nino-menta text-[1.6em]">
          <span aria-hidden="true">💥</span>
        </BotonNino>
      )}
      {fase === 'unidas' && !resuelta && <Siguiente alTocar={() => alIntentar(true)} />}
    </div>
  )
}

function Siguiente({ alTocar }: { alTocar: () => void }) {
  return (
    <BotonNino voz="Siguiente" onClick={alTocar} className="grid size-24 place-items-center border-nino-ok bg-nino-menta">
      <Icono nombre="derecha" className="size-12" />
    </BotonNino>
  )
}

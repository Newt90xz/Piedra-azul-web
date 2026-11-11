import { useEffect, useState, type CSSProperties } from 'react'
import type { Opcion, Ronda } from '../contenido/actividades.ts'
import { hablar } from '../lib/audio.ts'
import { enFrase } from '../lib/textoVoz.ts'
import { Icono } from '../ui/Icono.tsx'
import { BotonNino, ImagenNino } from '../ui/nino.tsx'

interface PropsRonda<T extends Ronda['tipo']> {
  ronda: Extract<Ronda, { tipo: T }>
  resuelta: boolean
  revelar: boolean
  errores: number
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
    case 'choque':
      return <RondaChoque ronda={ronda} {...resto} />
    case 'escribir':
      return <RondaEscribir ronda={ronda} {...resto} />
    case 'globos':
      return <RondaGlobos ronda={ronda} {...resto} />
    case 'marcar':
      return <RondaMarcar ronda={ronda} {...resto} />
  }
}

const tile = 'tarjeta-nino grid place-items-center rounded-3xl border-3 font-bold'
const normal = 'border-nino-azul bg-white'
const MAYUS = (s: string) => s.toUpperCase()

// ---------- Elegir una opción (sonido inicial, caza de letras, sílaba inicial, ¿qué dice?, completar) ----------

function RondaElegir({ ronda, resuelta, revelar, errores, alIntentar }: PropsRonda<'elegir'>) {
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
  const palabraVisible = errores > 0
  const silabaOculta = silabaObjetivo(ronda.item)
  const silabaDeImagen = estimulo.silabas ? ronda.correctaId : silabaOculta

  return (
    <div className="grid justify-items-center gap-10">
      {!estimulo.silabas && (estimulo.audio || estimulo.texto || estimulo.imagen) && (
        <Estimulo ronda={ronda} resuelta={resuelta} palabraVisible={palabraVisible} silabaOculta={resuelta ? undefined : silabaDeImagen} />
      )}
      {estimulo.silabas && (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {estimulo.imagen && (
            <span className="tarjeta-nino flex min-w-0 items-center justify-center rounded-3xl border-3 border-nino-azul bg-white px-4 py-2">
              <PictogramaPalabra
                imagen={estimulo.imagen}
                palabraVisible={palabraVisible}
                silabaOculta={resuelta ? undefined : silabaDeImagen}
                className="estimulo-imagen-pictograma"
              />
            </span>
          )}
          {estimulo.texto && <span className={`${tile} ${normal} min-w-[2.6em] px-6 py-2 text-[3em]`}>{estimulo.texto}</span>}
          {estimulo.silabas.map((s, i) =>
            i === estimulo.hueco ? (
              <span key={i} className={`${tile} min-h-[2.4em] min-w-[3em] px-4 text-[1.6em] ${resuelta ? 'animate-pop border-nino-ok bg-nino-menta' : revelar ? 'border-[#e6c84d] bg-nino-amarillo' : 'border-dashed border-nino-borde bg-white'}`}>
                {resuelta || revelar ? s : ''}
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
                leerAlApuntar={false}
                disabled={descartada || resuelta}
                onClick={() => tocar(o)}
                className={`grid w-full place-items-center p-4 ${conImagen ? 'min-h-[5.2em]' : 'min-h-[3.6em]'} ${descartada ? 'opacity-35 grayscale' : ''} ${
                  sacudir === o.id ? 'animate-sacudir' : ''
                } ${resuelta && correcta ? 'animate-pop border-nino-ok bg-nino-menta' : ''} ${revelar && correcta ? 'revelada border-[#e6c84d] bg-nino-amarillo' : ''}`}
              >
                {o.imagen ? (
                  <span className="grid justify-items-center gap-1">
                    <ImagenNino imagen={o.imagen} className="text-[3.4em]" />
                    {palabraVisible && (
                      <span className="animate-aparecer text-[0.8em] leading-tight font-bold">
                        {resuelta ? MAYUS(o.audio) : censurarSilaba(o.audio, silabaOculta)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-[2em] font-bold">{o.texto}</span>
                )}
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


function silabaObjetivo(item: string) {
  const silaba = item.startsWith('-') ? item.slice(1) : item
  return [...silaba].length <= 2 && /^[a-záéíóúüñ]+$/i.test(silaba) ? item : undefined
}

function censurarSilaba(texto: string, objetivo?: string) {
  const letras = [...MAYUS(texto)]
  const silaba = objetivo?.replace(/^-/, '')
  const objetivoLetras = silaba ? [...MAYUS(silaba)] : []
  if (!objetivoLetras.length || objetivoLetras.length > letras.length) return letras.join('')

  const plegar = (letra: string) => letra.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  const coincideEn = (inicio: number) => objetivoLetras.every((letra, indice) => plegar(letras[inicio + indice]) === plegar(letra))
  const inicio = objetivo?.startsWith('-')
    ? letras.length - objetivoLetras.length
    : letras.findIndex((_, indice) => indice <= letras.length - objetivoLetras.length && coincideEn(indice))

  if (inicio < 0 || !coincideEn(inicio)) return letras.join('')
  letras.splice(inicio, objetivoLetras.length, ...Array.from({ length: objetivoLetras.length }, () => '█'))
  return letras.join('')
}

// Lo que se pregunta: una imagen, una letra o sílaba, o solo un sonido. Se toca
// para escucharlo otra vez (sin depender de la lectura).
function Estimulo({
  ronda,
  resuelta,
  palabraVisible,
  silabaOculta,
}: {
  ronda: Extract<Ronda, { tipo: 'elegir' }>
  resuelta: boolean
  palabraVisible: boolean
  silabaOculta?: string
}) {
  const { estimulo } = ronda
  const soloAudio = !estimulo.imagen && !estimulo.texto
  const contenido = estimulo.imagen ? (
    <PictogramaPalabra
      imagen={estimulo.imagen}
      palabraVisible={palabraVisible}
      silabaOculta={silabaOculta}
      className="estimulo-imagen-pictograma"
    />
  ) : estimulo.texto ? (
    <span className="text-[3em] font-bold">{estimulo.texto}</span>
  ) : (
    <img src={`${import.meta.env.BASE_URL}imagenes/escuchar.png`} alt="Escuchar" className="size-[7.4em] object-contain" />
  )
  const clase = `${tile} relative ${soloAudio ? 'min-h-[3.6em] min-w-[3.6em] px-2 py-2' : 'min-h-[3.4em] min-w-[3.4em] px-8 py-4'} ${resuelta ? 'animate-pop border-nino-ok bg-nino-menta' : 'border-nino-azul bg-white'}`
  if (!estimulo.audio) return <span className={clase}>{contenido}</span>
  return (
    <button onClick={() => hablar(enFrase(estimulo.audio!))} aria-label={`Escuchar: ${estimulo.audio}`} className={`${clase} hover:-translate-y-1`}>
      {contenido}
      <span aria-hidden="true" className={`absolute ${soloAudio ? '-right-2 -bottom-2 size-9 border-2 text-[0.5em]' : '-right-3 -bottom-3 size-12 border-3 text-[0.6em]'} grid place-items-center rounded-full border-nino-ok bg-nino-menta`}>
        🔊
      </span>
    </button>
  )
}

function PictogramaPalabra({
  imagen,
  palabraVisible,
  silabaOculta,
  className,
}: {
  imagen: NonNullable<Extract<Ronda, { tipo: 'elegir' }>['estimulo']['imagen']>
  palabraVisible: boolean
  silabaOculta?: string
  className: string
}) {
  return (
    <span className={`estimulo-imagen ${palabraVisible ? 'estimulo-imagen-expandido' : 'estimulo-imagen-compacto'}`}>
      <ImagenNino imagen={imagen} className={`shrink-0 object-contain ${className}`} />
      <span
        aria-hidden={!palabraVisible}
        className={`estimulo-palabra min-w-0 text-center text-[1.2em] leading-tight font-bold [overflow-wrap:anywhere] ${palabraVisible ? 'estimulo-palabra-visible' : ''}`}
      >
        {palabraVisible ? censurarSilaba(imagen.alt, silabaOculta) : MAYUS(imagen.alt)}
      </span>
    </span>
  )
}

function SilabaTocable({ silaba }: { silaba: string }) {
  return (
    <button onClick={() => hablar(enFrase(silaba.toLowerCase()))} className={`${tile} ${normal} min-h-[2.4em] min-w-[3em] px-4 text-[1.6em]`} aria-label={`Escuchar ${silaba}`}>
      {silaba}
    </button>
  )
}

// ---------- Constructor de palabras ----------

function RondaConstruir({ ronda, resuelta, revelar, errores, alIntentar }: PropsRonda<'construir'>) {
  const { palabra } = ronda
  const [usadas, setUsadas] = useState<number[]>([])
  const [sacudir, setSacudir] = useState<number | null>(null)
  const colocadas = usadas.map((i) => ronda.fichas[i])
  const siguiente = palabra.silabas[colocadas.length]

  const tocar = (ficha: string, i: number) => {
    if (resuelta || usadas.includes(i)) return
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
    <div className="grid justify-items-center gap-4">
      <span className="tarjeta-nino flex min-w-0 items-center justify-center rounded-3xl border-3 border-nino-azul bg-white px-4 py-2">
        <PictogramaPalabra
          imagen={palabra.imagen}
          palabraVisible={errores > 0}
          silabaOculta={resuelta ? undefined : siguiente}
          className={`estimulo-imagen-pictograma ${resuelta ? 'animate-pop' : ''}`}
        />
      </span>
      <div className={`flex gap-3 rounded-3xl p-2 ${resuelta ? 'animate-pop bg-nino-menta' : ''}`}>
        {palabra.silabas.map((_, i) => (
          <span key={i} className={`${tile} min-h-[2.1em] min-w-[3.2em] px-4 text-[1.6em] ${colocadas[i] ? 'border-nino-ok bg-nino-menta' : 'border-dashed border-nino-borde bg-white'}`}>
            {colocadas[i] ? MAYUS(colocadas[i]) : ''}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-4 rounded-3xl bg-nino-lila p-4">
        {ronda.fichas.map((f, i) => (
          <BotonNino
            key={i}
            voz={f}
            disabled={usadas.includes(i) || resuelta}
            onClick={() => tocar(f, i)}
            className={`min-h-[2.1em] min-w-[3.4em] px-5 text-[1.6em] font-bold ${usadas.includes(i) ? 'invisible' : ''} ${sacudir === i ? 'animate-sacudir' : ''} ${
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

function RondaAplausos({ ronda, resuelta, revelar, errores, alIntentar }: PropsRonda<'aplausos'>) {
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
    <div className="grid justify-items-center gap-5">
      <span className="tarjeta-nino flex min-w-0 items-center justify-center rounded-3xl border-3 border-nino-azul bg-white px-4 py-2">
        <PictogramaPalabra
          imagen={palabra.imagen}
          palabraVisible={errores > 0}
          className="estimulo-imagen-pictograma"
        />
      </span>
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

// ---------- Conciencia léxica: marcar las tarjetas que corresponden ----------

// Como la ficha de papel: una grilla de tarjetas, cada una con su dibujo (y su
// palabra, si la lleva) y una casilla. Tocar la tarjeta la dice; tocar la casilla
// la marca con una X. Al final, el visto bueno. Si algo está mal, las marcas
// equivocadas se sacuden y se borran; las que faltan quedan para buscarlas.
function RondaMarcar({ ronda, resuelta, revelar, alIntentar }: PropsRonda<'marcar'>) {
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [sacudir, setSacudir] = useState<string[]>([])

  const alternar = (id: string) => {
    if (resuelta) return
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  }

  const revisar = () => {
    if (resuelta) return
    const malas = marcadas.filter((id) => !ronda.tarjetas.find((t) => t.id === id)?.corresponde)
    const faltan = ronda.tarjetas.filter((t) => t.corresponde && !marcadas.includes(t.id))
    if (malas.length === 0 && faltan.length === 0) return alIntentar(true)
    setSacudir(malas)
    window.setTimeout(() => {
      setSacudir([])
      setMarcadas((m) => m.filter((id) => !malas.includes(id)))
    }, 450)
    alIntentar(false, `${malas.length} mal, ${faltan.length} faltan`)
  }

  const columnas = ronda.tarjetas.length <= 4 ? 2 : ronda.tarjetas.length <= 6 ? 3 : 4

  return (
    <div className="grid justify-items-center gap-5">
      <ul className="grid w-full max-w-5xl gap-3" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {ronda.tarjetas.map((t) => {
          const marcada = marcadas.includes(t.id)
          const bien = (resuelta || revelar) && t.corresponde
          return (
            <li
              key={t.id}
              className={`tarjeta-nino relative grid justify-items-center gap-1 rounded-3xl border-3 p-2 ${sacudir.includes(t.id) ? 'animate-sacudir' : ''} ${
                resuelta && t.corresponde ? 'animate-pop border-nino-ok bg-nino-menta' : bien ? 'border-[#e6c84d] bg-nino-amarillo' : 'border-nino-azul bg-[#fde7ea]'
              }`}
            >
              <button onClick={() => hablar(t.texto ? enFrase(t.audio) : t.audio)} aria-label={`Escuchar: ${t.audio}`} className="grid justify-items-center gap-1 rounded-2xl">
                <ImagenNino imagen={t.imagen} className="size-[2.4em] text-[2.4em]" />
                {t.texto && <span className="text-[0.75em] leading-tight font-bold">{t.texto}</span>}
              </button>
              <button
                onClick={() => alternar(t.id)}
                aria-pressed={marcada}
                aria-label={marcada ? `Quitar la X de ${t.audio}` : `Marcar ${t.audio}`}
                className="absolute bottom-2 left-2 grid size-[1.6em] place-items-center rounded-lg border-3 border-nino-borde bg-white text-[1em] leading-none font-bold text-[#c0392b]"
              >
                {marcada ? '✕' : ''}
              </button>
            </li>
          )
        })}
      </ul>
      {!resuelta && (
        <BotonNino voz="Listo" disabled={marcadas.length === 0} onClick={revisar} className="grid size-20 place-items-center border-nino-ok bg-nino-menta disabled:opacity-40">
          <Icono nombre="check" className="size-10" />
        </BotonNino>
      )}
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
    hablar(ronda.consonante + ronda.vocal)
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

// ---------- Escribir la respuesta (SIEMPRE en mayúscula) ----------

// Teclado grande en pantalla con solo las letras de la ronda (el nivel de
// exigencia decide cuántas sobran). También acepta el teclado físico, siempre
// en mayúscula. Al completar los casilleros se revisa sola.
function RondaEscribir({ ronda, resuelta, revelar, alIntentar }: PropsRonda<'escribir'>) {
  const [escrito, setEscrito] = useState('')
  const [revisando, setRevisando] = useState(false)
  const largo = ronda.respuesta.length
  const siguiente = ronda.respuesta[escrito.length]

  const teclear = (l: string) => {
    if (resuelta || revisando || escrito.length >= largo) return
    const nuevo = escrito + l
    setEscrito(nuevo)
    if (nuevo.length < largo) return
    setRevisando(true)
    window.setTimeout(() => {
      if (nuevo === ronda.respuesta) {
        alIntentar(true)
        return
      }
      alIntentar(false, nuevo)
      // Se muestra el intento un momento y se borra para escribir de nuevo.
      window.setTimeout(() => {
        setEscrito('')
        setRevisando(false)
      }, 700)
    }, 300)
  }
  const borrar = () => !resuelta && !revisando && setEscrito((e) => e.slice(0, -1))

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') return borrar()
      const k = e.key.toUpperCase()
      // Siempre mayúscula y sin tildes (la Ñ se conserva).
      const l = k === 'Ñ' ? k : k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (/^[A-ZÑ]$/.test(l)) teclear(l)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const mal = revisando && escrito.length === largo && escrito !== ronda.respuesta

  return (
    <div className="grid justify-items-center gap-4">
      {ronda.imagen && (
        <button
          onClick={() => hablar(enFrase(ronda.audio))}
          aria-label={`Escuchar: ${ronda.audio}`}
          className={`${tile} ${resuelta ? 'animate-pop border-nino-ok bg-nino-menta' : normal} relative px-5 py-2 hover:-translate-y-1`}
        >
          <ImagenNino imagen={ronda.imagen} className="escribir-pictograma" />
          <span aria-hidden="true" className="absolute -right-3 -bottom-3 grid size-12 place-items-center rounded-full border-3 border-nino-ok bg-nino-menta text-[0.6em]">
            🔊
          </span>
        </button>
      )}
      <div className={`flex gap-2 ${mal ? 'animate-sacudir' : ''}`} aria-label={`Escribe ${largo} ${largo === 1 ? 'letra' : 'letras'}`}>
        {[...ronda.respuesta].map((_, i) => {
          const letra = escrito[i]
          const pista = !letra && revelar && i === escrito.length
          return (
            <span
              key={i}
              className={`${tile} grid h-[1.7em] w-[1.45em] text-[1.7em] ${
                resuelta ? 'border-nino-ok bg-nino-menta' : mal ? 'border-[#e8a35c] bg-[#fdf1e4]' : letra ? 'border-nino-azul bg-white' : 'border-dashed border-nino-borde bg-white'
              }`}
            >
              {letra ?? (pista ? <span className="opacity-35">{siguiente}</span> : '')}
            </span>
          )
        })}
      </div>
      <div className="flex max-w-4xl flex-wrap justify-center gap-2.5 rounded-3xl bg-nino-lila p-3" role="group" aria-label="Teclado">
        {ronda.letras.map((l) => (
          <BotonNino
            key={l}
            voz={l}
            disabled={resuelta || revisando}
            onClick={() => teclear(l)}
            className={`grid size-[2em] place-items-center text-[1.4em] font-bold ${revelar && l === siguiente ? 'revelada border-[#e6c84d] bg-nino-amarillo' : ''}`}
          >
            {l}
          </BotonNino>
        ))}
        <BotonNino voz="Borrar" disabled={resuelta || revisando || !escrito} onClick={borrar} className="grid h-[2em] min-w-[2.4em] place-items-center bg-[#f6d1d1] px-3 text-[1.4em] disabled:opacity-40">
          <span aria-hidden="true">⌫</span>
        </BotonNino>
      </div>
    </div>
  )
}

// ---------- Globos de palabras ----------

interface GloboSilaba {
  id: number
  ficha: string
  izq: number
  duracion: number
  color: string
  estado?: 'bien' | 'mal'
}

const COLORES_GLOBO = ['#ffe58a', '#bfe8d2', '#bcd8f5', '#f6c6d8', '#e4dcf7', '#fde2c8']
const MAX_GLOBOS = 5
let siguienteGlobo = 0

// Las sílabas suben en globos; se revientan en orden para formar la palabra.
// La sílaba que toca aparece seguido para que nunca haya que esperar mucho.
// Con movimiento reducido los globos quedan quietos.
function RondaGlobos({ ronda, resuelta, revelar, errores, alIntentar }: PropsRonda<'globos'>) {
  const { palabra } = ronda
  const [quieto] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const [colocadas, setColocadas] = useState(0)
  const [globos, setGlobos] = useState<GloboSilaba[]>(() => (quieto ? ronda.fichas.map((f, i) => nuevoGlobo(f, i, ronda.fichas.length)) : []))
  const siguiente = palabra.silabas[colocadas]

  function nuevoGlobo(ficha: string, i?: number, total?: number): GloboSilaba {
    const izq = i !== undefined && total ? 6 + (i * 82) / Math.max(1, total - 1) : 4 + Math.random() * 80
    return { id: siguienteGlobo++, ficha, izq, duracion: 6.5 + Math.random() * 2.5, color: COLORES_GLOBO[Math.floor(Math.random() * COLORES_GLOBO.length)] }
  }

  useEffect(() => {
    if (quieto || resuelta) return
    const t = window.setInterval(() => {
      setGlobos((g) => {
        if (g.filter((x) => !x.estado).length >= MAX_GLOBOS) return g
        const enPantalla = g.filter((x) => !x.estado && x.ficha === siguiente).length
        const ficha = siguiente && enPantalla === 0 && Math.random() < 0.6 ? siguiente : ronda.fichas[Math.floor(Math.random() * ronda.fichas.length)]
        return [...g, nuevoGlobo(ficha)]
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [quieto, resuelta, siguiente, ronda.fichas])

  const quitar = (id: number) => setGlobos((g) => g.filter((x) => x.id !== id))

  const reventar = (g: GloboSilaba) => {
    if (resuelta || g.estado) return
    const bien = g.ficha === siguiente
    setGlobos((lista) => lista.map((x) => (x.id === g.id ? { ...x, estado: bien ? 'bien' : 'mal' } : x)))
    window.setTimeout(() => {
      // Quietos: el globo vuelve a aparecer para poder usarlo de nuevo.
      setGlobos((lista) => (quieto ? lista.map((x) => (x.id === g.id ? { ...nuevoGlobo(g.ficha), izq: g.izq } : x)) : lista.filter((x) => x.id !== g.id)))
    }, 400)
    if (!bien) return alIntentar(false, MAYUS(g.ficha))
    const n = colocadas + 1
    setColocadas(n)
    if (n === palabra.silabas.length) alIntentar(true)
  }

  return (
    <div className="grid w-full justify-items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span className="tarjeta-nino flex min-w-0 items-center justify-center rounded-3xl border-3 border-nino-azul bg-white px-4 py-2">
          <PictogramaPalabra
            imagen={palabra.imagen}
            palabraVisible={errores > 0}
            silabaOculta={resuelta ? undefined : siguiente}
            className={`estimulo-imagen-pictograma ${resuelta ? 'animate-pop' : ''}`}
          />
        </span>
        <div className={`flex gap-3 rounded-3xl p-2 ${resuelta ? 'animate-pop bg-nino-menta' : ''}`}>
          {palabra.silabas.map((sil, i) => (
            <span key={i} className={`${tile} min-h-[2.2em] min-w-[3em] px-4 text-[1.5em] ${i < colocadas ? 'animate-pop border-nino-ok bg-nino-menta' : 'border-dashed border-nino-borde bg-white'}`}>
              {i < colocadas ? MAYUS(sil) : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="minijuego relative h-[min(36dvh,20rem)] w-full max-w-4xl overflow-hidden rounded-[2rem] border-3 border-nino-azul bg-white/50">
        {globos.map((g) => (
          <button
            key={g.id}
            aria-label={`Globo ${g.ficha}`}
            disabled={!!g.estado || resuelta}
            onPointerDown={() => reventar(g)}
            onAnimationEnd={(e) => e.animationName === 'elevar' && quitar(g.id)}
            className={`globo absolute grid size-[3.6em] place-items-center rounded-full text-[1.2em] leading-none font-bold select-none ${quieto ? '' : 'elevando'} ${
              g.estado === 'mal' ? 'animate-sacudir' : ''
            } ${revelar && !g.estado && g.ficha === siguiente ? 'ring-6 ring-[#e6c84d]' : ''}`}
            style={{
              left: `${g.izq}%`,
              top: quieto ? '30%' : '100%',
              background: g.color,
              animationDuration: quieto ? undefined : `${g.duracion}s`,
            }}
          >
            <span aria-hidden="true" className={g.estado ? 'animate-pop' : ''}>
              {g.estado === 'bien' ? '💥' : MAYUS(g.ficha)}
            </span>
            {!g.estado && <span aria-hidden="true" className="hilo" />}
          </button>
        ))}
      </div>
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

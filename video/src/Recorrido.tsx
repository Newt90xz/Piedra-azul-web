// El corte completo: monta las capturas (OffthreadVideo) según la línea de tiempo de
// linea.ts y les pone encima los gráficos, la voz en off, el audio real de la app y
// los subtítulos. No se dibuja ninguna pantalla de la app: todo lo que se ve de ella
// es grabación de la interfaz real.
import { createContext, useContext } from 'react'
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { Cierre, DiagramaSalas, FondoFichas, IlustracionApoyo, IlustracionAula, LineaCausaEfecto, Marco, Nota, RotuloActo, Subtitulo, Tercio, TextoGrande, TarjetaPorQue } from './graficos.tsx'
import { FPS, construir, type Datos, type Plano, type Recorte, type Rect } from './linea.ts'
import material from './tomas.json'

const datos = material as unknown as Datos
// El recorrido completo y la versión corta comparten todo: solo cambia la lista de planos.
export const lineas = { completo: construir(datos), corto: construir(datos, 'corto') }
const LineaCtx = createContext(lineas.completo)
const cuadros = (s: number) => Math.round(s * FPS)
const tope = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Un trozo de una toma dentro de una caja: se ve la «ventana» pedida y, si hay, el resalte.
function Fuente({ recorte, ancho, alto }: { recorte: Recorte; ancho: number; alto: number }) {
  const frame = useCurrentFrame()
  const toma = datos.tomas[recorte.toma]
  const completa: Rect = { x: 0, y: 0, w: toma.ancho, h: toma.alto }
  const v = recorte.ventana ?? completa
  let r: Rect
  if ('de' in v) {
    const k = interpolate(frame, [cuadros(v.en ?? 0), cuadros((v.en ?? 0) + (v.dur ?? 1))], [0, 1], { ...tope, easing: Easing.inOut(Easing.cubic) })
    r = { x: v.de.x + (v.a.x - v.de.x) * k, y: v.de.y + (v.a.y - v.de.y) * k, w: v.de.w + (v.a.w - v.de.w) * k, h: v.de.h + (v.a.h - v.de.h) * k }
  } else r = v
  const escala = Math.max(ancho / r.w, alto / r.h)
  const res = recorte.resalte
  const resFrame = res ? frame - cuadros(res.en ?? 0) : 0
  const resVisible = res && resFrame >= 0 && resFrame <= cuadros(res.dur ?? 2.5)
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute" style={{ left: 0, top: 0, width: toma.ancho, height: toma.alto, transformOrigin: '0 0', transform: `translate(${-r.x * escala}px, ${-r.y * escala}px) scale(${escala})` }}>
        <OffthreadVideo src={staticFile(`tomas/${recorte.toma}.mp4`)} startFrom={cuadros(recorte.desde)} playbackRate={recorte.vel ?? 1} muted style={{ width: toma.ancho, height: toma.alto }} />
        {res && resVisible && (
          <div
            className="absolute"
            style={{
              left: res.x - res.r,
              top: res.y - res.r * 0.6,
              width: res.r * 2,
              height: res.r * 1.2,
              borderRadius: 40,
              border: '7px solid var(--color-sol)',
              boxShadow: '0 0 0 4px var(--color-contorno), 0 0 0 4000px rgb(23 50 79 / .18)',
              opacity: interpolate(resFrame, [0, 8, cuadros(res.dur ?? 2.5) - 8, cuadros(res.dur ?? 2.5)], [0, 1, 1, 0], tope),
              transform: `scale(${1 + 0.03 * Math.sin(resFrame / 5)})`,
            }}
          />
        )}
      </div>
    </div>
  )
}

// El audio de la app en ese trozo: tal como sonó, atenuado solo mientras habla la voz en off.
function AudioApp({ recorte, plano, desdeAbsoluto }: { recorte: Recorte; plano: Plano; desdeAbsoluto: number }) {
  const linea = useContext(LineaCtx)
  const toma = datos.tomas[recorte.toma]
  if (!toma.audio || plano.app === 0 || (recorte.vel ?? 1) !== 1) return null
  return <Audio src={staticFile(`tomas/${recorte.toma}.wav`)} startFrom={cuadros(recorte.desde)} volume={(f) => GANANCIA_APP * (plano.app ?? 1) * linea.volumenApp(desdeAbsoluto + f)} />
}

// La voz de la app sale más baja que la voz en off: se sube para que se oigan parejas.
const GANANCIA_APP = 1.7

const NINO = { left: 312, top: 76, width: 1296, height: 810 }
const DIV_NINO = { left: 44, top: 282, width: 880, height: 550 }
const DIV_EDU = { left: 968, top: 299, width: 912, height: 513 }
const PAR_IZQ = { left: 56, top: 282, width: 880, height: 550 }
const PAR_DER = { left: 984, top: 282, width: 880, height: 550 }

function Capa({ plano, desde }: { plano: Plano & { frames: number }; desde: number }) {
  const c = plano.capa
  switch (c.tipo) {
    case 'rotulo':
      return <RotuloActo numero={c.numero} titulo={c.titulo} />
    case 'ilustracion':
      return c.cual === 'aula' ? <IlustracionAula /> : <IlustracionApoyo />
    case 'diagrama':
      return <DiagramaSalas vivo={c.vivo} />
    case 'cierre':
      return <Cierre voz="Voz: ElevenLabs · Voz de la app: Pocket-TTS (Kyutai)" />
    case 'pantalla':
      return (
        <AbsoluteFill className="bg-fondo">
          <Fuente recorte={c.fuente} ancho={1920} alto={1080} />
          <AudioApp recorte={c.fuente} plano={plano} desdeAbsoluto={desde} />
        </AbsoluteFill>
      )
    case 'nino':
      return (
        <AbsoluteFill>
          <FondoFichas tenue={0.16} fase={(desde / FPS) % 40} />
          <Marco tipo="nino" etiqueta={c.etiqueta} style={NINO}>
            <Fuente recorte={c.fuente} ancho={NINO.width} alto={NINO.height} />
          </Marco>
          <AudioApp recorte={c.fuente} plano={plano} desdeAbsoluto={desde} />
        </AbsoluteFill>
      )
    case 'dividida': {
      const v = c.educadora.ventana
      const r: Rect = v && !('de' in v) ? v : { x: 0, y: 0, w: 1920, h: 1080 }
      const k = DIV_EDU.width / r.w
      return (
        <AbsoluteFill>
          <FondoFichas tenue={0.16} fase={(desde / FPS) % 40} />
          <Marco tipo="nino" etiqueta="Computador del niño" style={DIV_NINO}>
            <Fuente recorte={c.nino} ancho={DIV_NINO.width} alto={DIV_NINO.height} />
          </Marco>
          <Marco tipo="educadora" etiqueta="Computador de la educadora" style={DIV_EDU}>
            <Fuente recorte={c.educadora} ancho={DIV_EDU.width} alto={DIV_EDU.height} />
          </Marco>
          {c.linea && (
            <LineaCausaEfecto
              de={[DIV_EDU.left + (c.linea.de[0] - r.x) * k, DIV_EDU.top + (c.linea.de[1] - r.y) * k]}
              a={[DIV_NINO.left + DIV_NINO.width / 2, DIV_NINO.top + DIV_NINO.height / 2]}
              desde={cuadros(c.linea.en)}
              duracion={cuadros(c.linea.dur ?? 1.2)}
            />
          )}
          <AudioApp recorte={c.nino} plano={plano} desdeAbsoluto={desde} />
        </AbsoluteFill>
      )
    }
    case 'ninos':
      return (
        <AbsoluteFill>
          <FondoFichas tenue={0.16} fase={(desde / FPS) % 40} />
          <Marco tipo="nino" etiqueta={c.etiquetas[0]} style={PAR_IZQ}>
            <Fuente recorte={c.izquierda} ancho={PAR_IZQ.width} alto={PAR_IZQ.height} />
          </Marco>
          <Marco tipo="nino" etiqueta={c.etiquetas[1]} style={PAR_DER}>
            <Fuente recorte={c.derecha} ancho={PAR_DER.width} alto={PAR_DER.height} />
          </Marco>
          <AudioApp recorte={c.izquierda} plano={plano} desdeAbsoluto={desde} />
          <AudioApp recorte={c.derecha} plano={plano} desdeAbsoluto={desde} />
        </AbsoluteFill>
      )
  }
}

function Sobre({ plano }: { plano: Plano & { frames: number } }) {
  const t = plano.txt
  const txtDesde = cuadros(t?.en ?? 0.3)
  const txtDur = t?.dur ? cuadros(t.dur) : plano.frames - txtDesde - 4
  const dosPantallas = plano.capa.tipo === 'ninos' || plano.capa.tipo === 'dividida'
  return (
    <>
      {plano.porque && (
        // Con dos pantallas a la vista, la tarjeta va arriba al centro para no taparlas.
        <TarjetaPorQue desde={cuadros(plano.porque.en ?? 0.8)} duracion={cuadros(plano.porque.dur ?? 3.5)} style={dosPantallas ? { right: 'auto', left: 440, top: 26, maxWidth: 1040 } : undefined}>
          {plano.porque.texto}
        </TarjetaPorQue>
      )}
      {t?.estilo === 'nota' && <Nota texto={t.texto} desde={txtDesde} duracion={txtDur} />}
      {t?.estilo === 'tercio' && <Tercio texto={t.texto} desde={txtDesde} duracion={txtDur} />}
      {t?.estilo === 'grande' && <TextoGrande texto={t.texto} desde={txtDesde} duracion={txtDur} arriba={plano.capa.tipo === 'diagrama'} />}
    </>
  )
}

function Subtitulos() {
  const linea = useContext(LineaCtx)
  const frame = useCurrentFrame()
  const s = linea.subs.find((x) => x.de === 'vo' && frame >= x.desde && frame < x.hasta) ?? linea.subs.find((x) => frame >= x.desde && frame < x.hasta)
  return s ? <Subtitulo texto={s.texto} de={s.de} /> : null
}

export function Recorrido({ cual = 'completo' }: { cual?: 'completo' | 'corto' }) {
  const linea = lineas[cual]
  return (
    <LineaCtx value={linea}>
    <AbsoluteFill className="bg-fondo">
      {linea.planos.map((p) => (
        // Las notas y tarjetas pueden seguir un momento sobre el plano siguiente.
        <Sequence key={p.id} from={p.desde} durationInFrames={p.frames} name={p.id}>
          <Capa plano={p} desde={p.desde} />
          <Sobre plano={p} />
        </Sequence>
      ))}
      {linea.vos.map((o) => (
        <Sequence key={o.id} from={o.desde} durationInFrames={o.frames + 10} name={`voz · ${o.id}`}>
          <Audio src={staticFile(`voz/${o.id}.mp3`)} />
        </Sequence>
      ))}
      {/* Pista de música: suena solo si existe video/musica.mp3; baja bajo las voces. */}
      {datos.musica > 0 && <Audio src={staticFile('musica.mp3')} loop volume={(f) => 0.07 + 0.11 * linea.volumenApp(f)} />}
      <Subtitulos />
    </AbsoluteFill>
    </LineaCtx>
  )
}

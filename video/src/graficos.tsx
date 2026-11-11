// Gráficos que van ENCIMA de las capturas (PLAN.md, sección 3). Aquí no se dibuja
// ninguna pantalla de la app: solo rótulos, tarjetas, marcos, diagramas, ilustraciones
// y subtítulos, con los colores y las fuentes del tema de la app (tema.css).
import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'

const suave = Easing.bezier(0.22, 1, 0.36, 1)
const sombraFicha = '0 0 0 3px var(--color-contorno), 0 8px 0 3px var(--color-contorno)'
const tope = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Aparece con un rebote corto y se va con un fundido, dentro de [desde, desde + duracion].
function useEntrada(desde: number, duracion: number) {
  const frame = useCurrentFrame() - desde
  const { fps } = useVideoConfig()
  const entra = spring({ frame, fps, config: { damping: 14, mass: 0.6 } })
  const sale = interpolate(frame, [duracion - 8, duracion], [1, 0], tope)
  return { visible: frame >= 0 && frame <= duracion, entra, sale, frame }
}

// Las mismas fichas de la portada (letras y sílabas), subiendo despacio.
const FICHAS = [
  { texto: 'A', izq: 4, tam: 92, vel: 26, ret: 0, color: 'var(--color-nino-amarillo)', giro: -8 },
  { texto: 'ma', izq: 14, tam: 70, vel: 32, ret: 9, color: 'var(--color-nino-menta)', giro: 6 },
  { texto: 'E', izq: 24, tam: 60, vel: 29, ret: 18, color: 'var(--color-nino-azul)', giro: 10 },
  { texto: 'sol', izq: 35, tam: 64, vel: 36, ret: 4, color: 'var(--color-nino-lila)', giro: -5 },
  { texto: 'pa', izq: 47, tam: 54, vel: 31, ret: 22, color: 'var(--color-durazno)', giro: 8 },
  { texto: 'M', izq: 57, tam: 80, vel: 27, ret: 13, color: 'var(--color-nino-menta)', giro: -10 },
  { texto: 'lu', izq: 66, tam: 62, vel: 34, ret: 2, color: 'var(--color-nino-amarillo)', giro: 5 },
  { texto: 'O', izq: 76, tam: 96, vel: 30, ret: 16, color: 'var(--color-nino-azul)', giro: -6 },
  { texto: 'sa', izq: 86, tam: 64, vel: 28, ret: 7, color: 'var(--color-nino-lila)', giro: 9 },
  { texto: 'U', izq: 94, tam: 76, vel: 33, ret: 24, color: 'var(--color-durazno)', giro: -9 },
]

// `fase`: segundos de adelanto, para que el fondo no se reinicie igual en cada plano.
export function FondoFichas({ tenue = 0.55, fase = 0 }: { tenue?: number; fase?: number }) {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const t = frame / fps + fase
  return (
    <AbsoluteFill className="bg-fondo overflow-hidden">
      <div className="bg-celeste-fondo absolute rounded-full" style={{ width: 900, height: 900, left: -220, top: -300, filter: 'blur(90px)' }} />
      <div className="bg-menta-fondo absolute rounded-full" style={{ width: 800, height: 800, right: -260, top: 260, filter: 'blur(90px)' }} />
      <div className="bg-nino-amarillo absolute rounded-full" style={{ width: 820, height: 820, left: 520, bottom: -420, filter: 'blur(90px)', opacity: 0.8 }} />
      {FICHAS.map((f) => {
        const avance = ((t + f.ret) % f.vel) / f.vel
        return (
          <span key={f.texto} className="font-escolar text-nino-tinta absolute font-bold" style={{ left: `${f.izq}%`, top: height + 80 - avance * (height + 320), fontSize: f.tam, opacity: tenue, transform: `rotate(${f.giro * (1 - 2 * avance)}deg)` }}>
            <span className="block leading-tight" style={{ background: f.color, borderRadius: '0.45em', padding: '0.05em 0.4em', boxShadow: '0 0 0 3px rgb(43 74 107 / .35), 0 6px 0 3px rgb(43 74 107 / .35)' }}>
              {f.texto}
            </span>
          </span>
        )
      })}
    </AbsoluteFill>
  )
}

// 4 · Rótulo de acto: número y título corto sobre el fondo de fichas.
export function RotuloActo({ numero, titulo }: { numero: string; titulo: string }) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const entra = spring({ frame, fps, config: { damping: 14, mass: 0.7 } })
  const sale = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], tope)
  const trazo = interpolate(frame, [10, 32], [1, 0], { ...tope, easing: suave })
  return (
    <AbsoluteFill>
      <FondoFichas fase={Number(numero) * 7} />
      <AbsoluteFill className="items-center justify-center" style={{ opacity: sale }}>
        <div className="flex items-center gap-10" style={{ transform: `scale(${0.85 + 0.15 * entra})`, opacity: entra, padding: '0 120px' }}>
          <span className="bg-nino-amarillo font-escolar text-nino-tinta grid shrink-0 place-items-center font-bold" style={{ width: 190, height: 190, borderRadius: 48, fontSize: 130, boxShadow: sombraFicha, transform: 'rotate(-5deg)' }}>
            {numero}
          </span>
          <span className="text-tinta relative font-sans font-bold tracking-tight" style={{ fontSize: titulo.length > 22 ? 82 : 104, lineHeight: 1.05 }}>
            {titulo}
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="text-sol absolute left-0 w-full" style={{ bottom: -22, height: 20 }}>
              <path d="M3 14 Q 50 3 100 11 T 197 8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={trazo} />
            </svg>
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// 2 · Tarjeta «¿Por qué?»: amarilla, con borde marino, como las fichas de la portada.
export function TarjetaPorQue({ children, desde, duracion, style }: { children: ReactNode; desde: number; duracion: number; style?: CSSProperties }) {
  const { visible, entra, sale } = useEntrada(desde, duracion)
  if (!visible) return null
  return (
    <div className="bg-nino-amarillo text-nino-tinta absolute" style={{ right: 56, top: 56, maxWidth: 600, padding: '24px 32px 28px', borderRadius: 32, boxShadow: sombraFicha, opacity: sale, zIndex: 20, transform: `translateY(${(1 - entra) * -40}px) rotate(${-1.5 + (1 - entra) * -4}deg) scale(${0.9 + 0.1 * entra})`, ...style }}>
      <div className="text-marino font-sans font-bold tracking-[0.12em] uppercase" style={{ fontSize: 22 }}>
        ¿Por qué?
      </div>
      <div className="font-escolar font-bold" style={{ fontSize: 35, lineHeight: 1.22, marginTop: 6 }}>
        {children}
      </div>
    </div>
  )
}

// Subtítulo incrustado: el video se ve con y sin sonido. Lo que dice la app va en menta.
export function Subtitulo({ texto, de }: { texto: string; de: 'vo' | 'app' }) {
  return (
    <AbsoluteFill className="items-center justify-end" style={{ paddingBottom: 34, zIndex: 30 }}>
      <div className="flex items-center gap-4 text-center font-sans font-semibold text-white" style={{ maxWidth: 1500, fontSize: 38, lineHeight: 1.22, padding: '10px 26px', borderRadius: 16, background: de === 'app' ? 'color-mix(in srgb, var(--color-menta-oscuro) 94%, transparent)' : 'color-mix(in srgb, var(--color-marino) 90%, transparent)' }}>
        {de === 'app' && (
          <span className="shrink-0 font-bold tracking-wide uppercase" style={{ fontSize: 20, padding: '4px 12px', borderRadius: 999, background: 'rgb(255 255 255 / .2)' }}>
            La app dice
          </span>
        )}
        <span className={de === 'app' ? 'font-escolar' : ''}>{texto}</span>
      </div>
    </AbsoluteFill>
  )
}

// Nota chica sobre la imagen (un dato que la voz en off no dice).
export function Nota({ texto, desde, duracion }: { texto: string; desde: number; duracion: number }) {
  const { visible, entra, sale } = useEntrada(desde, duracion)
  if (!visible) return null
  return (
    <div className="absolute flex justify-center" style={{ left: 0, right: 0, top: 26, zIndex: 20, opacity: sale * entra, transform: `translateY(${(1 - entra) * -20}px)` }}>
      <div className="text-tinta font-sans font-semibold" style={{ fontSize: 30, padding: '10px 24px', borderRadius: 999, background: '#fff', boxShadow: '0 0 0 3px var(--color-contorno), 0 5px 0 3px var(--color-contorno)', maxWidth: 1500, textAlign: 'center' }}>
        {texto}
      </div>
    </div>
  )
}

// Tercio inferior: el nombre del proyecto en la presentación.
export function Tercio({ texto, desde, duracion }: { texto: string; desde: number; duracion: number }) {
  const { visible, entra, sale } = useEntrada(desde, duracion)
  if (!visible) return null
  return (
    <div className="absolute" style={{ left: 90, bottom: 190, zIndex: 20, opacity: sale, transform: `translateX(${(1 - entra) * -60}px)` }}>
      <div className="bg-marino font-sans font-bold text-white" style={{ fontSize: 44, padding: '14px 34px', borderRadius: 22, boxShadow: '0 12px 30px -12px rgb(23 58 94 / .7)', borderLeft: '12px solid var(--color-sol)' }}>
        {texto}
      </div>
    </div>
  )
}

// Texto grande sobre la imagen: las frases que deben quedar.
export function TextoGrande({ texto, desde, duracion, arriba = false }: { texto: string; desde: number; duracion: number; arriba?: boolean }) {
  const { visible, entra, sale } = useEntrada(desde, duracion)
  if (!visible) return null
  return (
    <AbsoluteFill className={arriba ? 'items-center justify-start' : 'items-center justify-center'} style={{ zIndex: 25, opacity: sale, paddingTop: arriba ? 44 : 0 }}>
      <div className="font-escolar text-nino-tinta text-center font-bold" style={{ fontSize: arriba ? 52 : texto.length > 30 ? 62 : 96, lineHeight: 1.12, maxWidth: 1400, padding: '26px 54px', borderRadius: 40, background: '#fff', boxShadow: sombraFicha, transform: `scale(${0.8 + 0.2 * entra}) rotate(-1deg)` }}>
        {texto}
      </div>
    </AbsoluteFill>
  )
}

// Marco de una captura: la pantalla de un computador, el del niño (menta) o el de la
// educadora (marino). Los dos usan computador; el color y el rótulo dicen de quién es.
export function Marco({ tipo, etiqueta, children, style }: { tipo: 'nino' | 'educadora'; etiqueta?: string; children: ReactNode; style: CSSProperties }) {
  const color = tipo === 'nino' ? 'var(--color-menta)' : 'var(--color-marino)'
  return (
    <div className="absolute" style={style}>
      {etiqueta && (
        <div className="absolute font-sans font-bold text-white" style={{ left: 24, top: -30, zIndex: 2, fontSize: 25, padding: '5px 18px', borderRadius: 999, background: color, boxShadow: '0 6px 16px -6px rgb(23 58 94 / .6)' }}>
          {etiqueta}
        </div>
      )}
      {/* Pie del monitor. */}
      <div className="absolute" style={{ left: '50%', bottom: -34, width: 190, height: 26, marginLeft: -95, borderRadius: '0 0 14px 14px', background: 'var(--color-contorno)', opacity: 0.85 }} />
      <div className="absolute" style={{ inset: -12, borderRadius: 26, background: 'var(--color-contorno)', boxShadow: '0 30px 60px -30px rgb(23 58 94 / .55)' }} />
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 14, background: '#fff' }}>
        {children}
      </div>
    </div>
  )
}

// 1 · Línea causa → efecto: sale del clic de la educadora y llega a la tablet.
export function LineaCausaEfecto({ de, a, desde, duracion = 30 }: { de: [number, number]; a: [number, number]; desde: number; duracion?: number }) {
  const frame = useCurrentFrame() - desde
  if (frame < 0 || frame > duracion + 24) return null
  const k = interpolate(frame, [0, duracion], [0, 1], { ...tope, easing: Easing.inOut(Easing.cubic) })
  const apaga = interpolate(frame, [duracion + 10, duracion + 24], [1, 0], tope)
  const [x1, y1] = de
  const [x2, y2] = a
  const cx = (x1 + x2) / 2
  const cy = Math.min(y1, y2) - 260
  const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  const px = (1 - k) ** 2 * x1 + 2 * (1 - k) * k * cx + k ** 2 * x2
  const py = (1 - k) ** 2 * y1 + 2 * (1 - k) * k * cy + k ** 2 * y2
  const llega = interpolate(frame, [duracion, duracion + 14], [0, 1], tope)
  return (
    <svg className="absolute inset-0" width="100%" height="100%" style={{ opacity: apaga, zIndex: 15 }}>
      <path d={d} fill="none" stroke="var(--color-contorno)" strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
      <path d={d} fill="none" stroke="var(--color-sol)" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
      <circle cx={x1} cy={y1} r={16} fill="var(--color-sol)" stroke="var(--color-contorno)" strokeWidth={5} />
      <circle cx={px} cy={py} r={22} fill="var(--color-sol)" stroke="var(--color-contorno)" strokeWidth={5} />
      {llega > 0 && <circle cx={x2} cy={y2} r={22 + llega * 90} fill="none" stroke="var(--color-sol)" strokeWidth={8 * (1 - llega)} />}
    </svg>
  )
}

// ---------- Ilustraciones (lo que no es pantalla) ----------

const nombreArchivo = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// El personaje de cada niño es el suyo de verdad: un recorte de la grilla de la app.
export function Nino({ nombre, tam = 150, style }: { nombre: string; tam?: number; style?: CSSProperties }) {
  return <Img src={staticFile(`img/${nombreArchivo(nombre)}.png`)} style={{ width: tam, height: tam, borderRadius: '30%', boxShadow: '0 0 0 4px #fff, 0 0 0 7px var(--color-contorno)', ...style }} />
}

// La educadora: una figura simple, sin nombre ni rostro reconocible (PLAN.md, sección 2).
export function Educadora({ tam = 300, style }: { tam?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 200 260" width={tam} height={tam * 1.3} style={style}>
      <ellipse cx="100" cy="250" rx="62" ry="9" fill="rgb(23 58 94 / .14)" />
      <path d="M38 250 C38 170 62 132 100 132 C138 132 162 170 162 250 Z" fill="var(--color-menta)" stroke="var(--color-contorno)" strokeWidth="6" strokeLinejoin="round" />
      <path d="M82 134 L100 168 L118 134" fill="#fff" stroke="var(--color-contorno)" strokeWidth="6" strokeLinejoin="round" />
      <circle cx="100" cy="24" r="20" fill="var(--color-marino)" stroke="var(--color-contorno)" strokeWidth="6" />
      <circle cx="100" cy="84" r="50" fill="#f6cfa6" stroke="var(--color-contorno)" strokeWidth="6" />
      <path d="M50 82 C48 44 74 30 100 30 C126 30 152 44 150 82 C136 70 122 60 100 58 C78 60 64 70 50 82 Z" fill="var(--color-marino)" stroke="var(--color-contorno)" strokeWidth="6" strokeLinejoin="round" />
      <circle cx="82" cy="90" r="5" fill="var(--color-contorno)" />
      <circle cx="118" cy="90" r="5" fill="var(--color-contorno)" />
      <path d="M84 106 Q100 120 116 106" fill="none" stroke="var(--color-contorno)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="70" cy="102" r="7" fill="#f2a0a0" opacity=".6" />
      <circle cx="130" cy="102" r="7" fill="#f2a0a0" opacity=".6" />
    </svg>
  )
}

// El computador de cada niño: un notebook visto de frente.
function Notebook({ tam = 120, style }: { tam?: number; style?: CSSProperties }) {
  return (
    <div style={{ width: tam, ...style }}>
      <div style={{ margin: '0 8%', height: tam * 0.52, borderRadius: `${tam * 0.07}px ${tam * 0.07}px 0 0`, background: 'var(--color-nino-azul)', border: `${tam * 0.05}px solid var(--color-contorno)`, borderBottom: 0 }}>
        <div style={{ margin: '12% auto 0', width: '40%', height: '52%', borderRadius: '18%', background: '#fff' }} />
      </div>
      <div style={{ height: tam * 0.1, borderRadius: `0 0 ${tam * 0.08}px ${tam * 0.08}px`, background: 'var(--color-contorno)', boxShadow: '0 8px 0 rgb(43 74 107 / .2)' }} />
    </div>
  )
}

const CURSO = ['Sofía', 'Tomás', 'Martina', 'Benjamín', 'Isidora', 'Lucas']

// Gancho: una sala de Kínder, varios niños con su computador y una sola educadora.
export function IlustracionAula() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const lugares = [
    [250, 300], [560, 200], [330, 640], [1350, 210], [1620, 330], [1500, 660],
  ]
  return (
    <AbsoluteFill>
      <FondoFichas tenue={0.22} />
      <AbsoluteFill>
        {CURSO.map((n, i) => {
          const e = spring({ frame: frame - 6 - i * 5, fps, config: { damping: 13, mass: 0.6 } })
          const [x, y] = lugares[i]
          // De a uno, cada niño «pide» a la educadora: todos a la vez.
          const llama = interpolate(frame, [34 + i * 9, 46 + i * 9], [0, 1], tope)
          return (
            <div key={n} className="absolute" style={{ left: x, top: y, transform: `scale(${e})`, transformOrigin: '50% 100%' }}>
              <Nino nombre={n} tam={170} />
              <Notebook tam={130} style={{ margin: '-18px 0 0 20px', position: 'relative', transform: 'rotate(-4deg)' }} />
              <svg className="absolute" width="60" height="60" viewBox="0 0 60 60" style={{ left: 150, top: -30, opacity: llama, transform: `scale(${0.6 + 0.4 * llama})` }}>
                <circle cx="30" cy="30" r="26" fill="var(--color-nino-amarillo)" stroke="var(--color-contorno)" strokeWidth="5" />
                <text x="30" y="43" textAnchor="middle" fontSize="36" fontWeight="700" fill="var(--color-contorno)" fontFamily="var(--font-escolar)">?</text>
              </svg>
            </div>
          )
        })}
        <div className="absolute" style={{ left: 810, top: 330, transform: `scale(${spring({ frame: frame - 2, fps, config: { damping: 14 } })})`, transformOrigin: '50% 100%' }}>
          <Educadora tam={300} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// La educadora se sienta junto a Tomás.
export function IlustracionApoyo() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const llega = spring({ frame: frame - 4, fps, config: { damping: 16, mass: 0.9 } })
  const corazon = spring({ frame: frame - 26, fps, config: { damping: 10, mass: 0.5 } })
  return (
    <AbsoluteFill>
      <FondoFichas tenue={0.2} fase={11} />
      <AbsoluteFill className="items-center justify-center">
        <div className="relative" style={{ width: 900, height: 560 }}>
          <div className="absolute" style={{ left: 470, top: 150 }}>
            <Nino nombre="Tomás" tam={250} />
            <Notebook tam={210} style={{ margin: '-22px 0 0 20px', position: 'relative', transform: 'rotate(-3deg)' }} />
          </div>
          <div className="absolute" style={{ left: interpolate(llega, [0, 1], [-140, 130]), top: 70, opacity: Math.min(1, llega * 2) }}>
            <Educadora tam={340} />
          </div>
          <svg className="absolute" width="120" height="110" viewBox="0 0 120 110" style={{ left: 400, top: 30, transform: `scale(${corazon}) rotate(-8deg)` }}>
            <path d="M60 100 C10 62 4 30 30 14 C46 6 58 16 60 30 C62 16 74 6 90 14 C116 30 110 62 60 100 Z" fill="#f2789a" stroke="var(--color-contorno)" strokeWidth="6" strokeLinejoin="round" />
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// Diagrama de las salas conectadas: 📚 Grupo Letras → 🌳 Recreo. En «vivo», los que
// terminan pasan de a uno al recreo y la educadora queda junto a quien la necesita.
export function DiagramaSalas({ vivo = false }: { vivo?: boolean }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const entra = (d: number) => spring({ frame: frame - d, fps, config: { damping: 14, mass: 0.7 } })
  const flecha = interpolate(frame, [14, 30], [0, 1], { ...tope, easing: suave })
  const caja = (titulo: string, icono: string, color: string, x: number, e: number) => (
    <div className="absolute" style={{ left: x, top: vivo ? 250 : 330, width: 620, height: vivo ? 430 : 300, borderRadius: 44, background: color, boxShadow: sombraFicha, transform: `scale(${0.85 + 0.15 * e})`, opacity: e }}>
      <div className="font-escolar text-nino-tinta flex items-center gap-5 font-bold" style={{ fontSize: 56, whiteSpace: 'nowrap', padding: vivo ? '26px 36px' : '100px 40px' }}>
        <span style={{ fontSize: vivo ? 70 : 84 }}>{icono}</span>
        {titulo}
      </div>
    </div>
  )
  const pasan = ['Sofía', 'Benjamín', 'Isidora', 'Lucas']
  return (
    <AbsoluteFill>
      <FondoFichas tenue={0.2} fase={vivo ? 23 : 5} />
      <AbsoluteFill>
        {caja('Grupo Letras', '📚', 'var(--color-nino-amarillo)', 190, entra(2))}
        {caja('Recreo', '🌳', 'var(--color-nino-menta)', 1110, entra(8))}
        <svg className="absolute" width="300" height="120" viewBox="0 0 300 120" style={{ left: 810, top: vivo ? 400 : 420 }}>
          <path d="M20 60 H250" stroke="var(--color-contorno)" strokeWidth="16" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - flecha} />
          <path d="M210 22 L262 60 L210 98" fill="none" stroke="var(--color-contorno)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity={flecha} />
        </svg>
        {vivo && (
          <>
            {pasan.map((n, i) => {
              const k = interpolate(frame, [26 + i * 14, 52 + i * 14], [0, 1], { ...tope, easing: Easing.inOut(Easing.cubic) })
              const x = interpolate(k, [0, 1], [230 + i * 138, 1150 + i * 138])
              const y = 500 - Math.sin(k * Math.PI) * 150
              return <Nino key={n} nombre={n} tam={120} style={{ position: 'absolute', left: x, top: y }} />
            })}
            <Nino nombre="Martina" tam={120} style={{ position: 'absolute', left: 230, top: 540, opacity: entra(12) }} />
            <Nino nombre="Tomás" tam={120} style={{ position: 'absolute', left: 520, top: 540, opacity: entra(12) }} />
            <div className="absolute" style={{ left: interpolate(entra(70), [0, 1], [240, 372]), top: 470, opacity: entra(70) }}>
              <Educadora tam={150} />
            </div>
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// Cierre: el logo sobre el fondo de fichas y los créditos.
export function Cierre({ voz }: { voz: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const entra = spring({ frame: frame - 4, fps, config: { damping: 14, mass: 0.8 } })
  const trazo = interpolate(frame, [20, 46], [1, 0], { ...tope, easing: suave })
  const pie = interpolate(frame, [40, 58], [0, 1], tope)
  return (
    <AbsoluteFill>
      <FondoFichas fase={31} tenue={0.3} />
      <AbsoluteFill className="items-center justify-center">
        <div className="text-center" style={{ transform: `scale(${0.88 + 0.12 * entra})`, opacity: entra }}>
          <div className="text-tinta font-sans font-bold tracking-tight" style={{ fontSize: 150, lineHeight: 1.05 }}>
            Leer para{' '}
            <span className="text-menta-oscuro relative inline-block">
              Todos
              <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="text-sol absolute left-0 w-full" style={{ bottom: -14, height: 24 }}>
                <path d="M3 14 Q 50 3 100 11 T 197 8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={trazo} />
              </svg>
            </span>
          </div>
          <div className="font-escolar text-nino-tinta font-bold" style={{ fontSize: 54, marginTop: 44 }}>
            Cada niño a su ritmo, ninguno solo.
          </div>
          <div className="text-tinta-suave font-sans font-semibold" style={{ fontSize: 34, marginTop: 54, opacity: pie }}>
            Liceo Piedra Azul · Bases Curriculares de Educación Parvularia, Lenguaje Verbal
          </div>
          <div className="text-tinta-suave font-sans" style={{ fontSize: 24, marginTop: 18, opacity: pie * 0.9 }}>
            {voz}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

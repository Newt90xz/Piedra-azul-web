import { contextoAudio } from './audio.ts'

// Música de la sala de espera, generada con Web Audio (sin archivos): una
// canción de cuna en pentatónica de do, lenta y a bajo volumen (RNF-08, bajo
// estímulo). La melodía va en negras y el bajo cambia una vez por compás.

// Notas MIDI; null = silencio. 8 compases de 4 negras.
const MELODIA: (number | null)[] = [
  76, 79, 81, 79, /**/ 76, 74, 72, null, /**/ 74, 76, 79, 76, /**/ 74, null, null, null,
  76, 79, 81, 84, /**/ 81, 79, 76, null, /**/ 74, 76, 74, 72, /**/ 72, null, null, null,
]
const BAJO = [48, 45, 50, 43, 48, 45, 50, 48]

const TEMPO = 76
const NEGRA = 60 / TEMPO
// Cuánto se agenda por adelantado y cada cuánto se revisa.
const ADELANTO_S = 0.4
const REVISAR_MS = 150
const VOLUMEN = 0.6

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

let temporizador: number | undefined
let maestro: GainNode | null = null
let siguiente = 0
let paso = 0

function nota(ctx: AudioContext, destino: AudioNode, midi: number, t: number, duracion: number, tipo: OscillatorType, volumen: number) {
  const osc = ctx.createOscillator()
  const vol = ctx.createGain()
  osc.type = tipo
  osc.frequency.value = hz(midi)
  vol.gain.setValueAtTime(0.0001, t)
  vol.gain.exponentialRampToValueAtTime(volumen, t + 0.04)
  vol.gain.exponentialRampToValueAtTime(0.0001, t + duracion)
  osc.connect(vol).connect(destino)
  osc.start(t)
  osc.stop(t + duracion + 0.05)
}

function tocarPaso(ctx: AudioContext, destino: AudioNode, i: number, t: number) {
  const m = MELODIA[i]
  if (m !== null) nota(ctx, destino, m, t, NEGRA * 1.6, 'triangle', 0.05)
  if (i % 4 === 0) nota(ctx, destino, BAJO[i / 4], t, NEGRA * 3.8, 'sine', 0.04)
}

export function iniciarMusica() {
  if (temporizador !== undefined) return
  let ctx: AudioContext
  try {
    ctx = contextoAudio()
  } catch {
    return // Sin Web Audio no hay música.
  }
  // El navegador puede tenerlo suspendido hasta un toque; el niño ya tocó su perfil.
  void ctx.resume()
  const filtro = ctx.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.value = 1800
  maestro = ctx.createGain()
  maestro.gain.setValueAtTime(0.0001, ctx.currentTime)
  maestro.gain.exponentialRampToValueAtTime(VOLUMEN, ctx.currentTime + 2)
  maestro.connect(filtro).connect(ctx.destination)
  const salida = maestro
  siguiente = ctx.currentTime + 0.1
  paso = 0

  const agendar = () => {
    // Si la pestaña estuvo en segundo plano no se tocan de golpe las notas atrasadas.
    if (siguiente < ctx.currentTime) siguiente = ctx.currentTime + 0.05
    while (siguiente < ctx.currentTime + ADELANTO_S) {
      tocarPaso(ctx, salida, paso, siguiente)
      paso = (paso + 1) % MELODIA.length
      siguiente += NEGRA
    }
  }
  agendar()
  temporizador = window.setInterval(agendar, REVISAR_MS)
}

export function detenerMusica() {
  window.clearInterval(temporizador)
  temporizador = undefined
  const m = maestro
  maestro = null
  if (!m) return
  const ahora = m.context.currentTime
  m.gain.cancelScheduledValues(ahora)
  m.gain.setValueAtTime(Math.max(m.gain.value, 0.0001), ahora)
  m.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.6)
  window.setTimeout(() => m.disconnect(), 800)
}

// Voz de la plataforma: solo Pocket-TTS (voz Lola o la voz clonada), generada
// por el backend (GET /api/voz) y guardada allá para la próxima vez. Las frases
// que se repiten se dejan generadas de antemano (frontend/scripts/voz/README.md).
// No hay voz de respaldo del navegador: si el servidor de voz no responde, la
// app sigue en silencio.

import { paraVoz } from './textoVoz.ts'

let reproduciendo: HTMLAudioElement | null = null
// Cada llamada a hablar() deja sin efecto a la anterior.
let turno = 0
// Lo que está sonando (o cargando) y desde cuándo: para no repetir la misma frase
// si se pide dos veces seguidas (p. ej. un efecto que se vuelve a ejecutar).
let actual: { texto: string; desde: number } | null = null
const REPETIDA_MS = 1500
// Si la voz no empieza en este tiempo (servidor apagado o muy ocupado), se sigue sin voz.
const ESPERA_MAXIMA_MS = 20_000

export interface OpcionesVoz {
  alTerminar?: () => void
}

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/$/, '')

const urlVoz = (texto: string) => `${API}/api/voz?texto=${encodeURIComponent(texto)}`

// Fuera de la pantalla del niño la voz calla; ahí se enciende sola (ui/nino.tsx)
// y el niño puede apagarla con el botón del altavoz. Solo calla
// la voz: los efectos dependen del ajuste «silenciar efectos» de la docente.
let mudo = true
let temporizadorApuntar: number | undefined
// Dentro de una actividad solo se dice el enunciado: apuntar los botones no habla.
let apuntarCallado = 0

export function fijarMudo(valor: boolean) {
  mudo = valor
  if (valor) detener()
}

// Un solo temporizador para toda la página: apuntar otra caja reemplaza a la anterior, no se encola.
export function hablarAlApuntar(texto: string) {
  window.clearTimeout(temporizadorApuntar)
  if (apuntarCallado > 0) return
  temporizadorApuntar = window.setTimeout(() => hablar(texto), 350)
}

export function cancelarApuntar() {
  window.clearTimeout(temporizadorApuntar)
}

// Calla la voz al apuntar mientras dure la actividad. Devuelve cómo deshacerlo
// (sirve directo como limpieza de un useEffect).
export function callarAlApuntar() {
  apuntarCallado++
  cancelarApuntar()
  return () => {
    apuntarCallado--
  }
}

export function hablar(texto: string, opciones: OpcionesVoz = {}) {
  const frase = paraVoz(texto)
  // La misma frase pedida otra vez enseguida: se deja sonar la que ya va.
  if (!opciones.alTerminar && actual?.texto === frase && Date.now() - actual.desde < REPETIDA_MS && reproduciendo) return
  detener()
  if (mudo || !frase) {
    opciones.alTerminar?.()
    return
  }

  const mio = ++turno
  console.log(`[Pocket-TTS] Dice: «${frase}»`)
  const audio = new Audio(urlVoz(frase))
  reproduciendo = audio
  actual = { texto: frase, desde: Date.now() }
  let finalizado = false
  const terminar = () => {
    window.clearTimeout(limite)
    if (mio !== turno || finalizado) return
    finalizado = true
    reproduciendo = null
    actual = null
    opciones.alTerminar?.()
  }
  const fallar = () => {
    if (mio !== turno || finalizado) return
    console.warn(`[audio] La voz no respondió: «${frase}». ¿Está corriendo el backend con Pocket-TTS?`)
    audio.pause()
    terminar()
  }
  const limite = window.setTimeout(fallar, ESPERA_MAXIMA_MS)
  audio.addEventListener('playing', () => window.clearTimeout(limite), { once: true })
  audio.onerror = fallar
  audio.onended = terminar
  void audio.play().catch(fallar)
}

export function detener() {
  turno++
  actual = null
  if (reproduciendo) {
    reproduciendo.pause()
    // Corta también la descarga de la frase anterior.
    reproduciendo.removeAttribute('src')
    reproduciendo.load()
  }
  reproduciendo = null
}

// Pide al backend que genere de antemano frases que sonarán pronto (la
// siguiente ronda): cuando llegue el momento ya están guardadas y suenan al tiro.
// De a una, para no ocupar al servidor de voz con muchas a la vez.
const porPrecargar: string[] = []
const precargadas = new Set<string>()
let precargando = false

export function precargar(textos: string[]) {
  if (mudo) return
  for (const t of textos.map(paraVoz)) {
    if (t && !precargadas.has(t) && !porPrecargar.includes(t)) porPrecargar.push(t)
  }
  void siguientePrecarga()
}

async function siguientePrecarga() {
  if (precargando) return
  precargando = true
  try {
    for (let t = porPrecargar.shift(); t; t = porPrecargar.shift()) {
      const r = await fetch(`${urlVoz(t)}&precarga=1`).catch(() => null)
      if (!r?.ok) break
      await r.arrayBuffer()
      precargadas.add(t)
    }
  } finally {
    porPrecargar.length = 0
    precargando = false
  }
}

// Efectos suaves generados (sin archivos). La regla de oro 6 permite
// silenciarlos dejando solo la voz.
let contexto: AudioContext | null = null

// Un solo contexto de audio para efectos y música (ver lib/musica.ts).
export function contextoAudio() {
  contexto ??= new AudioContext()
  return contexto
}

export function efecto(tipo: 'acierto' | 'intento' | 'premio' | 'toque', silenciado: boolean) {
  if (silenciado) return
  try {
    contextoAudio()
    const notas = { acierto: [523, 659, 784], intento: [392], premio: [523, 659, 784, 1047], toque: [880] }[tipo]
    notas.forEach((f, i) => {
      const osc = contexto!.createOscillator()
      const vol = contexto!.createGain()
      const t = contexto!.currentTime + i * 0.12
      osc.type = 'sine'
      osc.frequency.value = f
      vol.gain.setValueAtTime(0.0001, t)
      vol.gain.exponentialRampToValueAtTime(tipo === 'intento' || tipo === 'toque' ? 0.05 : 0.12, t + 0.02)
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.connect(vol).connect(contexto!.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    // Sin Web Audio no hay efectos; la voz sigue funcionando.
  }
}

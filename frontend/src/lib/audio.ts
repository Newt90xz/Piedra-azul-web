// Audio de la plataforma.
//
// La voz de la app («Serena», Qwen3-TTS) se pregraba por trozos en
// public/voz/<clave>.mp3 (ver scripts/voz/README.md): el computador del niño
// solo reproduce archivos, sin generar voz. Cada frase se parte en trozos
// (lib/claveVoz.ts) que se tocan uno tras otro. Si falta algún trozo, la frase
// entera se dice con la mejor voz del navegador.
//
// RF-04 / RNF-04: un audio grabado por una persona (p. ej. el fonema «mmm» por
// la educadora) se guarda con la misma clave y reemplaza al generado.

import { claveFrase, trozosFrase } from './claveVoz.ts'

let reproduciendo: HTMLAudioElement | null = null
// Cada llamada a hablar() cancela la cola de trozos anterior.
let turno = 0
let avisado = false

export interface OpcionesVoz {
  src?: string
  alTerminar?: () => void
  // Frase más corta a decir si la completa no está pregrabada (p. ej. un
  // saludo con el nombre del niño → «¡Hola!»), antes de caer en la voz del navegador.
  respaldo?: string
}

const BASE_VOZ = `${import.meta.env.BASE_URL}voz/`
// Pausa entre trozos de una misma frase.
const PAUSA_TROZOS_MS = 120

// Claves de los audios disponibles. Se pide una vez; mientras llega (o si no
// hay audios generados) se usa la voz del navegador.
let indice: Set<string> | null = null
let pidiendoIndice = false

function cargarIndice() {
  if (indice || pidiendoIndice || typeof fetch === 'undefined') return
  pidiendoIndice = true
  fetch(`${BASE_VOZ}indice.json`)
    .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
    .then((claves) => (indice = new Set(claves)))
    .catch(() => (indice = new Set()))
}
cargarIndice()

// Rutas de los trozos de la frase, o null si falta alguno.
function audiosDe(texto: string) {
  if (!indice?.size) return null
  const claves = trozosFrase(texto).map(claveFrase)
  return claves.length > 0 && claves.every((c) => indice!.has(c)) ? claves.map((c) => `${BASE_VOZ}${c}.mp3`) : null
}

function tocarCola(rutas: string[], alTerminar?: () => void) {
  const mio = ++turno
  // Se piden todos de inmediato para que no haya silencios al pasar de uno a otro.
  const audios = rutas.map((r) => {
    const a = new Audio(r)
    a.preload = 'auto'
    return a
  })
  const tocar = (i: number) => {
    if (mio !== turno) return
    if (i >= audios.length) return void alTerminar?.()
    reproduciendo = audios[i]
    reproduciendo.onended = () => (pendiente = window.setTimeout(() => tocar(i + 1), PAUSA_TROZOS_MS))
    void reproduciendo.play().catch(() => mio === turno && alTerminar?.())
  }
  tocar(0)
}

// Voz apagada hasta que el niño la active con el botón del altavoz. Solo calla
// la voz: los efectos dependen del ajuste «silenciar efectos» de la docente.
let mudo = true
let pendiente: number | undefined
let temporizadorApuntar: number | undefined

export function fijarMudo(valor: boolean) {
  mudo = valor
  if (valor) detener()
}

// Un solo temporizador para toda la página: apuntar otra caja reemplaza a la anterior, no se encola.
export function hablarAlApuntar(texto: string) {
  window.clearTimeout(temporizadorApuntar)
  temporizadorApuntar = window.setTimeout(() => hablar(texto), 350)
}

export function cancelarApuntar() {
  window.clearTimeout(temporizadorApuntar)
}

export function hablar(texto: string, { src, alTerminar, respaldo }: OpcionesVoz = {}) {
  detener()
  if (mudo) {
    alTerminar?.()
    return
  }
  const rutas = src ? [src] : (audiosDe(texto) ?? (respaldo ? audiosDe(respaldo) : null))
  if (rutas) return tocarCola(rutas, alTerminar)
  cargarIndice()
  if (!('speechSynthesis' in window)) {
    alTerminar?.()
    return
  }
  if (!avisado) {
    avisado = true
    console.warn('[audio] Faltan audios pregrabados: se usa la voz del navegador (ver scripts/voz/README.md).')
  }
  const u = new SpeechSynthesisUtterance(texto)
  const voz = mejorVoz()
  if (voz) u.voice = voz
  u.lang = voz?.lang ?? 'es-CL'
  // Las voces neuronales ya suenan naturales: basta con frenarlas un poco.
  // Un tono algo más alto la hace más cálida para niños pequeños.
  u.rate = voz && esNatural(voz) ? 0.9 : 0.8
  u.pitch = 1.1
  u.onend = u.onerror = () => alTerminar?.()
  // Chrome pierde un speak() pegado a un cancel(); se da un respiro.
  pendiente = window.setTimeout(() => speechSynthesis.speak(u), 60)
}

// La voz del navegador por defecto suele ser robótica. Se elige la mejor voz en
// español instalada: primero las neuronales («Natural» / «Online», como
// Microsoft Catalina de Chile en Edge), luego el acento chileno o latino, y al
// final cualquier español. Se recalcula si el navegador carga más voces.
let vozCacheada: SpeechSynthesisVoice | null | undefined

const esNatural = (v: SpeechSynthesisVoice) => /natural|online|neural/i.test(v.name)

function puntaje(v: SpeechSynthesisVoice) {
  const lang = v.lang.toLowerCase().replace('_', '-')
  let p = 0
  if (esNatural(v)) p += 10
  if (lang === 'es-cl') p += 5
  else if (/^es-(419|mx|us|ar|co|pe)$/.test(lang)) p += 3
  else if (lang === 'es-es') p += 1
  if (/google/i.test(v.name)) p += 2
  // Voces femeninas conocidas: suelen resultar más cercanas para párvulos.
  if (/catalina|dalia|paloma|elena|helena|sabina|paulina|camila|valentina|monica|mónica|lucia|lucía/i.test(v.name)) p += 1
  return p
}

function mejorVoz() {
  if (vozCacheada !== undefined) return vozCacheada
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
  // Algunas voces aún no cargan: no se guarda nada para volver a intentar.
  if (voces.length === 0) return null
  vozCacheada = voces.reduce((a, b) => (puntaje(b) > puntaje(a) ? b : a))
  return vozCacheada
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    vozCacheada = undefined
  })
}

export function detener() {
  turno++
  window.clearTimeout(pendiente)
  reproduciendo?.pause()
  reproduciendo = null
  if ('speechSynthesis' in window) speechSynthesis.cancel()
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

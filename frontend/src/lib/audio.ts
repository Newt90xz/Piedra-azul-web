let reproduciendo: HTMLAudioElement | null = null
let turno = 0

export interface OpcionesVoz {
  alTerminar?: () => void
}

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/$/, '')

// Voz apagada hasta que el niño la active con el botón del altavoz. Solo calla
// la voz: los efectos dependen del ajuste «silenciar efectos» de la docente.
let mudo = true
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

export function hablarPocket(texto: string, opciones: OpcionesVoz = {}) {
  detener()
  if (mudo) {
    opciones.alTerminar?.()
    return
  }

  const mio = ++turno
  const audio = new Audio(`${API}/api/voz?texto=${encodeURIComponent(texto)}`)
  reproduciendo = audio
  let finalizado = false
  const terminar = () => {
    if (mio !== turno || finalizado) return
    finalizado = true
    opciones.alTerminar?.()
  }

  const avisarFallo = () => {
    if (mio !== turno || finalizado) return
    console.warn(`[audio] Pocket-TTS no pudo reproducir: ${texto}`)
    terminar()
  }

  audio.onerror = avisarFallo
  audio.onended = terminar
  void audio.play().catch(avisarFallo)
}

export const hablar = hablarPocket

export function detener() {
  turno++
  reproduciendo?.pause()
  reproduciendo = null
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

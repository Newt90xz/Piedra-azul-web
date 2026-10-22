// Audio de la plataforma.
//
// RF-04 / RNF-04: fonemas, sílabas e instrucciones deben sonar con audios
// grabados por voz humana y validados por la educadora. Esos archivos se
// cargarán desde Supabase Storage. Mientras no existan, si una pieza no trae
// `src` se usa la voz del navegador SOLO como marcador de desarrollo: no es
// apta para el piloto porque puede deletrear en vez de sonar «mmmaaa».

let reproduciendo: HTMLAudioElement | null = null
let avisado = false

export interface OpcionesVoz {
  src?: string
  alTerminar?: () => void
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

export function hablar(texto: string, { src, alTerminar }: OpcionesVoz = {}) {
  detener()
  if (mudo) {
    alTerminar?.()
    return
  }
  if (src) {
    reproduciendo = new Audio(src)
    reproduciendo.onended = () => alTerminar?.()
    void reproduciendo.play().catch(() => alTerminar?.())
    return
  }
  if (!('speechSynthesis' in window)) {
    alTerminar?.()
    return
  }
  if (!avisado) {
    avisado = true
    console.warn('[audio] Usando voz sintética provisional: faltan audios grabados (RNF-04).')
  }
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = 'es-CL'
  u.rate = 0.8
  u.onend = u.onerror = () => alTerminar?.()
  // Chrome pierde un speak() pegado a un cancel(); se da un respiro.
  pendiente = window.setTimeout(() => speechSynthesis.speak(u), 60)
}

export function detener() {
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

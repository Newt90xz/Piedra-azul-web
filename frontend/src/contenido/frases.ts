// Frases que dice la voz y que se arman con datos (un nombre, un precio, un
// título). Las usan las pantallas del niño y el catálogo de frases que se
// pregeneran (lib/catalogoVoz.ts): así ambos dicen exactamente lo mismo y
// la frase pregenerada es la que de verdad suena.
// Las frases fijas («¡Empezar!», «Seguir»…) quedan escritas en cada pantalla:
// el catálogo las lee directo del código.

// ---------- Entrada y saludo ----------

export const PREGUNTA_PERFIL = '¿Quién eres? Toca tu foto.'
export const saludoAlumno = (nombre: string) => `¡Hola, ${nombre}!`
// Lo que dice el botón de su perfil al apuntarlo.
export const nombreEnPerfil = (nombre: string, ocupado: boolean) => (ocupado ? `${nombre} ya entró` : nombre)

// Si no puede entrar: hablado, sin texto que leer.
export const AVISOS_ENTRADA: Record<string, string> = {
  perfil_ocupado: 'Ese perfil ya entró en otro computador. Pide ayuda a tu profe.',
  perfil_invalido: 'Ese perfil no está disponible. Pide ayuda a tu profe.',
}
export const NO_SE_PUDO_ENTRAR = 'No se pudo entrar. Intenta otra vez.'

// ---------- Globos: espera y recreo ----------

// Sin sala, con una sala sin plan o al terminar sin sala siguiente: espera a la docente.
export const SALUDO_ESPERA = 'Mientras esperas a tu profe, ¡revienta los globos!'
// Recreo con globos (o con juegos que la docente aún no elige).
export const SALUDO_RECREO_GLOBOS = '¡Es hora de recreo! ¡Revienta los globos!'

// ---------- Sala de actividades ----------

export const fraseCamino = (titulo: string, otraVez: boolean) => (otraVez ? `¡Vamos otra vez! ${titulo}.` : `¡Vamos! ${titulo}.`)

export type VariantePremio = 'logrado' | 'repetir' | 'juego'
export function frasePremio(variante: VariantePremio, monedas: number) {
  if (variante === 'logrado') return `¡Lo lograste! Ganaste ${monedas} monedas.`
  if (variante === 'repetir') return `¡Ganaste ${monedas} monedas! Vamos a intentarlo otra vez.`
  return `¡Muy bien! Ganaste ${monedas} monedas.`
}

// ---------- Tienda y dibujo ----------

export const frasePrecio = (precio: number) => `${precio} monedas`
// Al apuntar un artículo que todavía no es suyo.
export const articuloConPrecio = (nombre: string, precio: number) => `${nombre}, ${precio} monedas`
export const colorDePiel = (i: number) => `Color de piel ${i + 1}`
export const letraParaRepasar = (letra: string) => `Letra ${letra}`

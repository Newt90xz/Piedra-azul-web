// Clave estable de una frase hablada: la usa la app para buscar el audio
// pregrabado y scripts/frasesVoz.ts para nombrar los archivos al generarlos.
// Mismo texto (sin importar espacios de más) → mismo archivo.

export const normalizarFrase = (texto: string) => texto.replace(/\s+/g, ' ').trim()

// cyrb53: hash de 53 bits, rápido y sin dependencias; con miles de frases no choca.
export function claveFrase(texto: string) {
  const t = normalizarFrase(texto)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// Una frase armada al azar («Escucha: sol… mariposa. ¿Cuál es más corta?») se
// pregraba por trozos y la app los encadena: cada oración o palabra suelta
// termina en . ! ? … o : seguidos de espacio.
export function trozosFrase(texto: string) {
  return normalizarFrase(texto)
    .split(/(?<=[.!?…:])\s+/)
    .filter(Boolean)
}

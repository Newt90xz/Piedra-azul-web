import { nombreLetra } from '../contenido/banco.ts'

// Cómo se prepara un texto antes de pedírselo a la voz. Sin navegador ni
// React: lo usan la app (lib/audio.ts, actividades/rondas.tsx) y el catálogo de
// frases que se pregeneran (lib/catalogoVoz.ts), así ambos piden exactamente lo mismo.

// Los sonidos alargados («uuuu», «mmmm») la voz los dice mal: se cambian por el
// nombre de la letra. Es un resguardo: los textos de las actividades ya no los usan.
export function paraVoz(texto: string) {
  return texto
    .replace(/(?<![\p{L}])(\p{L})\1{2,}(?![\p{L}])/giu, (_, l: string) => nombreLetra(l))
    .replace(/\s+/g, ' ')
    .trim()
}

// Una palabra o sílaba sola la voz la dice mal muchas veces («mano» → «mando»):
// dentro de una frase corta sale clara.
export const enFrase = (audio: string) => `${audio.toUpperCase()}.`

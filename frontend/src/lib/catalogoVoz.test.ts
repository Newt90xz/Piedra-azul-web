import { describe, expect, it } from 'vitest'
import { fraseCamino, frasePremio, saludoAlumno } from '../contenido/frases.ts'
import { MAX_CARACTERES, frasesDeLaApp, frasesDePantallas, frasesDeRonda, type Fuente } from './catalogoVoz.ts'
import { paraVoz } from './textoVoz.ts'

const archivos = import.meta.glob<string>('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
// Rutas relativas a src/: Vite entrega «./x.ts» para los de lib/ y «../y/z.ts» para el resto.
const fuentes: Fuente[] = Object.entries(archivos).map(([ruta, texto]) => ({ ruta: ruta.startsWith('./') ? `lib/${ruta.slice(2)}` : ruta.replace(/^\.\.\//, ''), texto }))

describe('catálogo de frases de la voz', () => {
  const frases = frasesDeLaApp(fuentes, { nombres: ['Sofía'], partidasPorActividad: 200 })
  const textos = new Set(frases.map((f) => f.texto))

  it('trae las frases fijas de las pantallas', () => {
    for (const t of ['¿Quién eres? Toca tu foto.', '¿Cómo te sientes hoy?', '¡Empezar!', 'Seguir', '¡Mira! Es esta. ¡Tócala!', 'Mientras esperas a tu profe, ¡revienta los globos!'])
      expect(textos, t).toContain(t)
  })

  it('trae los premios, el camino y los saludos con nombre', () => {
    expect(textos).toContain(frasePremio('logrado', 50))
    expect(textos).toContain(fraseCamino('Marca las palabras del dibujo', true))
    expect(textos).toContain(saludoAlumno('Sofía'))
  })

  it('cada frase está tal como la pide la app y cabe en el límite del backend', () => {
    for (const f of frases) {
      expect(f.texto).toBe(paraVoz(f.texto))
      expect(f.texto.length).toBeLessThanOrEqual(MAX_CARACTERES)
    }
  })

  it('ninguna pantalla arma una frase con ${…} fuera de contenido/frases.ts', () => {
    // Si falla: mover esa frase a contenido/frases.ts y agregarla al catálogo.
    expect(frasesDePantallas(fuentes).dinamicas).toEqual([])
  })

  it('lee las frases de hablar(…), voz="…", voz={…} y voz: … sin tomar códigos ni clases', () => {
    const { fijas } = frasesDePantallas([
      {
        ruta: 'x.tsx',
        texto: [
          "hablar(error === 'sin_monedas' ? '¡Te faltan monedas!' : 'No se pudo.')",
          '<BotonNino voz="Seguir" className="grid size-20" />',
          "<BotonNino voz={mudo ? 'Activar la voz' : 'Apagar la voz'} />",
          "const p = [{ voz: 'Yo', icono: '🙂' }]",
          'hablar(\n  ronda.instruccion,\n)',
        ].join('\n'),
      },
    ])
    expect(fijas.sort()).toEqual(['Activar la voz', 'Apagar la voz', 'No se pudo.', 'Seguir', 'Yo', '¡Te faltan monedas!'].sort())
  })

  it('al marcar tarjetas dice cada palabra (como frase corta) o cada oración', () => {
    const imagen = { alt: 'gato', emoji: '🐱' }
    const dichas = frasesDeRonda({
      tipo: 'marcar',
      item: 'Palabra y dibujo',
      tarjetas: [
        { id: '0', imagen, texto: 'GATO', audio: 'gato', corresponde: true },
        { id: '1', imagen, audio: 'El gato come queso.', corresponde: true },
      ],
      instruccion: 'Marca.',
      pista: '¡Casi!',
    })
    expect(dichas).toEqual(['Marca.', '¡Casi!', 'GATO.', 'El gato come queso.'])
  })
})

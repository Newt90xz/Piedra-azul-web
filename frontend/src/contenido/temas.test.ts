import { describe, expect, it } from 'vitest'
import { bancoGeneral, palabrasDelTema, PALABRAS } from './banco.ts'
import { PARECIDOS, TEMAS, TEMAS_FILTRO, TEMAS_IDS, TEMAS_PREGUNTABLES, contrastables, type Tema } from './temas.ts'

// Los PNG que se publican (public/imagenes), con el nombre exacto: en un
// servidor Linux «Sol.png» no es «sol.png».
const imagenes = Object.keys(import.meta.glob('../../public/imagenes/*.png')).map((ruta) => ruta.split('/').at(-1)!)
// Como ui/nino.tsx (rutaImagenLocal).
const archivoDe = (alt: string) =>
  `${alt
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.png`

describe('temas de palabras', () => {
  it('cada palabra del código tiene un tema y su pictograma', () => {
    for (const w of PALABRAS) {
      expect(w.tema && TEMAS_IDS.includes(w.tema), w.id).toBeTruthy()
      expect(imagenes, w.id).toContain(archivoDe(w.imagen.alt))
    }
  })

  it('los ids no se repiten', () => {
    expect(new Set(PALABRAS.map((w) => w.id)).size).toBe(PALABRAS.length)
  })

  it('el banco general no trae meses ni estaciones y sus emojis no se repiten (salvo flor y flores)', () => {
    const general = bancoGeneral()
    expect(general.some((w) => w.tema === 'meses' || w.tema === 'estaciones')).toBe(false)
    const repetidos = general.filter((w, i) => general.findIndex((x) => x.imagen.emoji === w.imagen.emoji) !== i)
    expect(repetidos.map((w) => w.id)).toEqual(['flor'])
  })

  it('los nombres caben como ítem de una ronda (20 caracteres)', () => {
    for (const t of TEMAS_IDS) expect(TEMAS[t].nombre.length, t).toBeLessThanOrEqual(20)
  })

  it('las listas de temas y de parecidos apuntan a temas y palabras que existen', () => {
    for (const t of TEMAS_IDS) for (const otro of TEMAS[t].noContrastar) expect(TEMAS_IDS, `${t} → ${otro}`).toContain(otro)
    for (const grupo of PARECIDOS) for (const id of grupo) expect(PALABRAS.some((w) => w.id === id) || id === 'rana', id).toBe(true) // «rana»: por si llega desde la base
  })

  it('no se contrastan temas que se confunden, en ningún sentido', () => {
    const pares: [Tema, Tema][] = [
      ['frutas', 'verduras'],
      ['frutas', 'alimentos'],
      ['profesiones', 'oficios'],
      ['profesiones', 'familia'],
      ['animales', 'alimentos'],
      ['animales', 'profesiones'],
      ['transporte', 'oficios'],
      ['meses', 'estaciones'],
      ['ropa', 'casa'],
    ]
    for (const [a, b] of pares) {
      expect(contrastables(a, b), `${a} / ${b}`).toBe(false)
      expect(contrastables(b, a), `${b} / ${a}`).toBe(false)
    }
    expect(contrastables('frutas', 'transporte')).toBe(true)
    expect(contrastables('animales', 'personajes')).toBe(false)
  })

  it('cada tema que se pregunta tiene palabras suficientes y otras con que contrastarlo', () => {
    for (const t of TEMAS_PREGUNTABLES) {
      expect(palabrasDelTema(t).length, t).toBeGreaterThanOrEqual(3)
      expect(PALABRAS.filter((w) => w.tema && contrastables(t, w.tema)).length, t).toBeGreaterThanOrEqual(10)
    }
  })

  it('los meses y las estaciones solo se preguntan, no se filtran', () => {
    expect(TEMAS_PREGUNTABLES).toEqual(expect.arrayContaining(['meses', 'estaciones', 'frutas', 'profesiones', 'oficios', 'transporte']))
    expect(TEMAS_FILTRO).not.toContain('meses')
    expect(TEMAS_FILTRO).not.toContain('estaciones')
    expect(TEMAS_FILTRO).not.toContain('personajes')
  })
})

import { describe, expect, it } from 'vitest'
import { COLORES_PELO, PERSONAJES_BASE, personajeDesdeBase, personajePorDefecto, vestir } from './personaje.ts'
import { ARTICULOS, articulo } from './tienda.ts'

const dibujos = Object.keys(import.meta.glob('../assets/personaje/**/*.svg'))
const migraciones = Object.values(import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true })).join('\n')

describe('catálogo de la tienda', () => {
  it('no repite ids', () => {
    expect(new Set(ARTICULOS.map((a) => a.id)).size).toBe(ARTICULOS.length)
  })

  it('cada artículo tiene su dibujo', () => {
    for (const a of ARTICULOS) {
      expect(dibujos, a.id).toContain(`../assets/personaje/${a.espacio}/${a.id}.svg`)
    }
  })

  it('la base cobra lo mismo que muestra la tienda', () => {
    for (const a of ARTICULOS) {
      expect(migraciones, a.id).toContain(`('${a.id}', '${a.espacio}', ${a.precio})`)
    }
  })

  it('los personajes base usan solo partes gratis', () => {
    for (const b of PERSONAJES_BASE) {
      expect(articulo(b.pelo)?.precio, b.id).toBe(0)
      expect(articulo(b.ojos)?.precio, b.id).toBe(0)
      expect(COLORES_PELO.some((c) => c.id === b.colorPelo), b.id).toBe(true)
    }
  })

  it('los personajes base se distinguen entre sí', () => {
    expect(new Set(PERSONAJES_BASE.map((b) => b.pelo)).size).toBe(PERSONAJES_BASE.length)
  })
})

describe('vestir', () => {
  const p = personajeDesdeBase(PERSONAJES_BASE[0])

  it('un traje reemplaza la polera y al revés', () => {
    const conPolera = vestir(p, 'ropa', 'polera_dino')
    const conTraje = vestir(conPolera, 'traje', 'traje_heroe')
    expect(conTraje.puestos).toEqual({ traje: 'traje_heroe' })
    expect(vestir(conTraje, 'ropa', 'polera_dino').puestos).toEqual({ ropa: 'polera_dino' })
  })

  it('quitar no toca lo demás', () => {
    const puesto = vestir(vestir(p, 'cabeza', 'tiara'), 'cara', 'antifaz')
    expect(vestir(puesto, 'cabeza', undefined).puestos).toEqual({ cara: 'antifaz' })
  })

  it('cambiar de personaje base conserva lo puesto', () => {
    const puesto = vestir(p, 'cabeza', 'tiara')
    const nuevo = personajeDesdeBase(PERSONAJES_BASE[3], puesto)
    expect(nuevo.pelo).toBe(PERSONAJES_BASE[3].pelo)
    expect(nuevo.puestos.cabeza).toBe('tiara')
  })

  it('el personaje por defecto es estable', () => {
    expect(personajePorDefecto('Sofía')).toEqual(personajePorDefecto('Sofía'))
  })
})

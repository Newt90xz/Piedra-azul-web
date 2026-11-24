// Estaciones del año para el fondo de la vista del niño (temática «Estaciones
// del año»): cambia sola según la fecha. En Chile (hemisferio sur):
//   primavera: 21 de septiembre a 20 de diciembre
//   verano:    21 de diciembre a 20 de marzo
//   otoño:     21 de marzo a 20 de junio
//   invierno:  21 de junio a 20 de septiembre
// Solo emojis que Windows 10 dibuja (Unicode 12 o anterior).

export type Estacion = 'primavera' | 'verano' | 'otono' | 'invierno'

interface DatosEstacion {
  nombre: string
  icono: string
  // Lo que se mueve por los costados del fondo.
  personajes: string[]
  // Hojas y nieve caen; flores, mariposas y burbujas suben.
  caen: boolean
  // Tinte del cielo y del pasto, suave para no competir con la actividad.
  cielo: string
  suelo: string
}

export const ESTACIONES: Record<Estacion, DatosEstacion> = {
  primavera: { nombre: 'Primavera', icono: '🌸', personajes: ['🌸', '🦋', '🌷', '🐝', '🌼', '🐞'], caen: false, cielo: '#fde4f0', suelo: '#c9ecc0' },
  verano: { nombre: 'Verano', icono: '☀️', personajes: ['☀️', '🍉', '🐚', '🍦', '🌴', '🏖️'], caen: false, cielo: '#fff1c7', suelo: '#f6e2a8' },
  otono: { nombre: 'Otoño', icono: '🍂', personajes: ['🍂', '🍁', '🌰', '🍄', '🦔', '☂️'], caen: true, cielo: '#fde3c8', suelo: '#e9c99a' },
  invierno: { nombre: 'Invierno', icono: '❄️', personajes: ['❄️', '☃️', '🧣', '❄️', '🧤', '☔'], caen: true, cielo: '#dde9f7', suelo: '#eef4fb' },
}

// La estación del día (mes 0 = enero).
export function estacionDe(fecha = new Date()): Estacion {
  const m = fecha.getMonth()
  const d = fecha.getDate()
  const desde = (mes: number) => m > mes || (m === mes && d >= 21)
  if (desde(11) || m < 2 || (m === 2 && d < 21)) return 'verano'
  if (desde(8)) return 'primavera'
  if (desde(5)) return 'invierno'
  return 'otono'
}

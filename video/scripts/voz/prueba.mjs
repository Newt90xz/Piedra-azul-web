// Prueba de voces: la misma frase del gancho con cada candidata.
// Uso: node scripts/voz/prueba.mjs
import { tts } from './tts.mjs'

const FRASE = 'En un Kínder, cada niño aprende a leer a su propio ritmo. ¿Cómo hace una sola educadora para acompañarlos a todos al mismo tiempo?'

const CANDIDATAS = [
  // Voces predefinidas de la cuenta: en el plan gratuito la API no deja usar las
  // de la biblioteca (Angela, chilena, sería la primera opción con un plan pagado).
  { archivo: '1-sarah', vozId: 'EXAVITQu4vr4xnSDxMaL' },
  { archivo: '2-matilda', vozId: 'XrExE9yKIg1WjnnlVkGX' },
  { archivo: '3-bella', vozId: 'hpp4J3VqNfWAUOO0d1Us' },
]

const elegidas = process.argv.slice(2)
for (const c of CANDIDATAS.filter((c) => elegidas.length === 0 || elegidas.includes(c.archivo))) {
  try {
    const r = await tts({ vozId: c.vozId, texto: FRASE, salida: `voz/pruebas/${c.archivo}.mp3` })
    console.log(`OK ${c.archivo}: ${r.caracteres} caracteres`)
  } catch (e) {
    console.log(`FALLO ${c.archivo}: ${e.message}`)
  }
}

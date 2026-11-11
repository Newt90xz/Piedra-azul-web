// Deja el recreo como al empezar la toma C13: en Parque, con Sofía, Lucas, Benjamín e
// Isidora dentro, y Sofía con su ropa de siempre (lo que ya compró sigue siendo suyo,
// pero no lo lleva puesto).
// Uso: node --env-file=../frontend/.env scripts/datos/preparar-recreo.mjs
import { CURSO } from './montar.mjs'
import { ok, sesionDocente } from './sesion.mjs'

const s = await sesionDocente()
const curso = ok(await s.from('cursos').select('id').eq('nombre', CURSO).single())
const recreo = ok(await s.from('salas').update({ actividad: 'parque' }).eq('curso_id', curso.id).eq('tipo', 'recreo').select('id').single())
const ninos = ok(await s.from('estudiantes').select('id, nombre, personaje, monedas').eq('curso_id', curso.id))
for (const n of ninos.filter((x) => ['Sofía', 'Lucas', 'Benjamín', 'Isidora'].includes(x.nombre))) {
  ok(await s.from('sala_miembros').upsert({ estudiante_id: n.id, sala_id: recreo.id, unido_en: new Date().toISOString() }).select('estudiante_id'))
}
const sofia = ninos.find((n) => n.nombre === 'Sofía')
ok(await s.from('estudiantes').update({ personaje: { ...sofia.personaje, puestos: {} } }).eq('id', sofia.id).select('id'))
console.log(`Recreo en Parque con los cuatro dentro; Sofía con su ropa base y ${sofia.monedas} monedas`)

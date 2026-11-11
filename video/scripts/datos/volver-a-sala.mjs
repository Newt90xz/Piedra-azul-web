// Vuelve a dejar a los seis niños al inicio del plan de «Grupo Letras» (como después
// de la toma C5), para repetir las tomas de juego: el plan se asigna de nuevo, que es
// lo que reinicia el avance en la app, y todos vuelven a esa sala.
// Uso: node --env-file=../frontend/.env scripts/datos/volver-a-sala.mjs
import { randomUUID } from 'node:crypto'
import { CURSO } from './montar.mjs'
import { ok, sesionDocente } from './sesion.mjs'

const s = await sesionDocente()
const curso = ok(await s.from('cursos').select('id').eq('nombre', CURSO).single())
const salas = ok(await s.from('salas').select('id, nombre, actividad').eq('curso_id', curso.id))
const letras = salas.find((x) => x.nombre === 'Grupo Letras')
const ninos = ok(await s.from('estudiantes').select('id, nombre').eq('curso_id', curso.id))
for (const sala of salas.filter((x) => x.nombre.startsWith('Grupo'))) ok(await s.from('salas').update({ asignacion: randomUUID() }).eq('id', sala.id).select('id'))
ok(await s.from('salas').update({ actividad: 'parque' }).eq('curso_id', curso.id).eq('tipo', 'recreo').select('id'))
ok(await s.from('progreso_sala').update({ necesita_ayuda: false }).in('estudiante_id', ninos.map((n) => n.id)).select('estudiante_id'))
for (const n of ninos) ok(await s.from('sala_miembros').upsert({ estudiante_id: n.id, sala_id: letras.id, unido_en: new Date().toISOString() }).select('estudiante_id'))
console.log(`Los ${ninos.length} niños vuelven al inicio del plan de «Grupo Letras»`)

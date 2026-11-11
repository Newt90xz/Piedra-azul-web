import { ok, sesionDocente } from './sesion.mjs'
const s = await sesionDocente()
const cursos = ok(await s.from('cursos').select('id, nombre, docente_id').order('nombre'))
for (const c of cursos) {
  const est = ok(await s.from('estudiantes').select('id, nombre, activo, monedas, ajustes').eq('curso_id', c.id).order('nombre'))
  const salas = ok(await s.from('salas').select('id, nombre, tipo').eq('curso_id', c.id))
  console.log(`CURSO ${c.nombre}: ${est.length} estudiantes, ${salas.length} salas [${salas.map((x) => x.nombre + ':' + x.tipo).join(', ')}]`)
  for (const e of est) console.log(`   ${e.activo ? '●' : '○'} ${e.nombre} · ${e.monedas} monedas · ${e.ajustes?.exigencia ?? '-'}`)
}
const pl = await s.from('plantillas_actividad').select('id, nombre')
console.log('plantillas propias:', pl.error ? 'ERROR ' + pl.error.message : pl.data.map((p) => p.nombre).join(', ') || '(ninguna)')
const todos = ok(await s.rpc('perfiles_alumnos'))
console.log('perfiles visibles en /alumno:', todos.map((p) => p.nombre).join(', '))

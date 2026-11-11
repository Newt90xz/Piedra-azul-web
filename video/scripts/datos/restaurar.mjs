// Devuelve lo que `montar.mjs` sacó de la vista: reactiva los perfiles que estaban
// activos y vuelve a crear las plantillas con su mismo contenido.
// Con --ocultar-video además desactiva a los seis niños del curso del video.
// Uso: node --env-file=../frontend/.env scripts/datos/restaurar.mjs [--ocultar-video]
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { CURSO } from './montar.mjs'
import { ok, sesionDocente } from './sesion.mjs'

const previo = JSON.parse(await readFile(fileURLToPath(new URL('../../.respaldo/estado-previo.json', import.meta.url)), 'utf8'))
const s = await sesionDocente()

if (previo.docente) {
  const yo = ok(await s.from('docentes').select('id').single())
  ok(await s.from('docentes').update({ nombre: previo.docente }).eq('id', yo.id).select('id'))
  console.log(`Nombre de la cuenta: «${previo.docente}»`)
}

const activos = previo.estudiantes.filter((e) => e.activo).map((e) => e.id)
if (activos.length) ok(await s.from('estudiantes').update({ activo: true }).in('id', activos).select('id'))
console.log(`Perfiles reactivados: ${activos.length}`)

const hay = ok(await s.from('plantillas_actividad').select('id'))
const faltan = previo.plantillas.filter((p) => !hay.some((x) => x.id === p.id))
if (faltan.length) ok(await s.from('plantillas_actividad').insert(faltan).select('id'))
console.log(`Plantillas devueltas: ${faltan.length}`)

if (process.argv.includes('--ocultar-video')) {
  const curso = ok(await s.from('cursos').select('id').eq('nombre', CURSO).maybeSingle())
  if (curso) {
    const n = ok(await s.from('estudiantes').update({ activo: false }).eq('curso_id', curso.id).select('id')).length
    console.log(`Niños del video desactivados: ${n}`)
  }
}
console.log('Perfiles visibles en /alumno:', ok(await s.rpc('perfiles_alumnos')).map((p) => p.nombre).join(', '))

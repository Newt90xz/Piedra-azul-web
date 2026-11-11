// Deja el curso del video como al empezar la clase, para repetir las tomas.
//   (sin opciones)  Martina vuelve a Intermedio, se borran las salas y las plantillas
//                   creadas en el video, y se cierran los dispositivos de los niños.
//   --todo          además borra a los seis niños con su historial; después hay que
//                   correr montar.mjs para volver a crearlos (el historial sale igual).
// Uso: node --env-file=../frontend/.env scripts/datos/reiniciar.mjs [--todo]
import { existsSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { CURSO } from './montar.mjs'
import { ok, sesionDocente } from './sesion.mjs'

const s = await sesionDocente()
const curso = ok(await s.from('cursos').select('id').eq('nombre', CURSO).single())
const ninos = ok(await s.from('estudiantes').select('id, nombre, ajustes').eq('curso_id', curso.id))

const salas = ok(await s.from('salas').delete().eq('curso_id', curso.id).select('id'))
// Solo las plantillas creadas en el video: las que ya existían están en el respaldo y no se tocan.
const respaldo = fileURLToPath(new URL('../../.respaldo/estado-previo.json', import.meta.url))
const previas = existsSync(respaldo) ? JSON.parse(readFileSync(respaldo, 'utf8')).plantillas.map((p) => p.id) : []
const delVideo = ok(await s.from('plantillas_actividad').select('id')).map((p) => p.id).filter((id) => !previas.includes(id))
const plantillas = delVideo.length ? ok(await s.from('plantillas_actividad').delete().in('id', delVideo).select('id')) : []
if (ninos.length) ok(await s.from('sesiones_alumno').delete().in('estudiante_id', ninos.map((n) => n.id)).select('estudiante_id'))
console.log(`Borradas ${salas.length} salas y ${plantillas.length} plantillas; dispositivos cerrados`)

if (process.argv.includes('--todo')) {
  ok(await s.from('estudiantes').delete().eq('curso_id', curso.id).select('id'))
  console.log(`Borrados ${ninos.length} niños con su historial: corre montar.mjs`)
} else {
  const martina = ninos.find((n) => n.nombre === 'Martina')
  if (martina) ok(await s.from('estudiantes').update({ ajustes: { ...martina.ajustes, exigencia: 'intermedio' } }).eq('id', martina.id).select('id'))
  console.log('Martina vuelve a exigencia Intermedio')
}
// Las tablets olvidan su sesión guardada.
const dir = fileURLToPath(new URL('../../.respaldo/', import.meta.url))
for (const n of ['Sofía', 'Tomás', 'Martina', 'Benjamín', 'Isidora', 'Lucas']) await rm(`${dir}nino-${n}.json`, { force: true })

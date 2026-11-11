// Exploración (no es una toma): entra como la educadora, guarda su sesión para las
// tomas y saca pantallazos para revisar el encuadre.
// Uso: node scripts/capturas/explorar.mjs <carpeta de salida>
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'
import { APP, ESTADO_DOCENTE, cerrarNavegador, entrarDocente } from './lib.mjs'
import { DATOS } from '../datos/montar.mjs'

const salida = process.argv[2]
const { cursoId, ninos } = JSON.parse(await readFile(DATOS, 'utf8'))
await entrarDocente()

const b = await chromium.launch({ channel: 'chrome' })
const c = await b.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, storageState: ESTADO_DOCENTE, locale: 'es-CL', timezoneId: 'America/Santiago' })
await c.addInitScript((id) => sessionStorage.setItem('leer-para-todos/curso', id), cursoId)
const p = await c.newPage()
for (const [nombre, ruta] of [['panel', '/docente'], ['estudiantes', '/docente/estudiantes'], ['salas', '/docente/salas'], ['avance', '/docente/avance'], ['ficha-tomas', `/docente/estudiantes/${ninos['Tomás']}`], ['perfil-martina', `/docente/estudiantes/${ninos['Martina']}?pestana=perfil`]]) {
  await p.goto(APP + ruta, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `${salida}/${nombre}.png`, fullPage: true })
  console.log('✔', nombre)
}
await b.close()
await cerrarNavegador()

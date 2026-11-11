// Deja el material listo para la edición en Remotion (carpeta public/, no se versiona):
//   · tomas/<toma>.mp4   las capturas a 30 fps constantes, para buscar cuadros sin saltos;
//   · tomas/<toma>.wav   el audio de la app en esa pantalla, alineado con el video: las
//                        frases que dijo (los mismos audios que generó su servidor de voz,
//                        puestos donde sonaron y cortados donde la app los cortó) más los
//                        efectos y la música que se grabaron de Web Audio;
//   · voz/<parte>.mp3    la voz en off; img/<niño>.png los personajes recortados de una captura;
//   · src/tomas.json     marcas, duraciones y lo que dijo la app (para los subtítulos).
// Uso: node scripts/preparar.mjs [c05 c08 …] [--solo-datos]   (sin tomas: todas)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const bruto = join(raiz, 'capturas')
const publico = join(raiz, 'public')
const cache = join(raiz, '.cache-voz')
for (const d of ['tomas', 'voz', 'img']) mkdirSync(join(publico, d), { recursive: true })

// El ffmpeg que trae Remotion.
const pnpm = join(raiz, '..', 'node_modules', '.pnpm')
const paquete = readdirSync(pnpm).find((d) => d.startsWith('@remotion+compositor-win32'))
const bin = join(pnpm, paquete, 'node_modules', '@remotion', paquete.split('@')[1].replace('remotion+', ''))
const ffmpeg = (...a) => execFileSync(join(bin, 'ffmpeg.exe'), ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'pipe', 'pipe'] })
const duracion = (f) => Number(execFileSync(join(bin, 'ffprobe.exe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

const args = process.argv.slice(2)
const soloDatos = args.includes('--solo-datos')
const pedidas = args.filter((a) => !a.startsWith('--'))
// De estas tomas largas solo se usa el comienzo.
const HASTA = { 'c08-martina': 150, 'c08-benjamin': 150, 'c03-sala-y-plan': 80 }

// ---------- Voz de la app ----------
const HZ = 24000
const claveCache = (t) => createHash('sha1').update(t.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 20)
const textoDe = (src) => (src?.includes('/api/voz?texto=') ? decodeURIComponent(src.split('texto=')[1]) : null)

function leerWav(archivo) {
  const b = readFileSync(archivo)
  let i = 12
  while (i + 8 <= b.length) {
    const tam = b.readUInt32LE(i + 4)
    if (b.toString('ascii', i, i + 4) === 'data') return new Int16Array(b.buffer, b.byteOffset + i + 8, Math.floor(Math.min(tam, b.length - i - 8) / 2))
    i += 8 + tam
  }
  throw new Error(`WAV sin datos: ${archivo}`)
}

// Lo que dijo la app, con su inicio y su fin reales (fin: terminó o la cortó otra frase).
function frasesDe(audio) {
  const frases = []
  for (const [i, e] of audio.entries()) {
    if (e.tipo !== 'voz-suena') continue
    const texto = textoDe(e.src)
    if (!texto) continue
    const fin = audio.slice(i + 1).find((x) => x.tipo === 'voz-fin' && x.src === e.src)
    frases.push({ t: e.t, fin: fin?.t ?? e.t + 30, texto })
  }
  return frases
}

function pistaDeVoz(frases, segundos, salida) {
  const pista = new Float32Array(Math.ceil(segundos * HZ))
  for (const f of frases) {
    const archivo = join(cache, `${claveCache(f.texto)}.wav`)
    if (!existsSync(archivo)) {
      console.log(`  (sin audio guardado: «${f.texto}»)`)
      continue
    }
    const pcm = leerWav(archivo)
    const n = Math.min(pcm.length, Math.round((f.fin - f.t) * HZ))
    f.fin = f.t + n / HZ
    const desde = Math.round(f.t * HZ)
    const apagar = Math.round(0.03 * HZ)
    for (let k = 0; k < n && desde + k < pista.length; k++) {
      // Si la app la cortó, se apaga en 30 ms para que no suene un chasquido.
      const g = n < pcm.length && k > n - apagar ? (n - k) / apagar : 1
      pista[desde + k] += (pcm[k] / 32768) * g
    }
  }
  const datos = Buffer.alloc(pista.length * 2)
  for (let k = 0; k < pista.length; k++) datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pista[k])) * 32767), k * 2)
  const cab = Buffer.alloc(44)
  cab.write('RIFF', 0)
  cab.writeUInt32LE(36 + datos.length, 4)
  cab.write('WAVEfmt ', 8)
  cab.writeUInt32LE(16, 16)
  cab.writeUInt16LE(1, 20)
  cab.writeUInt16LE(1, 22)
  cab.writeUInt32LE(HZ, 24)
  cab.writeUInt32LE(HZ * 2, 28)
  cab.writeUInt16LE(2, 32)
  cab.writeUInt16LE(16, 34)
  cab.write('data', 36)
  cab.writeUInt32LE(datos.length, 40)
  writeFileSync(salida, Buffer.concat([cab, datos]))
}

// ---------- Tomas ----------
const tomas = {}
for (const archivo of readdirSync(bruto).filter((a) => /^c\d\d-.*\.webm$/.test(a) && !a.includes('.app.')).sort()) {
  const nombre = archivo.replace('.webm', '')
  const registro = JSON.parse(readFileSync(join(bruto, `${nombre}.json`), 'utf8'))
  const mp4 = join(publico, 'tomas', `${nombre}.mp4`)
  const hacer = !soloDatos && (pedidas.length === 0 || pedidas.some((p) => nombre.startsWith(p)))
  if (hacer) {
    const limite = HASTA[nombre] ? ['-t', String(HASTA[nombre])] : []
    ffmpeg('-i', join(bruto, archivo), ...limite, '-an', '-r', '30', '-c:v', 'libx264', '-crf', '17', '-preset', 'veryfast', '-g', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4)
  }
  const segundos = duracion(mp4)
  const frases = frasesDe(registro.audio)
  const web = join(bruto, `${nombre}.app.webm`)
  const inicioWeb = registro.audio.find((e) => e.tipo === 'webaudio-inicio')?.t
  const conAudio = frases.length > 0 || (existsSync(web) && inicioWeb !== undefined)
  if (conAudio) {
    const voz = join(publico, 'tomas', `${nombre}.voz.wav`)
    pistaDeVoz(frases, segundos, voz)
    if (hacer) {
      const salida = join(publico, 'tomas', `${nombre}.wav`)
      if (existsSync(web) && inicioWeb !== undefined) {
        ffmpeg('-i', voz, '-i', web, '-filter_complex', `[1:a]adelay=${Math.round(inicioWeb * 1000)}:all=1[w];[0:a][w]amix=inputs=2:normalize=0:duration=first[m]`, '-map', '[m]', '-ar', '48000', '-ac', '2', '-t', String(segundos), salida)
      } else ffmpeg('-i', voz, '-ar', '48000', '-ac', '2', salida)
    }
  }
  tomas[nombre] = {
    ancho: registro.tamano.width,
    alto: registro.tamano.height,
    duracion: segundos,
    inicio: registro.inicio,
    audio: conAudio,
    marcas: registro.marcas,
    frases: frases.filter((f) => f.t < segundos).map((f) => ({ t: +f.t.toFixed(2), fin: +f.fin.toFixed(2), texto: f.texto })),
  }
  console.log(`${hacer ? '✔' : '·'} ${nombre}  ${segundos.toFixed(0)} s${conAudio ? `  · ${frases.length} frases de la app` : ''}`)
}

// ---------- Voz en off ----------
const guion = JSON.parse(readFileSync(join(raiz, 'src', 'guion.json'), 'utf8'))
const voz = {}
for (const p of guion.partes) {
  const mp3 = join(raiz, 'voz', `${p.id}.mp3`)
  if (!existsSync(mp3)) throw new Error(`Falta la voz de «${p.id}»: corre scripts/voz/generar.mjs`)
  copyFileSync(mp3, join(publico, 'voz', `${p.id}.mp3`))
  voz[p.id] = { duracion: +duracion(mp3).toFixed(2), texto: p.vo }
}

// ---------- Personajes: recortes de la grilla real de /alumno ----------
const grilla = tomas['c05-tomas']
if (grilla && !soloDatos) {
  const t = grilla.marcas.find((m) => m.etiqueta === 'c5').t + 1.5
  const celdas = { 'Benjamín': [184, 150], Isidora: [384, 150], Lucas: [584, 150], Martina: [784, 150], 'Sofía': [984, 150], 'Tomás': [184, 391] }
  for (const [n, [x, y]] of Object.entries(celdas)) {
    ffmpeg('-ss', String(t), '-i', join(publico, 'tomas', 'c05-tomas.mp4'), '-frames:v', '1', '-vf', `crop=112:112:${x}:${y}`, join(publico, 'img', `${n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}.png`))
  }
}

// ---------- Música (opcional): video/musica.mp3 ----------
const musica = existsSync(join(raiz, 'musica.mp3'))
if (musica) copyFileSync(join(raiz, 'musica.mp3'), join(publico, 'musica.mp3'))

writeFileSync(join(raiz, 'src', 'tomas.json'), JSON.stringify({ tomas, voz, musica: musica ? +duracion(join(raiz, 'musica.mp3')).toFixed(2) : 0 }, null, 1))
console.log(`tomas.json: ${Object.keys(tomas).length} tomas, ${Object.keys(voz).length} partes de voz en off (${Object.values(voz).reduce((s, v) => s + v.duracion, 0).toFixed(0)} s), música: ${musica ? 'sí' : 'no'}`)

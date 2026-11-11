// Arma capturas/revisar.html: una página local para mirar todas las tomas en bruto,
// saltar a cada momento marcado y reproducir a la vez las pantallas que se grabaron juntas.
// Uso: node scripts/revisar.mjs
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../capturas/', import.meta.url))

const TOMAS = [
  { id: 'c01', plan: 'C1', titulo: 'Portada', nota: 'Los primeros segundos en blanco son la carga de la app; se recortan.' },
  { id: 'c02', plan: 'C2', titulo: 'Perfil de Martina: de Intermedio a Inicial y los apoyos' },
  { id: 'c03', plan: 'C3 · C4', titulo: 'Crear «Grupo Letras», el plan con letras configurables (aviso B/V, plantilla) y el recreo conectado', nota: 'Después de la marca «fin» se crea «Grupo Sílabas» (no va en el corte).' },
  { id: 'c05', plan: 'C5 · C6 · C7', titulo: 'Sofía entra, candado en la otra tablet, la educadora la arrastra y la tablet cambia sola' },
  { id: 'c08', plan: 'C8 · C9 · C10 · C11', titulo: 'Actividad de letras: Sofía; Martina (2 opciones) y Benjamín (4); Tomás falla dos veces y aparece «Necesitan tu apoyo»' },
  { id: 'c12', plan: 'C12', titulo: 'Sofía termina el plan: trofeo, «¡Al recreo!» y entra sola al parque', nota: 'Las dos primeras actividades van rápido y sin voz (no salen en el corte).' },
  { id: 'c13', plan: 'C13 · C14 · C15', titulo: 'Recreo: parque y saludos, tienda, y la educadora cambia a Dibujo (Lucas repasa la M)' },
  { id: 'c16', plan: 'C16', titulo: 'De vuelta al trabajo: del recreo a «Grupo Sílabas»' },
  { id: 'c17', plan: 'C17 · C18 · C19', titulo: 'Panel, avance del curso (detalle de la B), ficha de Tomás y descargas en PDF' },
  { id: 'c20', plan: 'C20', titulo: 'Los PDF abiertos: informe de Tomás y PDF del curso' },
]

const archivos = (await readdir(dir)).filter((a) => a.endsWith('.json') && !a.startsWith('exp-'))
const pantallas = []
for (const a of archivos.sort()) {
  const j = JSON.parse(await readFile(join(dir, a), 'utf8'))
  pantallas.push({ nombre: j.nombre, inicio: j.inicio, ancho: j.tamano.width, alto: j.tamano.height, marcas: j.marcas, frases: j.audio.filter((x) => x.tipo === 'voz-navegador' && !x.texto.startsWith('¡Vamos')).length })
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
// En la lista no van las marcas de cada ronda: solo los momentos de la toma.
const visible = (m) => !/^(ronda |acierto |empezar$|como-se-juega$|a-jugar$|seguir$|camino$|comparacion-fin$)/.test(m.etiqueta)

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tomas en bruto · Leer para Todos</title>
<style>
  :root { --tinta:#17324f; --suave:#5b6f84; --marino:#173a5e; --menta:#2f9e6e; --menta-fondo:#e6f6ee; --fondo:#f2f7fb; --borde:#dbe6ef; --sol:#fff3c4; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fondo); color: var(--tinta); font: 16px/1.45 system-ui, 'Segoe UI', sans-serif; }
  header { background: var(--marino); color: #fff; padding: 28px 16px; }
  header > div, main { max-width: 1500px; margin: 0 auto; }
  h1 { margin: 0 0 6px; font-size: 28px; }
  header p { margin: 0; opacity: .85; max-width: 70ch; }
  main { padding: 24px 16px 80px; display: grid; gap: 28px; }
  section { background: #fff; border: 1px solid var(--borde); border-radius: 20px; padding: 20px; }
  h2 { margin: 0; font-size: 20px; text-wrap: balance; }
  .plan { display: inline-block; background: var(--sol); border-radius: 8px; padding: 2px 10px; font-weight: 700; font-size: 13px; margin-bottom: 6px; box-shadow: 0 0 0 2px #2b4a6b; }
  .nota { color: var(--suave); margin: 6px 0 0; font-size: 14px; }
  .barra { margin: 14px 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  button { font: inherit; cursor: pointer; border: 1px solid var(--borde); background: #fff; color: var(--tinta); border-radius: 10px; padding: 5px 10px; }
  button:hover { border-color: var(--menta); background: var(--menta-fondo); }
  button.fuerte { background: var(--menta); border-color: var(--menta); color: #fff; font-weight: 700; padding: 8px 14px; }
  .pantallas { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr)); }
  figure { margin: 0; min-width: 0; }
  figcaption { font-weight: 700; margin-bottom: 6px; display: flex; justify-content: space-between; gap: 8px; }
  figcaption small { font-weight: 400; color: var(--suave); }
  video { width: 100%; height: auto; display: block; border-radius: 12px; border: 1px solid var(--borde); background: #000; }
  .marcas { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; max-height: 9.5em; overflow: auto; }
  .marcas button { font-size: 13px; padding: 3px 8px; }
  .marcas b { font-variant-numeric: tabular-nums; color: var(--menta); margin-right: 4px; }
</style></head><body>
<header><div><h1>Tomas en bruto · «Una mañana en Kínder A»</h1>
<p>Punto de control 1: las capturas de la interfaz real, sin editar ni recortar. Cada botón salta a un momento marcado; «Reproducir juntas» sincroniza las pantallas que se grabaron a la vez. Las capturas no tienen sonido: el audio de la app se monta en la edición.</p></div></header>
<main>
${TOMAS.map((t) => {
  const suyas = pantallas.filter((p) => p.nombre.startsWith(t.id))
  if (suyas.length === 0) return ''
  const base = Math.min(...suyas.map((p) => p.inicio))
  return `<section id="${t.id}"><span class="plan">${t.plan}</span><h2>${esc(t.titulo)}</h2>${t.nota ? `<p class="nota">${esc(t.nota)}</p>` : ''}
  ${suyas.length > 1 ? `<div class="barra"><button class="fuerte" data-juntas="${t.id}">▶ Reproducir juntas</button><button data-pausa="${t.id}">⏸ Pausar todas</button></div>` : '<div class="barra"></div>'}
  <div class="pantallas">${suyas.map((p) => `<figure><figcaption>${esc(p.nombre.replace(/^c\d\d-/, ''))} <small>${p.ancho}×${p.alto}</small></figcaption>
    <video controls preload="metadata" src="${encodeURI(p.nombre)}.webm" data-grupo="${t.id}" data-desfase="${((p.inicio - base) / 1000).toFixed(3)}"></video>
    <div class="marcas">${p.marcas.filter(visible).map((m) => `<button data-t="${m.t}"><b>${mmss(m.t)}</b>${esc(m.etiqueta)}</button>`).join('')}</div></figure>`).join('')}</div></section>`
}).join('\n')}
</main>
<script>
  const del = (g) => [...document.querySelectorAll('video[data-grupo="' + g + '"]')]
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.t) {
      const v = b.closest('figure').querySelector('video')
      // Todas las pantallas del grupo van al mismo instante real.
      const real = Number(b.dataset.t) + Number(v.dataset.desfase)
      for (const o of del(v.dataset.grupo)) o.currentTime = Math.max(0, real - Number(o.dataset.desfase) - 1)
      v.play()
    } else if (b.dataset.juntas) {
      const vs = del(b.dataset.juntas)
      const real = Math.max(...vs.map((v) => v.currentTime + Number(v.dataset.desfase)))
      for (const v of vs) { v.currentTime = Math.max(0, real - Number(v.dataset.desfase)); v.play() }
    } else if (b.dataset.pausa) del(b.dataset.pausa).forEach((v) => v.pause())
  })
</script></body></html>`
await writeFile(join(dir, 'revisar.html'), html)
console.log(`capturas/revisar.html · ${pantallas.length} pantallas en ${TOMAS.length} tomas`)

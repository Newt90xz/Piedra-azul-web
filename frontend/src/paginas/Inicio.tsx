import { Link } from 'react-router-dom'
import { Icono } from '../ui/Icono.tsx'

// Portada: une los dos lenguajes visuales de la plataforma. El fondo son fichas
// de letras y sílabas que suben despacio (como las de las actividades) sobre
// manchas de color que se mueven lento; con «reducir movimiento» quedan quietas.

// Posición, tamaño y ritmo fijos: el fondo se ve igual en cada visita.
const FICHAS = [
  { texto: 'A', izq: 4, tam: 3.4, dur: 26, ret: 0, color: '#fff3c4', giro: -8 },
  { texto: 'ma', izq: 14, tam: 2.6, dur: 32, ret: 9, color: '#d3f2e3', giro: 6 },
  { texto: 'E', izq: 24, tam: 2.2, dur: 29, ret: 18, color: '#cfe8fb', giro: 10 },
  { texto: 'sol', izq: 35, tam: 2.4, dur: 36, ret: 4, color: '#e4dcf7', giro: -5 },
  { texto: 'pa', izq: 47, tam: 2, dur: 31, ret: 22, color: '#fde2c8', giro: 8 },
  { texto: 'M', izq: 57, tam: 3, dur: 27, ret: 13, color: '#d3f2e3', giro: -10 },
  { texto: 'lu', izq: 66, tam: 2.3, dur: 34, ret: 2, color: '#fff3c4', giro: 5 },
  { texto: 'O', izq: 76, tam: 3.6, dur: 30, ret: 16, color: '#cfe8fb', giro: -6 },
  { texto: 'sa', izq: 86, tam: 2.4, dur: 28, ret: 7, color: '#f6d1d1', giro: 9 },
  { texto: 'U', izq: 94, tam: 2.8, dur: 33, ret: 24, color: '#e4dcf7', giro: -9 },
  { texto: 'gato', izq: 9, tam: 2, dur: 38, ret: 20, color: '#cfe8fb', giro: 4 },
  { texto: 'I', izq: 71, tam: 2.4, dur: 25, ret: 27, color: '#d3f2e3', giro: 12 },
]

const NIVELES = [
  { icono: '👂', texto: 'Sonidos', color: 'bg-[#cfe8fb]' },
  { icono: '👏', texto: 'Sílabas', color: 'bg-[#d3f2e3]' },
  { icono: '🧩', texto: 'Palabras', color: 'bg-[#e4dcf7]' },
]

export default function Inicio() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-fondo">
      <FondoAnimado />

      <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 pt-6">
        <span className="grid size-10 place-items-center rounded-xl bg-marino text-white shadow-[0_6px_16px_-6px_rgb(23_58_94/0.6)]">
          <Icono nombre="asterisco" className="size-5" />
        </span>
        <span className="leading-tight">
          <b className="block text-tinta">Leer para Todos</b>
          <span className="block text-xs font-semibold text-tinta-suave">Liceo Piedra Azul</span>
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_1fr]">
        <section className="inicio-entra">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold tracking-[0.12em] text-menta-oscuro uppercase shadow-sm backdrop-blur">
            <span className="size-2 rounded-full bg-menta" aria-hidden="true" />
            Pre-Kínder y Kínder
          </p>
          <h1 className="mt-5 text-5xl leading-[1.05] font-bold tracking-tight text-tinta sm:text-7xl">
            Leer para{' '}
            <span className="relative inline-block text-menta-oscuro">
              Todos
              <svg aria-hidden="true" viewBox="0 0 200 20" preserveAspectRatio="none" className="inicio-trazo absolute -bottom-2 left-0 h-3 w-full text-[#ffd76a]">
                <path d="M3 14 Q 50 3 100 11 T 197 8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-tinta-suave">
            Aprender a leer jugando: sonidos, sílabas y palabras con imágenes, pictogramas y voz. Sin depender de saber leer.
          </p>
          <ul className="mt-8 flex flex-wrap gap-3" aria-label="Niveles">
            {NIVELES.map((n, i) => (
              <li
                key={n.texto}
                className={`inicio-entra flex items-center gap-2 rounded-2xl ${n.color} px-4 py-2 font-escolar text-lg font-bold text-nino-tinta shadow-[0_0_0_2px_#2b4a6b,0_4px_0_2px_#2b4a6b]`}
                style={{ animationDelay: `${300 + i * 120}ms` }}
              >
                <span aria-hidden="true">{n.icono}</span>
                {n.texto}
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Elegir cómo entrar" className="grid gap-6">
          <Link
            to="/alumno"
            className="inicio-entra group relative grid gap-4 overflow-hidden rounded-[2rem] bg-[#fff8dd] p-7 font-escolar text-nino-tinta shadow-[0_0_0_3px_#2b4a6b,0_10px_0_3px_#2b4a6b] transition-transform hover:-translate-y-1 active:translate-y-1.5"
            style={{ animationDelay: '150ms' }}
          >
            <span aria-hidden="true" className="absolute -top-10 -right-10 size-40 rounded-full bg-[#ffe58a]/60" />
            <span aria-hidden="true" className="relative flex -space-x-3">
              {['🦊', '🐼', '🦖', '🦄'].map((a, i) => (
                <span
                  key={a}
                  className="grid size-16 place-items-center rounded-[30%] border-3 border-white text-4xl shadow-md transition-transform group-hover:-translate-y-1"
                  style={{ background: ['#fde2c8', '#d3f2e3', '#cfe8fb', '#e4dcf7'][i], transitionDelay: `${i * 40}ms` }}
                >
                  {a}
                </span>
              ))}
            </span>
            <span className="relative flex items-end justify-between gap-4">
              <span>
                <span className="block text-3xl font-bold">Soy alumno</span>
                <span className="block font-sans text-base text-tinta-suave">Toca tu foto y a jugar.</span>
              </span>
              <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-menta text-white shadow-[0_4px_0_#1d6b4a] transition-transform group-hover:translate-x-1">
                <Icono nombre="derecha" className="size-7" />
              </span>
            </span>
          </Link>

          <Link
            to="/docente"
            className="inicio-entra group flex items-center gap-5 rounded-[2rem] border border-borde bg-white/90 p-6 text-marino shadow-[0_18px_40px_-24px_rgb(23_58_94/0.45)] backdrop-blur transition-transform hover:-translate-y-1"
            style={{ animationDelay: '280ms' }}
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-celeste-fondo">
              <Icono nombre="personas" className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-bold">Soy docente</span>
              <span className="block text-sm text-tinta-suave">Salas, avance del curso y perfiles.</span>
            </span>
            <span aria-hidden="true" className="text-2xl transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </nav>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-6 text-xs text-tinta-suave">
        Bases Curriculares de Educación Parvularia · Lenguaje Verbal, nivel Transición
      </footer>
    </div>
  )
}

function FondoAnimado() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="inicio-mancha absolute -top-32 -left-24 size-[32rem] rounded-full bg-[#dcebfb]" />
      <span className="inicio-mancha absolute top-1/3 -right-32 size-[28rem] rounded-full bg-[#dff5ea]" style={{ animationDelay: '-7s', animationDuration: '26s' }} />
      <span className="inicio-mancha absolute -bottom-40 left-1/3 size-[30rem] rounded-full bg-[#fff3c4]/70" style={{ animationDelay: '-13s', animationDuration: '30s' }} />
      {FICHAS.map((f, i) => (
        <span
          key={i}
          className={`inicio-ficha absolute top-full font-escolar font-bold text-nino-tinta ${i % 2 ? 'max-sm:hidden' : ''}`}
          style={{ left: `${f.izq}%`, fontSize: `${f.tam}rem`, animationDuration: `${f.dur}s`, animationDelay: `-${f.ret}s`, ['--giro' as string]: `${f.giro}deg` }}
        >
          <span className="block rounded-[0.45em] px-[0.4em] py-[0.05em] leading-tight shadow-[0_0_0_2px_rgb(43_74_107/0.35),0_4px_0_2px_rgb(43_74_107/0.35)]" style={{ background: f.color }}>
            {f.texto}
          </span>
        </span>
      ))}
    </div>
  )
}

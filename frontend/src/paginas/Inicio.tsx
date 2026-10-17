import { Link } from 'react-router-dom'
import { Antetitulo, FondoAula } from '../ui/aula.tsx'
import { Icono, type NombreIcono } from '../ui/Icono.tsx'

export default function Inicio() {
  return (
    <FondoAula>
      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2">
        <section>
          <Antetitulo className="mb-24 max-md:mb-10">Leer para Todos / Inicio</Antetitulo>
          <span className="grid size-16 place-items-center rounded-2xl bg-celeste-fondo text-marino">
            <Icono nombre="asterisco" className="size-8" />
          </span>
          <Antetitulo className="mt-6">Liceo Piedra Azul · Pre-Kínder y Kínder</Antetitulo>
          <h1 className="mt-2 text-6xl font-bold tracking-tight text-tinta">Leer para Todos</h1>
          <p className="mt-4 max-w-md text-lg text-tinta-suave">
            Sonidos, sílabas y palabras con imágenes y pictogramas. Elige cómo deseas entrar.
          </p>
        </section>

        <nav aria-label="Elegir recorrido" className="grid gap-5">
          <Entrada to="/docente" icono="nota" texto="Entrar como docente" />
          <Entrada to="/aula" icono="asterisco" texto="Entrar como alumno" alumno />
        </nav>
      </main>
    </FondoAula>
  )
}

function Entrada({ to, icono, texto, alumno }: { to: string; icono: NombreIcono; texto: string; alumno?: boolean }) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-5 rounded-[2rem] border px-8 py-10 shadow-[0_18px_40px_-24px_rgb(23_58_94/0.35)] transition-transform hover:-translate-y-1 ${
        alumno ? 'border-[#cdeedd] bg-menta-fondo text-menta-oscuro' : 'border-borde bg-white text-marino'
      }`}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-celeste-fondo">
        <Icono nombre={icono} className="size-6" />
      </span>
      <span className="text-2xl font-bold">{texto}</span>
      <span aria-hidden="true" className="text-2xl transition-transform group-hover:translate-x-1">→</span>
    </Link>
  )
}

import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { repo } from '../../datos/index.ts'
import { hablar } from '../../lib/audio.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { FondoNino } from '../../ui/fondoNino.tsx'
import { BotonNino, ErrorNino } from '../../ui/nino.tsx'

// Dispositivo del alumno: el niño toca su perfil y pasa a la sala de espera,
// donde la docente lo asigna a una sala. No elige sala ni actividad.

const REFRESCO_MS = 4000

// Lo que se le dice al niño si no puede entrar: hablado, sin texto que leer.
const AVISOS: Record<string, string> = {
  perfil_ocupado: 'Ese perfil ya entró en otro computador. Pide ayuda a tu profe.',
  perfil_invalido: 'Ese perfil no está disponible. Pide ayuda a tu profe.',
}

export default function Entrada() {
  const guardado = repo.alumnoDelDispositivo()
  if (guardado) return <Navigate to={`/aula/${guardado}`} replace />

  return (
    <div className="nino relative min-h-dvh">
      <FondoNino tematica="animales" />
      <header className="encabezado-nino relative z-10 flex items-center gap-4 px-6 py-3 font-sans text-base">
        <span className="font-bold text-tinta">Leer para Todos</span>
        <span className="flex-1" />
        <Link to="/" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-tinta-suave hover:bg-fondo">
          Inicio
        </Link>
      </header>
      <div className="relative z-10">
        <ElegirPerfil />
      </div>
    </div>
  )
}

function ElegirPerfil() {
  const navegar = useNavigate()
  const [rechazado, setRechazado] = useState<string | null>(null)
  const { datos: perfiles, error, recargar } = useConsulta(() => repo.perfilesAlumnos(), [])

  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })
  useEffect(() => hablar('¿Quién eres? Toca tu foto.'), [])

  const entrar = async (id: string) => {
    setRechazado(null)
    try {
      await repo.entrarComoAlumno(id)
    } catch (e) {
      setRechazado(id)
      hablar(AVISOS[(e as Error).message] ?? 'No se pudo entrar. Intenta otra vez.')
      recargar()
      return
    }
    navegar(`/aula/${id}`)
  }

  if (error && !perfiles) return <ErrorNino alReintentar={recargar} />

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-8 flex justify-center text-[2.4em] leading-none" aria-label="¿Quién eres? Toca tu foto">
        <span aria-hidden="true" className="animate-bounce">👇</span>
      </h1>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-6">
        {perfiles?.map((p) => (
          <li key={p.id}>
            {/* Evita que dos niños usen el mismo perfil (el servidor también lo
                rechaza). Si quedó tomado por error, la docente lo libera. */}
            <BotonNino
              voz={p.ocupado ? `${p.nombre} ya entró` : p.nombre}
              disabled={p.ocupado}
              onClick={() => void entrar(p.id)}
              className={`relative flex w-full flex-col items-center gap-3 p-5 disabled:opacity-50 ${rechazado === p.id ? 'animate-sacudir' : ''}`}
            >
              <Avatar estudiante={p} className="size-28 text-7xl" />
              <span className="text-[0.85em] font-bold">{p.nombre}</span>
              {p.ocupado && (
                <span aria-hidden="true" className="absolute top-3 right-3 text-[1.2em]">
                  🔒
                </span>
              )}
            </BotonNino>
          </li>
        ))}
      </ul>
    </main>
  )
}

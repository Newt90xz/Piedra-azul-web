import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { repo } from '../../datos/index.ts'
import type { PerfilAlumno } from '../../dominio/tipos.ts'
import { hablar } from '../../lib/audio.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { FondoNino } from '../../ui/fondoNino.tsx'
import { BotonNino, ErrorNino, PantallaNino } from '../../ui/nino.tsx'

// Dispositivo del alumno: el niño toca su perfil y pasa a la sala de espera,
// donde la docente lo asigna a una sala. No elige sala ni actividad.

const REFRESCO_MS = 4000
// Lo que dura el saludo antes de pasar a su inicio.
const SALUDO_MS = 1900

// Lo que se le dice al niño si no puede entrar: hablado, sin texto que leer.
const AVISOS: Record<string, string> = {
  perfil_ocupado: 'Ese perfil ya entró en otro computador. Pide ayuda a tu profe.',
  perfil_invalido: 'Ese perfil no está disponible. Pide ayuda a tu profe.',
}

export default function Entrada() {
  const guardado = repo.alumnoDelDispositivo()
  if (guardado) return <Navigate to={`/aula/${guardado}`} replace />

  return (
    <PantallaNino
      fondo={<FondoNino tematica="animales" />}
      encabezado={
        <span className="flex w-full items-center gap-4 font-sans text-base">
          <span className="font-bold text-tinta">Leer para Todos</span>
          <span className="flex-1" />
          <Link to="/" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-tinta-suave hover:bg-fondo">
            Inicio
          </Link>
        </span>
      }
    >
      <ElegirPerfil />
    </PantallaNino>
  )
}

function ElegirPerfil() {
  const navegar = useNavigate()
  const [rechazado, setRechazado] = useState<string | null>(null)
  const [saludo, setSaludo] = useState<{ perfil: PerfilAlumno; desde: DOMRect } | null>(null)
  const { datos: perfiles, error, recargar } = useConsulta(() => repo.perfilesAlumnos(), [])

  useEffect(() => {
    if (saludo) return
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })
  useEffect(() => hablar('¿Quién eres? Toca tu foto.'), [])

  const entrar = async (p: PerfilAlumno, boton: HTMLElement) => {
    setRechazado(null)
    try {
      await repo.entrarComoAlumno(p.id)
    } catch (e) {
      setRechazado(p.id)
      hablar(AVISOS[(e as Error).message] ?? 'No se pudo entrar. Intenta otra vez.')
      recargar()
      return
    }
    // El avatar del botón crece hasta el centro y saluda; luego pasa a su inicio.
    const avatar = boton.querySelector('[data-avatar]') ?? boton
    setSaludo({ perfil: p, desde: avatar.getBoundingClientRect() })
    hablar(`¡Hola, ${p.nombre}!`, { respaldo: '¡Hola!' })
    window.setTimeout(() => navegar(`/aula/${p.id}`), SALUDO_MS)
  }

  if (error && !perfiles) return <ErrorNino alReintentar={recargar} />

  return (
    <main className="mx-auto max-w-5xl px-6 py-8" aria-label="¿Quién eres? Toca tu foto">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-6">
        {perfiles?.map((p, i) => (
          <li key={p.id} className="caja-entra" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
            {/* Evita que dos niños usen el mismo perfil (el servidor también lo
                rechaza). Si quedó tomado por error, la docente lo libera. */}
            <BotonNino
              voz={p.ocupado ? `${p.nombre} ya entró` : p.nombre}
              disabled={p.ocupado || !!saludo}
              onClick={(e) => void entrar(p, e.currentTarget)}
              className={`relative flex w-full flex-col items-center gap-3 p-5 disabled:opacity-50 ${rechazado === p.id ? 'animate-sacudir' : ''} ${
                saludo?.perfil.id === p.id ? 'invisible' : ''
              }`}
            >
              <span data-avatar>
                <Avatar estudiante={p} className="size-28 text-7xl" />
              </span>
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
      {saludo && <Saludo perfil={saludo.perfil} desde={saludo.desde} />}
    </main>
  )
}

// Pantalla de bienvenida: el avatar viaja desde su lugar en la grilla al centro
// mientras se agranda, y aparece «¡Hola, nombre!».
function Saludo({ perfil, desde }: { perfil: PerfilAlumno; desde: DOMRect }) {
  const avatar = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = avatar.current
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const hasta = el.getBoundingClientRect()
    const dx = desde.left + desde.width / 2 - (hasta.left + hasta.width / 2)
    const dy = desde.top + desde.height / 2 - (hasta.top + hasta.height / 2)
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${desde.width / hasta.width})` }, { transform: 'translate(0, 0) scale(1.08)', offset: 0.8 }, { transform: 'none' }],
      { duration: 650, easing: 'cubic-bezier(0.3, 0.8, 0.3, 1)' },
    )
  }, [desde])

  return (
    <div role="status" className="saludo-velo fixed inset-0 z-50 grid place-items-center px-6">
      <div className="grid justify-items-center gap-6">
        <span ref={avatar} className="block">
          <Avatar estudiante={perfil} className="size-[min(16rem,45vh)] text-[min(10rem,28vh)] shadow-[0_0_0_6px_#fff,0_14px_0_6px_var(--color-contorno)]" />
        </span>
        <p className="saludo-texto rounded-full bg-white px-10 py-3 text-[1.6em] font-bold shadow-[0_0_0_4px_var(--color-contorno)]">
          ¡Hola, {perfil.nombre}!
        </p>
      </div>
    </div>
  )
}

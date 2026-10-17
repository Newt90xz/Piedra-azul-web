import { useEffect, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import { hablar } from '../../lib/audio.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Antetitulo, BotonEnlace, FondoAula, IconoCaja, Tarjeta } from '../../ui/aula.tsx'
import { Avatar } from '../../ui/Avatar.tsx'
import { ErrorNino, useVozAlApuntar } from '../../ui/nino.tsx'

// Modo aula: la educadora ya inició sesión; el niño toca su foto (RF-02).
export default function Sala() {
  const { docente, cursos, cursoId } = useSesion()
  if (!docente) return <SalaCerrada />
  // Sin cursos todavía: el panel ofrece crear el primero.
  if (!cursoId) return cursos ? <Navigate to="/docente" replace /> : null
  return <Grilla cursoId={cursoId} />
}

function Grilla({ cursoId }: { cursoId: string }) {
  const navegar = useNavigate()
  const { datos, error, recargar } = useConsulta(async () => {
    const [cursos, estudiantes] = await Promise.all([repo.listarCursos(), repo.listarEstudiantes(cursoId)])
    return { curso: cursos.find((c) => c.id === cursoId), estudiantes: estudiantes.filter((e) => e.activo) }
  }, [cursoId])

  useEffect(() => hablar('¿Quién eres? Toca tu foto.'), [])

  return (
    <div className="nino min-h-dvh">
      <header className="flex items-center gap-4 border-b-3 border-nino-azul bg-white px-6 py-3 font-sans text-base">
        <span className="font-bold text-tinta">{datos?.curso?.nombre}</span>
        <span className="flex-1" />
        <Link to="/docente" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-tinta-suave hover:bg-fondo">
          Panel docente
        </Link>
      </header>
      {error && <ErrorNino alReintentar={recargar} />}
      <main className={`mx-auto max-w-5xl px-6 py-8 ${error ? 'hidden' : ''}`}>
        <h1 className="mb-8 text-center text-[1.3em] font-bold">¿Quién eres?</h1>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-6">
          {datos?.estudiantes.map((e) => (
            <li key={e.id}>
              <TarjetaNino nombre={e.nombre} alTocar={() => navegar(`/aula/${e.id}/emocion`)}>
                <Avatar estudiante={e} className="size-28 text-7xl" />
              </TarjetaNino>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function TarjetaNino({ nombre, alTocar, children }: { nombre: string; alTocar: () => void; children: ReactNode }) {
  return (
    <button
      onClick={alTocar}
      {...useVozAlApuntar(nombre)}
      className="tarjeta-nino flex w-full flex-col items-center gap-3 rounded-[1.75rem] border-3 border-nino-azul bg-white p-5 transition-transform hover:-translate-y-1"
    >
      {children}
      <span className="text-[0.85em] font-bold">{nombre}</span>
    </button>
  )
}

function SalaCerrada() {
  return (
    <FondoAula>
      <main className="mx-auto max-w-md px-6 py-12">
        <Antetitulo>Leer para Todos / Alumnos</Antetitulo>
        <BotonEnlace to="/" variante="suave" className="mt-6 mb-6">← Volver al inicio</BotonEnlace>
        <Tarjeta className="p-8 text-center">
          <IconoCaja nombre="candado" className="mx-auto" />
          <h1 className="mt-5 text-2xl font-bold">La sala está cerrada</h1>
          <p className="mt-2 text-tinta-suave">
            Pide ayuda a tu educadora: ella inicia sesión y abre la sala del curso. Luego cada niño entra tocando su foto.
          </p>
          <BotonEnlace to="/docente/entrar" className="mt-6">Abrir sala como docente</BotonEnlace>
        </Tarjeta>
      </main>
    </FondoAula>
  )
}

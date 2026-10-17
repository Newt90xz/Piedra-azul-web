import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { AvisoError, BotonEnlace, Encabezado, claseEntrada } from '../../ui/aula.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { Avatar } from '../../ui/Avatar.tsx'

const NIVELES = { 1: 'Sonidos', 2: 'Sílabas', 3: 'Palabras' } as const

export default function Estudiantes() {
  const { cursoId } = useSesion()
  const [buscar, setBuscar] = useState('')
  const { datos: estudiantes, error, recargar } = useConsulta(() => repo.listarEstudiantes(cursoId), [cursoId])
  const filtrados = (estudiantes ?? []).filter((e) => e.nombre.toLowerCase().includes(buscar.toLowerCase()))

  return (
    <>
      <Encabezado
        antetitulo="Gestión de perfiles"
        titulo="Estudiantes"
        descripcion="Abre la ficha de un estudiante para ver su avance o ajustar sus apoyos."
        accion={
          <BotonEnlace to="/docente/estudiantes/nuevo">
            <Icono nombre="mas" /> Añadir estudiante
          </BotonEnlace>
        }
      />
      <label className="relative mb-5 block max-w-sm">
        <span className="sr-only">Buscar estudiante</span>
        <Icono nombre="buscar" className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-tinta-suave" />
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre" className={`${claseEntrada} pl-11`} />
      </label>

      {error && <AvisoError alReintentar={recargar} />}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((e) => (
          <li key={e.id}>
            <Link
              to={`/docente/estudiantes/${e.id}`}
              className={`flex items-center gap-4 rounded-3xl border border-borde bg-white p-5 transition-shadow hover:shadow-[0_12px_28px_-16px_rgb(23_58_94/0.35)] ${e.activo ? '' : 'opacity-60'}`}
            >
              <Avatar estudiante={e} className="size-16 text-4xl" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-tinta">{e.nombre}</span>
                <span className="block text-sm text-tinta-suave">
                  Nivel {e.nivelHabilitado} · {NIVELES[e.nivelHabilitado]}
                  {!e.activo && ' · Desactivado'}
                </span>
              </span>
              <span className="rounded-lg bg-celeste-fondo px-3 py-1.5 text-sm font-semibold text-marino">Abrir ficha</span>
            </Link>
          </li>
        ))}
      </ul>
      {estudiantes && filtrados.length === 0 && <p className="text-tinta-suave">No hay estudiantes que coincidan.</p>}
    </>
  )
}

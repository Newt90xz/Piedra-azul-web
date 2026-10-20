import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { repo } from '../../datos/index.ts'
import type { SalaAbierta } from '../../dominio/tipos.ts'
import { hablar } from '../../lib/audio.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { FondoNino } from '../../ui/fondoNino.tsx'
import { BotonNino, ErrorNino } from '../../ui/nino.tsx'
import { MiniJuego } from './MiniJuego.tsx'

// Dispositivo del alumno: 1) elige una sala abierta, 2) toca su propio perfil.
// Sin salas abiertas queda en espera y se actualiza solo.

const REFRESCO_MS = 4000

function useRefresco(recargar: () => void) {
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })
}

export default function Entrada() {
  const [sala, setSala] = useState<SalaAbierta | null>(null)
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
        {sala ? <ElegirPerfil sala={sala} volver={() => setSala(null)} /> : <ElegirSala alElegir={setSala} />}
      </div>
    </div>
  )
}

function ElegirSala({ alElegir }: { alElegir: (s: SalaAbierta) => void }) {
  const { datos: salas, error, recargar } = useConsulta(() => repo.salasAbiertas(), [])
  useRefresco(recargar)
  useEffect(() => (salas?.length ? hablar('Elige tu sala.') : undefined), [salas?.length])

  if (error && !salas) return <ErrorNino alReintentar={recargar} />
  if (!salas) return null
  if (salas.length === 0) return <Espera />

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-8 text-center text-[1.3em] font-bold">Elige tu sala</h1>
      <ul className="grid gap-6 sm:grid-cols-2">
        {salas.map((s) => {
          const llena = s.ocupados >= s.cupos
          return (
            <li key={s.id}>
              <BotonNino
                voz={llena ? `${s.nombre}, sala llena` : s.nombre}
                disabled={llena}
                onClick={() => alElegir(s)}
                className="flex w-full items-center gap-5 bg-nino-amarillo p-6 text-left disabled:opacity-50"
              >
                <span aria-hidden="true" className="text-[3em] leading-none">
                  🏫
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1em] font-bold">{s.nombre}</span>
                  <span className="block font-sans text-sm text-tinta-suave">
                    {s.curso} · {s.ocupados}/{s.cupos} {llena && '· llena'}
                  </span>
                </span>
              </BotonNino>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

// Standby: ninguna sala abierta todavía. El niño juega mientras tanto; la
// lista de salas reemplaza al juego sola en cuanto la docente abre una.
function Espera() {
  return (
    <MiniJuego />
  )
}

const MENSAJES: Record<string, string> = {
  sala_cerrada: 'La sala se cerró.',
  sala_llena: 'La sala se llenó.',
  perfil_ocupado: 'Ese perfil ya entró desde otro dispositivo.',
  perfil_invalido: 'Ese perfil no está disponible.',
  sala_inexistente: 'La sala ya no existe.',
}

function ElegirPerfil({ sala, volver }: { sala: SalaAbierta; volver: () => void }) {
  const navegar = useNavigate()
  const [aviso, setAviso] = useState<string | null>(null)
  const { datos: perfiles, error, recargar } = useConsulta(() => repo.perfilesDeSala(sala.id), [sala.id])
  useRefresco(recargar)
  useEffect(() => hablar('¿Quién eres? Toca tu foto.'), [])

  const unirse = async (id: string) => {
    try {
      await repo.unirseASala(sala.id, id)
    } catch (e) {
      setAviso(MENSAJES[(e as Error).message] ?? 'No se pudo entrar. Intenta otra vez.')
      recargar()
      return
    }
    // La emoción se elige en la ruleta de la barra: se entra directo a su inicio.
    navegar(`/aula/${id}`)
  }

  if (error && !perfiles) return <ErrorNino alReintentar={recargar} />

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <BotonNino voz="Volver a las salas" onClick={volver} className="grid size-16 place-items-center rounded-2xl hover:translate-y-0">
          <Icono nombre="izquierda" className="size-8" />
        </BotonNino>
        <span className="font-sans text-base font-semibold text-tinta-suave">{sala.nombre}</span>
      </div>
      <h1 className="mb-8 text-center text-[1.3em] font-bold">¿Quién eres?</h1>
      {aviso && (
        <p role="alert" className="mx-auto mb-6 max-w-md rounded-2xl bg-nino-amarillo px-5 py-3 text-center font-sans text-base font-semibold">
          {aviso}
        </p>
      )}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-6">
        {perfiles?.map((p) => {
          // Evita que dos niños usen el mismo perfil (el servidor también lo
          // rechaza). Si quedó tomado por error, la docente lo libera.
          const { ocupado } = p
          return (
            <li key={p.id}>
              <BotonNino
                voz={ocupado ? `${p.nombre} ya entró` : p.nombre}
                disabled={ocupado}
                onClick={() => void unirse(p.id)}
                className="flex w-full flex-col items-center gap-3 p-5 disabled:opacity-50"
              >
                <Avatar estudiante={p} className="size-28 text-7xl" />
                <span className="text-[0.85em] font-bold">{p.nombre}</span>
                {ocupado && (
                  <span aria-hidden="true" className="font-sans text-sm font-semibold text-tinta-suave">
                    ✔ ya entró
                  </span>
                )}
              </BotonNino>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

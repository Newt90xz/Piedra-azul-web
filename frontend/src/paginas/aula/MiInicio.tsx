import { useEffect } from 'react'
import { GRUPOS } from '../../contenido/actividades.ts'
import { hablar } from '../../lib/audio.ts'
import { Icono } from '../../ui/Icono.tsx'
import { EnlaceNino, useNino } from '../../ui/nino.tsx'

// Dashboard del niño: 4 caminos como máximo (regla de oro 3).
export default function MiInicio() {
  const { estudiante } = useNino()

  useEffect(() => hablar(`¡Hola, ${estudiante.nombre}! ¿Qué quieres hacer hoy?`), [estudiante.nombre])

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-8 text-center text-[1.3em] font-bold">¡Hola, {estudiante.nombre}!</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {GRUPOS.map((g) => {
          const bloqueado = typeof g.id === 'number' && g.id > estudiante.nivelHabilitado
          const contenido = (
            <span className="flex h-full flex-col items-center justify-center gap-3 rounded-[1.5rem] py-8" style={{ background: g.color }}>
              <span aria-hidden="true" className="text-[2.6em] leading-none">{g.icono}</span>
              <span className="font-bold">{g.titulo}</span>
              {bloqueado && <Icono nombre="candado" className="size-10 opacity-60" />}
            </span>
          )
          return bloqueado ? (
            <div key={g.id} role="img" aria-label={`${g.audio}, bloqueado`} className="tarjeta-nino rounded-[1.75rem] border-3 border-dashed border-nino-borde opacity-60">
              {contenido}
            </div>
          ) : (
            <EnlaceNino key={g.id} to={`/aula/${estudiante.id}/grupo/${g.id}`} voz={g.audio} className="h-full border-transparent">
              {contenido}
            </EnlaceNino>
          )
        })}
      </div>
    </main>
  )
}

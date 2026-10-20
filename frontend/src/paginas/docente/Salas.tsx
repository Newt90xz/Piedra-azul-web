import { useEffect, useState, type FormEvent } from 'react'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import type { Emocion, Estudiante, MiembroSala, ResultadoActividad, Sala } from '../../dominio/tipos.ts'
import { EMOCIONES } from '../../lib/avance.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { AvisoError, Boton, Encabezado, Tarjeta, claseEntrada } from '../../ui/aula.tsx'

const REFRESCO_MS = 5000

export default function Salas() {
  const { cursoId } = useSesion()
  const [accionError, setAccionError] = useState<string | null>(null)
  const { datos, error, recargar } = useConsulta(async () => {
    const [salas, miembros, estudiantes] = await Promise.all([
      repo.listarSalas(cursoId),
      repo.listarMiembros(cursoId),
      repo.listarEstudiantes(cursoId),
    ])
    // Vista en vivo: solo de quienes están conectados.
    const hoy = new Date().toDateString()
    const [resultados, emociones] = miembros.length
      ? await Promise.all([
          repo.listarResultados({ cursoId }),
          Promise.all(miembros.map(async (m) => [m.estudianteId, (await repo.listarEmociones(m.estudianteId))[0]?.emocion] as const)),
        ])
      : [[] as ResultadoActividad[], [] as (readonly [string, Emocion | undefined])[]]
    return {
      salas,
      miembros,
      estudiantes: estudiantes.filter((e) => e.activo),
      resultadosHoy: resultados.filter((r) => new Date(r.fecha).toDateString() === hoy),
      emocionDe: new Map(emociones),
    }
  }, [cursoId])

  // Los alumnos entran y salen solos: se refresca para que la docente lo vea.
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setAccionError(null)
    try {
      await accion()
    } catch (e) {
      setAccionError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    }
    recargar()
  }

  return (
    <>
      <Encabezado
        antetitulo="Trabajo en aula"
        titulo="Salas"
        descripcion="Crea las salas y decide quién entra. Las salas abiertas aparecen en el dispositivo de los alumnos; ellos eligen su perfil."
      />
      {datos && (
        <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-tinta">
          <span className={`size-2.5 rounded-full ${datos.miembros.length ? 'bg-menta' : 'bg-borde'}`} aria-hidden="true" />
          {datos.miembros.length} {datos.miembros.length === 1 ? 'alumno conectado' : 'alumnos conectados'} ahora ·{' '}
          {datos.salas.filter((x) => x.abierta).length} {datos.salas.filter((x) => x.abierta).length === 1 ? 'sala abierta' : 'salas abiertas'}
        </p>
      )}
      <CrearSala cursoId={cursoId} alCrear={(nombre, cupos) => ejecutar(() => repo.crearSala(cursoId, nombre, cupos))} />
      {accionError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {accionError.includes('duplicate') ? 'Ya existe una sala con ese nombre.' : accionError}
        </p>
      )}
      {error && !datos && <AvisoError alReintentar={recargar} />}
      <div className="grid gap-5 lg:grid-cols-2">
        {datos?.salas.map((s) => (
          <TarjetaSala
            key={s.id}
            sala={s}
            miembros={datos.miembros}
            estudiantes={datos.estudiantes}
            resultadosHoy={datos.resultadosHoy}
            emocionDe={datos.emocionDe}
            ejecutar={ejecutar}
          />
        ))}
      </div>
      {datos && datos.salas.length === 0 && <p className="text-tinta-suave">Aún no hay salas. Crea la primera arriba.</p>}
    </>
  )
}

function CrearSala({ cursoId, alCrear }: { cursoId: string; alCrear: (nombre: string, cupos: number) => Promise<void> }) {
  const [nombre, setNombre] = useState('')
  const [cupos, setCupos] = useState(6)
  useEffect(() => setNombre(''), [cursoId])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await alCrear(nombre.trim(), cupos)
    setNombre('')
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="mb-6 flex flex-wrap items-end gap-3">
      <label className="grid min-w-52 flex-1 gap-1 text-sm font-semibold text-tinta">
        Nombre de la sala
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej.: Grupo Sonidos" className={claseEntrada} />
      </label>
      <label className="grid w-28 gap-1 text-sm font-semibold text-tinta">
        Cupos
        <input type="number" min={1} max={40} value={cupos} onChange={(e) => setCupos(Math.min(40, Math.max(1, Number(e.target.value) || 1)))} className={claseEntrada} />
      </label>
      <Boton type="submit" disabled={!nombre.trim()}>
        <Icono nombre="mas" /> Crear sala
      </Boton>
    </form>
  )
}

function TarjetaSala({
  sala,
  miembros,
  estudiantes,
  resultadosHoy,
  emocionDe,
  ejecutar,
}: {
  sala: Sala
  miembros: MiembroSala[]
  estudiantes: Estudiante[]
  resultadosHoy: ResultadoActividad[]
  emocionDe: Map<string, Emocion | undefined>
  ejecutar: (accion: () => Promise<unknown>) => Promise<void>
}) {
  const [confirmar, setConfirmar] = useState(false)
  const [elegido, setElegido] = useState('')
  const dentro = miembros.filter((m) => m.salaId === sala.id)
  const enSala = new Set(dentro.map((m) => m.estudianteId))
  const salaDe = new Map(miembros.map((m) => [m.estudianteId, m.salaId]))
  const conectados = estudiantes.filter((e) => enSala.has(e.id))
  const disponibles = estudiantes.filter((e) => !enSala.has(e.id))
  const llena = dentro.length >= sala.cupos

  return (
    <Tarjeta className="grid gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 text-xl font-bold text-tinta">{sala.nombre}</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${sala.abierta ? 'bg-menta-fondo text-menta-oscuro' : 'bg-fondo text-tinta-suave'}`}>
          {sala.abierta ? 'Abierta' : 'Cerrada'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Boton variante={sala.abierta ? 'suave' : 'primario'} onClick={() => void ejecutar(() => repo.actualizarSala(sala.id, { abierta: !sala.abierta }))}>
          <Icono nombre={sala.abierta ? 'candado' : 'aula'} /> {sala.abierta ? 'Cerrar cupos' : 'Abrir cupos'}
        </Boton>
        <span className="flex items-center gap-2 text-sm font-semibold text-tinta">
          Cupos
          <Boton variante="suave" aria-label="Quitar un cupo" disabled={sala.cupos <= 1} onClick={() => void ejecutar(() => repo.actualizarSala(sala.id, { cupos: sala.cupos - 1 }))}>
            −
          </Boton>
          <span aria-live="polite" className="min-w-14 text-center">
            {dentro.length}/{sala.cupos}
          </span>
          <Boton variante="suave" aria-label="Agregar un cupo" disabled={sala.cupos >= 40} onClick={() => void ejecutar(() => repo.actualizarSala(sala.id, { cupos: sala.cupos + 1 }))}>
            +
          </Boton>
        </span>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-tinta-suave">Conectados</h3>
        {conectados.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nadie conectado.</p>
        ) : (
          <ul className="grid gap-2">
            {conectados.map((e) => {
              const partidas = resultadosHoy.filter((r) => r.estudianteId === e.id)
              const emocion = emocionDe.get(e.id)
              return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-fondo px-3 py-2">
                <Avatar estudiante={e} className="size-9 text-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-tinta">{e.nombre}</span>
                  <span className="block text-xs text-tinta-suave">
                    {partidas.length === 0 ? 'Aún no juega hoy' : `Hoy: ${partidas.length} ${partidas.length === 1 ? 'partida' : 'partidas'} · ${partidas.reduce((n, r) => n + r.estrellas, 0)} ★`}
                  </span>
                </span>
                {emocion && (
                  <span title={`Se siente: ${EMOCIONES[emocion].texto}`} className="rounded-lg px-2 py-1 text-sm font-semibold" style={{ background: EMOCIONES[emocion].color }}>
                    <span aria-hidden="true">{EMOCIONES[emocion].cara}</span> <span className="sr-only">Se siente </span>{EMOCIONES[emocion].texto}
                  </span>
                )}
                <Boton variante="suave" onClick={() => void ejecutar(() => repo.desconectarEstudiante(e.id))}>
                  Desconectar
                </Boton>
              </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex-1 text-sm font-semibold text-tinta">
          <span className="sr-only">Conectar estudiante a {sala.nombre}</span>
          <select value={elegido} onChange={(e) => setElegido(e.target.value)} className={claseEntrada}>
            <option value="">Conectar a un estudiante…</option>
            {disponibles.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {salaDe.has(e.id) ? ' (está en otra sala)' : ''}
              </option>
            ))}
          </select>
        </label>
        <Boton
          disabled={!elegido}
          onClick={() => {
            void ejecutar(() => repo.conectarEstudiante(sala.id, elegido))
            setElegido('')
          }}
        >
          Conectar
        </Boton>
      </div>
      {llena && <p className="text-sm text-tinta-suave">La sala está llena: tú puedes conectar más, los alumnos no.</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-borde pt-3">
        <Boton variante="suave" onClick={() => void ejecutar(() => repo.vaciarSala(sala.id, true))}>
          Cerrar sala y sacar a todos
        </Boton>
        {dentro.length > 0 && (
          <Boton variante="suave" onClick={() => void ejecutar(() => repo.vaciarSala(sala.id, false))}>
            Solo sacar a todos
          </Boton>
        )}
        {confirmar ? (
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-tinta">
            ¿Eliminar la sala y desconectar a todos?
            <Boton variante="secundario" onClick={() => void ejecutar(() => repo.eliminarSala(sala.id))}>
              Sí, eliminar
            </Boton>
            <Boton variante="suave" onClick={() => setConfirmar(false)}>
              Cancelar
            </Boton>
          </span>
        ) : (
          <Boton variante="suave" onClick={() => setConfirmar(true)}>
            Eliminar sala
          </Boton>
        )}
      </div>
    </Tarjeta>
  )
}

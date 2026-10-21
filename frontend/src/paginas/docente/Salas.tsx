import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useSesion } from '../../app/Sesion.tsx'
import { JUEGOS } from '../../contenido/actividades.ts'
import { CONTENIDOS, OA, contenido, planDe } from '../../contenido/contenidos.ts'
import { pictoMensaje } from '../../contenido/mensajes.ts'
import { repo } from '../../datos/index.ts'
import type { Conectado, Emocion, Estudiante, MiembroSala, ProgresoSala, ResultadoActividad, Sala, TipoSala } from '../../dominio/tipos.ts'
import { EMOCIONES, inicioDia, minutos } from '../../lib/avance.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { AvisoError, Boton, Encabezado, Tarjeta, claseEntrada } from '../../ui/aula.tsx'

const REFRESCO_MS = 5000
// Igual que la base: un dispositivo sin señales por 10 minutos se da por apagado.
const VIGENTE_MS = 10 * 60_000
const ESPERA = ''

interface Datos {
  salas: Sala[]
  miembros: MiembroSala[]
  estudiantes: Estudiante[]
  resultadosHoy: ResultadoActividad[]
  emocionDe: Map<string, Emocion>
  conectados: Map<string, Conectado>
  progresoDe: Map<string, ProgresoSala>
}

type Ejecutar = (accion: () => Promise<unknown>) => Promise<void>

const enLinea = (c: Conectado | undefined) => !!c && Date.now() - new Date(c.vistoEn).getTime() < VIGENTE_MS

// Avance que vale para la sala y el plan actuales; otro plan o sala parte en cero.
function avanceEn(sala: Sala, p: ProgresoSala | undefined) {
  return p && p.salaId === sala.id && p.asignacion === sala.asignacion ? p : undefined
}

export default function Salas() {
  const { cursoId } = useSesion()
  const [accionError, setAccionError] = useState<string | null>(null)
  const { datos, error, recargar } = useConsulta(async (): Promise<Datos> => {
    // Vista en vivo: se repite cada pocos segundos, así que solo trae lo de hoy
    // y la última emoción de cada niño (no el historial completo).
    const [salas, miembros, estudiantes, resultadosHoy, emociones, conectados, progreso] = await Promise.all([
      repo.listarSalas(cursoId),
      repo.listarMiembros(cursoId),
      repo.listarEstudiantes(cursoId),
      repo.listarResultados({ cursoId, desde: inicioDia() }),
      repo.ultimasEmociones(cursoId),
      repo.listarConectados(cursoId),
      repo.listarProgreso(cursoId),
    ])
    return {
      salas,
      miembros,
      estudiantes: estudiantes.filter((e) => e.activo),
      resultadosHoy,
      emocionDe: new Map(emociones.map((e) => [e.estudianteId, e.emocion])),
      conectados: new Map(conectados.map((c) => [c.estudianteId, c])),
      progresoDe: new Map(progreso.map((p) => [p.estudianteId, p])),
    }
  }, [cursoId])

  // Los alumnos entran, avanzan y salen solos: se refresca para que la docente lo vea.
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })

  const ejecutar: Ejecutar = async (accion) => {
    setAccionError(null)
    try {
      await accion()
    } catch (e) {
      setAccionError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    }
    recargar()
  }

  const enSala = new Set(datos?.miembros.map((m) => m.estudianteId))
  const enEspera = datos?.estudiantes.filter((e) => !enSala.has(e.id) && enLinea(datos.conectados.get(e.id))) ?? []

  return (
    <>
      <Encabezado
        antetitulo="Trabajo en aula"
        titulo="Salas"
        descripcion="Los niños eligen su perfil y quedan en espera. Tú los asignas a una sala y decides qué contenidos y juegos trabajan en ella."
      />
      {datos && (
        <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-tinta">
          <span className={`size-2.5 rounded-full ${enEspera.length + datos.miembros.length ? 'bg-menta' : 'bg-borde'}`} aria-hidden="true" />
          {[...datos.conectados.values()].filter(enLinea).length} con dispositivo · {enEspera.length} en espera · {datos.miembros.length} en salas
        </p>
      )}
      {accionError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {accionError.includes('duplicate') ? 'Ya existe una sala con ese nombre.' : accionError}
        </p>
      )}
      {error && !datos && <AvisoError alReintentar={recargar} />}
      {error && datos && (
        <p role="status" className="mb-4 rounded-xl bg-[#fdf1e4] px-4 py-3 text-sm font-semibold text-[#9a4d00]">
          No se pudo actualizar: se muestran los últimos datos. Se reintenta solo.
        </p>
      )}

      {datos && (
        <>
          <Avisos datos={datos} ejecutar={ejecutar} />
          <EnEspera ninos={enEspera} salas={datos.salas} ejecutar={ejecutar} />
          <CrearSala cursoId={cursoId} alCrear={(nombre, tipo) => ejecutar(() => repo.crearSala(cursoId, nombre, tipo))} />
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {datos.salas.map((s) =>
              s.tipo === 'playground' ? (
                <TarjetaPlayground key={s.id} sala={s} datos={datos} ejecutar={ejecutar} />
              ) : (
                <TarjetaSala key={s.id} sala={s} datos={datos} ejecutar={ejecutar} />
              ),
            )}
          </div>
          {datos.salas.length === 0 && <p className="text-tinta-suave">Aún no hay salas. Crea la primera arriba.</p>}
        </>
      )}
    </>
  )
}

// Niños que repitieron 2 veces la misma actividad sin lograr el 60 %.
function Avisos({ datos, ejecutar }: { datos: Datos; ejecutar: Ejecutar }) {
  const avisos = datos.miembros.flatMap((m) => {
    const sala = datos.salas.find((s) => s.id === m.salaId)
    const p = sala && avanceEn(sala, datos.progresoDe.get(m.estudianteId))
    const e = datos.estudiantes.find((x) => x.id === m.estudianteId)
    if (!sala || !p?.necesitaAyuda || !e) return []
    return [{ sala, p, e, paso: planDe(sala.contenidos)[p.paso] }]
  })
  if (avisos.length === 0) return null

  return (
    <section aria-labelledby="titulo-avisos" className="mb-6 rounded-3xl border-2 border-[#f0b97a] bg-[#fdf1e4] p-5">
      <h2 id="titulo-avisos" className="mb-3 flex items-center gap-2 text-lg font-bold text-[#9a4d00]">
        <span aria-hidden="true">🙋</span> Necesitan tu apoyo ({avisos.length})
      </h2>
      <ul className="grid gap-2">
        {avisos.map(({ sala, p, e, paso }) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2">
            <Avatar estudiante={e} className="size-10 text-2xl" />
            <span className="min-w-0 flex-1">
              <b className="text-tinta">{e.nombre}</b> <span className="text-tinta-suave">· {sala.nombre}</span>
              <span className="block text-sm text-tinta-suave">
                {paso ? `${paso.contenido.titulo}, actividad ${paso.numero}: «${paso.contenido.pasos[paso.numero - 1].titulo}»` : 'Actividad actual'} ·{' '}
                <b className="text-[#9a4d00]">no logra el 60 % tras {p.repeticiones} intentos</b>
              </span>
            </span>
            <Boton variante="secundario" onClick={() => void ejecutar(() => repo.marcarApoyado(e.id))}>
              <Icono nombre="check" /> Ya lo apoyé
            </Boton>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EnEspera({ ninos, salas, ejecutar }: { ninos: Estudiante[]; salas: Sala[]; ejecutar: Ejecutar }) {
  const [destino, setDestino] = useState('')
  const salaDestino = salas.some((s) => s.id === destino) ? destino : (salas[0]?.id ?? '')

  return (
    <Tarjeta className="mb-6 grid gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 text-lg font-bold text-tinta">
          En espera <span className="text-tinta-suave">({ninos.length})</span>
        </h2>
        {ninos.length > 0 && salas.length > 0 && (
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <label className="flex items-center gap-2">
              Asignar a todos a
              <select value={salaDestino} onChange={(e) => setDestino(e.target.value)} className={`${claseEntrada} w-auto py-1.5`}>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <Boton onClick={() => void ejecutar(() => Promise.all(ninos.map((n) => repo.conectarEstudiante(salaDestino, n.id))))}>Asignar</Boton>
          </span>
        )}
      </div>
      {ninos.length === 0 ? (
        <p className="text-sm text-tinta-suave">Nadie esperando. Los niños aparecen aquí al tocar su perfil en su computador.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {ninos.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-fondo px-3 py-2">
              <Avatar estudiante={e} className="size-9 text-xl" />
              <span className="min-w-0 flex-1 font-semibold text-tinta">{e.nombre}</span>
              <MoverA salas={salas} actual={ESPERA} alMover={(salaId) => ejecutar(() => repo.conectarEstudiante(salaId, e.id))} />
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}

function MoverA({ salas, actual, alMover }: { salas: Sala[]; actual: string; alMover: (salaId: string) => Promise<void> }) {
  return (
    <label className="text-sm font-semibold">
      <span className="sr-only">Mover a</span>
      <select
        value=""
        onChange={(e) => void alMover(e.target.value)}
        className="rounded-lg border border-borde bg-white px-2 py-1.5 text-sm font-semibold"
      >
        <option value="" disabled>
          {actual === ESPERA ? 'Asignar a…' : 'Mover a…'}
        </option>
        {actual !== ESPERA && <option value={ESPERA}>Sala de espera</option>}
        {salas
          .filter((s) => s.id !== actual)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.tipo === 'playground' ? '🎈 ' : ''}
              {s.nombre}
            </option>
          ))}
      </select>
    </label>
  )
}

function CrearSala({ cursoId, alCrear }: { cursoId: string; alCrear: (nombre: string, tipo: TipoSala) => Promise<void> }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoSala>('trabajo')
  useEffect(() => setNombre(''), [cursoId])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await alCrear(nombre.trim(), tipo)
    setNombre('')
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="mb-6 flex flex-wrap items-end gap-3">
      <label className="grid min-w-52 flex-1 gap-1 text-sm font-semibold text-tinta">
        Nombre de la sala
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej.: Grupo Sílabas" className={claseEntrada} />
      </label>
      <fieldset className="grid gap-1 text-sm font-semibold text-tinta">
        <legend className="mb-1">Tipo</legend>
        <span className="flex gap-2">
          {(
            [
              ['trabajo', 'Sala de trabajo'],
              ['playground', 'Playground'],
            ] as const
          ).map(([valor, texto]) => (
            <label key={valor} className={`cursor-pointer rounded-xl border px-3 py-2.5 ${tipo === valor ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}>
              <input type="radio" name="tipo-sala" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="sr-only" />
              {texto}
            </label>
          ))}
        </span>
      </fieldset>
      <Boton type="submit" disabled={!nombre.trim()}>
        <Icono nombre="mas" /> Crear sala
      </Boton>
    </form>
  )
}

function EncabezadoSala({ sala, n, ejecutar }: { sala: Sala; n: number; ejecutar: Ejecutar }) {
  const [confirmar, setConfirmar] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="min-w-0 flex-1 text-xl font-bold text-tinta">{sala.nombre}</h2>
      <span className={`rounded-full px-3 py-1 text-sm font-bold ${sala.tipo === 'playground' ? 'bg-[#fff3c4] text-[#7a5b00]' : 'bg-menta-fondo text-menta-oscuro'}`}>
        {sala.tipo === 'playground' ? 'Playground' : 'Sala de trabajo'} · {n} {n === 1 ? 'niño' : 'niños'}
      </span>
      {confirmar ? (
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-tinta">
          ¿Eliminar la sala? Los niños vuelven a la espera.
          <Boton variante="secundario" onClick={() => void ejecutar(() => repo.eliminarSala(sala.id))}>
            Sí, eliminar
          </Boton>
          <Boton variante="suave" onClick={() => setConfirmar(false)}>
            Cancelar
          </Boton>
        </span>
      ) : (
        <Boton variante="suave" aria-label={`Eliminar ${sala.nombre}`} onClick={() => setConfirmar(true)}>
          Eliminar
        </Boton>
      )}
    </div>
  )
}

function TarjetaSala({ sala, datos, ejecutar }: { sala: Sala; datos: Datos; ejecutar: Ejecutar }) {
  const plan = planDe(sala.contenidos)
  const dentro = datos.estudiantes.filter((e) => datos.miembros.some((m) => m.salaId === sala.id && m.estudianteId === e.id))
  const pasoDe = (id: string) => avanceEn(sala, datos.progresoDe.get(id))?.paso ?? 0
  const terminaron = dentro.filter((e) => plan.length > 0 && pasoDe(e.id) >= plan.length)
  const conAvance = dentro.filter((e) => pasoDe(e.id) > 0).length
  const playground = datos.salas.find((s) => s.tipo === 'playground')

  return (
    <Tarjeta className="grid gap-5 p-5">
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      <EditorPlan sala={sala} conAvance={conAvance} ejecutar={ejecutar} />

      {dentro.length > 0 && terminaron.length === dentro.length && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-menta-fondo px-4 py-3 text-sm font-semibold text-menta-oscuro">
          <span aria-hidden="true" className="text-xl">🎉</span>
          <span className="min-w-0 flex-1">Todos terminaron los contenidos y están en los juegos. Asigna un plan nuevo o muévelos.</span>
          {playground && (
            <Boton variante="secundario" onClick={() => void ejecutar(() => Promise.all(terminaron.map((e) => repo.conectarEstudiante(playground.id, e.id))))}>
              Mover a todos a «{playground.nombre}»
            </Boton>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-bold text-tinta-suave">Niños en la sala</h3>
        {dentro.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nadie todavía. Asígnalos desde «En espera» o agrégalos abajo.</p>
        ) : (
          <ul className="grid gap-2">
            {dentro.map((e) => (
              <FilaNino key={e.id} e={e} sala={sala} datos={datos} ejecutar={ejecutar}>
                <EstadoAvance sala={sala} p={avanceEn(sala, datos.progresoDe.get(e.id))} />
              </FilaNino>
            ))}
          </ul>
        )}
      </div>
      <AgregarNino sala={sala} datos={datos} ejecutar={ejecutar} />
    </Tarjeta>
  )
}

function EstadoAvance({ sala, p }: { sala: Sala; p: ProgresoSala | undefined }) {
  const plan = planDe(sala.contenidos)
  const paso = p?.paso ?? 0
  if (plan.length === 0) return <>Sin contenidos asignados</>
  if (paso >= plan.length) return <span className="font-semibold text-menta-oscuro">✓ Terminó los contenidos · en los juegos</span>
  const actual = plan[paso]
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <span className="block h-full rounded-full bg-menta" style={{ width: `${(paso / plan.length) * 100}%` }} />
      </span>
      {paso}/{plan.length} · {actual.contenido.titulo}, act. {actual.numero}
      {p && p.repeticiones > 0 && (
        <b className={p.necesitaAyuda ? 'text-[#9a4d00]' : ''}>· intento {p.repeticiones + 1}</b>
      )}
    </span>
  )
}

function FilaNino({ e, sala, datos, ejecutar, children }: { e: Estudiante; sala: Sala; datos: Datos; ejecutar: Ejecutar; children: ReactNode }) {
  const partidas = datos.resultadosHoy.filter((r) => r.estudianteId === e.id)
  const emocion = datos.emocionDe.get(e.id)
  const conectado = datos.conectados.get(e.id)
  const online = enLinea(conectado)
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl bg-fondo px-3 py-2">
      <span className="relative">
        <Avatar estudiante={e} className="size-9 text-xl" />
        <span
          title={online ? 'Con dispositivo' : 'Sin dispositivo'}
          className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white ${online ? 'bg-menta' : 'bg-borde'}`}
        />
      </span>
      <span className="min-w-44 flex-1">
        <span className="block font-semibold text-tinta">
          {e.nombre}
          {!online && <span className="ml-2 text-xs font-semibold text-tinta-suave">sin dispositivo</span>}
        </span>
        <span className="block text-xs text-tinta-suave">{children}</span>
        <span className="block text-xs text-tinta-suave">
          {partidas.length === 0
            ? 'Aún no juega hoy'
            : `Hoy: ${partidas.length} ${partidas.length === 1 ? 'partida' : 'partidas'} · ${minutos(partidas.reduce((n, r) => n + r.duracionMs, 0))} min`}
        </span>
      </span>
      {emocion && (
        <span title={`Se siente: ${EMOCIONES[emocion].texto}`} className="rounded-lg px-2 py-1 text-sm font-semibold" style={{ background: EMOCIONES[emocion].color }}>
          <span aria-hidden="true">{EMOCIONES[emocion].cara}</span> <span className="sr-only">Se siente </span>
          {EMOCIONES[emocion].texto}
        </span>
      )}
      <MoverA
        salas={datos.salas}
        actual={sala.id}
        alMover={(destino) => ejecutar(() => (destino === ESPERA ? repo.desconectarEstudiante(e.id) : repo.conectarEstudiante(destino, e.id)))}
      />
      {conectado && (
        <Boton variante="suave" title="Cierra la sesión del computador del niño: vuelve a elegir su perfil." onClick={() => void ejecutar(() => repo.cerrarDispositivo(e.id))}>
          Cerrar dispositivo
        </Boton>
      )}
    </li>
  )
}

function AgregarNino({ sala, datos, ejecutar }: { sala: Sala; datos: Datos; ejecutar: Ejecutar }) {
  const [elegido, setElegido] = useState('')
  const salaDe = new Map(datos.miembros.map((m) => [m.estudianteId, m.salaId]))
  const disponibles = datos.estudiantes.filter((e) => salaDe.get(e.id) !== sala.id)
  const dentro = datos.miembros.some((m) => m.salaId === sala.id)
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-borde pt-3">
      <label className="min-w-48 flex-1 text-sm font-semibold text-tinta">
        <span className="sr-only">Agregar estudiante a {sala.nombre}</span>
        <select value={elegido} onChange={(e) => setElegido(e.target.value)} className={claseEntrada}>
          <option value="">Agregar a un estudiante…</option>
          {disponibles.map((e) => {
            const otra = datos.salas.find((s) => s.id === salaDe.get(e.id))
            return (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {otra ? ` (está en ${otra.nombre})` : ''}
              </option>
            )
          })}
        </select>
      </label>
      <Boton
        disabled={!elegido}
        onClick={() => {
          void ejecutar(() => repo.conectarEstudiante(sala.id, elegido))
          setElegido('')
        }}
      >
        Agregar
      </Boton>
      {dentro && (
        <Boton variante="suave" onClick={() => void ejecutar(() => repo.vaciarSala(sala.id))}>
          Enviar a todos a la espera
        </Boton>
      )}
    </div>
  )
}

// Plan de la sala: contenidos MINEDUC en orden (cada uno trae sus 3 actividades)
// y los juegos a los que llegan al terminar. Guardar un plan nuevo reinicia el avance.
function EditorPlan({ sala, conAvance, ejecutar }: { sala: Sala; conAvance: number; ejecutar: Ejecutar }) {
  const [editando, setEditando] = useState(false)
  const [contenidos, setContenidos] = useState(sala.contenidos)
  const [juegos, setJuegos] = useState(sala.juegos)
  const [agregar, setAgregar] = useState('')

  const abrir = () => {
    setContenidos(sala.contenidos)
    setJuegos(sala.juegos)
    setEditando(true)
  }
  const mover = (i: number, d: -1 | 1) =>
    setContenidos((c) => {
      const r = [...c]
      ;[r[i], r[i + d]] = [r[i + d], r[i]]
      return r
    })
  const guardar = async () => {
    await ejecutar(() => repo.asignarPlan(sala.id, contenidos, juegos))
    setEditando(false)
  }

  if (!editando) {
    return (
      <div className="grid gap-3 rounded-2xl border border-borde p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-bold text-tinta-suave">Plan de la sala</h3>
          <Boton variante="suave" onClick={abrir}>
            <Icono nombre="lapiz" /> {sala.contenidos.length ? 'Cambiar plan' : 'Asignar contenidos'}
          </Boton>
        </div>
        {sala.contenidos.length === 0 ? (
          <p className="text-sm text-tinta-suave">Sin contenidos: los niños de esta sala juegan a los globos mientras tanto.</p>
        ) : (
          <ol className="grid gap-1.5 text-sm">
            {sala.contenidos.map((id, i) => {
              const c = contenido(id)
              return (
                <li key={`${id}-${i}`} className="flex flex-wrap items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-celeste-fondo text-xs font-bold">{i + 1}</span>
                  <b className="text-tinta">{c?.titulo ?? id}</b>
                  <span className="text-tinta-suave">· 3 actividades</span>
                  {c?.oa.map((oa) => <ChipOA key={oa} oa={oa} />)}
                </li>
              )
            })}
          </ol>
        )}
        <p className="text-sm text-tinta-suave">
          <b className="text-tinta">Juegos al terminar:</b>{' '}
          {sala.juegos.length ? JUEGOS.filter((j) => sala.juegos.includes(j.id)).map((j) => `${j.icono} ${j.titulo}`).join(' · ') : 'ninguno (esperan con los globos)'}
        </p>
      </div>
    )
  }

  const disponibles = CONTENIDOS.filter((c) => !contenidos.includes(c.id))

  return (
    <div className="grid gap-4 rounded-2xl border-2 border-menta p-4">
      <div>
        <h3 className="text-sm font-bold text-tinta">Contenidos (en orden)</h3>
        <p className="text-xs text-tinta-suave">
          Bases Curriculares de Educación Parvularia, Lenguaje Verbal, nivel Transición. Cada contenido tiene 3 actividades; el niño pasa a la siguiente al lograr el 60 % y, si no, la repite con otras rondas.
        </p>
      </div>
      {contenidos.length === 0 && <p className="text-sm text-tinta-suave">Agrega al menos un contenido.</p>}
      <ol className="grid gap-2">
        {contenidos.map((id, i) => {
          const c = contenido(id)
          return (
            <li key={id} className="flex flex-wrap items-center gap-2 rounded-xl bg-fondo px-3 py-2 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <b className="text-tinta">{c?.titulo ?? id}</b>
                <span className="block text-xs text-tinta-suave">{c?.pasos.map((p, k) => `${k + 1}. ${p.titulo}`).join(' · ')}</span>
              </span>
              <Boton variante="suave" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</Boton>
              <Boton variante="suave" aria-label="Bajar" disabled={i === contenidos.length - 1} onClick={() => mover(i, 1)}>↓</Boton>
              <Boton variante="suave" aria-label={`Quitar ${c?.titulo ?? id}`} onClick={() => setContenidos((x) => x.filter((y) => y !== id))}>✕</Boton>
            </li>
          )
        })}
      </ol>
      {disponibles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-56 flex-1 text-sm font-semibold">
            <span className="sr-only">Agregar contenido</span>
            <select value={agregar} onChange={(e) => setAgregar(e.target.value)} className={claseEntrada}>
              <option value="">Agregar contenido…</option>
              {(Object.keys(OA) as (keyof typeof OA)[]).map((oa) => (
                <optgroup key={oa} label={`${oa}: ${OA[oa]}`}>
                  {disponibles
                    .filter((c) => c.oa[0] === oa)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.titulo} — {c.descripcion}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Boton
            disabled={!agregar}
            onClick={() => {
              setContenidos((x) => [...x, agregar])
              setAgregar('')
            }}
          >
            <Icono nombre="mas" /> Agregar
          </Boton>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-tinta">Juegos al terminar los contenidos</legend>
        <div className="flex flex-wrap gap-2">
          {JUEGOS.map((j) => {
            const activo = juegos.includes(j.id)
            return (
              <label key={j.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${activo ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}>
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => setJuegos((x) => (activo ? x.filter((y) => y !== j.id) : [...x, j.id]))}
                  className="accent-[var(--color-menta)]"
                />
                <span aria-hidden="true">{j.icono}</span> {j.titulo}
              </label>
            )
          })}
        </div>
      </fieldset>

      {conAvance > 0 && (
        <p className="rounded-xl bg-[#fdf1e4] px-3 py-2 text-sm font-semibold text-[#9a4d00]">
          Al guardar, {conAvance} {conAvance === 1 ? 'niño vuelve' : 'niños vuelven'} a la primera actividad del plan nuevo.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Boton onClick={() => void guardar()}>
          <Icono nombre="check" /> Guardar plan
        </Boton>
        <Boton variante="suave" onClick={() => setEditando(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  )
}

function ChipOA({ oa }: { oa: keyof typeof OA }) {
  return (
    <span title={OA[oa]} className="rounded-md bg-celeste-fondo px-1.5 py-0.5 text-xs font-bold text-marino">
      {oa}
    </span>
  )
}

function TarjetaPlayground({ sala, datos, ejecutar }: { sala: Sala; datos: Datos; ejecutar: Ejecutar }) {
  const dentro = datos.estudiantes.filter((e) => datos.miembros.some((m) => m.salaId === sala.id && m.estudianteId === e.id))
  const { datos: mensajes, recargar } = useConsulta(() => repo.mensajesSala(sala.id), [sala.id])
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })

  return (
    <Tarjeta className="grid gap-5 p-5">
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      <p className="text-sm text-tinta-suave">
        Espacio común para quienes terminaron: se comunican con pictogramas predefinidos (sin texto libre) mientras les asignas otra sala.
      </p>
      <div>
        <h3 className="mb-2 text-sm font-bold text-tinta-suave">Últimos mensajes</h3>
        {mensajes?.length ? (
          <ul className="flex flex-wrap gap-2">
            {mensajes.slice(0, 12).map((m) => (
              <li key={m.id} className="flex items-center gap-1.5 rounded-full bg-fondo py-1 pr-3 pl-1 text-sm" title={new Date(m.enviadoEn).toLocaleTimeString('es-CL')}>
                <Avatar estudiante={m} className="size-7 text-base" />
                <span className="font-semibold">{m.nombre}</span>
                <span aria-label={pictoMensaje(m.picto)?.voz}>{pictoMensaje(m.picto)?.emoji}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tinta-suave">Aún no hay mensajes.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-tinta-suave">Niños en el playground</h3>
        {dentro.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nadie todavía.</p>
        ) : (
          <ul className="grid gap-2">
            {dentro.map((e) => (
              <FilaNino key={e.id} e={e} sala={sala} datos={datos} ejecutar={ejecutar}>
                En el playground
              </FilaNino>
            ))}
          </ul>
        )}
      </div>
      <AgregarNino sala={sala} datos={datos} ejecutar={ejecutar} />
    </Tarjeta>
  )
}

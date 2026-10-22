import { createContext, use, useEffect, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { useSesion } from '../../app/Sesion.tsx'
import { JUEGOS } from '../../contenido/actividades.ts'
import { CONTENIDOS, contenido, planDe, type Contenido } from '../../contenido/contenidos.ts'
import { pictoMensaje } from '../../contenido/mensajes.ts'
import { repo } from '../../datos/index.ts'
import type { Conectado, Emocion, Estudiante, MiembroSala, ProgresoSala, ResultadoActividad, Sala, TipoSala } from '../../dominio/tipos.ts'
import { EMOCIONES, inicioDia, minutos } from '../../lib/avance.ts'
import { capitalizar } from '../../lib/texto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { AvisoError, Boton, Encabezado, claseEntrada, claseTarjeta } from '../../ui/aula.tsx'

const REFRESCO_MS = 5000
// Igual que la base: un dispositivo sin señales por 10 minutos se da por apagado.
const VIGENTE_MS = 10 * 60_000
// Destino «sin sala»: soltar ahí saca al niño de su sala y vuelve a la espera.
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

// Mover niños entre salas: se arrastra su ficha a la caja de una sala (o a «Sin
// sala»). En pantallas táctiles, donde arrastrar no siempre funciona, se toca la
// ficha y luego la caja de destino.
interface ValorMover {
  elegido: Estudiante | null
  elegir: (e: Estudiante | null) => void
  salaDe: (estudianteId: string) => string
  mover: (estudianteId: string, destino: string) => void
}

const MoverContexto = createContext<ValorMover | null>(null)

function useMover() {
  const v = use(MoverContexto)
  if (!v) throw new Error('useMover debe usarse dentro de <Salas>')
  return v
}

export default function Salas() {
  const { cursoId } = useSesion()
  const [accionError, setAccionError] = useState<string | null>(null)
  const [elegido, setElegido] = useState<Estudiante | null>(null)
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

  // Escape suelta al niño elegido sin moverlo.
  useEffect(() => {
    if (!elegido) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setElegido(null)
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [elegido])

  const ejecutar: Ejecutar = async (accion) => {
    setAccionError(null)
    try {
      await accion()
    } catch (e) {
      setAccionError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    }
    recargar()
  }

  const salaDe = (id: string) => datos?.miembros.find((m) => m.estudianteId === id)?.salaId ?? ESPERA
  const mover = (estudianteId: string, destino: string) => {
    setElegido(null)
    if (salaDe(estudianteId) === destino) return
    void ejecutar(() => (destino === ESPERA ? repo.desconectarEstudiante(estudianteId) : repo.conectarEstudiante(destino, estudianteId)))
  }

  const enSala = new Set(datos?.miembros.map((m) => m.estudianteId))
  const sinSala = datos?.estudiantes.filter((e) => !enSala.has(e.id)) ?? []
  const enEspera = sinSala.filter((e) => enLinea(datos?.conectados.get(e.id)))

  return (
    <MoverContexto value={{ elegido, elegir: setElegido, salaDe, mover }}>
      <Encabezado antetitulo="Trabajo en aula" titulo="Salas" descripcion="Arrastra a cada niño a su sala. En tablet: tócalo y luego toca la sala." />
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
          <CrearSala cursoId={cursoId} alCrear={(nombre, tipo) => ejecutar(() => repo.crearSala(cursoId, nombre, tipo))} />
          <div className="grid items-start gap-5 xl:grid-cols-[17rem_1fr]">
            <SinSala ninos={sinSala} datos={datos} />
            <div className="grid items-start gap-5 2xl:grid-cols-2">
              {datos.salas.map((s) =>
                s.tipo === 'playground' ? (
                  <TarjetaPlayground key={s.id} sala={s} datos={datos} ejecutar={ejecutar} />
                ) : (
                  <TarjetaSala key={s.id} sala={s} datos={datos} ejecutar={ejecutar} />
                ),
              )}
              {datos.salas.length === 0 && <p className="text-tinta-suave">Aún no hay salas. Crea la primera arriba.</p>}
            </div>
          </div>
        </>
      )}
    </MoverContexto>
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
              <span className="flex flex-wrap items-center gap-1.5 text-sm text-tinta-suave">
                {paso && <IconoContenido c={paso.contenido} className="size-6 text-sm" />}
                {paso ? `${paso.contenido.titulo} · act. ${paso.numero}` : 'Actividad actual'} ·{' '}
                <b className="text-[#9a4d00]">{p.repeticiones} intentos sin lograrlo</b>
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

// Caja donde se suelta a un niño: una sala o «Sin sala». Resalta al arrastrar
// encima y, si hay un niño elegido con un toque, ofrece moverlo aquí.
function ZonaSoltar({ destino, nombre, className = '', children }: { destino: string; nombre: string; className?: string; children: ReactNode }) {
  const { elegido, salaDe, mover } = useMover()
  const [encima, setEncima] = useState(false)
  const puedeRecibir = elegido && salaDe(elegido.id) !== destino

  const alSoltar = (ev: DragEvent) => {
    ev.preventDefault()
    setEncima(false)
    const id = ev.dataTransfer.getData('text/plain')
    if (id) mover(id, destino)
  }

  return (
    <section
      aria-label={nombre}
      onDragOver={(ev) => {
        ev.preventDefault()
        ev.dataTransfer.dropEffect = 'move'
        setEncima(true)
      }}
      onDragLeave={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setEncima(false)
      }}
      onDrop={alSoltar}
      className={`${claseTarjeta} grid gap-4 p-5 transition-shadow ${encima ? 'ring-3 ring-menta ring-offset-2' : puedeRecibir ? 'ring-2 ring-menta/50' : ''} ${className}`}
    >
      {puedeRecibir && (
        <button
          type="button"
          onClick={() => mover(elegido.id, destino)}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-menta bg-menta-fondo px-3 py-2 text-sm font-bold text-menta-oscuro hover:bg-[#d3f0e2]"
        >
          <Avatar estudiante={elegido} className="size-7 text-base" />
          Mover a {elegido.nombre} {destino === ESPERA ? 'a «Sin sala»' : `a «${nombre}»`}
        </button>
      )}
      {children}
    </section>
  )
}

// Asa de la ficha de un niño: se arrastra o se toca para elegirlo.
function useArrastrable(e: Estudiante) {
  const { elegido, elegir } = useMover()
  const activo = elegido?.id === e.id
  return {
    activo,
    fila: {
      draggable: true,
      onDragStart: (ev: DragEvent) => {
        ev.dataTransfer.setData('text/plain', e.id)
        ev.dataTransfer.effectAllowed = 'move'
        elegir(null)
      },
    },
    asa: (
      <button
        type="button"
        aria-pressed={activo}
        aria-label={activo ? `Soltar a ${e.nombre}` : `Mover a ${e.nombre}`}
        title="Arrastra a otra sala, o toca aquí y luego toca la sala"
        onClick={() => elegir(activo ? null : e)}
        className={`grid size-8 shrink-0 cursor-grab place-items-center rounded-lg active:cursor-grabbing ${activo ? 'bg-menta text-white' : 'text-tinta-suave hover:bg-white'}`}
      >
        <Icono nombre="arrastrar" className="size-5 [stroke-width:3.2]" />
      </button>
    ),
  }
}

// Los que no están en ninguna sala: arriba los que ya esperan en su computador.
function SinSala({ ninos, datos }: { ninos: Estudiante[]; datos: Datos }) {
  const ordenados = [...ninos].sort((a, b) => Number(enLinea(datos.conectados.get(b.id))) - Number(enLinea(datos.conectados.get(a.id))))
  return (
    <ZonaSoltar destino={ESPERA} nombre="Sin sala" className="xl:sticky xl:top-4">
      <h2 className="text-lg font-bold text-tinta">
        Sin sala <span className="text-tinta-suave">({ninos.length})</span>
      </h2>
      {ninos.length === 0 ? (
        <p className="text-sm text-tinta-suave">Todos están en una sala.</p>
      ) : (
        <ul className="grid gap-1.5">
          {ordenados.map((e) => (
            <FichaSinSala key={e.id} e={e} online={enLinea(datos.conectados.get(e.id))} />
          ))}
        </ul>
      )}
    </ZonaSoltar>
  )
}

function FichaSinSala({ e, online }: { e: Estudiante; online: boolean }) {
  const { activo, fila, asa } = useArrastrable(e)
  return (
    <li {...fila} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${activo ? 'bg-menta-fondo ring-2 ring-menta' : 'bg-fondo'} ${online ? '' : 'opacity-60'}`}>
      {asa}
      <EnLinea e={e} online={online} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate font-semibold text-tinta">{e.nombre}</span>
        <span className="block text-xs font-semibold text-tinta-suave">{online ? 'Esperando' : 'Sin conectar'}</span>
      </span>
    </li>
  )
}

function EnLinea({ e, online }: { e: Estudiante; online: boolean }) {
  return (
    <span className="relative shrink-0">
      <Avatar estudiante={e} className="size-9 text-xl" />
      <span
        title={online ? 'Con dispositivo' : 'Sin dispositivo'}
        className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white ${online ? 'bg-menta' : 'bg-borde'}`}
      />
    </span>
  )
}

function CrearSala({ cursoId, alCrear }: { cursoId: string; alCrear: (nombre: string, tipo: TipoSala) => Promise<void> }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoSala>('trabajo')
  useEffect(() => setNombre(''), [cursoId])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await alCrear(capitalizar(nombre.trim()), tipo)
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
    <ZonaSoltar destino={sala.id} nombre={sala.nombre}>
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      <EditorPlan sala={sala} conAvance={conAvance} ejecutar={ejecutar} />

      {dentro.length > 0 && terminaron.length === dentro.length && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-menta-fondo px-4 py-3 text-sm font-semibold text-menta-oscuro">
          <span aria-hidden="true" className="text-xl">🎉</span>
          <span className="min-w-0 flex-1">Todos terminaron y están en los juegos.</span>
          {playground && (
            <Boton variante="secundario" onClick={() => void ejecutar(() => Promise.all(terminaron.map((e) => repo.conectarEstudiante(playground.id, e.id))))}>
              Mover a todos a «{playground.nombre}»
            </Boton>
          )}
        </div>
      )}

      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia="Arrastra aquí a los niños de esta sala.">
        {(e) => <EstadoAvance sala={sala} p={avanceEn(sala, datos.progresoDe.get(e.id))} />}
      </ListaNinos>
    </ZonaSoltar>
  )
}

function ListaNinos({
  sala,
  dentro,
  datos,
  ejecutar,
  vacia,
  children,
}: {
  sala: Sala
  dentro: Estudiante[]
  datos: Datos
  ejecutar: Ejecutar
  vacia: string
  children: (e: Estudiante) => ReactNode
}) {
  return (
    <div>
      {dentro.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-borde px-4 py-5 text-center text-sm text-tinta-suave">{vacia}</p>
      ) : (
        <ul className="grid gap-2">
          {dentro.map((e) => (
            <FilaNino key={e.id} e={e} datos={datos} ejecutar={ejecutar}>
              {children(e)}
            </FilaNino>
          ))}
        </ul>
      )}
      {dentro.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Boton variante="suave" onClick={() => void ejecutar(() => repo.vaciarSala(sala.id))}>
            Sacar a todos de la sala
          </Boton>
        </div>
      )}
    </div>
  )
}

function EstadoAvance({ sala, p }: { sala: Sala; p: ProgresoSala | undefined }) {
  const plan = planDe(sala.contenidos)
  const paso = p?.paso ?? 0
  if (plan.length === 0) return <>Sin contenidos asignados</>
  if (paso >= plan.length) return <span className="font-semibold text-menta-oscuro">✓ Terminó · en los juegos</span>
  const actual = plan[paso]
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <span className="block h-full rounded-full bg-menta" style={{ width: `${(paso / plan.length) * 100}%` }} />
      </span>
      {paso}/{plan.length} · <span aria-hidden="true">{actual.contenido.icono}</span> {actual.contenido.titulo}, act. {actual.numero}
      {p && p.repeticiones > 0 && <b className={p.necesitaAyuda ? 'text-[#9a4d00]' : ''}>· intento {p.repeticiones + 1}</b>}
    </span>
  )
}

function FilaNino({ e, datos, ejecutar, children }: { e: Estudiante; datos: Datos; ejecutar: Ejecutar; children: ReactNode }) {
  const { activo, fila, asa } = useArrastrable(e)
  const partidas = datos.resultadosHoy.filter((r) => r.estudianteId === e.id)
  const emocion = datos.emocionDe.get(e.id)
  const conectado = datos.conectados.get(e.id)
  const online = enLinea(conectado)
  return (
    <li {...fila} className={`flex flex-wrap items-center gap-3 rounded-xl px-2 py-2 ${activo ? 'bg-menta-fondo ring-2 ring-menta' : 'bg-fondo'}`}>
      {asa}
      <EnLinea e={e} online={online} />
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
      {conectado && (
        <Boton variante="suave" title="Cierra la sesión del computador del niño: vuelve a elegir su perfil." onClick={() => void ejecutar(() => repo.cerrarDispositivo(e.id))}>
          Cerrar dispositivo
        </Boton>
      )}
    </li>
  )
}

function IconoContenido({ c, className = 'size-10 text-xl' }: { c: Contenido; className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full ${className}`} style={{ background: c.color }}>
      {c.icono}
    </span>
  )
}

// Plan de la sala: contenidos en orden (cada uno trae sus 3 actividades) y los
// juegos a los que llegan al terminar. Guardar un plan nuevo reinicia el avance.
function EditorPlan({ sala, conAvance, ejecutar }: { sala: Sala; conAvance: number; ejecutar: Ejecutar }) {
  const [editando, setEditando] = useState(false)
  const [contenidos, setContenidos] = useState(sala.contenidos)
  const [juegos, setJuegos] = useState(sala.juegos)

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
    const juegosSala = JUEGOS.filter((j) => sala.juegos.includes(j.id))
    return (
      <div className="grid gap-3 rounded-2xl border border-borde p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-bold text-tinta-suave">Plan</h3>
          <Boton variante="suave" onClick={abrir}>
            <Icono nombre="lapiz" /> {sala.contenidos.length ? 'Cambiar' : 'Elegir contenidos'}
          </Boton>
        </div>
        {sala.contenidos.length === 0 ? (
          <p className="text-sm text-tinta-suave">Sin contenidos: mientras tanto juegan a los globos.</p>
        ) : (
          <ol className="flex flex-wrap items-center gap-2">
            {sala.contenidos.map((id, i) => {
              const c = contenido(id)
              return (
                <li key={`${id}-${i}`} className="flex items-center gap-2 rounded-full bg-fondo py-1 pr-3 pl-1 text-sm font-semibold text-tinta" title={c?.descripcion}>
                  {c ? <IconoContenido c={c} className="size-8 text-base" /> : null}
                  {c?.titulo ?? id}
                </li>
              )
            })}
          </ol>
        )}
        {juegosSala.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-tinta-suave">
            Después:
            {juegosSala.map((j) => (
              <span key={j.id} className="rounded-full bg-[#fff3c4] px-2.5 py-0.5 font-semibold text-tinta">
                <span aria-hidden="true">{j.icono}</span> {j.titulo}
              </span>
            ))}
          </p>
        )}
      </div>
    )
  }

  const disponibles = CONTENIDOS.filter((c) => !contenidos.includes(c.id))

  return (
    <div className="grid gap-4 rounded-2xl border-2 border-menta p-4">
      <div>
        <h3 className="text-sm font-bold text-tinta">Contenidos, en orden</h3>
        <p className="text-xs text-tinta-suave">Cada uno trae 3 actividades.</p>
      </div>
      {contenidos.length > 0 && (
        <ol className="grid gap-2">
          {contenidos.map((id, i) => {
            const c = contenido(id)
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-fondo px-2 py-1.5 text-sm" title={c?.pasos.map((p, k) => `${k + 1}. ${p.titulo}`).join('\n')}>
                <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold">{i + 1}</span>
                {c && <IconoContenido c={c} className="size-9 text-lg" />}
                <b className="min-w-0 flex-1 text-tinta">{c?.titulo ?? id}</b>
                <Boton variante="suave" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</Boton>
                <Boton variante="suave" aria-label="Bajar" disabled={i === contenidos.length - 1} onClick={() => mover(i, 1)}>↓</Boton>
                <Boton variante="suave" aria-label={`Quitar ${c?.titulo ?? id}`} onClick={() => setContenidos((x) => x.filter((y) => y !== id))}>✕</Boton>
              </li>
            )
          })}
        </ol>
      )}

      {disponibles.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold text-tinta-suave">Toca para agregar</h4>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
            {disponibles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  title={c.descripcion}
                  onClick={() => setContenidos((x) => [...x, c.id])}
                  className="grid h-full w-full justify-items-center gap-1.5 rounded-xl border border-borde bg-white px-2 py-3 text-center text-sm font-semibold text-tinta transition-colors hover:border-menta hover:bg-menta-fondo"
                >
                  <IconoContenido c={c} className="size-11 text-2xl" />
                  {c.titulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-tinta">Juegos al terminar</legend>
        <div className="flex flex-wrap gap-2">
          {JUEGOS.map((j) => {
            const activo = juegos.includes(j.id)
            return (
              <label
                key={j.id}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${activo ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => setJuegos((x) => (activo ? x.filter((y) => y !== j.id) : [...x, j.id]))}
                  className="accent-[var(--color-menta)]"
                />
                <span aria-hidden="true" className="text-lg">{j.icono}</span> {j.titulo}
              </label>
            )
          })}
        </div>
      </fieldset>

      {conAvance > 0 && (
        <p className="rounded-xl bg-[#fdf1e4] px-3 py-2 text-sm font-semibold text-[#9a4d00]">
          Al guardar, {conAvance} {conAvance === 1 ? 'niño vuelve' : 'niños vuelven'} a empezar.
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

function TarjetaPlayground({ sala, datos, ejecutar }: { sala: Sala; datos: Datos; ejecutar: Ejecutar }) {
  const dentro = datos.estudiantes.filter((e) => datos.miembros.some((m) => m.salaId === sala.id && m.estudianteId === e.id))
  const { datos: mensajes, recargar } = useConsulta(() => repo.mensajesSala(sala.id), [sala.id])
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })

  return (
    <ZonaSoltar destino={sala.id} nombre={sala.nombre}>
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      <p className="text-sm text-tinta-suave">Espacio común con pictogramas, para quienes terminaron.</p>
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
      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia="Arrastra aquí a quienes terminaron.">
        {() => 'En el playground'}
      </ListaNinos>
    </ZonaSoltar>
  )
}

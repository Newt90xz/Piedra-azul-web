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
const TIPOS: Record<TipoSala, { nombre: string; icono: string; color: string; ayuda: string }> = {
  trabajo: { nombre: 'Sala de trabajo', icono: '📚', color: 'text-menta-oscuro', ayuda: 'Contenidos en orden y juegos al terminar.' },
  playground: { nombre: 'Playground', icono: '🎈', color: 'text-[#7a5b00]', ayuda: 'Espacio común con mensajes de pictogramas.' },
  dibujo: { nombre: 'Dibujo', icono: '🎨', color: 'text-[#7b3fa0]', ayuda: 'Dibujo libre y repasar letras.' },
}
// Destino «sin sala»: soltar ahí saca al niño de su sala y vuelve a la espera.
const ESPERA = ''
// Si el servidor nunca confirma un movimiento, el aviso «Conectándolo…» se quita igual.
const OLVIDAR_PENDIENTE_MS = 20_000

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
// ficha y luego la caja de destino. El niño aparece al instante en su destino
// con «Conectándolo…» hasta que el servidor lo confirma; si falla, vuelve.
interface ValorMover {
  elegido: Estudiante | null
  elegir: (e: Estudiante | null) => void
  // Sala donde se ve al niño (la pedida, si el movimiento aún no se confirma).
  salaDe: (estudianteId: string) => string
  // Destino de un movimiento sin confirmar, o undefined.
  pendiente: (estudianteId: string) => string | undefined
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
  // Movimientos pedidos: estudianteId → sala de destino.
  const [pedidos, setPedidos] = useState<Record<string, string>>({})
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

  const salaServidor = (id: string) => datos?.miembros.find((m) => m.estudianteId === id)?.salaId ?? ESPERA
  // Un pedido deja de estar pendiente en cuanto los datos del servidor lo muestran hecho.
  const pendiente = (id: string) => (id in pedidos && salaServidor(id) !== pedidos[id] ? pedidos[id] : undefined)
  const salaDe = (id: string) => pendiente(id) ?? salaServidor(id)

  const quitarPedido = (id: string, destino: string) =>
    setPedidos((p) => {
      if (p[id] !== destino) return p
      const resto = { ...p }
      delete resto[id]
      return resto
    })

  const mover = (estudianteId: string, destino: string) => {
    setElegido(null)
    if (salaDe(estudianteId) === destino) return
    setAccionError(null)
    setPedidos((p) => ({ ...p, [estudianteId]: destino }))
    const accion = destino === ESPERA ? repo.desconectarEstudiante(estudianteId) : repo.conectarEstudiante(destino, estudianteId)
    accion.then(
      () => {
        recargar()
        window.setTimeout(() => quitarPedido(estudianteId, destino), OLVIDAR_PENDIENTE_MS)
      },
      (e: unknown) => {
        quitarPedido(estudianteId, destino)
        setAccionError(e instanceof Error ? e.message : 'No se pudo mover al niño.')
        recargar()
      },
    )
  }

  const enDestino = (destino: string) => datos?.estudiantes.filter((e) => salaDe(e.id) === destino) ?? []
  const sinSala = enDestino(ESPERA)
  const enEspera = sinSala.filter((e) => enLinea(datos?.conectados.get(e.id)))
  const enSalas = (datos?.estudiantes.length ?? 0) - sinSala.length

  return (
    <MoverContexto value={{ elegido, elegir: setElegido, salaDe, pendiente, mover }}>
      <Encabezado
        antetitulo="Trabajo en aula"
        titulo="Salas"
        descripcion="Arrastra a cada niño a su sala. En tablet: tócalo y luego toca la sala."
        accion={
          datos && (
            <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
              <span className={`size-2.5 rounded-full ${enEspera.length + enSalas ? 'bg-menta' : 'bg-borde'}`} aria-hidden="true" />
              {[...datos.conectados.values()].filter(enLinea).length} con dispositivo · {enEspera.length} en espera · {enSalas} en salas
            </p>
          )
        }
      />
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
          <SinSala ninos={sinSala} datos={datos} />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] items-start gap-5">
            {datos.salas.map((s) =>
              s.tipo === 'playground' ? (
                <TarjetaPlayground key={s.id} sala={s} dentro={enDestino(s.id)} datos={datos} ejecutar={ejecutar} />
              ) : s.tipo === 'dibujo' ? (
                <TarjetaDibujo key={s.id} sala={s} dentro={enDestino(s.id)} datos={datos} ejecutar={ejecutar} />
              ) : (
                <TarjetaSala key={s.id} sala={s} dentro={enDestino(s.id)} datos={datos} ejecutar={ejecutar} />
              ),
            )}
            <CrearSala cursoId={cursoId} alCrear={(nombre, tipo) => ejecutar(() => repo.crearSala(cursoId, nombre, tipo))} />
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
    <section aria-labelledby="titulo-avisos" className="mb-5 rounded-3xl border-2 border-[#f0b97a] bg-[#fdf1e4] p-4">
      <h2 id="titulo-avisos" className="mb-2 flex items-center gap-2 font-bold text-[#9a4d00]">
        <span aria-hidden="true">🙋</span> Necesitan tu apoyo ({avisos.length})
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2">
        {avisos.map(({ sala, p, e, paso }) => (
          <li key={e.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
            <Avatar estudiante={e} className="size-10 text-2xl" />
            <span className="min-w-0 flex-1 text-sm">
              <b className="text-tinta">{e.nombre}</b> <span className="text-tinta-suave">· {sala.nombre}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-tinta-suave">
                {paso && <IconoContenido c={paso.contenido} className="size-5 text-xs" />}
                {paso ? `${paso.contenido.titulo} · act. ${paso.numero}` : 'Actividad actual'} ·{' '}
                <b className="text-[#9a4d00]">{p.repeticiones} intentos</b>
              </span>
            </span>
            <Boton variante="secundario" className="shrink-0" onClick={() => void ejecutar(() => repo.marcarApoyado(e.id))}>
              <Icono nombre="check" /> Listo
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
      className={`${claseTarjeta} transition-shadow ${encima ? 'ring-3 ring-menta ring-offset-2' : puedeRecibir ? 'ring-2 ring-menta/50' : ''} ${className}`}
    >
      {puedeRecibir && (
        <button
          type="button"
          onClick={() => mover(elegido.id, destino)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-menta bg-menta-fondo px-3 py-2 text-sm font-bold text-menta-oscuro hover:bg-[#d3f0e2]"
        >
          <Avatar estudiante={elegido} className="size-7 text-base" />
          Mover aquí a {elegido.nombre}
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
        className={`grid size-7 shrink-0 cursor-grab place-items-center rounded-lg active:cursor-grabbing ${activo ? 'bg-menta text-white' : 'text-tinta-suave hover:bg-white'}`}
      >
        <Icono nombre="arrastrar" className="size-5 [stroke-width:3.2]" />
      </button>
    ),
  }
}

// Mientras el servidor no confirma el movimiento.
function Conectando({ destino }: { destino: string }) {
  return (
    <span role="status" className="flex items-center gap-1.5 text-xs font-semibold text-menta-oscuro">
      <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-menta border-t-transparent" />
      {destino === ESPERA ? 'Sacándolo de la sala…' : 'Conectándolo…'}
    </span>
  )
}

// Los que no están en ninguna sala, en una franja que queda a la vista al bajar
// por las salas: así siempre hay dónde soltar. Primero los que ya esperan.
function SinSala({ ninos, datos }: { ninos: Estudiante[]; datos: Datos }) {
  const ordenados = [...ninos].sort((a, b) => Number(enLinea(datos.conectados.get(b.id))) - Number(enLinea(datos.conectados.get(a.id))))
  return (
    <ZonaSoltar destino={ESPERA} nombre="Sin sala" className="sticky top-2 z-20 mb-5 grid gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="shrink-0 font-bold text-tinta">
          Sin sala <span className="text-tinta-suave">({ninos.length})</span>
        </h2>
        {ninos.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todos están en una sala. Arrastra aquí para sacar a alguien.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {ordenados.map((e) => (
              <FichaSinSala key={e.id} e={e} online={enLinea(datos.conectados.get(e.id))} />
            ))}
          </ul>
        )}
      </div>
    </ZonaSoltar>
  )
}

function FichaSinSala({ e, online }: { e: Estudiante; online: boolean }) {
  const { activo, fila, asa } = useArrastrable(e)
  const { pendiente } = useMover()
  const destino = pendiente(e.id)
  return (
    <li
      {...fila}
      className={`flex items-center gap-1.5 rounded-xl py-1 pr-3 pl-1 ${activo ? 'bg-menta-fondo ring-2 ring-menta' : 'bg-fondo'} ${online || destino !== undefined ? '' : 'opacity-60'}`}
    >
      {asa}
      <EnLinea e={e} online={online} className="size-8 text-lg" />
      <span className="leading-tight">
        <span className="block font-semibold text-tinta">{e.nombre}</span>
        {destino !== undefined ? <Conectando destino={destino} /> : <span className="block text-xs text-tinta-suave">{online ? 'Esperando' : 'Sin conectar'}</span>}
      </span>
    </li>
  )
}

function EnLinea({ e, online, className = 'size-9 text-xl' }: { e: Estudiante; online: boolean; className?: string }) {
  return (
    <span className="relative shrink-0" title={online ? 'Con dispositivo' : 'Sin dispositivo'}>
      <Avatar estudiante={e} className={className} />
      <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white ${online ? 'bg-menta' : 'bg-borde'}`} />
    </span>
  )
}

// Al final de la grilla, como una sala más por crear.
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
    <form onSubmit={(e) => void enviar(e)} className="grid gap-3 rounded-3xl border-2 border-dashed border-borde p-5">
      <h2 className="font-bold text-tinta">Nueva sala</h2>
      <label className="grid gap-1 text-sm font-semibold text-tinta">
        <span className="sr-only">Nombre de la sala</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Nombre, ej.: Grupo Sílabas" className={claseEntrada} />
      </label>
      <fieldset className="grid grid-cols-3 gap-2 text-sm font-semibold text-tinta">
        <legend className="sr-only">Tipo</legend>
        {(Object.keys(TIPOS) as TipoSala[]).map((valor) => (
          <label
            key={valor}
            title={TIPOS[valor].ayuda}
            className={`grid cursor-pointer justify-items-center gap-0.5 rounded-xl border px-2 py-2 text-center leading-tight ${tipo === valor ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}
          >
            <span aria-hidden="true" className="text-lg">{TIPOS[valor].icono}</span>
            <input type="radio" name="tipo-sala" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="sr-only" />
            {TIPOS[valor].nombre}
          </label>
        ))}
      </fieldset>
      <Boton type="submit" disabled={!nombre.trim()}>
        <Icono nombre="mas" /> Crear sala
      </Boton>
    </form>
  )
}

function EncabezadoSala({ sala, n, ejecutar, accion }: { sala: Sala; n: number; ejecutar: Ejecutar; accion?: ReactNode }) {
  const [confirmar, setConfirmar] = useState(false)
  if (confirmar)
    return (
      <div className="grid gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-tinta">
        ¿Eliminar «{sala.nombre}»? Los niños vuelven a la espera.
        <span className="flex gap-2">
          <Boton variante="secundario" onClick={() => void ejecutar(() => repo.eliminarSala(sala.id))}>
            Sí, eliminar
          </Boton>
          <Boton variante="suave" onClick={() => setConfirmar(false)}>
            Cancelar
          </Boton>
        </span>
      </div>
    )
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold text-tinta" title={sala.nombre}>
          {sala.nombre}
        </h2>
        <p className={`text-xs font-bold ${TIPOS[sala.tipo].color}`}>
          <span aria-hidden="true">{TIPOS[sala.tipo].icono}</span> {TIPOS[sala.tipo].nombre} · {n} {n === 1 ? 'niño' : 'niños'}
        </p>
      </div>
      {accion}
      <button
        type="button"
        aria-label={`Eliminar ${sala.nombre}`}
        title="Eliminar sala"
        onClick={() => setConfirmar(true)}
        className="grid size-9 shrink-0 place-items-center rounded-xl text-tinta-suave hover:bg-red-50 hover:text-[#b42318]"
      >
        ✕
      </button>
    </div>
  )
}

function TarjetaSala({ sala, dentro, datos, ejecutar }: { sala: Sala; dentro: Estudiante[]; datos: Datos; ejecutar: Ejecutar }) {
  const { pendiente, mover } = useMover()
  const [editando, setEditando] = useState(false)
  const plan = planDe(sala.contenidos)
  const pasoDe = (id: string) => avanceEn(sala, datos.progresoDe.get(id))?.paso ?? 0
  const terminaron = dentro.filter((e) => plan.length > 0 && pasoDe(e.id) >= plan.length)
  const conAvance = dentro.filter((e) => pasoDe(e.id) > 0).length
  const playground = datos.salas.find((s) => s.tipo === 'playground')

  return (
    <ZonaSoltar destino={sala.id} nombre={sala.nombre} className="grid gap-4 p-4">
      <EncabezadoSala
        sala={sala}
        n={dentro.length}
        ejecutar={ejecutar}
        accion={
          <Boton variante="suave" className="shrink-0" onClick={() => setEditando(true)}>
            <Icono nombre="lapiz" /> Plan
          </Boton>
        }
      />
      <ResumenPlan sala={sala} alEditar={() => setEditando(true)} />
      {editando && <EditorPlan sala={sala} conAvance={conAvance} ejecutar={ejecutar} alCerrar={() => setEditando(false)} />}

      {dentro.length > 0 && terminaron.length === dentro.length && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-menta-fondo px-3 py-2 text-sm font-semibold text-menta-oscuro">
          <span aria-hidden="true">🎉</span>
          <span className="min-w-0 flex-1">Todos terminaron.</span>
          {playground && (
            <button type="button" className="underline" onClick={() => terminaron.forEach((e) => mover(e.id, playground.id))}>
              Llevar a «{playground.nombre}»
            </button>
          )}
        </div>
      )}

      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia="Arrastra aquí a los niños.">
        {(e) => {
          const destino = pendiente(e.id)
          return destino !== undefined ? <Conectando destino={destino} /> : <EstadoAvance sala={sala} p={avanceEn(sala, datos.progresoDe.get(e.id))} />
        }}
      </ListaNinos>
    </ZonaSoltar>
  )
}

// El plan de un vistazo: los contenidos como íconos en fila y los juegos al final.
function ResumenPlan({ sala, alEditar }: { sala: Sala; alEditar: () => void }) {
  const juegos = JUEGOS.filter((j) => sala.juegos.includes(j.id))
  if (sala.contenidos.length === 0)
    return (
      <button type="button" onClick={alEditar} className="rounded-xl border-2 border-dashed border-borde px-3 py-2.5 text-sm font-semibold text-tinta-suave hover:border-menta hover:text-menta-oscuro">
        Sin contenidos · elegir plan
      </button>
    )
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Plan de la sala">
      {sala.contenidos.map((id, i) => {
        const c = contenido(id)
        return (
          <li key={`${id}-${i}`} title={c?.titulo ?? id} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-tinta-suave/50">›</span>}
            {c ? <IconoContenido c={c} className="size-9 text-lg" /> : <span className="text-sm">{id}</span>}
            <span className="sr-only">{c?.titulo ?? id}</span>
          </li>
        )
      })}
      {juegos.length > 0 && (
        <li className="ml-1 flex items-center gap-1 rounded-full bg-[#fff3c4] px-2 py-1" title={`Juegos: ${juegos.map((j) => j.titulo).join(', ')}`}>
          <span aria-hidden="true" className="text-tinta-suave/60">🏁</span>
          {juegos.map((j) => (
            <span key={j.id} aria-hidden="true">
              {j.icono}
            </span>
          ))}
          <span className="sr-only">Juegos: {juegos.map((j) => j.titulo).join(', ')}</span>
        </li>
      )}
    </ol>
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
  const { mover } = useMover()
  if (dentro.length === 0) return <p className="rounded-2xl border-2 border-dashed border-borde px-4 py-6 text-center text-sm text-tinta-suave">{vacia}</p>
  return (
    <div className="grid gap-2">
      <ul className="grid gap-1.5">
        {dentro.map((e) => (
          <FilaNino key={e.id} e={e} datos={datos} ejecutar={ejecutar}>
            {children(e)}
          </FilaNino>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => dentro.forEach((e) => mover(e.id, ESPERA))}
        className="justify-self-end text-xs font-semibold text-tinta-suave underline hover:text-tinta"
        aria-label={`Sacar a todos de ${sala.nombre}`}
      >
        Sacar a todos
      </button>
    </div>
  )
}

function EstadoAvance({ sala, p }: { sala: Sala; p: ProgresoSala | undefined }) {
  const plan = planDe(sala.contenidos)
  const paso = p?.paso ?? 0
  if (plan.length === 0) return <span className="text-xs text-tinta-suave">Sin contenidos</span>
  if (paso >= plan.length) return <span className="text-xs font-semibold text-menta-oscuro">✓ Terminó · en los juegos</span>
  const actual = plan[paso]
  return (
    <span className="flex items-center gap-1.5 text-xs text-tinta-suave" title={`${actual.contenido.titulo}, actividad ${actual.numero}`}>
      <span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <span className="block h-full rounded-full bg-menta" style={{ width: `${(paso / plan.length) * 100}%` }} />
      </span>
      {paso}/{plan.length} · <span aria-hidden="true">{actual.contenido.icono}</span> act. {actual.numero}
      {p && p.repeticiones > 0 && <b className={p.necesitaAyuda ? 'text-[#9a4d00]' : ''}>· intento {p.repeticiones + 1}</b>}
    </span>
  )
}

function FilaNino({ e, datos, ejecutar, children }: { e: Estudiante; datos: Datos; ejecutar: Ejecutar; children: ReactNode }) {
  const { activo, fila, asa } = useArrastrable(e)
  const { pendiente } = useMover()
  const partidas = datos.resultadosHoy.filter((r) => r.estudianteId === e.id)
  const emocion = datos.emocionDe.get(e.id)
  const conectado = datos.conectados.get(e.id)
  const online = enLinea(conectado)
  const hoy =
    partidas.length === 0
      ? 'Aún no juega hoy'
      : `Hoy: ${partidas.length} ${partidas.length === 1 ? 'partida' : 'partidas'} · ${minutos(partidas.reduce((n, r) => n + r.duracionMs, 0))} min`
  return (
    <li
      {...fila}
      title={hoy}
      className={`flex items-center gap-2 rounded-xl py-1.5 pr-2 pl-1 ${activo ? 'bg-menta-fondo ring-2 ring-menta' : 'bg-fondo'} ${pendiente(e.id) !== undefined ? 'animate-pulse' : ''}`}
    >
      {asa}
      <EnLinea e={e} online={online} className="size-9 text-xl" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate font-semibold text-tinta">{e.nombre}</span>
        {children}
      </span>
      {emocion && (
        <span title={`Se siente: ${EMOCIONES[emocion].texto}`} className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: EMOCIONES[emocion].color }}>
          <span aria-hidden="true">{EMOCIONES[emocion].cara}</span>
          <span className="sr-only">Se siente {EMOCIONES[emocion].texto}</span>
        </span>
      )}
      {conectado && (
        <button
          type="button"
          aria-label={`Cerrar el dispositivo de ${e.nombre}`}
          title="Cerrar dispositivo: el niño vuelve a elegir su perfil"
          onClick={() => void ejecutar(() => repo.cerrarDispositivo(e.id))}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-tinta-suave hover:bg-white hover:text-tinta"
        >
          <Icono nombre="salir" className="size-4" />
        </button>
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

// Plan de la sala, en una ventana aparte para que la tarjeta no crezca: contenidos
// en orden (cada uno trae sus 3 actividades) y los juegos a los que llegan al
// terminar. Guardar un plan nuevo reinicia el avance.
function EditorPlan({ sala, conAvance, ejecutar, alCerrar }: { sala: Sala; conAvance: number; ejecutar: Ejecutar; alCerrar: () => void }) {
  const [contenidos, setContenidos] = useState(sala.contenidos)
  const [juegos, setJuegos] = useState(sala.juegos)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  const mover = (i: number, d: -1 | 1) =>
    setContenidos((c) => {
      const r = [...c]
      ;[r[i], r[i + d]] = [r[i + d], r[i]]
      return r
    })
  const guardar = async () => {
    await ejecutar(() => repo.asignarPlan(sala.id, contenidos, juegos))
    alCerrar()
  }

  const disponibles = CONTENIDOS.filter((c) => !contenidos.includes(c.id))

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/40 p-4" onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby={`plan-${sala.id}`} className="grid max-h-[90dvh] w-full max-w-2xl gap-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={`plan-${sala.id}`} className="text-xl font-bold text-tinta">
              Plan de «{sala.nombre}»
            </h2>
            <p className="text-sm text-tinta-suave">Contenidos en orden; cada uno trae 3 actividades.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={alCerrar} className="grid size-9 place-items-center rounded-xl text-tinta-suave hover:bg-fondo">
            ✕
          </button>
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
            <h3 className="mb-2 text-xs font-bold text-tinta-suave">Toca para agregar</h3>
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
          <Boton variante="suave" onClick={alCerrar}>
            Cancelar
          </Boton>
        </div>
      </div>
    </div>
  )
}

function TarjetaPlayground({ sala, dentro, datos, ejecutar }: { sala: Sala; dentro: Estudiante[]; datos: Datos; ejecutar: Ejecutar }) {
  const { pendiente } = useMover()
  const { datos: mensajes, recargar } = useConsulta(() => repo.mensajesSala(sala.id), [sala.id])
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })

  return (
    <ZonaSoltar destino={sala.id} nombre={sala.nombre} className="grid gap-4 p-4">
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      {mensajes?.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Últimos mensajes">
          {mensajes.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-center gap-1 rounded-full bg-fondo py-0.5 pr-2 pl-0.5 text-sm" title={`${m.nombre} · ${new Date(m.enviadoEn).toLocaleTimeString('es-CL')}`}>
              <Avatar estudiante={m} className="size-6 text-sm" />
              <span aria-label={pictoMensaje(m.picto)?.voz}>{pictoMensaje(m.picto)?.emoji}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-tinta-suave">Espacio común con pictogramas. Aún no hay mensajes.</p>
      )}
      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia="Arrastra aquí a quienes terminaron.">
        {(e) => {
          const destino = pendiente(e.id)
          return destino !== undefined ? <Conectando destino={destino} /> : <span className="text-xs text-tinta-suave">En el playground</span>
        }}
      </ListaNinos>
    </ZonaSoltar>
  )
}

function TarjetaDibujo({ sala, dentro, datos, ejecutar }: { sala: Sala; dentro: Estudiante[]; datos: Datos; ejecutar: Ejecutar }) {
  const { pendiente } = useMover()
  return (
    <ZonaSoltar destino={sala.id} nombre={sala.nombre} className="grid gap-4 p-4">
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      <p className="text-sm text-tinta-suave">Dibujo libre con colores, sellos y letras para repasar con el dedo.</p>
      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia="Arrastra aquí a quienes van a dibujar.">
        {(e) => {
          const destino = pendiente(e.id)
          return destino !== undefined ? <Conectando destino={destino} /> : <span className="text-xs text-tinta-suave">Dibujando</span>
        }}
      </ListaNinos>
    </ZonaSoltar>
  )
}

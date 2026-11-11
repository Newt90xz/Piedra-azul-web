import { createContext, use, useEffect, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { useSesion } from '../../app/Sesion.tsx'
import { JUEGOS } from '../../contenido/actividades.ts'
import { AREAS, CONTENIDOS, bloqueContenido, bloquesDePlan, contenido, planDeBloques, planDeSala, type Area, type BloquePlan, type Contenido } from '../../contenido/contenidos.ts'
import { JUEGOS_CONFIGURABLES, juegoConfigurable } from '../../contenido/plantillas.ts'
import { EXIGENCIAS } from '../../contenido/exigencia.ts'
import { pictoMensaje } from '../../contenido/mensajes.ts'
import { repo } from '../../datos/index.ts'
import type { ActividadRecreo, Conectado, Emocion, Estudiante, Exigencia, MiembroSala, ProgresoSala, ResultadoActividad, Sala, TipoSala } from '../../dominio/tipos.ts'
import { EMOCIONES, inicioDia, minutos } from '../../lib/avance.ts'
import { avanceEn, enLinea } from '../../lib/clase.ts'
import { capitalizar } from '../../lib/texto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { IconoParque } from '../../ui/Dibujos.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { AvisoError, Boton, Encabezado, claseEntrada, claseTarjeta, useDialogo } from '../../ui/aula.tsx'
import { ConfigurarActividad } from './ConfigurarActividad.tsx'

const REFRESCO_MS = 5000
const TIPOS: Record<TipoSala, { nombre: string; icono: string; color: string }> = {
  trabajo: { nombre: 'Actividades', icono: '📚', color: 'text-menta-oscuro' },
  recreo: { nombre: 'Recreo', icono: '🌳', color: 'text-[#7a5b00]' },
}
const ACTIVIDADES_RECREO: Record<ActividadRecreo, { nombre: string; icono: ReactNode; ayuda: string; estado: string }> = {
  parque: {
    nombre: 'Parque',
    icono: <IconoParque className="size-[1.25em]" />,
    ayuda: 'Caminan con su personaje, se ven en vivo y se saludan.',
    estado: 'En el parque',
  },
  dibujo: {
    nombre: 'Dibujo',
    icono: '🎨',
    ayuda: 'Dibujo libre, sellos y letras para repasar.',
    estado: 'Dibujando',
  },
  globos: {
    nombre: 'Globos',
    icono: '🎈',
    ayuda: 'Revientan globos y pueden ir a la tienda.',
    estado: 'Con los globos',
  },
  juegos: {
    nombre: 'Juegos',
    icono: '🎲',
    ayuda: 'Los juegos que elijas, las veces que quieran.',
    estado: 'Jugando',
  },
}
// Destino «Sin sala»: soltar ahí saca al niño de su sala (en su tablet ve la espera con globos).
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

// Salas de una ruta en orden: cada una seguida de la sala a la que pasan al terminar.
// Un recreo al que llegan varias rutas se muestra entero solo en la primera.
function armarRutas(salas: Sala[]) {
  const porId = new Map(salas.map((s) => [s.id, s]))
  const destinos = new Set(salas.map((s) => s.siguienteSala))
  const vistas = new Set<string>()
  const rutas: { salas: Sala[]; compartida?: Sala }[] = []
  const inicios = [...salas.filter((s) => s.tipo === 'trabajo' && !destinos.has(s.id)), ...salas.filter((s) => s.tipo === 'trabajo')]
  for (const inicio of inicios) {
    if (vistas.has(inicio.id)) continue
    const ruta: Sala[] = []
    let actual: Sala | undefined = inicio
    while (actual && !vistas.has(actual.id)) {
      vistas.add(actual.id)
      ruta.push(actual)
      actual = actual.siguienteSala ? porId.get(actual.siguienteSala) : undefined
    }
    rutas.push({ salas: ruta, compartida: actual })
  }
  return { rutas, sueltas: salas.filter((s) => !vistas.has(s.id)) }
}

// ¿Conectar `origen` con `destino` cerraría un círculo?
function hariaCirculo(salas: Sala[], origen: string, destino: string) {
  for (let id: string | undefined = destino, n = 0; id && n <= salas.length; n++) {
    if (id === origen) return true
    id = salas.find((s) => s.id === id)?.siguienteSala
  }
  return false
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
  // Sala a la que se le está creando un recreo: se ve su esqueleto hasta que llega.
  const [creandoRecreo, setCreandoRecreo] = useState<string | null>(null)
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
  const { rutas, sueltas } = armarRutas(datos?.salas ?? [])
  const anuncio = useAnuncioCambios(datos)

  // Ya llegó el recreo conectado: el esqueleto deja su lugar a la tarjeta real.
  if (creandoRecreo && datos?.salas.find((s) => s.id === creandoRecreo)?.siguienteSala) setCreandoRecreo(null)

  const crearRecreo = async (sala: Sala) => {
    setCreandoRecreo(sala.id)
    let listo = false
    await ejecutar(async () => {
      const nombres = new Set(datos?.salas.map((s) => s.nombre))
      // Un recreo nuevo empieza con el parque (caminar con su personaje): se llama así.
      let nombre = 'Parque'
      for (let n = 2; nombres.has(nombre); n++) nombre = `Parque ${n}`
      const recreo = await repo.crearSala(sala.cursoId, nombre, 'recreo')
      await repo.conectarSalas(sala.id, recreo.id)
      listo = true
    })
    if (!listo) setCreandoRecreo(null)
  }

  const tarjeta = (s: Sala) =>
    datos &&
    (s.tipo === 'recreo' ? (
      <TarjetaRecreo key={s.id} sala={s} dentro={enDestino(s.id)} datos={datos} ejecutar={ejecutar} />
    ) : (
      <TarjetaSala key={s.id} sala={s} dentro={enDestino(s.id)} datos={datos} ejecutar={ejecutar} creandoRecreo={creandoRecreo === s.id} alCrearRecreo={() => void crearRecreo(s)} />
    ))

  return (
    <MoverContexto value={{ elegido, elegir: setElegido, salaDe, pendiente, mover }}>
      <Encabezado
        antetitulo="Trabajo en aula"
        titulo="Salas"
        descripcion="Cada fila es una ruta: al terminar sus actividades, el niño pasa solo a la sala siguiente. Para mover a un niño, arrástralo o toca su manilla ⠿ y luego la sala."
        accion={
          datos && (
            <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
              <span className={`size-2.5 rounded-full ${enEspera.length + enSalas ? 'bg-menta' : 'bg-borde'}`} aria-hidden="true" />
              {[...datos.conectados.values()].filter(enLinea).length} con dispositivo · {enSalas} en salas · {sinSala.length} sin sala
            </p>
          )
        }
      />
      {accionError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {accionError.includes('duplicate') ? 'Ya existe una sala con ese nombre.' : accionError}
        </p>
      )}
      {/* Lo que cambió con el último refresco, para lectores de pantalla. */}
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
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
          <div className="grid gap-6">
            {rutas.map((r) => (
              <section key={r.salas[0].id} aria-label={`Ruta de ${r.salas[0].nombre}`} className="flex flex-wrap items-stretch gap-x-2 gap-y-4">
                {r.salas.map((s, i) => (
                  <div key={s.id} className="flex items-stretch gap-2">
                    {i > 0 && <Flecha />}
                    {tarjeta(s)}
                  </div>
                ))}
                {creandoRecreo === r.salas.at(-1)?.id && (
                  <div className="flex items-stretch gap-2">
                    <Flecha />
                    <EsqueletoRecreo />
                  </div>
                )}
                {r.compartida && (
                  <div className="flex items-center gap-2">
                    <Flecha />
                    <p className="rounded-2xl border-2 border-dashed border-borde px-4 py-3 text-sm font-semibold text-tinta">
                      <span aria-hidden="true">{TIPOS[r.compartida.tipo].icono}</span> {r.compartida.nombre}
                      <span className="block text-xs font-normal text-tinta-suave">Compartida con otra ruta</span>
                    </p>
                  </div>
                )}
              </section>
            ))}
            {sueltas.length > 0 && (
              <section aria-labelledby="titulo-sueltas" className="grid gap-3">
                <h2 id="titulo-sueltas" className="text-sm font-bold text-tinta-suave">Recreos sin conectar</h2>
                <div className="flex flex-wrap items-stretch gap-4">{sueltas.map(tarjeta)}</div>
              </section>
            )}
            <CrearSala cursoId={cursoId} alCrear={(nombre, tipo) => ejecutar(() => repo.crearSala(cursoId, nombre, tipo))} />
          </div>
        </>
      )}
    </MoverContexto>
  )
}

// Los niños entran, avanzan y salen solos y la vista se refresca sin aviso:
// esto dice en una frase quién cambió de sala o necesita apoyo desde el último
// refresco, para quien usa lector de pantalla.
function useAnuncioCambios(datos: Datos | undefined) {
  const [anuncio, setAnuncio] = useState('')
  // Los datos ya comparados: al llegar otros se compara durante el render, sin efecto.
  const [vistos, setVistos] = useState(datos)
  if (datos !== vistos) {
    setVistos(datos)
    const frase = datos && vistos ? cambiosEntre(vistos, datos) : ''
    if (frase) setAnuncio(frase)
  }
  return anuncio
}

function cambiosEntre(antes: Datos, datos: Datos) {
  const salaEn = (d: Datos, id: string) => d.miembros.find((m) => m.estudianteId === id)?.salaId ?? ESPERA
  const ayuda = (d: Datos, id: string) => Boolean(d.progresoDe.get(id)?.necesitaAyuda)
  const frases: string[] = []
  for (const e of datos.estudiantes) {
    const [desde, hacia] = [salaEn(antes, e.id), salaEn(datos, e.id)]
    if (desde !== hacia) frases.push(hacia === ESPERA ? `${e.nombre} quedó sin sala` : `${e.nombre} pasó a ${datos.salas.find((s) => s.id === hacia)?.nombre ?? 'otra sala'}`)
    if (ayuda(datos, e.id) && !ayuda(antes, e.id)) frases.push(`${e.nombre} necesita apoyo`)
  }
  if (frases.length === 0) return ''
  return frases.length > 4 ? `${frases.slice(0, 3).join('. ')}. Y ${frases.length - 3} cambios más.` : `${frases.join('. ')}.`
}

// La tarjeta del recreo mientras se crea: mismo tamaño, para que nada salte al llegar.
function EsqueletoRecreo() {
  return (
    <div role="status" aria-label="Creando el recreo" className={`${claseTarjeta} grid w-80 animate-pulse content-start gap-4 p-4`}>
      <div className="grid gap-2">
        <span className="h-5 w-32 rounded-lg bg-borde" />
        <span className="h-3 w-24 rounded-lg bg-borde/70" />
      </div>
      <div className="grid gap-2">
        <span className="h-3 w-44 rounded-lg bg-borde/70" />
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-14 rounded-xl bg-fondo" />
          ))}
        </div>
      </div>
      <span className="h-20 rounded-2xl bg-fondo" />
    </div>
  )
}

function Flecha() {
  return (
    <span aria-hidden="true" className="grid w-7 shrink-0 place-items-center text-2xl font-bold text-menta-oscuro">
      →
    </span>
  )
}

// Niños que repitieron 2 veces la misma actividad sin lograr el 60 %.
function Avisos({ datos, ejecutar }: { datos: Datos; ejecutar: Ejecutar }) {
  const avisos = datos.miembros.flatMap((m) => {
    const sala = datos.salas.find((s) => s.id === m.salaId)
    const p = sala && avanceEn(sala, datos.progresoDe.get(m.estudianteId))
    const e = datos.estudiantes.find((x) => x.id === m.estudianteId)
    if (!sala || !p?.necesitaAyuda || !e) return []
    return [{ sala, p, e, paso: planDeSala(sala.plan)[p.paso] }]
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
                {paso ? `${paso.contenido.titulo} · ${paso.contenido.pasos[paso.numero - 1]?.titulo ?? `act. ${paso.numero}`}` : 'Actividad actual'} ·{' '}
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
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-menta bg-menta-fondo px-3 py-2 text-sm font-bold text-menta-oscuro hover:bg-[#d3f0e2]"
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
        className={`grid size-11 shrink-0 cursor-grab place-items-center rounded-lg active:cursor-grabbing ${activo ? 'bg-menta text-white' : 'text-tinta-suave hover:bg-white'}`}
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

// «Sin sala»: los que no están en ninguna sala, en una franja que queda a la
// vista al bajar por las salas: así siempre hay dónde soltar. No confundir con
// las salas de recreo (Parque, Dibujo…). Primero los que tienen dispositivo.
function SinSala({ ninos, datos }: { ninos: Estudiante[]; datos: Datos }) {
  const ordenados = [...ninos].sort((a, b) => Number(enLinea(datos.conectados.get(b.id))) - Number(enLinea(datos.conectados.get(a.id))))
  return (
    <ZonaSoltar destino={ESPERA} nombre="Sin sala" className="sticky top-2 z-20 mb-5 grid gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="shrink-0 font-bold text-tinta">
          <span aria-hidden="true">⏳</span> Sin sala <span className="text-tinta-suave">({ninos.length})</span>
        </h2>
        {ninos.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todos están en una sala. Arrastra aquí a quien quieras sacar.</p>
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
        {destino !== undefined ? <Conectando destino={destino} /> : <span className="block text-xs text-tinta-suave">{online ? 'Esperando sala' : 'Sin dispositivo'}</span>}
      </span>
    </li>
  )
}

function EnLinea({ e, online, className = 'size-9 text-xl' }: { e: Estudiante; online: boolean; className?: string }) {
  return (
    <span className="relative shrink-0" title={online ? 'Con dispositivo' : 'Sin dispositivo'}>
      <Avatar estudiante={e} className={className} />
      <span aria-hidden="true" className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white ${online ? 'bg-menta' : 'bg-borde'}`} />
      <span className="sr-only">{online ? 'Con dispositivo' : 'Sin dispositivo'}</span>
    </span>
  )
}

// Bajo las rutas: una sala de actividades empieza una ruta nueva.
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
    <form onSubmit={(e) => void enviar(e)} className="flex flex-wrap items-center gap-3 rounded-3xl border-2 border-dashed border-borde p-4">
      <h2 className="font-bold text-tinta">Nueva sala</h2>
      <label className="min-w-56 flex-1 text-sm font-semibold text-tinta">
        <span className="sr-only">Nombre de la sala</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Nombre, ej.: Grupo Sílabas" className={claseEntrada} />
      </label>
      <fieldset className="flex gap-2 text-sm font-semibold text-tinta">
        <legend className="sr-only">Tipo</legend>
        {(Object.keys(TIPOS) as TipoSala[]).map((valor) => (
          <label
            key={valor}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 ${tipo === valor ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}
          >
            <span aria-hidden="true">{TIPOS[valor].icono}</span>
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
        ¿Eliminar «{sala.nombre}»? Los niños quedan sin sala.
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
        className="grid size-11 shrink-0 place-items-center rounded-xl text-tinta-suave hover:bg-red-50 hover:text-[#b42318]"
      >
        ✕
      </button>
    </div>
  )
}

function TarjetaSala({
  sala,
  dentro,
  datos,
  ejecutar,
  creandoRecreo,
  alCrearRecreo,
}: {
  sala: Sala
  dentro: Estudiante[]
  datos: Datos
  ejecutar: Ejecutar
  creandoRecreo: boolean
  alCrearRecreo: () => void
}) {
  const { pendiente } = useMover()
  const [editando, setEditando] = useState(false)
  const pasoDe = (id: string) => avanceEn(sala, datos.progresoDe.get(id))?.paso ?? 0
  const conAvance = dentro.filter((e) => pasoDe(e.id) > 0).length

  return (
    <ZonaSoltar destino={sala.id} nombre={sala.nombre} className="grid w-80 content-start gap-4 p-4">
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
      <ResumenPlan sala={sala} pasos={dentro.map((e) => pasoDe(e.id))} alEditar={() => setEditando(true)} />
      {editando && <EditorPlan sala={sala} conAvance={conAvance} ejecutar={ejecutar} alCerrar={() => setEditando(false)} />}

      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia="Arrastra aquí a los niños.">
        {(e) => {
          const destino = pendiente(e.id)
          return destino !== undefined ? <Conectando destino={destino} /> : <EstadoAvance sala={sala} p={avanceEn(sala, datos.progresoDe.get(e.id))} />
        }}
      </ListaNinos>
      <AlTerminar sala={sala} datos={datos} ejecutar={ejecutar} creandoRecreo={creandoRecreo} alCrearRecreo={alCrearRecreo} />
    </ZonaSoltar>
  )
}

// A dónde pasan los niños al terminar el plan. Lo más común, un recreo, se crea
// y conecta de una vez.
function AlTerminar({ sala, datos, ejecutar, creandoRecreo, alCrearRecreo }: { sala: Sala; datos: Datos; ejecutar: Ejecutar; creandoRecreo: boolean; alCrearRecreo: () => void }) {
  const opciones = datos.salas.filter((s) => !hariaCirculo(datos.salas, sala.id, s.id))
  return (
    <div className="mt-auto grid gap-1.5 border-t border-borde pt-3">
      <label className="grid gap-1 text-xs font-bold text-tinta-suave">
        Al terminar pasan a
        <select
          value={sala.siguienteSala ?? ''}
          disabled={creandoRecreo}
          onChange={(e) => void ejecutar(() => repo.conectarSalas(sala.id, e.target.value || null))}
          className={claseEntrada}
        >
          <option value="">Nadie: esperan a la docente</option>
          {opciones.map((s) => (
            <option key={s.id} value={s.id}>
              {TIPOS[s.tipo].icono} {s.nombre}
            </option>
          ))}
        </select>
      </label>
      {!sala.siguienteSala && (
        <Boton
          variante="suave"
          disabled={creandoRecreo}
          aria-busy={creandoRecreo}
          onClick={alCrearRecreo}
          className="cursor-pointer active:scale-[0.98] disabled:cursor-wait"
        >
          {creandoRecreo ? (
            <>
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-menta border-t-transparent" />
              Creando el recreo…
            </>
          ) : (
            <>
              <Icono nombre="mas" /> Crear un recreo y conectarlo
            </>
          )}
        </Boton>
      )}
    </div>
  )
}

// El plan de un vistazo: los contenidos como íconos en fila.
// Cómo se muestra un bloque del plan: un contenido o una actividad configurada.
function datosBloque(b: BloquePlan) {
  if ('contenido' in b) {
    const c = contenido(b.contenido)
    const titulos = b.pasos.map((n) => c?.pasos[n - 1]?.titulo ?? `Actividad ${n}`)
    return {
      titulo: c?.titulo ?? b.contenido,
      detalle: titulos.map((t, k) => `${k + 1}. ${t}`).join('\n'),
      icono: c?.icono ?? '❔',
      color: c?.color ?? 'var(--color-fondo)',
      resumen: undefined as string | undefined,
    }
  }
  const j = juegoConfigurable(b.paso.juego)
  const resumen = j?.resumen(b.paso.parametros ?? j.porDefecto) ?? ''
  return {
    titulo: b.paso.titulo ?? j?.titulo ?? b.paso.juego,
    detalle: resumen,
    icono: j?.icono ?? '❔',
    color: j?.color ?? 'var(--color-fondo)',
    resumen,
  }
}

// El plan de la sala en palabras: cada contenido o actividad con su nombre, lo
// que trae y cuántos niños de la sala van en él ahora.
function ResumenPlan({ sala, pasos, alEditar }: { sala: Sala; pasos: number[]; alEditar: () => void }) {
  if (sala.plan.length === 0)
    return (
      <button
        type="button"
        onClick={alEditar}
        className="min-h-11 rounded-xl border-2 border-dashed border-borde px-3 py-2.5 text-sm font-semibold text-tinta-suave hover:border-menta hover:text-menta-oscuro"
      >
        Sin contenidos · elegir plan
      </button>
    )
  // Qué pasos del plan (desde, hasta) corresponden a cada bloque.
  const largos = bloquesDePlan(sala.plan).map((b) => ({
    b,
    largo: planDeSala(planDeBloques([b])).length,
  }))
  const bloques = largos.map(({ b, largo }, i) => {
    const desde = largos.slice(0, i).reduce((n, x) => n + x.largo, 0)
    return { b, desde, hasta: desde + largo }
  })
  return (
    <ol className="grid gap-1" aria-label="Plan de la sala">
      {bloques.map(({ b, desde, hasta }, i) => {
        const { titulo, icono, color, resumen } = datosBloque(b)
        const actividades = 'contenido' in b ? b.pasos.length : 1
        const aqui = pasos.filter((p) => p >= desde && p < hasta).length
        return (
          <li key={i} className="flex items-center gap-2 rounded-xl bg-fondo px-2 py-1.5">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full text-base" style={{ background: color }}>
              {icono}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold text-tinta">{titulo}</span>
              <span className="block truncate text-xs text-tinta-suave">
                {resumen || `${actividades} ${actividades === 1 ? 'actividad' : 'actividades'}`}
                {exigenciaDe(b) && ` · ${EXIGENCIAS[exigenciaDe(b)!].nombre}`}
              </span>
            </span>
            {aqui > 0 && (
              <span className="shrink-0 rounded-full bg-menta-fondo px-2 py-0.5 text-xs font-bold text-menta-oscuro">
                {aqui} {aqui === 1 ? 'niño' : 'niños'}
              </span>
            )}
          </li>
        )
      })}
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
  const [confirmar, setConfirmar] = useState(false)
  if (dentro.length === 0) return <p className="rounded-2xl border-2 border-dashed border-borde px-4 py-6 text-center text-sm text-tinta-suave">{vacia}</p>
  return (
    <div className="grid gap-2">
      <ul className="grid max-h-96 gap-1.5 overflow-y-auto">
        {dentro.map((e) => (
          <FilaNino key={e.id} e={e} datos={datos} ejecutar={ejecutar}>
            {children(e)}
          </FilaNino>
        ))}
      </ul>
      {/* Mueve a todo el grupo: se confirma antes. */}
      {confirmar ? (
        <div role="group" aria-label="Confirmar" className="grid gap-2 rounded-xl bg-[#fdf1e4] p-3 text-sm font-semibold text-tinta">
          ¿Sacar a {dentro.length === 1 ? 'el niño' : `los ${dentro.length} niños`} de «{sala.nombre}»? Quedan sin sala.
          <span className="flex flex-wrap gap-2">
            <Boton
              variante="secundario"
              className="min-h-11"
              onClick={() => {
                dentro.forEach((e) => mover(e.id, ESPERA))
                setConfirmar(false)
              }}
            >
              Sí, sacarlos
            </Boton>
            <Boton variante="suave" className="min-h-11" onClick={() => setConfirmar(false)}>
              Cancelar
            </Boton>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          className="min-h-11 justify-self-end rounded-xl px-3 text-xs font-semibold text-tinta-suave underline hover:bg-fondo hover:text-tinta"
          aria-label={`Sacar a todos de ${sala.nombre}`}
        >
          Sacar a todos de la sala
        </button>
      )}
    </div>
  )
}

function EstadoAvance({ sala, p }: { sala: Sala; p: ProgresoSala | undefined }) {
  const plan = planDeSala(sala.plan)
  const paso = p?.paso ?? 0
  if (plan.length === 0) return <span className="text-xs text-tinta-suave">Sin contenidos</span>
  if (paso >= plan.length) return <span className="text-xs font-semibold text-menta-oscuro">✓ Terminó{sala.siguienteSala ? ' · pasando' : ' · esperando'}</span>
  const actual = plan[paso]
  const actividad = actual.contenido.pasos[actual.numero - 1]?.titulo ?? `Actividad ${actual.numero}`
  return (
    <span className="grid gap-0.5 text-xs text-tinta-suave">
      <span className="flex items-center gap-1.5 truncate text-tinta">
        <span aria-hidden="true">{actual.contenido.icono}</span>
        <span className="truncate">{actividad}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-white" aria-hidden="true">
          <span className="block h-full rounded-full bg-menta" style={{ width: `${(paso / plan.length) * 100}%` }} />
        </span>
        Actividad {paso + 1} de {plan.length}
        {p?.necesitaAyuda ? (
          <b className="rounded-full bg-[#fdf1e4] px-1.5 text-[#9a4d00]">🙋 Necesita apoyo · intento {p.repeticiones + 1}</b>
        ) : (
          p && p.repeticiones > 0 && <b>· intento {p.repeticiones + 1}</b>
        )}
      </span>
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
    <li {...fila} className={`flex items-center gap-2 rounded-xl py-1.5 pr-2 pl-1 ${activo ? 'bg-menta-fondo ring-2 ring-menta' : 'bg-fondo'} ${pendiente(e.id) !== undefined ? 'animate-pulse' : ''}`}>
      {asa}
      <EnLinea e={e} online={online} className="size-9 text-xl" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate font-semibold text-tinta">{e.nombre}</span>
          {!online && <span className="shrink-0 text-xs text-tinta-suave">· sin dispositivo</span>}
        </span>
        {children}
        <span className="block text-xs text-tinta-suave">{hoy}</span>
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
          className="grid size-11 shrink-0 place-items-center rounded-lg text-tinta-suave hover:bg-white hover:text-tinta"
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

// Plan de la sala, en una ventana aparte para que la tarjeta no crezca: en orden,
// contenidos (cada uno trae sus 3 actividades) y actividades que configura la
// docente. Guardar un plan nuevo reinicia el avance.
function EditorPlan({ sala, conAvance, ejecutar, alCerrar }: { sala: Sala; conAvance: number; ejecutar: Ejecutar; alCerrar: () => void }) {
  const [bloques, setBloques] = useState(() => bloquesDePlan(sala.plan))
  const dialogo = useDialogo<HTMLDivElement>()
  // La actividad que se está configurando: nueva, o una del plan si trae `indice`.
  const [configurando, setConfigurando] = useState<{
    juegoId: string
    indice?: number
  } | null>(null)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  const mover = (i: number, d: -1 | 1) =>
    setBloques((c) => {
      const r = [...c]
      ;[r[i], r[i + d]] = [r[i + d], r[i]]
      return r
    })
  const guardar = async () => {
    await ejecutar(() => repo.asignarPlan(sala.id, planDeBloques(bloques)))
    alCerrar()
  }

  const disponibles = CONTENIDOS.filter((c) => !bloques.some((b) => 'contenido' in b && b.contenido === c.id))
  const editado = configurando?.indice !== undefined ? bloques[configurando.indice] : undefined

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/40 p-4" onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div
        ref={dialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`plan-${sala.id}`}
        className="grid max-h-[90dvh] outline-none w-full max-w-2xl gap-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={`plan-${sala.id}`} className="text-xl font-bold text-tinta">
              Plan de «{sala.nombre}»
            </h2>
            <p className="text-sm text-tinta-suave">En orden: contenidos y actividades que configuras tú. En cada contenido toca una actividad para quitarla o cambiarla de lugar. Cada uno trae su dificultad (intermedia si no eliges otra).</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={alCerrar} className="grid size-11 place-items-center rounded-xl text-tinta-suave hover:bg-fondo">
            ✕
          </button>
        </div>

        {bloques.length > 0 && (
          <ol className="grid gap-2">
            {bloques.map((b, i) => {
              const { titulo, detalle, icono, color, resumen } = datosBloque(b)
              const juegoId = 'paso' in b && juegoConfigurable(b.paso.juego)?.id
              return (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-fondo px-2 py-1.5 text-sm" title={detalle}>
                  <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold">{i + 1}</span>
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full text-lg" style={{ background: color }}>{icono}</span>
                  <span className="grid min-w-0 flex-1 gap-1 leading-tight">
                    <b className="block text-tinta">{titulo}</b>
                    {resumen && <span className="block truncate text-xs text-tinta-suave">{resumen}</span>}
                    {'contenido' in b && <ElegirPasos bloque={b} alCambiar={(pasos) => setBloques((x) => x.map((y, k) => (k === i ? { ...b, pasos } : y)))} />}
                    <ElegirDificultad valor={exigenciaDe(b)} alCambiar={(e) => setBloques((x) => x.map((y, k) => (k === i ? conExigencia(b, e) : y)))} />
                  </span>
                  {juegoId && (
                    <Boton variante="suave" className="min-h-11 min-w-11" aria-label={`Configurar ${titulo}`} onClick={() => setConfigurando({ juegoId, indice: i })}>
                      <Icono nombre="lapiz" />
                    </Boton>
                  )}
                  <Boton variante="suave" className="min-h-11 min-w-11" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</Boton>
                  <Boton variante="suave" className="min-h-11 min-w-11" aria-label="Bajar" disabled={i === bloques.length - 1} onClick={() => mover(i, 1)}>↓</Boton>
                  <Boton variante="suave" className="min-h-11 min-w-11" aria-label={`Quitar ${titulo}`} onClick={() => setBloques((x) => x.filter((_, k) => k !== i))}>✕</Boton>
                </li>
              )
            })}
          </ol>
        )}

        {configurando ? (
          <ConfigurarActividad
            key={`${configurando.juegoId}-${configurando.indice ?? 'nueva'}`}
            juegoId={configurando.juegoId}
            inicial={editado && 'paso' in editado ? editado.paso : undefined}
            alListo={(paso) => {
              setBloques((x) => (configurando.indice === undefined ? [...x, { paso }] : x.map((b, k) => (k === configurando.indice ? { paso } : b))))
              setConfigurando(null)
            }}
            alCancelar={() => setConfigurando(null)}
          />
        ) : (
          <section aria-label="Actividades configurables">
            <h3 className="mb-1.5 text-xs font-bold text-tinta-suave">Actividades que configuras tú</h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
              {JUEGOS_CONFIGURABLES.map((j) => (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => setConfigurando({ juegoId: j.id })}
                    className="flex h-full w-full items-center gap-2.5 rounded-xl border-2 border-menta bg-menta-fondo/40 px-3 py-2 text-left text-sm text-tinta transition-colors hover:bg-menta-fondo"
                  >
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full text-2xl" style={{ background: j.color }}>{j.icono}</span>
                    <span className="leading-tight">
                      <b className="block">{j.titulo}</b>
                      <span className="text-xs text-tinta-suave">Elige las letras o usa una plantilla</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {disponibles.length > 0 && (
          <div className="grid gap-4">
            <h3 className="text-xs font-bold text-tinta-suave">Toca para agregar</h3>
            {/* Por área: las actividades auditivas (solo escuchar) aparte de las de sílabas. */}
            {(Object.keys(AREAS) as Area[]).map((area) => {
              const delArea = disponibles.filter((c) => c.area === area)
              if (delArea.length === 0) return null
              return (
                <section key={area} aria-label={AREAS[area].nombre}>
                  <h4 className="mb-1.5 flex items-baseline gap-2 text-sm font-bold text-tinta">
                    <span aria-hidden="true">{AREAS[area].icono}</span> {AREAS[area].nombre}
                    <span className="text-xs font-normal text-tinta-suave">{AREAS[area].descripcion}</span>
                  </h4>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
                    {delArea.map((c) => (
                      <li key={c.id}>
                        {/* La descripción va a la vista: en tablet no hay tooltip. */}
                        <button
                          type="button"
                          onClick={() => setBloques((x) => [...x, bloqueContenido(c.id)])}
                          className="flex h-full w-full items-start gap-2.5 rounded-xl border border-borde bg-white px-3 py-2.5 text-left text-tinta transition-colors hover:border-menta hover:bg-menta-fondo"
                        >
                          <IconoContenido c={c} className="size-11 text-2xl" />
                          <span className="min-w-0 leading-tight">
                            <b className="block text-sm">{c.titulo}</b>
                            <span className="mt-0.5 line-clamp-3 block text-xs text-tinta-suave">{c.descripcion}</span>
                            <span className="mt-1 block text-xs font-semibold text-menta-oscuro">
                              {c.pasos.length} {c.pasos.length === 1 ? 'actividad' : 'actividades'}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

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

// Las actividades de un contenido, en el orden en que se juegan. Tocar una
// encendida la quita; tocar una apagada la agrega al final. Así «Escucha y toca»
// puede ir al final o no ir. Siempre queda al menos una.
function ElegirPasos({ bloque, alCambiar }: { bloque: { contenido: string; pasos: number[] }; alCambiar: (pasos: number[]) => void }) {
  const c = contenido(bloque.contenido)
  if (!c || c.pasos.length < 2) return null
  const apagadas = c.pasos.map((_, k) => k + 1).filter((n) => !bloque.pasos.includes(n))
  const ficha = (n: number) => {
    const orden = bloque.pasos.indexOf(n)
    const encendida = orden >= 0
    const unica = encendida && bloque.pasos.length === 1
    return (
      <li key={n}>
        <button
          type="button"
          aria-pressed={encendida}
          disabled={unica}
          title={unica ? 'Debe quedar al menos una actividad' : encendida ? 'Quitar esta actividad' : 'Agregarla al final'}
          onClick={() => alCambiar(encendida ? bloque.pasos.filter((x) => x !== n) : [...bloque.pasos, n])}
          className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
            encendida ? 'border-menta bg-white text-tinta hover:bg-menta-fondo' : 'border-dashed border-borde bg-transparent text-tinta-suave line-through hover:text-tinta'
          }`}
        >
          <span aria-hidden="true" className={`grid size-4 place-items-center rounded-full text-[10px] ${encendida ? 'bg-menta text-white' : 'bg-borde text-white'}`}>
            {encendida ? orden + 1 : '+'}
          </span>
          {c.pasos[n - 1].titulo}
        </button>
      </li>
    )
  }
  return (
    <ol className="flex flex-wrap gap-1" aria-label={`Actividades de ${c.titulo}, en orden`}>
      {bloque.pasos.map(ficha)}
      {apagadas.map(ficha)}
    </ol>
  )
}

// Dificultad de un contenido o actividad en esta sala (intermedia si no se elige otra).
const exigenciaDe = (b: BloquePlan) => ('paso' in b ? b.paso.exigencia : b.exigencia)
const conExigencia = (b: BloquePlan, exigencia?: Exigencia): BloquePlan => ('paso' in b ? { paso: { ...b.paso, exigencia } } : { ...b, exigencia })

function ElegirDificultad({ valor, alCambiar }: { valor?: Exigencia; alCambiar: (e?: Exigencia) => void }) {
  return (
    <label className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-tinta-suave">
      Dificultad
      <select
        value={valor ?? ''}
        onChange={(e) => alCambiar((e.target.value || undefined) as Exigencia | undefined)}
        className="min-h-9 rounded-lg border border-borde bg-white px-2 text-xs font-semibold text-tinta"
      >
        {(Object.keys(EXIGENCIAS) as Exigencia[]).map((e) => (
          <option key={e} value={e === 'intermedio' ? '' : e}>
            {EXIGENCIAS[e].nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

// Recreo: la docente elige qué se hace; quienes están dentro cambian al instante.
function TarjetaRecreo({ sala, dentro, datos, ejecutar }: { sala: Sala; dentro: Estudiante[]; datos: Datos; ejecutar: Ejecutar }) {
  const { pendiente } = useMover()
  const actividad = ACTIVIDADES_RECREO[sala.actividad]
  const origenes = datos.salas.filter((s) => s.siguienteSala === sala.id).length
  return (
    <ZonaSoltar destino={sala.id} nombre={sala.nombre} className="grid w-80 content-start gap-4 p-4">
      <EncabezadoSala sala={sala} n={dentro.length} ejecutar={ejecutar} />
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-tinta-suave">¿Qué se hace en este recreo?</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(ACTIVIDADES_RECREO) as ActividadRecreo[]).map((valor) => (
            <label
              key={valor}
              title={ACTIVIDADES_RECREO[valor].ayuda}
              className={`grid cursor-pointer justify-items-center gap-0.5 rounded-xl border px-1 py-1.5 text-xs font-semibold text-tinta ${sala.actividad === valor ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}
            >
              <span aria-hidden="true" className="text-lg leading-none">{ACTIVIDADES_RECREO[valor].icono}</span>
              <input
                type="radio"
                name={`actividad-${sala.id}`}
                value={valor}
                checked={sala.actividad === valor}
                onChange={() => void ejecutar(() => repo.configurarRecreo(sala.id, valor, sala.juegos))}
                className="sr-only"
              />
              {ACTIVIDADES_RECREO[valor].nombre}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-tinta-suave">{actividad.ayuda}</p>
      </fieldset>
      {sala.actividad === 'juegos' && <ElegirJuegos sala={sala} ejecutar={ejecutar} />}
      {sala.actividad === 'parque' && <UltimosSaludos sala={sala} />}
      <ListaNinos sala={sala} dentro={dentro} datos={datos} ejecutar={ejecutar} vacia={origenes ? 'Aquí llegan solos al terminar.' : 'Conecta una sala a este recreo o arrastra niños aquí.'}>
        {(e) => {
          const destino = pendiente(e.id)
          return destino !== undefined ? <Conectando destino={destino} /> : <span className="text-xs text-tinta-suave">{actividad.estado}</span>
        }}
      </ListaNinos>
    </ZonaSoltar>
  )
}

function ElegirJuegos({ sala, ejecutar }: { sala: Sala; ejecutar: Ejecutar }) {
  return (
    <fieldset>
      <legend className="sr-only">Juegos de este recreo</legend>
      <div className="flex flex-wrap gap-1.5">
        {JUEGOS.map((j) => {
          const activo = sala.juegos.includes(j.id)
          return (
            <label key={j.id} className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${activo ? 'border-menta bg-menta-fondo' : 'border-borde bg-white'}`}>
              <input
                type="checkbox"
                checked={activo}
                onChange={() => void ejecutar(() => repo.configurarRecreo(sala.id, sala.actividad, activo ? sala.juegos.filter((y) => y !== j.id) : [...sala.juegos, j.id]))}
                className="accent-[var(--color-menta)]"
              />
              <span aria-hidden="true">{j.icono}</span> {j.titulo}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function UltimosSaludos({ sala }: { sala: Sala }) {
  const { datos: mensajes, recargar } = useConsulta(() => repo.mensajesSala(sala.id), [sala.id])
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })
  if (!mensajes?.length) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Últimos saludos">
      {mensajes.slice(0, 6).map((m) => (
        <li key={m.id} className="flex items-center gap-1 rounded-full bg-white py-0.5 pr-2 pl-0.5 text-sm" title={`${m.nombre} · ${new Date(m.enviadoEn).toLocaleTimeString('es-CL')}`}>
          <Avatar estudiante={m} className="size-6 text-sm" />
          <span aria-label={pictoMensaje(m.picto)?.voz}>{pictoMensaje(m.picto)?.emoji}</span>
        </li>
      ))}
    </ul>
  )
}

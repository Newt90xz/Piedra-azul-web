import { useEffect, useState } from 'react'
import { quitarTildes } from '../../../contenido/banco.ts'
import { AREAS, CONTENIDOS, bloqueContenido, bloquesDePlan, contenido, planDeBloques, planDeSala, type Area, type BloquePlan } from '../../../contenido/contenidos.ts'
import { EXIGENCIAS } from '../../../contenido/exigencia.ts'
import { JUEGOS_CONFIGURABLES, juegoConfigurable } from '../../../contenido/plantillas.ts'
import { repo } from '../../../datos/index.ts'
import type { Exigencia, Sala } from '../../../dominio/tipos.ts'
import { useCambiosSinGuardar } from '../../../lib/cambiosSinGuardar.ts'
import { Aviso, Boton, Dialogo, MenuAcciones, claseEntrada, type OpcionMenu } from '../../../ui/aula.tsx'
import { ConfigurarLetras } from './ConfigurarLetras.tsx'
import { conExigencia, datosBloque, exigenciaDe } from './sala.ts'

// Cada bloque lleva una clave propia para que React no confunda filas al reordenar.
type Fila = { clave: string; b: BloquePlan }
let contador = 0
const conClave = (b: BloquePlan): Fila => ({ clave: `bloque-${++contador}`, b })

const mismoPlan = (a: BloquePlan[], b: BloquePlan[]) => JSON.stringify(planDeBloques(a)) === JSON.stringify(planDeBloques(b))

// Borrador del plan en esta pestaña: si la docente sale sin guardar (o se cierra
// la pestaña sin querer), al volver se recupera. Solo vale para el mismo plan
// guardado del que partió (`base`).
const claveBorrador = (salaId: string) => `leer-para-todos/borrador-plan/${salaId}`

function leerBorrador(sala: Sala): BloquePlan[] | null {
  try {
    const crudo = sessionStorage.getItem(claveBorrador(sala.id))
    if (!crudo) return null
    const borrador = JSON.parse(crudo) as { base: string; bloques: BloquePlan[] }
    if (borrador.base === sala.asignacion && Array.isArray(borrador.bloques)) return borrador.bloques
    sessionStorage.removeItem(claveBorrador(sala.id))
  } catch {
    // Almacenamiento bloqueado o dañado: se parte del plan guardado.
  }
  return null
}

function escribirBorrador(sala: Sala, bloques: BloquePlan[] | null) {
  try {
    if (bloques) sessionStorage.setItem(claveBorrador(sala.id), JSON.stringify({ base: sala.asignacion, bloques }))
    else sessionStorage.removeItem(claveBorrador(sala.id))
  } catch {
    // Sin almacenamiento el editor funciona igual, solo sin borrador.
  }
}

// Qué falta en una actividad configurable para poder jugarla (null si está lista).
function problemaDe(b: BloquePlan) {
  if (!('paso' in b)) return null
  const j = juegoConfigurable(b.paso.juego)
  return j ? j.validar(b.paso.parametros ?? j.porDefecto) : null
}

// El plan de una sala de actividades, en su página: a la izquierda el plan en
// orden, a la derecha lo que se puede agregar. Nada se guarda hasta «Guardar
// plan»; un plan nuevo hace que los niños de la sala vuelvan a empezar.
export function EditorPlan({ sala, conAvance, alGuardado }: { sala: Sala; conAvance: number; alGuardado: () => void }) {
  const [inicio] = useState(() => {
    const original = bloquesDePlan(sala.plan)
    const borrador = leerBorrador(sala)
    const recuperado = borrador !== null && !mismoPlan(borrador, original)
    return { original, filas: (recuperado ? borrador : original).map(conClave), recuperado }
  })
  const [filas, setFilas] = useState(inicio.filas)
  const [recuperado, setRecuperado] = useState(inicio.recuperado)
  // La actividad configurable con sus letras a la vista.
  const [abierta, setAbierta] = useState<string | null>(null)
  const [descartando, setDescartando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')

  const bloques = filas.map((f) => f.b)
  const cambios = !mismoPlan(bloques, inicio.original)
  const problema = bloques.map(problemaDe).find(Boolean)
  const actividades = planDeSala(planDeBloques(bloques)).length

  useCambiosSinGuardar(cambios, 'El plan tiene cambios sin guardar. ¿Salir igual? Quedan como borrador en esta pestaña.')
  useEffect(() => escribirBorrador(sala, cambios ? bloques : null), [sala, cambios, bloques])

  const cambiar = (clave: string, b: BloquePlan) => setFilas((x) => x.map((y) => (y.clave === clave ? { ...y, b } : y)))
  const mover = (i: number, d: -1 | 1) => {
    setFilas((x) => {
      const r = [...x]
      ;[r[i], r[i + d]] = [r[i + d], r[i]]
      return r
    })
    setAnuncio(`${datosBloque(filas[i].b).titulo} quedó en el lugar ${i + d + 1}.`)
  }
  const quitar = (f: Fila) => {
    setFilas((x) => x.filter((y) => y.clave !== f.clave))
    setAnuncio(`Se quitó ${datosBloque(f.b).titulo} del plan.`)
  }
  const agregar = (b: BloquePlan) => {
    const f = conClave(b)
    setFilas((x) => [...x, f])
    // Una actividad configurable se agrega con sus letras a la vista, para elegirlas.
    if ('paso' in b) setAbierta(f.clave)
    setAnuncio(`Se agregó ${datosBloque(b).titulo} al final del plan.`)
  }
  const descartar = () => {
    setFilas(inicio.original.map(conClave))
    setRecuperado(false)
    setAbierta(null)
    setDescartando(false)
    setAnuncio('Se descartaron los cambios.')
  }
  const guardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      await repo.asignarPlan(sala.id, planDeBloques(bloques))
      escribirBorrador(sala, null)
      alGuardado()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el plan.')
      setGuardando(false)
    }
  }

  return (
    <>
      <p role="status" className="sr-only">
        {anuncio}
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section aria-labelledby="titulo-plan" className="rounded-xl border border-borde bg-white">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-borde px-4 py-3">
            <h2 id="titulo-plan" className="text-lg font-semibold text-tinta">
              Plan, en orden
            </h2>
            <p className="text-sm text-tinta-suave">{actividades === 0 ? 'Sin actividades' : `${actividades} ${actividades === 1 ? 'actividad' : 'actividades'} en total`}</p>
          </header>
          {recuperado && (
            <Aviso tono="atencion" className="mx-4 mt-4">
              Recuperamos los cambios que no alcanzaste a guardar.
            </Aviso>
          )}
          {filas.length === 0 ? (
            <div className="px-4 py-10 text-center text-tinta-suave">
              <p className="font-medium text-tinta">El plan está vacío</p>
              <p className="mt-1 text-sm">Agrega contenidos desde «Agregar al plan». Mientras no tenga plan, los niños de esta sala esperan con los globos.</p>
            </div>
          ) : (
            <ol className="divide-y divide-borde">
              {filas.map((f, i) => (
                <FilaBloque
                  key={f.clave}
                  fila={f}
                  numero={i + 1}
                  abierta={abierta === f.clave}
                  alAbrir={(si) => setAbierta(si ? f.clave : null)}
                  alCambiar={(b) => cambiar(f.clave, b)}
                  opciones={[
                    ...(i > 0 ? [{ texto: 'Subir', alElegir: () => mover(i, -1) }] : []),
                    ...(i < filas.length - 1 ? [{ texto: 'Bajar', alElegir: () => mover(i, 1) }] : []),
                    ...(filas.length > 1 ? ['separador' as const] : []),
                    { texto: 'Quitar del plan', peligro: true, alElegir: () => quitar(f) },
                  ]}
                />
              ))}
            </ol>
          )}
        </section>
        <Catalogo bloques={bloques} alAgregar={agregar} />
      </div>

      {(cambios || error) && (
        <div className="sticky bottom-4 z-20 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-borde bg-white px-4 py-3 shadow-[0_8px_24px_rgb(23_50_79/0.14)]">
          <p className={`min-w-0 flex-1 text-sm ${error || problema ? 'font-medium text-peligro' : 'text-tinta'}`}>
            {error ??
              problema ??
              (conAvance > 0
                ? `Cambios sin guardar. Al guardar, ${conAvance} ${conAvance === 1 ? 'niño de esta sala vuelve' : 'niños de esta sala vuelven'} a empezar el plan.`
                : 'Cambios sin guardar.')}
          </p>
          <div className="flex gap-2">
            <Boton variante="suave" disabled={guardando} onClick={() => setDescartando(true)}>
              Descartar
            </Boton>
            <Boton disabled={guardando || Boolean(problema)} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Guardar plan'}
            </Boton>
          </div>
        </div>
      )}

      {descartando && (
        <Dialogo rol="alertdialog" titulo="¿Descartar los cambios?" alCerrar={() => setDescartando(false)}>
          <p className="text-tinta-suave">El plan vuelve a quedar como está guardado.</p>
          <div className="flex justify-end gap-2">
            <Boton variante="suave" onClick={() => setDescartando(false)}>
              Seguir editando
            </Boton>
            <Boton variante="peligro" onClick={descartar}>
              Descartar cambios
            </Boton>
          </div>
        </Dialogo>
      )}
    </>
  )
}

function FilaBloque({
  fila,
  numero,
  abierta,
  alAbrir,
  alCambiar,
  opciones,
}: {
  fila: Fila
  numero: number
  abierta: boolean
  alAbrir: (si: boolean) => void
  alCambiar: (b: BloquePlan) => void
  opciones: OpcionMenu[]
}) {
  const { b, clave } = fila
  const { titulo, icono, color, detalle } = datosBloque(b)
  const problema = problemaDe(b)

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-2 w-5 shrink-0 text-right text-sm font-semibold text-tinta-suave tabular-nums">{numero}</span>
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full text-lg" style={{ background: color }}>
          {icono}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-tinta">{titulo}</h3>
          <p className="text-[13px] text-tinta-suave">{detalle}</p>

          {'contenido' in b && <ElegirPasos bloque={b} titulo={titulo} alCambiar={(pasos) => alCambiar({ ...b, pasos })} />}

          {'paso' in b && (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  aria-expanded={abierta}
                  onClick={() => alAbrir(!abierta)}
                  className="min-h-8 rounded-lg border border-borde bg-white px-3 text-[13px] font-medium text-tinta hover:bg-lienzo pointer-coarse:min-h-10"
                >
                  {abierta ? 'Listo' : 'Elegir letras'}
                </button>
                {problema && <span className="text-[13px] font-medium text-peligro">{problema}</span>}
              </div>
              {abierta && (
                <ConfigurarLetras
                  juegoId={b.paso.juego}
                  parametros={b.paso.parametros ?? juegoConfigurable(b.paso.juego)?.porDefecto ?? {}}
                  alCambiar={(parametros) => alCambiar({ paso: { ...b.paso, parametros } })}
                />
              )}
            </>
          )}

          <ElegirDificultad nombre={clave} titulo={titulo} valor={exigenciaDe(b)} alCambiar={(e) => alCambiar(conExigencia(b, e))} />
        </div>
        <MenuAcciones etiqueta={`Opciones de ${titulo}`} opciones={opciones} />
      </div>
    </li>
  )
}

// Las actividades de un contenido, en el orden en que se juegan. Tocar una
// encendida la quita; tocar una apagada la agrega al final. Siempre queda una.
function ElegirPasos({ bloque, titulo, alCambiar }: { bloque: { contenido: string; pasos: number[] }; titulo: string; alCambiar: (pasos: number[]) => void }) {
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
          className={`flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium disabled:cursor-not-allowed pointer-coarse:min-h-10 ${
            encendida ? 'border-borde bg-white text-tinta hover:bg-lienzo' : 'border-dashed border-borde text-tinta-suave line-through hover:text-tinta'
          }`}
        >
          <span
            aria-hidden="true"
            className={`grid size-4 place-items-center rounded-full text-[10px] font-semibold ${encendida ? 'bg-menta-oscuro text-white' : 'bg-borde text-tinta-suave'}`}
          >
            {encendida ? orden + 1 : '+'}
          </span>
          {c.pasos[n - 1].titulo}
        </button>
      </li>
    )
  }
  return (
    <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={`Actividades de ${titulo}, en orden`}>
      {bloque.pasos.map(ficha)}
      {apagadas.map(ficha)}
    </ol>
  )
}

const NIVELES: Exigencia[] = ['inicial', 'intermedio', 'avanzado']

// Dificultad del bloque en esta sala; intermedia si no se elige otra.
function ElegirDificultad({ nombre, titulo, valor, alCambiar }: { nombre: string; titulo: string; valor?: Exigencia; alCambiar: (e?: Exigencia) => void }) {
  const actual = valor ?? 'intermedio'
  return (
    <fieldset className="mt-2.5 flex flex-wrap items-center gap-2">
      <legend className="sr-only">Dificultad de {titulo}</legend>
      <span aria-hidden="true" className="text-[13px] text-tinta-suave">
        Dificultad
      </span>
      <span className="inline-flex rounded-lg border border-borde bg-lienzo p-0.5">
        {NIVELES.map((e) => (
          <label
            key={e}
            title={EXIGENCIAS[e].descripcion}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-[13px] font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-menta-oscuro pointer-coarse:py-2 ${
              actual === e ? 'bg-white text-tinta ring-1 ring-borde' : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            <input type="radio" name={`exigencia-${nombre}`} checked={actual === e} onChange={() => alCambiar(e === 'intermedio' ? undefined : e)} className="sr-only" />
            {EXIGENCIAS[e].nombre}
          </label>
        ))}
      </span>
    </fieldset>
  )
}

type ItemCatalogo = { id: string; titulo: string; descripcion: string; icono: string; color: string; area: Area; enPlan: boolean; bloque: () => BloquePlan }

// Lo que se puede agregar: los contenidos (cada uno con sus actividades) y las
// actividades en que la docente elige las letras. Agrupado por área, con buscador.
function Catalogo({ bloques, alAgregar }: { bloques: BloquePlan[]; alAgregar: (b: BloquePlan) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const normal = (s: string) => quitarTildes(s.toLocaleLowerCase('es-CL'))
  const q = normal(busqueda.trim())
  const enPlan = new Set(bloques.flatMap((b) => ('contenido' in b ? [b.contenido] : [])))

  const items: ItemCatalogo[] = [
    ...CONTENIDOS.map((c) => ({ ...c, enPlan: enPlan.has(c.id), bloque: () => bloqueContenido(c.id) })),
    ...JUEGOS_CONFIGURABLES.map((j) => ({ ...j, enPlan: false, bloque: (): BloquePlan => ({ paso: { juego: j.id, parametros: j.porDefecto } }) })),
  ].filter((x) => !q || normal(`${x.titulo} ${x.descripcion}`).includes(q))
  const areas = Object.keys(AREAS) as Area[]

  return (
    <section aria-labelledby="titulo-agregar" className="flex flex-col rounded-xl border border-borde bg-white lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]">
      <div className="grid gap-3 border-b border-borde px-4 py-3">
        <h2 id="titulo-agregar" className="text-lg font-semibold text-tinta">
          Agregar al plan
        </h2>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar, por ejemplo: rimas" aria-label="Buscar contenidos" className={claseEntrada} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-tinta-suave">Nada coincide con «{busqueda.trim()}».</p>
        ) : (
          areas
            .filter((a) => items.some((x) => x.area === a))
            .map((a) => (
              <div key={a}>
                <h3 className="px-4 pt-3 pb-1 text-[13px] font-medium text-tinta-suave">{AREAS[a].nombre}</h3>
                <ul>
                  {items
                    .filter((x) => x.area === a)
                    .map((x) => (
                      <li key={x.id} className="flex items-start gap-3 px-4 py-2">
                        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full text-base" style={{ background: x.color }}>
                          {x.icono}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-tinta">{x.titulo}</p>
                          <p className="line-clamp-2 text-[13px] text-tinta-suave">{x.descripcion}</p>
                        </div>
                        {x.enPlan ? (
                          <span className="mt-1.5 shrink-0 text-[13px] text-tinta-suave">En el plan</span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Agregar ${x.titulo}`}
                            onClick={() => alAgregar(x.bloque())}
                            className="min-h-8 shrink-0 rounded-lg border border-borde bg-white px-3 text-[13px] font-semibold text-tinta hover:bg-lienzo pointer-coarse:min-h-10"
                          >
                            Agregar
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))
        )}
      </div>
    </section>
  )
}


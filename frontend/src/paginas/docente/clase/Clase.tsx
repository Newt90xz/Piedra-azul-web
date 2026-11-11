import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { planDeSala } from '../../../contenido/contenidos.ts'
import { repo } from '../../../datos/index.ts'
import type { Estudiante, Sala } from '../../../dominio/tipos.ts'
import { RECREO, SIN_SALA, coloresDeSalas, enLinea, necesitanApoyo, resumenHoy, salasEnOrden } from '../../../lib/clase.ts'
import { capitalizar } from '../../../lib/texto.ts'
import { Avatar } from '../../../ui/Avatar.tsx'
import { Aviso, AvisoError, Boton, BotonEnlace, Dialogo, Encabezado, Etiqueta, EstadoVacio, MenuAcciones } from '../../../ui/aula.tsx'
import { PIDE_APOYO } from './apoyo.ts'
import { Columna } from './Columna.tsx'
import { PanelNino } from './PanelNino.tsx'
import { Resumen } from './Resumen.tsx'
import { useAnuncioCambios, useClaseEnVivo, useSemana } from './useClaseEnVivo.ts'

const porNombre = (a: Estudiante, b: Estudiante) => a.nombre.localeCompare(b.nombre, 'es')

// Clase, la página de inicio: arriba el resumen (ahora y la semana) y quién
// necesita apoyo; debajo, cada sala es una columna, con «Sin sala» primero.
// Aquí solo se mira y se mueve; lo que se prepara (planes, recreos, a dónde
// pasan) está en Salas.
export default function Clase() {
  const { datos, error, recargar, accionError, ejecutar, pendiente, salaDe, mover } = useClaseEnVivo()
  const { resumen, error: errorSemana } = useSemana(datos)
  const anuncio = useAnuncioCambios(datos)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [vaciando, setVaciando] = useState<Sala | null>(null)
  // La fecha de hoy, para leer «hoy» y «esta semana» del resumen.
  const [fecha] = useState(() => capitalizar(new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })))
  const navegar = useNavigate()

  if (error && !datos) return <AvisoError alReintentar={recargar} />
  if (!datos) return <p className="text-tinta-suave">Cargando la clase…</p>

  const salas = salasEnOrden(datos.salas)
  const colores = coloresDeSalas(datos.salas)
  const en = (destino: string) => datos.estudiantes.filter((e) => salaDe(e.id) === destino).sort(porNombre)
  const conTablet = (e: Estudiante) => enLinea(datos.conectados.get(e.id))
  // En «Sin sala», primero los que ya tienen la tablet abierta.
  const sinSala = en(SIN_SALA).sort((a, b) => Number(conTablet(b)) - Number(conTablet(a)))
  const apoyo = necesitanApoyo(datos)

  return (
    <>
      <Encabezado titulo="Clase" descripcion={fecha} />

      {datos.estudiantes.length > 0 && (
        <Resumen
          total={datos.estudiantes.length}
          conTablet={datos.estudiantes.filter(conTablet).length}
          sinSala={sinSala.length}
          hoy={resumenHoy(datos)}
          semana={resumen}
          errorSemana={Boolean(errorSemana)}
          alAbrir={setAbierto}
        />
      )}

      {/* Quién cambió de sala o pide apoyo, para lectores de pantalla. */}
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      {accionError && <Aviso tono="peligro" className="mb-4">{accionError}</Aviso>}
      {error && <Aviso className="mb-4">No se pudo actualizar: se muestran los últimos datos. Se reintenta solo.</Aviso>}

      {apoyo.length > 0 && <FranjaApoyo apoyo={apoyo} alAbrir={setAbierto} alAyudar={(id) => void ejecutar(() => repo.marcarApoyado(id))} />}

      {datos.estudiantes.length === 0 ? (
        <EstadoVacio titulo="Este curso no tiene estudiantes activos" accion={<BotonEnlace to="/docente/estudiantes">Ir a Estudiantes</BotonEnlace>}>
          Agrega a tus estudiantes o activa sus perfiles para verlos aquí.
        </EstadoVacio>
      ) : (
        <section aria-labelledby="titulo-salas">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="titulo-salas" className="text-lg font-semibold text-tinta">
              Salas
            </h2>
            <p className="text-sm text-tinta-suave">Elige a un niño para ver cómo va o cambiarlo de sala.</p>
          </div>
          <div className="-mx-4 flex snap-x snap-proximity items-start gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
            <Columna
              titulo="Sin sala"
              detalle="En su tablet esperan con los globos"
              ninos={sinSala}
              datos={datos}
              pendiente={pendiente}
              vacio="Todos están en una sala."
              alSoltar={(id) => mover(id, SIN_SALA)}
              alAbrir={setAbierto}
            />
            {salas.map((s) => {
              const ninos = en(s.id)
              const siguiente = s.siguienteSala ? datos.salas.find((x) => x.id === s.siguienteSala) : undefined
              return (
                <Columna
                  key={s.id}
                  titulo={s.nombre}
                  detalle={detalleSala(s, siguiente)}
                  sala={s}
                  color={colores.get(s.id)}
                  ninos={ninos}
                  datos={datos}
                  pendiente={pendiente}
                  vacio="Nadie en esta sala."
                  alSoltar={(id) => mover(id, s.id)}
                  alAbrir={setAbierto}
                  menu={
                    <MenuAcciones
                      etiqueta={`Opciones de ${s.nombre}`}
                      opciones={[
                        { texto: 'Editar sala', alElegir: () => navegar(`/docente/salas?sala=${s.id}`) },
                        ...(ninos.length ? [{ texto: 'Sacar a todos de la sala', alElegir: () => setVaciando(s) }] : []),
                      ]}
                    />
                  }
                />
              )
            })}
            {salas.length === 0 && (
              <div className="max-w-[22rem] flex-[1_0_16rem]">
                <EstadoVacio titulo="Todavía no hay salas" accion={<BotonEnlace to="/docente/salas">Crear una sala</BotonEnlace>}>
                  Una sala reúne a un grupo de niños con su plan de actividades o su recreo.
                </EstadoVacio>
              </div>
            )}
          </div>
        </section>
      )}

      {abierto && (
        <PanelNino
          key={abierto}
          estudianteId={abierto}
          datos={datos}
          salaDe={salaDe}
          pendiente={pendiente}
          mover={mover}
          ejecutar={ejecutar}
          alCerrar={() => setAbierto(null)}
        />
      )}

      {vaciando && (
        <SacarATodos
          sala={vaciando}
          cuantos={en(vaciando.id).length}
          alCerrar={() => setVaciando(null)}
          alConfirmar={() => {
            for (const e of en(vaciando.id)) mover(e.id, SIN_SALA)
            setVaciando(null)
          }}
        />
      )}
    </>
  )
}

// Qué se hace en la sala y a dónde pasan después, en una línea.
function detalleSala(s: Sala, siguiente: Sala | undefined) {
  if (s.tipo === 'recreo') return `Recreo: ${RECREO[s.actividad].nombre}`
  if (planDeSala(s.plan).length === 0) return 'Sin plan: esperan con los globos'
  return siguiente ? `Al terminar pasan a ${siguiente.nombre}` : 'Al terminar te esperan'
}

function FranjaApoyo({
  apoyo,
  alAbrir,
  alAyudar,
}: {
  apoyo: ReturnType<typeof necesitanApoyo>
  alAbrir: (id: string) => void
  alAyudar: (id: string) => void
}) {
  return (
    <section aria-labelledby="titulo-apoyo" className="mb-5 rounded-xl border border-atencion-borde bg-atencion-fondo">
      <h2 id="titulo-apoyo" className="px-4 pt-3 pb-1 text-sm font-semibold text-atencion">
        Necesitan tu apoyo ({apoyo.length})
      </h2>
      <ul>
        {apoyo.map(({ estudiante: e, sala, estado }) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-atencion-borde/50 px-4 py-2 first:border-t-0">
            <Avatar estudiante={e} className={`size-8 text-lg ${PIDE_APOYO}`} />
            <button type="button" onClick={() => alAbrir(e.id)} className="font-semibold text-tinta hover:underline">
              {e.nombre}
            </button>
            <span className="min-w-0 flex-1 text-sm text-tinta">
              {estado.actividad} <span className="text-tinta-suave">en {sala.nombre}</span>
            </span>
            <Etiqueta tono="atencion">Intento {estado.intento}</Etiqueta>
            <Boton variante="secundario" onClick={() => alAyudar(e.id)}>
              Ya le ayudé
            </Boton>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SacarATodos({ sala, cuantos, alCerrar, alConfirmar }: { sala: Sala; cuantos: number; alCerrar: () => void; alConfirmar: () => void }) {
  return (
    <Dialogo titulo={`¿Sacar a todos de «${sala.nombre}»?`} alCerrar={alCerrar}>
      <p className="text-tinta-suave">
        {cuantos === 1 ? 'El niño queda' : `Los ${cuantos} niños quedan`} sin sala y en su tablet esperan con los globos.
      </p>
      <div className="flex justify-end gap-2">
        <Boton variante="suave" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={alConfirmar}>Sacar a todos</Boton>
      </div>
    </Dialogo>
  )
}


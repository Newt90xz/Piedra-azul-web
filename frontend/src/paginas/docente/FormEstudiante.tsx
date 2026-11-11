import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PERSONAJES_BASE, personajeDesdeBase } from '../../contenido/personaje.ts'
import type { Estudiante, Personaje } from '../../dominio/tipos.ts'
import { capitalizar } from '../../lib/texto.ts'
import { AJUSTES_POR_DEFECTO, type NuevoEstudiante } from '../../datos/repositorio.ts'
import { Boton, Campo, Tarjeta, claseEntrada } from '../../ui/aula.tsx'
import { DibujoPersonaje } from '../../ui/Personaje.tsx'

const COLORES = ['#fde2c8', '#d3f2e3', '#cfe8fb', '#f6d1d1', '#e4dcf7', '#fff3c4']

const esquema = z.object({
  // RNF-09: solo el nombre de pila.
  nombre: z.string().trim().min(2, 'Escribe el nombre de pila.').max(30).transform(capitalizar),
  avatar: z.string(),
  personaje: z.custom<Personaje>(),
  color: z.string(),
  activo: z.boolean(),
  // Ya no se elige en el formulario (lo que trabaja cada niño lo decide el plan de
  // su sala); se conserva el valor guardado.
  nivelHabilitado: z.coerce.number<string>().pipe(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  // Sin modo de imagen: el niño ve siempre el pictograma primero (se fija al guardar).
  ajustes: z.object({
    tamanoLetra: z.enum(['normal', 'grande', 'muy-grande']),
    altoContraste: z.boolean(),
    reducirAnimaciones: z.boolean(),
    silenciarEfectos: z.boolean(),
    tematica: z.enum(['animales', 'dinosaurios', 'futbol', 'oceano', 'vehiculos', 'piratas']),
  }),
})

type Entrada = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

export function FormEstudiante({ inicial, cursoId, alGuardar }: { inicial?: Estudiante; cursoId: string; alGuardar: (e: NuevoEstudiante | Estudiante) => Promise<void> }) {
  const { register, handleSubmit, watch, setValue, setError, formState } = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: inicial
      ? { ...inicial, personaje: inicial.personaje ?? personajeDesdeBase(PERSONAJES_BASE[0]), nivelHabilitado: String(inicial.nivelHabilitado) }
      : { nombre: '', avatar: '🙂', personaje: personajeDesdeBase(PERSONAJES_BASE[0]), color: COLORES[0], activo: true, nivelHabilitado: '1', ajustes: AJUSTES_POR_DEFECTO },
  })
  const personaje = watch('personaje') as Personaje
  const color = watch('color')

  const enviar = handleSubmit(async (v) => {
    try {
      const datos = { ...v, ajustes: { ...v.ajustes, modoImagen: 'picto' as const } }
      await alGuardar(inicial ? { ...inicial, ...datos } : { ...datos, cursoId })
    } catch (e) {
      console.warn('[estudiante] No se pudo guardar.', e)
      setError('root', { message: 'No se pudieron guardar los cambios. Intenta otra vez.' })
    }
  })

  return (
    <form onSubmit={enviar} noValidate className="grid gap-6 lg:grid-cols-2">
      <Tarjeta className="grid content-start gap-5">
        <h2 className="text-lg font-semibold text-tinta">Perfil</h2>
        <Campo etiqueta="Nombre de pila" error={formState.errors.nombre?.message}>
          <input className={claseEntrada} placeholder="Por ejemplo: Sofía" {...register('nombre')} />
        </Campo>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-tinta">Personaje (el niño lo toca para entrar)</legend>
          <div className="grid grid-cols-6 gap-2">
            {PERSONAJES_BASE.map((b) => {
              const elegido = personaje.pelo === b.pelo
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={elegido}
                  aria-label={`Personaje ${b.nombre}`}
                  title={b.nombre}
                  // Conserva lo que el niño ya compró y se puso.
                  onClick={() => setValue('personaje', personajeDesdeBase(b, personaje))}
                  className={`overflow-hidden rounded-xl ${elegido ? 'ring-3 ring-menta-oscuro' : 'bg-lienzo hover:ring-1 hover:ring-borde'}`}
                  style={elegido ? { background: color } : undefined}
                >
                  <DibujoPersonaje personaje={personajeDesdeBase(b)} color={color} vista="busto" />
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-tinta">Color de fondo</legend>
          <div className="flex gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                aria-label={`Color ${c}`}
                onClick={() => setValue('color', c)}
                className={`size-9 rounded-full border border-borde ${color === c ? 'ring-3 ring-menta-oscuro ring-offset-2' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>
      </Tarjeta>

      <Tarjeta className="grid content-start gap-5">
        <h2 className="text-lg font-semibold text-tinta">Apoyos y accesibilidad</h2>
        <Campo etiqueta="Tamaño de letra">
          <select className={claseEntrada} {...register('ajustes.tamanoLetra')}>
            <option value="normal">Normal (28 px)</option>
            <option value="grande">Grande (32 px)</option>
            <option value="muy-grande">Muy grande (38 px)</option>
          </select>
        </Campo>
        <Campo etiqueta="Temática favorita">
          <select className={claseEntrada} {...register('ajustes.tematica')}>
            <option value="animales">Animales</option>
            <option value="dinosaurios">Dinosaurios</option>
            <option value="futbol">Fútbol</option>
            <option value="oceano">Océano</option>
            <option value="vehiculos">Vehículos</option>
            <option value="piratas">Piratas</option>
          </select>
        </Campo>
        <Interruptor etiqueta="Alto contraste" {...register('ajustes.altoContraste')} />
        <Interruptor etiqueta="Reducir animaciones" {...register('ajustes.reducirAnimaciones')} />
        <Interruptor etiqueta="Silenciar efectos de sonido" descripcion="La voz sigue sonando." {...register('ajustes.silenciarEfectos')} />
      </Tarjeta>

      <div className="flex items-center gap-4 lg:col-span-2">
        <Boton type="submit" disabled={formState.isSubmitting}>
          {inicial ? 'Guardar cambios' : 'Crear estudiante'}
        </Boton>
        {formState.isSubmitSuccessful && inicial && <span role="status" className="text-sm font-medium text-menta-oscuro">Cambios guardados.</span>}
        {formState.errors.root && (
          <p role="alert" className="text-sm font-medium text-peligro">
            {formState.errors.root.message}
          </p>
        )}
      </div>
    </form>
  )
}

function Interruptor({ etiqueta, descripcion, ...input }: { etiqueta: string; descripcion?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" {...input} />
      <span className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-borde p-0.5 transition-colors peer-checked:bg-menta-oscuro peer-focus-visible:outline-3 peer-focus-visible:outline-menta-oscuro peer-checked:[&>span]:translate-x-5">
        <span className="block size-5 rounded-full bg-white shadow transition-transform" />
      </span>
      <span>
        <span className="block text-sm font-medium text-tinta">{etiqueta}</span>
        {descripcion && <span className="block text-sm text-tinta-suave">{descripcion}</span>}
      </span>
    </label>
  )
}

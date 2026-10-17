import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Estudiante } from '../../dominio/tipos.ts'
import { AJUSTES_POR_DEFECTO, type NuevoEstudiante } from '../../datos/repositorio.ts'
import { Boton, Campo, Tarjeta, claseEntrada } from '../../ui/aula.tsx'

const AVATARES = ['🦊', '🦖', '🐬', '🚒', '🦄', '⚽', '🐼', '🦁', '🚀', '🐢', '🏴‍☠️', '🦈']
const COLORES = ['#fde2c8', '#d3f2e3', '#cfe8fb', '#f6d1d1', '#e4dcf7', '#fff3c4']

const esquema = z.object({
  // RNF-09: solo el nombre de pila.
  nombre: z.string().trim().min(2, 'Escribe el nombre de pila.').max(30),
  avatar: z.string(),
  color: z.string(),
  activo: z.boolean(),
  nivelHabilitado: z.coerce.number<string>().pipe(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  ajustes: z.object({
    modoImagen: z.enum(['foto', 'picto', 'mixto']),
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
  const { register, handleSubmit, watch, setValue, formState } = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: inicial
      ? { ...inicial, nivelHabilitado: String(inicial.nivelHabilitado) }
      : { nombre: '', avatar: AVATARES[0], color: COLORES[0], activo: true, nivelHabilitado: '1', ajustes: AJUSTES_POR_DEFECTO },
  })
  const avatar = watch('avatar')
  const color = watch('color')

  const enviar = handleSubmit((v) => alGuardar(inicial ? { ...inicial, ...v } : { ...v, cursoId }))

  return (
    <form onSubmit={enviar} noValidate className="grid gap-6 lg:grid-cols-2">
      <Tarjeta className="grid content-start gap-5">
        <h2 className="text-lg font-bold">Perfil</h2>
        <Campo etiqueta="Nombre de pila" error={formState.errors.nombre?.message}>
          <input className={claseEntrada} placeholder="Por ejemplo: Sofía" {...register('nombre')} />
        </Campo>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Avatar (el niño lo toca para entrar)</legend>
          <div className="flex flex-wrap gap-2">
            {AVATARES.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={avatar === a}
                aria-label={`Avatar ${a}`}
                onClick={() => setValue('avatar', a)}
                className={`grid size-12 place-items-center rounded-2xl text-2xl ${avatar === a ? 'ring-3 ring-menta' : 'bg-fondo'}`}
                style={avatar === a ? { background: color } : undefined}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Color de fondo</legend>
          <div className="flex gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                aria-label={`Color ${c}`}
                onClick={() => setValue('color', c)}
                className={`size-9 rounded-full border border-borde ${color === c ? 'ring-3 ring-menta ring-offset-2' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>

        <Campo etiqueta="Nivel habilitado (RF-09 / RF-15)">
          <select className={claseEntrada} {...register('nivelHabilitado')}>
            <option value="1">Nivel 1 · Sonidos</option>
            <option value="2">Nivel 2 · Sílabas</option>
            <option value="3">Nivel 3 · Palabras</option>
          </select>
        </Campo>

        <Interruptor etiqueta="Perfil activo" descripcion="Un perfil desactivado no aparece en la sala." {...register('activo')} />
      </Tarjeta>

      <Tarjeta className="grid content-start gap-5">
        <h2 className="text-lg font-bold">Apoyos y accesibilidad</h2>
        <Campo etiqueta="Imágenes (RF-08)">
          <select className={claseEntrada} {...register('ajustes.modoImagen')}>
            <option value="foto">Fotografía real</option>
            <option value="picto">Pictograma</option>
            <option value="mixto">Mixto</option>
          </select>
        </Campo>
        <Campo etiqueta="Tamaño de letra">
          <select className={claseEntrada} {...register('ajustes.tamanoLetra')}>
            <option value="normal">Normal (28 px)</option>
            <option value="grande">Grande (32 px)</option>
            <option value="muy-grande">Muy grande (38 px)</option>
          </select>
        </Campo>
        <Campo etiqueta="Temática favorita (RF-22)">
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
        <Boton type="submit" disabled={formState.isSubmitting} className="px-6 py-3 text-base">
          {inicial ? 'Guardar cambios' : 'Crear estudiante'}
        </Boton>
        {formState.isSubmitSuccessful && inicial && <span role="status" className="font-semibold text-menta-oscuro">Cambios guardados.</span>}
      </div>
    </form>
  )
}

function Interruptor({ etiqueta, descripcion, ...input }: { etiqueta: string; descripcion?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" {...input} />
      <span className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-borde p-0.5 transition-colors peer-checked:bg-menta peer-focus-visible:outline-3 peer-focus-visible:outline-menta peer-checked:[&>span]:translate-x-5">
        <span className="block size-5 rounded-full bg-white shadow transition-transform" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{etiqueta}</span>
        {descripcion && <span className="block text-sm text-tinta-suave">{descripcion}</span>}
      </span>
    </label>
  )
}

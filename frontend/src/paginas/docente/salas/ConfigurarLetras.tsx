import { ALFABETO } from '../../../contenido/banco.ts'
import { PLANTILLAS_SISTEMA, letrasDe } from '../../../contenido/plantillas.ts'
import type { ParametrosJuego } from '../../../dominio/tipos.ts'

// Qué letras entran en una actividad configurable, dentro de su fila del plan.
// Los atajos (todas, vocales, consonantes, M P L S T) son los de la app; lo
// elegido queda en el plan al guardarlo.
export function ConfigurarLetras({ juegoId, parametros, alCambiar }: { juegoId: string; parametros: ParametrosJuego; alCambiar: (p: ParametrosJuego) => void }) {
  const letras = letrasDe(parametros)
  const poner = (nuevas: string[]) => alCambiar({ ...parametros, letras: nuevas })
  const igual = (a: string[]) => a.length === letras.length && a.every((l) => letras.includes(l))

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-borde bg-lienzo/60 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] text-tinta-suave">Elegir rápido:</span>
        {PLANTILLAS_SISTEMA.filter((p) => p.juegoId === juegoId).map((p) => {
          const elegida = igual(letrasDe(p.parametros))
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={elegida}
              onClick={() => poner(letrasDe(p.parametros))}
              className={`min-h-8 rounded-full border px-3 text-[13px] font-medium ${elegida ? 'border-menta-oscuro bg-menta-fondo text-menta-oscuro' : 'border-borde bg-white text-tinta hover:bg-lienzo'}`}
            >
              {p.nombre}
            </button>
          )
        })}
        <button type="button" onClick={() => poner([])} className="min-h-8 rounded-full px-3 text-[13px] font-medium text-tinta-suave hover:bg-white hover:text-tinta">
          Quitar todas
        </button>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13px] text-tinta-suave">
          Letras que aparecen: {letras.length} de {ALFABETO.length}
        </legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
          {ALFABETO.map((l) => {
            const activa = letras.includes(l.id)
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={activa}
                aria-label={`Letra ${l.grafema}`}
                title={`Suena: ${l.fonema}`}
                onClick={() => poner(activa ? letras.filter((x) => x !== l.id) : [...letras, l.id])}
                className={`grid h-10 place-items-center rounded-lg border font-escolar text-lg font-bold ${
                  activa ? 'border-menta-oscuro bg-menta-oscuro text-white' : 'border-borde bg-white text-tinta-suave hover:border-tinta-suave'
                }`}
              >
                {l.grafema}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

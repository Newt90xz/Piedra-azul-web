import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cuento, Trozo } from '../contenido/actividades.ts'
import { palabra } from '../contenido/banco.ts'
import { hablar } from '../lib/audio.ts'
import { Icono } from '../ui/Icono.tsx'
import { BotonNino, ImagenNino, useNino, useVozAlApuntar } from '../ui/nino.tsx'

// Módulo transversal (RF-18, RF-23): texto con apoyo pictográfico narrado.

const textoDe = (trozos: Trozo[]) => trozos.map((t) => (typeof t === 'string' ? t : palabra(t.palabra).texto)).join(' ').replace(/ ([.,])/g, '$1')

function Linea({ trozos }: { trozos: Trozo[] }) {
  return (
    <p className="flex flex-wrap items-end gap-x-3 gap-y-4 leading-snug">
      {trozos.map((t, i) => (typeof t === 'string' ? <span key={i}>{t}</span> : <PalabraConImagen key={i} id={t.palabra} />))}
    </p>
  )
}

function PalabraConImagen({ id }: { id: string }) {
  const w = palabra(id)
  return (
    <button {...useVozAlApuntar(w.texto)} onClick={() => hablar(w.texto)} className="inline-flex flex-col items-center rounded-2xl bg-nino-amarillo px-3 py-1" aria-label={w.texto}>
      <ImagenNino imagen={w.imagen} className="text-[1.6em]" />
      <span className="font-bold">{w.texto}</span>
    </button>
  )
}

function Barra({ alEscuchar }: { alEscuchar: () => void }) {
  const { estudiante } = useNino()
  const navegar = useNavigate()
  return (
    <div className="mb-6 flex gap-4">
      <BotonNino voz="Salir" onClick={() => navegar(`/aula/${estudiante.id}`)} className="grid size-20 place-items-center">
        <Icono nombre="casa" className="size-9" />
      </BotonNino>
      <BotonNino voz="Escuchar" onClick={alEscuchar} className="grid size-20 place-items-center border-nino-ok bg-nino-menta">
        <Icono nombre="altavoz" className="size-10" />
      </BotonNino>
    </div>
  )
}

export function LectorCuento({ cuento, alTerminar }: { cuento: Cuento; alTerminar: () => void }) {
  const [escena, setEscena] = useState(0)
  const actual = cuento.escenas[escena]
  const ultima = escena === cuento.escenas.length - 1

  useEffect(() => hablar(textoDe(actual)), [actual])

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <Barra alEscuchar={() => hablar(textoDe(actual))} />
      <article className="rounded-[2rem] border-3 border-nino-azul bg-white p-8">
        <Linea trozos={actual} />
      </article>
      <div className="mt-8 flex justify-between">
        <BotonNino voz="Atrás" disabled={escena === 0} onClick={() => setEscena(escena - 1)} className="grid size-24 place-items-center disabled:opacity-30">
          <Icono nombre="izquierda" className="size-12" />
        </BotonNino>
        <BotonNino
          voz={ultima ? 'Preguntas' : 'Siguiente'}
          onClick={() => (ultima ? alTerminar() : setEscena(escena + 1))}
          className="grid size-24 place-items-center border-nino-ok bg-nino-menta"
        >
          {ultima ? <span aria-hidden="true" className="text-[1.6em]">❓</span> : <Icono nombre="derecha" className="size-12" />}
        </BotonNino>
      </div>
    </main>
  )
}

export function LectorCancion({ versos }: { versos: Trozo[][] }) {
  const cantar = () => hablar(versos.map(textoDe).join(' '))
  useEffect(cantar, [versos])

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <Barra alEscuchar={cantar} />
      <article className="grid gap-6 rounded-[2rem] border-3 border-nino-azul bg-white p-8">
        {versos.map((v, i) => (
          <Linea key={i} trozos={v} />
        ))}
      </article>
    </main>
  )
}

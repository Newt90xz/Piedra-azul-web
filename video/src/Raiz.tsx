import { Composition } from 'remotion'
import { Recorrido, lineas } from './Recorrido.tsx'
import { FPS } from './linea.ts'

export function Raiz() {
  return (
    <>
      <Composition id="Recorrido" component={Recorrido} defaultProps={{ cual: 'completo' as const }} durationInFrames={lineas.completo.total} fps={FPS} width={1920} height={1080} />
      <Composition id="Corto" component={Recorrido} defaultProps={{ cual: 'corto' as const }} durationInFrames={lineas.corto.total} fps={FPS} width={1920} height={1080} />
    </>
  )
}

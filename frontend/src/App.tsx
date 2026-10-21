import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorSesion } from './app/Sesion.tsx'
import Inicio from './paginas/Inicio.tsx'
import Entrada from './paginas/alumno/Entrada.tsx'
import Emocion from './paginas/aula/Emocion.tsx'
import MiInicio from './paginas/aula/MiInicio.tsx'
import AvanceCurso from './paginas/docente/AvanceCurso.tsx'
import Entrar from './paginas/docente/Entrar.tsx'
import Estudiantes from './paginas/docente/Estudiantes.tsx'
import FichaEstudiante, { NuevoEstudiante } from './paginas/docente/FichaEstudiante.tsx'
import LayoutDocente from './paginas/docente/LayoutDocente.tsx'
import Panel from './paginas/docente/Panel.tsx'
import Salas from './paginas/docente/Salas.tsx'
import { NinoShell } from './ui/nino.tsx'

export default function App() {
  return (
    <ProveedorSesion>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />

          <Route path="/docente/entrar" element={<Entrar />} />
          <Route path="/docente" element={<LayoutDocente />}>
            <Route index element={<Panel />} />
            <Route path="estudiantes" element={<Estudiantes />} />
            <Route path="estudiantes/nuevo" element={<NuevoEstudiante />} />
            <Route path="estudiantes/:id" element={<FichaEstudiante />} />
            <Route path="avance" element={<AvanceCurso />} />
            <Route path="salas" element={<Salas />} />
          </Route>

          <Route path="/alumno" element={<Entrada />} />
          {/* El niño no elige actividad: su inicio muestra lo que le asignó la docente. */}
          <Route path="/aula" element={<Navigate to="/alumno" replace />} />
          <Route path="/aula/:id" element={<NinoShell />}>
            <Route index element={<MiInicio />} />
            <Route path="emocion" element={<Emocion />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProveedorSesion>
  )
}

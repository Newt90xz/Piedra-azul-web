import type { jsPDF } from 'jspdf'
import { nombreActividad } from '../contenido/contenidos.ts'
import type { Emocion, Estudiante, Observacion, RegistroEmocion, ResultadoActividad } from '../dominio/tipos.ts'
import {
  EMOCIONES,
  UMBRAL_LE_CUESTA,
  avancePorItem,
  deEstaSemana,
  detalleItem,
  fechaCorta,
  inicioSemana,
  minutos,
  porCategoria,
  respuestaLegible,
} from './avance.ts'
import { capitalizar } from './texto.ts'

// RF-17: el avance como PDF para imprimir o compartir: el del curso completo
// (semana actual) y el informe de cada estudiante (todo su historial). Se
// genera en el navegador con texto real (no una captura) y jsPDF se carga
// recién al pedir la descarga, para no sumar peso a la app.

type Color = [number, number, number]
const MARINO: Color = [23, 58, 94]
const MENTA: Color = [47, 158, 110]
const SUAVE: Color = [91, 111, 132]
const NARANJO: Color = [154, 77, 0]
const FONDO_FILA: Color = [242, 247, 251]
const FONDO_NARANJO: Color = [253, 241, 228]
const MARGEN = 15

const fechaLarga = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
const promedio = (rs: ResultadoActividad[]) => (rs.length ? rs.reduce((s, r) => s + r.estrellas, 0) / rs.length : 0)
const minutosDe = (rs: ResultadoActividad[]) => (rs.length ? minutos(rs.reduce((s, r) => s + r.duracionMs, 0)) : 0)

// ---------- Piezas comunes ----------

async function nuevoDocumento() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  return {
    doc,
    autoTable,
    ancho: doc.internal.pageSize.getWidth(),
    alto: doc.internal.pageSize.getHeight(),
    finalY: () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY,
  }
}

function encabezado(doc: jsPDF, ancho: number, titulo: string, subtitulo: string) {
  doc.setFillColor(...MARINO)
  doc.rect(0, 0, ancho, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold').setFontSize(9)
  doc.text('LEER PARA TODOS · LICEO PIEDRA AZUL', MARGEN, 10)
  doc.setFontSize(18)
  doc.text(titulo, MARGEN, 19)
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text(subtitulo, MARGEN, 24.5)
}

// Fila de números grandes con su explicación debajo.
function cifras(doc: jsPDF, ancho: number, valores: [string, string][], y: number) {
  const anchoCifra = (ancho - MARGEN * 2) / valores.length
  valores.forEach(([valor, texto], i) => {
    const x = MARGEN + i * anchoCifra
    doc.setTextColor(...MARINO).setFont('helvetica', 'bold').setFontSize(16)
    doc.text(valor, x, y)
    doc.setTextColor(...SUAVE).setFont('helvetica', 'normal').setFontSize(9)
    doc.text(texto, x, y + 5)
  })
}

// Título de sección; si no queda espacio en la hoja, empieza una nueva. Devuelve dónde sigue el contenido.
function seccion(doc: jsPDF, alto: number, texto: string, y: number, nota?: string) {
  if (y > alto - 45) {
    doc.addPage()
    y = 20
  }
  doc.setTextColor(...MARINO).setFont('helvetica', 'bold').setFontSize(13)
  doc.text(texto, MARGEN, y)
  if (!nota) return y + 4
  doc.setTextColor(...SUAVE).setFont('helvetica', 'normal').setFontSize(9)
  doc.text(nota, MARGEN, y + 5)
  return y + 8
}

function textoSuave(doc: jsPDF, texto: string, y: number) {
  doc.setTextColor(...MARINO).setFont('helvetica', 'normal').setFontSize(10)
  doc.text(texto, MARGEN, y + 4)
  return y + 8
}

function pieYGuardar(doc: jsPDF, ancho: number, alto: number, hoy: Date, archivo: string) {
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setTextColor(...SUAVE).setFont('helvetica', 'normal').setFontSize(8)
    doc.text(`Generado el ${fechaLarga(hoy)} a las ${hoy.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`, MARGEN, alto - 8)
    doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 8, { align: 'right' })
  }
  doc.save(`${archivo}-${hoy.toISOString().slice(0, 10)}.pdf`)
}

const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()

const ESTILO_TABLA = {
  headStyles: { fillColor: MENTA, textColor: 255, fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: FONDO_FILA },
  styles: { fontSize: 10, cellPadding: 2.5, textColor: MARINO },
}
const ESTILO_CUESTA = {
  headStyles: { fillColor: FONDO_NARANJO, textColor: NARANJO, fontStyle: 'bold' as const },
  styles: { fontSize: 9, cellPadding: 2.5, textColor: MARINO, valign: 'top' as const },
}

// ---------- Curso completo (semana actual) ----------

interface DatosCurso {
  curso: string
  estudiantes: Estudiante[]
  semana: ResultadoActividad[]
  emocionDe: Map<string, Emocion>
}

export async function descargarAvancePdf({ curso, estudiantes, semana, emocionDe }: DatosCurso) {
  const { doc, autoTable, ancho, alto, finalY } = await nuevoDocumento()
  const hoy = new Date()
  encabezado(doc, ancho, `Avance del curso: ${curso}`, `Semana del ${fechaLarga(inicioSemana(hoy))} al ${fechaLarga(hoy)}`)

  const activos = estudiantes.filter((e) => e.activo)
  const jugaron = new Set(semana.map((r) => r.estudianteId))
  cifras(
    doc,
    ancho,
    [
      [`${jugaron.size} de ${activos.length}`, 'estudiantes jugaron'],
      [String(semana.length), 'partidas'],
      [String(minutosDe(semana)), 'minutos en total'],
    ],
    40,
  )

  autoTable(doc, {
    startY: seccion(doc, alto, 'Participación de la semana', 56),
    margin: { left: MARGEN, right: MARGEN },
    head: [['Estudiante', 'Partidas', 'Minutos', 'Estrellas promedio', 'Última emoción']],
    body: estudiantes.map((e) => {
      const propias = semana.filter((r) => r.estudianteId === e.id)
      const emocion = emocionDe.get(e.id)
      return [
        e.activo ? e.nombre : `${e.nombre} (desactivado)`,
        String(propias.length),
        String(minutosDe(propias)),
        propias.length ? `${promedio(propias).toFixed(1)} de 3` : '—',
        emocion ? EMOCIONES[emocion].texto : '—',
      ]
    }),
    ...ESTILO_TABLA,
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
  })

  // Lo que más le cuesta: cada ítem bajo el umbral, a quién le cuesta y con qué se confunden.
  const grupos = porCategoria(avancePorItem(semana).filter((a) => a.tasa < UMBRAL_LE_CUESTA))
  const y = seccion(
    doc,
    alto,
    'Lo que más le cuesta al curso',
    finalY() + 12,
    `Menos del ${Math.round(UMBRAL_LE_CUESTA * 100)} % de las rondas resueltas al primer intento esta semana.`,
  )
  if (grupos.length === 0) textoSuave(doc, 'Nada por ahora.', y)
  else
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Categoría', 'Ítem', '1.er intento', 'Les cuesta a', 'Se confundieron con']],
      body: grupos.flatMap((g) =>
        g.items.map((a) => {
          const d = detalleItem(semana, a.categoria, a.item)
          const porNino = estudiantes
            .map((e) => {
              const propias = d.historial.filter((h) => h.estudianteId === e.id)
              return { e, tasa: propias.length ? propias.filter((h) => h.intentos === 1).length / propias.length : 1 }
            })
            .filter((x) => x.tasa < UMBRAL_LE_CUESTA)
            .sort((p, q) => p.tasa - q.tasa)
          return [
            g.titulo,
            capitalizar(a.item),
            `${Math.round(a.tasa * 100)} % de ${a.rondas}`,
            porNino.map((x) => `${x.e.nombre} (${Math.round(x.tasa * 100)} %)`).join(', ') || '—',
            errores(d, a.categoria === 'conteo'),
          ]
        }),
      ),
      ...ESTILO_CUESTA,
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 24, fontStyle: 'bold' }, 2: { cellWidth: 22 } },
    })

  pieYGuardar(doc, ancho, alto, hoy, `avance-${sinTildes(curso)}`)
}

const errores = (d: ReturnType<typeof detalleItem>, conteo: boolean) =>
  d.errores
    .slice(0, 4)
    .map((er) => `${respuestaLegible(er.respuesta, conteo)} ×${er.veces}`)
    .join(', ') || '—'

// ---------- Informe de un estudiante (todo su historial) ----------

interface DatosEstudiante {
  curso: string
  estudiante: Estudiante
  resultados: ResultadoActividad[]
  emociones: RegistroEmocion[]
  observaciones: Observacion[]
}

const NIVELES = { 1: 'Sonidos', 2: 'Sílabas', 3: 'Palabras' } as const

export async function descargarEstudiantePdf({ curso, estudiante, resultados, emociones, observaciones }: DatosEstudiante) {
  const { doc, autoTable, ancho, alto, finalY } = await nuevoDocumento()
  const hoy = new Date()
  const desde = resultados.length ? new Date(Math.min(...resultados.map((r) => new Date(r.fecha).getTime()))) : null
  encabezado(
    doc,
    ancho,
    `Informe de avance: ${estudiante.nombre}`,
    `${curso} · Nivel ${estudiante.nivelHabilitado} (${NIVELES[estudiante.nivelHabilitado]})${desde ? ` · Desde el ${fechaLarga(desde)}` : ''}`,
  )

  const semana = deEstaSemana(resultados)
  cifras(
    doc,
    ancho,
    [
      [String(resultados.length), 'partidas en total'],
      [String(minutosDe(resultados)), 'minutos jugados'],
      [resultados.length ? `${promedio(resultados).toFixed(1)} de 3` : '—', 'estrellas promedio'],
      [String(semana.length), 'partidas esta semana'],
    ],
    40,
  )

  // Cómo llega a las sesiones: cuántas veces cada emoción y las últimas.
  let y = seccion(doc, alto, '¿Cómo llega a las sesiones?', 56)
  if (emociones.length === 0) y = textoSuave(doc, 'Aún no registra emociones.', y)
  else {
    const veces = (Object.keys(EMOCIONES) as Emocion[])
      .map((e) => [EMOCIONES[e].texto, emociones.filter((r) => r.emocion === e).length] as const)
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `${t}: ${n}`)
      .join('   ·   ')
    y = textoSuave(doc, veces, y)
    doc.setTextColor(...SUAVE).setFontSize(9)
    const ultimas = emociones
      .slice(0, 8)
      .map((e) => `${EMOCIONES[e.emocion].texto} (${fechaCorta(e.fecha)})`)
      .join(', ')
    const lineas = doc.splitTextToSize(`Últimas: ${ultimas}`, ancho - MARGEN * 2) as string[]
    doc.text(lineas, MARGEN, y + 1)
    y += lineas.length * 4 + 4
  }

  // Avance por letra, sílaba o palabra, de lo más difícil a lo más fácil.
  const items = avancePorItem(resultados)
  y = seccion(doc, alto, 'Avance por categoría', y + 6, 'Porcentaje de rondas resueltas al primer intento, de lo más difícil a lo más fácil.')
  if (items.length === 0) y = textoSuave(doc, 'Todavía no hay partidas registradas.', y)
  else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Categoría', 'Ítem', '1.er intento', 'Rondas', 'Estado', 'Se confundió con']],
      body: porCategoria(items).flatMap((g) =>
        g.items.map((a) => [
          g.titulo,
          capitalizar(a.item),
          `${Math.round(a.tasa * 100)} %`,
          String(a.rondas),
          a.tasa < UMBRAL_LE_CUESTA ? 'Le cuesta' : 'Logrado',
          errores(detalleItem(resultados, a.categoria, a.item), a.categoria === 'conteo'),
        ]),
      ),
      ...ESTILO_TABLA,
      styles: { ...ESTILO_TABLA.styles, fontSize: 9 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 24, fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      // «Le cuesta» en naranjo para encontrarlo de un vistazo.
      didParseCell: (c) => {
        if (c.section === 'body' && c.column.index === 4 && c.cell.raw === 'Le cuesta') {
          c.cell.styles.textColor = NARANJO
          c.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = finalY() + 12
  }

  // Últimas partidas
  y = seccion(doc, alto, 'Últimas partidas', y)
  if (resultados.length === 0) y = textoSuave(doc, 'Sin partidas.', y)
  else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Fecha', 'Actividad', 'Minutos', 'Estrellas']],
      body: resultados.slice(0, 10).map((r) => [fechaCorta(r.fecha), nombreActividad(r.actividadId), String(minutos(r.duracionMs)), `${r.estrellas} de 3`]),
      ...ESTILO_TABLA,
      styles: { ...ESTILO_TABLA.styles, fontSize: 9 },
      columnStyles: { 0: { cellWidth: 30 }, 2: { halign: 'center', cellWidth: 22 }, 3: { halign: 'center', cellWidth: 24 } },
    })
    y = finalY() + 12
  }

  // Observaciones de la docente
  if (observaciones.length > 0) {
    autoTable(doc, {
      startY: seccion(doc, alto, 'Observaciones de la docente', y),
      margin: { left: MARGEN, right: MARGEN },
      head: [['Fecha', 'Observación']],
      body: observaciones.slice(0, 10).map((o) => [fechaCorta(o.fecha), o.texto]),
      ...ESTILO_TABLA,
      styles: { ...ESTILO_TABLA.styles, fontSize: 9, valign: 'top' },
      columnStyles: { 0: { cellWidth: 30 } },
    })
  }

  pieYGuardar(doc, ancho, alto, hoy, `informe-${sinTildes(estudiante.nombre)}-${sinTildes(curso)}`)
}

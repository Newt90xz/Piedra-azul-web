import type { Emocion, Estudiante, ResultadoActividad } from '../dominio/tipos.ts'
import { EMOCIONES, UMBRAL_LE_CUESTA, avancePorItem, detalleItem, inicioSemana, minutos, porCategoria, respuestaLegible } from './avance.ts'
import { capitalizar } from './texto.ts'

// RF-17: el avance semanal del curso como PDF para imprimir o compartir.
// Se genera en el navegador con texto real (no una captura) y jsPDF se carga
// recién al pedir la descarga, para no sumar peso a la app.

interface DatosPdf {
  curso: string
  estudiantes: Estudiante[]
  semana: ResultadoActividad[]
  emocionDe: Map<string, Emocion>
}

const MARINO: [number, number, number] = [23, 58, 94]
const MENTA: [number, number, number] = [47, 158, 110]
const SUAVE: [number, number, number] = [91, 111, 132]
const NARANJO: [number, number, number] = [154, 77, 0]
const MARGEN = 15

const fechaLarga = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

export async function descargarAvancePdf({ curso, estudiantes, semana, emocionDe }: DatosPdf) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  const hoy = new Date()

  // Encabezado
  doc.setFillColor(...MARINO)
  doc.rect(0, 0, ancho, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold').setFontSize(9)
  doc.text('LEER PARA TODOS · LICEO PIEDRA AZUL', MARGEN, 10)
  doc.setFontSize(18)
  doc.text(`Avance del curso: ${curso}`, MARGEN, 19)
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text(`Semana del ${fechaLarga(inicioSemana(hoy))} al ${fechaLarga(hoy)}`, MARGEN, 24.5)

  // Resumen en cifras
  const activos = estudiantes.filter((e) => e.activo)
  const jugaron = new Set(semana.map((r) => r.estudianteId))
  const cifras: [string, string][] = [
    [`${jugaron.size} de ${activos.length}`, 'estudiantes jugaron'],
    [String(semana.length), 'partidas'],
    [String(semana.length ? minutos(semana.reduce((s, r) => s + r.duracionMs, 0)) : 0), 'minutos en total'],
  ]
  const anchoCifra = (ancho - MARGEN * 2) / cifras.length
  cifras.forEach(([valor, texto], i) => {
    const x = MARGEN + i * anchoCifra
    doc.setTextColor(...MARINO).setFont('helvetica', 'bold').setFontSize(16)
    doc.text(valor, x, 40)
    doc.setTextColor(...SUAVE).setFont('helvetica', 'normal').setFontSize(9)
    doc.text(texto, x, 45)
  })

  // Participación por estudiante
  titulo(doc, 'Participación de la semana', 56)
  autoTable(doc, {
    startY: 60,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Estudiante', 'Partidas', 'Minutos', 'Estrellas promedio', 'Última emoción']],
    body: estudiantes.map((e) => {
      const propias = semana.filter((r) => r.estudianteId === e.id)
      const prom = propias.length ? propias.reduce((s, r) => s + r.estrellas, 0) / propias.length : 0
      const emocion = emocionDe.get(e.id)
      return [
        e.activo ? e.nombre : `${e.nombre} (desactivado)`,
        String(propias.length),
        String(propias.length ? minutos(propias.reduce((s, r) => s + r.duracionMs, 0)) : 0),
        propias.length ? `${prom.toFixed(1)} de 3` : '—',
        emocion ? EMOCIONES[emocion].texto : '—',
      ]
    }),
    headStyles: { fillColor: MENTA, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [242, 247, 251] },
    styles: { fontSize: 10, cellPadding: 2.5, textColor: MARINO },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
  })

  // Lo que más le cuesta: cada ítem bajo el umbral, a quién le cuesta y con qué se confunden.
  const grupos = porCategoria(avancePorItem(semana).filter((a) => a.tasa < UMBRAL_LE_CUESTA))
  let y = finalY() + 12
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    y = 20
  }
  titulo(doc, 'Lo que más le cuesta al curso', y)
  doc.setTextColor(...SUAVE).setFont('helvetica', 'normal').setFontSize(9)
  doc.text(`Menos del ${Math.round(UMBRAL_LE_CUESTA * 100)} % de las rondas resueltas al primer intento esta semana.`, MARGEN, y + 5)
  if (grupos.length === 0) {
    doc.setTextColor(...MARINO).setFontSize(10)
    doc.text('Nada por ahora.', MARGEN, y + 12)
  } else {
    autoTable(doc, {
      startY: y + 8,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Categoría', 'Ítem', '1.er intento', 'Les cuesta a', 'Se confundieron con']],
      body: grupos.flatMap((g) =>
        g.items.map((a) => {
          const d = detalleItem(semana, a.categoria, a.item)
          const conteo = a.categoria === 'conteo'
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
            d.errores
              .slice(0, 4)
              .map((er) => `${respuestaLegible(er.respuesta, conteo)} ×${er.veces}`)
              .join(', ') || '—',
          ]
        }),
      ),
      headStyles: { fillColor: [253, 241, 228], textColor: NARANJO, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5, textColor: MARINO, valign: 'top' },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 24, fontStyle: 'bold' }, 2: { cellWidth: 22 } },
    })
  }

  // Pie de página en todas las hojas
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setTextColor(...SUAVE).setFont('helvetica', 'normal').setFontSize(8)
    const alto = doc.internal.pageSize.getHeight()
    doc.text(`Generado el ${fechaLarga(hoy)} a las ${hoy.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`, MARGEN, alto - 8)
    doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 8, { align: 'right' })
  }

  const archivo = `avance-${curso.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${hoy.toISOString().slice(0, 10)}.pdf`
  doc.save(archivo)
}

function titulo(doc: import('jspdf').jsPDF, texto: string, y: number) {
  doc.setTextColor(...MARINO).setFont('helvetica', 'bold').setFontSize(13)
  doc.text(texto, MARGEN, y)
}

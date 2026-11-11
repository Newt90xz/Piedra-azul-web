// La línea de tiempo del video, como datos puros (sin React): la usan la edición en
// Remotion y el script que escribe subtitulos.srt. Los cortes se dan con las marcas de
// cada toma, no con segundos a mano: si una toma se vuelve a grabar, el corte se mueve con ella.

export const FPS = 30

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
// Un trozo de una toma: desde qué segundo, a qué velocidad y qué parte del cuadro se ve.
export interface Recorte {
  toma: string
  desde: number
  vel?: number
  ventana?: Rect | { de: Rect; a: Rect; en?: number; dur?: number }
  // Círculo que destaca un punto (en coordenadas de la toma).
  resalte?: { x: number; y: number; r: number; en?: number; dur?: number }
}
export type Capa =
  | { tipo: 'rotulo'; numero: string; titulo: string }
  | { tipo: 'pantalla'; fuente: Recorte }
  | { tipo: 'nino'; fuente: Recorte; etiqueta?: string }
  | { tipo: 'dividida'; nino: Recorte; educadora: Recorte; linea?: { en: number; dur?: number; de: [number, number] } }
  | { tipo: 'ninos'; izquierda: Recorte; derecha: Recorte; etiquetas: [string, string] }
  | { tipo: 'ilustracion'; cual: 'aula' | 'apoyo' }
  | { tipo: 'diagrama'; vivo?: boolean }
  | { tipo: 'cierre' }

export interface Plano {
  id: string
  dur: number
  capa: Capa
  // Parte de la voz en off que empieza en este plano (puede seguir sobre los siguientes).
  vo?: string
  voEn?: number
  // Volumen del audio de la app en este plano (1 por defecto; bajo la voz en off se atenúa solo).
  app?: number
  porque?: { texto: string; en?: number; dur?: number }
  txt?: { texto: string; estilo: 'tercio' | 'grande' | 'nota'; en?: number; dur?: number }
}

interface Toma {
  ancho: number
  alto: number
  duracion: number
  inicio: number
  audio: boolean
  marcas: { t: number; etiqueta: string }[]
  frases: { t: number; fin: number; texto: string }[]
}
export interface Datos {
  tomas: Record<string, Toma>
  voz: Record<string, { duracion: number; texto: string }>
  musica: number
}

export interface Subtitulo {
  desde: number
  hasta: number
  texto: string
  de: 'vo' | 'app'
}

// Encuadres de la pantalla de la educadora (1920×1080, 16:9).
const SALAS: Rect = { x: 410, y: 262, w: 1400, h: 788 }
const TARJETAS: Rect = { x: 400, y: 360, w: 1160, h: 652 }
const MODAL: Rect = { x: 330, y: 130, w: 1260, h: 709 }
const MODAL_ARRIBA: Rect = { x: 330, y: 40, w: 1260, h: 709 }
const TODO: Rect = { x: 0, y: 0, w: 1920, h: 1080 }

export function construir(datos: Datos, cual: 'completo' | 'corto' = 'completo') {
  const { tomas, voz } = datos
  // Segundo de una marca en una toma (+ un margen).
  const m = (toma: string, etiqueta: string, delta = 0) => {
    const marca = tomas[toma]?.marcas.find((x) => x.etiqueta === etiqueta || x.etiqueta.startsWith(etiqueta))
    if (!marca) throw new Error(`No existe la marca «${etiqueta}» en ${toma}`)
    return marca.t + delta
  }
  // El mismo instante real en otra pantalla grabada a la vez.
  const sinc = (de: string, a: string, t: number) => t + (tomas[de].inicio - tomas[a].inicio) / 1000
  const v = (id: string) => voz[id].duracion

  const S = 'c05-sofia'
  const E5 = 'c05-educadora'
  const A = 'c08-sofia'
  const T = 'c08-tomas'
  const E8 = 'c08-educadora'
  const F = 'c12-sofia'
  const R = 'c13-sofia'
  const L = 'c13-lucas'
  const E13 = 'c13-educadora'
  const M17 = 'c17-metricas'
  const lento = (segundos: number, dur: number) => segundos / dur

  const planos: Plano[] = [
    // 0 · Gancho
    { id: 'gancho-aula', dur: 5.4, capa: { tipo: 'ilustracion', cual: 'aula' }, vo: 'gancho', voEn: 0.5 },
    { id: 'gancho-grilla', dur: Math.max(3.6, v('gancho') - 4.6), capa: { tipo: 'nino', fuente: { toma: 'c05-tomas', desde: m('c05-tomas', 'c5', 1.0) } }, app: 0 },

    // 1 · Presentación
    { id: 'presentacion', dur: v('presentacion') + 1.2, capa: { tipo: 'pantalla', fuente: { toma: 'c01-portada', desde: m('c01-portada', 'portada', -1.2) } }, vo: 'presentacion', voEn: 0.5, txt: { texto: 'Leer para Todos · Liceo Piedra Azul', estilo: 'tercio', en: 4.5, dur: 5 } },

    // Acto 1 · Antes de la clase
    { id: 'r1', dur: 1.6, capa: { tipo: 'rotulo', numero: '1', titulo: 'Antes de la clase' } },
    { id: '1a-lista', dur: 2.9, capa: { tipo: 'pantalla', fuente: { toma: 'c02-perfil-martina', desde: m('c02-perfil-martina', 'estudiantes', 0.3) } }, vo: 'acto1a', voEn: 0.3 },
    { id: '1a-perfil', dur: 3.1, capa: { tipo: 'pantalla', fuente: { toma: 'c02-perfil-martina', desde: m('c02-perfil-martina', 'perfil', -0.7), vel: 1.25 } } },
    {
      id: '1a-exigencia',
      dur: 4.6,
      capa: { tipo: 'pantalla', fuente: { toma: 'c02-perfil-martina', desde: m('c02-perfil-martina', 'exigencia', -0.2), ventana: { de: TODO, a: { x: 330, y: 470, w: 1000, h: 563 }, en: 0.2, dur: 1.2 } } },
      porque: { texto: 'La actividad es la misma para todos. Lo que cambia es la ayuda.', en: 1.3, dur: 3.2 },
    },
    { id: '1a-apoyos', dur: 3.0, capa: { tipo: 'pantalla', fuente: { toma: 'c02-perfil-martina', desde: m('c02-perfil-martina', 'apoyos', 0.2), vel: 1.8, ventana: { x: 920, y: 60, w: 1000, h: 563 } } } },

    { id: '1b-sala', dur: 3.7, capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'salas', 0.4), vel: 2.2 } }, vo: 'acto1b-1', voEn: 0.3 },
    { id: '1b-plan', dur: 4.2, capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'sala-creada', 0.8), vel: 1.5 } } },
    { id: '1b-letras', dur: Math.max(4.6, v('acto1b-1') - 7.4), capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'configurar', 0.2), vel: lento(m('c03-sala-y-plan', 'mas-b', 1.0) - m('c03-sala-y-plan', 'configurar', 0.2), Math.max(4.6, v('acto1b-1') - 7.4)), ventana: { de: TODO, a: MODAL, en: 0, dur: 1 } } } },
    {
      id: '1b-aviso',
      dur: v('acto1b-2') + 1.5,
      capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'mas-b', 1.0), vel: lento(m('c03-sala-y-plan', 'aviso-bv', 2.6) - m('c03-sala-y-plan', 'mas-b', 1.0), v('acto1b-2') + 1.5), ventana: MODAL, resalte: { x: 840, y: 660, r: 210, en: (v('acto1b-2') + 1.5) * 0.66, dur: 2 } } },
      vo: 'acto1b-2',
      voEn: 0.4,
    },
    { id: '1b-plantilla', dur: 4.6, capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'letras-listas', -2.4), vel: lento(m('c03-sala-y-plan', 'plantilla-guardada', 1.2) - m('c03-sala-y-plan', 'letras-listas', -2.4), 4.6), ventana: MODAL } }, vo: 'acto1b-3', voEn: 0.5 },
    { id: '1b-agregar', dur: 3.0, capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'en-el-plan', -1.6), vel: 1.5, ventana: MODAL_ARRIBA } } },
    {
      id: '1b-guardado',
      dur: 3.6,
      capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'plan-guardado', -1.2), ventana: { de: TODO, a: TARJETAS, en: 1.2, dur: 1 } } },
      porque: { texto: 'La educadora decide el contenido. El niño nunca tiene que elegir qué estudiar.', en: 0.6, dur: 3.4 },
    },

    { id: '1c-recreo', dur: v('acto1c') + 1.0, capa: { tipo: 'pantalla', fuente: { toma: 'c03-sala-y-plan', desde: m('c03-sala-y-plan', 'c4', 0.7), vel: lento(m('c03-sala-y-plan', 'parque', 1.4) - m('c03-sala-y-plan', 'c4', 0.7), v('acto1c') + 1.0), ventana: TARJETAS } }, vo: 'acto1c', voEn: 0.3 },
    { id: '1c-diagrama', dur: 2.2, capa: { tipo: 'diagrama' } },

    // Acto 2 · Llega el niño
    { id: 'r2', dur: 1.6, capa: { tipo: 'rotulo', numero: '2', titulo: 'Llega el niño' } },
    { id: '2-quien', dur: 4.3, capa: { tipo: 'nino', fuente: { toma: S, desde: m(S, 'c5', 0.9) }, etiqueta: 'Computador de Sofía' } },
    { id: '2-grilla', dur: v('acto2-1') + 0.5, capa: { tipo: 'nino', fuente: { toma: S, desde: m(S, 'grilla', -2.6), vel: lento(2.9, v('acto2-1') + 0.5) }, etiqueta: 'Computador de Sofía' }, vo: 'acto2-1', voEn: 0.2, app: 0 },
    { id: '2-hola', dur: 3.1, capa: { tipo: 'nino', fuente: { toma: S, desde: m(S, 'saludo', -1.1) }, etiqueta: 'Computador de Sofía' } },
    { id: '2-pregunta', dur: 2.3, capa: { tipo: 'nino', fuente: { toma: S, desde: m(S, 'emocion', -0.4) }, etiqueta: 'Computador de Sofía' } },
    {
      id: '2-emocion',
      dur: v('acto2-2') + 1.6,
      capa: { tipo: 'nino', fuente: { toma: S, desde: m(S, 'emocion-elegida', -(v('acto2-2') + 1.3)) }, etiqueta: 'Computador de Sofía' },
      vo: 'acto2-2',
      voEn: 0.2,
      porque: { texto: 'La emoción con que llega queda registrada para la educadora.', en: 0.8, dur: v('acto2-2') + 0.6 },
    },
    { id: '2-espera', dur: v('acto2-3') + 3.0, capa: { tipo: 'nino', fuente: { toma: S, desde: m(S, 'espera', 0.1) }, etiqueta: 'Computador de Sofía' }, vo: 'acto2-3', voEn: 2.4 },
    {
      id: '2-candado',
      dur: 2.8,
      capa: { tipo: 'nino', fuente: { toma: 'c05-tomas', desde: m('c05-tomas', 'candado', 0.2), ventana: { de: { x: 0, y: 0, w: 1280, h: 800 }, a: { x: 560, y: 20, w: 720, h: 450 }, en: 0.3, dur: 0.9 } }, etiqueta: 'Otro computador' },
      app: 0,
      txt: { texto: 'En otro computador, su personaje queda con candado: nadie más puede usar su perfil.', estilo: 'nota' },
    },
    {
      id: '2-en-recreo',
      dur: 3.2,
      capa: { tipo: 'dividida', nino: { toma: S, desde: sinc(E5, S, m(E5, 'sofia-en-recreo', 0.6)) }, educadora: { toma: E5, desde: m(E5, 'sofia-en-recreo', 0.6), ventana: SALAS, resalte: { x: 540, y: 368, r: 120, en: 0.5, dur: 3 } } },
      txt: { texto: 'En el computador de la educadora, Sofía aparece con el punto verde.', estilo: 'nota' },
    },

    // Acto 3 · La educadora mueve las piezas
    { id: 'r3', dur: 1.6, capa: { tipo: 'rotulo', numero: '3', titulo: 'La educadora mueve las piezas' } },
    {
      id: '3-arrastre',
      dur: Math.max(9.6, v('acto3') + 1.2),
      capa: { tipo: 'dividida', nino: { toma: S, desde: sinc(E5, S, m(E5, 'c7', 0.4)) }, educadora: { toma: E5, desde: m(E5, 'c7', 0.4), ventana: SALAS }, linea: { en: m(E5, 'sofia-soltada', -0.9) - m(E5, 'c7', 0.4), dur: 1.3, de: [630, 640] } },
      vo: 'acto3',
      voEn: 0.4,
    },
    { id: '3-tomas', dur: 1.3, capa: { tipo: 'pantalla', fuente: { toma: E5, desde: m(E5, 'arrastra-Tomás', 1.9), ventana: SALAS } } },
    { id: '3-martina', dur: 1.3, capa: { tipo: 'pantalla', fuente: { toma: E5, desde: m(E5, 'arrastra-Martina', 1.9), ventana: SALAS } }, txt: { texto: 'También sin arrastrar: clic en el niño y luego clic en la sala.', estilo: 'nota', dur: 5.2 } },
    { id: '3-todos', dur: 2.0, capa: { tipo: 'pantalla', fuente: { toma: E5, desde: m(E5, 'todos-en-sala', 0.6), ventana: SALAS } } },

    // Acto 4 · La actividad de letras
    { id: 'r4', dur: 1.6, capa: { tipo: 'rotulo', numero: '4', titulo: 'La actividad de letras' } },
    { id: '4-camino', dur: v('acto4-1') + 0.6, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'empezar', -2.6), vel: lento(2.2, v('acto4-1') + 0.6) }, etiqueta: 'Computador de Sofía' }, vo: 'acto4-1', voEn: 0.2, app: 0 },
    { id: '4-como', dur: 2.9, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'empezar', -0.5) }, etiqueta: 'Computador de Sofía' } },
    { id: '4-consigna', dur: 3.7, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'ronda Ronda 1', -4.3) }, etiqueta: 'Computador de Sofía' } },
    { id: '4-duda', dur: v('acto4-2') + 0.5, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'ronda Ronda 1', -0.6), vel: lento(1.4, v('acto4-2') + 0.5) }, etiqueta: 'Computador de Sofía' }, vo: 'acto4-2', voEn: 0.2, app: 0 },
    { id: '4-error', dur: 3.6, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'error', -0.9) }, etiqueta: 'Computador de Sofía' } },
    { id: '4-acierto', dur: 3.0, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'acierto', -0.9) }, etiqueta: 'Computador de Sofía' } },
    { id: '4-racha-1', dur: 1.5, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'ronda Ronda 2', 0.9) }, etiqueta: 'Computador de Sofía' }, vo: 'acto4-3', voEn: 0.1 },
    { id: '4-racha-2', dur: 1.5, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'ronda Ronda 3', 0.9) }, etiqueta: 'Computador de Sofía' } },
    { id: '4-racha-3', dur: Math.max(1.5, v('acto4-3') - 2.8), capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'ronda Ronda 4', 0.9) }, etiqueta: 'Computador de Sofía' } },
    { id: '4-premio', dur: 4.7, capa: { tipo: 'nino', fuente: { toma: A, desde: m(A, 'premio', -0.3) }, etiqueta: 'Computador de Sofía' } },
    {
      id: '4-comparacion',
      dur: v('acto4-4') + 1.4,
      capa: { tipo: 'ninos', izquierda: { toma: 'c08-martina', desde: m('c08-martina', 'comparacion', 0.4) }, derecha: { toma: 'c08-benjamin', desde: m('c08-benjamin', 'comparacion', 0.4) }, etiquetas: ['Martina · Inicial', 'Benjamín · Avanzado'] },
      vo: 'acto4-4',
      voEn: 0.3,
      porque: { texto: 'Nunca más de 4 opciones en pantalla y todo se escucha: así puede jugar un niño que todavía no lee.', en: 1.6, dur: v('acto4-4') - 0.4 },
    },
    { id: '4-fila', dur: v('acto4-5') + 1.2, capa: { tipo: 'pantalla', fuente: { toma: E8, desde: m(E8, 'tomas-intento-1', 5), ventana: { de: TODO, a: { x: 400, y: 330, w: 1000, h: 563 }, en: 0.2, dur: 1 } } }, vo: 'acto4-5', voEn: 0.3 },

    // Acto 5 · Nadie se queda atrás
    { id: 'r5', dur: 1.6, capa: { tipo: 'rotulo', numero: '5', titulo: 'Nadie se queda atrás' } },
    { id: '5-tomas-error', dur: 3.0, capa: { tipo: 'nino', fuente: { toma: T, desde: m(T, 'error B', -0.9) }, etiqueta: 'Computador de Tomás' } },
    { id: '5-repetir', dur: v('acto5-1') - 0.6, capa: { tipo: 'nino', fuente: { toma: T, desde: m(T, 'intento-2-repetir', 0.2) }, etiqueta: 'Computador de Tomás' }, vo: 'acto5-1', voEn: 0.2 },
    { id: '5-aviso', dur: 3.8, capa: { tipo: 'pantalla', fuente: { toma: E8, desde: m(E8, 'aviso', 1.6), ventana: { x: 400, y: 230, w: 1100, h: 619 }, resalte: { x: 668, y: 428, r: 250, en: 0.5, dur: 3 } } } },
    { id: '5-apoyo', dur: 2.4, capa: { tipo: 'ilustracion', cual: 'apoyo' } },
    { id: '5-listo', dur: 2.1, capa: { tipo: 'pantalla', fuente: { toma: E8, desde: m(E8, 'listo', -1.7), ventana: SALAS } } },
    { id: '5-ultima', dur: v('acto5-2') + 0.4, capa: { tipo: 'nino', fuente: { toma: F, desde: m(F, 'premio-final', -(v('acto5-2') + 0.6)) }, etiqueta: 'Computador de Sofía' }, vo: 'acto5-2', voEn: 0.2, app: 0.5 },
    { id: '5-trofeo', dur: 3.8, capa: { tipo: 'nino', fuente: { toma: F, desde: m(F, 'trofeo', -0.5) }, etiqueta: 'Computador de Sofía' } },
    { id: '5-al-recreo', dur: 4.8, capa: { tipo: 'nino', fuente: { toma: F, desde: m(F, 'parque', -2.0) }, etiqueta: 'Computador de Sofía' } },
    { id: '5-salas', dur: 4.2, capa: { tipo: 'pantalla', fuente: { toma: 'c12-educadora', desde: m('c12-educadora', 'sofia-en-recreo', 1.6), ventana: { x: 410, y: 330, w: 1250, h: 703 } } }, vo: 'acto5-3', voEn: 0.3 },
    { id: '5-diagrama', dur: Math.max(4.4, v('acto5-3') - 3.4), capa: { tipo: 'diagrama', vivo: true }, txt: { texto: 'Los que terminan descansan. Los que necesitan ayuda, la reciben.', estilo: 'grande', en: 1.0 } },

    // Acto 6 · El recreo
    { id: 'r6', dur: 1.6, capa: { tipo: 'rotulo', numero: '6', titulo: 'El recreo' } },
    { id: '6-parque', dur: v('acto6-1') + 0.6, capa: { tipo: 'nino', fuente: { toma: R, desde: m(R, 'sofia-al-columpio', -1.0) }, etiqueta: 'Computador de Sofía' }, vo: 'acto6-1', voEn: 0.3, app: 0.6 },
    { id: '6-jugamos', dur: 2.8, capa: { tipo: 'ninos', izquierda: { toma: R, desde: m(R, 'sofia-jugamos', -0.7) }, derecha: { toma: L, desde: sinc(R, L, m(R, 'sofia-jugamos', -0.7)) }, etiquetas: ['Sofía', 'Lucas'] } },
    { id: '6-hola', dur: 2.7, capa: { tipo: 'ninos', izquierda: { toma: R, desde: sinc(L, R, m(L, 'lucas-hola', -0.9)) }, derecha: { toma: L, desde: m(L, 'lucas-hola', -0.9) }, etiquetas: ['Sofía', 'Lucas'] } },
    { id: '6-saludos', dur: 2.6, capa: { tipo: 'pantalla', fuente: { toma: E13, desde: m(E13, 'ultimos-saludos', 1.4), ventana: { x: 640, y: 350, w: 1200, h: 675 }, resalte: { x: 1085, y: 665, r: 200, en: 0.4, dur: 2.6 } } }, txt: { texto: 'La educadora ve los últimos saludos de cada niño.', estilo: 'nota' } },
    {
      id: '6-tienda',
      dur: v('acto6-2') + 0.8,
      capa: { tipo: 'nino', fuente: { toma: R, desde: m(R, 'tienda', 2.6) }, etiqueta: 'Computador de Sofía' },
      vo: 'acto6-2',
      voEn: 0.3,
      porque: { texto: 'Las monedas se ganan aprendiendo y se gastan en el recreo: el premio motiva sin interrumpir la clase.', en: 0.9, dur: v('acto6-2') - 0.2 },
    },
    { id: '6-probar', dur: 3.5, capa: { tipo: 'nino', fuente: { toma: R, desde: m(R, 'probando', -3.2) }, etiqueta: 'Computador de Sofía' } },
    { id: '6-comprar', dur: 3.0, capa: { tipo: 'nino', fuente: { toma: R, desde: m(R, 'comprado', -1.3) }, etiqueta: 'Computador de Sofía' } },
    {
      id: '6-dibujo',
      dur: Math.max(8.2, v('acto6-3') + 1.0),
      capa: { tipo: 'dividida', nino: { toma: R, desde: sinc(E13, R, m(E13, 'clic-dibujo', -1.9)) }, educadora: { toma: E13, desde: m(E13, 'clic-dibujo', -1.9), ventana: { x: 640, y: 350, w: 1200, h: 675 } }, linea: { en: 1.7, dur: 2.2, de: [1040, 530] } },
      vo: 'acto6-3',
      voEn: 0.3,
      app: 0.5,
    },
    { id: '6-repasar', dur: 3.7, capa: { tipo: 'nino', fuente: { toma: L, desde: m(L, 'repasa', 0.2), vel: 2.7 }, etiqueta: 'Computador de Lucas' }, txt: { texto: '«Repasar»: sigue el trazo de una letra tenue.', estilo: 'nota' } },

    // Acto 7 · De vuelta al trabajo
    { id: 'r7', dur: 1.6, capa: { tipo: 'rotulo', numero: '7', titulo: 'De vuelta al trabajo' } },
    {
      id: '7-vuelta',
      dur: Math.max(8.6, v('acto7') + 1.0),
      capa: { tipo: 'dividida', nino: { toma: 'c16-sofia', desde: sinc('c16-educadora', 'c16-sofia', m('c16-educadora', 'c16', 0.2)) }, educadora: { toma: 'c16-educadora', desde: m('c16-educadora', 'c16', 0.2), ventana: { x: 410, y: 10, w: 1400, h: 788 } }, linea: { en: m('c16-educadora', 'sofia-soltada', -0.9) - m('c16-educadora', 'c16', 0.2), dur: 1.5, de: [630, 740] } },
      vo: 'acto7',
      voEn: 0.4,
      app: 0.5,
    },
    { id: '7-todos', dur: 2.8, capa: { tipo: 'pantalla', fuente: { toma: 'c16-educadora', desde: m('c16-educadora', 'todos-en-silabas', 0.2), ventana: { x: 410, y: 150, w: 1400, h: 788 } } }, txt: { texto: 'Una ruta puede tener varias salas seguidas: Letras → Sílabas → Recreo.', estilo: 'nota' } },

    // Acto 8 · Al final del día
    { id: 'r8', dur: 1.6, capa: { tipo: 'rotulo', numero: '8', titulo: 'Al final del día' } },
    { id: '8-panel', dur: v('acto8-1') + 1.4, capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'panel', 0.4), ventana: { de: TODO, a: { x: 620, y: 80, w: 1300, h: 731 }, en: 1.2, dur: 1.4 } } }, vo: 'acto8-1', voEn: 0.3 },
    { id: '8-tabla', dur: 3.6, capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'avance', 1.0) } }, vo: 'acto8-2', voEn: 0.3 },
    {
      id: '8-detalle',
      dur: 5.2,
      capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'detalle-b', -0.5), vel: 1.5, ventana: { de: TODO, a: { x: 400, y: 330, w: 1320, h: 743 }, en: 0.8, dur: 1 } } },
      porque: { texto: 'Se mide el acierto al primer intento: muestra lo que el niño sabe, no cuántas veces probó.', en: 1.2, dur: 3.8 },
    },
    { id: '8-ficha', dur: 2.6, capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'ficha-tomas', 0.8) } } },
    { id: '8-barras', dur: 2.8, capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'avance-categoria', 0.3) } } },
    { id: '8-observaciones', dur: 2.6, capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'observaciones', 0.9) } } },
    { id: '8-pdf-clic', dur: 2.6, capa: { tipo: 'pantalla', fuente: { toma: M17, desde: m(M17, 'pdf-tomas', 0.3), ventana: { x: 620, y: 80, w: 1300, h: 731 } } }, vo: 'acto8-3', voEn: 0.3 },
    { id: '8-pdf-tomas', dur: 4.4, capa: { tipo: 'pantalla', fuente: { toma: 'c20-pdf-tomas', desde: m('c20-pdf-tomas', 'abierto', 0.6), vel: 3.2, ventana: { x: 690, y: 60, w: 840, h: 472 } } } },
    { id: '8-pdf-curso', dur: Math.max(3.6, v('acto8-3') - 7.2), capa: { tipo: 'pantalla', fuente: { toma: 'c20-pdf-curso', desde: m('c20-pdf-curso', 'abierto', 0.6), vel: 2.2, ventana: { x: 690, y: 60, w: 840, h: 472 } } } },

    // Cierre
    { id: 'c-juega', dur: 2.3, capa: { tipo: 'nino', fuente: { toma: F, desde: m(F, 'trofeo', 1.2) } }, app: 0, txt: { texto: 'El niño juega.', estilo: 'grande', en: 0.2 } },
    { id: 'c-guia', dur: 2.3, capa: { tipo: 'ilustracion', cual: 'apoyo' }, txt: { texto: 'La educadora guía.', estilo: 'grande', en: 0.2 } },
    { id: 'c-nadie', dur: 2.5, capa: { tipo: 'nino', fuente: { toma: R, desde: m(R, 'lucas-al-columpio', 4.5) } }, app: 0, txt: { texto: 'Nadie se queda atrás.', estilo: 'grande', en: 0.2 } },
    { id: 'c-logo', dur: v('cierre') + 3.4, capa: { tipo: 'cierre' }, vo: 'cierre', voEn: 0.8 },
  ]

  // ---------- Versión corta (PLAN.md, sección 9): los mismos planos, solo lo que más se luce ----------
  const de = (id: string, cambios: Partial<Plano> = {}): Plano => {
    const p = planos.find((x) => x.id === id)
    if (!p) throw new Error(`No existe el plano «${id}»`)
    return { ...p, porque: undefined, ...cambios }
  }
  const corto: Plano[] = [
    de('gancho-aula'),
    de('gancho-grilla', { dur: 3.4 }),
    de('2-quien', { dur: 3.9 }),
    de('2-grilla'),
    de('2-hola'),
    de('3-arrastre', { dur: v('acto3') + 1.0 }),
    de('4-error', { txt: undefined }),
    de('4-acierto'),
    de('5-repetir'),
    de('5-aviso', { dur: 3.2 }),
    de('5-ultima'),
    de('5-trofeo', { dur: 3.4 }),
    de('5-al-recreo', { dur: 4.4 }),
    de('6-jugamos'),
    de('6-hola'),
    de('8-detalle', { dur: v('acto8-2') + 0.6, vo: 'acto8-2', voEn: 0.2 }),
    de('8-pdf-tomas', { dur: 2.6 }),
    de('c-juega', { dur: 2.0 }),
    de('c-guia', { dur: 2.0 }),
    de('c-nadie', { dur: 2.2 }),
    de('c-logo', { dur: v('cierre') + 2.6 }),
  ]
  const lista = cual === 'corto' ? corto : planos

  // ---------- Tiempos ----------
  const cuadros = (s: number) => Math.round(s * FPS)
  let cursor = 0
  const resueltos = lista.map((p) => {
    const desde = cursor
    const frames = cuadros(p.dur)
    cursor += frames
    return { ...p, desde, frames }
  })
  const total = cursor

  const vos = resueltos.flatMap((p) => (p.vo ? [{ id: p.vo, desde: p.desde + cuadros(p.voEn ?? 0), frames: cuadros(voz[p.vo].duracion), texto: voz[p.vo].texto }] : []))

  // Cuánto se oye la app en un cuadro: completa, o atenuada mientras habla la voz en off.
  const BAJO = 0.14
  const RAMPA = 8
  const volumenApp = (cuadro: number) => {
    let factor = 1
    for (const o of vos) {
      const d = cuadro < o.desde ? o.desde - cuadro : cuadro > o.desde + o.frames ? cuadro - (o.desde + o.frames) : 0
      factor = Math.min(factor, d >= RAMPA ? 1 : BAJO + ((1 - BAJO) * d) / RAMPA)
    }
    return factor
  }

  // ---------- Subtítulos ----------
  const subs: Subtitulo[] = []
  for (const o of vos) {
    const trozos = partir(o.texto, 64)
    const letras = trozos.reduce((s, t) => s + t.length, 0)
    let t = o.desde
    for (const trozo of trozos) {
      const dur = (o.frames * trozo.length) / letras
      subs.push({ desde: Math.round(t), hasta: Math.round(t + dur), texto: trozo, de: 'vo' })
      t += dur
    }
  }
  const fuentesDe = (c: Capa): Recorte[] => (c.tipo === 'pantalla' || c.tipo === 'nino' ? [c.fuente] : c.tipo === 'dividida' ? [c.nino] : c.tipo === 'ninos' ? [c.izquierda, c.derecha] : [])
  for (const p of resueltos) {
    if (p.app === 0) continue
    for (const f of fuentesDe(p.capa)) {
      if ((f.vel ?? 1) !== 1 || !tomas[f.toma].audio) continue
      for (const fr of tomas[f.toma].frases) {
        const a = Math.max(fr.t, f.desde)
        const b = Math.min(fr.fin, f.desde + p.dur)
        if (b - a < 0.6) continue
        const desde = p.desde + cuadros(a - f.desde)
        const hasta = p.desde + cuadros(b - f.desde)
        // La voz en off manda: lo que la app dice debajo no se subtitula.
        if (vos.some((o) => desde < o.desde + o.frames && hasta > o.desde)) continue
        subs.push({ desde, hasta, texto: fr.texto, de: 'app' })
      }
    }
  }
  subs.sort((x, y) => x.desde - y.desde)

  // Voz de la app que quedaría tapada por la voz en off (para revisar el montaje).
  return { planos: resueltos, vos, subs, total, volumenApp }
}

// Parte una frase en líneas de subtítulo, cortando en la puntuación cuando se puede.
// Las líneas quedan parejas: nunca una palabra suelta al final.
export function partir(texto: string, max: number): string[] {
  const palabras = texto.split(' ')
  const n = Math.ceil(texto.length / max)
  if (n <= 1) return [texto]
  const meta = texto.length / n
  const lineas: string[] = []
  let actual = ''
  let resto = texto.length
  for (const p of palabras) {
    const junto = actual ? `${actual} ${p}` : p
    const faltan = n - lineas.length
    // Se corta al llegar al largo parejo (antes, si la línea termina en una pausa),
    // siempre que quede texto para las líneas que faltan.
    const pausa = /[.?!:;,]$/.test(actual)
    if (actual && faltan > 1 && (junto.length > max || actual.length >= meta || (pausa && actual.length >= meta * 0.72)) && resto > 12) {
      lineas.push(actual)
      actual = p
    } else actual = junto
    resto -= p.length + 1
  }
  if (actual) lineas.push(actual)
  return lineas
}

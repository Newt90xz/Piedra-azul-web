import type { Letra, Palabra } from '../dominio/tipos.ts'

// Banco de contenidos de prueba. En la versión conectada se carga desde
// Supabase (RNF-14): agregar una palabra no debe requerir tocar código.
// Los emoji son marcadores hasta tener fotos reales y pictogramas ARASAAC.

const p = (texto: string, silabas: string[], emoji: string): Palabra => ({
  id: quitarTildes(texto),
  texto,
  silabas,
  imagen: { alt: texto, emoji },
})

export const PALABRAS: Palabra[] = [
  p('avión', ['a', 'vión'], '✈️'),
  p('abeja', ['a', 'be', 'ja'], '🐝'),
  p('árbol', ['ár', 'bol'], '🌳'),
  p('elefante', ['e', 'le', 'fan', 'te'], '🐘'),
  p('estrella', ['es', 'tre', 'lla'], '⭐'),
  p('iglesia', ['i', 'gle', 'sia'], '⛪'),
  p('isla', ['is', 'la'], '🏝️'),
  p('oso', ['o', 'so'], '🐻'),
  p('ojo', ['o', 'jo'], '👁️'),
  p('uvas', ['u', 'vas'], '🍇'),
  p('unicornio', ['u', 'ni', 'cor', 'nio'], '🦄'),
  p('mano', ['ma', 'no'], '✋'),
  p('mono', ['mo', 'no'], '🐒'),
  p('manzana', ['man', 'za', 'na'], '🍎'),
  p('mamá', ['ma', 'má'], '👩'),
  p('mapa', ['ma', 'pa'], '🗺️'),
  p('mariposa', ['ma', 'ri', 'po', 'sa'], '🦋'),
  p('pato', ['pa', 'to'], '🦆'),
  p('perro', ['pe', 'rro'], '🐶'),
  p('pelota', ['pe', 'lo', 'ta'], '⚽'),
  p('papá', ['pa', 'pá'], '👨'),
  p('puma', ['pu', 'ma'], '🐆'),
  p('pera', ['pe', 'ra'], '🍐'),
  p('pan', ['pan'], '🍞'),
  p('luna', ['lu', 'na'], '🌙'),
  p('lupa', ['lu', 'pa'], '🔍'),
  p('león', ['le', 'ón'], '🦁'),
  p('lápiz', ['lá', 'piz'], '✏️'),
  p('sol', ['sol'], '☀️'),
  p('sapo', ['sa', 'po'], '🐸'),
  p('silla', ['si', 'lla'], '🪑'),
  p('sopa', ['so', 'pa'], '🍲'),
  p('taza', ['ta', 'za'], '☕'),
  p('tomate', ['to', 'ma', 'te'], '🍅'),
  p('tortuga', ['tor', 'tu', 'ga'], '🐢'),
  p('zapato', ['za', 'pa', 'to'], '👞'),
  p('gato', ['ga', 'to'], '🐱'),
  p('casa', ['ca', 'sa'], '🏠'),
  p('coneja', ['co', 'ne', 'ja'], '🐰'),
  p('parque', ['par', 'que'], '🏞️'),
  p('flores', ['flo', 'res'], '🌸'),
  p('flor', ['flor'], '🌸'),
  p('zanahoria', ['za', 'na', 'ho', 'ria'], '🥕'),
  p('pollito', ['po', 'lli', 'to'], '🐥'),
  p('playa', ['pla', 'ya'], '🏖️'),
  p('helado', ['he', 'la', 'do'], '🍦'),
  p('ratón', ['ra', 'tón'], '🐭'),
  p('queso', ['que', 'so'], '🧀'),
  p('chocolate', ['cho', 'co', 'la', 'te'], '🍫'),
  // Familias silábicas y rimas de los contenidos (contenidos.ts).
  p('moto', ['mo', 'to'], '🏍️'),
  p('muñeca', ['mu', 'ñe', 'ca'], '🪆'),
  p('maleta', ['ma', 'le', 'ta'], '🧳'),
  p('lobo', ['lo', 'bo'], '🐺'),
  p('leche', ['le', 'che'], '🥛'),
  p('limón', ['li', 'món'], '🍋'),
  p('semilla', ['se', 'mi', 'lla'], '🌱'),
  p('sirena', ['si', 're', 'na'], '🧜‍♀️'),
  p('sofá', ['so', 'fá'], '🛋️'),
  p('galleta', ['ga', 'lle', 'ta'], '🍪'),
  p('dado', ['da', 'do'], '🎲'),
  p('noche', ['no', 'che'], '🌃'),
]

// Nivel 1: vocales y consonantes de fácil articulación (M, P, L, S, T).
export const LETRAS: Letra[] = [
  { id: 'a', grafema: 'A', fonema: 'aaaa', ejemplos: ['avion', 'abeja', 'arbol'], apoyoArticulatorio: 'Boca bien abierta.' },
  { id: 'e', grafema: 'E', fonema: 'eeee', ejemplos: ['elefante', 'estrella'], apoyoArticulatorio: 'Boca abierta, como sonriendo.' },
  { id: 'i', grafema: 'I', fonema: 'iiii', ejemplos: ['iglesia', 'isla'], apoyoArticulatorio: 'Sonrisa grande, dientes casi juntos.' },
  { id: 'o', grafema: 'O', fonema: 'oooo', ejemplos: ['oso', 'ojo'], apoyoArticulatorio: 'Labios redondos.' },
  { id: 'u', grafema: 'U', fonema: 'uuuu', ejemplos: ['uvas', 'unicornio'], apoyoArticulatorio: 'Labios redondos hacia adelante.' },
  { id: 'm', grafema: 'M', fonema: 'mmmm', ejemplos: ['mano', 'mono', 'manzana'], apoyoArticulatorio: 'Labios juntos, la nariz vibra.' },
  { id: 'p', grafema: 'P', fonema: 'p', ejemplos: ['pato', 'perro', 'pelota'], apoyoArticulatorio: 'Labios juntos y sale aire de golpe.' },
  { id: 'l', grafema: 'L', fonema: 'llll', ejemplos: ['luna', 'lupa', 'leon'], apoyoArticulatorio: 'La lengua toca detrás de los dientes de arriba.' },
  { id: 's', grafema: 'S', fonema: 'ssss', ejemplos: ['sol', 'sapo', 'silla'], apoyoArticulatorio: 'Dientes juntos, sale aire como una serpiente.' },
  { id: 't', grafema: 'T', fonema: 't', ejemplos: ['taza', 'tomate', 'tortuga'], apoyoArticulatorio: 'La lengua toca los dientes y se suelta.' },
]

// El alfabeto completo, para las actividades de letras que configura la docente.
// LETRAS sigue siendo el pool de las actividades que ya existían, para no cambiarlas.
// `fonema`: lo que suena (RF-04: el sonido, no el nombre). La H no suena y la W es
// muy poco usada: se dice su nombre. Lo debe validar la educadora (RNF-04).
// `sonido`: las letras que suenan igual en español de Chile lo comparten. Nunca
// pueden ser opciones de una misma ronda, porque de oído no se distinguen.
export interface LetraAlfabeto extends Letra {
  sonido: string
}

const de = (id: string, fonema: string, apoyoArticulatorio: string, sonido = id): LetraAlfabeto => ({ id, grafema: id.toUpperCase(), fonema, ejemplos: [], apoyoArticulatorio, sonido })
const conocida = (id: string): LetraAlfabeto => ({ ...LETRAS.find((l) => l.id === id)!, sonido: id })

export const ALFABETO: LetraAlfabeto[] = [
  conocida('a'),
  de('b', 'b', 'Labios juntos y se sueltan suave.'),
  de('c', 'k', 'La parte de atrás de la lengua sube y se suelta.', 'k'),
  de('d', 'd', 'La lengua toca los dientes de arriba.'),
  conocida('e'),
  de('f', 'ffff', 'Dientes de arriba sobre el labio de abajo y sale aire.'),
  de('g', 'g', 'La parte de atrás de la lengua sube; la garganta vibra.'),
  de('h', 'hache', 'No suena: se dice su nombre.'),
  conocida('i'),
  de('j', 'jjjj', 'Sale aire desde la garganta.'),
  de('k', 'k', 'La parte de atrás de la lengua sube y se suelta.'),
  conocida('l'),
  conocida('m'),
  de('n', 'nnnn', 'La lengua toca detrás de los dientes; la nariz vibra.'),
  de('ñ', 'ññññ', 'La lengua toca el paladar; la nariz vibra.'),
  conocida('o'),
  conocida('p'),
  de('q', 'k', 'La parte de atrás de la lengua sube y se suelta.', 'k'),
  de('r', 'rrrr', 'La punta de la lengua vibra.'),
  conocida('s'),
  conocida('t'),
  conocida('u'),
  de('v', 'b', 'Labios juntos y se sueltan suave.', 'b'),
  de('w', 'doble ve', 'Se dice su nombre.'),
  de('x', 'ks', 'Dos sonidos seguidos: k y s.'),
  de('y', 'yyyy', 'La lengua sube al paladar.'),
  de('z', 'ssss', 'Dientes juntos, sale aire como una serpiente.', 's'),
]

// Nivel 2: sílabas directas con las consonantes vistas.
export const CONSONANTES_SILABAS = ['m', 'p', 'l', 's'] as const
export const VOCALES = ['a', 'e', 'i', 'o', 'u'] as const

// Nivel 3: palabras bisílabas CV + CV del MVP.
export const PALABRAS_NIVEL_3 = ['mama', 'papa', 'mano', 'mapa', 'mono', 'pato', 'puma', 'luna', 'lupa', 'sapo', 'sopa', 'taza', 'gato', 'casa']

export function quitarTildes(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function palabra(id: string): Palabra {
  const encontrada = PALABRAS.find((w) => w.id === id)
  if (!encontrada) throw new Error(`Palabra no encontrada en el banco: ${id}`)
  return encontrada
}

export function letra(id: string): Letra {
  const encontrada = LETRAS.find((l) => l.id === id)
  if (!encontrada) throw new Error(`Letra no encontrada en el banco: ${id}`)
  return encontrada
}

// Nombre de cada letra, para la voz. Los sonidos sueltos («mmmm», «uuuu») la voz
// sintética los alarga o los deletrea mal: la voz dice «la eme», no «mmmm».
const NOMBRES_LETRAS: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', d: 'de', e: 'e', f: 'efe', g: 'ge', h: 'hache', i: 'i', j: 'jota', k: 'ka', l: 'ele', m: 'eme', n: 'ene',
  ñ: 'eñe', o: 'o', p: 'pe', q: 'cu', r: 'erre', s: 'ese', t: 'te', u: 'u', v: 've', w: 'doble ve', x: 'equis', y: 'ye', z: 'zeta',
}
export const nombreLetra = (l: string) => NOMBRES_LETRAS[l.toLowerCase()] ?? l.toLowerCase()
export const laLetra = (l: string) => `la ${nombreLetra(l)}`

export function fonemaDe(l: string) {
  return LETRAS.find((x) => x.id === l)?.fonema ?? l
}

// Lo que llega de la base (datos/bancoGuardado.ts). Agrega y actualiza, y nunca
// quita: las actividades piden palabras por id y fallarían si una desaparece.
export interface BancoRemoto {
  palabras: { id: string; texto: string; silabas: string[]; emoji: string; fotoUrl?: string; pictoUrl?: string }[]
  letras: { id: string; fonema: string; apoyoArticulatorio?: string }[]
}

export function aplicarBanco(banco: BancoRemoto) {
  for (const f of banco.palabras ?? []) {
    if (!f.id || !f.texto || !f.emoji || !f.silabas?.length) continue
    const nueva: Palabra = { id: f.id, texto: f.texto, silabas: f.silabas, imagen: { alt: f.texto, emoji: f.emoji, fotoUrl: f.fotoUrl, pictoUrl: f.pictoUrl } }
    const i = PALABRAS.findIndex((w) => w.id === f.id)
    if (i >= 0) PALABRAS[i] = nueva
    else PALABRAS.push(nueva)
  }
  for (const f of banco.letras ?? []) {
    if (!f.fonema) continue
    for (const l of [LETRAS.find((x) => x.id === f.id), ALFABETO.find((x) => x.id === f.id)]) {
      if (!l) continue
      l.fonema = f.fonema
      if (f.apoyoArticulatorio) l.apoyoArticulatorio = f.apoyoArticulatorio
    }
  }
}

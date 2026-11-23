import type { Letra, Palabra } from '../dominio/tipos.ts'
import { enBancoGeneral, esTema, type Tema } from './temas.ts'

// Banco de palabras. En la versión conectada se carga también desde Supabase
// (RNF-14): agregar una palabra no debe requerir tocar código. Cada palabra
// tiene su pictograma ARASAAC en public/imagenes/<palabra>.png; el emoji es el
// respaldo si la imagen no carga, y no se repite (dos opciones iguales no se
// distinguirían).

const p = (texto: string, silabas: string[], emoji: string): Palabra => ({
  id: quitarTildes(texto),
  texto,
  silabas,
  imagen: { alt: texto, emoji },
})

const deTema = (tema: Tema, palabras: Palabra[]) => palabras.map((w) => ({ ...w, tema }))

// Agrupadas por tema, en el orden de TEMAS (contenido/temas.ts).
export const PALABRAS: Palabra[] = [
  ...deTema('animales', [
    p('abeja', ['a', 'be', 'ja'], '🐝'),
    p('elefante', ['e', 'le', 'fan', 'te'], '🐘'),
    p('oso', ['o', 'so'], '🐻'),
    p('mono', ['mo', 'no'], '🐒'),
    p('mariposa', ['ma', 'ri', 'po', 'sa'], '🦋'),
    p('pato', ['pa', 'to'], '🦆'),
    p('perro', ['pe', 'rro'], '🐶'),
    p('puma', ['pu', 'ma'], '🐆'),
    p('león', ['le', 'ón'], '🦁'),
    p('sapo', ['sa', 'po'], '🐸'),
    p('tortuga', ['tor', 'tu', 'ga'], '🐢'),
    p('gato', ['ga', 'to'], '🐱'),
    p('coneja', ['co', 'ne', 'ja'], '🐰'),
    p('pollito', ['po', 'lli', 'to'], '🐥'),
    p('ratón', ['ra', 'tón'], '🐭'),
    p('lobo', ['lo', 'bo'], '🐺'),
    p('medusa', ['me', 'du', 'sa'], '🪼'),
    p('paloma', ['pa', 'lo', 'ma'], '🕊️'),
    p('loro', ['lo', 'ro'], '🦜'),
    p('erizo', ['e', 'ri', 'zo'], '🦔'),
    p('iguana', ['i', 'gua', 'na'], '🦎'),
    p('oveja', ['o', 've', 'ja'], '🐑'),
    p('araña', ['a', 'ra', 'ña'], '🕷️'),
    p('ardilla', ['ar', 'di', 'lla'], '🐿️'),
    p('pez', ['pez'], '🐟'),
    p('mariquita', ['ma', 'ri', 'qui', 'ta'], '🐞'),
    p('cocodrilo', ['co', 'co', 'dri', 'lo'], '🐊'),
    p('dinosaurio', ['di', 'no', 'sau', 'rio'], '🦕'),
    p('foca', ['fo', 'ca'], '🦭'),
    p('vaca', ['va', 'ca'], '🐄'),
    p('pájaro', ['pá', 'ja', 'ro'], '🐦'),
  ]),
  ...deTema('frutas', [
    p('manzana', ['man', 'za', 'na'], '🍎'),
    p('pera', ['pe', 'ra'], '🍐'),
    p('uvas', ['u', 'vas'], '🍇'),
    p('limón', ['li', 'món'], '🍋'),
    p('melón', ['me', 'lón'], '🍈'),
    p('piña', ['pi', 'ña'], '🍍'),
    // «Frutilla», como se dice en Chile (antes «fresa»).
    p('frutilla', ['fru', 'ti', 'lla'], '🍓'),
    p('plátano', ['plá', 'ta', 'no'], '🍌'),
    p('naranja', ['na', 'ran', 'ja'], '🍊'),
    p('sandía', ['san', 'dí', 'a'], '🍉'),
    p('durazno', ['du', 'raz', 'no'], '🍑'),
    p('kiwi', ['ki', 'wi'], '🥝'),
    p('cereza', ['ce', 're', 'za'], '🍒'),
    p('mango', ['man', 'go'], '🥭'),
    p('coco', ['co', 'co'], '🥥'),
    p('mora', ['mo', 'ra'], '🫐'),
    p('papaya', ['pa', 'pa', 'ya'], '🧡'),
    p('ciruela', ['ci', 'rue', 'la'], '🟣'),
  ]),
  ...deTema('verduras', [
    p('tomate', ['to', 'ma', 'te'], '🍅'),
    p('zanahoria', ['za', 'na', 'ho', 'ria'], '🥕'),
    p('lechuga', ['le', 'chu', 'ga'], '🥬'),
    p('calabaza', ['ca', 'la', 'ba', 'za'], '🎃'),
  ]),
  ...deTema('alimentos', [
    p('pan', ['pan'], '🍞'),
    p('sopa', ['so', 'pa'], '🍲'),
    p('helado', ['he', 'la', 'do'], '🍦'),
    p('queso', ['que', 'so'], '🧀'),
    p('chocolate', ['cho', 'co', 'la', 'te'], '🍫'),
    p('leche', ['le', 'che'], '🥛'),
    p('galleta', ['ga', 'lle', 'ta'], '🍪'),
    p('pollo', ['po', 'llo'], '🍗'),
    p('sushi', ['su', 'shi'], '🍣'),
  ]),
  ...deTema('cuerpo', [
    p('ojo', ['o', 'jo'], '👁️'),
    p('mano', ['ma', 'no'], '✋'),
    p('pie', ['pie'], '🦶'),
    p('oreja', ['o', 're', 'ja'], '👂'),
    p('uña', ['u', 'ña'], '💅'),
    p('dedo', ['de', 'do'], '☝️'),
  ]),
  // «Guagua»: bebé, en Chile.
  ...deTema('familia', [
    p('mamá', ['ma', 'má'], '👩'),
    p('papá', ['pa', 'pá'], '👨'),
    p('niño', ['ni', 'ño'], '👦'),
    p('niña', ['ni', 'ña'], '👧'),
    p('guagua', ['gua', 'gua'], '👶'),
    p('abuela', ['a', 'bue', 'la'], '👵'),
  ]),
  // Profesiones: trabajos que piden estudiar muchos años. Sin «enfermera»: su
  // pictograma es igual al de la doctora.
  ...deTema('profesiones', [
    p('doctora', ['doc', 'to', 'ra'], '👩‍⚕️'),
    p('profesora', ['pro', 'fe', 'so', 'ra'], '👩‍🏫'),
    p('dentista', ['den', 'tis', 'ta'], '🦷'),
    p('veterinaria', ['ve', 'te', 'ri', 'na', 'ria'], '🐾'),
    p('piloto', ['pi', 'lo', 'to'], '🧑‍✈️'),
    p('astronauta', ['as', 'tro', 'nau', 'ta'], '🧑‍🚀'),
    p('científica', ['cien', 'tí', 'fi', 'ca'], '👩‍🔬'),
  ]),
  // Oficios: los demás trabajos, también bombero, carabinero y cartero.
  ...deTema('oficios', [
    p('bombero', ['bom', 'be', 'ro'], '🧑‍🚒'),
    p('carabinero', ['ca', 'ra', 'bi', 'ne', 'ro'], '👮'),
    p('cartero', ['car', 'te', 'ro'], '📮'),
    p('panadero', ['pa', 'na', 'de', 'ro'], '🥖'),
    p('carpintero', ['car', 'pin', 'te', 'ro'], '🔨'),
    p('pescador', ['pes', 'ca', 'dor'], '🎣'),
    p('jardinero', ['jar', 'di', 'ne', 'ro'], '🌻'),
    p('peluquera', ['pe', 'lu', 'que', 'ra'], '💇'),
    p('cocinero', ['co', 'ci', 'ne', 'ro'], '🧑‍🍳'),
    p('mecánico', ['me', 'cá', 'ni', 'co'], '🧑‍🔧'),
    p('albañil', ['al', 'ba', 'ñil'], '🧱'),
    p('agricultor', ['a', 'gri', 'cul', 'tor'], '🧑‍🌾'),
    p('pintor', ['pin', 'tor'], '🎨'),
  ]),
  // Sin «metro» ni «taxi»: sus pictogramas son iguales al tren y al auto.
  ...deTema('transporte', [
    p('avión', ['a', 'vión'], '✈️'),
    p('auto', ['au', 'to'], '🚗'),
    p('moto', ['mo', 'to'], '🏍️'),
    p('tren', ['tren'], '🚆'),
    p('bicicleta', ['bi', 'ci', 'cle', 'ta'], '🚲'),
    p('micro', ['mi', 'cro'], '🚌'),
    p('barco', ['bar', 'co'], '🚢'),
    p('camión', ['ca', 'mión'], '🚚'),
    p('helicóptero', ['he', 'li', 'cóp', 'te', 'ro'], '🚁'),
    p('cohete', ['co', 'he', 'te'], '🚀'),
    p('submarino', ['sub', 'ma', 'ri', 'no'], '🤿'),
    p('ambulancia', ['am', 'bu', 'lan', 'cia'], '🚑'),
    p('tractor', ['trac', 'tor'], '🚜'),
  ]),
  ...deTema('ropa', [
    p('polera', ['po', 'le', 'ra'], '👕'),
    p('zapato', ['za', 'pa', 'to'], '👞'),
    p('bota', ['bo', 'ta'], '👢'),
  ]),
  ...deTema('casa', [
    p('casa', ['ca', 'sa'], '🏠'),
    p('silla', ['si', 'lla'], '🪑'),
    p('mesa', ['me', 'sa'], '🟫'),
    p('cama', ['ca', 'ma'], '🛏️'),
    p('sofá', ['so', 'fá'], '🛋️'),
    p('taza', ['ta', 'za'], '☕'),
    p('espejo', ['es', 'pe', 'jo'], '🪞'),
    p('escoba', ['es', 'co', 'ba'], '🧹'),
    p('salero', ['sa', 'le', 'ro'], '🧂'),
    p('lata', ['la', 'ta'], '🥫'),
    p('lana', ['la', 'na'], '🧶'),
    p('maleta', ['ma', 'le', 'ta'], '🧳'),
    p('paraguas', ['pa', 'ra', 'guas'], '☂️'),
    p('imán', ['i', 'mán'], '🧲'),
    p('anillo', ['a', 'ni', 'llo'], '💍'),
    p('serrucho', ['se', 'rru', 'cho'], '🪚'),
    p('micrófono', ['mi', 'cró', 'fo', 'no'], '🎙️'),
    p('música', ['mú', 'si', 'ca'], '🎵'),
  ]),
  ...deTema('juguetes', [
    p('pelota', ['pe', 'lo', 'ta'], '⚽'),
    p('muñeca', ['mu', 'ñe', 'ca'], '🪆'),
    p('dado', ['da', 'do'], '🎲'),
    p('lápiz', ['lá', 'piz'], '✏️'),
    p('libro', ['li', 'bro'], '📚'),
    p('mochila', ['mo', 'chi', 'la'], '🎒'),
    p('lupa', ['lu', 'pa'], '🔍'),
    p('mapa', ['ma', 'pa'], '🗺️'),
  ]),
  // «Flores» antes que «flor»: comparten emoji y el banco general se queda con la primera.
  ...deTema('naturaleza', [
    p('árbol', ['ár', 'bol'], '🌳'),
    p('pino', ['pi', 'no'], '🌲'),
    p('flores', ['flo', 'res'], '🌸'),
    p('flor', ['flor'], '🌸'),
    p('semilla', ['se', 'mi', 'lla'], '🌱'),
    p('estrella', ['es', 'tre', 'lla'], '⭐'),
    p('luna', ['lu', 'na'], '🌙'),
    p('sol', ['sol'], '☀️'),
    p('nube', ['nu', 'be'], '☁️'),
    p('noche', ['no', 'che'], '🌃'),
    p('agua', ['a', 'gua'], '💧'),
    p('mar', ['mar'], '⛵'),
    p('ola', ['o', 'la'], '🌊'),
    p('playa', ['pla', 'ya'], '🏖️'),
    p('isla', ['is', 'la'], '🏝️'),
    p('parque', ['par', 'que'], '🏞️'),
    p('iglesia', ['i', 'gle', 'sia'], '⛪'),
    p('semáforo', ['se', 'má', 'fo', 'ro'], '🚦'),
  ]),
  ...deTema('personajes', [
    p('unicornio', ['u', 'ni', 'cor', 'nio'], '🦄'),
    p('sirena', ['si', 're', 'na'], '🧜‍♀️'),
    p('payaso', ['pa', 'ya', 'so'], '🤡'),
  ]),
  // Meses y estaciones: solo en las actividades de vocabulario (temas.ts). Los
  // meses usan los pictogramas de calendario con su número (y ese emoji).
  ...deTema('meses', [
    p('enero', ['e', 'ne', 'ro'], '1️⃣'),
    p('febrero', ['fe', 'bre', 'ro'], '2️⃣'),
    p('marzo', ['mar', 'zo'], '3️⃣'),
    p('abril', ['a', 'bril'], '4️⃣'),
    p('mayo', ['ma', 'yo'], '5️⃣'),
    p('junio', ['ju', 'nio'], '6️⃣'),
    p('julio', ['ju', 'lio'], '7️⃣'),
    p('agosto', ['a', 'gos', 'to'], '8️⃣'),
    p('septiembre', ['sep', 'tiem', 'bre'], '9️⃣'),
    p('octubre', ['oc', 'tu', 'bre'], '🔟'),
    p('noviembre', ['no', 'viem', 'bre'], '1️⃣1️⃣'),
    p('diciembre', ['di', 'ciem', 'bre'], '1️⃣2️⃣'),
  ]),
  ...deTema('estaciones', [
    p('primavera', ['pri', 'ma', 've', 'ra'], '🌷'),
    p('verano', ['ve', 'ra', 'no'], '🌞'),
    p('otoño', ['o', 'to', 'ño'], '🍂'),
    p('invierno', ['in', 'vier', 'no'], '⛄'),
  ]),
]

// Las que usan las actividades de sonidos, sílabas y palabras: sin meses ni
// estaciones. Es una función y no una constante porque la caché de la base
// (datos/bancoGuardado.ts) se aplica después de cargar este archivo.
export const bancoGeneral = () => PALABRAS.filter(enBancoGeneral)

export const palabrasDelTema = (tema: Tema) => PALABRAS.filter((w) => w.tema === tema)

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
export const PALABRAS_NIVEL_3 = [
  'mama', 'papa', 'mano', 'mapa', 'mono', 'pato', 'puma', 'luna', 'lupa', 'sapo', 'sopa', 'taza', 'gato', 'casa',
  'mesa', 'foca', 'vaca', 'nube', 'dedo', 'cama', 'bota', 'pina', 'pino', 'lata', 'lana', 'loro',
]

// Para ids y búsquedas: «niño» \u2192 «nino».
export function quitarTildes(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Para comparar cómo suena o se escribe: quita los acentos pero no la Ñ, que es
// otra letra («piña» no rima con «luna»).
export function sinAcentos(s: string) {
  return s.toLowerCase().replace(/[áéíóúü]/g, (c) => 'aeiouu'['áéíóúü'.indexOf(c)])
}

// Cómo suena una palabra o sílaba en el español de Chile, para comparar sonidos
// y no letras: la Z y la C (antes de E o I) suenan como S (zapato / sapo,
// cereza / mesa), la V como B, la LL como Y, la H no suena (helado empieza con
// E), QU y C (antes de A, O, U) como K, y G (antes de E o I) como J.
// Se consulta muchísimo al armar cada ronda: se guarda lo ya calculado.
const sonidos = new Map<string, string>()
export function sonido(s: string) {
  let r = sonidos.get(s)
  if (r === undefined) sonidos.set(s, (r = calcularSonido(s)))
  return r
}

function calcularSonido(s: string) {
  return sinAcentos(s)
    .replace(/ch/g, 'ʧ')
    .replace(/h/g, '')
    .replace(/qu/g, 'k')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/ll/g, 'y')
    // Primero la G suave (gente) y después GU (guerra): si no, «gue» pasaría a «je».
    .replace(/g(?=[ei])/g, 'j')
    .replace(/gu(?=[ei])/g, 'g')
    .replace(/x/g, 'ks')
    .replace(/y$/, 'i')
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
  palabras: { id: string; texto: string; silabas: string[]; emoji: string; fotoUrl?: string; pictoUrl?: string; tema?: string }[]
  letras: { id: string; fonema: string; apoyoArticulatorio?: string }[]
}

export function aplicarBanco(banco: BancoRemoto) {
  for (const f of banco.palabras ?? []) {
    if (!f.id || !f.texto || !f.emoji || !f.silabas?.length) continue
    const i = PALABRAS.findIndex((w) => w.id === f.id)
    // El tema de la base si trae uno válido; si no (una base sin migrar o una
    // caché vieja), el del código. Sin ninguno, la palabra queda solo en el
    // banco general: no entra a los temas ni a las actividades de vocabulario.
    const tema = esTema(f.tema) ? f.tema : PALABRAS[i]?.tema
    const nueva: Palabra = {
      id: f.id,
      texto: f.texto,
      silabas: f.silabas,
      imagen: { alt: f.texto, emoji: f.emoji, fotoUrl: f.fotoUrl, pictoUrl: f.pictoUrl },
      ...(tema && { tema }),
    }
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

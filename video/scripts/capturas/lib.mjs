// Utilidades comunes de las capturas (PLAN.md, 6c).
//
// Cada «pantalla» (la educadora o la tablet de un niño) es un browser context
// propio: tiene su localStorage, así que varios niños conviven sin perfiles de
// navegador. Cada una se graba con recordVideo.
//
// Playwright no graba sonido. Por eso cada pantalla anota qué audios tocó la app
// y cuándo (los mp3 de public/voz y las notas de los efectos): con ese registro
// la edición vuelve a poner el audio real de la app en su momento exacto.
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const APP = process.env.VIDEO_APP_URL ?? 'http://localhost:5173'
export const SALIDA = fileURLToPath(new URL('../../capturas/', import.meta.url))

// La educadora se graba a 1920×1080 «al 125 %» (PLAN.md, 6). recordVideo graba en
// píxeles CSS e ignora el zoom y la densidad de pantalla, así que el aumento se hace
// con el tamaño de fuente del navegador (125 %): la interfaz docente está medida en
// rem y queda igual que con zoom, pero nítida. La tablet se graba tal cual, a 1280×800.
export const EDUCADORA = { width: 1920, height: 1080, fuente: 1.25 }
export const TABLET = { width: 1280, height: 800 }

// Sesión de la educadora (no se versiona): se crea una vez entrando por la pantalla real.
export const ESTADO_DOCENTE = fileURLToPath(new URL('../../.respaldo/docente.json', import.meta.url))

export async function entrarDocente() {
  const { VIDEO_DOCENTE_EMAIL: email, VIDEO_DOCENTE_CLAVE: clave } = process.env
  if (!email || !clave) throw new Error('Faltan VIDEO_DOCENTE_EMAIL y VIDEO_DOCENTE_CLAVE.')
  const b = await abrirNavegador()
  const c = await b.newContext({ locale: 'es-CL' })
  const p = await c.newPage()
  await p.goto(`${APP}/docente/entrar`)
  await p.locator('input[type=email]').fill(email)
  await p.locator('input[type=password]').fill(clave)
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.waitForURL(/\/docente$/)
  await p.getByText('Curso actual').first().waitFor()
  await c.storageState({ path: ESTADO_DOCENTE })
  await c.close()
}

export const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
// Pausas humanas: nada instantáneo.
export const respiro = (min = 500, max = 900) => pausa(min + Math.random() * (max - min))

// Pantallas abiertas: si una toma falla, igual se cierran y se guarda lo grabado para revisarlo.
const abiertas = new Set()
export async function cerrarAbiertas() {
  for (const p of [...abiertas]) await p.cerrar().catch(() => {})
}

let navegador
export async function abrirNavegador() {
  navegador ??= await chromium.launch({
    // Chrome instalado: mismas fuentes y emoji que ve la educadora.
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required', '--force-prefers-reduced-motion=0', '--mute-audio'],
  })
  return navegador
}

export async function cerrarNavegador() {
  await navegador?.close()
  navegador = undefined
}

// Se inyecta antes que la app: puntero visible y registro de audio.
function instrumentar({ puntero }) {
  window.__audio = []
  const anotar = (e) => window.__audio.push({ t: Date.now(), ...e })

  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    // `voz`: la app pide la frase; `voz-suena`: empieza a oírse (la voz en vivo tarda
    // un momento la primera vez); `voz-fin`: termina o la corta otra frase.
    // `__vozActiva`: cuántas frases están pedidas o sonando; la toma espera a que la app
    // termine de hablar antes de tocar, como un niño que escucha la consigna.
    anotar({ tipo: 'voz', src: this.currentSrc || this.src })
    window.__vozActiva = (window.__vozActiva ?? 0) + 1
    let abierta = true
    const cerrar = (tipo) => () => {
      anotar({ tipo, src: this.currentSrc || this.src })
      if (abierta) window.__vozActiva--
      abierta = false
    }
    this.addEventListener('playing', () => anotar({ tipo: 'voz-suena', src: this.currentSrc || this.src }), { once: true })
    this.addEventListener('pause', cerrar('voz-fin'), { once: true })
    this.addEventListener('error', cerrar('voz-error'), { once: true })
    return play.apply(this, arguments)
  }
  // Efectos y música salen de Web Audio (sin archivos): todo lo que la app manda a
  // los parlantes se graba también, tal cual, con un MediaRecorder.
  const conectar = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (destino, ...resto) {
    if (destino === this.context.destination && this.context instanceof AudioContext) {
      if (!window.__grabador) {
        const nodo = this.context.createMediaStreamDestination()
        const rec = new MediaRecorder(nodo.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 })
        const trozos = []
        rec.ondataavailable = (e) => e.data.size && trozos.push(e.data)
        rec.start(1000)
        // Una fuente muda siempre conectada: sin ella el grabador se salta los silencios
        // y los efectos quedan pegados uno tras otro.
        const mudo = this.context.createConstantSource()
        mudo.offset.value = 0
        conectar.call(mudo, nodo)
        mudo.start()
        window.__grabador = { nodo, rec, trozos }
        anotar({ tipo: 'webaudio-inicio' })
      }
      conectar.call(this, window.__grabador.nodo)
    }
    return conectar.call(this, destino, ...resto)
  }
  window.__audioWeb = async () => {
    const g = window.__grabador
    if (!g) return null
    await new Promise((listo) => {
      g.rec.onstop = listo
      g.rec.stop()
    })
    const datos = new Uint8Array(await new Blob(g.trozos).arrayBuffer())
    let binario = ''
    for (let i = 0; i < datos.length; i += 0x8000) binario += String.fromCharCode.apply(null, datos.subarray(i, i + 0x8000))
    return btoa(binario)
  }
  // La voz del navegador no se usa nunca: si la app cae en ella, queda anotado y muda.
  // Pero el ritmo se respeta: la frase «dura» lo que tardaría en decirse, para que la
  // app avance a la misma velocidad que con voz.
  if ('speechSynthesis' in window) {
    let enCurso
    let hablando = false
    const callar = () => {
      clearTimeout(enCurso)
      if (hablando) window.__vozActiva--
      hablando = false
    }
    speechSynthesis.speak = (u) => {
      callar()
      anotar({ tipo: 'voz-navegador', texto: u.text })
      window.__vozActiva = (window.__vozActiva ?? 0) + 1
      hablando = true
      enCurso = setTimeout(() => {
        anotar({ tipo: 'voz-navegador-fin', texto: u.text })
        callar()
        u.onend?.(new Event('end'))
      }, Math.max(700, u.text.length * 72))
    }
    speechSynthesis.cancel = callar
  }

  const montar = () => {
    if (document.getElementById('__puntero')) return
    const estilo = document.createElement('style')
    estilo.textContent = `
      #__puntero { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; will-change: transform; }
      #__puntero.flecha:not(.visible) { display: none; }
      #__puntero.flecha { width: 34px; height: 34px; margin: -3px 0 0 -5px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 3l14 8.5-6.2 1.3 3.6 7-2.7 1.4-3.6-7L5 19z' fill='%23173a5e' stroke='white' stroke-width='1.6' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center / contain;
        filter: drop-shadow(0 2px 3px rgb(0 0 0 / .35)); }
      #__puntero.dedo { width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%;
        background: rgb(255 215 106 / .55); box-shadow: 0 0 0 3px rgb(43 74 107 / .75); opacity: 0; transition: opacity .25s; }
      #__puntero.dedo.visible { opacity: 1; }
      #__puntero.dedo.abajo { background: rgb(255 215 106 / .9); scale: .8; }
      .__onda { position: fixed; z-index: 2147483646; pointer-events: none; width: 20px; height: 20px; margin: -10px 0 0 -10px;
        border-radius: 50%; border: 4px solid #ffd76a; box-shadow: 0 0 0 2px rgb(43 74 107 / .6); animation: __onda .55s ease-out forwards; }
      @keyframes __onda { to { transform: scale(4.5); opacity: 0; } }
    `
    document.head.appendChild(estilo)
    const p = document.createElement('div')
    p.id = '__puntero'
    p.className = puntero
    document.body.appendChild(p)
    let oculto
    const onda = (x, y) => {
      p.classList.add('abajo')
      const o = document.createElement('div')
      o.className = '__onda'
      o.style.left = `${x}px`
      o.style.top = `${y}px`
      document.body.appendChild(o)
      setTimeout(() => o.remove(), 600)
    }
    if (puntero === 'flecha') {
      addEventListener('mousemove', (e) => {
        p.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
        p.classList.add('visible')
      }, true)
      addEventListener('mousedown', (e) => onda(e.clientX, e.clientY), true)
      addEventListener('mouseup', () => p.classList.remove('abajo'), true)
      return
    }
    // Tablet: no hay mouse. El «dedo» es solo un dibujo que la toma lleva hasta donde
    // va a tocar (window.__dedo); el toque es un evento táctil de verdad.
    const ver = () => {
      p.classList.add('visible')
      clearTimeout(oculto)
      oculto = setTimeout(() => p.classList.remove('visible'), 1500)
    }
    window.__dedo = (x, y, ms) => {
      p.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1), opacity .25s`
      p.style.transform = `translate(${x}px, ${y}px)`
      ver()
    }
    addEventListener('pointerdown', (e) => {
      p.style.transition = 'opacity .25s'
      p.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      ver()
      onda(e.clientX, e.clientY)
    }, true)
    addEventListener('pointermove', (e) => {
      if (!e.pressure) return
      p.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      ver()
    }, true)
    for (const fin of ['pointerup', 'pointercancel']) addEventListener(fin, () => p.classList.remove('abajo'), true)
  }
  if (document.body) montar()
  else addEventListener('DOMContentLoaded', montar)
}

const dirEstado = fileURLToPath(new URL('../../.respaldo/', import.meta.url))
const estadoNino = (nombre) => join(dirEstado, `nino-${nombre}.json`)
let curso
export async function datosCurso() {
  curso ??= JSON.parse(await readFile(join(dirEstado, 'curso-video.json'), 'utf8'))
  return curso
}

// La pantalla de la educadora, ya con su sesión y en el curso del video.
export async function abrirEducadora(nombre) {
  if (!existsSync(ESTADO_DOCENTE)) await entrarDocente()
  const { cursoId } = await datosCurso()
  return abrirPantalla(nombre, { tamano: EDUCADORA, puntero: 'flecha', estado: ESTADO_DOCENTE, sesion: { 'leer-para-todos/curso': cursoId } })
}

// La tablet de un niño. `continua`: sigue con la sesión que dejó la toma anterior
// (su credencial y la emoción ya elegida); si no, parte desde la grilla de perfiles.
// `voz`: la tablet ya tiene la voz encendida (la app lo recuerda por dispositivo). Las que
// no se graban van sin voz: la app no espera a que termine cada frase y juegan rápido.
export async function abrirTablet(nombre, nino, { continua = false, emocion = 'alegria', grabar = true, voz = grabar } = {}) {
  const { ninos } = await datosCurso()
  const p = await abrirPantalla(nombre, {
    grabar,
    local: { 'leer-para-todos/voz': voz ? 'si' : 'no' },
    tamano: TABLET,
    // Los niños usan computador: mouse, no toques.
    puntero: 'flecha',
    nino: true,
    estado: continua && existsSync(estadoNino(nino)) ? estadoNino(nino) : undefined,
    sesion: continua ? { [`leer-para-todos/emocion/${ninos[nino]}`]: emocion } : {},
  })
  p.nino = nino
  p.id = ninos[nino]
  const cerrar = p.cerrar
  p.cerrar = async () => {
    await p.contexto.storageState({ path: estadoNino(nino) })
    await cerrar()
  }
  return p
}

// Abre una pantalla que se graba. `puntero`: 'flecha' (educadora) o 'dedo' (niño).
export async function abrirPantalla(nombre, { tamano = EDUCADORA, puntero = 'flecha', estado, sesion = {}, local = {}, grabar = true, nino = false } = {}) {
  const tactil = puntero === 'dedo'
  const b = await abrirNavegador()
  const dir = join(SALIDA, `.tmp-${nombre}`)
  await mkdir(dir, { recursive: true })
  const contexto = await b.newContext({
    viewport: { width: tamano.width, height: tamano.height },
    deviceScaleFactor: 1,
    hasTouch: tactil,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    recordVideo: grabar ? { dir, size: { width: tamano.width, height: tamano.height } } : undefined,
    storageState: estado,
  })
  await contexto.addInitScript(instrumentar, { puntero })
  if (tamano.fuente) {
    await contexto.addInitScript((f) => {
      const poner = () => document.documentElement && (document.documentElement.style.fontSize = `${f * 100}%`)
      poner()
      new MutationObserver(poner).observe(document, { childList: true })
      addEventListener('DOMContentLoaded', poner)
    }, tamano.fuente)
  }
  await contexto.addInitScript(([s, l]) => {
    for (const [k, v] of Object.entries(s)) if (sessionStorage.getItem(k) === null) sessionStorage.setItem(k, v)
    for (const [k, v] of Object.entries(l)) localStorage.setItem(k, v)
  }, [sesion, local])
  const pagina = await contexto.newPage()
  const cdp = tactil ? await contexto.newCDPSession(pagina) : null
  const toque = (type, px, py) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(px), y: Math.round(py) }] })
  const inicio = Date.now()
  let x = tamano.width / 2
  let y = tamano.height / 2
  const marcas = []

  const pantalla = {
    nombre,
    pagina,
    contexto,
    // Un momento con nombre, para cortar y sincronizar en la edición.
    marca(etiqueta) {
      marcas.push({ t: (Date.now() - inicio) / 1000, etiqueta })
    },
    // Mueve el puntero como una mano: con curva y sin saltos.
    async mover(hx, hy, ms = 650) {
      if (tactil) {
        // En la tablet no se mueve nada real: solo el dibujo del dedo.
        await pagina.evaluate(([px, py, d]) => window.__dedo?.(px, py, d), [hx, hy, ms]).catch(() => {})
        await pausa(ms)
        x = hx
        y = hy
        return
      }
      const pasos = Math.max(12, Math.round(ms / 16))
      const [x0, y0] = [x, y]
      for (let i = 1; i <= pasos; i++) {
        const k = i / pasos
        const s = k * k * (3 - 2 * k)
        await pagina.mouse.move(x0 + (hx - x0) * s, y0 + (hy - y0) * s)
        await pausa(ms / pasos)
      }
      x = hx
      y = hy
    },
    async centro(localizador) {
      const el = typeof localizador === 'string' ? pagina.locator(localizador).first() : localizador
      await el.waitFor({ state: 'attached' })
      // Si queda fuera de la vista, se llega con la rueda (como una persona), no de un salto.
      for (let i = 0; i < 4; i++) {
        const antes = await el.boundingBox()
        if (!antes) break
        const medio = antes.y + antes.height / 2
        if (medio > tamano.height * 0.12 && medio < tamano.height * 0.86) break
        await pantalla.desplazar(medio - tamano.height * 0.55, 700)
        const despues = await el.boundingBox()
        if (despues && Math.abs(despues.y - antes.y) < 2) break
      }
      // (Un elemento que late o tiembla nunca queda «quieto»: no se espera a que lo esté.)
      let c = await el.boundingBox()
      if (!c || c.y < 0 || c.y + c.height > tamano.height) {
        await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {})
        c = await el.boundingBox()
      }
      if (!c) throw new Error(`[${nombre}] no se ve: ${localizador}`)
      return { x: c.x + c.width / 2, y: c.y + c.height / 2, caja: c }
    },
    // Va hasta el elemento, espera un instante y hace clic.
    async clic(localizador, { antes = 250, despues = 700, ms } = {}) {
      const c = await pantalla.centro(localizador)
      if (nino && !tactil) {
        // En la vista del niño, apuntar un botón un momento hace que la app diga su
        // nombre. Para que se oiga solo lo que responde al clic, el puntero espera
        // justo debajo del botón y entra en el último instante.
        const fuera = c.caja.y + c.caja.height + 22 < tamano.height - 6 ? c.caja.y + c.caja.height + 22 : c.caja.y - 18
        await pantalla.mover(c.x, fuera, ms)
        await pausa(Math.min(antes, 250))
        await pantalla.mover(c.x, c.y, 110)
        await pagina.mouse.down()
        await pausa(90)
        await pagina.mouse.up()
        await pausa(Math.min(despues, 150))
        // Y después se aparta a un rincón sin botones.
        await pantalla.mover(70, tamano.height - 60, 320)
        await pausa(Math.max(0, despues - 470))
        return c
      }
      await pantalla.mover(c.x, c.y, ms)
      await pausa(antes)
      if (tactil) {
        // Un toque de verdad (eventos táctiles), con el dedo apoyado un instante.
        await toque('touchStart', c.x, c.y)
        await pausa(70)
        await toque('touchEnd')
      } else {
        await pagina.mouse.down()
        await pausa(90)
        await pagina.mouse.up()
      }
      await pausa(despues)
      return c
    },
    // Toca un punto de la pantalla (para lo que se mueve, como un globo).
    async tocar(px, py) {
      if (!tactil) {
        await pagina.mouse.move(px, py)
        x = px
        y = py
        await pagina.mouse.down()
        await pausa(70)
        await pagina.mouse.up()
        return
      }
      await toque('touchStart', px, py)
      await pausa(70)
      await toque('touchEnd')
    },
    // Un trazo con el dedo siguiendo puntos de pantalla (dibujar, repasar una letra).
    async trazar(puntos, ms = 1400) {
      await pantalla.mover(puntos[0][0], puntos[0][1], 500)
      if (!tactil) {
        await pagina.mouse.down()
        await pausa(120)
        for (const [bx, by] of puntos.slice(1)) await pantalla.mover(bx, by, ms / (puntos.length - 1))
        await pagina.mouse.up()
        await pausa(350)
        return
      }
      await toque('touchStart', puntos[0][0], puntos[0][1])
      await pausa(120)
      for (let i = 1; i < puntos.length; i++) {
        const [ax, ay] = puntos[i - 1]
        const [bx, by] = puntos[i]
        const pasos = Math.max(4, Math.round(ms / (puntos.length - 1) / 16))
        for (let k = 1; k <= pasos; k++) {
          await toque('touchMove', ax + ((bx - ax) * k) / pasos, ay + ((by - ay) * k) / pasos)
          await pausa(16)
        }
      }
      await toque('touchEnd')
      x = puntos.at(-1)[0]
      y = puntos.at(-1)[1]
      await pausa(350)
    },
    // Elige una opción de un <select> como lo haría una persona: clic y opción.
    async elegir(localizador, valor) {
      const el = typeof localizador === 'string' ? pagina.locator(localizador).first() : localizador
      const c = await pantalla.centro(el)
      await pantalla.mover(c.x, c.y)
      await pausa(350)
      await el.selectOption(valor)
      await pausa(800)
    },
    // Baja o sube la página con suavidad.
    async desplazar(dy, ms = 900) {
      const pasos = Math.round(ms / 16)
      for (let i = 0; i < pasos; i++) {
        await pagina.mouse.wheel(0, dy / pasos)
        await pausa(16)
      }
      await pausa(350)
    },
    // Escribe letra por letra.
    async escribir(localizador, texto, { limpiar = false } = {}) {
      await pantalla.clic(localizador, { despues: 250 })
      if (limpiar) {
        await pagina.keyboard.press('Control+A')
        await pausa(250)
        await pagina.keyboard.press('Backspace')
        await pausa(250)
      }
      await pagina.keyboard.type(texto, { delay: 85 })
      await pausa(450)
    },
    // Arrastra con el mouse real (dispara dragstart/drop de HTML5 en Chrome).
    async arrastrar(desde, hasta, ms = 1100) {
      const a = await pantalla.centro(desde)
      const b2 = await pantalla.centro(hasta)
      await pantalla.mover(a.x, a.y)
      await pausa(300)
      await pagina.mouse.down()
      await pausa(200)
      await pantalla.mover(a.x + 12, a.y + 8, 120)
      await pantalla.mover(b2.x, b2.y, ms)
      await pausa(350)
      await pagina.mouse.up()
      await pausa(600)
    },
    // Cierra, deja el video en capturas/<nombre>.webm y el registro en <nombre>.json.
    async cerrar() {
      abiertas.delete(pantalla)
      const audio = await pagina.evaluate(() => window.__audio ?? []).catch(() => [])
      const audioWeb = await pagina.evaluate(() => window.__audioWeb?.()).catch(() => null)
      if (audioWeb) await writeFile(join(SALIDA, `${nombre}.app.webm`), Buffer.from(audioWeb, 'base64'))
      else await rm(join(SALIDA, `${nombre}.app.webm`), { force: true })
      const video = pagina.video()
      await contexto.close()
      if (!video) {
        await rm(dir, { recursive: true, force: true })
        return console.log(`✔ ${nombre} (sin grabar)`)
      }
      const destino = join(SALIDA, `${nombre}.webm`)
      await rm(destino, { force: true })
      await rename(await video.path(), destino)
      await rm(dir, { recursive: true, force: true })
      await writeFile(
        join(SALIDA, `${nombre}.json`),
        // `inicio`: reloj común para sincronizar dos pantallas grabadas a la vez.
        JSON.stringify({ nombre, tamano, inicio, marcas, audio: audio.map((a) => ({ ...a, t: (a.t - inicio) / 1000, src: a.src?.replace(/^https?:\/\/[^/]+/, '') })) }, null, 1),
      )
      console.log(`✔ ${nombre}.webm (${marcas.length} marcas, ${audio.length} sonidos)`)
    },
  }
  abiertas.add(pantalla)
  return pantalla
}

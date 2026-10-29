import './style.css'

const body = document.body
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const WHATSAPP = '5521981235592'

/* ---------- Fingerprint ---------- */
function buildFingerprint(svg) {
  const NS = 'http://www.w3.org/2000/svg'
  const cx = 60
  const cy = 74
  const paths = []

  for (let i = 0; i < 9; i++) {
    const r = 6 + i * 6
    const ry = r * 1.16
    // Open at the bottom, a little asymmetric so it reads as a real print
    const start = 128 - i * 3 + (i % 2) * 6
    const end = 412 + i * 2 - (i % 3) * 5
    // Some rings get a break to look organic
    const gap = i % 3 === 1 ? [300 + i * 4, 318 + i * 4] : null
    const segments = gap ? [[start, gap[0]], [gap[1], end]] : [[start, end]]

    segments.forEach(([a0, a1]) => {
      let d = ''
      for (let a = a0; a <= a1; a += 4) {
        const t = (a * Math.PI) / 180
        const wobble = Math.sin(a / 23 + i) * 0.6
        const x = cx + (r + wobble) * Math.cos(t)
        const y = cy - 4 + (ry + wobble) * Math.sin(t)
        d += `${d ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
      }
      const p = document.createElementNS(NS, 'path')
      p.setAttribute('d', d)
      svg.appendChild(p)
      paths.push(p)
    })
  }

  // Lower whorl lines
  ;[[18, 118, 102, 118], [26, 128, 94, 128]].forEach(([x1, y1, x2, y2]) => {
    const p = document.createElementNS(NS, 'path')
    p.setAttribute('d', `M${x1} ${y1} Q60 ${y1 - 14} ${x2} ${y2}`)
    svg.appendChild(p)
    paths.push(p)
  })

  return paths
}

/* ---------- Gate ---------- */
function setupGate() {
  const gate = document.getElementById('gate')
  if (!gate) return
  const scanner = document.getElementById('scanner')
  const status = document.getElementById('gate-status')
  const skip = document.getElementById('gate-skip')
  const ring = document.getElementById('ring-progress')
  const ridges = buildFingerprint(document.getElementById('fingerprint'))
  const CIRC = 2 * Math.PI * 104
  let started = false

  const unlock = (instant = false) => {
    try { sessionStorage.setItem('cp-unlocked', '1') } catch { /* sem storage */ }
    gate.classList.add('is-opening')
    window.scrollTo(0, 0)
    body.classList.remove('is-locked')
    body.classList.add('is-unlocked')
    revealHero()
    setTimeout(() => {
      gate.classList.add('is-gone')
      gate.setAttribute('aria-hidden', 'true')
      document.getElementById('hero-title')?.focus({ preventScroll: true })
    }, instant ? 0 : 1700)
  }

  let alreadyUnlocked = false
  try { alreadyUnlocked = sessionStorage.getItem('cp-unlocked') === '1' } catch { /* sem storage */ }
  if (alreadyUnlocked) {
    gate.classList.add('is-gone')
    body.classList.remove('is-locked')
    body.classList.add('is-unlocked')
    revealHero()
    return
  }

  // The site always opens from the top behind the gate
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)

  const scan = () => {
    if (started) return
    started = true
    scanner.disabled = true

    if (reduceMotion) {
      status.textContent = 'Acesso liberado'
      gate.classList.add('is-granted')
      setTimeout(() => unlock(), 500)
      return
    }

    gate.classList.add('is-placing')
    status.textContent = 'Posicionando…'

    setTimeout(() => {
      gate.classList.add('is-scanning')
      const duration = 2200
      const t0 = performance.now()
      const order = ridges.map((_, i) => i)

      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 2)
        ring.style.strokeDashoffset = String(CIRC * (1 - eased))
        status.textContent = `Lendo digital · ${Math.round(eased * 100)}%`
        const lit = Math.floor(eased * order.length)
        for (let i = 0; i < lit; i++) ridges[order[i]].classList.add('lit')
        if (p < 1) return requestAnimationFrame(tick)

        gate.classList.remove('is-scanning', 'is-placing')
        gate.classList.add('is-granted')
        status.textContent = 'Acesso liberado'
        if (navigator.vibrate) navigator.vibrate([18, 40, 18])
        setTimeout(() => unlock(), 1250)
      }
      requestAnimationFrame(tick)
    }, 950)
  }

  scanner.addEventListener('click', scan)
  skip.addEventListener('click', () => { started = true; unlock(true) })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !gate.classList.contains('is-gone')) { started = true; unlock(true) }
  })
  scanner.focus({ preventScroll: true })
}

function revealHero() {
  document.querySelectorAll('.hero .reveal').forEach((el, i) => {
    el.style.setProperty('--d', `${0.55 + i * 0.12}s`)
    el.classList.add('is-visible')
  })
}

/* ---------- Scroll reveal ---------- */
function setupReveal() {
  const items = [...document.querySelectorAll('.reveal')].filter((el) => !el.closest('.hero'))
  const groups = new Map()
  items.forEach((el) => {
    const parent = el.parentElement
    const idx = groups.get(parent) ?? 0
    groups.set(parent, idx + 1)
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(idx, 6) * 0.08}s`)
  })

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'))
    return
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      io.unobserve(entry.target)
    })
  }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' })
  items.forEach((el) => io.observe(el))
}

/* ---------- Navigation ---------- */
function setupNav() {
  const nav = document.getElementById('nav')
  const toggle = document.getElementById('nav-toggle')
  const links = document.getElementById('nav-links')

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true'
    toggle.setAttribute('aria-expanded', String(open))
    links.classList.toggle('is-open', open)
  })
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      toggle.setAttribute('aria-expanded', 'false')
      links.classList.remove('is-open')
    }
  })

  let ticking = false
  const aura = document.querySelector('.hero__aura')
  const portrait = document.querySelector('.portrait__frame img')
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      const y = window.scrollY
      nav.classList.toggle('is-scrolled', y > 40)
      if (!reduceMotion && y < window.innerHeight * 1.2) {
        aura?.style.setProperty('--parallax', `${y * 0.25}px`)
        portrait?.style.setProperty('--parallax-img', `${y * -0.04}px`)
      }
      ticking = false
    })
  }, { passive: true })
}

/* ---------- Micro-interactions ---------- */
function setupInteractions() {
  if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return

  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
  })

  document.querySelectorAll('.magnetic').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect()
      const x = (e.clientX - r.left - r.width / 2) * 0.18
      const y = (e.clientY - r.top - r.height / 2) * 0.3
      btn.style.transform = `translate(${x}px, ${y}px)`
    })
    btn.addEventListener('pointerleave', () => { btn.style.transform = '' })
  })
}

/* ---------- Lead form → WhatsApp ---------- */
function setupForm() {
  const form = document.getElementById('lead-form')
  if (!form) return
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = form.name.value.trim()
    if (!name) {
      form.name.classList.add('is-invalid')
      form.name.focus()
      return
    }
    form.name.classList.remove('is-invalid')
    const lines = [
      `Olá, Camilla! Me chamo ${name}.`,
      `Tenho interesse em: ${form.type.value}.`,
      form.message.value.trim() && `Sobre o projeto: ${form.message.value.trim()}`,
    ].filter(Boolean)
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener')
  })
}

document.getElementById('year').textContent = String(new Date().getFullYear())
setupGate()
setupReveal()
setupNav()
setupInteractions()
setupForm()

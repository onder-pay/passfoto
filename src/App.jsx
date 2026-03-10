import { useState, useRef, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════
// COUNTRY PRESETS
// ═══════════════════════════════════════════
const PRESETS = {
  schengen: {
    name: 'Schengen', flag: '🇪🇺',
    width: 35, height: 45, dpi: 600,
    faceRatio: { min: 0.70, max: 0.80 },
    notes: 'Beyaz/açık gri arka plan, gözlük ve küpe yasak',
    rules: [
      'Beyaz veya açık gri arka plan',
      'Tam karşıdan çekilmiş, nötr ifade, ağız kapalı',
      'Gözlük, küpe ve başı örten aksesuar yasak',
      'Yüzde veya fonda gölge olmamalı',
      'Son 6 ay içinde çekilmiş olmalı',
      'Pasaporttaki fotoğrafla aynı olmamalı',
    ],
  },
  usa: {
    name: 'ABD', flag: '🇺🇸',
    width: 51, height: 51, dpi: 600,
    faceRatio: { min: 0.50, max: 0.69 },
    notes: 'Beyaz arka plan, gözlük kesinlikle yasak',
    rules: [
      'Düz beyaz veya kırık beyaz arka plan',
      'Renkli fotoğraf, tam karşıdan, nötr ifade',
      'Gözlük kesinlikle yasak (tıbbi istisna hariç)',
      'Kulaklık, bluetooth cihaz yasak',
      'Günlük kıyafet (üniforma yasak)',
      'Dini sebep hariç başlık/şapka yasak',
      'Son 6 ay içinde çekilmiş olmalı',
    ],
  },
  china: {
    name: 'Çin', flag: '🇨🇳',
    width: 33, height: 48, dpi: 600,
    faceRatio: { min: 0.70, max: 0.80 },
    notes: 'Beyaz arka plan, kulaklar görünür, rötuşsuz',
    rules: [
      'Beyaz arka plan, fonda gölge olmamalı',
      'Tam cepheden, nötr ifade, gözler açık',
      'Baş genişliği fotoğrafın %70-80\'i olmalı',
      'Kulaklar görünür olmalı, saç gözleri/kaşları/kulakları kapatmamalı',
      'Rötuş yapılmamalı, doğal cilt tonu',
      'Gözlük: gölge/parlama/renkli cam yoksa kullanılabilir',
      'Kıyafet rengi arka fonla aynı olmamalı',
      'Dini sebep hariç başörtüsü/şapka yasak',
      'Son 6 ay içinde çekilmiş, 2 adet gerekli',
    ],
  },
  uk: {
    name: 'İngiltere', flag: '🇬🇧',
    width: 35, height: 45, dpi: 600,
    faceRatio: { min: 0.70, max: 0.80 },
    minPixels: { w: 600, h: 750 },
    fileSize: { min: 50, max: 6144 }, // KB
    notes: 'Açık renkli arka plan, min 600×750px',
    rules: [
      'Düz açık renkli arka plan',
      'Minimum 600×750 piksel, 50KB-6MB arası',
      'Tam karşıdan, nötr ifade, ağız kapalı',
      'Baş, omuzlar ve üst gövde görünmeli',
      'Gözlük: zorunlu değilse çıkarın, takılıysa gözler net görünmeli',
      'Dini/tıbbi sebep hariç başlık yasak',
      'Omuzlar ve gövde giyinik olmalı',
      'Başka birinin çekmesi tavsiye edilir',
      'Kimlik belgesindeki fotoğrafla aynı olmamalı',
    ],
  },
  russia: {
    name: 'Rusya', flag: '🇷🇺',
    width: 35, height: 45, dpi: 600,
    faceRatio: { min: 0.70, max: 0.80 },
    notes: 'Açık renkli arka plan, gözlük izinli (koşullu)',
    rules: [
      'Düz açık renkli arka plan, gölgesiz',
      'Tam cepheden, nötr ifade, ağız kapalı, gözler açık',
      'Yüz oranı fotoğrafın %70-80\'i olmalı',
      'Eşit aydınlatma, flaş yansıması ve kırmızı göz olmamalı',
      'Gözlük kullanılabilir (parlama/renkli cam/kalın çerçeve yasak)',
      'Dini sebep hariç başlık yasak',
      'Fotoğrafta sadece başvuru sahibi olmalı',
      'Doğal cilt tonu, renk nötr olmalı',
      'Son 6 ay içinde çekilmiş olmalı',
    ],
  },
}

const mmToPx = (mm, dpi) => Math.round((mm / 25.4) * dpi)

// ═══════════════════════════════════════════
// HISTORY HELPERS
// ═══════════════════════════════════════════
const HISTORY_KEY = 'paydos_foto_history'
const MAX_HISTORY = 20

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveToHistory(entry) {
  try {
    const history = loadHistory()
    history.unshift(entry)
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch (e) { console.warn('History save failed', e) }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// ═══════════════════════════════════════════
// FACE GUIDE OVERLAY
// ═══════════════════════════════════════════
function FaceGuide({ preset, vw, vh }) {
  const aspect = preset.width / preset.height
  const guideH = vh * 0.70
  const guideW = guideH * aspect
  const cx = vw / 2
  const cy = vh / 2
  const topY = cy - guideH / 2
  const eyeY = topY + guideH * 0.38
  const chinY = topY + guideH * 0.85

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <mask id="faceMask">
          <rect width="100%" height="100%" fill="white" />
          <ellipse cx={cx} cy={cy - guideH * 0.02} rx={guideW * 0.42} ry={guideH * 0.44} fill="black" />
        </mask>
      </defs>

      {/* Dark overlay */}
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#faceMask)" />

      {/* Oval guide */}
      <ellipse cx={cx} cy={cy - guideH * 0.02} rx={guideW * 0.42} ry={guideH * 0.44}
        fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="8 5" />

      {/* Outer frame */}
      <rect x={cx - guideW / 2} y={topY} width={guideW} height={guideH}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" rx="4" />

      {/* Corner marks */}
      {[[cx - guideW / 2, topY, 1, 1], [cx + guideW / 2, topY, -1, 1],
        [cx - guideW / 2, topY + guideH, 1, -1], [cx + guideW / 2, topY + guideH, -1, -1]
      ].map(([x, y, dx, dy], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + dx * 20} y2={y} stroke="#2563eb" strokeWidth="3" />
          <line x1={x} y1={y} x2={x} y2={y + dy * 20} stroke="#2563eb" strokeWidth="3" />
        </g>
      ))}

      {/* Eye line */}
      <line x1={cx - guideW / 2 + 15} y1={eyeY} x2={cx + guideW / 2 - 15} y2={eyeY}
        stroke="rgba(100,200,255,0.4)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={cx + guideW / 2 - 12} y={eyeY - 5}
        fill="rgba(100,200,255,0.6)" fontSize="9" textAnchor="end" fontFamily="Inter">göz</text>

      {/* Chin line */}
      <line x1={cx - guideW / 2 + 15} y1={chinY} x2={cx + guideW / 2 - 15} y2={chinY}
        stroke="rgba(100,200,255,0.4)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={cx + guideW / 2 - 12} y={chinY - 5}
        fill="rgba(100,200,255,0.6)" fontSize="9" textAnchor="end" fontFamily="Inter">çene</text>

      {/* Center line */}
      <line x1={cx} y1={topY + 8} x2={cx} y2={topY + guideH - 8}
        stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 6" />
    </svg>
  )
}

// ═══════════════════════════════════════════
// WARNING BADGES
// ═══════════════════════════════════════════
function Warnings({ items }) {
  if (!items.length) return null
  return (
    <div style={{
      position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', zIndex: 10,
    }}>
      {items.map((w, i) => (
        <div key={i} className="fade-in" style={{
          background: w.type === 'ok' ? 'var(--success)' : w.type === 'error' ? 'var(--error)' : 'var(--warning)',
          color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 13,
          fontWeight: 500, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
          {w.type === 'ok' ? '✓' : w.type === 'error' ? '✕' : '⚠'} {w.msg}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [step, setStep] = useState('home') // home | camera | preview | result | history
  const [country, setCountry] = useState('schengen')
  const [customerName, setCustomerName] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [warnings, setWarnings] = useState([])
  const [capturedImg, setCapturedImg] = useState(null)
  const [croppedImg, setCroppedImg] = useState(null)
  const [printImg, setPrintImg] = useState(null)
  const [history, setHistory] = useState([])

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const detectLoopRef = useRef(null)
  const vSizeRef = useRef({ w: 640, h: 480 })

  const preset = PRESETS[country]

  // ── Load history ──
  useEffect(() => { setHistory(loadHistory()) }, [])

  // ── Init FaceDetector ──
  useEffect(() => {
    if ('FaceDetector' in window) {
      try { detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) }
      catch { detectorRef.current = null }
    }
    return () => { detectorRef.current = null }
  }, [])

  // ── Camera controls ──
  const stopCamera = useCallback(() => {
    if (detectLoopRef.current) { cancelAnimationFrame(detectLoopRef.current); detectLoopRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          vSizeRef.current = { w: videoRef.current.videoWidth, h: videoRef.current.videoHeight }
          setCameraReady(true)
        }
      }
    } catch {
      setCameraError('Kamera erişimi reddedildi. Tarayıcı ayarlarından kamera iznini açın.')
    }
  }, [facingMode, stopCamera])

  // ── Face detection loop ──
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !cameraReady) return
    const v = videoRef.current
    const vw = v.videoWidth
    const vh = v.videoHeight

    if (detectorRef.current) {
      try {
        const faces = await detectorRef.current.detect(v)
        const w = []

        if (faces.length === 0) {
          w.push({ type: 'error', msg: 'Yüz bulunamadı' })
        } else if (faces.length > 1) {
          w.push({ type: 'error', msg: 'Birden fazla yüz algılandı' })
        } else {
          const b = faces[0].boundingBox
          const fcx = b.x + b.width / 2
          const fcy = b.y + b.height / 2

          if (Math.abs(fcx - vw / 2) / vw > 0.1) w.push({ type: 'warn', msg: 'Yüzü sağa/sola ortala' })
          if (Math.abs(fcy - vh * 0.44) / vh > 0.1) w.push({ type: 'warn', msg: 'Yüzü yukarı/aşağı ortala' })

          const ratio = b.height / vh
          if (ratio < 0.22) w.push({ type: 'warn', msg: 'Daha yakına gelin' })
          else if (ratio > 0.6) w.push({ type: 'warn', msg: 'Biraz uzaklaşın' })

          if (b.width > 0 && Math.abs(b.width / b.height - 1) > 0.4) {
            w.push({ type: 'warn', msg: 'Başınızı düz tutun' })
          }

          if (w.length === 0) w.push({ type: 'ok', msg: 'Çekim için hazır!' })
        }
        setWarnings(w)
      } catch { /* ignore */ }
    } else {
      setWarnings([{ type: 'warn', msg: 'Yüzü oval kılavuza hizalayın' }])
    }

    detectLoopRef.current = requestAnimationFrame(() => {
      setTimeout(runDetection, 250)
    })
  }, [cameraReady])

  useEffect(() => {
    if (cameraReady && step === 'camera') runDetection()
    return () => { if (detectLoopRef.current) cancelAnimationFrame(detectLoopRef.current) }
  }, [cameraReady, step, runDetection])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  // ── Capture ──
  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')

    // Mirror for selfie cam
    if (facingMode === 'user') {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    setCapturedImg(c.toDataURL('image/jpeg', 0.95))
    stopCamera()
    setStep('preview')
  }, [facingMode, stopCamera])

  // ── Crop to preset ──
  const cropPhoto = useCallback(() => {
    if (!capturedImg) return
    const img = new Image()
    img.onload = () => {
      const sw = img.width, sh = img.height
      const targetAspect = preset.width / preset.height
      let cw, ch, cx, cy

      if (sw / sh > targetAspect) {
        ch = sh; cw = ch * targetAspect
        cx = (sw - cw) / 2; cy = 0
      } else {
        cw = sw; ch = cw / targetAspect
        cx = 0; cy = (sh - ch) * 0.35
      }

      const outW = mmToPx(preset.width, preset.dpi)
      const outH = mmToPx(preset.height, preset.dpi)
      const canvas = document.createElement('canvas')
      canvas.width = outW; canvas.height = outH
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, outW, outH)

      const cropped = canvas.toDataURL('image/jpeg', 0.95)
      setCroppedImg(cropped)
      makePrintSheet(cropped)

      // Save to history
      const thumbCanvas = document.createElement('canvas')
      thumbCanvas.width = 120; thumbCanvas.height = Math.round(120 / targetAspect)
      const tctx = thumbCanvas.getContext('2d')
      tctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height)

      const entry = {
        id: Date.now(),
        name: customerName.trim() || 'İsimsiz',
        country: country,
        countryName: preset.name,
        flag: preset.flag,
        size: `${preset.width}×${preset.height}mm`,
        date: new Date().toLocaleString('tr-TR'),
        thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.7),
      }
      saveToHistory(entry)
      setHistory(loadHistory())

      setStep('result')
    }
    img.src = capturedImg
  }, [capturedImg, preset, country, customerName])

  // ── Print sheet ──
  const makePrintSheet = (photoUrl) => {
    const dpi = 300
    const sheetW = mmToPx(152, dpi)
    const sheetH = mmToPx(102, dpi)
    const pw = mmToPx(preset.width, dpi)
    const ph = mmToPx(preset.height, dpi)
    const gap = mmToPx(2, dpi)

    const cols = Math.floor((sheetW - gap) / (pw + gap))
    const rows = Math.floor((sheetH - gap) / (ph + gap))

    const canvas = document.createElement('canvas')
    canvas.width = sheetW; canvas.height = sheetH
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, sheetW, sheetH)

    const img = new Image()
    img.onload = () => {
      const tw = cols * pw + (cols - 1) * gap
      const th = rows * ph + (rows - 1) * gap
      const sx = (sheetW - tw) / 2
      const sy = (sheetH - th) / 2

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = sx + c * (pw + gap)
          const y = sy + r * (ph + gap)
          ctx.strokeStyle = '#bbb'
          ctx.lineWidth = 0.5
          ctx.setLineDash([3, 3])
          ctx.strokeRect(x - 0.5, y - 0.5, pw + 1, ph + 1)
          ctx.setLineDash([])
          ctx.drawImage(img, x, y, pw, ph)
        }
      }

      const label = customerName.trim()
        ? `${customerName.trim()} — ${preset.name} ${preset.width}×${preset.height}mm — Paydos Tur`
        : `${preset.name} ${preset.width}×${preset.height}mm — Paydos Tur`
      ctx.fillStyle = '#888'
      ctx.font = `${mmToPx(2.2, dpi)}px Inter, sans-serif`
      ctx.fillText(label, gap * 2, sheetH - gap)

      setPrintImg(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.src = photoUrl
  }

  // ── Download ──
  const download = (url, name) => {
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
  }

  // ── Filename helper ──
  const safeName = () => {
    const n = customerName.trim().replace(/\s+/g, '_').replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ0-9_-]/g, '') || 'foto'
    return n
  }

  // ── Reset ──
  const reset = (toStep = 'home') => {
    stopCamera()
    setCapturedImg(null); setCroppedImg(null); setPrintImg(null)
    setWarnings([]); setCameraError(null)
    setStep(toStep)
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div style={{ minHeight: '100vh', position: 'relative', paddingBottom: 20 }}>

      {/* ══ HEADER ══ */}
      <header style={{
        padding: '14px 20px',
        background: 'linear-gradient(135deg, #0f1724, #1a2236)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => reset('home')}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
          }}>📷</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>Biyometrik Fotoğraf</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Paydos Tur</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step !== 'home' && step !== 'history' && (
            <button onClick={() => reset('home')} style={{
              background: 'rgba(255,255,255,0.08)', color: '#8899bb',
              padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13,
            }}>← Başa Dön</button>
          )}
          <button onClick={() => { setHistory(loadHistory()); setStep('history') }} style={{
            background: step === 'history' ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.06)',
            color: step === 'history' ? '#5b9aff' : '#667',
            padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 16,
          }}>🕐</button>
        </div>
      </header>

      {/* ══ HOME ══ */}
      {step === 'home' && (
        <div className="fade-in" style={{ padding: 20 }}>

          {/* Customer name */}
          <div style={{
            marginBottom: 20, background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16,
          }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              MÜŞTERİ ADI
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="İsim girin (dosya adına yazılır)"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', color: 'var(--text-primary)', fontSize: 15,
              }}
            />
          </div>

          {/* Country select */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12 }}>
            ÜLKE SEÇİN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => setCountry(key)} style={{
                background: country === key ? 'var(--bg-card-active)' : 'var(--bg-card)',
                border: country === key ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', padding: '13px 16px', color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{p.flag}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{p.notes}</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 12, color: '#5a7bc4', fontWeight: 700,
                  background: 'rgba(90,123,196,0.12)', padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap',
                }}>{p.width}×{p.height}mm</div>
              </button>
            ))}
          </div>

          {/* Selected country rules */}
          <div style={{
            marginTop: 16, padding: 16,
            background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(37,99,235,0.15)',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>{preset.flag}</span>
              <span>{preset.name} Fotoğraf Kuralları</span>
              <span style={{
                fontSize: 11, color: '#5a7bc4', fontWeight: 600,
                background: 'rgba(90,123,196,0.12)', padding: '2px 8px', borderRadius: 6,
              }}>{preset.width}×{preset.height}mm</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {preset.rules.map((rule, i) => (
                <div key={i} style={{
                  fontSize: 12, color: '#9aadcc', lineHeight: 1.5,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <span style={{
                    color: rule.toLowerCase().includes('yasak') || rule.toLowerCase().includes('olmamalı')
                      ? '#e07070' : '#5a9a6a',
                    fontSize: 11, flexShrink: 0, marginTop: 1,
                  }}>
                    {rule.toLowerCase().includes('yasak') || rule.toLowerCase().includes('olmamalı') ? '✕' : '✓'}
                  </span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button onClick={() => { setStep('camera'); setTimeout(startCamera, 150) }}
            style={{
              width: '100%', marginTop: 20, padding: 16,
              background: 'var(--accent-gradient)', borderRadius: 'var(--radius-lg)',
              color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '0.3px',
              boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
            }}>
            📷 Kamerayı Aç
          </button>

          {/* General tips */}
          <div style={{
            marginTop: 16, padding: 16,
            background: 'rgba(255,200,50,0.06)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,200,50,0.12)',
          }}>
            <div style={{ fontSize: 13, color: '#d4b44a', fontWeight: 600, marginBottom: 6 }}>💡 Genel Çekim İpuçları</div>
            <div style={{ fontSize: 12, color: '#9a8b60', lineHeight: 1.7 }}>
              • Beyaz/açık fon önünde çekin, fonda gölge olmasın<br />
              • İki taraftan eşit ışık verin (yüzde gölge olmasın)<br />
              • Tam karşıdan, nötr ifade, ağız kapalı, gözler açık<br />
              • Saç yüzü, gözleri veya kulakları kapatmasın<br />
              • Arka kamera daha yüksek çözünürlük verir<br />
              • Fotoğraf son 6 ay içinde çekilmiş olmalı
            </div>
          </div>
        </div>
      )}

      {/* ══ CAMERA ══ */}
      {step === 'camera' && (
        <div className="fade-in">
          {cameraError ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
              <div style={{ color: '#e85050', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{cameraError}</div>
              <button onClick={startCamera} style={{
                padding: '12px 28px', background: 'var(--accent-blue)', borderRadius: 'var(--radius-sm)',
                color: '#fff', fontSize: 14, fontWeight: 600,
              }}>Tekrar Dene</button>
            </div>
          ) : (
            <>
              {/* Video container */}
              <div style={{ position: 'relative', width: '100%', background: '#000', aspectRatio: '3/4', overflow: 'hidden' }}>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }} />
                {cameraReady && <FaceGuide preset={preset} vw={vSizeRef.current.w} vh={vSizeRef.current.h} />}
                <Warnings items={warnings} />

                {/* Top info badge */}
                <div style={{
                  position: 'absolute', top: 10, left: 10,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#aabbdd',
                }}>
                  {preset.flag} {preset.name} — {preset.width}×{preset.height}mm
                </div>

                {customerName.trim() && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#88ccaa',
                  }}>
                    👤 {customerName.trim()}
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 28, padding: '20px 0', background: 'var(--bg-primary)',
              }}>
                <button onClick={() => { setFacingMode(f => f === 'user' ? 'environment' : 'user'); setTimeout(startCamera, 200) }}
                  style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)', color: '#aaa', fontSize: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>🔄</button>

                <button onClick={capture} disabled={!cameraReady}
                  style={{
                    width: 76, height: 76, borderRadius: '50%',
                    background: cameraReady ? 'var(--accent-gradient)' : '#333',
                    border: '4px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: cameraReady ? '0 0 30px rgba(37,99,235,0.3)' : 'none',
                  }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.8)',
                  }} />
                </button>

                <div style={{ width: 50 }} /> {/* Spacer */}
              </div>
            </>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* ══ PREVIEW ══ */}
      {step === 'preview' && capturedImg && (
        <div className="fade-in" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12 }}>ÇEKİLEN FOTOĞRAF</div>
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
            <img src={capturedImg} alt="" style={{ width: '100%', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setCapturedImg(null); setStep('camera'); setTimeout(startCamera, 150) }}
              style={{
                flex: 1, padding: 14, background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                color: '#aab', fontSize: 14, fontWeight: 600,
              }}>🔄 Tekrar Çek</button>
            <button onClick={cropPhoto}
              style={{
                flex: 1, padding: 14, background: 'var(--accent-gradient)',
                borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 14, fontWeight: 600,
                boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
              }}>✓ Onayla & Kırp</button>
          </div>
        </div>
      )}

      {/* ══ RESULT ══ */}
      {step === 'result' && (
        <div className="slide-up" style={{ padding: 20 }}>

          {/* Success banner */}
          <div style={{
            background: 'rgba(40,160,80,0.1)', border: '1px solid rgba(40,160,80,0.2)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Fotoğraf Hazır!</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {customerName.trim() && <>{customerName.trim()} — </>}
                {preset.flag} {preset.name} {preset.width}×{preset.height}mm
              </div>
            </div>
          </div>

          {/* Digital photo */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>DİJİTAL FOTOĞRAF</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
            <div style={{
              borderRadius: 'var(--radius-sm)', overflow: 'hidden',
              border: '1px solid var(--border-subtle)', flexShrink: 0,
              width: preset.width >= preset.height ? 150 : 115, background: '#fff',
            }}>
              {croppedImg && <img src={croppedImg} alt="" style={{ width: '100%', display: 'block' }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontSize: 12, color: '#889' }}>{preset.flag} {preset.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{preset.width}×{preset.height}mm</div>
              <div style={{ fontSize: 12, color: '#556', marginTop: 4 }}>{preset.dpi} DPI • JPEG</div>
              <button onClick={() => download(croppedImg, `${safeName()}_${country}_${preset.width}x${preset.height}.jpg`)}
                style={{
                  marginTop: 12, padding: '10px 0', width: '100%',
                  background: 'var(--accent-gradient)', borderRadius: 'var(--radius-sm)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  boxShadow: '0 2px 12px rgba(37,99,235,0.2)',
                }}>💾 Dijital İndir</button>
            </div>
          </div>

          {/* Print sheet */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>BASKIYA HAZIR ŞABLON (10×15cm)</div>
          <div style={{
            borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            border: '1px solid var(--border-subtle)', marginBottom: 12, background: '#fff',
          }}>
            {printImg && <img src={printImg} alt="" style={{ width: '100%', display: 'block' }} />}
          </div>
          <button onClick={() => download(printImg, `${safeName()}_baski_10x15.jpg`)}
            style={{
              width: '100%', padding: 14, background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
              color: '#ccd', fontSize: 14, fontWeight: 600, marginBottom: 12,
            }}>🖨️ Baskı Şablonunu İndir</button>

          {/* New photo button */}
          <button onClick={() => { setCapturedImg(null); setCroppedImg(null); setPrintImg(null); setStep('camera'); setTimeout(startCamera, 150) }}
            style={{
              width: '100%', padding: 14, background: 'transparent',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)', fontSize: 14,
            }}>📷 Yeni Fotoğraf Çek</button>
        </div>
      )}

      {/* ══ HISTORY ══ */}
      {step === 'history' && (
        <div className="fade-in" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Fotoğraf Geçmişi</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Son {history.length} çekim</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {history.length > 0 && (
                <button onClick={() => { if (window.confirm('Tüm geçmişi silmek istediğinize emin misiniz?')) { clearHistory(); setHistory([]) } }}
                  style={{
                    background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.2)',
                    borderRadius: 'var(--radius-sm)', padding: '6px 12px',
                    color: '#e06060', fontSize: 12, fontWeight: 600,
                  }}>🗑️ Temizle</button>
              )}
              <button onClick={() => setStep('home')}
                style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)',
                  padding: '6px 14px', color: '#8899bb', fontSize: 13,
                }}>← Geri</button>
            </div>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div>Henüz fotoğraf çekilmemiş</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((h, i) => (
                <div key={h.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: 12,
                }}>
                  <div style={{
                    width: 52, height: 65, borderRadius: 6, overflow: 'hidden',
                    border: '1px solid var(--border-subtle)', background: '#fff', flexShrink: 0,
                  }}>
                    <img src={h.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {h.flag} {h.countryName} — {h.size}
                    </div>
                    <div style={{ fontSize: 11, color: '#445', marginTop: 2 }}>
                      {h.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

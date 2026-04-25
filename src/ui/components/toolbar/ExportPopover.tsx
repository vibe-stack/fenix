import { useRef, useState } from 'react'
import { useSimulationHandle } from '../../../features/viewport/SimulationHandleContext'
import { useEditorStore } from '../../hooks/useEditorStore'

type ExportFormat = 'spritesheet' | 'video'

interface SpritesheetSettings {
  sampleRate: number
  columns: number
  frameWidth: number
  frameHeight: number
  transparent: boolean
  backgroundColor: string
}

interface VideoSettings {
  sampleRate: number
  backgroundColor: string
  width: number
  height: number
  fps: number
}

interface ExportSettings {
  startFrame: number
  endFrame: number
  format: ExportFormat
  spritesheet: SpritesheetSettings
  video: VideoSettings
}

const defaultSettings: ExportSettings = {
  startFrame: 0,
  endFrame: 500,
  format: 'video',
  spritesheet: {
    sampleRate: 24,
    columns: 8,
    frameWidth: 256,
    frameHeight: 256,
    transparent: false,
    backgroundColor: '#000000',
  },
  video: {
    sampleRate: 1,
    backgroundColor: '#000000',
    width: 1920,
    height: 1080,
    fps: 30,
  },
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[9px] uppercase tracking-[0.18em] text-(--fenix-text-muted) shrink-0">{label}</span>
      {children}
    </div>
  )
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`h-6 px-2 text-right text-[10px] tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent) ${className}`}
      style={{ background: 'var(--fenix-bg)', border: '1px solid rgba(255,255,255,0.08)', width: 64 }}
    />
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] tabular-nums text-(--fenix-text-muted)">{value}</span>
      <label className="relative cursor-pointer">
        <span
          className="block h-5 w-8 rounded-sm"
          style={{ backgroundColor: value, outline: '1px solid rgba(255,255,255,0.12)' }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
}

export function ExportPopover() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<ExportSettings>(defaultSettings)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const handle = useSimulationHandle()
  const bg = useEditorStore((s) => s.viewportState.background)
  const cancelRef = useRef(false)

  function patch<K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  function patchSpritesheet<K extends keyof SpritesheetSettings>(key: K, value: SpritesheetSettings[K]) {
    setSettings((s) => ({ ...s, spritesheet: { ...s.spritesheet, [key]: value } }))
  }

  function patchVideo<K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) {
    setSettings((s) => ({ ...s, video: { ...s.video, [key]: value } }))
  }

  async function runExport() {
    if (!handle) return
    const canvas = handle.getCanvas()
    if (!canvas) return

    setExporting(true)
    cancelRef.current = false
    setProgress(0)

    try {
      if (settings.format === 'spritesheet') {
        await exportSpritesheet(handle, canvas, settings, bg.color, setProgress, cancelRef)
      } else {
        await exportVideo(handle, canvas, settings, bg.color, setProgress, cancelRef)
      }
    } catch (err) {
      if (!cancelRef.current) console.error('Export failed:', err)
    } finally {
      setExporting(false)
      setProgress(0)
      // Restart normal playback
      handle.play()
    }
  }

  return (
    <div className="relative flex items-center gap-px">
      {/* Direct export button */}
      <button
        type="button"
        disabled={exporting || !handle}
        onClick={() => { void runExport() }}
        title={exporting ? `Exporting… ${Math.round(progress * 100)}%` : 'Export'}
        className="flex h-8 items-center gap-2 px-3 text-[10px] tracking-[0.12em] transition-colors disabled:opacity-40"
        style={{ color: 'var(--fenix-accent)' }}
      >
        {exporting ? (
          <>
            <ExportingIcon progress={progress} />
            <span>{Math.round(progress * 100)}%</span>
          </>
        ) : (
          <>
            <ExportIcon />
            <span>Export</span>
          </>
        )}
      </button>

      {/* Settings button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Export settings"
        className={`flex h-8 w-7 items-center justify-center transition-colors ${
          open ? 'text-(--fenix-accent-soft)' : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        <ChevronIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute left-1/2 top-full z-50 mt-px w-72 -translate-x-1/2"
            style={{
              background: 'var(--fenix-panel)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">Export Settings</span>
            </div>

            <div className="px-3 py-3 space-y-0.5">
              {/* Frame range */}
              <Row label="Start frame">
                <NumInput value={settings.startFrame} onChange={(v) => patch('startFrame', v)} min={0} />
              </Row>
              <Row label="End frame">
                <NumInput value={settings.endFrame} onChange={(v) => patch('endFrame', v)} min={1} />
              </Row>

              <Divider />

              {/* Format tabs */}
              <div className="flex gap-px pt-0.5 pb-1">
                {(['video', 'spritesheet'] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => patch('format', f)}
                    className="flex-1 py-1 text-[10px] tracking-[0.1em] transition-colors"
                    style={{
                      background: settings.format === f ? 'var(--fenix-active)' : 'var(--fenix-row)',
                      color: settings.format === f ? 'var(--fenix-accent-soft)' : 'var(--fenix-text-muted)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {f === 'spritesheet' ? 'Flipbook' : 'Video'}
                  </button>
                ))}
              </div>

              {settings.format === 'spritesheet' && (
                <>
                  <Row label="Sample rate">
                    <div className="flex items-center gap-1">
                      <NumInput value={settings.spritesheet.sampleRate} onChange={(v) => patchSpritesheet('sampleRate', Math.max(1, v))} min={1} />
                      <span className="text-[9px] text-(--fenix-text-muted)">fps</span>
                    </div>
                  </Row>
                  <Row label="Columns">
                    <NumInput value={settings.spritesheet.columns} onChange={(v) => patchSpritesheet('columns', Math.max(1, v))} min={1} />
                  </Row>
                  <Row label="Frame size">
                    <div className="flex items-center gap-1">
                      <NumInput value={settings.spritesheet.frameWidth} onChange={(v) => patchSpritesheet('frameWidth', Math.max(16, v))} min={16} />
                      <span className="text-[9px] text-(--fenix-text-muted)">×</span>
                      <NumInput value={settings.spritesheet.frameHeight} onChange={(v) => patchSpritesheet('frameHeight', Math.max(16, v))} min={16} />
                    </div>
                  </Row>
                  <Row label="Transparent">
                    <button
                      type="button"
                      onClick={() => patchSpritesheet('transparent', !settings.spritesheet.transparent)}
                      className="h-5 w-9 transition-colors"
                      style={{
                        background: settings.spritesheet.transparent ? 'var(--fenix-accent)' : 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                      }}
                    >
                      <span
                        className="block h-3.5 w-3.5 transition-transform"
                        style={{
                          background: 'var(--fenix-text)',
                          borderRadius: 1,
                          margin: '1px',
                          transform: settings.spritesheet.transparent ? 'translateX(16px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                  </Row>
                  {!settings.spritesheet.transparent && (
                    <Row label="BG color">
                      <ColorInput value={settings.spritesheet.backgroundColor} onChange={(v) => patchSpritesheet('backgroundColor', v)} />
                    </Row>
                  )}
                </>
              )}

              {settings.format === 'video' && (
                <>
                  <Row label="Sample rate">
                    <div className="flex items-center gap-1">
                      <NumInput value={settings.video.sampleRate} onChange={(v) => patchVideo('sampleRate', Math.max(1, v))} min={1} />
                      <span className="text-[9px] text-(--fenix-text-muted)">sim steps/frame</span>
                    </div>
                  </Row>
                  <Row label="Output FPS">
                    <div className="flex items-center gap-1">
                      <NumInput value={settings.video.fps} onChange={(v) => patchVideo('fps', Math.max(1, Math.min(120, v)))} min={1} max={120} />
                      <span className="text-[9px] text-(--fenix-text-muted)">fps</span>
                    </div>
                  </Row>
                  <Row label="Resolution">
                    <div className="flex items-center gap-1">
                      <NumInput value={settings.video.width} onChange={(v) => patchVideo('width', Math.max(16, v))} min={16} />
                      <span className="text-[9px] text-(--fenix-text-muted)">×</span>
                      <NumInput value={settings.video.height} onChange={(v) => patchVideo('height', Math.max(16, v))} min={16} />
                    </div>
                  </Row>
                  <Row label="BG color">
                    <ColorInput value={settings.video.backgroundColor} onChange={(v) => patchVideo('backgroundColor', v)} />
                  </Row>
                </>
              )}

              <Divider />

              <button
                type="button"
                disabled={exporting || !handle}
                onClick={() => { setOpen(false); void runExport() }}
                className="mt-1 flex w-full items-center justify-center gap-2 py-1.5 text-[10px] tracking-[0.12em] transition-colors disabled:opacity-40"
                style={{ background: 'var(--fenix-active)', color: 'var(--fenix-accent-soft)' }}
              >
                <ExportIcon />
                {exporting ? `Exporting ${Math.round(progress * 100)}%…` : `Export as ${settings.format === 'spritesheet' ? 'Flipbook' : 'Video'}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Export logic ─────────────────────────────────────────────────────────────

async function exportSpritesheet(
  handle: NonNullable<ReturnType<typeof useSimulationHandle>>,
  _canvas: HTMLCanvasElement,
  settings: ExportSettings,
  _viewportBgColor: string,
  setProgress: (p: number) => void,
  cancelRef: React.MutableRefObject<boolean>,
) {
  const { startFrame, endFrame, spritesheet: ss } = settings
  const totalFrames = endFrame - startFrame + 1
  const frameDuration = 1 / ss.sampleRate

  handle.pause()
  handle.reset()

  // Offscreen canvas for compositing each frame
  const frameCanvas = new OffscreenCanvas(ss.frameWidth, ss.frameHeight)
  const frameCtx = frameCanvas.getContext('2d')!

  // Final spritesheet canvas
  const cols = ss.columns
  const rows = Math.ceil(totalFrames / cols)
  const sheetCanvas = new OffscreenCanvas(cols * ss.frameWidth, rows * ss.frameHeight)
  const sheetCtx = sheetCanvas.getContext('2d')!

  if (!ss.transparent) {
    sheetCtx.fillStyle = ss.backgroundColor
    sheetCtx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height)
  }

  for (let i = 0; i < totalFrames; i++) {
    if (cancelRef.current) return

    const t = (startFrame + i) * frameDuration
    handle.renderOffscreenFrame(t, frameDuration)

    // Wait for GPU to flush
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const gpuCanvas = handle.getCanvas()
    if (!gpuCanvas) break

    frameCtx.clearRect(0, 0, ss.frameWidth, ss.frameHeight)
    if (!ss.transparent) {
      frameCtx.fillStyle = ss.backgroundColor
      frameCtx.fillRect(0, 0, ss.frameWidth, ss.frameHeight)
    }
    frameCtx.drawImage(gpuCanvas, 0, 0, ss.frameWidth, ss.frameHeight)

    const col = i % cols
    const row = Math.floor(i / cols)
    sheetCtx.drawImage(frameCanvas, col * ss.frameWidth, row * ss.frameHeight)

    setProgress((i + 1) / totalFrames)
  }

  const blob = await sheetCanvas.convertToBlob({ type: 'image/png' })
  downloadBlob(blob, 'fenix-flipbook.png')
}

async function exportVideo(
  handle: NonNullable<ReturnType<typeof useSimulationHandle>>,
  gpuCanvas: HTMLCanvasElement,
  settings: ExportSettings,
  _viewportBgColor: string,
  setProgress: (p: number) => void,
  cancelRef: React.MutableRefObject<boolean>,
) {
  const { startFrame, endFrame, video: vs } = settings
  const totalFrames = endFrame - startFrame + 1
  const frameDuration = 1 / vs.fps
  const { Output, Mp4OutputFormat, CanvasSource, BufferTarget, QUALITY_HIGH } = await import('mediabunny')

  // Use an offscreen canvas so we can composite BG color + GPU output
  const offscreen = new OffscreenCanvas(vs.width, vs.height)
  const ctx = offscreen.getContext('2d')!

  const target = new BufferTarget()
  const output = new Output({ format: new Mp4OutputFormat(), target })
  const source = new CanvasSource(offscreen, { codec: 'avc', bitrate: QUALITY_HIGH })
  output.addVideoTrack(source)

  await output.start()

  handle.pause()
  handle.reset()

  for (let i = 0; i < totalFrames; i++) {
    if (cancelRef.current) {
      await output.cancel?.()
      return
    }

    const t = (startFrame + i) * frameDuration
    handle.renderOffscreenFrame(t, frameDuration)

    // Flush GPU queue
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    ctx.fillStyle = vs.backgroundColor
    ctx.fillRect(0, 0, vs.width, vs.height)
    ctx.drawImage(gpuCanvas, 0, 0, vs.width, vs.height)

    await source.add(i * frameDuration, frameDuration)
    setProgress((i + 1) / totalFrames)
  }

  await output.finalize()

  const buffer = target.buffer
  if (buffer) {
    downloadBlob(new Blob([buffer], { type: 'video/mp4' }), 'fenix-export.mp4')
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ExportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" />
      <path d="M1.5 9.5v1h9v-1" />
    </svg>
  )
}

function ExportingIcon({ progress }: { progress: number }) {
  const r = 4.5
  const circ = 2 * Math.PI * r
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <circle
        cx="6" cy="6" r={r}
        stroke="var(--fenix-accent)"
        strokeWidth="1.5"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        style={{ transformOrigin: '6px 6px', transform: 'rotate(-90deg)' }}
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3l2 2 2-2" />
    </svg>
  )
}

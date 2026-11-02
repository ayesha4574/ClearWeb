/**
 * AudioPlayer.jsx
 *
 * Accessible Web Speech API Text-to-Speech playback bar.
 * Features:
 * - Play, Pause, Resume, Stop controls.
 * - Speech rate / speed adjustment (0.75x to 2.0x).
 * - Voice selection dropdown.
 * - Paragraph-level progress tracking.
 * - WCAG AA accessible contrast across Light, Sepia, Dark, and High-Contrast themes.
 */

const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75×' },
  { value: 1.0, label: '1.0× (Normal)' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5, label: '1.5×' },
  { value: 1.75, label: '1.75×' },
  { value: 2.0, label: '2.0×' },
]

export function AudioPlayer({
  tts,
  totalParagraphs = 0,
  theme = 'light',
}) {
  const {
    isSupported,
    playbackState,
    currentParagraphIndex,
    rate,
    voices,
    selectedVoiceURI,
    play,
    pause,
    resume,
    stop,
    changeRate,
    changeVoice,
  } = tts

  if (!isSupported) {
    return (
      <div
        role="region"
        aria-label="Text to speech audio player"
        className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900"
      >
        <p className="font-semibold">Text-to-Speech unavailable</p>
        <p>Your browser does not support the Web Speech API. Try Google Chrome, Edge, or Safari.</p>
      </div>
    )
  }

  // Theme-aware palette
  const containerStyle = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-sm',
    sepia: 'bg-[#fbf6ea] border-[#e7dbca] text-stone-900 shadow-sm',
    dark: 'bg-[#111827] border-gray-800 text-gray-100 shadow-sm',
    'high-contrast': 'bg-black border-2 border-[#ffff00] text-[#ffff00]',
  }[theme] || 'bg-white border-slate-200 text-slate-900'

  const primaryBtnStyle = {
    light: 'bg-blue-800 hover:bg-blue-900 text-white focus:outline-blue-700 shadow-xs',
    sepia: 'bg-amber-900 hover:bg-amber-950 text-white focus:outline-amber-800 shadow-xs',
    dark: 'bg-blue-600 hover:bg-blue-500 text-white focus:outline-blue-400 shadow-xs',
    'high-contrast': 'bg-[#ffff00] text-black border-2 border-[#ffff00] hover:bg-white hover:text-black focus:outline-[#00ffff]',
  }[theme]

  const secondaryBtnStyle = {
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 focus:outline-blue-700 disabled:opacity-40',
    sepia: 'bg-[#eee3ce] hover:bg-[#e4d7bf] text-stone-900 border-[#e1d3bf] focus:outline-amber-800 disabled:opacity-40',
    dark: 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700 focus:outline-blue-400 disabled:opacity-40',
    'high-contrast': 'bg-black text-[#ffff00] border-2 border-[#ffff00] hover:bg-neutral-900 focus:outline-[#00ffff] disabled:opacity-40',
  }[theme]

  const inputStyle = {
    light: 'bg-white border-slate-300 text-slate-900 focus:border-blue-700 focus:outline-blue-700',
    sepia: 'bg-[#f4ebd9] border-[#e1d3bf] text-stone-900 focus:border-amber-800 focus:outline-amber-800',
    dark: 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-400 focus:outline-blue-400',
    'high-contrast': 'bg-black border-2 border-[#ffff00] text-[#ffff00] focus:outline-[#00ffff]',
  }[theme]

  const currentParaNumber = currentParagraphIndex >= 0 ? currentParagraphIndex + 1 : 0
  const progressPercent =
    totalParagraphs > 0 && currentParagraphIndex >= 0
      ? Math.round((currentParaNumber / totalParagraphs) * 100)
      : 0

  return (
    <section
      aria-label="Text to speech audio controls"
      className={`mb-6 rounded-xl border p-4 sm:p-5 transition ${containerStyle}`}
    >
      <div className="flex flex-col gap-4">
        {/* Top line: Header & State announcement */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base select-none" aria-hidden="true">🔊</span>
            <span className="font-bold text-sm tracking-tight">Audio Reader (Listen)</span>
          </div>

          <div role="status" aria-live="polite" className="text-xs font-medium">
            {playbackState === 'playing' && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true" />
                Reading paragraph {currentParaNumber} of {totalParagraphs} ({progressPercent}%)
              </span>
            )}
            {playbackState === 'paused' && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-600" aria-hidden="true" />
                Paused at paragraph {currentParaNumber} of {totalParagraphs}
              </span>
            )}
            {playbackState === 'stopped' && (
              <span className="opacity-75">Ready to listen</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {playbackState !== 'stopped' && totalParagraphs > 0 && (
          <div className="w-full bg-current/15 rounded-full h-1.5 overflow-hidden" aria-hidden="true">
            <div
              className={`h-full transition-all duration-300 ${
                theme === 'high-contrast' ? 'bg-[#ffff00]' : 'bg-blue-700'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Main Playback Buttons */}
          <div className="flex items-center gap-2">
            {playbackState === 'stopped' && (
              <button
                type="button"
                onClick={() => play(0)}
                disabled={totalParagraphs === 0}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${primaryBtnStyle} disabled:opacity-50`}
              >
                <span aria-hidden="true">▶</span>
                <span>Play Article</span>
              </button>
            )}

            {playbackState === 'playing' && (
              <button
                type="button"
                onClick={pause}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${primaryBtnStyle}`}
              >
                <span aria-hidden="true">⏸</span>
                <span>Pause</span>
              </button>
            )}

            {playbackState === 'paused' && (
              <button
                type="button"
                onClick={resume}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${primaryBtnStyle}`}
              >
                <span aria-hidden="true">▶</span>
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={stop}
              disabled={playbackState === 'stopped'}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${secondaryBtnStyle}`}
            >
              <span aria-hidden="true">⏹</span>
              <span>Stop</span>
            </button>
          </div>

          {/* Speed & Voice Options */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            {/* Speed Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="tts-speed-select" className="font-semibold text-xs whitespace-nowrap">
                Speed:
              </label>
              <select
                id="tts-speed-select"
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer transition ${inputStyle}`}
              >
                {SPEED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Selector (if multiple voices available) */}
            {voices.length > 0 && (
              <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[260px]">
                <label htmlFor="tts-voice-select" className="font-semibold text-xs whitespace-nowrap">
                  Voice:
                </label>
                <select
                  id="tts-voice-select"
                  value={selectedVoiceURI}
                  onChange={(e) => changeVoice(e.target.value)}
                  className={`w-full truncate rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer transition ${inputStyle}`}
                >
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

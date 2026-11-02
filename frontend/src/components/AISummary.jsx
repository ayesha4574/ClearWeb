import { useState } from 'react'
import { summarizeArticle } from '../api.js'
import { renderInlineContent } from '../markdownUtils.js'

const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short', desc: '2–3 sentences, 3 takeaways' },
  { id: 'medium', label: 'Medium', desc: '1–2 paragraphs, 5 takeaways' },
  { id: 'detailed', label: 'Detailed', desc: 'In-depth overview & takeaways' },
]

export function AISummary({
  paragraphs = [],
  title = '',
  preferences = {},
  tts,
  activeParagraphClass = '',
  onSummaryGenerated,
}) {
  const [length, setLength] = useState('medium')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [summaryData, setSummaryData] = useState(null)
  const [error, setError] = useState(null)
  const [isCopied, setIsCopied] = useState(false)

  const theme = preferences?.theme || 'light'
  const bionicReading = Boolean(preferences?.bionicReading)

  // Typography mappings derived immediately from reading preferences
  const fontSizeClass = {
    small: 'text-base',
    medium: 'text-lg',
    large: 'text-xl',
    xlarge: 'text-2xl',
  }[preferences?.fontSize] || 'text-lg'

  const lineHeightClass = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  }[preferences?.lineHeight] || 'leading-relaxed'

  const fontFamilyClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
    dyslexic: 'font-sans tracking-wide',
  }[preferences?.fontFamily] || 'font-sans'

  async function handleGenerate(targetLength = length) {
    if (!paragraphs || paragraphs.length === 0) return

    setLength(targetLength)
    setStatus('loading')
    setError(null)

    const result = await summarizeArticle(paragraphs, title, targetLength)

    if (result.ok) {
      setSummaryData(result.data)
      setStatus('success')
      if (onSummaryGenerated) {
        onSummaryGenerated(result.data)
      }
    } else {
      setError({ code: result.code, message: result.message })
      setStatus('error')
    }
  }

  function handleCopy() {
    if (!summaryData) return
    const textToCopy = `Summary (${summaryData.length}):\n${summaryData.summary}\n\nKey Takeaways:\n${summaryData.key_takeaways.map((t) => `• ${t}`).join('\n')}`
    navigator.clipboard.writeText(textToCopy)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // TTS audio items for the summary
  const summaryAudioItems = summaryData
    ? [summaryData.summary, ...(summaryData.key_takeaways || [])]
    : []

  const isSpeakingSummary = tts?.playbackState !== 'stopped' && tts?.source === 'summary'

  function handleToggleListenSummary() {
    if (!tts) return
    if (isSpeakingSummary) {
      tts.stop()
    } else {
      tts.playCustom(summaryAudioItems, 0, 'summary')
    }
  }

  // Theme-aware styles
  const cardStyle = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-sm',
    sepia: 'bg-[#fbf6ea] border-[#e7dbca] text-stone-900 shadow-sm',
    dark: 'bg-[#111827] border-gray-800 text-gray-100 shadow-sm',
    'high-contrast': 'bg-black border-2 border-[#ffff00] text-[#ffff00]',
  }[theme] || 'bg-white border-slate-200 text-slate-900'

  const headerBorderClass = {
    light: 'border-slate-200',
    sepia: 'border-[#e7dbca]',
    dark: 'border-gray-800',
    'high-contrast': 'border-[#ffff00]',
  }[theme]

  const activeSegmentStyle = {
    light: 'bg-blue-800 text-white font-semibold shadow-xs',
    sepia: 'bg-amber-900 text-white font-semibold shadow-xs',
    dark: 'bg-blue-600 text-white font-semibold shadow-xs',
    'high-contrast': 'bg-[#ffff00] text-black font-bold border-2 border-[#ffff00]',
  }[theme]

  const inactiveSegmentStyle = {
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300',
    sepia: 'bg-[#eee3ce] hover:bg-[#e4d7bf] text-stone-900 border-[#e1d3bf]',
    dark: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700',
    'high-contrast': 'bg-black hover:bg-neutral-900 text-[#ffff00] border-2 border-[#ffff00]',
  }[theme]

  const primaryBtnStyle = {
    light: 'bg-blue-800 hover:bg-blue-900 text-white focus:outline-blue-700 shadow-xs',
    sepia: 'bg-amber-900 hover:bg-amber-950 text-white focus:outline-amber-800 shadow-xs',
    dark: 'bg-blue-600 hover:bg-blue-500 text-white focus:outline-blue-400 shadow-xs',
    'high-contrast': 'bg-[#ffff00] text-black border-2 border-[#ffff00] hover:bg-white hover:text-black focus:outline-[#00ffff]',
  }[theme]

  const actionBtnStyle = {
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 focus:outline-blue-700',
    sepia: 'bg-[#eee3ce] hover:bg-[#e4d7bf] text-stone-900 border-[#e1d3bf] focus:outline-amber-800',
    dark: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 focus:outline-blue-400',
    'high-contrast': 'bg-black text-[#ffff00] border-2 border-[#ffff00] hover:bg-[#ffff00] hover:text-black focus:outline-[#00ffff]',
  }[theme]

  return (
    <section
      aria-label="AI article summary and takeaways"
      className={`mb-8 rounded-xl border p-5 sm:p-7 transition-colors duration-200 ${cardStyle}`}
    >
      <div className="flex flex-col gap-4">
        {/* Header & Controls bar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${headerBorderClass}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl select-none" aria-hidden="true">✨</span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              AI Summary & Key Takeaways
            </h2>
          </div>

          {/* Length Selector */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Summary length options">
            {LENGTH_OPTIONS.map((opt) => {
              const isActive = length === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setLength(opt.id)
                    if (status === 'success') {
                      handleGenerate(opt.id)
                    }
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-1 ${
                    isActive ? activeSegmentStyle : inactiveSegmentStyle
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* STATE 1: Idle (Not yet requested) */}
        {status === 'idle' && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm opacity-85 leading-relaxed">
              Generate a fast, clear summary and bullet-point key takeaways using Google Gemini AI.
            </p>
            <button
              type="button"
              onClick={() => handleGenerate(length)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 shrink-0 ${primaryBtnStyle}`}
            >
              <span>✨ Generate {length.charAt(0).toUpperCase() + length.slice(1)} Summary</span>
            </button>
          </div>
        )}

        {/* STATE 2: Loading State */}
        {status === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="py-6 flex flex-col items-center justify-center text-center gap-3"
          >
            <div className="w-8 h-8 rounded-full border-3 border-current/25 border-t-current animate-spin" />
            <p className="text-sm font-semibold">
              Generating {length} summary with Gemini AI...
            </p>
            <p className="text-xs opacity-75 max-w-sm">
              Analyzing core arguments and extracting key takeaways. This usually takes 2 to 4 seconds.
            </p>
          </div>
        )}

        {/* STATE 3: Error State */}
        {status === 'error' && error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-300 bg-rose-50/90 p-4 text-rose-950 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg font-bold text-rose-700 select-none" aria-hidden="true">⚠</span>
              <div className="flex-1 text-xs sm:text-sm">
                <p className="font-bold mb-1">Could not generate summary</p>
                <p className="leading-relaxed mb-3">{error.message}</p>

                {error.code === 'missing_api_key' && (
                  <div className="mb-3 rounded bg-black/5 dark:bg-white/10 p-2.5 font-mono text-xs">
                    <code>GEMINI_API_KEY=your_key_here</code> in <code>backend/.env</code>
                  </div>
                )}

                {error.code === 'invalid_api_key' && (
                  <div className="mb-3 rounded bg-black/5 dark:bg-white/10 p-2.5 font-mono text-xs">
                    Please check <code>GEMINI_API_KEY</code> in <code>backend/.env</code>
                  </div>
                )}

                {error.code === 'model_unavailable' && (
                  <div className="mb-3 rounded bg-black/5 dark:bg-white/10 p-2.5 font-mono text-xs">
                    <code>GEMINI_MODEL=gemini-3.5-flash</code> in <code>backend/.env</code>
                  </div>
                )}

                {error.code === 'service_unavailable' && (
                  <p className="mb-3 text-xs italic opacity-85">
                    Google services are experiencing temporary load. Retrying in a few moments usually resolves this.
                  </p>
                )}

                {error.code === 'rate_limited' && (
                  <p className="mb-3 text-xs italic opacity-85">
                    Please wait 30–60 seconds before generating another summary.
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate(length)}
                    className="rounded bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition focus:outline-2 focus:outline-rose-500"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="underline text-xs opacity-75 hover:opacity-100 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: Success State (Summary & Takeaways displayed with reading preferences) */}
        {status === 'success' && summaryData && (
          <div className="space-y-6 pt-1">
            {/* Overview paragraph */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-75">
                  Overview ({summaryData.length})
                </h3>
                <span className="text-xs opacity-60">Click any text to listen</span>
              </div>
              <p
                className={`font-normal cursor-pointer hover:opacity-95 transition-all ${fontSizeClass} ${lineHeightClass} ${fontFamilyClass} ${
                  isSpeakingSummary && tts?.currentParagraphIndex === 0 ? activeParagraphClass : ''
                }`}
                onClick={() => tts?.playCustom(summaryAudioItems, 0, 'summary')}
                title="Click to listen to overview"
              >
                {renderInlineContent(summaryData.summary, bionicReading, theme)}
              </p>
            </div>

            {/* Bullet Point Key Takeaways */}
            {summaryData.key_takeaways && summaryData.key_takeaways.length > 0 && (
              <div className={`space-y-3 pt-3 border-t ${headerBorderClass}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-75">
                  Key Takeaways
                </h3>
                <ul className="space-y-2.5">
                  {summaryData.key_takeaways.map((takeaway, idx) => {
                    const isCurrentSpeaking = isSpeakingSummary && tts?.currentParagraphIndex === idx + 1
                    return (
                      <li
                        key={idx}
                        className={`flex items-start gap-2.5 cursor-pointer hover:opacity-95 transition-all rounded p-1 -m-1 ${fontSizeClass} ${lineHeightClass} ${fontFamilyClass} ${
                          isCurrentSpeaking ? activeParagraphClass : ''
                        }`}
                        onClick={() => tts?.playCustom(summaryAudioItems, idx + 1, 'summary')}
                        title="Click to listen to this takeaway"
                      >
                        <span
                          className={`font-bold select-none mt-0.5 shrink-0 ${
                            theme === 'high-contrast'
                              ? 'text-[#ffff00]'
                              : theme === 'dark'
                              ? 'text-blue-400'
                              : theme === 'sepia'
                              ? 'text-amber-800'
                              : 'text-blue-600'
                          }`}
                          aria-hidden="true"
                        >
                          •
                        </span>
                        <span>{renderInlineContent(takeaway, bionicReading, theme)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Action Bar: Audio Listen, Regenerate, Copy */}
            <div className={`pt-4 border-t ${headerBorderClass} flex flex-wrap items-center justify-between gap-3 text-xs`}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleListenSummary}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition focus:outline-2 ${actionBtnStyle}`}
                  title={isSpeakingSummary ? 'Stop reading summary' : 'Read summary and key takeaways aloud'}
                >
                  <span aria-hidden="true">{isSpeakingSummary ? '⏹' : '🔊'}</span>
                  <span>{isSpeakingSummary ? 'Stop Listening' : 'Listen to Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition focus:outline-2 ${actionBtnStyle}`}
                >
                  <span aria-hidden="true">{isCopied ? '✔' : '📋'}</span>
                  <span>{isCopied ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerate(length)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition focus:outline-2 ${actionBtnStyle}`}
                >
                  <span aria-hidden="true">🔄</span>
                  <span>Re-summarize</span>
                </button>
              </div>

              <span className="opacity-60 text-[11px] self-center">Powered by Google Gemini</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

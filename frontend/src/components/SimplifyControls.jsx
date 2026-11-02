import { useState } from 'react'
import { simplifyArticle } from '../api.js'

const SIMPLIFY_LEVELS = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'Everyday vocabulary, shorter sentences, and clearer phrasing while preserving full detail.',
  },
  {
    id: 'very_simple',
    label: 'Very Simple',
    description: 'Very familiar words, short sentences, and straightforward explanations of complex ideas.',
  },
]

export function SimplifyControls({
  paragraphs,
  title = '',
  theme = 'light',
  activeVersion = 'original',
  onSwitchVersion,
  cachedSimplifications = {},
  onSaveSimplification,
  onStopSpeaking,
}) {
  const [selectedLevel, setSelectedLevel] = useState('simple')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null)

  const isCurrentLevelSimplified = Boolean(cachedSimplifications[selectedLevel])

  async function handleTriggerSimplify(levelToUse = selectedLevel) {
    if (!paragraphs || paragraphs.length === 0) return

    // If already cached for this level, just switch to it
    if (cachedSimplifications[levelToUse]) {
      if (onStopSpeaking) onStopSpeaking()
      onSwitchVersion('simplified', levelToUse)
      return
    }

    setStatus('loading')
    setErrorMessage(null)

    const result = await simplifyArticle(paragraphs, title, levelToUse)

    if (result.ok) {
      onSaveSimplification(levelToUse, result.data)
      setStatus('success')
      if (onStopSpeaking) onStopSpeaking()
      onSwitchVersion('simplified', levelToUse)
    } else {
      setStatus('error')
      setErrorMessage(result.message || 'Failed to simplify article text.')
    }
  }

  function handleVersionChange(version) {
    if (onStopSpeaking) onStopSpeaking()
    onSwitchVersion(version, selectedLevel)
  }

  // Theme-aware styles
  const cardStyle = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-sm',
    sepia: 'bg-[#fbf6ea] border-[#e7dbca] text-stone-900 shadow-sm',
    dark: 'bg-[#111827] border-gray-800 text-gray-100 shadow-sm',
    'high-contrast': 'bg-black border-2 border-[#ffff00] text-[#ffff00]',
  }[theme] || 'bg-white border-slate-200 text-slate-900'

  const borderClass = {
    light: 'border-slate-200',
    sepia: 'border-[#e7dbca]',
    dark: 'border-gray-800',
    'high-contrast': 'border-[#ffff00]',
  }[theme]

  const mutedTextClass = {
    light: 'text-slate-600',
    sepia: 'text-stone-600',
    dark: 'text-gray-400',
    'high-contrast': 'text-white',
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

  const levelBoxSelectedStyle = {
    light: 'bg-blue-50/70 border-blue-600 text-slate-900',
    sepia: 'bg-amber-100/50 border-amber-800 text-stone-900',
    dark: 'bg-blue-950/40 border-blue-500 text-gray-100',
    'high-contrast': 'bg-neutral-900 border-2 border-[#ffff00] text-[#ffff00]',
  }[theme]

  const levelBoxUnselectedStyle = {
    light: 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-800',
    sepia: 'bg-[#f4ebd9]/60 hover:bg-[#eee3ce]/80 border-[#e4d7bf] text-stone-900',
    dark: 'bg-gray-800/40 hover:bg-gray-800/70 border-gray-700/60 text-gray-300',
    'high-contrast': 'bg-black hover:bg-neutral-900 border border-[#ffff00]/50 text-[#ffff00]',
  }[theme]

  return (
    <section
      aria-label="Article text simplification controls"
      className={`mb-6 rounded-xl border p-4 sm:p-5 transition-colors duration-200 ${cardStyle}`}
    >
      {/* Title & Info Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl select-none" aria-hidden="true">💡</span>
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Simplify Article
            </h2>
            <p className={`text-xs ${mutedTextClass}`}>
              Rewrite in easier language while preserving all names, numbers, and facts
            </p>
          </div>
        </div>

        {/* Version Switcher (Visible when at least one simplified version exists) */}
        {Object.keys(cachedSimplifications).length > 0 && (
          <div className="flex items-center gap-1" role="group" aria-label="Article version switcher">
            <button
              type="button"
              aria-pressed={activeVersion === 'original'}
              onClick={() => handleVersionChange('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition focus:outline-2 ${
                activeVersion === 'original' ? activeSegmentStyle : inactiveSegmentStyle
              }`}
            >
              Original Article
            </button>
            <button
              type="button"
              aria-pressed={activeVersion === 'simplified'}
              onClick={() => handleVersionChange('simplified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition focus:outline-2 ${
                activeVersion === 'simplified' ? activeSegmentStyle : inactiveSegmentStyle
              }`}
            >
              Simplified ({selectedLevel === 'very_simple' ? 'Very Simple' : 'Simple'})
            </button>
          </div>
        )}
      </div>

      {/* Level Selection Options */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SIMPLIFY_LEVELS.map((opt) => {
          const isSelected = selectedLevel === opt.id
          const isCached = Boolean(cachedSimplifications[opt.id])

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedLevel(opt.id)}
              className={`rounded-lg border p-3 text-left transition cursor-pointer focus:outline-2 focus:outline-offset-2 ${
                isSelected ? levelBoxSelectedStyle : levelBoxUnselectedStyle
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${
                      isSelected ? 'border-current bg-current' : 'border-current/40'
                    }`}
                  >
                    {isSelected && <span className="block w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  {opt.label}
                </span>
                {isCached && (
                  <span className="text-[11px] font-semibold opacity-75">
                    Ready
                  </span>
                )}
              </div>
              <p className={`mt-1.5 text-xs leading-relaxed opacity-90 ${mutedTextClass}`}>
                {opt.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* Action / Trigger Row */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-current/10">
        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-xs font-medium" role="status" aria-live="polite">
              <svg
                className="w-4 h-4 animate-spin text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Rewriting in accessible language... This may take a few moments.</span>
            </div>
          ) : isCurrentLevelSimplified ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVersionChange('simplified')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition focus:outline-2 ${
                  activeVersion === 'simplified' ? activeSegmentStyle : primaryBtnStyle
                }`}
              >
                {activeVersion === 'simplified' ? 'Currently viewing simplified' : 'View simplified version'}
              </button>
              <button
                type="button"
                onClick={() => handleTriggerSimplify(selectedLevel)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium underline opacity-80 hover:opacity-100 cursor-pointer transition`}
              >
                Regenerate
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleTriggerSimplify(selectedLevel)}
              disabled={status === 'loading'}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${primaryBtnStyle}`}
            >
              <span aria-hidden="true">✨</span>
              Simplify at {selectedLevel === 'very_simple' ? 'Very Simple' : 'Simple'} level
            </button>
          )}
        </div>

        {/* Disclaimer / Notice */}
        <p className={`text-[11px] italic opacity-80 ${mutedTextClass}`}>
          Rewrites syntax & vocabulary while keeping facts and structure intact.
        </p>
      </div>

      {/* Error Notice */}
      {status === 'error' && errorMessage && (
        <div
          role="alert"
          className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            theme === 'high-contrast'
              ? 'bg-black border-red-500 text-red-400'
              : theme === 'dark'
              ? 'bg-red-950/40 border-red-800 text-red-200'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => handleTriggerSimplify(selectedLevel)}
            className="font-bold underline cursor-pointer hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  )
}

export default SimplifyControls

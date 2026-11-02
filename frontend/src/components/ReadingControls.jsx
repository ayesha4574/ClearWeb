/**
 * ReadingControls.jsx
 *
 * Accessible reading customization toolbar.
 * Allows users to adjust:
 * - Color themes (Light, Sepia, Dark, High Contrast)
 * - Text size (Small, Medium, Large, Extra Large)
 * - Line spacing (Normal, Relaxed, Loose)
 * - Typeface (Sans-serif, Serif, Monospace, Dyslexia-friendly)
 * - Reading column width (Narrow, Standard, Wide)
 *
 * Adheres strictly to WCAG AA accessibility:
 * - Semantic <fieldset> and <legend> grouping
 * - aria-pressed on toggle buttons
 * - High-contrast focus indicators
 * - Full keyboard navigation (Tab & Enter/Space)
 */

import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  THEME_OPTIONS,
  WIDTH_OPTIONS,
} from '../readingPreferences.js'

export function ReadingControls({
  preferences,
  onChangePreference,
  onResetPreferences,
  isOpen,
  onToggleOpen,
}) {
  const currentTheme = preferences.theme

  // Theme-aware styles for the controls container itself
  const panelStyle = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-md',
    sepia: 'bg-[#fbf6ea] border-[#e7dbca] text-stone-900 shadow-md',
    dark: 'bg-[#111827] border-gray-800 text-gray-100 shadow-md',
    'high-contrast': 'bg-black border-2 border-[#ffff00] text-[#ffff00]',
  }[currentTheme] || 'bg-white border-slate-200 text-slate-900'

  const activeBtnStyle = {
    light: 'bg-blue-800 text-white border-blue-800 font-semibold shadow-xs',
    sepia: 'bg-amber-900 text-white border-amber-900 font-semibold shadow-xs',
    dark: 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs',
    'high-contrast': 'bg-[#ffff00] text-black border-[#ffff00] font-bold',
  }[currentTheme]

  const inactiveBtnStyle = {
    light: 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300',
    sepia: 'bg-[#f4ebd9] hover:bg-[#ece1cc] text-stone-800 border-[#e1d3bf]',
    dark: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700',
    'high-contrast': 'bg-black hover:bg-neutral-900 text-[#ffff00] border-[#ffff00]',
  }[currentTheme]

  const toggleBtnStyle = {
    light: 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 focus:outline-blue-700',
    sepia: 'bg-[#fbf6ea] hover:bg-[#f4ebd9] text-stone-900 border-[#e7dbca] focus:outline-amber-800',
    dark: 'bg-[#111827] hover:bg-gray-800 text-gray-100 border-gray-700 focus:outline-blue-400',
    'high-contrast': 'bg-black text-[#ffff00] border-2 border-[#ffff00] hover:bg-neutral-900 focus:outline-[#00ffff]',
  }[currentTheme]

  return (
    <section aria-label="Reading appearance preferences" className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
            aria-controls="reading-controls-panel"
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${toggleBtnStyle}`}
          >
            <span className="text-base select-none" aria-hidden="true">⚙</span>
            <span>{isOpen ? 'Hide Reading Options' : 'Reading Options (Text, Theme & Spacing)'}</span>
          </button>

          {/* Quick 1-click Bionic Reading Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={preferences.bionicReading}
            aria-label="Toggle Bionic Reading Mode"
            onClick={() => onChangePreference('bionicReading', !preferences.bionicReading)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
              preferences.bionicReading ? activeBtnStyle : toggleBtnStyle
            }`}
          >
            <span aria-hidden="true">
              <strong className="font-extrabold">Bio</strong>nic
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-current/15">
              {preferences.bionicReading ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {isOpen && (
          <button
            type="button"
            onClick={onResetPreferences}
            className={`text-xs font-medium underline px-2 py-1 rounded cursor-pointer transition focus:outline-2 focus:outline-offset-1 ${
              currentTheme === 'high-contrast'
                ? 'text-[#ffff00] hover:text-white focus:outline-[#00ffff]'
                : currentTheme === 'dark'
                ? 'text-gray-300 hover:text-white focus:outline-blue-400'
                : 'text-slate-600 hover:text-slate-900 focus:outline-blue-700'
            }`}
          >
            Reset to defaults
          </button>
        )}
      </div>

      {/* Expandable Controls Panel */}
      {isOpen && (
        <div
          id="reading-controls-panel"
          className={`mt-4 rounded-xl border p-5 sm:p-6 space-y-6 transition ${panelStyle}`}
        >
          {/* Bionic Reading Control in drawer */}
          <fieldset>
            <legend className="text-sm font-bold tracking-tight mb-2.5">
              Bionic Reading Mode
            </legend>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-current/20">
              <div>
                <div className="font-semibold text-sm">Eye-guiding fixation points</div>
                <div className="text-xs opacity-80">
                  Emphasizes the initial letters of words to help your eyes glide smoothly through the text.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.bionicReading}
                onClick={() => onChangePreference('bionicReading', !preferences.bionicReading)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
                  preferences.bionicReading ? activeBtnStyle : inactiveBtnStyle
                }`}
              >
                {preferences.bionicReading ? 'Bionic Mode: ON' : 'Bionic Mode: OFF'}
              </button>
            </div>
          </fieldset>
          {/* 1. Theme Selection */}
          <fieldset>
            <legend className="text-sm font-bold tracking-tight mb-2.5">
              Color Theme
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEME_OPTIONS.map((opt) => {
                const isActive = preferences.theme === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onChangePreference('theme', opt.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs sm:text-sm cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
                      isActive ? activeBtnStyle : inactiveBtnStyle
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 rounded-full border ${opt.preview}`}
                      aria-hidden="true"
                    />
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* 2. Font Size Selection */}
          <fieldset>
            <legend className="text-sm font-bold tracking-tight mb-2.5">
              Font Size
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {FONT_SIZE_OPTIONS.map((opt) => {
                const isActive = preferences.fontSize === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onChangePreference('fontSize', opt.id)}
                    className={`rounded-lg border px-3 py-2 text-xs sm:text-sm text-center cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
                      isActive ? activeBtnStyle : inactiveBtnStyle
                    }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-[11px] opacity-75">{opt.sample}</div>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* 3. Line Spacing Selection */}
          <fieldset>
            <legend className="text-sm font-bold tracking-tight mb-2.5">
              Line Spacing (Line Height)
            </legend>
            <div className="grid grid-cols-3 gap-2.5">
              {LINE_HEIGHT_OPTIONS.map((opt) => {
                const isActive = preferences.lineHeight === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onChangePreference('lineHeight', opt.id)}
                    className={`rounded-lg border px-3 py-2 text-xs sm:text-sm text-center cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
                      isActive ? activeBtnStyle : inactiveBtnStyle
                    }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-[11px] opacity-75">{opt.sample}</div>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* 4. Font Family Selection */}
          <fieldset>
            <legend className="text-sm font-bold tracking-tight mb-2.5">
              Font Family
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {FONT_FAMILY_OPTIONS.map((opt) => {
                const isActive = preferences.fontFamily === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onChangePreference('fontFamily', opt.id)}
                    className={`rounded-lg border px-3 py-2 text-xs sm:text-sm text-center cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
                      isActive ? activeBtnStyle : inactiveBtnStyle
                    }`}
                  >
                    <div
                      className={`font-medium ${
                        opt.id === 'serif'
                          ? 'font-serif'
                          : opt.id === 'mono'
                          ? 'font-mono'
                          : opt.id === 'dyslexic'
                          ? 'font-sans tracking-wide'
                          : 'font-sans'
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[11px] opacity-75">{opt.description}</div>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* 5. Reading Width Selection */}
          <fieldset>
            <legend className="text-sm font-bold tracking-tight mb-2.5">
              Reading Column Width
            </legend>
            <div className="grid grid-cols-3 gap-2.5">
              {WIDTH_OPTIONS.map((opt) => {
                const isActive = preferences.contentWidth === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onChangePreference('contentWidth', opt.id)}
                    className={`rounded-lg border px-3 py-2 text-xs sm:text-sm text-center cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${
                      isActive ? activeBtnStyle : inactiveBtnStyle
                    }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-[11px] opacity-75">{opt.sample}</div>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>
      )}
    </section>
  )
}

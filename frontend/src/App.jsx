import { useEffect, useRef, useState } from 'react'
import { checkBackend, extractArticle } from './api.js'
import { AudioPlayer } from './components/AudioPlayer.jsx'
import { BionicParagraph } from './components/BionicText.jsx'
import { ReadingControls } from './components/ReadingControls.jsx'
import { useTextToSpeech } from './hooks/useTextToSpeech.js'
import { DEFAULT_PREFERENCES } from './readingPreferences.js'

function App() {
  // Navigation state: 'input' | 'loading' | 'reader'
  const [view, setView] = useState('input')
  const [url, setUrl] = useState('')
  const [loadingUrl, setLoadingUrl] = useState('')
  const [article, setArticle] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Reading customization preferences (saved in localStorage)
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('clearweb_reading_prefs')
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES
    } catch {
      return DEFAULT_PREFERENCES
    }
  })
  const [isControlsOpen, setIsControlsOpen] = useState(false)

  // Stage 7: Native Text-to-Speech Hook
  const tts = useTextToSpeech(article?.paragraphs || [])

  // Backend connection health
  const [backendStatus, setBackendStatus] = useState('checking')
  const [backendErrorMessage, setBackendErrorMessage] = useState('')

  // Ref to refocus the input when returning to the input screen
  const urlInputRef = useRef(null)

  // Persist reading preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('clearweb_reading_prefs', JSON.stringify(preferences))
    } catch {
      // LocalStorage might be disabled in private browsing; ignore gracefully
    }
  }, [preferences])

  // Verify backend connectivity on initial mount
  useEffect(() => {
    let active = true
    checkBackend().then((result) => {
      if (!active) return
      if (result.ok) {
        setBackendStatus('connected')
        setBackendErrorMessage('')
      } else {
        setBackendStatus('failed')
        setBackendErrorMessage(result.message)
      }
    })
    return () => {
      active = false
    }
  }, [])

  // Handle URL form submission
  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setErrorMessage('Please enter a web address to read.')
      return
    }

    tts.stop()
    setErrorMessage('')
    setLoadingUrl(trimmed)
    setView('loading')

    const result = await extractArticle(trimmed)

    if (result.ok) {
      setArticle(result.data)
      setView('reader')
    } else {
      setErrorMessage(result.message)
      setView('input')
    }
  }

  // Return to the URL input view
  function handleBackToInput() {
    tts.stop()
    setView('input')
    setErrorMessage('')
    setTimeout(() => {
      urlInputRef.current?.focus()
    }, 50)
  }

  // Handlers for reading customization
  function handleChangePreference(key, value) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  function handleResetPreferences() {
    setPreferences(DEFAULT_PREFERENCES)
  }

  // Format reading time estimation (~200 words per minute)
  const readingTime = article?.word_count
    ? Math.max(1, Math.round(article.word_count / 200))
    : null

  // Computed styles based on user's reading preferences
  const theme = view === 'reader' ? preferences.theme : 'light'

  // 1. Overall page styling
  const pageThemeClass = {
    light: 'bg-slate-50 text-slate-900',
    sepia: 'bg-[#f4ebd9] text-stone-900',
    dark: 'bg-[#0b0f17] text-gray-100',
    'high-contrast': 'bg-black text-[#ffff00]',
  }[theme]

  // 2. Header and footer styling
  const headerThemeClass = {
    light: 'bg-white border-slate-200 text-slate-900',
    sepia: 'bg-[#fbf6ea] border-[#e7dbca] text-stone-900',
    dark: 'bg-[#111827] border-gray-800 text-gray-100',
    'high-contrast': 'bg-black border-b-2 border-[#ffff00] text-[#ffff00]',
  }[theme]

  // 3. Reader article card styling
  const articleCardThemeClass = {
    light: 'bg-white border border-slate-200 shadow-sm',
    sepia: 'bg-[#fbf6ea] border border-[#e7dbca] shadow-sm',
    dark: 'bg-[#111827] border border-gray-800 shadow-sm',
    'high-contrast': 'bg-black border-2 border-[#ffff00]',
  }[preferences.theme]

  // 4. Headline and text colors
  const titleColorClass = {
    light: 'text-slate-900',
    sepia: 'text-stone-900',
    dark: 'text-gray-50',
    'high-contrast': 'text-[#ffff00]',
  }[preferences.theme]

  const metaColorClass = {
    light: 'text-slate-700',
    sepia: 'text-stone-700',
    dark: 'text-gray-400',
    'high-contrast': 'text-white',
  }[preferences.theme]

  const bodyTextColorClass = {
    light: 'text-slate-800',
    sepia: 'text-stone-800',
    dark: 'text-gray-200',
    'high-contrast': 'text-[#ffff00]',
  }[preferences.theme]

  const secondaryBtnClass = {
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 focus:outline-blue-700',
    sepia: 'bg-[#eee3ce] hover:bg-[#e4d7bf] text-stone-900 border-[#e1d3bf] focus:outline-amber-800',
    dark: 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700 focus:outline-blue-400',
    'high-contrast': 'bg-black text-[#ffff00] border-2 border-[#ffff00] hover:bg-[#ffff00] hover:text-black focus:outline-[#00ffff]',
  }[preferences.theme]

  const primaryBtnClass = {
    light: 'bg-blue-800 hover:bg-blue-900 text-white focus:outline-blue-700 shadow',
    sepia: 'bg-amber-900 hover:bg-amber-950 text-white focus:outline-amber-800 shadow',
    dark: 'bg-blue-600 hover:bg-blue-500 text-white focus:outline-blue-400 shadow',
    'high-contrast': 'bg-[#ffff00] text-black border-2 border-[#ffff00] hover:bg-white hover:text-black focus:outline-[#00ffff]',
  }[preferences.theme]

  const activeParagraphClass = {
    light: 'border-l-4 border-blue-700 bg-blue-50/70 pl-3.5 py-1 -ml-3.5 rounded-r-md transition-colors',
    sepia: 'border-l-4 border-amber-800 bg-amber-100/50 pl-3.5 py-1 -ml-3.5 rounded-r-md transition-colors',
    dark: 'border-l-4 border-blue-400 bg-blue-950/50 pl-3.5 py-1 -ml-3.5 rounded-r-md transition-colors',
    'high-contrast': 'border-l-4 border-[#ffff00] bg-neutral-900 pl-3.5 py-1 -ml-3.5 rounded-r-md transition-colors',
  }[preferences.theme]

  // 5. Typography customization mappings
  const fontSizeClass = {
    small: 'text-base',
    medium: 'text-lg',
    large: 'text-xl',
    xlarge: 'text-2xl',
  }[preferences.fontSize] || 'text-lg'

  const lineHeightClass = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  }[preferences.lineHeight] || 'leading-relaxed'

  const fontFamilyClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
    dyslexic: 'font-sans tracking-wide',
  }[preferences.fontFamily] || 'font-sans'

  const contentWidthClass = {
    narrow: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-4xl',
  }[preferences.contentWidth] || 'max-w-2xl'

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${pageThemeClass}`}>
      {/* Skip to main content link for keyboard and screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-blue-800 focus:px-4 focus:py-2 focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 shadow-md font-medium"
      >
        Skip to main content
      </a>

      {/* Top Banner / Navigation */}
      <header className={`border-b transition-colors duration-200 ${headerThemeClass}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">
              ClearWeb
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                theme === 'high-contrast'
                  ? 'bg-[#ffff00] text-black'
                  : theme === 'dark'
                  ? 'bg-gray-800 text-blue-400'
                  : theme === 'sepia'
                  ? 'bg-[#e7dbca] text-amber-950'
                  : 'bg-blue-100 text-blue-900'
              }`}
            >
              Reader
            </span>
          </div>

          {/* Backend Status indicator */}
          <div className="flex items-center text-xs font-medium">
            {backendStatus === 'checking' && (
              <span className="opacity-75">Connecting to server...</span>
            )}
            {backendStatus === 'connected' && (
              <span
                className={`flex items-center gap-1.5 ${
                  theme === 'high-contrast'
                    ? 'text-[#ffff00]'
                    : theme === 'dark'
                    ? 'text-emerald-400'
                    : 'text-emerald-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    theme === 'high-contrast' ? 'bg-[#ffff00]' : 'bg-emerald-600'
                  }`}
                  aria-hidden="true"
                />
                Server ready
              </span>
            )}
            {backendStatus === 'failed' && (
              <span
                className={`flex items-center gap-1.5 ${
                  theme === 'high-contrast'
                    ? 'text-[#ffff00] underline'
                    : theme === 'dark'
                    ? 'text-rose-400'
                    : 'text-rose-800'
                }`}
                title={backendErrorMessage}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    theme === 'high-contrast' ? 'bg-[#ffff00]' : 'bg-rose-600'
                  }`}
                  aria-hidden="true"
                />
                Server disconnected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* VIEW 1: URL Input Form */}
        {view === 'input' && (
          <div className="max-w-2xl mx-auto py-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
                Read any webpage cleanly
              </h1>
              <p className="text-lg text-slate-700 leading-relaxed">
                Paste an article link below. ClearWeb removes clutter, ads, and
                distractions, giving you a clean, accessible reading experience.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-6 rounded-lg border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 flex items-start gap-3 shadow-sm"
              >
                <span className="text-rose-700 font-bold text-lg select-none" aria-hidden="true">
                  ⚠
                </span>
                <div className="text-base flex-1">
                  <p className="font-semibold mb-1">Could not extract article</p>
                  <p className="text-rose-900 leading-normal">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* URL Submission Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-5">
                <label
                  htmlFor="url-input"
                  className="block text-base font-semibold text-slate-900 mb-2"
                >
                  Webpage Address (URL)
                </label>
                <div className="relative">
                  <input
                    ref={urlInputRef}
                    id="url-input"
                    name="url"
                    type="url"
                    inputMode="url"
                    required
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    aria-describedby="url-hint"
                    className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 bg-white focus:border-blue-700 focus:outline-2 focus:outline-offset-1 focus:outline-blue-700 transition"
                  />
                </div>
                <p id="url-hint" className="mt-2 text-sm text-slate-600">
                  Tip: Works best with news stories, blog posts, essays, and Wikipedia articles.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-blue-800 px-6 py-3 text-base font-semibold text-white hover:bg-blue-900 active:bg-blue-950 focus:outline-3 focus:outline-offset-2 focus:outline-blue-700 shadow transition cursor-pointer"
                >
                  Extract and Read
                </button>

                {url && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl('')
                      setErrorMessage('')
                      urlInputRef.current?.focus()
                    }}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 underline focus:outline-2 focus:outline-blue-700 rounded px-2 py-1"
                  >
                    Clear address
                  </button>
                )}
              </div>
            </form>

            {/* Help / Guidance Box */}
            <section aria-label="About ClearWeb safety" className="mt-8 text-sm text-slate-600 space-y-2 border-t border-slate-200 pt-6">
              <h2 className="font-semibold text-slate-800 text-sm">Protected & Safe Reading</h2>
              <p>
                ClearWeb verifies each link against private networks and SSRF vulnerabilities before fetching. Only public, safe webpage text is displayed.
              </p>
            </section>
          </div>
        )}

        {/* VIEW 2: Loading State */}
        {view === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="max-w-xl mx-auto py-16 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-blue-100 text-blue-800">
              <svg
                className="w-8 h-8 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Extracting webpage content...
            </h2>
            <p className="text-base text-slate-700 max-w-md mx-auto break-words mb-6">
              Downloading and cleaning: <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-800">{loadingUrl}</span>
            </p>
            <p className="text-sm text-slate-600">
              This usually takes 2 to 5 seconds.
            </p>
          </div>
        )}

        {/* VIEW 3: Clean Reader Interface with Stage 5 Customization */}
        {view === 'reader' && article && (
          <div className={`${contentWidthClass} mx-auto`}>
            {/* Stage 5 Reading Customization Controls */}
            <ReadingControls
              preferences={preferences}
              onChangePreference={handleChangePreference}
              onResetPreferences={handleResetPreferences}
              isOpen={isControlsOpen}
              onToggleOpen={() => setIsControlsOpen((prev) => !prev)}
            />

            {/* Stage 7 Web Speech API Audio Player */}
            <AudioPlayer
              tts={tts}
              totalParagraphs={article.paragraphs?.length || 0}
              theme={preferences.theme}
            />

            {/* Article Container */}
            <article className={`rounded-xl p-6 sm:p-10 transition-colors duration-200 ${articleCardThemeClass}`}>
              {/* Top Back Navigation & Original Link */}
              <div className="mb-6 pb-4 border-b border-current/15 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToInput}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${secondaryBtnClass}`}
                >
                  <span aria-hidden="true">←</span> Enter another address
                </button>

                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs font-semibold underline rounded p-1 transition focus:outline-2 ${
                      preferences.theme === 'high-contrast'
                        ? 'text-[#ffff00] hover:text-white focus:outline-[#00ffff]'
                        : preferences.theme === 'dark'
                        ? 'text-blue-400 hover:text-blue-300 focus:outline-blue-400'
                        : preferences.theme === 'sepia'
                        ? 'text-amber-900 hover:text-amber-950 focus:outline-amber-800'
                        : 'text-blue-800 hover:text-blue-950 focus:outline-blue-700'
                    }`}
                  >
                    Original page <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>

              {/* Article Header */}
              <header className="mb-8">
                <h1
                  className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4 ${titleColorClass} ${fontFamilyClass}`}
                >
                  {article.title || 'Untitled Article'}
                </h1>

                {/* Metadata details */}
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${metaColorClass}`}>
                  {article.site_name && (
                    <span className="font-semibold">
                      {article.site_name}
                    </span>
                  )}
                  {article.author && (
                    <span>By {article.author}</span>
                  )}
                  {article.date && (
                    <time dateTime={article.date}>
                      Published {article.date}
                    </time>
                  )}
                  {article.word_count > 0 && (
                    <span>
                      {article.word_count.toLocaleString()} words
                      {readingTime && ` (~${readingTime} min read)`}
                    </span>
                  )}
                </div>

                {/* Truncation notification if text exceeded limit */}
                {article.truncated && (
                  <div
                    role="note"
                    className={`mt-4 rounded-md border p-3 text-xs ${
                      preferences.theme === 'high-contrast'
                        ? 'bg-black border-[#ffff00] text-[#ffff00]'
                        : preferences.theme === 'dark'
                        ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <strong>Note:</strong> This article was very long and was shortened to 300,000 characters for optimal reading performance.
                  </div>
                )}
              </header>

              {/* Article Paragraphs with Dynamic Typography & Bionic Reading */}
              <div
                className={`space-y-6 font-normal ${bodyTextColorClass} ${fontSizeClass} ${lineHeightClass} ${fontFamilyClass}`}
              >
                {article.paragraphs && article.paragraphs.length > 0 ? (
                  article.paragraphs.map((para, index) => (
                    <BionicParagraph
                      key={index}
                      text={para}
                      enabled={preferences.bionicReading}
                      isActiveSpeaking={tts.playbackState !== 'stopped' && tts.currentParagraphIndex === index}
                      activeClass={activeParagraphClass}
                      onClick={() => tts.play(index)}
                      className="cursor-pointer hover:opacity-95 transition-all"
                    />
                  ))
                ) : (
                  <p className="opacity-75 italic">No readable text found for this article.</p>
                )}
              </div>

              {/* Bottom Navigation */}
              <footer className="mt-12 pt-6 border-t border-current/15 flex justify-center">
                <button
                  type="button"
                  onClick={handleBackToInput}
                  className={`inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-base font-semibold cursor-pointer transition focus:outline-2 focus:outline-offset-2 ${primaryBtnClass}`}
                >
                  <span aria-hidden="true">↑</span> Read another webpage
                </button>
              </footer>
            </article>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs transition-colors duration-200 ${headerThemeClass}`}>
        <div className="max-w-4xl mx-auto px-4 opacity-80">
          ClearWeb Accessibility Reader — Stage 7
        </div>
      </footer>
    </div>
  )
}

export default App

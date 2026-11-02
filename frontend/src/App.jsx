import { useEffect, useMemo, useRef, useState } from 'react'
import { checkBackend, extractArticle } from './api.js'
import { AISummary } from './components/AISummary.jsx'
import { AudioPlayer } from './components/AudioPlayer.jsx'
import { MarkdownBlock } from './components/MarkdownBlock.jsx'
import { normalizeArticleParagraphs } from './markdownUtils.js'
import { ReadingControls } from './components/ReadingControls.jsx'
import { ReadingDifficulty } from './components/ReadingDifficulty.jsx'
import { SimplifyControls } from './components/SimplifyControls.jsx'
import { TransformationReport } from './components/TransformationReport.jsx'
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

  // Stage 11: Text Simplification State
  const [activeVersion, setActiveVersion] = useState('original') // 'original' | 'simplified'
  const [activeSimplifiedLevel, setActiveSimplifiedLevel] = useState('simple') // 'simple' | 'very_simple'
  const [cachedSimplifications, setCachedSimplifications] = useState({})

  // Active paragraphs for rendering, TTS, and readability analysis
  const activeParagraphs = useMemo(() => {
    if (activeVersion === 'simplified' && cachedSimplifications[activeSimplifiedLevel]?.simplified_paragraphs) {
      return cachedSimplifications[activeSimplifiedLevel].simplified_paragraphs
    }
    return article?.paragraphs || []
  }, [activeVersion, activeSimplifiedLevel, cachedSimplifications, article?.paragraphs])

  // Normalize active article paragraphs into coherent blocks (tables, lists, headings, paragraphs)
  const displayParagraphs = useMemo(() => {
    return normalizeArticleParagraphs(activeParagraphs)
  }, [activeParagraphs])

  // Stage 7: Native Text-to-Speech Hook
  const tts = useTextToSpeech(displayParagraphs)

  // Stage 12: Transformation Report Tracking State
  const [generatedSummary, setGeneratedSummary] = useState(null)

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
      setActiveVersion('original')
      setActiveSimplifiedLevel('simple')
      setCachedSimplifications({})
      setGeneratedSummary(null)
      setView('reader')
    } else {
      setErrorMessage(result.message)
      setView('input')
    }
  }

  // Return to the URL input view
  function handleBackToInput() {
    tts.stop()
    setActiveVersion('original')
    setActiveSimplifiedLevel('simple')
    setCachedSimplifications({})
    setGeneratedSummary(null)
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
      <header className={`border-b transition-colors duration-200 sticky top-0 z-40 backdrop-blur-md ${headerThemeClass}`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Logo Emblem */}
            <div className="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center font-black text-base shadow-xs select-none">
              CW
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight leading-none block">
                ClearWeb
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 block -mt-0.5">
                Accessible Reader
              </span>
            </div>
          </div>

          {/* Navigation & Status Header Indicators */}
          <div className="flex items-center gap-2.5 text-xs">
            {view === 'reader' && article && (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${secondaryBtnClass}`}>
                  {article.word_count ? `${article.word_count.toLocaleString()} words` : ''}
                  {readingTime && ` (~${readingTime} min)`}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${secondaryBtnClass}`}>
                  {preferences.theme}
                </span>
              </div>
            )}

            {/* Backend Status indicator with pulse */}
            <div className="flex items-center text-xs font-medium">
              {backendStatus === 'checking' && (
                <span className="opacity-75 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Connecting...
                </span>
              )}
              {backendStatus === 'connected' && (
                <span
                  className={`flex items-center gap-1.5 ${
                    theme === 'high-contrast'
                      ? 'text-[#ffff00]'
                      : theme === 'dark'
                      ? 'text-emerald-400'
                      : 'text-emerald-700'
                  }`}
                >
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
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
                      : 'text-rose-700'
                  }`}
                  title={backendErrorMessage}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
                  Server offline
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* VIEW 1: Modern SaaS Landing Page & URL Input */}
        {view === 'input' && (
          <div className="max-w-3xl mx-auto py-4 sm:py-8">
            {/* Hero Announcement Badge */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 mb-5 shadow-2xs">
                <span>✨ ClearWeb 2.0</span>
                <span className="opacity-40">•</span>
                <span>AI-Powered Accessible Web Reader</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
                Turn cluttered web pages into{' '}
                <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                  calm, accessible prose
                </span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
                Distraction-free reading with zero ads or tracking. Features dyslexic typography, high-contrast themes, Bionic Reading, text-to-speech, deterministic readability scoring, and on-demand Gemini AI summaries and simplification.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-6 rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 flex items-start gap-3 shadow-sm"
              >
                <span className="text-rose-700 font-bold text-lg select-none" aria-hidden="true">
                  ⚠️
                </span>
                <div className="text-sm flex-1">
                  <p className="font-bold mb-0.5">Could not extract article</p>
                  <p className="text-rose-900 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* URL Submission Form Card */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <label
                  htmlFor="url-input"
                  className="block text-sm font-bold text-slate-900 mb-1.5"
                >
                  Enter any webpage address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 select-none" aria-hidden="true">
                    🌐
                  </div>
                  <input
                    ref={urlInputRef}
                    id="url-input"
                    name="url"
                    type="url"
                    inputMode="url"
                    required
                    placeholder="https://en.wikipedia.org/wiki/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    aria-describedby="url-hint"
                    className="w-full rounded-xl border-2 border-slate-200 pl-10 pr-24 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:border-blue-700 focus:outline-2 focus:outline-offset-1 focus:outline-blue-700 transition"
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrl('')
                        setErrorMessage('')
                        urlInputRef.current?.focus()
                      }}
                      className="absolute right-3 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md px-2 py-1 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Preset URL Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium select-none">Try an example:</span>
                <button
                  type="button"
                  onClick={() => setUrl('https://en.wikipedia.org/wiki/Harry_Potter')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Harry Potter (Wikipedia)
                </button>
                <button
                  type="button"
                  onClick={() => setUrl('https://en.wikipedia.org/wiki/Web_accessibility')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Web Accessibility (Wikipedia)
                </button>
                <button
                  type="button"
                  onClick={() => setUrl('https://example.com')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Example.com
                </button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <p id="url-hint" className="text-xs text-slate-500">
                  SSRF-protected • Clean semantic extraction • Works with articles, blogs & wikis
                </p>

                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-blue-900 active:bg-slate-950 px-6 py-3 text-sm sm:text-base font-bold text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-2 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
                >
                  <span>Extract and Read</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>

            {/* Feature Highlights Grid */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                  <span>🎨</span>
                  <span>Accessible Typography</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Four high-contrast and warm themes, dyslexia-friendly fonts, custom line spacing, and Bionic Reading word bolding.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                  <span>📊</span>
                  <span>Deterministic Readability</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time Flesch Reading Ease and US Grade Level metrics computed locally with zero AI hallucinations or network calls.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                  <span>🪄</span>
                  <span>AI Simplification & Summaries</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Powered by Google Gemini to rewrite complex articles in Simple or Very Simple English while strictly preserving all facts, dates, and names.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                  <span>🔊</span>
                  <span>Synchronized Speech</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Paragraph-by-paragraph text-to-speech with visual sentence tracking, audio playback controls, and variable voice speeds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Modern Loading State */}
        {view === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="max-w-md mx-auto py-20 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-blue-50 text-blue-800 border border-blue-200 shadow-sm">
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
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              Extracting webpage content...
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Verifying safety rules and formatting readable prose
            </p>
            <div className="inline-block font-mono text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 max-w-sm truncate border border-slate-200">
              {loadingUrl}
            </div>
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
              totalParagraphs={displayParagraphs.length}
              theme={preferences.theme}
            />

            {/* Stage 10 Reading Difficulty Indicator */}
            <ReadingDifficulty
              paragraphs={activeParagraphs}
              text={activeVersion === 'simplified' ? (cachedSimplifications[activeSimplifiedLevel]?.simplified_text || '') : article.text}
              theme={preferences.theme}
            />

            {/* Stage 11 AI Text Simplification */}
            <SimplifyControls
              key={article.url || article.title || 'simplifier'}
              paragraphs={article.paragraphs}
              title={article.title}
              theme={preferences.theme}
              activeVersion={activeVersion}
              onSwitchVersion={(version, level) => {
                tts.stop()
                if (level) setActiveSimplifiedLevel(level)
                setActiveVersion(version)
              }}
              cachedSimplifications={cachedSimplifications}
              onSaveSimplification={(level, data) => {
                setCachedSimplifications((prev) => ({ ...prev, [level]: data }))
              }}
              onStopSpeaking={() => tts.stop()}
            />

            {/* Stage 8 Gemini AI Summaries & Key Points */}
            <AISummary
              key={article.url || article.title || 'summary'}
              paragraphs={article.paragraphs}
              title={article.title}
              preferences={preferences}
              tts={tts}
              activeParagraphClass={activeParagraphClass}
              onSummaryGenerated={(data) => setGeneratedSummary(data)}
            />

            {/* Stage 12 Dynamic Article Transformation Report */}
            <TransformationReport
              key={article.url || article.title || 'transformation-report'}
              article={article}
              activeVersion={activeVersion}
              activeSimplifiedLevel={activeSimplifiedLevel}
              cachedSimplifications={cachedSimplifications}
              generatedSummary={generatedSummary}
              listenedActivity={{ article: tts.hasListenedArticle, summary: tts.hasListenedSummary }}
              preferences={preferences}
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

              {/* Simplified version active notice */}
              {activeVersion === 'simplified' && (
                <div
                  role="status"
                  aria-label="Simplified version notice"
                  className={`mb-6 rounded-lg border p-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 ${
                    preferences.theme === 'high-contrast'
                      ? 'bg-neutral-900 border-2 border-[#ffff00] text-[#ffff00]'
                      : preferences.theme === 'dark'
                      ? 'bg-blue-950/40 border-blue-800 text-blue-200'
                      : preferences.theme === 'sepia'
                      ? 'bg-[#f4ebd9] border-amber-800/30 text-stone-900'
                      : 'bg-blue-50/80 border-blue-200 text-blue-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none" aria-hidden="true">✨</span>
                    <span>
                      <strong>Simplified Article ({activeSimplifiedLevel === 'very_simple' ? 'Very Simple' : 'Simple'}):</strong> Rewritten for easier reading. All original facts, names, dates, and numbers preserved.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      tts.stop()
                      setActiveVersion('original')
                    }}
                    className="font-bold underline cursor-pointer hover:opacity-80"
                  >
                    View original article
                  </button>
                </div>
              )}

              {/* Article Paragraphs with Dynamic Typography, Tables, Headings & Bionic Reading */}
              <div
                className={`space-y-6 font-normal ${bodyTextColorClass} ${fontSizeClass} ${lineHeightClass} ${fontFamilyClass}`}
              >
                {displayParagraphs && displayParagraphs.length > 0 ? (
                  displayParagraphs.map((para, index) => (
                    <MarkdownBlock
                      key={index}
                      text={para}
                      enabled={preferences.bionicReading}
                      theme={preferences.theme}
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
      <footer className={`border-t py-6 text-center text-xs transition-colors duration-200 ${headerThemeClass}`}>
        <div className="max-w-5xl mx-auto px-4 opacity-80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ClearWeb 2.0 Accessibility Reader</span>
          <span>Pure readability, deterministic analytics & AI simplification</span>
        </div>
      </footer>
    </div>
  )
}

export default App

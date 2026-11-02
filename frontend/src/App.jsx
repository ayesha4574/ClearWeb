import { useEffect, useRef, useState } from 'react'
import { checkBackend, extractArticle } from './api.js'

function App() {
  // Navigation state: 'input' | 'loading' | 'reader'
  const [view, setView] = useState('input')
  const [url, setUrl] = useState('')
  const [loadingUrl, setLoadingUrl] = useState('')
  const [article, setArticle] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Backend connection health
  const [backendStatus, setBackendStatus] = useState('checking')
  const [backendErrorMessage, setBackendErrorMessage] = useState('')

  // Ref to refocus the input when returning to the input screen
  const urlInputRef = useRef(null)

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
    setView('input')
    setErrorMessage('')
    // Wait for DOM to update, then focus the URL input for keyboard users
    setTimeout(() => {
      urlInputRef.current?.focus()
    }, 50)
  }

  // Format reading time estimation (~200 words per minute)
  const readingTime = article?.word_count
    ? Math.max(1, Math.round(article.word_count / 200))
    : null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Skip to main content link for keyboard and screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-blue-800 focus:px-4 focus:py-2 focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 shadow-md font-medium"
      >
        Skip to main content
      </a>

      {/* Top Banner / Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-blue-900">
              ClearWeb
            </span>
            <span className="text-xs bg-blue-100 text-blue-900 font-semibold px-2 py-0.5 rounded">
              Reader
            </span>
          </div>

          {/* Backend Status indicator */}
          <div className="flex items-center text-xs font-medium">
            {backendStatus === 'checking' && (
              <span className="text-slate-600">Connecting to server...</span>
            )}
            {backendStatus === 'connected' && (
              <span className="text-emerald-800 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full bg-emerald-600 inline-block"
                  aria-hidden="true"
                />
                Server ready
              </span>
            )}
            {backendStatus === 'failed' && (
              <span className="text-rose-800 flex items-center gap-1.5" title={backendErrorMessage}>
                <span
                  className="w-2 h-2 rounded-full bg-rose-600 inline-block"
                  aria-hidden="true"
                />
                Server disconnected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
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

        {/* VIEW 3: Clean Reader Interface */}
        {view === 'reader' && article && (
          <article className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            {/* Top Back Navigation */}
            <div className="mb-6 pb-4 border-b border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToInput}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-sm font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 transition cursor-pointer"
              >
                <span aria-hidden="true">←</span> Enter another address
              </button>

              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-800 hover:text-blue-950 underline focus:outline-2 focus:outline-blue-700 rounded p-1"
                >
                  Original page <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>

            {/* Article Header */}
            <header className="mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                {article.title || 'Untitled Article'}
              </h1>

              {/* Metadata details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                {article.site_name && (
                  <span className="font-semibold text-slate-900">
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
                  className="mt-4 rounded-md bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900"
                >
                  <strong>Note:</strong> This article was very long and was shortened to 300,000 characters for optimal reading performance.
                </div>
              )}
            </header>

            {/* Article Paragraphs */}
            <div className="space-y-6 text-slate-800 text-lg leading-relaxed font-normal">
              {article.paragraphs && article.paragraphs.length > 0 ? (
                article.paragraphs.map((para, index) => (
                  <p key={index}>{para}</p>
                ))
              ) : (
                <p className="text-slate-600 italic">No readable text found for this article.</p>
              )}
            </div>

            {/* Bottom Navigation */}
            <footer className="mt-12 pt-6 border-t border-slate-200 flex justify-center">
              <button
                type="button"
                onClick={handleBackToInput}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white px-5 py-2.5 text-base font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-blue-700 shadow transition cursor-pointer"
              >
                <span aria-hidden="true">↑</span> Read another webpage
              </button>
            </footer>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-600">
        <div className="max-w-4xl mx-auto px-4">
          ClearWeb Accessibility Reader — Stage 4
        </div>
      </footer>
    </div>
  )
}

export default App

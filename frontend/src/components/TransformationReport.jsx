import { useMemo, useState } from 'react'
import { calculateReadability } from '../readability.js'
import { DEFAULT_PREFERENCES } from '../readingPreferences.js'

export function TransformationReport({
  article,
  activeVersion = 'original',
  activeSimplifiedLevel = 'simple',
  cachedSimplifications = {},
  generatedSummary = null,
  listenedActivity = { article: false, summary: false },
  preferences = DEFAULT_PREFERENCES,
  theme = 'light',
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  // 1. Original Article Baseline Metrics
  const originalReadability = useMemo(() => {
    if (!article) return null
    const content = (article.paragraphs && article.paragraphs.length > 0) ? article.paragraphs : article.text
    return calculateReadability(content)
  }, [article])

  // 2. Simplified Metrics (calculated dynamically if simplified content exists)
  const currentSimplifiedData = cachedSimplifications[activeSimplifiedLevel] || Object.values(cachedSimplifications)[0]
  const simplifiedReadability = useMemo(() => {
    if (!currentSimplifiedData?.simplified_paragraphs) return null
    return calculateReadability(currentSimplifiedData.simplified_paragraphs)
  }, [currentSimplifiedData])

  if (!article) return null

  // 3. Detect non-default reading preferences
  const customPreferencesList = []
  if (preferences.theme !== DEFAULT_PREFERENCES.theme) {
    const themeLabel = { sepia: 'Sepia Theme', dark: 'Dark Theme', 'high-contrast': 'High Contrast Theme' }[preferences.theme] || preferences.theme
    customPreferencesList.push(themeLabel)
  }
  if (preferences.fontSize !== DEFAULT_PREFERENCES.fontSize) {
    customPreferencesList.push(`Font Size: ${preferences.fontSize}`)
  }
  if (preferences.lineHeight !== DEFAULT_PREFERENCES.lineHeight) {
    customPreferencesList.push(`Line Spacing: ${preferences.lineHeight}`)
  }
  if (preferences.fontFamily !== DEFAULT_PREFERENCES.fontFamily) {
    const fontNames = { serif: 'Serif Font', mono: 'Monospace Font', dyslexic: 'Dyslexia Friendly Font' }
    customPreferencesList.push(fontNames[preferences.fontFamily] || preferences.fontFamily)
  }
  if (preferences.contentWidth !== DEFAULT_PREFERENCES.contentWidth) {
    customPreferencesList.push(`Column Width: ${preferences.contentWidth}`)
  }
  if (preferences.bionicReading) {
    customPreferencesList.push('Bionic Reading (Bolding Initial Syllables)')
  }

  // 4. Summaries generated tracking
  const hasSummary = Boolean(generatedSummary?.summary)

  // 5. Simplifications generated tracking
  const generatedLevels = Object.keys(cachedSimplifications)
  const hasSimple = generatedLevels.includes('simple')
  const hasVerySimple = generatedLevels.includes('very_simple')

  // Theme-aware styles
  const cardTheme = {
    light: 'bg-white border-slate-200/90 text-slate-900 shadow-sm',
    sepia: 'bg-[#fbf6ea] border-[#e7dbca] text-stone-900 shadow-sm',
    dark: 'bg-[#111827] border-gray-800 text-gray-100 shadow-sm',
    'high-contrast': 'bg-black border-2 border-[#ffff00] text-[#ffff00]',
  }[theme] || 'bg-white border-slate-200 text-slate-900'

  const borderTheme = {
    light: 'border-slate-200',
    sepia: 'border-[#e7dbca]',
    dark: 'border-gray-800',
    'high-contrast': 'border-[#ffff00]',
  }[theme]

  const boxTheme = {
    light: 'bg-slate-50 border-slate-200/80',
    sepia: 'bg-[#f4ebd9] border-[#e4d7bf]',
    dark: 'bg-gray-800/50 border-gray-700/60',
    'high-contrast': 'bg-neutral-900 border border-[#ffff00]',
  }[theme]

  const mutedTextTheme = {
    light: 'text-slate-600',
    sepia: 'text-stone-600',
    dark: 'text-gray-400',
    'high-contrast': 'text-white',
  }[theme]

  const labelTextTheme = {
    light: 'text-slate-500',
    sepia: 'text-stone-500',
    dark: 'text-gray-400',
    'high-contrast': 'text-[#00ffff]',
  }[theme]

  const chipSuccessTheme = {
    light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    sepia: 'bg-[#dce9d5] text-[#20401b] border-[#b8d4b0]',
    dark: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
    'high-contrast': 'bg-black text-[#00ff66] border border-[#00ff66]',
  }[theme]

  const chipNeutralTheme = {
    light: 'bg-slate-100 text-slate-700 border-slate-200',
    sepia: 'bg-[#eee3ce] text-stone-700 border-[#e1d3bf]',
    dark: 'bg-gray-800 text-gray-300 border-gray-700',
    'high-contrast': 'bg-neutral-900 text-gray-300 border border-gray-600',
  }[theme]

  // Delta calculations
  const easeDelta = (simplifiedReadability?.fleschReadingEase && originalReadability?.fleschReadingEase)
    ? Math.round((simplifiedReadability.fleschReadingEase - originalReadability.fleschReadingEase) * 10) / 10
    : null

  const gradeDelta = (simplifiedReadability?.fleschKincaidGrade && originalReadability?.fleschKincaidGrade)
    ? Math.round((originalReadability.fleschKincaidGrade - simplifiedReadability.fleschKincaidGrade) * 10) / 10
    : null

  const readingTime = article.word_count ? Math.max(1, Math.round(article.word_count / 200)) : 1

  return (
    <section
      aria-label="Article Transformation Report"
      className={`mb-8 rounded-xl border p-5 sm:p-6 transition-colors duration-200 ${cardTheme}`}
    >
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b ${borderTheme}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl select-none" aria-hidden="true">📈</span>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Article Transformation Report
            </h2>
            <p className={`text-xs ${mutedTextTheme}`}>
              Verified audit of transformations, reading activity, and readability impact
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active View Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              activeVersion === 'simplified' ? chipSuccessTheme : chipNeutralTheme
            }`}
          >
            Currently viewing:{' '}
            {activeVersion === 'simplified'
              ? `Simplified (${activeSimplifiedLevel === 'very_simple' ? 'Very Simple' : 'Simple'})`
              : 'Original Article'}
          </span>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`text-xs font-medium underline cursor-pointer p-1 transition hover:opacity-80 ${labelTextTheme}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Hide Report' : 'Show Report'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-5">
          {/* SECTION 1: Baseline Article Attributes */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${labelTextTheme}`}>
              Original Article Baseline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`rounded-lg border p-3 flex flex-col justify-between ${boxTheme}`}>
                <span className={`text-[11px] font-medium uppercase ${labelTextTheme}`}>Length</span>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                  {article.word_count ? article.word_count.toLocaleString() : 'N/A'}{' '}
                  <span className={`text-xs font-normal ${mutedTextTheme}`}>words</span>
                </span>
                <span className={`text-xs mt-1 ${mutedTextTheme}`}>~{readingTime} min read</span>
              </div>

              <div className={`rounded-lg border p-3 flex flex-col justify-between ${boxTheme}`}>
                <span className={`text-[11px] font-medium uppercase ${labelTextTheme}`}>Reading Ease</span>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                  {originalReadability?.fleschReadingEase ?? '—'}{' '}
                  <span className={`text-xs font-normal ${mutedTextTheme}`}>/ 100</span>
                </span>
                <span className={`text-xs mt-1 font-semibold ${mutedTextTheme}`}>
                  {originalReadability?.difficulty || 'Unrated'}
                </span>
              </div>

              <div className={`rounded-lg border p-3 flex flex-col justify-between ${boxTheme}`}>
                <span className={`text-[11px] font-medium uppercase ${labelTextTheme}`}>Grade Level</span>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                  {originalReadability?.fleschKincaidGrade ? `Grade ${originalReadability.fleschKincaidGrade}` : '—'}
                </span>
                <span className={`text-xs mt-1 truncate ${mutedTextTheme}`}>
                  {originalReadability?.gradeLevelLabel || 'Standard'}
                </span>
              </div>

              <div className={`rounded-lg border p-3 flex flex-col justify-between ${boxTheme}`}>
                <span className={`text-[11px] font-medium uppercase ${labelTextTheme}`}>Avg Sentence</span>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                  {originalReadability?.avgWordsPerSentence ?? '—'}{' '}
                  <span className={`text-xs font-normal ${mutedTextTheme}`}>w/s</span>
                </span>
                <span className={`text-xs mt-1 ${mutedTextTheme}`}>
                  {originalReadability?.complexWordPercent ? `${originalReadability.complexWordPercent}% complex` : 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Applied Transformations Audit Trail */}
          <div className="pt-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${labelTextTheme}`}>
              Applied Transformations in this Session
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Feature 1: AI Summary */}
              <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${boxTheme}`}>
                <span className="text-lg select-none" aria-hidden="true">
                  {hasSummary ? '✅' : '⚪'}
                </span>
                <div className="text-xs">
                  <div className="font-bold">AI Summary & Key Takeaways</div>
                  <p className={`mt-0.5 ${mutedTextTheme}`}>
                    {hasSummary
                      ? `Generated ${generatedSummary.length} summary with ${generatedSummary.key_takeaways?.length || 0} bullet points.`
                      : 'Not generated yet during this reading session.'}
                  </p>
                </div>
              </div>

              {/* Feature 2: AI Simplification */}
              <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${boxTheme}`}>
                <span className="text-lg select-none" aria-hidden="true">
                  {hasSimple || hasVerySimple ? '✅' : '⚪'}
                </span>
                <div className="text-xs">
                  <div className="font-bold">AI Text Simplification</div>
                  <p className={`mt-0.5 ${mutedTextTheme}`}>
                    {hasSimple && hasVerySimple
                      ? 'Both Simple and Very Simple levels generated.'
                      : hasSimple
                      ? 'Simple level rewrite generated.'
                      : hasVerySimple
                      ? 'Very Simple level rewrite generated.'
                      : 'No simplified version requested yet.'}
                  </p>
                </div>
              </div>

              {/* Feature 3: Audio Narration */}
              <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${boxTheme}`}>
                <span className="text-lg select-none" aria-hidden="true">
                  {listenedActivity.article || listenedActivity.summary ? '✅' : '⚪'}
                </span>
                <div className="text-xs">
                  <div className="font-bold">Text-to-Speech Audio Playback</div>
                  <p className={`mt-0.5 ${mutedTextTheme}`}>
                    {listenedActivity.article && listenedActivity.summary
                      ? 'Listened to both article narration and AI summary audio.'
                      : listenedActivity.article
                      ? 'Listened to article narration.'
                      : listenedActivity.summary
                      ? 'Listened to AI summary audio.'
                      : 'Audio narration has not been played yet.'}
                  </p>
                </div>
              </div>

              {/* Feature 4: Reading Customizations */}
              <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${boxTheme}`}>
                <span className="text-lg select-none" aria-hidden="true">
                  {customPreferencesList.length > 0 ? '🎨' : '⚪'}
                </span>
                <div className="text-xs">
                  <div className="font-bold">Reading Customization & Accessibility</div>
                  {customPreferencesList.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {customPreferencesList.map((item, idx) => (
                        <span
                          key={idx}
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${chipNeutralTheme}`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-0.5 ${mutedTextTheme}`}>
                      Default typography, line spacing, and light theme active.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Original vs Simplified Comparison (if simplified exists) */}
          {simplifiedReadability && (
            <div className={`rounded-lg border p-4 ${boxTheme}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${labelTextTheme}`}>
                  Readability Impact Comparison (Original vs Simplified)
                </h3>
                <span className={`text-xs font-semibold ${mutedTextTheme}`}>
                  Level: {activeSimplifiedLevel === 'very_simple' ? 'Very Simple' : 'Simple'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                {/* Metric 1 */}
                <div className={`p-2.5 rounded border ${cardTheme}`}>
                  <span className={`block text-[10px] uppercase font-bold ${labelTextTheme}`}>
                    Reading Ease
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm font-extrabold">
                    <span>{originalReadability?.fleschReadingEase ?? '—'}</span>
                    <span className="text-xs opacity-60">→</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-black">
                      {simplifiedReadability.fleschReadingEase}
                    </span>
                  </div>
                  {easeDelta !== null && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                      {easeDelta >= 0 ? `+${easeDelta}` : easeDelta} pts easier
                    </span>
                  )}
                </div>

                {/* Metric 2 */}
                <div className={`p-2.5 rounded border ${cardTheme}`}>
                  <span className={`block text-[10px] uppercase font-bold ${labelTextTheme}`}>
                    Grade Level
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm font-extrabold">
                    <span>{originalReadability?.fleschKincaidGrade ?? '—'}</span>
                    <span className="text-xs opacity-60">→</span>
                    <span className="text-blue-700 dark:text-blue-300 font-black">
                      {simplifiedReadability.fleschKincaidGrade}
                    </span>
                  </div>
                  {gradeDelta !== null && (
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 mt-0.5 block">
                      {gradeDelta > 0 ? `-${gradeDelta} grades` : 'Maintained'}
                    </span>
                  )}
                </div>

                {/* Metric 3 */}
                <div className={`p-2.5 rounded border ${cardTheme}`}>
                  <span className={`block text-[10px] uppercase font-bold ${labelTextTheme}`}>
                    Sentence Length
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm font-extrabold">
                    <span>{originalReadability?.avgWordsPerSentence ?? '—'}</span>
                    <span className="text-xs opacity-60">→</span>
                    <span className="font-black">
                      {simplifiedReadability.avgWordsPerSentence}
                    </span>
                  </div>
                  <span className={`text-[10px] ${mutedTextTheme} mt-0.5 block`}>
                    words per sentence
                  </span>
                </div>

                {/* Metric 4 */}
                <div className={`p-2.5 rounded border ${cardTheme}`}>
                  <span className={`block text-[10px] uppercase font-bold ${labelTextTheme}`}>
                    Complex Words
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm font-extrabold">
                    <span>{originalReadability?.complexWordPercent ?? '—'}%</span>
                    <span className="text-xs opacity-60">→</span>
                    <span className="font-black">
                      {simplifiedReadability.complexWordPercent}%
                    </span>
                  </div>
                  <span className={`text-[10px] ${mutedTextTheme} mt-0.5 block`}>
                    ≥3 syllables
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Methodology and Disclaimer Notice */}
          <div className="pt-1">
            <p className={`text-[11px] leading-relaxed italic ${mutedTextTheme}`}>
              Note: This report reflects only verified transformations applied in this session. Readability formulas statistically estimate syntactic sentence length and syllable density. Transformations simplify language structure; they do not guarantee comprehension or substitute for domain-specific accessibility accommodations.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

export default TransformationReport

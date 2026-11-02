import { useMemo, useState } from 'react'
import { calculateReadability } from '../readability.js'

export function ReadingDifficulty({ paragraphs, text, theme = 'light' }) {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false)

  // Recalculate whenever article content changes
  const metrics = useMemo(() => {
    const content = (paragraphs && paragraphs.length > 0) ? paragraphs : text
    return calculateReadability(content)
  }, [paragraphs, text])

  // Don't render card if content is completely empty
  if (!metrics || metrics.status === 'empty') {
    return null
  }

  // Theme styling definitions
  const cardTheme = {
    light: 'bg-white border-slate-200 text-slate-900 shadow-sm',
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

  const metricBoxTheme = {
    light: 'bg-slate-50 border-slate-200',
    sepia: 'bg-[#f4ebd9] border-[#e4d7bf]',
    dark: 'bg-gray-800/60 border-gray-700/60',
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

  const badgeTheme = {
    Easy: {
      light: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
      sepia: 'bg-[#dce9d5] text-[#20401b] border border-[#b8d4b0]',
      dark: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800',
      'high-contrast': 'bg-black text-[#00ff66] border-2 border-[#00ff66]',
    }[theme],
    Moderate: {
      light: 'bg-amber-100 text-amber-900 border border-amber-300',
      sepia: 'bg-[#fae7cb] text-[#6b4716] border border-[#ecd2a9]',
      dark: 'bg-amber-950/80 text-amber-300 border border-amber-800',
      'high-contrast': 'bg-black text-[#ffff00] border-2 border-[#ffff00]',
    }[theme],
    Difficult: {
      light: 'bg-rose-100 text-rose-900 border border-rose-300',
      sepia: 'bg-[#fcd9d3] text-[#78231c] border border-[#f0b5ab]',
      dark: 'bg-rose-950/80 text-rose-300 border border-rose-800',
      'high-contrast': 'bg-black text-[#ff5555] border-2 border-[#ff5555]',
    }[theme],
  }

  // Handle text too short for statistical calculation
  if (metrics.status === 'too_short') {
    return (
      <section
        aria-label="Reading difficulty assessment"
        className={`mb-6 rounded-xl border p-4 transition-colors duration-200 ${cardTheme}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg select-none" aria-hidden="true">📊</span>
          <p className={`text-sm ${mutedTextTheme}`}>
            <span className="font-semibold">Reading Difficulty:</span> Article is too short ({metrics.wordCount || 0} words) for statistical readability scoring.
          </p>
        </div>
      </section>
    )
  }

  const currentBadgeClass = badgeTheme[metrics.difficulty] || badgeTheme.Moderate

  return (
    <section
      aria-label="Reading difficulty assessment"
      className={`mb-6 rounded-xl border p-4 sm:p-5 transition-colors duration-200 ${cardTheme}`}
    >
      {/* Top row: Title + Difficulty Badge */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${borderTheme}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl select-none" aria-hidden="true">📊</span>
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Reading Difficulty
            </h2>
            <p className={`text-xs ${mutedTextTheme}`}>
              Deterministic structural complexity analysis
            </p>
          </div>
        </div>

        {/* Classification Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentBadgeClass}`}
          >
            {metrics.difficulty}
          </span>
          <span className="text-xs font-medium opacity-80">
            ({metrics.gradeLevelLabel})
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Metric 1: Reading Ease */}
        <div className={`rounded-lg border p-3 flex flex-col justify-between ${metricBoxTheme}`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${labelTextTheme}`}>
            Reading Ease
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {metrics.fleschReadingEase}
            </span>
            <span className={`text-xs ${mutedTextTheme}`}>/ 100</span>
          </div>
          <span className={`text-xs mt-1 ${mutedTextTheme}`}>
            {metrics.fleschReadingEase >= 70
              ? 'Easy reading'
              : metrics.fleschReadingEase >= 50
              ? 'Standard'
              : 'Challenging'}
          </span>
        </div>

        {/* Metric 2: Grade Level */}
        <div className={`rounded-lg border p-3 flex flex-col justify-between ${metricBoxTheme}`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${labelTextTheme}`}>
            US Grade Level
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {metrics.fleschKincaidGrade}
            </span>
            <span className={`text-xs ${mutedTextTheme}`}>FKGL</span>
          </div>
          <span className={`text-xs mt-1 truncate ${mutedTextTheme}`} title={metrics.gradeLevelLabel}>
            {metrics.gradeLevelLabel}
          </span>
        </div>

        {/* Metric 3: Sentence Length */}
        <div className={`rounded-lg border p-3 flex flex-col justify-between ${metricBoxTheme}`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${labelTextTheme}`}>
            Sentence Length
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {metrics.avgWordsPerSentence}
            </span>
            <span className={`text-xs ${mutedTextTheme}`}>w/s</span>
          </div>
          <span className={`text-xs mt-1 ${mutedTextTheme}`}>
            Avg words / sentence
          </span>
        </div>

        {/* Metric 4: Complex Words */}
        <div className={`rounded-lg border p-3 flex flex-col justify-between ${metricBoxTheme}`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${labelTextTheme}`}>
            Complex Words
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {metrics.complexWordPercent}%
            </span>
          </div>
          <span className={`text-xs mt-1 ${mutedTextTheme}`}>
            ≥3 syllables ({metrics.complexWordsCount})
          </span>
        </div>
      </div>

      {/* Plain-Language Explanation */}
      <div className="mt-3.5 pt-3 border-t border-current/10">
        <p className={`text-sm leading-relaxed ${mutedTextTheme}`}>
          {metrics.explanation}
        </p>
      </div>

      {/* Collapsible Methodology & Disclaimer */}
      <div className="mt-2 text-right">
        <button
          type="button"
          onClick={() => setShowFormulaDetails((prev) => !prev)}
          className={`text-xs underline cursor-pointer hover:opacity-80 transition focus:outline-2 focus:outline-offset-2 ${labelTextTheme}`}
          aria-expanded={showFormulaDetails}
        >
          {showFormulaDetails ? 'Hide calculation details' : 'How is this calculated?'}
        </button>

        {showFormulaDetails && (
          <div className={`mt-2 p-3 rounded-lg border text-left text-xs space-y-1.5 ${metricBoxTheme} ${mutedTextTheme}`}>
            <p>
              <strong>Formulas:</strong> Calculated using the standard <em>Flesch Reading Ease</em> and <em>Flesch-Kincaid Grade Level</em> algorithms based on word length, syllable count, and sentence density across {metrics.wordCount.toLocaleString()} words and {metrics.sentenceCount.toLocaleString()} sentences.
            </p>
            <p className="italic opacity-85">
              Notice: Readability formulas statistically estimate structural syntactic complexity. They do not measure reader interest, subject-matter depth, or guarantee comprehension.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default ReadingDifficulty


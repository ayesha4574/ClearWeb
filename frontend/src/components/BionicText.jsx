import React from 'react'

/**
 * Regex that captures words while preserving apostrophes in contractions
 * (e.g., "don't", "they're") and accents (e.g., "café").
 * Hyphenated words are naturally split by hyphens so each sub-word
 * gets its own fixation point.
 */
const WORD_REGEX = /([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+(?:'[a-zA-Z]+)?)/g

/**
 * Calculates how many letters to bold based on word length.
 * ~40-50% fixation creates optimal saccadic eye movements.
 */
function getFixationLength(length) {
  if (length <= 1) return 1
  if (length <= 3) return 2
  if (length <= 6) return Math.ceil(length * 0.5)
  return Math.ceil(length * 0.45)
}

/**
 * Formats a plain text string into Bionic Reading elements.
 * Preserves all whitespace, punctuation, numbers, and formatting exactly.
 */
function formatBionic(text) {
  if (!text) return text
  const parts = text.split(WORD_REGEX)

  return parts.map((part, index) => {
    // Odd indices contain matched word tokens
    if (index % 2 === 1 && part.length > 0) {
      const fix = getFixationLength(part.length)
      const boldPart = part.slice(0, fix)
      const restPart = part.slice(fix)
      return (
        <span key={index}>
          <b className="font-bold">{boldPart}</b>
          {restPart}
        </span>
      )
    }
    // Even indices contain punctuation, spaces, numbers, or non-word symbols
    return part
  })
}

/**
 * Memoized paragraph component for top performance on long articles.
 */
export const BionicParagraph = React.memo(function BionicParagraph({
  text,
  enabled,
  className,
}) {
  if (!enabled || !text) {
    return <p className={className}>{text}</p>
  }

  return <p className={className}>{formatBionic(text)}</p>
})

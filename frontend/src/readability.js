/**
 * readability.js
 *
 * Deterministic, offline readability analysis utility for ClearWeb.
 * Computes:
 * - Flesch Reading Ease (FRE)
 * - Flesch-Kincaid Grade Level (FKGL)
 * - Average Sentence Length (ASL / words per sentence)
 * - Percentage of Complex Words (3+ syllables)
 * - Standard difficulty classification: 'Easy' | 'Moderate' | 'Difficult'
 */

// Regex to capture words while preserving contractions (e.g. "don't", "they're")
const WORD_REGEX = /([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+(?:'[a-zA-Z]+)?)/g

/**
 * Counts syllables in an English word using standard heuristic rules.
 * Fast, deterministic, and accurate for readability scoring.
 */
export function countSyllables(word) {
  if (!word || typeof word !== 'string') return 0
  let w = word.toLowerCase().trim().replace(/[^a-z]/g, '')
  if (w.length === 0) return 0
  if (w.length <= 3) return 1

  const isVowel = (c) => 'aeiouy'.includes(c)

  // Strip trailing "es" if not preceded by s, z, x, ch, sh (e.g. "states" -> 1, "boxes" -> 2)
  if (
    w.endsWith('es') &&
    !w.endsWith('ches') &&
    !w.endsWith('shes') &&
    !w.endsWith('ses') &&
    !w.endsWith('zes') &&
    !w.endsWith('xes')
  ) {
    w = w.slice(0, -2)
  }

  // Handle trailing silent 'e'
  let hasLeSyllable = false
  if (w.endsWith('e') && !w.endsWith('ee') && !w.endsWith('oe') && !w.endsWith('ye')) {
    if (w.length > 2 && w.endsWith('le') && !isVowel(w[w.length - 3])) {
      hasLeSyllable = true
    }
    w = w.slice(0, -1)
  }

  // Adjust for regular trailing '-ed' (e.g. "walked" = 1, "hated"/"waited" = 2)
  if (w.endsWith('ed') && !w.endsWith('ted') && !w.endsWith('ded')) {
    w = w.slice(0, -2)
  }

  const matches = w.match(/[aeiouy]+/g)
  let count = matches ? matches.length : 1

  if (hasLeSyllable) count++

  // Diphthongs that sound as two syllables (except common -tion/-sion endings)
  const multiSylVowels = w.match(/(?<![ts])io|(?<!c)ia|ua|eo/g)
  if (multiSylVowels) {
    count += multiSylVowels.length
  }

  return Math.max(1, count)
}

/**
 * Cleans markdown formatting, tables, citation markers and link URLs
 * so that only readable prose is evaluated.
 */
export function cleanProse(textOrParagraphs) {
  if (!textOrParagraphs) return ''
  const raw = Array.isArray(textOrParagraphs) ? textOrParagraphs.join('\n\n') : String(textOrParagraphs)

  return raw
    .replace(/^\|.*\|$/gm, '') // Remove markdown table lines
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Convert markdown links [text](url) -> text
    .replace(/<sup>.*?<\/sup>/gi, '') // Remove HTML citations
    .replace(/\[\d+\]/g, '') // Remove bracketed citations [1]
    .replace(/[*_~`#]/g, ' ') // Strip markdown emphasis and heading markers
    .replace(/^\s*[-*•]\s+/gm, '') // Strip bullet points
    .replace(/^\s*\d+\.\s+/gm, '') // Strip numbered list markers
    .replace(/\s+/g, ' ') // Collapse multiple whitespace
    .trim()
}

/**
 * Splits text into sentences while respecting common abbreviations, initials, acronyms, and numbers.
 */
export function splitSentences(text) {
  if (!text || typeof text !== 'string') return []
  const clean = text.trim()
  if (!clean) return []

  // Protect numbers with decimals (e.g. "3.14", "Grade 8.4")
  let processed = clean.replace(/(\d+)\.(\d+)/g, '$1<DECIMAL>$2')

  // Common titles & abbreviations followed by whitespace: 'Dr. Smith', 'Mr. Johnson'
  const abbrList = 'mr|mrs|ms|dr|prof|sr|jr|vs|etc|eg|ie|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|st|ave|rd|blvd|dept|univ|approx|est'
  const abbrRegex = new RegExp('\\b(' + abbrList + ')\\.(?=\\s+)', 'gi')
  processed = processed.replace(abbrRegex, '$1<DOT>')

  // Multi-letter acronyms without internal whitespace (e.g. "U.S.", "e.g.", "p.m.")
  // If not followed by whitespace + capital letter, all dots are protected
  processed = processed.replace(/\b([a-zA-Z])\.([a-zA-Z])\.(?!\s+[A-Z]|\s*$)/g, '$1<DOT>$2<DOT>')
  // If at sentence boundary (followed by whitespace + capital letter or end of string), protect first dot, keep final dot for sentence split
  processed = processed.replace(/\b([a-zA-Z])\.([a-zA-Z])\.(?=\s+[A-Z]|\s*$)/g, '$1<DOT>$2.')

  // Single uppercase initials followed by space and another capitalized word: e.g. 'J. K. Rowling'
  processed = processed.replace(/\b([A-Z])\.\s+(?=[A-Z])/g, '$1<DOT> ')

  // Split by sentence terminators (. ! ?) followed by whitespace or end of string
  const rawParts = processed.split(/(?<=[.!?])\s+/)

  return rawParts
    .map((p) => p.replace(/<DOT>/g, '.').replace(/<DECIMAL>/g, '.').trim())
    .filter((p) => p.length > 0 && /[a-zA-Z]/.test(p))
}

/**
 * Tokenizes text into individual alphabetic/contraction words.
 */
export function tokenizeWords(text) {
  if (!text || typeof text !== 'string') return []
  const matches = text.match(WORD_REGEX) || []
  return matches.map((m) => m.trim()).filter((m) => m.length > 0)
}

/**
 * Human-readable US Grade Level string based on FKGL score.
 */
export function formatGradeLevel(fkgl) {
  if (fkgl <= 1.5) return '1st Grade & below'
  if (fkgl <= 2.5) return '2nd Grade'
  if (fkgl <= 3.5) return '3rd Grade'
  if (fkgl <= 4.5) return '4th Grade'
  if (fkgl <= 5.5) return '5th Grade'
  if (fkgl <= 6.5) return '6th Grade'
  if (fkgl <= 7.5) return '7th Grade'
  if (fkgl <= 8.5) return '8th Grade'
  if (fkgl <= 9.5) return '9th Grade'
  if (fkgl <= 10.5) return '10th Grade'
  if (fkgl <= 11.5) return '11th Grade'
  if (fkgl <= 12.5) return '12th Grade (High School)'
  if (fkgl <= 15.5) return 'College Level'
  return 'Graduate / Advanced'
}

/**
 * Calculates complete readability metrics for an article.
 */
export function calculateReadability(textOrParagraphs) {
  const prose = cleanProse(textOrParagraphs)
  if (!prose) {
    return { status: 'empty' }
  }

  const words = tokenizeWords(prose)
  const sentences = splitSentences(prose)

  // Need at least 10 words and 1 sentence for a meaningful statistical score
  if (words.length < 10 || sentences.length === 0) {
    return {
      status: 'too_short',
      wordCount: words.length,
      sentenceCount: sentences.length,
    }
  }

  let totalSyllables = 0
  let complexWordsCount = 0

  for (const word of words) {
    const syl = countSyllables(word)
    totalSyllables += syl
    if (syl >= 3) {
      complexWordsCount++
    }
  }

  const wordCount = words.length
  const sentenceCount = sentences.length
  const avgWordsPerSentence = wordCount / sentenceCount
  const avgSyllablesPerWord = totalSyllables / wordCount
  const complexWordPercent = (complexWordsCount / wordCount) * 100

  // 1. Flesch Reading Ease: 206.835 - (1.015 * ASL) - (84.6 * ASW)
  const rawFre = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
  const fre = Math.max(0, Math.min(100, Math.round(rawFre * 10) / 10))

  // 2. Flesch-Kincaid Grade Level: (0.39 * ASL) + (11.8 * ASW) - 15.59
  const rawFkgl = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
  const fkgl = Math.max(1, Math.round(rawFkgl * 10) / 10)

  // 3. Classification
  let difficulty = 'Moderate'
  let explanation = ''

  if (fre >= 70) {
    difficulty = 'Easy'
    explanation =
      'Conversational and accessible. Features shorter sentences and everyday vocabulary that can be read quickly and comfortably.'
  } else if (fre < 50) {
    difficulty = 'Difficult'
    explanation =
      'Advanced or academic text. Contains longer, multi-clause sentences and specialized or technical vocabulary requiring focused attention.'
  } else {
    difficulty = 'Moderate'
    explanation =
      'Standard adult reading level. Balanced sentence length and common vocabulary, typical of news articles and general publications.'
  }

  return {
    status: 'ok',
    difficulty,
    fleschReadingEase: fre,
    fleschKincaidGrade: fkgl,
    gradeLevelLabel: formatGradeLevel(fkgl),
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    complexWordPercent: Math.round(complexWordPercent * 10) / 10,
    wordCount,
    sentenceCount,
    complexWordsCount,
    explanation,
  }
}

import React from 'react'

/**
 * Regex that captures words while preserving apostrophes in contractions
 * (e.g., "don't", "they're") and accents (e.g., "café").
 */
const WORD_REGEX = /([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+(?:'[a-zA-Z]+)?)/g

/**
 * Calculates how many letters to bold based on word length.
 * ~40-50% fixation creates optimal saccadic eye movements.
 */
export function getFixationLength(length) {
  if (length <= 1) return 1
  if (length <= 3) return 2
  if (length <= 6) return Math.ceil(length * 0.5)
  return Math.ceil(length * 0.45)
}

/**
 * Formats a plain text string into Bionic Reading elements using pure React.createElement.
 * Preserves all whitespace, punctuation, numbers, and formatting exactly.
 */
export function formatBionic(text) {
  if (!text) return text
  const parts = text.split(WORD_REGEX)

  return parts.map((part, index) => {
    // Odd indices contain matched word tokens
    if (index % 2 === 1 && part.length > 0) {
      const fix = getFixationLength(part.length)
      const boldPart = part.slice(0, fix)
      const restPart = part.slice(fix)
      return React.createElement(
        'span',
        { key: index },
        React.createElement('b', { className: 'font-bold' }, boldPart),
        restPart
      )
    }
    // Even indices contain punctuation, spaces, numbers, or non-word symbols
    return part
  })
}

/**
 * Checks if a URL is safe to use in an anchor href (prevents XSS javascript:/data: URLs).
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) || (trimmed.startsWith('/') && !trimmed.startsWith('//'))
}

/**
 * Parses markdown table text into structured headers and rows.
 */
export function parseTableRows(tableText) {
  const lines = tableText.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  function parseLine(line) {
    const inner = line.replace(/^\|/, '').replace(/\|$/, '')
    return inner.split('|').map((c) => c.trim())
  }

  const rawRows = lines.map(parseLine)
  const delimiterIdx = lines.findIndex((l) => /^\|(\s*:?-+:?\s*\|)+$/.test(l))

  let headers = null
  let bodyRows = []

  if (delimiterIdx > 0) {
    headers = rawRows[0]
    bodyRows = rawRows.slice(delimiterIdx + 1).filter((_, idx) => {
      const lineIdx = delimiterIdx + 1 + idx
      return !/^\|(\s*:?-+:?\s*\|)+$/.test(lines[lineIdx])
    })
  } else if (lines.length > 1 && /^\|(\s*:?-+:?\s*\|)+$/.test(lines[1])) {
    headers = rawRows[0]
    bodyRows = rawRows.slice(2)
  } else {
    bodyRows = rawRows
  }

  return { headers, rows: bodyRows }
}

/**
 * Groups any stray consecutive single-line table rows into a unified table block.
 */
export function normalizeArticleParagraphs(paragraphs) {
  if (!Array.isArray(paragraphs)) return []
  const result = []
  let currentTable = []

  function flush() {
    if (currentTable.length > 0) {
      result.push(currentTable.join('\n'))
      currentTable = []
    }
  }

  for (const para of paragraphs) {
    if (!para || typeof para !== 'string') continue
    const trimmed = para.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && !trimmed.includes('\n')) {
      currentTable.push(trimmed)
    } else {
      flush()
      result.push(trimmed)
    }
  }

  flush()
  return result
}

/**
 * Safely parses inline markdown (links, bold, italic, citations) and renders them as JSX elements.
 */
export function renderInlineContent(text, bionicEnabled, theme = 'light') {
  if (!text) return text

  const regex = /(\[(.*?)\]\((.*?)\)|\*\*\*(.*?)\*\*\*|\*\*(.*?)\*\*|\*(.*?)\*|<sup>(.*?)<\/sup>)/g
  const parts = []
  let lastIndex = 0
  let match
  let key = 0

  const linkStyle = {
    light: 'text-blue-700 hover:text-blue-900 focus:outline-blue-600',
    sepia: 'text-amber-900 hover:text-amber-950 focus:outline-amber-800',
    dark: 'text-blue-400 hover:text-blue-300 focus:outline-blue-400',
    'high-contrast': 'text-[#ffff00] underline font-bold focus:outline-[#00ffff]',
  }[theme] || 'text-blue-700 hover:text-blue-900'

  function renderTextSegment(str) {
    if (!str) return null
    return bionicEnabled ? formatBionic(str) : str
  }

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        React.createElement(
          React.Fragment,
          { key: key++ },
          renderTextSegment(text.slice(lastIndex, match.index))
        )
      )
    }

    if (match[1].startsWith('[') && match[2] !== undefined && match[3] !== undefined) {
      const anchorText = match[2]
      const rawUrl = match[3].replace(/^<|>$/g, '').trim()
      if (isSafeUrl(rawUrl)) {
        parts.push(
          React.createElement(
            'a',
            {
              key: key++,
              href: rawUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: `underline font-medium p-0.5 rounded transition ${linkStyle}`,
              onClick: (e) => e.stopPropagation(),
            },
            renderTextSegment(anchorText)
          )
        )
      } else {
        parts.push(
          React.createElement(
            'span',
            { key: key++ },
            renderTextSegment(anchorText)
          )
        )
      }
    } else if (match[4]) {
      parts.push(
        React.createElement(
          'strong',
          { key: key++, className: 'font-bold italic' },
          renderTextSegment(match[4])
        )
      )
    } else if (match[5]) {
      parts.push(
        React.createElement(
          'strong',
          { key: key++, className: 'font-bold' },
          renderTextSegment(match[5])
        )
      )
    } else if (match[6]) {
      parts.push(
        React.createElement(
          'em',
          { key: key++, className: 'italic' },
          renderTextSegment(match[6])
        )
      )
    } else if (match[7]) {
      const cleaned = match[7].replace(/\\/g, '')
      parts.push(
        React.createElement(
          'sup',
          {
            key: key++,
            className: 'text-xs font-mono opacity-70 ml-0.5 select-none',
            'aria-label': `Citation ${cleaned}`,
          },
          cleaned
        )
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(
      React.createElement(
        React.Fragment,
        { key: key++ },
        renderTextSegment(text.slice(lastIndex))
      )
    )
  }

  return parts
}

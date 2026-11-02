import React from 'react'
import { parseTableRows, renderInlineContent } from '../markdownUtils.js'

/**
 * Universal Markdown block renderer supporting tables, headings, lists, and paragraphs
 * while preserving Bionic reading, TTS reading synchronization, and theme styling.
 */
export const MarkdownBlock = React.memo(function MarkdownBlock({
  text,
  enabled = false,
  theme = 'light',
  className = '',
  isActiveSpeaking = false,
  activeClass = '',
  onClick,
}) {
  if (!text || typeof text !== 'string') return null

  const trimmed = text.trim()
  const combinedClass = `${className} ${isActiveSpeaking ? activeClass : ''}`.trim()

  // 1. Check for Markdown Table (starts with '|' or contains multiple '|' rows)
  const isTable = trimmed.startsWith('|') && trimmed.includes('\n')
  if (isTable) {
    const tableData = parseTableRows(trimmed)
    if (tableData) {
      const tableWrapperClass = {
        light: 'border-slate-200 bg-white shadow-xs',
        sepia: 'border-[#e7dbca] bg-[#fbf6ea] shadow-xs',
        dark: 'border-gray-800 bg-[#111827] shadow-xs',
        'high-contrast': 'border-2 border-[#ffff00] bg-black text-[#ffff00]',
      }[theme] || 'border-slate-200 bg-white'

      const theadClass = {
        light: 'bg-slate-100/90 text-slate-900 border-b border-slate-200',
        sepia: 'bg-[#ede2d0] text-stone-900 border-b border-[#e7dbca]',
        dark: 'bg-[#1f2937] text-gray-100 border-b border-gray-800',
        'high-contrast': 'bg-black text-[#ffff00] border-b-2 border-[#ffff00]',
      }[theme]

      const cellBorderClass = {
        light: 'border-slate-200',
        sepia: 'border-[#e7dbca]',
        dark: 'border-gray-800',
        'high-contrast': 'border-[#ffff00]',
      }[theme]

      const rowZebraClass = {
        light: 'odd:bg-white even:bg-slate-50/70 hover:bg-slate-100/50',
        sepia: 'odd:bg-[#fbf6ea] even:bg-[#f4ebd9]/70 hover:bg-[#eee2ce]',
        dark: 'odd:bg-[#111827] even:bg-[#1a2234] hover:bg-[#232e44]',
        'high-contrast': 'odd:bg-black even:bg-neutral-900',
      }[theme]

      return (
        <div
          role="region"
          aria-label="Data table"
          tabIndex={0}
          className={`my-6 overflow-x-auto rounded-lg border transition ${tableWrapperClass} ${combinedClass}`}
          aria-current={isActiveSpeaking ? 'true' : undefined}
          onClick={onClick}
        >
          <table className="min-w-full divide-y divide-current/15 text-left text-sm leading-relaxed border-collapse">
            {tableData.headers && tableData.headers.some((h) => Boolean(h)) && (
              <thead className={theadClass}>
                <tr>
                  {tableData.headers.map((head, hIdx) => (
                    <th
                      key={hIdx}
                      scope="col"
                      className={`px-4 py-3 font-bold border-r last:border-r-0 ${cellBorderClass}`}
                    >
                      {renderInlineContent(head, enabled, theme)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-current/10">
              {tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className={`transition-colors ${rowZebraClass}`}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-4 py-2.5 align-top border-r last:border-r-0 ${cellBorderClass}`}
                    >
                      {renderInlineContent(cell, enabled, theme)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  // 2. Check for Markdown Headings (# Heading, ## Heading, ### Heading)
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
  if (headingMatch) {
    const level = headingMatch[1].length
    const headingText = headingMatch[2]

    const headingStyles = {
      1: 'text-2xl sm:text-3xl font-extrabold mt-10 mb-4 pb-2 border-b border-current/20',
      2: 'text-xl sm:text-2xl font-bold mt-8 mb-3 pb-1 border-b border-current/15',
      3: 'text-lg sm:text-xl font-bold mt-6 mb-2',
      4: 'text-base sm:text-lg font-semibold mt-4 mb-2',
      5: 'text-sm sm:text-base font-semibold mt-3 mb-1',
      6: 'text-xs sm:text-sm font-semibold mt-2 mb-1',
    }[level] || 'text-xl font-bold mt-6 mb-2'

    const Tag = `h${Math.min(6, level + 1)}` // Shift h1 down to h2 to respect single page h1

    return (
      <Tag
        className={`${headingStyles} ${combinedClass}`}
        aria-current={isActiveSpeaking ? 'true' : undefined}
        onClick={onClick}
      >
        {renderInlineContent(headingText, enabled, theme)}
      </Tag>
    )
  }

  // 3. Check for Markdown Lists (bullet or numbered)
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
  const isList = lines.length > 0 && lines.every((l) => /^([-*•]|\d+\.)\s/.test(l))
  if (isList) {
    const isNumbered = /^\d+\.\s/.test(lines[0])
    const ListTag = isNumbered ? 'ol' : 'ul'
    const listClass = isNumbered
      ? 'list-decimal pl-6 my-4 space-y-2'
      : 'list-disc pl-6 my-4 space-y-2'

    return (
      <ListTag
        className={`${listClass} ${combinedClass}`}
        aria-current={isActiveSpeaking ? 'true' : undefined}
        onClick={onClick}
      >
        {lines.map((item, idx) => {
          const cleanItem = item.replace(/^([-*•]|\d+\.)\s+/, '')
          return (
            <li key={idx} className="leading-relaxed">
              {renderInlineContent(cleanItem, enabled, theme)}
            </li>
          )
        })}
      </ListTag>
    )
  }

  // 4. Default: Standard Paragraph with Inline Markdown & Bionic Reading
  return (
    <p
      className={`leading-relaxed ${combinedClass}`}
      aria-current={isActiveSpeaking ? 'true' : undefined}
      onClick={onClick}
    >
      {renderInlineContent(trimmed, enabled, theme)}
    </p>
  )
})

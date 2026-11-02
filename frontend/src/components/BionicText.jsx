import React from 'react'
import { formatBionic } from '../markdownUtils.js'

/**
 * Memoized paragraph component for top performance on long articles.
 * Supports active speech reading highlight and jump-to-speak on click.
 */
export const BionicParagraph = React.memo(function BionicParagraph({
  text,
  enabled,
  className = '',
  isActiveSpeaking = false,
  activeClass = '',
  onClick,
}) {
  const combinedClass = `${className} ${isActiveSpeaking ? activeClass : ''}`.trim()
  const content = enabled && text ? formatBionic(text) : text

  return (
    <p
      className={combinedClass}
      aria-current={isActiveSpeaking ? 'true' : undefined}
      onClick={onClick}
    >
      {content}
    </p>
  )
})

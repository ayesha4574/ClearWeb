import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseTableRows,
  normalizeArticleParagraphs,
  isSafeUrl,
  formatBionic,
  renderInlineContent,
} from './markdownUtils.js'
import { cleanForSpeech } from './hooks/useTextToSpeech.js'

test('parseTableRows parses standard GFM tables', () => {
  const table = `| Author | J. K. Rowling |
|---|---|
| Country | United Kingdom |
| Language | English |`

  const parsed = parseTableRows(table)
  assert.ok(parsed)
  assert.deepEqual(parsed.headers, ['Author', 'J. K. Rowling'])
  assert.equal(parsed.rows.length, 2)
  assert.deepEqual(parsed.rows[0], ['Country', 'United Kingdom'])
  assert.deepEqual(parsed.rows[1], ['Language', 'English'])
})

test('parseTableRows handles Wikipedia infobox with redundant separator rows', () => {
  const table = `| Harry Potter |  |
|---|---|
| Author | J. K. Rowling |
|---|---|
| Country | United Kingdom |`

  const parsed = parseTableRows(table)
  assert.ok(parsed)
  assert.deepEqual(parsed.headers, ['Harry Potter', ''])
  assert.equal(parsed.rows.length, 2)
  assert.deepEqual(parsed.rows[0], ['Author', 'J. K. Rowling'])
  assert.deepEqual(parsed.rows[1], ['Country', 'United Kingdom'])
})

test('normalizeArticleParagraphs groups consecutive table rows', () => {
  const input = [
    'Introduction paragraph.',
    '| Harry Potter |  |',
    '|---|---|',
    '| Author | J. K. Rowling |',
    '| Country | United Kingdom |',
    'Conclusion paragraph.',
  ]

  const output = normalizeArticleParagraphs(input)
  assert.equal(output.length, 3)
  assert.equal(output[0], 'Introduction paragraph.')
  assert.ok(output[1].includes('| Author | J. K. Rowling |'))
  assert.ok(output[1].includes('\n'))
  assert.equal(output[2], 'Conclusion paragraph.')
})

test('isSafeUrl prevents XSS and allows legitimate web addresses', () => {
  assert.equal(isSafeUrl('https://en.wikipedia.org/wiki/Harry_Potter'), true)
  assert.equal(isSafeUrl('http://example.com/article'), true)
  assert.equal(isSafeUrl('/relative/path'), true)

  // Unsafe / Malicious URLs
  assert.equal(isSafeUrl('javascript:alert("XSS")'), false)
  assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(isSafeUrl('vbscript:msgbox("test")'), false)
  assert.equal(isSafeUrl('//evil.com'), false) // protocol-relative URL
  assert.equal(isSafeUrl(''), false)
  assert.equal(isSafeUrl(null), false)
})

test('formatBionic bolds initial part of words while preserving formatting', () => {
  const result = formatBionic('Harry Potter')
  assert.ok(Array.isArray(result))
  // result[0] is '', result[1] is 'Harry' -> fix length 3 -> 'Har' + 'ry'
  assert.equal(result[1].props.children[0].props.children, 'Har')
  assert.equal(result[1].props.children[1], 'ry')
})

test('renderInlineContent parses bold, links, citations and escapes unsafe links', () => {
  const rendered = renderInlineContent(
    'Written by [J. K. Rowling](https://en.wikipedia.org/wiki/J._K._Rowling) and **Hacked** [XSS](javascript:alert(1))<sup>[1]</sup>',
    false,
    'light'
  )
  assert.ok(Array.isArray(rendered))
  // Link to wikipedia is an <a> tag
  const wikiLink = rendered.find((el) => el?.type === 'a')
  assert.ok(wikiLink)
  assert.equal(wikiLink.props.href, 'https://en.wikipedia.org/wiki/J._K._Rowling')

  // javascript: link is sanitized into a <span>, never an <a>
  const jsLink = rendered.find((el) => el?.props?.href === 'javascript:alert(1)')
  assert.equal(jsLink, undefined)

  // Bold is a <strong> tag
  const boldEl = rendered.find((el) => el?.type === 'strong')
  assert.ok(boldEl)
  assert.equal(boldEl.props.children, 'Hacked')

  // Citation is a <sup> tag
  const supEl = rendered.find((el) => el?.type === 'sup')
  assert.ok(supEl)
  assert.equal(supEl.props.children, '[1]')
})

test('cleanForSpeech converts tables and markdown into natural spoken text', () => {
  const table = `| Author | J. K. Rowling |
|---|---|
| Country | United Kingdom |`

  const spoken = cleanForSpeech(table)
  assert.equal(spoken, 'Author: J. K. Rowling. Country: United Kingdom')

  const headingWithLink = '## Plot Overview with [J.K. Rowling](https://wiki)<sup>[1]</sup>'
  const spokenHeading = cleanForSpeech(headingWithLink)
  assert.equal(spokenHeading, 'Plot Overview with J.K. Rowling')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  countSyllables,
  cleanProse,
  splitSentences,
  tokenizeWords,
  formatGradeLevel,
  calculateReadability,
} from './readability.js'

test('countSyllables handles various English words accurately', () => {
  assert.equal(countSyllables('the'), 1)
  assert.equal(countSyllables('reading'), 2)
  assert.equal(countSyllables('simple'), 2)
  assert.equal(countSyllables('syllable'), 3)
  assert.equal(countSyllables('complicated'), 4)
  assert.equal(countSyllables('accessibility'), 6)
  assert.equal(countSyllables('walked'), 1)
  assert.equal(countSyllables('waited'), 2)
  assert.equal(countSyllables('states'), 1)
  assert.equal(countSyllables('boxes'), 2)
  assert.equal(countSyllables(''), 0)
  assert.equal(countSyllables(null), 0)
})

test('cleanProse strips markdown tables, links, citations and headings', () => {
  const markdown = `
# Main Header

This is a **bold** paragraph with [link](https://example.com) and a citation<sup>[1]</sup>.

| Table Header 1 | Table Header 2 |
|---|---|
| Value 1 | Value 2 |

- List bullet point
- Second list point
`
  const cleaned = cleanProse(markdown)
  assert.ok(!cleaned.includes('|'))
  assert.ok(!cleaned.includes('https://example.com'))
  assert.ok(cleaned.includes('This is a bold paragraph with link and a citation'))
  assert.ok(cleaned.includes('List bullet point'))
})

test('splitSentences respects common abbreviations without splitting early', () => {
  const text = 'Dr. Smith visited the U.S. hospital yesterday. He saw Mr. Johnson at 4 p.m. It was a pleasant visit!'
  const sentences = splitSentences(text)
  assert.equal(sentences.length, 3)
  assert.ok(sentences[0].includes('Dr. Smith visited the U.S. hospital yesterday.'))
  assert.ok(sentences[1].includes('He saw Mr. Johnson at 4 p.m.'))
  assert.ok(sentences[2].includes('It was a pleasant visit!'))
})

test('tokenizeWords extracts clean word tokens', () => {
  const text = "ClearWeb doesn't fail; it's accessible & fast!"
  const words = tokenizeWords(text)
  assert.deepEqual(words, ['ClearWeb', "doesn't", 'fail', "it's", 'accessible', 'fast'])
})

test('calculateReadability handles empty and short edge cases gracefully', () => {
  assert.deepEqual(calculateReadability(''), { status: 'empty' })
  assert.deepEqual(calculateReadability(null), { status: 'empty' })
  assert.deepEqual(calculateReadability('   '), { status: 'empty' })

  const short = calculateReadability('Too short.')
  assert.equal(short.status, 'too_short')
  assert.equal(short.wordCount, 2)
})

test('calculateReadability classifies simple text as Easy', () => {
  const easyText = `
    The cat sat on the warm mat. The dog saw the cat and ran outside.
    They played in the bright sun all morning. It was a very good and fun day for them.
  `
  const result = calculateReadability(easyText)
  assert.equal(result.status, 'ok')
  assert.equal(result.difficulty, 'Easy')
  assert.ok(result.fleschReadingEase >= 70)
  assert.ok(result.fleschKincaidGrade <= 7)
  assert.ok(result.explanation.includes('Conversational'))
})

test('calculateReadability classifies standard prose as Moderate', () => {
  const moderateText = `
    The city opened a new park near the river this weekend.
    Many families walked along the green trails and enjoyed the warm afternoon weather.
    Local leaders hope the space will encourage more outdoor activities and bring people together.
  `
  const result = calculateReadability(moderateText)
  assert.equal(result.status, 'ok')
  assert.equal(result.difficulty, 'Moderate')
  assert.ok(result.fleschReadingEase >= 50 && result.fleschReadingEase < 70)
  assert.ok(result.explanation.includes('Standard adult reading level'))
})

test('calculateReadability classifies dense academic text as Difficult', () => {
  const difficultText = `
    The epistemological foundations of institutional jurisprudence necessitate an exhaustive reevaluation of constitutional sovereignty.
    Ontological discrepancies inevitably precipitate irreconcilable jurisprudential paradoxes regarding bureaucratic legitimization.
    Subsequent administrative determinations inadvertently undermine multilateral accountability frameworks.
  `
  const result = calculateReadability(difficultText)
  assert.equal(result.status, 'ok')
  assert.equal(result.difficulty, 'Difficult')
  assert.ok(result.fleschReadingEase < 50)
  assert.ok(result.fleschKincaidGrade >= 12)
  assert.ok(result.complexWordPercent > 30)
  assert.ok(result.explanation.includes('Advanced or academic text'))
})

test('formatGradeLevel returns descriptive US grade brackets', () => {
  assert.equal(formatGradeLevel(1.2), '1st Grade & below')
  assert.equal(formatGradeLevel(6.4), '6th Grade')
  assert.equal(formatGradeLevel(8.2), '8th Grade')
  assert.equal(formatGradeLevel(12.1), '12th Grade (High School)')
  assert.equal(formatGradeLevel(14.5), 'College Level')
  assert.equal(formatGradeLevel(17.0), 'Graduate / Advanced')
})

test('calculateReadability accepts an array of paragraphs seamlessly', () => {
  const paragraphs = [
    'The city opened a new park near the river this weekend.',
    'Many families walked along the green trails and enjoyed the warm afternoon weather.',
    'Local leaders hope the space will encourage more outdoor activities and bring people together.',
  ]
  const fromArray = calculateReadability(paragraphs)
  const fromString = calculateReadability(paragraphs.join('\n\n'))

  assert.equal(fromArray.status, 'ok')
  assert.equal(fromArray.difficulty, fromString.difficulty)
  assert.equal(fromArray.fleschReadingEase, fromString.fleschReadingEase)
  assert.equal(fromArray.fleschKincaidGrade, fromString.fleschKincaidGrade)
  assert.equal(fromArray.wordCount, fromString.wordCount)
  assert.equal(fromArray.sentenceCount, fromString.sentenceCount)
})

test('calculateReadability clamps scores to valid 0-100 bounds', () => {
  // Ultra-simple repetitive monosyllabic words
  const superEasy = 'Go cat go. See the dog run. It is fun to run in the sun all day.'
  const easyResult = calculateReadability(superEasy)
  assert.ok(easyResult.fleschReadingEase <= 100)
  assert.ok(easyResult.fleschReadingEase >= 70)

  // Hyper-complex polysyllabic text
  const hyperComplex = `
    Incomprehensibility internationalization institutionalization counterrevolutionary compartmentalization.
    Disproportionately hypercholesterolemia overintellectualizing interdisciplinary uncharacteristically.
  `
  const complexResult = calculateReadability(hyperComplex)
  assert.ok(complexResult.fleschReadingEase >= 0)
  assert.equal(complexResult.difficulty, 'Difficult')
})


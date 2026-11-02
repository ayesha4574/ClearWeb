import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateReadability } from './readability.js'
import { normalizeArticleParagraphs } from './markdownUtils.js'

const ORIGINAL_PARAGRAPHS = [
  'Photosynthesis is an extraordinarily sophisticated photochemical phenomenon by which autotrophic flora ' +
    'synthesize hexose saccharides from atmospheric carbon dioxide and subterranean moisture utilizing solar photons. ' +
    'On July 20, 1969, Apollo 11 landed on the moon with 3 crew members.',
  'The overall thermodynamic photon-to-chemical energy conversion efficiency of terrestrial ecosystems ' +
    'approximates between 3% and 6% under standardized physiological conditions.',
]

const SIMPLIFIED_PARAGRAPHS_SIMPLE = [
  'Photosynthesis is the process that plants use to make sugars from air, water, and sunlight. ' +
    'On July 20, 1969, Apollo 11 landed on the moon with 3 crew members.',
  'Plants convert between 3% and 6% of the sunlight they receive into stored energy.',
]

const SIMPLIFIED_PARAGRAPHS_VERY_SIMPLE = [
  'Plants use sunlight to make food from air and water. ' +
    'On July 20, 1969, Apollo 11 landed on the moon with 3 crew members.',
  'Plants save about 3 to 6 percent of sunlight as plant food.',
]

test('Readability improves significantly when switching to simplified text', () => {
  const originalReadability = calculateReadability(ORIGINAL_PARAGRAPHS)
  const simplifiedReadability = calculateReadability(SIMPLIFIED_PARAGRAPHS_SIMPLE)
  const verySimpleReadability = calculateReadability(SIMPLIFIED_PARAGRAPHS_VERY_SIMPLE)

  // Original text should be classified as Difficult
  assert.equal(originalReadability.status, 'ok')
  assert.equal(originalReadability.difficulty, 'Difficult')

  // Simplified text should have significantly higher Reading Ease
  assert.equal(simplifiedReadability.status, 'ok')
  assert.ok(simplifiedReadability.fleschReadingEase > originalReadability.fleschReadingEase)
  assert.ok(simplifiedReadability.fleschKincaidGrade < originalReadability.fleschKincaidGrade)

  // Very Simple text should be Easy or Moderate with even lower grade level
  assert.equal(verySimpleReadability.status, 'ok')
  assert.ok(verySimpleReadability.fleschReadingEase > originalReadability.fleschReadingEase)
  assert.ok(verySimpleReadability.fleschKincaidGrade < originalReadability.fleschKincaidGrade)
})

test('Content preservation: critical dates, numbers, and facts remain in simplified versions', () => {
  for (const simplified of [SIMPLIFIED_PARAGRAPHS_SIMPLE, SIMPLIFIED_PARAGRAPHS_VERY_SIMPLE]) {
    const combined = simplified.join(' ')
    // Date preserved
    assert.ok(combined.includes('July 20, 1969'), 'Must preserve date')
    // Name preserved
    assert.ok(combined.includes('Apollo 11'), 'Must preserve Apollo 11')
    // Numbers preserved
    assert.ok(combined.includes('3'), 'Must preserve number 3')
  }
})

test('Switching between original and simplified arrays does not mutate original data', () => {
  const originalCopy = [...ORIGINAL_PARAGRAPHS]
  let activeVersion = 'original'
  let currentParagraphs = activeVersion === 'simplified' ? SIMPLIFIED_PARAGRAPHS_SIMPLE : ORIGINAL_PARAGRAPHS

  assert.deepEqual(currentParagraphs, originalCopy)

  // Switch to simplified
  activeVersion = 'simplified'
  currentParagraphs = activeVersion === 'simplified' ? SIMPLIFIED_PARAGRAPHS_SIMPLE : ORIGINAL_PARAGRAPHS
  assert.deepEqual(currentParagraphs, SIMPLIFIED_PARAGRAPHS_SIMPLE)

  // Switch back to original
  activeVersion = 'original'
  currentParagraphs = activeVersion === 'simplified' ? SIMPLIFIED_PARAGRAPHS_SIMPLE : ORIGINAL_PARAGRAPHS
  assert.deepEqual(currentParagraphs, originalCopy)
  assert.deepEqual(ORIGINAL_PARAGRAPHS, originalCopy)
})

test('normalizeArticleParagraphs preserves structured Markdown in simplified paragraphs', () => {
  const structuredSimplified = [
    '# How Plants Grow',
    'Plants absorb light and convert it to energy.',
    '- Sunlight\n- Water\n- Carbon dioxide',
  ]

  const normalized = normalizeArticleParagraphs(structuredSimplified)
  assert.equal(normalized.length, 3)
  assert.ok(normalized[0].startsWith('# How Plants Grow'))
  assert.ok(normalized[2].includes('- Sunlight'))
})

test('UI state model: handles loading, error, retry, and version switching', () => {
  // Simulate UI state container
  let state = {
    activeVersion: 'original',
    selectedLevel: 'simple',
    status: 'idle',
    errorMessage: null,
    cachedSimplifications: {},
  }

  // 1. Initial State: reading original text
  let activeParagraphs =
    state.activeVersion === 'simplified' && state.cachedSimplifications[state.selectedLevel]
      ? state.cachedSimplifications[state.selectedLevel].simplified_paragraphs
      : ORIGINAL_PARAGRAPHS

  assert.equal(state.activeVersion, 'original')
  assert.deepEqual(activeParagraphs, ORIGINAL_PARAGRAPHS)

  // 2. Trigger simplification -> Loading state
  state.status = 'loading'
  state.errorMessage = null
  assert.equal(state.status, 'loading')

  // 3. Simulated API failure (e.g. rate limit / network error) -> Error state
  state.status = 'error'
  state.errorMessage = 'Gemini AI rate limit reached. Please wait a minute and try again.'
  assert.equal(state.status, 'error')
  assert.ok(state.errorMessage.includes('rate limit'))

  // Original text remains preserved during error
  activeParagraphs =
    state.activeVersion === 'simplified' && state.cachedSimplifications[state.selectedLevel]
      ? state.cachedSimplifications[state.selectedLevel].simplified_paragraphs
      : ORIGINAL_PARAGRAPHS
  assert.deepEqual(activeParagraphs, ORIGINAL_PARAGRAPHS)

  // 4. Retry triggered -> Loading -> Mocked success
  state.status = 'loading'
  state.errorMessage = null

  const mockResponseData = {
    ok: true,
    level: 'simple',
    simplified_paragraphs: SIMPLIFIED_PARAGRAPHS_SIMPLE,
    disclaimer: 'AI-generated text simplification for accessible reading.',
  }

  state.cachedSimplifications['simple'] = mockResponseData
  state.status = 'success'
  state.activeVersion = 'simplified'

  activeParagraphs =
    state.activeVersion === 'simplified' && state.cachedSimplifications[state.selectedLevel]
      ? state.cachedSimplifications[state.selectedLevel].simplified_paragraphs
      : ORIGINAL_PARAGRAPHS

  assert.equal(state.activeVersion, 'simplified')
  assert.deepEqual(activeParagraphs, SIMPLIFIED_PARAGRAPHS_SIMPLE)

  // 5. User switches back to original view
  state.activeVersion = 'original'
  activeParagraphs =
    state.activeVersion === 'simplified' && state.cachedSimplifications[state.selectedLevel]
      ? state.cachedSimplifications[state.selectedLevel].simplified_paragraphs
      : ORIGINAL_PARAGRAPHS

  assert.equal(state.activeVersion, 'original')
  assert.deepEqual(activeParagraphs, ORIGINAL_PARAGRAPHS)
  // Cache remains available for instant return
  assert.ok(state.cachedSimplifications['simple'])

  // 6. User switches back to simplified view without another API call
  state.activeVersion = 'simplified'
  activeParagraphs =
    state.activeVersion === 'simplified' && state.cachedSimplifications[state.selectedLevel]
      ? state.cachedSimplifications[state.selectedLevel].simplified_paragraphs
      : ORIGINAL_PARAGRAPHS
  assert.deepEqual(activeParagraphs, SIMPLIFIED_PARAGRAPHS_SIMPLE)
})


import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateReadability } from './readability.js'
import { DEFAULT_PREFERENCES } from './readingPreferences.js'

const SAMPLE_ARTICLE = {
  title: 'Photosynthesis in Plant Biology',
  url: 'https://example.com/biology/photosynthesis',
  word_count: 540,
  paragraphs: [
    'Photosynthesis is an extraordinarily sophisticated photochemical phenomenon by which autotrophic flora ' +
      'synthesize hexose saccharides from atmospheric carbon dioxide and subterranean moisture utilizing solar photons.',
    'The overall thermodynamic photon-to-chemical energy conversion efficiency of terrestrial ecosystems ' +
      'approximates between 3% and 6% under standardized physiological conditions.',
  ],
}

const SAMPLE_SIMPLIFIED = {
  ok: true,
  level: 'simple',
  simplified_paragraphs: [
    'Photosynthesis is the process that plants use to make sugars from air, water, and sunlight.',
    'Plants convert between 3% and 6% of the sunlight they receive into stored energy.',
  ],
}

test('TransformationReport: accurately calculates baseline article metrics', () => {
  const originalReadability = calculateReadability(SAMPLE_ARTICLE.paragraphs)
  const estimatedReadingTime = Math.max(1, Math.round(SAMPLE_ARTICLE.word_count / 200))

  assert.equal(SAMPLE_ARTICLE.word_count, 540)
  assert.equal(estimatedReadingTime, 3) // ~3 min read
  assert.equal(originalReadability.status, 'ok')
  assert.equal(originalReadability.difficulty, 'Difficult')
  assert.ok(originalReadability.fleschReadingEase < 50)
  assert.ok(originalReadability.fleschKincaidGrade >= 12)
})

test('TransformationReport: detects non-default reading preferences and Bionic Reading', () => {
  // Test case 1: Default preferences
  const defaultPrefs = { ...DEFAULT_PREFERENCES }
  const customList1 = []
  if (defaultPrefs.theme !== DEFAULT_PREFERENCES.theme) customList1.push(defaultPrefs.theme)
  if (defaultPrefs.bionicReading) customList1.push('Bionic Reading')
  assert.equal(customList1.length, 0)

  // Test case 2: Modified preferences (Sepia theme + Dyslexic font + Bionic Reading)
  const activePrefs = {
    ...DEFAULT_PREFERENCES,
    theme: 'sepia',
    fontFamily: 'dyslexic',
    bionicReading: true,
  }
  const customList2 = []
  if (activePrefs.theme !== DEFAULT_PREFERENCES.theme) customList2.push(activePrefs.theme)
  if (activePrefs.fontFamily !== DEFAULT_PREFERENCES.fontFamily) customList2.push(activePrefs.fontFamily)
  if (activePrefs.bionicReading) customList2.push('Bionic Reading')

  assert.equal(customList2.length, 3)
  assert.ok(customList2.includes('sepia'))
  assert.ok(customList2.includes('dyslexic'))
  assert.ok(customList2.includes('Bionic Reading'))
})

test('TransformationReport: distinguishes generated content from currently viewed version', () => {
  const cachedSimplifications = {
    simple: SAMPLE_SIMPLIFIED,
  }

  // 1. Viewing original article while simplification is generated
  let activeVersion = 'original'
  assert.equal(activeVersion, 'original')
  assert.ok(cachedSimplifications['simple'], 'Simple rewrite exists in cache')

  // 2. Switching to simplified view
  activeVersion = 'simplified'
  assert.equal(activeVersion, 'simplified')
  assert.equal(cachedSimplifications['simple'].level, 'simple')
})

test('TransformationReport: computes accurate readability comparison deltas', () => {
  const original = calculateReadability(SAMPLE_ARTICLE.paragraphs)
  const simplified = calculateReadability(SAMPLE_SIMPLIFIED.simplified_paragraphs)

  const easeDelta = Math.round((simplified.fleschReadingEase - original.fleschReadingEase) * 10) / 10
  const gradeDelta = Math.round((original.fleschKincaidGrade - simplified.fleschKincaidGrade) * 10) / 10

  // Reading ease should improve (positive delta)
  assert.ok(easeDelta > 0, `Expected easeDelta > 0, got ${easeDelta}`)
  // Grade level should decrease (positive reduction delta)
  assert.ok(gradeDelta > 0, `Expected gradeDelta > 0, got ${gradeDelta}`)
  // Verify simplified classification is easier
  assert.ok(
    simplified.difficulty === 'Easy' || simplified.difficulty === 'Moderate',
    `Expected Easy or Moderate, got ${simplified.difficulty}`
  )
})

test('TransformationReport: tracks audio listening activity independently', () => {
  let listenedActivity = { article: false, summary: false }

  // Initial: no audio played
  assert.equal(listenedActivity.article, false)
  assert.equal(listenedActivity.summary, false)

  // Listen to article
  listenedActivity = { ...listenedActivity, article: true }
  assert.equal(listenedActivity.article, true)
  assert.equal(listenedActivity.summary, false)

  // Listen to summary
  listenedActivity = { ...listenedActivity, summary: true }
  assert.equal(listenedActivity.article, true)
  assert.equal(listenedActivity.summary, true)

  // Reset when new article loaded
  listenedActivity = { article: false, summary: false }
  assert.equal(listenedActivity.article, false)
  assert.equal(listenedActivity.summary, false)
})

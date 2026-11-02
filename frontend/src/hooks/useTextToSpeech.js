import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Cleans markdown tables, headings, links, and citations so they are spoken naturally.
 */
export function cleanForSpeech(text) {
  if (!text || typeof text !== 'string') return ''

  // Is it a markdown table?
  if (text.includes('|') && text.includes('\n')) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const speechLines = []
    for (const line of lines) {
      if (/^\|(\s*:?-+:?\s*\|)+$/.test(line)) continue
      const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).filter(Boolean)
      if (cells.length === 1) {
        speechLines.push(cells[0])
      } else if (cells.length >= 2) {
        speechLines.push(`${cells[0]}: ${cells.slice(1).join(', ')}`)
      }
    }
    return speechLines.join('. ')
  }

  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/<sup>.*?<\/sup>/gi, '')
    .replace(/\[\d+\]/g, '')
    .replace(/[*_]{1,3}/g, '')
    .trim()
}

/**
 * Custom React hook for controlling native Web Speech API synthesis.
 * Features:
 * - Paragraph-by-paragraph speech sequencing (avoids the Chrome 15-second utterance timeout bug).
 * - Reliable current paragraph tracking for visual highlighting.
 * - Unified playback session supporting both article paragraphs and AI summary/takeaways.
 * - Play, Pause, Resume, and Stop controls.
 * - Dynamic playback rate (0.75x to 2.0x).
 * - Voice selection with asynchronous 'voiceschanged' event handling.
 * - Clean teardown on unmount or article change (no overlapping speech).
 */
export function useTextToSpeech(paragraphs = []) {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  const [playbackState, setPlaybackState] = useState('stopped') // 'stopped' | 'playing' | 'paused'
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1)
  const [source, setSource] = useState('article') // 'article' | 'summary'
  const [customList, setCustomList] = useState([])
  const [rate, setRate] = useState(1.0)
  const [voices, setVoices] = useState([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')
  const [hasListenedArticle, setHasListenedArticle] = useState(false)
  const [hasListenedSummary, setHasListenedSummary] = useState(false)

  // Ref to hold state values for speech event listeners without stale closures
  const stateRef = useRef({
    paragraphs,
    customList,
    source,
    rate,
    selectedVoiceURI,
    playbackState,
    currentParagraphIndex,
  })

  // Synchronize ref inside an effect to adhere to React 19 rules
  useEffect(() => {
    stateRef.current = {
      paragraphs,
      customList,
      source,
      rate,
      selectedVoiceURI,
      playbackState,
      currentParagraphIndex,
    }
  })

  // Stop speech when component unmounts or paragraphs change
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [paragraphs])

  // Load available voices on mount and listen to voiceschanged event
  useEffect(() => {
    if (!isSupported) return

    function updateVoices() {
      const available = window.speechSynthesis.getVoices()
      if (available && available.length > 0) {
        setVoices(available)
        setSelectedVoiceURI((prev) => {
          if (prev) return prev
          const defaultVoice =
            available.find((v) => v.lang.startsWith('en') && v.default) ||
            available.find((v) => v.lang.startsWith('en')) ||
            available[0]
          return defaultVoice ? defaultVoice.voiceURI : ''
        })
      }
    }

    updateVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
      }
    }
  }, [isSupported])

  // Speech execution ref to prevent recursion warnings
  const speakParagraphRef = useRef(null)

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setPlaybackState('stopped')
    setCurrentParagraphIndex(-1)
  }, [])

  // Setup the paragraph speaker
  useEffect(() => {
    speakParagraphRef.current = (index) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      const isCustom = stateRef.current.source !== 'article'
      const list = isCustom ? stateRef.current.customList : stateRef.current.paragraphs
      if (!list || index < 0 || index >= list.length) {
        stop()
        return
      }

      window.speechSynthesis.cancel()

      const text = cleanForSpeech(list[index])
      if (!text) {
        if (index + 1 < list.length) {
          speakParagraphRef.current?.(index + 1)
        } else {
          stop()
        }
        return
      }

      const utterance = new window.SpeechSynthesisUtterance(text)
      utterance.rate = stateRef.current.rate

      const currentVoiceURI = stateRef.current.selectedVoiceURI
      if (currentVoiceURI) {
        const available = window.speechSynthesis.getVoices()
        const voiceObj = available.find((v) => v.voiceURI === currentVoiceURI)
        if (voiceObj) utterance.voice = voiceObj
      }

      setPlaybackState('playing')
      setCurrentParagraphIndex(index)

      utterance.onstart = () => {
        setPlaybackState('playing')
        setCurrentParagraphIndex(index)
      }

      utterance.onend = () => {
        if (stateRef.current.playbackState === 'playing') {
          const activeList =
            stateRef.current.source !== 'article'
              ? stateRef.current.customList
              : stateRef.current.paragraphs
          if (index + 1 < activeList.length) {
            speakParagraphRef.current?.(index + 1)
          } else {
            stop()
          }
        }
      }

      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') return
        stop()
      }

      window.speechSynthesis.speak(utterance)
    }
  }, [stop])

  const play = useCallback(
    (startIndex = 0) => {
      if (!isSupported || !stateRef.current.paragraphs?.length) return
      setHasListenedArticle(true)
      setSource('article')
      stateRef.current.source = 'article'

      if (stateRef.current.playbackState === 'paused' && stateRef.current.source === 'article') {
        window.speechSynthesis.resume()
        setPlaybackState('playing')
        return
      }

      setPlaybackState('playing')
      const targetIndex = startIndex >= 0 ? startIndex : 0
      speakParagraphRef.current?.(targetIndex)
    },
    [isSupported]
  )

  const playCustom = useCallback(
    (items = [], startIndex = 0, sourceId = 'summary') => {
      if (!isSupported || !items?.length) return
      window.speechSynthesis.cancel()
      setHasListenedSummary(true)
      setCustomList(items)
      stateRef.current.customList = items
      setSource(sourceId)
      stateRef.current.source = sourceId

      setPlaybackState('playing')
      const targetIndex = startIndex >= 0 && startIndex < items.length ? startIndex : 0
      speakParagraphRef.current?.(targetIndex)
    },
    [isSupported]
  )

  const pause = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.pause()
    setPlaybackState('paused')
  }, [isSupported])

  const resume = useCallback(() => {
    if (!isSupported) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setPlaybackState('playing')
    } else {
      const target =
        stateRef.current.currentParagraphIndex >= 0
          ? stateRef.current.currentParagraphIndex
          : 0
      speakParagraphRef.current?.(target)
    }
  }, [isSupported])

  const changeRate = useCallback((newRate) => {
    setRate(newRate)
  }, [])

  const changeVoice = useCallback((voiceURI) => {
    setSelectedVoiceURI(voiceURI)
  }, [])

  return {
    isSupported,
    playbackState,
    currentParagraphIndex,
    source,
    activeItemsCount: source === 'article' ? paragraphs.length : customList.length,
    rate,
    voices,
    selectedVoiceURI,
    hasListenedArticle,
    hasListenedSummary,
    play,
    playCustom,
    pause,
    resume,
    stop,
    changeRate,
    changeVoice,
  }
}

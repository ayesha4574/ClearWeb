import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Custom React hook for controlling native Web Speech API synthesis.
 * Features:
 * - Paragraph-by-paragraph speech sequencing (avoids the Chrome 15-second utterance timeout bug).
 * - Reliable current paragraph tracking for visual highlighting.
 * - Play, Pause, Resume, and Stop controls.
 * - Dynamic playback rate (0.75x to 2.0x).
 * - Voice selection with asynchronous 'voiceschanged' event handling.
 * - Clean teardown on unmount or article change (no overlapping speech).
 */
export function useTextToSpeech(paragraphs = []) {
  // 1. Initial support check derived directly
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  const [playbackState, setPlaybackState] = useState('stopped') // 'stopped' | 'playing' | 'paused'
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1)
  const [rate, setRate] = useState(1.0)
  const [voices, setVoices] = useState([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')

  // 2. Ref to hold state values for speech event listeners without stale closures
  const stateRef = useRef({
    paragraphs,
    rate,
    selectedVoiceURI,
    playbackState,
    currentParagraphIndex,
  })

  // Synchronize ref inside an effect to adhere to React 19 rules
  useEffect(() => {
    stateRef.current = {
      paragraphs,
      rate,
      selectedVoiceURI,
      playbackState,
      currentParagraphIndex,
    }
  })

  // 3. Stop speech when component unmounts or paragraphs change
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [paragraphs])

  // 4. Load available voices on mount and listen to voiceschanged event
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

  // 5. Speech execution ref to prevent recursion warnings
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
      const list = stateRef.current.paragraphs
      if (!list || index < 0 || index >= list.length) {
        stop()
        return
      }

      window.speechSynthesis.cancel()

      const text = list[index]?.trim()
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
          if (index + 1 < stateRef.current.paragraphs.length) {
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

      if (stateRef.current.playbackState === 'paused') {
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
    const clamped = Math.max(0.75, Math.min(2.0, Number(newRate)))
    setRate(clamped)
    stateRef.current.rate = clamped
    if (stateRef.current.playbackState === 'playing' && stateRef.current.currentParagraphIndex >= 0) {
      speakParagraphRef.current?.(stateRef.current.currentParagraphIndex)
    }
  }, [])

  const changeVoice = useCallback((voiceURI) => {
    setSelectedVoiceURI(voiceURI)
    stateRef.current.selectedVoiceURI = voiceURI
    if (stateRef.current.playbackState === 'playing' && stateRef.current.currentParagraphIndex >= 0) {
      speakParagraphRef.current?.(stateRef.current.currentParagraphIndex)
    }
  }, [])

  return {
    isSupported,
    playbackState, // 'stopped' | 'playing' | 'paused'
    currentParagraphIndex,
    rate,
    voices,
    selectedVoiceURI,
    play,
    pause,
    resume,
    stop,
    changeRate,
    changeVoice,
  }
}

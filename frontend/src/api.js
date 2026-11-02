// This is the ONLY file that talks to our backend.
// Every other file asks this file to do it. That keeps things tidy and safe.

// In production (e.g. Vercel), read backend URL from Vite environment variable.
// In local development, fall back to http://localhost:8000.
const BACKEND_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  'http://localhost:8000'
).replace(/\/+$/, '')

// Asks the backend: "are you alive?"
// Always returns an object like { ok: true } or { ok: false, message: "..." }
// so the page never has to deal with confusing errors.
export async function checkBackend() {
  // Give up after 5 seconds instead of waiting forever.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      signal: controller.signal,
    })

    if (!response.ok) {
      return {
        ok: false,
        message: `The backend answered, but with an error (code ${response.status}).`,
      }
    }

    const data = await response.json()
    if (data.status !== 'ok') {
      return { ok: false, message: 'The backend gave an answer we did not expect.' }
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      message:
        'Could not reach the backend. Is it running? Start it in a Terminal window, then press "Check again".',
    }
  } finally {
    clearTimeout(timer)
  }
}

// Sends a webpage address to the backend and returns the extracted article.
// Always returns { ok: true, data: { ... } } or { ok: false, message: "..." }.
export async function extractArticle(url) {
  // Give up after 25 seconds (the backend gives up after 20 seconds).
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url.trim() }),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      let message = 'The backend could not process that webpage.'
      if (data && data.detail) {
        if (typeof data.detail.message === 'string') {
          message = data.detail.message
        } else if (typeof data.detail === 'string') {
          message = data.detail
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          message = data.detail[0].msg
        }
      }
      return { ok: false, message }
    }

    if (!data || !data.ok) {
      return { ok: false, message: 'Received an unexpected response from the reader server.' }
    }

    return { ok: true, data }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        message: 'The website took too long to answer. Try another webpage or try again later.',
      }
    }
    return {
      ok: false,
      message:
        'Could not reach the ClearWeb backend. Please make sure the backend is running on http://localhost:8000.',
    }
  } finally {
    clearTimeout(timer)
  }
}

// Stage 8: Request an AI summary and key takeaways from Gemini through backend.
export async function summarizeArticle(paragraphs, title = '', length = 'medium') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 35000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paragraphs,
        title: title || undefined,
        length,
      }),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      let code = 'error'
      let message = 'Failed to generate AI summary.'

      if (data && data.detail) {
        if (typeof data.detail === 'object') {
          code = data.detail.code || 'error'
          message = data.detail.message || message
        } else if (typeof data.detail === 'string') {
          message = data.detail
        }
      }

      return { ok: false, code, message }
    }

    if (!data || !data.ok) {
      return { ok: false, code: 'invalid', message: 'Received an invalid summary response.' }
    }

    return { ok: true, data }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        code: 'timeout',
        message: 'The AI summarization request timed out. Please try again.',
      }
    }
    return {
      ok: false,
      code: 'network',
      message: 'Could not connect to the ClearWeb backend to generate summary.',
    }
  } finally {
    clearTimeout(timer)
  }
}

// Stage 11: Request AI text simplification from Gemini through backend.
// Rewrites paragraphs into simpler language while preserving facts, dates, and numbers.
export async function simplifyArticle(paragraphs, title = '', level = 'simple') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/simplify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paragraphs,
        title: title || undefined,
        level,
      }),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      let code = 'error'
      let message = 'Failed to simplify article text.'

      if (data && data.detail) {
        if (typeof data.detail === 'object') {
          code = data.detail.code || 'error'
          message = data.detail.message || message
        } else if (typeof data.detail === 'string') {
          message = data.detail
        }
      }

      return { ok: false, code, message }
    }

    if (!data || !data.ok) {
      return { ok: false, code: 'invalid', message: 'Received an invalid simplification response.' }
    }

    return { ok: true, data }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        code: 'timeout',
        message: 'The AI simplification request timed out. Please try again.',
      }
    }
    return {
      ok: false,
      code: 'network',
      message: 'Could not connect to the ClearWeb backend to simplify article.',
    }
  } finally {
    clearTimeout(timer)
  }
}

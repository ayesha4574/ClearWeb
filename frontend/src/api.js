// This is the ONLY file that talks to our backend.
// Every other file asks this file to do it. That keeps things tidy and safe.

const BACKEND_URL = 'http://localhost:8000'

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

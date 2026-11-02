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

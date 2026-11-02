import { useEffect, useState } from 'react'
import { checkBackend } from './api.js'

function App() {
  // status can be: 'checking', 'connected' or 'failed'
  const [status, setStatus] = useState('checking')
  const [errorMessage, setErrorMessage] = useState('')

  // Shows the answer from the backend on the page.
  function showResult(result) {
    if (result.ok) {
      setStatus('connected')
      setErrorMessage('')
    } else {
      setStatus('failed')
      setErrorMessage(result.message)
    }
  }

  // Used by the "Check again" button.
  async function runCheck() {
    setStatus('checking')
    setErrorMessage('')
    showResult(await checkBackend())
  }

  // Run the check once, when the page first opens.
  useEffect(() => {
    let pageWasClosed = false
    checkBackend().then((result) => {
      if (!pageWasClosed) showResult(result)
    })
    return () => {
      pageWasClosed = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-3">ClearWeb</h1>
        <p className="text-lg text-slate-700 mb-8">
          Turn cluttered webpages into clean, easy-to-read pages.
        </p>

        {/* role="status" tells screen readers to announce changes here */}
        <div
          role="status"
          className="rounded-lg border-2 border-slate-300 p-5 mb-6 text-lg"
        >
          {status === 'checking' && <p>Checking the backend...</p>}
          {status === 'connected' && (
            <p className="font-semibold text-green-800">✔ Backend connected</p>
          )}
          {status === 'failed' && (
            <p className="font-semibold text-red-800">✖ {errorMessage}</p>
          )}
        </div>

        <button
          type="button"
          onClick={runCheck}
          disabled={status === 'checking'}
          className="rounded-lg bg-blue-800 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-900 focus:outline-4 focus:outline-offset-2 focus:outline-blue-500 disabled:opacity-60"
        >
          Check again
        </button>
      </div>
    </main>
  )
}

export default App

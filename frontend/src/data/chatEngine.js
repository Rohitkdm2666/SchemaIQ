// chatEngine.js — Real backend connector
// Replaces the hardcoded mock engine with actual API calls

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Send a question to the backend.
 * Returns a structured response object that QueryBotPage renders.
 */
export async function generateResponse(question) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        type: 'error',
        text: err.detail || `Server error (${res.status}). Is the backend running?`,
      }
    }

    const data = await res.json()

    // DB or API key not configured
    if (data.error && !data.chart_data && !data.rows?.length) {
      return { type: 'error', text: data.text, sql: data.sql, error: data.error }
    }

    // Determine response type from chart_type
    const type = data.chart_type === 'number'  ? 'number'
               : data.chart_type === 'bar'     ? 'bar'
               : data.chart_type === 'line'    ? 'line'
               : data.rows?.length > 1         ? 'table'
               : data.rows?.length === 1       ? 'number'
               : 'text'

    return {
      type,
      text:       data.text,
      insight:    data.insight,
      sql:        data.sql,
      chart_type: data.chart_type,
      chart_data: data.chart_data,
      columns:    data.columns,
      rows:       data.rows,
      row_count:  data.row_count,
    }

  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        type: 'error',
        text: '**Backend not reachable.** Make sure the Python server is running:\n`cd schemaiq-backend && uvicorn main:app --reload`',
      }
    }
    return { type: 'error', text: `Unexpected error: ${err.message}` }
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return await res.json()
  } catch {
    return { db: false, anthropic_api: false, ready: false }
  }
}
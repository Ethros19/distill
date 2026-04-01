'use client'

import { useState, useEffect } from 'react'

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic Claude', keyField: 'api_key_anthropic', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI', keyField: 'api_key_openai', placeholder: 'sk-...' },
  { value: 'ollama', label: 'Ollama', keyField: 'ollama_base_url', placeholder: 'http://localhost:11434' },
] as const

export function ApiKeyForm({ envProvider }: { envProvider: string }) {
  const [provider, setProvider] = useState(envProvider)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [keysSet, setKeysSet] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/api-keys')
      .then((r) => r.json())
      .then((data) => {
        if (data.llm_provider) setProvider(data.llm_provider)
        const keyState: Record<string, string> = {}
        const setState: Record<string, boolean> = {}
        for (const p of PROVIDERS) {
          if (data[`${p.keyField}_set`]) {
            setState[p.keyField] = true
          }
        }
        setKeys(keyState)
        setKeysSet(setState)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const body: Record<string, string> = { llm_provider: provider }
    const active = PROVIDERS.find((p) => p.value === provider)
    if (active && keys[active.keyField]) {
      body[active.keyField] = keys[active.keyField]
    }

    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
      } else {
        setSaved(true)
        if (active && keys[active.keyField]) {
          setKeysSet((prev) => ({ ...prev, [active.keyField]: true }))
          setKeys((prev) => ({ ...prev, [active.keyField]: '' }))
        }
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const activeProvider = PROVIDERS.find((p) => p.value === provider)

  if (loading) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-panel-alt" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h4 className="text-sm font-medium text-ink">AI Provider Configuration</h4>
      <p className="mt-1 text-xs text-muted">
        Set your preferred AI provider and API key. Overrides environment variables when set.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dim">Provider</label>
          <div className="flex gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  provider === p.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-edge-dim text-dim hover:border-edge hover:text-ink'
                }`}
              >
                {p.label}
                {keysSet[p.keyField] && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sig-low" />
                )}
              </button>
            ))}
          </div>
        </div>

        {activeProvider && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-dim">
              {activeProvider.value === 'ollama' ? 'Base URL' : 'API Key'}
              {keysSet[activeProvider.keyField] && (
                <span className="ml-2 text-sig-low">configured</span>
              )}
            </label>
            <input
              type={activeProvider.value === 'ollama' ? 'text' : 'password'}
              value={keys[activeProvider.keyField] || ''}
              onChange={(e) =>
                setKeys((prev) => ({
                  ...prev,
                  [activeProvider.keyField]: e.target.value,
                }))
              }
              placeholder={
                keysSet[activeProvider.keyField]
                  ? 'Enter new key to replace existing'
                  : activeProvider.placeholder
              }
              className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {!keysSet[activeProvider.keyField] && activeProvider.value !== 'ollama' && (
              <p className="mt-1.5 text-[11px] text-muted">
                {activeProvider.value === 'anthropic'
                  ? 'Get from console.anthropic.com'
                  : 'Get from platform.openai.com/api-keys'}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && (
            <span className="text-xs text-sig-low">Saved</span>
          )}
          {error && (
            <span className="text-xs text-sig-high">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}

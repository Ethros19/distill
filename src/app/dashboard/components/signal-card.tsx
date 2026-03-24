import type { Signal } from '@/lib/schema'

export function strengthColor(strength: number): string {
  if (strength >= 5) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  if (strength >= 3) return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {signal.statement}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${strengthColor(signal.strength)}`}
        >
          {signal.strength}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {signal.reasoning}
      </p>

      <p className="mt-2 text-xs text-gray-400">
        {signal.evidence.length} supporting input{signal.evidence.length !== 1 ? 's' : ''}
      </p>

      {signal.suggestedAction && (
        <div className="mt-3 rounded border-l-4 border-blue-500 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <strong>Action:</strong> {signal.suggestedAction}
        </div>
      )}

      {signal.themes && signal.themes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {signal.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {theme}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

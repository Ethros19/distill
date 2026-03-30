'use client'

import { useState } from 'react'

const SIZES = ['text-xs', 'text-sm', 'text-base'] as const
const SIZE_LABELS = ['S', 'M', 'L'] as const

export function NarrativeContent({ html }: { html: string }) {
  const [sizeIdx, setSizeIdx] = useState(1) // default: text-sm

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="flex items-center gap-0.5 rounded-lg border border-edge-dim p-0.5">
          {SIZE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setSizeIdx(i)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                sizeIdx === i
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-ink'
              }`}
              title={`Text size: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`prose max-w-none text-dim prose-headings:text-ink prose-strong:text-ink prose-blockquote:border-l-accent prose-blockquote:text-dim prose-code:rounded prose-code:bg-panel-alt prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:text-accent prose-a:text-accent prose-p:my-2 prose-li:my-0.5 ${SIZES[sizeIdx]} leading-relaxed`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

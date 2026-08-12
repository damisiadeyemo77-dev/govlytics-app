'use client'

import { useFormStatus } from 'react-dom'

export default function GenerateReportButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? 'Generating...' : 'Generate Report'}
    </button>
  )
}
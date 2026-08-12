'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-accent px-3 py-2 text-white hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? 'Adding...' : 'Add Contract'}
    </button>
  )
}

export default function AddContractForm({
  action,
}: {
  action: (formData: FormData) => void
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full max-w-md rounded border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-background"
      >
        + Add Contract
      </button>
    )
  }

  return (
    <form action={action} className="w-full max-w-md space-y-3">
      <input
        type="url"
        name="url"
        placeholder="https://sam.gov/workspace/contract/opp/.../view"
        required
        autoFocus
        className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
      />
      <div className="flex gap-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
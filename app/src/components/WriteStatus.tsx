// What a write from a button is doing, said the same way everywhere:
// "Saving…" beside the button while it runs, and why it failed under it.
//
// The status is always on the page, empty while nothing is saving, so a
// screen reader hears its words change: a status added together with its
// words is often not read. An error is an alert, read as it appears.

/** "Saving…" while `busy`, in a status that is always there. */
export function Saving({ busy, text = 'Saving…' }: { busy: boolean; text?: string }) {
  return (
    <span className="busy" role="status">
      {busy ? text : ''}
    </span>
  )
}

/** Why a write failed, or nothing. `id` lets a field point at it with aria-describedby. */
export function ErrorNotice({ error, id }: { error: string | null; id?: string }) {
  if (error === null) return null
  return (
    <p className="notice notice-error" role="alert" id={id}>
      {error}
    </p>
  )
}

// What a write from a button is doing, said the same way everywhere:
// "Saving…" beside the button while it runs, and why it failed under it.
// Where nothing else on screen says the write landed (the button just
// changes its name), the status says so once it has (`done`).
//
// The status is always on the page, empty while nothing is saving, so a
// screen reader hears its words change: a status added together with its
// words is often not read. An error is an alert, read as it appears.

/** "Saving…" while `busy`, in a status that is always there, and what was done once it is (`done`). */
export function Saving({ busy, text = 'Saving…', done = '' }: { busy: boolean; text?: string; done?: string }) {
  return (
    <span className="busy" role="status">
      {busy ? text : done}
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

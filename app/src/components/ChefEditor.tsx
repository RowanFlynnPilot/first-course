// Name, skin tone and hair color: everything a cook decides about their chef.
// Used to create the chef and, later, to change them.

import { useState, type FormEvent } from 'react'
import { CHEF_NAME_MAX, type Chef } from '../lib/chefs'
import type { RankIndex } from '../lib/leveling'
import { ChefSprite } from './ChefSprite'
import { HAIR_COLORS, LOOK_INDEXES, SKIN_TONES, type LookIndex } from './chefSprites'

function Swatches({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: readonly { readonly name: string; readonly color: string }[]
  value: LookIndex
  onChange: (value: LookIndex) => void
}) {
  return (
    <fieldset className="swatches">
      <legend>{legend}</legend>
      {LOOK_INDEXES.map((index) => {
        const option = options[index]
        if (option === undefined) throw new Error(`${legend} has no option ${index}`)
        return (
          <label key={index} className={value === index ? 'swatch swatch-chosen' : 'swatch'}>
            <input type="radio" name={name} checked={value === index} onChange={() => onChange(index)} />
            <span className="swatch-chip" style={{ background: option.color }} />
            <span className="visually-hidden">{option.name}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

export function ChefEditor({
  initial,
  rank,
  submitLabel,
  onSubmit,
}: {
  initial: Chef
  rank: RankIndex
  submitLabel: string
  onSubmit: (chef: Chef) => Promise<void>
}) {
  const [name, setName] = useState(initial.name)
  const [skin, setSkin] = useState(initial.skin)
  const [hair, setHair] = useState(initial.hair)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ name: trimmed, skin, hair })
    } catch (cause) {
      setBusy(false)
      setError((cause as Error).message)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="editor-preview">
        <ChefSprite rank={rank} skin={skin} hair={hair} scale={6} />
      </div>
      <label className="field">
        Chef’s name
        <input
          type="text"
          autoComplete="off"
          required
          maxLength={CHEF_NAME_MAX}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <Swatches
        legend="Skin"
        name="skin"
        options={SKIN_TONES.map((tone) => ({ name: tone.name, color: tone.base }))}
        value={skin}
        onChange={setSkin}
      />
      <Swatches legend="Hair" name="hair" options={HAIR_COLORS} value={hair} onChange={setHair} />
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={busy || trimmed === ''}>
        {submitLabel}
      </button>
    </form>
  )
}

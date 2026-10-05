// Name, look and extras: everything a cook decides about their chef. Used to
// create the chef and, later, to change them. Rank decides the hat and the
// outfit; extras are worn over it once they are earned.

import { useState, type FormEvent } from 'react'
import { CHEF_NAME_MAX, type Chef } from '../lib/chefs'
import { extraById, EXTRAS, SLOTS, type ExtraId, type ExtraSlot } from '../lib/extras'
import type { RankIndex } from '../lib/leveling'
import { ChefSprite } from './ChefSprite'
import { FACIAL_HAIR, GLASSES, HAIR_COLORS, HAIR_STYLES, isIndexOf, SKIN_TONES, type Look } from './chefSprites'

/** A row of options that are colors. */
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
  value: number
  onChange: (index: number) => void
}) {
  return (
    <fieldset className="swatches">
      <legend>{legend}</legend>
      {options.map((option, index) => (
        <label key={option.name} className={value === index ? 'swatch swatch-chosen' : 'swatch'}>
          <input type="radio" name={name} checked={value === index} onChange={() => onChange(index)} />
          <span className="swatch-chip" style={{ background: option.color }} />
          <span className="visually-hidden">{option.name}</span>
        </label>
      ))}
    </fieldset>
  )
}

/** A row of options that are words. A locked option shows but cannot be chosen. */
function Choices({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: readonly { readonly name: string; readonly locked?: boolean }[]
  value: number
  onChange: (index: number) => void
}) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      {options.map((option, index) => {
        const className = ['choice', value === index && 'choice-chosen', option.locked === true && 'choice-locked']
          .filter(Boolean)
          .join(' ')
        return (
          <label key={option.name} className={className}>
            <input
              type="radio"
              name={name}
              checked={value === index}
              disabled={option.locked === true}
              onChange={() => onChange(index)}
            />
            {option.name}
            {option.locked === true && <span className="visually-hidden"> (locked)</span>}
          </label>
        )
      })}
    </fieldset>
  )
}

/** Picks one option of a fixed list by index, failing loudly on anything else. */
function pick<T extends readonly unknown[]>(options: T, index: number) {
  if (!isIndexOf(options, index)) throw new Error(`No option ${index}`)
  return index
}

export function ChefEditor({
  initial,
  rank,
  unlocked,
  submitLabel,
  onSubmit,
}: {
  initial: Chef
  rank: RankIndex
  /**
   * The extras this cook has earned so far. null for a new chef, who has cooked
   * nothing yet: the extras become one line saying how they are earned.
   */
  unlocked: ReadonlySet<ExtraId> | null
  submitLabel: string
  onSubmit: (chef: Chef) => Promise<void>
}) {
  const [name, setName] = useState(initial.name)
  const [look, setLook] = useState<Look>({
    skin: initial.skin,
    hair: initial.hair,
    hairStyle: initial.hairStyle,
    facialHair: initial.facialHair,
    glasses: initial.glasses,
  })
  // Chosen extras the cook no longer has earned stay chosen, unworn, until they change them.
  const [extras, setExtras] = useState<readonly ExtraId[]>(initial.extras)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ ...look, name: trimmed, extras })
    } catch (cause) {
      setBusy(false)
      setError((cause as Error).message)
    }
  }

  function wear(slot: ExtraSlot, id: ExtraId | null) {
    setExtras((current) => [...current.filter((other) => extraById(other).slot !== slot), ...(id === null ? [] : [id])])
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="editor-preview">
        <ChefSprite rank={rank} look={look} extras={extras.filter((id) => unlocked?.has(id) === true)} scale={6} />
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
        value={look.skin}
        onChange={(index) => setLook({ ...look, skin: pick(SKIN_TONES, index) })}
      />
      <Swatches
        legend="Hair color"
        name="hair"
        options={HAIR_COLORS}
        value={look.hair}
        onChange={(index) => setLook({ ...look, hair: pick(HAIR_COLORS, index) })}
      />
      <Choices
        legend="Hairstyle"
        name="hair-style"
        options={HAIR_STYLES}
        value={look.hairStyle}
        onChange={(index) => setLook({ ...look, hairStyle: pick(HAIR_STYLES, index) })}
      />
      <Choices
        legend="Facial hair"
        name="facial-hair"
        options={FACIAL_HAIR}
        value={look.facialHair}
        onChange={(index) => setLook({ ...look, facialHair: pick(FACIAL_HAIR, index) })}
      />
      <Choices
        legend="Glasses"
        name="glasses"
        options={GLASSES}
        value={look.glasses}
        onChange={(index) => setLook({ ...look, glasses: pick(GLASSES, index) })}
      />

      {unlocked === null ? (
        <p className="section-note">
          Extras, like clogs or a tool in hand, are earned by cooking. Put them on later from the chef sheet.
        </p>
      ) : (
        <Extras unlocked={unlocked} extras={extras} wear={wear} />
      )}

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

/** Each slot's extras: the earned ones to choose from, the locked ones with how to earn them. */
function Extras({
  unlocked,
  extras,
  wear,
}: {
  unlocked: ReadonlySet<ExtraId>
  extras: readonly ExtraId[]
  wear: (slot: ExtraSlot, id: ExtraId | null) => void
}) {
  return (
    <div className="extras">
      <h2 className="section-title">Extras</h2>
      <p className="section-note">
        Rank decides the hat and the jacket. Extras go over them, and you earn them by cooking one kind of dish.
      </p>
      {SLOTS.map((slot) => {
        const options = EXTRAS.filter((extra) => extra.slot === slot.id)
        const chosen = extras.find((id) => extraById(id).slot === slot.id) ?? null
        const locked = options.filter((extra) => !unlocked.has(extra.id))
        return (
          <div key={slot.id}>
            <Choices
              legend={slot.name}
              name={`extra-${slot.id}`}
              options={[{ name: 'None' }, ...options.map((extra) => ({ name: extra.name, locked: !unlocked.has(extra.id) }))]}
              value={chosen === null ? 0 : options.findIndex((extra) => extra.id === chosen) + 1}
              onChange={(index) => wear(slot.id, index === 0 ? null : (options[index - 1]?.id ?? null))}
            />
            {locked.length > 0 && (
              <ul className="extras-locked">
                {locked.map((extra) => (
                  <li key={extra.id}>
                    {extra.name}: {extra.how}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

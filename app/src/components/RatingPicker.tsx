// Rough, Decent or Nailed it. Used to log a cook and to change one.

import { RATINGS, type Rating } from '../lib/progress'

export function RatingPicker({
  value,
  onChange,
  describedBy,
}: {
  value: Rating | null
  onChange: (rating: Rating) => void
  /** The id of what the rating decides, read with the choices. */
  describedBy?: string
}) {
  return (
    <fieldset className="ratings" aria-describedby={describedBy}>
      <legend className="visually-hidden">Rate this cook</legend>
      {RATINGS.map((option) => (
        <label key={option.value} className={value === option.value ? 'rating rating-chosen' : 'rating'}>
          <input
            type="radio"
            name="rating"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="row-title">{option.label}</span>
          <span className="row-note">{option.hint}</span>
        </label>
      ))}
    </fieldset>
  )
}

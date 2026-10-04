import { INGREDIENTS } from '../curriculum/ingredients'
import type { RecipeIngredient } from '../curriculum/types'
import { formatAmount } from '../lib/format'

export function IngredientList({ ingredients }: { ingredients: readonly RecipeIngredient[] }) {
  return (
    <ul className="ingredients">
      {ingredients.map(({ ingredientId, qty, prep }) => {
        const ingredient = INGREDIENTS[ingredientId]
        return (
          <li key={ingredientId}>
            <span className="amount">{formatAmount(qty, ingredient.unit)}</span>
            <span>
              {ingredient.name}
              {prep !== null && <span className="row-note">{prep}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

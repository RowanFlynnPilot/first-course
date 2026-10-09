import { INGREDIENTS, type Ingredient } from '../curriculum/ingredients'
import type { RecipeIngredient } from '../curriculum/types'
import { formatAmount } from '../lib/format'

export function IngredientList({ ingredients }: { ingredients: readonly RecipeIngredient[] }) {
  return (
    <ul className="ingredients">
      {ingredients.map(({ ingredientId, qty, prep }) => {
        const ingredient: Ingredient = INGREDIENTS[ingredientId]
        return (
          <li key={ingredientId}>
            <span className="amount">{formatAmount(qty, ingredient.unit)}</span>
            <span>
              {/* "3 Large eggs", but "½ Lemon". */}
              {ingredient.unit === 'each' && qty > 1 ? ingredient.plural : ingredient.name}
              {prep !== null && <span className="row-note">{prep}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

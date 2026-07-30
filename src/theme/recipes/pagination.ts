import { paginationAnatomy } from '@ark-ui/solid/anatomy'
import { defineSlotRecipe } from '@pandacss/dev'

export const pagination = defineSlotRecipe({
  className: 'pagination',
  slots: paginationAnatomy.keys(),
  base: {},
})

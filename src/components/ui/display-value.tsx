import { createMemo, Show } from 'solid-js'
import { VisuallyHidden } from 'styled-system/jsx'
import { Span } from './span'

export interface DisplayValueProps<T> {
  /** The value to display */
  value?: T | null | undefined
  /** Optional function to format the value before displaying */
  formatValue?: (value: NonNullable<T>) => string | null | undefined
}

export const DisplayValue = <T,>(props: DisplayValueProps<T>) => {
  const formattedValue = createMemo(() => {
    const value = props.value
    const formatValue = props.formatValue
    return isNotEmpty(value) ? (formatValue?.(value) ?? String(value)) : null
  })

  return (
    <Show
      when={formattedValue() != null}
      fallback={
        <>
          <Span color="fg.subtle" aria-hidden>
            —
          </Span>
          <VisuallyHidden>No value available</VisuallyHidden>
        </>
      }
    >
      {formattedValue()}
    </Show>
  )
}

const isString = (value: unknown): value is string => typeof value === 'string'

const isNotEmpty = <T,>(value: T | null | undefined): value is NonNullable<T> => {
  if (value == null) return false
  if (isString(value) || Array.isArray(value)) return value.length > 0
  return true
}

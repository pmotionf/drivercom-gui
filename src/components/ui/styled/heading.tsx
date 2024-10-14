import type { Component, ComponentProps, JSX } from 'solid-js'
import { styled } from 'styled-system/jsx'
import { type TextVariantProps, text } from 'styled-system/recipes'
import type { StyledComponent } from 'styled-system/types'

type ElementType = keyof JSX.IntrinsicElements | Component<any>;

type TextProps = TextVariantProps & { as?: ElementType }

export type HeadingProps = ComponentProps<typeof Heading>
export const Heading = styled('h2', text, {
  defaultProps: { variant: 'heading' },
}) as StyledComponent<'h2', TextProps>

import type { Component, ComponentProps, JSX } from 'solid-js'
import { styled } from 'styled-system/jsx'
import { type TextVariantProps, text } from 'styled-system/recipes'
import type { StyledComponent } from 'styled-system/types'

type ElementType = keyof JSX.IntrinsicElements | Component<any>;

type ParagraphProps = TextVariantProps & { as?: ElementType }

export type TextProps = ComponentProps<typeof Text>
export const Text = styled('p', text) as StyledComponent<'p', ParagraphProps>

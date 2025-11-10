import type React from 'react'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { pug, styl } from 'cssxjs'
import './index.cssx.styl'

createRoot(document.body.appendChild(document.createElement('div'))).render(pug`App`)

function App () {
  const [count, setCount] = useState(0)

  return pug`
    Div.root(gap=2 align='center')
      Span.title(h1) CSSX Demo Page
      Div(row gap=2 vAlign='center')
        Button.down(onPress=() => setCount(c => c - 1)) -1
        Span(bold) Count: #{count}
        Button.up(onPress=() => setCount(c => c + 1)) +1
      Div(full)
      MediaRuler
      Span.magicText This is a magic text with styles from external .styl file
  `
  styl`
    .root
      height 100%
    .title
      color: purple
    .down
      background-color: #aa2222
      &:part(text)
        color: #ffaaaa
    .up
      background-color: #22aa22
      &:part(text)
        color: #aaffaa
  `
}

interface DivProps {
  children: React.ReactNode // The content to be displayed inside the div
  row?: boolean // Arrange children in a row; otherwise, in a column
  full?: boolean // Make the div take full available space
  gap?: number | string // The gap between children, in pixels or CSS units
  align?: 'left' | 'center' | 'right' // The alignment of children
  vAlign?: 'top' | 'center' | 'bottom' // The vertical alignment of children
  onPress?: () => void // The function to call when the div is pressed
}
function Div ({ children, row, gap, align, vAlign, full, onPress }: DivProps) {
  const style: React.CSSProperties = {}
  if (gap) style.gap = typeof gap === 'number' ? gap + 'u' : gap
  if (align) Object.assign(style, getAlignStyle(align, row))
  if (vAlign) Object.assign(style, getVerticalAlignStyle(vAlign, row))
  return pug`
    div.root(part='root' styleName={row, full} style=style onClick=onPress)= children
  `
  styl`
    .root
      display: flex
      flex-direction: column
      &.row
        flex-direction: row
      &.full
        flex: 1
  `
}

interface SpanProps {
  children: React.ReactNode // The content to be displayed inside the span
  h1?: boolean // Apply h1 styles
  h2?: boolean // Apply h2 styles
  h3?: boolean // Apply h3 styles
  h4?: boolean // Apply h4 styles
  bold?: boolean // Apply bold styles
}
function Span ({ children, h1, h2, h3, h4, bold }: SpanProps) {
  return pug`
    span.root(part='root' styleName={h1, h2, h3, h4, bold})= children
  `
  styl`
    .root
      font-family: sans-serif
      font-size: 2u
      line-height: 3u
      &.h1
        font-size: 4u
        line-height: 6u
        font-weight: bold
      &.h2
        font-size: 3.5u
        line-height: 5u
        font-weight: bold
      &.h3
        font-size: 3u
        line-height: 4u
        font-weight: bold
      &.h4
        font-size: 2u
        line-height: 3u
        font-weight: bold
      &.bold
        font-weight: bold
  `
}

interface ButtonProps extends DivProps {}
function Button ({ children, ...props }: ButtonProps) {
  return pug`
    Div.root(part='root' ...props)
      if typeof children === 'string'
        Span(part='text')= children
      else
        = children
  `
  styl`
    .root
      padding: 1u 2u
      background-color: #007bff
      border-radius: 1u
      cursor: pointer
      user-select: none
    .text
      color: white
      font-family: sans-serif
      font-size: 2u
  `
}

/**
 * Demo changing styles based on media queries. Changes width and background color based on screen width.
 */
function MediaRuler () {
  return pug`
    Div.root(part='root' align='center' vAlign='center')
      Span.text @media ruler - resize window and change count to see the color change
  `
  styl`
    .root
      height: 2u
      border-radius: 1u
      width: 100%
      background-color: red
      @media (min-width: 768px)
        max-width: 768px
        background-color: orange
      @media (min-width: 1024px)
        max-width: 1024px
        background-color: yellow
      @media (min-width: 1280px)
        max-width: 1280px
        background-color: green
      @media (min-width: 1536px)
        max-width: 1536px
        background-color: blue
      @media (min-width: 1920px)
        max-width: 1920px
        background-color: purple
    .text
      color: white
      font-family: monospace
      font-size: 1.5u
  `
}

function getAlignStyle (align: string, row?: boolean) {
  const style: React.CSSProperties = {}
  if (row) {
    if (align === 'left') style.justifyContent = 'flex-start'
    else if (align === 'center') style.justifyContent = 'center'
    else if (align === 'right') style.justifyContent = 'flex-end'
    else style.justifyContent = align
  } else {
    if (align === 'left') style.alignItems = 'flex-start'
    else if (align === 'center') style.alignItems = 'center'
    else if (align === 'right') style.alignItems = 'flex-end'
    else style.alignItems = align
  }
  return style
}

function getVerticalAlignStyle (vAlign: string, row?: boolean) {
  const style: React.CSSProperties = {}
  if (row) {
    if (vAlign === 'top') style.alignItems = 'flex-start'
    else if (vAlign === 'center') style.alignItems = 'center'
    else if (vAlign === 'bottom') style.alignItems = 'flex-end'
    else style.alignItems = vAlign
  } else {
    if (vAlign === 'top') style.justifyContent = 'flex-start'
    else if (vAlign === 'center') style.justifyContent = 'center'
    else if (vAlign === 'bottom') style.justifyContent = 'flex-end'
    else style.justifyContent = vAlign
  }
  return style
}

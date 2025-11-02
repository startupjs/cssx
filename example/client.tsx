import type React from 'react'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { pug, styl } from 'cssxjs'

createRoot(document.body.appendChild(document.createElement('div'))).render(pug`App`)

function App () {
  const [count, setCount] = useState(0)

  return pug`
    Div(gap=2 align='center')
      Span.title(h1) CSSX Demo Page
      Div(row gap=2 vAlign='center')
        Button.down(onPress=() => setCount(c => c - 1)) -1
        Span(bold) Count: #{count}
        Button.up(onPress=() => setCount(c => c + 1)) +1
  `
  /* eslint-disable-line no-unreachable */styl`
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
  gap?: number | string // The gap between children, in pixels or CSS units
  align?: 'left' | 'center' | 'right' // The alignment of children
  vAlign?: 'top' | 'center' | 'bottom' // The vertical alignment of children
  onPress?: () => void // The function to call when the div is pressed
}
function Div ({ children, row, gap, align, vAlign, onPress }: DivProps) {
  const style: React.CSSProperties = {}
  if (gap) style.gap = typeof gap === 'number' ? gap * 8 + 'px' : gap
  if (align) Object.assign(style, getAlignStyle(align, row))
  if (vAlign) Object.assign(style, getVerticalAlignStyle(vAlign, row))
  return pug`
    div.root(part='root' styleName={row} style=style onClick=onPress)= children
  `
  /* eslint-disable-line no-unreachable */styl`
    .root
      display: flex
      flex-direction: column
      &.row
        flex-direction: row
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
  /* eslint-disable-line no-unreachable */styl`
    .root
      font-family: sans-serif
      font-size: 16px
      &.h1
        font-size: 32px
        font-weight: bold
      &.h2
        font-size: 24px
        font-weight: bold
      &.h3
        font-size: 18px
        font-weight: bold
      &.h4
        font-size: 16px
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
  /* eslint-disable-line no-unreachable */styl`
    .root
      padding: 8px 16px
      background-color: #007bff
      border-radius: 8px
      cursor: pointer
      user-select: none
    .text
      color: white
      font-family: sans-serif
      font-size: 16px
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

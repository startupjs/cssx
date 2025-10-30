import { createRoot } from 'react-dom/client'
import { pug, styl } from 'cssxjs'

const App = () => {
  return pug`
    div.container
      span.text Hello World
  `
  styl`
    .container
      display: flex
      gap: 16px
    .text
      color: green
      font-family: sans-serif
      font-size: 24px
      font-weight: bold
  `
}

const container = document.body.appendChild(document.createElement('div'))
createRoot(container).render(pug`App`)

# List with Selection

Interactive list component with selection state.

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'

function SelectableList({ items, onSelect }) {
  const [selectedId, setSelectedId] = useState(null)

  const handleSelect = (item) => {
    setSelectedId(item.id)
    onSelect?.(item)
  }

  return (
    <ul styleName="list">
      {items.map(item => (
        <li
          key={item.id}
          styleName={{ item: true, selected: selectedId === item.id }}
          onClick={() => handleSelect(item)}
        >
          <span styleName="icon">{item.icon}</span>
          <div styleName="content">
            <span styleName="title">{item.title}</span>
            <span styleName="subtitle">{item.subtitle}</span>
          </div>
          <span styleName="chevron">›</span>
        </li>
      ))}
    </ul>
  )

  styl`
    .list
      list-style none
      margin 0
      padding 0
      background white
      border-radius 12px
      overflow hidden
      box-shadow 0 1px 3px rgba(0,0,0,0.1)

    .item
      display flex
      align-items center
      gap 12px
      padding 14px 16px
      cursor pointer

      &.selected
        background #e3f2fd

    .icon
      font-size 24px
      width 40px
      height 40px
      display flex
      align-items center
      justify-content center
      background #f0f0f0
      border-radius 8px

    .content
      flex 1
      display flex
      flex-direction column
      gap 2px

    .title
      font-weight 500
      color #333

    .subtitle
      font-size 13px
      color #666

    .chevron
      color #999
      font-size 20px
  `
}
```

## Usage

```jsx
const items = [
  { id: 1, icon: '📱', title: 'Mobile App', subtitle: 'iOS and Android' },
  { id: 2, icon: '🌐', title: 'Web App', subtitle: 'React + TypeScript' },
  { id: 3, icon: '🖥️', title: 'Desktop', subtitle: 'Electron' }
]

<SelectableList items={items} onSelect={item => console.log(item)} />
```

## Key Concepts

- **Dynamic selection state** with `{ selected: selectedId === item.id }`
- **List item layout** with flexbox
- **Modifier class** `.selected` for active state

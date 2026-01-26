# List with Selection

Interactive list component with selection state.

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'

function SelectableList({ items, onSelect }) {
  const [selectedId, setSelectedId] = useState(null)

  const handleSelect = (item) => {
    setSelectedId(item.id)
    onSelect?.(item)
  }

  return (
    <View styleName="list">
      {items.map(item => (
        <Pressable
          key={item.id}
          styleName={['item', { selected: selectedId === item.id }]}
          onPress={() => handleSelect(item)}
        >
          <View styleName="icon">
            <Text styleName="icon-text">{item.icon}</Text>
          </View>
          <View styleName="content">
            <Text styleName="title">{item.title}</Text>
            <Text styleName="subtitle">{item.subtitle}</Text>
          </View>
          <Text styleName="chevron">›</Text>
        </Pressable>
      ))}
    </View>
  )

  styl`
    .list
      background white
      border-radius 12px
      overflow hidden

    .item
      flex-direction row
      align-items center
      gap 12px
      padding 14px 16px

      &.selected
        background #e3f2fd

    .icon
      width 40px
      height 40px
      align-items center
      justify-content center
      background #f0f0f0
      border-radius 8px

    .icon-text
      font-size 24px

    .content
      flex 1
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

- **Array pattern** `['item', { selected: ... }]` for dynamic selection
- **List item layout** with flexbox
- **Modifier class** `.selected` for active state

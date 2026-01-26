# Navigation Tabs

Animated tab navigation with accessibility support.

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'

function Tabs({ tabs, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const activeContent = tabs.find(t => t.id === activeTab)?.content

  return (
    <View styleName="tabs">
      <View styleName="tab-list" accessibilityRole="tablist">
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            styleName={['tab', { active: activeTab === tab.id }]}
            onPress={() => setActiveTab(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
          >
            {tab.icon && <Text styleName="tab-icon">{tab.icon}</Text>}
            <Text styleName={['tab-label', { active: activeTab === tab.id }]}>{tab.label}</Text>
            <View styleName={['indicator', { active: activeTab === tab.id }]} />
          </Pressable>
        ))}
      </View>

      <View styleName="tab-panel">
        {activeContent}
      </View>
    </View>
  )

  styl`
    .tabs
      background white
      border-radius 12px
      overflow hidden

    .tab-list
      flex-direction row
      border-bottom-width 2px
      border-bottom-color #eee
      background #fafafa

    .tab
      flex 1
      padding 14px 20px
      align-items center
      justify-content center
      gap 8px

    .tab-label
      font-size 14px
      font-weight 500
      color #666

      &.active
        color #007bff

    .tab-icon
      font-size 16px

    .indicator
      position absolute
      bottom -2px
      left 0
      right 0
      height 2px
      background transparent

      &.active
        background #007bff

    .tab-panel
      padding 20px
  `
}
```

## Usage

```jsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊', content: <Overview /> },
  { id: 'analytics', label: 'Analytics', icon: '📈', content: <Analytics /> },
  { id: 'settings', label: 'Settings', icon: '⚙️', content: <Settings /> }
]

<Tabs tabs={tabs} defaultTab="overview" />
```

## Key Concepts

- **Array pattern** `['tab', { active: ... }]` for dynamic active state
- **Active indicator** using a real element with `&.active` modifier
- **Accessibility** with `accessibilityRole="tablist"`, `accessibilityRole="tab"`, `accessibilityState`
- **Flexible layout** with `flex: 1` for equal-width tabs

# Navigation Tabs

Animated tab navigation with accessibility support.

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'

function Tabs({ tabs, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const activeContent = tabs.find(t => t.id === activeTab)?.content

  return (
    <div styleName="tabs">
      <div styleName="tab-list" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            styleName={{ tab: true, active: activeTab === tab.id }}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon && <span styleName="tab-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      <div styleName="tab-panel" role="tabpanel">
        {activeContent}
      </div>
    </div>
  )

  styl`
    .tabs
      background white
      border-radius 12px
      overflow hidden

    .tab-list
      display flex
      border-bottom 2px solid #eee
      background #fafafa

    .tab
      flex 1
      padding 14px 20px
      border none
      background transparent
      font-size 14px
      font-weight 500
      color #666
      cursor pointer
      display flex
      align-items center
      justify-content center
      gap 8px
      position relative

      &.active
        color #007bff

        &::after
          content ''
          position absolute
          bottom -2px
          left 0
          right 0
          height 2px
          background #007bff

    .tab-icon
      font-size 16px

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

- **Active indicator** using `::after` pseudo-element
- **Accessibility** with `role="tablist"`, `role="tab"`, `aria-selected`
- **Dynamic active class** with `{ active: activeTab === tab.id }`
- **Flexible layout** with `flex: 1` for equal-width tabs

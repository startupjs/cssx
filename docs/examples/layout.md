# Responsive Layout

Dashboard layout that adapts to screen size using media queries.

```jsx
import { styl } from 'cssxjs'
import { View, ScrollView } from 'react-native'

function Dashboard({ sidebar, children }) {
  return (
    <View styleName="dashboard">
      <View styleName="sidebar">
        {sidebar}
      </View>
      <ScrollView styleName="content">
        {children}
      </ScrollView>
    </View>
  )

  styl`
    .dashboard
      flex 1
      flex-direction row

      @media (max-width: 768px)
        flex-direction column

    .sidebar
      width 250px
      background #2d3748
      padding 20px

      @media (max-width: 768px)
        width 100%
        padding 16px

    .content
      flex 1
      padding 24px
      background #f7fafc

      @media (max-width: 768px)
        padding 16px
  `
}
```

## Key Concepts

- **`@media` queries** for responsive breakpoints
- **Flexbox layout** with `flex-direction` change on mobile
- **Fluid widths** on smaller screens

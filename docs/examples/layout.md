# Responsive Layout

Dashboard layout that adapts to screen size using media queries.

```jsx
import { styl } from 'cssxjs'

function Dashboard({ sidebar, children }) {
  return (
    <div styleName="dashboard">
      <aside styleName="sidebar">
        {sidebar}
      </aside>
      <main styleName="content">
        {children}
      </main>
    </div>
  )

  styl`
    .dashboard
      display flex
      min-height 100vh

      @media (max-width: 768px)
        flex-direction column

    .sidebar
      width 250px
      background #2d3748
      color white
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

# Modal Dialog

Accessible modal with backdrop and parts for customization.

```jsx
import { styl } from 'cssxjs'
import { useEffect } from 'react'

function Modal({ isOpen, onClose, title, children, actions }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div styleName="overlay" onClick={onClose}>
      <div
        part="root"
        styleName="root"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header part="header" styleName="header">
          <h2 id="modal-title" styleName="title">{title}</h2>
          <button styleName="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div part="content" styleName="content">
          {children}
        </div>

        {actions && (
          <footer part="footer" styleName="footer">
            {actions}
          </footer>
        )}
      </div>
    </div>
  )

  styl`
    .overlay
      position fixed
      inset 0
      background rgba(0,0,0,0.5)
      display flex
      align-items center
      justify-content center
      padding 20px
      z-index 1000

    .root
      background white
      border-radius 12px
      max-width 480px
      width 100%
      max-height 90vh
      display flex
      flex-direction column
      box-shadow 0 20px 60px rgba(0,0,0,0.3)

    .header
      display flex
      align-items center
      justify-content space-between
      padding 20px
      border-bottom 1px solid #eee

    .title
      margin 0
      font-size 18px

    .close
      width 32px
      height 32px
      border none
      background transparent
      font-size 24px
      cursor pointer
      color #666
      border-radius 6px

    .content
      padding 20px
      overflow-y auto

    .footer
      padding 16px 20px
      border-top 1px solid #eee
      display flex
      gap 12px
      justify-content flex-end
  `
}
```

## Usage

```jsx
const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  actions={
    <>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  <p>Are you sure you want to proceed with this action?</p>
</Modal>
```

## Key Concepts

- **Fixed overlay** with `position fixed` and `inset 0`
- **Click-outside-to-close** with `onClick` on overlay and `stopPropagation` on modal
- **Body scroll lock** when modal is open
- **Accessibility** with `role="dialog"`, `aria-modal`, `aria-labelledby`
- **`part` attributes** for external styling of header, content, footer

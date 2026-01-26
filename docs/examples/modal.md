# Modal Dialog

Accessible modal with backdrop and parts for customization.

```jsx
import { styl } from 'cssxjs'
import { View, Text, Pressable, ScrollView, Modal as RNModal } from 'react-native'

function Modal({ isOpen, onClose, title, children, actions }) {
  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable styleName="overlay" onPress={onClose}>
        <View
          part="root"
          styleName="root"
          onStartShouldSetResponder={() => true}
          accessible
          accessibilityRole="dialog"
        >
          <View part="header" styleName="header">
            <Text styleName="title">{title}</Text>
            <Pressable styleName="close" onPress={onClose} accessibilityLabel="Close">
              <Text styleName="close-icon">×</Text>
            </Pressable>
          </View>

          <ScrollView part="content" styleName="content">
            {children}
          </ScrollView>

          {actions && (
            <View part="footer" styleName="footer">
              {actions}
            </View>
          )}
        </View>
      </Pressable>
    </RNModal>
  )

  styl`
    .overlay
      flex 1
      background rgba(0,0,0,0.5)
      justify-content center
      align-items center
      padding 20px

    .root
      background white
      border-radius 12px
      max-width 480px
      width 100%
      max-height 90%

    .header
      flex-direction row
      align-items center
      justify-content space-between
      padding 20px
      border-bottom-width 1px
      border-bottom-color #eee

    .title
      font-size 18px
      font-weight 600

    .close
      width 32px
      height 32px
      align-items center
      justify-content center
      border-radius 6px

    .close-icon
      font-size 24px
      color #666

    .content
      padding 20px

    .footer
      padding 16px 20px
      border-top-width 1px
      border-top-color #eee
      flex-direction row
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
  <Text>Are you sure you want to proceed with this action?</Text>
</Modal>
```

## Key Concepts

- **React Native Modal** with transparent background and fade animation
- **Click-outside-to-close** with `onPress` on overlay and `onStartShouldSetResponder` on content
- **ScrollView content** for scrollable modal body
- **Accessibility** with `accessibilityRole="dialog"`
- **`part` attributes** for external styling of header, content, footer

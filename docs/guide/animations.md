# Animations

CSSX compiles CSS animations and transitions to a format compatible with **Reanimated v4**. Use standard CSS syntax and apply styles to Reanimated components.

## Transitions

Add smooth transitions between state changes:

```jsx
import { styl } from 'cssxjs'
import Animated from 'react-native-reanimated'

function Tag({ label, active }) {
  return (
    <Animated.View styleName={['tag', { active }]}>
      <Animated.Text styleName={['label', { active }]}>{label}</Animated.Text>
    </Animated.View>
  )

  styl`
    .tag
      padding 6px 12px
      background #e0e0e0
      border-radius 16px
      transition background 0.2s, transform 0.2s

      &.active
        background #007bff
        transform scale(1.05)

    .label
      font-size 14px
      color #333
      transition color 0.2s

      &.active
        color white
  `
}
```

### Transition Syntax

```stylus
// Single property
transition background 0.2s

// With timing function
transition opacity 300ms ease-out

// With delay
transition transform 0.2s ease 0.1s

// Multiple properties
transition background 0.2s, transform 0.1s, opacity 0.3s
```

### Supported Timing Functions

- `linear` — constant speed from start to finish
- `ease` — starts slow, speeds up, then slows down (default)
- `ease-in` — starts slow and accelerates
- `ease-out` — starts quickly and decelerates
- `ease-in-out` — starts slowly, speeds up, then slows down again
- `step-start` — jumps instantly at the start
- `step-end` — jumps instantly at the end

## Keyframe Animations

Define keyframe animations for complex sequences:

```jsx
import { styl } from 'cssxjs'
import Animated from 'react-native-reanimated'

function FadeIn({ children }) {
  return (
    <Animated.View styleName="fade-in">
      {children}
    </Animated.View>
  )

  styl`
    .fade-in
      animation fadeIn 500ms ease-out forwards

    @keyframes fadeIn
      from
        opacity 0
        transform translateY(-20px)
      to
        opacity 1
        transform translateY(0)
  `
}
```

### Keyframe Syntax

Use `from`/`to` or percentages:

```stylus
@keyframes slideIn
  from
    transform translateX(-100px)
    opacity 0
  to
    transform translateX(0)
    opacity 1

@keyframes pulse
  0%
    transform scale(1)
  50%
    transform scale(1.1)
  100%
    transform scale(1)
```

### Animation Properties

The `animation` shorthand accepts:

```stylus
animation [name] [duration] [timing] [delay] [iteration] [direction] [fill-mode]
```

**Examples:**

```stylus
// Basic
animation fadeIn 300ms

// With timing and fill mode
animation slideIn 500ms ease-out forwards

// Infinite loop
animation pulse 1s ease-in-out infinite

// Alternate direction (bounce back and forth)
animation bounce 0.5s ease infinite alternate

// With delay
animation fadeIn 300ms ease 100ms
```

### Individual Properties

You can also use individual animation properties:

```stylus
.element
  animation-name fadeIn
  animation-duration 500ms
  animation-timing-function ease-out
  animation-delay 100ms
  animation-iteration-count infinite
  animation-direction alternate
  animation-fill-mode forwards
```

## Using with Reanimated Components

CSSX animations work with Reanimated v4's animated components.

**Important:** Only use `Animated.*` components on elements that have `animation` or `transition` in their styles. Elements with static styles should use regular React Native components (`View`, `Text`, etc.).

```jsx
import { styl } from 'cssxjs'
import Animated from 'react-native-reanimated'

function AnimatedCard({ visible, children }) {
  return (
    <Animated.View styleName={['card', { visible }]}>
      {children}
    </Animated.View>
  )

  styl`
    .card
      background white
      border-radius 12px
      padding 16px
      opacity 0
      transform translateY(20px)
      transition opacity 0.3s, transform 0.3s

      &.visible
        opacity 1
        transform translateY(0)
  `
}
```

### With Pressable

Use Reanimated's `createAnimatedComponent` for interactive elements:

```jsx
import { useState } from 'react'
import { styl } from 'cssxjs'
import { Pressable, Text } from 'react-native'
import Animated from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function AnimatedButton({ onPress, children }) {
  const [pressed, setPressed] = useState(false)

  return (
    <AnimatedPressable
      styleName={['button', { pressed }]}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      <Text styleName="text">{children}</Text>
    </AnimatedPressable>
  )

  styl`
    .button
      padding 14px 28px
      background #007bff
      border-radius 8px
      transition transform 0.1s, background 0.2s

      &.pressed
        transform scale(0.96)
        background #0056b3

    .text
      color white
  `
}
```

## Multiple Animations

Apply multiple animations simultaneously:

```stylus
.element
  animation fadeIn 300ms ease, slideIn 500ms ease-out
```

Both animations run at the same time with their own timing.

## Complete Example

A notification toast with enter and exit animations:

```jsx
import { styl } from 'cssxjs'
import { Pressable, Text } from 'react-native'
import Animated from 'react-native-reanimated'

function Toast({ message, visible, onHide }) {
  // Only the outer View needs Animated since it has animation
  // Text elements use regular RN components (no animation on them)
  return (
    <Animated.View styleName={['toast', { visible, hidden: !visible }]}>
      <Text styleName="message">{message}</Text>
      <Pressable onPress={onHide}>
        <Text styleName="close">×</Text>
      </Pressable>
    </Animated.View>
  )

  styl`
    .toast
      position absolute
      bottom 20px
      align-self center
      flex-direction row
      align-items center
      gap 12px
      padding 12px 20px
      background #333
      border-radius 8px

      &.visible
        animation slideUp 300ms ease-out forwards

      &.hidden
        animation slideDown 200ms ease-in forwards

    @keyframes slideUp
      from
        opacity 0
        transform translateY(100px)
      to
        opacity 1
        transform translateY(0)

    @keyframes slideDown
      from
        opacity 1
        transform translateY(0)
      to
        opacity 0
        transform translateY(100px)

    .message
      font-size 14px
      color white

    .close
      color white
      font-size 18px
      padding 0 4px
  `
}
```

## How It Works

CSSX compiles animations in a way Reanimated v4 expects:

1. **Transitions** are converted to React Native's transition format with camelCased property names
2. **Keyframes** are inlined directly into the `animationName` property as objects
3. **Timing functions** are converted to Reanimated's format

This means you write standard CSS and get native-compatible animations automatically.

## Next Steps

- [Caching](/guide/caching) — Performance optimization with teamplay
- [Examples](/examples/) — More code examples
- [styl Template](/api/styl) — Full syntax reference

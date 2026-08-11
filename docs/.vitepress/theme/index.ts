import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CursorDemo from './components/CursorDemo.vue'
import Layout from './Layout.vue'
// The docs are the engine's browser harness: the full cursor stylesheet loads
// on every page, same cascade layer and all, so what readers see is what the
// plugin ships.
import '@styles/index.scss'
import './demos.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CursorDemo', CursorDemo)
  }
} satisfies Theme

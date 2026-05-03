import { readFileSync } from 'fs'
import { join } from 'path'
import { defineConfig } from '@rspress/core'

function readShikiGrammar (filename: string) {
  return JSON.parse(
    readFileSync(join(__dirname, 'docs-theme', 'shiki', filename), 'utf8')
  )
}

const pugTemplateLiteralGrammar = readShikiGrammar('pug-template-literal.json')
const cssxStyleTemplateLiteralGrammar = readShikiGrammar('cssx-style-template-literal.json')

export default defineConfig({
  root: 'docs',
  themeDir: join(__dirname, 'docs-theme'),
  title: 'CSSX',
  description: 'CSS-in-JS with actual CSS',
  // icon: '/favicon.ico',
  // logo: {
  //   light: '/logo-light.png',
  //   dark: '/logo-dark.png'
  // },
  route: {
    cleanUrls: true
  },
  markdown: {
    shiki: {
      langs: [
        'tsx',
        'ts',
        'jsx',
        'js',
        'pug',
        'css',
        'stylus',
        {
          name: 'pug-template-literal',
          injectTo: ['source.ts', 'source.tsx', 'source.js', 'source.jsx'],
          embeddedLangs: ['pug', 'css', 'stylus', 'typescript', 'tsx', 'javascript'],
          ...pugTemplateLiteralGrammar
        },
        {
          name: 'cssx-style-template-literal',
          injectTo: ['source.ts', 'source.tsx', 'source.js', 'source.jsx'],
          embeddedLangs: ['css', 'stylus', 'typescript', 'tsx', 'javascript'],
          ...cssxStyleTemplateLiteralGrammar
        }
      ],
      langAlias: {
        styl: 'stylus'
      }
    }
  },
  themeConfig: {
    enableContentAnimation: true,
    socialLinks: [
      { icon: 'github', mode: 'link', content: 'https://github.com/startupjs/cssx' }
    ],
    footer: {
      message: '© 2026 StartupJS. All Rights Reserved.'
    },
    hideNavbar: 'auto',
    sidebar: {
      '/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Usage', link: '/guide/usage' },
            { text: 'Component Parts', link: '/guide/component-parts' },
            { text: 'CSS Variables', link: '/guide/variables' },
            { text: 'Animations', link: '/guide/animations' },
            { text: 'Pug Templates', link: '/guide/pug' },
            { text: 'TypeScript Support', link: '/guide/typescript' },
            { text: 'Caching', link: '/guide/caching' }
          ]
        },
        {
          text: 'API',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'styl Template', link: '/api/styl' },
            { text: 'css Template', link: '/api/css' },
            { text: 'pug Template', link: '/api/pug' },
            { text: 'styl() Function', link: '/api/styl-function' },
            { text: 'CSS Variables', link: '/api/variables' },
            { text: 'JSX Props', link: '/api/jsx-props' },
            { text: 'Babel Config', link: '/api/babel' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Button', link: '/examples/button' },
            { text: 'Card with Parts', link: '/examples/card' },
            { text: 'Form Input', link: '/examples/form' },
            { text: 'Modal Dialog', link: '/examples/modal' },
            { text: 'Tabs', link: '/examples/tabs' },
            { text: 'List', link: '/examples/list' },
            { text: 'Theme System', link: '/examples/theme' },
            { text: 'Responsive Layout', link: '/examples/layout' }
          ]
        },
        {
          text: 'Migration Guides',
          collapsed: true,
          items: [
            { text: '0.3', link: '/migration-guides/0.3' }
          ]
        }
      ]
    },
    nav: [
      { text: 'Docs', link: '/guide/index', activeMatch: '/guide/.*' },
      { text: 'API', link: '/api/index', activeMatch: '/api/.*' }
    ]
  }
})

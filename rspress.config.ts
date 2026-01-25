import { defineConfig } from 'rspress/config'

export default defineConfig({
  root: 'docs',
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
  themeConfig: {
    enableContentAnimation: true,
    socialLinks: [
      { icon: 'github', mode: 'link', content: 'https://github.com/startupjs/cssx' }
    ],
    footer: {
      message: '© 2024 StartupJS. All Rights Reserved.'
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
            { text: 'Pug Templates', link: '/guide/pug' },
            { text: 'Caching', link: '/guide/caching' }
          ]
        },
        {
          text: 'API',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Template Literals', link: '/api/template-literals' },
            { text: 'CSS Variables', link: '/api/variables' },
            { text: 'JSX Props', link: '/api/jsx-props' },
            { text: 'Babel Config', link: '/api/babel' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Examples', link: '/examples/' }
          ]
        }
      ]
    },
    nav: [
      { text: 'Docs', link: '/guide/index', activeMatch: '/.+' }
    ]
  }
})

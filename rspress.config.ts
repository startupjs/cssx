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
            { text: 'Introduction', link: '/guide/index' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Usage', link: '/guide/usage' },
            { text: 'React Integration', link: '/guide/react-integration' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Simple', link: '/examples/index' }
          ]
        },
        {
          text: 'API',
          items: [
            { text: 'cssx', link: '/api/cssx' }
          ]
        }
      ]
    },
    nav: [
      { text: 'Docs', link: '/guide/index', activeMatch: '/.+' }
    ]
  }
})

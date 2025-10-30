// simple bundler for client.js with live reload
import esbuild from 'esbuild'
import { watch, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { transformAsync } from '@babel/core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_ENTRY = join(__dirname, 'client.js')

let cache
const reloadClients = new Set()

export default function serveClient (server) {
  server.on('request', async (req, res) => {
    if (req.url === '/client.js') {
      res.setHeader('Content-Type', 'application/javascript')
      res.end(await bundleClientJs())
    } else if (req.url === '/reload') {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      const reload = () => res.write('data: \n\n')
      reloadClients.add(reload)
      req.on('close', () => reloadClients.delete(reload))
    } else {
      res.setHeader('Content-Type', 'text/html')
      res.end('<script type="module" src="/client.js"></script>')
    }
  })
}

async function bundleClientJs () {
  cache ??= (async () => {
    // 1) Read the original source
    const src = readFileSync(CLIENT_ENTRY, 'utf8')

    // 2) Run through Babel first
    const babel = await transformAsync(src, {
      filename: CLIENT_ENTRY,
      babelrc: false,
      configFile: false,
      // Keep it simple: transpile JSX, modest env transform for wide-ish browsers
      presets: [
        ['cssxjs/babel', { platform: 'web' }]
      ],
      // Source maps optional; esbuild will also generate maps if you enable them
      sourceMaps: false
    })

    console.log('>> babel', babel.code)

    // 3) Hand Babel output to esbuild via stdin (no disk write)
    const result = await esbuild.build({
      stdin: {
        contents: babel.code,
        sourcefile: 'client.js', // helps error messages/sourcemaps
        resolveDir: dirname(CLIENT_ENTRY),
        loader: 'jsx' // Babel already handled JSX
      },
      bundle: true,
      write: false,
      format: 'esm',
      jsx: 'automatic',
      sourcemap: false, // flip to 'inline' during dev if you want
      banner: {
        js: `
          var global = window;
          (new EventSource('/reload')).onmessage = () => window.location.reload();
        `
      }
    })

    return result.outputFiles[0].text
  })()

  return await cache
}

// async function bundleClientJs () {
//   cache ??= esbuild.build({
//     entryPoints: ['./client.js'],
//     bundle: true,
//     write: false,
//     format: 'esm',
//     jsx: 'automatic',
//     loader: { '.js': 'jsx' },
//     banner: {
//       js: `
//         var global = window;
//         (new EventSource('/reload')).onmessage = () => window.location.reload();
//       `
//     }
//   })
//   return (await cache).outputFiles[0].text
// }

watch(CLIENT_ENTRY, () => {
  cache = undefined
  for (const reload of reloadClients) reload()
})

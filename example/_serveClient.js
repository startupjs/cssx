// simple bundler for client.js with live reload
import esbuild from 'esbuild'
import { watch, readFileSync } from 'fs'
import { highlight } from 'cli-highlight'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { transformAsync } from '@babel/core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_ENTRY = join(__dirname, 'client.tsx')

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

    console.log('Compiled Babel:\n', highlight(babel.code, {
      language: 'tsx',
      ignoreIllegals: true
    }))

    // 3) Hand Babel output to esbuild via stdin (no disk write)
    const result = await esbuild.build({
      stdin: {
        contents: babel.code,
        sourcefile: 'client.tsx', // helps error messages/sourcemaps
        resolveDir: dirname(CLIENT_ENTRY),
        loader: 'tsx'
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

watch(CLIENT_ENTRY, () => {
  cache = undefined
  for (const reload of reloadClients) reload()
})

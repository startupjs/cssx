#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))

function printUsage (stdout = console.log) {
  stdout('Usage: npx cssxjs <command> [options]')
  stdout('')
  stdout('Commands:')
  stdout('  check [files...]  Type-check the current project with React-Pug support')
  stdout('')
  stdout('Examples:')
  stdout('  npx cssxjs check')
  stdout('  npx cssxjs check src/App.tsx src/Button.tsx')
  stdout('  npx cssxjs check --project packages/web src/App.tsx')
}

function printCheckUsage (stdout = console.log) {
  stdout('Usage: npx cssxjs check [files...] [--project <tsconfig-path>]')
  stdout('       [--tagFunction <name>] [--injectCssxjsTypes <never|auto|force>] [--pretty [true|false]]')
  stdout('')
  stdout('Examples:')
  stdout('  npx cssxjs check')
  stdout('  npx cssxjs check src/App.tsx src/Button.tsx')
  stdout('  npx cssxjs check --project example example/src/App.tsx')
  stdout('  npx cssxjs check example')
}

async function run () {
  const [command, ...args] = process.argv.slice(2)

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    return 0
  }

  if (command === '--version' || command === '-v') {
    console.log(packageJson.version)
    return 0
  }

  if (command === 'check') {
    if (args.includes('--help') || args.includes('-h')) {
      printCheckUsage()
      return 0
    }

    const { runCli } = await import('./check.js')
    return runCli(args)
  }

  console.error(`Unknown command: ${command}`)
  printUsage(console.error)
  return 1
}

const exitCode = await run()
process.exit(exitCode)

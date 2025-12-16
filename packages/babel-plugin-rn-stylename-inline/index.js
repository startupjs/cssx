const { GLOBAL_NAME, LOCAL_NAME } =
  require('@cssxjs/runtime/constants')
const template = require('@babel/template').default
const parser = require('@babel/parser')
const t = require('@babel/types')
const COMPILERS = require('@cssxjs/loaders/compilers')
const DEFAULT_MAGIC_IMPORTS = ['cssxjs', 'startupjs']
const DEFAULT_PLATFORM = 'web'

const buildConst = template(`
  const %%variable%% = %%value%%
`)

module.exports = () => ({
  visitor: {
    Program: {
      enter ($this, state) {
        const usedCompilers = getUsedCompilers($this, state)
        $this.traverse(getVisitor({ $program: $this, usedCompilers }), state)
        // re-crawl to update scope bindings
        $this.scope.crawl()
      }
    }
  }
})

const getVisitor = ({ $program, usedCompilers }) => ({
  TaggedTemplateExpression: ($this, state) => {
    // 0. process only templates which are in usedCompilers (imported from our library)
    if (!shouldProcess($this, usedCompilers)) return

    // I. validate template
    validateTemplate($this)

    const compiler = usedCompilers.get($this.node.tag.name)

    // II. compile template
    const source = $this.node.quasi.quasis[0]?.value?.raw || ''
    const filename = state.file?.opts?.filename
    const platform = state.opts?.platform || state.file?.opts?.caller?.platform || DEFAULT_PLATFORM
    const compiledString = compiler(source, filename, { platform })
    const compiledExpression = parser.parseExpression(compiledString)

    // III. find parent function or program
    const $function = $this.getFunctionParent()

    // IV. LOCAL. if parent is function -- handle local
    if ($function) {
      // 1. define a `const` variable at the top of the file
      //    with the unique identifier
      const localIdentifier = $program.scope.generateUidIdentifier('localCssInstance')
      insertAfterImports($program, buildConst({
        variable: localIdentifier,
        value: compiledExpression
      }))

      // 2. reassign this unique identifier to a constant LOCAL_NAME
      //    in the scope of current function
      $function.get('body').unshiftContainer('body', buildConst({
        variable: t.identifier(LOCAL_NAME),
        value: localIdentifier
      }))

    // V. GLOBAL. if parent is program -- handle global
    } else {
      // 1. define a `const` variable at the top of the file
      //    with the constant GLOBAL_NAME
      insertAfterImports($program, buildConst({
        variable: t.identifier(GLOBAL_NAME),
        value: compiledExpression
      }))
    }

    // VI. Remove template expression after processing
    $this.remove()

    // TODO: Throw error if global styles were already added or
    //       local styles were already added to the same function scope
  }
})

function insertAfterImports ($program, expressionStatement) {
  const lastImport = $program
    .get('body')
    .filter($i => $i.isImportDeclaration())
    .pop()

  if (lastImport) {
    lastImport.insertAfter(expressionStatement)
  } else {
    $program.unshift(expressionStatement)
  }
}

function shouldProcess ($template, usedCompilers) {
  if (!$template.get('tag').isIdentifier()) return
  if (!usedCompilers.has($template.node.tag.name)) return
  return true
}

function validateTemplate ($template) {
  const { node: { quasi } } = $template

  if (quasi.expressions.length > 0) {
    throw $template.buildCodeFrameError(`
      [@cssxjs/babel-plugin-rn-stylename-inline] Expression interpolations are not supported in css\`\` and styl\`\`.
    `)
  }
}

function getUsedCompilers ($program, state) {
  const res = new Map()
  const magicImports = state.opts.magicImports || DEFAULT_MAGIC_IMPORTS
  for (const $import of $program.get('body')) {
    if (!$import.isImportDeclaration()) continue
    if (!magicImports.includes($import.node.source.value)) continue
    for (const $specifier of $import.get('specifiers')) {
      if (!$specifier.isImportSpecifier()) continue
      const { local, imported } = $specifier.node
      // it's important to use hasOwnProperty here to avoid prototype pollution issues, like 'toString'
      if (Object.prototype.hasOwnProperty.call(COMPILERS, imported.name)) {
        res.set(local.name, COMPILERS[imported.name])
      }
    }
  }
  return res
}

const template = require('@babel/template').default
const parser = require('@babel/parser')
const t = require('@babel/types')
const COMPILERS = require('@cssxjs/loaders/compilers')
const DEFAULT_MAGIC_IMPORTS = ['cssxjs', 'startupjs']
const DEFAULT_PLATFORM = 'web'
const GLOBAL_NAME = '__CSS_GLOBAL__'
const LOCAL_NAME = '__CSS_LOCAL__'

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

    const compiler = usedCompilers.get($this.node.tag.name)
    const { source, expressions } = lowerTemplate($this.node.quasi)
    const hasExpressions = expressions.length > 0

    // I. find parent function or program
    const $function = $this.getFunctionParent()
    if (hasExpressions && !$function) {
      throw $this.buildCodeFrameError(`
        [@cssxjs/babel-plugin-rn-stylename-inline] Expression interpolations are supported only inside function-scoped css\`\` and styl\`\` templates.
      `)
    }

    // II. compile template
    const filename = state.file?.opts?.filename
    const platform = state.opts?.platform || state.file?.opts?.caller?.platform || DEFAULT_PLATFORM
    const compiledString = compiler(source, filename, {
      platform,
      template: hasExpressions
    })
    const compiledExpression = parser.parseExpression(compiledString)

    // Expression-position css`...` / styl`...` is a value, for example:
    //   export default css`...`
    // It must compile to the sheet object instead of registering global/local
    // component styles.
    if (!isStandaloneStyleTemplate($this)) {
      if (hasExpressions) {
        throw $this.buildCodeFrameError(`
          [@cssxjs/babel-plugin-rn-stylename-inline] Expression-position css\`\` and styl\`\` templates must be static.
        `)
      }
      $this.replaceWith(compiledExpression)
      return
    }

    // III. LOCAL. if parent is function -- handle local
    if ($function) {
      // 1. define a `const` variable at the top of the file
      //    with the unique identifier
      const localIdentifier = $program.scope.generateUidIdentifier('localCssInstance')
      insertAfterImports($program, buildConst({
        variable: localIdentifier,
        value: compiledExpression
      }))

      const localValue = hasExpressions
        ? t.objectExpression([
          t.objectProperty(t.identifier('sheet'), localIdentifier),
          t.objectProperty(t.identifier('values'), t.arrayExpression(expressions))
        ])
        : localIdentifier

      // 2. reassign this unique identifier or local dynamic layer to a constant LOCAL_NAME
      //    in the scope of current function
      insertLocalCss($function, $this, buildConst({
        variable: t.identifier(LOCAL_NAME),
        value: localValue
      }), expressions, usedCompilers)

    // IV. GLOBAL. if parent is program -- handle global
    } else {
      // 1. define a `const` variable at the top of the file
      //    with the constant GLOBAL_NAME
      insertAfterImports($program, buildConst({
        variable: t.identifier(GLOBAL_NAME),
        value: compiledExpression
      }))
    }

    // V. Remove template expression after processing
    $this.remove()

    // TODO: Throw error if global styles were already added or
    //       local styles were already added to the same function scope
  }
})

function isStandaloneStyleTemplate ($template) {
  const $statement = $template.getStatementParent()
  return (
    $statement?.isExpressionStatement() &&
    $statement.get('expression').node === $template.node
  )
}

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

function insertLocalCss ($function, $template, statement, expressions, usedCompilers) {
  const $body = $function.get('body')
  if (!$body.isBlockStatement()) {
    $body.replaceWith(t.blockStatement([
      t.returnStatement($body.node)
    ]))
  }

  const $statement = $template.getStatementParent()
  const $functionBody = $function.get('body')
  const $firstReturn = findFirstReturnStatement($functionBody)

  if ($statement?.parentPath !== $functionBody) {
    $functionBody.unshiftContainer('body', statement)
    return
  }

  const $target = isTrailingStyleTemplateStatement($statement, usedCompilers)
    ? ($firstReturn || $statement)
    : $statement

  validateLocalCssPosition($functionBody, $firstReturn, $target, $template)

  validateInterpolationBindings($function, $functionBody, $target, expressions, $template)

  $target.insertBefore(statement)
}

function validateLocalCssPosition ($functionBody, $firstReturn, $target, $template) {
  if (!$firstReturn || $target.node !== $template.getStatementParent()?.node) return

  const statements = $functionBody.get('body')
  const returnIndex = statements.findIndex($statement => $statement.node === $firstReturn.node)
  const targetIndex = statements.findIndex($statement => $statement.node === $target.node)
  if (returnIndex < 0 || targetIndex < 0 || targetIndex < returnIndex) return

  throw $template.buildCodeFrameError([
    '[@cssxjs/babel-plugin-rn-stylename-inline] Local css/styl templates must be declared before the first return, unless they are trailing CSSX style blocks at the end of the component.',
    'Move this template before the first return, or place it after all returns as the final component statement.'
  ].join('\n'))
}

function isTrailingStyleTemplateStatement ($statement, usedCompilers) {
  let $current = $statement
  while ($current?.node) {
    if (!isStyleTemplateStatement($current, usedCompilers)) return false
    $current = $current.getNextSibling()
  }
  return true
}

function isStyleTemplateStatement ($statement, usedCompilers) {
  if (!$statement.isExpressionStatement()) return false
  const expression = $statement.get('expression')
  if (!expression.isTaggedTemplateExpression()) return false
  return shouldProcess(expression, usedCompilers)
}

function findFirstReturnStatement ($functionBody) {
  return $functionBody.get('body').find($statement => statementCanReturn($statement))
}

function statementCanReturn ($statement) {
  if ($statement.isReturnStatement()) return true

  let canReturn = false
  $statement.traverse({
    Function ($nestedFunction) {
      $nestedFunction.skip()
    },
    ReturnStatement ($return) {
      canReturn = true
      $return.stop()
    }
  })
  return canReturn
}

function validateInterpolationBindings ($function, $functionBody, $target, expressions, $template) {
  if (!$target || expressions.length === 0) return

  const statements = $functionBody.get('body')
  const targetIndex = statements.findIndex($statement => $statement.node === $target.node)
  if (targetIndex < 0) return

  for (const name of getReferencedNames(expressions)) {
    const binding = $template.scope.getBinding(name)
    if (!binding) continue
    if (binding.kind === 'module' || binding.kind === 'param' || binding.kind === 'hoisted') continue
    if (binding.path.getFunctionParent() !== $function) continue

    const $bindingStatement = binding.path.getStatementParent()
    const bindingIndex = statements.findIndex($statement => $statement.node === $bindingStatement?.node)
    if (bindingIndex >= 0 && bindingIndex < targetIndex) continue

    throw $template.buildCodeFrameError([
      `[@cssxjs/babel-plugin-rn-stylename-inline] Interpolated CSS value "${name}" is not available before the first return that can use local styles.`,
      'Move the declaration before the first styled return, or pass the value through props/CSS variables.'
    ].join('\n'))
  }
}

function getReferencedNames (expressions) {
  const names = new Set()
  for (const expression of expressions) collectReferencedNames(expression, names)
  return names
}

function collectReferencedNames (node, names) {
  if (!node) return

  if (t.isIdentifier(node)) {
    names.add(node.name)
    return
  }

  if (t.isFunction(node)) return

  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    collectReferencedNames(node.object, names)
    if (node.computed) collectReferencedNames(node.property, names)
    return
  }

  if (t.isObjectProperty(node)) {
    if (node.computed) collectReferencedNames(node.key, names)
    collectReferencedNames(node.value, names)
    return
  }

  const keys = t.VISITOR_KEYS[node.type] || []
  for (const key of keys) {
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) collectReferencedNames(child, names)
    } else {
      collectReferencedNames(value, names)
    }
  }
}

function shouldProcess ($template, usedCompilers) {
  if (!$template.get('tag').isIdentifier()) return
  if (!usedCompilers.has($template.node.tag.name)) return
  return true
}

function lowerTemplate (quasi) {
  let source = ''
  const expressions = []

  for (let index = 0; index < quasi.quasis.length; index++) {
    source += quasi.quasis[index]?.value?.raw || ''
    const expression = quasi.expressions[index]
    if (!expression) continue
    source += `var(--__cssx_dynamic_${expressions.length})`
    expressions.push(expression)
  }

  return { source, expressions }
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

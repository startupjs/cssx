declare module 'css/lib/parse/index.js' {
  export default function parseCss (css: string, options?: unknown): unknown
}

declare module 'css-mediaquery' {
  interface MediaQueryExpression {
    modifier?: string
    feature: string
    value?: string
  }

  interface MediaQuery {
    inverse: boolean
    type: string
    expressions: MediaQueryExpression[]
  }

  const mediaQuery: {
    parse(query: string): MediaQuery[]
    match(query: string, values: Record<string, unknown>): boolean
  }

  export default mediaQuery
}

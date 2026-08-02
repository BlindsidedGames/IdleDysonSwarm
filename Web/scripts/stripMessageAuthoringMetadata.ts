import ts from 'typescript'
import type { Plugin } from 'vite'

const UI_MESSAGE_MODULE = /\/src\/ui\/.*\/messages\.ts$/

/**
 * Keeps translator descriptions and fallback copy available to FormatJS
 * extraction while removing duplicated authoring metadata from browser
 * JavaScript. Production always loads its compiled locale catalog before
 * React renders.
 */
export function stripMessageAuthoringMetadataPlugin(): Plugin {
  return {
    name: 'idle-dyson-strip-message-authoring-metadata',
    apply: 'build',
    enforce: 'pre',
    transform(source, id) {
      const normalizedId = id.replaceAll('\\', '/')
      if (!UI_MESSAGE_MODULE.test(normalizedId)) return null
      return {
        code: stripMessageAuthoringMetadata(source, normalizedId),
        map: null,
      }
    },
  }
}

export function stripMessageAuthoringMetadata(
  source: string,
  fileName = 'messages.ts',
): string {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const transformed = ts.transform(sourceFile, [
    (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isObjectLiteralExpression(node)) {
          const visited = ts.visitEachChild(
            node,
            visit,
            context,
          ) as ts.ObjectLiteralExpression
          return context.factory.updateObjectLiteralExpression(
            visited,
            visited.properties.filter(
              (property) =>
                !(
                  ts.isPropertyAssignment(property) &&
                  ts.isIdentifier(property.name) &&
                  (property.name.text === 'description' ||
                    property.name.text === 'defaultMessage')
                ),
            ),
          )
        }
        return ts.visitEachChild(node, visit, context)
      }
      return (root) =>
        ts.visitNode(root, visit) as ts.SourceFile
    },
  ])
  try {
    return ts
      .createPrinter()
      .printFile(transformed.transformed[0] as ts.SourceFile)
  } finally {
    transformed.dispose()
  }
}

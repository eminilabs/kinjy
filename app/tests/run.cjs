/**
 * Runs the formatter probe in node.
 *
 * esbuild's own API rather than its command line: the shim in node_modules/.bin
 * is a .cmd on Windows, which node refuses to spawn without a shell. JSX is
 * compiled to the three-line createElement below rather than to React, because
 * the probe inspects the tree it gets back - it needs the shape, not a
 * renderer.
 */
const esbuild = require('esbuild')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kinjy-fmt-')), 'probe.cjs')
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'chatFormat.probe.tsx')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'F',
  outfile: out,
  logLevel: 'error',
})

global.h = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
})
global.F = 'span'
require(out)

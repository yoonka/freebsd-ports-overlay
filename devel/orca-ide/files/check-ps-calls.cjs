'use strict'
//
// Build-time check for freebsd-compat.cjs, run as
//
//	node check-ps-calls.cjs <freebsd-compat.cjs> <app directory>
//
// freebsd-compat.cjs rewrites ps(1) arguments where they reach
// child_process. That covers argument vectors and plain `ps ...` command
// strings, but not ps buried inside a larger shell command, such as
// `sh -c "ps -eo pid=,ppid= | ..."`. This scans the server bundles for
// such commands and fails the build if one would still reach FreeBSD's ps
// with a comma list of empty headers, so that an update which starts
// calling ps that way is noticed here rather than on a running server.
//
// It also runs the rewrite over every ps column list found in the bundles
// and over a few fixed cases, and fails if any comes out unsplit.

const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const [shimPath, appDir] = process.argv.slice(2)
if (!shimPath || !appDir) {
  console.error('usage: check-ps-calls.cjs <freebsd-compat.cjs> <app directory>')
  process.exit(2)
}
const { rewritePsArgs, rewritePsCommand } = require(path.resolve(shimPath))

// Fixed cases, in the shapes Orca uses.
assert.deepEqual(rewritePsArgs(['-axo', 'pid=,ppid=,command=']), [
  '-ax', '-o', 'pid=', '-o', 'ppid=', '-o', 'command='
])
assert.deepEqual(rewritePsArgs(['-ww', '-o', 'pid=,command=', '-p', '1,2']), [
  '-ww', '-o', 'pid=', '-o', 'command=', '-p', '1,2'
])
assert.deepEqual(rewritePsArgs(['-e', '-o', 'pid=PROCESS_ID,pgid=PROCESS_GID']), [
  '-A', '-o', 'pid=PROCESS_ID', '-o', 'pgid=PROCESS_GID'
])
assert.deepEqual(rewritePsArgs(['-p', '7', '-o', 'lstart=', '-o', 'command=']),
  ['-p', '7', '-o', 'lstart=', '-o', 'command='])
assert.deepEqual(rewritePsArgs(['-o', 'pid,ppid', '-p', '7']), ['-o', 'pid,ppid', '-p', '7'])
assert.equal(rewritePsCommand('ps -eo pid=,ppid=,pcpu=,rss='),
  'ps -A -o pid= -o ppid= -o pcpu= -o rss=')
assert.equal(rewritePsCommand('ps -p 7 -o pid='), 'ps -p 7 -o pid=')

function* bundles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // The browser and mobile clients never run ps.
      if (full === path.join(appDir, 'web') || full === path.join(appDir, 'out', 'mobile-web')) {
        continue
      }
      yield* bundles(full)
    } else if (/\.(c|m)?js$/.test(entry.name)) {
      yield full
    }
  }
}

const listLiteral = /["'`]((?:[a-z]+=[A-Za-z_]*,)+[a-z]+=[A-Za-z_]*)["'`]/g
const psInString = /["'`]([^"'`\n]*\bps\s+-[^"'`\n]*)["'`]/g
let lists = 0
const problems = []

for (const file of bundles(appDir)) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(appDir, file)
  for (const m of text.matchAll(listLiteral)) {
    lists += 1
    const out = rewritePsArgs(['-o', m[1]])
    if (out.some((a) => /=[^,]*,/.test(a))) {
      problems.push(`${rel}: column list ${m[1]} is not split`)
    }
  }
  for (const m of text.matchAll(psInString)) {
    const command = m[1].replace(/\$\{[^}]*\}/g, '1')
    if (!/=[^,\s]*,/.test(command)) {
      continue
    }
    if (/=[^,\s]*,/.test(rewritePsCommand(command))) {
      problems.push(`${rel}: shell command "${m[1]}" would reach ps unsplit`)
    }
  }
}

if (lists === 0) {
  problems.push('no ps column lists found at all: check whether Orca still ' +
    'calls ps this way, and whether freebsd-compat.cjs is still needed')
}
if (problems.length > 0) {
  console.error('check-ps-calls: ' + problems.join('\ncheck-ps-calls: '))
  process.exit(1)
}
console.log(`check-ps-calls: ${lists} ps column lists, all rewritten`)

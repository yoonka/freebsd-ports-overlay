'use strict'
//
// FreeBSD compatibility for Orca's server, loaded ahead of it with
// `node --require`. The terminal daemon that orcad starts inherits
// process.execArgv, so it is loaded there too, and bin/orca-ide loads it
// for the CLI.
//
// Orca reads the process table with ps(1) column lists that give every
// column an empty header in a single option, as in
//
//	ps -axo pid=,ppid=,pgid=,tpgid=,stat=,tty=,etimes=,command=
//
// procps (Linux) and macOS split that list at every comma. POSIX does not:
// the text after a "=" is the header, up to the end of the argument, and
// FreeBSD's ps follows it. It prints a single pid column headed
// ",ppid=,pgid=,...", every caller then parses rows with too few fields,
// and process-group cleanup, foreground detection and the busy/agent state
// of terminals quietly stop working. Orca also uses `-e` in the procps
// sense of "every process", which on FreeBSD means "show the environment".
//
// The call sites are spread over several bundles and change with every
// release; what they have in common is that they reach ps through
// child_process. So the arguments are rewritten there, for ps only:
//
//	-axo a=,b=,c=	->  -ax -o a= -o b= -o c=
//	-o a=X,b=Y	->  -o a=X -o b=Y
//	-e / -eo ...	->  -A / -A -o ...
//
// One -o per column means the same thing to every ps, so this is what
// Orca itself could pass. Lists without a "=" are left alone: FreeBSD
// splits those at commas too.

const childProcess = require('node:child_process')

const PS_PATHS = new Set(['ps', '/bin/ps', '/usr/bin/ps'])

function isPs(file) {
  return typeof file === 'string' && PS_PATHS.has(file)
}

function needsSplit(list) {
  return typeof list === 'string' && /=[^,]*,/.test(list)
}

// Rewrite one ps argument vector. Returns the same array when nothing
// had to change, so callers can tell.
function rewritePsArgs(args) {
  if (!Array.isArray(args)) {
    return args
  }
  const out = []
  let changed = false
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (typeof arg !== 'string' || !/^-[A-Za-z]+/.test(arg)) {
      out.push(arg)
      continue
    }
    // A cluster of single-letter flags, possibly ending in o with its list
    // attached or following: -o, -axo, -eo, -wwo, -opid=,...
    const m = /^-([A-Za-np-z]*)(o(.*))?$/.exec(arg)
    if (!m) {
      out.push(arg)
      continue
    }
    let flags = m[1]
    if (flags.includes('e')) {
      flags = flags.replace(/e/g, 'A')
      changed = true
    }
    if (m[2] === undefined) {
      out.push(flags === m[1] ? arg : `-${flags}`)
      continue
    }
    let list = m[3]
    let consumed = 0
    if (list === '' && i + 1 < args.length) {
      list = args[i + 1]
      consumed = 1
    }
    if (!needsSplit(list)) {
      if (flags !== m[1]) {
        out.push(`-${flags}o`)
        if (consumed) {
          out.push(list)
        } else if (list !== '') {
          out[out.length - 1] += list
        }
      } else {
        out.push(arg)
        if (consumed) {
          out.push(list)
        }
      }
      i += consumed
      continue
    }
    if (flags !== '') {
      out.push(`-${flags}`)
    }
    for (const column of list.split(',')) {
      out.push('-o', column)
    }
    i += consumed
    changed = true
  }
  return changed ? out : args
}

// `ps ...` handed to a shell, as exec() does. Only plain words are
// rewritten; anything with quoting or shell syntax is left alone.
function rewritePsCommand(command) {
  if (typeof command !== 'string') {
    return command
  }
  const m = /^(\s*)((?:\/usr)?(?:\/bin\/)?ps)(\s.*)?$/.exec(command)
  if (!m || !isPs(m[2]) || m[3] === undefined || /["'`$\\|&;<>(){}*?\n]/.test(m[3])) {
    return command
  }
  const words = m[3].trim().split(/\s+/)
  const rewritten = rewritePsArgs(words)
  return rewritten === words ? command : `${m[1]}${m[2]} ${rewritten.join(' ')}`
}

function wrapFileFunction(name) {
  const original = childProcess[name]
  if (typeof original !== 'function') {
    return
  }
  childProcess[name] = function (file, args, ...rest) {
    if (isPs(file) && Array.isArray(args)) {
      args = rewritePsArgs(args)
    }
    return original.call(this, file, args, ...rest)
  }
}

function wrapCommandFunction(name) {
  const original = childProcess[name]
  if (typeof original !== 'function') {
    return
  }
  childProcess[name] = function (command, ...rest) {
    return original.call(this, rewritePsCommand(command), ...rest)
  }
}

for (const name of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
  wrapFileFunction(name)
}
for (const name of ['exec', 'execSync']) {
  wrapCommandFunction(name)
}

module.exports = { rewritePsArgs, rewritePsCommand }

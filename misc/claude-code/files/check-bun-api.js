// check-bun-api.js <dir> - fail when the bundle installed in <dir> uses a Bun
// API that neither stock Bun nor bun-ant-freebsd.cjs provides.
//
// The bundle is built against Anthropic's own Bun, which is ahead of the
// releases and has private APIs besides. What goes missing does not always
// fail loudly -- without Bun.ant.CellSegmenter the TUI just stays blank -- so
// every release is checked against the bun it will run on.
'use strict';

const fs = require('fs');
const path = require('path');

const dir = process.argv[2];

require(path.join(dir, 'bun-ant-freebsd.cjs'));

// Absent on purpose. The bundle asks for the memory pressure level and
// (since 2.1.316) ttyName on macOS only, and for the sandbox deny-entries
// helper (since 2.1.301) and the folder security and process list helpers
// (since 2.1.316) on Windows only. posixFsAt (since 2.1.316) is checked for
// before use and the path-based calls are used without it.
// withThreadWorkingDirectory (since 2.1.317) starts ripgrep inside a directory
// held open with O_NOFOLLOW_ANY, which is macOS only (the constant is 0 in this
// bundle, so the directory is never held); it is checked for before use too.
// isVmContextGlobal (since 2.1.319) is asked, through ?.(), only about an
// object vm.isContext() does not recognise as a context's global; stock Bun's
// isContext() does, which is checked below.
// stringifyToBytes and stringifyToBytesFallbacks (since 2.1.330) serialise an
// API request body straight to bytes. The bundle checks for both before use
// and otherwise sends the body as it always has.
const absent = new Set([
	'ant.isVmContextGlobal',
	'ant.memoryPressureLevel',
	'ant.posixFsAt',
	'ant.stringifyToBytes',
	'ant.stringifyToBytesFallbacks',
	'ant.ttyName',
	'ant.windowsFolderSecurity',
	'ant.windowsProcessCreationTime',
	'ant.windowsProcessList',
	'ant.windowsSandboxDeniesArg',
	'ant.withThreadWorkingDirectory',
]);

const ref = /(?<![\w$.])Bun\??\.([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)?)/g;
const used = new Set();

(function scan(d) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		const f = path.join(d, e.name);

		if (e.isDirectory())
			scan(f);
		else if (e.name.endsWith('.js') || f === path.join(dir, 'cli'))
			for (const m of fs.readFileSync(f, 'utf8').matchAll(ref))
				used.add(m[1].replaceAll('?', ''));
	}
})(dir);

const missing = [...used].filter((name) => !absent.has(name) &&
    name.split('.').reduce((o, k) => o?.[k], Bun) === undefined).sort();

if (missing.length > 0) {
	console.error(`Bun ${Bun.version} lacks these APIs used by the bundle:`);
	for (const name of missing)
		console.error(`\tBun.${name}`);
	process.exit(1);
}

// The sandbox of the workflow and JavaScript tools (src/utils/vmHardening.ts)
// refuses to create a node:vm context unless vm.isContext() or
// Bun.ant.isVmContextGlobal recognises the context's global object, and its
// checks for values leaving the sandbox rely on the same test. Node's
// isContext() does not recognise that object; Bun's does, which is what makes
// isVmContextGlobal unnecessary here.
if (used.has('ant.isVmContextGlobal')) {
	const vm = require('vm');

	if (!vm.isContext(vm.runInContext('this', vm.createContext({})))) {
		console.error(`Bun ${Bun.version}: vm.isContext() no longer ` +
		    'recognises a context\'s global, so the bundle needs ' +
		    'Bun.ant.isVmContextGlobal');
		process.exit(1);
	}
}
console.log(`===>   Bun ${Bun.version} has the ${used.size} Bun APIs the bundle uses`);

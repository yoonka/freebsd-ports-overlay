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

// Absent on purpose. The bundle calls setJITPolicy through ?.(), and asks
// for the memory pressure level on macOS only.
const absent = new Set([
	'ant.memoryPressureLevel',
	'unsafe.setJITPolicy',
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
console.log(`===>   Bun ${Bun.version} has the ${used.size} Bun APIs the bundle uses`);

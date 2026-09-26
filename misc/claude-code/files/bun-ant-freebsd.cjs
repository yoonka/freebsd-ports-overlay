// bun-ant-freebsd.cjs - what the extracted claude-code bundle expects from
// Anthropic's own Bun build, provided on top of stock Bun on FreeBSD.
//
// post-extract makes this the first import of cli, so it is evaluated before
// any of the bundle in every process claude starts -- including the ones it
// starts itself as `bun cli ...`, which would not inherit a --preload.
'use strict';

const fs = require('fs');

// Text assets. The skills and docs the bundle does not compress, and a few
// script templates shipped as skill references, are loaded through
// import.meta.require: `var s = require("./SKILL-0vb5xk0r.md")`, then used as
// a string. Inside Anthropic's executable that returns the contents of the
// file. Stock Bun instead renders a .md to HTML, returns a .txt as a module
// namespace ({ default: ... }), and runs a .mjs -- so every bundled skill
// prompt comes out as "[object Module]". Loading them here as a module whose
// "module.exports" export is the text makes require() return the plain
// string again. Only the content-hashed assets beside this file are matched;
// that is how upstream names them, and it keeps the user's own files and the
// bundle's real modules out of it.
const assetRE = new RegExp('^' +
    __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '/[^/]+-[0-9a-z]{8}\\.(md|txt|mjs)$');

Bun.plugin({
	name: 'claude-code-text-assets',
	setup(build) {
		build.onLoad({ filter: assetRE }, (args) => {
			const text = fs.readFileSync(args.path, 'utf8');

			return ({
				exports: { default: text, 'module.exports': text },
				loader: 'object',
			});
		});
	},
});

// Bun.ant.CellSegmenter, which the Ink renderer has built its cell grid
// through since 2.1.271: clawgod's implementation, installed beside this file
// by the port. Requiring it is what installs it, and it creates Bun.ant.
require('./bun-ant-shim.cjs');

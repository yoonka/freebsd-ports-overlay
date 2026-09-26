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

// The rest of Bun.ant is small enough to do natively through bun:ffi. The
// library is only opened on first use.
let libc = null;

function c()
{
	if (libc === null) {
		const { dlopen, FFIType } = require('bun:ffi');

		libc = dlopen('libc.so.7', {
			getsockopt: {
				args: [FFIType.i32, FFIType.i32, FFIType.i32,
				    FFIType.ptr, FFIType.ptr],
				returns: FFIType.i32,
			},
			procctl: {
				args: [FFIType.i32, FFIType.i64, FFIType.i32,
				    FFIType.ptr],
				returns: FFIType.i32,
			},
		}).symbols;
	}
	return (libc);
}

if (process.platform === 'freebsd') {
	const { ptr } = require('bun:ffi');
	const ant = Bun.ant ??= {};

	// Peer credentials of a connected Unix socket. The daemon compares
	// getPeerUid() with its own uid to refuse control connections from
	// other users; without it that check is skipped. Clients compare
	// getPeerPid() with the pid the daemon registered before they send.
	//
	// struct xucred from <sys/ucred.h>, the same on amd64 and aarch64:
	// cr_version at 0 (XUCRED_VERSION is 0), cr_uid at 4, cr_pid at 80,
	// 88 bytes in all.
	const SOL_LOCAL = 0, LOCAL_PEERCRED = 1, XUCRED_SIZE = 88;

	const peercred = (fd) => {
		const buf = new Uint8Array(XUCRED_SIZE);
		const len = new Uint32Array([XUCRED_SIZE]);

		if (c().getsockopt(fd, SOL_LOCAL, LOCAL_PEERCRED, ptr(buf),
		    ptr(len)) !== 0)
			throw new Error('getsockopt(LOCAL_PEERCRED) failed');

		const dv = new DataView(buf.buffer);

		if (len[0] !== XUCRED_SIZE || dv.getUint32(0, true) !== 0)
			throw new Error('unexpected struct xucred');
		return (dv);
	};

	if (typeof ant.getPeerUid !== 'function')
		ant.getPeerUid = (fd) => peercred(fd).getUint32(4, true);
	if (typeof ant.getPeerPid !== 'function')
		ant.getPeerPid = (fd) => {
			const pid = peercred(fd).getInt32(80, true);

			return (pid > 0 ? pid : null);
		};

	// prctl(PR_SET_DUMPABLE) on Linux, used by the agent proxy of remote
	// sessions to keep its token out of reach of ptrace and core dumps.
	// PROC_TRACE_CTL_DISABLE is the equivalent: like the Linux flag it is
	// inherited across fork(2) and dropped again on execve(2), so the
	// commands claude runs stay debuggable.
	const P_PID = 0, PROC_TRACE_CTL = 7;
	const PROC_TRACE_CTL_ENABLE = 1, PROC_TRACE_CTL_DISABLE = 2;

	if (typeof ant.setDumpable !== 'function')
		ant.setDumpable = (on) => {
			const v = new Int32Array([on ?
			    PROC_TRACE_CTL_ENABLE : PROC_TRACE_CTL_DISABLE]);

			return (c().procctl(P_PID, BigInt(process.pid),
			    PROC_TRACE_CTL, ptr(v)) === 0);
		};
}

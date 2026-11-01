# Maintaining this overlay

Instructions for anyone, human or agent, updating the ports in this
overlay. Poudriere ignores everything here that is not a
`<category>/<port>` directory or `Mk/`, so this file, `CLAUDE.md`,
`UIDs`, `GIDs` and `notes/` do not affect builds.

The usual request is "update the overlay ports to the latest upstream".
To do that, check every port in the table, update the ones that are
behind by following their section below, validate each with testport,
update `notes/`, and stop before committing.

## Ground rules

- **Never commit, push or stage without asking.** Propose a commit
  message instead, one commit per port: `category/port: update to X.Y.Z`
  with a body saying what besides the version changed and why.
- The checkout belongs to the maintainer's user, not root. Run git as
  that user, and `chown` anything you create or edit as root back to it.
  `git status` must not show root-owned files, and there must be no
  `work/` directories.
- Never leave backups (`*.orig`, `*.bak`) inside the tree.
- Validate with `poudriere testport`, not `bulk`. Only testport runs
  stage-qa and check-plist, and check-plist is what notices upstream
  adding or dropping a file. A stale pkg-plist passes `bulk` silently.
- Don't add ports to pkglists or change saved options as part of an
  update unless asked.
- Each port in `notes/` has review notes (written for FreeBSD Bugzilla
  submissions). Update them whenever the port changes.

## Ports

| Port | Upstream | How it is built |
|---|---|---|
| databases/oxigraph | github.com/oxigraph/oxigraph | cargo, 3 git submodules via GH_TUPLE |
| lang/bun | github.com/oven-sh/bun releases | official FreeBSD binaries, no build |
| mail/feather | github.com/yoonka/feather | mix release; Hex deps vendored in a fetch hook |
| misc/claude-code | npm @anthropic-ai/claude-code-linux-x64 | JS unpacked from the Linux binary, run on lang/bun |
| security/zitadel | github.com/zitadel/zitadel | Go + pnpm/Angular console; buf and pnpm caches in fetch hooks |
| net/livekit-server | github.com/livekit/livekit | Go modules, CGO off |
| multimedia/livekit-ingress | github.com/livekit/ingress | Go modules + CGO GStreamer |
| multimedia/livekit-egress | github.com/livekit/egress | Go modules + CGO GStreamer, optional Chromium |

Not ported yet: livekit/rust-sdks (its liblivekit_ffi needs Google's
libwebrtc, which has no FreeBSD build).

Find the latest release of a GitHub project with
`fetch -qo - https://api.github.com/repos/OWNER/REPO/releases?per_page=5 | jq -r '.[].tag_name'`.
Use releases, not raw tags, because repos carry stray tags (feather has
a `v1.82` that is not a release). For claude-code use
`make -C misc/claude-code find-new-version` or
`https://downloads.claude.ai/claude-code-releases/latest`.

## Building and testing

The overlay is used as a poudriere overlay: it is registered as a ports
tree (method null) and passed to builds with `-O`. Where the build host
keeps its trees, jails and sets, and the exact commands, is in the
maintainer's local notes, not in this repository; don't add host
details here.

```sh
# test one port (repeat per port)
poudriere testport -j <jail> -p <base tree> -z <set> -O <this overlay> [-O <other overlays>] <category/port>
```

- Pass every overlay the set is normally built with, in every bulk.
  Without them the repository sanity check deletes the overlay packages
  as stale. Ports here must not depend on ports from any other overlay.
- Poudriere cannot run two builds of the same jail and set at once. When
  several testports run in parallel (for example from several agents),
  serialise them with
  `lockf -k <some lock file> poudriere testport ...`.
- testport builds missing dependency packages into the repository. That
  is expected.
- If the base tree used for builds is older than a port's addition to
  FreeBSD, the port has to be copied into the overlay.

### Running make outside poudriere

For `makesum`, `cargo-crates` and similar targets, run make on the build
host like this:

```sh
make -C <category/port> PORTSDIR=<base ports tree> \
    DISTDIR=<poudriere's DISTFILES_CACHE> WRKDIRPREFIX=<scratch dir> \
    NO_DEPENDS=yes BATCH=yes makesum
```

- `WRKDIRPREFIX` keeps a root-owned `work/` out of the checkout.
- `DISTDIR` makes the files land in poudriere's distfile cache rather
  than in the base tree's `distfiles/`.
- `NO_DEPENDS` and `BATCH` stop make from trying to build toolchains
  on the host and hanging in `make config`.
- Ports with fetch hooks (feather, zitadel) also need `_USES_fetch=`,
  so that makesum doesn't run the hook on the host.

### Fetch hooks must be deterministic

Poudriere copies only the files listed in distinfo between its cache
and the builder. Anything a fetch hook generates is thrown away, so
the hook runs again, with network, on every build. Go ports also
re-download their module cache on every build. A hook that resolves
"latest" (such as `buf dep update` or `npm install` without a frozen
lockfile) will break the build later, when upstream moves. Always
install from the lockfile the build uses. Test a hook offline with
`HTTPS_PROXY=http://127.0.0.1:1`.

### Users and groups

`UIDs` and `GIDs` at the top level hold this overlay's allocations.
Ports use them with

```make
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs
```

To add a user, take a number free in both these files and the base
tree's `UIDs`/`GIDs`. Check all existing ones again whenever the base
tree is updated: upstream has taken numbers we used before.

## Per-port procedures

### lang/bun

1. Bump `DISTVERSION` and run makesum. Through `.if make(makesum)` it
   fetches both the amd64 and the aarch64 archives.
2. Compare the distinfo checksums with the release's `SHASUMS256.txt`.
3. Compare the binaries of `bun-freebsd-x64-baseline.zip` and
   `bun-freebsd-x64.zip`; they have been byte-identical so far. If they
   ever differ, update the Makefile comment and reconsider offering
   both.
4. Run `readelf -n` / `-V` on the binary. Note the ABI tag and the
   highest `FBSD_1.x` symbol version in `notes/lang-bun.txt`.
5. testport lang/bun first, then misc/claude-code, which builds and
   runs against it.

### misc/claude-code

`notes/misc-claude-code-updates.txt` has the full procedure and a
failure table. In short:

1. Run `make find-new-version`, then makesum. Check the tarball against
   the npm `dist.integrity`.
2. Run testport. It usually fails in one of two ways:
   - **`check-bun-api.js` lists missing APIs.** The bundle calls an
     Anthropic-private `Bun.ant.*` (or `Bun.*`) API that stock Bun
     lacks. To see how each one is used, extract the port (archivers/
     unhare is needed; it can be unpacked from the repo's package
     into a scratch dir and put on PATH) and grep the chunks under
     `work/extracted-js/root`.
     - If the API is feature-detected, or only reached on Windows or
       macOS, add it to the `absent` set in `files/check-bun-api.js`,
       with the reason in the comment.
     - Otherwise implement it in `files/bun-ant-freebsd.cjs` through
       `bun:ffi`. Test it for real, not just that it loads.
   - **check-plist.** Add or remove the stable-named file in pkg-plist.
     For a new kind of content-hashed file, add a pattern to
     post-install instead.
3. Check whether the clawgod shim pin is still current:
   `https://api.github.com/repos/0Chencc/clawgod/commits?path=src/shared/bun-ant-shim.cjs`.
4. Smoke-test the TUI as described in the updates notes. It must reach
   the theme picker; a blank screen means the CellSegmenter contract
   changed.
5. Update `notes/misc-claude-code.txt`: the version, the new APIs and
   what was done with each, the embedded Bun version
   (`strings work/package/claude | grep 'Bun v'`), and the test summary.

### databases/oxigraph

1. Check the submodule pins at the new tag, using `git ls-tree <tag>`
   on `oxrocksdb-sys/rocksdb`, `oxrocksdb-sys/lz4` and
   `cli/templates/yasgui`. Update `GH_TUPLE` if they moved.
2. Bump, then `makesum`, `extract`, and
   `make cargo-crates > Makefile.crates`. Run `makesum` again.
3. Check that `files/patch-*` still applies, and whether the CLI
   subcommands changed: `_MAN1_PAGES` lists one man page per
   subcommand.

### mail/feather

1. Diff the release against the previous one. Look at `mix.exs`,
   `mix.lock`, and `config/examples/server.exs` (which
   `files/server.exs.sample` mirrors, except for the TLS paths), and
   check for any new directory the server writes to.
2. Upstream's `VERSION` file is not bumped. The port passes
   `FEATHER_VERSION=${DISTVERSION}`; check that the testport log shows
   `assembling feather-<version>`.
3. The fetch hook vendors Hex deps with network on every build (see
   above).
4. Since 1.1.0 the optional mail queue spools under
   `/var/spool/feather`, which the port creates
   (feather:feather 0700).

### security/zitadel

1. Diff the new tag against the old one for everything the Makefile
   pins:
   - `files/packagejsons/`: copies of upstream's package.json,
     pnpm-lock.yaml and workspace files, used by the pnpm prefetch.
     Recopy any that changed.
   - `_PNPM_VER` against `packageManager` in package.json.
   - the Go tool versions against `apps/api/project.json`.
   - `files/patch-proto-buf.lock` against `proto/buf.lock`.
   - the console plugin versions against
     `console/scripts/install-proto-plugins.sh`.
   - the `go` directive in go.mod against `USES=go:`.
   - `.nvmrc` against the node version.
2. Run makesum with `_USES_fetch=` (see above). The fetch hooks build
   the buf cache from the pinned buf.lock with `buf build`. Never use
   `buf dep update`.

### LiveKit: net/livekit-server, multimedia/livekit-ingress, multimedia/livekit-egress

- Go modules ports. Bump, makesum, testport. The version is a constant
  in upstream's `version/version.go`, so it needs no ldflags.
- All three carry the same two patches to the vendored
  `github.com/livekit/protocol/utils/hwstats`: a FreeBSD CPU monitor
  reading `kern.cp_time` (`cpu_freebsd.go`), and freebsd excluded from
  the build tag of `cpu_null.go`. Keep the patches identical across the
  three ports. If livekit/protocol changes hwstats, rebase them once and
  copy them.
- ingress and egress link GStreamer through go-gst. Their Makefiles say
  which elements each `USE_GSTREAMER` component provides. When upstream
  adds an element to a pipeline, map it to the plugin port and add it.
- ingress's `files/patch-pkg_service_cmd.go` and egress's
  `files/patch-pkg_server_server__rpc.go` make the per-session re-exec use
  `%%PREFIX%%/bin/livekit-ingress` / `livekit-egress`, which post-patch
  substitutes. Upstream runs `ingress` / `egress` from PATH.
- egress has a CHROME option (default on amd64) for room-composite and
  web egress: Chromium in Xvfb with a private PulseAudio started by the
  rc script. With it, a fetch hook prefetches `template-default`'s pnpm
  store from its lockfile (`--frozen-lockfile`, timestamps normalised),
  and pre-build runs `vite build` into `cmd/server/templates`, as
  upstream's Dockerfile does. Without it a placeholder fills the
  `go:embed` directory, and the port must not depend on X11 servers,
  Chromium, PulseAudio or node. Check both variants after an update:
  testport with the option on, and `make -V RUN_DEPENDS -V BUILD_DEPENDS`
  with it off. On an update, compare `pnpm-lock.yaml`, `_PNPM_VER`
  against `packageManager`, and the patched files in `pkg/pipeline/source`
  (Xvfb flags, Chrome path and features, pactl path).
- egress records audio from Chromium through PulseAudio, so www/chromium
  must be built with its PULSEAUDIO option.
- The UIDs are livekit 590, livekit-egress 591 and livekit-ingress 592.

## Before handing back

- Every changed port has passed testport. Give the log paths.
- `git status` (run as the maintainer's user) shows only the intended
  files. Nothing is owned by root, and there is no `work/`.
- `notes/` is updated.
- Write a proposed commit message per port, and list anything left
  open.

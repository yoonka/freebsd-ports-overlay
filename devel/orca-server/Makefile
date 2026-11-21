PORTNAME=	orca-server
DISTVERSION=	1.4.268
CATEGORIES=	devel
MASTER_SITES=	https://github.com/stablyai/orca/releases/download/v${DISTVERSION}/:server \
		https://registry.npmjs.org/node-pty/-/:pty \
		https://registry.npmjs.org/@parcel/watcher/-/:watcher \
		https://registry.npmjs.org/node-addon-api/-/:napi \
		https://raw.githubusercontent.com/stablyai/orca/v${DISTVERSION}/:raw
DISTFILES=	${SERVER_TARBALL}:server \
		node-pty-${NODE_PTY_VERSION}.tgz:pty \
		watcher-${PARCEL_WATCHER_VERSION}.tgz:watcher \
		node-addon-api-${NODE_ADDON_API_VERSION}.tgz:napi \
		native/journal-file-lock/main.c:raw \
		native/provider-exec/provider-exec.c:raw
# The two C programs are helpers the server runs, built here in place of
# the Linux binaries in the tarball.
# Upstream builds node-pty with a patch of its own; the server's node-pty
# JavaScript in the tarball is already patched, so the addon has to be too.
PATCH_SITES=	https://raw.githubusercontent.com/stablyai/orca/v${DISTVERSION}/config/patches/
PATCHFILES=	node-pty@${NODE_PTY_VERSION}.patch:-p1
# The server tarball and the node-pty patch keep their names from one
# release to the next, so each release gets its own directory.
DIST_SUBDIR=	${PORTNAME}/${DISTVERSION}
EXTRACT_ONLY=	node-pty-${NODE_PTY_VERSION}.tgz

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Orca agent IDE server (orca serve) for remote desktop clients
WWW=		https://github.com/stablyai/orca

LICENSE=	MIT
LICENSE_FILE=	${WRKDIR}/LICENSE

BUILD_DEPENDS=	npm${NODEJS_SUFFIX}>0:www/npm${NODEJS_SUFFIX}
RUN_DEPENDS=	git:devel/git \
		lsof:sysutils/lsof \
		rg:textproc/ripgrep

USES=		gmake nodejs:24,build,run python:build
USE_RC_SUBR=	orca_server

# Both install bin/orca-ide and serve on the same port.
CONFLICTS_INSTALL=	orca-ide

# The JavaScript comes from the linux-x64 tarball on every architecture: it
# is the same everywhere, and the native addons and helpers are built here.
ONLY_FOR_ARCHS=		aarch64 amd64
ONLY_FOR_ARCHS_REASON=	not tested elsewhere; aarch64 is expected to work but untested

# Versions of the native modules the release was built with, from its
# pnpm-lock.yaml. `make find-new-version` updates them with DISTVERSION, and
# post-extract checks node-pty against the copy in the tarball.
NODE_PTY_VERSION=	1.1.0
PARCEL_WATCHER_VERSION=	2.5.6
NODE_ADDON_API_VERSION=	7.1.1

SERVER_TARBALL=	orca-server-linux-x64.tar.gz
WRKSRC=		${WRKDIR}/package
WATCHER_WRKSRC=	${WRKDIR}/watcher
# The helpers' sources, laid out by post-extract as native/<helper>/.
NATIVE_WRKSRC=	${WRKDIR}/native
# The server tree assembled by post-extract from the tarball.
APPSRC=		${WRKDIR}/app
APPDIR=		${PREFIX}/lib/${PORTNAME}
NODE_GYP=	${LOCALBASE}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js
NODE_ARCH=	${ARCH:S/amd64/x64/:S/aarch64/arm64/}

USERS=		orca
GROUPS=		orca
# The orca user's home, from UIDs.
ORCA_HOME=	/var/db/orca
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

SCRIPTS_ENV+=	APPSRC=${APPSRC} DISTFILES_DIR=${_DISTDIR} \
		DISTVERSION=${DISTVERSION} NODE_PTY_VERSION=${NODE_PTY_VERSION} \
		PARCEL_WATCHER_VERSION=${PARCEL_WATCHER_VERSION} \
		NODE_ADDON_API_VERSION=${NODE_ADDON_API_VERSION} \
		NATIVE_WRKSRC=${NATIVE_WRKSRC} SERVER_TARBALL=${SERVER_TARBALL} \
		WATCHER_WRKSRC=${WATCHER_WRKSRC}

SUB_FILES=	orca-ide pkg-message
SUB_LIST=	APPDIR=${APPDIR} NODE=${LOCALBASE}/bin/node ORCA_HOME=${ORCA_HOME} \
		RCNAME=${USE_RC_SUBR}
PLIST_SUB=	NODE_ARCH=${NODE_ARCH} ORCA_HOME=${ORCA_HOME}

# Updates DISTVERSION and the native module versions to the latest release.
find-new-version:
	@${SH} ${SCRIPTDIR}/find-new-version ${.CURDIR}/Makefile

# The helpers' sources are not under WRKSRC, where the framework applies
# patches.
post-patch:
	cd ${WRKDIR} && ${PATCH} --forward --quiet -E -p0 \
		< ${FILESDIR}/extra-patch-native_journal-file-lock_main.c

do-build:
	for d in ${WRKSRC} ${WATCHER_WRKSRC}; do \
		cd $${d} && ${SETENV} ${MAKE_ENV} PYTHON=${PYTHON_CMD} \
		${LOCALBASE}/bin/node ${NODE_GYP} rebuild --release \
		--nodedir=${LOCALBASE} --jobs=${MAKE_JOBS_NUMBER} || exit 1; \
	done
	# The helpers: journal-file-lock holds an SQLite database's lock while
	# orcad retires it, and orca-provider-exec supervises agent CLIs.
	${CC} ${CFLAGS} ${LDFLAGS} \
		-o ${NATIVE_WRKSRC}/journal-file-lock/journal-file-lock \
		${NATIVE_WRKSRC}/journal-file-lock/main.c
	${CC} ${CFLAGS} ${LDFLAGS} \
		-o ${NATIVE_WRKSRC}/provider-exec/orca-provider-exec \
		${NATIVE_WRKSRC}/provider-exec/provider-exec.c
	# Fail here if a release calls ps(1) in a way freebsd-compat.cjs does not
	# rewrite.
	${LOCALBASE}/bin/node ${FILESDIR}/check-ps-calls.cjs \
		${FILESDIR}/freebsd-compat.cjs ${APPSRC}

do-install:
	@${MKDIR} ${STAGEDIR}${APPDIR}
	cd ${APPSRC} && ${COPYTREE_SHARE} . ${STAGEDIR}${APPDIR}
	@${MKDIR} ${STAGEDIR}${APPDIR}/node_modules/node-pty/build/Release
	${INSTALL_LIB} ${WRKSRC}/build/Release/pty.node \
		${STAGEDIR}${APPDIR}/node_modules/node-pty/build/Release
	${INSTALL_LIB} ${WATCHER_WRKSRC}/build/Release/watcher.node \
		${STAGEDIR}${APPDIR}/node_modules/@parcel/watcher
	# Where orcad looks for them: journal-file-lock beside pty.node, and
	# orca-provider-exec in bin/ under its install directory.
	${INSTALL_PROGRAM} ${NATIVE_WRKSRC}/journal-file-lock/journal-file-lock \
		${STAGEDIR}${APPDIR}/node_modules/node-pty/build/Release
	@${MKDIR} ${STAGEDIR}${APPDIR}/bin
	${INSTALL_PROGRAM} ${NATIVE_WRKSRC}/provider-exec/orca-provider-exec \
		${STAGEDIR}${APPDIR}/bin
	${INSTALL_DATA} ${FILESDIR}/freebsd-compat.cjs ${STAGEDIR}${APPDIR}
	# orcad runs the rg it finds at ripgrep/<platform>-<arch>/rg in its
	# install directory; give it the system one.
	@${MKDIR} ${STAGEDIR}${APPDIR}/ripgrep/freebsd-${NODE_ARCH}
	${LN} -sf ${LOCALBASE}/bin/rg \
		${STAGEDIR}${APPDIR}/ripgrep/freebsd-${NODE_ARCH}/rg
	${INSTALL_SCRIPT} ${WRKDIR}/orca-ide ${STAGEDIR}${PREFIX}/bin
	@${MKDIR} ${STAGEDIR}${ORCA_HOME}

post-install:
	# The mobile web bundle names its assets and message catalogs by content
	# hash, so they are listed here instead of in pkg-plist.
	cd ${STAGEDIR}${PREFIX} && ${FIND} -s \
		lib/${PORTNAME}/out/mobile-web/assets \
		lib/${PORTNAME}/out/mobile-web/catalogs -type f >> ${TMPPLIST}

.include <bsd.port.mk>

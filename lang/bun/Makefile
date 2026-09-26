PORTNAME=	bun
DISTVERSION=	1.4.2
CATEGORIES=	lang
MASTER_SITES=	https://github.com/oven-sh/bun/releases/download/bun-v${DISTVERSION}/
DIST_SUBDIR=	${PORTNAME}-${DISTVERSION}

MAINTAINER=	yuri@FreeBSD.org
COMMENT=	JavaScript runtime, bundler, test runner, and package manager
WWW=		https://bun.com/ \
		https://github.com/oven-sh/bun

LICENSE=	LGPL20

ONLY_FOR_ARCHS=		aarch64 amd64
ONLY_FOR_ARCHS_REASON=	upstream publishes FreeBSD binaries for these architectures only

USES=		zip

NO_BUILD=	yes
STRIP=		# installed as released

CONFLICTS_INSTALL=	bun-linux

# The official FreeBSD release builds. For amd64 the baseline build is used,
# which runs on any x86-64 CPU; as of 1.4.2 it is the same binary as the
# non-baseline bun-freebsd-x64.zip anyway.
DISTFILES_aarch64=	bun-freebsd-aarch64.zip
DISTFILES_amd64=	bun-freebsd-x64-baseline.zip
.if make(makesum)
DISTFILES=	${DISTFILES_aarch64} ${DISTFILES_amd64}
.else
DISTFILES=	${DISTFILES_${ARCH}}
.endif
WRKSRC=		${WRKDIR}/${DISTFILES_${ARCH}:R}

PLIST_FILES=	bin/bun \
		bin/bunx

do-install:
	${INSTALL_PROGRAM} ${WRKSRC}/bun ${STAGEDIR}${PREFIX}/bin
	# bun behaves as bunx when started under that name
	${RLN} ${STAGEDIR}${PREFIX}/bin/bun ${STAGEDIR}${PREFIX}/bin/bunx

do-test:
	${STAGEDIR}${PREFIX}/bin/bun --revision
	${STAGEDIR}${PREFIX}/bin/bun -e 'console.log(require("bun:ffi").dlopen("libc.so.7", \
		{ getpid: { returns: "i32" } }).symbols.getpid() === process.pid)'

.include <bsd.port.mk>

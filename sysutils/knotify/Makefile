PORTNAME=	knotify
CATEGORIES=	sysutils

MAINTAINER=	ports@FreeBSD.org
COMMENT=	File system watcher reporting changes as JSON or Erlang terms

USES=		cargo

PLIST_FILES=	bin/knotify
PORTDOCS=	README.md protocol.md

OPTIONS_DEFINE=	DOCS

.include "${.CURDIR}/Makefile.beamports"
.include <bsd.port.options.mk>

# knotify watches through inotify(2) on FreeBSD.
.if ${OPSYS} == FreeBSD && ${OSVERSION} < 1500050
IGNORE=		needs inotify(2), which FreeBSD 15.0 added
.endif

post-install-DOCS-on:
	@${MKDIR} ${STAGEDIR}${DOCSDIR}
	${INSTALL_DATA} ${WRKSRC}/README.md ${WRKSRC}/docs/protocol.md \
		${STAGEDIR}${DOCSDIR}

.include <bsd.port.mk>

PORTNAME=	knotify
CATEGORIES=	sysutils

MAINTAINER=	ports@FreeBSD.org
COMMENT=	File system watcher reporting changes as JSON or Erlang terms

USES=		cargo

PLIST_FILES=	bin/knotify
PORTDOCS=	README.md protocol.md

OPTIONS_DEFINE=	DOCS

post-install-DOCS-on:
	@${MKDIR} ${STAGEDIR}${DOCSDIR}
	${INSTALL_DATA} ${WRKSRC}/README.md ${WRKSRC}/docs/protocol.md \
		${STAGEDIR}${DOCSDIR}

.include "${.CURDIR}/Makefile.beamports"
.include <bsd.port.mk>

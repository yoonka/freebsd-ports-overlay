PORTNAME=	knotify
DISTVERSIONPREFIX=	v
DISTVERSION=	1.1.0
CATEGORIES=	sysutils

MAINTAINER=	ports@FreeBSD.org
COMMENT=	File system watcher reporting changes as JSON or Erlang terms
WWW=		https://github.com/yoonka/beamports

LICENSE=	BSD3CLAUSE
LICENSE_FILE=	${WRKSRC}/../LICENSE

USES=		cargo
USE_GITHUB=	yes
GH_ACCOUNT=	yoonka
GH_PROJECT=	beamports

# knotify is one directory of the beamports repository, whose tags
# release all of its projects at one version.
WRKSRC_SUBDIR=	knotify

PLIST_FILES=	bin/knotify
PORTDOCS=	README.md protocol.md

OPTIONS_DEFINE=	DOCS

post-install-DOCS-on:
	@${MKDIR} ${STAGEDIR}${DOCSDIR}
	${INSTALL_DATA} ${WRKSRC}/README.md ${WRKSRC}/docs/protocol.md \
		${STAGEDIR}${DOCSDIR}

.include <bsd.port.mk>

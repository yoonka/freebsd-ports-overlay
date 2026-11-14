PORTNAME=	duckport
DISTVERSIONPREFIX=	v
DISTVERSION=	1.1.0
CATEGORIES=	databases

MAINTAINER=	ports@FreeBSD.org
COMMENT=	SQL analytics CLI bridge to DuckDB for Elixir/BEAM applications
WWW=		https://github.com/yoonka/beamports

LICENSE=	BSD3CLAUSE
LICENSE_FILE=	${WRKSRC}/../LICENSE

USES=		cargo
USE_GITHUB=	yes
GH_ACCOUNT=	yoonka
GH_PROJECT=	beamports

# duckport is one directory of the beamports repository, whose tags
# release all of its projects at one version.
WRKSRC_SUBDIR=	duckport

PLIST_FILES=	bin/duckport

.include <bsd.port.mk>

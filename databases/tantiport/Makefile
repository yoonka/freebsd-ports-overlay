PORTNAME=	tantiport
CATEGORIES=	databases

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Full-text search CLI bridge to Tantivy for Elixir/BEAM applications

# zstd-sys links the system zstd: cargo.mk sets ZSTD_SYS_USE_PKG_CONFIG.
LIB_DEPENDS=	libzstd.so:archivers/zstd
USES=		cargo

PLIST_FILES=	bin/tantiport

.include "${.CURDIR:H:H}/sysutils/knotify/Makefile.beamports"
.include <bsd.port.mk>

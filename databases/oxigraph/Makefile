PORTNAME=	oxigraph
DISTVERSIONPREFIX=	v
DISTVERSION=	0.5.7
CATEGORIES=	databases

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Graph database and SPARQL toolkit with HTTP server
WWW=		https://oxigraph.org/

LICENSE=	MIT APACHE20
LICENSE_COMB=	dual
LICENSE_FILE_MIT=	${WRKSRC}/LICENSE-MIT
LICENSE_FILE_APACHE20=	${WRKSRC}/LICENSE-APACHE

ONLY_FOR_ARCHS=	amd64 aarch64

# oxrocksdb-sys needs libclang for bindgen
BUILD_DEPENDS=	llvm-config${LLVM_DEFAULT}:devel/llvm${LLVM_DEFAULT}

USES=		cargo ssl

USE_GITHUB=	yes
# Git submodules not included in the GitHub tarball
GH_TUPLE=	facebook:rocksdb:a90855425128906216b7820de49ab81afe830700:rocksdb/oxrocksdb-sys/rocksdb \
		lz4:lz4:ebb370ca83af193212df4dcbadcc5d87bc0de2f0:lz4/oxrocksdb-sys/lz4 \
		oxigraph:yasgui-release:05a7ac428edeab35e40f66cafe0589ac9d224ee6:yasgui/cli/templates/yasgui

CARGO_INSTALL_PATH=	cli
CARGO_BUILD_ARGS=	-p oxigraph-cli
CARGO_ENV=	LIBCLANG_PATH=${LOCALBASE}/llvm${LLVM_DEFAULT}/lib

USERS=		oxigraph
GROUPS=		oxigraph
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

USE_RC_SUBR=	oxigraph

PLIST_SUB=	OXIGRAPH_DBDIR=${OXIGRAPH_DBDIR}
SUB_LIST=	OXIGRAPH_USER=${USERS} \
		OXIGRAPH_GROUP=${GROUPS} \
		OXIGRAPH_DBDIR=${OXIGRAPH_DBDIR}

OXIGRAPH_DBDIR?=	/var/db/oxigraph

_MAN1_PAGES=	oxigraph \
		oxigraph-backup \
		oxigraph-convert \
		oxigraph-dump \
		oxigraph-load \
		oxigraph-optimize \
		oxigraph-query \
		oxigraph-serve \
		oxigraph-serve-read-only \
		oxigraph-update

post-install:
.for _mp in ${_MAN1_PAGES}
	@${FIND} ${WRKDIR}/target -name "${_mp}.1" -path "*/oxigraph-cli-*/out/man/*" \
		-exec ${INSTALL_MAN} {} ${STAGEDIR}${PREFIX}/share/man/man1/ \;
.endfor
	@${MKDIR} ${STAGEDIR}${OXIGRAPH_DBDIR}

.include "Makefile.crates"
.include <bsd.port.mk>

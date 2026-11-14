PORTNAME=	oxiport
DISTVERSIONPREFIX=	v
DISTVERSION=	1.1.0
CATEGORIES=	databases

MAINTAINER=	ports@FreeBSD.org
COMMENT=	RDF/SPARQL CLI bridge to Oxigraph for Elixir/BEAM applications
WWW=		https://github.com/yoonka/beamports

LICENSE=	BSD3CLAUSE
LICENSE_FILE=	${WRKSRC}/../LICENSE

# RocksDB (oxrocksdb-sys) needs libclang for bindgen.
BUILD_DEPENDS=	llvm-config${LLVM_DEFAULT}:devel/llvm${LLVM_DEFAULT}
USES=		cargo
USE_GITHUB=	yes
GH_ACCOUNT=	yoonka
GH_PROJECT=	beamports

# oxiport is one directory of the beamports repository, whose tags
# release all of its projects at one version.
WRKSRC_SUBDIR=	oxiport

CARGO_ENV=	LIBCLANG_PATH=${LOCALBASE}/llvm${LLVM_DEFAULT}/lib
# Keep upstream's Cargo.lock. Re-resolving against the vendored crates
# moves bindgen (syn ">=2, <4") to syn 3, which its prettyplease (syn 2)
# cannot take: cargo.mk's "cargo update" updates only the workspace, and
# "cargo install" uses the lock file.
CARGO_UPDATE_ARGS=	--workspace
CARGO_INSTALL_ARGS=	--locked

PLIST_FILES=	bin/oxiport

.include <bsd.port.mk>

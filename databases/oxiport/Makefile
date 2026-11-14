PORTNAME=	oxiport
CATEGORIES=	databases

MAINTAINER=	ports@FreeBSD.org
COMMENT=	RDF/SPARQL CLI bridge to Oxigraph for Elixir/BEAM applications

# RocksDB (oxrocksdb-sys) needs libclang for bindgen.
BUILD_DEPENDS=	llvm-config${LLVM_DEFAULT}:devel/llvm${LLVM_DEFAULT}
USES=		cargo

CARGO_ENV=	LIBCLANG_PATH=${LOCALBASE}/llvm${LLVM_DEFAULT}/lib
# Keep upstream's Cargo.lock. Re-resolving against the vendored crates
# moves bindgen (syn ">=2, <4") to syn 3, which its prettyplease (syn 2)
# cannot take: cargo.mk's "cargo update" updates only the workspace, and
# "cargo install" uses the lock file.
CARGO_UPDATE_ARGS=	--workspace
CARGO_INSTALL_ARGS=	--locked

PLIST_FILES=	bin/oxiport

.include "${.CURDIR:H:H}/sysutils/knotify/Makefile.beamports"
.include <bsd.port.mk>

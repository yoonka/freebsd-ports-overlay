PORTNAME=	oxiport
CATEGORIES=	databases

MAINTAINER=	ports@FreeBSD.org
COMMENT=	RDF/SPARQL CLI bridge to Oxigraph for Elixir/BEAM applications

# RocksDB (oxrocksdb-sys) needs libclang for bindgen.
BUILD_DEPENDS=	llvm-config${LLVM_DEFAULT}:devel/llvm${LLVM_DEFAULT}
USES=		cargo

CARGO_ENV=	LIBCLANG_PATH=${LOCALBASE}/llvm${LLVM_DEFAULT}/lib

PLIST_FILES=	bin/oxiport

.include "${.CURDIR:H:H}/sysutils/knotify/Makefile.beamports"
.include <bsd.port.mk>

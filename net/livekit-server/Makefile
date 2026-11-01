PORTNAME=	livekit-server
DISTVERSIONPREFIX=	v
DISTVERSION=	1.13.11
CATEGORIES=	net

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Scalable WebRTC SFU and signaling server
WWW=		https://livekit.com/ \
		https://github.com/livekit/livekit

LICENSE=	APACHE20
LICENSE_FILE=	${WRKSRC}/LICENSE

USES=		go:1.26+,modules

USE_GITHUB=	yes
GH_ACCOUNT=	livekit
GH_PROJECT=	livekit
# The module path differs from the repository name.
GO_MODULE=	github.com/livekit/livekit-server
GO_MOD_DIST=	github
GO_TARGET=	./cmd/server:livekit-server

# Upstream release builds (.goreleaser.yaml) are pure Go; the version is a
# constant in version/version.go, so no -X ldflags are needed.
CGO_ENABLED=	0

USERS=		livekit
GROUPS=		livekit
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

USE_RC_SUBR=	livekit

ETCDIR=		${PREFIX}/etc/livekit

SUB_FILES=	pkg-message
SUB_LIST=	LIVEKIT_USER=${USERS} \
		LIVEKIT_GROUP=${GROUPS}
PLIST_SUB=	LIVEKIT_GROUP=${GROUPS}

post-install:
	@${MKDIR} ${STAGEDIR}${ETCDIR}
	${INSTALL_DATA} ${WRKSRC}/config-sample.yaml \
		${STAGEDIR}${ETCDIR}/livekit.yaml.sample

# Upstream's "mage test" (go test -short ./...), minus pkg/service, which
# starts Redis through Docker (dockertest), and test/, which needs a Redis
# server on localhost:6379.
do-test:
	cd ${GO_WRKSRC} && ${SETENVI} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOPROXY=off ${GO_CMD} test -mod=vendor -buildvcs=false \
		-short -count=1 \
		$$(${SETENVI} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} GOPROXY=off \
		${GO_CMD} list -mod=vendor ./... | \
		${GREP} -v -e '/pkg/service$$' -e '/test$$')

.include <bsd.port.mk>

PORTNAME=	zitadel
DISTVERSIONPREFIX=	v
DISTVERSION=	4.15.3
CATEGORIES=	security www

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Open-source identity and access management platform
WWW=		https://zitadel.com/

LICENSE=	AGPLv3
LICENSE_FILE=	${WRKSRC}/LICENSE

ONLY_FOR_ARCHS=	amd64 aarch64

BUILD_DEPENDS=	bash:shells/bash \
		git:devel/git
RUN_DEPENDS=	${LOCALBASE}/bin/psql:databases/postgresql16-client
TEST_DEPENDS=	${LOCALBASE}/bin/pg_ctl:databases/postgresql16-server

USES=		go:1.25+,modules,no_targets linux:c7 nodejs:build,22
USE_LINUX=	base:build

USE_GITHUB=	yes
GH_ACCOUNT=	zitadel
GH_PROJECT=	zitadel

CGO_ENABLED=	0

# This port requires network during build for pnpm install (Node.js
# dependencies), go install (proto code-gen tools), and downloading
# console proto plugin binaries.  Add to /usr/local/etc/poudriere.conf:
#   ALLOW_NETWORKING_PACKAGES="security/zitadel"

USERS=		zitadel
GROUPS=		zitadel
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

USE_RC_SUBR=	zitadel

SUB_FILES=	pkg-message
SUB_LIST=	PORTNAME=${PORTNAME} \
		ZITADEL_USER=${USERS} \
		ZITADEL_GROUP=${GROUPS} \
		ZITADEL_DBDIR=${ZITADEL_DBDIR} \
		ZITADEL_LOGDIR=${ZITADEL_LOGDIR}

PLIST_SUB=	ZITADEL_USER=${USERS} \
		ZITADEL_GROUP=${GROUPS} \
		ZITADEL_DBDIR=${ZITADEL_DBDIR} \
		ZITADEL_LOGDIR=${ZITADEL_LOGDIR}

ZITADEL_DBDIR?=		/var/db/zitadel
ZITADEL_LOGDIR?=	/var/log/zitadel

# Path for build-time Go tools (buf, statik, protoc-gen-*)
_GOBIN=		${WRKSRC}/.artifacts/bin/freebsd/${ARCH:S/aarch64/arm64/:S/amd64/amd64/}

# Proto plugin versions (must match those in the source tree)
_BUF_VERSION=		1.67.0
_STATIK_VERSION=	0.1.8
_PROTOC_GO_VERSION=	1.36.11
_PROTOC_GRPC_VERSION=	1.6.1
_PROTOC_GW_VERSION=	2.28.0
_PROTOC_VALIDATE_VERSION=	1.3.3
_PROTOC_CONNECT_VERSION=	1.19.1

pre-build:
	@${ECHO_MSG} "===>  Downloading Go module dependencies"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		${GO_CMD} mod download
	@${ECHO_MSG} "===>  Installing pnpm via corepack"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} \
		corepack enable && corepack prepare pnpm@10.30.3 --activate
	@${ECHO_MSG} "===>  Installing Node.js dependencies"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} \
		pnpm install --frozen-lockfile
	@${ECHO_MSG} "===>  Installing Go code-generation tools"
	${MKDIR} ${_GOBIN}
.for _tool _pkg _ver in \
	statik	github.com/rakyll/statik	${_STATIK_VERSION} \
	buf	github.com/bufbuild/buf/cmd/buf	${_BUF_VERSION} \
	protoc-gen-go	google.golang.org/protobuf/cmd/protoc-gen-go	${_PROTOC_GO_VERSION} \
	protoc-gen-go-grpc	google.golang.org/grpc/cmd/protoc-gen-go-grpc	${_PROTOC_GRPC_VERSION} \
	protoc-gen-grpc-gateway	github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway	${_PROTOC_GW_VERSION} \
	protoc-gen-openapiv2	github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2	${_PROTOC_GW_VERSION} \
	protoc-gen-validate	github.com/envoyproxy/protoc-gen-validate	${_PROTOC_VALIDATE_VERSION} \
	protoc-gen-connect-go	connectrpc.com/connect/cmd/protoc-gen-connect-go	${_PROTOC_CONNECT_VERSION}
	@${ECHO_MSG} "===>    go install ${_tool}@v${_ver}"
	${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOBIN=${_GOBIN} ${GO_CMD} install ${_pkg}@v${_ver}
.endfor
	@${ECHO_MSG} "===>    go install protoc-gen-authoption"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOBIN=${_GOBIN} ${GO_CMD} install ./internal/protoc/protoc-gen-authoption
	@${ECHO_MSG} "===>    go install protoc-gen-zitadel"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOBIN=${_GOBIN} ${GO_CMD} install ./internal/protoc/protoc-gen-zitadel
	@${ECHO_MSG} "===>  Installing console proto plugins (Linux binaries via linuxulator)"
	cd ${WRKSRC} && ${BASH} ./console/scripts/install-proto-plugins.sh
	@${ECHO_MSG} "===>  DEBUG: linuxulator diagnostics"
	-sysctl kern.features.linux64 || true
	-ls -la /compat/linux/lib64/ld-linux-x86-64.so.2 || ${ECHO_MSG} "  /compat/linux/lib64/ld-linux not found"
	-ls -la /compat/linux/lib64/libstdc++.so.6 || ${ECHO_MSG} "  libstdc++ not found"
	-ls -la /compat/linux/lib64/libc.so.6 || ${ECHO_MSG} "  libc.so.6 not found"
	file ${_GOBIN}/protoc-gen-js
	file ${_GOBIN}/protoc-gen-grpc-web
	brandelf -t Linux ${_GOBIN}/protoc-gen-js
	brandelf -t Linux ${_GOBIN}/protoc-gen-grpc-web
	-${_GOBIN}/protoc-gen-js --version || ${ECHO_MSG} "  protoc-gen-js failed to run"
	-${_GOBIN}/protoc-gen-grpc-web --version || ${ECHO_MSG} "  protoc-gen-grpc-web failed to run"
	-ldd ${_GOBIN}/protoc-gen-js || true
	@${ECHO_MSG} "===>  Generating Go proto stubs"
	cd ${WRKSRC} && ${SETENV} PATH="${_GOBIN}:$$PATH" ${_GOBIN}/buf generate
	${MKDIR} ${WRKSRC}/pkg/grpc ${WRKSRC}/openapi/v2
	cp -Rf ${WRKSRC}/.artifacts/grpc/github.com/zitadel/zitadel/pkg/grpc/* ${WRKSRC}/pkg/grpc/
	cp -r ${WRKSRC}/.artifacts/grpc/zitadel ${WRKSRC}/openapi/v2/zitadel
	@${ECHO_MSG} "===>  Generating console proto code"
	cd ${WRKSRC}/console && ${SETENV} \
		PATH="${_GOBIN}:$$PATH" \
		${_GOBIN}/buf generate ../proto --include-imports --include-wkt
	@${ECHO_MSG} "===>  Generating @zitadel/proto package"
	cd ${WRKSRC}/packages/zitadel-proto && ${SETENV} \
		PATH="${WRKSRC}/packages/zitadel-proto/node_modules/.bin:${_GOBIN}:$$PATH" \
		${_GOBIN}/buf generate ../../proto
	@${ECHO_MSG} "===>  Building @zitadel/client package"
	cd ${WRKSRC}/packages/zitadel-client && pnpm run build
	@${ECHO_MSG} "===>  Building Angular management console"
	cd ${WRKSRC}/console && pnpm run build
	@${ECHO_MSG} "===>  Copying console static assets"
	find ${WRKSRC}/internal/api/ui/console/static -mindepth 1 ! -name 'gitkeep' -delete
	cp -r ${WRKSRC}/console/dist/console/* ${WRKSRC}/internal/api/ui/console/static/
	@${ECHO_MSG} "===>  Generating statik and asset files"
.for _gen in \
	internal/api/ui/login/static/resources/generate.go \
	internal/api/ui/login/statik/generate.go \
	internal/notification/statik/generate.go \
	internal/statik/generate.go
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		PATH="${_GOBIN}:$$PATH" ${GO_CMD} generate ${_gen}
.endfor
	${MKDIR} ${WRKSRC}/apps/docs/content/apis/assets
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		${GO_CMD} run internal/api/assets/generator/asset_generator.go \
		-directory=internal/api/assets/generator/ \
		-assets=apps/docs/content/apis/assets/assets.mdx

do-build:
	@${ECHO_MSG} "===>  Vendoring Go module dependencies"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		${GO_CMD} mod vendor
	@${ECHO_MSG} "===>  Compiling zitadel"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOPROXY=off ${GO_CMD} build -mod=vendor -v -trimpath \
		-buildvcs=false \
		-ldflags="-s -w \
		-X github.com/zitadel/zitadel/cmd/build.version=${DISTVERSION} \
		-X github.com/zitadel/zitadel/cmd/build.date=$$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		-o ${WRKDIR}/bin/zitadel .

do-install:
	${INSTALL_PROGRAM} ${WRKDIR}/bin/zitadel ${STAGEDIR}${PREFIX}/bin/zitadel

post-install:
	${MKDIR} ${STAGEDIR}${ETCDIR}
	${INSTALL_DATA} ${WRKSRC}/cmd/defaults.yaml ${STAGEDIR}${ETCDIR}/defaults.yaml
	${INSTALL_DATA} ${FILESDIR}/zitadel.yaml.sample ${STAGEDIR}${ETCDIR}/zitadel.yaml.sample
	@${MKDIR} ${STAGEDIR}${ZITADEL_DBDIR}
	@${MKDIR} ${STAGEDIR}${ZITADEL_LOGDIR}

# Unit tests only (no integration tests, which require a running server).
# The embedded PostgreSQL tests use the system-installed pg_ctl via PATH.
# Run with: poudriere bulk -t ... or: make test
do-test:
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		TZ=UTC GOPROXY=off \
		${GO_CMD} test -mod=vendor -short -count 1 \
		./internal/... ./backend/... ./cmd/...

.include <bsd.port.mk>

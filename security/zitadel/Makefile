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

BUILD_DEPENDS=	git:devel/git \
		npm:www/npm-node22
FETCH_DEPENDS=	node:www/node22 \
		jq:textproc/jq
RUN_DEPENDS=	${LOCALBASE}/bin/psql:databases/postgresql16-client
TEST_DEPENDS=	${LOCALBASE}/bin/pg_ctl:databases/postgresql16-server

USES=		go:1.25+,modules,no_targets linux:c7 nodejs:build,22
USE_LINUX=	base:build

# Source from GitHub; Go modules fetched by framework via GO_MODULE
USE_GITHUB=	yes
GH_ACCOUNT=	zitadel
GH_PROJECT=	zitadel
GO_MODULE=	github.com/zitadel/zitadel
GO_MOD_DIST=	github

CGO_ENABLED=	0

# Console proto plugins (Linux binaries, run via linuxulator at build time)
_GRPC_WEB_VER=		1.5.0
_PROTOC_JS_VER=		4.0.2
_OPENAPIV2_DL_VER=	2.22.0
MASTER_SITES+=	https://github.com/grpc/grpc-web/releases/download/${_GRPC_WEB_VER}/:grpcweb \
		https://github.com/protocolbuffers/protobuf-javascript/releases/download/v${_PROTOC_JS_VER}/:protocjs \
		https://github.com/grpc-ecosystem/grpc-gateway/releases/download/v${_OPENAPIV2_DL_VER}/:openapiv2 \
		https://registry.npmjs.org/pnpm/-/:pnpm
DISTFILES+=	protoc-gen-grpc-web-${_GRPC_WEB_VER}-linux-x86_64:grpcweb \
		protobuf-javascript-${_PROTOC_JS_VER}-linux-x86_64.zip:protocjs \
		protoc-gen-openapiv2-v${_OPENAPIV2_DL_VER}-linux-x86_64:openapiv2 \
		pnpm-${_PNPM_VER}.tgz:pnpm

# Prefetched pnpm store archive — generated during fetch phase
_PNPM_VER=		10.30.3
_PNPM_CACHE_DISTFILE=	${PORTNAME}-pnpm-cache-${DISTVERSION}${EXTRACT_SUFX}
_PKGJSONSDIR=		${FILESDIR}/packagejsons

# Only extract the source tarball (not proto binaries, .mod, or pnpm tgz)
EXTRACT_ONLY=	${DISTNAME}${EXTRACT_SUFX}

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

_GOBIN=		${WRKSRC}/.artifacts/bin/freebsd/${ARCH:S/aarch64/arm64/:S/amd64/amd64/}

# Proto plugin versions for go install (must match source tree)
_BUF_VERSION=		1.67.0
_STATIK_VERSION=	0.1.8
_PROTOC_GO_VERSION=	1.36.11
_PROTOC_GRPC_VERSION=	1.6.1
_PROTOC_GW_VERSION=	2.28.0
_PROTOC_VALIDATE_VERSION=	1.3.3
_PROTOC_CONNECT_VERSION=	1.19.1

# ===========================================================================
# Fetch phase hooks: prefetch Go tool modules and pnpm store
# (runs on host with network, before build)
# ===========================================================================

_USES_fetch+=	810:zitadel-fetch-go-tools \
		811:zitadel-fetch-pnpm-cache

# Build Go tools during fetch (has network) so all transitive
# dependencies are cached in GOPATH for offline use during build.
# Idempotent: skips if buf-cache already exists (re-runs in jail are no-ops).
zitadel-fetch-go-tools:
	@if [ ! -d ${DISTDIR}/${DIST_SUBDIR}/buf-cache ]; then \
		${ECHO_MSG} "===>  Fetching Go tool module dependencies"; \
		${MKDIR} ${WRKDIR}/.fetch-tools-bin; \
		for _spec in \
			github.com/rakyll/statik@v${_STATIK_VERSION} \
			github.com/bufbuild/buf/cmd/buf@v${_BUF_VERSION} \
			google.golang.org/protobuf/cmd/protoc-gen-go@v${_PROTOC_GO_VERSION} \
			google.golang.org/grpc/cmd/protoc-gen-go-grpc@v${_PROTOC_GRPC_VERSION} \
			github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@v${_PROTOC_GW_VERSION} \
			github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2@v${_PROTOC_GW_VERSION} \
			github.com/envoyproxy/protoc-gen-validate@v${_PROTOC_VALIDATE_VERSION} \
			connectrpc.com/connect/cmd/protoc-gen-connect-go@v${_PROTOC_CONNECT_VERSION}; \
		do \
			${SETENV} ${WRK_ENV} ${GO_ENV} \
				GOPROXY=${GO_GOPROXY} \
				GOBIN=${WRKDIR}/.fetch-tools-bin \
				${GO_CMD} install $${_spec}; \
		done; \
		${ECHO_MSG} "===>  Prefetching buf proto dependencies"; \
		${MKDIR} ${DISTDIR}/${DIST_SUBDIR}/buf-cache ${WRKDIR}/.buf-fetch-tmp; \
		${TAR} -xf ${DISTDIR}/${DIST_SUBDIR}/${DISTNAME}${EXTRACT_SUFX} \
			-C ${WRKDIR}/.buf-fetch-tmp; \
		cd ${WRKDIR}/.buf-fetch-tmp/${PORTNAME}-${DISTVERSION} && \
			${RM} -f proto/buf.lock && \
			${SETENV} BUF_CACHE_DIR=${DISTDIR}/${DIST_SUBDIR}/buf-cache \
			${WRKDIR}/.fetch-tools-bin/buf dep update proto && \
			${SETENV} BUF_CACHE_DIR=${DISTDIR}/${DIST_SUBDIR}/buf-cache \
			${WRKDIR}/.fetch-tools-bin/buf build proto; \
		${RM} -r ${WRKDIR}/.buf-fetch-tmp ${WRKDIR}/.fetch-tools-bin; \
	fi

# Generate pnpm store archive from lockfile if it doesn't already exist.
# Uses the same pattern as electron.mk prefetch.
zitadel-fetch-pnpm-cache:
	@${MKDIR} ${DISTDIR}/${DIST_SUBDIR}
	@if [ ! -f ${DISTDIR}/${DIST_SUBDIR}/${_PNPM_CACHE_DISTFILE} ]; then \
		${ECHO_MSG} "===>  Prefetching pnpm store"; \
		${MKDIR} ${WRKDIR}/pnpm-prefetch ${WRKDIR}/.bin; \
		${TAR} -cf - -C ${_PKGJSONSDIR} . | ${TAR} -xf - -C ${WRKDIR}/pnpm-prefetch; \
		corepack enable --install-directory ${WRKDIR}/.bin; \
		PATH="${WRKDIR}/.bin:$$PATH" corepack prepare pnpm@${_PNPM_VER} --activate; \
		cd ${WRKDIR}/pnpm-prefetch && \
		PATH="${WRKDIR}/.bin:$$PATH" pnpm fetch \
			--frozen-lockfile --ignore-scripts --loglevel=error \
			--store-dir ${WRKDIR}/pnpm-prefetch/pnpm-store; \
		${FIND} ${WRKDIR}/pnpm-prefetch/pnpm-store \
			-type f -name '*.json' -exec ${SH} -c ' \
			for f do \
				jq -c "walk(if type == \"object\" and has(\"checkedAt\") then .checkedAt = 0 else . end)" $${f} > $${f}.tmp && mv $${f}.tmp $${f}; \
			done \
			' ${SH} {} ';' 2>/dev/null; \
		for dir in projects tmp; do \
			${RM} -r ${WRKDIR}/pnpm-prefetch/pnpm-store/*/$${dir} 2>/dev/null; \
		done; \
		${ECHO_MSG} "===>  Archiving pnpm store"; \
		cd ${WRKDIR}/pnpm-prefetch && \
		${TAR} -czf ${DISTDIR}/${DIST_SUBDIR}/${_PNPM_CACHE_DISTFILE} pnpm-store; \
		${RM} -r ${WRKDIR}/pnpm-prefetch; \
	fi

# ===========================================================================
# Build phase (all offline)
# ===========================================================================

pre-build:
	@${ECHO_MSG} "===>  Installing pnpm from prefetched tarball"
	@${MKDIR} ${WRKDIR}/.bin
	cd ${WRKDIR} && npm install --prefix ${WRKDIR}/.pnpm-install \
		${DISTDIR}/${DIST_SUBDIR}/pnpm-${_PNPM_VER}.tgz
	@${LN} -sf ${WRKDIR}/.pnpm-install/node_modules/.bin/pnpm ${WRKDIR}/.bin/pnpm
	@${ECHO_MSG} "===>  Restoring prefetched pnpm store"
	${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/${_PNPM_CACHE_DISTFILE} -C ${WRKDIR}
	@${ECHO_MSG} "===>  Installing Node.js dependencies (offline from prefetched cache)"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} \
		PATH="${WRKDIR}/.bin:$$PATH" \
		pnpm install --frozen-lockfile --ignore-scripts --offline \
		--store-dir ${WRKDIR}/pnpm-store
	@${ECHO_MSG} "===>  Installing Go code-generation tools (from cached modules)"
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
		GOPROXY=${GO_MODCACHE} GOFLAGS= GONOSUMCHECK='*' \
		GOBIN=${_GOBIN} ${GO_CMD} install ${_pkg}@v${_ver}
.endfor
	@${ECHO_MSG} "===>    go install protoc-gen-authoption"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOPROXY=off GOFLAGS= \
		GOBIN=${_GOBIN} ${GO_CMD} install -mod=vendor ./internal/protoc/protoc-gen-authoption
	@${ECHO_MSG} "===>    go install protoc-gen-zitadel"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOPROXY=off GOFLAGS= \
		GOBIN=${_GOBIN} ${GO_CMD} install -mod=vendor ./internal/protoc/protoc-gen-zitadel
	@${ECHO_MSG} "===>  Installing console proto plugins (from prefetched DISTFILES)"
	${INSTALL_PROGRAM} ${DISTDIR}/${DIST_SUBDIR}/protoc-gen-grpc-web-${_GRPC_WEB_VER}-linux-x86_64 \
		${_GOBIN}/protoc-gen-grpc-web
	unzip -q -o ${DISTDIR}/${DIST_SUBDIR}/protobuf-javascript-${_PROTOC_JS_VER}-linux-x86_64.zip \
		bin/protoc-gen-js -d ${WRKDIR}/protoc-js-tmp
	${INSTALL_PROGRAM} ${WRKDIR}/protoc-js-tmp/bin/protoc-gen-js ${_GOBIN}/protoc-gen-js
	brandelf -t Linux ${_GOBIN}/protoc-gen-js
	brandelf -t Linux ${_GOBIN}/protoc-gen-grpc-web
	@${ECHO_MSG} "===>  Generating Go proto stubs"
	cd ${WRKSRC} && ${SETENV} BUF_CACHE_DIR=${DISTDIR}/${DIST_SUBDIR}/buf-cache \
		PATH="${_GOBIN}:$$PATH" ${_GOBIN}/buf generate
	${MKDIR} ${WRKSRC}/pkg/grpc ${WRKSRC}/openapi/v2
	cp -Rf ${WRKSRC}/.artifacts/grpc/github.com/zitadel/zitadel/pkg/grpc/* ${WRKSRC}/pkg/grpc/
	cp -r ${WRKSRC}/.artifacts/grpc/zitadel ${WRKSRC}/openapi/v2/zitadel
	@${ECHO_MSG} "===>  Generating console proto code"
	cd ${WRKSRC}/console && ${SETENV} BUF_CACHE_DIR=${DISTDIR}/${DIST_SUBDIR}/buf-cache \
		PATH="${_GOBIN}:$$PATH" \
		${_GOBIN}/buf generate ../proto --include-imports --include-wkt
	@${ECHO_MSG} "===>  Generating @zitadel/proto package"
	cd ${WRKSRC}/packages/zitadel-proto && ${SETENV} BUF_CACHE_DIR=${DISTDIR}/${DIST_SUBDIR}/buf-cache \
		PATH="${WRKSRC}/packages/zitadel-proto/node_modules/.bin:${_GOBIN}:$$PATH" \
		${_GOBIN}/buf generate ../../proto
	@${ECHO_MSG} "===>  Building @zitadel/client package"
	cd ${WRKSRC}/packages/zitadel-client && \
		${SETENV} PATH="${WRKDIR}/.bin:$$PATH" pnpm run build
	@${ECHO_MSG} "===>  Building Angular management console"
	cd ${WRKSRC}/console && \
		${SETENV} PATH="${WRKDIR}/.bin:$$PATH" pnpm run build
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
		GOPROXY=off GOFLAGS= \
		PATH="${WRKDIR}/.bin:${_GOBIN}:$$PATH" ${GO_CMD} generate ${_gen}
.endfor
	${MKDIR} ${WRKSRC}/apps/docs/content/apis/assets
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOPROXY=off GOFLAGS= \
		${GO_CMD} run -mod=vendor \
		internal/api/assets/generator/asset_generator.go \
		-directory=internal/api/assets/generator/ \
		-assets=apps/docs/content/apis/assets/assets.mdx

do-build:
	@${ECHO_MSG} "===>  Re-vendoring Go modules (includes generated proto packages)"
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		GOPROXY=off ${GO_CMD} mod vendor
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

do-test:
	cd ${WRKSRC} && ${SETENV} ${WRK_ENV} ${MAKE_ENV} ${GO_ENV} \
		TZ=UTC GOPROXY=off \
		${GO_CMD} test -mod=vendor -short -count 1 \
		./internal/... ./backend/... ./cmd/...

.include <bsd.port.mk>

PORTNAME=	feather
DISTVERSIONPREFIX=	v
DISTVERSION=	1.0.99
CATEGORIES=	mail

MAINTAINER=	nguthiruedwin@gmail.com
COMMENT=	Modern, developer-friendly SMTP mail server built on Elixir/BEAM
WWW=		https://github.com/yoonka/feather

LICENSE=	BSD3CLAUSE
# TODO: add a LICENSE file to the upstream repo, then set:
#   LICENSE_FILE=	${WRKSRC}/LICENSE

ONLY_FOR_ARCHS=	amd64 aarch64

# Elixir/Erlang toolchain. Needed at fetch time to vendor Hex/rebar deps
# (fetch phase has network) and at build time to assemble the release. The CA
# bundle is required so the fetch hook can talk to hex.pm over TLS.
FETCH_DEPENDS=	elixir:lang/elixir \
		erl:lang/erlang \
		${LOCALBASE}/share/certs/ca-root-nss.crt:security/ca_root_nss
BUILD_DEPENDS=	elixir:lang/elixir \
		erl:lang/erlang

# ssl: the bundled ERTS crypto NIF links against OpenSSL.
USES=		gmake ssl

USE_GITHUB=	yes
GH_ACCOUNT=	yoonka
GH_PROJECT=	feather

# `mix release` bundles ERTS, so the staged tree is fully self-contained and
# needs no runtime Erlang dependency.

USERS=		feather
GROUPS=		feather
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

USE_RC_SUBR=	feather

SUB_FILES=	pkg-message
SUB_LIST=	PORTNAME=${PORTNAME} \
		FEATHER_USER=${USERS} \
		FEATHER_GROUP=${GROUPS} \
		FEATHER_LOGDIR=${FEATHER_LOGDIR}

# NB: deliberately do NOT expose FEATHER_USER in PLIST_SUB. Its value is
# "feather", which also happens to be the install-directory name; adding it
# would turn every "feather/..." path in pkg-plist into a %%FEATHER_USER%%
# token and make the plist hostage to the username. The log-dir owner is
# written literally in pkg-plist instead.
PLIST_SUB=	FEATHER_LOGDIR=${FEATHER_LOGDIR}

# Self-contained release lives here (matches upstream install.sh layout).
FEATHER_HOME=	${PREFIX}/feather
FEATHER_LOGDIR?=	/var/log/feather

# Fully offline build environment for Mix. HOME/MIX_HOME/HEX_HOME point at the
# per-build cache restored from the prefetched deps archive; MIX_ENV=prod so we
# assemble the production release.
_MIX_HOME=	${WRKDIR}/.mix
MIX_ENV=	MIX_ENV=prod \
		HOME=${WRKDIR} \
		MIX_HOME=${_MIX_HOME} \
		HEX_HOME=${_MIX_HOME} \
		HEX_OFFLINE=1 \
		LANG=en_US.UTF-8 \
		LC_ALL=en_US.UTF-8

# Prefetched Hex/rebar cache + resolved deps/ tree, produced during fetch.
_DEPS_DISTFILE=	${PORTNAME}-deps-${DISTVERSION}${EXTRACT_SUFX}

# ===========================================================================
# Fetch phase hook: resolve and vendor all Mix dependencies (has network).
# Produces ${_DEPS_DISTFILE} in DISTDIR containing deps/ and the populated
# Hex/rebar caches, so the build phase runs fully offline. Idempotent.
# ===========================================================================

_USES_fetch+=	810:feather-vendor-deps

feather-vendor-deps:
	@${MKDIR} ${DISTDIR}/${DIST_SUBDIR}
	@if [ ! -f ${DISTDIR}/${DIST_SUBDIR}/${_DEPS_DISTFILE} ]; then \
		${ECHO_MSG} "===>  Vendoring Mix dependencies (network)"; \
		${RM} -r ${WRKDIR}/.vendor; \
		${MKDIR} ${WRKDIR}/.vendor ${WRKDIR}/.vendor-mix; \
		${TAR} -xf ${DISTDIR}/${DIST_SUBDIR}/${DISTNAME}${EXTRACT_SUFX} \
			-C ${WRKDIR}/.vendor; \
		cd ${WRKDIR}/.vendor/${WRKSRC:T} && \
			${SETENV} HOME=${WRKDIR}/.vendor \
				MIX_HOME=${WRKDIR}/.vendor-mix \
				HEX_HOME=${WRKDIR}/.vendor-mix \
				MIX_ENV=prod \
				mix local.hex --force && \
			${SETENV} HOME=${WRKDIR}/.vendor \
				MIX_HOME=${WRKDIR}/.vendor-mix \
				HEX_HOME=${WRKDIR}/.vendor-mix \
				MIX_ENV=prod \
				mix local.rebar --force && \
			${SETENV} HOME=${WRKDIR}/.vendor \
				MIX_HOME=${WRKDIR}/.vendor-mix \
				HEX_HOME=${WRKDIR}/.vendor-mix \
				MIX_ENV=prod \
				mix deps.get --only prod; \
		${ECHO_MSG} "===>  Pre-fetching rebar3 plugins (network)"; \
		cd ${WRKDIR}/.vendor/${WRKSRC:T} && \
			${SETENV} HOME=${WRKDIR}/.vendor \
				MIX_HOME=${WRKDIR}/.vendor-mix \
				HEX_HOME=${WRKDIR}/.vendor-mix \
				MIX_ENV=prod \
				mix deps.compile iconv 2>/dev/null || ${TRUE}; \
		${ECHO_MSG} "===>  Archiving vendored dependencies"; \
		${MKDIR} ${WRKDIR}/.vendor/.cache; \
		cd ${WRKDIR}/.vendor/${WRKSRC:T} && \
			${TAR} -czf ${DISTDIR}/${DIST_SUBDIR}/${_DEPS_DISTFILE} \
				deps -C ${WRKDIR} .vendor-mix \
				-C ${WRKDIR}/.vendor .cache; \
		${RM} -r ${WRKDIR}/.vendor ${WRKDIR}/.vendor-mix; \
	fi

# ===========================================================================
# Build phase (offline)
# ===========================================================================

post-extract:
	@${ECHO_MSG} "===>  Restoring vendored Mix dependencies (offline)"
	@${MKDIR} ${_MIX_HOME}
	${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/${_DEPS_DISTFILE} -C ${WRKSRC} deps
	${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/${_DEPS_DISTFILE} \
		-C ${WRKDIR} .vendor-mix
	${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/${_DEPS_DISTFILE} \
		-C ${WRKDIR} .cache 2>/dev/null || ${TRUE}
	@${MV} ${WRKDIR}/.vendor-mix/* ${_MIX_HOME}/ 2>/dev/null || true

do-build:
	@${ECHO_MSG} "===>  Compiling dependencies"
	cd ${WRKSRC} && ${SETENV} ${MIX_ENV} mix deps.compile
	@${ECHO_MSG} "===>  Assembling release"
	cd ${WRKSRC} && ${SETENV} ${MIX_ENV} mix release --overwrite

do-install:
	@${MKDIR} ${STAGEDIR}${FEATHER_HOME}
	# Copy the assembled release preserving its original modes. The release
	# ships executable helper scripts (bin/feather, releases/*/elixir, iex)
	# and the bundled ERTS binaries; COPYTREE_SHARE would flatten those to
	# 0644, so use tar to keep the exec bits mix(1) set.
	@cd ${WRKSRC}/_build/prod/rel/${PORTNAME} && \
		${TAR} -cf - . | ${TAR} -xf - -C ${STAGEDIR}${FEATHER_HOME}
	${LN} -sf ../feather/bin/${PORTNAME} ${STAGEDIR}${PREFIX}/bin/${PORTNAME}

post-install:
	@${MKDIR} ${STAGEDIR}${ETCDIR}
	${INSTALL_DATA} ${FILESDIR}/server.exs.sample \
		${STAGEDIR}${ETCDIR}/server.exs.sample
	${INSTALL_DATA} ${FILESDIR}/pipeline.exs.sample \
		${STAGEDIR}${ETCDIR}/pipeline.exs.sample
	@${MKDIR} ${STAGEDIR}${FEATHER_LOGDIR}
	# Strip the bundled ERTS binaries and NIF shared objects (mix release
	# copies them unstripped, and the ERTS binaries land read-only so they
	# must be made writable first). Non-ELF files (shell wrappers, *.src)
	# are skipped by strip and ignored.
	@${FIND} ${STAGEDIR}${FEATHER_HOME} -type f \
		\( -name '*.so' -o -path '*/erts-*/bin/*' \) \
		-exec ${CHMOD} u+w {} +
	@${FIND} ${STAGEDIR}${FEATHER_HOME} -type f \
		\( -name '*.so' -o -path '*/erts-*/bin/*' \) \
		-exec ${STRIP_CMD} {} \; 2>/dev/null || ${TRUE}

# Generate plist entries for the self-contained release tree. The exact
# set of bundled ERTS/OTP files varies with the Erlang version, so we
# cannot hardcode them in pkg-plist.
post-stage:
	@cd ${STAGEDIR}${PREFIX} && \
		${FIND} feather -not -type d | ${SORT} >> ${TMPPLIST}
	@cd ${STAGEDIR}${PREFIX} && \
		${FIND} feather -type d -depth | ${SED} 's/^/@dir /' >> ${TMPPLIST}

.include <bsd.port.mk>

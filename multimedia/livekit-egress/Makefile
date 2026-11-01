PORTNAME=	livekit-egress
DISTVERSIONPREFIX=	v
DISTVERSION=	1.15.0
PORTREVISION=	1
CATEGORIES=	multimedia net

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Record and stream LiveKit rooms, participants and tracks
WWW=		https://github.com/livekit/egress

LICENSE=	APACHE20
LICENSE_FILE=	${WRKSRC}/LICENSE

USES=		gettext-runtime gnome go:1.26+,modules gstreamer pkgconfig
USE_GITHUB=	yes
GH_ACCOUNT=	livekit
GH_PROJECT=	egress
USE_GNOME=	glib20
# go-gst links libgstreamer, libgstapp (plugins) and libgstmpegts (bad).
# Elements the pipelines create (pkg/pipeline/builder, pkg/gstreamer):
#  core:  queue tee capsfilter input-selector fakesink filesink
#  base:  appsrc appsink audioconvert audioresample audiorate audiomixer
#	 audiotestsrc compositor videoconvert videoscale videorate
#	 videotestsrc
#  good:  mp4mux webmmux flvmux splitmuxsink multifilesink xingmux
#	 videocrop alawdec mulawdec rtph264depay rtpvp8depay rtpvp9depay
#	 rtpopusdepay rtppcmadepay rtppcmudepay
#  bad:   h264parse vp9parse mpegtsmux rtmp2sink
#  faac:  faac              jpeg:  jpegenc        lame: lamemp3enc
#  libav: avdec_h264        ogg:   oggmux         opus: opusenc opusdec
#  soundtouch: pitch        srt:   srtsink
#  vpx:   vp8dec vp9dec vp9enc                    x264: x264enc
#  CHROME option: pulsesrc (pulse) and ximagesrc
USE_GSTREAMER=	bad faac good jpeg lame libav libgstreamer ogg opus plugins \
		soundtouch srt vpx x264

GO_MODULE=	github.com/livekit/egress
GO_MOD_DIST=	github
GO_TARGET=	./cmd/server:${PORTNAME}

# Only the source tarball; go.mod and the pnpm tarball are used as-is.
EXTRACT_ONLY=	${DISTNAME}${EXTRACT_SUFX}

# CHROME is off by default: the built-in room composite layouts are then
# rendered by GStreamer (enable_template_sdk, set in the sample config), and
# the package needs no X server, Chromium, PulseAudio or node. CHROME adds
# web egress and custom templates. Its pnpm distfile is in distinfo too, so
# regenerate distinfo with `make makesum WITH=CHROME`.
OPTIONS_DEFINE=	CHROME
OPTIONS_SUB=	yes
CHROME_DESC=	Room composite and web egress through headless Chromium

CHROME_MASTER_SITES=	https://registry.npmjs.org/pnpm/-/:pnpm
CHROME_DISTFILES=	pnpm-${_PNPM_VER}.tgz:pnpm
CHROME_FETCH_DEPENDS=	node:www/node${NODEJS_VERSION}
CHROME_USES=		nodejs:build
CHROME_USE=		GSTREAMER=pulse,ximagesrc
CHROME_RUN_DEPENDS=	${LOCALBASE}/bin/chrome:www/chromium \
			pulseaudio:audio/pulseaudio \
			Xvfb:x11-servers/xorg-server@xvfb
CHROME_SUB_FILES=	pulse-daemon.conf
CHROME_SUB_LIST=	CHROME_MSG="" NO_CHROME_MSG=\# PULSEAUDIO=YES \
			NO_CHROME_CFG=\# TEMPLATE_SDK=false REAP_GRACE=30
CHROME_SUB_LIST_OFF=	CHROME_MSG=\# NO_CHROME_MSG="" PULSEAUDIO=NO \
			NO_CHROME_CFG="" TEMPLATE_SDK=true REAP_GRACE=-1

USERS=		livekit-egress
GROUPS=		livekit-egress
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

USE_RC_SUBR=	livekit_egress

ETCDIR=		${PREFIX}/etc/livekit

SUB_FILES=	egress.yaml.sample pkg-message
SUB_LIST=	LIVEKIT_EGRESS_USER=${USERS} \
		LIVEKIT_EGRESS_GROUP=${GROUPS} \
		LIVEKIT_EGRESS_HOME=${LIVEKIT_EGRESS_HOME}
PLIST_SUB=	LIVEKIT_EGRESS_USER=${USERS} \
		LIVEKIT_EGRESS_GROUP=${GROUPS} \
		LIVEKIT_EGRESS_HOME=${LIVEKIT_EGRESS_HOME}

# Home of the livekit-egress user in UIDs. Chrome, PulseAudio and the
# GStreamer registry write below it, and the service keeps its per-egress
# work directories and IPC sockets in its tmp/ subdirectory.
LIVEKIT_EGRESS_HOME=	/var/db/livekit-egress

_PNPM_VER=	10.30.3
_PNPM_STORE=	${PORTNAME}-pnpm-store-${DISTVERSION}${EXTRACT_SUFX}
_PNPM_CMD=	${SETENV} ${MAKE_ENV} CI=true ${LOCALBASE}/bin/node \
		${WRKDIR}/.pnpm/package/bin/pnpm.cjs

.include <bsd.port.options.mk>

.if ${PORT_OPTIONS:MCHROME}
.  if ${ARCH} != amd64
# vite needs the rolldown and lightningcss native npm bindings, which are
# published for freebsd-x64 only
BROKEN=		CHROME option: the templates can only be built on amd64
.  endif
_USES_fetch+=	810:livekit-egress-fetch-pnpm-store
.endif

# Prefetch the npm packages of the default room composite template into a
# pnpm store archive (with network, during fetch). Only the lockfile is
# used (--frozen-lockfile), so the content is fixed by the source tarball;
# the per-file check timestamps and the project links are normalised away.
# Poudriere keeps only distinfo files, so this runs again on every build.
livekit-egress-fetch-pnpm-store:
	@${MKDIR} ${DISTDIR}/${DIST_SUBDIR}
	@if [ ! -f ${DISTDIR}/${DIST_SUBDIR}/${_PNPM_STORE} ]; then \
		${ECHO_MSG} "===>  Prefetching pnpm store for the templates"; \
		${RM} -r ${WRKDIR}/.pnpm-fetch; \
		${MKDIR} ${WRKDIR}/.pnpm-fetch; \
		${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/pnpm-${_PNPM_VER}.tgz \
			-C ${WRKDIR}/.pnpm-fetch || exit 1; \
		${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/${DISTNAME}${EXTRACT_SUFX} \
			-C ${WRKDIR}/.pnpm-fetch \
			${WRKSRC:T}/template-default/package.json \
			${WRKSRC:T}/template-default/pnpm-lock.yaml \
			${WRKSRC:T}/template-default/pnpm-workspace.yaml || exit 1; \
		cd ${WRKDIR}/.pnpm-fetch/${WRKSRC:T}/template-default && \
		${SETENV} HOME=${WRKDIR}/.pnpm-fetch CI=true \
			${LOCALBASE}/bin/node \
			${WRKDIR}/.pnpm-fetch/package/bin/pnpm.cjs fetch \
			--frozen-lockfile --ignore-scripts --loglevel=error \
			--store-dir ${WRKDIR}/.pnpm-fetch/pnpm-store || exit 1; \
		${FIND} ${WRKDIR}/.pnpm-fetch/pnpm-store -type f -name '*.json' \
			-exec ${SED} -i '' -E 's/"checkedAt":[0-9]+/"checkedAt":0/g' {} + ; \
		${RM} -r ${WRKDIR}/.pnpm-fetch/pnpm-store/*/projects \
			${WRKDIR}/.pnpm-fetch/pnpm-store/*/tmp; \
		${TAR} -czf ${DISTDIR}/${DIST_SUBDIR}/${_PNPM_STORE} \
			-C ${WRKDIR}/.pnpm-fetch pnpm-store || exit 1; \
		${RM} -r ${WRKDIR}/.pnpm-fetch; \
	fi

post-patch:
	@${REINPLACE_CMD} -e 's|%%LIVEKIT_EGRESS_HOME%%|${LIVEKIT_EGRESS_HOME}|' \
		${WRKSRC}/pkg/config/base.go
	@${REINPLACE_CMD} -e 's|%%PREFIX%%|${PREFIX}|' \
		${WRKSRC}/pkg/server/server_rpc.go
	@${REINPLACE_CMD} -e 's|%%LOCALBASE%%|${LOCALBASE}|' \
		${WRKSRC}/pkg/pipeline/source/pulse/pactl.go \
		${WRKSRC}/pkg/pipeline/source/web.go
# chromedp sets Pdeathsig only on Linux; FreeBSD has it too, so Chrome
# exits with its handler instead of lingering in the room as an orphan.
	@${SED} -e 's|^//go:build linux$$|//go:build freebsd|' \
		${WRKSRC}/vendor/github.com/chromedp/chromedp/allocate_linux.go > \
		${WRKSRC}/vendor/github.com/chromedp/chromedp/allocate_freebsd.go
	@${REINPLACE_CMD} -e 's|^//go:build !linux$$|//go:build !linux \&\& !freebsd|' \
		${WRKSRC}/vendor/github.com/chromedp/chromedp/allocate_other.go

# cmd/server embeds cmd/server/templates (go:embed), which upstream fills
# from the livekit/egress-templates image; build it from template-default.
pre-build-CHROME-on:
	@${MKDIR} ${WRKDIR}/.pnpm
	${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/pnpm-${_PNPM_VER}.tgz -C ${WRKDIR}/.pnpm
	${TAR} -xzf ${DISTDIR}/${DIST_SUBDIR}/${_PNPM_STORE} -C ${WRKDIR}
	cd ${WRKSRC}/template-default && ${_PNPM_CMD} install \
		--frozen-lockfile --ignore-scripts --offline \
		--store-dir ${WRKDIR}/pnpm-store
	cd ${WRKSRC}/template-default && ${_PNPM_CMD} run build
	${FIND} ${WRKSRC}/template-default/build -name '*.map' -delete
	${MKDIR} ${WRKSRC}/cmd/server/templates
	cd ${WRKSRC}/template-default/build && \
		${COPYTREE_SHARE} . ${WRKSRC}/cmd/server/templates

# Without Chrome nothing loads the templates, but go:embed still needs a
# non-empty directory.
pre-build-CHROME-off:
	${MKDIR} ${WRKSRC}/cmd/server/templates
	${ECHO_CMD} "Built without the CHROME option: no room composite templates." > \
		${WRKSRC}/cmd/server/templates/README

post-install:
	@${MKDIR} ${STAGEDIR}${ETCDIR}
	${INSTALL_DATA} ${WRKDIR}/egress.yaml.sample \
		${STAGEDIR}${ETCDIR}/egress.yaml.sample
	@${MKDIR} ${STAGEDIR}${LIVEKIT_EGRESS_HOME}

# Settings for the private PulseAudio daemon the rc.d script starts.
post-install-CHROME-on:
	@${MKDIR} ${STAGEDIR}${DATADIR}/pulse
	${INSTALL_DATA} ${WRKDIR}/pulse-daemon.conf \
		${STAGEDIR}${DATADIR}/pulse/daemon.conf
	${INSTALL_DATA} ${FILESDIR}/pulse-default.pa \
		${STAGEDIR}${DATADIR}/pulse/default.pa

.include <bsd.port.mk>

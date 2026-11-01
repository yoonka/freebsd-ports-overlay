PORTNAME=	livekit-ingress
DISTVERSIONPREFIX=	v
DISTVERSION=	1.5.0
CATEGORIES=	multimedia net

MAINTAINER=	ports@FreeBSD.org
COMMENT=	Ingest RTMP, WHIP, SRT and URL streams into LiveKit rooms
WWW=		https://github.com/livekit/ingress

LICENSE=	APACHE20
LICENSE_FILE=	${WRKSRC}/LICENSE

USES=		gettext-runtime gnome go:1.25+,modules gstreamer pkgconfig
USE_GNOME=	glib20
# GStreamer elements created in pkg/media or auto-plugged by decodebin3 for
# the inputs upstream accepts:
#  core/base: queue queue2 tee capsfilter fakesink appsrc appsink decodebin3
#	videoconvert videoscale videorate audioconvert audioresample
#  bad:   libgstmpegts (linked by go-gst), h264parse h265parse tsdemux
#  good:  flvdemux qtdemux matroskademux id3demux aacparse mpegaudioparse
#	hlsdemux2
#  libav: avdec_h264 avdec_h265 avdec_aac avdec_mp3
#  ogg/vorbis: oggdemux vorbisdec (URL pull of audio/ogg)
#  opus:  opusenc opusdec
#  soup:  souphttpsrc (URL pull over HTTP(S), also used by hlsdemux2)
#  srt:   srtclientsrc (URL pull of srt://)
#  vpx:   vp8enc vp8dec vp9dec
#  x264:  x264enc
USE_GSTREAMER=	bad good libav ogg opus soup srt vorbis vpx x264

GO_MODULE=	github.com/livekit/ingress
GO_TARGET=	./cmd/server:${PORTNAME}

USERS=		livekit-ingress
GROUPS=		livekit-ingress
UID_FILES+=	${.CURDIR:H:H}/UIDs
GID_FILES+=	${.CURDIR:H:H}/GIDs

USE_RC_SUBR=	livekit_ingress

ETCDIR=		${PREFIX}/etc/livekit

SUB_FILES=	pkg-message
SUB_LIST=	LIVEKIT_INGRESS_USER=${USERS} \
		LIVEKIT_INGRESS_GROUP=${GROUPS}

PLIST_FILES=	bin/${PORTNAME} \
		"@sample etc/livekit/ingress.yaml.sample"

# The service re-executes itself as "ingress run-handler" for every ingress
# session and looks "ingress" up in PATH; point it at the installed binary.
post-patch:
	@${REINPLACE_CMD} -e 's|%%PREFIX%%|${PREFIX}|' \
		${WRKSRC}/pkg/service/cmd.go

post-install:
	@${MKDIR} ${STAGEDIR}${ETCDIR}
	${INSTALL_DATA} ${FILESDIR}/ingress.yaml.sample \
		${STAGEDIR}${ETCDIR}/ingress.yaml.sample

.include <bsd.port.mk>

--- pkg/pipeline/source/web.go.orig
+++ pkg/pipeline/source/web.go
@@ -26,6 +26,7 @@
 	"path/filepath"
 	"strings"
 	"sync/atomic"
+	"syscall"
 	"time"
 
 	"gopkg.in/natefinch/lumberjack.v2"
@@ -131,13 +132,25 @@
 
 		if s.xvfb != nil {
 			logger.Debugw("closing X display")
-			_ = s.xvfb.Process.Kill()
-			_ = s.xvfb.Wait()
+			// FreeBSD: SIGTERM lets Xvfb remove its /tmp/.X11-unix socket
+			// and lock file, which SIGKILL would leave behind
+			_ = s.xvfb.Process.Signal(syscall.SIGTERM)
+			xvfbDone := make(chan struct{})
+			go func() {
+				_ = s.xvfb.Wait()
+				close(xvfbDone)
+			}()
+			select {
+			case <-xvfbDone:
+			case <-time.After(5 * time.Second):
+				_ = s.xvfb.Process.Kill()
+				<-xvfbDone
+			}
 		}
 
 		if s.pulseSink != "" {
 			logger.Debugw("unloading pulse module")
-			if err := exec.Command("pactl", "unload-module", s.pulseSink).Run(); err != nil {
+			if err := exec.Command("%%LOCALBASE%%/bin/pactl", "unload-module", s.pulseSink).Run(); err != nil {
 				logger.Errorw("failed to unload pulse sink", err)
 			}
 		}
@@ -154,7 +167,7 @@
 	defer span.End()
 
 	logger.Debugw("creating pulse sink")
-	cmd := exec.Command("pactl",
+	cmd := exec.Command("%%LOCALBASE%%/bin/pactl",
 		"load-module", "module-null-sink",
 		fmt.Sprintf("sink_name=\"%s\"", p.Info.EgressId),
 		fmt.Sprintf("sink_properties=device.description=\"%s\"", p.Info.EgressId),
@@ -186,7 +199,12 @@
 	// pixel of slack - the ximagesrc crops it back out
 	dims := fmt.Sprintf("%dx%dx%d", p.Width+1, p.Height+1, p.Depth)
 	logger.Debugw("creating X display", "display", p.Display, "dims", dims)
-	xvfb := exec.Command("Xvfb", p.Display, "-screen", "0", dims, "-ac", "-nolisten", "tcp", "-nolisten", "unix")
+	// FreeBSD has no abstract sockets: "-nolisten unix" would also disable the
+	// "local" transport and leave Xvfb with no listener at all, so keep the
+	// /tmp/.X11-unix socket
+	xvfb := exec.Command("%%LOCALBASE%%/bin/Xvfb", p.Display, "-screen", "0", dims, "-ac", "-nolisten", "tcp")
+	// do not outlive the handler if it dies without running Close
+	xvfb.SysProcAttr = &syscall.SysProcAttr{Pdeathsig: syscall.SIGTERM}
 	if err := xvfb.Start(); err != nil {
 		return errors.ErrProcessFailed("xvfb", err)
 	}
@@ -233,6 +251,7 @@
 	logger.Debugw("launching chrome", "url", webUrl, "sandbox", p.EnableChromeSandbox, "insecure", p.Insecure)
 
 	opts := []chromedp.ExecAllocatorOption{
+		chromedp.ExecPath("%%LOCALBASE%%/bin/chrome"),
 		chromedp.NoFirstRun,
 		chromedp.NoDefaultBrowserCheck,
 		chromedp.DisableGPU,
@@ -241,7 +260,9 @@
 		chromedp.Flag("disable-infobars", true),
 		chromedp.Flag("excludeSwitches", "enable-automation"),
 		chromedp.Flag("disable-background-networking", true),
-		chromedp.Flag("enable-features", "NetworkService,NetworkServiceInProcess"),
+		// FreeBSD's chromium picks its audio backend at runtime (pulseaudio,
+		// sndio or alsa); insist on PulseAudio so PULSE_SINK below applies
+		chromedp.Flag("enable-features", "NetworkService,NetworkServiceInProcess,AudioBackend:audio-backend/pulseaudio"),
 		chromedp.Flag("disable-background-timer-throttling", true),
 		chromedp.Flag("disable-backgrounding-occluded-windows", true),
 		chromedp.Flag("disable-breakpad", true),

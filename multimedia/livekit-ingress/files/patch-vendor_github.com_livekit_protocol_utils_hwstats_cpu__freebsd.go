--- vendor/github.com/livekit/protocol/utils/hwstats/cpu_freebsd.go.orig	2026-11-01 12:00:00 UTC
+++ vendor/github.com/livekit/protocol/utils/hwstats/cpu_freebsd.go
@@ -0,0 +1,90 @@
+//go:build freebsd
+
+// FreeBSD CPU monitor for the LiveKit FreeBSD ports. Without it FreeBSD falls
+// back to cpu_null.go, which reports every CPU as idle and so disables
+// capacity management. FreeBSD has no cgroups and go-osstat/cpu has no FreeBSD
+// backend; host-wide idle time is read from the kern.cp_time sysctl, like
+// top(1) does.
+
+package hwstats
+
+import (
+	"encoding/binary"
+	"fmt"
+	"runtime"
+	"unsafe"
+
+	"github.com/prometheus/procfs"
+	"golang.org/x/sys/unix"
+)
+
+// kern.cp_time: CPUSTATES (user, nice, sys, intr, idle) tick counters summed
+// over all CPUs, each a C long.
+const (
+	cpStates = 5
+	cpIdle   = 4
+)
+
+type freebsdCPUMonitor struct {
+	prevIdle, prevTotal uint64
+}
+
+func readCPTime() (idle, total uint64, err error) {
+	buf, err := unix.SysctlRaw("kern.cp_time")
+	if err != nil {
+		return 0, 0, err
+	}
+	longSize := int(unsafe.Sizeof(uint(0))) // C long is pointer sized on FreeBSD
+	if len(buf) != cpStates*longSize {
+		return 0, 0, fmt.Errorf("unexpected kern.cp_time size %d", len(buf))
+	}
+	for i := 0; i < cpStates; i++ {
+		var v uint64
+		if longSize == 8 {
+			v = binary.NativeEndian.Uint64(buf[i*8:])
+		} else {
+			v = uint64(binary.NativeEndian.Uint32(buf[i*4:]))
+		}
+		if i == cpIdle {
+			idle = v
+		}
+		total += v
+	}
+	return idle, total, nil
+}
+
+func newPlatformCPUMonitor() (platformCPUMonitor, error) {
+	idle, total, err := readCPTime()
+	if err != nil {
+		return nil, err
+	}
+	return &freebsdCPUMonitor{prevIdle: idle, prevTotal: total}, nil
+}
+
+func (p *freebsdCPUMonitor) getCPUIdle() (float64, error) {
+	idle, total, err := readCPTime()
+	if err != nil {
+		return 0, err
+	}
+	if total <= p.prevTotal || idle < p.prevIdle {
+		// no ticks yet, or a 32-bit counter wrapped; report idle and resync
+		p.prevIdle, p.prevTotal = idle, total
+		return p.numCPU(), nil
+	}
+	idleRatio := float64(idle-p.prevIdle) / float64(total-p.prevTotal)
+	p.prevIdle, p.prevTotal = idle, total
+
+	return p.numCPU() * idleRatio, nil
+}
+
+func (p *freebsdCPUMonitor) numCPU() float64 {
+	return float64(runtime.NumCPU())
+}
+
+func getHostCPUCount(fs procfs.FS) (float64, error) {
+	return float64(runtime.NumCPU()), nil
+}
+
+func getPageSize() int {
+	return unix.Getpagesize()
+}

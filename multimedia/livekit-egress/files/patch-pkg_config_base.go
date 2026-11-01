--- pkg/config/base.go.orig
+++ pkg/config/base.go
@@ -28,7 +28,7 @@
 	"github.com/livekit/egress/pkg/types"
 )
 
-const TmpDir = "/home/egress/tmp"
+const TmpDir = "%%LIVEKIT_EGRESS_HOME%%/tmp"
 
 type BaseConfig struct {
 	NodeID string // do not supply - will be overwritten

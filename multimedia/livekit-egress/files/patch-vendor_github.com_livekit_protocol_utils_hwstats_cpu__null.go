--- vendor/github.com/livekit/protocol/utils/hwstats/cpu_null.go.orig	2026-11-01 11:49:22 UTC
+++ vendor/github.com/livekit/protocol/utils/hwstats/cpu_null.go
@@ -12,7 +12,7 @@
 // See the License for the specific language governing permissions and
 // limitations under the License.
 
-//go:build !(linux || darwin)
+//go:build !(linux || darwin || freebsd)
 
 package hwstats
 

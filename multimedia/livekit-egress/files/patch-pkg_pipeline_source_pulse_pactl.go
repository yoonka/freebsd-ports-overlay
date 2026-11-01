--- pkg/pipeline/source/pulse/pactl.go.orig
+++ pkg/pipeline/source/pulse/pactl.go
@@ -23,7 +23,7 @@
 }
 
 func ListContext(ctx context.Context) (*PulseInfo, error) {
-	cmd := exec.CommandContext(ctx, "pactl", "--format", "json", "list")
+	cmd := exec.CommandContext(ctx, "%%LOCALBASE%%/bin/pactl", "--format", "json", "list")
 	var b, e bytes.Buffer
 	cmd.Stdout = &b
 	cmd.Stderr = &e
@@ -40,7 +40,7 @@
 
 // UnloadModule unloads a module from the pulse daemon, e.g. the null-sink owned by an egress.
 func UnloadModule(ctx context.Context, module int) error {
-	cmd := exec.CommandContext(ctx, "pactl", "unload-module", strconv.Itoa(module))
+	cmd := exec.CommandContext(ctx, "%%LOCALBASE%%/bin/pactl", "unload-module", strconv.Itoa(module))
 	var e bytes.Buffer
 	cmd.Stderr = &e
 	if err := cmd.Run(); err != nil {

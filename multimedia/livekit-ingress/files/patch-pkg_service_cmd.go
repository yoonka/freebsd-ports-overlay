--- pkg/service/cmd.go.orig	2026-11-01 11:49:02 UTC
+++ pkg/service/cmd.go
@@ -93,7 +93,7 @@ func NewCmd(_ context.Context, p *params.Params) (*exe
 		args = append(args, "--logging-fields", loggingFields)
 	}
 
-	cmd := exec.Command("ingress",
+	cmd := exec.Command("%%PREFIX%%/bin/livekit-ingress",
 		args...,
 	)
 

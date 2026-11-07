--- pkg/service/cmd.go.orig	2026-11-07 12:13:25 UTC
+++ pkg/service/cmd.go
@@ -70,7 +70,7 @@ func NewCmd(_ context.Context, p *params.Params) (*exe
 		loggingFields = string(b)
 	}
 
-	cmd := exec.Command("ingress", "run-handler")
+	cmd := exec.Command("%%PREFIX%%/bin/livekit-ingress", "run-handler")
 	cmd.Dir = "/"
 	cmd.Env = append(os.Environ(),
 		"INGRESS_HANDLER_CONFIG_BODY="+string(confString),

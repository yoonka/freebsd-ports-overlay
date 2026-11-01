--- pkg/server/server_rpc.go.orig
+++ pkg/server/server_rpc.go
@@ -135,7 +135,7 @@
 		return err
 	}
 
-	cmd := exec.Command("egress", "run-handler")
+	cmd := exec.Command("%%PREFIX%%/bin/livekit-egress", "run-handler")
 	cmd.Dir = "/"
 	cmd.Env = append(os.Environ(),
 		"EGRESS_HANDLER_CONFIG_BODY="+string(confString),

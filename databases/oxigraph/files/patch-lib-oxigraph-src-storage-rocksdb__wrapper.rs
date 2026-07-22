--- lib/oxigraph/src/storage/rocksdb_wrapper.rs.orig	2025-04-19 00:00:00.000000000 +0000
+++ lib/oxigraph/src/storage/rocksdb_wrapper.rs
@@ -1274,8 +1274,10 @@
     #[cfg_attr(target_pointer_width = "64", expect(clippy::useless_conversion))]
     if unsafe { libc::getrlimit(libc::RLIMIT_NOFILE, &raw mut rlimit) } == 0 {
         Ok(Some(min(
-            u64::from(rlimit.rlim_cur),
-            u64::from(rlimit.rlim_max),
+            #[expect(clippy::cast_sign_loss)]
+            { rlimit.rlim_cur as u64 },
+            #[expect(clippy::cast_sign_loss)]
+            { rlimit.rlim_max as u64 },
         )))
     } else {
         Err(io::Error::last_os_error())

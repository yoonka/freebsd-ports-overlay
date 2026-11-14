--- cargo-crates/oxigraph-0.5.13/src/storage/rocksdb_wrapper.rs.orig	2026-11-14 02:39:00 UTC
+++ cargo-crates/oxigraph-0.5.13/src/storage/rocksdb_wrapper.rs
@@ -1304,15 +1304,26 @@ fn available_file_descriptors() -> io::Result<Option<u
         rlim_cur: 0,
         rlim_max: 0,
     };
-    #[cfg_attr(target_pointer_width = "64", expect(clippy::useless_conversion))]
     if unsafe { libc::getrlimit(libc::RLIMIT_NOFILE, &raw mut rlimit) } == 0 {
         Ok(Some(min(
-            u64::from(rlimit.rlim_cur),
-            u64::from(rlimit.rlim_max),
+            rlim_to_u64(rlimit.rlim_cur),
+            rlim_to_u64(rlimit.rlim_max),
         )))
     } else {
         Err(io::Error::last_os_error())
     }
+}
+
+#[cfg(all(unix, not(any(target_os = "freebsd", target_os = "dragonfly"))))]
+#[cfg_attr(target_pointer_width = "64", expect(clippy::useless_conversion))]
+fn rlim_to_u64(value: libc::rlim_t) -> u64 {
+    u64::from(value)
+}
+
+/// `rlim_t` is signed on FreeBSD and DragonFly BSD, where `RLIM_INFINITY` is `i64::MAX`.
+#[cfg(any(target_os = "freebsd", target_os = "dragonfly"))]
+fn rlim_to_u64(value: libc::rlim_t) -> u64 {
+    u64::try_from(value).unwrap_or(0)
 }
 
 #[cfg(windows)]

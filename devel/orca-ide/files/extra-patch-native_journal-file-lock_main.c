journal-file-lock only knows Linux and macOS: <sys/vfs.h> does not exist on
FreeBSD, and its check for a local disk compares Linux file system magic
numbers. FreeBSD declares statfs in <sys/mount.h> and names the file system
in f_fstypename, as macOS does. Applied in post-patch, from ${WRKDIR}.

--- native/journal-file-lock/main.c.orig
+++ native/journal-file-lock/main.c
@@ -123,7 +123,7 @@
 #include <string.h>
 #include <sys/stat.h>
 #include <unistd.h>
-#ifdef __APPLE__
+#if defined(__APPLE__) || defined(__FreeBSD__)
 #include <sys/mount.h>
 #else
 #include <sys/vfs.h>
@@ -186,6 +186,8 @@
   {
 #ifdef __APPLE__
     local = strcmp(volume.f_fstypename, "apfs") == 0 || strcmp(volume.f_fstypename, "hfs") == 0;
+#elif defined(__FreeBSD__)
+    local = strcmp(volume.f_fstypename, "ufs") == 0 || strcmp(volume.f_fstypename, "zfs") == 0;
 #else
     local = volume.f_type == 0xef53 || volume.f_type == 0x58465342 ||
             volume.f_type == 0x9123683e || volume.f_type == 0x2fc12fc1;

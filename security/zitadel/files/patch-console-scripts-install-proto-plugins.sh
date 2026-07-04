--- console/scripts/install-proto-plugins.sh.orig	2025-07-04 00:00:00 UTC
+++ console/scripts/install-proto-plugins.sh
@@ -60,17 +60,20 @@
 _uname_os=$(uname -s | tr '[:upper:]' '[:lower:]')
 _uname_arch=$(uname -m)
 case "$_uname_os" in
-  linux)  GOOS="linux"  ;;
-  darwin) GOOS="darwin" ;;
+  linux)   GOOS="linux"  ;;
+  darwin)  GOOS="darwin" ;;
+  freebsd) GOOS="linux"  ;; # FreeBSD: download Linux binaries, run via linuxulator
   *) echo "Unsupported OS: $_uname_os" >&2; exit 1 ;;
 esac
 case "$_uname_arch" in
-  x86_64)          GOARCH="amd64" ;;
+  x86_64 | amd64)  GOARCH="amd64" ;;
   aarch64 | arm64) GOARCH="arm64" ;;
   *) echo "Unsupported arch: $_uname_arch" >&2; exit 1 ;;
 esac

-BIN_DIR="${PWD}/.artifacts/bin/${GOOS}/${GOARCH}"
+# Use native OS name for the bin directory path so other tools can find the plugins
+_native_os="${_uname_os}"
+BIN_DIR="${PWD}/.artifacts/bin/${_native_os}/${GOARCH}"
 mkdir -p "$BIN_DIR"

 TMP=$(mktemp -d "${TMPDIR:-/tmp}/zitadel-console-proto-plugins.XXXXXX")

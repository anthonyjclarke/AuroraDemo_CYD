#pragma once

/* ─── Firmware identity ─────────────────────────────────────────────────────
 *  Read by the web installer tooling (cyd-web-installer make_manifests.py),
 *  which accepts this #define form. #define rather than constexpr because the
 *  boot banner pastes FIRMWARE_VERSION into a string literal.
 *  A release tag must equal "v" + FIRMWARE_VERSION, with no -dev suffix.    */
#define FIRMWARE_VERSION "0.8.0-dev"
#define PROJECT_NAME     "AuroraDemo_CYD"  // frozen: installer manifest name

// "Based on" credit on the installer page
#define UPSTREAM_PROJECT  "Aurora"
#define UPSTREAM_AUTHOR   "Jason Coon / PixelMatix"
#define UPSTREAM_REPO_URL "https://github.com/pixelmatix/aurora"

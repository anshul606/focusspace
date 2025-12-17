const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

const commonOptions = {
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ["chrome100"],
  format: "esm",
};

async function build() {
  try {
    // Build service worker (background script)
    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/background/service-worker.ts"],
      outfile: "dist/background/service-worker.js",
    });

    // Build content scripts (no bundling needed for simple scripts)
    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/content/blocking-overlay.ts"],
      outfile: "dist/content/blocking-overlay.js",
      format: "iife", // Content scripts need IIFE format
    });

    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/content/auth-sync.ts"],
      outfile: "dist/content/auth-sync.js",
      format: "iife",
    });

    // Build popup script (IIFE for extension popup context)
    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/popup/popup.ts"],
      outfile: "dist/popup/popup.js",
      format: "iife",
    });

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();

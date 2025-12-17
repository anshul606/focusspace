const esbuild = require("esbuild");

const commonOptions = {
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ["firefox109"],
  format: "iife",
};

async function build() {
  try {
    // Build background script
    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/background/background.ts"],
      outfile: "dist/background/background.js",
    });

    // Build content scripts
    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/content/blocking-overlay.ts"],
      outfile: "dist/content/blocking-overlay.js",
    });

    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/content/auth-sync.ts"],
      outfile: "dist/content/auth-sync.js",
    });

    // Build popup script
    await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/popup/popup.ts"],
      outfile: "dist/popup/popup.js",
    });

    console.log("Firefox extension build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();

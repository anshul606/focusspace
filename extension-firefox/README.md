# Flow Firefox Extension

Firefox version of the Flow browser extension.

## Build

```bash
cd extension-firefox
npm install
npm run build
```

## Install in Firefox

1. Open Firefox and go to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

## Package for Distribution

```bash
cd extension-firefox
zip -r ../flow-firefox.zip . -x "node_modules/*" -x "src/*" -x "*.ts" -x ".DS_Store"
```

Then submit the zip to [Firefox Add-ons](https://addons.mozilla.org/).

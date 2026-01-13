const fs = require('fs');

const DIST = './dist';
const MANIFEST = './manifest.json';

// relative path to any assets that we want to copy to dist
const FILES = [MANIFEST, './component-options.json'];

FILES.forEach((SOURCE) => {
    const DESTINATION = DIST + SOURCE.replace('/src/plugin/', '/').replace('/src/ui/', '/').replace('./', '/');

    if (SOURCE === MANIFEST) {
        // For manifest, we need to adjust paths since dist manifest paths should be relative to dist folder
        const manifestContent = fs.readFileSync(SOURCE, {encoding: 'utf8', flag: 'r'});
        const manifest = JSON.parse(manifestContent);

        // Remove "dist/" prefix from paths since manifest will be in dist folder
        if (manifest.main && manifest.main.startsWith('dist/')) {
            manifest.main = manifest.main.slice(5);
        }
        if (manifest.ui && manifest.ui.startsWith('dist/')) {
            manifest.ui = manifest.ui.slice(5);
        }

        const updatedManifestContent = JSON.stringify(manifest, null, 4);

        if (fs.existsSync(DESTINATION)) {
            // only touch the manifest if it changed
            //  figma can get confused about the state of the plugin if the manifest is overwritten
            //  and will show a warning in the ui and/or require the plugin be reloaded
            const manifestDestination = fs.readFileSync(DESTINATION, {encoding: 'utf8', flag: 'r'});

            if (updatedManifestContent === manifestDestination) {
                return;
            }
        }

        fs.writeFileSync(DESTINATION, updatedManifestContent, {encoding: 'utf8'});
    } else {
        fs.copyFileSync(SOURCE, DESTINATION);
    }
});

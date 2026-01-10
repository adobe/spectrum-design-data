/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

/**
 * Build script to bundle Spectrum component schemas into a single JSON file
 * for the UI (not plugin backend)
 */

import {getAllSchemas} from '@adobe/spectrum-component-api-schemas';
import {writeFile} from 'fs/promises';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bundleSchemas() {
    try {
        console.log('📦 Bundling Spectrum component schemas...');

        // Get all schemas from the package
        const schemas = await getAllSchemas();

        // Filter to only include schemas with valid metadata
        const validSchemas = schemas
            .filter((schema) => schema.meta && schema.meta.documentationUrl)
            .map((schema) => ({
                slug: schema.slug,
                title: schema.title,
                description: schema.description,
                meta: schema.meta,
                properties: schema.properties,
                required: schema.required
            }));

        console.log(`✅ Found ${validSchemas.length} valid component schemas`);

        // Write to src/ui/ (UI bundle, not plugin bundle)
        const outputPath = resolve(__dirname, '../src/ui/bundledSchemas.json');
        await writeFile(outputPath, JSON.stringify(validSchemas, null, 2));

        console.log(`✅ Schemas bundled to: ${outputPath}`);
        console.log(`📊 Total size: ${(JSON.stringify(validSchemas).length / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error('❌ Error bundling schemas:', error);
        process.exit(1);
    }
}

bundleSchemas();

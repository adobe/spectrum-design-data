#!/bin/sh

# Export glossary to site directory for GitHub Pages deployment

set -e

# Create site directory structure
mkdir -p ../../site
rm -rf ../../site/glossary
mkdir -p ../../site/glossary

# Copy built files
cp -r dist/* ../../site/glossary/

echo "✓ Exported glossary to site/glossary/"

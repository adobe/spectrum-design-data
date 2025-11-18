# Old Repository Setup Instructions

This file contains instructions and files needed for setting up the old `adobe/spectrum-tokens` repository after the rename.

## 1. GitHub Pages Redirects

The old repository needs redirect files in its `gh-pages` branch to redirect all traffic to the new URLs.

### Main redirect page (`index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://opensource.adobe.com/spectrum-design-data/">
  <link rel="canonical" href="https://opensource.adobe.com/spectrum-design-data/" />
  <title>Redirecting to Spectrum Design Data</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
    a { color: #1473e6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Repository Renamed</h1>
  <p>This repository has been renamed to <strong>spectrum-design-data</strong>.</p>
  <p>You will be redirected automatically. If not, <a href="https://opensource.adobe.com/spectrum-design-data/">click here</a>.</p>
</body>
</html>
```

### Visualizer redirect (`visualizer/index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://opensource.adobe.com/spectrum-design-data/visualizer/">
  <link rel="canonical" href="https://opensource.adobe.com/spectrum-design-data/visualizer/" />
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://opensource.adobe.com/spectrum-design-data/visualizer/">new location</a>...</p>
</body>
</html>
```

### S2 Visualizer redirect (`s2-visualizer/index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://opensource.adobe.com/spectrum-design-data/s2-visualizer/">
  <link rel="canonical" href="https://opensource.adobe.com/spectrum-design-data/s2-visualizer/" />
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://opensource.adobe.com/spectrum-design-data/s2-visualizer/">new location</a>...</p>
</body>
</html>
```

### S2 Tokens Viewer redirect (`s2-tokens-viewer/index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://opensource.adobe.com/spectrum-design-data/s2-tokens-viewer/">
  <link rel="canonical" href="https://opensource.adobe.com/spectrum-design-data/s2-tokens-viewer/" />
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://opensource.adobe.com/spectrum-design-data/s2-tokens-viewer/">new location</a>...</p>
</body>
</html>
```

### Release Timeline redirect (`release-timeline/index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://opensource.adobe.com/spectrum-design-data/release-timeline/">
  <link rel="canonical" href="https://opensource.adobe.com/spectrum-design-data/release-timeline/" />
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://opensource.adobe.com/spectrum-design-data/release-timeline/">new location</a>...</p>
</body>
</html>
```

### Schema redirects (`schemas/*.html` - for all schema paths):

You'll want to set up a catch-all or create specific redirects for common schema paths. GitHub Pages supports a `404.html` that can handle this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script>
    // Redirect schema paths
    const path = window.location.pathname;
    const newUrl = 'https://opensource.adobe.com/spectrum-design-data' + path;
    window.location.replace(newUrl);
  </script>
  <meta http-equiv="refresh" content="0; url=https://opensource.adobe.com/spectrum-design-data/">
  <title>Redirecting...</title>
</head>
<body>
  <p>This page has moved. Redirecting...</p>
</body>
</html>
```

## 2. Repository Description

Update the old repository description to:

```
⚠️ This repository has been renamed to spectrum-design-data. Redirects are maintained here for GitHub Pages URLs. Visit https://github.com/adobe/spectrum-design-data
```

## 3. Placeholder Discussion

Create a pinned discussion in the old repository with:

**Title:** Repository Renamed to spectrum-design-data

**Body:**

```markdown
# Repository Renamed

This repository has been renamed from `spectrum-tokens` to **`spectrum-design-data`** to better reflect its expanded scope.

## New Repository Location

🔗 **https://github.com/adobe/spectrum-design-data**

## What This Means

- All GitHub Pages URLs are redirected automatically
- Git operations (clone, push, pull) are automatically redirected by GitHub
- Please update your bookmarks and links to use the new repository name
- The NPM package names (`@adobe/spectrum-tokens`, `@adobe/spectrum-component-api-schemas`) remain unchanged

## Documentation

- **New Docs Site:** https://opensource.adobe.com/spectrum-design-data/
- **Visualizer:** https://opensource.adobe.com/spectrum-design-data/visualizer/
- **S2 Visualizer:** https://opensource.adobe.com/spectrum-design-data/s2-visualizer/

Thank you for your understanding!
```

## 4. Archive the Repository

After all redirects are set up and tested:

1. Go to Settings → General
2. Scroll to "Danger Zone"
3. Click "Archive this repository"
4. Confirm the action

This will make the repository read-only while preserving all redirects.

## Implementation Steps

1. Clone the old repo: `git clone https://github.com/adobe/spectrum-tokens.git old-spectrum-tokens`
2. Switch to gh-pages branch: `git checkout gh-pages`
3. Create the redirect files above in the appropriate locations
4. Commit and push: `git add . && git commit -m "Add redirects to spectrum-design-data" && git push`
5. Update repository description via GitHub UI
6. Create and pin the discussion
7. Test all redirect URLs
8. Archive the repository

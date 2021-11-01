# Spectrum Style Dictionary

## Getting started

Start by installing all the project dependencies.

```bash
yarn install
```

Then build the project.

```bash
yarn run build
```



This example code is bare-bones to show you what this framework can do. If you have the style-dictionary module installed globally, you can `cd` into this directory and run:
```bash
yarn install
```

You should see something like this output:
```
Copying starter files...

Source style dictionary starter files created!

Running `style-dictionary build` for the first time to generate build artifacts.


css
✔︎  dist/css/variables.css

js
✔︎  dist/js/variables.js
```

Good for you! You have now built your first style dictionary! Moving on, take a look at what we have built. This should have created a dist directory and it should look like this:
```
├── README.md
├── config.json
├── tokens/
│   ├── color/
│       ├── base.json
│       ├── font.json
│   ├── size/
│       ├── font.json
├── dist/
│   ├── css/
│      ├── variables.css
│   ├── js/
│      ├── variables.js
```

If you open `config.json` you will see there are 5 platforms defined: css and js,. Each platform has a transformGroup, buildPath, and files. The buildPath and files of the platform should match up to the files what were built. The files built should look like these:

**CSS**
```css
// variables.css
:root {
  --size-font-large: 2rem; /* the large size of the font */
  --size-font-medium: 1rem; /* the medium size of the font */
  --size-font-small: 0.75rem; /* the small size of the font */
  --color-base-green: #00ff00;
  --color-base-red: #ff0000;
  --color-base-gray-dark: #111111;
  --color-base-gray-medium: #999999;
  --color-base-gray-light: #cccccc;
  --size-font-base: var(--size-font-medium); /* the base size of the font */
  --color-font-tertiary: var(--color-base-gray-light);
  --color-font-secondary: var(--color-base-green);
  --color-font-base: var(--color-base-red);
}
```

**Javascript/object**
```js
var _styleDictionary = {
  "color": {
    "base": {
      "gray": {
        "light": {
          "value": "#cccccc",
          "filePath": "tokens/color/base.json",
          "isSource": true,
          "original": {
            "value": "#CCCCCC"
          },
          "name": "ColorBaseGrayLight",
          "attributes": {
            "category": "color",
            "type": "base",
            "item": "gray",
            "subitem": "light"
          },
          "path": [
            "color",
            "base",
            "gray",
            "light"
          ]
        },
        "medium": {
          "value": "#999999",
          "filePath": "tokens/color/base.json",
          "isSource": true,
          "original": {
            "value": "#999999"
          },
          "name": "ColorBaseGrayMedium",
          "attributes": {
            "category": "color",
            "type": "base",
            "item": "gray",
            "subitem": "medium"
          },
          "path": [
            "color",
            "base",
            "gray",
            "medium"
          ]
        },
        "dark": {
          "value": "#111111",
          "filePath": "tokens/color/base.json",
          "isSource": true,
          "original": {
            "value": "#111111"
          },
          "name": "ColorBaseGrayDark",
          "attributes": {
            "category": "color",
            "type": "base",
            "item": "gray",
            "subitem": "dark"
          },
          "path": [
            "color",
            "base",
            "gray",
            "dark"
          ]
        }
      },
      "red": {
        "value": "#ff0000",
        "filePath": "tokens/color/base.json",
        "isSource": true,
        "original": {
          "value": "#FF0000"
        },
        "name": "ColorBaseRed",
        "attributes": {
          "category": "color",
          "type": "base",
          "item": "red"
        },
        "path": [
          "color",
          "base",
          "red"
        ]
      },
      "green": {
        "value": "#00ff00",
        "filePath": "tokens/color/base.json",
        "isSource": true,
        "original": {
          "value": "#00FF00"
        },
        "name": "ColorBaseGreen",
        "attributes": {
          "category": "color",
          "type": "base",
          "item": "green"
        },
        "path": [
          "color",
          "base",
          "green"
        ]
      }
    },
    "font": {
      "base": {
        "value": "#ff0000",
        "filePath": "tokens/color/font.json",
        "isSource": true,
        "original": {
          "value": "{color.base.red.value}"
        },
        "name": "ColorFontBase",
        "attributes": {
          "category": "color",
          "type": "font",
          "item": "base"
        },
        "path": [
          "color",
          "font",
          "base"
        ]
      },
      "secondary": {
        "value": "#00ff00",
        "filePath": "tokens/color/font.json",
        "isSource": true,
        "original": {
          "value": "{color.base.green.value}"
        },
        "name": "ColorFontSecondary",
        "attributes": {
          "category": "color",
          "type": "font",
          "item": "secondary"
        },
        "path": [
          "color",
          "font",
          "secondary"
        ]
      },
      "tertiary": {
        "value": "#cccccc",
        "filePath": "tokens/color/font.json",
        "isSource": true,
        "original": {
          "value": "{color.base.gray.light.value}"
        },
        "name": "ColorFontTertiary",
        "attributes": {
          "category": "color",
          "type": "font",
          "item": "tertiary"
        },
        "path": [
          "color",
          "font",
          "tertiary"
        ]
      }
    }
  },
  "size": {
    "font": {
      "small": {
        "value": "0.75rem",
        "comment": "the small size of the font",
        "filePath": "tokens/size/font.json",
        "isSource": true,
        "original": {
          "value": "0.75",
          "comment": "the small size of the font"
        },
        "name": "SizeFontSmall",
        "attributes": {
          "category": "size",
          "type": "font",
          "item": "small"
        },
        "path": [
          "size",
          "font",
          "small"
        ]
      },
      "medium": {
        "value": "1rem",
        "comment": "the medium size of the font",
        "filePath": "tokens/size/font.json",
        "isSource": true,
        "original": {
          "value": "1",
          "comment": "the medium size of the font"
        },
        "name": "SizeFontMedium",
        "attributes": {
          "category": "size",
          "type": "font",
          "item": "medium"
        },
        "path": [
          "size",
          "font",
          "medium"
        ]
      },
      "large": {
        "value": "2rem",
        "comment": "the large size of the font",
        "filePath": "tokens/size/font.json",
        "isSource": true,
        "original": {
          "value": "2",
          "comment": "the large size of the font"
        },
        "name": "SizeFontLarge",
        "attributes": {
          "category": "size",
          "type": "font",
          "item": "large"
        },
        "path": [
          "size",
          "font",
          "large"
        ]
      },
      "base": {
        "value": "1rem",
        "comment": "the base size of the font",
        "filePath": "tokens/size/font.json",
        "isSource": true,
        "original": {
          "value": "{size.font.medium.value}",
          "comment": "the base size of the font"
        },
        "name": "SizeFontBase",
        "attributes": {
          "category": "size",
          "type": "font",
          "item": "base"
        },
        "path": [
          "size",
          "font",
          "base"
        ]
      }
    }
  }
};
```

Pretty nifty! This shows a few things happening:
1. The build system does a deep merge of all the token JSON files defined in the `source` attribute of `config.json`. This allows you to split up the token JSON files however you want. There are 2 JSON files with `color` as the top level key, but they get merged properly.
1. The build system resolves references to other design tokens. `{size.font.medium.value}` gets resolved properly.
1. The build system handles references to token values in other files as well as you can see in `tokens/color/font.json`.

Now let's make a change and see how that affects things. Open up `tokens/color/base.json` and change `"#111111"` to `"#000000"`. After you make that change, save the file and re-run the build command `style-dictionary build`. Open up the build files and take a look.

**Huzzah!**

Now go forth and create! Take a look at all the built-in [transforms](https://amzn.github.io/style-dictionary/#/transforms?id=pre-defined-transforms) and [formats](https://amzn.github.io/style-dictionary/#/formats?id=pre-defined-formats).

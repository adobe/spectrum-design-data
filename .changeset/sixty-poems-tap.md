---
"@adobe/spectrum-tokens": minor
---

- [Updated thumbnail size tokens and added new tokens](https://github.com/adobe/spectrum-tokens-studio-data/pull/144)
- [Updated S2 Action bar tokens](https://github.com/adobe/spectrum-tokens-studio-data/pull/149)

## Design Motivation

Thumbnail: updated sizes in order for opacity checkerboards to translate better in implementation.

⚠️ Important note: Accepting updates from this release will update the thumbnail sizes. The change in size is no more than 4 px. In some cases, you may want to relink to a new size. View the migration guide below to find the closest recommended size:

| Former thumbnail size | Available thumbnail size                 |
| :-------------------- | :--------------------------------------- |
| size 50 (16 x 16)     | size 50 (16 x 16)                        |
| size 75 (18 x 18)     | size 75 (20 x 20)                        |
| size 100 (20 x 20)    | size 75 (20 x 20)                        |
| size 200 (22 x 22)    | size 100 (24 x 24)                       |
| size 300 (26 x 26)    | size 200 (28 x 28)                       |
| size 400 (28 x 28)    | size 200 (28 x 28)                       |
| size 500 (32 x 32)    | size 300 (32 x 32)                       |
| size 600 (36 x 36)    | size 400 (36 x 36)                       |
| size 700 (40 x 40)    | size 500 (40 x 40)                       |
| size 800 (44 x 44)    | size 600 (44 x 44)                       |
| size 900 (50 x 50)    | size 700 (48 x 48) or size 800 (52 x 52) |
| size 1000 (56 x 56)   | size 900 (56 x 56)                       |
| --                    | size 1000 (64 x 64)                      |

Action bar: Updated S2 action bar (non-color) in respective desktop and mobile layout sets.

## Token Diff

_Tokens added (8):_

- `action-bar-top-to-content-area`
- `action-bar-bottom-to-content-area`
- `action-bar-edge-to-content-area`
- `action-bar-close-button-to-counter`
- `action-bar-counter-font-size`
- `thumbnail-opacity-checkerboard-square-size`
- `thumbnail-corner-radius`
- `text-to-control-50`

_Tokens updated (2):_

- `action-bar-height`
- `action-bar-top-to-item-counter`

_Token values updated (11):_

- `thumbnail-size-75`
  - `desktop`: `18px` -> `20px`
  - `mobile`: `22px` -> `24px`
- `thumbnail-size-100`
  - `desktop`: `20px` -> `24px`
  - `mobile`: `26px` -> `28px`
- `thumbnail-size-200`
  - `desktop`: `22px` -> `28px`
  - `mobile`: `28px` -> `32px`
- `thumbnail-size-300`
  - `desktop`: `26px` -> `32px`
  - `mobile`: `32px` -> `36px`
- `thumbnail-size-400`
  - `desktop`: `28px` -> `36px`
  - `mobile`: `36px` -> `40px`
- `thumbnail-size-500`
  - `desktop`: `32px` -> `40px`
  - `mobile`: `40px` -> `44px`
- `thumbnail-size-600`
  - `desktop`: `36px` -> `44px`
  - `mobile`: `46px` -> `48px`
- `thumbnail-size-700`
  - `desktop`: `40px` -> `48px`
  - `mobile`: `50px` -> `52px`
- `thumbnail-size-800`
  - `desktop`: `44px` -> `52px`
  - `mobile`: `55px` -> `56px`
- `thumbnail-size-900`
  - `desktop`: `50px` -> `56px`
  - `mobile`: `62px` -> `64px`
- `thumbnail-size-1000`
  - `desktop`: `56px` -> `64px`
  - `mobile`: `70px` -> `72px`

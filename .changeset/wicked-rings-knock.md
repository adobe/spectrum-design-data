---
"@adobe/spectrum-tokens": minor
---

Updated avatar and avatar group tokens

## Description

- Updated avatar size tokens, including all sizes from `75` to `700`
- Added new avatar size tokens, from `800` to `1500`
- Added new avatar border thickness and color tokens
- Added avatar group size tokens, from `50` to `500`
- Added avatar group spacing tokens, from `50` to `500`

## Motivation and context

- Avatar: added new sizes and updated existing sizes to better match other components and work across a variety of use cases.
  - ⚠️ Important note: Accepting updates from this release will update the avatar sizes. The largest change in size is 8px. In some cases, you may want to relink to a new size. View the migration guide below to find the closest recommended size:

| Former avatar size | Available avatar size                    |
| :----------------- | :--------------------------------------- |
| size 50 (16 x 16)  | size 50 (16 x 16)                        |
| size 75 (18 x 18)  | size 50 (16 x 16) or size 75 (20 x 20)   |
| size 100 (20 x 20) | size 75 (20 x 20)                        |
| size 200 (22 x 22) | size 75 (20 x 20) or size 100 (24 x 24)  |
| size 300 (26 x 26) | size 100 (24 x 24) or size 200 (28 x 28) |
| size 400 (28 x 28) | size 200 (28 x 28)                       |
| size 500 (32 x 32) | size 300 (32 x 32)                       |
| size 600 (36 x 36) | size 400 (36 x 36)                       |
| size 700 (40 x 40) | size 500 (40 x 40)                       |
| --                 | size 600 (44 x 44)                       |
| --                 | size 700 (48 x 48)                       |
| --                 | size 800 (52 x 52)                       |
| --                 | size 900 (56 x 56)                       |
| --                 | size 1000 (64 x 64)                      |
| --                 | size 1100 (72 x 72)                      |
| --                 | size 1200 (80 x 80)                      |
| --                 | size 1300 (88 x 88)                      |
| --                 | size 1400 (96 x 96)                      |
| --                 | size 1500 (104 x 104)                    |

## Token Diff

_Tokens added (24):_

- `avatar-border-color`
- `avatar-border-width`
- `avatar-group-size-100`
- `avatar-group-size-200`
- `avatar-group-size-300`
- `avatar-group-size-400`
- `avatar-group-size-50`
- `avatar-group-size-500`
- `avatar-group-size-75`
- `avatar-size-1000`
- `avatar-size-1100`
- `avatar-size-1200`
- `avatar-size-1300`
- `avatar-size-1400`
- `avatar-size-1500`
- `avatar-size-800`
- `avatar-size-900`
- `avatar-to-avatar-100`
- `avatar-to-avatar-200`
- `avatar-to-avatar-300`
- `avatar-to-avatar-400`
- `avatar-to-avatar-50`
- `avatar-to-avatar-500`
- `avatar-to-avatar-75`

_Token values updated (8):_

- `avatar-size-100`
- `avatar-size-200`
- `avatar-size-300`
- `avatar-size-400`
- `avatar-size-500`
- `avatar-size-600`
- `avatar-size-700`
- `avatar-size-75`

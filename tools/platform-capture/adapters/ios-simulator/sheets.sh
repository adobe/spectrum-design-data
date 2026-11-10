#!/bin/zsh
# Copyright 2026 Adobe. All rights reserved.
# Licensed under the Apache License, Version 2.0.
# usage: sheets.sh <shotsDir> <outDir>  (needs ImageMagick)
# One sheet per component/variant dir, light|dark pairs labelled by state.
# Crop assumes 1206x2622 screenshots (iPhone 17 Pro).
S=$1; O=$2; mkdir -p $O
FONT=/System/Library/Fonts/Supplemental/Arial.ttf
for d in $S/*/*/; do
  c=${d:h:t}; f=${d:t}
  args=()
  for l in $d*.light.png; do
    n=${l:t:r:r}; dk=${l:r:r}.dark.png
    args+=( \( -label "$n" $l -crop 1206x900+0+355 +repage -resize 300x \) \( -label "$n (dark)" $dk -crop 1206x900+0+355 +repage -resize 300x \) )
  done
  magick montage -font $FONT -pointsize 14 -fill white -background '#444' -tile 6x -geometry +4+4 $args $O/$c-$f.png 2>&1 | tail -1
  echo $O/$c-$f.png
done

#!/bin/sh
# Renders the Chrome Web Store images into public/store-listing/ and the site's link-preview
# images and apple-icon into src/app/, and the extension's toolbar icons. Requires Google Chrome.
set -e
cd "$(dirname "$0")"
OUT=../../public/store-listing
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() {
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --allow-file-access-from-files \
    --virtual-time-budget=3000 --window-size="$2" --screenshot="$3" "file://$PWD/$1" 2>/dev/null
  # The store wants 24-bit PNGs (no alpha channel).
  python3 -c "from PIL import Image; import sys; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[1])" "$3"
}
# Extension icons keep their alpha channel (transparent margin around the tile).
icon() {
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 \
    --virtual-time-budget=1000 --window-size="$1,$1" --screenshot="../../extension/icons/$1.png" "file://$PWD/icon.html?size=$1&pad=$2&stroke=$3" 2>/dev/null
}
icon 16 0 3
icon 48 2 2.5
icon 128 8 2.25
shot screenshot-1.html 1280,800 $OUT/02-screenshot-1-1280x800.png
shot screenshot-2.html 1280,800 $OUT/03-screenshot-2-1280x800.png
shot screenshot-3.html 1280,800 $OUT/04-screenshot-3-1280x800.png
shot small-promo.html 440,280 $OUT/05-small-promo-tile-440x280.png
shot marquee-promo.html 1400,560 $OUT/06-marquee-promo-tile-1400x560.png
APP=../../src/app
shot og-image.html 1200,630 $APP/opengraph-image.png
cp $APP/opengraph-image.png $APP/twitter-image.png
shot apple-icon.html 180,180 $APP/apple-icon.png
cp ../../extension/icons/128.png "$OUT/01-store-icon-128x128.png"

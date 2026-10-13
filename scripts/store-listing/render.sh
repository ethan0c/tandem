#!/bin/sh
# Renders the Chrome Web Store images into public/store-listing/. Requires Google Chrome.
set -e
cd "$(dirname "$0")"
OUT=../../public/store-listing
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() {
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --allow-file-access-from-files \
    --virtual-time-budget=3000 --window-size="$2" --screenshot="$OUT/$3" "file://$PWD/$1" 2>/dev/null
  # The store wants 24-bit PNGs (no alpha channel).
  python3 -c "from PIL import Image; import sys; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[1])" "$OUT/$3"
}
shot screenshot-1.html 1280,800 02-screenshot-1-1280x800.png
shot screenshot-2.html 1280,800 03-screenshot-2-1280x800.png
shot screenshot-3.html 1280,800 04-screenshot-3-1280x800.png
shot small-promo.html 440,280 05-small-promo-tile-440x280.png
shot marquee-promo.html 1400,560 06-marquee-promo-tile-1400x560.png
cp ../../extension/icons/128.png "$OUT/01-store-icon-128x128.png"

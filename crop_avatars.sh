#!/bin/bash

# Sprite sheet: 1408 x 768
# Grid: 7 columns, 4 rows
# Width per avatar: 1408 / 7 = 201.14 -> let's use 200
# Height per avatar: 768 / 4 = 192

SHEET="public/avatars/sprite_sheet.png"
OUTPUT_DIR="public/avatars"
WIDTH=200
HEIGHT=192

count=1
for row in {0..3}
do
  for col in {0..6}
  do
    X=$((col * 1408 / 7))
    Y=$((row * 768 / 4))
    
    # sips crop format: --cropToHeightWidth h w --cropOffset y x
    # Note: sips crop is a bit weird, sometimes it crops from center. 
    # Actually, sips -c H W is better for specific size, but offset is tricky.
    # Alternative: use sips to extract a slice.
    
    FILE_NAME="capy_extra_${count}.png"
    echo "Cropping $FILE_NAME at $X, $Y"
    
    # We use a temporary file to avoid modifying the sheet
    cp "$SHEET" "$OUTPUT_DIR/$FILE_NAME"
    sips --cropToHeightWidth $HEIGHT $WIDTH --cropOffset $Y $X "$OUTPUT_DIR/$FILE_NAME" > /dev/null
    
    count=$((count + 1))
  done
done

echo "Done! 28 avatars created."

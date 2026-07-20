#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE="$ROOT/src/styles"
OUTPUT="$ROOT/publish/styles"

mkdir -p "$OUTPUT"

combine() {
  target=$1
  shift
  cat "$@" > "$OUTPUT/$target"
}

combine game.css "$SOURCE/game.css"
combine menus.css "$SOURCE/menus.css"
combine screens.css "$SOURCE/screens.css"
combine systems-core.css \
  "$SOURCE/systems.css" \
  "$SOURCE/career.css" \
  "$SOURCE/life-loop.css"
combine systems-extended.css \
  "$SOURCE/advanced-systems.css" \
  "$SOURCE/education.css"
combine workflow.css \
  "$SOURCE/admissions.css" \
  "$SOURCE/school-lines.css" \
  "$SOURCE/save-manager.css"
combine social-market.css \
  "$SOURCE/social-world.css" \
  "$SOURCE/market.css" \
  "$SOURCE/civic.css"
combine character-tools.css \
  "$SOURCE/hunter-chat.css" \
  "$SOURCE/property-quick.css"
combine feature-cards.css \
  "$SOURCE/character-cards.css" \
  "$SOURCE/household.css" \
  "$SOURCE/creator.css"

printf 'Built 9 stylesheet bundles in %s\n' "$OUTPUT"

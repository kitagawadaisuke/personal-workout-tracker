# SlowRep 1.0.4 — App Store assets

- Icon: `../../assets/icon.png` (1024 × 1024, opaque PNG). Also copied to splash-icon.png and adaptive-icon.png.
- iPhone: `iphone-01-menu.png` through `iphone-04-timer.png` (1284 × 2778, opaque PNG).
- iPad: `ipad-01-menu.png` through `ipad-04-timer.png` (2048 × 2732, opaque PNG).
- Order: menu, calendar, add exercise, timer.
- `raw/`: actual Expo Go native app screenshots from dedicated iPhone 14 Plus and iPad Pro 12.9-inch simulators, using sample workout data. Existing user simulator data was not changed.
- `preview.png`: review sheet only; do not upload this image.
- `render.swift`: AppKit layout combining unaltered native captures and Japanese captions. Run `swift appstore_screenshots/v1.0.4/render.swift "$PWD"` from the project root.

## Icon generation

Mode: built-in image generation tool. Generated artwork resized to 1024 × 1024 using sips. No separate model setting was supplied.

Prompt:

Create a premium iOS app icon for SlowRep, a mindful strength-training log and metronome app. Square 1024x1024 opaque full-bleed artwork, no rounded outside corners, no text, no letters, no mockup, no border. Solid deep forest background #101815. One confident, beautifully balanced mint-green (#9BE2C2) emblem, centered with generous 20% safe padding: a simple bold metronome silhouette / rounded trapezoid, with a diagonal pendulum, subtly integrating a short dumbbell-shaped horizontal base to suggest strength training. The visual must read as ONE coherent symbol, not a collage of two icons. Contemporary high-end fitness app identity, geometric, broad smooth strokes, strong negative space, restrained subtle tactile dimensionality with very soft top lighting, nearly flat. Recognizable at 48 pixels. No neon, no glow, no gradients in the background, no tiny ticks, no numbers, no letters, no circular outer ring. Dark forest and pale mint only. Make it elegant and disciplined.

## Validation

All upload assets have the intended pixel dimensions and no alpha channel. Layouts visually checked for text clipping and screenshot content. iOS production build 23 includes the new icon; version 1.0.4, bundle com.d.workouttracker.

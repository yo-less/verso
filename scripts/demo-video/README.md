# Verso demo video

Run **Generate Verso demo video** on the review branch or manually after merging. It builds the selected source in an isolated container and captures the real UI with a fictional library. Additional reading statistics are seeded only into the disposable demo. The conceptual import and e-reader animations explain features; they do not claim to record hardware synchronization or a live import.

V2 is exactly 40 seconds (1200 frames), with 1.5-second opening and closing, no recurring chapter furniture, and short scene crossfades. The render checks the actual pixels inside each independently timed vector checkmark, and exports intermediate import frames for review. Portrait year-review shots are captured at their actual viewport size rather than cropped from desktop screenshots.

The composition is time-driven at 30 fps, with independent scenes in `motion.js`. Chromium renders frames and FFmpeg encodes silent H.264, 1920×1080, with a size cap below 10 MB. The artifact includes an MP4, poster, scene review images and a source manifest. Review before publishing; this workflow does not replace the inherited README video or push production changes.

To regenerate, run the workflow against the desired commit. Edit scene lengths, layouts and text in `motion.js`; the capture script provides the real screens and statistics.

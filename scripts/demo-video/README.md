# Verso demo video

The **Generate Verso demo video** workflow builds the checked-out Verso source, seeds a disposable library, and records the interface. It runs on changes to `demo-video-preview` and can also be started manually from the Actions tab. Open the completed run and download **verso-demo-video** under **Artifacts** for the MP4. Review frames, the timeline manifest and logs are in **verso-demo-review**. The production image workflow uses the main branch.

## Add a section

1. Capture any new interface views in `capture.py` and register their filenames in the asset list near the start of `motion.js`. Use the seeded library so the captures are reproducible.
2. Draw the section in a function that takes time in seconds relative to the start of the section. Reuse helpers such as `browser`, `title` and `step` for framing, typography and easing.
3. Insert an entry in the `scenes` array with a unique `id`, the duration in `len` and the drawing function in `draw`. Add optional `review` offsets to export particular frames. The default entry is a dissolve. Use `entry: "wipe"` for an incoming reveal or `entry: "continuous"` when the drawing function carries a composition forward from the previous section.
4. Run the preview workflow and inspect the MP4 and review frames. The renderer derives the duration, review timestamps, and manifest directly from the scene entries.

## Local render

Follow the seed, capture and render order in `.github/workflows/demo-video.yml`. Set `DEMO_ROOT` to the isolated library directory, `DEMO_URL` to the local Verso instance, `DEMO_OUT` to the capture directory, and `VIDEO_OUT` to the export directory.

Use English Chromium for the capture run. The Branding captures show the native, Verso-styled file controls; their labels use the browser's UI language. The Year in Books carousel uses portrait screenshots of the actual Verso page. The page itself controls the layout, instance artwork, palette and swipe behavior. The video compositor provides the phone frames and forest-green backdrop.

The Actions preview is 1080p at 30 fps. The renderer feeds lossless PNG frames to the H.264 encoder at CRF 17. The artifact size varies with the footage.

The default MP4 is a silent preview. To render with the licensed [Keys of Time by Good_B_Music](https://pixabay.com/music/modern-classical-keys-of-time-no-ai-335937/), set `DEMO_MUSIC` to your local copy and optionally set `DEMO_MUSIC_OFFSET` in seconds. The final edit uses a 28.5-second offset, a 0.9-second curved fade-in and a four-second smooth fade-out with a short silent tail, aligned to the source music decay. Keep the download certificate and the standalone music file out of the repository.


### Music in GitHub Actions

For automatic soundtrack mixing, set the repository Actions secret `DEMO_MUSIC_URL` to an HTTPS download URL for the licensed original Keys of Time MP3. The URL must return the exact file (not a sharing or playback page). If it is a private GitHub repository contents API URL, also set `DEMO_MUSIC_TOKEN` to a fine-grained token with read-only Contents access to that private repository. Never put the standalone soundtrack into the public Verso repository or workflow artifacts.

The workflow verifies the SHA-256 of the original licensed MP3, stores it in runner-temporary storage, and passes it to the renderer. The resulting artifact is `verso-demo.mp4` with integrated stereo AAC. If the secret is absent, the workflow explicitly warns and emits only the named silent review render. A wrong or inaccessible download fails the job rather than silently using another track.

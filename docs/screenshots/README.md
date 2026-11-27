# Screenshots

Images used by the project README, taken from a sample library at 1440×900 (2× pixel density,
downscaled to 1920 px wide) in light and dark mode.

| File | Shows |
| --- | --- |
| `hero.png` | Mobile login beside the desktop library |
| `library-light.png`, `library-dark.png` | Home page |
| `book-light.png`, `book-dark.png` | A book page |
| `kobo-light.png`, `kobo-dark.png` | Profile → Kobo setup |
| `customize-dark.png` | Customize page with the Aurora style selected |
| `styled-sunset-light.png` | Home page with the Sunset style |
| `mobile.png` | Three phone screens side by side |
| `year.png` | Four slides of Your year in books, in a 2×2 layout |
| `highlights-light.png`, `highlights-dark.png` | Highlights page |

The README shows the light or dark version according to the reader's GitHub theme. Keep the file
names when you replace an image.

## Demo video

`docs/media/scriptorium-demo.mp4` (1920×1080, 30 fps, one minute) and its cover
`docs/media/scriptorium-demo-poster.jpg` are linked from the project README. The video is built from
screenshots of a demo library like these, animated in a browser page and encoded with H.264. Keep it
under 10 MB, so it can also be uploaded to GitHub and played inline in the README.

## Recreating the Verso screenshots

Run **Capture Verso screenshots** from the Actions tab. It builds the selected checkout,
starts a disposable instance on the runner's loopback interface, and creates a sample library
using classic titles, original generated cover artwork and fictional reading history. It uploads
PNG screenshots, a review contact sheet, and a source-commit manifest as an Actions artifact.
No personal libraries, real device tokens, or production credentials are used. The generated
EPUBs are short synthetic samples, not redistributions of the named works.

On the preview branch, when the approved landscape is present and the capture succeeds, the workflow stages the allowlisted PNGs in this directory. Review the results before merging into main. The hero is a composition
of actual desktop library and mobile login captures, not a claim of a hardware sync test. Kobo setup is
captured before generating a token. The original upstream images and video remain until
replacement captures have been reviewed. The preview branch triggers the same workflow.

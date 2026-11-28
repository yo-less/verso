<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="cps/static/verso-wordmark-dark.svg">
    <img src="cps/static/verso-wordmark.svg" width="400" alt="Verso">
  </picture>
</h1>

<p align="center">
  A self-hosted ebook library and reading platform.<br>
  Your books, your devices, your library.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> · <a href="#see-it-in-action">See it in action</a> · <a href="docs/README.md">Documentation</a>
</p>

![The Verso library: passage of the day, reading progress and recommendations](docs/screenshots/library-light.png)

## See it in action

https://github.com/user-attachments/assets/452935af-4322-41e1-8c60-38b1abe9a43c
<sub>Music: <a href="https://pixabay.com/music/modern-classical-keys-of-time-no-ai-335937/">Keys of Time (No AI)</a> by Good_B_Music, via Pixabay.</sub>

![A library that goes with you — an illustration of Verso across desktop, e-reader and phone](docs/screenshots/verso-reading-across-devices.jpg)

Automatically import and organize ebooks, synchronize reading with Kobo and KOReader, and revisit your highlights and reading history. Your books remain in a standard Calibre library.

## Quick start

Install with Docker Compose on amd64 or arm64.

```bash
git clone https://github.com/yo-less/verso.git verso
cd verso
docker compose up -d
```

Open **http://localhost:8083** and create your administrator account.

The included Compose file uses `ghcr.io/yo-less/verso:latest` and three persistent folders:

| Folder | Purpose |
| --- | --- |
| `./config` | Settings and user data |
| `./library` | Your Calibre library, new or existing |
| `./ingest` | Drop completed ebook files here; files are removed after import |

Back up your config and library before updating or migrating. To update, run `docker compose pull && docker compose up -d`.

[Installation and configuration](docs/installation.md) · [Migration from Calibre-Web or CWA](docs/installation.md) · [Updates and backups](docs/updating-and-backups.md)

![Make it yours — an illustration of Classic and Smoky Aubergine](docs/screenshots/verso-personalization.jpg)

Choose a personal colour palette, light or dark appearance, and cover quality. Administrators can customize the instance branding.

<sub>The opening library screenshot and demo show the actual application. The two editorial illustrations are AI-generated conceptual artwork.</sub>

## Documentation

[All documentation](docs/README.md) · [Kobo](docs/kobo.md) · [KOReader](docs/koreader.md) · [Remote access](docs/remote-access.md) · [Issues](https://github.com/yo-less/verso/issues)

## Credits & license

Verso is a fork of [Scriptorium](https://github.com/MrColoo/scriptorium-library), built on [Calibre-Web-Automated](https://github.com/crocodilestick/Calibre-Web-Automated), [Calibre-Web](https://github.com/janeczku/calibre-web) and [Calibre](https://calibre-ebook.com). Scriptorium introduced the redesigned interface, readers, personal styles, highlights and annual reading review; Verso builds on that work with its own visual identity, instance branding, cover-quality controls and device-sync refinements.

This project uses AI for development and visual assets. Licensed under [GPL-3.0 or later](LICENSE), without warranty. See [NOTICE](NOTICE) and [CONTRIBUTORS](CONTRIBUTORS) for third-party credits.

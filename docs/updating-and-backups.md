# Updating and backups

## Updating

The container image is published from successful builds of the main branch. Check the project's Actions page for the latest build; an in-app release notification is not a substitute for checking image availability.

Update in three steps, from the folder with your `docker-compose.yml`:

1. [Back up](#backups) your `config` folder.
2. Download the new image and restart on it:

   ```bash
   docker compose pull && docker compose up -d
   ```

3. Open Verso after the container has started. Check that your library and devices work.
4. If you use KOReader, check whether the release needs a newer plugin: Verso shows *Update
   the KOReader plugin* on the home page when one of your devices is behind. See
   [Keeping the plugin up to date](koreader.md#keeping-the-plugin-up-to-date).

Your books and settings live outside the container, so replacing it does not touch them. Old images
take up disk space after a few updates. To clear unused ones:

```bash
docker image prune
```

To turn the check off, untick *Automatically check for new updates* in the update dialog.

> [!NOTE]
> The update is a command on purpose. Giving a web app control of Docker would be a serious
> security risk. If you want updates to run on their own, tools such as
> [Watchtower](https://containrrr.dev/watchtower/) can do it, at the price of updates arriving
> before you have read the notes or made a backup.

## Choosing a version

The [Build Verso image workflow](../.github/workflows/publish.yml) publishes `ghcr.io/yo-less/verso:latest` and a tag containing the full Git commit SHA of each successfully built main-branch image.

Use `:latest` for ordinary updates, or a published commit SHA tag to pin a known build. Find successful builds in [GitHub Actions](https://github.com/yo-less/verso/actions/workflows/publish.yml). The current publishing workflow does not promise upstream-style semantic-version tags.

## Going back to an earlier version

Replace the image tag in your Compose file with a previously published full commit SHA, then run:

```bash
docker compose pull && docker compose up -d
```

Restoring the backup taken before updating is the safest rollback if the database format changed. Do not assume every newer build can be downgraded without restoring data.

## Backups

Everything that matters lives in two folders, `config` and `library`. Stop the container to get a
consistent copy of the databases:

```bash
docker compose stop
tar czf verso-backup-$(date +%F).tar.gz config library
docker compose start
```

| Folder | What you would lose without it |
| --- | --- |
| `config` | Users, settings, shelves, reading progress, highlights, statistics. |
| `library` | The books, and their metadata. |

`config/processed_books` holds the automatic backups of your originals, and can grow large. To leave
it out, add `--exclude=config/processed_books` to the `tar` command.

> [!WARNING]
> A copy on the same disk is not a backup. Keep one on another disk, and one somewhere else: an
> external drive, another computer, or an encrypted cloud destination.

### Automatic backups

On Linux, a small script and a scheduled job do it for you. Save this as `backup.sh` in your
Verso installation folder, adjusting the two paths:

```bash
#!/bin/sh
cd /path/to/verso || exit 1
docker compose stop
tar czf "/path/to/backups/verso-$(date +%F).tar.gz" --exclude=config/processed_books config library
docker compose start

# Keep the last 8 archives
ls -1t /path/to/backups/verso-*.tar.gz | tail -n +9 | xargs -r rm --
```

Make it executable with `chmod +x backup.sh`, and run `crontab -e` to add a line that runs it every
Sunday at 3:00:

```cron
0 3 * * 0 /path/to/verso/backup.sh
```

For large libraries, tools such as [restic](https://restic.net) or
[BorgBackup](https://www.borgbackup.org) only store what changed. NAS systems also have their own
backup apps, such as Hyper Backup on Synology.

### Restoring

```bash
docker compose down
mv config config.old
mv library library.old
tar xzf verso-backup-2026-11-01.tar.gz
docker compose up -d
```

If the copy is good, delete `config.old` and `library.old`. Try a restore once before you need one:
a backup you have never restored is only a hope.

## Moving to a new server

1. Stop Verso on the old server and make a [backup](#backups).
2. Install Docker on the new server.
3. Copy the archive and `docker-compose.yml` across, and extract the archive.
4. Check `PUID` and `PGID`, then run `docker compose up -d`.

If the server's address changes, a few things point to the old one:

- **Kobo**: create the sync address again from the new address, and paste it into the device.
- **KOReader**: change the Server URL in the plugin.
- **OPDS apps and the installed app**: update the address, or reinstall.

With a domain name you can avoid all of this: just point it at the new server.

## Resetting a password

If you forget your password, there are three ways back.

- **Sign-in page**: enter your username and press the forgotten password link. This needs a working
  [mail server](ereaders.md#1-set-up-the-mail-server-administrator) and an email on your account.
- **Another administrator**: *Settings → Users*, open the user, and press *Reset user Password*.
- **Command line**, when you are locked out completely:

  ```bash
  docker exec -it -u abc -e CALIBRE_DBPATH=/config -w /app/calibre-web-automated \
    scriptorium python3 cps.py -s 'admin:New-Password-1'
  ```

  Replace `admin` with the username, and `scriptorium` with the container name if you changed it.
  The new password must meet the password policy: by default, at least 8 characters with a number,
  a lowercase and an uppercase letter, and a special character.

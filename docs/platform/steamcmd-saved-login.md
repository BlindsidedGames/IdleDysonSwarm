# SteamCMD saved login on the release Mac

Use `scripts/steamcmd-saved-login.py` for unattended SteamCMD commands. It uses
the existing installation at `~/Builds/steamcmd`; it does not install SteamCMD,
change the account, replace the user's home directory, or handle a password.

```sh
python3 scripts/steamcmd-saved-login.py -- +login USERNAME +app_info_print 4348570 +quit
```

The Mac SteamCMD installation shares
`~/Library/Application Support/Steam/config/config.vdf` with the desktop client.
Valve documents that this file contains the saved login and must survive
between runs. See [Uploading to Steam](https://partner.steamgames.com/doc/sdk/uploading#SteamPipe_CI_CD).
Use `quit` to finish; `logout` clears the remembered login.

The launcher serializes release invocations, saves credential-bearing configs
privately before a run, and preserves the refreshed config after a successful
run. Snapshots live in `~/Builds/steamcmd/private-auth-cache` with a private
directory and file permissions. Never commit, print, transfer, or attach them.
It can restore a missing `ConnectCache` section from that protected snapshot
while retaining the current desktop settings. It refuses malformed configs or
a concurrent config change instead of replacing them.

Unattended runs always set `@NoPromptForPassword 1`. They reject passwords on
the command line, `logout`, and `clear_credentials`. If neither the live file
nor a protected snapshot has a token, the launcher exits before starting
SteamCMD. It does not silently fall through to an empty-password login or ask
the user to authenticate on every release.

An explicit first login or a Valve-revoked token can still require account
authentication. Only when that is deliberately requested, run:

```sh
python3 scripts/steamcmd-saved-login.py --interactive-login -- +login USERNAME +quit
```

Enter any password or Steam Guard approval locally. Following a successful
login, verify a second unattended invocation succeeds from the saved cache.
Do not call persistence repaired until this repeat invocation is verified.

On 19 November 2026, the live `ConnectCache` section was empty before the
repair. The config was readable/writable and its modification time predated
the release commands that day. Searches of the established release locations
and indexed files found no older usable cache. The actor that cleared it is
unknown; an updater or desktop-client logout must not be asserted as the cause
without further evidence. The existing config was privately backed up before
any repair. The launcher prevents the observed unattended password fallback,
but cannot reconstruct an absent login token.

This tooling change is separate from the frozen 4.2.5 product candidate.

#!/usr/bin/env python3
"""Run the Mac SteamCMD installation without losing its remembered login.

Only the explicit --interactive-login mode may request credentials. Auth files
stay in the user's private SteamCMD directory, never the repository or logs.
"""

import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


TOKEN = re.compile(r'\s*(?://[^\n]*(?:\n|$)\s*)*("(?:\\.|[^"\\])*"|[{}])')


def quoted_value(token):
    return re.sub(r'\\(["\\])', r'\1', token[1:-1])


def sections(text):
    """Locate VDF sections without decoding or printing credential values."""
    tokens = []
    offset = 0
    while offset < len(text):
        match = TOKEN.match(text, offset)
        if match is None:
            if text[offset:].strip():
                raise ValueError('Unsupported Steam config syntax; left unchanged.')
            break
        tokens.append((match.group(1), match.start(1), match.end(1)))
        offset = match.end()
    found = {}

    def parse(index, parent, nested=False):
        while index < len(tokens):
            key, start, _ = tokens[index]
            if key == '}':
                if not nested:
                    raise ValueError('Unexpected config brace; left unchanged.')
                return index + 1
            if not key.startswith('"') or index + 1 >= len(tokens):
                raise ValueError('Invalid config entry; left unchanged.')
            path = parent + (quoted_value(key).lower(),)
            value = tokens[index + 1][0]
            if value == '{':
                end_index = parse(index + 2, path, True)
                if path in found:
                    raise ValueError('Duplicate config section; left unchanged.')
                found[path] = (start, tokens[end_index - 1][2],
                               tokens[index + 1][2], tokens[end_index - 1][1])
                index = end_index
            elif value.startswith('"'):
                index += 2
            else:
                raise ValueError('Invalid config value; left unchanged.')
        if nested:
            raise ValueError('Incomplete config section; left unchanged.')
        return index

    parse(0, ())
    return found


STEAM = ('installconfigstore', 'software', 'valve', 'steam')
CACHE = STEAM + ('connectcache',)


def cache_present(text):
    span = sections(text).get(CACHE)
    return span is not None and bool(text[span[2]:span[3]].strip())


def atomic_private_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, temporary = tempfile.mkstemp(prefix='.steam-auth-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def restore_cache(config, current, saved):
    current_sections = sections(current)
    saved_sections = sections(saved)
    if STEAM not in current_sections or not cache_present(saved):
        raise ValueError('No recoverable SteamCMD login cache; config unchanged.')
    saved_span = saved_sections[CACHE]
    replacement = saved[saved_span[0]:saved_span[1]]
    live_span = current_sections.get(CACHE)
    if live_span:
        restored = current[:live_span[0]] + replacement + current[live_span[1]:]
    else:
        insertion = current_sections[STEAM][3]
        restored = current[:insertion] + '\n' + replacement + '\n' + current[insertion:]
    if config.read_text() != current:
        raise ValueError('Steam changed its config concurrently; retry without altering it.')
    atomic_private_write(config, restored)
    return restored


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--steamcmd-root', type=Path,
                        default=Path.home() / 'Builds/steamcmd')
    parser.add_argument('--interactive-login', action='store_true')
    parser.add_argument('commands', nargs=argparse.REMAINDER)
    options = parser.parse_args()
    commands = options.commands
    if commands[:1] == ['--']:
        commands = commands[1:]
    if sys.platform != 'darwin':
        raise ValueError('This launcher owns the macOS SteamCMD installation only.')
    if any(arg.lstrip('+').lower() in ['logout', 'clear_credentials'] for arg in commands):
        raise ValueError('Refusing a command that clears the remembered login.')
    login = [i for i, arg in enumerate(commands) if arg.lower() == '+login']
    if len(login) != 1 or login[0] + 1 >= len(commands):
        raise ValueError('Supply exactly one +login followed by the saved username.')
    position = login[0]
    username = commands[position + 1]
    if username.startswith('+') or not re.fullmatch(r'[A-Za-z0-9_]+', username):
        raise ValueError('Invalid Steam username.')
    if position + 2 < len(commands) and not commands[position + 2].startswith('+'):
        raise ValueError('Do not supply passwords or Guard codes as command arguments.')
    if not options.interactive_login and any('nopromptforpassword' in arg.lower() for arg in commands):
        raise ValueError('The saved-login launcher owns the password-prompt setting.')
    root = options.steamcmd_root.expanduser().resolve()
    config = Path.home() / 'Library/Application Support/Steam/config/config.vdf'
    auth = root / 'private-auth-cache'
    auth.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(auth, 0o700)
    # The account digest keeps usernames and tokens out of filenames and logs.
    snapshot = auth / (hashlib.sha256(username.lower().encode()).hexdigest() + '.vdf')
    lock_path = auth / 'runner.lock'
    with lock_path.open('a+') as lock:
        os.chmod(lock_path, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        current = config.read_text()
        if cache_present(current):
            atomic_private_write(snapshot, current)
        elif snapshot.exists() and cache_present(snapshot.read_text()):
            current = restore_cache(config, current, snapshot.read_text())
            print('Restored the protected SteamCMD login cache.', flush=True)
        elif not options.interactive_login:
            print('Saved SteamCMD login token is absent; stopped before starting SteamCMD. '
                  'Existing Steam config and private snapshots were left unchanged. '
                  'No password login was attempted.', file=sys.stderr)
            return 78
        invocation = [str(root / 'steamcmd.sh')]
        if not options.interactive_login:
            invocation += ['+@NoPromptForPassword', '1']
        invocation += commands
        # A stable launch directory and a single writer preserve state across releases.
        result = subprocess.run(invocation, cwd=root)
        updated = config.read_text()
        if result.returncode == 0 and cache_present(updated):
            atomic_private_write(snapshot, updated)
            print('Preserved refreshed SteamCMD login cache privately.', flush=True)
        elif cache_present(current) and not cache_present(updated):
            print('SteamCMD removed its live login cache; the pre-run copy remains '
                  'protected for investigation. No automatic password retry.', file=sys.stderr)
        return result.returncode


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        # Exceptions describe paths/control state, never parsed VDF contents.
        print(str(error), file=sys.stderr)
        sys.exit(78)

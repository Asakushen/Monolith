#!/usr/bin/env python3
"""Idempotently migrate legacy /page/link cards into native approved friend_links."""
from __future__ import annotations
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = Path('/tmp/monolith-friend-migration-preview.json')
API = 'https://www.chillg.de/api'


def request(path: str, *, method: str = 'GET', data: dict | None = None, token: str | None = None):
    body = json.dumps(data).encode() if data is not None else None
    headers = {'Content-Type': 'application/json', 'User-Agent': 'MonolithFriendMigration/1.0'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(API + path, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode())


def main() -> int:
    if not PREVIEW.exists():
        subprocess.run([sys.executable, str(ROOT / 'scripts/extract-legacy-friends.py'), str(PREVIEW)], check=True)
    records = json.loads(PREVIEW.read_text())['nativeFriendLinks']
    password = os.environ.get('ADMIN_PASSWORD')
    if not password:
        raise SystemExit('ADMIN_PASSWORD is required via environment')
    token = request('/auth/login', method='POST', data={'password': password})['token']
    existing = request('/admin/friends', token=token)
    existing_urls = {row['url'].rstrip('/') for row in existing}
    created: list[dict[str, object]] = []
    skipped: list[str] = []
    for index, item in enumerate(records):
        url = str(item['url']).rstrip('/')
        if url in existing_urls:
            skipped.append(url)
            continue
        payload = {
            'name': item['name'],
            'url': item['url'],
            'description': item['description'],
            'avatarUrl': item['avatarUrl'],
            'status': 'approved',
            'sortOrder': index,
        }
        try:
            created.append(request('/admin/friends', method='POST', data=payload, token=token))
            existing_urls.add(url)
        except urllib.error.HTTPError as error:
            detail = error.read().decode()
            raise RuntimeError(f"failed for {item['url']}: {error.code} {detail}") from error
    result = {'sourceCount': len(records), 'createdCount': len(created), 'skippedExistingCount': len(skipped), 'created': created, 'skippedExistingUrls': skipped}
    Path('/tmp/monolith-friend-migration-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

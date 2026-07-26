#!/usr/bin/env python3
import json
import sys
from urllib.request import Request, urlopen

origin = sys.argv[1] if len(sys.argv) > 1 else 'https://www.chillg.de'
request = Request(origin + '/api/friends', headers={'User-Agent': 'MonolithFriendMigrationCheck/1.0'})
rows = json.load(urlopen(request, timeout=20))
assert len(rows) == 18, f'expected 18 native friends, got {len(rows)}'
assert all(row.get('avatarUrl') for row in rows), 'every migrated friend needs an avatar'
assert [row['sortOrder'] for row in rows] == list(range(18)), 'sort order drifted'
print('PASS: 18 approved native friends with avatars and preserved order.')

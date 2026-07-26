#!/usr/bin/env python3
"""Preview-only extraction of legacy /page/link cards for native friend_links migration."""
from __future__ import annotations
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE = "https://www.chillg.de/api/pages/link"
SELF_HOSTS = {"chillg.de", "www.chillg.de"}

class CardParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.cards: list[dict[str, str]] = []
        self.current: dict[str, str] | None = None
        self.depth = 0
        self.in_anchor = False
        self.text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag == "a" and attr.get("href", "").startswith(("https://", "http://")):
            self.current = {"url": attr["href"], "avatarUrl": "", "text": ""}
            self.in_anchor = True
            self.text = []
            self.depth = 1
        elif self.in_anchor:
            self.depth += 1
            if tag == "img" and self.current and attr.get("src"):
                self.current["avatarUrl"] = attr["src"]
                if attr.get("alt"):
                    self.current["imageAlt"] = attr["alt"]

    def handle_endtag(self, tag: str) -> None:
        if self.in_anchor:
            self.depth -= 1
            if self.depth == 0:
                assert self.current is not None
                self.current["text"] = " ".join(" ".join(self.text).split())
                self.cards.append(self.current)
                self.current = None
                self.in_anchor = False
                self.text = []

    def handle_data(self, data: str) -> None:
        if self.in_anchor:
            self.text.append(data)

def hostname(url: str) -> str:
    return re.sub(r"^www\.", "", re.sub(r"^https?://", "", url).split("/", 1)[0].lower())

def make_record(card: dict[str, str], sort_order: int) -> dict[str, object]:
    bits = card.get("text", "").split()
    name = card.get("imageAlt") or (bits[0] if bits else hostname(card["url"]))
    # Typical card text: name + optional small badge + one-line description.
    description = " ".join(bits[1:]).replace("自荐", "").strip()
    return {
        "name": html.unescape(name)[:80],
        "url": card["url"],
        "description": html.unescape(description)[:240],
        "avatarUrl": card.get("avatarUrl", ""),
        "sortOrder": sort_order,
    }

def main() -> int:
    raw = urlopen(Request(SOURCE, headers={"User-Agent": "HermesMonolithMigration/1.0"}), timeout=20).read().decode("utf-8")
    content = json.loads(raw)["content"]
    parser = CardParser()
    parser.feed(content)
    records = [make_record(c, i) for i, c in enumerate(parser.cards)]
    external = [r for r in records if hostname(str(r["url"])) not in SELF_HOSTS]
    result = {
        "source": SOURCE,
        "legacyCardCount": len(records),
        "excludedSelfLinks": len(records) - len(external),
        "nativeFriendLinks": external,
    }
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(text + "\n")
    print(text)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

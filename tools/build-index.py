#!/usr/bin/env python3
"""Skannar mappar med index.html och skriver in dem i listan i index.html."""

import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SKIP = {"tools", "node_modules", "assets"}

START = "<!-- demos:start -->"
END = "<!-- demos:end -->"


def meta(page: pathlib.Path):
    """Plockar <title> och <meta name=description> ur en demos index.html."""
    try:
        src = page.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None, None
    title = re.search(r"<title[^>]*>(.*?)</title>", src, re.S | re.I)
    desc = re.search(
        r"""<meta\s+name=["']description["']\s+content=["'](.*?)["']""", src, re.S | re.I
    )
    clean = lambda m: html.unescape(" ".join(m.group(1).split())) if m else None
    return clean(title), clean(desc)


def demos():
    for d in sorted(ROOT.iterdir()):
        if not d.is_dir() or d.name.startswith(".") or d.name in SKIP:
            continue
        page = d / "index.html"
        if not page.exists():
            continue
        title, desc = meta(page)
        yield d.name, title or d.name, desc


def render(items):
    if not items:
        return (
            '  <div class="empty">\n'
            "    Tomt än så länge. Lägg en mapp med en <code>index.html</code> "
            "i repot — listan här fyller sig själv.\n"
            "  </div>"
        )
    rows = []
    for slug, title, desc in items:
        d = f'<span class="desc">{html.escape(desc)}</span>' if desc else ""
        rows.append(
            f'    <li><a class="demo" href="{html.escape(slug)}/">'
            f'<span class="name">{html.escape(title)}</span>{d}</a></li>'
        )
    return "  <ul>\n" + "\n".join(rows) + "\n  </ul>"


def main():
    page = INDEX.read_text(encoding="utf-8")
    if START not in page or END not in page:
        sys.exit(f"Hittar inte {START} / {END} i index.html")
    items = list(demos())
    block = f"{START}\n{render(items)}\n  {END}"
    new = re.sub(
        re.escape(START) + r".*?" + re.escape(END), lambda _: block, page, flags=re.S
    )
    if new != page:
        INDEX.write_text(new, encoding="utf-8")
        print(f"index.html uppdaterad — {len(items)} demo(s)")
    else:
        print(f"index.html oförändrad — {len(items)} demo(s)")


if __name__ == "__main__":
    main()

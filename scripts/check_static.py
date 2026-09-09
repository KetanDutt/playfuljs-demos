#!/usr/bin/env python3
"""Fast dependency-free integrity checks for this static site."""
from html.parser import HTMLParser
from pathlib import Path
import re, sys
ROOT = Path(__file__).resolve().parents[1]
errors = []
class PageParser(HTMLParser):
    def __init__(self, page): super().__init__(); self.page=page; self.ids=set()
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids: errors.append(f'{self.page}: duplicate id {attrs["id"]!r}')
            self.ids.add(attrs['id'])
        key = 'href' if tag in ('a','link') else 'src' if tag in ('script','img') else None
        if not key or key not in attrs: return
        value=attrs[key].split('#')[0].split('?')[0]
        if not value or value.startswith(('http:','https:','data:','mailto:','#')): return
        target=(self.page.parent/value).resolve()
        if ROOT not in target.parents and target != ROOT: errors.append(f'{self.page}: path escapes project: {value}')
        elif not target.exists(): errors.append(f'{self.page}: missing {value}')
for page in ROOT.rglob('*.html'):
    parser=PageParser(page)
    try: parser.feed(page.read_text(encoding='utf-8'))
    except Exception as exc: errors.append(f'{page}: invalid HTML: {exc}')
for script in ROOT.rglob('*.js'):
    text=script.read_text(encoding='utf-8')
    for asset in re.findall(r"new Bitmap\(['\"]([^'\"]+)", text):
        if not (script.parent.parent/asset).exists(): errors.append(f'{script}: missing bitmap {asset}')
if errors:
    print('\n'.join('ERROR: '+e for e in errors)); sys.exit(1)
print('Static integrity check passed.')

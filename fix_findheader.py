#!/usr/bin/env python3
"""Fix findHeaderRow sheet_to_json bug in app/page.js"""
import shutil, sys
from pathlib import Path

FILE   = Path('app/page.js')
BACKUP = Path('app/page.js.bak-findheader')

PATTERNS = [
    ('var aoa = XLSX.utils.sheet_to_json(ws);',
     'var aoa = XLSX.utils.sheet_to_json(ws, {header:1});'),
    ('const aoa = XLSX.utils.sheet_to_json(ws);',
     'const aoa = XLSX.utils.sheet_to_json(ws, {header:1});'),
    ('let aoa = XLSX.utils.sheet_to_json(ws);',
     'let aoa = XLSX.utils.sheet_to_json(ws, {header:1});'),
]

if not FILE.exists():
    print(f'ERROR: {FILE} not found. Run from repo root.'); sys.exit(1)

content = FILE.read_text()
shutil.copy(FILE, BACKUP)
print(f'✓ Backup: {BACKUP}')

for old, new in PATTERNS:
    if old in content:
        count = content.count(old)
        FILE.write_text(content.replace(old, new))
        print(f'✓ Replaced {count} occurrence(s)')
        print(f'   OLD: {old}')
        print(f'   NEW: {new}')
        print('\nNext:')
        print('  git diff app/page.js')
        print('  git add app/page.js && git commit -m "fix: findHeaderRow uses header:1"')
        print('  git push')
        print('  # Then test Sheeting BOQ upload in INCOGNITO')
        sys.exit(0)

print('ERROR: No expected pattern matched. Paste the findHeaderRow function body and I will adjust.')
shutil.copy(BACKUP, FILE); BACKUP.unlink()
sys.exit(1)
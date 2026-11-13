"""Run after changing any English text in the pages.
Rebuilds src/i18n/keys.txt from the pages and moves every translation to the new line of its English text.
New texts get an empty line (Google translates them until someone writes the hand translation).
Use: python3 tools/sync_keys.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_keys import keys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, 'src', 'i18n')
def lines(p): return open(p, encoding='utf-8').read().rstrip('\n').split('\n')
old = lines(os.path.join(I18N, 'keys.txt'))
new = keys(ROOT)
for name in sorted(os.listdir(I18N)):
    if not name.endswith('.txt') or name == 'keys.txt': continue
    path = os.path.join(I18N, name)
    d = dict(zip(old, lines(path)))
    out = [d.get(k, '') for k in new]
    open(path, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    missing = sum(1 for x in out if not x)
    print(f'{name}: {len(out)} lines, {missing} empty')
open(os.path.join(I18N, 'keys.txt'), 'w', encoding='utf-8').write('\n'.join(new) + '\n')
gone = [k for k in old if k not in new]
print('keys.txt:', len(new), 'texts.', 'Removed:', len(gone))

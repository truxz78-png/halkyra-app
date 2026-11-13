"""Lists every English text the user can read (index.html + links.json + texts made by JavaScript).
Use: python3 tools/extract_keys.py  -> prints the keys; compare with src/i18n/keys.txt"""
import json, re, sys
from html.parser import HTMLParser

DYNAMIC = ["Hide", "Search cruises on", "Compare cruises on", "Find tours on", "Explore on",
           "Compare plans on", "See eSIM plans on", "Open", "Opens partner site",
           "Official website. Opens in a new page."]

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.stack=[]; s.out=[]
    def handle_starttag(s, tag, attrs):
        a=dict(attrs)
        no = tag in ('script','style','title') or a.get('translate')=='no'
        if tag in ('meta','link','img','br','input'): return
        s.stack.append(no)
    def handle_endtag(s, tag):
        if tag in ('meta','link','img','br','input'): return
        if s.stack: s.stack.pop()
    def handle_data(s, d):
        if any(s.stack): return
        t=re.sub(r'\s+',' ',d).strip()
        if t and re.search(r'[A-Za-z]', t): s.out.append(t)

PAGES = ['index.html', 'privacy.html', 'terms.html']

def keys(root='.'):
    ks=[]
    for page in PAGES:
        src=open(f'{root}/{page}', encoding='utf-8').read()
        m=re.search(r'<title>(.*?)</title>', src)
        ks.append(m.group(1).strip().replace('&amp;','&'))
        p=P(); p.feed(src); ks += p.out
    d=json.load(open(f'{root}/links.json', encoding='utf-8'))
    for g in d['groups']:
        for x in g['partners']: ks.append(x['desc'])
    ks += DYNAMIC
    seen=[]; [seen.append(k) for k in ks if k not in seen]
    return seen

if __name__=='__main__':
    print('\n'.join(keys()))

/* Halkyra translator.
   English is the official language. The page is translated to the phone language (any language).
   1) Hand-made dictionary (i18n.js) has priority.  2) Other texts use Google (client=gtx), with no Google bar.
   Brand names are protected with translate="no". The chosen language is saved on the phone. */
(function () {
  'use strict';

  var LANGS = [
    ['en','English'],['es','Español'],['pt','Português'],['fr','Français'],['de','Deutsch'],['it','Italiano'],
    ['nl','Nederlands'],['ru','Русский'],['uk','Українська'],['pl','Polski'],['cs','Čeština'],['sk','Slovenčina'],
    ['sl','Slovenščina'],['hr','Hrvatski'],['sr','Српски'],['bg','Български'],['mk','Македонски'],['ro','Română'],
    ['hu','Magyar'],['el','Ελληνικά'],['tr','Türkçe'],['ar','العربية'],['iw','עברית'],['fa','فارسی'],
    ['ur','اردو'],['hi','हिन्दी'],['bn','বাংলা'],['pa','ਪੰਜਾਬੀ'],['gu','ગુજરાતી'],['mr','मराठी'],
    ['ta','தமிழ்'],['te','తెలుగు'],['kn','ಕನ್ನಡ'],['ml','മലയാളം'],['si','සිංහල'],['ne','नेपाली'],
    ['zh-CN','简体中文'],['zh-TW','繁體中文'],['ja','日本語'],['ko','한국어'],['th','ไทย'],['vi','Tiếng Việt'],
    ['id','Bahasa Indonesia'],['ms','Bahasa Melayu'],['tl','Filipino'],['km','ខ្មែរ'],['lo','ລາວ'],['my','မြန်မာ'],
    ['mn','Монгол'],['kk','Қазақ тілі'],['ky','Кыргызча'],['uz',"O'zbek"],['az','Azərbaycan'],['ka','ქართული'],
    ['hy','Հայերեն'],['sq','Shqip'],['et','Eesti'],['lv','Latviešu'],['lt','Lietuvių'],['fi','Suomi'],
    ['sv','Svenska'],['no','Norsk'],['da','Dansk'],['is','Íslenska'],['ca','Català'],['eu','Euskara'],
    ['gl','Galego'],['af','Afrikaans'],['sw','Kiswahili'],['zu','isiZulu'],['am','አማርኛ'],['be','Беларуская']
  ];
  var RTL = { ar: 1, iw: 1, fa: 1, ur: 1 };
  var CACHE_VER = 'v1';

  function normalize(code) {
    code = String(code || 'en').toLowerCase().replace('_', '-');
    if (code.indexOf('zh') === 0) {
      return /(tw|hk|mo|hant)/.test(code) ? 'zh-TW' : 'zh-CN';
    }
    var base = code.split('-')[0];
    var map = { he: 'iw', fil: 'tl', nb: 'no', nn: 'no', jv: 'jw', in: 'id', ji: 'yi' };
    return map[base] || base;
  }
  function stored() { try { return localStorage.getItem('hk_lang'); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem('hk_lang', v); } catch (e) {} }

  var lang = normalize(stored() || (navigator.languages && navigator.languages[0]) || navigator.language || 'en');
  var DICT = (window.HK_DICT && window.HK_DICT[lang]) || {};
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('hk_tr_' + CACHE_VER + '_' + lang) || '{}') || {}; } catch (e) { cache = {}; }
  function saveCache() { try { localStorage.setItem('hk_tr_' + CACHE_VER + '_' + lang, JSON.stringify(cache)); } catch (e) {} }

  var HAS_LETTER = /[A-Za-zÀ-ɏ]/;

  function fixCase(src, tr) {
    if (!tr) return src;
    var a = src.charAt(0), b = tr.charAt(0);
    if (a && a === a.toUpperCase() && a !== a.toLowerCase() && b === b.toLowerCase() && b !== b.toUpperCase()) {
      tr = b.toUpperCase() + tr.slice(1);
    }
    return tr;
  }
  function known(s) { return DICT[s] || cache[s] || null; }
  window.HK_t = function (s) { return lang === 'en' ? s : (known(s) || s); };
  window.HK_LANG = lang;

  /* Ask Google for many texts in one request (joined by new lines). */
  function google(list) {
    var q = list.join('\n');
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' +
      encodeURIComponent(lang) + '&dt=t&q=' + encodeURIComponent(q);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      var out = '';
      (data[0] || []).forEach(function (seg) { if (seg && seg[0]) out += seg[0]; });
      var parts = out.split('\n');
      if (parts.length !== list.length) throw new Error('split');
      list.forEach(function (s, i) { cache[s] = fixCase(s, parts[i].trim()); });
    });
  }
  function googleOne(s) {
    return google([s]).catch(function () {});
  }
  function translateAll(list) {
    var todo = [];
    list.forEach(function (s) { if (!known(s) && todo.indexOf(s) < 0) todo.push(s); });
    if (!todo.length) return Promise.resolve();
    var batches = [], cur = [], len = 0;
    todo.forEach(function (s) {
      if (len + s.length > 1400 && cur.length) { batches.push(cur); cur = []; len = 0; }
      cur.push(s); len += s.length + 1;
    });
    if (cur.length) batches.push(cur);
    return batches.reduce(function (p, b) {
      return p.then(function () {
        return google(b).catch(function () {
          /* if the joined request fails, try one by one */
          return b.reduce(function (pp, s) { return pp.then(function () { return googleOne(s); }); }, Promise.resolve());
        });
      });
    }, Promise.resolve()).then(saveCache);
  }

  /* Collect the visible texts (skip scripts and translate="no") */
  function textNodes() {
    var out = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var v = n.nodeValue;
        if (!v || !HAS_LETTER.test(v)) return NodeFilter.FILTER_REJECT;
        for (var e = n.parentNode; e && e !== document.body; e = e.parentNode) {
          var t = e.nodeName;
          if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          if (e.getAttribute && (e.getAttribute('translate') === 'no' || (e.classList && e.classList.contains('notranslate'))))
            return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }
  function clean(s) { return s.replace(/\s+/g, ' ').trim(); }

  function applyButtons() {
    [].slice.call(document.querySelectorAll('.lbl[data-act]')).forEach(function (l) {
      var act = l.getAttribute('data-act'), brand = l.getAttribute('data-brand');
      var tr = known(act) || act;
      var b = document.createElement('span'); b.setAttribute('translate', 'no'); b.textContent = brand;
      l.textContent = '';
      if (tr.indexOf('{b}') >= 0) {
        var p = tr.split('{b}');
        if (p[0]) l.appendChild(document.createTextNode(p[0]));
        l.appendChild(b);
        if (p[1]) l.appendChild(document.createTextNode(p[1]));
      } else {
        l.appendChild(document.createTextNode(tr + ' '));
        l.appendChild(b);
      }
    });
  }

  function translatePage() {
    if (lang === 'en') return;
    var nodes = textNodes();
    var srcs = nodes.map(function (n) { return clean(n.nodeValue); });
    var extra = ['Hide', document.title];
    [].slice.call(document.querySelectorAll('.lbl[data-act]')).forEach(function (l) { extra.push(l.getAttribute('data-act')); });
    var busy = document.getElementById('trBusy');
    var slow = setTimeout(function () { if (busy) busy.style.display = 'block'; }, 600);
    function apply() {
      nodes.forEach(function (n, i) {
        var tr = known(srcs[i]);
        if (tr) {
          var lead = n.nodeValue.match(/^\s*/)[0], trail = n.nodeValue.match(/\s*$/)[0];
          n.nodeValue = lead + tr + trail;
        }
      });
      var t = known(extra[1]); if (t) document.title = t;
      applyButtons();
    }
    apply(); /* dictionary and saved translations show at once */
    translateAll(srcs.concat(extra)).then(apply, apply).then(function () {
      clearTimeout(slow); if (busy) busy.style.display = 'none';
    });
  }

  /* Language menu */
  function setupMenu() {
    var btn = document.getElementById('langBtn'), lm = document.getElementById('lm'),
        list = document.getElementById('lmList'), close = document.getElementById('lmClose'),
        code = document.getElementById('langCode');
    if (code) code.textContent = lang.split('-')[0].toUpperCase();
    if (!btn || !lm || !list) return;
    LANGS.forEach(function (L) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = L[1]; b.setAttribute('translate', 'no'); b.setAttribute('lang', L[0]);
      if (normalize(L[0]) === lang) b.className = 'cur';
      b.addEventListener('click', function () { store(L[0]); location.reload(); });
      li.appendChild(b); list.appendChild(li);
    });
    btn.addEventListener('click', function () { lm.classList.add('show'); });
    close.addEventListener('click', function () { lm.classList.remove('show'); });
    lm.addEventListener('click', function (e) { if (e.target === lm) lm.classList.remove('show'); });
  }

  document.documentElement.lang = lang;
  if (RTL[lang]) document.documentElement.dir = 'rtl';

  function start() { setupMenu(); if (window.HK_READY) translatePage(); else document.addEventListener('hk-ready', translatePage, { once: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

(() => {
  'use strict';

  const root = document.documentElement;
  const appearanceKey = 'mengying-appearance';
  const modes = ['system', 'light', 'dark'];
  const modeNames = { system: '跟随系统', light: '浅色', dark: '深色' };
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'system';

  function readAppearance() {
    try {
      const stored = localStorage.getItem(appearanceKey);
      mode = modes.includes(stored) ? stored : 'system';
    } catch {
      // An in-memory choice still works when storage is unavailable.
    }
  }

  function applyAppearance() {
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    root.dataset.theme = mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode;
    root.dataset.appearance = mode;
    document.querySelectorAll('[data-appearance]:not(html)').forEach(button => {
      const hint = '当前外观为' + modeNames[mode] + '，切换到' + modeNames[next];
      button.setAttribute('aria-label', hint);
      button.title = hint;
      const label = button.querySelector('[data-appearance-label]');
      if (label) label.textContent = modeNames[mode];
    });
  }

  readAppearance();
  applyAppearance();

  function bind() {
    applyAppearance();
    document.querySelectorAll('[data-appearance]:not(html)').forEach(button => {
      button.addEventListener('click', () => {
        mode = modes[(modes.indexOf(mode) + 1) % modes.length];
        try { localStorage.setItem(appearanceKey, mode); } catch {}
        applyAppearance();
      });
    });
    if (systemDark.addEventListener) systemDark.addEventListener('change', applyAppearance);
    else systemDark.addListener(applyAppearance);
    window.addEventListener('storage', event => {
      if (event.key === appearanceKey || event.key === null) {
        readAppearance();
        applyAppearance();
      }
    });

    function showDate() {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
      });
      document.querySelectorAll('[data-today]').forEach(label => {
        label.textContent = formatter.format(now);
        if (label.tagName === 'TIME') {
          label.dateTime = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
            .map(number => String(number).padStart(2, '0')).join('-');
        }
      });
    }

    const filters = [...document.querySelectorAll('[data-filter]')];
    const projects = [...document.querySelectorAll('[data-project-category]')];
    function showSelectedCategory() {
      const wanted = new URL(location.href).searchParams.get('category');
      const selected = filters.some(button => button.dataset.filter === wanted) ? wanted : 'all';
      filters.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
      });
      projects.forEach(card => {
        card.hidden = selected !== 'all' && card.dataset.projectCategory !== selected;
      });
    }
    filters.forEach(button => {
      button.addEventListener('click', () => {
        if (button.getAttribute('aria-pressed') === 'true') return;
        const url = new URL(location.href);
        if (button.dataset.filter === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', button.dataset.filter);
        history.pushState(history.state, '', url);
        showSelectedCategory();
      });
    });
    showSelectedCategory();
    window.addEventListener('popstate', showSelectedCategory);

    const progress = document.querySelector('[data-progress]');
    if (progress) {
      let frame = 0;
      function updateProgress() {
        frame = 0;
        const page = document.scrollingElement || root;
        const remaining = page.scrollHeight - page.clientHeight;
        progress.value = remaining > 0 ? Math.min(100, Math.max(0, page.scrollTop / remaining * 100)) : 100;
      }
      function requestUpdate() {
        if (!frame) frame = requestAnimationFrame(updateProgress);
      }
      updateProgress();
      window.addEventListener('scroll', requestUpdate, { passive: true });
      window.addEventListener('resize', requestUpdate);
      window.addEventListener('load', requestUpdate);
      window.addEventListener('pageshow', requestUpdate);
      if (window.ResizeObserver && document.body) new ResizeObserver(requestUpdate).observe(document.body);
    }

    showDate();
    window.addEventListener('pageshow', () => {
      showDate();
      applyAppearance();
      showSelectedCategory();
    });
    const dialog = document.querySelector('dialog#search-sheet');
    const input = document.getElementById('search-query');
    const results = document.getElementById('search-results');
    const source = document.getElementById('article-index');
    if (!dialog || !input || !results || !source) return;

    const openers = [...document.querySelectorAll('[data-search-open]')];
    const overlayKey = 'mengyingSearch';
    let returnTarget = null;
    let articles;
    try { articles = JSON.parse(source.textContent); } catch { articles = []; }
    if (!Array.isArray(articles)) articles = [];
    const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
    const index = articles.flatMap(article => {
      if (!article || typeof article.title !== 'string' || typeof article.url !== 'string') return [];
      let url;
      try { url = new URL(article.url, location.href); } catch { return []; }
      if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return [];
      const tags = Array.isArray(article.tags) ? article.tags : [];
      const category = String(article.category || '');
      return [{
        title: article.title, titleKey: normalize(article.title), url: url.href, category,
        keywords: normalize([category, ...tags].join(' ')),
        summary: normalize(article.description)
      }];
    });

    function renderResults() {
      const tokens = normalize(input.value).split(/\s+/).filter(Boolean);
      const hits = [];
      for (const article of index) {
        let score = 0;
        const matched = tokens.every(token => {
          if (article.titleKey.includes(token)) score += 4;
          else if (article.keywords.includes(token)) score += 2;
          else if (article.summary.includes(token)) score += 1;
          else return false;
          return true;
        });
        if (matched) hits.push({ article, score });
      }
      hits.sort((a, b) => b.score - a.score);
      const fragment = document.createDocumentFragment();
      for (const { article } of hits) {
        const link = document.createElement('a');
        link.className = 'search-result';
        link.href = article.url;
        const title = document.createElement('strong');
        title.textContent = article.title;
        link.append(title);
        if (article.category) {
          const detail = document.createElement('small');
          detail.textContent = article.category;
          link.append(detail);
        }
        fragment.append(link);
      }
      if (!hits.length) {
        const empty = document.createElement('p');
        empty.className = 'search-empty';
        empty.textContent = '没有找到匹配的文章';
        fragment.append(empty);
      }
      results.replaceChildren(fragment);
    }

    function displaySearch() {
      if (dialog.open) return;
      if (!returnTarget && document.activeElement instanceof HTMLElement) returnTarget = document.activeElement;
      input.value = '';
      renderResults();
      dialog.showModal();
      root.classList.add('search-open');
      openers.forEach(button => button.setAttribute('aria-expanded', 'true'));
      input.focus({ preventScroll: true });
    }
    function openSearch(trigger) {
      if (dialog.open) return;
      returnTarget = trigger instanceof HTMLElement ? trigger : document.activeElement;
      if (!history.state?.[overlayKey]) {
        history.pushState({ ...history.state, [overlayKey]: true }, '', location.href);
      }
      displaySearch();
    }
    function dismissSearch() {
      if (!dialog.open) return;
      if (history.state?.[overlayKey]) history.back();
      else dialog.close();
    }
    function syncSearch() {
      if (history.state?.[overlayKey]) displaySearch();
      else if (dialog.open) dialog.close();
    }
    input.addEventListener('input', renderResults);
    openers.forEach(button => {
      button.setAttribute('aria-controls', dialog.id);
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => openSearch(button));
    });
    dialog.querySelectorAll('[data-search-close]').forEach(button => {
      button.addEventListener('click', event => { event.preventDefault(); dismissSearch(); });
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismissSearch(); });
    const handle = dialog.querySelector('.sheet-head');
    let dragStart;
    handle.addEventListener('pointerdown', event => {
      if (!window.matchMedia('(max-width: 620px)').matches || event.pointerType !== 'touch' || event.target.closest('button')) return;
      dragStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointerup', event => {
      if (dragStart?.id !== event.pointerId) return;
      const dy = event.clientY - dragStart.y;
      const dx = Math.abs(event.clientX - dragStart.x);
      dragStart = null;
      if (dy > 58 && dy > dx * 1.5) dismissSearch();
    });
    handle.addEventListener('pointercancel', () => { dragStart = null; });
    dialog.addEventListener('close', () => {
      root.classList.remove('search-open');
      openers.forEach(button => button.setAttribute('aria-expanded', 'false'));
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
      returnTarget = null;
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dismissSearch();
    });
    dialog.addEventListener('keydown', event => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissSearch();
        return;
      }
      const links = [...results.querySelectorAll('a')];
      if (event.target === input && event.key === 'Enter') {
        event.preventDefault();
        links[0]?.click();
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const current = links.indexOf(event.target);
      if (current === -1 && event.target !== input) return;
      if (!links.length || (event.target === input && event.key === 'ArrowUp')) return;
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? Math.min(current + 1, links.length - 1) : current - 1;
      (next < 0 ? input : links[next]).focus();
    });
    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.open) dismissSearch();
        else openSearch(document.activeElement);
      }
    });
    window.addEventListener('popstate', syncSearch);
    window.addEventListener('pageshow', syncSearch);
    syncSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();

(() => {
  const works = window.PORTFOLIO_WORKS;
  const kinds = { video: '影像', image: '图像', audio: '声音' };
  const featured = document.querySelector('.featured');
  const gallery = document.querySelector('.gallery');
  const dialog = document.querySelector('.viewer');
  const stage = document.querySelector('.viewer-stage');
  const error = document.querySelector('.media-error');
  const previous = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');
  let selected = 0;
  let sequence = works;
  let trigger;
  let closing = false;
  let currentFilter = 'all';

  const duration = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15L19 12z"/></svg>';

  function soundArtwork() {
    const art = document.createElement('span');
    art.className = 'sound-art';
    art.setAttribute('aria-hidden', 'true');
    [26, 40, 65, 43, 81, 100, 61, 85, 50, 74, 37, 56, 26].forEach(height => {
      const bar = document.createElement('i');
      bar.style.setProperty('--height', `${height}%`);
      art.append(bar);
    });
    return art;
  }

  function card(work, featuredCard = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'work';
    button.dataset.work = work.id;
    button.dataset.kind = work.type;
    button.setAttribute('aria-label', `${work.type === 'image' ? '查看' : '播放'}${work.title}`);
    const visual = document.createElement('span');
    visual.className = 'work-visual';
    if (work.poster) {
      const img = document.createElement('img');
      img.src = work.poster;
      img.alt = '';
      img.width = work.width;
      img.height = work.height;
      img.loading = featuredCard ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (featuredCard) img.fetchPriority = 'high';
      visual.append(img);
    } else {
      visual.append(soundArtwork());
    }
    if (work.type !== 'image') {
      const mark = document.createElement('span');
      mark.className = 'play-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = playIcon;
      visual.append(mark);
    }
    const caption = document.createElement('span');
    caption.className = 'work-caption';
    const title = document.createElement('span');
    title.className = 'work-title';
    title.textContent = work.title;
    const meta = document.createElement('span');
    meta.className = 'work-meta';
    const kind = document.createElement('span');
    kind.textContent = kinds[work.type];
    const separator = document.createElement('span');
    separator.className = 'meta-separator';
    separator.setAttribute('aria-hidden', 'true');
    const detail = document.createElement('span');
    detail.textContent = work.duration ? duration(work.duration) : `${work.width} × ${work.height}`;
    meta.append(kind, separator, detail);
    caption.append(title, meta);
    button.append(visual, caption);
    return button;
  }

  function renderGallery(filter) {
    currentFilter = filter;
    const matching = works.filter(work => filter === 'all' || work.type === filter);
    gallery.replaceChildren(...matching.map(work => card(work)));
    gallery.classList.remove('is-entering');
    void gallery.offsetWidth;
    gallery.classList.add('is-entering');
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
    document.querySelector('#filter-status').textContent = `显示${filter === 'all' ? '全部作品' : kinds[filter]}，共 ${matching.length} 件`;
  }

  function disposeMedia() {
    stage.querySelectorAll('video, audio').forEach(media => {
      media.pause();
      media.removeAttribute('src');
      media.load();
    });
    stage.replaceChildren();
  }

  function showWork(index) {
    disposeMedia();
    selected = index;
    const work = sequence[index];
    document.querySelector('#viewer-title').textContent = work.title;
    document.querySelector('#viewer-meta').textContent = `${kinds[work.type]} · ${work.duration ? duration(work.duration) : `${work.width} × ${work.height}`}`;
    document.querySelector('.viewer-position').textContent = `${index + 1} / ${sequence.length}`;
    previous.disabled = index === 0;
    next.disabled = index === sequence.length - 1;
    error.hidden = true;
    stage.className = `viewer-stage is-${work.type}`;
    const media = document.createElement(work.type === 'image' ? 'img' : work.type === 'video' ? 'video' : 'audio');
    media.className = `viewer-${work.type}`;
    media.addEventListener('error', () => {
      if (stage.contains(media)) error.hidden = false;
    });
    if (work.type === 'image') {
      media.alt = work.title;
      media.src = work.src;
      stage.append(media);
    } else {
      media.controls = true;
      media.preload = 'metadata';
      media.setAttribute('aria-label', work.title);
      if (work.type === 'video') {
        media.playsInline = true;
        media.poster = work.poster;
      } else stage.append(soundArtwork());
      media.src = work.src;
      stage.append(media);
      media.play().catch(() => { /* 原生控件保留用户手动播放入口。 */ });
    }
  }

  function openWork(button) {
    if (closing) return;
    trigger = button;
    sequence = button.closest('.featured') ? works.slice(0, 3) : works.filter(work => currentFilter === 'all' || work.type === currentFilter);
    document.documentElement.classList.add('viewer-open');
    dialog.showModal();
    showWork(sequence.findIndex(work => work.id === button.dataset.work));
    document.querySelector('[data-close]').focus({ preventScroll: true });
  }

  async function closeViewer() {
    if (!dialog.open || closing) return;
    closing = true;
    stage.querySelectorAll('video, audio').forEach(media => media.pause());
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await dialog.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 150, easing: 'ease-out' }).finished;
    }
    disposeMedia();
    dialog.close();
    document.documentElement.classList.remove('viewer-open');
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    closing = false;
  }

  [featured, gallery].forEach(container => container.addEventListener('click', event => {
    const button = event.target.closest('[data-work]');
    if (button) openWork(button);
  }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    renderGallery(button.dataset.filter);
  }));
  document.querySelector('[data-close]').addEventListener('click', closeViewer);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeViewer();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeViewer();
    }
  });
  previous.addEventListener('click', () => { if (selected > 0 && !closing) showWork(selected - 1); });
  next.addEventListener('click', () => { if (selected < sequence.length - 1 && !closing) showWork(selected + 1); });
  document.querySelector('[data-retry]').addEventListener('click', () => showWork(selected));
  dialog.addEventListener('keydown', event => {
    if (event.target.closest('video, audio') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' && !previous.disabled) { event.preventDefault(); previous.click(); }
    if (event.key === 'ArrowRight' && !next.disabled) { event.preventDefault(); next.click(); }
  });
  works.slice(0, 3).forEach(work => featured.append(card(work, true)));
  renderGallery('all');
})();

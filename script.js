(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const token = (params.get('t') || '').trim();

  // ---- Edit these ----
  const MAP_URL = 'https://maps.app.goo.gl/6wjMzzjG7ea7TJeH7';        // paste a Google Maps link when the venue is confirmed
  const YOUTUBE_URL = 'https://youtu.be/hof1Qq7xeYA?si=MAOUhPhR_WPVJVLK';    // paste your full YouTube link here, e.g. 'https://youtu.be/abcDEF12345'
  const GALLERY_COUNT = 5;   // number of gallery photos
  const GALLERY = [];        // optional exact paths, e.g. ['images/1.jpg','images/2.jpg']; leave empty to auto-find photo1, image1 or 1 (jpg, jpeg, png, webp) in the images folder
  const PHOTOBOOTH_URL = 'https://leo21711.github.io/Photobooth/';  // link to your online photobooth ('' hides the button, the QR code still works)
  // --------------------

  let guestName = '';

  function setName(name) {
    guestName = name;
    const shown = name || 'Valued Guest';
    $('guestNameCover').textContent = shown;
    $('guestNameLine').textContent = shown;
    if (name) { $('guestName').value = name; $('guestName').readOnly = !!token; }
  }

  // Video: accepts any normal YouTube link (watch, youtu.be, shorts, embed) or the 11-character ID
  function youtubeId(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (u.length === 11 && u.indexOf('/') < 0 && u.indexOf('.') < 0) return u;
    try {
      const x = new URL(u);
      if (x.hostname.indexOf('youtu.be') > -1) return x.pathname.split('/')[1] || '';
      const v = x.searchParams.get('v');
      if (v) return v;
      const p = x.pathname.split('/');
      const i = Math.max(p.indexOf('embed'), p.indexOf('shorts'), p.indexOf('live'));
      return i > -1 ? (p[i + 1] || '') : '';
    } catch (e) { return ''; }
  }
  const vid = youtubeId(YOUTUBE_URL);
  if (vid) {
    $('videoBox').innerHTML = '<iframe src="https://www.youtube.com/embed/' + encodeURIComponent(vid) + '?rel=0" title="Our story" ' +
      'allow="encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';
  }

  // Gallery: tries the likely file names in order; a soft placeholder shows until a photo is found
  function candidates(n) {
    if (GALLERY[n - 1]) return [GALLERY[n - 1]];
    const out = [];
    ['photo' + n, 'image' + n, '' + n].forEach(b => ['jpg', 'jpeg', 'png', 'webp', 'JPG'].forEach(e => out.push('images/' + b + '.' + e)));
    return out;
  }
  const g = $('gallery');
  for (let n = 1; n <= GALLERY_COUNT; n++) {
    const list = candidates(n);
    const f = document.createElement('figure');
    f.className = 'tile';
    const ph = document.createElement('span');
    ph.className = 'ph';
    ph.innerHTML = 'Photo ' + n + '<small>images/photo' + n + '.jpg</small>';
    f.appendChild(ph);
    const im = new Image();
    let k = 0;
    im.alt = 'Fira and Baqi, photo ' + n;
    im.onerror = () => { k++; if (k < list.length) im.src = list[k]; else im.remove(); };
    im.src = list[0];
    f.appendChild(im);
    g.appendChild(f);
  }

  // Photobooth button
  if (PHOTOBOOTH_URL) { const pb = $('photoboothBtn'); pb.href = PHOTOBOOTH_URL; pb.hidden = false; }

  // Map button
  const map = $('mapBtn');
  if (MAP_URL) map.href = MAP_URL; else { map.removeAttribute('href'); map.setAttribute('aria-disabled', 'true'); map.textContent = 'Map · to be confirmed'; map.style.opacity = .5; map.style.pointerEvents = 'none'; }

  // Greeting: ?to=Name is used for display only when there is no personal token
  setName((params.get('to') || '').trim().slice(0, 60));

  // Load the guest by token
  const form = $('rsvpForm'), err = $('formError'), btn = $('submitBtn');
  function showError(m) { err.textContent = m; err.hidden = false; }

  function showThanks(status, pax) {
    form.hidden = true; $('rsvpLede').hidden = true; $('thanks').hidden = false;
    const n = guestName ? ', ' + guestName : '';
    if (status === 'attending') {
      $('thanksTitle').textContent = 'Thank you' + n;
      $('thanksText').textContent = 'We have noted ' + pax + (pax > 1 ? ' guests' : ' guest') + ' for 13 December 2026. We look forward to celebrating with you, insha’Allah.';
    } else {
      $('thanksTitle').textContent = 'Thank you for letting us know' + n;
      $('thanksText').textContent = 'We are sorry you cannot join us, and we are grateful for your prayers and good wishes.';
    }
  }

  if (token) {
    fetch('/api/rsvp?t=' + encodeURIComponent(token))
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { showError(d.error || 'We could not find your invitation. Please use the link we sent you.'); return; }
        setName(d.name);
        if (d.status === 'attending' || d.status === 'declined') {
          const r = form.querySelector('input[value="' + d.status + '"]'); if (r) r.checked = true;
          if (d.party_size) $('pax').value = d.party_size;
          togglePax();
          showThanks(d.status, d.party_size);
        }
      })
      .catch(() => showError('We could not load your invitation. Please check your connection and reload.'));
  } else {
    $('rsvpLede').textContent = 'Please open the personal link we sent you to reply.';
    btn.disabled = true;
  }

  function togglePax() {
    const v = (form.querySelector('input[name=status]:checked') || {}).value;
    $('paxWrap').hidden = v !== 'attending';
  }
  form.addEventListener('change', togglePax);

  $('editBtn').addEventListener('click', () => { $('thanks').hidden = true; form.hidden = false; $('rsvpLede').hidden = false; });

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.hidden = true;
    const checked = form.querySelector('input[name=status]:checked');
    if (!token) return showError('Please open your personal invitation link to reply.');
    if (!checked) return showError('Please choose whether you will attend.');
    const status = checked.value, pax = status === 'attending' ? parseInt($('pax').value, 10) : null;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status, party_size: pax }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Your reply was not saved. Please try again.');
      showThanks(status, pax);
    } catch (ex) {
      showError(ex.message || 'Your reply was not saved. Please try again.');
    } finally { btn.disabled = !token; btn.textContent = 'Send reply'; }
  });

  // Background music: starts on "Open invitation" (browsers only allow sound after a tap)
  const audio = $('bgm'), music = $('musicBtn');
  function setMusic(on) { music.classList.toggle('off', !on); music.setAttribute('aria-pressed', String(on)); }
  if (audio && music) {
    audio.volume = 0.5;
    music.addEventListener('click', () => {
      if (audio.paused) audio.play().then(() => setMusic(true)).catch(() => {});
      else { audio.pause(); setMusic(false); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !audio.paused) { audio.pause(); setMusic(false); } });
  }

  // Envelope
  $('openBtn').addEventListener('click', () => {
    $('openBtn').disabled = true;
    $('envelope').classList.add('open');
    if (audio && music) {
      const p = audio.play();
      if (p && p.then) p.then(() => { music.classList.add('show'); setMusic(true); }).catch(() => {});
    }
    setTimeout(() => {
      $('cover').classList.add('gone');
      $('invitation').hidden = false;
      document.body.classList.remove('locked');
      window.scrollTo(0, 0);
    }, 1700);
  });
})();

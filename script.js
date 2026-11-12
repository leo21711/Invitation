 (function () {
  const $ = id => document.getElementById(id);

  // 🔴 --- CONFIGURATION --- 🔴
  const MAP_URL = 'https://maps.app.goo.gl/jzW97oWrjWaQR2Rt7?g_st=ic';
  const YOUTUBE_URL = 'https://youtu.be/hof1Qq7xeYA?si=Ibb_xZhso-halTkA';
  const GALLERY_COUNT = 5;
  const PHOTOBOOTH_URL = 'https://leo21711.github.io/Photobooth/';
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVOcjXfJuOY55LXSnjMYFDGtcatwg8orvsFGa2z45Zvm-_huXEkY5Tz3lsYI9y7T9KGg/exec';

  // ==========================================
  // 1. Parse Guest Name from URL
  // ==========================================
  const params = new URLSearchParams(location.search);
  let guestName = (params.get('to') || '').trim();

  if (!guestName) {
    const path = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '');
    if (path && path !== 'index.html') guestName = path;
  }
  if (guestName) {
    try { guestName = decodeURIComponent(guestName); } catch (e) {}
  }

  // Remembers this guest's RSVP answer so the greeting badge survives a reload
  const STATUS_KEY = 'fb_rsvp_status:' + guestName;
  let currentAttendanceStatus = '';   // '', 'attend' or 'not-attend'
  try { currentAttendanceStatus = localStorage.getItem(STATUS_KEY) || ''; } catch (e) {}

  // ==========================================
  // 2. Populate Guest Name
  // ==========================================
  function setName(name) {
    const shown = name || 'Valued Guest';
    ['guestNameCover', 'guestNameLine', 'guestNameBody'].forEach(id => {
      if ($(id)) $(id).textContent = shown;
    });
    const field = $('guestName');
    if (field) {
      if (name) {                      // personalised link: locked, as before
        field.value = name;
        field.readOnly = true;
      } else {                         // bare link: let the guest type their name
        field.value = '';
        field.readOnly = false;
        field.placeholder = 'Type your name';
      }
    }
    if ($('greetingGuestName')) $('greetingGuestName').value = name || '';
  }
  setName(guestName);

  function currentName() {
    const f = $('guestName');
    return ((f && f.value) || guestName || '').trim();
  }

  // ==========================================
  // 3. YouTube Video Embed
  // ==========================================
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
  if (vid && $('videoBox')) {
    $('videoBox').innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(vid)}?rel=0" title="Our story" allow="encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>`;
  }

  // ==========================================
  // 4. Gallery Auto-loader
  // ==========================================
  const g = $('gallery');
  if (g) {
    for (let n = 1; n <= GALLERY_COUNT; n++) {
      const f = document.createElement('figure');
      f.className = 'tile';
      const im = new Image();
      im.alt = `Fira and Baqi, photo ${n}`;
      im.src = `images/photo${n}.jpg`;
      im.onerror = () => { im.onerror = null; im.src = `images/image${n}.jpg`; };
      f.appendChild(im);
      g.appendChild(f);
    }
  }

  // ==========================================
  // 5. Map & Photobooth Buttons
  // ==========================================
  const map = $('mapBtn');
  if (MAP_URL && map) map.href = MAP_URL;
  if (PHOTOBOOTH_URL) {
    const pb = $('photoboothBtn');
    if (pb) { pb.href = PHOTOBOOTH_URL; pb.hidden = false; }
  }

  // ==========================================
  // 6. RSVP Form Logic
  // ==========================================
  const form = $('rsvpForm'), err = $('formError'), btn = $('submitBtn');

  function showError(m) {
    if (err) { err.textContent = m; err.hidden = false; }
  }

  function showThanks(status, pax) {
    form.hidden = true;
    const lede = $('rsvpLede');
    if (lede) lede.hidden = true;
    $('thanks').hidden = false;
    const n = currentName() ? ', ' + currentName() : '';

    if (status === 'attending') {
      $('thanksTitle').textContent = 'Thank you' + n;
      $('thanksText').textContent = `We have noted ${pax} ${pax > 1 ? 'guests' : 'guest'} for 13 December 2026. We look forward to celebrating with you, insha’Allah.`;
    } else {
      $('thanksTitle').textContent = 'Thank you for letting us know' + n;
      $('thanksText').textContent = 'We are sorry you cannot join us, and we are grateful for your prayers and good wishes.';
    }
  }

  function togglePax() {
    const v = (form.querySelector('input[name=status]:checked') || {}).value;
    $('paxWrap').hidden = v !== 'attending';
  }

  if (form) {
    form.addEventListener('change', togglePax);
    const editBtn = $('editBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        $('thanks').hidden = true;
        form.hidden = false;
        const lede = $('rsvpLede');
        if (lede) lede.hidden = false;
      });
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      const checked = form.querySelector('input[name=status]:checked');
      if (!checked) return showError('Please choose whether you will attend.');

      const name = currentName();
      if (!name) return showError('Please enter your name.');

      const status = checked.value;
      const pax = status === 'attending' ? parseInt($('pax').value, 10) : 0;

      btn.disabled = true;
      btn.textContent = 'Sending…';

      try {
        // no-cors: the reply is opaque, so success cannot be verified from the browser
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'add_rsvp', name: name, status: status, pax: pax })
        });
        currentAttendanceStatus = status === 'attending' ? 'attend' : 'not-attend';
        try { localStorage.setItem(STATUS_KEY, currentAttendanceStatus); } catch (x) {}
        showThanks(status, pax);
      } catch (ex) {
        showError('Network error. Please check your connection and try again.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send reply';
      }
    });
  }

  // ==========================================
  // 7. Envelope Opening & Music
  // ==========================================
  const openBtn = $('openBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      openBtn.disabled = true;
      const envelope = $('envelope');
      if (envelope) envelope.classList.add('open');

      const bgm = $('bgm'), musicBtn = $('musicBtn');
      if (bgm && musicBtn) {
        musicBtn.classList.add('show');
        bgm.play().catch(() => {});
      }
      setTimeout(() => {
        const cover = $('cover');
        if (cover) cover.classList.add('gone');
        const invitation = $('invitation');
        if (invitation) invitation.hidden = false;
        document.body.classList.remove('locked');
        window.scrollTo(0, 0);
      }, 1700);
    });
  }

  // ==========================================
  // 8. Robust Background Music Logic
  // ==========================================
  const MUSIC_FILES = ['audio/music.mp3', 'audio/music.m4a', 'audio/music.ogg', 'audio/music.wav', 'audio/backsound.mp3', 'audio/song.mp3'];
  const audio = $('bgm');
  const music = $('musicBtn');
  let mi = 0;

  function setMusic(on) {
    if (!music) return;
    music.classList.toggle('off', !on);
    music.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  }

  function playMusic() {
    if (!audio) return;
    if (!audio.src || audio.src === window.location.href) audio.src = MUSIC_FILES[mi];
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setMusic(true)).catch(() => setMusic(false));
    }
  }

  if (audio && music) {
    audio.volume = 0.5;
    audio.addEventListener('error', () => {
      mi++;
      if (mi < MUSIC_FILES.length) { audio.src = MUSIC_FILES[mi]; audio.load(); playMusic(); }
      else { music.classList.remove('show'); }
    });
    audio.addEventListener('playing', () => setMusic(true));
    audio.addEventListener('pause', () => setMusic(false));
    music.addEventListener('click', () => {
      if (audio.paused) {
        if (audio.error) { mi = 0; audio.src = MUSIC_FILES[0]; audio.load(); }
        playMusic();
      } else { audio.pause(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !audio.paused) audio.pause();
    });
  }

  // ==========================================
  // 9. Greetings (Doa & Ucapan)
  // ==========================================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const time = new Date(timestamp);
    if (isNaN(time)) return '';
    const diff = Math.floor((Date.now() - time) / 1000);

    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return time.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function badgeHtml(attendance) {
    const a = String(attendance || '').toLowerCase();
    if (!a) return '';
    const cls = (a === 'attend' || a.includes('hadir') && !a.includes('tidak') || a === 'attending') ? 'attend'
              : (a === 'not-attend' || a.includes('tidak') || a === 'declined') ? 'not-attend'
              : 'uncertain';
    const label = cls === 'attend' ? '✓ Hadir' : cls === 'not-attend' ? '✗ Tidak Hadir' : '? Belum Pasti';
    return `<span class="greeting-attendance ${cls}">${label}</span>`;
  }

  function cardHtml(name, message, time, attendance) {
    return `
      <div class="greeting-card">
        <div class="greeting-header">
          <span class="greeting-name">${escapeHtml(name)}</span>
          <span class="greeting-time">${time}</span>
        </div>
        <div class="greeting-message">${escapeHtml(message)}</div>
        ${badgeHtml(attendance)}
      </div>`;
  }

  function renderEmptyState() {
    const list = $('greetingsList');
    if (list) list.innerHTML = '<div class="greetings-empty">Belum ada ucapan. Jadilah yang pertama!</div>';
  }

  function renderGreetings(greetings) {
    const list = $('greetingsList');
    if (!list) return;
    const sorted = [...greetings].sort((a, b) => new Date(b.timestamp || b.waktu || 0) - new Date(a.timestamp || a.waktu || 0));
    list.innerHTML = sorted.map(x => cardHtml(
      x.name || x.nama || 'Tamu',
      x.message || x.pesan || '',
      formatTimeAgo(x.timestamp || x.waktu || ''),
      x.attendance || x.kehadiran || ''
    )).join('');
    list.scrollTop = 0;
  }

  async function loadGreetings() {
    const total = $('greetingsTotal');
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=list`, { method: 'GET', mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();

      if (data.status === 'success' && data.data && data.data.length > 0) {
        renderGreetings(data.data);
        if (total) total.textContent = data.data.length;
      } else {
        renderEmptyState();
        if (total) total.textContent = '0';
      }
    } catch (e) {
      console.error('Error loading greetings:', e);
      renderEmptyState();
    }
  }

  function addGreetingToList(name, message, attendance) {
    const list = $('greetingsList');
    if (!list) return;
    const empty = list.querySelector('.greetings-empty');
    if (empty) empty.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = cardHtml(name, message, 'Baru saja', attendance).trim();
    list.insertBefore(wrap.firstElementChild, list.firstChild);
    list.scrollTop = 0;
  }

  const greetingForm = $('greetingForm');
  if (greetingForm) {
    greetingForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const gBtn = $('greetingSubmitBtn');
      const messageInput = $('greetingMessage');
      const name = currentName() || 'Tamu';
      const message = messageInput.value.trim();

      if (!message) { alert('Silakan tulis ucapan Anda.'); return; }

      gBtn.disabled = true;
      gBtn.textContent = 'Mengirim...';

      try {
        const body = new URLSearchParams();
        body.append('action', 'add_greeting');
        body.append('name', name);
        body.append('message', message);
        body.append('attendance', currentAttendanceStatus || '');

        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });

        messageInput.value = '';
        gBtn.textContent = '✓ Terkirim!';

        // Show it immediately; a re-fetch now could race the sheet write and make it vanish
        addGreetingToList(name, message, currentAttendanceStatus);
        const counter = $('greetingsTotal');
        if (counter) counter.textContent = (parseInt(counter.textContent, 10) || 0) + 1;

        setTimeout(() => { gBtn.textContent = 'Kirim Ucapan'; gBtn.disabled = false; }, 1500);
      } catch (ex) {
        console.error(ex);
        alert('Gagal mengirim. Silakan coba lagi.');
        gBtn.textContent = 'Kirim Ucapan';
        gBtn.disabled = false;
      }
    });
  }

  loadGreetings();
})();

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
    try { guestName = decodeURIComponent(guestName); } catch(e) {}
  }

  // ==========================================
  // 2. Populate Guest Name & Lock Fields
  // ==========================================
  function setName(name) {
    const shown = name || 'Valued Guest';
    if ($('guestNameCover')) $('guestNameCover').textContent = shown;
    if ($('guestNameLine')) $('guestNameLine').textContent = shown;
    if ($('guestNameBody')) $('guestNameBody').textContent = shown;
    if ($('guestName')) {
      $('guestName').value = shown;
      $('guestName').readOnly = true;
    }
    if ($('greetingName') && name) {
      $('greetingName').value = name;
    }
  }
  setName(guestName);

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
      im.onerror = () => { im.src = `images/image${n}.jpg`; };
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
    if(pb) { pb.href = PHOTOBOOTH_URL; pb.hidden = false; } 
  }

  // ==========================================
  // 6. RSVP Form Logic
  // ==========================================
  const form = $('rsvpForm'), err = $('formError'), btn = $('submitBtn');
  
  function showError(m) { 
    if(err) { err.textContent = m; err.hidden = false; } 
  }
  
  function showThanks(status, pax) {
    form.hidden = true; 
    const lede = $('rsvpLede');
    if (lede) lede.hidden = true; 
    $('thanks').hidden = false;
    const n = guestName ? ', ' + guestName : '';
    
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
  
  if(form) {
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
      
      const status = checked.value;
      const pax = status === 'attending' ? parseInt($('pax').value, 10) : 0;
      const name = $('guestName').value;
      
      btn.disabled = true; 
      btn.textContent = 'Sending…';
      
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'add_rsvp', name: name, status: status, pax: pax })
        });
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
      
      const audio = $('bgm'), music = $('musicBtn');
      if (audio && music) { 
        music.classList.add('show'); 
        audio.play().catch(() => {}); 
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
  // 9. GREETINGS / DOA & UCAPAN
  // ==========================================
  const greetingForm = $('greetingForm');
  const greetingMessageInput = $('greetingMessage');
  const greetingSubmitBtn = $('greetingSubmitBtn');
  const greetingError = $('greetingError');
  const greetingThanks = $('greetingThanks');
  const greetingsList = $('greetingsList');
  const greetingsLoading = $('greetingsLoading');

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (mins > 0) return `${mins} min ago`;
    return 'Just now';
  }

  async function loadGreetings() {
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=list_greetings`);
      const data = await response.json();
      if (greetingsLoading) greetingsLoading.style.display = 'none';

      if (!data.greetings || data.greetings.length === 0) {
        greetingsList.innerHTML = '<p class="lede">Be the first to leave a beautiful message! 💌</p>';
        return;
      }

      greetingsList.innerHTML = data.greetings.map(g => `
        <div class="greeting-item">
          <div class="greeting-author">${escapeHtml(g.name)}</div>
          <div class="greeting-time">${timeAgo(g.timestamp)}</div>
          <div class="greeting-message">${escapeHtml(g.message)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load greetings:', error);
      if (greetingsLoading) greetingsLoading.textContent = 'Unable to load messages.';
    }
  }

  if (greetingForm) {
    greetingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('greetingName').value.trim();
      const message = greetingMessageInput.value.trim();
      
      if (!name || !message) {
        greetingError.textContent = 'Please fill in both your name and message.';
        greetingError.hidden = false;
        return;
      }

      greetingError.hidden = true;
      greetingSubmitBtn.disabled = true;
      greetingSubmitBtn.textContent = 'Sending...';

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'add_greeting', name: name, message: message })
        });

        if (greetingsList.querySelector('.lede')) greetingsList.innerHTML = '';
        
        const newGreetingHTML = `
          <div class="greeting-item new-message">
            <div class="greeting-author">${escapeHtml(name)}</div>
            <div class="greeting-time">Just now</div>
            <div class="greeting-message">${escapeHtml(message)}</div>
          </div>
        `;
        greetingsList.insertAdjacentHTML('afterbegin', newGreetingHTML);

        // Remove animation class after it plays
        setTimeout(() => {
          const firstItem = greetingsList.querySelector('.greeting-item');
          if (firstItem) firstItem.classList.remove('new-message');
        }, 600);

        greetingForm.reset();
        if (guestName && guestName !== 'Valued Guest') $('greetingName').value = guestName;
        if (greetingThanks) greetingThanks.hidden = false;
        greetingSubmitBtn.disabled = false;
        greetingSubmitBtn.textContent = 'Send Wishes';

        setTimeout(loadGreetings, 2000);

      } catch (error) {
        console.error('Submit error:', error);
        greetingError.textContent = 'Failed to send. Please check your connection and try again.';
        greetingError.hidden = false;
        greetingSubmitBtn.disabled = false;
        greetingSubmitBtn.textContent = 'Send Wishes';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadGreetings);
})();

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

 // ============================================
// GREETINGS CONFIGURATION
// ============================================
const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

// ============================================
// GREETINGS - FETCH & DISPLAY
// ============================================
async function loadGreetings() {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=list`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data && data.data.length > 0) {
      renderGreetings(data.data);
      document.getElementById('greetingsTotal').textContent = data.data.length;
    } else {
      renderEmptyState();
      document.getElementById('greetingsTotal').textContent = '0';
    }
  } catch (error) {
    console.error('Error loading greetings:', error);
    renderEmptyState();
  }
}

function renderGreetings(greetings) {
  const listContainer = document.getElementById('greetingsList');
  
  // Sort by newest first (assuming timestamp exists)
  const sorted = [...greetings].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.waktu || 0);
    const timeB = new Date(b.timestamp || b.waktu || 0);
    return timeB - timeA;
  });
  
  listContainer.innerHTML = sorted.map(g => {
    const name = escapeHtml(g.name || g.nama || 'Tamu');
    const message = escapeHtml(g.message || g.pesan || '');
    const time = g.timestamp || g.waktu || '';
    const attendance = g.attendance || g.kehadiran || '';
    
    let attendanceBadge = '';
    if (attendance) {
      const attendanceClass = 
        attendance.toLowerCase().includes('hadir') || attendance === 'attend' ? 'attend' :
        attendance.toLowerCase().includes('tidak') || attendance === 'not-attend' ? 'not-attend' :
        'uncertain';
      
      const attendanceLabel = 
        attendance === 'attend' || attendance.toLowerCase().includes('hadir') ? '✓ Hadir' :
        attendance === 'not-attend' || attendance.toLowerCase().includes('tidak') ? '✗ Tidak Hadir' :
        '? Belum Pasti';
      
      attendanceBadge = `<span class="greeting-attendance ${attendanceClass}">${attendanceLabel}</span>`;
    }
    
    return `
      <div class="greeting-card">
        <div class="greeting-header">
          <span class="greeting-name">${name}</span>
          <span class="greeting-time">${formatTimeAgo(time)}</span>
        </div>
        <div class="greeting-message">${message}</div>
        ${attendanceBadge}
      </div>
    `;
  }).join('');
  
  // Scroll to top of container (newest greeting)
  listContainer.scrollTop = 0;
}

function renderEmptyState() {
  const listContainer = document.getElementById('greetingsList');
  listContainer.innerHTML = '<div class="greetings-empty">Belum ada ucapan. Jadilah yang pertama!</div>';
}

// ============================================
// GREETINGS - SUBMIT NEW GREETING
// ============================================
document.getElementById('greetingForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('greetingSubmitBtn');
  const messageInput = document.getElementById('greetingMessage');
  const guestName = document.getElementById('greetingGuestName').value || 'Tamu';
  const message = messageInput.value.trim();
  
  if (!message) {
    alert('Silakan tulis ucapan Anda terlebih dahulu.');
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengirim...';
  
  try {
    const formData = new URLSearchParams();
    formData.append('action', 'add_greeting');
    formData.append('name', guestName);
    formData.append('message', message);
    formData.append('attendance', currentAttendanceStatus || '');
    
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    // Success feedback
    messageInput.value = '';
    submitBtn.textContent = '✓ Terkirim!';
    
    // Add the new greeting to the top of the list immediately
    addGreetingToList(guestName, message, currentAttendanceStatus);
    
    // Reload full list to ensure sync
    setTimeout(() => {
      loadGreetings();
      submitBtn.textContent = 'Kirim Ucapan';
      submitBtn.disabled = false;
    }, 1500);
    
  } catch (error) {
    console.error('Error submitting greeting:', error);
    alert('Gagal mengirim ucapan. Silakan coba lagi.');
    submitBtn.textContent = 'Kirim Ucapan';
    submitBtn.disabled = false;
  }
});

// Add new greeting to the top of the list without full reload
function addGreetingToList(name, message, attendance) {
  const listContainer = document.getElementById('greetingsList');
  
  // Remove empty state if present
  const emptyState = listContainer.querySelector('.greetings-empty');
  if (emptyState) emptyState.remove();
  
  // Create new card
  const card = document.createElement('div');
  card.className = 'greeting-card';
  
  let attendanceBadge = '';
  if (attendance) {
    const attendanceClass = 
      attendance.toLowerCase().includes('hadir') || attendance === 'attend' ? 'attend' :
      attendance.toLowerCase().includes('tidak') || attendance === 'not-attend' ? 'not-attend' :
      'uncertain';
    
    const attendanceLabel = 
      attendance === 'attend' || attendance.toLowerCase().includes('hadir') ? '✓ Hadir' :
      attendance === 'not-attend' || attendance.toLowerCase().includes('tidak') ? '✗ Tidak Hadir' :
      '? Belum Pasti';
    
    attendanceBadge = `<span class="greeting-attendance ${attendanceClass}">${attendanceLabel}</span>`;
  }
  
  card.innerHTML = `
    <div class="greeting-header">
      <span class="greeting-name">${escapeHtml(name)}</span>
      <span class="greeting-time">Baru saja</span>
    </div>
    <div class="greeting-message">${escapeHtml(message)}</div>
    ${attendanceBadge}
  `;
  
  // Insert at the top
  listContainer.insertBefore(card, listContainer.firstChild);
  
  // Scroll to top to show the new greeting
  listContainer.scrollTop = 0;
  
  // Update counter
  const counter = document.getElementById('greetingsTotal');
  counter.textContent = parseInt(counter.textContent) + 1;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  
  return time.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

// ============================================
// INITIALIZE GREETINGS ON PAGE LOAD
// ============================================
// Add this to your existing DOMContentLoaded or init function:
document.addEventListener('DOMContentLoaded', function() {
  // ... your existing initialization code ...
  
  // Load greetings
  loadGreetings();
  
  // Set guest name in greeting form
  const guestName = getGuestName(); // your existing function
  if (guestName) {
    document.getElementById('greetingGuestName').value = guestName;
  }
});

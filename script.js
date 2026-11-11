
(function () {
  const $ = id => document.getElementById(id);
  
  // 🔴 --- CONFIGURATION: UPDATE THESE VARIABLES --- 🔴
  const MAP_URL = 'https://maps.app.goo.gl/jzW97oWrjWaQR2Rt7?g_st=ic';        // Paste your Google Maps link here
  const YOUTUBE_URL = 'https://youtu.be/hof1Qq7xeYA?si=Ibb_xZhso-halTkA';    // Paste your YouTube link here
  const GALLERY_COUNT = 5;   // Number of gallery photos
  const PHOTOBOOTH_URL = 'https://leo21711.github.io/Photobooth/'; // Link to your online photobooth
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVOcjXfJuOY55LXSnjMYFDGtcatwg8orvsFGa2z45Zvm-_huXEkY5Tz3lsYI9y7T9KGg/exec'; // 🔴 PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
  
  
  // 1. Parse Guest Name from URL (?to=Rio%20Febri or /Rio%20Febri)
  const params = new URLSearchParams(location.search);
  let guestName = (params.get('to') || '').trim();
  if (guestName) {
    try { guestName = decodeURIComponent(guestName); } catch(e) {}
  }

  // 2. Populate Guest Name & Lock RSVP Field
  function setName(name) {
    const shown = name || 'Valued Guest';
    if ($('guestNameCover')) $('guestNameCover').textContent = shown;
    if ($('guestNameLine')) $('guestNameLine').textContent = shown;
    if ($('guestNameBody')) $('guestNameBody').textContent = shown;
    
    if ($('guestName')) {
      $('guestName').value = shown;
      $('guestName').readOnly = true; // Lock the field
    }
  }
  setName(guestName);

  // 3. YouTube Video Embed
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

  // 4. Gallery Auto-loader
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

  // 5. Map & Photobooth Buttons
  const map = $('mapBtn');
  if (MAP_URL && map) map.href = MAP_URL;
  
  if (PHOTOBOOTH_URL) { 
    const pb = $('photoboothBtn'); 
    if(pb) { pb.href = PHOTOBOOTH_URL; pb.hidden = false; } 
  }

  // 6. RSVP Form Logic & Google Sheets Integration
  const form = $('rsvpForm'), err = $('formError'), btn = $('submitBtn');
  
  function showError(m) { 
    if(err) { err.textContent = m; err.hidden = false; } 
  }
  
  function showThanks(status, pax) {
    form.hidden = true; 
    $('rsvpLede').hidden = true; 
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
    $('editBtn').addEventListener('click', () => { 
      $('thanks').hidden = true; 
      form.hidden = false; 
      $('rsvpLede').hidden = false; 
    });
    
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
        // Send to Google Apps Script
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Required for Google Apps Script CORS handling
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ name, status, party_size: pax })
        });
        
        // Optimistic UI update (since no-cors doesn't return readable response)
        showThanks(status, pax);
      } catch (ex) {
        showError('Network error. Please check your connection and try again.');
      } finally { 
        btn.disabled = false; 
        btn.textContent = 'Send reply'; 
      }
    });
  }

  // 7. Envelope Opening & Music
  $('openBtn').addEventListener('click', () => {
    $('openBtn').disabled = true;
    $('envelope').classList.add('open');
    const audio = $('bgm'), music = $('musicBtn');
    if (audio && music) { 
      music.classList.add('show'); 
      audio.play().catch(() => {}); 
    }
    setTimeout(() => {
      $('cover').classList.add('gone');
      $('invitation').hidden = false;
      document.body.classList.remove('locked');
      window.scrollTo(0, 0);
    }, 1700);
  });
  
  // 8. Robust Background Music Logic
  const MUSIC_FILES = [
    'audio/music.mp3',
    'audio/music.m4a',
    'audio/music.ogg',
    'audio/music.wav',
    'audio/backsound.mp3',
    'audio/song.mp3'
  ];
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
    if (!audio.src || audio.src === window.location.href) {
      audio.src = MUSIC_FILES[mi];
    }
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setMusic(true);
      }).catch((error) => {
        console.warn("Audio play prevented or failed:", error);
        setMusic(false);
      });
    }
  }

  if (audio && music) {
    audio.volume = 0.5;
    
    audio.addEventListener('error', () => {
      console.warn(`Failed to load audio: ${audio.src}. Trying next fallback...`);
      mi++;
      if (mi < MUSIC_FILES.length) {
        audio.src = MUSIC_FILES[mi];
        audio.load();
        playMusic();
      } else {
        music.classList.remove('show');
        console.error("All audio files failed to load. Check file names and paths.");
      }
    });

    audio.addEventListener('playing', () => setMusic(true));
    audio.addEventListener('pause', () => setMusic(false));
    
    music.addEventListener('click', () => {
      if (audio.paused) {
        if (audio.error) {
          mi = 0;
          audio.src = MUSIC_FILES[0];
          audio.load();
        }
        playMusic();
      } else {
        audio.pause();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !audio.paused) audio.pause();
    });


    /* =========================================================
   GREETINGS / DOA & UCAPAN FUNCTIONALITY
   ========================================================= */

// 1. Auto-fill greeting name from URL (reuses your existing guest name logic)
const urlGuestName = new URLSearchParams(window.location.search).get('to') || 
                     decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '') || 
                     'Valued Guest';

const greetingNameInput = document.getElementById('greetingName');
if (greetingNameInput && urlGuestName && urlGuestName !== 'Valued Guest') {
  greetingNameInput.value = urlGuestName;
}

// 2. Google Apps Script Web App URL (REPLACE WITH YOURS)
const GREETINGS_API_URL = 'https://script.google.com/macros/s/AKfycbxVOcjXfJuOY55LXSnjMYFDGtcatwg8orvsFGa2z45Zvm-_huXEkY5Tz3lsYI9y7T9KGg/exec';

const greetingForm = document.getElementById('greetingForm');
const greetingMessageInput = document.getElementById('greetingMessage');
const greetingSubmitBtn = document.getElementById('greetingSubmitBtn');
const greetingError = document.getElementById('greetingError');
const greetingThanks = document.getElementById('greetingThanks');
const greetingsList = document.getElementById('greetingsList');
const greetingsLoading = document.getElementById('greetingsLoading');

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Format time ago
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// 3. Load Greetings from Google Sheets
async function loadGreetings() {
  try {
    const response = await fetch(`${GREETINGS_API_URL}?action=list`);
    const data = await response.json();
    
    if (greetingsLoading) greetingsLoading.style.display = 'none';

    if (!data.greetings || data.greetings.length === 0) {
      greetingsList.innerHTML = '<p class="lede" style="text-align: center; font-size: 0.9rem;">Be the first to leave a beautiful message! 💌</p>';
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
    if (greetingsLoading) {
      greetingsLoading.textContent = 'Unable to load messages. Please try again later.';
    }
  }
}

// 4. Handle Form Submission
if (greetingForm) {
  greetingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = greetingNameInput.value.trim();
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
      // Send to Google Apps Script (no-cors mode is required for GAS web apps)
      await fetch(GREETINGS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', name, message })
      });

      // Optimistic UI update: show the new message immediately
      if (greetingsList.querySelector('.lede')) {
        greetingsList.innerHTML = ''; // Clear "Be the first" message
      }
      
      const newGreetingHTML = `
        <div class="greeting-item">
          <div class="greeting-author">${escapeHtml(name)}</div>
          <div class="greeting-time">Just now</div>
          <div class="greeting-message">${escapeHtml(message)}</div>
        </div>
      `;
      greetingsList.insertAdjacentHTML('afterbegin', newGreetingHTML);

      // Reset form and show thanks
      greetingForm.reset();
      if (urlGuestName && urlGuestName !== 'Valued Guest') {
        greetingNameInput.value = urlGuestName; // Restore name
      }
      greetingThanks.hidden = false;
      greetingSubmitBtn.textContent = 'Send Wishes';
      greetingSubmitBtn.disabled = false;

      // Refresh from server after a short delay to ensure sync
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

// Load greetings when the page opens
document.addEventListener('DOMContentLoaded', loadGreetings);
  }
})();

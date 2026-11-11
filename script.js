/* =========================================================
   1. CONFIGURATION
   ========================================================= */
// Replace with your actual Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVOcjXfJuOY55LXSnjMYFDGtcatwg8orvsFGa2z45Zvm-_huXEkY5Tz3lsYI9y7T9KGg/exec';

/* =========================================================
   2. URL PERSONALIZATION (Guest Name)
   ========================================================= */
function getGuestName() {
  const params = new URLSearchParams(window.location.search);
  let name = params.get('to');
  
  // Fallback to clean path (e.g., /Rio%20Febri)
  if (!name) {
    const path = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '');
    if (path && path !== 'index.html') {
      name = path;
    }
  }
  return name ? name.trim() : 'Valued Guest';
}

const guestName = getGuestName();

// Populate all guest name elements
document.getElementById('guestNameCover').textContent = guestName;
document.getElementById('guestNameLine').textContent = guestName;
document.getElementById('guestNameBody').textContent = guestName;

// Auto-fill forms
const rsvpNameInput = document.getElementById('guestName');
if (rsvpNameInput) rsvpNameInput.value = guestName;

const greetingNameInput = document.getElementById('greetingName');
if (greetingNameInput && guestName !== 'Valued Guest') {
  greetingNameInput.value = guestName;
}

/* =========================================================
   3. UI INTERACTIONS (Cover, Music, RSVP Pax)
   ========================================================= */
// Open Invitation
const openBtn = document.getElementById('openBtn');
const cover = document.getElementById('cover');
const invitation = document.getElementById('invitation');
const bgm = document.getElementById('bgm');
const musicBtn = document.getElementById('musicBtn');

if (openBtn) {
  openBtn.addEventListener('click', () => {
    cover.style.display = 'none';
    invitation.hidden = false;
    document.body.classList.remove('locked');
    if (bgm) {
      bgm.play().catch(() => console.log('Audio play failed'));
    }
  });
}

// Music Toggle
if (musicBtn && bgm) {
  musicBtn.addEventListener('click', () => {
    if (bgm.paused) {
      bgm.play();
      musicBtn.classList.add('playing');
    } else {
      bgm.pause();
      musicBtn.classList.remove('playing');
    }
  });
}

// RSVP: Show/Hide Pax dropdown
const statusRadios = document.querySelectorAll('input[name="status"]');
const paxWrap = document.getElementById('paxWrap');

statusRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'attending') {
      paxWrap.hidden = false;
    } else {
      paxWrap.hidden = true;
    }
  });
});

/* =========================================================
   4. RSVP FORM SUBMISSION
   ========================================================= */
const rsvpForm = document.getElementById('rsvpForm');
const formError = document.getElementById('formError');
const thanksDiv = document.getElementById('thanks');
const thanksTitle = document.getElementById('thanksTitle');
const thanksText = document.getElementById('thanksText');
const editBtn = document.getElementById('editBtn');
const submitBtn = document.getElementById('submitBtn');

if (rsvpForm) {
  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const name = document.getElementById('guestName').value.trim();
    const status = document.querySelector('input[name="status"]:checked');
    const pax = document.getElementById('pax').value;

    if (!status) {
      formError.textContent = 'Please select if you will attend.';
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send reply';
      return;
    }

    const payload = {
      action: 'add_rsvp',
      name: name,
      status: status.value,
      pax: status.value === 'attending' ? pax : '0'
    };

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Show success message
      rsvpForm.hidden = true;
      thanksDiv.hidden = false;
      
      if (status.value === 'attending') {
        thanksTitle.textContent = 'Joyfully Accepted!';
        thanksText.textContent = `Thank you, ${name}. We can't wait to celebrate with you and your ${pax} guest(s).`;
      } else {
        thanksTitle.textContent = 'Thank You Anyway';
        thanksText.textContent = `We understand, ${name}. We will miss you, but thank you for letting us know.`;
      }
    } catch (err) {
      console.error('RSVP Error:', err);
      formError.textContent = 'Failed to send. Please try again.';
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send reply';
    }
  });

  // Allow editing the RSVP
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      thanksDiv.hidden = true;
      rsvpForm.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send reply';
    });
  }
}

/* =========================================================
   5. GREETINGS / DOA & UCAPAN
   ========================================================= */
const greetingForm = document.getElementById('greetingForm');
const greetingMessageInput = document.getElementById('greetingMessage');
const greetingSubmitBtn = document.getElementById('greetingSubmitBtn');
const greetingError = document.getElementById('greetingError');
const greetingThanks = document.getElementById('greetingThanks');
const greetingsList = document.getElementById('greetingsList');
const greetingsLoading = document.getElementById('greetingsLoading');

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
    const response = await fetch(`${APPS_SCRIPT_URL}?action=list_greetings`);
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
      greetingsLoading.textContent = 'Unable to load messages.';
    }
  }
}

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

    const payload = {
      action: 'add_greeting',
      name: name,
      message: message
    };

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Optimistic UI update
      if (greetingsList.querySelector('.lede')) {
        greetingsList.innerHTML = '';
      }
      
      const newGreetingHTML = `
        <div class="greeting-item">
          <div class="greeting-author">${escapeHtml(name)}</div>
          <div class="greeting-time">Just now</div>
          <div class="greeting-message">${escapeHtml(message)}</div>
        </div>
      `;
      greetingsList.insertAdjacentHTML('afterbegin', newGreetingHTML);

      // Reset form
      greetingForm.reset();
      if (guestName !== 'Valued Guest') {
        greetingNameInput.value = guestName;
      }
      greetingThanks.hidden = false;
      greetingSubmitBtn.disabled = false;
      greetingSubmitBtn.textContent = 'Send Wishes';

      // Refresh from server after delay
      setTimeout(loadGreetings, 2000);

    } catch (error) {
      console.error('Greeting submit error:', error);
      greetingError.textContent = 'Failed to send. Please try again.';
      greetingError.hidden = false;
      greetingSubmitBtn.disabled = false;
      greetingSubmitBtn.textContent = 'Send Wishes';
    }
  });
}

// Load greetings on page load
document.addEventListener('DOMContentLoaded', loadGreetings);




(() => {
  // ---- Edit these when details are confirmed ----
  const CONFIG = {
    venueName: 'Venue name to be confirmed',
    mapUrl: '',          // e.g. a Google Maps share link
    livestreamUrl: '',   // leave empty to show "to be confirmed"
    videoUrl: '',        // YouTube embed link, e.g. https://www.youtube.com/embed/VIDEO_ID
    portrait: '',        // e.g. 'images/portrait.jpg'
    photos: []           // e.g. ['images/1.jpg', 'images/2.jpg']
  };

  const $ = id => document.getElementById(id);
  const token = new URLSearchParams(location.search).get('to');
  let guest = null;

  // ---- Envelope ----
  $('openBtn').addEventListener('click', () => {
    $('openBtn').disabled = true;
    $('envelope').classList.add('open');
    setTimeout(() => {
      $('main').hidden = false;
      document.body.classList.remove('locked');
      window.scrollTo(0, 0);
      $('intro').classList.add('leave');
    }, 1700);
    setTimeout(() => $('intro').remove(), 2700);
  });

  // ---- Media and details ----
  $('venue').textContent = CONFIG.venueName;
  if (CONFIG.portrait) { $('portrait').src = CONFIG.portrait; $('portrait').hidden = false; $('portraitPh').hidden = true; }
  if (CONFIG.videoUrl) {
    $('video').innerHTML = '<iframe loading="lazy" allowfullscreen title="Wedding video" allow="accelerometer; encrypted-media; picture-in-picture" src="' + CONFIG.videoUrl + '"></iframe>';
  }
  const gal = $('gallery');
  if (CONFIG.photos.length) {
    CONFIG.photos.forEach((src, i) => { const im = new Image(); im.src = src; im.alt = 'Photo ' + (i + 1) + ' of Fira and Baqi'; im.loading = 'lazy'; gal.appendChild(im); });
  } else {
    for (let i = 1; i <= 5; i++) { const d = document.createElement('div'); d.className = 'ph'; d.textContent = 'Photo ' + i; gal.appendChild(d); }
  }
  const setLink = (el, url, label, pending) => {
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; el.textContent = label; }
    else { el.classList.add('disabled'); el.setAttribute('aria-disabled', 'true'); el.removeAttribute('href'); el.textContent = pending; }
  };
  setLink($('mapBtn'), CONFIG.mapUrl, 'View map', 'Map link to be added');
  setLink($('liveBtn'), CONFIG.livestreamUrl, 'Watch livestream', 'Livestream: to be confirmed');

  // ---- RSVP ----
  const form = $('rsvpForm'), msg = $('msg');
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle('error', !!err); };
  const lockRsvp = text => { form.hidden = true; $('rsvpLead').textContent = text; };
  const statusVal = () => (form.querySelector('input[name=status]:checked') || {}).value;

  form.addEventListener('change', () => { $('paxWrap').hidden = statusVal() !== 'attending'; say(''); });

  function showThanks(status, pax) {
    form.hidden = true; $('rsvpLead').hidden = true; $('thanks').hidden = false;
    $('thanksText').textContent = status === 'attending'
      ? 'Dear ' + guest.name + ', we have noted ' + pax + (pax > 1 ? ' guests' : ' guest') + ' and look forward to celebrating with you.'
      : 'Dear ' + guest.name + ', thank you for letting us know. You will be missed.';
  }
  $('editBtn').addEventListener('click', () => { $('thanks').hidden = true; $('rsvpLead').hidden = false; form.hidden = false; say(''); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = statusVal();
    if (!status) return say('Please choose Attending or Regrets.', true);
    const pax = status === 'attending' ? Number($('pax').value) : null;
    const btn = $('submitBtn');
    btn.disabled = true; say('Sending your reply...');
    try {
      const r = await fetch('/api/rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status, party_size: pax })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Your reply could not be saved. Please try again.');
      say(''); showThanks(status, pax);
    } catch (err) {
      say(err.message === 'Failed to fetch' ? 'No connection. Check your internet and try again.' : err.message, true);
    } finally { btn.disabled = false; }
  });

  async function loadGuest() {
    const nameEl = $('guestName');
    if (!token) { lockRsvp('Your reply link is personal. Please open this invitation from the link sent to you.'); return; }
    nameEl.classList.add('pending');
    try {
      const r = await fetch('/api/rsvp?t=' + encodeURIComponent(token));
      if (r.status === 404) { lockRsvp('We could not find this invitation. Please use the exact link sent to you.'); return; }
      if (!r.ok) throw new Error();
      guest = await r.json();
      nameEl.textContent = guest.name; $('fName').value = guest.name;
      if (guest.status !== 'pending') {
        const radio = form.querySelector('input[value=' + guest.status + ']');
        if (radio) radio.checked = true;
        if (guest.party_size) $('pax').value = guest.party_size;
        $('paxWrap').hidden = guest.status !== 'attending';
        showThanks(guest.status, guest.party_size);
      }
    } catch { lockRsvp('We could not load your invitation details. Please refresh the page and try again.'); }
    finally { nameEl.classList.remove('pending'); }
  }
  loadGuest();
})();

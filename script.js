(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const token = (params.get('t') || '').trim();

  // ---- Edit these ----
  const MAP_URL = '';                 // paste a Google Maps link when the venue is confirmed
  const GALLERY = [];                 // e.g. ['images/1.jpg','images/2.jpg','images/3.jpg']
  // --------------------

  let guestName = '';

  function setName(name) {
    guestName = name;
    const shown = name || 'Valued Guest';
    $('guestNameCover').textContent = shown;
    $('guestNameLine').textContent = shown;
    if (name) { $('guestName').value = name; $('guestName').readOnly = !!token; }
  }

  // Gallery
  const g = $('gallery');
  for (let i = 0; i < 6; i++) {
    const f = document.createElement('figure');
    f.textContent = GALLERY[i] ? '' : 'Photo ' + (i + 1);
    if (GALLERY[i]) { const im = new Image(); im.src = GALLERY[i]; im.alt = 'Fira and Baqi, photo ' + (i + 1); im.loading = 'lazy'; f.appendChild(im); }
    g.appendChild(f);
  }

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
      $('thanksText').textContent = 'We have you down for ' + pax + (pax > 1 ? ' guests' : ' guest') + ' on 13 December 2026. We look forward to celebrating with you.';
    } else {
      $('thanksTitle').textContent = 'Thank you for letting us know' + n;
      $('thanksText').textContent = 'We are sorry you cannot join us, and we are grateful for your good wishes.';
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
    if (!checked) return showError('Please choose Attending or Regrets.');
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

  // Envelope
  $('openBtn').addEventListener('click', () => {
    $('openBtn').disabled = true;
    $('envelope').classList.add('open');
    setTimeout(() => {
      $('cover').classList.add('gone');
      $('invitation').hidden = false;
      document.body.classList.remove('locked');
      window.scrollTo(0, 0);
    }, 1700);
  });
})();

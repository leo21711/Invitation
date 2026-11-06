(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  // ---- Edit these ----
  const MAP_URL = '';                 // paste a Google Maps link when the venue is confirmed
  const GALLERY = [];                 // e.g. ['images/1.jpg','images/2.jpg','images/3.jpg']
  // --------------------

  // Guest name comes from the link: https://firabaqi-wedding.vercel.app/?to=Bapak%20Joko
  const linkName = (params.get('to') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const form = $('rsvpForm'), err = $('formError'), btn = $('submitBtn'), nameInput = $('guestName');
  let guestName = linkName;

  function setName(name) {
    guestName = name;
    const shown = name || 'Valued Guest';
    $('guestNameCover').textContent = shown;
    $('guestNameLine').textContent = shown;
  }
  setName(linkName);
  if (linkName) { nameInput.value = linkName; nameInput.readOnly = true; }   // locked when it comes from the link
  else { $('rsvpLede').textContent = 'Please enter your name and let us know whether you can join us.'; }

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

  function showError(m) { err.textContent = m; err.hidden = false; }
  function togglePax() { $('paxWrap').hidden = (form.querySelector('input[name=status]:checked') || {}).value !== 'attending'; }
  form.addEventListener('change', togglePax);

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
  $('editBtn').addEventListener('click', () => { $('thanks').hidden = true; form.hidden = false; $('rsvpLede').hidden = false; });

  // If this guest has already replied, show their reply (they can still change it)
  if (linkName) {
    fetch('/api/rsvp?name=' + encodeURIComponent(linkName))
      .then(r => r.json())
      .then(d => {
        if (d && d.found) {
          const r = form.querySelector('input[value="' + d.status + '"]'); if (r) r.checked = true;
          if (d.party_size) $('pax').value = d.party_size;
          togglePax(); showThanks(d.status, d.party_size);
        }
      })
      .catch(() => {});   // a failed lookup should never block the form
  }

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.hidden = true;
    const name = nameInput.value.replace(/\s+/g, ' ').trim();
    const checked = form.querySelector('input[name=status]:checked');
    if (!name) return showError('Please enter your name.');
    if (!checked) return showError('Please choose Attending or Regrets.');
    const status = checked.value, pax = status === 'attending' ? parseInt($('pax').value, 10) : null;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status, party_size: pax }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error || 'Your reply was not saved. Please try again.');
      setName(name); showThanks(status, pax);
    } catch (ex) {
      showError(ex.message || 'Your reply was not saved. Please try again.');
    } finally { btn.disabled = false; btn.textContent = 'Send reply'; }
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

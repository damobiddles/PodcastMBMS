// Sections that moved from the home page to the Services page: keep old links working.
(function () {
  const renamed = { 'hale-house': 'great-portland-street' };
  const moved = ['recording', 'great-portland-street', 'mobile-remote', 'post-production', 'marketing', 'youtube-clips', 'packages'];
  let id = location.hash.slice(1);
  if (renamed[id]) {
    id = renamed[id];
    if (document.getElementById(id)) { location.replace('#' + id); return; }
  }
  if (id && moved.includes(id) && !document.getElementById(id) && document.querySelector('.hero')) {
    location.replace('services/#' + id);
  }
})();

// Replace with the address enquiries should go to.
const CONTACT_EMAIL = 'meadowbms@gmail.com';

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const toggle = document.querySelector('.nav-toggle');
const links = document.getElementById('nav-links');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

// Escape closes the mobile menu and returns focus to the menu button.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && links.classList.contains('open')) {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});

links.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  })
);

// Sends the contact form to Web3Forms, which emails it to CONTACT_EMAIL, without leaving the page.
// Without JavaScript, the form still posts normally and Web3Forms redirects to /thank-you/.
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('form-status');
  const button = contactForm.querySelector('button[type="submit"]');
  const label = button.textContent;
  const data = new FormData(contactForm);
  const page = data.get('page') ? `${data.get('page')}: ` : '';
  data.set('subject', `${page}Podcast enquiry: ${data.get('interest')} (${data.get('name')})`);
  data.delete('redirect');
  button.disabled = true;
  button.textContent = 'Sending…';
  try {
    const res = await fetch(contactForm.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: data,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || res.status);
    contactForm.reset();
    status.className = 'form-status form-status-ok';
    status.textContent = "Thanks, your enquiry has been sent. We'll be in touch soon.";
    button.textContent = 'Sent';
  } catch {
    status.className = 'form-status form-status-error';
    status.innerHTML = `Sorry, that didn't send. Please email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`;
    button.disabled = false;
    button.textContent = label;
  }
  status.hidden = false;
});

// Playbook waitlist: same Web3Forms setup as the contact form.
const waitlistForm = document.getElementById('waitlist-form');
waitlistForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('waitlist-status');
  const button = waitlistForm.querySelector('button[type="submit"]');
  const data = new FormData(waitlistForm);
  data.set('subject', `Playbook waitlist: ${data.get('name')} (${data.get('currently_making')})`);
  data.delete('redirect');
  button.disabled = true;
  button.textContent = 'Joining…';
  try {
    const res = await fetch(waitlistForm.action, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || res.status);
    waitlistForm.reset();
    status.className = 'form-status form-status-ok';
    status.textContent = "You're on the list. We'll email you when the playbook is ready.";
    button.textContent = 'Joined';
  } catch {
    status.className = 'form-status form-status-error';
    status.innerHTML = `Sorry, that didn't go through. Please email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`;
    button.disabled = false;
    button.textContent = 'Join the waitlist';
  }
  status.hidden = false;
});

// Embeds YouTube videos from their data-youtube-id.
document.querySelectorAll('.video-frame[data-youtube-id]').forEach((el) => {
  const id = el.dataset.youtubeId.trim();
  if (!id) return;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  iframe.title = el.dataset.title || 'YouTube video';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  el.replaceChildren(iframe);
});

// Play marked videos only while they're on screen, to save data and battery.
const inViewVideos = document.querySelectorAll('video[data-play-in-view]');
if (inViewVideos.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()));
  }, { threshold: 0.5 });
  inViewVideos.forEach((v) => io.observe(v));
} else {
  inViewVideos.forEach((v) => { v.controls = true; });
}

// Respect reduced motion: stop looping videos and give the viewer controls.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('video[autoplay]').forEach((v) => {
    v.removeAttribute('autoplay');
    v.pause();
    v.controls = true;
  });
}

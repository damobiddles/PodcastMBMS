// Sections that moved from the home page to the Services page: keep old links working.
(function () {
  const moved = ['recording', 'hale-house', 'mobile-remote', 'post-production', 'marketing', 'youtube-clips', 'packages'];
  const id = location.hash.slice(1);
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

links.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  })
);

// Opens the visitor's email client with the enquiry pre-filled.
document.getElementById('contact-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const subject = `Podcast enquiry: ${data.get('interest')}`;
  const body = `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nInterested in: ${data.get('interest')}\n\n${data.get('message')}`;
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

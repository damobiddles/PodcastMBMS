// Replace with the address enquiries should go to.
const CONTACT_EMAIL = 'meadowbms@gmail.com';

document.getElementById('year').textContent = new Date().getFullYear();

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
document.getElementById('contact-form').addEventListener('submit', (e) => {
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

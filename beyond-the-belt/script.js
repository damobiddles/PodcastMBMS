// Beyond the Belt: mobile menu and contact form. No dependencies, no build step.

// Placeholder address: change it here and in index.html when the real one is known.
const CONTACT_EMAIL = 'hello@beyondthebelt.org';

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');

function setMenu(open) {
  header.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
}
toggle.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

document.getElementById('year').textContent = new Date().getFullYear();

// Contact form: opens the visitor's email app with the message filled in.
// To send from the page instead, point this at a form service such as Web3Forms.
const form = document.getElementById('contact-form');
const status = form.querySelector('.form-status');

form.addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(form);
  if (data.get('website')) return; // honeypot
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const message = String(data.get('message') || '').trim();
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) {
    status.textContent = 'Please add your name, a valid email address and a message.';
    return;
  }
  const subject = `Beyond the Belt enquiry: ${data.get('topic')}`;
  const body = `${message}\n\nFrom: ${name} (${email})`;
  status.textContent = 'Opening your email app. If nothing happens, email us at ' + CONTACT_EMAIL + '.';
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

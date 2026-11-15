// Shows the marketing check saved by the form page in this tab.
(function () {
  var SERVICES = {
    'brand-strategy': ['Brand strategy & identity', '/services/brand-strategy/'],
    'digital-marketing': ['Digital & performance marketing', '/services/digital-marketing/'],
    'social-media': ['Social media & community', '/services/social-media/'],
    'creative-web-design': ['Creative & web design', '/services/creative-web-design/'],
    'pr-influencer': ['PR & influencer outreach', '/services/pr-influencer/'],
    'data-growth': ['Data & growth analysis', '/services/data-growth/']
  };
  var data = null;
  try { data = JSON.parse(sessionStorage.getItem('mbms-marketing-check') || 'null'); } catch (e) { data = null; }
  if (!data || !data.audit) { document.getElementById('mc-missing').hidden = false; return; }
  var a = data.audit;
  var set = function (id, text) { document.getElementById(id).textContent = text || ''; };
  var host = data.url;
  try { host = new URL(data.url).hostname.replace(/^www\./, ''); } catch (e) { /* keep as typed */ }

  set('mc-title', (data.business || host) + ': your marketing check');
  set('mc-intro', 'We read your homepage at ' + host + ' and wrote down what a new customer sees, what’s working and what we’d change first.');
  set('r-summary', a.summary);
  set('r-verdict', a.positioning.verdict);
  set('r-positioning', a.positioning.detail);
  set('r-h-obs', a.messaging.headline.observed); set('r-h-com', a.messaging.headline.comment);
  set('r-p-obs', a.messaging.proof.observed); set('r-p-com', a.messaging.proof.comment);
  set('r-c-obs', a.messaging.ctas.observed); set('r-c-com', a.messaging.ctas.comment);
  var wins = document.getElementById('r-wins');
  a.quick_wins.forEach(function (w) {
    var li = document.createElement('li'), h = document.createElement('h3'), p = document.createElement('p');
    h.textContent = w.title; p.textContent = w.detail;
    li.appendChild(h); li.appendChild(p); wins.appendChild(li);
  });
  set('r-big-title', a.bigger_opportunity.title);
  set('r-big', a.bigger_opportunity.detail);
  var svc = SERVICES[a.bigger_opportunity.service] || SERVICES['brand-strategy'];
  var link = document.getElementById('r-service');
  link.textContent = svc[0]; link.href = svc[1];
  set('r-note', (data.emailed ? 'We’ve emailed you a copy. ' : '') + 'This check looked only at the text on your homepage, so it can’t see images, design, speed or other pages. Treat it as a starting point.');
  document.getElementById('mc-report').hidden = false;
  document.title = (data.business || host) + ': your marketing check | MBMS';
})();

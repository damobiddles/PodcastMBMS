// Shows the podcast check saved by the form page in this tab.
(function () {
  var SERVICES = {
    'plan-coach': ['Plan and coach', '/services/#plan'],
    record: ['Recording', '/services/#recording'],
    'edit-transcribe': ['Edit and transcribe', '/services/#post-production'],
    distribute: ['Distribution', '/services/#distribution'],
    shorts: ['Shorts and a monthly content calendar', '/services/#shorts'],
    youtube: ['YouTube channel growth', '/services/#youtube']
  };
  var SOURCE = { youtube: 'your YouTube channel’s recent uploads', apple: 'your show’s feed (found through Apple Podcasts)', rss: 'your show’s feed' };
  var data = null;
  try { data = JSON.parse(sessionStorage.getItem('mbms-podcast-check') || 'null'); } catch (e) { data = null; }
  if (!data || !data.audit || !data.audit.show) { document.getElementById('mc-missing').hidden = false; return; }
  var a = data.audit;
  var set = function (id, text) { document.getElementById(id).textContent = text || ''; };
  var name = data.business || 'Your show';
  var source = SOURCE[data.source] || SOURCE.rss;

  set('mc-title', name + ': your podcast check');
  set('mc-intro', 'We read ' + source + ' and wrote down what a new listener sees, what’s working and what we’d change first.');
  set('r-summary', a.summary);
  set('r-verdict', a.show.verdict);
  set('r-positioning', a.show.detail);
  set('r-h-obs', a.titles.observed); set('r-h-com', a.titles.comment);
  set('r-p-obs', a.descriptions.observed); set('r-p-com', a.descriptions.comment);
  set('r-c-obs', a.rhythm.observed); set('r-c-com', a.rhythm.comment);
  var wins = document.getElementById('r-wins');
  a.quick_wins.forEach(function (w) {
    var li = document.createElement('li'), h = document.createElement('h3'), p = document.createElement('p');
    h.textContent = w.title; p.textContent = w.detail;
    li.appendChild(h); li.appendChild(p); wins.appendChild(li);
  });
  set('r-big-title', a.bigger_opportunity.title);
  set('r-big', a.bigger_opportunity.detail);
  var svc = SERVICES[a.bigger_opportunity.service] || SERVICES['plan-coach'];
  var link = document.getElementById('r-service');
  link.textContent = svc[0]; link.href = svc[1];
  set('r-note', (data.emailed ? 'We’ve emailed you a copy. ' : '') + 'This check read only ' + source + '. We didn’t listen to or watch any episodes, and we can’t see artwork, downloads or reviews, so treat it as a starting point.');
  document.getElementById('mc-report').hidden = false;
  document.title = name + ': your podcast check | MBMS Podcast Studio';
})();

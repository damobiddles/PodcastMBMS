// Free marketing check form: sends the details to the check function, shows progress,
// then opens the results page. The result is kept in this tab only (sessionStorage).
(function () {
  var form = document.getElementById('mc-form');
  if (!form) return;
  var started = Date.now();
  var status = document.getElementById('mc-status');
  var progress = document.getElementById('mc-progress');
  var submit = document.getElementById('mc-submit');
  var other = form.querySelector('.mc-other');
  var bookLink = '<a href="/work-with-us/?interest=Free%2020-minute%20marketing%20check#contact">book a free 20-minute call</a>';

  form.addEventListener('change', function (e) {
    if (e.target.name === 'goal') other.hidden = e.target.value !== 'other';
  });

  function showError(message) {
    status.hidden = false;
    status.className = 'form-status form-status-error';
    status.textContent = message;
  }

  function setStep(n) {
    progress.querySelectorAll('[data-step]').forEach(function (li) {
      var s = Number(li.dataset.step);
      li.className = s < n ? 'done' : s === n ? 'active' : '';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.hidden = true;
    var d = new FormData(form);
    var goal = d.get('goal');
    if (!String(d.get('url') || '').trim()) return showError('Please enter your website address.');
    if (!String(d.get('business') || '').trim()) return showError('Please tell us your business name.');
    if (!String(d.get('sells') || '').trim()) return showError('Please tell us briefly what you sell.');
    if (!goal) return showError('Please choose your main goal.');
    if (!form.email.checkValidity() || !form.email.value) return showError('Please check your email address.');
    if (!form.consent.checked) return showError('Please tick the first box so we can send you your check.');

    var payload = {
      url: d.get('url'), business: d.get('business'), sells: d.get('sells'), goal: goal,
      goal_other: d.get('goal_other') || '', email: d.get('email'),
      consent: form.consent.checked, follow_up: form.follow_up.checked,
      company_website: d.get('company_website') || '', started: started
    };

    submit.disabled = true;
    submit.textContent = 'Checking…';
    form.hidden = true;
    progress.hidden = false;
    progress.focus();
    progress.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var step = 0; setStep(0);
    var timer = setInterval(function () { if (step < 3) setStep(++step); }, 7000);

    function reset(message) {
      clearInterval(timer);
      progress.hidden = true;
      form.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Get my free check';
      showError(message);
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    fetch('/api/marketing-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false }; });
    }).then(function (data) {
      if (!data || !data.ok) {
        return reset((data && data.message) || 'Something went wrong. Please try again in a minute, or book a free 20-minute call.');
      }
      clearInterval(timer);
      setStep(4);
      try { sessionStorage.setItem('mbms-marketing-check', JSON.stringify(data)); } catch (err) { /* private mode: page falls back to email */ }
      location.href = '/marketing-check/your-check/';
    }).catch(function () {
      reset('We couldn’t reach our checker. Check your connection and try again, or book a free 20-minute call.');
    });
  });
})();

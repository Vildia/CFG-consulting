/* GA4 bootstrap + consent + form/CTA hooks */
(function(){
  var GA_ID = 'G-D7QRTPW2F3';
  function loadGA(){
    if (window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id='+GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip:true });
  }
  // very simple consent model: load immediately if consent was previously granted; otherwise wait
  try{
    var consent = localStorage.getItem('cfg_ga_consent') || 'granted';
    if (consent === 'granted') loadGA();
    document.addEventListener('cfg:consent-granted', function(){ localStorage.setItem('cfg_ga_consent','granted'); loadGA(); });
  }catch(e){ loadGA(); }

  // CTA click tracking
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest && e.target.closest('[data-cta]');
    if (!el || !window.gtag) return;
    var label = el.getAttribute('data-cta') || (el.textContent||'').trim().slice(0,80);
    gtag('event','cta_click',{ event_category:'engagement', event_label:label });
  }, {capture:true});

  // Wrap fetch to record /api/lead outcomes
  var origFetch = window.fetch;
  window.fetch = function(input, init){
    var p = origFetch.apply(this, arguments);
    try{
      var url = (typeof input === 'string') ? input : (input && input.url) || '';
      var method = (init && init.method) ? String(init.method).toUpperCase() : 'GET';
      var isLead = url.indexOf('/api/lead') !== -1 && method === 'POST';
      if (!isLead) return p;
      return p.then(function(res){
        if (window.gtag) gtag('event', res.ok ? 'form_submit_ok' : 'form_submit_fail', { status: res.status });
        return res;
      }).catch(function(err){
        if (window.gtag) gtag('event','form_submit_error',{ error: String(err && err.message || err) });
        throw err;
      });
    }catch(e){ return p; }
  };
})();
/* GA hooks for CTA and forms */
(function(){
  if (typeof window.gtag !== 'function'){ window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments)} }
  const env = location.hostname === 'cfg-consulting.vercel.app' ? 'production' :
              (location.hostname.endsWith('.vercel.app') ? 'preview' : 'unknown');
  document.addEventListener('click', function(e){
    const el = e.target.closest('[data-cta]');
    if (!el) return;
    const label = el.getAttribute('data-cta') || (el.textContent||'').trim().slice(0,80);
    gtag('event','cta_click',{ event_category:'engagement', event_label:label, env });
  }, {capture:true});
  const orig = window.fetch;
  window.fetch = async function(input, init){
    const url = (typeof input === 'string') ? input : (input && input.url) || '';
    const method = (init && init.method) ? String(init.method).toUpperCase() : 'GET';
    const isLead = url.includes('/api/lead') && method==='POST';
    try{
      const res = await orig.apply(this, arguments);
      if (isLead){
        gtag('event','form_submit',{env});
        try{
          const t = await res.clone().text();
          let j; try{ j = JSON.parse(t); }catch(e){}
          if (res.ok && j && j.ok) gtag('event','form_success',{env}); else gtag('event','form_error',{env,status:res.status});
        }catch(e){}
      }
      return res;
    }catch(e){
      if (isLead) gtag('event','form_error',{env,error:String(e&&e.message||e)});
      throw e;
    }
  };
  document.addEventListener('click', function(e){
    const el = e.target.closest('[data-partner-cta]');
    if (!el) return;
    const label = el.getAttribute('data-partner-cta') || 'partner';
    gtag('event','partner_cta',{ event_label:label, env });
  }, {capture:true});
})();
// Auto-generated GA4 initializer (consent-gated).
// If window.__CFG.GA_ID is provided, it overrides the default below.
(function(){ 
  try {
    var GAID = (window.__CFG && window.__CFG.GA_ID) || 'G-D7QRTPW2F3';
    if(!GAID) return;
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;
    gtag('js', new Date());
    gtag('config', GAID, { send_page_view: true });
  } catch(e){ console.warn('GA init error', e); }
})();
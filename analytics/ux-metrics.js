(function(){
  if (typeof window.gtag !== 'function'){ window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments)} }
  const env = location.hostname === 'cfg-consulting.vercel.app' ? 'production' : (location.hostname.endsWith('.vercel.app') ? 'preview' : 'unknown');
  const io = new IntersectionObserver((es)=>{ es.forEach(e=>{ if(e.isIntersecting){ const id = e.target.id || e.target.getAttribute('data-section') || 'section'; gtag('event','section_view',{section:id,env}); io.unobserve(e.target); } }); },{threshold:0.5});
  document.querySelectorAll('section[id], [data-section]').forEach(el=>io.observe(el));
  document.addEventListener('click',(e)=>{ const a=e.target.closest('a[href^="http"]'); if(!a) return; if(a.host!==location.host) gtag('event','outbound_click',{url:a.href,env}); },{capture:true});
})();
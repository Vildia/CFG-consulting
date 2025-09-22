/* Simple UX metrics: section visibility + outbound clicks */
(function(){
  function send(event, params){ if (!window.gtag) return; try{ gtag('event', event, params||{}); }catch(e){} }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        var id = entry.target.getAttribute('id') || entry.target.getAttribute('data-section') || 'section';
        send('section_view', {section:id});
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.5});
  document.querySelectorAll('section[id], [data-section]').forEach(function(el){ io.observe(el); });
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href^="http"]');
    if (!a) return;
    if (a.host !== location.host){ send('outbound_click', {url:a.href}); }
  }, {capture:true});
})();
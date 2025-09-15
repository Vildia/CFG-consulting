// C|F|G consulting — GA4 instrumentation
(function(){'use strict';
  var GA_ID = 'G-D7QRTPW2F3';
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  var s = document.createElement('script'); s.async=true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID, { send_page_view: false });

  function parseQuery(qs){var o={};qs=(qs||window.location.search).replace(/^\?/,'');if(!qs)return o;qs.split('&').forEach(function(p){var kv=p.split('=');if(kv[0])o[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1]||'');});return o;}
  function getReferrer(){return document.referrer||'';}
  function saveAtt(){var u=parseQuery();var now=new Date().toISOString();var a={ts:now,ref:getReferrer(),utm_source:u.utm_source||'',utm_medium:u.utm_medium||'',utm_campaign:u.utm_campaign||'',utm_content:u.utm_content||'',utm_term:u.utm_term||'',pid:u.pid||''};try{if(!localStorage.getItem('cfg_ft'))localStorage.setItem('cfg_ft',JSON.stringify(a));localStorage.setItem('cfg_lt',JSON.stringify(a));}catch(e){}return a;}
  function getAtt(k){try{return JSON.parse(localStorage.getItem(k))||{};}catch(e){return {};}} saveAtt();

  function pageView(extra){var p=Object.assign({page_title:document.title,page_location:location.href,page_path:location.pathname+location.search+location.hash},extra||{});gtag('event','page_view',p);}
  function sectionView(id){if(!id)return;gtag('event','section_view',{section_id:id});}

  document.addEventListener('DOMContentLoaded',function(){pageView();});
  window.addEventListener('hashchange',function(){pageView({page_path:location.pathname+location.search+location.hash});sectionView((location.hash||'').replace('#',''));});

  function on(sel,type,handler){document.addEventListener(type,function(e){var t=e.target;while(t&&t!==document){if(t.matches&&t.matches(sel)){handler(e,t);return;}t=t.parentNode;}},true);}
  function enrich(params){var ft=getAtt('cfg_ft'),lt=getAtt('cfg_lt');var base={pid:(lt.pid||ft.pid||''),utm_source:(lt.utm_source||ft.utm_source||''),utm_medium:(lt.utm_medium||ft.utm_medium||''),utm_campaign:(lt.utm_campaign||ft.utm_campaign||''),utm_content:(lt.utm_content||ft.utm_content||''),utm_term:(lt.utm_term||ft.utm_term||''),ref:(lt.ref||ft.ref||'')};return Object.assign(base,params||{});}

  on('a[href*="#estimate"], [data-evt="estimate_24h"]','click',function(e,el){gtag('event','estimate_24h',enrich({label:el.textContent.trim()}));});
  on('a[href*="#partner"], [data-evt="partner_cta"]','click',function(e,el){gtag('event','partner_cta',enrich({label:el.textContent.trim()}));});
  on('a[href^="mailto:"], [data-evt="cta_email"]','click',function(e,el){var mail=(el.getAttribute('href')||'').replace('mailto:','');gtag('event','cta_email',enrich({email:mail}));});
  on('a[href*="t.me"], [data-evt="cta_telegram"]','click',function(e,el){gtag('event','cta_telegram',enrich({label:el.href}));});
  on('a[href*="wa.me"], [data-evt="cta_whatsapp"]','click',function(e,el){gtag('event','cta_whatsapp',enrich({label:el.href}));});
  on('a[href^="http"]','click',function(e,el){try{var u=new URL(el.href);if(u.host!==location.host){gtag('event','outbound_click',enrich({url:el.href}));}}catch(_e){}});
  function serializeForm(f){var o={};var fd=new FormData(f);fd.forEach(function(v,k){k=k.toLowerCase();if(o[k]){if(!Array.isArray(o[k]))o[k]=[o[k]];o[k].push(v);}else o[k]=v;});return o;}
  document.addEventListener('submit',function(e){var f=e.target;if(!(f&&f.tagName==='FORM'))return;var params=serializeForm(f);var name=f.getAttribute('id')||f.getAttribute('name')||'lead_form';gtag('event','form_submit',enrich(Object.assign({form_name:name},params)));},true);
  on('[data-evt="copy_email"]','click',function(e,el){var mail=el.getAttribute('data-email')||((document.querySelector('a[href^="mailto:"]')||{}).href||'').replace('mailto:','');gtag('event','copy_email',enrich({email:mail}));});
  on('[data-evt="open_gmail"]','click',function(e,el){gtag('event','open_gmail',enrich());});
  if(location.search.indexOf('ga_debug=1')>=0){console.log('[CFG Analytics] GA ready:',GA_ID);window.gtag=gtag;}
})();
(function(){
  'use strict';
  function $(s,r){return (r||document).querySelector(s)}
  function $all(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

  function serialize(form){
    var data={};
    $all('input,textarea,select',form).forEach(function(el){
      if(!el.name) return;
      if(el.type==='checkbox') data[el.name]=!!el.checked; else data[el.name]=el.value||'';
    });
    return data;
  }
  function getUTM(){
    try{ var p=new URLSearchParams(location.search),k=['utm_source','utm_medium','utm_campaign','utm_term','utm_content'],o={}; k.forEach(function(x){var v=p.get(x); if(v) o[x]=v}); return o; }catch(_){ return {}; }
  }
  function disableForm(form, yes){
    var btn=form.querySelector('button[type="submit"], .btn-primary');
    if(btn){
      btn.disabled=!!yes; btn.setAttribute('aria-disabled', yes?'true':'false');
      if(yes){ if(!btn.__t){ btn.__t=btn.textContent } btn.textContent='Отправка…'; } else { if(btn.__t){ btn.textContent=btn.__t } }
    }
    $all('input,textarea,select',form).forEach(function(el){ el.readOnly=!!yes; });
  }
  function toastOk(m){ try{ var t=$('.toast'); if(t){ t.textContent=m||'Готово'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show')},2000);} }catch(e){} }
  function toastErr(m){ try{ var t=$('.toast'); if(t){ t.textContent=m||'Ошибка'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show')},2600);} }catch(e){} }

  function buildBody(form){
    var body = serialize(form);
    if (body.company_site && body.company_site.trim()!==''){ return null; } // honeypot
    body.page_url=location.href; body.referrer=document.referrer||''; body.locale=(document.documentElement.lang||'ru');
    var utm=getUTM(); if(Object.keys(utm).length) body.utm=utm;
    return 'payload='+encodeURIComponent(JSON.stringify(body));
  }

  function resolveUrl(){
    var env = (window.__CFG && window.__CFG.APPS_SCRIPT_URL) || '';
    if(!/^https?:\/\//.test(env)){ env=''; }
    return env || 'https://script.google.com/macros/s/AKfycbwFOxaAtkPV4hsk3_gHGdrS4dlISHyVtj2f8TrxjTI_ZQP7j8cd2N8XVUdYpPzUNPv73A/exec';
  }

  async function onSubmit(e){
    var form=e.target; if(!form.matches('#lead-form, #partner-form')) return;
    e.preventDefault();
    if(form.__sending) return; form.__sending=true; disableForm(form,true);
    try{
      var url = resolveUrl(); if(!url) throw new Error('no_handler');
      var body = buildBody(form); if(body===null) throw new Error('spam');
      const resp = await fetch(url, {
        method:'POST',
        mode:'cors',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body: body
      });
      // handle opaque CORS or normal JSON
      let parsed = null;
      try{ if(resp && resp.type==='opaque'){ parsed={{ok:true,status:'ok'}}; } else { parsed = await resp.json(); } }catch(_){ parsed = {{ ok: resp && resp.ok, status: resp && resp.status }}; }
      if(parsed && (parsed.ok===true || parsed.status==='ok' || parsed.ok===true)){
        form.reset();
        try{ if(window.gtag){ gtag('event','lead_success',{form_id: form.id||'lead-form'}); } }catch(_){}
        toastOk('Заявка отправлена ✓');
      }else{
        toastErr('Не удалось отправить. Попробуйте ещё раз.');
      }
    }catch(err){
      toastErr('Не удалось отправить. Попробуйте ещё раз.');
    }finally{
      disableForm(form,false); form.__sending=false;
    }
  }

  document.addEventListener('submit', onSubmit);
  document.addEventListener('DOMContentLoaded', function(){
    var f=document.querySelector('#lead-form, #partner-form');
    if(f){ try{ if(window.gtag){ gtag('event','lead_view',{form_id:f.id||'lead-form',page_location:location.href}); } }catch(_){ } }
  });
})();
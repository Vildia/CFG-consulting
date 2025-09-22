(function(){
  'use strict';
  async function hmacSHA256Hex(key, msg){
    if(!window.crypto || !window.crypto.subtle) return null;
    try{
      const enc = new TextEncoder();
      const k = await window.crypto.subtle.importKey('raw', enc.encode(key), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
      const sig = await window.crypto.subtle.sign('HMAC', k, enc.encode(msg));
      const bytes = Array.from(new Uint8Array(sig));
      return bytes.map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){ return null; }
  }


  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function serializeForm(form){
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function(v,k){
      if (data[k] !== undefined) {
        if (!Array.isArray(data[k])) data[k] = [data[k]];
        data[k].push(v);
      } else {
        data[k] = v;
      }
    });
    return data;
  }

  function getUTM(){
    var p = new URLSearchParams(location.search);
    var keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
    var o = {};
    keys.forEach(function(k){ var v=p.get(k); if(v) o[k]=v; });
    return o;
  }

  function toastOk(msg){ try{ var t=$('.toast'); if(t){ t.textContent=msg; t.classList.add('show'); setTimeout(function(){t.classList.remove('show')},2200); } }catch(e){} }
  function toastErr(msg){ try{ var t=$('.toast'); if(t){ t.textContent=msg; t.style.background='#ef4444'; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); t.style.background=''; },2600); } }catch(e){} }

  function disableForm(form, yes){
    var btn = form.querySelector('button[type="submit"], .btn-primary');
    if(btn){ btn.disabled = !!yes; btn.setAttribute('aria-disabled', yes?'true':'false'); }
    $all('input,textarea,select', form).forEach(function(el){ el.readOnly = !!yes; });
  }

  function buildPayload(form){
    var body = serializeForm(form);
    // honeypot
    if (body.company_site && body.company_site.trim() !== '') {
      body._spam = true;
    }
    // context
    body.page_url = location.href;
    body.referrer = document.referrer || '';
    body.locale = (document.documentElement.lang || 'ru');
    var utm = getUTM(); if (Object.keys(utm).length) body.utm = utm;

    // secrets
    body.cfg_key = (window.__CFG && window.__CFG.CFG_KEY) || '';
    body.cfg_secret = (window.__CFG && window.__CFG.CFG_SECRET) || '';

    return JSON.stringify(body);
  }

  async function onSubmit(e){
    var form = e.target;
    if (!form.matches('#lead-form')) return;
    e.preventDefault();
    try{ if(window.gtag){ gtag('event','lead_start',{ form_id: e.target.id||'lead-form' }); } }catch(_){ }

    // anti-resubmit timer
    if (form.__sending) return;
    form.__sending = true;

    disableForm(form, true);
    var url = (window.__CFG && window.__CFG.APPS_SCRIPT_URL) || '';
    if(!url){ disableForm(form,false); form.__sending=false; return toastErr('Ошибка конфигурации: нет URL обработчика.'); try{ if(window.gtag){ gtag('event','lead_error',{reason:'no_handler'}); } }catch(_){ } }

    
    var payload = buildPayload(form);
    var cfgKey = (window.__CFG && window.__CFG.CFG_KEY) || '';
    if (cfgKey){
      try {
        var obj = JSON.parse(payload);
        delete obj._sig;
        var sig = await hmacSHA256Hex(cfgKey, JSON.stringify(obj));
        if(sig){ obj._sig = sig; }
        payload = JSON.stringify(obj);
      } catch(_) {}
    }
    fetch(url, {

      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildPayload(form)
    }).then(function(r){ if(!r || r.type==='opaque'){ return { ok:true, opaque:true }; } return r.text().then(function(t){ try{ return JSON.parse(t); }catch(_){ return { ok: r.ok, status: r.status }; } }); })
      .then(function(res){
        if(res && (res.ok===true || res.status==='ok')){
          form.reset();
          
    try { if(window.gtag) { gtag('event', 'lead_submit', { form_id: form.id || 'lead-form', page_location: location.href }); } } catch(_) {}

          toastOk('Заявка отправлена ✓');
        }else{
          toastErr('Не удалось отправить. Попробуйте ещё раз.'); try{ if(window.gtag){ gtag('event','lead_error',{reason:'bad_response'}); } }catch(_){ }
        }
      }).catch(function(){
        toastErr('Сбой сети. Повторите позже.'); try{ if(window.gtag){ gtag('event','lead_error',{reason:'network'}); } }catch(_){ }
      }).finally(function(){
        disableForm(form,false);
        form.__sending=false;
      });
  }

  document.addEventListener('submit', onSubmit);
})();

  document.addEventListener('DOMContentLoaded', function(){
    var f = document.querySelector('#lead-form, #partner-form');
    if(f){ try{ if(window.gtag){ gtag('event','lead_view',{form_id: f.id||'lead-form', page_location: location.href}); } }catch(_){ } }
  });


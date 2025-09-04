// CFG consulting — HubSpot forms client (free tier friendly)
// Fill your HubSpot Portal ID and Form GUID below.
(function(){
  'use strict';
  var HS_PORTAL_ID = window.CFG_HS_PORTAL_ID || '';  // e.g. '12345678'
  var HS_FORM_GUID = window.CFG_HS_FORM_GUID || '';  // e.g. 'abcd-ef12-...'
  var ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/';

  function serializeForm(form){
    var o = {}; var fd = new FormData(form);
    fd.forEach(function(v,k){ o[k]=v; });
    return o;
  }
  function fieldsFrom(o){
    var map = {
      name: 'firstname', firstname:'firstname', lastname:'lastname',
      email: 'email', phone:'phone', tel:'phone', inn:'inn', message:'message', company:'company'
    };
    var out = [];
    Object.keys(o).forEach(function(k){
      var key = (map[k] || k);
      out.push({ name: key, value: o[k] });
    });
    return out;
  }
  function submitToHubspot(form, cb){
    if (!HS_PORTAL_ID || !HS_FORM_GUID){ cb({ok:false, error:'HubSpot config is empty'}); return; }
    var data = serializeForm(form);
    var payload = {
      fields: fieldsFrom(data),
      context: {
        pageUri: location.href,
        pageName: document.title
      }
    };
    fetch(ENDPOINT + HS_PORTAL_ID + '/' + HS_FORM_GUID, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json().then(function(j){ return {status:r.status, json:j};});})
      .then(function(res){ cb({ok: (res.status>=200 && res.status<300), res: res}); })
      .catch(function(err){ cb({ok:false, error:String(err)}); });
  }

  document.addEventListener('submit', function(e){
    var f = e.target;
    if (!(f && f.tagName==='FORM')) return;
    var flag = f.getAttribute('data-crm');
    if (flag && flag.toLowerCase()==='hubspot'){
      e.preventDefault();
      var btn = f.querySelector('button[type="submit"],input[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset._old = btn.textContent; btn.textContent = 'Отправляем...'; }
      submitToHubspot(f, function(result){
        if (btn){ btn.disabled=false; btn.textContent = btn.dataset._old||'Отправить'; }
        var ok = result && result.ok;
        var box = document.createElement('div');
        box.style.marginTop='10px';
        box.style.padding='10px';
        box.style.border = '1px solid ' + (ok ? '#19a974' : '#e53935');
        box.style.color = (ok ? '#155724' : '#b71c1c');
        box.textContent = ok ? 'Заявка отправлена. Мы свяжемся с вами.' : 'Не удалось отправить. Попробуйте ещё раз или напишите на почту.';
        f.appendChild(box);
      });
    }
  }, true);

  // Expose for manual calls
  window.CFG_HS = { setPortal:function(id){ HS_PORTAL_ID = id; }, setForm:function(g){ HS_FORM_GUID=g; } };
})();
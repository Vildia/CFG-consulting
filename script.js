
(function(){"use strict";
  const EMAIL="C.F.G.consulting@bk.ru";
  function openGmail(subject, body){
    const url='https://mail.google.com/mail/?view=cm&to='+encodeURIComponent(EMAIL)
      +'&su='+encodeURIComponent(subject||'')
      +'&body='+encodeURIComponent(body||'');
    window.open(url,'_blank');
  }
  function toast(t){ const n=document.querySelector('.toast'); if(!n) return; n.textContent=t; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),1800); }

  const modal=document.querySelector('#mailModal');
  document.querySelectorAll('[data-mailto]').forEach(a=>{
    a.addEventListener('click', function(e){
      const href=this.getAttribute('href');
      const s=this.getAttribute('data-subject')||'';
      try{ window.location.href=href; }catch(_ ){}
      if(modal){ modal.querySelector('.subject').value=s; modal.classList.add('open'); }
      e.preventDefault();
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn=>btn.addEventListener('click',()=>modal.classList.remove('open')));
  document.querySelector('#gmailOpen')?.addEventListener('click',()=>{ const s=modal.querySelector('.subject').value||''; openGmail(s,''); });
  document.querySelector('#copyEmail')?.addEventListener('click',()=>{ navigator.clipboard.writeText(EMAIL).then(()=>toast('Скопировано')); });

  const form=document.querySelector('#leadForm');
  if(form){
    const innInput=form.querySelector('input[name="inn"]');
    // Simple pattern check for RU INN: 10 or 12 digits (optional field)
    if(innInput) innInput.addEventListener('input',()=>{ innInput.value=innInput.value.replace(/[^0-9]/g,'').slice(0,12); });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      const fd=new FormData(form);
      const name=fd.get('name')||'';
      const contact=fd.get('contact')||'';
      const inn=(fd.get('inn')||'').trim();
      const msg=fd.get('message')||'';
      const subject='Заявка с сайта — '+(name||'без имени');
      let body='Имя: '+name+'%0AКонтакт: '+contact;
      if(inn) body+='%0AИНН: '+inn;
      body+='%0A%0AСообщение:%0A'+encodeURIComponent(msg);
      window.location.href='mailto:C.F.G.consulting@bk.ru?subject='+encodeURIComponent(subject)+'&body='+body;
      setTimeout(()=>openGmail(subject, decodeURIComponent(body)),800);
      toast('Спасибо! Открыли письмо — отправьте его.');
    });
  }
})();

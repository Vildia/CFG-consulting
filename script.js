
(function(){"use strict";
  const EMAIL="C.F.G.consulting@bk.ru";
  function openGmail(subject, body){
    const url='https://mail.google.com/mail/?view=cm&to='+encodeURIComponent(EMAIL)
      +'&su='+encodeURIComponent(subject||'')
      +'&body='+encodeURIComponent(body||'');
    window.open(url,'_blank');
  }
  function toast(t){ const n=document.querySelector('.toast'); if(!n) return; n.textContent=t; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),1800); }
  function copy(text){ navigator.clipboard.writeText(text).then(()=>toast('Скопировано / Copied / 已复制')); }

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
  const btnG=document.querySelector('#gmailOpen');
  const btnCopy=document.querySelector('#copyEmail');
  if(btnG) btnG.addEventListener('click',()=>{ const s=modal.querySelector('.subject').value||''; openGmail(s,''); });
  if(btnCopy) btnCopy.addEventListener('click',()=>copy(EMAIL));

  const form=document.querySelector('#leadForm');
  if(form){ 
    form.addEventListener('submit', function(e){ 
      e.preventDefault();
      const fd=new FormData(form);
      const name=fd.get('name')||'';
      const contact=fd.get('contact')||'';
      const msg=fd.get('message')||'';
      const lang=document.documentElement.lang;
      const subject = (lang==='zh' ? '来自网站的申请 — ' : (lang==='en' ? 'Website request — ' : 'Заявка с сайта — ')) + (name||'');
      const body = (lang==='zh'
        ? ('姓名: '+name+'%0A联系方式: '+contact+'%0A%0A需求:%0A'+msg)
        : (lang==='en'
          ? ('Name: '+name+'%0AContact: '+contact+'%0A%0AMessage:%0A'+msg)
          : ('Имя: '+name+'%0AКонтакт: '+contact+'%0A%0AСообщение:%0A'+msg)));
      window.location.href='mailto:C.F.G.consulting@bk.ru?subject='+encodeURIComponent(subject)+'&body='+body;
      setTimeout(()=>openGmail(subject, decodeURIComponent(body)),800);
      toast(lang==='zh' ? '感谢！' : (lang==='en' ? 'Thanks!' : 'Спасибо!'));
    });
  }
})();


(function(){
  "use strict";
  const email=document.body.getAttribute('data-email');
  const lang=document.documentElement.lang||'ru';
  const dict={
    ru:{copied:'Скопировано', notopen_title:'Если почтовая программа не открылась', subject:'Тема письма', copy:'Скопировать адрес', gmail:'Открыть Gmail', close:'Закрыть', thanks:'Спасибо! Открыли письмо — отправьте его.'},
    en:{copied:'Copied', notopen_title:'If your mail app didn’t open', subject:'Subject', copy:'Copy address', gmail:'Open Gmail', close:'Close', thanks:'Thanks! We opened the draft — please send it.'},
    zh:{copied:'已复制', notopen_title:'如果邮箱未自动打开', subject:'主题', copy:'复制地址', gmail:'打开 Gmail', close:'关闭', thanks:'谢谢！我们已打开草稿 — 请发送。'}
  }[lang]||{copied:'Copied', notopen_title:'If your mail app didn’t open', subject:'Subject', copy:'Copy address', gmail:'Open Gmail', close:'Close', thanks:'Thanks!'};

  function openGmail(subject, body){
    const url='https://mail.google.com/mail/?view=cm&to='+encodeURIComponent(email)
      +'&su='+encodeURIComponent(subject||'')
      +'&body='+encodeURIComponent(body||'');
    window.open(url,'_blank');
  }
  function toast(t){ const n=document.querySelector('.toast'); if(!n) return; n.textContent=t; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),1800); }

  const modal=document.querySelector('#mailModal');
  if(modal){
    const h=modal.querySelector('h3'); if(h) h.textContent=dict.notopen_title;
    const subj=modal.querySelector('.subject'); if(subj) subj.placeholder=dict.subject;
    const copyBtn=document.querySelector('#copyEmail'); if(copyBtn) copyBtn.textContent=dict.copy;
    const gmailBtn=document.querySelector('#gmailOpen'); if(gmailBtn) gmailBtn.textContent=dict.gmail;
    document.querySelectorAll('[data-modal-close]').forEach(btn=>btn.textContent=dict.close);
  }

  document.querySelectorAll('[data-mailto]').forEach(a=>{
    a.addEventListener('click', function(e){
      const href=this.getAttribute('href');
      const s=this.getAttribute('data-subject')||'';
      try{ window.location.href=href; }catch(_){}
      if(modal){ modal.querySelector('.subject').value=s; modal.classList.add('open'); }
      e.preventDefault();
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn=>btn.addEventListener('click',()=>modal.classList.remove('open')));
  const btnG=document.querySelector('#gmailOpen');
  const btnCopy=document.querySelector('#copyEmail');
  if(btnG) btnG.addEventListener('click',()=>{ const s=modal.querySelector('.subject').value||''; openGmail(s,''); });
  if(btnCopy) btnCopy.addEventListener('click',()=>{ navigator.clipboard.writeText(email).then(()=>toast(dict.copied)); });

  const form=document.querySelector('#leadForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const fd=new FormData(form);
      const name=fd.get('name')||'';
      const contact=fd.get('contact')||'';
      const msg=fd.get('message')||'';
      const subject=(lang==='zh'?'网站申请 — ':(lang==='en'?'Site request — ':'Заявка с сайта — '))+(name||'');
      const body=(lang==='zh'?'姓名: ':'Name: ')+name+'%0A'+(lang==='zh'?'联系方式: ':'Contact: ')+contact+'%0A%0A'+(lang==='zh'?'消息: ':'Message: ')+msg;
      window.location.href='mailto:'+email+'?subject='+encodeURIComponent(subject)+'&body='+body;
      setTimeout(()=>openGmail(subject, decodeURIComponent(body)),800);
      toast(dict.thanks);
    });
  }
})();
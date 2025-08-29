
(function(){
  const email=document.body.getAttribute('data-email');
  function openGmail(subject){ 
    const url='https://mail.google.com/mail/?view=cm&to='+encodeURIComponent(email)+'&su='+encodeURIComponent(subject||''); 
    window.open(url,'_blank'); 
  }
  function copy(text){ navigator.clipboard.writeText(text).then(()=>showToast('Скопировано')); }
  function showToast(t){ const n=document.querySelector('.toast'); if(!n) return; n.textContent=t; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),1800); }

  const modal=document.querySelector('#mailModal');
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
  if(btnG) btnG.addEventListener('click',()=>{ const s=modal.querySelector('.subject').value||''; openGmail(s); });
  if(btnCopy) btnCopy.addEventListener('click',()=>copy(email));
})();

/*! consent-neutral.js — soft notice, no blocking; v1 */
(function () {
  var INFO_TEXT = 'Отправляя форму, вы соглашаетесь с Политикой и Условиями. Отмечать ничего не нужно.';

  function once(fn) {
    var called = false;
    return function () {
      if (!called) { called = true; try { fn.apply(this, arguments); } catch(e){} }
    };
  }

  function createToast(message, timeout) {
    try {
      var el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.style.position = 'fixed';
      el.style.zIndex = 99999;
      el.style.right = '16px';
      el.style.bottom = '16px';
      el.style.maxWidth = '520px';
      el.style.padding = '12px 14px';
      el.style.borderRadius = '10px';
      el.style.boxShadow = '0 10px 24px rgba(0,0,0,.2)';
      el.style.backdropFilter = 'blur(2px)';
      el.style.background = 'rgba(22,22,22,.92)';
      el.style.color = '#fff';
      el.style.fontSize = '14px';
      el.style.lineHeight = '1.4';
      el.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif';
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s ease';
      el.textContent = message;
      document.body.appendChild(el);
      requestAnimationFrame(function(){ el.style.opacity = '1'; });
      setTimeout(function(){
        el.style.opacity = '0';
        setTimeout(function(){ el.remove(); }, 250);
      }, timeout || 4200);
    } catch(e){}
  }

  // Replace blocking notice behavior with a soft info toast
  var originalShowNotice = window.showNotice;
  window.showNotice = function (message, opts) {
    createToast(message || INFO_TEXT, (opts && opts.timeout) || 4200);
  };

  function relaxConsentCheckboxes(context) {
    var root = context || document;
    var nodes = root.querySelectorAll('input[type="checkbox"]');
    nodes.forEach(function (n) {
      var id = (n.id || '').toLowerCase();
      var nm = (n.name || '').toLowerCase();
      var lbl = (n.getAttribute('aria-label') || '').toLowerCase();
      var labelText = '';
      try {
        var lblEl = n.closest('label') || root.querySelector('label[for="'+n.id+'"]');
        if (lblEl) labelText = (lblEl.textContent || '').toLowerCase();
      } catch(e){}
      var text = [id, nm, lbl, labelText].join(' ');
      if (/(consent|agree|соглас|персонал|данн|политик|услов)/.test(text)) {
        n.removeAttribute('required');
        n.required = false;
      }
    });
  }

  function disableNativeValidation() {
    try { document.querySelectorAll('form').forEach(function (f) { f.noValidate = true; }); } catch(e){}
  }

  var showOnce = once(function(){ createToast(INFO_TEXT); });

  function bindForms() {
    try {
      disableNativeValidation();
      relaxConsentCheckboxes(document);
      document.querySelectorAll('form').forEach(function (form) {
        form.addEventListener('submit', function () { showOnce(); }, { capture: true });
      });
    } catch(e){}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindForms);
  } else {
    bindForms();
  }
})();

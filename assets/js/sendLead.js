// assets/js/sendLead.js — client; no signature required.
export async function sendLead(data) {
  const resp = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lead', data }),
  });
  const json = await resp.json().catch(() => ({}));
  return json;
}

export function connectLeadForm(form, beforeSend = () => {}, onDone = () => {}) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    beforeSend();
    try {
      const ans = await sendLead(data);
      onDone(ans);
    } catch (e) {
      onDone({ ok:false, error:String(e) });
    }
  });
}

export function sendLeadFromForm(form) {
  connectLeadForm(form, () => {
    console.log('Sending...');
  }, (ans) => {
    console.log('API answer:', ans);
    alert(ans.ok ? 'Заявка отправлена' : ('Ошибка: ' + (ans.error || 'unknown')));
  });
}

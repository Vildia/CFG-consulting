// assets/js/sendLead.js
// Клиентский helper. Подпись НЕ требуется — всё делает /api/lead.
export async function sendLead(data) {
  const r = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  try {
    return await r.json();
  } catch {
    return { ok: false, error: 'bad_json', status: r.status };
  }
}

// Удобная привязка формы
export function connectLeadForm(formEl, beforeSend, onDone) {
  if (!formEl) return;
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formEl);
    const data = Object.fromEntries(fd.entries());
    if (typeof beforeSend === 'function') beforeSend(data);
    const resp = await sendLead(data);
    if (typeof onDone === 'function') onDone(resp);
    else console.log('Lead API answer:', resp);
  });
}

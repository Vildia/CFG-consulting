// assets/js/sendLead.js
// Small helper for forms and manual calls.

export async function sendLead(data) {
  const resp = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  return resp.json();
}

export function connectLeadForm(form) {
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    try {
      const r = await sendLead(data);
      (window.console || console).log('Lead result:', r);
      // UX hook: show message if needed
      form.dispatchEvent(new CustomEvent('lead:sent', { detail: r }));
    } catch (err) {
      (window.console || console).error('Lead error:', err);
    }
  });
}
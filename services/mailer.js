// Sends email through Brevo or Resend (whichever API key is set). With neither, the message is logged so you can test locally.
const name = () => process.env.EMAIL_FROM_NAME || 'Buzzer';
const addr = () => process.env.EMAIL_FROM_ADDRESS || '';
async function send({ to, subject, html, text }) {
  try {
    if (process.env.BREVO_API_KEY && addr()) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: { name: name(), email: addr() }, to: [{ email: to }], subject, htmlContent: html, textContent: text }) });
      if (!r.ok) throw new Error('Brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
      return true;
    }
    if (process.env.RESEND_API_KEY && addr()) {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: `${name()} <${addr()}>`, to: [to], subject, html, text }) });
      if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
      return true;
    }
    console.log(`[mail:not-configured] to=${to} subject="${subject}"\n${text}`);
    return false;
  } catch (e) { console.error('mail failed:', e.message); return false; }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function template(title, intro, button, url, outro) {
  const html = `<div style="font-family:Arial,sans-serif;background:#0b0b0b;padding:24px"><div style="max-width:460px;margin:auto;background:#141414;border-radius:14px;padding:28px;color:#f1f1f1"><h2 style="margin:0 0 12px;color:#18d978">Buzzer</h2><h3 style="margin:0 0 10px">${esc(title)}</h3><p style="line-height:1.5;color:#c9c9c9">${esc(intro)}</p><p style="margin:24px 0"><a href="${esc(url)}" style="background:#18d978;color:#000;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">${esc(button)}</a></p><p style="font-size:12px;color:#8a8a8a;line-height:1.5">${esc(outro)}<br>If the button does not work, copy this link: ${esc(url)}</p></div></div>`;
  return { html, text: `${title}\n\n${intro}\n\n${url}\n\n${outro}` };
}
module.exports = { send, template };

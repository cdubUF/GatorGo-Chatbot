import {request} from './api.js';
let token = '';
let generation = 0;
const queue = document.querySelector('#queue');
const status = document.querySelector('#staffStatus');
async function refresh() {
  const version = ++generation;
  try {
    const items = await request('/staff/handoffs', {token});
    if (version !== generation) return;
    queue.replaceChildren();
    status.textContent = `${items.length} simulated summaries`;
    for (const item of items) {
      const card = document.createElement('section'); card.className = 'handoff-card';
      const heading = document.createElement('h2'); heading.textContent = `${item.category} · ${item.urgency}`;
      const text = document.createElement('p'); text.textContent = item.summary;
      const date = document.createElement('p'); date.textContent = `Created ${new Date(item.created).toLocaleString()} · DEMO ONLY`;
      const select = document.createElement('select'); select.setAttribute('aria-label', `Disposition for ${item.category}`);
      for (const value of ['open', 'in_review', 'resolved']) {
        const option = document.createElement('option'); option.value = value; option.textContent = value.replace('_', ' '); select.append(option);
      }
      select.value = item.disposition;
      select.addEventListener('change', async () => {
        select.disabled = true;
        try { await request(`/staff/handoffs/${item.id}`, {method: 'PATCH', token, body: {disposition: select.value}}); item.disposition = select.value; }
        catch (error) { status.textContent = error.message; select.value = item.disposition; }
        finally { select.disabled = false; }
      });
      card.append(heading, text, date, select); queue.append(card);
    }
  } catch {
    if (version !== generation) return;
    queue.replaceChildren(); status.textContent = 'Queue unavailable. Check your token and DEMO_MODE configuration.';
  }
}
document.querySelector('#staffLogin').addEventListener('submit', event => {
  event.preventDefault(); token = document.querySelector('#staffToken').value;
  document.querySelector('#staffToken').value = ''; refresh();
});
document.querySelector('#logout').addEventListener('click', () => { generation += 1; token = ''; queue.replaceChildren(); status.textContent = 'Access cleared'; });

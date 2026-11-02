import {request} from './api.js';
let token = '';
let generation = 0;
const queue = document.querySelector('#queue');
const status = document.querySelector('#staffStatus');
async function refresh() {
  const version = ++generation;
  try {
    const items = await request('/reservations/staff/requests', {token});
    if (version !== generation) return;
    queue.replaceChildren(); status.textContent = `${items.length} local requests`;
    for (const item of items) {
      const card = document.createElement('section'); card.className = 'handoff-card';
      const heading = document.createElement('h2'); heading.textContent = `Request ${item.id} · ${item.status}`;
      const guest = document.createElement('p'); guest.textContent = `${item.confirmation} · ${item.first_name} ${item.last_name}`;
      const details = document.createElement('p'); details.textContent = item.details;
      const date = document.createElement('p'); date.textContent = `Created ${item.created_at} UTC`;
      card.append(heading, guest, details, date); queue.append(card);
    }
  } catch {
    if (version !== generation) return;
    queue.replaceChildren(); status.textContent = 'Queue unavailable. Check the staff token and reservation configuration.';
  }
}
document.querySelector('#staffLogin').addEventListener('submit', event => {
  event.preventDefault(); token = document.querySelector('#staffToken').value;
  document.querySelector('#staffToken').value = ''; refresh();
});
document.querySelector('#logout').addEventListener('click', () => {
  generation += 1; token = ''; queue.replaceChildren(); status.textContent = 'Access cleared';
});

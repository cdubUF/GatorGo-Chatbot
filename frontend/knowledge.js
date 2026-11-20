import {request} from './api.js';
const status = document.querySelector('#knowledgeStatus'), list = document.querySelector('#knowledgeList'), search = document.querySelector('#knowledgeSearch');
let records = [];
function element(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }
function render() {
  const query = search.value.toLocaleLowerCase(); list.replaceChildren();
  const shown = records.filter(r => `${r.topic} ${r.category} ${r.answer} ${r.venue?.name || ''}`.toLocaleLowerCase().includes(query));
  status.textContent = shown.length ? `${shown.length} resort topics and fictional profiles available` : 'No matching resort information.';
  for (const record of shown) {
    const article = document.createElement('article'); article.className = 'knowledge-entry'; article.id = `record-${record.id}`; article.tabIndex = -1;
    article.append(element('p', record.status === 'demo_only' ? 'SAMPLE INFORMATION · Fictional resort' : record.status), element('h2', record.venue?.name || record.topic));
    if (record.venue) {
      article.append(element('p', record.venue.location || 'Location unconfirmed.'), element('p', record.venue.hours || 'Hours unconfirmed.'));
      for (const exception of record.venue.exceptions) article.append(element('p', `${exception.date}: ${exception.closed ? 'Closed' : exception.hours || 'Hours unconfirmed'} ${exception.note}`));
    } else article.append(element('p', record.answer));
    article.append(element('p', `Source: ${record.source}`)); list.append(article);
  }
}
function reveal() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  search.value = ''; render(); const article = document.getElementById(id);
  if (article) { article.scrollIntoView({block: 'center'}); article.focus({preventScroll: true}); }
}
try { records = await request('/knowledge'); render(); reveal(); }
catch { status.textContent = 'The knowledge base could not be loaded. Make sure the app is running.'; }
search.addEventListener('input', render); window.addEventListener('hashchange', reveal);

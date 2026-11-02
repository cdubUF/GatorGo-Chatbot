import {request} from './api.js';

const status = document.querySelector('#knowledgeStatus');
const list = document.querySelector('#knowledgeList');
try {
  const records = await request('/knowledge');
  status.textContent = records.length ? `${records.length} resort topics available` : 'No resort topics are currently available.';
  for (const record of records) {
    const article = document.createElement('article'); article.className = 'knowledge-entry';
    const label = document.createElement('p'); label.className = 'knowledge-category'; label.textContent = record.category;
    const title = document.createElement('h2'); title.textContent = record.topic;
    const answer = document.createElement('p'); answer.textContent = record.answer;
    article.append(label, title, answer); list.append(article);
  }
} catch {
  status.textContent = 'The knowledge base could not be loaded. Make sure the app is running.';
}

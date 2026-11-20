/** One in-memory conversation identity for typed, recorded and realtime turns. */
let id = null, voiceToken = null, epoch = 0, creating = null, draining = null, syncAbort = null;
let queue = [];
export const conversationId = () => id;
export function adoptConversation(value, token) {
  if (!value) return;
  if (id && id !== value) {queue = []; voiceToken = null;}
  id = value;
  if (token) voiceToken = token;
  document.dispatchEvent(new CustomEvent('conversation-session', {detail:{active:true,epoch}}));
}
export function resetConversation() {
  epoch++; syncAbort?.abort(); syncAbort = null; draining = null;
  id = voiceToken = creating = null; queue = [];
  document.dispatchEvent(new CustomEvent('conversation-session', {detail:{active:false,epoch}}));
}
export async function ensureConversation() {
  await flushConversation();
  if (id) return id;
  if (!creating) {
    const life = epoch;
    creating = fetch('/api/conversations', {method:'POST', signal:AbortSignal.timeout(12000)})
      .then(async response => {
        if (!response.ok) throw new Error('Conversation could not start. Please retry.');
        const result = await response.json();
        if (life !== epoch) throw new DOMException('Conversation reset', 'AbortError');
        adoptConversation(result.session_id); return id;
      }).finally(()=>{if(life === epoch) creating = null;});
  }
  return creating;
}
async function drain() {
  if (draining) return draining;
  const life = epoch;
  const controller = new AbortController(); syncAbort = controller;
  draining = (async()=>{
    while (queue.length && life === epoch) {
      const job = queue[0];
      const response = await fetch(`/api/conversations/${job.id}/voice-turn`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${job.token}`},
        body:JSON.stringify(job.body),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
      if (!response.ok) throw new Error('Conversation memory could not sync. Please retry before switching to text.');
      if (life === epoch) queue.shift();
    }
  })().finally(()=>{if (life === epoch) {draining = null; syncAbort = null;}});
  return draining;
}
export function rememberVoiceTurn(turnId, transcript, interrupted = false) {
  if (!id || !voiceToken || !transcript) return;
  if (queue.some(job=>job.body.turn_id === turnId)) return;
  if (queue.length >= 100) return;
  queue.push({id,token:voiceToken,body:{turn_id:turnId,transcript:transcript.slice(0,1000),interrupted}});
  const life = epoch;
  drain().catch(()=>{if (life === epoch) document.dispatchEvent(new CustomEvent('conversation-sync-error'));});
}
export async function flushConversation() {
  if (draining) {try {await draining;} catch { /* Retry the retained, idempotent job. */ }}
  if (queue.length) await drain();
}
export function toolCredentials() {return {id, token:voiceToken};}

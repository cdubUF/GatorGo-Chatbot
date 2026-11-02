export async function request(path, {method = 'GET', body, signal, token} = {}) {
  const deadline = AbortSignal.timeout(path === '/chat' ? 130000 : 12000);
  const response = await fetch(`/api${path}`, {
    method, signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'Please wait a minute and try again.' :
      response.status === 409 ? 'This action is unavailable or the summary is no longer current.' :
      'The service could not complete that request. Please retry or contact a hotel employee directly.');
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

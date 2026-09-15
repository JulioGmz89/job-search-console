/**
 * The one place the UI talks to the server.
 *
 * Same origin in both modes: Vite proxies /api to Fastify in dev, and Fastify
 * serves the built SPA itself in production.
 */

/**
 * @param {string} method
 * @param {string} path
 * @param {object} [payload] - Sent as JSON when present.
 * @returns {Promise<object>}
 */
async function request(method, path, payload) {
  const hasBody = payload !== undefined;
  const response = await fetch(path, {
    method,
    headers: {
      accept: 'application/json',
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(payload) } : {}),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // The server's own words, always. A refusal from the seam explains itself
    // ("that preview has already been used", "reload before saving") far better
    // than anything this layer could invent from a status code.
    const error = new Error(body.error ?? `${response.status} ${response.statusText}`);
    error.status = response.status;
    error.code = body.code;
    error.detail = body.detail;
    throw error;
  }
  return body;
}

const get = (path) => request('GET', path);

export const fetchPipeline = () => get('/api/pipeline');
export const fetchHealth = () => get('/api/health');
export const fetchReport = (id) => get(`/api/reports/${id}`);
export const pdfUrl = (id) => `/api/reports/${id}/pdf`;

export const fetchPortals = () => get('/api/portals');
export const createPortalEntry = (kind, entry, etag) =>
  request('POST', '/api/portals/entries', { kind, entry, etag });
/** `name` is the checksum on `index`: a stale index must fail, not edit the neighbour. */
export const updatePortalEntry = (kind, index, name, entry, etag) =>
  request('PATCH', `/api/portals/entries/${kind}/${index}`, { name, entry, etag });
export const deletePortalEntry = (kind, index, name, etag) =>
  request('DELETE', `/api/portals/entries/${kind}/${index}`, { name, etag });

export const fetchInbox = () => get('/api/inbox');

export const setRowStatus = (id, statusId, extra = {}) =>
  request('PATCH', `/api/pipeline/rows/${id}/status`, { statusId, ...extra });

export const fetchRuns = () => get('/api/runs');
export const fetchRun = (id) => get(`/api/runs/${id}`);
export const startRun = (kind, options = {}, confirmToken) =>
  request('POST', '/api/runs', { kind, options, ...(confirmToken ? { confirmToken } : {}) });
export const cancelRun = (id) => request('POST', `/api/runs/${id}/cancel`);
export const runEventsUrl = (id) => `/api/runs/${id}/events`;

// ── M3: agent runs, the inbox write, CV Studio, the event feed ───────

export const addInboxUrl = (body) => request('POST', '/api/inbox/urls', body);
export const fetchAgentStatus = () => get('/api/agent/status');
export const startEvaluate = (options) => startRun('evaluate', options);
export const startPdf = (reportId, options = {}) => startRun('pdf', { reportId, ...options });
export const startCover = (reportId, answers) => startRun('cover', { reportId, answers });

export const fetchCvStyle = () => get('/api/cv/style');
export const saveCvStyle = (style) => request('PUT', '/api/cv/style', { style });
export const fetchVoice = () => get('/api/cv/voice');
export const saveVoice = (text) => request('PUT', '/api/cv/voice', { text });
export const fetchCvTemplates = () => get('/api/cv/templates');
export const fetchWritingSamples = () => get('/api/cv/writing-samples');

export const coverUrl = (id) => `/api/reports/${id}/cover`;
export const serverEventsUrl = () => '/api/events';

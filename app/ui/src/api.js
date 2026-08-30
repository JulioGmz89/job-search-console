/**
 * The one place the UI talks to the server.
 *
 * Same origin in both modes: Vite proxies /api to Fastify in dev, and Fastify
 * serves the built SPA itself in production.
 */

async function get(path) {
  const response = await fetch(path, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? `${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const fetchPipeline = () => get('/api/pipeline');
export const fetchHealth = () => get('/api/health');
export const fetchReport = (id) => get(`/api/reports/${id}`);
export const pdfUrl = (id) => `/api/reports/${id}/pdf`;

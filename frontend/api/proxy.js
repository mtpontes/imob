/**
 * Vercel Serverless Function acting as a reverse proxy for the backend API.
 * Maps incoming /api/* requests to the appropriate AWS API Gateway URL configured in environment variables.
 */
export default async function handler(req, res) {
  const backendApiUrl = process.env.BACKEND_API_URL;
  if (!backendApiUrl) {
    console.error('BACKEND_API_URL is not configured.');
    return res.status(500).json({ error: 'BACKEND_API_URL is not configured in Vercel.' });
  }

  const targetUrl = `${backendApiUrl}${req.url}`;

  console.log(`Proxying ${req.method} request to: ${targetUrl}`);

  try {
    // Clone headers, omitting the Host header to avoid SSL/TLS handshake issues
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
        headers[key] = value;
      }
    }

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      if (req.body !== undefined && req.body !== null) {
        body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      redirect: 'manual'
    });

    const responseText = await response.text();

    // Set response headers, skipping content-encoding and transfer-encoding
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    }

    res.status(response.status).send(responseText);
  } catch (error) {
    console.error('Error during proxy fetch:', error);
    res.status(500).json({ error: 'Failed to proxy request to backend.', details: error.message });
  }
}

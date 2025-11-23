import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const error = url.searchParams.get('error') ?? '';
  const errorDescription = url.searchParams.get('error_description') ?? '';
  
  // Extract provider from state (format: "provider:timestamp" or just provider)
  const provider = state.includes(':') ? state.split(':')[0] : '';

  const html = `<!DOCTYPE html><html><body>
<script>
  (function () {
    try {
      var payload = { 
        type: 'oauth_return', 
        code: ${JSON.stringify(code)}, 
        state: ${JSON.stringify(state)}, 
        provider: ${JSON.stringify(provider)},
        error: ${JSON.stringify(error || null)},
        error_description: ${JSON.stringify(errorDescription || null)}
      };
      if (window.opener && window.opener.postMessage) {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch (e) {
      console.error('OAuth return error:', e);
    }
    setTimeout(function() {
      try { window.close(); } catch (e) {}
    }, 1000);
  })();
</script>
<p>Completing authorization...</p>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}



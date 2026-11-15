interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const APP_VERSION = '0.2.0';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        app: 'studyflow',
        runtime: 'cloudflare-workers',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

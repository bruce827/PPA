process.env.NODE_ENV = 'test';
process.env.AI_LOG_ENABLED = 'false';

const http = require('http');
const zlib = require('zlib');

const iconv = require('iconv-lite');

const validationService = require('../services/biddingSiteValidationService');

function startServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('无法获取测试服务器端口'));
        return;
      }
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
    server.on('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

describe('biddingSiteValidationService', () => {
  test('should decode gzip + gb18030 page and return heuristic_only when AI model is unavailable', async () => {
    const { server, url } = await startServer((req, res) => {
      const html = `
        <html>
          <head><meta charset="gb2312"><title>某省政府采购网</title></head>
          <body>
            <h1>政府采购公告</h1>
            <p>欢迎访问公共资源交易中心，本页提供招标采购信息。</p>
          </body>
        </html>
      `;
      const encoded = iconv.encode(html, 'gb18030');
      const body = zlib.gzipSync(encoded);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=gb2312',
        'Content-Encoding': 'gzip',
      });
      res.end(body);
    });

    try {
      const result = await validationService.validateBiddingSite({
        id: 1,
        name: '测试站点',
        url: `${url}/bidding`,
        normalized_url: `${url}/bidding`,
      });

      expect(result.validation_status).toBe('heuristic_only');
      expect(result.is_bidding_site).toBe(true);
      expect(result.auth_required).toBe(false);
      expect(result.validation_payload.probe.title).toContain('政府采购网');
      expect(result.validation_payload.probe.charset).toBe('gb18030');
      expect(result.validation_payload.probe.snippet).toContain('政府采购公告');
    } finally {
      await closeServer(server);
    }
  });

  test('should mark explicit 404 responses as validated_failed', async () => {
    const { server, url } = await startServer((req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><head><title>404</title></head><body>not found</body></html>');
    });

    try {
      const result = await validationService.validateBiddingSite({
        id: 2,
        name: '失败站点',
        url: `${url}/missing`,
        normalized_url: `${url}/missing`,
      });

      expect(result.validation_status).toBe('validated_failed');
      expect(result.http_status).toBe(404);
      expect(result.auth_required).toBeNull();
      expect(result.is_bidding_site).toBeNull();
    } finally {
      await closeServer(server);
    }
  });
});

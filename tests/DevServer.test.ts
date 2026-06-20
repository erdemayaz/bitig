import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { DevServer } from '../src/DevServer';
import { BookConfig } from '../src/BookConfig';

const testDir = path.resolve(__dirname, 'temp-devserver-test');

describe('DevServer', () => {
  let config: BookConfig;
  const configPath = path.join(testDir, 'book.json');

  beforeAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Setup basic book structure
    const assetsDir = path.join(testDir, 'assets');
    const distDir = path.join(testDir, 'dist');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(path.join(assetsDir, 'section-1'), { recursive: true });

    const bookJson = {
      title: 'Dev Server Test Book',
      author: 'Tester',
      assetsDir: './assets',
      distDir: './dist',
      outputFilename: 'book.md',
      pdf: false,
      language: 'en'
    };

    fs.writeFileSync(configPath, JSON.stringify(bookJson, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(assetsDir, 'section-1', '1.1.md'),
      '# Intro\n\nWelcome to dev server tests.',
      'utf8'
    );

    // Load config
    config = BookConfig.loadFromFile(configPath);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  function getUrl(
    port: number,
    urlPath: string
  ): Promise<{ status: number; body: string; headers: any }> {
    return getRawPath(port, urlPath);
  }

  function getRawPath(
    port: number,
    rawPath: string
  ): Promise<{ status: number; body: string; headers: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: 'localhost',
          port: port,
          path: rawPath,
          method: 'GET'
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode || 0,
              body: data,
              headers: res.headers
            });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  it('should compile book on start and serve index.html with reload script', async () => {
    const server = new DevServer(config, configPath, 0);
    await server.start();
    const port = server.getPort();

    try {
      const response = await getUrl(port, '/');
      expect(response.status).toBe(200);
      expect(response.body).toContain('Dev Server Test Book');
      expect(response.body).toContain('checkVersion');
      expect(response.body).toContain('/build-version');
      expect(response.body).toContain('</body>');

      // Check /index.html serves the same
      const indexResponse = await getUrl(port, '/index.html');
      expect(indexResponse.status).toBe(200);
      expect(indexResponse.body).toBe(response.body);
    } finally {
      await server.stop();
    }
  });

  it('should serve build-version and update it on file modification', async () => {
    const server = new DevServer(config, configPath, 0);
    await server.start();
    const port = server.getPort();

    try {
      const versionResponse1 = await getUrl(port, '/build-version');
      expect(versionResponse1.status).toBe(200);
      const v1 = versionResponse1.body;

      // Modify a file to trigger re-compilation
      const chapterPath = path.join(testDir, 'assets', 'section-1', '1.1.md');
      fs.writeFileSync(chapterPath, '# Intro\n\nWelcome to dev server tests modified.', 'utf8');

      // Wait for debounce and compile
      await new Promise((resolve) => setTimeout(resolve, 250));

      const versionResponse2 = await getUrl(port, '/build-version');
      expect(versionResponse2.status).toBe(200);
      const v2 = versionResponse2.body;

      expect(v1).not.toBe(v2);

      // Verify page content was updated
      const pageResponse = await getUrl(port, '/');
      expect(pageResponse.body).toContain('Welcome to dev server tests modified.');
    } finally {
      await server.stop();
    }
  });

  it('should serve static files from dist or assets directories', async () => {
    const server = new DevServer(config, configPath, 0);
    await server.start();
    const port = server.getPort();

    try {
      // Write a mock css file in assets
      const stylePath = path.join(testDir, 'assets', 'test.css');
      fs.writeFileSync(stylePath, 'body { color: blue; }', 'utf8');

      const response = await getUrl(port, '/test.css');
      expect(response.status).toBe(200);
      expect(response.body).toBe('body { color: blue; }');
      expect(response.headers['content-type']).toBe('text/css; charset=utf-8');

      // Write a text file in dist
      const docPath = path.join(testDir, 'dist', 'info.txt');
      fs.writeFileSync(docPath, 'some details', 'utf8');

      const response2 = await getUrl(port, '/info.txt');
      expect(response2.status).toBe(200);
      expect(response2.body).toBe('some details');
      expect(response2.headers['content-type']).toBe('text/plain; charset=utf-8');

      // Serving an image asset
      const pngPath = path.join(testDir, 'assets', 'image.png');
      fs.writeFileSync(pngPath, 'fake-png-content');
      const response3 = await getUrl(port, '/image.png');
      expect(response3.status).toBe(200);
      expect(response3.headers['content-type']).toBe('image/png');

      // 404 response
      const nonExistent = await getUrl(port, '/missing.html');
      expect(nonExistent.status).toBe(404);

      // Decoded paths and spaces
      const spacePath = path.join(testDir, 'assets', 'my file.txt');
      fs.writeFileSync(spacePath, 'spaces work', 'utf8');
      const responseSpace = await getUrl(port, '/my%20file.txt');
      expect(responseSpace.status).toBe(200);
      expect(responseSpace.body).toBe('spaces work');

      // Block directory traversal (raw request path with .. is not normalized by http.request)
      const traversalResponse = await getRawPath(port, '/../book.json');
      expect(traversalResponse.status).toBe(400);
    } finally {
      await server.stop();
    }
  });

  it('should fallback to next port if requested port is in use', async () => {
    // Start server 1 on dynamic port to get a valid port number
    const server1 = new DevServer(config, configPath, 0);
    await server1.start();
    const port1 = server1.getPort();

    // Start server 2 on the same port, it should fallback to port1 + 1
    const server2 = new DevServer(config, configPath, port1);
    await server2.start();
    const port2 = server2.getPort();

    expect(port2).toBe(port1 + 1);

    await server1.stop();
    await server2.stop();
  });
});

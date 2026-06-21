import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { DevServer } from '../src/DevServer';
import { BookConfig } from '../src/BookConfig';

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  const mocked = {
    ...originalFs,
    watch: jest.fn((...args: any[]) => originalFs.watch(...args)),
    readFileSync: jest.fn((...args: any[]) => originalFs.readFileSync(...args))
  };
  return {
    __esModule: true,
    ...mocked,
    default: mocked
  };
});

jest.mock('http', () => {
  const originalHttp = jest.requireActual('http');
  const mocked = {
    ...originalHttp,
    createServer: jest.fn((...args: any[]) => originalHttp.createServer(...args))
  };
  return {
    __esModule: true,
    ...mocked,
    default: mocked
  };
});

const testDir = path.resolve(__dirname, 'temp-devserver-test');

describe('DevServer', () => {
  let config: BookConfig;
  const configPath = path.join(testDir, 'book.json');
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

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
    let capturedListener: any = null;
    (fs.watch as jest.Mock).mockImplementation((p, opts: any, cb?: any) => {
      const actualCb = typeof opts === 'function' ? opts : cb;
      capturedListener = actualCb;
      return { close: () => {} } as any;
    });

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

      // Trigger watch manually (twice to test and cover the debounce clearTimeout branch)
      expect(capturedListener).toBeDefined();
      capturedListener();
      capturedListener();

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

  it('should handle bad URI encoding gracefully', async () => {
    const server = new DevServer(config, configPath, 0);
    await server.start();
    const port = server.getPort();
    try {
      const response = await getRawPath(port, '/%invalid%');
      expect(response.status).toBe(400);
    } finally {
      await server.stop();
    }
  });

  it('should handle missing book HTML file gracefully', async () => {
    const server = new DevServer(config, configPath, 0);
    await server.start();
    const port = server.getPort();
    try {
      const htmlFilename = config.outputFilename.replace(/\.md$/, '.html');
      const htmlPath = path.join(config.distDir, htmlFilename);
      const backupHtmlPath = htmlPath + '.backup';
      if (fs.existsSync(htmlPath)) {
        fs.renameSync(htmlPath, backupHtmlPath);
      }

      const response = await getUrl(port, '/');
      expect(response.status).toBe(404);

      if (fs.existsSync(backupHtmlPath)) {
        fs.renameSync(backupHtmlPath, htmlPath);
      }
    } finally {
      await server.stop();
    }
  });

  it('should handle book HTML file read error gracefully', async () => {
    const server = new DevServer(config, configPath, 0);
    await server.start();
    const port = server.getPort();
    try {
      const htmlFilename = config.outputFilename.replace(/\.md$/, '.html');

      (fs.readFileSync as jest.Mock).mockImplementationOnce((p: any, opts?: any) => {
        if (typeof p === 'string' && p.endsWith(htmlFilename)) {
          throw new Error('Read error');
        }
        return jest.requireActual('fs').readFileSync(p, opts);
      });

      const response = await getUrl(port, '/');
      expect(response.status).toBe(500);
    } finally {
      await server.stop();
    }
  });

  it('should support watch fallback when recursive watch throws', async () => {
    (fs.watch as jest.Mock).mockImplementationOnce((p, options, cb) => {
      if (options && typeof options === 'object' && 'recursive' in options && options.recursive) {
        throw new Error('Not supported');
      }
      return { close: () => {} } as any;
    });

    const server = new DevServer(config, configPath, 0);
    await server.start();
    await server.stop();
  });

  it('should log compilation errors on file changes', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const server = new DevServer(config, configPath, 0);
    await server.start();

    const spyCompile = jest
      .spyOn(server as any, 'compileBook')
      .mockRejectedValueOnce(new Error('Compilation failed.'));

    let capturedListener: any = null;
    (fs.watch as jest.Mock).mockImplementationOnce((p, opts: any, cb?: any) => {
      const actualCb = typeof opts === 'function' ? opts : cb;
      capturedListener = actualCb;
      return { close: () => {} } as any;
    });

    (server as any).setupWatchers();
    expect(capturedListener).toBeDefined();

    capturedListener();

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Compilation failed:'));

    spyCompile.mockRestore();
    errorSpy.mockRestore();
    await server.stop();
  });

  it('should reject start if server fails to be created', async () => {
    (http.createServer as jest.Mock).mockReturnValueOnce(null as any);
    const server = new DevServer(config, configPath, 0);
    await expect(server.start()).rejects.toThrow('Server was not created.');
  });

  it('should reject start on non-EADDRINUSE server error', async () => {
    (http.createServer as jest.Mock).mockImplementationOnce((handler: any) => {
      const actualServer = jest.requireActual('http').createServer(handler);
      jest.spyOn(actualServer, 'listen').mockImplementationOnce(function (this: any) {
        process.nextTick(() => {
          this.emit('error', new Error('Generic Socket Error'));
        });
        return this;
      });
      return actualServer;
    });

    const server = new DevServer(config, configPath, 0);
    await expect(server.start()).rejects.toThrow('Generic Socket Error');
  });

  it('should default to port 3000 if not specified', () => {
    const server = new DevServer(config, configPath);
    expect(server.getPort()).toBe(3000);
  });

  it('should do nothing on stop if server is already null', async () => {
    const server = new DevServer(config, configPath, 0);
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it('should fallback to direct file watch if recursive watch throws', async () => {
    (fs.watch as jest.Mock).mockClear();
    (fs.watch as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Recursive watch not supported');
    });

    const server = new DevServer(config, configPath, 0);
    (server as any).compileBook = jest.fn().mockResolvedValue(undefined);
    await server.start();
    expect(fs.watch).toHaveBeenCalledTimes(3);
    await server.stop();
  });

  it('should not watch non-existent assets or config directories', async () => {
    (fs.watch as jest.Mock).mockClear();
    const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (typeof p === 'string' && (p.includes('assets') || p.includes('book.json'))) return false;
      return true;
    });

    const server = new DevServer(config, configPath, 0);
    (server as any).compileBook = jest.fn().mockResolvedValue(undefined);
    await server.start();
    expect(fs.watch).not.toHaveBeenCalled();
    await server.stop();
    existsSpy.mockRestore();
  });

  it('should handle malformed URL encoding and send 400', async () => {
    const server = new DevServer(config, configPath, 0);
    (server as any).compileBook = jest.fn().mockResolvedValue(undefined);
    await server.start();

    const port = server.getPort();
    await new Promise<void>((resolve) => {
      http.get(`http://localhost:${port}/%ff`, (res) => {
        expect(res.statusCode).toBe(400);
        res.resume();
        resolve();
      });
    });

    await server.stop();
  });

  it('should handle empty req.url by mapping to root and serving index.html', async () => {
    const server = new DevServer(config, configPath, 0);
    (server as any).compileBook = jest.fn().mockResolvedValue(undefined);
    await server.start();

    const mockReq = { url: undefined } as any;
    const mockRes = {
      writeHead: jest.fn(),
      end: jest.fn()
    } as any;

    (server as any).handleRequest(mockReq, mockRes);
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

    await server.stop();
  });

  it('should fallback to application/octet-stream for unknown mime types', async () => {
    const unknownFile = path.join(testDir, 'dist', 'file.unknown');
    fs.writeFileSync(unknownFile, 'binary-data');

    const server = new DevServer(config, configPath, 0);
    (server as any).compileBook = jest.fn().mockResolvedValue(undefined);
    await server.start();

    const port = server.getPort();
    await new Promise<void>((resolve) => {
      http.get(`http://localhost:${port}/file.unknown`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/octet-stream');
        res.resume();
        resolve();
      });
    });

    await server.stop();
    fs.rmSync(unknownFile, { force: true });
  });
});

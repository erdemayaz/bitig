import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { BookConfig } from './BookConfig';
import { BookCompiler } from './BookCompiler';
import { Locale } from './Locale';

export class DevServer {
  private config: BookConfig;
  private configPath: string;
  private port: number;
  private server: http.Server | null = null;
  private watchers: fs.FSWatcher[] = [];
  private buildVersion: string = Date.now().toString();
  private debounceTimeout: NodeJS.Timeout | null = null;

  constructor(config: BookConfig, configPath: string, port: number = 3000) {
    this.config = config;
    this.configPath = path.resolve(configPath);
    this.port = port;
  }

  /**
   * Compiles the book (disabling PDF generation to keep reload times fast).
   */
  private async compileBook(): Promise<void> {
    const backupPdf = this.config.pdf;
    try {
      this.config.pdf = false; // Bypass PDF compilation
      const compiler = new BookCompiler(this.config);
      compiler.scanAndLoad();
      await compiler.writeOutputs();
    } finally {
      this.config.pdf = backupPdf;
    }
  }

  /**
   * Starts the development server, builds initial output, and watches files.
   */
  public async start(): Promise<void> {
    console.log(Locale.get('devServerStarting', this.config.language));

    // Initial compilation
    await this.compileBook();

    // Setup HTTP server
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Start watching assets directory and config file
    this.setupWatchers();

    // Listen on port with EADDRINUSE fallback
    await new Promise<void>((resolve, reject) => {
      if (!this.server) {
        return reject(new Error('Server was not created.'));
      }
      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${this.port} is in use. Trying port ${this.port + 1}...`);
          this.port++;
          if (this.server) {
            this.server.close();
            this.startListening(resolve, reject);
          }
        } else {
          if (this.server) {
            this.server.close();
          }
          reject(err);
        }
      });
      this.startListening(resolve, reject);
    });
  }

  private startListening(resolve: () => void, reject: (err: any) => void): void {
    if (this.server) {
      this.server.listen(this.port, () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        console.log(Locale.get('devServerReady', this.config.language, { port: this.port }));
        resolve();
      });
    }
  }

  /**
   * Stops the server and closes file watchers.
   */
  public async stop(): Promise<void> {
    for (const w of this.watchers) {
      w.close();
    }
    this.watchers = [];

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (this.server) {
      const activeServer = this.server;
      await new Promise<void>((resolve) => {
        activeServer.close(() => {
          resolve();
        });
      });
      this.server = null;
    }
  }

  /**
   * Setup recursive watchers for assetsDir and book.json.
   */
  private setupWatchers(): void {
    const onChange = () => {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(async () => {
        try {
          console.log(Locale.get('devServerCompiling', this.config.language));
          await this.compileBook();
          this.buildVersion = Date.now().toString();
        } catch (err: any) {
          console.error(`Compilation failed: ${err.message}`);
        }
      }, 100);
    };

    if (fs.existsSync(this.config.assetsDir)) {
      try {
        const assetsWatcher = fs.watch(this.config.assetsDir, { recursive: true }, onChange);
        this.watchers.push(assetsWatcher);
      } catch (err) {
        // Fallback for systems where recursive watch is not supported
        console.warn(
          'Recursive file watching is not supported on this platform. Watching assets directory directly.'
        );
        const assetsWatcher = fs.watch(this.config.assetsDir, onChange);
        this.watchers.push(assetsWatcher);
      }
    }

    if (fs.existsSync(this.configPath)) {
      const configWatcher = fs.watch(this.configPath, onChange);
      this.watchers.push(configWatcher);
    }
  }

  /**
   * Request handler.
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = new URL(req.url || '/', `http://localhost:${this.port}`);
    let pathname = parsedUrl.pathname;

    // Decode URL
    try {
      pathname = decodeURIComponent(pathname);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
      return;
    }

    // Prevent directory traversal
    const rawUrl = req.url || '';
    if (rawUrl.includes('..') || pathname.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      const htmlFilename = this.config.outputFilename.replace(/\.md$/, '.html');
      const htmlPath = path.join(this.config.distDir, htmlFilename);

      if (!fs.existsSync(htmlPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Book HTML output not found.');
        return;
      }

      try {
        let html = fs.readFileSync(htmlPath, 'utf8');
        const reloadScript = `
<script>
  (function() {
    let currentVersion = null;
    function checkVersion() {
      fetch('/build-version')
        .then(res => {
          if (!res.ok) throw new Error('Not OK');
          return res.text();
        })
        .then(version => {
          if (currentVersion === null) {
            currentVersion = version;
          } else if (currentVersion !== version) {
            window.location.reload();
          }
        })
        .catch(err => console.debug('Reload check failed (server may be restarting)', err));
    }
    setInterval(checkVersion, 500);
  })();
</script>
`;
        html = html.replace('</body>', `${reloadScript}\n</body>`);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal Server Error: ${err.message}`);
      }
      return;
    }

    if (pathname === '/build-version') {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(this.buildVersion);
      return;
    }

    // Try finding the file in distDir, assetsDir, and project root directory
    const pathsToCheck = [
      path.join(this.config.distDir, pathname),
      path.join(this.config.assetsDir, pathname),
      path.join(path.dirname(this.config.assetsDir), pathname)
    ];

    let foundPath = '';
    for (const p of pathsToCheck) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const ext = path.extname(foundPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain; charset=utf-8'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(foundPath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  // Getter for port (useful for testing or verification)
  public getPort(): number {
    return this.port;
  }
}

export default DevServer;

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import './build.mjs';

const portFlag = process.argv.indexOf('--port');
const port = portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT || 3000;
const {default: worker} = await import('../dist/server/index.js');
createServer(async (req,res) => {
  try {
    const origin = 'http://' + req.headers.host;
    const response = await worker.fetch(new Request(origin + req.url, {
      method:req.method, headers:req.headers,
      ...(req.method === 'GET' || req.method === 'HEAD' ? {} : {body:Readable.toWeb(req),duplex:'half'})
    }));
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch {
    res.writeHead(500).end('Preview error');
  }
}).listen(Number(port),'0.0.0.0');

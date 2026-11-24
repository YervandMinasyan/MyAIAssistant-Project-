import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { zipSync } from '../public/vendor/fflate.mjs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const types = {'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.pdf':'application/pdf'};
const assets = Object.create(null);
for (const name of (await readdir('public',{recursive:true})).sort()) {
  const type = types[extname(name)];
  if (!type) continue;
  const binary = !type.includes('charset');
  const data = await readFile('public/' + name,binary ? 'base64' : 'utf8');
  assets['/' + name] = [type,binary,data];
}
const webllm = 'node_modules/@mlc-ai/web-llm/';
assets['/vendor/web-llm.mjs'] = [types['.mjs'],false,
  (await readFile(webllm + 'lib/index.js','utf8')).replace(/^\/\/# sourceMappingURL=.*$/m,'')];
assets['/vendor/WEBLLM-LICENSE.txt'] = [types['.txt'],false,await readFile(webllm + 'LICENSE','utf8')];
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const [worker,research,online,armenian,studyTerms,studyModel] = await Promise.all([
  'worker/index.mjs','worker/research.mjs','worker/online-study.mjs','public/armenian-input.mjs','public/study-terms.mjs','public/study-model.mjs'
].map(path=>readFile(path,'utf8')));
const shared = [armenian,studyTerms,studyModel].map(source=>source.replace(/^import .*\n/gm,'').replace(/^export /gm,''));
const sourceFiles = ['.gitignore','.openai/hosting.json','package.json','package-lock.json',
  'scripts/build.mjs','scripts/preview.mjs','worker/index.mjs','worker/research.mjs','worker/online-study.mjs',
  ...Object.keys(assets).filter(path=>!['/vendor/web-llm.mjs','/vendor/WEBLLM-LICENSE.txt'].includes(path)).map(path=>'public'+path)];
const archiveEntries = Object.fromEntries(await Promise.all(sourceFiles.map(async path=>
  ['my-ai-assistant/'+path,new Uint8Array(await readFile(path))])));
const sourceZip = Buffer.from(zipSync(archiveEntries)).toString('base64');

await writeFile('dist/server/index.js','const assets = Object.assign(Object.create(null), ' +
  JSON.stringify(assets) + ');\nconst ownerSourceZip = ' + JSON.stringify(sourceZip) + ';\n' + [research,online,...shared].join('\n') + '\n' + worker.replace(/^import .*\n/, ''));
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');

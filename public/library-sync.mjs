import {account,loadState,libraryArchive,restoreLibrary} from './data.mjs';

let work=Promise.resolve();
export function synchronize(onRestore,update,choice) {
  if (!account) return;
  work=work.then(async()=>{
    const key='library-sync:'+account;
    const previous=JSON.parse(localStorage.getItem(key) || '{}');
    const revision=(await loadState()).revision || 0;
    const head=await fetch('/api/library',{method:'HEAD',cache:'no-store'});
    if (!head.ok && head.status!==404) throw Error();
    const tag=head.headers.get('etag');
    if (tag && tag!==previous.tag) {
      if (!choice && revision!==(previous.revision ?? 0)) {
        update('Երկու սարքերում էլ փոփոխություններ կան։ Պահպանիր տեղական պատճենը՝ նախքան տարբերակ ընտրելը։');
        return;
      }
      if (choice==='local') {
        const archive=await libraryArchive();
        const saved=await fetch('/api/library',{method:'PUT',headers:{'If-Match':tag},body:new Blob([archive.bytes])});
        if(!saved.ok) throw Error();
        localStorage.setItem(key,JSON.stringify({tag:saved.headers.get('etag'),revision:archive.revision}));
        update('Դասընթացները համաժամացված են։');
        return;
      }
      const remote=await fetch('/api/library',{cache:'no-store'});
      if (!remote.ok) throw Error();
      const next=await restoreLibrary(new Uint8Array(await remote.arrayBuffer()),revision);
      localStorage.setItem(key,JSON.stringify({tag:remote.headers.get('etag'),revision:next}));
      await onRestore();
    } else if (revision!==previous.revision || !tag) {
      const archive=await libraryArchive();
      const response=await fetch('/api/library',{method:'PUT',headers:tag?{'If-Match':tag}:{'If-None-Match':'*'},body:new Blob([archive.bytes])});
      if (!response.ok) throw Error();
      localStorage.setItem(key,JSON.stringify({tag:response.headers.get('etag'),revision:archive.revision}));
    }
    update('Դասընթացները համաժամացված են։');
  }).catch(()=>update('Համաժամացումը չհաջողվեց։ Տվյալները պահված են այս սարքում։'));
  return work;
}

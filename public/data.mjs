// The original database belongs to the first signed-in owner on this browser.
const identity = await fetch('/api/library/account',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
export const account = identity?.account || '';
let databaseName = 'dasaran-study';
if (account) {
  const ownerKey='dasaran-legacy-library-owner';
  if (!localStorage.getItem(ownerKey)) localStorage.setItem(ownerKey,account);
  if (localStorage.getItem(ownerKey)!==account) databaseName+='-'+account;
} else {
  databaseName+='-guest';
}
const db = new Promise((resolve, reject) => {
  const request = indexedDB.open(databaseName, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('data');
    request.result.createObjectStore('files');
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

function storedState(value) {
  const state = value ?? {courses:[]};
  for (const course of state.courses) {
    if (course.messages?.length && !course.threadId) course.threadId = 'legacy-' + course.id;
  }
  return state;
}

export async function loadState() {
  const database = await db;
  return new Promise((resolve,reject) => {
    const request = database.transaction('data').objectStore('data').get('state');
    request.onsuccess = () => resolve(storedState(request.result));
    request.onerror = () => reject(request.error);
  });
}

export async function editState(edit) {
  const database = await db;
  return new Promise((resolve,reject) => {
    const tx = database.transaction(['data','files'], 'readwrite');
    const data = tx.objectStore('data');
    const files = tx.objectStore('files');
    const request = data.get('state');
    let next;
    let failure;
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(failure || tx.error || new Error('Save aborted'));
    request.onsuccess = () => {
      try {
        next = storedState(request.result);
        const {fileKey, file, deleteFiles = []} = edit(next) || {};
        if (fileKey && file) files.put(file,fileKey);
        if (fileKey && !file) files.delete(fileKey);
        for (const key of deleteFiles) files.delete(key);
        next.revision = (next.revision || 0) + 1;
        data.put(next,'state');
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });
}

export async function getFile(fileKey) {
  const database = await db;
  return new Promise((resolve,reject) => {
    const request = database.transaction('files').objectStore('files').get(fileKey);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function resultOf(request) {
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export async function libraryArchive() {
  const database=await db;
  const tx=database.transaction(['data','files']);
  const files=tx.objectStore('files');
  const [saved,keys,values]=await Promise.all([
    resultOf(tx.objectStore('data').get('state')),resultOf(files.getAllKeys()),resultOf(files.getAll())
  ]);
  const {zipSync,strToU8}=await import('./vendor/fflate.mjs');
  const state=storedState(saved);
  const entries={};
  const index=[];
  for (const [i,file] of values.entries()) {
    entries['files/'+i]=new Uint8Array(await file.arrayBuffer());
    index.push({key:keys[i],name:file.name,type:file.type});
  }
  entries['library.json']=strToU8(JSON.stringify({format:1,state,files:index}));
  return {bytes:zipSync(entries,{level:0}),revision:state.revision || 0};
}

export async function restoreLibrary(bytes, expectedRevision) {
  const {unzipSync,strFromU8}=await import('./vendor/fflate.mjs');
  let size=0;
  const entries=unzipSync(bytes,{filter(entry){
    size+=entry.originalSize;
    if (size>200_000_000) throw Error('Պահուստային ֆայլը չափազանց մեծ է։');
    return true;
  }});
  const pack=JSON.parse(strFromU8(entries['library.json']));
  if (pack.format!==1 || !Array.isArray(pack.files) || !Array.isArray(pack.state?.courses) ||
    !pack.state.courses.every(c=>typeof c.id==='string' && typeof c.title==='string' && Array.isArray(c.tests) &&
      Array.isArray(c.messages) && Array.isArray(c.materials) && c.materials.every(m=>typeof m.title==='string' && Array.isArray(m.pages)))) throw Error('Անվավեր պահուստային ֆայլ։');
  const files=pack.files.map((f,i)=>{
    if (!entries['files/'+i] || typeof f.key!=='string') throw Error('Ֆայլը թերի է։');
    return [f.key,new File([entries['files/'+i]],f.name,{type:f.type})];
  });
  const database=await db;
  const tx=database.transaction(['data','files'],'readwrite');
  await new Promise((resolve,reject)=>{
    const data=tx.objectStore('data'), store=tx.objectStore('files');
    const r=data.get('state');
    r.onsuccess=()=>{
      if ((r.result?.revision || 0)!==expectedRevision) {tx.abort();return;}
      pack.state.revision=expectedRevision+1;
      store.clear();
      files.forEach(([key,file])=>store.put(file,key));
      data.put(pack.state,'state');
    };
    tx.oncomplete=resolve;
    tx.onabort=()=>reject(Error('Տվյալները փոխվել են։ Փորձիր կրկին։'));
  });
  return pack.state.revision;
}

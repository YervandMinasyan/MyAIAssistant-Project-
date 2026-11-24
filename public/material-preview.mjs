import { loadPdf } from './pdf.mjs';

const IMAGE_TYPES = {
  png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif'
};

export const materialExtensions = ['pdf','epub','txt','md','text',...Object.keys(IMAGE_TYPES)];
export const fileExtension = name => name?.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() || '';
export const imageType = name => {
  const extension = fileExtension(name);
  return Object.hasOwn(IMAGE_TYPES,extension) ? IMAGE_TYPES[extension] : '';
};

function node(name,properties={}) {
  return Object.assign(document.createElement(name),properties);
}

export function showMaterialFile(container,readFile,name,title,initialPage=1) {
  const type = imageType(name) || 'application/pdf';
  const stage = node('div',{className:'preview-stage'});
  const status = node('p',{className:'preview-status',textContent:'Բացվում է բնօրինակը…'});
  status.setAttribute('role','status');
  stage.append(status);
  container.replaceChildren(stage);
  let objectUrl;
  let disposePdf;
  let stopped = false;
  void (async () => {
    try {
      const file = await readFile();
      if (stopped) return;
      if (!file) throw new Error('Missing original');
      objectUrl = URL.createObjectURL(file.type === type ? file : new Blob([file],{type}));
      const controls = node('div',{className:'preview-controls'});
      const original = node('a',{className:'btn',href:objectUrl,target:'_blank',rel:'noopener',textContent:'Բացել առանձին պատուհանում'});
      controls.append(original);
      container.prepend(controls);
      if (type.startsWith('image/')) {
        const image = node('img',{alt:title,className:'material-image'});
        image.addEventListener('load',() => { if (!stopped) stage.replaceChildren(image); },{once:true});
        image.addEventListener('error',() => {
          if (!stopped) status.textContent = 'Չհաջողվեց ցուցադրել նկարը։ Փորձիր բացել բնօրինակը։';
        },{once:true});
        image.src = objectUrl;
      } else {
        const task = await loadPdf(file);
        if (stopped) { await task.destroy(); return; }
        disposePdf = () => { void task.destroy().catch(() => {}); };
        const pdf = await task.promise;
        if (stopped) return;
        disposePdf = pdfPages(pdf,controls,stage,status,title,initialPage,disposePdf);
      }
    } catch {
      if (!stopped) status.textContent = 'Չհաջողվեց ցուցադրել ֆայլը։ Կարող ես բացել կամ ներբեռնել բնօրինակը։';
    }
  })();
  return () => {
    stopped = true;
    disposePdf?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}

function pdfPages(pdf,controls,stage,status,title,initialPage,disposePdf) {
  const back = node('button',{type:'button',className:'btn',textContent:'Նախորդ էջ'});
  const next = node('button',{type:'button',className:'btn',textContent:'Հաջորդ էջ'});
  const label = node('span',{className:'preview-page'});
  label.setAttribute('role','status');
  const nav = node('div',{className:'preview-navigation'});
  nav.append(back,label,next);
  controls.prepend(nav);
  let pageNumber = Math.min(pdf.numPages,Math.max(1,initialPage));
  let activeRender;
  let generation = 0;

  async function draw() {
    const current = ++generation;
    activeRender?.cancel();
    activeRender = undefined;
    const pageToDraw = pageNumber;
    back.disabled = pageToDraw <= 1;
    next.disabled = pageToDraw >= pdf.numPages;
    label.textContent = 'Էջ ' + pageToDraw + ' / ' + pdf.numPages;
    status.textContent = 'Էջը բացվում է…';
    stage.replaceChildren(status);
    stage.scrollTop = 0;

    let page;
    let task;
    try {
      page = await pdf.getPage(pageToDraw);
      if (generation !== current) return;
      const natural = page.getViewport({scale:1});
      const fit = Math.max(245,stage.clientWidth - 24) / natural.width;
      const resolution = Math.min(2,window.devicePixelRatio || 1) * fit;
      const scale = Math.min(resolution,4096/Math.max(natural.width,natural.height));
      const viewport = page.getViewport({scale});
      const canvas = node('canvas',{
        width:Math.ceil(viewport.width),height:Math.ceil(viewport.height),className:'pdf-page'
      });
      canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label',title + ', էջ ' + pageToDraw);
      task = page.render({canvasContext:canvas.getContext('2d'),viewport});
      activeRender = task;
      await task.promise;
      if (generation === current) stage.replaceChildren(canvas);
    } catch {
      if (generation === current) status.textContent = 'Չհաջողվեց ցուցադրել այս էջը։ Բացիր բնօրինակը առանձին պատուհանում։';
    } finally {
      if (activeRender === task) activeRender = undefined;
      page?.cleanup();
    }
  }

  back.addEventListener('click',() => { if (pageNumber>1) { pageNumber--; void draw(); } });
  next.addEventListener('click',() => { if (pageNumber<pdf.numPages) { pageNumber++; void draw(); } });
  void draw();
  return () => {
    generation++;
    activeRender?.cancel();
    disposePdf();
  };
}

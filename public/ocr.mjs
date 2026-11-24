export async function recognizeMaterial(file,progress) {
  const {default:Tesseract} = await import('./vendor/tesseract.mjs');
  const worker = await Tesseract.createWorker('hye+eng+rus',1,{
    workerPath:new URL('./vendor/ocr-worker.mjs',import.meta.url).href,
    corePath:new URL('./vendor/ocr-core.js',import.meta.url).href,
    langPath:'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main',gzip:false,
    workerBlobURL:false
  });
  const read = async image => (await worker.recognize(image)).data.text.trim();
  try {
    if (!/\.pdf$/i.test(file.name)) return [{label:'նկար',text:await read(file)}];
    const {loadPdf} = await import('./pdf.mjs');
    const task = await loadPdf(file);
    try {
      const pdf = await task.promise, pages=[];
      for (let n=1;n<=pdf.numPages;n++) {
        progress(n,pdf.numPages);
        const page=await pdf.getPage(n);
        let text=(await page.getTextContent()).items.map(item=>item.str || '').join(' ').trim();
        if (!text) {
          const base=page.getViewport({scale:1});
          const viewport=page.getViewport({scale:Math.min(2,2200/Math.max(base.width,base.height))});
          const canvas=document.createElement('canvas');
          canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
          await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
          text=await read(canvas);
          canvas.width=canvas.height=0;
        }
        pages.push({label:'էջ '+n,text}); page.cleanup();
      }
      return pages;
    } finally {await task.destroy();}
  } finally {await worker.terminate();}
}

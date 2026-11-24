export async function loadPdf(file,options={}) {
  const {getDocument,GlobalWorkerOptions} = await import('./vendor/pdf.min.mjs');
  GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs',import.meta.url).href;
  return getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,...options});
}

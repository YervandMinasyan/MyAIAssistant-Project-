export class LocalStudyAI {
  #worker;
  #task;
  #onChange;

  constructor(onChange) {
    this.#onChange = onChange;
    this.state = 'idle';
    this.progress = 0;
  }

  #setState(state) {
    this.state = state;
    this.#onChange();
  }

  async start() {
    if (this.state === 'loading' || this.state === 'ready') return;
    this.progress = 0;
    this.#setState('loading');
    try {
      const worker = new Worker(new URL('./local-ai-worker.mjs',import.meta.url),{type:'module'});
      this.#worker = worker;
      worker.onmessage = ({data}) => {
        if (worker !== this.#worker) return;
        if (data.type === 'progress') {
          this.progress = Math.max(this.progress,Math.min(1,Number(data.progress) || 0));
          this.#onChange();
        }
        if (data.type === 'result') this.#task?.finish(data.value);
        if (data.type === 'failure') this.stop(data.unsupported ? 'unsupported' : 'error');
      };
      worker.onerror = event => {
        if (worker !== this.#worker) return;
        event.preventDefault();
        this.stop('error');
      };
      await this.#request('load');
      if (worker === this.#worker) this.#setState('ready');
    } catch {
      if (this.state === 'loading') this.stop('error');
    }
  }

  async answer(request) {
    if (this.state !== 'ready') throw new Error('Browser model has not loaded');
    const timeout = request.planTopic || request.translateTo ? 35000 : request.lecture || request.details.quiz ? 180000 : 75000;
    return this.#request('answer',request,timeout);
  }

  stop(state = 'idle') {
    this.#worker?.terminate();
    this.#worker = undefined;
    this.#task?.finish(undefined,new Error('Browser model stopped'));
    this.#setState(state);
  }

  #request(type, request, timeout) {
    if (!this.#worker || this.#task) throw new Error('Browser model is unavailable or busy');
    return new Promise((resolve,reject) => {
      const timer = timeout && setTimeout(() => this.stop('error'),timeout);
      this.#task = {
        finish:(value,error) => {
          clearTimeout(timer);
          this.#task = undefined;
          if (error) reject(error);
          else resolve(value);
        }
      };
      try { this.#worker.postMessage({type,request}); }
      catch (error) { this.#task.finish(undefined,error); }
    });
  }
}

import { MAX_TRANSLATED_PROMPT } from './study-model.mjs';

export class DraftTranslator {
  state = {status:'idle'};
  #request = null;
  #timer;
  #running = false;
  #due = false;
  #translate;
  #onChange;

  constructor(translate,onChange) {
    this.#translate = translate;
    this.#onChange = onChange;
  }

  prepare(request) {
    if (request?.key === this.#request?.key) return;
    clearTimeout(this.#timer);
    this.#due = false;
    this.#request = request;
    this.#setState({status:request ? 'waiting' : 'idle'});
    if (request) this.#timer = setTimeout(()=>this.#start(),1250);
  }

  retry() {
    if (this.state.status !== 'error' && this.state.status !== 'waiting') return;
    clearTimeout(this.#timer);
    void this.#start();
  }

  result(request) {
    return request && request.key === this.#request?.key && this.state.status === 'ready' ? this.state.result : null;
  }

  #setState(state) {
    this.state = state;
    this.#onChange();
  }

  async #start() {
    if (!this.#request) return;
    if (this.#running) { this.#due = true; return; }
    const request = this.#request;
    this.#running = true;
    this.#due = false;
    this.#setState({status:'translating'});
    try {
      const result = await this.#translate(request);
      if (typeof result?.translated !== 'string' || !result.translated.trim()) {
        throw new Error('Թարգմանությունը չստացվեց։');
      }
      const text = result.translated.trim();
      if (text.length > MAX_TRANSLATED_PROMPT) throw new Error('Թարգմանությունը չափազանց երկար է։ Կրճատիր հարցդ և նորից փորձիր։');
      if (request === this.#request) this.#setState({status:'ready',result:{
        text,
        topic:typeof result.topic === 'string' ? result.topic : '',
        from:request.from,to:request.to
      }});
    } catch (error) {
      if (request === this.#request) this.#setState({status:'error',message:error?.message || 'Թարգմանությունը չստացվեց։'});
    } finally {
      this.#running = false;
      if (this.#due) void this.#start();
    }
  }
}

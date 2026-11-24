import { runLocalStudy } from './local-study.mjs';

const MODEL_REVISIONS = {
  'Qwen3-1.7B-q4f16_1-MLC':'80b3abcec6c3b3f5355dc0cc99cc4fb578f192bc',
  'Qwen3-1.7B-q4f32_1-MLC':'bddd4d584cabe19113f7e4ff46fd9e73b4d3dc89'
};
const LIB_REVISION = '5b7251f3bdce957be2a7bf73a6f6c560d9874df4';
let engine;

self.onmessage = async ({data}) => {
  try {
    if (data.type === 'load') {
      const adapter = await self.navigator.gpu?.requestAdapter();
      if (!adapter) {
        self.postMessage({type:'failure',unsupported:true});
        return;
      }
      const supportsF16 = adapter.features.has('shader-f16');
      const modelId = supportsF16 ? 'Qwen3-1.7B-q4f16_1-MLC' : 'Qwen3-1.7B-q4f32_1-MLC';
      const {CreateMLCEngine,prebuiltAppConfig} = await import('./vendor/web-llm.mjs');
      const record = prebuiltAppConfig.model_list.find(model => model.model_id === modelId);
      engine = await CreateMLCEngine(modelId,{
        initProgressCallback:({progress}) => self.postMessage({type:'progress',progress}),
        appConfig:{
          cacheBackend:'cache',
          model_list:[{
            ...record,
            model:'https://huggingface.co/mlc-ai/' + modelId + '/resolve/' + MODEL_REVISIONS[modelId] + '/',
            model_lib:record.model_lib.replace('/main/','/' + LIB_REVISION + '/'),
            required_features:supportsF16 ? ['shader-f16'] : []
          }]
        }
      });
      self.postMessage({type:'result'});
    } else if (data.type === 'answer' && engine) {
      try {
        const value = await runLocalStudy(data.request,options => engine.chat.completions.create(options));
        self.postMessage({type:'result',value});
      } catch {
        self.postMessage({type:'result',value:null});
      }
    }
  } catch {
    self.postMessage({type:'failure'});
  }
};

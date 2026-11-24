const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_FALLBACK = 'gemini-3.5-flash-lite';
const GEMINI_MODELS = {[GEMINI_MODEL]:'Gemini 3.8 Flash',[GEMINI_FALLBACK]:'Gemini 3.5 Flash-Lite'};
const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
const CONNECTION_COOKIE = '__Host-dasaran-gemini';
const OPENROUTER_COOKIE = '__Host-dasaran-openrouter';
const OPENROUTER_KEY = /^sk-or-v1-[a-zA-Z0-9_-]{32,180}$/u;
const GROQ_KEY = /^gsk_[A-Za-z0-9]{24,150}$/u;
const GROQ_MODEL = 'openai/gpt-oss-120b';
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';
const OPENROUTER_FALLBACK = 'google/gemma-4-26b-a4b-it:free';
const OPENROUTER_MODELS = {[OPENROUTER_MODEL]:'Gemma 4 31B · OpenRouter',
  [OPENROUTER_FALLBACK]:'Gemma 4 26B · OpenRouter'};
const CONNECTION_SECONDS = 7 * 24 * 60 * 60;
const GEMINI_KEY = /^(?:AIza[A-Za-z0-9_-]{35}|AQ\.[A-Za-z0-9_.-]{16,480})$/u;
const SOURCE_HOSTS = new Set(['en.wikipedia.org','hy.wikipedia.org','en.wikibooks.org','developer.mozilla.org']);

function onlineAvailable(env) {
  return typeof env.ONLINE_SESSION_SECRET === 'string' && /^[0-9a-f]{64}$/i.test(env.ONLINE_SESSION_SECRET);
}

// Restrict recovery to text models supported by this integration.
const flashModel = /^gemini-[0-9]+(?:\.[0-9]+)?-flash(?:-lite)?(?:-[0-9]{3})?$/u;
const googleGemma = new Set(['gemma-4-31b-it','gemma-4-26b-a4b-it']);
const supportedGoogleModel = id=>googleGemma.has(id) || flashModel.test(id);
async function availableGoogleModels(key,remaining) {
  if (remaining<=0) return [];
  try {
    const response=await fetch(GEMINI_ORIGIN+'/v1beta/models?pageSize=1000',{
      headers:{'x-goog-api-key':key},redirect:'manual',signal:AbortSignal.timeout(Math.min(5000,remaining))
    });
    if (!response.ok) return [];
    const {models}=await response.json();
    return (models || []).filter(m=>m.supportedGenerationMethods?.includes('generateContent'))
      .map(m=>String(m.name).replace(/^models\//,'')).filter(supportedGoogleModel)
      .sort((a,b)=>Number(googleGemma.has(b))-Number(googleGemma.has(a)) || b.localeCompare(a,'en',{numeric:true}));
  } catch {return [];}
}

function providerCookie(slot) {
  return slot === "groq" ? "__Host-dasaran-groq" : slot ? OPENROUTER_COOKIE : CONNECTION_COOKIE;
}

function onlineIdentity(request,backup=false) {
  const id = request.headers.get('oai-authenticated-user-id');
  return id ? (backup === 'groq' ? 'groq:' : backup ? 'openrouter:' : 'gemini:') + new URL(request.url).origin + ':' + id : '';
}

function encodeUrl(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}

function decodeUrl(value) {
  return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),char => char.charCodeAt(0));
}

async function connectionCipher(env) {
  const bytes = Uint8Array.from(env.ONLINE_SESSION_SECRET.match(/../g),pair => Number.parseInt(pair,16));
  return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}

async function encryptConnection(env,identity,apiKey,model) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await connectionCipher(env);
  const encoder = new TextEncoder();
  const text = JSON.stringify({apiKey,model,expires:Date.now()+CONNECTION_SECONDS*1000});
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(identity)},key,encoder.encode(text));
  return encodeUrl(iv) + '.' + encodeUrl(new Uint8Array(encrypted));
}

async function onlineSession(request,env,backup=false) {
  const identity = onlineIdentity(request,backup);
  const stored = readOnlineCookie(request,providerCookie(backup));
  if (!identity || !stored || !onlineAvailable(env)) return null;
  try {
    const [iv,value] = stored.split('.');
    const data = await crypto.subtle.decrypt({
      name:'AES-GCM',iv:decodeUrl(iv),additionalData:new TextEncoder().encode(identity)
    },await connectionCipher(env),decodeUrl(value));
    const session = JSON.parse(new TextDecoder().decode(data));
    if (session.expires <= Date.now() || !(backup ? OPENROUTER_KEY.test(session.apiKey) || GROQ_KEY.test(session.apiKey) : GEMINI_KEY.test(session.apiKey))) return null;
    if (backup) return {slot:backup,apiKey:session.apiKey,
      model:GROQ_KEY.test(session.apiKey) ? GROQ_MODEL : Object.hasOwn(OPENROUTER_MODELS,session.model) ? session.model : OPENROUTER_MODEL,backup:true};
    return {apiKey:session.apiKey,model:supportedGoogleModel(session.model) ? session.model : GEMINI_MODEL};
  } catch {
    return null;
  }
}

function readOnlineCookie(request,name) {
  return (request.headers.get('cookie') || '').split(';').map(pair=>pair.trim())
    .find(pair=>pair.startsWith(name+'='))?.slice(name.length+1) || '';
}

function setOnlineCookie(value,maxAge,backup=false) {
  return (providerCookie(backup)) + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=' + maxAge;
}

function sameOnlineOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site';
}

function stopOnline(request,backup=false) {
  if (request.method !== 'POST' || !sameOnlineOrigin(request) || !onlineIdentity(request)) return json({error:'origin'},403);
  return new Response(null,{status:204,headers:{
    'Cache-Control':'no-store','Set-Cookie':setOnlineCookie('',0,backup)
  }});
}

async function geminiGenerate(key, model, options, connecting=false,remaining=55000) {
  let system = options.messages.find(message=>message.role==='system')?.content;
  const messages = options.messages.filter(message=>message.role!=='system');
  const schema = options.response_format?.schema;
  if (schema && googleGemma.has(model)) system=(system || '')+' Return only a JSON object matching this schema: '+schema;
  const response = await fetch(GEMINI_ORIGIN + '/v1beta/models/' + model + ':generateContent',{
    method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
    body:JSON.stringify({
      ...(system ? {systemInstruction:{parts:[{text:system}]}} : {}),
      contents:messages.map(message=>({role:message.role==='assistant' ? 'model' : 'user',parts:[{text:message.content}]})),
      generationConfig:connecting ? {maxOutputTokens:2048} : {
        maxOutputTokens:options.max_tokens + (options.max_tokens > 1000 ? 3000 : 1100),

        ...(schema && !googleGemma.has(model) ? {responseMimeType:'application/json',responseJsonSchema:JSON.parse(schema)} : {})}
    }),
    signal:AbortSignal.timeout(connecting ? 12000 : Math.min(options.max_tokens>1000 ? 32000 : 18000,remaining)),redirect:'manual'
  });
  // Workers supports manual redirects. Reject any redirect before it can forward the key.
  if (response.status >= 300 && response.status < 400) {
    throw Object.assign(new Error('Unexpected Gemini redirect'),{remoteStatus:response.status,reason:'REDIRECT'});
  }
  const result = await response.json().catch(()=>null);
  if (!response.ok || result?.error) {
    const value = result?.error?.details?.find(item=>typeof item?.reason==='string')?.reason || result?.error?.status;
    const reason = typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,60}$/u.test(value) ? value : undefined;
    throw Object.assign(new Error('Gemini request failed'),{remoteStatus:response.ok ? 502 : response.status,reason});
  }
  const candidate = result?.candidates?.[0];
  const content = (candidate?.content?.parts || []).filter(part=>!part.thought).map(part=>part.text || '').join('');
  const finish = candidate?.finishReason;
  if (!content.trim() || (finish && finish !== 'STOP' && finish !== 'MAX_TOKENS')) {
    throw Object.assign(new Error('Empty Gemini response'),{remoteStatus:200,reason:'NO_TEXT'});
  }
  return {choices:[{message:{content},finish_reason:finish === 'MAX_TOKENS' ? 'length' : finish}]};
}

function shouldTryAlternate(error) {
  return error.remoteStatus === 404 || error.remoteStatus >= 500 || error.reason === 'NO_TEXT';
}

async function openRouterGenerate(key,model,options,connecting=false,remaining=35000) {
  const schema = options.response_format?.schema;
  const messages = schema ? options.messages.map(message=>message.role==='system' ? {...message,
    content:message.content+' Output a single valid JSON object matching this JSON Schema: '+schema} : message) : options.messages;
  const groq = model===GROQ_MODEL;
  const endpoint = groq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
  const response = await fetch(endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages,temperature:.2,
      ...(groq ? {max_completion_tokens:connecting ? 80 : Math.min(3200,options.max_tokens),reasoning_effort:'low',
        ...(schema ? {response_format:{type:'json_object'}} : {})} : {max_tokens:connecting ? 80 : options.max_tokens})}),
    redirect:'manual',signal:AbortSignal.timeout(connecting ? 14000 : Math.min(35000,remaining))
  });
  if (response.status >= 300 && response.status < 400) throw new Error('Unexpected OpenRouter redirect');
  const result = await response.json().catch(()=>null);
  const status = Number(result?.error?.code);
  if (!response.ok || result?.error) {
    throw Object.assign(new Error(groq?'Groq request failed':'OpenRouter request failed'),{groq,remoteStatus:status>=400 && status<600 ? status : response.status});
  }
  if (typeof result?.choices?.[0]?.message?.content !== 'string' || !result.choices[0].message.content.trim()) {
    throw Object.assign(new Error('Empty OpenRouter response'),{reason:'NO_TEXT'});
  }
  return {choices:result.choices};
}

const revokedKey = error => error.remoteStatus===401 || error.reason==='API_KEY_INVALID';

function onlineError(error, connecting=false,backup=false) {
  const status = error.remoteStatus;
  const reason = error.reason;
  if (status===429) return json({error:'limit'},429);
  if (connecting && reason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') return json({error:'keyType'},400);
  if (revokedKey(error)) {
    if (connecting) return json({error:'key'},400);
    return Response.json({error:backup?'backupConnect':'geminiConnect'},{status:401,headers:{
      'Cache-Control':'no-store','Set-Cookie':setOnlineCookie('',0,backup)}});
  }
  if (status===403 || reason==='FAILED_PRECONDITION') return json({error:'providerAccess'},403);
  if (error.name === 'TimeoutError') return json({error:'timeout'},504);
  console.error(backup ? error.groq ? 'Groq request failed' : 'OpenRouter request failed' : 'Gemini request failed',
    {step:connecting ? 'connect' : 'study',status:status || 0,reason:reason || 'REQUEST_FAILED'});
  if (status === 503) return json({error:'serviceBusy'},503);
  if (status===404) return json({error:'modelUnavailable'},503);
  if (status===400) return json({error:'providerRequest'},502);
  if (reason==='NO_TEXT') return json({error:'empty'},502);
  return json({error:'unavailable'},502);
}

async function startOnline(request,env,backup=false) {
  if (request.method !== 'POST' || !sameOnlineOrigin(request)) return json({error:'origin'},403);
  const identity = onlineIdentity(request,backup);
  if (!identity || !onlineAvailable(env)) return json({error:'unavailable'},401);
  let key;
  try {
    const body = await request.text();
    if (body.length > 1100) return json({error:'key'},400);
    key = JSON.parse(body)?.key;
  } catch {
    return json({error:'key'},400);
  }
  if (typeof key !== 'string' || !(backup ? OPENROUTER_KEY.test(key) || GROQ_KEY.test(key) : GEMINI_KEY.test(key))) {
    return json({error:backup?'backupKeyFormat':'key'},400);
  }
  try {
    const options = {messages:[{role:'user',content:'Reply with the word «Բարև».'}]};
    let model = backup ? GROQ_KEY.test(key) ? GROQ_MODEL : OPENROUTER_MODEL : GEMINI_MODEL;
    const generate = id=>backup ? openRouterGenerate(key,id,options,true) : geminiGenerate(key,id,options,true);
    try {
      await generate(model);
    } catch (error) {
      if (model===GROQ_MODEL || (!shouldTryAlternate(error) && error.name!=='TimeoutError')) throw error;
      model = backup ? OPENROUTER_FALLBACK : GEMINI_FALLBACK;
      try {await generate(model);} catch(second) {
        if (backup || !shouldTryAlternate(second)) throw second;
        const ids=(await availableGoogleModels(key,5000)).filter(id=>id!==model && id!==GEMINI_MODEL);
        let connected=false;
        for(const id of ids.slice(0,2)) {
          try {await generate(id);model=id;connected=true;break;}
          catch(next){if(!shouldTryAlternate(next)) throw next;}
        }
        if(!connected) throw second;
      }
    }
    const slot = model===GROQ_MODEL ? 'groq' : backup;
    const encrypted = await encryptConnection(env,onlineIdentity(request,slot),key,model);
    const headers = new Headers({'Cache-Control':'no-store'});
    headers.append('Set-Cookie',setOnlineCookie(encrypted,CONNECTION_SECONDS,slot));
    const legacy = backup && await onlineSession(request,env,true);
    if (legacy?.model===GROQ_MODEL) {
      if (slot==='groq') headers.append('Set-Cookie',setOnlineCookie('',0,true));
      else if (!(await onlineSession(request,env,'groq'))) {
        const moved = await encryptConnection(env,onlineIdentity(request,'groq'),legacy.apiKey,GROQ_MODEL);
        headers.append('Set-Cookie',setOnlineCookie(moved,CONNECTION_SECONDS,'groq'));
      }
    }
    return new Response(null,{status:204,headers});
  } catch (error) {
    return onlineError(error,true,backup);
  }
}

function cleanOnlineSources(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.slice(0,5).flatMap(item => {
    if (typeof item?.url !== 'string' || typeof item.title !== 'string' || typeof item.text !== 'string') return [];
    try {
      const url = new URL(item.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !SOURCE_HOSTS.has(url.hostname)) return [];
      return [{url:url.href,title:item.title.slice(0,180),publisher:String(item.publisher).slice(0,70),text:item.text.slice(0,850)}];
    } catch {
      return [];
    }
  });
}

async function providerSessions(request,env) {
  const [gemini,stored,groq] = await Promise.all([onlineSession(request,env),onlineSession(request,env,true),onlineSession(request,env,'groq')]);
  return {gemini,groq:groq || (stored?.model===GROQ_MODEL ? stored : null),router:stored?.model!==GROQ_MODEL ? stored : null};
}

const guestConfigKey='configuration/guest-ai';
async function isGuestAdmin(request) {
  const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if (!email || !onlineIdentity(request)) return false;
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')==='acbb8f9874acc0d19eb1476deddf8d2b9424a939c1ece5757fec1643ac966947';
}
async function guestSessions(env) {
  if (GROQ_KEY.test(env.GUEST_GROQ_KEY || '')) return {groq:{apiKey:env.GUEST_GROQ_KEY,backup:true,model:GROQ_MODEL}};
  if (!env.BUCKET || !onlineAvailable(env)) return {};
  const record=await env.BUCKET.get(guestConfigKey);
  if (!record) return {};
  const [iv,cipher]=(await record.text()).split('.');
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:decodeUrl(iv),additionalData:new TextEncoder().encode(guestConfigKey)},await connectionCipher(env),decodeUrl(cipher));
  return JSON.parse(new TextDecoder().decode(clear));
}
async function configureGuestAI(request,env) {
  if(request.method!=='POST' || !sameOnlineOrigin(request) || !(await isGuestAdmin(request))) return json({error:'forbidden'},403);
  const {groq,gemini}=await providerSessions(request,env);
  if (!groq && !gemini) return json({error:'connect'},400);
  const data=JSON.stringify({groq,gemini});
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(guestConfigKey)},await connectionCipher(env),new TextEncoder().encode(data));
  await env.BUCKET.put(guestConfigKey,encodeUrl(iv)+'.'+encodeUrl(new Uint8Array(cipher)));
  return json({ready:true});
}
async function checkProviders(request,env) {
  if (request.method!=='POST' || !sameOnlineOrigin(request) || !onlineIdentity(request)) return json({error:'origin'},403);
  const sessions = await providerSessions(request,env);
  const results = await Promise.all(Object.entries(sessions).filter(([,session])=>session).map(async ([name,session])=>{
    const options = {messages:[{role:'user',content:'Reply OK.'}]};
    try {
      if (session.backup) await openRouterGenerate(session.apiKey,session.model,options,true);
      else await geminiGenerate(session.apiKey,session.model,options,true);
      return {name,model:session.model,status:'ready'};
    } catch (error) {
      return {name,model:session.model,status:(await onlineError(error,true,session.backup).json()).error};
    }
  }));
  return json({results});
}

async function onlineStudy(request,env) {
  if (request.method !== 'POST' || !sameOnlineOrigin(request)) return json({error:'origin'},403);
  const personal=await providerSessions(request,env);
  const shared=!Object.values(personal).some(Boolean);
  const {gemini,groq,router:backup}=shared ? await guestSessions(env) : personal;
  const connection = gemini || groq || backup;
  if (!connection) return json({error:'connect'},401);
  let input;
  try {
    const body = await request.text();
    if (body.length > 105000) return json({error:'payload'},413);
    input = JSON.parse(body);
  } catch {
    return json({error:'invalid'},400);
  }
  const originalPrompt = typeof input?.originalPrompt==='string' ? input.originalPrompt.trim().slice(0,1600) : '';
  const translateAnswer = input?.translateAnswer === true;
  const maxPrompt = translateAnswer ? MAX_ANSWER_TRANSLATION : originalPrompt && !input.translateTo ? MAX_TRANSLATED_PROMPT : 1600;
  if (typeof input?.prompt !== 'string' || !input.prompt.trim() || input.prompt.length>maxPrompt ||
      (translateAnswer && !Object.hasOwn(languageOptions,input.translateTo))) return json({error:'invalid'},400);
  const rawDetails = input.details || {};
  const details = {
    references:Array.isArray(rawDetails.references) ? rawDetails.references.filter(n=>Number.isInteger(n)&&n>0).slice(0,20) : [],
    quiz:rawDetails.quiz===true,
    count:Number.isInteger(rawDetails.count) ? Math.min(15,Math.max(1,rawDetails.count)) : 5,
    topics:Array.isArray(rawDetails.topics) ? rawDetails.topics.filter(label=>typeof label==='string')
      .slice(0,15).map(label=>label.slice(0,140)) : []
  };
  const evidence = Array.isArray(input.evidence) ? input.evidence.slice(0,32).flatMap(item =>
    item && Number.isInteger(item.number) && item.number>0 && typeof item.text==='string'
      ? [{number:item.number,label:String(item.label).slice(0,60),title:String(item.title).slice(0,140),text:item.text.slice(0,1000),
        via:typeof item.via === 'string' ? item.via.slice(0,150) : undefined,
        topics:Array.isArray(item.topics) ? item.topics.filter(id=>Number.isInteger(id)&&id>=0&&id<details.topics.length).slice(0,15) : []}] : []) : [];
  const history = Array.isArray(input.history) ? input.history.slice(-8).flatMap(item =>
    item && ['assistant','user'].includes(item.role) && typeof item.text==='string'
      ? [{role:item.role,text:item.text.slice(0,950)}] : []) : [];
  const studyRequest = {
    prompt:input.prompt,details,evidence,history,web:input.materialOnly===true ? [] : cleanOnlineSources(input.web),
    lecture:input.lecture===true,materialOnly:input.materialOnly===true,
    translateFrom:typeof input.translateFrom==='string' ? input.translateFrom : '', originalPrompt,
    translateTo:typeof input.translateTo==='string' ? input.translateTo : '',
    translateAnswer,
    translation:typeof input.translation==='string' ? input.translation.slice(0,2200) : '',
    replyLanguage:typeof input.replyLanguage==='string' ? input.replyLanguage : 'hy',
    planTopic:input.planTopic===true,topicHint:typeof input.topicHint==='string' ? input.topicHint.slice(0,160) : ''
  };
  const primary=[groq,gemini,backup].filter(Boolean);
  const preferred={groq,gemini,backup}[input.preferredProvider];
  if (primary.includes(preferred)) {
    primary.splice(primary.indexOf(preferred),1);
    primary.unshift(preferred);
  }
  const candidates = [...primary,
    gemini && {...gemini,model:gemini.model===GEMINI_MODEL ? GEMINI_FALLBACK : GEMINI_MODEL},
    backup && {...backup,model:backup.model===OPENROUTER_MODEL ? OPENROUTER_FALLBACK : OPENROUTER_MODEL}].filter(Boolean);
  const retired = new Set();
  const blocked = new Set();
  const deadline = Date.now()+105000;
  const timeout = () => new DOMException('Study model deadline exceeded','TimeoutError');
  const finish = (response,alreadyCleared) => {
    if (shared) return response;
    for (const provider of retired) {
      if (provider!==alreadyCleared) response.headers.append('Set-Cookie',setOnlineCookie('',0,provider==='groq' ? groq.slot : provider==='backup'));
    }
    if (retired.size) response.headers.set('X-Study-Disconnected',[...retired].join(','));
    return response;
  };
  let lastFailure;
  let lastProvider;
  let discovered=false;
  for (const provider of candidates) {
    const name = provider.model===GROQ_MODEL ? 'groq' : provider.backup ? 'backup' : 'gemini';
    if (blocked.has(name) || Date.now()>=deadline) continue;
    try {
      const compact = provider.model===GROQ_MODEL;
      const requestForModel = compact ? {...studyRequest,history:history.slice(-4).map(item=>({...item,text:item.text.slice(0,300)})),
        web:studyRequest.web.slice(0,2).map(item=>({...item,text:item.text.slice(0,350)})),
        evidence:evidence.slice(0,details.topics.length>8 ? 15 : 8).map(item=>({...item,text:item.text.slice(0,400)}))} : studyRequest;
      const result = await runStudyModel(requestForModel,options=>{
        const remaining = deadline-Date.now();
        if (remaining<=0) throw timeout();
        return provider.backup ? openRouterGenerate(provider.apiKey,provider.model,options,false,remaining) :
          geminiGenerate(provider.apiKey,provider.model,options,false,remaining);
      },true);
      if (details.quiz && !result?.quiz?.questions?.length) throw Object.assign(new Error('No valid quiz questions'),{reason:'NO_TEXT'});
      if (result && typeof result === 'object') {
        result.modelName = compact ? 'GPT-OSS 120B · Groq' : ((provider.backup ? OPENROUTER_MODELS : GEMINI_MODELS)[provider.model] || provider.model);
      }
      const response=finish(json({result}));
      if (!shared && name==='gemini' && provider.model!==gemini.model) {
        const encrypted=await encryptConnection(env,onlineIdentity(request),provider.apiKey,provider.model);
        response.headers.append('Set-Cookie',setOnlineCookie(encrypted,CONNECTION_SECONDS));
      }
      return response;
    } catch (error) {
      lastFailure = error;
      lastProvider = name;
      if (name==='gemini' && !discovered && (shouldTryAlternate(error) || error.name==='TimeoutError')) {
        discovered=true;
        const used=new Set(candidates.map(item=>item.model));
        const ids=(await availableGoogleModels(provider.apiKey,deadline-Date.now())).filter(id=>!used.has(id));
        for(const id of ids.slice(0,2)) candidates.push({...gemini,model:id});
      }
      if (revokedKey(error)) retired.add(name);
      if (retired.has(name) || [403,429].includes(error.remoteStatus)) {
        blocked.add(name);
        continue;
      }
      if (!shouldTryAlternate(error) && !['TimeoutError','TypeError','SyntaxError'].includes(error.name)) blocked.add(name);
    }
  }
  const failure = lastFailure || timeout();
  if (shared && revokedKey(failure)) return json({error:'serviceBusy'},503);
  return finish(onlineError(failure,false,lastProvider==='groq' ? groq.slot : lastProvider==='backup'),revokedKey(failure) ? lastProvider : undefined);
}

import { researchTopic } from './research.mjs';
import { materialNumber } from './study.mjs';
import { normalizeArmenianInput } from './armenian-input.mjs';

const FILLER = /^(?:որտեղ|ո՞րտեղ|գտնվում|կա|կան|կա՞|ուղարկ\p{L}*|բացատր\p{L}*|մանրամասն|ավելի|պարզ|կարճ|օրինակով|իսկ|հետո|թեմայի|բաժին\p{L}*|նշված|անունը|անունով|իմ|մեջ|այստեղ|գրված|երևում|առկա|խնդր\p{L}*|կարդա|բարեւ|բարև|ողջույն|շնորհակալություն|որտե՞ղ|vortegh|vortex|ur|ka|kan|ov|as[ai]r?|bacatr\w*|uxar\w*|manramasn|aveli|parz|isk|heto|karas|karoxes|karox|kanes|xndrum|khndrum|ka[mn]|esim|im|mej|aystex|anuny|anunov|grvac|nshvac|barev|voghjuyn|shnorhakalutyun|where|mention\w*|located|happens|hi|hello|thanks)$/iu;
const ONLY_FILES = /(?:միայն\s+(?:իմ\s+)?նյութ\p{L}*|առանց\s+(?:համացանցի|ինտերնետի)|\bmiayn\s+(?:im\s+)?nyut\w*|\baranc\s+(?:internet|hamacanc)|\bonly\s+(?:my\s+|the\s+)?(?:course\s+)?materials\b|\bwithout\s+(?:the\s+)?(?:internet|web)\b)/iu;
const FOLLOW_UP = /(?:^(?:իսկ|հետո|հիմա|նույնը|isk\b|heto\b|hima\b)|(?:ավելի\s+(?:մանրամասն|պարզ)|aveli\s+(?:manramasn|parz)))/iu;
export const localSearchOnly = prompt => ONLY_FILES.test(prompt);

function wording(value) {
  return researchTopic(normalizeArmenianInput(value).text)
    .split(/\s+/u).filter(word => !FILLER.test(word)).join(' ').trim();
}

export function lookupTopic(prompt,materialTitles,history=[]) {
  const normalized = normalizeArmenianInput(prompt).text;
  const explicit = wording(normalized.replace(ONLY_FILES,''));
  const past = FOLLOW_UP.test(normalized) ? [...history].reverse().find(item=>item.role==='user' && wording(item.text))?.text || '' : '';
  const title = materialTitles.map(wording).filter(Boolean).join(' ').slice(0,150);
  const current = explicit || wording(past) || title;
  if (current.length < 2) return {query:'',original:''};
  return {query:current,original:current};
}

export function lookupReport(lookup,evidence,webSources,{searched=false,unavailable=false}={}) {
  const groups = new Map();
  for (const entry of evidence) {
    const key = entry.number+':'+entry.label;
    if (!groups.has(key) && groups.size >= 6) continue;
    const group = groups.get(key) || {...entry,excerpts:new Set()};
    if (group.excerpts.size < 3) group.excerpts.add(entry.text.slice(0,560));
    groups.set(key,group);
  }
  const pages = [...groups.values()];
  const files = pages.length ? pages.map((page,index) =>
    '[' + (index+1) + '] ' + materialNumber(page.number) + ' · ' + page.title + ' · ' + page.label +
    (page.via ? '\nԳրաֆի կապով՝ ' + page.via : '') +
    '\n' + [...page.excerpts].map(text=>'• '+text).join('\n')).join('\n\n') :
    (lookup.query ? 'Այս թեմայով համապատասխան հատված չգտա։' : 'Գրիր թեմայի անունը կամ նյութի համարը։');
  const web = webSources.slice(0,4);
  const publicResults = web.map((item,index) => '['+(index+pages.length+1)+'] '+item.title+
    ' · '+item.publisher+'\n'+item.text).join('\n\n');
  const heading = lookup.original ? 'Որոնում՝ «'+lookup.original+'»' : '';
  const sections = [heading,'Քո նյութերից\n'+files];
  if (web.length) sections.push('Համացանցից\n'+publicResults);
  else if (unavailable) sections.push('Համացանցային որոնումն այժմ անհասանելի է։');
  else if (searched) sections.push('Համացանցում համապատասխան հայերեն աղբյուր չգտա։');
  return {
    answer:sections.filter(Boolean).join('\n\n'),
    sources:pages.map(({number,title,label},index)=>({number,title,label,index:index+1})),
    webSources:web.map(({url,title,publisher},index)=>({url,title,publisher,index:index+pages.length+1}))
  };
}

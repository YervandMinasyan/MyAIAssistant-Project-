const LECTURE = /(?:դասախոսության?\p{L}*|դասախոսություն\p{L}*|\b(?:lekci\w*|lekic\w*|lektsi\w*|leksi\w*|dasaxos\w*|dasakhos\w*|lecture)\b)/iu;
const LECTURE_ACTION = /(?:կազմ|սարք|ստեղծ|գրիր|պատրաստ|վերած|դարձր|տուր|\b(?:kazm\w*|sar[qk]\w*|stex\w*|gri(?:r)?|patrast\w*|verac\w*|dardz\w*|tur|write|create|prepare|make|give)\b)/iu;
const WEB = /(?:համացանց|ինտերնետ|\b(?:internet\w*|internewt\w*|hamacanc\w*|hamatsants\w*|online|web search|search the web)\b)/iu;
const WEB_ACTION = /(?:փնտր|որոն|ստուգ|նայիր|նայի|գտի|\b(?:pnt\w*|voron\w*|stug\w*|nay\w*|gt\w*|proqpr\w*|search|lookup|look|find|check)\b)/iu;
const THIS_MATERIAL = /(?:այս\s+(?:նյութ|ֆայլ|pdf)|նյութի\s+վերաբերյալ|\b(?:ays|es|ayd|this)\s+(?:nyut\w*|nut\w*|pdf\w*|material)\b)/iu;
const WEB_HOSTS = new Set(['en.wikipedia.org','hy.wikipedia.org','en.wikibooks.org','developer.mozilla.org']);
const QUERY_FILLER = /^(?:դասախոսություն\p{L}*|կազմ\p{L}*|սարք\p{L}*|ստեղծ\p{L}*|պատրաստ\p{L}*|գրիր|տուր|գտ\p{L}*|փնտր\p{L}*|որոն\p{L}*|համացանց\p{L}*|ինտերնետ\p{L}*|թեմայով|թեմա|հիման|վրա|մասին|վերաբերյալ|նյութ\p{L}*|այս|այդ|ու|և|եւ|ինձ|ինձնից|համար(?:ի|ից)?|ինչ|ինչպես|ինչու|է|եմ|ես|են|կարող|կուզեի|պետք|խնդրում|աշխատում|դաս(?:ը|ի)?|հարցանոց|թեստ|ստուգողական|lesson|lecture|web|online|search|look|find|write|explain|how|does|works|using|about|on|for|in|the|me|internet\w*|hamacanc\w*|lekci\w*|lekic\w*|lektsi\w*|leksi\w*|dasaxos\w*|kazm\w*|sar[qk]\w*|stex\w*|gri(?:r)?|patrast\w*|tur|pnt\w*|voron\w*|gtir|veraberyal|masin|temayov|himan|vra|inch|inc|inchpes|incpes|es|ays|ayd|indz|hamar|nyut\w*|e|u|ev|y|pes|armenian|pdf)$/iu;

export function researchIntent(prompt,details,enabled) {
  const lecture = LECTURE.test(prompt) && (LECTURE_ACTION.test(prompt) || details.references.length > 0 || LECTURE.test(prompt.trim().split(/\s/)[0]));
  return {lecture,web:enabled || lecture || (WEB.test(prompt) && WEB_ACTION.test(prompt)),thisMaterial:THIS_MATERIAL.test(prompt)};
}

export function researchTopic(value) {
  return value.replace(/```[\s\S]*?(?:```|$)|`[^`\n]*`/gu,' ')
    .replace(/https?:\/\/\S+|(?:^|\s)\S+@\S+\.\S+/gu,' ')
    .replace(/[՞՜՛]/gu,'')
    .replace(/(?:\b[nN]\s*[-‐‑–—]?\s*|[№#]\s*)\d+(?:[-‐‑–—][\p{L}]+)?|\.(?:pdf|epub|txt|text|md)$/giu,' ')
    .replace(/([A-Za-z0-9])-(?:ի|ը|ից|ով|ում|ին|ն)(?![\p{L}\p{N}])/gu,'$1')
    .split(/[^\p{L}\p{N}./+-]+/u).map(word=>word.replace(/^[./]+|[./]+$/gu,''))
    .map(word=>word.replace(/^արգումենտ(?:ները|ների|ներից|ին|ը|ն|ի|ից|ով|ում)$/u,'արգումենտ'))
    .filter(word => word.length > 1 && !QUERY_FILLER.test(word))
    .slice(0,12).join(' ').slice(0,150).trim();
}

export function allowedResearchLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && WEB_HOSTS.has(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

export async function fetchResearch(query,original,{includeEnglish=false}={}) {
  const response = await fetch('/api/research',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,original,includeEnglish}),signal:AbortSignal.timeout(8500)
  });
  if (!response.ok) throw new Error('Search unavailable');
  const result = await response.json();
  if (!Array.isArray(result?.sources)) throw new Error('Invalid search result');
  return result.sources.filter(source => typeof source?.title === 'string' && typeof source.text === 'string' &&
    allowedResearchLink(source.url) && (includeEnglish || source.language==='hy')).slice(0,5);
}

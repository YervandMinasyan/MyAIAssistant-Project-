const REFERENCE_SITES = [
  {host:'hy.wikipedia.org',publisher:'Վիքիպեդիա',language:'hy'},
  {host:'en.wikipedia.org',publisher:'Wikipedia',language:'en'},
  {host:'en.wikibooks.org',publisher:'Wikibooks',language:'en'}
];
const TECH_TOPIC = /(?:javascript|typescript|react|node\.?js|html|css|\bweb\b|firefox|browser|http|ընթերցիչ)/i;
const TECH_REFERENCE_TITLES = ['JavaScript','TypeScript','TCP/IP','HTML','CSS','Python','SQL','React'];
const SOURCE_LIMIT = 5;
const USER_AGENT = 'MyAIAssistant/1.0 (https://dasaran-study.kindheartedshortbread3.chatgpt.site/)';

function researchResponse(value,status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
}

async function referenceJson(url,timeout=4000) {
  const response = await fetch(url,{headers:{'User-Agent':USER_AGENT,'Accept':'application/json'},
    signal:AbortSignal.timeout(timeout)});
  if (!response.ok) throw new Error('Reference provider unavailable');
  return response.json();
}

function rankText(text) {
  return typeof text === 'string' ? text.replace(/\s+/g,' ').trim().slice(0,850) : '';
}

function wikiEntry(source,pageid,title,extract) {
  const text = rankText(extract);
  if (text.length < 75 || typeof title !== 'string' || !Number.isInteger(pageid) ||
      (source.language==='hy' && (text.match(/[ա-ֆԱ-Ֆև]/gu) || []).length < 25)) return [];
  return [{title:title.slice(0,180),text,publisher:source.publisher,language:source.language,
    url:'https://' + source.host + '/?curid=' + pageid}];
}

async function searchWikiAction(source,query) {
  const endpoint = new URL('https://' + source.host + '/w/api.php');
  endpoint.search = new URLSearchParams({
    action:'query',generator:'search',gsrsearch:query,gsrnamespace:'0',gsrlimit:'4',
    prop:'info|extracts',inprop:'url',exintro:'1',explaintext:'1',exlimit:'max',exchars:'900',
    format:'json',formatversion:'2',maxlag:'5'
  });
  const result = await referenceJson(endpoint);
  if (result.error) throw new Error('Wiki provider unavailable');
  const pages = Array.isArray(result.query?.pages) ? result.query.pages.filter(Boolean) : [];
  const sources = pages.sort((left,right) => left.index-right.index)
    .flatMap(page=>page.missing ? [] : wikiEntry(source,page.pageid,page.title,page.extract));
  if (pages.length && !sources.length) throw new Error('Wiki result has no readable excerpts');
  return sources;
}

async function searchWikiTitle(source,title) {
  const endpoint = new URL('https://' + source.host + '/w/api.php');
  endpoint.search = new URLSearchParams({action:'query',titles:title,redirects:'1',prop:'extracts',
    exintro:'1',explaintext:'1',exchars:'900',format:'json',formatversion:'2'});
  const result = await referenceJson(endpoint,3000);
  if (result.error) throw new Error('Wiki provider unavailable');
  const page = result.query?.pages?.[0];
  if (!page || page.missing) return [];
  return wikiEntry(source,page.pageid,page.title,page.extract);
}

async function searchWiki(source,query) {
  try {
    return await searchWikiAction(source,query);
  } catch {
    const endpoint = new URL('/w/rest.php/v1/search/page','https://' + source.host);
    endpoint.search = new URLSearchParams({q:query,limit:'4'});
    const result = await referenceJson(endpoint,3500);
    if (!Array.isArray(result.pages)) throw new Error('Wiki search returned no page list');
    return result.pages.filter(Boolean).flatMap(page => {
      const text = [page.description,page.excerpt].filter(part=>typeof part === 'string').join(' · ')
        .replace(/<[^>]*>/gu,'').replace(/&(?:nbsp|amp|lt|gt|quot|#039);/gu,entity =>
          ({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#039;':"'"})[entity]);
      return wikiEntry(source,page.id,page.title,text);
    });
  }
}

async function searchMdn(query) {
  const endpoint = new URL('https://developer.mozilla.org/api/v1/search');
  endpoint.search = new URLSearchParams({q:query,locale:'en-US'});
  const result = await referenceJson(endpoint);
  if (!Array.isArray(result.documents)) throw new Error('MDN search returned no document list');
  return result.documents.slice(0,8).filter(Boolean).flatMap(page => {
    const text = rankText(page.summary);
    if (!text || typeof page.title !== 'string' || typeof page.mdn_url !== 'string' || !page.mdn_url.startsWith('/en-US/docs/')) return [];
    return [{title:page.title.slice(0,180),text,publisher:'MDN Web Docs',language:'en',url:'https://developer.mozilla.org' + page.mdn_url}];
  });
}

function referenceTerms(topic) {
  return [...new Set(topic.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}./+#-]*/gu) || [])]
    .map(word=>word.replace(/[./-]+$/u,'')).filter(word=>word.length>1);
}

function referenceScore(source,keywords,required) {
  const title = referenceTerms(source.title);
  const text = referenceTerms(source.text);
  const contains = (words,keyword) => /[ա-ֆև]/u.test(keyword) && keyword.length >= 4 ?
    words.some(word=>word.startsWith(keyword)) : words.includes(keyword);
  if (required && !contains(title,required) && !contains(text,required)) return 0;
  return keywords.reduce((score,word) => score + (contains(title,word) ? 4 : contains(text,word) ? 1 : 0),0);
}

async function searchReferences(request) {
  if (request.method !== 'POST') return researchResponse({error:'Method not allowed'},405);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) {
    return researchResponse({error:'Invalid origin'},403);
  }
  let input;
  try {
    const body = await request.text();
    if (body.length > 1600) return researchResponse({error:'Payload too large'},413);
    input = JSON.parse(body);
  } catch {
    return researchResponse({error:'Invalid JSON'},400);
  }
  if (typeof input?.query !== 'string' || input.query.length > 160 || !/[\p{L}\p{N}]/u.test(input.query)) {
    return researchResponse({error:'Invalid search topic'},400);
  }
  const primary = input.query.trim();
  const secondary = typeof input.original === 'string' && input.original.length <= 160 && /[\u0530-\u058f]/u.test(input.original)
    ? input.original.trim() : primary;
  const sites = input.includeEnglish === true ? REFERENCE_SITES : [REFERENCE_SITES[0]];
  const lookups = sites.map(site => searchWiki(site,site.language === 'hy' ? secondary : primary));
  const primaryTerms = referenceTerms(primary);
  const secondaryTerms = referenceTerms(secondary);
  const technicalTerm = TECH_REFERENCE_TITLES.find(title=>secondaryTerms.includes(title.toLowerCase()));
  if (technicalTerm && secondaryTerms.length > 1) lookups.push(searchWikiTitle(REFERENCE_SITES[0],technicalTerm));
  if (input.includeEnglish === true && TECH_TOPIC.test(primary)) lookups.push(searchMdn(primary));
  const outcomes = await Promise.allSettled(lookups);
  const lists = outcomes.flatMap(outcome => outcome.status === 'fulfilled' ? [outcome.value] : []);
  if (!lists.length) return researchResponse({error:'Search providers unavailable'},502);
  const ranked = lists.flatMap(list => list.map((source,position) => ({
    source,score:referenceScore(source,source.language === 'hy' ? secondaryTerms : primaryTerms,
      source.language === 'hy' && technicalTerm ? technicalTerm.toLowerCase() : ''),
    position
  }))).filter(item=>item.score>0).sort((a,b) => b.score-a.score || a.position-b.position);
  const sources = [];
  const publishers = new Map();
  const seen = new Set();
  for (const {source} of ranked) {
    if (sources.length >= SOURCE_LIMIT || seen.has(source.url) || (publishers.get(source.publisher) || 0) >= 2) continue;
    seen.add(source.url);
    sources.push(source);
    publishers.set(source.publisher,(publishers.get(source.publisher) || 0)+1);
  }
  return researchResponse({sources});
}

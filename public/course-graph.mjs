import { matches, phonetic, snippets, terms } from './study.mjs';
import { normalizeArmenianInput, oneSpellingEdit } from './armenian-input.mjs';
import { bilingualTopic } from './study-terms.mjs';
import { multipleChoice } from './quiz.mjs';

const normalize = text => text.normalize('NFKC').toLowerCase().replaceAll('և','եւ').replace(/\s*\/\s*/gu,'/');
const aliasGroups = [
  ['Ֆունկցիա','function','functions','ֆունկցիա','ֆունկցիաներ','funkcia','funktsia'],
  ['Պարամետր','parameter','parameters','պարամետր','parametr'],
  ['Արգումենտ','argument','arguments','արգումենտ','argoument'],
  ['Վերադարձվող արժեք','return value','return','վերադարձվող արժեք','վերադարձնել'],
  ['Ռեկուրսիա','recursion','recursive','ռեկուրսիա','ռեկուրսիվ','rekursia'],
  ['Կանգի պայման','base case','termination condition','կանգի պայման','բազային դեպք','կանգի պայմանի'],
  ['Կանչերի կույտ','call stack','կանչերի կույտ','կանչերի ստեկ','ստեկ'],
  ['Փոփոխական','variable','variables','փոփոխական','poxoxakan'],
  ['Բրաուզեր','browser','բրաուզեր','դիտարկիչ'],
  ['Սերվեր','server','սերվեր'],
  ['Հղում','hyperlink','link','հղում','hxum','hghum'],
  ['Վերնագիր','heading','headings','վերնագիր'],
  ['Դասավորություն','layout','դասավորություն','դասավորության','dasavorutyun'],
  ['Չափ','size','չափ'],
  ['Գույն','color','colour','գույն','գույնի','գույնը','guyn'],
  ['Հակադրություն','contrast','հակադրություն','հակադրության'],
  ['Տեսողական հիերարխիա','visual hierarchy','տեսողական հիերարխիա','tesoxakan hierarxia'],
  ['Հասանելիություն','accessibility','հասանելիություն','հասանելիության'],
  ['Տվյալների բազա','database','databases','տվյալների բազա','tvyalneri baza'],
  ['Գիտելիքների գրաֆ','knowledge graph','գիտելիքների գրաֆ','գիտելիքի գրաֆ','gitelikneri graf'],
  ['Հանգույց','node','nodes','հանգույց','հանգույցներ','hanguyc'],
  ['Կող','edge','edges','կող'],
  ['GraphRAG','graphrag','graph rag','գրաֆով որոնում'],
  ['RAG','rag','retrieval augmented generation','retrieval-augmented generation'],
  ['OSI model','open systems interconnection model','osi','osi մոդել','մոդել osi','մодель osi'],
  ['TCP/IP','tcp/ip model','tcp/ip protocol suite','internet protocol suite','tcp-ip','tcp ip','tcp/ip մոդել','модель tcp/ip'],
  ['Physical layer','physical layer','ֆիզիկական շերտ','ֆիզիկական մակարդակ','физический уровень'],
  ['Data Link layer','data link layer','data-link layer','տվյալների կապի շերտ','կապուղային շերտ','канальный уровень'],
  ['Network layer','network layer','ցանցային շերտ','ցանցային մակարդակ','сетевой уровень'],
  ['Transport layer','transport layer','տրանսպորտային շերտ','փոխադրման շերտ','транспортный уровень'],
  ['Session layer','session layer','նիստի շերտ','սեանսային շերտ','сеансовый уровень'],
  ['Presentation layer','presentation layer','ներկայացման շերտ','уровень представления'],
  ['Application layer','application layer','կիրառական շերտ','հավելվածների շերտ','прикладной уровень'],
  ['Internet layer','internet layer','ինտերնետային շերտ','межсетевой уровень'],
  ['Network Access layer','network access layer','link layer','ցանցային հասանելիության շերտ','уровень сетевого доступа'],
  ['Transmission Control Protocol (TCP)','transmission control protocol','tcp'],
  ['Internet Protocol (IP)','internet protocol','ip']
];

const standaloneTopics = new Set([
  'OSI model','TCP/IP','Physical layer','Data Link layer','Network layer','Transport layer','Session layer',
  'Presentation layer','Application layer','Internet layer','Network Access layer','Transmission Control Protocol (TCP)',
  'Internet Protocol (IP)','Ռեկուրսիա','Կանգի պայման','Կանչերի կույտ','Տեսողական հիերարխիա','Տվյալների բազա',
  'Գիտելիքների գրաֆ','GraphRAG','RAG'
]);
const networkModels = new Set(['OSI model','TCP/IP']);
const layerNames = new Map([...standaloneTopics].filter(label=>label.endsWith(' layer'))
  .map(label=>[normalize(label.slice(0,-6)),label]));

const armenianEnding = '(?:-?(?:ների|ներից|ներով|ները|ներն|ներում|ներ|երի|երից|երով|երը|երն|երում|եր|յին|յից|յով|յի|ին|ից|ով|ում|ի|ը|ն))?';
const latinEnding = '(?:-?(?:s|es|ayi|ayic|ayin|yi|yic|yin|y|n|i|ic|its|ov|um|neri|nery|ner))?';
const wordPattern = word => {
  const suffix = /[ա-ֆ]$/u.test(word) ? armenianEnding : (word.length >= 3 ? latinEnding : '') + '(?:-(?:ի|ից|ը|ն|ով|ում|ին))?';
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return escaped.replace(/ություն$/u,'ութ(?:յուն|յան)') + suffix;
};
const aliasPattern = phrase => new RegExp('(?<![\\p{L}\\p{N}_])' +
  phrase.split(/\s+/u).map(wordPattern).join('[\\s-]+') + '(?![\\p{L}\\p{N}_])','gu');
const aliases = new Map(aliasGroups.flatMap(([name,...forms]) => [name,...forms].map(form => [normalize(form), name])));
const knownTerms = [...aliases.keys()].sort((a,b)=>b.length-a.length).map(form => [aliases.get(form),aliasPattern(form)]);
const labels = {kind:'տեսակ է',part:'մաս է',uses:'օգտագործում է',includes:'ներառում է',
  requires:'պահանջում է',example:'օրինակ է',enables:'հնարավոր է դարձնում'};
export function describeRelation(graph,edge,format=label=>label) {
  const definite = label => '«' + label + '»-' + (/(?:[աեէըիոօ]|ու)$/u.test(label) ? 'ն' : 'ը');
  const from = format(graph.nodes.get(edge.from).label);
  const to = format(graph.nodes.get(edge.to).label);
  if (edge.type === 'compares') return 'Նյութում համեմատվում են «' + from + '» և «' + to + '» թեմաները։';
  if (edge.type === 'section') return '«' + to + '» ենթաթեման ներկայացված է «' + from + '» բաժնում։';
  return ['part','kind','example'].includes(edge.type) ? definite(from) + ' «' + to + '»-ի ' + labels[edge.type] :
    definite(from) + ' ' + labels[edge.type] + ' ' + definite(to);
}
const stated = [
  ['kind', /\b(?:is|are) (?:a |an )?(?:type|kind|form) of\b/gu],
  ['example', /\b(?:is|are) (?:an? )?examples? of\b/gu],
  ['part', /\b(?:is|are) (?:an? )?parts? of\b/gu],
  ['uses', /\b(?:uses?|relies on)\b|օգտագործում է|կիրառում է/gu],
  ['includes', /\b(?:includes?|contains?|consists of|is made up of)\b|\bhas(?=\s+(?:[\p{L}\d-]+\s+){0,2}layers?\s*:)|պարունակում է|ներառում է|բաղկացած է|включает|состоит из/gu],
  ['requires', /\b(?:requires?|depends on)\b|պահանջում է|կախված է/gu],
  ['enables', /\b(?:enables?|allows? for)\b|հնարավոր է դարձնում/gu]
];
const inverted = [
  ['kind', /(?:տեսակ|ձեւ) է/gu], ['part', /մաս է/gu], ['example', /օրինակ է/gu]
];
const graphByCourse = new Map();

function stripInflection(word) {
  if (word.endsWith('ության')) return word.replace(/ության$/u,'ություն');
  const stem = word.replace(/-?(?:ներից|ներով|ներում|ների|ները|ներն|երում|երից|երով|երի|երը|երն|յից|յով|յին|ից|ով|ում|ը|ն)$/u,'');
  return stem.length >= 4 ? stem : word;
}

function materialIndex(material) {
  const {number,title,pages} = material;
  const split = pages.flatMap(page => {
    const parts = snippets([page]);
    if (parts.length || !/[\p{L}]{3}/u.test(page.text)) return parts;
    return [{label:page.label,text:page.text.trim()}];
  });
  const passages = split.map((part,index) => ({
    ...part,id:number + ':' + index,number,title,tokens:[...new Set(terms(part.text))]
  }));
  const titleText = normalize(title).replace(/\.(?:pdf|epub|md|txt|docx?|png|jpe?g|webp|gif)$/u,'');
  const titleWords = terms(titleText);
  return {number,title,pages,passages,titleWords};
}

function sameMaterial(index, material) {
  return index && index.title === material.title && index.pages.length === material.pages.length &&
    index.pages.every((page,i) => page.label === material.pages[i].label && page.text === material.pages[i].text);
}

function topicOccurrences(text, phrases = new Map()) {
  const occurrences = [];
  const subject = normalize(text);
  const add = (label,start,end) => occurrences.push({id:normalize(label),label,start,end});
  for (const [label,pattern] of knownTerms) {
    for (const match of subject.matchAll(pattern)) {
      const end = match.index + match[0].length;
      if (!occurrences.some(item=>item.start <= match.index && item.end >= end)) add(label,match.index,end);
    }
  }
  const list = /\blayers?\s*:\s*/u.exec(subject);
  if (list && occurrences.some(item=>networkModels.has(item.label) && item.end<=list.index)) {
    const start = list.index+list[0].length;
    const items = subject.slice(start).split(/[.!?։]/u,1)[0];
    for (const item of items.matchAll(/(?:^|[,;]\s*|\band\s+)([a-z -]+?)(?=\s*(?:[,;]|\band\b|$))/gu)) {
      const name = item[1].trim().replaceAll('-',' ');
      const label = layerNames.get(name);
      const position = start+item.index+item[0].indexOf(item[1]);
      if (label && !occurrences.some(found=>found.start<=position && found.end>=position+name.length)) {
        add(label,position,position+name.length);
      }
    }
  }
  const scan = subject.matchAll(/[\p{L}\p{N}][\p{L}\p{N}_-]*/gu);
  const words = [...scan];
  for (const word of words) {
    const key = word[0];
    const candidates = phrases.get(key) || phrases.get(key.replace(/(?:es|s|յի|ի)$/u,'')) ||
      phrases.get(key.replace(/ության$/u,'ություն')) || phrases.get(stripInflection(key)) || [];
    for (const {pattern,label} of candidates) {
      const match = pattern.exec(subject.slice(word.index));
      if (!match || occurrences.some(item=>item.start <= word.index && item.end >= word.index+match[0].length)) continue;
      add(label,word.index,word.index+match[0].length);
    }
  }
  let coveredEnd = -1;
  return occurrences.sort((a,b)=>a.start-b.start || b.end-a.end).filter(item=>{
    if (item.end <= coveredEnd) return false;
    coveredEnd = item.end;
    return true;
  });
}

const headingPrefix = /^\s*(#{1,6}\s+|(?:chapter|section|lesson|unit|գլուխ|բաժին|դաս|глава|раздел)\s+\d+(?:[.\s:–—-]+|$)|(\d{1,2}(?:\.\d{1,2})*)[.)]?\s+)?/iu;
const genericTopic = /^(?:(?:intro(?:duction)?|outline|overview|(?:table of )?contents|summary|conclusion|examples?|exercise|activity|agenda|(?:review )?questions|objectives|further reading|key takeaways|notes|homework|lesson|chapter|section|unit|document|slides?|presentation|untitled|pdf|page|material|lecture|lecture notes|համառոտում|ներածություն|բովանդակություն|ամփոփում|եզրակացություն|օրինակներ?|(?:կրկնության )?հարցեր|ուսուցման նպատակներ|թեստ|առաջադրանք|տնային աշխատանք|նյութ|դաս|գլուխ|բաժին|էջ|դասախոսություն|введение|содержание|итоги|пример|страница|лекция|презентация|конспект|контрольные вопросы)(?:[\s_-]*\d+)?)$/iu;
const excludedTopic = /^(?:draft|page|confidential|copyright|all rights|prepared by|author|slide \d|team \d|course \d|հեղինակ|պատրաստել|էջ\s*\d|автор|подготовил)|https?:|@|^\d{3,}$/iu;
const countedGroup = /^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|multiple|մեկ|երկու|երեք|չորս|հինգ|վեց|յոթ|ութ|ինը)\s+(?:layers?|parts?|types?|steps?|levels?|components?|շերտեր?|մասեր?|մակարդակներ?)$/iu;

function cleanTopicLabel(value) {
  const text = value.replace(/\.(?:pdf|epub|md|txt|text|docx?|png|jpe?g|webp|gif|avif)$/iu,'')
    .replace(headingPrefix,'').replace(/^\s*(?:introduction to|overview of|ներածություն՝?|введение в)\s*:?[\s]+/iu,'')
    .replace(/[:։՝]+$/u,'').trim();
  const words = text.match(/\p{L}[\p{L}\p{N}'/-]*/gu) || [];
  if (text.length < 3 || text.length > 88 || !words.length || words.length > 9 || /[.!?։;]$/u.test(text) ||
      genericTopic.test(text) || excludedTopic.test(text) || countedGroup.test(text) || !words.some(word=>word.length >= 3)) return '';
  return text;
}

function materialHeadings(material) {
  const passagesByPage = new Map();
  for (const passage of material.passages) {
    if (!passagesByPage.has(passage.label)) passagesByPage.set(passage.label,[]);
    passagesByPage.get(passage.label).push(passage);
  }
  const title = cleanTopicLabel(material.title);
  const sections = [];
  for (const page of material.pages) {
    const passages = passagesByPage.get(page.label);
    if (!passages) continue;
    const lines = page.text.split(/\r?\n/gu).map(line=>line.trim()).filter(Boolean);
    for (const [index,line] of lines.entries()) {
      const prefix = line.match(headingPrefix);
      const numbered = prefix?.[2];
      const label = cleanTopicLabel(line);
      const nextLine = lines[index+1] || '';
      if (!label || /^[-•●▪–—]/u.test(line)) continue;
      const marked = prefix?.[1] || /[:՝]$/u.test(line);
      const standalone = index === 0 && ((lines.length===1 && line.length<=45) ||
        (/^\p{Lu}/u.test(line) && nextLine.length >= line.length+16));
      if (!marked && !standalone) continue;
      const name = normalize(label);
      const match = passages.find(item=>normalize(item.text.replace(headingPrefix,'')).startsWith(name));
      const level = numbered ? numbered.split('.').length : prefix?.[1]?.startsWith('#') ? prefix[1].trim().length : 0;
      sections.push({label,level,passage:match || passages[0]});
    }
  }
  return {title:title && material.passages.length ? {label:title,passage:material.passages[0]} : null,sections};
}

function namedPhrases(materials,passages) {
  const phrases = new Map();
  const definitions = new Map();
  const outlines = new Map();
  const leadingHeadings = new Map();
  const phrase = '[a-z][a-z0-9_/-]*(?: +[a-z][a-z0-9_/-]*){0,3}';
  const left = new RegExp('^(?:a |an |the )?(' + phrase + ')$', 'i');
  const right = new RegExp('^(?:a |an |the )?(' + phrase + '?)(?= *[.!?,;:()]|$| +(?:that|which|while|and|or|used for|designed to)\\b)','i');
  const invalid = /\b(?:i|we|they|she|he|you|it|can|must|is|are|was|were|not|does|that|this|these|the|and|or|for|how|if|of|in|to|a|an|which|with|from|also|through|can|been)\b/iu;
  const armenianHead = /^[ա-ֆ-]+$/u;
  function record(value) {
    if (!value || value.length < 3 || !/[\p{L}]{2}/u.test(value)) return '';
    const key = normalize(value);
    if (aliases.has(key)) return aliases.get(key);
    if (phrases.has(key)) return phrases.get(key).label;
    const source = aliasPattern(key).source;
    phrases.set(key,{pattern:new RegExp('^' + source.replace(/^\(\?<[^)]+\)/u,''),'u'),label:value});
    return value;
  }
  function heading(value) {
    const topics = [...new Set(topicOccurrences(value).map(item=>item.label))];
    return topics.length ? topics : [record(value)].filter(Boolean);
  }
  for (const material of materials) {
    const outline = materialHeadings(material);
    const title = outline.title ? {...outline.title,labels:heading(outline.title.label)} : null;
    const sections = outline.sections.map(section=>({...section,labels:heading(section.label)}));
    outlines.set(material.number,{title,sections});
    for (const section of sections) {
      if (!leadingHeadings.has(section.passage.id)) leadingHeadings.set(section.passage.id,section.label);
    }
  }
  const technicalDefinition = /\b(?:is (?:an?|the) |refers to |stands for )|\s(?:—|–)\s|\sэто\s/giu;
  const armenianDefinition = /^(?:[ա-ֆ]+\s+){0,3}(?:գործընթաց|եղանակ|մեթոդ|սկզբունք|կառուցվածք|երեւույթ|համակարգ|մոդել) է(?=$|[\s,։])/u;
  const definitionTail = /\b(?:is|are)\s+(?:an?|the)\b|\b(?:means|describes|defines)\b|(?:նշանակում է|կոչվում է|սահմանվում է)/giu;
  for (const passage of passages) {
    const label = leadingHeadings.get(passage.id);
    const body = passage.text.replace(headingPrefix,'');
    const original = label && normalize(body).startsWith(normalize(label) + ' ') ? body.slice(label.length).trim() : passage.text;
    for (const [,pattern] of stated) {
      for (const match of original.matchAll(pattern)) {
        if (!/^[a-z]/iu.test(match[0])) continue;
        const before = left.exec(original.slice(0,match.index).trim());
        const after = right.exec(original.slice(match.index+match[0].length).trim());
        if (before && after && !invalid.test(before[1]) && !invalid.test(after[1])) {
          record(cleanTopicLabel(before[1]));
          record(cleanTopicLabel(after[1]));
        }
      }
    }
    for (const [,pattern] of inverted) {
      for (const match of original.matchAll(pattern)) {
        const prefix = normalize(original.slice(0,match.index).trim()).split(/\s+/u);
        if (prefix.length > 6 || prefix.some(word=>!armenianHead.test(word))) continue;
        const division = prefix.findIndex((word,i)=>i<3 && /[ըն]$/u.test(word) && !/ական$/u.test(word));
        if (division < 0 || division >= prefix.length-1 || prefix.length-division > 4) continue;
        const object = prefix.slice(division+1).join(' ');
        if (!/(?:ության|յի|ի)$/u.test(object)) continue;
        record(cleanTopicLabel(prefix.slice(0,division+1).join(' ').replace(/-?[ըն]$/u,'')));
        record(cleanTopicLabel(object.replace(/ության$/u,'ություն').replace(/(?:յի|ի)$/u,'')));
      }
    }
    const match = [...original.matchAll(technicalDefinition)].find(item=>item.index>0 && item.index<76);
    if (match) {
      const subject = original.slice(0,match.index).trim().replace(/^(?:a|an|the)\s+/iu,'');
      const valid = cleanTopicLabel(subject);
      if (valid && !invalid.test(valid) && original.length > match.index+match[0].length+10) {
        const labels = heading(valid);
        if (labels.length) definitions.set(passage.id,labels);
      }
    }
    if (!definitions.has(passage.id)) {
      const words = normalize(original).split(/\s+/u);
      const end = words.slice(0,3).findIndex((word,index)=>/[ըն]$/u.test(word) && !/(?:ական|ային)$/u.test(word) &&
        armenianDefinition.test(words.slice(index+1).join(' ')));
      const valid = end < 0 ? '' : cleanTopicLabel(words.slice(0,end+1).join(' ').replace(/-?[ըն]$/u,''));
      if (valid && !/^(?:սա|դա|այս|այն|նա)(?:\s|$)/u.test(valid)) definitions.set(passage.id,heading(valid));
    }
    if (!definitions.has(passage.id) && [...original.matchAll(definitionTail)].some(item=>item.index<=80)) {
      const first = topicOccurrences(original)[0];
      if (first?.start<=5) definitions.set(passage.id,[first.label]);
    }
  }
  const byFirst = new Map();
  for (const [name,item] of phrases) {
    const first = name.split(' ')[0];
    if (!byFirst.has(first)) byFirst.set(first,[]);
    byFirst.get(first).push(item);
  }
  for (const list of byFirst.values()) list.sort((a,b)=>b.label.length-a.label.length);
  return {phrases:byFirst,definitions,outlines};
}

function findRelationships(text, mentions) {
  const source = normalize(text);
  const relations = [];
  const nearby = (start,end) => {
    const left = mentions.filter(item => item.end <= start && start-item.end <= 85);
    const right = mentions.find(item => item.start >= end && item.start-end <= 80);
    return {left,right};
  };
  for (const [type,pattern] of stated) {
    for (const match of source.matchAll(pattern)) {
      const {left,right} = nearby(match.index,match.index+match[0].length);
      const subject = left.at(-1);
      if (!subject || !right || subject.id === right.id) continue;
      const before = source.slice(subject.end,match.index);
      const after = source.slice(match.index+match[0].length,right.start);
      if (!/^[\s,՝-]*(?:(?:directly|typically|usually)\s+)?$/u.test(before)) continue;
      const listed = type === 'includes' && /^[\s\p{L}\d-]{1,55}[:՝]\s*$/u.test(after);
      if (!listed && !/^[\s,՝-]*(?:(?:a|an|the)\s+)?$/u.test(after)) continue;
      relations.push([subject.id,right.id,type]);
      if (type === 'includes' || type === 'uses') {
        let prior = right;
        for (const item of mentions.filter(item=>item.start>=right.end).slice(0,9)) {
          const separator = source.slice(prior.end,item.start);
          if (!/^\s*(?:[,;]\s*(?:(?:and|և|եւ|ու|и)\s+)?|(?:and|և|եւ|ու|и)\s+)$/u.test(separator)) break;
          if (item.id !== subject.id) relations.push([subject.id,item.id,type]);
          prior = item;
        }
      }
    }
  }
  for (const [type,pattern] of inverted) {
    for (const match of source.matchAll(pattern)) {
      const {left} = nearby(match.index,match.index+match[0].length);
      const [subject,object] = left.slice(-2);
      if (subject && object && subject.id !== object.id &&
          /^\s+$/u.test(source.slice(subject.end,object.start)) &&
          /^\s+$/u.test(source.slice(object.end,match.index))) relations.push([subject.id,object.id,type]);
    }
  }
  for (const [index,first] of mentions.slice(0,-1).entries()) {
    const second = mentions[index+1];
    if (first.id === second.id) continue;
    const between = source.slice(first.end,second.start);
    const comparison = /^\s*(?:vs\.?|versus|differs from|compared (?:with|to)|ի տարբերություն|տարբերվում է|в отличие от)\s*$/u.test(between) ||
      (/^(?:a |the )?(?:comparison (?:of|between)|compare|համեմատություն|сравнение)/u.test(source) &&
        /^\s*(?:and|եւ|և|ու|и|,)\s*$/u.test(between));
    if (comparison) relations.push([first.id,second.id,'compares']);
  }
  return relations;
}

function buildGraph(materials) {
  const passages = materials.flatMap(item=>item.passages);
  const {phrases,definitions,outlines} = namedPhrases(materials,passages);
  const index = new Map();
  const armenianByInitial = new Map();
  const byId = new Map(passages.map(passage=>[passage.id,passage]));
  const nodes = new Map();
  const links = new Map();
  const mentions = new Map();

  function addTopic(label,passage,priority) {
    const id = normalize(label);
    if (!nodes.has(id)) nodes.set(id,{id,label,passages:new Set(),edges:[],priority:0,examples:[]});
    const node = nodes.get(id);
    node.priority = Math.max(node.priority,priority);
    node.passages.add(passage.id);
    if (priority >= 3 && !node.examples.includes(passage.id)) node.examples.push(passage.id);
    return node;
  }

  function link(from,to,type,passage,quote) {
    if (from === to) return;
    const [parent,child] = type==='compares' ? [from,to].sort() : [from,to];
    const key = [parent,child,type].join('::');
    if (!links.has(key)) links.set(key,{from:parent,to:child,type,passages:new Set(),quotes:new Map()});
    const edge = links.get(key);
    edge.passages.add(passage.id);
    if (!edge.quotes.has(passage.id)) edge.quotes.set(passage.id,quote);
  }

  function addFacts(text,found,passage) {
    const labels = new Map(found.map(item=>[item.id,item.label]));
    for (const [from,to,type] of findRelationships(text,found)) {
      addTopic(labels.get(from),passage,2);
      addTopic(labels.get(to),passage,2);
      link(from,to,type,passage,text);
    }
  }

  for (const passage of passages) {
    for (const token of passage.tokens) {
      const sound = phonetic(token);
      if (!index.has(sound)) index.set(sound,new Set());
      index.get(sound).add(passage.id);
      if (!/[ա-ֆ]/u.test(token)) continue;
      const key = phonetic(stripInflection(token));
      if (key.length < 5) continue;
      if (!armenianByInitial.has(key[0])) armenianByInitial.set(key[0],new Set());
      armenianByInitial.get(key[0]).add(key);
    }
    const found = topicOccurrences(passage.text,phrases);
    mentions.set(passage.id,found);
    for (const label of definitions.get(passage.id) || []) addTopic(label,passage,3);
    for (const item of found) {
      if (standaloneTopics.has(item.label)) addTopic(item.label,passage,1);
    }
    addFacts(passage.text,found,passage);
  }

  for (const {title,sections} of outlines.values()) {
    const titleNodes = title ? title.labels.map(label=>addTopic(label,title.passage,5)) : [];
    const root = titleNodes.length===1 ? titleNodes[0] : null;
    const hierarchy = [];
    let networkModel = null;
    for (const {label,labels,level,passage} of sections) {
      const shorthand = networkModel && layerNames.get(normalize(label));
      const sectionNodes = (shorthand ? [shorthand] : labels).map(topic=>addTopic(topic,passage,4));
      addFacts(label,topicOccurrences(label,phrases),passage);
      if (level) {
        while (hierarchy.length && hierarchy.at(-1).level>=level) hierarchy.pop();
      }
      const parent = hierarchy.at(-1)?.node || root;
      for (const node of sectionNodes) {
        const container = networkModel && / layer$/u.test(node.label) ? networkModel : parent;
        if (container && container.id !== node.id) link(container.id,node.id,'section',passage,label);
      }
      if (sectionNodes.length===1) {
        const node = sectionNodes[0];
        if (networkModels.has(node.label)) networkModel = node;
        else if (!/ layer$/u.test(node.label)) networkModel = null;
        if (level) hierarchy.push({node,level});
      } else if (sectionNodes.some(node=>networkModels.has(node.label))) {
        networkModel = null;
      }
    }
  }

  // Only deliberate topics become nodes. Ordinary words remain searchable in the text index.
  for (const passage of passages) {
    for (const item of mentions.get(passage.id)) nodes.get(item.id)?.passages.add(passage.id);
  }
  for (const edge of links.values()) {
    nodes.get(edge.from).edges.push(edge);
    nodes.get(edge.to).edges.push(edge);
  }
  return {materials,passages,byId,nodes,index,phrases,armenianByInitial};
}

export function courseGraph(course) {
  const previous = graphByCourse.get(course.id);
  const earlier = new Map(previous?.materials.map(material=>[material.number,material]));
  const materials = course.materials.map(material => {
    const indexed = earlier.get(material.number);
    return sameMaterial(indexed,material) ? indexed : materialIndex(material);
  });
  if (previous && materials.length === previous.materials.length && materials.every((item,i)=>item === previous.materials[i])) return previous;
  const graph = buildGraph(materials);
  graphByCourse.set(course.id,graph);
  return graph;
}

export function forgetGraph(courseId) {
  graphByCourse.delete(courseId);
}

export function graphNeighbors(graph, id, available=null, {directOnly=false,eachRelation=false}={}) {
  const node = graph.nodes.get(id);
  if (!node) return [];
  const unique = new Map();
  const sorted = [...node.edges].sort((a,b)=>(a.type === 'section')-(b.type === 'section') || b.passages.size-a.passages.size);
  for (const edge of sorted) {
    if (directOnly && edge.type === 'section') continue;
    if (available && ![...edge.passages].some(passage=>available(graph.byId.get(passage)))) continue;
    const other = edge.from === id ? edge.to : edge.from;
    const key = eachRelation ? edge : other;
    if (!unique.has(key)) unique.set(key,{node:graph.nodes.get(other),edge});
  }
  return [...unique.values()];
}

export function graphEvidence(graph, ids) {
  return [...ids].map(id=>graph.byId.get(id));
}

export function relationQuestions(graph,id,available) {
  const node = graph.nodes.get(id);
  const questions = [];
  for (const edge of node.edges) {
    if (edge.type === 'section' || edge.type === 'compares') continue;
    const entry = graphEvidence(graph,edge.passages).find(item=>available.has(item.id));
    if (!entry) continue;
    const other = graph.nodes.get(edge.from===id ? edge.to : edge.from);
    const stated = new Set(node.edges.filter(link=>link.from===edge.from && link.to===edge.to).map(link=>link.type));
    const wrong = ['includes','uses','requires','example'].filter(type=>!stated.has(type))
      .slice(0,2).map(type=>describeRelation(graph,{...edge,type},bilingualTopic)+'։');
    if (wrong.length<2) continue;
    const correct = describeRelation(graph,edge,bilingualTopic)+'։';
    questions.push(multipleChoice(entry,'Նյութի հիման վրա ո՞ր պնդմամբ կբացատրես «'+bilingualTopic(other.label)+
      '» հասկացության կապը «'+bilingualTopic(node.label)+'» թեմայի հետ։',correct,wrong,
      'Այս հատվածում հաստատված կապն է՝ '+correct));
  }
  return questions;
}

export function questionsFromGraph(graph,entries,limit) {
  const available = new Set(entries.map(entry=>entry.id));
  const questions = new Map();
  for (const node of graph.nodes.values()) {
    if (![...node.passages].some(id=>available.has(id))) continue;
    for (const question of relationQuestions(graph,node.id,available)) {
      const source = question.sources[0];
      const key = JSON.stringify([source.number,source.label,question.options[question.correct]]);
      if (!questions.has(key)) questions.set(key,question);
      if (questions.size===limit) return [...questions.values()];
    }
  }
  return [...questions.values()];
}

export function matchingGraphTopics(graph,query) {
  if (!query) return new Set(graph.nodes.keys());
  const named = new Set(topicOccurrences(query,graph.phrases).map(item=>item.id));
  const key = phonetic(query);
  return new Set([...graph.nodes.values()].filter(node=>{
    const label = normalize(bilingualTopic(node.label));
    return label.includes(query) || named.has(node.id) || (key.length >= 2 && phonetic(label).includes(key));
  }).map(node=>node.id));
}

function relevantWords(query, words, graph, byKey = new Map(words.map(word=>[word,phonetic(word)]))) {
  let total = 0;
  for (const [word,key,similar] of query) {
    let match = byKey.has(word) ? 4 : 0;
    if (!match) {
      for (const [term,sound] of byKey) {
        if (matches(word,term)) match = Math.max(match,3);
        else if (key.length >= 3 && matches(key,sound)) match = Math.max(match,2);
        else if (similar.size && /[ա-ֆ]/u.test(term) && similar.has(phonetic(stripInflection(term)))) match = Math.max(match,1.5);
      }
    }
    const frequency = graph.index.get(key)?.size || 0;
    total += match * (1 + Math.min(1,Math.log((graph.passages.length+1)/(frequency+1))/6));
  }
  return total;
}

export function selectEvidence(course, prompt, details) {
  const graph = courseGraph(course);
  const reading = normalizeArmenianInput(prompt);
  const selected = new Set(details.references);
  const allowed = passage => !selected.size || selected.has(passage.number);
  const query = [...new Set(terms(reading.text))].map(word=>{
    const key = phonetic(word);
    const stem = phonetic(stripInflection(word));
    const candidates = reading.armenian && stem.length >= 5 && !graph.index.has(key) ?
      [...(graph.armenianByInitial.get(stem[0]) || [])].filter(sound=>oneSpellingEdit(stem,sound)).slice(0,4) : [];
    return [word,key,new Set(candidates.length<4 ? candidates : [])];
  });
  const seeds = new Set(topicOccurrences(reading.text,graph.phrases).map(item=>item.id).filter(id=>graph.nodes.has(id)));
  for (const node of graph.nodes.values()) {
    const names = terms(node.label).map(phonetic);
    if (names.length === 1 && names[0].length >= 4 && query.some(([,key])=>matches(key,names[0]))) seeds.add(node.id);
  }
  const titleScores = new Map(graph.materials.map(material=>[material.number,relevantWords(query,material.titleWords,graph)]));
  const related = new Map();
  const boost = (id, amount, path) => {
    if (!related.has(id) || related.get(id).amount < amount) related.set(id,{amount,path});
  };
  for (const seed of [...seeds].slice(0,8)) {
    const node = graph.nodes.get(seed);
    for (const id of node.passages) boost(id,8,'');
    const neighbors = graphNeighbors(graph,seed,allowed);
    for (const {node:neighbor,edge} of neighbors.slice(0,6)) {
      const explicit = edge.type !== 'section';
      const path = describeRelation(graph,edge);
      for (const id of edge.passages) boost(id,explicit ? 7 : 4,path);
      for (const id of neighbor.passages) boost(id,explicit ? 5 : 2,path);
      if (!explicit) continue;
      for (const next of graphNeighbors(graph,neighbor.id,allowed)
        .filter(item=>item.edge.type !== 'section' && item.node.id !== seed).slice(0,3)) {
        const trail = node.label + ' · ' + neighbor.label + ' · ' + next.node.label;
        for (const id of next.edge.passages) boost(id,3,trail);
        for (const id of next.node.passages) boost(id,1.5,trail);
      }
    }
  }
  const ranked = graph.passages.filter(allowed).map(passage => {
    const {id,number,title,label,text,tokens} = passage;
    const direct = relevantWords(query,tokens,graph);
    const match = related.get(id);
    const score = 2*direct + Math.min(titleScores.get(number),5) + (match?.amount || 0);
    return {id,number,title,label,text,score,via:match?.path || undefined};
  }).filter(item=>item.score>0 || selected.size || (!query.length && (details.review || details.quiz)))
    .sort((a,b)=>b.score-a.score);

  // Early results cover other pages before piling up excerpts from a single page.
  const leading = [];
  const remaining = [];
  const pages = new Map();
  for (const entry of ranked) {
    const key = entry.number + ':' + entry.label;
    const count = pages.get(key) || 0;
    pages.set(key,count+1);
    if (count < 2 || (entry.score > 0 && entry.score >= ranked[0].score*.75 && count < 4)) leading.push(entry);
    else remaining.push(entry);
  }
  return [...leading,...remaining];
}

import { loadPdf } from './pdf.mjs';
import { materialNumber } from './study-model.mjs';
import { conceptQuestions } from './quiz.mjs';
import { bilingualTopic } from './study-terms.mjs';
export { materialNumber };

const STOP = new Set('ինչ ինչի ինչով բացատրի բացատրիր բացատրել ամփոփիր ամփոփել ամփոփում ամբողջ դասընթաց դասընթացի բոլորը ամբողջը նյութերը դասերը քննությունից առաջ թեման թեմայով մասին պարունակում նյութ նյութը նյութի նյութերի գրիր ցույց տուր հիման վրա համար համարի համարից կրկնության կրկնություն դաս դասի և կամ խնդրում օրինակ ասա ասեք ասա ինչպես որը որոնք որ երբ ով արդյոք the what explain summarize with from give make about please quiz test in is of a to me նյութից pdf կազմիր կազմել կազմի տեքստը դրանից հարցանոց bacatrir bacatri bacatre ampopir nvty nyuty hamari hamar masin inch inchpes kazmir tester'.split(' '));
const QUIZ = /(?:թեստ|տեստ|ստուգողական|հարցաշար|\b(?:quiz(?:zes)?|tests?(?:er\w*|y)?|t(?:e|a)st(?:er\w*|y)?|stug[ao]x?akan\w*|harc(?:ashar\w*|er\w*)|harts(?:ashar\w*|er\w*))\b)/iu;
const MAKE = /(?:կազմ|ստեղծ|պատրաստ|տուր|առաջարկ|ստուգ(?:իր|ել|ի|ենք)|\b(?:make|creat\w*|generat\w*|quiz\s+me|kazm\w*|stex[ct][a-z]*|steghts\w*|sar[qk]i?\w*|patrast\w*|tur|tve[qk]|stug(?:el|ir|i|enq))\b)/iu;
const REVIEW = /(?:բացատր|ամփոփ|կրկն|\b(?:explain\w*|summari\w*|review\w*|bacatr\w*|batsatr\w*|ampop\w*|amphop\w*|krkn\w*|veranay\w*|nerkayac\w*|nerkayats\w*)\b)/iu;
const COMMAND_WORD = /^(?:կարող|կարո՞ղ|կգր|կաս|կբաց|օգնիր|օգնի|ուզում|ուզեմ|գործում|աշխատում|բացատր|նյութ|հարց|թեստ|տեստ|կազմ|կրկն|ստուգ|ստեղծ|պատրաստ|ամփոփ|քննությ|hamar|bacatr|batsatr|ampop|amphop|krkn|kazm|sar[qk]|patrast|stex|steghts|stug|harc|harts|tes?t(?:er|y|i|$)|ny(?:ut|outh|oot)|n(?:i|yu)t|das(?:y|er|ic|yntac|i|$)|qnnut|knnut|nerkayac)/u;
const EXTRA_STOP = new Set('իսկ հետո հիմա նույնը ավելի պարզ կարճ մանրամասն օրինակով և եւ ոնց ես դու խնդրում եմ պետք որտեղից ինձ ինձնով նրա դրա դրանց այդ այն մեր քո խնդրեմ հետո ստացվում է են սա սրանք անգլերեն inch inc vonc inchpes incpes vonc vor e en a u ev y es du indz im mer qo het tes asel asa asa asir asac grir gri ognir em uzum cankanum xndrum khndrum karox karogh es karas karoxes karam inchvor ete mej vra himan bolor bolory bolorn amboghj amboghjy ays ayd aysinqn aysinq yev masy hamar hamaric nshanakum nshanak nshanakutyun tarberutyuny tarberutyun tarbervum skzbum naxord boloric pdfy pdfn pdfic fayl faily file slayd slaydy presentation book notes check question questions about can you write create generate highlight how work does works summarize review tell explain example definition next previous number no material document lesson sources and or for on it որտեղ ուր կա կան կասես ուղարկիր նշված գտնեմ փնտրիր որոնիր երևում մանրամասն անունը ինչու uxarkir uxarki vortex vortegh ur ka kan gti gtnel pntrel pntrel voronir manramasn anuny anunov որտեղից'.split(' '));
const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replaceAll('և','եւ').replace(/[՞՜՛]/gu,'');
const LETTERS = Object.fromEntries(
  [...'աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆ'].map((letter,index) =>
    [letter,'a b g d e z e y t zh i l x c k h dz x ch m y n sh o ch p j r s v t r c v p k o f'.split(' ')[index]])
);
const NUMBERS = new Map(Object.entries({
  mek:1, mi:1, երկու:2, erku:2, երեք:3, ereq:3, erek:3, չորս:4, chors:4, հինգ:5, hing:5, վեց:6, vec:6, vets:6,
  յոթ:7, yot:7, ութ:8, ut:8, ուտ:8, ինը:9, iny:9, ine:9, տասը:10, tas:10, tasy:10, տաս:10,
  առաջին:1, երկրորդ:2, երրորդ:3, չորրորդ:4, հինգերորդ:5, վեցերորդ:6, յոթերորդ:7, ութերորդ:8, իններորդ:9, տասներորդ:10,
  մեկ:1, մի:1, տասնմեկ:11, tasnmek:11, տասներկու:12, tasnerku:12, տասներեք:13, tasnereq:13,
  տասնչորս:14, tasnchors:14, տասնհինգ:15, tasnhing:15
}));
const REF_MARKER = /(?:(?<![\p{L}\p{N}_])[nն](?:\s*[-‐‑–—]\s*|\s*)(\d+)|[№#]\s*(\d+)|(?:^|[^\p{L}\p{N}])(?:համար|hamar|number|material|source|pdf|նյութ|nyut|դաս|das)\s*[-:#]?\s*(\d+)|(\d+)\s*[-‐‑–—]?\s*(?:(?:րդ|rd)\s+)?(?:համար|hamar|pdf|նյութ|n[yiu]?[uot]*t|փաստաթուղթ|slayd|դաս|das))/giu;
const REF_LIST = /(?:[№#]|\b[nն]\s*[-‐‑–—]?)?\s*(\d+(?:\s*(?:,|և|եւ|ու|and|ev|yev|u)\s*(?:[№#]|\b[nն]\s*[-‐‑–—]?)?\s*\d+)+)\s*[-‐‑–—]?\s*(?:(?:րդ|rd)\s+)?(?:համար|hamar|նյութ|nyut|pdf|դաս|das)/giu;
const AFTER_LABEL = /(?:[№#]|\b[nն]\s*[-‐‑–—]?|(?:^|[^\p{L}\p{N}])(?:համար|hamar|material|source|pdf|նյութ|nyut|դաս|das)\s*[-:#]?)\s*(\d+(?:\s*(?:,|և|եւ|ու|and|ev|yev|u)\s*(?:[№#]|\b[nն]\s*[-‐‑–—]?)?\s*\d+)+)/giu;
const WORD_REFERENCE = /(?:^|[^\p{L}\p{N}])([\p{L}]+)\s+(համար(?:ի|ից)?|նյութ\p{L}*|դաս(?:ը|ից|ի)?|pdf)(?![\p{L}\p{N}_])/giu;
const COUNT = /(?:^|[\s(,;:։])(\d{1,2}|[\p{L}]+)\s*[-‐‑–—]?\s*(?:հարց\p{L}*|questions?\b|harc[a-z]*|harts[a-z]*|թեստ[ա-ֆ]*|tests?(?:er[a-z]*)?\b)/giu;

export function terms(value) {
  return (normalize(value).match(/[\p{L}\p{N}][\p{L}\p{N}_-]*/gu) || [])
    .map(word => word.replace(/-(?:y|n|i|ic|its|ov|um|ner|nery|ի|ից|ը|ն|ով|ում)$/u,''))
    .filter(word => word.length > 1 && !STOP.has(word) && !EXTRA_STOP.has(word) && !COMMAND_WORD.test(word) && !NUMBERS.has(word) &&
      !/^(?:[nն]-?)?\d+$/.test(word));
}

export function phonetic(word) {
  const romanized = word.replaceAll('ու','u').replaceAll('եւ','ev')
    .replace(/[ա-ֆ]/gu, letter => LETTERS[letter] || letter);
  return romanized.replace(/(?:dzh|jzh)/g,'j').replace(/(?:kh|gh)/g,'x').replace(/(?:ts|tz)/g,'c')
    .replace(/(?:ou|oo)/g,'u').replace(/q/g,'k').replace(/w/g,'v');
}

export function requestDetails(prompt) {
  const references = new Set();
  for (const match of prompt.matchAll(REF_MARKER)) references.add(Number(match.slice(1).find(Boolean)));
  for (const list of [...prompt.matchAll(REF_LIST), ...prompt.matchAll(AFTER_LABEL)]) {
    for (const number of list[1].matchAll(/\d+/g)) references.add(Number(number[0]));
  }
  for (const match of prompt.matchAll(WORD_REFERENCE)) {
    const name = normalize(match[1]);
    const number = NUMBERS.get(name);
    const ordinal = /(?:երորդ$|^առաջին$|^երկրորդ$|^երրորդ$|^չորրորդ$)/u.test(name);
    if (number && (ordinal || /^(?:համար|pdf)/iu.test(match[2]))) references.add(number);
  }
  const amounts = [...prompt.matchAll(COUNT)].map(match => NUMBERS.get(normalize(match[1])) ?? Number(match[1]));
  const requestedCount = amounts.find(Number.isFinite);
  const quiz = (QUIZ.test(prompt) && MAKE.test(prompt)) || (requestedCount !== undefined && (MAKE.test(prompt) || references.size > 0));
  return { references:[...references].sort((a,b) => a-b), quiz,
    review:REVIEW.test(prompt), count:Math.max(1,Math.min(15,requestedCount ?? 5)) };
}

export function snippets(pages) {
  return pages.flatMap(({ label, text }) => text.split(/\n{2,}|(?<=[.!?։])\s+(?=[\p{L}\p{N}«])/u)
    .map(part => ({ label, text: part.replace(/\s+/g, ' ').trim() }))
    .filter(part => part.text.length > 12)
    .flatMap(part => part.text.length <= 950 ? [part] : (part.text.match(/.{1,850}(?:\s|$)|.{1,850}/gu) || [])
      .map(text => ({ ...part, text: text.trim() }))));
}

export function matches(word, token) {
  return token === word || (word.length >= 4 && token.startsWith(word)) || (token.length >= 4 && word.startsWith(token));
}

const cite = item => ({ number: item.number, label: item.label, title: item.title });
const uniqueCitations = items => [...new Map(items.map(item => [item.number + ':' + item.label, cite(item)])).values()];
export function quizFromTopics(groups,count) {
  const candidates = groups.map(group=>({label:group.label,questions:[...(group.generated || []),
    ...conceptQuestions(group.entries,count),...(group.questions || [])]}))
    .sort((a,b)=>a.questions.length-b.questions.length);
  const assigned = new Map();
  function reserveQuestion(group, visited) {
    const free = group.questions.find(question=>!visited.has(question.prompt) && !assigned.has(question.prompt));
    if (free) {
      assigned.set(free.prompt,{group,question:free});
      return true;
    }
    // A shared question can cover this topic if its previous topic has another choice.
    for (const question of group.questions) {
      if (visited.has(question.prompt)) continue;
      visited.add(question.prompt);
      const previous = assigned.get(question.prompt);
      if (reserveQuestion(previous.group,visited)) {
        assigned.set(question.prompt,{group,question});
        return true;
      }
    }
    return false;
  }
  const missing = candidates.filter(group=>!reserveQuestion(group,new Set())).map(group=>group.label);
  if (missing.length) return {missing};
  const questions = [...assigned.values()].map(item=>item.question);
  const used = new Set(assigned.keys());
  while (questions.length < count) {
    const before = questions.length;
    for (const group of candidates) {
      const question = group.questions.find(item=>!used.has(item.prompt));
      if (!question) continue;
      questions.push(question);
      used.add(question.prompt);
      if (questions.length === count) break;
    }
    if (questions.length === before) break;
  }
  const topics = groups.map(group=>group.label);
  return {quiz:{title:('Թեստ · '+topics.map(bilingualTopic).join(', ')).slice(0,120),topics,questions}};
}

export function fallbackStudy(prompt, details, entries, relatedQuestions) {
  if (details.quiz) {
    const questions = conceptQuestions(entries, details.count);
    if (relatedQuestions && questions.length<details.count) {
      const used = new Set(questions.map(question=>question.prompt));
      const remaining = details.count-questions.length;
      questions.push(...relatedQuestions(remaining).filter(question=>!used.has(question.prompt)).slice(0,remaining));
    }
    if (!questions.length) return { answer: 'Այս հատվածներից հիմնավորված ստուգողական հարց չստացվեց։ Ավելացրու բացատրող նյութ կամ միացրու AI-ը։' };
    const context = details.references.length ? ' · ' + details.references.map(materialNumber).join(', ') : '';
    return {
      answer: questions.length < details.count
        ? 'Ընթեռնելի նյութից կազմեցի ' + questions.length + ' հարց և պահեցի թեստը։'
        : 'Թեստը պատրաստ է և պահված է «Թեստեր» բաժնում։',
      quiz: { title: 'Կրկնության թեստ' + context, questions }
    };
  }
  if (!entries.length) return { answer: 'Հարցին համապատասխան հատված չգտա դասընթացի նյութերում։ Փորձիր նշել նյութի համարը կամ հարցը ձևակերպել ավելի կոնկրետ։' };
  const chosen = entries.slice(0, details.review ? 5 : 3);
  const intro = details.review ? 'Նյութից առանձնացված կարևոր հատվածներ' : 'Հարցիդ առնչվող հատվածներ';
  return {
    answer: intro + '\n\n' + chosen.map(item => '• ' + item.text).join('\n\n'),
    sources: uniqueCitations(chosen)
  };
}

export async function extract(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'pdf') {
    const task = await loadPdf(file,{disableFontFace:true});
    try {
      const pdf = await task.promise;
      const pages = [];
      for (let pageNumber=1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str === undefined ? '' : item.str + (item.hasEOL ? '\n' : ' ')).join('').trim();
        pages.push({ label: 'էջ ' + pageNumber, text });
        page.cleanup();
      }
      return pages;
    } finally { await task.destroy(); }
  }
  if (extension === 'epub') {
    const { unzipSync, strFromU8 } = await import('./vendor/fflate.mjs');
    let bytes = 0;
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: entry => {
      const isDocument = /\.(xml|opf|html?|xhtml)$/i.test(entry.name);
      if (!isDocument) return false;
      bytes += entry.originalSize;
      if (bytes > 40_000_000) throw new Error('EPUB-ի բացված տեքստը չափազանց մեծ է։');
      return true;
    } });
    const archivedFile = name => {
      if (archive[name]) return archive[name];
      try { return archive[decodeURIComponent(name)]; }
      catch { return undefined; }
    };
    const xml = name => new DOMParser().parseFromString(strFromU8(archivedFile(name) || new Uint8Array()), 'text/xml');
    const container = xml('META-INF/container.xml');
    const opfPath = container.getElementsByTagNameNS('*','rootfile')[0]?.getAttribute('full-path');
    if (!opfPath) throw new Error('EPUB-ի բովանդակության ցանկը չի գտնվել։');
    const opf = xml(opfPath);
    const paths = new Map([...opf.getElementsByTagNameNS('*','item')].map(item => [item.getAttribute('id'), item.getAttribute('href')]));
    const decoder = new DOMParser();
    return [...opf.getElementsByTagNameNS('*','itemref')].flatMap((item,index) => {
      const relativePath = paths.get(item.getAttribute('idref'));
      if (!relativePath) return [];
      let absolute;
      try { absolute = new URL(relativePath,'https://book.invalid/' + opfPath); }
      catch { return []; }
      if (absolute.origin !== 'https://book.invalid') return [];
      const data = archivedFile(absolute.pathname.slice(1));
      if (!data) return [];
      const page = decoder.parseFromString(strFromU8(data), 'text/html');
      page.querySelectorAll('script,style,nav').forEach(node => node.remove());
      const blockSelector = 'h1,h2,h3,h4,p,li,blockquote,pre';
      const blocks = [...page.body.querySelectorAll(blockSelector)].filter(block=>!block.parentElement.closest(blockSelector));
      const text = (blocks.length ? blocks.map(node => node.textContent.trim()).filter(Boolean).join('\n\n') : page.body.textContent).trim();
      return [{ label: 'բաժին ' + (index+1), text }];
    });
  }
  return [{ label: 'տեքստ', text: (await file.text()).trim() }];
}

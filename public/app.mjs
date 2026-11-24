import {synchronize} from './library-sync.mjs';
import { account, libraryArchive, restoreLibrary, loadState, editState, getFile } from './data.mjs';
import { extract, requestDetails, fallbackStudy, materialNumber, quizFromTopics } from './study.mjs';
import { courseGraph, describeRelation, forgetGraph, graphEvidence, graphNeighbors, matchingGraphTopics, questionsFromGraph, relationQuestions, selectEvidence } from './course-graph.mjs';

import { LocalStudyAI } from './local-ai.mjs';
import { localEvidence } from './local-study.mjs';
import { fileExtension,imageType,materialExtensions,showMaterialFile } from './material-preview.mjs';
import { localSearchOnly,lookupReport,lookupTopic } from './lookup.mjs';
import { allowedResearchLink,fetchResearch,researchIntent,researchTopic } from './research.mjs';
import { normalizeArmenianInput } from './armenian-input.mjs';
import { languageOptions } from './study-model.mjs';
import { bilingualTopic } from './study-terms.mjs';
import { DraftTranslator } from './draft-translator.mjs';
import { translateAnswerText } from './answer-translation.mjs';

const paths = {
  book: '<path d="M12 7c-3-2.3-6-2.8-9-2v14c3-.8 6-.3 9 2 3-2.3 6-2.8 9-2V5c-3-.8-6-.3-9 2v14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a1.8 1.8 0 0 0 1.4-3c-.9-1.1-.2-2.5 1.1-2.5h1.3a3.7 3.7 0 0 0 3.7-3.7A8.9 8.9 0 0 0 12 3Z"/><path d="M7 12h.01M9 7.5h.01m5-.5h.01m3 3.5h.01" stroke-width="2.7"/>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v7h7M8 14h8m-8 4h5"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  quiz: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1m-6 9 2 2 4-4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  graph: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="m7.3 11 9.5-5m-9.5 7 9.5 5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18m0-18c-5 5-5 13 0 18"/>',
  spark: '<path d="M12 2 9.4 9.4 2 12l7.4 2.6L12 22l2.6-7.4L22 12l-7.4-2.6L12 2Z"/>',
  trash: '<path d="M4 7h16m-10-3h4m4 3-1 13H7L6 7m4 4v5m4-5v5"/>',
  edit: '<path d="m14 5 5 5M4 20l4.5-1L20 7.5 16.5 4 5 15.5 4 20Z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  download: '<path d="M12 4v11m-4-4 4 4 4-4M4 16v4h16v-4"/>'
};
const icon = name => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const url = (course, section='materials', test='') => '#/' + (course ? course.id + '/' + section + (test ? '/' + test : '') : '');
const tile = (name, tone='') => '<span class="tile ' + tone + '">' + icon(name) + '</span>';
const action = (label, event, look='', glyph='', extra='') => '<button type="button" class="btn ' + look + '" data-action="' + event + '" ' + extra + '>' + (glyph ? icon(glyph) : '') + esc(label) + '</button>';
const iconButton = (label,event,glyph, extra='') => '<button type="button" class="icon-btn" title="' + esc(label) + '" aria-label="' + esc(label) + '" data-action="' + event + '" ' + extra + '>' + icon(glyph) + '</button>';
const kindNames = { presentation:'Պրեզենտացիա', book:'Գիրք', note:'Տեքստային նշում', image:'Նկար', homework:'Տնային աշխատանք' };
const sections = { materials:['Նյութեր','file'], chat:['Chat','chat'], tests:['Թեստեր','quiz'], history:['Պատմություն','history'] };
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
let toastTimeout;
let disposePreview;
let state;
let pendingWrite = Promise.resolve();
const stateRevisionKey = 'dasaran-study-revision';
let activeAI = null;
const COURSE_QUESTION = /(?:դասընթացի\s+(?:նյութ|նշում)|(?:իմ|մեր)\s+(?:նյութ|նշում)|նյութերում|\b(?:im|mer)\s+(?:(?:texadrac|teghadrats|avelacrac)\s+)?(?:nyut|nuyt|nshum)|\b(?:nyuterum|nyuteric|nuyterum)|\b(?:course\s+material|my\s+notes|my\s+files)\b)/iu;
const SOFTWARE_TEST = /(?:\b(?:unit|integration|regression)\s+tests?\b|\b(?:pytest|vitest|jest|npm\s+test)\b|\btests?\s+for\s+(?:this|the|my|a)\s+(?:function|code|class|method|component)\b|(?:կոդի|ֆունկցիայի)\s+(?:unit|թեստ))/iu;
let onlineModeAvailable = false;
let guestReady=false, guestAdmin=false, visitor=false;
let routerConnected=false;
let onlineConnected = false;
let backupConnected = false;
let groqConnected = false;
const localAI = new LocalStudyAI(updateChatMode);
let localRequestBusy = false;
const pendingThreads = new Map();
const messagePageSize = 40;
const messageLimits = new Map();
const drafts = new Map();
const webDrafts = new Map();
const translationOpen = new Set();
const answerViews = new Map();
const languageSettings = {replyLanguage:'hy',translateFrom:'hy',translateTo:'en'};
try {
  const saved = JSON.parse(localStorage.getItem('dasaran-chat-languages') || '{}');
  for (const setting of Object.keys(languageSettings)) {
    if (Object.hasOwn(languageOptions,saved?.[setting])) languageSettings[setting] = saved[setting];
  }
} catch {}
const draftTranslator = new DraftTranslator(translateDraft,paintComposer);
const graphTopics = new Map();
const graphMaterials = new Map();
const directGraphCourses = new Set();
const materialKey = (course, number) => course.id + ':' + number;

function current(hash=location.hash) {
  const [courseId, page, itemId] = hash.replace(/^#\/?/, '').split('/');
  const course = state.courses.find(item => item.id === courseId);
  const section = Object.hasOwn(sections, page) ? page : 'materials';
  return {course,section,graphOpen:section === 'materials' && itemId === 'graph',
    test:section === 'tests' ? course?.tests.find(item=>item.id===itemId) : undefined,
    archived:section === 'history' ? course?.history?.find(item=>item.id===itemId) : undefined};
}

function notify(message) {
  toast.textContent = message;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.textContent = ''; }, 3800);
}

function courseTile(course) {
  return tile(course.tone === 'mint' ? 'palette' : course.demo ? 'code' : 'book', course.tone);
}

function sidebar(course) {
  return '<aside class="sidebar"><a class="brand" href="#/"><span class="logo">' + icon('book') +
    '</span><span><strong>My AI Assistant</strong><small>Ուսումնական հարթակ</small></span></a>' +
    '<nav class="side-nav" aria-label="Հիմնական ընտրացանկ"><a class="side-link ' + (course ? '' : 'active') + '" href="#/">' +
    icon('grid') + '<span>Իմ դասընթացները</span></a></nav>' +
    '<div class="side-caption"><span>Դասընթացներ</span>' + iconButton('Նոր դասընթաց','new-course','plus') + '</div>' +
    '<nav aria-label="Դասընթացներ">' + state.courses.map(item =>
      '<a class="side-link ' + (course?.id === item.id ? 'active' : '') + '" href="' + url(item) + '">' +
      icon('book') + '<span>' + esc(item.title) + '</span></a>').join('') + '</nav>' +
    '<div class="side-bottom"><div class="profile"><span class="avatar" aria-hidden="true">' + icon('book') +
    '</span><span><strong>Իմ աշխատանքային տարածքը</strong><small>Տվյալներն այս դիտարկիչում են</small></span></div></div></aside>';
}

function topbar(course, test) {
  return '<header class="top"><a class="mobile-brand" href="#/" aria-label="My AI Assistant">' + icon('book') + '</a>' +
    '<a class="crumb-home ' + (course ? '' : 'current') + '" href="#/">Իմ դասընթացները</a>' +
    (course ? icon('chevron') + '<a class="current" href="' + url(course) + '">' + esc(course.title) + '</a>' : '') +
    (test ? icon('chevron') + '<span class="current">' + esc(test.title.replace(/№(?=\d)/g,'N-')) + '</span>' : '') + '</header>';
}

let syncStatus=account?'Համաժամացվում է…':'Պահված է այս սարքում։';
let syncTimer;
function syncLibrary(choice){
  return synchronize(async()=>{state=await loadState();render();},text=>{
    syncStatus=text;
    const label=document.getElementById('sync-label');
    if (label) label.textContent=text;
    const conflict=document.getElementById('sync-conflict');
    if(conflict) conflict.hidden=!text.startsWith('Երկու սարքերում');
  },typeof choice==='string'?choice:undefined);
}
function home() {
  return '<div class="heading"><div class="heading-text"><h1>Իմ դասընթացները</h1>' +
    '<p>Կազմակերպիր դասընթացներդ և շարունակիր սովորել նույն տեղից։</p></div>' +
    action('Նոր դասընթաց','new-course','primary','plus') + '</div>' +
    '<div class="actions">'+action('Ներբեռնել պահուստային պատճենը','export-library')+
    action('Վերականգնել պատճենից','import-library')+'<small id="sync-label" role="status">'+esc(syncStatus)+'</small><span id="sync-conflict" '+(syncStatus.startsWith('Երկու սարքերում')?'':'hidden')+'>'+action('Ընտրել տարբերակը','resolve-library')+'</span></div>'+
    '<section class="hero"><div class="hero-copy"><h2>Պատրաստվի՛ր քո նյութերով</h2>' +
    '<p>Ավելացրու դասերի նյութերը, հարցեր տուր և թեստերով ստուգիր անցածդ։</p></div>' +
    '<div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit second"></div><div class="sheet rear"></div><div class="sheet">' + icon('file') +
    '<i></i><i></i><i></i></div><span class="spark a">✦</span><span class="spark b">✦</span><span class="spark c">✦</span><span class="spark d">✧</span></div></section>' +
    '<div class="section-head"><h2>Բոլոր դասընթացները</h2><span class="count">' + state.courses.length + ' դասընթաց</span></div>' +
    '<section class="course-grid" aria-label="Բոլոր դասընթացները">' + state.courses.map(course =>
      '<a class="course-card" href="' + url(course) + '">' + courseTile(course) + '<h3>' + esc(course.title) + '</h3>' +
      '<p>' + esc(course.description || 'Անձնական դասընթաց') + (course.demo ? ' · օրինակ' : '') + '</p>' +
      '<div class="card-foot"><span>' + icon('file') + course.materials.length + ' նյութ</span><span>' +
      icon('quiz') + course.tests.length + ' թեստ</span></div></a>').join('') +
    '<button class="course-card add" data-action="new-course">' + tile('plus') +
    '<h3>Ավելացնել դասընթաց</h3><p>Ստեղծիր նոր ուսումնական էջ</p></button></section>';
}

function empty(glyph,heading,description,cta='') {
  return '<div class="empty">' + tile(glyph) + '<h3>' + heading + '</h3><p>' + description + '</p>' + cta + '</div>';
}

function materialsView(course) {
  const add = action('Ավելացնել նյութ','new-material','primary','plus');
  return '<div class="heading"><div class="heading-text"><h2>Նյութեր</h2><p>Chat-ում նյութին հղվելու համար նշիր դրա համարը։</p></div>' +
    '<div class="actions"><a class="btn soft" href="' + url(course,'materials','graph') + '">' + icon('graph') +
    'Գիտելիքների գրաֆ</a>' + (course.materials.length ? action('Թեստ թեմաներով','topic-quiz','soft','quiz') : '') +
    add + '</div></div>' + (course.materials.length ? '<label>Որոնել նյութերում <input type="search" id="material-search" placeholder="Անուն, թեմա կամ N-6"></label><p id="material-empty" hidden>Նյութ չի գտնվել։</p><div class="list">' + course.materials.map(material => {
      const style = material.kind === 'book' ? 'mint' : material.kind === 'homework' ? 'peach' : '';
      const filename = originalName(course,material);
      const image = Boolean(imageType(filename));
      const extension = fileExtension(filename);
      const meta = kindNames[material.kind] + (extension ? ' · ' + extension.toUpperCase() : '') +
        (image || material.pages.some(page => page.text.trim()) ? '' : ' · ընթեռնելի տեքստ չկա');
      const args = 'data-number="' + material.number + '"';
      return '<article class="row"><span class="material-no">' + materialNumber(material.number) + '</span>' +
        tile(image ? 'image' : material.kind === 'book' ? 'book' : 'file',style) + '<div class="row-main"><h3>' + esc(material.title) +
        '</h3><small>' + esc(meta) + '</small></div>' + iconButton('Բացել նյութը','open-material','eye',args) +
        ((image || extension==='pdf') ? action('Ճանաչել տեքստը','ocr-material','soft','',args) : '') +
        iconButton('Ջնջել նյութը','delete-material','trash',args) + '</article>';
    }).join('') + '</div>' : empty('file','Դեռ նյութ չկա','Ավելացրու PDF, նկար, գիրք, նշում կամ տնային աշխատանք։'));
}

function graphMaterial(course) {
  const selected = graphMaterials.get(course.id);
  return course.materials.some(material=>material.number===selected) ? selected : 0;
}

function graphDetails(graph, node, course) {
  const material = graphMaterial(course);
  const available = entry => !material || entry.number===material;
  const neighbors = graphNeighbors(graph,node.id,available,{directOnly:directGraphCourses.has(course.id),eachRelation:true});
  const references = ids => {
    const pages = new Map(graphEvidence(graph,ids).filter(available).map(entry=>[entry.number+':'+entry.label,entry]));
    return sourceLinks(course,[...pages.values()]);
  };
  const previews = graphEvidence(graph,node.examples).filter(available);
  const example = previews.find(entry=>entry.text.length>60) ||
    graphEvidence(graph,node.passages).filter(available).find(entry=>entry.text.length>55);
  return '<div class="graph-map"><div class="graph-focus" id="graph-focus" tabindex="-1">' + icon('graph') +
    '<strong>' + esc(bilingualTopic(node.label)) + '</strong></div>' +
    (neighbors.length ? '<ul class="graph-branches">' + neighbors.map(({node:neighbor,edge}) => {
      const passages = graphEvidence(graph,edge.passages).filter(available);
      const excerpt = '<details class="graph-relation-source"><summary>Հիմնավորող հատված</summary>' +
        passages.map(entry=>'<blockquote>' + esc(edge.quotes.get(entry.id) || entry.text) +
          '</blockquote>' + references([entry.id])).join('') + '</details>';
      return '<li class="' + (edge.type==='section' ? 'graph-section-relation' : '') + '"><div class="graph-relation">' +
        action(bilingualTopic(neighbor.label),'graph-topic','soft','','data-topic="' + esc(neighbor.id) + '"') +
        '<p>' + esc(describeRelation(graph,edge,bilingualTopic)) + '</p></div>' +
        excerpt + '</li>';
    }).join('') + '</ul>' : '<p class="graph-no-links">' + (directGraphCourses.has(course.id) ? 'Ընտրված նյութերում այս թեմայի համար ուղղակի կապ չի գտնվել։' : 'Այս թեմայի համար այլ թեմաների հետ կապ չի գտնվել։') + '</p>') +
    '</div>' + (example ? '<div class="graph-excerpt"><h3>Հատված նյութից</h3><p>' +
      esc(example.text.length>380 ? example.text.slice(0,377).replace(/\s+\S*$/u,'')+'…' : example.text) +
      '</p>' + references([example.id]) + '</div>' : '') +
    '<div class="graph-footer"><div><h3>Թեմայի աղբյուրները</h3>' + references(node.passages) + '</div>' +
    '<a class="btn" href="' + url(course,'chat') + '">' + icon('chat') + 'Բացել Chat-ը</a></div>';
}

function graphView(course) {
  const graph = courseGraph(course);
  const scope = graphMaterial(course);
  const heading = '<div class="heading"><div class="heading-text"><h2>Գիտելիքների գրաֆ</h2>' +
    '<p>Բացիր նյութի գլխավոր թեմաները և ուսումնասիրիր դրանց կապերը։</p></div>' +
    '<div class="actions"><a class="btn" href="' + url(course) + '">Բոլոր նյութերը</a>' +
    (graph.nodes.size ? action('Թեստ թեմաներով','topic-quiz','soft','quiz','data-number="' + scope + '"') : '') + '</div></div>';
  if (!graph.nodes.size) return heading + empty('graph','Դեռ թեմա չի գտնվել',
    'Ավելացրու ընթեռնելի PDF, գիրք կամ տեքստային նշում։ Նկարի կամ սկանավորված էջի համար կարող ես կցել գրավոր նշում։',
    action('Ավելացնել նյութ','new-material','primary','plus'));
  const nodes = [...graph.nodes.values()].filter(node=>!scope || graphEvidence(graph,node.passages).some(entry=>entry.number===scope))
    .sort((a,b)=>b.priority-a.priority || b.edges.length-a.edges.length || b.passages.size-a.passages.size || a.label.localeCompare(b.label,'hy'));
  const active = nodes.find(node=>node.id===graphTopics.get(course.id)) || nodes[0];
  const materials = '<label for="graph-material">Նյութ</label><select id="graph-material"><option value="0">Բոլոր նյութերը</option>' +
    course.materials.map(material=>'<option value="'+material.number+'"'+(scope===material.number ? ' selected' : '')+'>' +
      esc(materialNumber(material.number)+' · '+material.title) + '</option>').join('') + '</select>';
  return heading + '<div class="graph-workspace"><aside class="graph-picker">' + materials +
    '<label for="graph-links">Ցուցադրել կապերը</label><select id="graph-links"><option value="all">Բոլոր կապերը</option>' +
    '<option value="direct"' + (directGraphCourses.has(course.id) ? ' selected' : '') + '>Միայն ուղղակի կապերը</option></select>' +
    '<label for="graph-filter">Թեմաներ</label>' +
    '<input type="search" id="graph-filter" placeholder="Որոնել թեմա" maxlength="120"><div class="graph-topics" id="graph-topics">' +
    nodes.map(node=>action(bilingualTopic(node.label),'graph-topic',node.id === active?.id ? 'soft' : '', '',
      'data-topic="' + esc(node.id) + '" aria-pressed="' + (node.id === active?.id) + '"')).join('') + '</div>' +
    '<p class="graph-no-links" id="graph-no-results"' + (active ? ' hidden' : '') + '>Համապատասխան թեմա չի գտնվել։</p></aside>' +
    '<section class="graph-panel" id="graph-panel" aria-label="Թեմայի կապերը">' + (active ? graphDetails(graph,active,course) :
      '<p class="graph-excerpt">Այս նյութում թեմաներ չեն առանձնացվել։</p>') + '</section></div>';
}

function sourceLinks(course,sources,webSources=[]) {
  const prefix = source => Number.isInteger(source.index) ? '[' + source.index + '] ' : '';
  const local = (sources || []).map(source => {
    const number = Number(source.number);
    const label = prefix(source) + materialNumber(number) + ' · ' + source.label;
    if (!course.materials.some(material=>material.number===number)) {
      return '<span class="source-unavailable">' + icon('file') + esc(label) + ' · Նյութը հեռացված է</span>';
    }
    return action(label,'open-material','soft','file','data-number="' + number + '" data-label="' + esc(source.label) + '"');
  });
  const online = webSources.flatMap(source => {
    const href = allowedResearchLink(source.url);
    if (!href) return [];
    const title = /[ա-ֆԱ-Ֆև]/u.test(source.title) ? source.title : 'Համացանցային աղբյուր';
    return ['<a class="btn" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="' + esc(source.title) + '">' +
      icon('globe') + esc(prefix(source) + title + ' · ' + source.publisher) + '</a>'];
  });
  return local.length || online.length ? '<div class="sources">' + [...local,...online].join('') + '</div>' : '';
}

function selectedAI(course) {
  if (!course || activeAI?.course !== course.id) return course && guestReady && !onlineConnected && !backupConnected ? 'online' : '';
  if (activeAI.type === 'online') return onlineReady() ? 'online' : '';
  return localAI.state === 'ready' ? 'local' : '';
}

const onlineReady = () => onlineConnected || backupConnected || guestReady;

const providerLabels={groq:'Groq',gemini:'Gemini',backup:'OpenRouter'};
function availableProviders() {
  return [groqConnected && 'groq',onlineConnected && 'gemini',routerConnected && 'backup'].filter(Boolean);
}
function chatMode(course) {
  const model = selectedAI(course);
  const localLoading = activeAI?.course === course.id && activeAI.type === 'local' && localAI.state === 'loading';
  const failed = activeAI?.course === course.id && activeAI.type === 'local';
  let label = 'Որոնման ռեժիմ · AI-ն անջատված է';
  let note = 'Chat-ը որոնում է նյութերում և գրաֆի կապերով գտնում նաև հարակից հատվածները։';
  let actions = '';
  if ((visitor || guestReady) && !onlineConnected && !backupConnected && activeAI?.type!=='local') {
    return '<div class="chat-mode-row"><div><h2>Ուսումնական օգնական</h2><small>'+ (guestReady?'AI-ը պատրաստ է հարցիդ։':'Հյուրի ռեժիմ · նյութերի որոնում')+'</small></div></div><small class="chat-mode-note">'+(guestReady?'Հարցը և անհրաժեշտ հատվածները կստանա կայքին միացված AI ծառայությունը։':'Կայքի ընդհանուր AI-ը դեռ ակտիվացված չէ։ Կարող ես որոնել նյութերում և կազմել թեստեր։')+'</small>';
  }
  if (model === 'online') {
    const providers=availableProviders();
    const primary=providers.includes(activeAI?.provider) ? activeAI.provider : providers[0];
    label='Առցանց AI · '+(providerLabels[primary] || 'Միացված է');
    note='Ընտրված ծառայությունը հարցումը կստանա առաջինը։ Պատասխանած մոդելի անունը կտեսնես հաղորդագրության վերևում։';
    actions=action('Անջատել AI-ը','disable-ai','soft');
    for (const provider of providers.filter(name=>name!==primary)) {
      actions+=action('Ընտրել '+providerLabels[provider],'select-provider','soft','','data-provider="'+provider+'"');
    }
    if (onlineConnected) actions += action('Հեռացնել Gemini-ի բանալին','disconnect-online');
    actions += backupConnected ? action(groqConnected ? 'Հեռացնել Groq-ի բանալին' : 'Հեռացնել OpenRouter-ի բանալին','disconnect-backup') :
      action('Կապել պահուստային AI-ը','connect-backup');
  } else if (model === 'local') {
    label = 'Փորձնական AI-ն միացված է';
    note = 'Հարցերն ու նյութերը մշակվում են այս սարքում։';
    actions = action('Անջատել AI-ը','disable-ai','soft');
  } else if (localLoading) {
    note = 'Մինչ AI մոդելը ներբեռնվում է, կարող ես օգտվել որոնումից։';
    actions = action('Չեղարկել ներբեռնումը','disable-local-ai','soft');
  } else {
    if (onlineModeAvailable) actions += action('Միացնել Gemini-ը','connect-online','primary','spark');
    if (onlineModeAvailable) {
      actions += action(backupConnected ? (groqConnected ? 'Միացնել Groq-ը' : 'Միացնել Gemma-ն') : 'Կապել անվճար AI-ը','connect-backup','soft');
    }
    if (!failed || localAI.state !== 'unsupported') {
      actions += action(failed && localAI.state === 'error' ? 'Կրկին փորձել սարքում' : 'Միացնել AI-ը սարքում','enable-local-ai','soft');
    }
    if (failed && localAI.state === 'unsupported') note = 'Այս սարքում WebGPU-ն հասանելի չէ։ Որոնման ռեժիմից կարող ես օգտվել։';
    if (failed && localAI.state === 'error') note = 'Սարքի AI մոդելը չմիացավ։ Կարող ես օգտվել որոնումից կամ փորձել առցանց AI-ը։';
  }
  if (onlineModeAvailable && backupConnected && !groqConnected) actions += action('Կապել Groq-ը','replace-backup','soft');
  if (onlineReady()) actions+=action('Ստուգել կապը','check-ai','soft');
  if (groqConnected && routerConnected && model==='online') actions+=action('Հեռացնել OpenRouter-ի բանալին','disconnect-router');
  if (groqConnected && !routerConnected) actions+=action('Կապել այլ բանալի','replace-backup','soft');
  if (guestAdmin && (groqConnected || onlineConnected)) actions+=action(guestReady?'Թարմացնել հյուրերի AI կապը':'Միացնել AI-ը հյուրերի համար','enable-guest-ai','soft');
  const progress = Math.round(localAI.progress*100);
  return '<div class="chat-mode-row"><div><h2>Ուսումնական օգնական</h2><small role="status">' +
    label + '</small></div><div class="chat-mode-actions">' + actions + '</div></div><small class="chat-mode-note">' + note + '</small>' +
    (localLoading ? '<div class="ai-progress"><progress aria-label="AI մոդելի բեռնում" max="100" value="' + progress + '"></progress><span>' +
    progress + '%</span></div>' : '');
}

function updateChatMode() {
  const mode = app.querySelector('.chat-mode');
  const {course,section} = current();
  if (!mode || !course || section !== 'chat') return;
  const loading = mode.querySelector('.ai-progress');
  if (loading && activeAI?.course === course.id && activeAI.type === 'local' && localAI.state === 'loading') {
    const progress = Math.round(localAI.progress*100);
    loading.querySelector('progress').value = progress;
    loading.querySelector('span').textContent = progress + '%';
  } else {
    const focused = mode.contains(document.activeElement);
    mode.innerHTML = chatMode(course);
    if (focused) mode.querySelector('button')?.focus();
  }
  const web = app.querySelector('#chat-form [name="web"]');
  if (web) web.checked = webDrafts.get(course.id) ?? !selectedAI(course);
  syncComposer();
}

function answerContent(message) {
  if (!['online','local'].includes(message.mode)) {
    const code = message.originalText && Object.hasOwn(languageOptions,message.translateTo) ? message.translateTo : '';
    return '<p' + (code ? ' lang="' + code + '"' : '') + '>' + esc(message.text) + '</p>';
  }
  return message.text.split(/(```[\s\S]*?```)/g).filter(Boolean).map(block => {
    if (block.startsWith('```') && block.endsWith('```')) {
      const code = block.slice(3,-3).replace(/^[^\r\n]*\r?\n/,'');
      return '<pre class="chat-code"><code>' + esc(code.trimEnd()) + '</code></pre>';
    }
    return '<p>' + esc(block.trim()).replace(/\*\*([^*\n]+)\*\*/gu,'<strong>$1</strong>')
      .replace(/^#{1,4}\s+([^\n]+)/gmu,'<strong>$1</strong>') + '</p>';
  }).join('');
}

const answerKey = (courseId,threadId,index) => JSON.stringify([courseId,threadId || '',index]);

function answerView(key,message,create=false) {
  const existing = answerViews.get(key);
  if (existing?.original === message.text) return existing;
  if (!create) return null;
  const view = {original:message.text,open:false,selected:'',pending:new Set(),errors:new Map(),results:new Map()};
  answerViews.set(key,view);
  return view;
}

function assistantMessage(course,message,index,threadId) {
  const displayName = message.mode === 'online' ? 'AI · ' + esc(message.modelName || 'առցանց') :
    message.local ? 'AI · այս սարքում' : message.mode === 'lookup' ? 'Որոնում' : 'Օգնական';
  const view = answerView(answerKey(course.id,threadId,index),message);
  const language = view?.selected || '';
  const translated = language && (view?.results.get(language) || message.translations?.[language]);
  const content = translated ? answerContent({...message,text:translated}) : answerContent(message);
  let status = '';
  if (view?.pending.has(language)) status = 'Թարգմանվում է…';
  else if (view?.errors.has(language)) status = view.errors.get(language);
  const options = [['','Բնօրինակ'],...Object.entries(languageOptions)].map(([code,label]) => action(label,'translate-answer',
    code === language ? 'soft' : '', '', 'data-language="' + code + '" aria-pressed="' + (code === language) + '"')).join('');
  return '<small>' + displayName + '</small><div class="answer-display"' + (translated ? ' lang="' + language + '"' : '') + '>' +
    content + '</div>' + sourceLinks(course,message.sources,message.webSources || []) + (message.testId ? '<div class="sources"><a class="btn soft" href="' +
    url(course,'tests',message.testId) + '">' + icon('quiz') + 'Բացել թեստը</a></div>' : '') +
    (message.retry && threadId===course.threadId && current().section==='chat' ? action('Կրկին փորձել','retry-ai','soft') : '') + '<details class="answer-translate"' + (view?.open ? ' open' : '') + '><summary>' + icon('globe') + 'Translate</summary>' +
    '<div class="answer-languages" role="group" aria-label="Պատասխանի թարգմանության լեզուն">' + options + '</div>' +
    '<p class="answer-translate-status" role="status"' + (status ? '' : ' hidden') + '>' + esc(status) + '</p>' +
    (status && !onlineReady() && onlineModeAvailable && localAI.state!=='ready' ? action('Կապել Gemini-ը','connect-online','soft') : '') + '</details>';
}

function chatMessages(course,messages,threadId=course.threadId) {
  const key = answerKey(course.id,threadId,'messages');
  const limit = messageLimits.get(key) || messagePageSize;
  const first = Math.max(0,messages.length-limit);
  const older = first ? action('Ցույց տալ նախորդ հաղորդագրությունները','older-messages','soft') : '';
  return older + messages.slice(first).map((message,offset) => message.role === 'user' ?
    '<article class="msg user"><small>Դու</small>' + answerContent(message) + messageTranslation(message) + '</article>' :
    '<article class="msg" data-answer-index="' + (first+offset) + '">' + assistantMessage(course,message,first+offset,threadId) + '</article>').join('');
}

function revealOlderMessages() {
  const visible = visibleAnswers();
  const log = app.querySelector('.chat-body');
  if (!visible || !log) return;
  const key = answerKey(visible.course.id,visible.threadId,'messages');
  const limit = messageLimits.get(key) || messagePageSize;
  const added = Math.min(messagePageSize,visible.messages.length-limit);
  if (added < 1) return;
  const anchor = log.querySelector('article');
  const originalTop = anchor?.getBoundingClientRect().top;
  messageLimits.set(key,limit+added);
  render();
  const updatedLog = app.querySelector('.chat-body');
  const messages = updatedLog.querySelectorAll('article');
  if (originalTop !== undefined && messages[added]) {
    updatedLog.scrollTop += messages[added].getBoundingClientRect().top-originalTop;
  }
  const recentOfOlder = messages[added-1];
  recentOfOlder?.setAttribute('tabindex','-1');
  recentOfOlder?.focus({preventScroll:true});
}

function visibleAnswers() {
  const {course,section,archived} = current();
  if (!course || (!archived && section !== 'chat')) return null;
  return {course,messages:archived?.messages || course.messages,threadId:archived?.id || course.threadId};
}

function paintAnswer(scope) {
  const visible = visibleAnswers();
  const message = visible?.messages[scope.index];
  if (visible?.course.id !== scope.courseId || visible.threadId !== scope.threadId || message?.text !== scope.original) return;
  const article = app.querySelector('[data-answer-index="' + scope.index + '"]');
  if (!article) return;
  const focused = article.contains(document.activeElement);
  article.innerHTML = assistantMessage(visible.course,message,scope.index,scope.threadId);
  if (focused) article.querySelector('[data-action="translate-answer"][aria-pressed="true"]')?.focus();
}

async function chooseAnswerLanguage(button) {
  const visible = visibleAnswers();
  if (!visible) return;
  const {course,messages,threadId} = visible;
  const index = Number(button.closest('[data-answer-index]')?.dataset.answerIndex);
  const message = messages[index];
  const language = button.dataset.language;
  if (message?.role !== 'assistant' || typeof language !== 'string' || (language && !Object.hasOwn(languageOptions,language))) return;
  const view = answerView(answerKey(course.id,threadId,index),message,true);
  const scope = {courseId:course.id,threadId,index,original:message.text};
  view.open = true;
  view.selected = language;
  view.errors.delete(language);
  if (!language || view.pending.has(language) || view.results.has(language) || message.translations?.[language]) {
    paintAnswer(scope);
    return;
  }
  const model = selectedAI(course) || (onlineReady() ? 'online' : localAI.state === 'ready' ? 'local' : '');
  if (!model || (model==='local' && localRequestBusy)) {
    view.errors.set(language,model ? 'AI-ը դեռ զբաղված է։ Նորից փորձիր մի պահից։' : 'Կապիր Gemini-ը կամ միացրու սարքի AI-ը՝ պատասխանը թարգմանելու համար։');
    paintAnswer(scope);
    return;
  }
  view.pending.add(language);
  if (model==='local') { localRequestBusy = true; paintComposer(); }
  paintAnswer(scope);
  try {
    const text = await translateAnswerText(message.text,prompt=>{
      const params = {prompt,translateTo:language,translateAnswer:true,details:{},evidence:[],history:[]};
      return model==='online' ? requestOnline(params) : localAI.answer(params);
    },model==='local' ? 1100 : undefined);
    view.results.set(language,text);
    await updateCourse(course.id,next => {
      const thread = next.threadId===threadId ? next.messages : next.history?.find(item=>item.id===threadId)?.messages;
      const original = thread?.[index];
      if (original?.role==='assistant' && original.text===message.text) {
        original.translations = {...original.translations,[language]:text};
      }
    });
  } catch (error) {
    if (!view.results.has(language)) view.errors.set(language,error.message || 'Թարգմանությունը չստացվեց։');
  } finally {
    view.pending.delete(language);
    if (model==='local') { localRequestBusy = false; paintComposer(); }
    paintAnswer(scope);
  }
}

function messageTranslation(message) {
  const original = Boolean(message.originalText && message.originalText !== message.text);
  const text = original ? message.originalText : message.translation;
  const code = original ? message.translateFrom : message.translateTo;
  if (!text || !Object.hasOwn(languageOptions,code)) return '';
  return '<details class="chat-translation"><summary>' + (original ? 'Բնօրինակը' : 'Թարգմանություն') + ' · ' +
    languageOptions[code] + '</summary><p lang="' + code + '">' + esc(text) + '</p></details>';
}

function languageField(name,label) {
  const options = Object.entries(languageOptions).map(([code,text])=>'<option value="' + code + '"' +
    (languageSettings[name] === code ? ' selected' : '') + '>' + text + '</option>').join('');
  return '<label>' + label + '<select name="' + name + '">' + options + '</select></label>';
}

function draftRequest(course,prompt) {
  const model = selectedAI(course);
  const text = prompt.trim();
  if (!translationOpen.has(course.id) || !model || !text || text.length > 1600 || pendingThreads.has(course.id)) return null;
  const {translateFrom:from,translateTo:to} = languageSettings;
  return {prompt:text,from,to,model,key:JSON.stringify([course.id,model,text,from,to])};
}

function syncComposer() {
  const {course} = current();
  const textarea = app.querySelector('#chat-form textarea');
  draftTranslator.prepare(course && textarea ? draftRequest(course,textarea.value) : null);
  paintComposer();
}

function paintComposer() {
  const form = app.querySelector('#chat-form');
  if (!form) return;
  const {course} = current();
  if (!course) return;
  const model = selectedAI(course);
  const open = translationOpen.has(course.id);
  const toggle = form.querySelector('[data-action="toggle-translate"]');
  toggle.classList.toggle('soft',open);
  toggle.setAttribute('aria-expanded',String(open));
  form.querySelector('#translate-panel').hidden = !open;
  form.querySelector('.chat-reply-language').hidden = !model;
  const text = form.elements.prompt.value;
  const preview = draftTranslator.result(draftRequest(course,text));
  const {status,message} = draftTranslator.state;
  const output = form.querySelector('#translation-preview');
  if (preview) {
    output.innerHTML = '<strong>' + languageOptions[preview.to] + '</strong><p lang="' + preview.to + '">' + esc(preview.text) + '</p>';
  } else {
    output.textContent = !model ? 'Միացրու AI-ը՝ հարցը թարգմանելու համար։' : !text.trim() ? 'Գրիր հարցդ, որ տեսնես թարգմանությունը։' :
      status === 'translating' ? 'Թարգմանվում է…' : status === 'error' ? message : 'Թարգմանությունը կերևա, երբ դադարես գրել։';
  }
  form.querySelector('[data-action="retry-translation"]').hidden = !open || (status !== 'error' && status !== 'waiting');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = pendingThreads.has(course.id) || (model==='local' && localRequestBusy) ||
    (activeAI?.course === course.id && activeAI.type === 'local' && localAI.state === 'loading') || (open && !preview);
  button.setAttribute('aria-label',open ? 'Ուղարկել թարգմանությունը' : 'Ուղարկել');
}

async function translateDraft({prompt,from,to,model}) {
  if (from === to && (from !== 'hy' || !normalizeArmenianInput(prompt).romanized)) return {translated:prompt};
  const params = {prompt,details:{},evidence:[],history:[],translateFrom:from,translateTo:to};
  if (model === 'online') return requestOnline(params);
  if (localRequestBusy) throw new Error('AI-ը դեռ զբաղված է։');
  localRequestBusy = true;
  try {
    return await localAI.answer(params);
  } finally {
    localRequestBusy = false;
    paintComposer();
  }
}

const chatDate = new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'});

function conversationTitle(messages) {
  const first = messages.find(item=>item.role==='user')?.text.replace(/\s+/g,' ').trim();
  return first?.length > 80 ? first.slice(0,80) + '…' : first || 'Զրույց';
}

function historyView(course,archived) {
  if (archived) return '<div class="heading"><div class="heading-text"><h2>' + esc(conversationTitle(archived.messages)) +
    '</h2><p>' + esc(chatDate.format(archived.archivedAt)) + '</p></div><a class="btn" href="' + url(course,'history') +
    '">Բոլոր զրույցները</a></div><section class="chat"><div class="chat-body archived-chat" aria-label="Պահված զրույց">' +
    chatMessages(course,archived.messages,archived.id) + '</div></section>';
  const archivedThreads = [...(course.history || [])].reverse();
  const active = course.messages.length ? [{messages:course.messages,active:true}] : [];
  const rows = [...active,...archivedThreads].map(thread => {
    const date = thread.active ? 'Ընթացիկ զրույց' : chatDate.format(thread.archivedAt);
    const target = thread.active ? url(course,'chat') : url(course,'history',thread.id);
    return '<a class="row history-row" href="' + target + '">' + tile('chat','mint') + '<div class="row-main"><h3>' +
      esc(conversationTitle(thread.messages)) + '</h3><small>' + esc(date) + ' · ' + thread.messages.length +
      ' հաղորդագրություն</small></div>' + icon('chevron') + '</a>';
  });
  return '<div class="heading"><div class="heading-text"><h2>Պատմություն</h2><p>Բացիր այս դասընթացի ընթացիկ կամ պահված զրույցները։</p></div></div>' +
    (rows.length ? '<div class="list">' + rows.join('') + '</div>' :
      empty('history','Դեռ զրույց չկա','Քո զրույցները կերևան այստեղ։','<a class="btn soft" href="' + url(course,'chat') + '">Բացել Chat-ը</a>'));
}

function chatView(course) {
  const example = course.materials.find(item => item.number === 6) || course.materials[0];
  const suggested = example ? [
    'Բացատրիր ' + materialNumber(example.number) + ' նյութը',
    materialNumber(example.number) + ' նյութի թեմայով դասախոսություն կազմիր',
    materialNumber(example.number) + ' նյութից կազմիր 5 հարցանոց թեստ',
    'Ամփոփիր դասընթացի նյութերը քննությունից առաջ'
  ] : [];
  const pending = pendingThreads.get(course.id);
  const preparing = activeAI?.course === course.id && activeAI.type === 'local' && localAI.state === 'loading';
  const activePending = pending && pending.threadId === course.threadId;
  return '<section class="chat" aria-label="Chat"><div class="chat-top">' + tile('spark') +
    '<div class="chat-mode">' + chatMode(course) + '</div></div><div class="chat-body" role="log">' +
    (course.messages.length ? chatMessages(course,course.messages) :
      '<div class="chat-empty">' + tile('chat') + '<h3>Ի՞նչ ես ուզում սովորել</h3><p>' +
      (example ? 'Գրիր ցանկացած ուսումնական հարց կամ նշիր նյութի համարը։' : 'Կարող ես հարց տալ կամ ավելացնել դասընթացի նյութեր։') + '</p><div class="chips">' +
      suggested.map(prompt => action(prompt,'prompt','', '', 'data-prompt="' + esc(prompt) + '"')).join('') +
      (!example ? '<a class="btn soft" href="' + url(course) + '">Բացել նյութերը</a>' : '') + '</div></div>') +
    (activePending ? '<div class="msg" aria-live="polite">' +
      (pending.wantsWeb ? 'Փնտրում և ուսումնասիրում եմ աղբյուրները…' :
        selectedAI(course) === 'online' ? 'Առցանց AI-ն պատրաստում է պատասխանը…' :
        localRequestBusy ? 'AI-ն պատրաստում է պատասխանը այս սարքում…' : 'Ուսումնասիրում եմ նյութերը…') + '</div>' : '') +
    '</div><form id="chat-form" class="chat-compose"><div class="chat-input-row"><textarea name="prompt" rows="1" maxlength="1600" aria-label="Հարցդ" placeholder="Գրիր հարցդ հայերեն կամ լատինատառ…" required>' +
    esc(drafts.get(course.id)) + '</textarea><button class="btn primary" type="submit" aria-label="Ուղարկել" ' +
    (pending || preparing ? 'disabled' : '') + '>' + icon('send') + '<span class="send-label">Ուղարկել</span></button></div>' +
    '<div class="chat-composer-tools">' + action('Translate','toggle-translate','','globe','aria-expanded="false" aria-controls="translate-panel"') +
    '<div class="chat-reply-language">' + languageField('replyLanguage','Պատասխանի լեզուն') + '</div></div>' +
    '<section id="translate-panel" class="translate-panel" aria-label="Հարցի թարգմանություն" hidden><div class="translate-languages">' +
    languageField('translateFrom','Սկզբնական լեզուն') + languageField('translateTo','Թարգմանության լեզուն') + '</div>' +
    '<div id="translation-preview" class="translation-preview" role="status"></div>' +
    action('Թարգմանել հիմա','retry-translation','soft','','hidden') + '</section>' +
    '<div class="chat-web"><label><input name="web" type="checkbox" ' + ((webDrafts.get(course.id) ?? !selectedAI(course)) ? 'checked' : '') + '>' +
    icon('globe') + 'Համացանցում էլ որոնել</label><small>Համացանցային աղբյուրներին փոխանցվում են որոնման բառերը։</small>' +
    (course.messages.length ? action('Մաքրել Chat-ը','clear-chat','clear-chat','trash') : '') + '</div>' +
    '</form></section>';
}

const testSessions = new Map();
function testAttempts(test) {
  return test.attempts ?? (test.last ? [{...test.last,id:'original'}] : []);
}

function attemptIndices(test,attempt) {
  return attempt?.indices ?? test.questions.map((_,index)=>index);
}

function testSession(test) {
  const session = testSessions.get(test.id);
  const attempts = testAttempts(test);
  const result = session?.indices ? null :
    attempts.find(attempt=>attempt.id===session?.attemptId) ?? attempts.at(-1);
  return {result,indices:session?.indices ?? attemptIndices(test,result),attempts};
}

function testList(course) {
  return '<div class="heading"><div class="heading-text"><h2>Թեստեր</h2><p>Այստեղ պահվում են դասընթացի նյութերով ստեղծված թեստերը։</p></div>' +
    action('Նոր թեստ','new-test','primary','plus') + '</div>' +
    (course.tests.length ? '<div class="list">' + [...course.tests].reverse().map(test =>
      '<article class="row">' + tile('quiz','mint') + '<div class="row-main"><h3>' + esc(test.title.replace(/№(?=\d)/g,'N-')) + '</h3><small>' +
      test.questions.length + ' հարց' + (test.last ? ' · վերջին արդյունքը՝ ' + test.last.score + '/' + attemptIndices(test,test.last).length : '') +
      '</small></div><a class="btn soft" href="' + url(course,'tests',test.id) + '">Բացել</a></article>').join('') + '</div>' :
      empty('quiz','Դեռ թեստ չկա','Կազմիր առաջին թեստը մեկ կամ մի քանի նյութից։'));
}

function testView(course,test) {
  const {result,indices,attempts} = testSession(test);
  const missed = result && indices.filter((index,pos)=>test.questions[index].correct !== result.answers[pos]);
  const topics = test.topics?.map(bilingualTopic).join(', ');
  const fullTopics = topics && test.title !== 'Թեստ · ' + topics ? '<p>' + esc(topics) + '</p>' : '';
  return '<div class="heading"><div class="heading-text"><h2>' + esc(test.title.replace(/№(?=\d)/g,'N-')) + '</h2><p>' + test.questions.length +
    ' հարց</p>' + fullTopics +
    '</div><a class="btn" href="' + url(course,'tests') + '">Բոլոր թեստերը</a></div>' +
    (result ? '<div class="test-card result" id="test-result" tabindex="-1"><h3>Արդյունք՝ ' + result.score + ' / ' +
      indices.length + '</h3><p>Յուրաքանչյուր հարցի տակ կարող ես տեսնել բացատրությունը։</p></div>' : '') +
    (attempts.length ? '<details class="test-card"><summary>Փորձերի պատմություն (' + attempts.length + ')</summary>' +
      attempts.map((attempt,pos)=>action('Փորձ ' + (pos+1) + ' · ' + attempt.score + '/' + attemptIndices(test,attempt).length +
        (attempt.date ? ' · ' + new Date(attempt.date).toLocaleString('hy-AM') : ''),'view-attempt','soft','','data-attempt="' + esc(attempt.id) + '"')).reverse().join(' ') + '</details>' : '') +
    '<form id="test-form">' + indices.map((index,pos) => {
      const question = test.questions[index];
      return '<fieldset class="test-card"><legend>' + (index+1) + '․ ' + esc(question.prompt).replaceAll('\n','<br>') + '</legend>' +
      question.options.map((option,choice) => {
        const selected = result?.answers[pos] === choice;
        const right = question.correct === choice;
        return '<label class="answer ' + (result ? right ? 'correct' : selected ? 'wrong' : '' : '') + '">' +
          '<input type="radio" name="question-' + index + '" value="' + choice + '" ' +
          (result ? 'disabled ' + (selected ? 'checked' : '') : 'required') + '><span>' + esc(option) + '</span></label>';
      }).join('') + (result ? '<p><strong>Բացատրություն։</strong> ' + esc(question.explanation) + '</p>' +
        sourceLinks(course,question.sources) : '') + '</fieldset>'; }).join('') + '<div class="actions">' +
    (result ? action('Կրկին անցնել','retry-test','primary') + (missed.length ? action('Կրկնել սխալ հարցերը','retry-missed','soft') : '') : '<button type="submit" class="btn primary">Ավարտել թեստը</button>') +
    '</div></form>';
}

function render() {
  const { course, section, test, archived, graphOpen } = current();
  document.title = 'My AI Assistant — ' + (course?.title || 'Իմ դասընթացները');
  const details = course ? '<div class="heading"><div class="course-heading">' + courseTile(course) +
    '<div class="heading-text"><h1>' + esc(course.title) + '</h1>' + (course.description ? '<p>' + esc(course.description) + '</p>' : '') +
    '</div></div><div class="actions">' + action('Փոխել անունը','rename-course','', 'edit') +
    action('Ջնջել դասընթացը','delete-course','danger','trash') + '</div>' +
    '</div><nav class="tabs" aria-label="Դասընթացի բաժիններ">' + Object.entries(sections).map(([key,[label,glyph]]) =>
      '<a class="tab ' + (section === key ? 'active' : '') + '" ' + (section === key ? 'aria-current="page" ' : '') +
      'href="' + url(course,key) + '">' + icon(glyph) + label +
      (key === 'materials' || key === 'tests' ? '<span class="row-count">' + course[key].length + '</span>' : '') + '</a>').join('') +
    '</nav>' + (section === 'chat' ? chatView(course) : section === 'tests' ? test ? testView(course,test) : testList(course) :
      section === 'history' ? historyView(course,archived) : graphOpen ? graphView(course) : materialsView(course)) : home();
  app.innerHTML = '<div class="layout">' + sidebar(course) + '<div>' + topbar(course,test) + '<main id="main" class="main">' + details + '</main></div></div>';
  const log = app.querySelector('.chat-body');
  if (log && (section === 'chat' || log.querySelector('[data-action="older-messages"]'))) log.scrollTop = log.scrollHeight;
  syncComposer();
}

function modal(title,content,subtitle='',wide=false) {
  disposePreview?.();
  disposePreview = undefined;
  dialog.classList.toggle('preview-dialog',wide);
  dialog.innerHTML = '<div class="modal-inner"><div class="modal-head"><div><h2 id="dialog-title">' + esc(title) + '</h2>' +
    (subtitle ? '<p class="subtle">' + esc(subtitle) + '</p>' : '') + '</div>' +
    iconButton('Փակել','close','close') + '</div>' + content + '</div>';
  if (!dialog.open) dialog.showModal();
}

dialog.addEventListener('close', () => {
  if (dialog.open) return;
  disposePreview?.();
  disposePreview = undefined;
});

const errorBox = '<p class="error" role="alert"></p>';
const submit = label => '<div class="actions">' + action('Չեղարկել','close') + '<button class="btn primary" type="submit">' + label + '</button></div>';

function newCourse() {
  modal('Նոր դասընթաց','<form id="course-form"><label class="field">Դասընթացի անունը<input name="title" maxlength="90" required placeholder="Օրինակ՝ JavaScript"></label>' +
    '<label class="field">Կարճ նկարագրություն<input name="description" maxlength="180" placeholder="Ըստ ցանկության"></label>' + errorBox + submit('Ստեղծել') + '</form>');
}

function renameCourse(course) {
  modal('Փոխել դասընթացի անունը','<form id="rename-course-form" data-course="' + esc(course.id) +
    '"><label class="field">Դասընթացի անունը<input name="title" value="' + esc(course.title) +
    '" maxlength="90" required autofocus></label>' + errorBox + submit('Պահել') + '</form>');
  dialog.querySelector('[name="title"]').select();
}

function newMaterial() {
  modal('Ավելացնել նյութ','<form id="material-form"><label class="field">Նյութի տեսակը<select name="kind">' +
    Object.entries(kindNames).map(([value,label]) => '<option value="' + value + '"' + (value === 'note' ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></label><label class="field">Վերնագիր<input name="title" maxlength="140" placeholder="Օրինակ՝ Դաս 6 · Ֆունկցիաներ"></label>' +
    '<label class="field">Ֆայլ<input type="file" name="file" accept="' + materialExtensions.map(type=>'.'+type).join(',') +
    '"><small>PDF, EPUB, տեքստ կամ նկար՝ PNG, JPG, WebP, GIF, AVIF։ Մինչև 30 ՄԲ։</small></label>' +
    '<label class="field">Տեքստ կամ նշումներ<textarea name="text" maxlength="80000" placeholder="Գրիր կամ տեղադրիր տեքստը այստեղ"></textarea>' +
    '<small>Կարող ես ավելացնել տեքստ նաև նկարված կամ սկանավորված PDF-ի համար։</small></label>' +
    errorBox + submit('Պահել նյութը') + '</form>');
}

function newTest(course) {
  if (!course.materials.length) {
    notify('Թեստ կազմելու համար նախ ավելացրու առնվազն մեկ նյութ։');
    location.hash = url(course);
    return;
  }
  modal('Նոր թեստ','<form id="new-test-form"><label class="field">Նյութ<select name="source"><option value="">Դասընթացի բոլոր նյութերը</option>' +
    course.materials.map(m => '<option value="' + m.number + '">' + materialNumber(m.number) + ' · ' + esc(m.title) + '</option>').join('') +
    '</select></label><label class="field">Հարցերի քանակը<select name="count">' +
    [3,5,8,10,15].map(n => '<option ' + (n === 5 ? 'selected' : '') + '>' + n + '</option>').join('') +
    '</select></label>' + errorBox + submit('Կազմել թեստ') + '</form>');
}

function topicsForQuiz(course,scope) {
  const graph = courseGraph(course);
  return [...graph.nodes.values()].sort((a,b)=>b.priority-a.priority || a.label.localeCompare(b.label,'hy')).flatMap(node=>{
    const entries = graphEvidence(graph,node.passages).filter(entry=>entry.text.length>=28 &&
      (!scope || entry.number===scope));
    return entries.length ? [{id:node.id,label:node.label,entries}] : [];
  });
}

function topicQuizDialog(course,scope) {
  const useOnline = onlineReady() ? '<label class="answer"><input name="use-ai" type="checkbox"><span>Կազմել AI-ով' +
    '<small>Ընտրված թեմաների հատվածները կփոխանցվեն միացված AI ծառայությանը։</small></span></label>' : '';
  modal('Թեստ թեմաներով','<form id="topic-quiz-form" data-course="' + esc(course.id) + '">' +
    '<label class="field">Նյութ<select name="source"><option value="0">Բոլոր նյութերը</option>' +
    course.materials.map(material=>'<option value="' + material.number + '"' + (material.number===scope ? ' selected' : '') +
      '>' + esc(materialNumber(material.number) + ' · ' + material.title) + '</option>').join('') +
    '</select></label><label class="field">Որոնել թեմա<input name="topic-search" type="search" maxlength="120"></label>' +
    '<fieldset class="topic-quiz-picker"><legend>Թեմաներ</legend><div class="topic-quiz-options"></div>' +
    '<p class="topic-quiz-empty subtle" hidden></p></fieldset>' +
    '<p class="topic-quiz-selection subtle" role="status"></p>' +
    '<label class="field">Հարցերի քանակը<input name="count" type="number" min="1" max="15" value="5" required></label>' +
    useOnline + errorBox + submit('Կազմել թեստ') + '</form>');
  fillTopicChoices(dialog.querySelector('#topic-quiz-form'),course);
}

function fillTopicChoices(form,course) {
  const selected = new Set(new FormData(form).getAll('topic'));
  const list = form.querySelector('.topic-quiz-options');
  const topics = topicsForQuiz(course,Number(form.elements.source.value));
  list.innerHTML = topics.map(topic=>{
    const sources = [...new Set(topic.entries.map(entry=>materialNumber(entry.number)))];
    return '<label class="topic-quiz-option"><input type="checkbox" name="topic" value="' + esc(topic.id) + '"' +
      (selected.has(topic.id) ? ' checked' : '') + '><span>' + esc(bilingualTopic(topic.label)) +
      '<small>' + esc(sources.join(', ')) + '</small></span></label>';
  }).join('');
  filterTopicChoices(form,course);
}

function filterTopicChoices(form,course) {
  const query = normalizeArmenianInput(form.elements['topic-search'].value.trim()).text
    .normalize('NFKC').toLowerCase().replaceAll('և','եւ');
  const matches = matchingGraphTopics(courseGraph(course),query);
  const options = [...form.querySelectorAll('.topic-quiz-option')];
  let shown = 0;
  let selected = 0;
  for (const option of options) {
    const input = option.firstElementChild;
    option.hidden = !matches.has(input.value);
    if (!option.hidden) shown++;
    if (input.checked) selected++;
  }
  const empty = form.querySelector('.topic-quiz-empty');
  empty.hidden = shown>0;
  empty.textContent = options.length ? 'Համապատասխան թեմա չի գտնվել։' :
    'Այս նյութում թեստի համար բավարար ընթեռնելի թեմա չի գտնվել։';
  form.querySelector('.topic-quiz-selection').textContent = selected ? 'Ընտրված թեմաներ՝ ' + selected : 'Ընտրիր մեկ կամ մի քանի թեմա։';
  if (form.getAttribute('aria-busy') !== 'true') {
    form.querySelector('button[type=submit]').disabled = !selected;
    form.querySelector('.error').textContent = '';
  }
}

async function saveTopicQuiz(course,form,data) {
  const startedAt = location.hash;
  const count = Number(data.get('count'));
  const selected = new Set(data.getAll('topic'));
  const scope = Number(data.get('source'));
  if (!selected.size) throw new Error('Ընտրիր առնվազն մեկ թեմա։');
  if (!Number.isInteger(count) || count<1 || count>15) throw new Error('Գրիր հարցերի քանակը՝ 1-ից 15։');
  if (count<selected.size) throw new Error('Հարցերի քանակը պետք է լինի առնվազն ընտրված թեմաների քանակին հավասար։');
  const id = crypto.randomUUID();
  form.setAttribute('aria-busy','true');
  const selectedGroups = topicsForQuiz(course,scope).filter(topic=>selected.has(topic.id));
  if (selectedGroups.length !== selected.size) throw new Error('Ընտրված թեմաներից մեկը փոխվել է։ Նորից բացիր թեմաների ընտրությունը։');
  let modelQuestions = [];
  let modelError;
  if (data.has('use-ai')) {
    form.querySelector('button[type=submit]').textContent = 'Հարցերը կազմվում են…';
    try {
      const byPassage = new Map();
      // Give each topic a source before supplying extra context for any topic.
      for (let offset=0;offset<3;offset++) {
        for (const [topic,group] of selectedGroups.entries()) {
          const entry = group.entries[offset];
          if (!entry) continue;
          if (!byPassage.has(entry.id) && byPassage.size<28) {
            const {number,label,title,text} = entry;
            byPassage.set(entry.id,{number,label,title,text:text.slice(0,560),topics:[]});
          }
          byPassage.get(entry.id)?.topics.push(topic);
        }
      }
      const reply = await requestOnline({prompt:'Կազմիր կիրառական ստուգողական թեստ ընտրված թեմաներից։',
        details:{quiz:true,count,references:[],topics:selectedGroups.map(group=>group.label)},
        evidence:[...byPassage.values()],history:[],materialOnly:true,replyLanguage:'hy'});
      modelQuestions = reply?.quiz?.questions || [];
    } catch (error) {
      modelError = error.message;
    }
  }
  let saved;
  await updateCourse(course.id,next=>{
    const groups = topicsForQuiz(next,scope).filter(topic=>selected.has(topic.id));
    if (groups.length !== selected.size) throw new Error('Ընտրված թեմաներից մեկը փոխվել է։ Նորից բացիր թեմաների ընտրությունը։');
    const graph = courseGraph(next);
    groups.forEach((group,index)=>{
      const entries = new Set(group.entries.map(entry=>entry.id));
      const sources = new Set(group.entries.map(entry=>entry.number+':'+entry.label));
      group.generated = modelQuestions.filter(question=>question.topic===index &&
        selectedGroups[index]?.id===group.id && question.sources?.length &&
        question.sources.every(source=>sources.has(source.number+':'+source.label)));
      group.questions = relationQuestions(graph,group.id,entries);
    });
    const {quiz,missing} = quizFromTopics(groups,count);
    if (!quiz) throw new Error((modelError ? modelError+' ' : '') +
      'Հիմնավորված հարց չստացվեց այս թեմաների համար՝ ' + missing.join(', ') + '։');
    saved = {id,...quiz};
    next.tests.push(saved);
  });
  if (dialog.contains(form) && dialog.open) {
    dialog.close();
    if (location.hash === startedAt) location.hash = url(course,'tests',id);
  }
  const view = current();
  if (view.course?.id===course.id && view.section==='tests' && !view.test) render();
  notify(saved.questions.length < count ? 'Ընտրված թեմաներից կազմվեց ' + saved.questions.length + ' հարց։' : 'Թեստը պատրաստ է։');
}

function examplePdf(course,material) {
  return course.id === 'web-demo' && material.number === 6 && !material.fileName;
}

function originalName(course,material) {
  return material.fileName || (examplePdf(course,material) ? material.title : '');
}

async function readOriginal(course,material) {
  if (!examplePdf(course,material)) return getFile(materialKey(course,material.number));
  const response = await fetch('/samples/functions.pdf');
  if (!response.ok) throw new Error('PDF unavailable');
  return response.blob();
}

function openMaterial(course, material, label='') {
  if (!material) { notify('Այս նյութը հասանելի չէ։'); return; }
  const filename = originalName(course,material);
  const hasVisual = Boolean(imageType(filename)) || fileExtension(filename) === 'pdf';
  const args = 'data-number="' + material.number + '"';
  let body;
  if (hasVisual) {
    const notes = material.pages.filter(page=>page.label==='նշումներ').map(page=>page.text).join('\n\n');
    body = '<div class="material-visual"></div>' + (notes ? '<details class="material-notes" ' + (label === 'նշումներ' ? 'open ' : '') + '><summary>Իմ նշումները</summary><p class="material-text">' +
      esc(notes) + '</p></details>' : '');
  } else {
    const pages = label ? material.pages.filter(page=>page.label===label) : material.pages;
    const text = pages.filter(page=>page.text.trim()).map(page=>page.label+'\n'+page.text).join('\n\n');
    body = '<p class="material-text">' + esc(text || 'Այս ֆայլում ընթեռնելի տեքստ չկա։') + '</p>';
  }
  modal(materialNumber(material.number) + ' · ' + material.title,body + '<div class="actions">' +
    (filename ? action('Ներբեռնել','download-material','','download',args) : '') +
    (material.pages.some(page=>page.text.trim()) ? action('Թեստ թեմաներով','topic-quiz','soft','quiz',args) : '') +
    action('Դասախոսություն կազմել','lecture-material','soft','globe',args) +
    action('Հարցնել Chat-ում','ask-material','primary','chat',args) + '</div>',kindNames[material.kind],hasVisual);
  if (hasVisual) {
    const initial = Number(label.match(/^էջ\s+(\d+)$/u)?.[1] || 1);
    disposePreview = showMaterialFile(dialog.querySelector('.material-visual'),()=>readOriginal(course,material),filename,material.title,initial);
  }
}

async function download(course, material) {
  const file = await readOriginal(course,material);
  if (!file) { notify('Ֆայլը չի գտնվել այս դիտարկիչում։'); return; }
  const href = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = href;
  link.download = originalName(course,material);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

function updateState(edit) {
  const operation = pendingWrite.then(async () => {
    state = await editState(edit);
    if(account){clearTimeout(syncTimer);syncTimer=setTimeout(syncLibrary,750);}
    try { window.localStorage.setItem(stateRevisionKey,String(state.revision)); } catch {}
  });
  pendingWrite = operation.catch(() => {});
  return operation;
}

function refreshSavedState() {
  const refresh = pendingWrite.then(async ()=>{
    const saved = await loadState();
    if ((saved.revision || 0) <= (state.revision || 0)) return;
    const view = current();
    const quiz = app.querySelector('#test-form');
    const choices = quiz && new FormData(quiz);
    const textInput = app.querySelector('#chat-form textarea');
    const focusedChat = textInput && document.activeElement === textInput;
    const graphQuery = app.querySelector('#graph-filter')?.value;
    const log = app.querySelector('.chat-body');
    const readingOlder = log && log.scrollHeight-log.clientHeight-log.scrollTop > 24;
    state = saved;
    for (const [id,pending] of pendingThreads) {
      if (pending.threadId !== saved.courses.find(course=>course.id===id)?.threadId) pendingThreads.delete(id);
    }
    render();
    const next = current();
    if (choices && view.test?.id === next.test?.id && next.test && !testSession(next.test).result) {
      app.querySelectorAll('#test-form input[type=radio]').forEach(input=>{
        input.checked = choices.get(input.name) === input.value;
      });
    }
    if (focusedChat) {
      const input = app.querySelector('#chat-form textarea');
      input?.focus({preventScroll:true});
      input?.setSelectionRange(textInput.selectionStart,textInput.selectionEnd);
    }
    if (readingOlder && view.course?.threadId===next.course?.threadId) {
      const updated = app.querySelector('.chat-body');
      if (updated) updated.scrollTop = log.scrollTop;
    }
    if (graphQuery) {
      const filter = app.querySelector('#graph-filter');
      if (filter) {
        filter.value = graphQuery;
        filter.dispatchEvent(new window.Event('input',{bubbles:true}));
      }
    }
  });
  pendingWrite = refresh.catch(()=>{});
}

function updateCourse(id, edit) {
  return updateState(next => {
    const course = next.courses.find(item => item.id === id);
    if (!course) throw new DOMException('Դասընթացը ջնջվել է։','NotFoundError');
    return edit(course);
  });
}

function connectOnline() {
  modal('Միացնել Gemini-ը',
    '<form id="gemini-form" method="post"><p class="online-privacy">Google AI Studio-ում ստեղծիր API բանալի Free Tier նախագծի համար և տեղադրիր այստեղ։</p>' +
    '<p class="online-privacy"><a class="btn" href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">Բացել Google AI Studio-ն</a></p>' +
    '<label class="field">Gemini API-ի բանալի<input name="key" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="490" required></label>' +
    '<p class="online-privacy">Google-ի ծառայության ծանրաբեռնվածության դեպքում նույն բանալիով կփորձվի նաև հասանելի պահուստային մոդել։ Google-ին փոխանցվում են հարցը, զրույցի վերջին հաղորդագրությունները և համապատասխան հատվածները։ Google-ը կարող է օգտագործել անվճար հարցումները ծառայությունները բարելավելու համար։</p>' +
    '<p class="error" role="alert"></p><div class="actions">' + action('Չեղարկել','close') +
    '<button type="submit" class="btn primary">Կապել Gemini-ը</button></div></form>');
}

function connectBackup() {
  modal('Կապել անվճար AI-ը',
    '<form id="backup-form" method="post"><p class="online-privacy">Groq-ի անվճար GPT-OSS 120B մոդելը կօգտագործվի որպես հիմնական AI։ Այստեղ կարող ես նաև տեղադրել OpenRouter-ի բանալի։ Groq-ի և OpenRouter-ի բանալիները պահվում են առանձին։</p>' +
    '<p class="online-privacy"><a class="btn" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">Ստեղծել OpenRouter-ի բանալի</a></p>' +
    '<p class="online-privacy"><a class="btn" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Ստեղծել Groq-ի բանալի</a></p>' +
    '<label class="field">Groq կամ OpenRouter API-ի բանալի<input name="key" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="200" required></label>' +
    '<p class="online-privacy">Հարցը, զրույցի վերջին հաղորդագրություններն ու համապատասխան հատվածները փոխանցվում են քո ընտրած AI ծառայությանը։</p>' +
    errorBox + submit('Կապել AI-ը') + '</form>');
}

async function requestOnline(params) {
  let response;
  try {
    response = await fetch('/api/online/study',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...params,preferredProvider:activeAI?.provider}),
      signal:AbortSignal.timeout(125000)
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error instanceof TypeError) {
      const message = error.name === 'TimeoutError' ? 'Առցանց AI-ը ժամանակին չպատասխանեց։' : 'Չհաջողվեց կապվել առցանց AI-ի հետ։';
      throw Object.assign(new Error(message),{kind:'unavailable'});
    }
    throw error;
  }
  const disconnected = response.headers.get('X-Study-Disconnected')?.split(',') || [];
  if (disconnected.length) {
    if (disconnected.includes('gemini')) onlineConnected = false;
    if (disconnected.includes('backup')) routerConnected=false;
    if (disconnected.includes('groq')) groqConnected=false;
    backupConnected=routerConnected || groqConnected;
    if (!onlineReady() && activeAI?.type==='online') activeAI = null;
    updateChatMode();
  }
  if (response.status === 401) {
    const issue = (await response.json().catch(()=>null))?.error;
    if (issue === 'backupConnect') {if (!disconnected.length) routerConnected=groqConnected=false;backupConnected=routerConnected || groqConnected;}
    else if (issue === 'geminiConnect') onlineConnected = false;
    else onlineConnected = backupConnected = routerConnected = groqConnected = false;
    if (!onlineReady() && activeAI?.type === 'online') activeAI = null;
    updateChatMode();
    throw Object.assign(new Error(issue==='backupConnect' ? 'Անվճար AI-ի կապն ավարտվել է։ Նորից կապիր բանալին։' :
      'Առցանց AI-ի կապն ավարտվել է։ Նորից կապիր Gemini-ի կամ OpenRouter-ի բանալին։'),{kind:'connection'});
  }
  if (response.status === 429) throw Object.assign(new Error('Առցանց AI-ի հարցումների սահմանաչափը լրացել է։ Նորից փորձիր մի փոքր հետո։'),{kind:'quota'});
  if (!response.ok) throw Object.assign(new Error(await onlineErrorMessage(response)),{kind:response.status>=500?'unavailable':undefined});
  const data = await response.json().catch(()=>null);
  if (!data || !Object.hasOwn(data,'result')) {
    throw Object.assign(new Error('Առցանց AI-ից վավեր պատասխան չստացվեց։'),{kind:'unavailable'});
  }
  return data.result;
}

async function onlineErrorMessage(response,backup=false) {
  const error = (await response.json().catch(()=>null))?.error;
  const messages = {
    key:backup ? 'OpenRouter-ը մերժեց բանալին։ Նորից պատճենիր այն OpenRouter-ից։' : 'Google-ը մերժեց բանալին։ Նորից պատճենիր այն Google AI Studio-ից։',
    backupKeyFormat:'Մուտքագրիր Groq-ի gsk_ կամ OpenRouter-ի sk-or-v1- բանալին։',
    keyType:'Google-ը չճանաչեց այս տեսակի բանալին։ Google AI Studio-ում ստեղծիր նոր Gemini API բանալի և նորից փորձիր։',
    providerAccess:backup ? 'OpenRouter-ը մերժեց հարցումը։ Ստուգիր բանալու կարգավորումները։' :
      'Google-ը չի թույլատրում այս նախագծի հարցումները։ Ստուգիր Free Tier հասանելիությունը Google AI Studio-ում։',
    limit:'Առցանց AI-ի հարցումների սահմանաչափը լրացել է։ Նորից փորձիր ավելի ուշ։',
    timeout:'Առցանց AI-ը ժամանակին չպատասխանեց։ Նորից փորձիր։',
    serviceBusy:'Առցանց AI-ն այս պահին ծանրաբեռնված է։ Նորից փորձիր։',
    modelUnavailable:'Առցանց մոդելն այս պահին հասանելի չէ։ Փորձիր ավելի ուշ։',
    providerRequest:'AI ծառայությունը մերժեց հարցումը։ Նորից փորձիր։',
    empty:'Առցանց AI-ն դատարկ պատասխան վերադարձրեց։ Նորից փորձիր։',
    origin:'Չհաջողվեց ստուգել էջի կապը։ Թարմացրու էջը։'
  };
  return Object.hasOwn(messages,error) ? messages[error] : 'Չհաջողվեց կապվել առցանց AI-ի հետ։ Նորից փորձիր։';
}

function clearChatCommand(prompt) {
  const command = prompt.toLocaleLowerCase().replace(/[.!?։՞՜…]+/gu,'').replace(/\s+/g,' ').trim();
  return /^(?:(?:խնդրում եմ|xndrum em|khndrum em|please) )?(?:(?:մաքրիր|մաքրի|մաքրել|ma[qk]rir|ma[qk]ri|ma[qk]rel) (?:(?:այս|ays) )?(?:չաթը|չատը|զրույցը|chat[- ]?ը|chaty|chatn|chat|chate|zruycy|zruyc)|clear (?:the )?(?:chat|conversation))$/iu.test(command);
}

function archiveConversation(course) {
  if (!course.messages.length) return false;
  course.history ??= [];
  course.history.push({id:course.threadId,messages:course.messages,archivedAt:Date.now()});
  course.messages = [];
  delete course.threadId;
  return true;
}

async function archiveChat(course,{stopLocal=false}={}) {
  const pending = pendingThreads.get(course.id);
  let archived = false;
  if (course.messages.length || pending) {
    await updateState(next => {
      const saved = next.courses.find(item=>item.id===course.id);
      if (saved && saved.threadId === (pending?.threadId ?? course.threadId)) archived = archiveConversation(saved);
    });
  }
  if (archived && pending && pendingThreads.get(course.id) === pending) {
    pendingThreads.delete(course.id);
    if (stopLocal && pending.useLocal) {
      pending.cancelled = true;
      if (activeAI?.course === course.id && activeAI.type === 'local') activeAI = null;
      localAI.stop();
    }
  }
  drafts.delete(course.id);
  webDrafts.delete(course.id);
  return archived;
}

async function clearChat(course) {
  const archived = await archiveChat(course,{stopLocal:true});
  render();
  if (current().course?.id === course.id && current().section === 'chat') app.querySelector('#chat-form textarea')?.focus();
  notify(archived ? 'Զրույցը պահվեց «Պատմություն» բաժնում։' : 'Ընթացիկ Chat-ն արդեն դատարկ է։');
}

function aiSourceContext(course,prompt,details,excerpts,courseQuestion) {
  let candidates = excerpts;
  if (courseQuestion && !details.references.length && excerpts.length < 4) {
    candidates = [...excerpts,...selectEvidence(course,prompt,{
      ...details,references:course.materials.map(item=>item.number)
    })];
  }
  const seen = new Set();
  const pageCounts = new Map();
  const support = [];
  for (const excerpt of candidates) {
    const page = excerpt.number + ':' + excerpt.label;
    const key = page + ':' + excerpt.text;
    const count = pageCounts.get(page) || 0;
    if (seen.has(key) || count >= (details.references.length ? 5 : 3)) continue;
    seen.add(key);
    pageCounts.set(page,count+1);
    support.push(excerpt);
    if (support.length === 32) break;
  }
  return support;
}

async function send(course, input, searchWeb, prepared=null) {
  const prompt = input.trim();
  if (!prompt) return;
  const submitted = prepared?.text || prompt;
  const originalPrompt = prepared ? prompt : '';
  const reading = normalizeArmenianInput(prompt);
  const queryPrompt = reading.text;
  if (clearChatCommand(prompt) || clearChatCommand(queryPrompt)) {
    await clearChat(course);
    return;
  }
  if (pendingThreads.has(course.id)) return;
  if (activeAI?.course === course.id && activeAI.type === 'local' && localAI.state === 'loading') {
    notify('AI մոդելը դեռ պատրաստվում է։');
    return;
  }
  const model = selectedAI(course);
  const useOnline = model === 'online';
  const useLocal = model === 'local';
  const replyLanguage = languageSettings.replyLanguage;
  const allowWeb = searchWeb ?? webDrafts.get(course.id) ?? !model;
  if (useLocal && localRequestBusy) {
    notify('AI-ն դեռ պատրաստում է նախորդ պատասխանը։');
    return;
  }
  if (useLocal) localRequestBusy = true;
  let modelError;
  const askModel = async params => {
    try {
      return useOnline ? await requestOnline(params) : await localAI.answer(params);
    } catch (error) {
      modelError = {
        kind:error.kind,
        message:useOnline ? (error.message === 'Failed to fetch' ? 'Չհաջողվեց կապվել առցանց AI-ի հետ։' : error.message) :
          'Սարքի AI մոդելից պատասխան չստացվեց։ Նորից փորձիր կամ միացրու առցանց AI-ը։'
      };
      return null;
    }
  };
  const history = course.messages.slice(useOnline ? -8 : -4).map(({role,text})=>({role,text}));
  const details = requestDetails(queryPrompt);
  if (prepared) {
    const translatedDetails = requestDetails(submitted);
    if (!details.references.length) details.references = translatedDetails.references;
    if (!details.quiz && translatedDetails.quiz) Object.assign(details,{quiz:true,count:translatedDetails.count});
  }
  const intent = researchIntent(prepared ? queryPrompt + '\n' + submitted : queryPrompt,details,allowWeb);
  if (intent.lecture || (model && (SOFTWARE_TEST.test(prompt) || SOFTWARE_TEST.test(submitted)))) details.quiz = false;
  const materialOnly = localSearchOnly(queryPrompt) || localSearchOnly(prompt) || localSearchOnly(submitted);
  const courseQuestion = intent.thisMaterial || materialOnly || COURSE_QUESTION.test(queryPrompt) || COURSE_QUESTION.test(submitted);
  const wantsWeb = !details.quiz && !materialOnly && (model ? intent.web : allowWeb);
  const pending = {threadId:course.threadId,wantsWeb,useLocal};
  pendingThreads.set(course.id,pending);
  drafts.delete(course.id);
  let recorded = false;
  try {
    let threadId;
    await updateCourse(course.id, next => {
      if (next.threadId !== course.threadId || next.messages.length !== course.messages.length) return;
      next.threadId ??= crypto.randomUUID();
      pending.threadId = threadId = next.threadId;
      next.messages.push(prepared ? {role:'user',text:submitted,originalText:prompt,
        translateFrom:prepared.from,translateTo:prepared.to} : {role:'user',text:prompt});
    });
    if (!threadId) {
      if (!drafts.has(course.id)) drafts.set(course.id,prompt);
      notify('Զրույցը փոխվել է մեկ այլ ներդիրում։ Հարցդ պահվել է գրելու դաշտում։');
      return;
    }
    recorded = true;
    if (pendingThreads.get(course.id) === pending) render();
    const requestedTopic = researchTopic(queryPrompt);
    if (!details.references.length && (intent.thisMaterial || (intent.lecture && !requestedTopic))) {
      const recent = [...course.messages].reverse().find(message => message.sources?.length);
      const recentIds = [...new Set(recent?.sources.map(source => source.number))];
      details.references = recentIds.filter(number => course.materials.some(item => item.number === number));
      if (!details.references.length && course.materials.length === 1) details.references = [course.materials[0].number];
    }
    const missing = details.references.filter(number => !course.materials.some(item => item.number === number));
    const translatedTopic = researchTopic(prepared?.topic || '');
    const evidencePrompt = prepared ? queryPrompt + ' ' + (translatedTopic || submitted) : queryPrompt;
    const evidence = selectEvidence(course,evidencePrompt,details);
    const excerpts = localEvidence(course,queryPrompt,details,evidence);
    const fallback = () => fallbackStudy(prompt,details,excerpts,limit=>questionsFromGraph(courseGraph(course),excerpts,limit));
    let reply;
    let mode;
    const present = course.materials.filter(item=>details.references.includes(item.number));
    const missingNotice = missing.length ? missing.map(materialNumber).join(', ') + ' համարով նյութ այս դասընթացում չկա։' : '';
    if (!model && missing.length && !present.length) {
      reply = {answer:missingNotice + ' Ստուգիր համարը «Նյութեր» բաժնում։'};
    } else if (!model && !details.quiz) {
      const lookup = lookupTopic(prompt,present.map(item=>item.title),history);
      const searched = Boolean(wantsWeb && lookup.query);
      let web = [];
      let unavailable = false;
      if (searched) {
        try { web = await fetchResearch(lookup.query,lookup.original); }
        catch { unavailable = true; }
      }
      reply = lookupReport(lookup,excerpts,web,{searched,unavailable});
      if (intent.lecture) reply.answer += '\n\nՄիացրու AI-ը, որ գտնված աղբյուրներով կազմի դասախոսությունը։';
      mode = 'lookup';
    } else if (model) {
      const context = aiSourceContext(course,evidencePrompt,details,excerpts,courseQuestion);
      const lookup = lookupTopic(prompt,present.map(item=>item.title),history);
      let query = translatedTopic || lookup.query;
      let web = [];
      let webUnavailable = false;
      if (wantsWeb) {
        const needsTopic = useOnline && !translatedTopic && /[ա-ֆԱ-Ֆև]/u.test(query);
        if (!modelError && ((!query && context.length) || needsTopic)) {
          const proposal = await askModel({prompt:submitted,originalPrompt,details,evidence:context.slice(0,10),history:[],
            planTopic:true,topicHint:lookup.original || query});
          if (pending.cancelled) return;
          if (typeof proposal === 'string') query = researchTopic(proposal) || query;
          if (modelError?.kind !== 'connection' && modelError?.kind !== 'quota') modelError = undefined;
        }
        if (query) {
          try { web = await fetchResearch(query,lookup.original || query,{includeEnglish:true}); }
          catch { webUnavailable = true; }
        }
      }
      if (pending.cancelled) return;
      if (!modelError) {
        reply = await askModel({prompt:submitted,originalPrompt,details,evidence:context,history,web,replyLanguage,
          lecture:intent.lecture,topicHint:lookup.query || query,materialOnly});
        if (reply?.answer && (!details.quiz || reply.quiz?.questions?.length)) mode = useOnline ? 'online' : 'local';
      }
      if (!mode) {
        const alternativeQuiz = details.quiz && excerpts.length ? fallback() : null;
        if (alternativeQuiz?.quiz) {
          reply = {...alternativeQuiz,answer:(modelError?.message || 'AI-ից ամբողջական թեստ չստացվեց։') +
            '\n\n' + alternativeQuiz.answer};
          mode = 'lookup';
        } else if (modelError) {
          reply = {answer:modelError.message};
          if (!details.quiz && useOnline && ['unavailable','quota','connection'].includes(modelError.kind) && (excerpts.length || web.length)) {
            reply = lookupReport(lookup,excerpts,web,{});
            reply.answer = modelError.message + '\n\n' + reply.answer;
            mode = 'lookup';
          }
        } else {
          reply = {answer:details.quiz ?
            'Թեստի համար նշիր կոնկրետ թեմա կամ ավելացրու համապատասխան նյութ։' :
            useOnline ? 'Առցանց AI-ից ամբողջական պատասխան չստացվեց։ Փորձիր նորից։' :
              'Սարքի AI-ից ամբողջական պատասխան չստացվեց։ Կարող ես փորձել առցանց AI-ը։'};
        }
      } else if (webUnavailable) {
        reply.answer = 'Համացանցային աղբյուրներն այս պահին անհասանելի էին։\n\n' + reply.answer;
      }
      if (mode && present.length && !context.length && !materialOnly) {
        reply.answer = 'Ընտրված ֆայլերից ընթեռնելի հատված հասանելի չէր։\n\n' + reply.answer;
      }
    } else {
      reply = fallback();
    }
    if (pending.cancelled) return;
    if (missingNotice && (model || present.length)) reply.answer = missingNotice + '\n\n' + reply.answer;
    await updateCourse(course.id, next => {
      let testId;
      if (reply.quiz) {
        testId = crypto.randomUUID();
        next.tests.push({id:testId,...reply.quiz});
      }
      const target = next.threadId === threadId ? next.messages : next.history?.find(item=>item.id===threadId)?.messages;
      target?.push({role:'assistant',text:reply.answer,retry:modelError && useOnline ? {prompt,web:searchWeb,prepared} : undefined,sources:reply.sources,webSources:reply.webSources,testId,local:mode==='local',mode,modelName:reply.modelName});
    });
  } catch (error) {
    if (!recorded && state.courses.some(item=>item.id===course.id) && !drafts.has(course.id)) drafts.set(course.id,prompt);
    if (error.name !== 'NotFoundError') notify('Չհաջողվեց ավարտել հարցումը։ Փորձիր նորից։');
  } finally {
    const active = pendingThreads.get(course.id) === pending;
    if (active) pendingThreads.delete(course.id);
    if (useLocal) {
      localRequestBusy = false;
      if (!active) paintComposer();
    }
    const view = current();
    if (active || (view.course?.id === course.id && view.section === 'history' &&
      (!view.archived || view.archived.id === pending.threadId))) render();
    if (active && view.course?.id === course.id && view.section === 'chat') app.querySelector('#chat-form textarea')?.focus();
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { course, test } = current();
  const number = Number(button.dataset.number);
  const material = course?.materials.find(item => item.number === number);
  try {
    switch (button.dataset.action) {
      case 'resolve-library':
        modal('Ընտրիր պահպանվող տարբերակը','<p>Ընտրված պատճենը կփոխարինի մյուսին։ Կարող ես նախ ներբեռնել այս սարքի պատճենը։</p>'+action('Ներբեռնել պահուստային պատճենը','export-library')+action('Պահել այս սարքի տարբերակը','keep-local')+action('Բեռնել հաշվի տարբերակը','keep-cloud'));
        break;
      case 'keep-local':
      case 'keep-cloud':
        dialog.close();await syncLibrary(button.dataset.action==='keep-local'?'local':'remote');break;
      case 'export-library': {
        const {bytes}=await libraryArchive();
        const href=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
        const a=document.createElement('a');a.href=href;a.download='my-ai-assistant.zip';a.click();
        setTimeout(()=>URL.revokeObjectURL(href),10000);break;
      }
      case 'import-library':
        modal('Վերականգնել պատճենից','<form id="library-form"><p>Այս սարքի դասընթացները և ֆայլերը կփոխարինվեն ընտրված պատճենով։</p><input type="file" name="archive" accept=".zip" required><button type="submit" class="btn primary">Վերականգնել</button><p class="error" role="alert"></p></form>');
        break;
      case 'retry-ai': {
        const m=course?.messages[Number(button.closest('[data-answer-index]')?.dataset.answerIndex)];
        if (m?.retry && !pendingThreads.has(course.id)) {
          if (onlineReady() && selectedAI(course)!=='online') activeAI={course:course.id,type:'online'};
          await send(course,m.retry.prompt,m.retry.web,m.retry.prepared);
        }
        break;
      }
      case 'enable-guest-ai': {
        button.disabled=true;
        try {
          const response=await fetch('/api/guest/enable',{method:'POST'});
          if (!response.ok) throw Error();
          guestReady=true;updateChatMode();notify('Հյուրերի AI-ը միացված է։');
        } finally {button.disabled=false;}
        break;
      }
      case 'check-ai': {
        button.disabled=true;
        try {
          const response=await fetch('/api/online/check',{method:'POST'});
          if (!response.ok) throw Error();
          const {results}=await response.json();
          const names={ready:'Կապը հաստատվեց',limit:'Սահմանաչափը լրացել է',key:'Բանալին մերժվել է',serviceBusy:'Ծառայությունը ծանրաբեռնված է',timeout:'Սպասման ժամանակը լրացավ'};
          modal('AI կապի ստուգում', results.map(r=>'<p><strong>'+esc(r.model)+'</strong> · '+esc(names[r.status] || 'Ծառայությունն անհասանելի է')+'</p>').join('') || '<p>Նախ կապիր AI բանալի։</p>');
        } finally {button.disabled=false;}
        break;
      }
      case 'replace-backup': connectBackup(); break;
      case 'select-provider':
        if(course && availableProviders().includes(button.dataset.provider)) {
          activeAI={course:course.id,type:'online',provider:button.dataset.provider};updateChatMode();
        }
        break;
      case 'connect-online':
      case 'connect-backup': {
        if (!course) break;
        const backup = button.dataset.action === 'connect-backup';
        if (backup ? !backupConnected : !onlineConnected) {
          if (backup) connectBackup();
          else connectOnline();
          break;
        }
        activeAI = {course:course.id,type:'online',provider:backup ? (groqConnected ? 'groq' : 'backup') : 'gemini'};
        webDrafts.delete(course.id);
        updateChatMode();
        break;
      }
      case 'disable-ai':
        activeAI = null;
        if (course) webDrafts.delete(course.id);
        updateChatMode();
        break;
      case 'disconnect-router':
      case 'disconnect-online':
      case 'disconnect-backup': {
        const backup = button.dataset.action !== 'disconnect-online';
        const removeGroq=backup && groqConnected && button.dataset.action!=='disconnect-router';
        button.disabled = true;
        const response = await fetch(removeGroq ? '/api/online/groq/disconnect' : backup ? '/api/online/backup/disconnect' : '/api/online/disconnect',{method:'POST'});
        if (!response.ok) throw new Error('Disconnect failed');
        if (backup) {if(removeGroq) groqConnected=false;else routerConnected=false;backupConnected=groqConnected || routerConnected;}
        else onlineConnected = false;
        if (!onlineReady() && activeAI?.type === 'online') activeAI = null;
        if (course) webDrafts.delete(course.id);
        updateChatMode();
        break;
      }
      case 'clear-chat': if (course) await clearChat(course); break;
      case 'older-messages': revealOlderMessages(); break;
      case 'translate-answer': await chooseAnswerLanguage(button); break;
      case 'enable-local-ai':
        if (!course) break;
        activeAI = {course:course.id,type:'local'};
        webDrafts.delete(course.id);
        updateChatMode();
        await localAI.start();
        break;
      case 'disable-local-ai':
        activeAI = null;
        if (course) webDrafts.delete(course.id);
        localAI.stop();
        break;
      case 'new-course': newCourse(); break;
      case 'rename-course': if (course) renameCourse(course); break;
      case 'new-material': if (course) newMaterial(); break;
      case 'graph-topic': {
        if (!course) break;
        const graph = courseGraph(course);
        const topic = graph.nodes.get(button.dataset.topic);
        if (!topic) break;
        graphTopics.set(course.id,topic.id);
        app.querySelectorAll('#graph-topics button').forEach(item => {
          const selected = item.dataset.topic === topic.id;
          item.classList.toggle('soft',selected);
          item.setAttribute('aria-pressed',selected);
        });
        app.querySelector('#graph-panel').innerHTML = graphDetails(graph,topic,course);
        app.querySelector('#graph-focus')?.focus({preventScroll:true});
        break;
      }
      case 'new-test': if (course) newTest(course); break;
      case 'topic-quiz': if (course) topicQuizDialog(course,number || 0); break;
      case 'close': dialog.close(); break;
      case 'ocr-material': {
        const file=await getFile(materialKey(course,number));
        if (!file) {notify('Այս նյութին ներբեռնված ֆայլ կցված չէ։'); break;}
        button.disabled=true; button.textContent='Տեքստը ճանաչվում է…';
        try {
          const {recognizeMaterial}=await import('./ocr.mjs');
          const pages=await recognizeMaterial(file,(n,total)=>button.textContent='Էջ '+n+' / '+total);
          if (!pages.some(p=>p.text)) throw Error();
          await updateCourse(course.id,next=>{
            const item=next.materials.find(m=>m.number===number);
            item.pages=[...pages,...item.pages.filter(p=>p.label==='նշումներ')];
          });
          forgetGraph(course.id); render(); notify('Ճանաչված տեքստը հասանելի է Chat-ում և թեստերում։');
        } catch {button.disabled=false; button.textContent='Ճանաչել տեքստը'; notify('Տեքստի ճանաչումը չհաջողվեց։ Ստուգիր կապը և փորձիր կրկին։');}
        break;
      }
      case 'open-material': if (course) openMaterial(course,material,button.dataset.label); break;
      case 'download-material': if (material) await download(course,material); break;
      case 'ask-material':
      case 'lecture-material':
        if (!material) break;
        drafts.set(course.id, button.dataset.action === 'lecture-material' ?
          materialNumber(number) + ' նյութի թեմայով դասախոսություն կազմիր' : 'Բացատրիր ' + materialNumber(number) + ' նյութը');
        dialog.close();
        if (location.hash === url(course,'chat')) render();
        else location.hash = url(course,'chat');
        setTimeout(() => app.querySelector('#chat-form textarea')?.focus(),0);
        break;
      case 'delete-course':
        if (course) modal('Ջնջե՞լ դասընթացը',
          '<p class="material-text">' + esc(course.title) + '</p>' +
          '<p class="delete-copy">Այս դասընթացի նյութերը, զրույցների պատմությունը և թեստերի արդյունքները նույնպես կջնջվեն։ Գործողությունն անվերադարձ է։</p>' +
          '<div class="actions"><button type="button" class="btn" data-action="close" autofocus>Չեղարկել</button>' +
          action('Ջնջել դասընթացը','confirm-course-delete','danger solid','','data-course="' + esc(course.id) + '"') + '</div>');
        break;
      case 'confirm-course-delete': {
        const id = button.dataset.course;
        button.disabled = true;
        let deleted;
        await updateState(next => {
          deleted = next.courses.find(item => item.id === id);
          if (!deleted) return;
          next.courses = next.courses.filter(item => item.id !== id);
          return {deleteFiles:deleted.materials.map(item => materialKey(deleted,item.number))};
        });
        drafts.delete(id);
        webDrafts.delete(id);
        translationOpen.delete(id);
        graphTopics.delete(id);
        graphMaterials.delete(id);
        directGraphCourses.delete(id);
        for (const key of answerViews.keys()) if (key.startsWith('[' + JSON.stringify(id) + ',')) answerViews.delete(key);
        for (const key of messageLimits.keys()) if (key.startsWith('[' + JSON.stringify(id) + ',')) messageLimits.delete(key);
        forgetGraph(id);
        dialog.close();
        location.hash = url();
        render();
        notify('Դասընթացը ջնջվեց։');
        break;
      }
      case 'delete-material':
        if (material) modal('Ջնջե՞լ նյութը','<p class="material-text">' + materialNumber(number) + ' · ' + esc(material.title) +
          '</p><div class="actions">' + action('Չեղարկել','close') + action('Ջնջել','confirm-delete','primary','','data-number="' + number + '"') + '</div>');
        break;
      case 'confirm-delete':
        if (!material) break;
        button.disabled = true;
        await updateCourse(course.id,next => {
          next.materials = next.materials.filter(item => item.number !== number);
          return {fileKey:materialKey(course,number)};
        });
        dialog.close(); render(); notify('Նյութը ջնջվեց։');
        break;
      case 'prompt':
        if (!course) break;
        if (translationOpen.has(course.id)) {
          const textarea = app.querySelector('#chat-form textarea');
          textarea.value = button.dataset.prompt;
          drafts.set(course.id,textarea.value);
          syncComposer();
          textarea.focus();
        } else {
          await send(course,button.dataset.prompt);
        }
        break;
      case 'toggle-translate':
        if (!course) break;
        if (translationOpen.has(course.id)) translationOpen.delete(course.id);
        else translationOpen.add(course.id);
        syncComposer();
        break;
      case 'retry-translation':
        draftTranslator.retry();
        break;
      case 'view-attempt':
        if (!test || !testAttempts(test).some(attempt=>attempt.id===button.dataset.attempt)) break;
        testSessions.set(test.id,{attemptId:button.dataset.attempt});
        render();
        app.querySelector('#test-result')?.focus();
        break;
      case 'retry-missed':
      case 'retry-test':
        if (!test) break;
        {
          const {indices,result} = testSession(test);
          const questions = button.dataset.action === 'retry-test' ? attemptIndices(test) :
            indices.filter((index,pos)=>result && test.questions[index].correct !== result.answers[pos]);
          if (!questions.length) break;
          testSessions.set(test.id,{indices:questions});
        }
        render();
        app.querySelector('#test-form input')?.focus();
        break;
    }
  } catch {
    button.disabled = false;
    if (dialog.open) dialog.close();
    notify('Գործողությունը չհաջողվեց։ Փորձիր նորից։');
  }
});

document.addEventListener('toggle',event => {
  const details = event.target;
  if (!details.matches('.answer-translate') || !details.isConnected) return;
  const visible = visibleAnswers();
  if (!visible) return;
  const index = Number(details.closest('[data-answer-index]')?.dataset.answerIndex);
  const message = visible.messages[index];
  if (message?.role !== 'assistant') return;
  answerView(answerKey(visible.course.id,visible.threadId,index),message,true).open = details.open;
},true);

document.addEventListener('input',event => {
  const form = event.target.form;
  if (form?.id === 'topic-quiz-form' && event.target.name === 'topic-search') {
    const course = state.courses.find(item=>item.id===form.dataset.course);
    if (course) filterTopicChoices(form,course);
    return;
  }
  if (event.target.id==='material-search') {
    const q=event.target.value.trim().toLocaleLowerCase();
    const rows=[...app.querySelectorAll('.list article')];
    const course=current().course;
    rows.forEach((row,i)=>{
      const m=course.materials[i];
      const match=(/^n-\d+$/i.test(q) ? q==='n-'+m.number :
        [m.title,...m.pages.map(p=>p.text),'N-'+m.number].some(t=>t.toLocaleLowerCase().includes(q)));
      row.hidden=!match;
    });
    app.querySelector('#material-empty').hidden=rows.some(row=>!row.hidden);
  }
  if (event.target.id === 'graph-filter') {
    const query = event.target.value.trim().normalize('NFKC').toLowerCase().replaceAll('և','եւ');
    const course = current().course;
    if (!course) return;
    const matching = matchingGraphTopics(courseGraph(course),query);
    const buttons = [...app.querySelectorAll('#graph-topics button')];
    buttons.forEach(button => {
      button.hidden = !matching.has(button.dataset.topic);
    });
    app.querySelector('#graph-no-results').hidden = buttons.some(button=>!button.hidden);
    return;
  }
  if (event.target.form?.id !== 'chat-form') return;
  const {course} = current();
  if (!course) return;
  if (event.target.name === 'web') {
    webDrafts.set(course.id,event.target.checked);
  } else if (event.target.name === 'prompt') {
    drafts.set(course.id,event.target.value);
    syncComposer();
  } else if (Object.hasOwn(languageSettings,event.target.name) && Object.hasOwn(languageOptions,event.target.value)) {
    languageSettings[event.target.name] = event.target.value;
    try { localStorage.setItem('dasaran-chat-languages',JSON.stringify(languageSettings)); } catch {}
    syncComposer();
  }
});

document.addEventListener('change',event => {
  const form = event.target.form;
  if (form?.id === 'topic-quiz-form') {
    const course = state.courses.find(item=>item.id===form.dataset.course);
    if (course && event.target.name === 'source') fillTopicChoices(form,course);
    if (course && event.target.name === 'topic') filterTopicChoices(form,course);
    return;
  }
  if (event.target.id === 'graph-links') {
    const {course} = current();
    if (!course) return;
    if (event.target.value === 'direct') directGraphCourses.add(course.id);
    else directGraphCourses.delete(course.id);
    const panel = app.querySelector('#graph-panel');
    const selected = app.querySelector('#graph-topics [aria-pressed="true"]');
    const graph = courseGraph(course);
    const node = graph.nodes.get(selected?.dataset.topic);
    if (node && panel) panel.innerHTML = graphDetails(graph,node,course);
    return;
  }
  if (event.target.id !== 'graph-material') return;
  const {course} = current();
  if (!course) return;
  graphMaterials.set(course.id,Number(event.target.value));
  render();
  app.querySelector('#graph-material')?.focus();
});

document.addEventListener('submit',async event => {
  const form = event.target;
  if (!['course-form','rename-course-form','material-form','chat-form','test-form','new-test-form','topic-quiz-form','gemini-form','backup-form'].includes(form.id)) return;
  event.preventDefault();
  const data = new FormData(form);
  const {course,test} = current();
  const button = form.querySelector('button[type=submit]');
  const error = form.querySelector('.error');
  if (button?.disabled) return;
  if (button) button.disabled = true;
  if (error) error.textContent = '';
  try {
    if (form.id==='library-form') {
      const file=data.get('archive');
      if (!file || file.size>100_000_000) throw Error('Ընտրիր պահուստային ZIP ֆայլ մինչև 100 ՄԲ։');
      await restoreLibrary(new Uint8Array(await file.arrayBuffer()),state.revision || 0);
      state=await loadState();dialog.close();render();await syncLibrary();
    }
    if (['gemini-form','backup-form'].includes(form.id) && course) {
      const backup = form.id === 'backup-form';
      const key = data.get('key').trim();
      const response = await fetch(backup ? '/api/online/backup/connect' : '/api/online/connect',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})
      });
      if (!response.ok) throw new Error(await onlineErrorMessage(response,backup));
      form.reset();
      if (backup) { backupConnected = true; if(key.startsWith('gsk_')) groqConnected=true; else routerConnected=true; }
      else onlineConnected = true;
      if (current().course?.id === course.id && current().section === 'chat') {
        activeAI = {course:course.id,type:'online',provider:backup ? (key.startsWith('gsk_') ? 'groq' : 'backup') : 'gemini'};
        webDrafts.delete(course.id);
      }
      if (dialog.contains(form) && dialog.open) dialog.close();
      updateChatMode();
      notify(backup ? (groqConnected ? 'Groq-ը միացված է։' : 'OpenRouter-ը միացված է։') : 'Gemini-ը միացված է։');
    }
    if (form.id === 'course-form') {
      const title = data.get('title').trim();
      if (!title) throw new Error('Գրիր դասընթացի անունը։');
      const item = {id:crypto.randomUUID(),title,description:data.get('description').trim(),next:1,materials:[],messages:[],tests:[]};
      await updateState(next => {
        item.tone = ['purple','mint','peach'][next.courses.length % 3];
        next.courses.push(item);
      });
      dialog.close();
      location.hash = url(item);
      notify('Դասընթացը ստեղծվեց։');
    }
    if (form.id === 'rename-course-form') {
      const title = data.get('title').trim();
      if (!title || title.length > 90) throw new Error('Գրիր դասընթացի անունը՝ մինչև 90 նիշ։');
      await updateCourse(form.dataset.course,next => { next.title = title; });
      if (dialog.contains(form) && dialog.open) dialog.close();
      render();
      if (current().course?.id === form.dataset.course) app.querySelector('[data-action="rename-course"]')?.focus();
      notify('Դասընթացի անունը փոխվեց։');
    }
    if (form.id === 'material-form' && course) {
      const file = data.get('file');
      const hasFile = Boolean(file?.size);
      const note = data.get('text').trim();
      const title = data.get('title').trim() || (hasFile ? file.name.slice(0,140) : '');
      if (!title) throw new Error('Գրիր նյութի վերնագիրը։');
      if (!hasFile && !note) throw new Error('Ավելացրու ֆայլ կամ գրիր նյութի տեքստը։');
      const extension = hasFile ? fileExtension(file.name) : '';
      if (hasFile && (!materialExtensions.includes(extension) || file.size > 30_000_000)) throw new Error('Ընտրիր PDF, EPUB, նկար կամ տեքստային ֆայլ մինչև 30 ՄԲ։');
      const image = hasFile && Boolean(imageType(file.name));
      const kind = image ? 'image' : data.get('kind') === 'image' ? 'note' : data.get('kind');
      button.textContent = 'Մշակվում է…';
      let pages = [];
      if (hasFile && !image) {
        try { pages = await extract(file); } catch {
          if (!note && extension !== 'pdf') throw new Error('Չհաջողվեց կարդալ ֆայլը։ Փորձիր մեկ այլ ֆայլ կամ տեղադրիր տեքստը նշումների դաշտում։');
        }
      }
      if (note) pages.push({label:'նշումներ', text:note});
      let number;
      await updateCourse(course.id,next => {
        number = next.next++;
        next.materials.push({number,title,kind,pages,fileName:hasFile ? file.name : undefined});
        return hasFile ? {fileKey:materialKey(course,number),file} : undefined;
      });
      if (dialog.contains(form) && dialog.open) dialog.close();
      render();
      notify(image || pages.some(page => page.text.trim()) ? 'Նյութը պահվեց որպես ' + materialNumber(number) + '։' :
        'Նյութը պահվեց որպես ' + materialNumber(number) + '։ Ֆայլը ընթեռնելի տեքստ չունի։');
    }
    if (form.id === 'chat-form' && course) {
      const text = data.get('prompt');
      const prepared = draftTranslator.result(draftRequest(course,text));
      if (translationOpen.has(course.id) && !prepared) { syncComposer(); return; }
      await send(course,text,data.has('web'),prepared);
    }
    if (form.id === 'new-test-form' && course) {
      const prompt = (data.get('source') ? materialNumber(data.get('source')) + ' նյութից' : 'Դասընթացի նյութերից') +
        ' կազմիր ' + data.get('count') + ' հարցանոց թեստ';
      dialog.close();
      location.hash = url(course,'chat');
      await send(course,prompt);
    }
    if (form.id === 'topic-quiz-form' && course?.id===form.dataset.course) {
      await saveTopicQuiz(course,form,data);
    }
    if (form.id === 'test-form' && course && test) {
      const {indices,result:review} = testSession(test);
      if (review) return;
      const answers = indices.map(index => data.get('question-' + index));
      if (answers.some(answer=>answer === null)) { notify('Պատասխանիր բոլոր հարցերին։'); return; }
      const choices = answers.map(Number);
      const score = indices.filter((index,pos) => test.questions[index].correct === choices[pos]).length;
      const result = {id:crypto.randomUUID(),date:new Date().toISOString(),indices,answers:choices,score};
      await updateCourse(course.id,next => {
        const saved = next.tests.find(item => item.id === test.id);
        saved.attempts = [...testAttempts(saved),result];
        saved.last = result;
      });
      testSessions.set(test.id,{attemptId:result.id});
      render();
      app.querySelector('#test-result')?.focus();
    }
  } catch (exception) {
    const message = exception.name === 'QuotaExceededError' ? 'Դիտարկիչում բավարար տարածք չկա։ Փորձիր փոքր ֆայլ։' : exception.message;
    if (error) error.textContent = message || 'Գործողությունը չհաջողվեց։';
    else notify('Գործողությունը չհաջողվեց։ Փորձիր նորից։');
  } finally {
    if (button) {
      if (form.id === 'chat-form') paintComposer();
      else if (form.id === 'topic-quiz-form') {
        form.removeAttribute('aria-busy');
        button.disabled = !form.querySelector('[name=topic]:checked');
        button.textContent = 'Կազմել թեստ';
      } else button.disabled = false;
      if (form.id === 'material-form') button.textContent = 'Պահել նյութը';
    }
  }
});

try {
  state = await loadState();
} catch {
  state = {courses:[]};
  notify('Այս դիտարկիչում տվյալները պահել հնարավոր չէ։');
}
const recoveredThreads = new Map(state.courses.filter(course=>course.messages.length)
  .map(course=>[course.id,course.threadId]));
if (recoveredThreads.size) {
  try {
    await updateState(next => {
      for (const course of next.courses) {
        if (recoveredThreads.has(course.id) && recoveredThreads.get(course.id) === course.threadId) archiveConversation(course);
      }
    });
  } catch {
    notify('Չհաջողվեց նախորդ զրույցը տեղափոխել պատմություն։');
  }
}

let navigationArchive = Promise.resolve();
window.addEventListener('hashchange', async event => {
  const previous = current(new URL(event.oldURL).hash);
  const destination = new URL(event.newURL).hash;
  const {course,section} = current(destination);
  if (previous.course && previous.section === 'chat' && (section !== 'chat' || course?.id !== previous.course.id)) {
    translationOpen.delete(previous.course.id);
    const saving = archiveChat(previous.course).catch(()=>notify('Չհաջողվեց զրույցը տեղափոխել պատմություն։'));
    navigationArchive = Promise.all([navigationArchive,saving]).then(()=>{});
  }
  if (activeAI && (section !== 'chat' || course?.id !== activeAI.course)) {
    webDrafts.delete(activeAI.course);
    activeAI = null;
  }
  await navigationArchive;
  if (location.hash !== destination) return;
  render();
  window.scrollTo(0,0);
});

window.addEventListener('pageshow', async event => {
  if (!event.persisted) return;
  const {course,section} = current();
  if (!course || section !== 'chat') return;
  activeAI = null;
  translationOpen.delete(course.id);
  try {
    await archiveChat(course);
  } catch {
    notify('Չհաջողվեց զրույցը տեղափոխել պատմություն։');
  }
  render();
});

render();
window.addEventListener('storage',event=>{
  if (event.key===stateRevisionKey) refreshSavedState();
});
window.addEventListener('focus',refreshSavedState);
if(account){syncLibrary();window.addEventListener('focus',syncLibrary);window.addEventListener('online',syncLibrary);}
fetch('/api/status').then(response => response.ok ? response.json() : null).then(async info => {
  if (!info) return;
  guestReady=Boolean(info.guestReady);guestAdmin=Boolean(info.guestAdmin);visitor=Boolean(info.visitor);
  onlineModeAvailable = Boolean(info.onlineAvailable);
  onlineConnected = Boolean(info.onlineConnected);
  backupConnected = Boolean(info.backupConnected);
  groqConnected = Boolean(info.groqConnected);
  routerConnected=Boolean(info.routerConnected || (backupConnected && !groqConnected));
  if (guestAdmin && !guestReady && (groqConnected || onlineConnected)) {
    const enabled=await fetch('/api/guest/enable',{method:'POST'}).catch(()=>null);
    if (enabled?.ok) guestReady=true;
  }
  updateChatMode();
  if(guestReady && !onlineConnected && !backupConnected){const box=app.querySelector('#chat-form [name=web]');if(box && !webDrafts.has(current().course?.id)) box.checked=false;}
}).catch(() => {});

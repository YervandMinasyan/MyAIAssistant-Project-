const ARMENIAN_SCRIPT = /[Ա-Ֆա-ֆև]/u;
const COMMON_WORDS = [
  ['բարև','barev barew parev'], ['ողջույն','voghjuyn voxjuyn'],
  ['ինչ','inch inc'], ['ինչպես','inchpes incpes inchbes vonc vonts'],
  ['ի՞նչ','inchy'], ['ինչո՞ւ','inchu inchu՞'], ['որտեղ','vortex vortegh vorteg ur'],
  ['որ','vor'], ['երբ','erb yerb'], ['ով','ov'], ['որն','vorn'], ['որն է','vorne'],
  ['նա','na'], ['ես','es'], ['դու','du'], ['իմ','im'], ['մեր','mer'],
  ['ինձ','indz inz'], ['քեզ','qez kez'], ['քո','qo'], ['և','ev yev u'],
  ['է','e a'], ['եմ','em'], ['ես','yes'], ['են','en'], ['այս','ays'],
  ['այդ','ayd'], ['այդպես','aydpes'], ['սա','sa'], ['իսկ','isk'],
  ['հետո','heto'], ['հիմա','hima'], ['նույնը','nuyny'], ['էլ','el'], ['կա','ka'], ['կան','kan'],
  ['խնդրում եմ','xndrum khndrum xntrem khntrem'],
  ['կարո՞ղ ես','karoxes karoghes karas karox karogh'],
  ['ուզում եմ','uzum'], ['ուզեմ','uzem'], ['կուզեի','kuzei kuzeqi'], ['ցանկանում եմ','cankanum tsankanum'],
  ['պետք է','petq petka petqa'], ['բացատրիր','bacatrir bacatri batsatrir bacatre bacatrel batsatrel'], ['բացատրես','bacatres batsatres'],
  ['համեմատիր','hamematir hamemati'], ['ամփոփիր','ampopir ampopi amphopir'],
  ['կրկնիր','krknir krkni'], ['ավելի','aveli'], ['պարզ','parz'],
  ['կարճ','karch karj krchat'], ['մանրամասն','manramasn manramas'],
  ['օրինակ','orinak orinaq'], ['օրինակով','orinakov orinaqov'], ['պատասխանիր','patasxanir patasxani patasxanel pataskhanir petasxani'],
  ['գրիր','grir gri'], ['ուղարկիր','uxarkir uxarki ugharkir ugharki'],
  ['ասա','asa asir asac asel'], ['տուր','tur'], ['օգնիր','ognir ogni'],
  ['փնտրիր','pntrel pntri pntir pntrir pndrel proqpri porprel'],
  ['որոնիր','voronir voronel voroni vornum voronum'], ['գտիր','gtir gti gtnel'],
  ['կազմիր','kazmir kazmi kazmel kazm'], ['սարքիր','sarqi sarqir sarki sarqel'],
  ['պատրաստիր','patrastir patrasti patrastel'],
  ['ստեղծիր','stexc stexcel stexcel stexcir stexci steghtsir'],
  ['ստուգիր','stugir stugi stugel stugenq'], ['թարգմանիր','targmanir targmani targmanel'],
  ['մաքրիր','maqrir maqri maqrel makrir makri maqr'], ['ջնջիր','jnjir jnji jnjel'],
  ['զրույցը','zruycy zruyce zruyc zruycnery zruycner chaty chatn'], ['PDF-ը','pdfy pdfn'], ['PDF-ից','pdfic'],
  ['համար','hamar'], ['համարի','hamari'], ['համարից','hamaric'],
  ['նյութ','nyut nut'], ['նյութը','nyuty nyutn nyouthy nvty nuyty'],
  ['նյութի','nyuti nuyti nuti'], ['նյութից','nyutic nuytic nutic'],
  ['նյութերը','nyutery nyutnery nuytery nutery nyutner'],
  ['նյութերի','nyuteri nuyteri'], ['նյութերից','nyuteric nuyteric nyutneric'],
  ['նյութերում','nyuterum nuyterum'], ['դաս','das'],
  ['դասընթաց','dasyntac dasyntats dasyntc dasynatc dasntac dasentac'],
  ['դասընթացի','dasyntaci dasyntatsi dasyntci dasynatci'],
  ['դասընթացը','dasyntacy dasyntacy dasyntcy dasynatcy'],
  ['դասախոսություն','lekcia leki̇ca lekicia lekica lektsia leksia dasaxosutyun dasakhosutyun dasaxosutyun'],
  ['հարց','harc harts harq'], ['հարցեր','harcer harceri hartser'],
  ['հարցանոց','harcanoc harcanots hartsanoc harcanots'],
  ['հարցաշար','harcashar hartslashar harcasharer hartashar'],
  ['թեստ','tester testy testeri testery tesc tesd testner testn'],
  ['ստուգողական','stugoxakan stugoghakan stugakan stugaxkan stoguxakan stogoxakan'],
  ['քննություն','qnnutyun knnutyun qnutyun qnnutyan knnutyan'],
  ['կրկնություն','krknutyun krknutyunner krknutyuny'],
  ['համացանց','hamacanc hamatsants interneti internewt'],
  ['համացանցում','hamacancum hamatsantsum internetum internewtum'],
  ['համացանցից','hamacancic hamatsantsic internetic internewtic'],
  ['միայն','miayn menak miain'], ['առանց','aranc arants'],
  ['թեմա','tema thema'], ['թեմայի','temayi'], ['թեմայով','temayov'],
  ['մասին','masin'], ['մասը','masy'], ['վերաբերյալ','veraberyal veraberjal'],
  ['մեջ','mej'], ['վրա','vra'], ['հիման','himan'], ['բոլորը','bolory bolor bolorn'],
  ['ամբողջ','amboghj amboxj amboghjy amboxjy'], ['կամ','kam'],
  ['այն','ayn'], ['ապա','apa'], ['արդեն','arden'], ['երբեմն','erbemn'],
  ['կարողանամ','karoxanam karoganam'], ['հասկանա','haskana haskanna'],
  ['հասկանամ','haskanam'], ['աշխատում','ashxatum ashkatum ahsxatum ashxatume'],
  ['աշխատի','ashxati ashkati ahsxati'], ['աշխատել','ashxatel ashkatel ahsxatel'],
  ['գաղափար','gaxapar gaghapar'], ['կայք','kayq kayk sayt sitey kayqy'],
  ['քերականություն','qerakanutyun kerakanutyun'], ['թարգմանություն','targmanutyun'],
  ['հայերեն','hayeren hayerenov'], ['հայատառ','hayatar hayatarr'],
  ['լատինատառ','latinatar latinatarr'], ['անգլերեն','angleren anglerenov'],
  ['ռուսերեն','ruseren ruserenov russeren'], ['անունը','anuny anune'],
  ['նշված','nshvac nshvats'], ['գրված','grvac grvats'],
  ['մեկ','mek mi'], ['երկու','erku erkou'], ['երեք','ereq erek ireq irek'],
  ['չորս','chors'], ['հինգ','hing'], ['վեց','vec vets vety'],
  ['յոթ','yot'], ['ութ','ut uth'], ['ինը','iny ine'], ['տասը','tas tasy'],
  ['տասնմեկ','tasnmek'], ['տասներկու','tasnerku'], ['տասներեք','tasnereq'],
  ['տասնչորս','tasnchors'], ['տասնհինգ','tasnhing'],
  ['առաջին','arajin'], ['երկրորդ','erkrord erkrordi'], ['երրորդ','errord yerord'], ['վեցերորդ','vecrord vetserord vecerord']
];
const TERM_STEMS = [
  ['ֆունկցիա','funkcia funktsia funkcya funksia funqcia'], ['ռեկուրսիա','rekursia rekursya recursia'],
  ['ալգորիթմ','algoritm algoritmo alghoritm'], ['փոփոխական','popoxakan poxoxakan popokhakan'],
  ['պարամետր','parametr'], ['արգումենտ','argumentt argoument'],
  ['հղում','hxum hghum'], ['գրաֆ','graf graphy'], ['հանգույց','hanguyc hanguyts'],
  ['դասավորություն','dasavorutyun dasavorutyoun'], ['հիերարխիա','hierarxia hierarkhia'],
  ['հասանելիություն','hasaneliutyun hasaneliutyoun'], ['բազա','baza'], ['տվյալ','tvyal tvial'],
  ['կանգ','kang'], ['պայման','payman'], ['համակարգ','hamakarg'],
  ['գիտելիք','gitelik gitelikq giteliq'], ['արժեք','arjeq arzheq arjeq'],
  ['ծրագիր','cragir tsragir'], ['ծրագրավորում','cragravorum tsragravorum'],
  ['դիզայն','dizayn dizain'], ['բրաուզեր','brauzer browsery']
];
const NO_CONTEXT = new Set('a e u el es yes em en ev im du qo ov na sa ur vor karox mi tas ut inc inch mer ka kam me hi'.split(' '));
const PROTECTED_WORDS = new Set('api css html sql js ts react python javascript typescript git github latex linux pdf epub http https url rag graphrag chat chatgpt gemini claude cursor openai stem node npm svg png jpeg json csharp c++ lab valid path while return function parameter argument const layout bool array grid flexbox closure recursion'.split(' '));
const ENDINGS = new Map(Object.entries({
  neri:'ների', nery:'ները', neric:'ներից', nerov:'ներով', nerum:'ներում', ner:'ներ',
  yer:'եր', yic:'յից', yov:'յով', yun:'յուն', ayin:'ային', ien:'ին',
  ic:'ից', ov:'ով', um:'ում', in:'ին', i:'ի', n:'ն', y:'ը'
}));

const direct = new Map(COMMON_WORDS.flatMap(([text,forms])=>forms.split(' ').map(form=>[form,text])));
const stems = new Map(TERM_STEMS.flatMap(([text,forms])=>forms.split(' ').map(form=>[form,text])));
const transliterations = new Map([...direct,...stems]);
const typoWords = new Map();
for (const [form,word] of transliterations) {
  if (form.length < 5) continue;
  if (!typoWords.has(form[0])) typoWords.set(form[0],[]);
  typoWords.get(form[0]).push([form,word]);
}
const INPUT = /```[\s\S]*?(?:```|$)|`[^`\n]*`|https?:\/\/\S+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[a-z]{2,}|\b[nN](?:[-‐‑–—]\d+|\d+)(?:[-‐‑–—][\p{L}]+)?\b|\b[\w-]+\.(?:pdf|epub|txt|md|js|ts|html|css|py|jsx|tsx)\b|\b[a-z]+(?:[-'][a-z]+)*(?![\p{L}\p{N}_])/giu;
const LATIN_WORD = /^[a-z]+(?:[-'][a-z]+)*$/i;

export function oneSpellingEdit(left,right) {
  if (Math.abs(left.length-right.length)>1) return false;
  let i=0;
  while (i<left.length && left[i]===right[i]) i++;
  if (i===left.length || i===right.length) return true;
  if (left.length < right.length) return left.slice(i)===right.slice(i+1);
  if (left.length > right.length) return left.slice(i+1)===right.slice(i);
  return left.slice(i+1)===right.slice(i+1) ||
    (left[i]===right[i+1] && left[i+1]===right[i] && left.slice(i+2)===right.slice(i+2));
}

function inflectedWord(raw) {
  for (const [ending,suffix] of ENDINGS) {
    if (!raw.endsWith(ending)) continue;
    const root = raw.slice(0,-ending.length).replace(/-$/u,'');
    const word = stems.get(root);
    if (word) return word + (ending==='y' && /[աեէիոօ]$/u.test(word) ? 'ն' : suffix);
  }
  return '';
}

export function normalizeArmenianInput(input) {
  const words = [...input.matchAll(INPUT)].map(match=>match[0]).filter(word=>LATIN_WORD.test(word) && !/^[A-Z]{2,}$/u.test(word));
  const keys = words.map(word=>word.toLowerCase());
  const hasScript = ARMENIAN_SCRIPT.test(input);
  const known = keys.filter(word=>!NO_CONTEXT.has(word) && !PROTECTED_WORDS.has(word) &&
    (transliterations.has(word) || inflectedWord(word))).length;
  const romanized = known > 0 || keys.some((word,i)=>['inc','inch'].includes(word) && /^(?:e|a|en)$/u.test(keys[i+1] || ''));
  if (!romanized && !hasScript) return {text:input,armenian:false,romanized:false};

  let text = input.replace(INPUT,word => {
    if (!LATIN_WORD.test(word) || /^[A-Z]{2,}$/u.test(word)) return word;
    const key = word.toLowerCase();
    if (PROTECTED_WORDS.has(key)) return word;
    const suffix = word.match(/^([a-z]+?)-?(ic|ov|um|in|y|n|i)$/iu);
    if (suffix && PROTECTED_WORDS.has(suffix[1].toLowerCase())) {
      if (suffix[1].toLowerCase() === 'argument') return 'արգումենտ' + ENDINGS.get(suffix[2].toLowerCase());
      return suffix[1] + '-' + ENDINGS.get(suffix[2].toLowerCase());
    }
    if (transliterations.has(key)) return transliterations.get(key);
    const inflected = inflectedWord(key);
    if (inflected) return inflected;
    if (key.length < 6 || (!hasScript && !known)) return word;
    const candidates = new Set((typoWords.get(key[0]) || []).filter(([form])=>oneSpellingEdit(key,form)).map(([,term])=>term));
    return candidates.size === 1 ? candidates.values().next().value : word;
  });
  text = text.replace(/(?:կարո՞ղ ես|ուզում եմ|ցանկանում եմ|խնդրում եմ) (?:ես|եմ)(?![\p{L}])/gu,
    phrase=>phrase.slice(0,phrase.lastIndexOf(' '))).replace(/պետք է է(?![\p{L}])/gu,'պետք է');
  return {text,armenian:true,romanized};
}

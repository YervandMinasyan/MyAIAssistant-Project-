import { bilingualTopic,bilingualQuizProse } from './study-terms.mjs';

const armenian = /[ա-ֆԱ-Ֆև]/u;
const shuffle = items => items.map(value=>({value,order:Math.random()})).sort((a,b)=>a.order-b.order).map(item=>item.value);
const term = bilingualTopic;
const cite = ({number,label,title}) => ({number,label,title});

export function multipleChoice(entry,prompt,correct,distractors,explanation) {
  const choices = [correct,...distractors].map(bilingualQuizProse);
  const options = shuffle([...new Set(choices)]);
  return {prompt:bilingualQuizProse(prompt),options,correct:options.indexOf(choices[0]),
    explanation:bilingualQuizProse(explanation),sources:[cite(entry)]};
}

const documentedCases = [
  {
    applies:/Վեբ\p{L}*.{0,120}կապակցված.{0,35}էջ.{0,45}ռեսուրս/iu,
    prompt:'Ուսանողական կայքի էջերը հղումներով կապվում են այլ էջերի և ռեսուրսների հետ։ Ինչպե՞ս է այս օրինակը ցույց տալիս ' + term('web') + 'ի կառուցվածքը։',
    correct:'Էջերն ու ռեսուրսները փոխկապակցված համակարգ են կազմում։',
    wrong:['Էջերի միջև կապ ստեղծելու համար բոլոր էջերը պետք է միավորվեն մեկ ֆայլի մեջ։','Մեկ էջը մյուսում երևալու համար այն պետք է ամբողջությամբ պատճենել։'],
    why:'Նյութում '+term('web')+'ը նկարագրված է որպես իրար կապակցված էջերի և ռեսուրսների համակարգ։'
  },
  {
    applies:/\bOSI(?:\s+model)?\b[^։.!?]{0,100}(?:seven|7)\s+(?:different\s+)?layers|OSI[^։.!?]{0,100}(?:յոթ|7)\s+շերտ/iu,
    prompt:'Երկու ուսանող գծում են ' + term('OSI model') + 'ի սխեման։ Առաջինը միավորում է ներկայացման և կիրառական շերտերը մեկ շերտում։ Ինչպե՞ս ուղղել սխեման։',
    correct:'Պահել երկու շերտերն առանձին, որպեսզի մոդելն ունենա յոթ շերտ։',
    wrong:['Միավորել երկու շերտերը և պահպանել վեց շերտ։','Միավորել այդ երկու շերտերը և փոխարենը բաժանել ցանցային շերտը։'],
    why:'Նյութը առանձնացնում է ' + term('Presentation layer') + ' և ' + term('Application layer') + ' շերտերը յոթշերտ մոդելում։',
    needs:/presentation.+application|ներկայացման.+կիրառական/iu
  },
  {
    applies:/\bOSI(?:\s+model)?\b[^։.!?]{0,100}(?:seven|7)\s+(?:different\s+)?layers|OSI[^։.!?]{0,100}(?:յոթ|7)\s+շերտ/iu,
    prompt:'Ուսանողը կազմում է ցանցային խնդիրների դասակարգման յոթաստիճան սխեմա։ Ըստ նյութի՝ ո՞ր մոդելն է համապատասխանում առաջարկած կառուցվածքին։',
    correct:term('OSI model'),
    wrong:[term('TCP/IP'),'Միայն ֆիզիկական շերտի սխեման։'],
    why:term('OSI model') + 'ը նյութում նկարագրված է որպես յոթշերտ կառուցվածք։'
  },
  {
    applies:/TCP\s*\/\s*IP.{0,180}(?:transmission control protocol|կառավարման արձանագրություն).{0,120}(?:internet protocol|ինտերնետային արձանագրություն)/iu,
    prompt:'Ցանցի փաստաթղթում պետք է նշել նյութում ' + term('TCP/IP') + 'ի հետ կապված երկու արձանագրությունները։ Ո՞ր զույգն է ճիշտ։',
    correct:term('TCP') + ' և ' + term('IP'),
    wrong:[term('TCP') + ' և ' + term('Application layer'),term('IP') + ' և ' + term('Physical layer')],
    why:'Նյութը նշում է ' + term('TCP') + ' և ' + term('IP') + ' արձանագրությունները։ Տարբերակներում հիշատակված շերտերը արձանագրության անուններ չեն։'
  },
  {
    applies:/TCP\s*\/\s*IP.{0,150}(?:includes|ներառում է).{0,180}(?:internet layer|ինտերնետային շերտ)/iu,
    prompt:'Ո՞ր մոդելի գծապատկերում պետք է տեղադրել ' + term('Internet layer') + 'ը՝ հետևելով նյութի տված շերտերի ցանկին։',
    correct:term('TCP/IP'),
    wrong:[term('OSI model'),'Որպես երկու մոդելներից անկախ արձանագրություն։'],
    why:'Ըստ նյութի՝ ' + term('Internet layer') + 'ը ' + term('TCP/IP') + 'ի շերտերից մեկն է։'
  },
  {
    applies:/OSI.*TCP\s*\/\s*IP.*(?:layers are grouped|շերտերի խմբավորմ|շերտերը խմբավոր)/iu,
    prompt:'Ինչո՞ւ կարող է սխալ լինել ' + term('OSI model') + 'ի յուրաքանչյուր շերտը մեկ առ մեկ համապատասխանեցնել ' + term('TCP/IP') + 'ի շերտին։',
    correct:'Երկու մոդելներում շերտերը տարբեր կերպ են խմբավորված։',
    wrong:['Երկու մոդելներում շերտերի խմբավորումը նույնն է, իսկ անունները տարբեր են։','Երկու մոդելների համեմատությունը վերաբերում է միայն արձանագրությունների անվանումներին։'],
    why:'Նյութում ներկայացված տարբերությունը վերաբերում է շերտերի խմբավորմանը։'
  },
  {
    applies:/(?:արգումենտ|\barguments?\b).{0,155}(?:արժեք.{0,90}(?:փոխանց|կանչ)|value.{0,70}(?:pass|call))/iu,
    prompt:'Ֆունկցիան կանչելիս փոխանցում ես 12 արժեքը։ Ո՞ր հասկացությունն է նկարագրում հենց փոխանցված 12-ը։',
    correct:term('argument'),
    wrong:[term('parameter'),term('return value')],
    why:term('argument') + 'ը կանչի ժամանակ փոխանցվող արժեքն է։ ' + term('parameter') + 'ը ֆունկցիայի սահմանման անունն է։'
  },
  {
    applies:/(?:պարամետր|\bparameters?\b).{0,150}(?:անուն|անվան|մուտքային արժեք|placeholder|named|receives|accepts)/iu,
    prompt:'Ֆունկցիայի սահմանման մեջ մուտքային արժեքը կոչվում է `total`։ Կանչերի ժամանակ դրան կարող են փոխանցվել տարբեր թվեր։ Ի՞նչ դեր ունի `total` անունը։',
    correct:term('parameter'),
    wrong:[term('argument'),term('return value')],
    why:term('parameter') + 'ը սահմանման մեջ մուտքային արժեքը ներկայացնող անունն է։'
  },
  {
    applies:/(?:ֆունկցիա\p{L}*|\bfunctions?\b).{0,140}(?:հրամանների խումբ|կանչել|group.{0,20}statements|reus(?:e|able))/iu,
    prompt:'Մի քանի տեղում պետք է կատարել հրամանների նույն խումբը։ Ինչպե՞ս օգտագործել նյութում ներկայացված ' + term('function') + 'ը։',
    correct:'Խումբը սահմանել մեկ անգամ և կանչել անհրաժեշտ տեղերում։',
    wrong:['Ամեն տեղ արտագրել հրամանների խումբը և առանձին փոփոխել պատճենները։','Սահմանել հրամանների խումբը և ենթադրել, որ այն կաշխատի անհրաժեշտ բոլոր տեղերում առանց կանչի։'],
    why:term('function') + 'ը թույլ է տալիս հրամանների խումբը կանչել ծրագրի տարբեր հատվածներից։'
  },
  {
    applies:/(?:կանգի պայման|\bbase case\b).{0,150}(?:նոր կանչ|ավարտ|կանգ|stop|without.{0,35}call|terminat)/iu,
    prompt:'Ռեկուրսիվ լուծումը հասնում է այն դեպքին, որի պատասխանը պատրաստ է։ Ի՞նչ պետք է անի ' + term('base case') + 'ը։',
    correct:'Վերադարձնի պատասխանը՝ նոր ռեկուրսիվ կանչ չկատարելով։',
    wrong:['Նույն մուտքով կատարի ևս մեկ ռեկուրսիվ կանչ։','Փոխի կանչի պարամետրերը և պարտադիր շարունակի ռեկուրսիան։'],
    why:term('base case') + 'ը սահմանում է, թե երբ պետք է դադարեցնել նոր կանչերը։'
  },
  {
    applies:/CSS Grid.{0,110}(?:(?:rows|տողերից?).{0,24}(?:columns|սյուներից?)|(?:columns|սյուներից?).{0,24}(?:rows|տողերից?))/iu,
    prompt:'Քարտերը պետք է հավասարեցնել միաժամանակ ըստ տողերի ու սյուների։ Ո՞ր մոտեցումն է համապատասխանում նյութի նկարագրությանը։',
    correct:term('CSS Grid'),
    wrong:[term('Flexbox') + '՝ մեկ ուղղությամբ դասավորությամբ։',term('HTML') + ' վերնագրերի հերթականությունը փոխելով։'],
    why:term('CSS Grid') + 'ը նյութում ներկայացված է որպես տողերից ու սյուներից կազմված դասավորություն։'
  }
];

export function conceptQuestions(entries,count) {
  const questions = [];
  const add = question => {
    if (question.options.length >= 3 && !questions.some(previous=>previous.prompt===question.prompt)) questions.push(question);
  };
  for (const test of documentedCases) {
    const entry = entries.find(item=>test.applies.test(item.text) && (!test.needs || test.needs.test(item.text)));
    if (entry) add(multipleChoice(entry,test.prompt,test.correct,test.wrong,test.why));
    if (questions.length === count) return questions;
  }
  const definitions = entries.flatMap(entry=>{
    const sentence = entry.text.trim();
    if (!armenian.test(sentence) || sentence.length>320) return [];
    const line = sentence.match(/^([^,։.!?]{2,62}?)\s+(?:նշանակում է|նկարագրում է|սահմանում է|է|են|դա)\s+(.{12,})/u);
    const late = sentence.match(/^([\p{L}\p{N}/-]+(?:\s+[\p{L}\p{N}/-]+){0,2})[ըն]\s+(.{12,}?)\s+է(?:[։.,;՝\s]|$)/u);
    const subject = line?.[1] || late?.[1];
    const description = (line?.[2] || late?.[2])?.trim().replace(/[։.]+$/u,'');
    if (!subject || !armenian.test(description || '') || /^\d+$/u.test(description)) return [];
    return [{entry,subject:subject.replace(/-?[ըն]$/u,''),description}];
  });
  for (const fact of definitions) {
    const wrong = [...new Set(definitions.filter(other=>other!==fact && other.subject!==fact.subject)
      .map(other=>bilingualQuizProse(other.description)))];
    if (wrong.length < 2) continue;
    add(multipleChoice(fact.entry,'Ո՞ր նկարագրությամբ կբացատրես «' + term(fact.subject) + '» հասկացությունը։',
      bilingualQuizProse(fact.description),wrong.slice(0,2),
      'Նյութում «' + term(fact.subject) + '» հասկացության մասին տրված նկարագրությունն է՝ ' + bilingualQuizProse(fact.description) + '։'));
    if (questions.length === count) break;
  }
  return questions;
}

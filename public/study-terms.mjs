const termPairs = [
  ['OSI model','OSI մոդել'], ['TCP/IP','TCP/IP արձանագրությունների փաթեթ'],
  ['Physical layer','ֆիզիկական շերտ'], ['Data Link layer','տվյալների կապի շերտ'],
  ['Network layer','ցանցային շերտ'], ['Transport layer','փոխադրման շերտ'],
  ['Session layer','նիստի շերտ'], ['Presentation layer','ներկայացման շերտ'],
  ['Application layer','կիրառական շերտ'], ['Internet layer','ինտերնետային շերտ'],
  ['Network Access layer','ցանցային հասանելիության շերտ'],
  ['Transmission Control Protocol','փոխանցման կառավարման արձանագրություն'],
  ['Internet Protocol','ինտերնետային արձանագրություն'],
  ['TCP','փոխանցման կառավարման արձանագրություն'], ['IP','ինտերնետային արձանագրություն'],
  ['function','ֆունկցիա'], ['parameter','պարամետր'], ['argument','արգումենտ'],
  ['return value','վերադարձվող արժեք'], ['recursion','ռեկուրսիա'],
  ['base case','կանգի պայման'], ['call stack','կանչերի կույտ'], ['variable','փոփոխական'],
  ['browser','դիտարկիչ'], ['server','սերվեր'], ['hyperlink','հղում'],
  ['heading','վերնագիր'], ['layout','դասավորություն'],
  ['visual hierarchy','տեսողական հիերարխիա'], ['contrast','հակադրություն'],
  ['accessibility','հասանելիություն'], ['database','տվյալների բազա'],
  ['knowledge graph','գիտելիքների գրաֆ'], ['node','հանգույց'], ['edge','կող'],
  ['GraphRAG','գրաֆով ընդլայնված որոնում և ստեղծում'], ['RAG','որոնմամբ ընդլայնված ստեղծում'],
  ['CSS Grid','ցանցային դասավորություն'], ['Flexbox','ճկուն դասավորություն'],
  ['HTML','հիպերտեքստի նշագրման լեզու'], ['CSS','ոճաթերթերի լեզու'],
  ['JavaScript','ՋավաՍկրիպտ ծրագրավորման լեզու'], ['web','համաշխարհային սարդոստայն']
];

const termKey = value => value.normalize('NFKC').toLowerCase().replaceAll('և','եւ').trim();
const byLabel = new Map(termPairs.flatMap(([english,armenian])=>[
  [termKey(english),[english,armenian]],[termKey(armenian),[english,armenian]]
]));
for (const [alias,term] of [
  ['բրաուզեր','browser'], ['տրանսպորտային շերտ','Transport layer'],
  ['Transmission Control Protocol (TCP)','TCP'], ['Internet Protocol (IP)','IP']
]) byLabel.set(termKey(alias),byLabel.get(termKey(term)));

export function bilingualTopic(label) {
  const pair = byLabel.get(termKey(label));
  return pair ? pair[0] + ' (' + pair[1] + ')' : label;
}

const escapeTerm = term=>term.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const englishSpellings = [...termPairs].sort((a,b)=>b[0].length-a[0].length).map(([english])=>escapeTerm(english));
const armenianQuizTerms = ['ֆունկցիա','պարամետր','արգումենտ','ռեկուրսիա','կանգի պայման','կանչերի կույտ',
  'տեսողական հիերարխիա','վերադարձվող արժեք','տվյալների բազա','ֆիզիկական շերտ','կիրառական շերտ',
  'փոխադրման շերտ','ներկայացման շերտ','տրանսպորտային շերտ','ինտերնետային շերտ'].map(escapeTerm);
const technicalProse = new RegExp('(?:```[\\s\\S]*?(?:```|$)|`[^`\\n]+`|https?://[^\\s]+)|(?<![\\p{L}\\p{N}/])(?:' +
  englishSpellings.join('|') + ')(?![\\p{L}\\p{N}/])(?:\\s*\\([^()]*[ա-ֆև][^()]*\\))?|' +
  '(?<![\\p{L}\\p{N}])(' + armenianQuizTerms.join('|') +
  ')(?:ներից|ները|ների|ներ|երից|երը|երի|ից|ին|ով|ում|ի|ը|ն)?(?![\\p{L}\\p{N}])','giu');

export function bilingualQuizProse(text) {
  return text.replace(technicalProse,(word,armenian)=>{
    if (!armenian) return bilingualTopic(word);
    return byLabel.get(termKey(armenian))[0] + ' (' + word.toLowerCase() + ')';
  });
}

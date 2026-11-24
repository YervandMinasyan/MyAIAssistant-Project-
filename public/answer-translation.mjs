import { MAX_ANSWER_TRANSLATION } from './study-model.mjs';

// Keep source references and executable examples outside the model's translation.
const protectedText = /```[\s\S]*?(?:```|$)|`[^`\n]+`|\[\d{1,3}\]|(?<![\p{L}\p{N}])N-\d+|https?:\/\/[^\s<>]+/gu;

function partsOf(text,limit,prefix) {
  const pieces = [];
  const markers = new RegExp(prefix + '\\d+_END','gu');
  let remaining = text;
  while (remaining.length > limit) {
    const window = remaining.slice(0,limit);
    const paragraph = window.lastIndexOf('\n');
    const space = window.lastIndexOf(' ');
    let cut = paragraph > limit/2 ? paragraph : space > 0 ? space : limit;
    const boundary = [...remaining.matchAll(markers)].find(mark=>mark.index<cut && mark.index+mark[0].length>cut);
    if (boundary) cut = boundary.index || boundary[0].length;
    const ending = remaining.slice(cut).match(/^\s*/u)[0];
    pieces.push({text:remaining.slice(0,cut),ending});
    remaining = remaining.slice(cut+ending.length);
  }
  return [...pieces,{text:remaining,ending:''}];
}

export async function translateAnswerText(text,request,limit=MAX_ANSWER_TRANSLATION) {
  const preserved = [];
  let prefix = 'KEEP_TOKEN_';
  while (text.includes(prefix)) prefix = '_' + prefix;
  const masked = text.replace(protectedText,match=>{
    const tag = prefix + preserved.length + '_END';
    preserved.push({tag,match});
    return tag;
  });
  const translated = [];
  for (const piece of partsOf(masked,limit,prefix)) {
    const tokens = preserved.filter(({tag})=>piece.text.includes(tag));
    const content = tokens.reduce((value,{tag})=>value.replace(tag,''),piece.text);
    if (!/\p{L}/u.test(content)) {
      translated.push(piece.text+piece.ending);
      continue;
    }
    const result = await request(piece.text);
    if (typeof result?.translated !== 'string' || !result.translated.trim()) throw new Error('Թարգմանությունը չստացվեց։');
    const output = result.translated.trim();
    const unmarked = tokens.reduce((value,{tag})=>value.replace(tag,''),output);
    if (tokens.some(({tag})=>output.split(tag).length !== 2) || unmarked.includes(prefix) || /\[\d{1,3}\]/u.test(unmarked)) {
      throw new Error('Աղբյուրների կամ կոդի նշումները չպահպանվեցին։ Կրկին փորձիր։');
    }
    translated.push(output+piece.ending);
  }
  return preserved.reduce((value,{tag,match})=>value.replace(tag,()=>match),translated.join(''));
}

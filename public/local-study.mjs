import { selectEvidence } from './course-graph.mjs';
export { runStudyModel as runLocalStudy } from './study-model.mjs';

const FOLLOW_UP = /(?:^(?:իսկ|հետո|նույնը|isk\b|heto\b|hima\b)|(?:ավելի|կարճ|պարզ|օրինակ|շարունակ|aveli|parz|krchat|karch|orinak|sharunak))/iu;

export function localEvidence(course,prompt,details,evidence) {
  if (details.references.length || !FOLLOW_UP.test(prompt)) return evidence;
  const recent = [...course.messages].reverse().find(message => message.sources?.length);
  const materialIds = [...new Set(recent?.sources.map(source => source.number))]
    .filter(number => course.materials.some(material => material.number === number));
  if (!materialIds.length) return evidence;
  const previous = selectEvidence(course,prompt,{...details,references:materialIds});
  const anchored = previous.filter(item => recent.sources.some(source => source.number === item.number && source.label === item.label));
  const entries = [...evidence.filter(item => item.score >= 6),...anchored,...previous];
  return [...new Map(entries.map(item => [item.number + ':' + item.label + ':' + item.text,item])).values()];
}

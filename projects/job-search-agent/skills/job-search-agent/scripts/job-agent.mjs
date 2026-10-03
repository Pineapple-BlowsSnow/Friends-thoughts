#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const DIMENSIONS = { skills: 30, responsibilities: 25, seniority: 15, domain: 10, conditions: 10, goals: 10 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = code => { throw new Error(code); };
const check = (value, code) => { if (!value) fail(code); };
const own = (x, user) => check(x.user_id === user && UUID.test(x.id), 'OWNERSHIP_OR_ID');
const nonblank = x => typeof x === 'string' && /\S/u.test(x);
const canonical = x => JSON.stringify(x, (_, v) => v && !Array.isArray(v) && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
export const digest = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : canonical(x)).digest('hex');
export const snapshot = facts => digest([...facts].sort((a,b) => a.id.localeCompare(b.id)));
const utc = s => {
  check(typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s), 'UTC_REQUIRED');
  const n = Date.parse(s); check(Number.isFinite(n) && new Date(n).toISOString().slice(0,19) === s.slice(0,19), 'INVALID_TIME'); return n;
};
const unique = xs => new Set(xs).size === xs.length;

export function scoreJob(job, facts, user, confirmations = {}) {
  own(job, user);
  const jd = job.jd, evidence = job.evidence, rules = job.rules;
  check(jd.job_version_id === evidence.job_version_id && UUID.test(jd.job_version_id), 'JOB_VERSION');
  check(digest(job.source_text) === jd.source_text_sha256, 'JD_TEXT_HASH');
  const requirements = new Map(jd.requirements.map(r => [r.requirement_id, r]));
  check(requirements.size === jd.requirements.length && requirements.size > 0, 'REQUIREMENTS');
  const weightByDim = Object.fromEntries(Object.keys(DIMENSIONS).map(d => [d, 0]));
  check(unique(rules.items.map(x => x.requirement_id)) && rules.items.length === requirements.size, 'RULE_COVERAGE');
  for (const r of rules.items) {
    check(requirements.has(r.requirement_id) && r.dimension in DIMENSIONS && Number.isFinite(r.weight) && r.weight > 0, 'RULE_ITEM');
    const span = requirements.get(r.requirement_id).source_span;
    check(span.source_text_sha256 === jd.source_text_sha256 && Number.isInteger(span.start) && Number.isInteger(span.end)
      && span.start >= 0 && span.start < span.end && span.end <= Array.from(job.source_text).length
      && Array.from(job.source_text).slice(span.start, span.end).join('') === span.quote, 'JD_SPAN');
    weightByDim[r.dimension] += r.weight;
  }
  for (const d of Object.keys(DIMENSIONS)) check(weightByDim[d] <= DIMENSIONS[d]+1e-9, 'DIMENSION_WEIGHTS');
  check(unique(evidence.items.map(x => x.evidence_item_id)) && unique(evidence.items.map(x => x.requirement_id)), 'DUPLICATE_EVIDENCE');
  const factMap = new Map(facts.map(x => [x.id, x]));
  check(factMap.size === facts.length, 'DUPLICATE_FACT'); facts.forEach(f => own(f,user));
  const hash = snapshot(facts), itemMap = new Map(evidence.items.map(x => [x.requirement_id, x]));
  const dimensions = Object.entries(DIMENSIONS).map(([dimension, weight]) => ({ dimension, weight, known_weight: 0, contribution_low: 0, unknown_weight: weight, evidence_item_ids: [] }));
  const states = new Map(); let conflict = false;
  for (const rule of rules.items) {
    const d = dimensions.find(x => x.dimension === rule.dimension), e = itemMap.get(rule.requirement_id);
    let level = null, state = 'unknown';
    if (e) {
      check(e.dimension === rule.dimension && unique(e.fact_ids) && e.fact_ids.every(id => factMap.has(id)), 'EVIDENCE_REFERENCE');
      check(['supported','partial','unsupported','unknown','conflict'].includes(e.evidence_state), 'EVIDENCE_STATE');
      check(e.evidence_state === 'supported' ? e.match_level === 1 : e.evidence_state === 'partial' ? [.25,.5,.75].includes(e.match_level)
        : e.evidence_state === 'unsupported' ? e.match_level === 0 : e.match_level === null, 'EVIDENCE_LEVEL');
      const refs = e.fact_ids.map(id => factMap.get(id));
      if (e.evidence_state === 'conflict' || refs.some(f => f.status === 'conflict')) conflict = true;
      if (confirmations[e.evidence_item_id] === hash && refs.length > 0 && refs.every(f => f.status === 'confirmed')) {
        if (e.evidence_state === 'unsupported') check(refs.some(f => f.polarity === 'negative'), 'NEGATIVE_PROOF_REQUIRED');
        if (['supported','partial'].includes(e.evidence_state)) check(refs.every(f => f.polarity === 'positive'), 'POSITIVE_PROOF_REQUIRED');
        state = e.evidence_state; level = e.match_level;
      }
      d.evidence_item_ids.push(e.evidence_item_id);
    }
    states.set(rule.requirement_id, state);
    if (level !== null) { d.unknown_weight -= rule.weight; d.known_weight += rule.weight; d.contribution_low += rule.weight * level; }
  }
  check(evidence.items.every(x => requirements.has(x.requirement_id)), 'UNKNOWN_REQUIREMENT');
  check(Array.isArray(rules.hard_checks) && unique(rules.hard_checks.map(x=>x.rule_id)), 'HARD_RULES');
  check(unique(rules.hard_checks.map(x=>x.requirement_id)), 'DUPLICATE_HARD_REQUIREMENT');
  check([...requirements.values()].filter(r=>r.certainty==='explicit'&&r.priority==='must_have')
    .every(r=>rules.hard_checks.some(h=>h.requirement_id===r.requirement_id)), 'MUST_HAVE_HARD_COVERAGE');
  const hard = rules.hard_checks.map(h => {
    check(requirements.has(h.requirement_id) && typeof h.critical === 'boolean', 'HARD_RULE');
    const r = requirements.get(h.requirement_id);
    check(r.certainty === 'explicit' && r.priority === 'must_have', 'INFERRED_HARD_RULE');
    const state = states.get(h.requirement_id);
    return { ...h, result: state === 'supported' ? 'pass' : state === 'unsupported' ? 'fail' : 'unknown' };
  });
  const low = dimensions.reduce((a,d)=>a+d.contribution_low,0), high = low+dimensions.reduce((a,d)=>a+d.unknown_weight,0);
  const coverage = dimensions.reduce((a,d)=>a+d.known_weight,0)/100;
  const route = hard.some(h=>h.result==='fail') ? 'BLOCKED' : conflict || hard.some(h=>h.critical&&h.result==='unknown') ? 'NEEDS_INFO'
    : low>=80 && coverage>=.85 && hard.every(h=>h.result==='pass') ? 'HIGH_MATCH' : high<60 ? 'LOW_MATCH' : 'REVIEW';
  return { score_low: low, score_high: high, coverage, route, hard_checks: hard, dimensions, fact_snapshot_hash: hash, submission_permission: false };
}

export function reviewDraft(draft, facts, user, sectionProjects = {}) {
  check(draft.fact_snapshot_hash === snapshot(facts), 'STALE_FACT_SNAPSHOT');
  const sections = new Map(draft.resume_sections.map(s=>[s.section_id,s.body]));
  check(sections.size===draft.resume_sections.length && sections.size>0 && !sections.has('cover_letter'), 'DRAFT_SECTIONS');
  if (draft.cover_letter!==null) sections.set('cover_letter',draft.cover_letter);
  check(unique(draft.claims.map(c=>c.claim_id)), 'CLAIM_IDS');
  const factMap = new Map(facts.map(f=>[f.id,f])); facts.forEach(f=>own(f,user));
  const issues = [], coverage = new Map([...sections].map(([id,text])=>[id,Array(Array.from(text).length).fill(false)]));
  const add = (code, claim, severity='blocker') => issues.push({code,claim_id:claim?.claim_id??null,severity});
  const genericTitles=new Set(['项目经历','工作经历','教育经历','技能','联系方式','职业目标','简介','个人简介','实习经历','证书','志愿经历','相关经历','其他经历','经历','经验','projects','work experience','experience','education','skills','contact','summary','objective','certificates','certifications','volunteering']);
  for(const s of draft.resume_sections){
    if(!nonblank(s.title))add('SECTION_TITLE_REQUIRED',null);
    else if(!genericTitles.has(s.title.trim().toLowerCase()))add('SECTION_CONTEXT_REVIEW_REQUIRED',null,'warning');
  }
  for (const c of draft.claims) {
    const body = sections.get(c.output_section_id), chars = body===undefined ? [] : Array.from(body);
    if (!Number.isInteger(c.start)||!Number.isInteger(c.end)||c.start<0||c.start>=c.end||c.end>chars.length||chars.slice(c.start,c.end).join('')!==c.claim_text) {add('CLAIM_SPAN',c);continue;}
    for(let i=c.start;i<c.end;i++) coverage.get(c.output_section_id)[i]=true;
    const refs = c.fact_ids.map(id=>factMap.get(id));
    if (!refs.length||!unique(c.fact_ids)||refs.some(f=>!f||f.user_id!==user||f.status!=='confirmed')) {add('UNCONFIRMED_FACT',c);continue;}
    const project = sectionProjects[c.output_section_id];
    if(c.output_section_id!=='cover_letter'&&refs.some(f=>nonblank(f.project_id))&&!nonblank(project)){add('PROJECT_BINDING_REQUIRED',c);continue;}
    if(project && refs.some(f=>f.project_id!==project)){add('CROSS_PROJECT',c);continue;}
    if(refs.some(f=>['sensitive','government_id','health'].includes(f.kind)))add('SENSITIVE_FIELD',c);
    const factualRefs = refs.filter(f=>!['contact','identity'].includes(f.kind));
    const proof = refs.map(f=>f.text).join('\n'), numericalProof = factualRefs.map(f=>f.text).join('\n');
    const numbers = c.claim_text.match(/\d+(?:[.,]\d+)*(?:%|％)?/g)??[];
    const proofNumbers=new Set(numericalProof.match(/\d+(?:[.,]\d+)*(?:%|％)?/g)??[]);
    if(numbers.some(n=>!proofNumbers.has(n)) && c.output_section_id!=='contact') add('UNSUPPORTED_NUMBER',c);
    const toolTerms=['Python','JavaScript','Java','TypeScript','SQL','React','Vue','Docker','Kubernetes','Excel','Photoshop','机器学习','深度学习'];
    if(toolTerms.some(t=>c.claim_text.toLowerCase().includes(t.toLowerCase())&&!proof.toLowerCase().includes(t.toLowerCase())))add('UNSUPPORTED_TOOL',c);
    if(/主导|负责人|独立完成|lead|led|owned/i.test(c.claim_text)&&!/主导|负责人|独立完成|lead|led|owned/i.test(proof))add('RESPONSIBILITY_INFLATION',c);
    if(c.transformation==='verbatim') {if(!refs.some(f=>f.text.trim()===c.claim_text.trim()))add('FALSE_VERBATIM',c);}
    else if(['rephrase','translate','shorten'].includes(c.transformation)) add('SEMANTIC_REVIEW_REQUIRED',c,'warning');
    else add('INVALID_TRANSFORMATION',c);
    if(/\[待补\]|TODO|TBD|<[^>]*待[^>]*>/i.test(c.claim_text))add('PLACEHOLDER',c);
  }
  for(const[id,text]of sections){if(!nonblank(text))add('EMPTY_SECTION',null);else if(Array.from(text).some((ch,i)=>/\S/u.test(ch)&&!coverage.get(id)[i]))add('UNCOVERED_TEXT',null);}
  const verdict=issues.some(x=>x.severity==='blocker')?'BLOCKED':issues.length?'NEEDS_HUMAN':'PASS_VERBATIM';
  return {verdict,issues,draft_digest:digest(draft),submission_permission:false};
}

export function patchDraft(draft, patch, facts, user, sectionProjects = {}) {
  check(patch.user_id===user && patch.base_artifact_hash===digest(draft), 'STALE_OR_FOREIGN_PATCH');
  check(patch.fact_snapshot_hash===snapshot(facts), 'STALE_FACT_SNAPSHOT');
  check(Object.keys(patch).every(k=>['user_id','base_artifact_hash','fact_snapshot_hash','changes'].includes(k)), 'PATCH_PATH_FORBIDDEN');
  check(Array.isArray(patch.changes)&&patch.changes.length>0&&unique(patch.changes.map(c=>c.section_id)), 'PATCH_CHANGES');
  const next=structuredClone(draft);
  for(const c of patch.changes){
    check(Object.keys(c).every(k=>['section_id','new_body','new_claims'].includes(k)), 'PATCH_PATH_FORBIDDEN');
    const s=next.resume_sections.find(x=>x.section_id===c.section_id);check(s&&nonblank(c.new_body)&&Array.isArray(c.new_claims), 'PATCH_SECTION');
    check(c.new_claims.every(x=>x.output_section_id===c.section_id), 'PATCH_CLAIM_SECTION');
    s.body=c.new_body;next.claims=next.claims.filter(x=>x.output_section_id!==c.section_id).concat(c.new_claims);
  }
  const review=reviewDraft(next,facts,user,sectionProjects);check(review.verdict!=='BLOCKED','PATCH_VALIDATION_FAILED');
  return {draft:next,review,preview_binding:null,external_approval:null};
}

export function addManualEvent(events, input, user, now=new Date().toISOString()) {
  own(input,user);check(UUID.test(input.application_id),'APPLICATION_ID');
  const allowed=['SELF_REPORTED_SUBMITTED','SUBMISSION_UNKNOWN','REPLIED','INTERVIEW','OFFER','REJECTED','WITHDRAWN','NO_UPDATE'];
  check(allowed.includes(input.stage),'OFFICIAL_STATE_FORBIDDEN');check(utc(input.occurred_at)<=utc(now),'FUTURE_EVENT');
  check(Object.keys(input).every(k=>['id','user_id','application_id','stage','occurred_at','supersedes_id'].includes(k)), 'MANUAL_EVENT_FIELDS');
  const old=events.find(x=>x.id===input.id);
  if(old){check(digest(old.input)===digest(input),'EVENT_ID_CONFLICT');return events;}
  if(input.supersedes_id!==null){
    const target=events.find(x=>x.id===input.supersedes_id);
    check(target&&target.user_id===user&&target.application_id===input.application_id,'CORRECTION_TARGET');
    check(!events.some(x=>x.supersedes_id===target.id),'CORRECTION_ALREADY_SUPERSEDED');
  }
  return [...events,{...input,input:structuredClone(input),evidence_type:'user_entry',confirmed_by:user,observed_at:now}];
}

export function cohortMetrics(events,user,asOf,days=30){
  const cutoff=utc(asOf);check(Number.isInteger(days)&&days>0&&days<=365,'WINDOW_DAYS');
  const seen=events.filter(x=>x.user_id===user&&utc(x.observed_at)<=cutoff&&utc(x.occurred_at)<=cutoff);
  check(unique(seen.map(x=>x.id)),'DUPLICATE_EVENT_IDS');
  const replaced=new Set(seen.map(x=>x.supersedes_id).filter(Boolean));const effective=seen.filter(x=>!replaced.has(x.id));
  const groups=new Map();for(const e of effective){if(!groups.has(e.application_id))groups.set(e.application_id,[]);groups.get(e.application_id).push(e);}
  let submitted=0,mature=0,interview=0,replied=0,pending=0,unknown=0;
  for(const es of groups.values()){
    const anchors=es.filter(e=>e.stage==='SELF_REPORTED_SUBMITTED').sort((a,b)=>utc(a.occurred_at)-utc(b.occurred_at));
    if(!anchors.length){if(es.some(e=>e.stage==='SUBMISSION_UNKNOWN'))unknown++;continue;}
    submitted++;const anchor=utc(anchors[0].occurred_at),end=anchor+days*86400000;
    if(cutoff<end){pending++;continue;}mature++;
    const inWindow=es.filter(e=>utc(e.occurred_at)>=anchor&&utc(e.occurred_at)<=end);
    if(inWindow.some(e=>e.stage==='INTERVIEW'))interview++;
    if(inWindow.some(e=>e.stage==='REPLIED'))replied++;
  }
  return {cohort:'user_report_only',metric_version:'v0.3-prototype',as_of:asOf,window_days:days,submitted,mature,pending,unknown,
    ever_interviewed:interview,ever_replied:replied,interview_rate:mature?interview/mature:null,reply_rate:mature?replied/mature:null};
}

export function readKey(file){
  const st=fs.lstatSync(file);check(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0,'KEY_PERMISSIONS');
  const k=fs.readFileSync(file);check(k.length===32,'KEY_LENGTH');return k;
}
export function encryptState(state,key){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from('job-search-agent/v0.3'));
  const data=Buffer.concat([cipher.update(canonical(state),'utf8'),cipher.final()]);
  return {format:'job-search-agent/v0.3',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
export function decryptState(record,key){
  check(record.format==='job-search-agent/v0.3','VAULT_FORMAT');
  try{const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(record.iv,'base64'));decipher.setAAD(Buffer.from(record.format));
    decipher.setAuthTag(Buffer.from(record.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data,'base64')),decipher.final()]).toString('utf8'));}
  catch{fail('VAULT_AUTHENTICATION_FAILED');}
}
export function withVault(directory,key,mutation,create=null){
  if(create){check(!fs.existsSync(directory),'CASE_EXISTS');fs.mkdirSync(directory,{recursive:true,mode:0o700});}
  const stat=fs.lstatSync(directory);check(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'CASE_PERMISSIONS');
  const lock=path.join(directory,'.lock'),file=path.join(directory,'case.enc.json');let fd;
  try{fd=fs.openSync(lock,'wx',0o600);}catch{fail('CASE_LOCKED');}
  let temp;
  try{
    const state=create??decryptState(JSON.parse(fs.readFileSync(file,'utf8')),key);
    const before=digest(state),result=mutation(state);
    const previous=state.audit.at(-1)?.event_hash??null;
    const event={sequence:state.audit.length+1,action:result.action,resource:result.resource??null,before_digest:before,after_digest:digest({...state,audit:[]}),previous_hash:previous,at:new Date().toISOString()};
    event.event_hash=digest(event);state.audit.push(event);
    temp=path.join(directory,`.state-${crypto.randomUUID()}.tmp`);const out=fs.openSync(temp,'wx',0o600);
    try{fs.writeFileSync(out,JSON.stringify(encryptState(state,key)));fs.fsyncSync(out);}finally{fs.closeSync(out);}
    fs.renameSync(temp,file);temp=null;const dfd=fs.openSync(directory,'r');try{fs.fsyncSync(dfd);}finally{fs.closeSync(dfd);}
    return result.output;
  }finally{if(temp&&fs.existsSync(temp))fs.unlinkSync(temp);fs.closeSync(fd);fs.unlinkSync(lock);}
}

function cli(args){
  const [command,...rest]=args,options={};check(rest.length%2===0,'ARGUMENTS');
  for(let i=0;i<rest.length;i+=2){check(rest[i].startsWith('--')&&!Object.hasOwn(options,rest[i]),'ARGUMENTS');options[rest[i]]=rest[i+1];}
  const allowed={keygen:['--out'],init:['--case','--key-file','--user'],import:['--case','--key-file','--input'],
    'confirm-fact':['--case','--key-file','--id'],'confirm-evidence':['--case','--key-file','--job','--item'],score:['--case','--key-file','--job'],
    draft:['--case','--key-file','--job','--input'],review:['--case','--key-file','--job'],patch:['--case','--key-file','--job','--input'],
    record:['--case','--key-file','--input'],metrics:['--case','--key-file','--as-of','--days'],inspect:['--case','--key-file']};
  check(command in allowed&&Object.keys(options).every(k=>allowed[command].includes(k)),'COMMAND_OR_OPTION');
  const required=allowed[command].filter(k=>k!=='--days');required.forEach(k=>check(nonblank(options[k]),'ARGUMENTS'));
  if(command==='keygen'){const key=crypto.randomBytes(32);fs.writeFileSync(options['--out'],key,{flag:'wx',mode:0o600});return{created:true};}
  const dir=path.resolve(options['--case']),keyPath=path.resolve(options['--key-file']);
  check(keyPath!==dir&&!keyPath.startsWith(dir+path.sep),'KEY_MUST_BE_SEPARATE');const key=readKey(keyPath);
  const readInput=()=>JSON.parse(fs.readFileSync(options['--input'],'utf8'));
  const initial=command==='init'?{user_id:options['--user'],facts:[],jobs:[],events:[],audit:[],format:'v0.3'}:null;
  if(initial)check(UUID.test(initial.user_id),'USER_ID');
  return withVault(dir,key,state=>{
    const user=state.user_id,job=options['--job']?state.jobs.find(j=>j.id===options['--job']):null;
    if(options['--job'])check(job,'JOB_NOT_FOUND');let output;
    if(command==='init')output={created:true,stage:'M1_PREPARATION_ONLY'};
    if(command==='import'){
      const b=readInput();check(b.user_id===user&&Array.isArray(b.facts)&&Array.isArray(b.jobs),'IMPORT_FORMAT');
      check(state.facts.length===0&&state.jobs.length===0,'IMPORT_ALREADY_DONE');
      b.facts.forEach(f=>{own(f,user);check(['unconfirmed','conflict'].includes(f.status)&&nonblank(f.text)&&nonblank(f.source_ref)&&['positive','negative'].includes(f.polarity),'UNCONFIRMED_IMPORT_REQUIRED');});
      check(unique(b.facts.map(f=>f.id))&&unique(b.jobs.map(j=>j.id)),'DUPLICATE_IMPORT');
      b.jobs.forEach(j=>{own(j,user);check(j.source_kind==='user_provided'&&j.draft===null&&!j.confirmations&&!j.preview_binding&&!j.approvals,'IMPORT_PERMISSION');scoreJob(j,b.facts,user,{});});
      state.facts=b.facts;state.jobs=b.jobs.map(j=>({...j,confirmations:{}}));output={facts:b.facts.length,jobs:b.jobs.length};
    }
    if(command==='confirm-fact'){const f=state.facts.find(x=>x.id===options['--id']);check(f&&f.status!=='conflict','FACT_NOT_CONFIRMABLE');f.status='confirmed';f.confirmed_by=user;output={fact_id:f.id,status:f.status,fact_snapshot_hash:snapshot(state.facts)};}
    if(command==='confirm-evidence'){const e=job.evidence.items.find(x=>x.evidence_item_id===options['--item']);check(e,'EVIDENCE_NOT_FOUND');
      check(e.fact_ids.length>0&&e.fact_ids.every(id=>state.facts.some(f=>f.id===id&&f.status==='confirmed')),'FACT_CONFIRMATION_REQUIRED');
      job.confirmations[e.evidence_item_id]=snapshot(state.facts);scoreJob(job,state.facts,user,job.confirmations);output={item_id:e.evidence_item_id,reviewed:true};}
    if(command==='score'){output=scoreJob(job,state.facts,user,job.confirmations);job.latest_score=output;}
    if(command==='draft'){const d=readInput();check(d.job_version_id===job.jd.job_version_id,'JOB_VERSION');const r=reviewDraft(d,state.facts,user,job.section_projects);check(r.verdict!=='BLOCKED','DRAFT_VALIDATION_FAILED');job.draft=d;job.preview_binding=null;output=r;}
    if(command==='review'){check(job.draft,'DRAFT_NOT_FOUND');output=reviewDraft(job.draft,state.facts,user,job.section_projects);}
    if(command==='patch'){check(job.draft,'DRAFT_NOT_FOUND');const result=patchDraft(job.draft,readInput(),state.facts,user,job.section_projects);job.draft=result.draft;job.preview_binding=null;output={...result.review,preview_invalidated:true,facts_unchanged:true};}
    if(command==='record'){state.events=addManualEvent(state.events,readInput(),user);output={recorded:true,provenance:'user_entry'};}
    if(command==='metrics')output=cohortMetrics(state.events,user,options['--as-of'],options['--days']?Number(options['--days']):30);
    if(command==='inspect')output={user_id:user,facts:state.facts.length,confirmed_facts:state.facts.filter(f=>f.status==='confirmed').length,jobs:state.jobs.map(j=>j.id),events:state.events.length,fact_snapshot_hash:snapshot(state.facts),stage:'M1_PREPARATION_ONLY',submission_permission:false};
    return{action:command,resource:options['--job']??options['--id']??null,output};
  },initial);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{process.stdout.write(JSON.stringify(cli(process.argv.slice(2)))+'\n');}
  catch(error){process.stderr.write(JSON.stringify({error:/^[A-Z_]+$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED'})+'\n');process.exitCode=1;}
}

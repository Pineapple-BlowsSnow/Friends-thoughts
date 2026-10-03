"""Actual JSON Schema validation for v0.3 contracts, not service-state verification."""
import copy,json,hashlib
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[1]
s=json.loads((ROOT/'model-contracts.schema.json').read_text())
U='11111111-1111-4111-8111-111111111111';H='a'*64;T='2026-10-03T00:00:00Z'
common={'id':U,'user_id':U}
claim={'claim_id':'c1','output_section_id':'s1','start':0,'end':6,'claim_text':'Python','fact_ids':[U],'jd_requirement_ids':[],'transformation':'verbatim'}
classification={'source_namespace':'mailbox-a','source_event_id':'m1','proposed_stage':'unknown','application_candidates':[],'evidence_quote':None,'confidence':0,'ambiguous':True,'reason':'Needs review','warnings':[]}
fs={
 'EvaluationRun':{**common,'job_version_id':U,'fact_snapshot_hash':H,'preference_version_id':U,'screening_version':'1','scoring_version':'1','state':'DEFERRED','selection_reason':'Budget','scheduling_rank':1,'score_result_id':None,'model_ref':None,'actual_cost':{'minor_units':0,'currency':'CNY'},'created_at':T,'started_at':None,'finished_at':None,'failure_code':None},
 'DocumentPatch':{**common,'document_id':U,'base_version':1,'base_digest':H,'fact_snapshot_hash':H,'operations':[{'section_id':'s1','before_digest':H,'after_text':'Python','claims':[claim]}],'state':'PROPOSED','created_at':T,'decided_by':None,'decided_at':None,'result_document_digest':None},
 'EvidenceRequest':{**common,'job_version_id':U,'requirement_id':'r1','reason_code':'missing_fact','question':'Provide proof','related_fact_ids':[],'state':'OPEN','response_ref':None,'response_digest':None,'resolution_fact_ids':[],'created_at':T,'answered_at':None,'confirmed_by':None,'confirmed_at':None,'dismiss_reason':None},
 'MailReviewItem':{**common,'source_namespace':'mailbox-a','source_event_id':'m1','evidence_ref':'private-ref','evidence_sha256':H,'received_at':T,'classification':classification,'state':'UNRESOLVED','selected_application_id':None,'decision_reason':None,'decided_by':None,'decided_at':None,'status_event_id':None,'row_version':1},
 'InterviewStory':{**common,'job_version_id':U,'fact_snapshot_hash':H,'title':'Course project','competency_tags':['Python'],'situation':'Python','task':'Python','action':'Python','result':None,'claims':[{'section':'action','start':0,'end':6,'text':'Python','fact_ids':[U]}],'missing_information':['Result proof'],'review_state':'DRAFT','created_at':T,'reviewed_by':None,'reviewed_at':None}
}
tests=[]
def v(name):return Draft202012Validator({'$schema':s['$schema'],'$defs':s['$defs'],'$ref':'#/$defs/'+name},format_checker=FormatChecker())
def record(name,ok):tests.append({'name':name,'passed':bool(ok)})
Draft202012Validator.check_schema(s)
for name,x in fs.items():
 record('positive/'+name,v(name).is_valid(x))
 record('root/'+name,Draft202012Validator(s,format_checker=FormatChecker()).is_valid(x))
 for field in s['$defs'][name]['required']:
  bad=copy.deepcopy(x);bad.pop(field);record('required/'+name+'/'+field,not v(name).is_valid(bad))
 record('forbidden/'+name,not v(name).is_valid(dict(x,submit_permission=True)))
def negative(name,label,**changes):record('negative/'+label,not v(name).is_valid(dict(fs[name],**changes)))
negative('EvaluationRun','deferred-score',score_result_id=U)
negative('EvaluationRun','completed-no-score',state='COMPLETED')
negative('EvaluationRun','failed-no-error',state='FAILED',finished_at=T)
negative('EvaluationRun','negative-cost',actual_cost={'minor_units':-1,'currency':'CNY'})
negative('DocumentPatch','proposal-decider',decided_by=U)
negative('DocumentPatch','accepted-no-result',state='ACCEPTED',decided_by=U,decided_at=T)
negative('DocumentPatch','arbitrary-json-pointer',operations=[{'path':'/approvals','value':True}])
negative('EvidenceRequest','open-auto-confirmed',resolution_fact_ids=[U],confirmed_by=U,confirmed_at=T)
negative('EvidenceRequest','answered-auto-fact',state='ANSWERED',response_ref='x',response_digest=H,answered_at=T,resolution_fact_ids=[U])
negative('EvidenceRequest','confirmed-no-owner',state='CONFIRMED',response_ref='x',response_digest=H,answered_at=T,resolution_fact_ids=[U])
negative('MailReviewItem','linked-no-application',state='LINKED',decision_reason='x',decided_by=U,decided_at=T,status_event_id=U)
negative('MailReviewItem','ignored-no-reason',state='IGNORED',decided_by=U,decided_at=T)
negative('InterviewStory','verified-no-result',review_state='VERIFIED',reviewed_by=U,reviewed_at=T)
negative('InterviewStory','missing-result-no-question',missing_information=[])
accepted={**fs['DocumentPatch'],'state':'ACCEPTED','decided_by':U,'decided_at':T,'result_document_digest':H}
record('service/accepted-patch',v('DocumentPatch').is_valid(accepted))
record('model/no-accepted-patch',not v('DocumentPatchProposal').is_valid(accepted))
record('model/patch-proposal',v('DocumentPatchProposal').is_valid(fs['DocumentPatch']))
answered={**fs['EvidenceRequest'],'state':'ANSWERED','response_ref':'x','response_digest':H,'answered_at':T}
record('service/answered-request',v('EvidenceRequest').is_valid(answered))
record('model/no-answered-request',not v('EvidenceRequestDraft').is_valid(answered))
record('model/open-request',v('EvidenceRequestDraft').is_valid(fs['EvidenceRequest']))
verified={**fs['InterviewStory'],'result':'Python','missing_information':[],'review_state':'VERIFIED','reviewed_by':U,'reviewed_at':T}
record('service/verified-story',v('InterviewStory').is_valid(verified))
record('model/no-verified-story',not v('InterviewStoryDraft').is_valid(verified))
record('model/story-draft',v('InterviewStoryDraft').is_valid(fs['InterviewStory']))
report={'scope':'v0.3_schema_structural_and_task_boundary_only','total':len(tests),'passed':sum(t['passed'] for t in tests),'schema_sha256':hashlib.sha256((ROOT/'model-contracts.schema.json').read_bytes()).hexdigest(),'tests':tests}
(ROOT/'selfcheck/v0.3-contract-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f"{report['passed']}/{report['total']} v0.3 contract tests passed")
for t in tests:
 if not t['passed']:print('FAIL',t['name'])
raise SystemExit(0 if report['total']==report['passed'] else 1)

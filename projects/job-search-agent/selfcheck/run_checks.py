"""Offline contract self-check. No mail, network, browser or ATS calls.

Schema checks exercise real jsonschema; route/semantic checks are a reference
specification, not an implementation of the product or a concurrency proof.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from datetime import datetime
from importlib.metadata import version
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
UUID = 'a82d7c5f-3469-4b52-9ed2-0f753df81964'
OTHER = 'b82d7c5f-3469-4b52-9ed2-0f753df81964'
HASH = 'a' * 64
NOW = '2026-10-03T04:00:00Z'
LATER = '2026-10-04T04:00:00Z'
DIMENSIONS = ['skills', 'responsibilities', 'seniority', 'domain', 'conditions', 'goals']
WEIGHTS = [30, 25, 15, 10, 10, 10]
TASKS = {'jd_parse': 'JDParsed', 'match_evidence': 'MatchEvidence',
         'application_draft': 'ApplicationDraft', 'draft_review': 'DraftReview',
         'status_classify': 'StatusClassification'}

def fixtures():
    span = {'source_text_sha256': hashlib.sha256(b'Python').hexdigest(),
            'start': 0, 'end': 6, 'quote': 'Python'}
    requirement = {'requirement_id': 'r1', 'kind': 'skill', 'priority': 'must_have',
                   'value': 'Python', 'certainty': 'explicit', 'source_span': span}
    item = {'evidence_item_id': 'e1', 'dimension': 'skills', 'requirement_id': 'r1',
            'fact_ids': [UUID], 'evidence_state': 'supported', 'match_level': 1,
            'brief_reason': 'Confirmed project evidence', 'missing_information': []}
    score = {'id': UUID, 'user_id': UUID, 'job_version_id': UUID,
             'preference_version_id': UUID, 'fact_snapshot_hash': HASH,
             'scoring_version': 'v0.2', 'hard_checks': [
                 {'rule_id': 'h1', 'result': 'pass', 'critical': True,
                  'requirement_id': 'r1', 'fact_ids': [UUID], 'reason': 'Confirmed'}],
             'dimensions': [{'dimension': d, 'weight': w, 'known_weight': w,
                             'contribution_low': w, 'unknown_weight': 0,
                             'evidence_item_ids': ['e'+str(i+1)]}
                            for i,(d,w) in enumerate(zip(DIMENSIONS,WEIGHTS))],
             'score_low': 100, 'score_high': 100, 'coverage': 1,
             'route': 'HIGH_MATCH', 'calculated_at': NOW}
    return {
        'JDParsed': {'job_version_id': UUID, 'raw_sha256': HASH,
                     'source_text_sha256': span['source_text_sha256'], 'language': 'en',
                     'requirements': [requirement], 'salary': None, 'deadline': None,
                     'unknowns': [], 'warnings': []},
        'MatchEvidence': {'job_version_id': UUID, 'fact_snapshot_hash': HASH,
                          'preference_version_id': UUID, 'scoring_version': 'v0.2',
                          'items': [item], 'warnings': []},
        'ApplicationDraft': {'job_version_id': UUID, 'fact_snapshot_hash': HASH,
                             'language': 'en', 'resume_sections': [
                                 {'section_id': 's1', 'title': 'Experience', 'body': 'Python'}],
                             'cover_letter': None, 'claims': [
                                 {'claim_id': 'c1', 'output_section_id': 's1',
                                  'start': 0, 'end': 6, 'claim_text': 'Python',
                                  'fact_ids': [UUID], 'jd_requirement_ids': ['r1'],
                                  'transformation': 'verbatim'}],
                             'change_summary': ['Reordered confirmed experience'],
                             'questions_for_user': [], 'warnings': []},
        'DraftReview': {'draft_digest': HASH, 'issues': [], 'recommended_fixes': [], 'warnings': []},
        'StatusClassification': {'source_namespace': 'test-mailbox-1', 'source_event_id': 'mail1', 'proposed_stage': 'interview',
                                 'application_candidates': [UUID], 'evidence_quote': 'Interview invitation',
                                 'confidence': 0.99, 'ambiguous': False, 'reason': 'Explicit invitation', 'warnings': []},
        'ScoreResult': score,
        'ConnectorPolicy': {'source_id': UUID, 'user_id': UUID, 'collect_allowed': True,
                            'prefill_allowed': False, 'upload_allowed': False, 'submit_allowed': False,
                            'tos_url': 'https://example.com/terms', 'tos_digest': HASH,
                            'reviewed_at': NOW, 'review_due_at': LATER,
                            'target_allowlist': ['https://example.com/jobs'],
                            'auth_secret_ref': None, 'grant_ids': [UUID], 'state': 'enabled'},
        'ApprovalBinding': {'id': UUID, 'user_id': UUID, 'application_id': UUID, 'payload_id': UUID,
                            'payload_hash': HASH, 'policy_version': 'v0.2', 'decision': 'approve',
                            'actor_session_ref': 'authenticated-session', 'approved_at': NOW,
                            'expires_at': LATER, 'revoked_at': None, 'exception_reason': None,
                            'operation_scopes': ['submit'], 'questionnaire_schema_hash': HASH},
        'StatusEvent': {'id': UUID, 'user_id': UUID, 'application_id': UUID,
                        'event_type': 'recruitment', 'stage': 'INTERVIEW',
                        'evidence_type': 'email', 'source_namespace': 'test-mailbox-1', 'source_event_id': 'mail1', 'round': None,
                        'evidence_ref': 'private-evidence-ref', 'evidence_sha256': HASH,
                        'confidence': 0.99, 'occurred_at': NOW, 'observed_at': NOW,
                        'supersedes_id': None, 'confirmed_by': None},
        'SourceSpan': span, 'EvidenceItem': item,
    }

def route(low, high, coverage, hard, conflict=False):
    """Reference decision table. Must be compared with production once built."""
    if any(result == 'fail' for result, critical in hard): return 'BLOCKED'
    if conflict or any(result == 'unknown' and critical for result, critical in hard): return 'NEEDS_INFO'
    if low >= 80 and coverage >= .85 and all(r == 'pass' for r,c in hard): return 'HIGH_MATCH'
    if high < 60: return 'LOW_MATCH'
    return 'REVIEW'

def semantic_errors(name, x):
    """Offline checks for constraints JSON Schema cannot compare or dereference."""
    errors = []
    if name == 'SourceSpan':
        if not 0 <= x['start'] < x['end']: errors.append('span_order')
        if x['quote'] != 'Python'[x['start']:x['end']]: errors.append('span_quote')
        if x['source_text_sha256'] != hashlib.sha256(b'Python').hexdigest(): errors.append('span_hash')
    if name == 'ScoreResult':
        ds = x['dimensions']
        if {d['dimension'] for d in ds} != set(DIMENSIONS): errors.append('dimension_set')
        if sum(d['weight'] for d in ds) != 100: errors.append('weights')
        if any(d['known_weight'] + d['unknown_weight'] != d['weight'] or
               d['contribution_low'] > d['known_weight'] for d in ds): errors.append('components')
        low = sum(d['contribution_low'] for d in ds)
        high = low + sum(d['unknown_weight'] for d in ds)
        coverage = sum(d['known_weight'] for d in ds)/100
        if (x['score_low'],x['score_high'],x['coverage']) != (low,high,coverage): errors.append('aggregates')
        expected = route(low,high,coverage,[(h['result'],h['critical']) for h in x['hard_checks']])
        if x['route'] != expected: errors.append('route')
    if name == 'ApprovalBinding':
        times = [datetime.fromisoformat(x[k].replace('Z','+00:00')) for k in ['approved_at','expires_at']]
        if times[0] >= times[1]: errors.append('approval_time_order')
    if name == 'ApplicationDraft':
        sections = {s['section_id']:s['body'] for s in x['resume_sections']}
        if len(sections) != len(x['resume_sections']): errors.append('duplicate_section_id')
        if x['cover_letter'] is not None: sections['cover_letter'] = x['cover_letter']
        for c in x['claims']:
            body = sections.get(c['output_section_id'])
            if body is None or not 0 <= c['start'] < c['end'] <= len(body): errors.append('claim_span')
            elif body[c['start']:c['end']] != c['claim_text']: errors.append('claim_text')
            if not set(c['fact_ids']) <= {UUID}: errors.append('fact_ownership')
    return errors

def mutate(x, path, value):
    x = copy.deepcopy(x)
    at = x
    for p in path[:-1]: at = at[p]
    at[path[-1]] = value
    return x

def run(schema):
    tests = []
    def record(name, ok, detail=''):
        tests.append({'name': name, 'passed': bool(ok), 'detail': detail})
    Draft202012Validator.check_schema(schema)
    record('schema/meta-schema', True)
    def validator(name):
        return Draft202012Validator({'$schema':schema['$schema'],'$ref':'#/$defs/'+name,
                                    '$defs':schema['$defs']},format_checker=FormatChecker())
    fs = fixtures()
    # Baseline v0.1 has no namespace/round fields; exclude newly added fields when
    # testing that snapshot, while the interview-round positive intentionally probes it.
    for name,x in fs.items():
        allowed = schema['$defs'][name]['properties']
        for k in list(x):
            if k not in allowed: x.pop(k)
    for name,x in fs.items():
        record('positive/'+name,validator(name).is_valid(x))
        for field in schema['$defs'][name]['required']:
            bad = copy.deepcopy(x); bad.pop(field,None)
            record('required/'+name+'/'+field,not validator(name).is_valid(bad))
        bad = dict(x, injected_submit_permission=True)
        record('extra-field/'+name,not validator(name).is_valid(bad))
    negatives = [
        ('EvidenceItem','unsupported-full-score', ['evidence_state'],'unsupported'),
        ('EvidenceItem','supported-zero-score', ['match_level'],0),
        ('EvidenceItem','supported-half-score', ['match_level'],.5),
        ('EvidenceItem','partial-full-score', ['evidence_state'],'partial'),
        ('EvidenceItem','empty-confirmed-facts', ['fact_ids'],[]),
        ('EvidenceItem','duplicate-fact-ids', ['fact_ids'],[UUID,UUID]),
        ('EvidenceItem','invalid-uuid', ['fact_ids'],['bad']),
        ('EvidenceItem','unknown-full-score', ['evidence_state'],'unknown'),
        ('StatusClassification','false-unique-multiple', ['application_candidates'],[UUID,OTHER]),
        ('StatusClassification','false-unique-empty', ['application_candidates'],[]),
        ('StatusClassification','known-stage-no-quote', ['evidence_quote'],None),
        ('StatusClassification','blank-quote', ['evidence_quote'],''),
        ('ApplicationDraft','empty-claims', ['claims'],[]),
        ('JDParsed','arbitrary-deadline', ['deadline'],'sometime'),
        ('ConnectorPolicy','enabled-empty-allowlist', ['target_allowlist'],[]),
        ('ConnectorPolicy','disabled-but-collect', ['state'],'disabled'),
        ('StatusEvent','receipt-offer', ['event_type'],'receipt'),
        ('StatusEvent','transport-interview', ['event_type'],'transport'),
        ('ApprovalBinding','invalid-expiry-format', ['expires_at'],'later'),
    ]
    for name,label,path,value in negatives:
        x = mutate(fs[name],path,value)
        record('negative/'+label,not validator(name).is_valid(x))
    for name in ['JDParsed','MatchEvidence','ApplicationDraft','DraftReview','StatusClassification','ScoreResult','ConnectorPolicy','ApprovalBinding','StatusEvent']:
        root = Draft202012Validator(schema,format_checker=FormatChecker())
        record('root-contract/'+name,root.is_valid(fs[name]))
    for task,name in TASKS.items():
        record('task-boundary/'+task,not validator(name).is_valid(fs['ApprovalBinding']))
    interview = dict(fs['StatusEvent'],round=2)
    record('interview-round-positive',validator('StatusEvent').is_valid(interview))
    for badround in [0,-1,1.5,'second']:
        record('interview-round-negative/'+str(badround),not validator('StatusEvent').is_valid(dict(interview,round=badround)))
    # Behavioral boundaries use the reference decision table, not a production worker.
    scenarios = [(80,80,.85,[('pass',True)],False,'HIGH_MATCH'),
                 (79.99,90,.9,[('pass',True)],False,'REVIEW'),
                 (80,90,.8499,[('pass',True)],False,'REVIEW'),
                 (59,59.99,1,[('pass',True)],False,'LOW_MATCH'),
                 (60,60,1,[('pass',True)],False,'REVIEW'),
                 (100,100,1,[('fail',True)],False,'BLOCKED'),
                 (100,100,1,[('unknown',True)],False,'NEEDS_INFO'),
                 (100,100,1,[('unknown',False)],False,'REVIEW'),
                 (100,100,1,[('pass',True)],True,'NEEDS_INFO')]
    for i,(low,high,c,h,conflict,want) in enumerate(scenarios):
        record('reference-routing/'+str(i),route(low,high,c,h,conflict)==want)
    ds=fs['ScoreResult']['dimensions']
    for i,d in enumerate(ds):
        ds[i]['contribution_low'] = WEIGHTS[i]*[.9,.8,.8,.6,1,.8][i]
    fs['ScoreResult'].update(score_low=83,score_high=83)
    record('reference-score/83',not semantic_errors('ScoreResult',fs['ScoreResult']))
    ds[-1].update(contribution_low=0,known_weight=0,unknown_weight=10)
    fs['ScoreResult'].update(score_low=75,score_high=85,coverage=.9,route='REVIEW')
    record('reference-score/75-85',not semantic_errors('ScoreResult',fs['ScoreResult']))
    semantic_cases = [
        ('SourceSpan','zero-width',['end'],0),('SourceSpan','wrong-quote',['quote'],'Java'),
        ('SourceSpan','wrong-text-hash',['source_text_sha256'],HASH),
        ('ApprovalBinding','reverse-time',['expires_at'],'2026-10-02T04:00:00Z'),
        ('ScoreResult','inconsistent-sum',['score_low'],100),
        ('ScoreResult','wrong-route',['route'],'HIGH_MATCH'),
        ('ScoreResult','duplicate-dimensions',['dimensions',1,'dimension'],'skills'),
        ('ApplicationDraft','wrong-claim-text',['claims',0,'claim_text'],'Expert Python'),
        ('ApplicationDraft','other-users-fact',['claims',0,'fact_ids'],[OTHER]),
        ('ApplicationDraft','nonexistent-section',['claims',0,'output_section_id'],'missing'),
    ]
    for name,label,path,value in semantic_cases:
        record('reference-semantic/'+label,bool(semantic_errors(name,mutate(fs[name],path,value))))
    full=(ROOT/'求职自动化投递Agent设计.md').read_text()
    for f in ['01_PRD.md','02_工作流.md','03_工具清单.md','04_数据Schema.md','05_提示词.md','06_验收指标.md']:
        text=(ROOT/f).read_text().strip()
        record('document-sync/'+f,text in full)
        record('fences/'+f,sum(line.startswith('```') for line in text.splitlines())%2==0)
    for token in ['approval.decision == "approve"','approval.application_id == application.id',
                  'approval.payload_id == frozen_payload.id','CAS(QUEUED, SUBMITTING',
                  'executor_revalidates_full_gate_at_dispatch_time']:
        record('gate-spec/'+token,token in full)
    return tests

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--schema',default=str(ROOT/'model-contracts.schema.json'))
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    schema_path=Path(args.schema)
    tests=run(json.loads(schema_path.read_text()))
    report={'scope':'offline_schema_document_and_reference_semantics_only',
            'schema_sha256':hashlib.sha256(schema_path.read_bytes()).hexdigest(),
            'validator':'jsonschema '+version('jsonschema'), 'format_checker':True,
            'passed':sum(t['passed'] for t in tests),'total':len(tests),
            'tests':tests}
    Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(str(report['passed'])+'/'+str(report['total'])+' checks passed')
    for t in tests:
        if not t['passed']: print('FAIL '+t['name'])
    raise SystemExit(0 if report['passed']==report['total'] else 1)

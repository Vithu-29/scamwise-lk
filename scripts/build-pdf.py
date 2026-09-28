"""Rebuild the one-document submission. Requires reportlab (development only)."""
from pathlib import Path
import json, textwrap, html
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon

ROOT=Path(__file__).resolve().parents[1]
KB=json.loads((ROOT/'dist/knowledge.json').read_text())
TEST=json.loads((ROOT/'docs/test-results.json').read_text())
UI=json.loads((ROOT/'docs/ui-test-results.json').read_text())
OUT=ROOT/'dist/downloads/ScamWise_LK_Assignment_2.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
fontroot=Path('/usr/share/fonts/truetype/dejavu')
if fontroot.exists():
 for name,file in [('Body','DejaVuSans.ttf'),('Body-Bold','DejaVuSans-Bold.ttf'),('Code','DejaVuSansMono.ttf')]:pdfmetrics.registerFont(TTFont(name,str(fontroot/file)))
 pdfmetrics.registerFontFamily('Body',normal='Body',bold='Body-Bold',italic='Body',boldItalic='Body-Bold')
else:
 pdfmetrics.registerFontFamily('Helvetica',normal='Helvetica',bold='Helvetica-Bold')
# Standard fonts are a portable fallback when DejaVu is not installed.
BODY='Body' if fontroot.exists() else 'Helvetica';BOLD='Body-Bold' if fontroot.exists() else 'Helvetica-Bold';MONO='Code' if fontroot.exists() else 'Courier'
INK=colors.HexColor('#153c3c');MUTED=colors.HexColor('#526969');GREEN=colors.HexColor('#def2cb');PALE=colors.HexColor('#f0f5f3');LINE=colors.HexColor('#d6e2dc')
W=515
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyX',fontName=BODY,fontSize=9.1,leading=13.2,spaceAfter=7,textColor=INK))
styles.add(ParagraphStyle(name='SmallX',fontName=BODY,fontSize=7.6,leading=10.7,spaceAfter=4,textColor=INK))
styles.add(ParagraphStyle(name='TinyX',fontName=BODY,fontSize=6.9,leading=9.2,spaceAfter=2,textColor=INK))
styles.add(ParagraphStyle(name='H1X',fontName=BOLD,fontSize=21,leading=25,spaceBefore=3,spaceAfter=12,textColor=INK,keepWithNext=True))
styles.add(ParagraphStyle(name='H2X',fontName=BOLD,fontSize=12.7,leading=16,spaceBefore=10,spaceAfter=7,textColor=INK,keepWithNext=True))
styles.add(ParagraphStyle(name='H3X',fontName=BOLD,fontSize=10,leading=14,spaceBefore=7,spaceAfter=5,textColor=INK,keepWithNext=True))
styles.add(ParagraphStyle(name='CodeX',fontName=MONO,fontSize=7.1,leading=9.1,spaceAfter=0,textColor=INK))
styles.add(ParagraphStyle(name='Cover',fontName=BOLD,fontSize=35,leading=40,spaceAfter=15,textColor=INK))
E=lambda s:html.escape(str(s))
def p(s,sty='BodyX'):return Paragraph(s,styles[sty])
def text(s,sty='BodyX'):return p(E(s),sty)
def table(head,rows,widths,small='SmallX'):
 data=[[p('<b>'+E(x)+'</b>',small) for x in head]]+[[p(E(x).replace('\n','<br/>'),small) for x in r] for r in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),0.7,INK),('LINEBELOW',(0,1),(-1,-1),0.35,LINE),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
 return t

def architecture():
 d=Drawing(W,296)
 def box(x,y,w,h,title,lines,fill=PALE):
  d.add(Rect(x,y,w,h,rx=7,ry=7,fillColor=fill,strokeColor=LINE))
  d.add(String(x+12,y+h-20,title,fontName=BOLD,fontSize=10.2,fillColor=INK))
  for i,t in enumerate(lines):d.add(String(x+12,y+h-37-i*13,t,fontName=BODY,fontSize=8.3,fillColor=INK))
 def arrow(x1,y1,x2,y2):
  import math
  d.add(Line(x1,y1,x2,y2,strokeColor=INK,strokeWidth=1.3))
  a=math.atan2(y2-y1,x2-x1);pts=[x2,y2,x2-6*math.cos(a-.5),y2-6*math.sin(a-.5),x2-6*math.cos(a+.5),y2-6*math.sin(a+.5)]
  d.add(Polygon(pts,fillColor=INK,strokeColor=INK))
 box(0,218,218,73,'Official documents',['CBSL, CERT and Sri Lanka Police','Source passages and URLs'])
 box(290,218,225,73,'Knowledge base',['26 facts + 31 production rules','knowledge.pl / source catalogue'],GREEN)
 arrow(218,254,290,254)
 box(0,105,150,82,'Questionnaire',['30 Yes / No / Not sure inputs','HTML, CSS and JavaScript'])
 box(177,105,149,82,'Validated bridge',['Allowlisted observations','Prolog queries / proof decoding'])
 box(353,105,162,82,'Inference engine',['Forward / backward chaining','Tau Prolog runs engine.pl'])
 arrow(150,146,177,146);arrow(326,146,353,146);arrow(434,218,434,187)
 box(177,0,338,75,'Results and explanation',['Supported warnings and actions; fired rules or proof tree','Source references shown beside the reasoning'],GREEN)
 arrow(434,105,434,75)
 return d

class Interface(Flowable):
 def __init__(self):Flowable.__init__(self);self.width=W;self.height=340
 def draw(self):
  c=self.canv;c.setFillColor(PALE);c.roundRect(0,0,W,340,9,fill=1,stroke=0)
  c.setFillColor(INK);c.roundRect(0,304,W,36,9,fill=1,stroke=0)
  def txt(x,y,t,size=9,bold=False,color=INK):c.setFillColor(color);c.setFont(BOLD if bold else BODY,size);c.drawString(x,y,t)
  txt(14,317,'ScamWise LK',12,True,colors.white);txt(186,318,'Check a situation   Get help',7.6,False,colors.white)
  txt(17,279,'Check a situation',16,True)
  txt(17,260,'Answer the questions to see relevant warnings and advice.',9)
  for x,w in [(14,259),(286,215)]:
   c.setFillColor(colors.white);c.setStrokeColor(LINE);c.roundRect(x,17,w,225,6,fill=1,stroke=1)
  txt(26,222,'01  Tell us what happened',11,True);txt(26,203,'Example: A bank caller asks for an OTP',8)
  txt(26,183,'1 Information   2 Money   3 Online   4 Situation',7.2)
  txt(26,159,'Did someone ask you to tell them your OTP?',8.1,True)
  txt(26,139,'[Yes]    No    Not sure',8.4)
  txt(26,115,'Does the sender claim to represent a bank?',8.1,True)
  txt(26,95,'[Yes]    No    Not sure',8.4)
  txt(26,70,'Assess all signs - Forward chaining',8.1)
  c.setFillColor(INK);c.roundRect(25,31,164,25,4,fill=1,stroke=0);txt(36,39,'Check my situation',9,True,colors.white)
  txt(299,222,'02  Contact your bank',11,True)
  txt(299,202,'3 rules applied',8)
  txt(299,178,'Confidential details requested',8.5,True)
  txt(299,158,'Verify the claimed institution',8.5,True)
  txt(299,133,'Why this result?',10,True)
  txt(299,111,'R01  OTP disclosure request',8)
  txt(299,91,'R05  Institution verification',8)
  txt(299,71,'R06  Tell the bank',8)
  txt(299,41,'Open each rule to inspect its source.',7.8)

story=[]
def add(s,sty='BodyX'):story.append(p(s,sty))
def section(title):story.append(PageBreak());add(title,'H1X')
add('ASSIGNMENT 2  /  EXPERT SYSTEM','H2X')
add('ScamWise LK','Cover')
add('Scam awareness in Sri Lanka','H1X')
add('<b>Vithushan Kanesamoorthy</b><br/>Student ID: 224206P<br/>28 September 2026')
add('1. System overview','H2X')
add('ScamWise LK is a rule-based expert system for recognising scam warning signs in Sri Lanka. A user answers structured questions; the system returns relevant warnings and actions with the rules and evidence that support them.')
add('<b>26 domain facts · 31 rules · 9 official sources</b><br/>Both forward and backward chaining use the same Prolog knowledge base.')
add('Scope','H2X')
add('The system covers credential requests, institution identity claims, unexpected prizes, blocked funds, recruitment-based earnings, investment promises, online loans, shopping, delivery links, untrusted downloads and account rental. It provides relevant bank-contact and reporting guidance.')
add('Knowledge acquisition','H2X')
add('No expert was interviewed. The knowledge and rules come from CBSL, Sri Lanka CERT and Sri Lanka Police publications, identified by document and passage in Annexes B and D. Their warning signs and advice are represented as facts and IF-THEN rules. AI assistance was used for implementation and document preparation; the official publications supply the domain knowledge.')
add('Example of knowledge representation','H2X')
add('S7 describes unexpected prize notices that demand a fee. F05 represents that tactic. R07 requires F05 and the observations prize=Yes and fee=Yes to derive category(prize). R30 then recommends checking the prize directly with the named institution.')
add('The system relies on user answers and documented patterns. It does not verify live websites or named businesses, prove fraud, or guarantee safety when no rule matches.','SmallX')
section('2. Architecture and inference')
story.append(architecture());add('Figure 1. Architecture and flow of knowledge, observations and explanations. The local HTTP server serves files only; the inference runs in the browser.','SmallX')
add('Knowledge base','H2X')
add('The editable catalogue is scripts/build-knowledge.cjs. It generates dist/knowledge.json for the interface and dist/prolog/knowledge.pl for execution. The latter contains domain facts, allowed observation keys, valid goals and all productions. Annex A lists the facts and observation dictionary; Annex B maps every rule to its source.')
add('Forward chaining','H2X')
add('The engine starts with stored domain facts and case observations. It finds an unfired rule whose conditions are all known, records the rule and adds its conclusion if it is new. It repeats until no rule can fire. Each rule fires at most once. Multiple rules supporting the same conclusion are retained in the trace; duplicate conclusions are not added.')
add('Backward chaining','H2X')
add('The engine starts with a selected goal, finds rules that can establish it, and recursively checks their premises. One supported alternative proves a goal. For a rule’s AND conditions, an explicitly contradicted premise makes the rule not supported; otherwise an unknown premise makes it unknown. Across alternatives, unknown is preserved if no branch is supported. A path guard stops recursive cycles.')
add('Unknown answers and explanations','H2X')
add('Only explicit Yes or No answers supply evidence. Missing and Not sure answers never become No. Returned proof nodes identify a user observation, a stored fact, a supporting rule, missing evidence or a contradiction. Both modes also expose the source-supported bank-contact action when applicable. JavaScript displays these returned results and assigns no risk score.')
section('3. Interface and description')
story.append(Interface());add('Figure 2. OTP-caller example after completing other answers as Not sure. This layout schematic is an explanatory drawing, not a browser screenshot.','SmallX')
story.append(table(['Interface area','Purpose and interaction'],[
 ['Check a situation','30 questions in four sections, initially unselected. Choose Yes, No or Not sure for each question. Six sample cases provide partial answers.'],
 ['Answer validation','Both check buttons stay disabled until all 30 questions have an answer. Not sure counts as completed. A remaining count and shortcut help find unanswered questions.'],
 ['Reasoning selector','Forward checks all applicable rules. Backward asks the user to select a warning or action to prove.'],
 ['Result panel','Shows advice, fired rules and supporting facts, or a backward proof with missing/contradicted observations. Source passages are linked.'],
 ['Get help','Bank guidance and official CERT, Police and CBSL links. It does not file a report.'],
 ['Reset and privacy','Reset clears all selections; editing an answer clears a stale result. Answers stay in page memory and are not saved or transmitted.']], [106,409]))
section('4. Local run and user manual')
add('Requirements and startup','H2X')
add('1. Extract the entire ScamWise_LK_Project.zip.<br/>2. Install a supported Node.js LTS release, version 22 or newer, from <link href="https://nodejs.org/en/download" color="#256562">https://nodejs.org/en/download</link>.<br/>3. Windows: double-click start-windows.bat. macOS/Linux: open a terminal in the extracted project folder and run <b>npm start</b>.<br/>4. Keep the terminal open and visit <b>http://localhost:8080</b>.<br/>5. Stop the server with Ctrl+C.')
add('No npm install, database, API key, account or separate Prolog installation is required to run the app. Tau Prolog 0.3.4 is bundled. Do not open dist/index.html directly: the interface loads local program files over HTTP. Assessment works offline after setup; external source links require Internet.')
add('Forward demonstration','H2X')
add('Select the example <b>A “bank” caller asks for an OTP</b>. For this demonstration, choose <b>Not sure</b> for every remaining question. Keep <b>Assess all signs · Forward chaining</b> selected and click <b>Check my situation</b>. Expect R01, R05 and R06: a confidential-details warning, institution verification and bank-contact advice. Expand each rule to inspect its evidence.')
add('Backward demonstration','H2X')
add('Select <b>Pay a fee to claim a prize</b>. Choose <b>Not sure</b> for every remaining question, switch to <b>Check a suspicion · Backward chaining</b> and choose <b>Possible prize scam</b>. Run the check. R07 supports the goal. Reset, select <b>Not sure</b> for all 30 questions, and run again to see an unknown proof. Answer No to the prize question to see why the goal is not supported.')
add('Running the supplied tests','H2X')
add('<b>npm test</b> runs the actual Prolog program in Node. Expected: 48/48 checks passed and 31/31 rules exercised. For optional UI integration tests only, run <b>npm install --no-save jsdom@26</b>, then <b>npm run test:ui</b>. Expected: 18/18 simulated DOM checks passed.')
add('Troubleshooting','H2X')
story.append(table(['Problem','Action'],[
 ['node is not recognised','Install Node.js and open a new terminal.'],['Page does not open','Keep the server running; use http://localhost:8080.'],['Port already in use','Stop another copy, or set PORT=8081 before npm start.'],['Engine cannot load','Extract all folders, including dist/vendor and dist/prolog. Use the local server instead of opening a file URL.'],['No conclusion','Review Not sure answers. No match does not establish safety.']], [118,397]))
add('README.md in the code ZIP repeats the local startup steps. The PDF is submitted separately from the source code.','SmallX')
section('5. Executed test cases')
add(f"<b>{TEST['passed']}/{TEST['total']} reasoning tests passed; {TEST['ruleCoverage']['fired']}/{TEST['ruleCoverage']['total']} rules exercised.</b><br/>{E(TEST['runtime'])}, {E(TEST['interpreter'])}. Executed {E(TEST['executedAt'])}.")
add('Each forward test checks the exact fired-rule set and bank-contact result, replays the trace against available premises, and checks for duplicate facts. Where a goal is shown, it is also proved using backward chaining. These are program tests, not a measurement of real-world fraud accuracy.')
add('Notation: B = whether action(contact_bank) is supported; F = forward fired rules; G = backward goal result. Unlisted answers are unknown. For brevity, the all-No input means every one of the 30 observation keys is No. Full proof objects and timestamps are in docs/test-results.json.','SmallX')
def inp(v):
 if isinstance(v,dict):
  if len(v)==30 and set(v.values())=={'no'}:return 'All 30 observations = no'
  if not v:return '(no observations)'
  return '; '.join(f'{k}={inp(z) if isinstance(z,dict) else z}' for k,z in v.items())
 return str(v)
def result_summary(v):
 if not isinstance(v,dict):return str(v)
 if 'ruleIds' in v:return 'B='+str(v['bankContact']).lower()+'; F='+(','.join(x.upper() for x in v['ruleIds']) or 'none')+(('; G='+v['backward']) if v.get('backward') else '')
 return '; '.join(f'{k}={str(z).lower()}' for k,z in v.items() if k!='proof')
rows=[]
for r in TEST['results']:
 expected=result_summary(r['expected']);actual=result_summary(r['actual'])
 rows.append([r['id']+' '+r['name'],inp(r['input']),expected,actual+'\n'+('PASS' if r['pass'] else 'FAIL')])
story.append(table(['Test / scenario','Input','Expected','Actual / result'],rows,[114,132,130,139],'TinyX'))
add('Interface integration tests','H2X')
add(f"{UI['passed']}/{UI['total']} passed. Executed {E(UI['executedAt'])}. Environment: {E(UI['environment'])}.",'SmallX')
add('The interface checks cover unanswered defaults, disabled checks, completion at 30 answers, Not sure, reset, missing-answer navigation, partial samples, both reasoning modes and integration validation. Individual results are included in docs/ui-test-results.json.','SmallX')
add('Validation limits','H2X')
add('The UI checks use a simulated DOM; native-browser visual and accessibility behaviour was not verified. The tests establish behaviour for the supplied cases, not real-world fraud-detection accuracy or expert validation.','SmallX')
section('Annex A. Facts and observations')
add('All 26 stored domain facts','H2X')
add('Source IDs resolve to the official document URLs in Annex D. These are domain propositions; the user supplies separate case observations. Every stored fact is used by at least one rule.','SmallX')
story.append(table(['ID / source','Prolog proposition','Meaning'],[[f['id'].upper()+' / '+f['source'].upper(),f['term'],f['text']] for f in KB['facts']],[58,159,298],'SmallX'))
story.append(PageBreak())
add('Annex A continued. Case observations','H1X')
add('Observation representation: obs(Key, yes), obs(Key, no) or obs(Key, unknown). An omitted key is unknown. The 30 permitted keys and their interface questions follow.','SmallX')
story.append(table(['Key','Question'],[[q['id'],q['label']] for q in KB['questions']],[78,437],'SmallX'))
section('Annex B. All 31 rules and sources')
add('All IF conditions in a rule are required. A derived flag or category is an intermediate warning, not a claim that fraud is proven. Source locators identify the relevant passage or PDF page; source evidence is paraphrased. Applied rules include source references in the result explanations.','SmallX')
for r in KB['rules']:
 block=[text(r['id'].upper()+'  '+r['title'],'H3X')]
 block.append(p('<b>IF</b> '+E(' AND '.join(r['conditions']))+'<br/><b>THEN</b> '+E(r['conclusion'])+' - '+E(KB['outcomes'][r['conclusion']]['label']),'SmallX'))
 block.append(p('<b>'+r['source'].upper()+'</b> | '+E(r['locator'])+'.<br/>'+E(r['evidence']),'SmallX'))
 block.append(Spacer(1,5));story.append(KeepTogether(block))
section('Annex C. Complete decision-making code')
add('All executable knowledge statements and the complete inference engine are reproduced below. Comments and blank lines in knowledge.pl are omitted because their explanations appear in Annexes A and B. Numbers refer to original source lines; long lines wrap. The JavaScript input/query bridge is included in the code ZIP.','SmallX')
for idx,filename in enumerate(['dist/prolog/knowledge.pl','dist/prolog/engine.pl']):
 if idx:story.append(PageBreak())
 add('C'+str(idx+1)+'. '+filename,'H2X')
 lines=(ROOT/filename).read_text().splitlines()
 for i,line in enumerate(lines,1):
  if idx==0 and (not line.strip() or line.lstrip().startswith('%')):continue
  chunks=textwrap.wrap(line,width=100,expand_tabs=False,replace_whitespace=False,drop_whitespace=False,break_long_words=True,break_on_hyphens=False) or ['']
  formatted='\n'.join((f'{i:03} ' if k==0 else '    ')+chunk for k,chunk in enumerate(chunks))
  story.append(Preformatted(formatted,styles['CodeX']))
section('Annex D. Official reference register')
add('All domain sources were reviewed on 27 September 2026. The register gives the original institution, title, URL and the rules supported. No interview material is used. Page numbers refer to the PDF itself. Web passage locators refer to article body text, excluding site navigation.','SmallX')
for source in KB['sources']:
 ids=', '.join(r['id'].upper() for r in KB['rules'] if r['source']==source['id'])
 block=[p('<b>'+E(source['id'].upper()+'  '+source['organization'])+'</b><br/>'+E(source['title'])+'<br/>Publication: '+E(source['published'] or 'Date not stated')+'. Rules: '+E(ids)+'.<br/><link href="'+E(source['url'])+'" color="#256562">'+E(source['url'])+'</link>','SmallX'),Spacer(1,9)]
 story.append(KeepTogether(block))
add('Implementation reference','H2X')
add('Tau Prolog 0.3.4: <link href="https://github.com/tau-prolog/tau-prolog" color="#256562">https://github.com/tau-prolog/tau-prolog</link>. The unmodified runtime is bundled with its BSD 3-Clause licence. This is a software dependency, not a source of scam-domain rules.','SmallX')

def footer(c,doc):
 c.saveState();c.setStrokeColor(LINE);c.line(40,35,555,35);c.setFillColor(MUTED);c.setFont(BODY,7.3)
 c.drawString(40,23,'SCAMWISE LK  /  ASSIGNMENT 2  /  224206P');c.drawRightString(555,23,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),rightMargin=40,leftMargin=40,topMargin=38,bottomMargin=48,title='ScamWise LK - Assignment 2',author='Vithushan Kanesamoorthy',pageCompression=1)
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)

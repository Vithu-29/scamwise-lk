import './prolog-client.js';
const app = document.getElementById('app');
const checkTemplate = app.innerHTML;
const state = { answers: {}, group: 0, mode: 'forward', goal: 'flag(credentials)', result: null, busy: false, revision: 0, sample: null };
let kb, engine, loadError = '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const unanswered = (answers = state.answers) => kb.questions.filter(q => !['yes', 'no', 'unknown'].includes(answers[q.id]));
const answered = () => kb.questions.length - unanswered().length;
const knownAnswers = () => Object.values(state.answers).filter(x => x === 'yes' || x === 'no').length;
const ruleById = id => kb.rules.find(r => r.id === id);
const factByTerm = term => kb.facts.find(f => f.term === term);
function sourceLink(id) { const s = kb.sources.find(s => s.id === id); return `<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.organization)} ↗</a>`; }
function label(term) {
  const obs = term.match(/^obs\((\w+),(\w+)\)$/);
  if (obs) { const q = kb.questions.find(q => q.id === obs[1]); return (q?.label || obs[1]) + ' — ' + ({ yes: 'Yes', no: 'No', unknown: 'Not sure' }[obs[2]] || obs[2]); }
  return kb.outcomes[term]?.label || factByTerm(term)?.text || term;
}
function clearResult() { state.result = null; state.revision++; state.sample = null; }
function updateValidation() {
  if (!kb) return;
  const missing = unanswered(), button = document.getElementById('assess');
  if (button) { button.disabled = state.busy || missing.length > 0; button.setAttribute('aria-busy', String(state.busy)); }
  const counter = document.querySelector('.question-nav span');
  if (counter) counter.textContent = `${answered()} of ${kb.questions.length} answered`;
  const notice = document.getElementById('answer-validation'), message = document.getElementById('answer-validation-message');
  if (notice) notice.hidden = missing.length === 0;
  if (message) message.textContent = missing.length ? `${missing.length} unanswered question${missing.length === 1 ? '' : 's'}. Choose Yes, No or Not sure for every question.` : '';
}
function form() {
  const area = document.getElementById('form-area'); if (!area) return;
  if (!kb) { area.innerHTML = loadError ? `<div class="error" role="alert">${esc(loadError)} <button id="retry">Try again</button></div>` : '<p>Preparing your assessment…</p>'; return; }
  const group = kb.groups[state.group];
  area.innerHTML = `<div class="sample-row"><label for="sample">Try an example</label><select id="sample"><option value="">Choose a sample situation</option>${kb.samples.map(s => `<option value="${s.id}" ${state.sample === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div>${state.sample ? `<p class="sample-note">${esc(kb.samples.find(s => s.id === state.sample).description)}</p>` : ''}
  <div class="steps" aria-label="Question sections">${kb.groups.map((g, i) => `<button class="step ${i === state.group ? 'current' : ''}" data-group="${i}" ${i === state.group ? 'aria-current="step"' : ''}><span>${i + 1}</span>${g.short}</button>`).join('')}</div>
  <div class="section-title"><h3>${group.label}</h3><span>${state.group + 1} / ${kb.groups.length}</span></div><p class="section-note">${group.note}</p>
  <div class="questions">${kb.questions.filter(q => q.group === group.id).map(q => `<fieldset class="question"><legend>${esc(q.label)}</legend><p id="hint-${q.id}">${esc(q.hint)}</p><div class="answers">${[['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']].map(([v, t]) => `<label><input type="radio" name="${q.id}" value="${v}" aria-describedby="hint-${q.id}" ${state.answers[q.id] === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>`).join('')}</div>
  <div class="question-nav"><button class="text-button" data-prev ${state.group === 0 ? 'disabled' : ''}>← Previous</button><span>${answered()} of ${kb.questions.length} answered</span><button class="text-button" data-next ${state.group === kb.groups.length - 1 ? 'disabled' : ''}>Next section →</button></div>
  <div class="reasoning-options"><label for="mode">How would you like to check?</label><select id="mode"><option value="forward" ${state.mode === 'forward' ? 'selected' : ''}>Assess all signs · Forward chaining</option><option value="backward" ${state.mode === 'backward' ? 'selected' : ''}>Check a suspicion · Backward chaining</option></select>${state.mode === 'backward' ? `<label for="goal">Suspicion or action to check</label><select id="goal">${Object.entries(kb.outcomes).map(([k, o]) => `<option value="${k}" ${state.goal === k ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>` : ''}<p class="section-note">${state.mode === 'forward' ? 'Find every conclusion supported by your answers.' : 'Start with a specific suspicion and check the evidence for it.'} Not sure answers remain unknown.</p></div>
  <div class="answer-validation" id="answer-validation"><p id="answer-validation-message" role="status" aria-live="polite"></p><button class="text-button" id="review-missing" type="button">Go to unanswered question →</button></div>
  <div class="submit-row"><button class="primary" id="assess" aria-describedby="answer-validation-message" ${state.busy || unanswered().length ? 'disabled' : ''}>${state.busy ? 'Checking the rules…' : state.mode === 'forward' ? 'Check my situation' : 'Check this suspicion'} <span>↗</span></button><button class="text-button" id="reset">Reset</button></div>`;
  updateValidation();
}
function tree(p) {
  if (p.kind === 'because') { const r = ruleById(p.id); return `<li class="proof-rule"><b>${esc(p.id.toUpperCase())} · ${esc(label(p.term))}</b><p>${esc(r.why)} ${sourceLink(r.source)}</p><p class="section-note">${esc(r.locator)}</p><ul>${p.children.map(tree).join('')}</ul></li>`; }
  if (p.kind === 'alternatives') return `<li><b>${esc(label(p.term))}</b><ul>${p.branches.map(b => `<li><b>${esc(b.id.toUpperCase())}</b> · ${b.status === 'unknown' ? 'Needs information' : 'Conditions not met'}<ul>${b.children.map(tree).join('')}</ul></li>`).join('')}</ul></li>`;
  if (p.kind === 'knowledge') return `<li class="proof-leaf"><span class="mini-tag">${p.id.toUpperCase()}</span> ${esc(label(p.term))} ${sourceLink(p.source)}</li>`;
  if (p.kind === 'input') return `<li class="proof-leaf"><span class="mini-tag">Your answer</span> ${esc(label(p.term))}</li>`;
  if (p.kind === 'missing') return `<li class="proof-missing">Unknown: ${esc(label(p.term))}</li>`;
  if (p.kind === 'contradicted') return `<li class="proof-missing">Required: ${esc(label(p.term))}<br>Given: ${esc(label(p.actual))}</li>`;
  return `<li>Reasoning cycle stopped.</li>`;
}
function result() {
  const area = document.getElementById('result-area'); if (!area) return;
  if (state.busy) { area.innerHTML = '<div class="result-empty"><span class="large-check">…</span><h2>Checking your answers</h2><p>Checking your answers against the rules.</p></div>'; return; }
  const r = state.result;
  if (!r) { const template = document.createElement('div'); template.innerHTML = checkTemplate; area.innerHTML = template.querySelector('#result-area').innerHTML; return; }
  if (r.error) { area.innerHTML = `<div class="result-content"><div class="error" role="alert">${esc(r.error)}</div><p>Your answers are still available. Try the check again or reset.</p></div>`; return; }
  if (r.mode === 'forward') {
    const [title, sub, cls] = r.bankContact ? ['Contact your bank', 'The source guidance supports prompt bank contact.', 'urgent'] : r.outcomes.length ? ['Source guidance applies', 'Review the signs and the advice below.', 'caution'] : [knownAnswers() === kb.questions.length ? 'No listed guidance matched' : 'More information may be needed', 'This result does not establish that the situation is safe.', 'neutral'];
    const categories = r.outcomes.filter(x => x.startsWith('category('));
    const actions = r.outcomes.filter(x => x.startsWith('action('));
    const other = r.outcomes.filter(x => x.startsWith('flag('));
    const show = [...new Set([...actions, ...categories, ...other])];
    area.innerHTML = `<div class="result-status ${cls}"><p class="eyebrow">YOUR ASSESSMENT</p><h2>${title}</h2><p>${sub}</p><div class="result-meta"><span>${r.trace.length} rules applied</span><span>${knownAnswers()}/${kb.questions.length} answers known</span></div></div><div class="result-content">${show.length ? `<h3>What the signs suggest</h3>${show.map((term, i) => `<article class="recommendation"><span class="recommendation-number">${String(i + 1).padStart(2, '0')}</span><div><h4>${esc(label(term))}</h4><p>${esc(kb.outcomes[term].advice)}</p></div></article>`).join('')}` : `<p>No conclusion is supported by the answers currently provided. Review unknown answers and verify the situation directly with the relevant institution.</p>`}<a class="help-link" href="#help">Official help & reporting routes ↗</a><div class="trace-section"><h3>Why this result?</h3><p class="section-note">Open a rule to see the answers, facts and source behind it.</p>${r.trace.map((t, i) => { const rule = ruleById(t.id); return `<details class="trace"><summary><span class="mini-tag">${t.id.toUpperCase()}</span><span>${esc(rule.title)}</span></summary><div class="trace-body"><p>${esc(rule.why)}</p><p class="tiny-heading">FACTS REQUIRED</p><ul>${t.conditions.map(c => `<li>${esc(label(c))}</li>`).join('')}</ul><p><b>Conclusion:</b> ${esc(label(t.conclusion))}</p><p><b>Source passage:</b> ${esc(rule.locator)}. ${esc(rule.evidence)}</p>${sourceLink(rule.source)}</div></details>`; }).join('')}</div></div><div class="result-foot">These are source-based warnings and actions, not a fraud score or proof of wrongdoing.</div>`;
  } else {
    const titles = { supported: 'This suspicion is supported', unknown: 'More information is needed', not_supported: 'Not supported by these answers' };
    area.innerHTML = `<div class="result-status ${r.status === 'supported' ? 'caution' : 'neutral'}"><p class="eyebrow">GOAL CHECK · BACKWARD CHAINING</p><h2>${titles[r.status]}</h2><p>${esc(label(r.goal))}</p></div><div class="result-content">${r.bankContact ? `<div class="urgent-box"><b>Contact your bank now</b><p>Your answers support bank contact under the cited guidance, regardless of the selected goal.</p><details><summary>Why contact the bank?</summary><ul class="proof-tree">${tree(r.bankProof)}</ul></details></div>` : ''}<p>${r.status === 'supported' ? esc(kb.outcomes[r.goal].advice) : r.status === 'unknown' ? 'Some required facts are missing or marked Not sure. Review the unknown facts shown below.' : 'At least one required condition in every available rule is contradicted by an explicit answer. This does not prove the situation is safe.'}</p><h3>How the goal was checked</h3><p class="section-note">The evidence below shows why this result is supported, missing information, or contradicted by an answer.</p><ul class="proof-tree">${tree(r.proof)}</ul><a class="help-link" href="#help">Official help & reporting routes ↗</a></div><div class="result-foot">A supported warning is a reason to verify, not a determination that a person or business is fraudulent.</div>`;
  }
}
async function assess() {
  if (!engine || state.busy) return;
  if (unanswered().length) { updateValidation(); return; }
  const revision = state.revision; state.busy = true; form(); result();
  try { const r = state.mode === 'forward' ? await engine.forward({ ...state.answers }) : await engine.backward({ ...state.answers }, state.goal); if (revision === state.revision) state.result = r; }
  catch (error) { if (revision === state.revision) state.result = { error: error.message }; }
  finally { state.busy = false; form(); result(); }
  return state.result;
}
function reset() { state.answers = {}; state.sample = null; state.group = 0; clearResult(); form(); result(); }
function loadSample(id) { const s = kb.samples.find(s => s.id === id); if (!s) return; clearResult(); state.answers = { ...s.answers }; state.sample = id; state.group = 0; state.goal = s.goal; form(); result(); }
function help() { app.innerHTML = `<div class="page-heading"><h1>Get help</h1><p class="lede">Use independently verified contact details. ScamWise does not submit reports or contact anyone on your behalf.</p></div><section class="help-urgent"><span class="step-number">01</span><div><h2>Money sent or banking details shared?</h2><p>Contact your bank promptly using its official app, your card’s contact number, or a branch. Explain what happened and ask about securing the account and transaction. Recovery cannot be guaranteed.</p></div></section><div class="help-grid"><article class="help-card"><p class="eyebrow">CYBER INCIDENTS</p><h2>Sri Lanka CERT</h2><p>Use the current incident-reporting instructions for online scams and social-media incidents.</p><a class="primary" href="https://cert.gov.lk/report_incident" target="_blank" rel="noopener noreferrer">Open reporting guidance ↗</a><a class="phone" href="tel:101">Hotline 101</a><p class="section-note">CERT asks that personal scam reports use the portal, rather than cert@cert.gov.lk.</p></article><article class="help-card"><p class="eyebrow">SUSPECTED FINANCIAL CRIME</p><h2>Sri Lanka Police</h2><p>Contact your nearest police station about suspected financial fraud. Keep messages, dates, and transaction references available.</p><a class="secondary" href="https://www.police.lk/" target="_blank" rel="noopener noreferrer">Official Police website ↗</a><p class="section-note">Do not send further money to someone promising to recover your loss.</p></article><article class="help-card"><p class="eyebrow">PYRAMID-SCHEME CONCERNS</p><h2>Central Bank of Sri Lanka</h2><p>Read the current pyramid-scheme guidance and official reporting contacts.</p><a class="secondary" href="https://www.cbsl.gov.lk/en/node/18807" target="_blank" rel="noopener noreferrer">CBSL guidance ↗</a><a class="phone" href="tel:1935">Hotline 1935</a></article></div><p class="section-note">Reporting routes checked on ${kb.reviewed}. Follow the current instructions on the official websites. Sources: ${sourceLink('s9')} · ${sourceLink('s1')} · ${sourceLink('s5')} · ${sourceLink('s3')} · ${sourceLink('s7')}</p>`; }
function route() {
  const requested = location.hash.slice(1); const hash = ['check', 'help'].includes(requested) ? requested : 'check'; document.querySelectorAll('nav a').forEach(a => { a.classList.toggle('active', a.hash === '#' + hash); if (a.hash === '#' + hash) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (!kb) { app.innerHTML = checkTemplate; form(); return; }
  if (hash === 'help') help(); else { app.innerHTML = checkTemplate; form(); result(); }
}
async function load() {
  try { loadError = ''; const urls = ['knowledge.json', 'prolog/knowledge.pl', 'prolog/engine.pl']; const responses = await Promise.all(urls.map(u => fetch(u))); if (responses.some(r => !r.ok)) throw new Error('A required project file is unavailable.'); kb = await responses[0].json(); const program = (await responses[1].text()) + '\n' + (await responses[2].text()); if (!globalThis.pl) throw new Error('The Prolog interpreter did not load.'); engine = new globalThis.ScamEngine(globalThis.pl, program, kb); await engine.forward({}); route(); registerTools(); }
  catch (e) { loadError = 'Could not start the reasoning engine. ' + e.message; engine = null; app.innerHTML = checkTemplate; document.getElementById('form-area').innerHTML = `<div class="error" role="alert">${esc(loadError)} <button id="retry">Try again</button></div>`; }
}
app.addEventListener('change', e => {
  if (e.target.matches('input[type=radio]')) { clearResult(); state.answers[e.target.name] = e.target.value; document.querySelector('.sample-note')?.remove(); const sampleSelect = document.getElementById('sample'); if (sampleSelect) sampleSelect.value = ''; updateValidation(); result(); }
  if (e.target.id === 'sample') loadSample(e.target.value);
  if (e.target.id === 'mode') { clearResult(); state.mode = e.target.value; form(); result(); }
  if (e.target.id === 'goal') { clearResult(); state.goal = e.target.value; result(); }
});
app.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'retry') load();
  if (b.id === 'assess') assess();
  if (b.id === 'reset') reset();
  if (b.id === 'review-missing') { const missing = unanswered()[0]; if (missing) { state.group = kb.groups.findIndex(g => g.id === missing.group); form(); document.querySelector(`input[name="${missing.id}"]`)?.focus(); } }
  if (b.dataset.group !== undefined) { state.group = Number(b.dataset.group); form(); }
  if (b.hasAttribute('data-prev')) { state.group = Math.max(0, state.group - 1); form(); }
  if (b.hasAttribute('data-next')) { state.group = Math.min(kb.groups.length - 1, state.group + 1); form(); }
});
window.addEventListener('hashchange', route);
let toolLifecycle;
function registerTools() {
  if (!document.modelContext?.registerTool) return; toolLifecycle?.abort(); toolLifecycle = new AbortController();
  const schema = { type: 'object', properties: { answers: { type: 'object', properties: Object.fromEntries(kb.questions.map(q => [q.id, { type: 'string', enum: ['yes', 'no', 'unknown'], description: q.label }])), required: kb.questions.map(q => q.id), additionalProperties: false }, mode: { type: 'string', enum: ['forward', 'backward'] }, goal: { type: 'string', enum: Object.keys(kb.outcomes) } }, required: ['answers', 'mode'], additionalProperties: false };
  try { Promise.resolve(document.modelContext.registerTool({ name: 'assess_scam_situation', title: 'Assess scam warning signs', description: 'Replace the current questionnaire answers and run the selected Prolog reasoning method. Requires an explicit Yes, No or Not sure answer for every question. Updates the visible assessment; does not report the incident.', inputSchema: schema, annotations: { readOnlyHint: false, untrustedContentHint: false }, async execute(input) { if (!engine) throw new Error('Engine unavailable'); if (state.busy) throw new Error('An assessment is already running'); if (!input || Object.keys(input).some(k => !['answers', 'mode', 'goal'].includes(k))) throw new Error('Invalid assessment input'); engine.validate(input.answers); if (!['forward', 'backward'].includes(input.mode)) throw new Error('Invalid mode'); if ((input.mode === 'backward' || input.goal !== undefined) && !Object.keys(kb.outcomes).includes(input.goal)) throw new Error('A valid goal is required'); if (unanswered(input.answers).length) throw new Error('Answer every question with Yes, No or Not sure before checking.'); clearResult(); state.answers = { ...input.answers }; state.mode = input.mode; if (input.goal) state.goal = input.goal; location.hash = 'check'; route(); const r = await assess(); if (!r || r.error) throw new Error(r?.error || 'Assessment changed'); return r.mode === 'forward' ? { bankContact: r.bankContact, outcomes: r.outcomes, ruleIds: r.trace.map(t => t.id) } : { goal: r.goal, status: r.status, bankContact: r.bankContact }; } }, { signal: toolLifecycle.signal })).catch(() => { }); } catch { }
}
window.addEventListener('pagehide', () => toolLifecycle?.abort());
load();

// DOM integration tests; these do not claim real-browser or visual verification.
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { JSDOM } = require(process.env.SCAMWISE_JSDOM_PATH || 'jsdom');
const root = path.resolve(__dirname, '../dist');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, registered = []; const errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.document.modelContext = { registerTool: (tool) => { registered.push(tool); } };
w.fetch = async url => { const target = path.join(root, url); return { ok: fs.existsSync(target), text: async () => fs.readFileSync(target, 'utf8'), json: async () => JSON.parse(fs.readFileSync(target, 'utf8')) } };
w.eval(fs.readFileSync(path.join(root, 'vendor/tau-prolog.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(root, 'prolog-client.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace("import './prolog-client.js';", ''));
const wait = async predicate => { for (let i = 0; i < 500; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 5)); } throw new Error('Timed out waiting for UI'); };
const q = s => w.document.querySelector(s), text = () => w.document.body.textContent;
function change(selector, value) { const el = q(selector); assert(el, selector + ' exists'); el.value = value; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
function click(selector) { assert(q(selector), selector + ' exists'); q(selector).click(); }
async function runCheck() { assert(!q('#assess').disabled, 'Assessment must be enabled'); click('#assess'); await wait(() => q('#assess') && !q('#assess').disabled); assert(!text().includes('Prolog error')); }
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'knowledge.json'), 'utf8'));
const allAnswers = (overrides = {}) => ({ ...Object.fromEntries(catalogue.questions.map(q => [q.id, 'unknown'])), ...overrides });
function fillRemaining(skip = []) {
    for (let i = 0; i < catalogue.groups.length; i++) {
        click(`[data-group="${i}"]`);
        for (const field of w.document.querySelectorAll('.question')) {
            const input = field.querySelector('input[value="unknown"]');
            if (!skip.includes(input.name) && !field.querySelector('input:checked')) input.click();
        }
    }
    click('[data-group="0"]');
}
const rows = [];
async function check(id, name, fn) { try { await fn(); rows.push({ id, name, pass: true }); } catch (e) { rows.push({ id, name, pass: false, error: e.message }); } }
(async () => {
    await wait(() => q('#assess'));
    await check('UI01', 'Unanswered defaults and optional Not sure selection', () => {
        assert(q('input[name="otp"]')); assert(!q('input[type="radio"]:checked')); assert(q('#assess').disabled); assert(q('#answer-validation-message').textContent.startsWith('30 unanswered')); assert(q('#result-area').textContent.includes('Your assessment'));
        for (const removed of ['Your answers stay here', 'No names, account details', 'Independent educational tool', 'Built for Sri Lanka', 'Guidance informed by']) assert(!text().includes(removed));
        click('input[name="otp"][value="unknown"]'); assert(q('.question-nav>span').textContent.startsWith('1 of 30')); assert(q('#assess').disabled); click('[data-group="1"]'); assert(!q('input[type="radio"]:checked')); click('[data-group="0"]'); assert(q('input[name="otp"][value="unknown"]').checked);
        click('#reset'); assert(!q('input[type="radio"]:checked'));
    });
    await check('UI02', 'Forward sample, real engine, and trace', async () => { change('#sample', 'otp_call'); assert(q('#assess').disabled); fillRemaining(); await runCheck(); assert(text().includes('Contact your bank')); assert(text().includes('Verify the claimed institution')); assert(q('.trace summary').textContent.includes('R01')); });
    await check('UI03', 'Editing answer invalidates stale result', () => { const r = q('input[name="otp"][value="no"]'); r.checked = true; r.dispatchEvent(new w.Event('change', { bubbles: true })); assert(q('#result-area').textContent.includes('Your assessment')); });
    await check('UI04', 'Backward goal UI and returned proof', async () => { change('#sample', 'prize_fee'); change('#mode', 'backward'); change('#goal', 'category(prize)'); assert(q('#assess').disabled); fillRemaining(); await runCheck(); assert(text().includes('This suspicion is supported')); assert(text().includes('R07')); assert(q('.proof-tree')); });
    await check('UI05', 'Reset clears answers and disables checking', () => { click('#reset'); assert(q('#assess').disabled); assert(!q('#answer-validation').hidden); assert(!q('input[type="radio"]:checked')); assert(q('#result-area').textContent.includes('Your assessment')); });
    await check('UI06', 'Explicit Not sure completes form but remains unknown evidence', async () => { fillRemaining(); assert(q('#answer-validation').hidden); await runCheck(); assert(text().includes('More information is needed')); assert(text().includes('Unknown:')); });
    await check('UI07', 'Navigate all four questionnaire sections', () => { click('#reset'); for (let i = 1; i < 4; i++) { click('[data-next]'); assert(q('.section-title>span').textContent.startsWith(String(i + 1))); assert(!q('input[type="radio"]:checked')); } assert(q('input[name="sent"]')); });
    await check('UI08', 'Applied-rule explanations retain source references', async () => { change('#sample', 'otp_call'); change('#mode', 'forward'); fillRemaining(); await runCheck(); assert(q('.trace-body .source-link')); assert(q('.trace-body').textContent.includes('Source passage:')); assert(q('.trace-body').textContent.includes('OTP')); });
    await check('UI09', 'Help routes and official contacts', async () => { w.location.hash = 'help'; await wait(() => q('.help-grid')); assert(q('a[href="tel:101"]')); assert(q('a[href="tel:1935"]')); assert(q('a[href="https://cert.gov.lk/report_incident"]')); });
    await check('UI10', 'Two-page navigation and retired knowledge route', async () => { assert.deepEqual(Array.from(w.document.querySelectorAll('nav a'), a => a.getAttribute('href')), ['#check', '#help']); w.location.hash = 'knowledge'; await wait(() => q('#assess')); assert(q('nav a[href="#check"]').classList.contains('active')); assert(!q('a[download]')); assert(!q('a[href^="docs/"]')); assert(!q('#knowledge-search')); assert(!q('#knowledge-items')); assert(!text().includes('Knowledge base')); });
    await check('UI11', 'WebMCP registration in emulated API context', () => { assert.equal(registered.length, 1); assert.equal(registered[0].name, 'assess_scam_situation'); assert.equal(registered[0].annotations.readOnlyHint, false); assert.equal(registered[0].inputSchema.additionalProperties, false); assert.equal(registered[0].inputSchema.properties.answers.required.length, 30); });
    await check('UI12', 'WebMCP valid action shares visible state', async () => { const r = await registered[0].execute({ answers: allAnswers({ sent: 'yes' }), mode: 'forward' }); assert.equal(r.bankContact, true); assert(text().includes('Contact your bank')); });
    await check('UI13', 'Invalid WebMCP input leaves existing result intact', async () => { await assert.rejects(() => registered[0].execute({ answers: { sent: 'garbage' }, mode: 'forward' })); assert(text().includes('Contact your bank')); await assert.rejects(() => registered[0].execute({ answers: allAnswers(), mode: 'forward', goal: 'bad_goal' })); for (const mode of ['forward', 'backward']) await assert.rejects(() => registered[0].execute({ answers: { sent: 'yes' }, mode, goal: 'category(prize)' }), /every question/); assert(text().includes('Contact your bank')); });
    await check('UI14', 'Backward mode retains immediate bank warning', async () => { const r = await registered[0].execute({ answers: allAnswers({ shared: 'yes', prize: 'no' }), mode: 'backward', goal: 'category(prize)' }); assert.equal(r.status, 'not_supported'); assert.equal(r.bankContact, true); assert(q('.urgent-box')); });
    await check('UI15', 'Incomplete forms cannot be assessed in either mode', () => {
        click('#reset');
        for (const mode of ['forward', 'backward']) {
            change('#mode', mode); assert(q('#assess').disabled);
            q('#assess').disabled = false; click('#assess');
            assert(q('#assess').disabled); assert(q('#result-area').textContent.includes('Your assessment'));
        }
    });
    await check('UI16', 'Last unanswered question, shortcut and completion boundary', () => {
        const last = catalogue.questions.at(-1); fillRemaining([last.id]);
        assert(q('#assess').disabled); assert(q('.question-nav>span').textContent === '29 of 30 answered');
        assert(q('#answer-validation-message').textContent.startsWith('1 unanswered question.'));
        click('#review-missing'); assert(w.document.activeElement.name === last.id);
        click(`input[name="${last.id}"][value="no"]`); assert(!q('#assess').disabled); assert(q('#answer-validation').hidden);
        assert(q('.question-nav>span').textContent === '30 of 30 answered');
        change('#goal', 'category(prize)'); assert(!q('#assess').disabled);
        change('#mode', 'forward'); change('#mode', 'backward'); assert(!q('#assess').disabled); assert(q(`input[name="${last.id}"][value="no"]`).checked);
    });
    await check('UI17', 'Loading a partial example disables a previously completed form', () => {
        change('#sample', 'otp_call'); const count = Object.keys(catalogue.samples.find(s => s.id === 'otp_call').answers).length;
        assert(q('#assess').disabled); assert(q('.question-nav>span').textContent === `${count} of 30 answered`);
        assert(q('#answer-validation-message').textContent.startsWith(`${30 - count} unanswered`)); assert(q('#result-area').textContent.includes('Your assessment'));
    });
    await check('UI18', 'No JavaScript runtime errors during tested flows', () => { assert.deepEqual(errors, []); });
    const report = { executedAt: new Date().toISOString(), environment: 'jsdom 26 simulated DOM; not real browser or native WebMCP validation', passed: rows.filter(r => r.pass).length, total: rows.length, results: rows };
    fs.writeFileSync(path.resolve(__dirname, '../docs/ui-test-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.passed}/${report.total} simulated DOM integration tests passed.`); for (const r of rows.filter(r => !r.pass)) console.error(r);
    w.close(); if (report.passed !== report.total) process.exitCode = 1;
})().catch(e => { console.error(e); w.close(); process.exitCode = 1 });

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
process.chdir(path.join(__dirname, '..'));
const pl = require('../dist/vendor/tau-prolog.js'); const Engine = require('../dist/prolog-client.js');
const kb = JSON.parse(fs.readFileSync('dist/knowledge.json')); const program = ['knowledge', 'engine'].map(n => fs.readFileSync(`dist/prolog/${n}.pl`, 'utf8')).join('\n');
const engine = new Engine(pl, program, kb); const results = []; const fired = new Set();
const cases = [
    ['T01', 'Bank caller requests OTP', { otp: 'yes', impersonation: 'yes' }, true, ['r01', 'r05', 'r06'], 'category(impersonation)'],
    ['T02', 'PIN requested', { pin: 'yes' }, true, ['r02', 'r06'], 'flag(credentials)'],
    ['T03', 'Password requested', { password: 'yes' }, true, ['r03', 'r06'], 'flag(credentials)'],
    ['T04', 'Card security code requested', { cvv: 'yes' }, true, ['r04', 'r06'], 'flag(credentials)'],
    ['T05', 'Unexpected prize with fee', { prize: 'yes', fee: 'yes' }, false, ['r07', 'r30'], 'category(prize)'],
    ['T06', 'Unexpected prize collects NIC', { prize: 'yes', identity: 'yes' }, false, ['r08', 'r30'], 'category(prize)'],
    ['T07', 'Reward for unlocking blocked funds', { blocked: 'yes' }, false, ['r09'], 'category(blocked_funds)'],
    ['T08', 'Blocked funds claim CBSL approval', { blocked: 'yes', approval: 'yes' }, false, ['r09', 'r10'], 'category(blocked_funds)'],
    ['T09', 'Recruitment-based earnings', { recruitment: 'yes' }, false, ['r11', 'r29'], 'category(pyramid)'],
    ['T10', 'Contribution-based earnings', { contributions: 'yes' }, false, ['r12', 'r29'], 'category(pyramid)'],
    ['T11', 'Implausible return promise', { returns: 'yes' }, false, ['r13'], 'category(investment)'],
    ['T12', 'Unverified investment authorisation', { provider: 'yes' }, false, ['r14'], 'flag(provider)'],
    ['T13', 'Loan app wants contacts', { loan: 'yes', contacts: 'yes' }, false, ['r15'], 'category(loan_privacy)'],
    ['T14', 'Loan app wants files', { loan: 'yes', files: 'yes' }, false, ['r16'], 'category(loan_privacy)'],
    ['T15', 'Loan terms unclear', { loan: 'yes', terms: 'yes' }, false, ['r17'], 'category(loan_terms)'],
    ['T16', 'Lender details absent', { loan: 'yes', lender: 'yes' }, false, ['r18'], 'category(loan_terms)'],
    ['T17', 'Unusually low price alone', { cheap: 'yes' }, false, ['r19'], 'category(shopping)'],
    ['T18', 'Missing store policies alone', { policies: 'yes' }, false, ['r20'], 'category(shopping)'],
    ['T19', 'Unverified delivery link', { delivery: 'yes', link: 'yes' }, false, ['r21', 'r22'], 'category(delivery)'],
    ['T20', 'Unverified message link alone', { link: 'yes' }, false, ['r22'], 'category(phishing)'],
    ['T21', 'Untrusted app download', { download: 'yes' }, false, ['r23'], 'category(download)'],
    ['T22', 'Account rental request', { rental: 'yes' }, false, ['r24'], 'category(account_misuse)'],
    ['T23', 'Payment in a suspected fraud already made', { sent: 'yes' }, true, ['r25'], 'action(contact_bank)'],
    ['T24', 'Credentials disclosed in a suspected fraud', { shared: 'yes' }, true, ['r26'], 'action(contact_bank)'],
    ['T25', 'Unauthorised transaction', { transaction: 'yes' }, true, ['r27'], 'action(contact_bank)'],
    ['T26', 'Missing input', {}, false, [], null],
    ['T27', 'Every answer is explicitly No', Object.fromEntries(kb.questions.map(q => [q.id, 'no'])), false, [], null],
    ['T28', 'Direct transfer alone', { deposit: 'yes' }, false, ['r28'], 'category(shopping)'],
    ['T29', 'Contacts access without loan context', { contacts: 'yes', loan: 'no' }, false, [], null],
    ['T30', 'Unknown OTP answer', { otp: 'unknown' }, false, [], null],
    ['T31', 'Several patterns and exposure', { otp: 'yes', prize: 'yes', fee: 'yes', sent: 'yes' }, true, ['r01', 'r06', 'r07', 'r25', 'r30'], 'category(prize)'],
    ['T32', 'Two rules support one conclusion', { otp: 'yes', pin: 'yes' }, true, ['r01', 'r02', 'r06'], 'flag(credentials)'],
    ['T47', 'User wants to report a personal scam', { report: 'yes' }, false, ['r31'], 'action(report_cert)'],
    ['T48', 'Report intent explicitly No', { report: 'no' }, false, [], null]
];
async function record(id, name, input, expected, fn) { try { const actual = await fn(); results.push({ id, name, input, expected, actual, pass: true }); } catch (e) { results.push({ id, name, input, expected, actual: e.message, pass: false }); } }
(async () => {
    for (const [id, name, answers, bankContact, ids, goal] of cases) await record(id, name, answers, { bankContact, ruleIds: ids, backward: goal ? 'supported' : null }, async () => {
        const r = await engine.forward(answers); assert.equal(r.bankContact, bankContact); assert.deepEqual(r.trace.map(x => x.id).sort(), [...ids].sort());
        const known = new Set([...kb.facts.map(f => f.term), ...Object.entries(answers).map(([k, v]) => `obs(${k},${v})`)]);
        for (const step of r.trace) { fired.add(step.id); assert(step.conditions.every(c => known.has(c)), 'A trace used an unestablished premise'); known.add(step.conclusion); }
        assert.equal(new Set(r.facts).size, r.facts.length, 'Duplicate facts');
        let b = null; if (goal) { b = await engine.backward(answers, goal); assert.equal(b.status, 'supported'); assert.equal(b.bankContact, bankContact); assert.equal(b.proof.term, goal); }
        return { bankContact: r.bankContact, ruleIds: r.trace.map(t => t.id), backward: b?.status || null };
    });
    const backwardCases = [
        ['T33', 'Missing prize evidence', {}, 'category(prize)', 'unknown'],
        ['T34', 'Explicit No contradicts both prize rules', { prize: 'no' }, 'category(prize)', 'not_supported'],
        ['T35', 'Explicit unknown is not false', { prize: 'unknown', fee: 'yes' }, 'category(prize)', 'unknown'],
        ['T36', 'One complete alternative proves goal', { prize: 'yes', fee: 'no', identity: 'yes' }, 'category(prize)', 'supported'],
        ['T37', 'False branch and unknown branch', { prize: 'yes', fee: 'no' }, 'category(prize)', 'unknown'],
        ['T38', 'Both alternatives contradicted', { prize: 'yes', fee: 'no', identity: 'no' }, 'category(prize)', 'not_supported'],
        ['T39', 'Immediate bank guidance independent of selected goal', { prize: 'no', shared: 'yes' }, 'category(prize)', 'not_supported']
    ];
    for (const [id, name, answers, goal, status] of backwardCases) await record(id, name, { answers, goal }, { status }, async () => { const r = await engine.backward(answers, goal); assert.equal(r.status, status); if (id === 'T39') assert(r.bankContact); return { status: r.status, bankContact: r.bankContact, proof: r.proof }; });
    await record('T40', 'No state leakage between assessments', {}, 'Second assessment has no conclusions', async () => { await engine.forward({ otp: 'yes' }); const r = await engine.forward({}); assert.equal(r.trace.length, 0); return 'Second assessment has no conclusions'; });
    await record('T41', 'Reject malformed input key', { 'otp).halt.': 'yes' }, 'Rejected', async () => { await assert.rejects(() => engine.forward({ 'otp).halt.': 'yes' })); return 'Rejected'; });
    await record('T42', 'Reject invalid answer value', { otp: 'sometimes' }, 'Rejected', async () => { await assert.rejects(() => engine.forward({ otp: 'sometimes' })); return 'Rejected'; });
    await record('T43', 'Reject unknown backward goal', {}, 'Rejected', async () => { await assert.rejects(() => engine.backward({}, 'halt')); return 'Rejected'; });
    await record('T44', 'Reject conflicting duplicate Prolog answers', {}, 'Rejected', async () => { await assert.rejects(() => engine.query('forward([obs(otp,yes),obs(otp,no)], Facts, Trace).')); return 'Rejected'; });
    await record('T45', 'Cycle guard terminates safely', {}, 'unknown', async () => { const cycle = new Engine(pl, program + '\nallowed_goal(test(cycle)).\nrule(c01,[test(cycle)],test(cycle)).', { ...kb, outcomes: { ...kb.outcomes, 'test(cycle)': { label: 'cycle' } } }); const b = await cycle.backward({}, 'test(cycle)'); assert.equal(b.status, 'unknown'); return b.status; });
    await record('T46', 'Knowledge and rule integrity', {}, '26 facts, 31 rules, complete source locators', async () => { assert.equal(kb.facts.length, 26); assert.equal(kb.rules.length, 31); assert.equal(new Set(kb.facts.map(f => f.term)).size, 26); assert.equal(new Set(kb.rules.map(r => r.id)).size, 31); const sources = new Set(kb.sources.map(s => s.id)); assert(kb.facts.every(f => sources.has(f.source))); assert(kb.rules.every(r => sources.has(r.source) && r.locator && r.evidence)); assert.equal(fired.size, 31); return '26 facts, 31 rules, complete source locators'; });
    results.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
    const output = { executedAt: new Date().toISOString(), runtime: process.version, interpreter: 'Tau Prolog 0.3.4', passed: results.filter(r => r.pass).length, total: results.length, ruleCoverage: { fired: fired.size, total: kb.rules.length, ids: [...fired].sort() }, results };
    fs.writeFileSync('docs/test-results.json', JSON.stringify(output, null, 2) + '\n');
    console.log(`${output.passed}/${output.total} tests passed; ${fired.size}/${kb.rules.length} production rules exercised.`);
    for (const r of results.filter(r => !r.pass)) console.error(r.id, r.name, r.actual);
    if (output.passed !== output.total) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1 });

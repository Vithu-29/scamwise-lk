/* Bridges UI / Node tests to the same real Prolog program. No JS inference rules. */
(function (root) {
  function serialize(t) {
    if (t.id === '[]') return '[]';
    if (t.args?.length) return t.id + '(' + t.args.map(serialize).join(',') + ')';
    return t.id !== undefined ? String(t.id) : String(t.value);
  }
  function list(t) {
    const result = [];
    while (t && t.id === '.' && t.args.length === 2) { result.push(t.args[0]); t = t.args[1]; }
    if (!t || t.id !== '[]') throw new Error('Unexpected Prolog list.');
    return result;
  }
  function proof(t) {
    const a = t.args || [];
    switch (t.id) {
      case 'input': return { kind: 'input', term: serialize(a[0]) };
      case 'knowledge': return { kind: 'knowledge', id: serialize(a[0]), term: serialize(a[1]), source: serialize(a[2]) };
      case 'missing': return { kind: 'missing', term: serialize(a[0]) };
      case 'contradicted': return { kind: 'contradicted', term: serialize(a[0]), actual: serialize(a[1]) };
      case 'cycle': return { kind: 'cycle', term: serialize(a[0]) };
      case 'because': return { kind: 'because', term: serialize(a[0]), id: serialize(a[1]), children: list(a[2]).map(proof) };
      case 'alternatives': return { kind: 'alternatives', term: serialize(a[0]), branches: list(a[1]).map(b => ({ id: serialize(b.args[0]), status: serialize(b.args[1]), children: list(b.args[2]).map(proof) })) };
      default: throw new Error('Unexpected proof structure: ' + t.id);
    }
  }
  class ScamEngine {
    constructor(pl, program, knowledge) { this.pl = pl; this.program = program; this.knowledge = knowledge; }
    validate(answers) {
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Answers must be an object.');
      const keys = new Set(this.knowledge.questions.map(q => q.id));
      for (const [key, value] of Object.entries(answers)) {
        if (!keys.has(key) || !['yes', 'no', 'unknown'].includes(value)) throw new Error('Invalid answer: ' + key);
      }
      return '[' + Object.entries(answers).map(([k, v]) => `obs(${k},${v})`).join(',') + ']';
    }
    query(goal) {
      const session = this.pl.create(1000000);
      return new Promise((resolve, reject) => {
        const error = e => reject(new Error('Prolog error: ' + (e?.toString?.() || e)));
        session.consult(this.program, { error, success: () => session.query(goal, { error, success: () => session.answer({ success: resolve, error, fail: () => reject(new Error('The Prolog query could not be satisfied.')), limit: () => reject(new Error('Reasoning limit reached. Please reset the assessment.')) }) }) });
      });
    }
    async forward(answers) {
      const a = this.validate(answers);
      const result = await this.query(`forward(${a}, Facts, Trace).`);
      const facts = list(result.links.Facts).map(serialize);
      const trace = list(result.links.Trace).map(t => ({ id: serialize(t.args[0]), conditions: list(t.args[1]).map(serialize), conclusion: serialize(t.args[2]) }));
      return { mode: 'forward', facts, trace, bankContact: facts.includes('action(contact_bank)'), outcomes: facts.filter(f => this.knowledge.outcomes[f]) };
    }
    async backward(answers, goal) {
      const a = this.validate(answers);
      if (!Object.hasOwn(this.knowledge.outcomes, goal)) throw new Error('Unknown goal.');
      const result = await this.query(`backward(${goal}, ${a}, Status, Proof), backward(action(contact_bank), ${a}, BankContact, BankProof).`);
      return { mode: 'backward', goal, status: serialize(result.links.Status), proof: proof(result.links.Proof), bankContact: serialize(result.links.BankContact) === 'supported', bankProof: proof(result.links.BankProof) };
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = ScamEngine;
  else root.ScamEngine = ScamEngine;
})(typeof globalThis === 'undefined' ? this : globalThis);

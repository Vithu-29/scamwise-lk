const fs = require('fs');
const sources = [
    ['s1', 'Central Bank of Sri Lanka', 'Protect your bank passwords and PINs', 'https://www.cbsl.gov.lk/en/news/beware-of-online-scams-protect-your-bank-passwords-and-pin', '2019-11-21'],
    ['s2', 'Central Bank of Sri Lanka', 'Online financial frauds and scams', 'https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/press/pr/press_20210121_beware_of_online_financial_frauds_and_scams_e.pdf', '2021-01-21'],
    ['s3', 'Central Bank of Sri Lanka', 'Prohibited pyramid schemes', 'https://www.cbsl.gov.lk/en/node/18807', null],
    ['s4', 'Sri Lanka CERT', 'Cyber Guardian: secure shopping and scam awareness', 'https://www.cert.gov.lk/wp-content/uploads/cyber_gaurdian/issue04/News-Letter-04-E-1English.pdf', null],
    ['s5', 'Sri Lanka CERT', 'Report an incident', 'https://cert.gov.lk/report_incident', null],
    ['s6', 'Central Bank of Sri Lanka', 'Beware of financial scams', 'https://www.cbsl.gov.lk/en/node/11291', '2021-10-26'],
    ['s7', 'Central Bank of Sri Lanka', 'Financial scams and phishing emails', 'https://www.cbsl.gov.lk/en/news/the-central-bank-of-sri-lanka-requests-the-general-public-to-be-attentive-to-financial-scams-phishing-emails', '2018-11-14'],
    ['s8', 'Central Bank of Sri Lanka', 'Be Scam Proof awareness campaign', 'https://www.cbsl.gov.lk/en/be-scam-proof-new', null],
    ['s9', 'Sri Lanka Police', 'Public awareness on emerging online financial scams using the names of reputable institutions', 'https://www.police.lk/?p=21963', '2026-03-20']
].map(([id, organization, title, url, published]) => ({ id, organization, title, url, published, reviewed: '2026-09-27' }));
const facts = [
    ['f01', 'sensitive(otp)', 'An OTP is confidential transaction-verification information.', 's1'],
    ['f02', 'sensitive(pin)', 'A banking or card PIN must remain private.', 's1'],
    ['f03', 'sensitive(password)', 'Banking passwords must not be disclosed to another person.', 's1'],
    ['f04', 'sensitive(cvv)', 'A card security code is confidential payment information.', 's1'],
    ['f05', 'tactic(prize_fee)', 'Fake prize notices can request a payment to release winnings.', 's7'],
    ['f06', 'tactic(prize_identity)', 'Fake prize notices can collect identity details.', 's7'],
    ['f07', 'tactic(blocked_funds)', 'Scammers may promise a reward for unlocking supposedly blocked funds.', 's6'],
    ['f08', 'tactic(approval_claim)', 'Forged documents may claim Central Bank approval is needed to release funds.', 's6'],
    ['f09', 'signal(recruitment_income)', 'Income mainly based on recruiting participants is a pyramid warning sign.', 's3'],
    ['f10', 'signal(contribution_income)', 'Income mainly based on growing participant contributions is a pyramid warning sign.', 's3'],
    ['f11', 'signal(unrealistic_returns)', 'Returns that are implausible for the stated risk warrant caution.', 's8'],
    ['f12', 'signal(unverified_provider)', 'Regulatory approval of a financial provider should be independently checked.', 's8'],
    ['f13', 'signal(loan_contacts)', 'Loan requests for phone-contact access are a privacy warning.', 's2'],
    ['f14', 'signal(loan_files)', 'Loan requests for access to phone photographs and files warrant caution.', 's2'],
    ['f15', 'signal(unclear_terms)', 'Financial agreements with unclear terms should not be accepted.', 's2'],
    ['f16', 'signal(loan_no_details)', 'An online lender with insufficient identifying information is a warning sign.', 's2'],
    ['f17', 'signal(very_low_price)', 'An unusually low online selling price can be a scam indicator.', 's4'],
    ['f18', 'signal(no_store_policies)', 'Missing delivery and return policies can indicate a dubious store.', 's4'],
    ['f19', 'signal(direct_deposit)', 'Direct-transfer shopping payments may be difficult to recover.', 's4'],
    ['f20', 'signal(delivery_links)', 'Fake delivery notifications can direct people to harmful links.', 's4'],
    ['f21', 'signal(unofficial_download)', 'Untrusted app-download sources create avoidable security risks.', 's4'],
    ['f22', 'signal(impersonation)', 'A familiar institution name does not authenticate a message.', 's8'],
    ['f23', 'signal(account_rental)', 'Renting or lending a bank account can enable criminal misuse.', 's8'],
    ['f24', 'response(contact_bank)', 'Suspicious account activity should be reported promptly to the relevant bank.', 's1'],
    ['f25', 'response(report_cert)', 'CERT directs personal scam reports to its official incident portal.', 's5'],
    ['f26', 'response(report_police)', 'Suspected financial scams can be reported to the nearest police station.', 's7']
].map(([id, term, text, source]) => ({ id, term, text, source }));
const groups = [{ id: 'private', label: 'Private information', short: 'Information', note: 'Think about what another person asked you to reveal. Never enter the actual details here.' }, { id: 'money', label: 'Money & promises', short: 'Money', note: 'Look at what you are being promised and how payments or earnings work.' }, { id: 'online', label: 'Links, shops & loans', short: 'Online signs', note: 'Check the request against what you can independently verify.' }, { id: 'impact', label: 'What has happened so far?', short: 'Your situation', note: 'These answers help identify whether you should contact your bank immediately.' }];
const questions = [
    ['otp', 'private', 'Did someone ask you to tell them your OTP?', 'An OTP is a one-time code. This means sharing it with a person, not entering it yourself in a verified service.'],
    ['pin', 'private', 'Did someone ask for your banking or card PIN?', 'Do not enter the actual PIN here.'],
    ['password', 'private', 'Did someone ask for your banking password?', 'Include calls, chats, or messages requesting the password.'],
    ['cvv', 'private', 'Did a caller or message ask you to disclose your card security code?', 'This means giving the code to a person, not using a verified checkout yourself.'],
    ['impersonation', 'private', 'Does the sender claim to represent a bank or official institution?', 'A logo or familiar name alone does not verify identity.'],
    ['prize', 'money', 'Have you been told you won an unexpected prize?', 'For example, a cash draw you do not recall entering.'],
    ['fee', 'money', 'Must you pay money to receive the promised prize or released funds?', 'Include processing, clearance, or release fees.'],
    ['identity', 'money', 'Does the prize claim ask for your NIC or passport details?', 'Only answer whether details were requested.'],
    ['blocked', 'money', 'Are you offered a reward for helping unlock someone else’s blocked funds?', 'This includes alleged foreign funds or frozen balances.'],
    ['approval', 'money', 'Do they claim Central Bank approval will unlock those funds?', 'Include letters or documents making that claim.'],
    ['recruitment', 'money', 'Does the scheme mainly pay you for recruiting new members?', 'Focus on the main source of earnings, not ordinary product sales.'],
    ['contributions', 'money', 'Do earnings mainly depend on members adding more money?', 'Include upgrades or increasing member contributions.'],
    ['returns', 'money', 'Are unusually high returns promised with little or no risk?', 'Consider the promise in relation to the claimed risk.'],
    ['rental', 'money', 'Are you asked to rent your bank account or pass others’ money through it?', 'For example, keeping a commission for moving someone else’s funds.'],
    ['provider', 'money', 'Have you been unable to independently verify the investment provider’s authorisation?', 'Answer No only if you have checked through the relevant official source; otherwise choose Not sure.'],
    ['loan', 'online', 'Is this an online or mobile loan offer?', 'This provides context for the next four questions.'],
    ['contacts', 'online', 'Does the loan app request access to your contacts?', 'Include permissions to read your address book.'],
    ['files', 'online', 'Does the loan app request access to photos or files?', 'Consider permissions unrelated to a clear, necessary purpose.'],
    ['terms', 'online', 'Are the loan terms, fees, or repayment conditions unclear?', 'Answer based on whether you understand the agreement.'],
    ['lender', 'online', 'Is adequate information about the lender missing?', 'For example, an independently verifiable identity and contact details.'],
    ['cheap', 'online', 'Is the online seller’s price unusually low?', 'Compare with similar products from established sellers.'],
    ['policies', 'online', 'Are the online store’s delivery and return policies missing?', 'Check information you can actually find.'],
    ['deposit', 'online', 'Does the seller insist on a direct bank transfer?', 'This alone does not prove fraud.'],
    ['delivery', 'online', 'Is this a parcel or delivery notification?', 'Include messages about a delivery you were not expecting.'],
    ['link', 'online', 'Does the message include a link you cannot independently verify?', 'Do not open the link just to answer this question.'],
    ['download', 'online', 'Are you asked to install an app from an untrusted download link?', 'For example, a file sent by an unknown sender.'],
    ['sent', 'impact', 'Have you already sent money in this suspicious situation?', 'Only confirm whether a payment was made; do not provide account details.'],
    ['shared', 'impact', 'Have you already disclosed an OTP, PIN, banking password, or card security code?', 'Answer about this suspicious situation.'],
    ['transaction', 'impact', 'Have you noticed a banking transaction you did not authorise?', 'Check through your bank’s official app or another trusted channel.'],
    ['report', 'impact', 'Do you want to report a suspected financial or social-media scam?', 'This provides the official CERT reporting route; it does not send a report.']
].map(([id, group, label, hint]) => ({ id, group, label, hint }));
const rules = [];
function rule(id, conditions, conclusion, title, source, why) { rules.push({ id, conditions, conclusion, title, source, why }); }
rule('r01', ['sensitive(otp)', 'obs(otp,yes)'], 'flag(credentials)', 'OTP disclosure request', 's1', 'A request to disclose an OTP exposes confidential verification information.');
rule('r02', ['sensitive(pin)', 'obs(pin,yes)'], 'flag(credentials)', 'PIN disclosure request', 's1', 'A PIN request is a credential-protection warning.');
rule('r03', ['sensitive(password)', 'obs(password,yes)'], 'flag(credentials)', 'Banking password request', 's1', 'A banking password request is a credential-protection warning.');
rule('r04', ['sensitive(cvv)', 'obs(cvv,yes)'], 'flag(credentials)', 'Card security-code request', 's1', 'The request concerns confidential payment information.');
rule('r05', ['flag(credentials)', 'signal(impersonation)', 'obs(impersonation,yes)'], 'category(impersonation)', 'Possible institution impersonation', 's8', 'An institution claim combined with a credential request needs independent verification.');
rule('r06', ['flag(credentials)', 'response(contact_bank)'], 'action(contact_bank)', 'Tell the bank about the request', 's1', 'CBSL advises informing the bank when a third party requests confidential account-access information.');
rule('r07', ['tactic(prize_fee)', 'obs(prize,yes)', 'obs(fee,yes)'], 'category(prize)', 'Prize payment warning', 's7', 'An unexpected prize requiring payment matches a documented scam pattern.');
rule('r08', ['tactic(prize_identity)', 'obs(prize,yes)', 'obs(identity,yes)'], 'category(prize)', 'Prize identity-collection warning', 's7', 'An unexpected prize collecting identity details needs verification.');
rule('r09', ['tactic(blocked_funds)', 'obs(blocked,yes)'], 'category(blocked_funds)', 'Blocked-funds reward warning', 's6', 'A reward for unlocking supposedly blocked funds matches the documented warning.');
rule('r10', ['tactic(approval_claim)', 'obs(blocked,yes)', 'obs(approval,yes)'], 'category(blocked_funds)', 'Alleged approval warning', 's6', 'A blocked-funds reward relying on alleged Central Bank approval is suspicious.');
rule('r11', ['signal(recruitment_income)', 'obs(recruitment,yes)'], 'category(pyramid)', 'Recruitment-based earnings', 's3', 'Recruitment is the reported main income source, which is a pyramid warning sign.');
rule('r12', ['signal(contribution_income)', 'obs(contributions,yes)'], 'category(pyramid)', 'Contribution-based earnings', 's3', 'Earnings reportedly rely on expanding participant contributions.');
rule('r13', ['signal(unrealistic_returns)', 'obs(returns,yes)'], 'category(investment)', 'Unrealistic return warning', 's8', 'A very high return paired with little risk warrants verification.');
rule('r14', ['signal(unverified_provider)', 'obs(provider,yes)'], 'flag(provider)', 'Provider verification needed', 's8', 'The provider’s authorisation has not been independently established.');
rule('r15', ['signal(loan_contacts)', 'obs(loan,yes)', 'obs(contacts,yes)'], 'category(loan_privacy)', 'Loan contact-access warning', 's2', 'The loan application seeks access to phone contacts.');
rule('r16', ['signal(loan_files)', 'obs(loan,yes)', 'obs(files,yes)'], 'category(loan_privacy)', 'Loan file-access warning', 's2', 'The loan application seeks access to personal phone files.');
rule('r17', ['signal(unclear_terms)', 'obs(loan,yes)', 'obs(terms,yes)'], 'category(loan_terms)', 'Unclear loan agreement', 's2', 'The loan terms are not understood well enough for an informed agreement.');
rule('r18', ['signal(loan_no_details)', 'obs(loan,yes)', 'obs(lender,yes)'], 'category(loan_terms)', 'Unclear lender identity', 's2', 'Insufficient lender information prevents a reliable check.');
rule('r19', ['signal(very_low_price)', 'obs(cheap,yes)'], 'category(shopping)', 'Unusually low shopping price', 's4', 'An unusually low price is one of the shopping indicators listed by CERT.');
rule('r20', ['signal(no_store_policies)', 'obs(policies,yes)'], 'category(shopping)', 'Store transparency warning', 's4', 'Missing delivery or return policies are shopping warning signs listed by CERT.');
rule('r21', ['signal(delivery_links)', 'obs(delivery,yes)', 'obs(link,yes)'], 'category(delivery)', 'Delivery-link warning', 's4', 'The delivery message contains a link you cannot independently verify.');
rule('r22', ['obs(link,yes)'], 'category(phishing)', 'Unverified message link', 's4', 'Avoid a questionable message link and access the genuine service directly.');
rule('r23', ['signal(unofficial_download)', 'obs(download,yes)'], 'category(download)', 'Untrusted app warning', 's4', 'An untrusted download link should not be used to install an app.');
rule('r24', ['signal(account_rental)', 'obs(rental,yes)'], 'category(account_misuse)', 'Account misuse warning', 's8', 'The request involves using your bank account to handle another party’s money.');
rule('r25', ['response(contact_bank)', 'obs(sent,yes)'], 'action(contact_bank)', 'Payment already made', 's9', 'Money was sent in a situation you consider suspicious. Contact the bank promptly.');
rule('r26', ['response(contact_bank)', 'obs(shared,yes)'], 'action(contact_bank)', 'Credentials already shared', 's9', 'Confidential access information has already been disclosed.');
rule('r27', ['response(contact_bank)', 'obs(transaction,yes)'], 'action(contact_bank)', 'Unrecognised transaction', 's1', 'The reported transaction was not authorised by you.');
rule('r28', ['signal(direct_deposit)', 'obs(deposit,yes)'], 'category(shopping)', 'Direct-deposit shopping payment', 's4', 'CERT lists direct bank deposits among shopping warning signs; this alone does not prove fraud.');
rule('r29', ['category(pyramid)', 'response(report_police)'], 'action(report_police)', 'Report a suspected pyramid scheme', 's3', 'CBSL identifies Police as a reporting route for suspected pyramid schemes.');
rule('r30', ['category(prize)'], 'action(verify_institution)', 'Verify the claimed prize directly', 's7', 'CBSL advises direct verification with the named institution for this type of notification.');
rule('r31', ['response(report_cert)', 'obs(report,yes)'], 'action(report_cert)', 'Official CERT reporting route', 's5', 'CERT directs personal financial and social-media scam reports to its incident portal.');
// Source locators refer to the body of the named document, not navigation text.
const sourceEvidence = {
    r01: ['Confidential information list and non-disclosure advice', 'OTPs are among the protected account-access details.'],
    r02: ['Confidential information list and non-disclosure advice', 'PINs are included in confidential banking information.'],
    r03: ['Confidential information list and non-disclosure advice', 'Banking passwords must be kept confidential.'],
    r04: ['Confidential information list and non-disclosure advice', 'Card security codes are listed as confidential details.'],
    r05: ['The Four Rules: protect your information; check before you act', 'Official identity claims do not justify asking for secret credentials.'],
    r06: ['Final body paragraph: requests for confidential account access', 'Inform the bank if another party requests account-access information.'],
    r07: ['Body paragraph on prizes, fees and identity details', 'Fraudulent prize notices ask for release fees.'],
    r08: ['Body paragraph on prizes, fees and identity details', 'Fraudulent prize notices seek NIC or passport information.'],
    r09: ['Opening paragraph: rewards for unlocking blocked funds', 'A promised reward for unlocking funds is a documented tactic.'],
    r10: ['Paragraph on forged letters and alleged CBSL approval', 'Scam documents can claim approval is needed to release funds.'],
    r11: ['Opening definition of prohibited pyramid schemes', 'Primary earnings from recruiting participants are a warning pattern.'],
    r12: ['Opening definition of prohibited pyramid schemes', 'Primary earnings from increased participant contributions are a warning pattern.'],
    r13: ['The Four Rules: question unrealistic returns', 'Very high returns with low risk require caution.'],
    r14: ['Scam Files: unregistered finance companies', 'Check regulatory approval before trusting an investment provider.'],
    r15: ['Page 1: mobile-loan characteristics and data-access advice', 'Loan-related access to phone contacts is discouraged.'],
    r16: ['Page 1: mobile-loan characteristics and data-access advice', 'Loan-related access to photographs and files is discouraged.'],
    r17: ['Page 1: advice to understand transaction terms', 'Understand the financial agreement before accepting it.'],
    r18: ['Page 1: lender information and mobile-loan characteristics', 'Obtain sufficient information about the lender.'],
    r19: ['Page 1: Know the Warning Signs', 'Extremely low selling prices can signal a scam.'],
    r20: ['Page 1: Know the Warning Signs', 'Missing delivery or return policies can signal a scam.'],
    r21: ['Page 1: Watch Out for Fake Delivery Scams', 'Fake parcel messages use links to obtain information or install malware.'],
    r22: ['Page 2: Protect Yourself from Scams', 'Avoid questionable message links; visit the service directly.'],
    r23: ['Page 2: Protect Yourself from Scams', 'Use official download sources instead of untrusted app files.'],
    r24: ['Scam Files: bank-account lending or renting', 'Others may misuse a borrowed or rented bank account.'],
    r25: ['Precautions: final item on suspected victims', 'A suspected fraud victim should promptly inform their bank.'],
    r26: ['Precautions: final item on suspected victims', 'A suspected fraud victim should promptly inform their bank.'],
    r27: ['Final body paragraph: unexpected transaction notifications', 'Inform the bank about transactions not initiated by the account holder.'],
    r28: ['Page 1: Know the Warning Signs; Use Secure Payment Methods', 'Direct deposits are a listed warning and can be hard to recover.'],
    r29: ['Reporting guidance following the pyramid-scheme definition', 'Report suspected pyramid schemes to Police or CBSL.'],
    r30: ['Final body paragraph: verify directly with the named institution', 'Check the notification directly with the institution it names.'],
    r31: ['Important Notice: social-media and financial-fraud incidents', 'Personal scam reports belong in the official incident portal.']
};
for (const r of rules) { [r.locator, r.evidence] = sourceEvidence[r.id]; }
const outcomes = {
    'flag(credentials)': { label: 'Confidential details requested', advice: 'Do not disclose the requested code or password. Contact the institution through its official app, website, or the number on your card.' },
    'flag(provider)': { label: 'Provider not independently verified', advice: 'Check the provider’s authorisation with the appropriate regulator before committing funds.' },
    'category(impersonation)': { label: 'Verify the claimed institution', advice: 'End the conversation and contact the claimed institution through a channel you find independently.' },
    'category(prize)': { label: 'Possible prize scam', advice: 'Pause any fee payment or identity disclosure. Verify the claimed prize directly with the named organisation.' },
    'category(blocked_funds)': { label: 'Possible blocked-funds scam', advice: 'Do not send money to release the alleged funds. Verify any claimed official approval independently.' },
    'category(pyramid)': { label: 'Pyramid-scheme warning signs', advice: 'Pause participation and recruitment. Consult CBSL’s current guidance; this tool does not determine whether a named scheme is illegal.' },
    'category(investment)': { label: 'Unrealistic investment promise', advice: 'Ask for independently verifiable information on risks and authorisation. Do not rely on a promised return.' },
    'category(loan_privacy)': { label: 'Intrusive loan-app permissions', advice: 'Do not grant the requested phone access. Verify the lender and review the privacy terms.' },
    'category(loan_terms)': { label: 'Loan information needs checking', advice: 'Get clear lender information, fees, and repayment terms before accepting the agreement.' },
    'category(shopping)': { label: 'Online shopping warning signs', advice: 'Verify the seller independently and review the purchase and payment protections before paying.' },
    'category(delivery)': { label: 'Suspicious delivery link', advice: 'Avoid the message link. Check the delivery using the courier’s independently located official service.' },
    'category(phishing)': { label: 'Avoid the unverified message link', advice: 'Do not follow the questionable link. Open the genuine service directly if you need to sign in.' },
    'category(download)': { label: 'Untrusted app download', advice: 'Do not install the file. Use a verified official source for the app you need.' },
    'category(account_misuse)': { label: 'Possible bank-account misuse', advice: 'Do not rent your account or move unknown funds for someone else. Ask your bank for guidance.' },
    'action(contact_bank)': { label: 'Contact your bank now', advice: 'Use the official banking app, card contact number, or branch. Explain what happened and ask about securing access and the transaction.' },
    'action(report_cert)': { label: 'Use the CERT incident portal', advice: 'Follow the reporting guidance at cert.gov.lk/report_incident. The CERT hotline is 101.' },
    'action(report_police)': { label: 'Report the suspected scam to Police', advice: 'Contact your nearest police station. Keep relevant messages, payment references, and dates available for the report.' },
    'action(verify_institution)': { label: 'Verify the prize with the named institution', advice: 'Use contact details obtained independently from the institution’s official website or branch.' }
};
const samples = [
    { id: 'otp_call', label: 'A “bank” caller asks for an OTP', description: 'A caller claims to represent a bank and asks for an OTP. Nothing has been shared yet.', answers: { otp: 'yes', impersonation: 'yes', shared: 'no', sent: 'no', transaction: 'no' }, goal: 'category(impersonation)' },
    { id: 'prize_fee', label: 'Pay a fee to claim a prize', description: 'An unexpected cash prize requires a release fee.', answers: { prize: 'yes', fee: 'yes', sent: 'no' }, goal: 'category(prize)' },
    { id: 'pyramid', label: 'Earn mainly by recruiting people', description: 'An offer says income mainly comes from signing up new participants.', answers: { recruitment: 'yes', sent: 'no' }, goal: 'category(pyramid)' },
    { id: 'delivery', label: 'An unfamiliar parcel link', description: 'A parcel notification contains a link that cannot be verified.', answers: { delivery: 'yes', link: 'yes' }, goal: 'category(delivery)' },
    { id: 'exposed', label: 'Already shared banking details', description: 'An OTP was disclosed and an unrecognised transaction appeared.', answers: { otp: 'yes', shared: 'yes', transaction: 'yes' }, goal: 'action(contact_bank)' },
    { id: 'no_signs', label: 'No listed warning signs', description: 'All listed observations are explicitly No. This still does not establish that an offer is safe.', answers: Object.fromEntries(questions.map(q => [q.id, 'no'])), goal: 'category(prize)' }
];
const data = { version: '1.2.1', reviewed: '2026-09-27', sources, facts, groups, questions, rules, outcomes, samples };
fs.writeFileSync('dist/knowledge.json', JSON.stringify(data, null, 2) + '\n');
let prolog = '% ScamWise LK: source-backed domain knowledge. Generated by scripts/build-knowledge.cjs.\n% Conditions and advice are formalised from the cited official passages. No risk scores.\n\n';
for (const f of facts) prolog += `% ${f.id}: ${f.text}\ndomain_fact(${f.id}, ${f.term}, ${f.source}).\n`;
prolog += '\n'; for (const q of questions) prolog += `question(${q.id}).\n`;
prolog += '\n'; for (const [g] of Object.entries(outcomes)) prolog += `allowed_goal(${g}).\n`;
prolog += '\n'; for (const r of rules) prolog += `% ${r.id}: ${r.title} [${r.source}]\n% Source locator: ${r.locator}\nrule(${r.id}, [${r.conditions.join(', ')}], ${r.conclusion}).\n`;
fs.writeFileSync('dist/prolog/knowledge.pl', prolog);
console.log(`${facts.length} facts; ${rules.length} rules; ${questions.length} questions; ${sources.length} sources.`);

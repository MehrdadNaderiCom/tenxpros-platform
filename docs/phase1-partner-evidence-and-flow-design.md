# Phase 1: Partner claim, evidence, and flow redesign. Investigation and design proposal.

This is a Phase 1 document only: investigation of the current state and a proposed design. Nothing here is built. It is split cleanly into "what exists today" (Part A, from reading the real code and the live database) and "what I propose" (Part B, a design to review). At the end there is a hard stop: no Phase 2 work begins until you approve the design.

A note on method and honesty: Part A was produced by reading the actual code and querying the live database directly, with real field names, labels, and file references quoted. Where something does not exist, it says so plainly. Every number the system uses is read from the program config source of truth; figures shown here are the current configured values so you can see the shape of the rule.

---

# PART A. What exists today

## A1. The registration flow, field by field

The partner registers a deal on the form in `app/src/components/portal/partner-deal-form.tsx`, validated by `dealRegistrationSchema` in `app/src/lib/validations/partner.ts`, stored as the `DealRegistration` model in `app/prisma/schema.prisma`, and reviewed by an admin on `app/src/app/(admin)/admin/partners/deal-registrations/page.tsx`.

The fields the partner fills, in order, with their real labels:

1. Type (required). Select: TenXPros certification or TenXOps engagement (`productLine`).
2. Offering in view (required). Select: B2B Engagement, B2C Charter, or Other (`offering`).
3. Exact legal entity or individual (required, minimum 2 characters). `legalEntity`.
4. Company domain (optional, maximum 253 characters). `domain`. This is the field added in the commission redesign; it drives the objective New/Dormant/Existing classification.
5. Country (required). `country`.
6. Business unit or department (optional). `businessUnit`.
7. Primary contact (optional). `contactName`.
8. Contact title (optional). `contactTitle`.
9. Estimated seats (optional). `estSeats`.
10. Estimated value (USD) (optional). `estValueUsd`, stored as `estValueCents`.
11. Functions you intend to perform (checkboxes). `functionsIntended`, from `DEAL_FUNCTION_OPTIONS`: only three options exist, "Origination (open the account)", "Closing (lead the sale to signature)", and "Delivery or Coaching".
12. Your case for this account (required, minimum 40 characters). `justification`, a free-text box.
13. Any wider scope requested (optional). `widerScopeRequested`.

Key answers to the questions that drive this work:

- Is the claimed function captured at registration, or only later at commission time? It is captured coarsely at registration as `functionsIntended`, but only as three broad categories: Origination, Closing, Delivery. Two things are missing there. First, Basic Introduction is not even an option at registration. Second, the strength of an origination (Qualified versus Strong) is not chosen or evidenced at registration at all. The actual, precise commission function and its Qualified-versus-Strong strength are recorded only later, when an admin adds a commission line in `addCommissionLine`, where the strength is derived objectively from domain newness plus sale amount (`classifyOrigination`). So the registration claim and the pay classification are two separate steps.

- Is there any field where the partner justifies the specific function or attaches evidence? No, not per function. The only justification is the single free-text `justification` box ("Your case for this account"), which is one paragraph covering the whole deal, not per function. There is no structured evidence for the intro relationship, no evidence for why the company is new or dormant, no signed-agreement reference, and no delivery evidence at registration.

- Where does the warm-relationship attestation live? Not on the registration. The `warmRelationshipAttested` boolean and the evidence note are fields on `CommissionEntry` (the commission line), captured only when an admin adds a Basic Introduction line, long after registration. So at the point a partner claims an introduction, nothing is attested or evidenced; the attestation is collected later, by the admin, on the line.

In short: at registration the partner gives a broad function category and one free-text paragraph. There is no per-function proof, no strength claim, and no structured evidence. Everything precise about the claim happens later on the commission line.

## A2. The decision step and the SLA

- The service window. The config has two relevant values in `app/src/lib/partner/config.ts`: `dealConfirmationWindowBusinessDays: 5` and `firstRightHours: 48`. The 5 business days is the confirm-or-decline window, and it is stated only in the legal terms ("The company uses reasonable efforts to confirm or decline a registration on the panel within 5 business days"). The 48 hours (`firstRightHours`) is not a decision SLA at all: it is the first-right window that starts after a registration is confirmed (`firstRightExpiresAt`). So the honest answer to "is there a 48-hour decision SLA" is no. There is a 5 business day confirm window, stated only in the terms, and the partner is not told any SLA on the form or in any email.

- What triggers review. On submit, `submitDealRegistration` sends the owner an email (`notifyOwner`, template `owner_deal_registration`, to `superAdminEmail()`), and the registration appears on the admin deal-registrations page with status SUBMITTED. There is no partner-facing acknowledgement email on submit (see A5).

- What the admin actually sees at decision time. The admin review card is built from the `AdminDeal` type on the deal-registrations page. It carries exactly: `legalEntity`, `country`, `businessUnit`, `offering`, `productLine`, `estSeats`, `justification`, `widerScopeRequested`, `submittedAt`, the partner name and tier, and the message thread. Crucially, it does NOT include `domain`, does NOT include `estValueCents` (the sale value), does NOT include `functionsIntended`, and does NOT include `contactName` or `contactTitle`. The admin then confirms with a scope string, or declines with a reason, or requests a revision.

- Honest judgment: this is not sufficient. The admin decides the registration without seeing the two facts that determine Strong versus Qualified (the domain and the sale value), without seeing which functions the partner is claiming, and without any per-function evidence. Worse, the registration decision (confirm scope and priority) is decoupled from the pay classification (derived automatically later at commission-line time). The admin never explicitly decides or even sees the classification at review, and cannot, because the domain and value are not on the screen. So the current decision step protects priority on an account, but it does not decide or defend the classification, and it gives the admin too little to catch a wrong or abusive claim.

## A3. The multi-domain and already-ours anti-abuse gap

There are only two cross-checks today, both in `confirmDealRegistration`, and both are exact name matches:

- House account check: `houseAccount.findFirst({ where: { entityName: { equals: reg.legalEntity, mode: "insensitive" } } })`. It blocks only when the entered legal entity name exactly matches (case-insensitive) a House Account name. It never looks at the domain.
- Duplicate or priority check: `registeredAccount.findFirst({ where: { legalEntity insensitive, country insensitive, lapsedAt: null, partnerId: not self } })`. It blocks only when the exact legal entity name plus country matches a confirmed account held by another partner. It never looks at the domain, and it is exact (case-insensitive) only, not fuzzy.
- Newness itself is computed in `companyNewnessState` from closed deals matched by exact normalized domain only. It never cross-checks the entity name.

Exposure is high, and in two distinct ways:

1. A company we already work with under a different domain. Because newness is keyed only on the exact normalized domain, a partner can enter a domain we have never seen for a company we already serve under another domain (a country domain, a brand domain, a subsidiary domain, a fresh domain), and the deal will read as New or Dormant and earn the Strong rate, even though the company is genuinely Existing to us. Nothing links the new domain back to the known company.

2. A company already ours under a slightly different name or domain. The house-account and duplicate protections are both exact name matches, so a small variation in the legal entity name ("Acme Inc" versus "Acme, Inc." versus "Acme Incorporated") slips past both. Combined with a fresh domain, a partner can register a company that is really a house account or another partner's account, and it will neither be blocked nor read as Existing.

There is no normalized-name matching, no fuzzy near-match warning, no domain-to-entity cross-reference, and no admin-facing "possible match" panel. The domain is taken at face value.

## A4. B2C coherence, function by function

The functions and the domain-newness rule were designed for B2B organizations. For a single individual enrolling (the B2C Charter), here is how each holds up, from the code:

- Does an individual have a domain? The `domain` field is optional, and an individual enrolling in their own name normally has no company domain. In `classifyOrigination`, when `hasDomain` is false the result is always `QUALIFIED_ORIGINATION` at the qualified rate, never Strong. So for a typical B2C individual, the origination is always Qualified.
- Does New/Dormant/Existing apply to B2C? Not meaningfully. The whole newness rule keys on a company domain, and a person is not a domain. With no domain, the newness state is never even consulted for pricing; the classifier short-circuits to Qualified.
- What does Strong origination mean for one person? In practice, nothing. Without a domain there is no path to Strong, and a single individual is not a "genuinely new or dormant company." Strong is a B2B concept.
- Is the 5,000 dollar B2C high-value threshold sensible? Since a domain-less B2C origination is always Qualified, the B2C threshold almost never fires. It would only matter in the unusual case where a B2C deal carries a domain. As written it is close to inert for real B2C.
- Does the Renewal Override correctly exclude B2C? Only in the terms, not in the engine. The terms say the override is "on a B2B account," but the `OVERRIDE` branch in `addCommissionLine` does not check `dealType == "B2B"`. It gates on there being a registered account and an origination opener. In practice B2C individual deals usually have no registered account, so no override arises, but the B2B-only rule is not actually enforced in code. That is a terms-versus-engine coherence gap.
- Does a Basic Introduction of an individual make sense? Yes. Introducing a specific person you have a real relationship with, who then enrolls, is coherent for B2C.

Verdict: the domain-newness and Strong machinery is a B2B concept loosely applied to B2C. For B2C the coherent functions are Basic Introduction, Qualified Origination (read as "you sourced this individual"), Closing, and Delivery. Strong Origination and the Renewal Override are effectively B2B-only, and the Override B2B-only rule is not enforced in the engine.

## A5. Email notifications inventory

Owner notifications all go to `superAdminEmail()` via `notifyOwner`. They fire on: partner activation ready (`owner_partner_activation_ready`), a new deal registration (`owner_deal_registration`), a TenXOps request (`owner_tenxops_request`), a deal message (`owner_deal_message`), a deal resubmission (`owner_deal_resubmitted`), and a special deal request (`owner_special_deal_request`).

Partner-facing emails that exist: application received, application decision (approved or rejected), deal confirmed (`partnerDealConfirmedEmail`, sent from `confirmDealRegistration`), deal revision requested, a deal message reply, and a special deal decision.

The gaps, all confirmed from the code:

- On submit, the partner gets no acknowledgement email. `submitDealRegistration` notifies the owner but sends the partner nothing, so a partner does not receive a "we received your registration, decision within X business days" message.
- On decline, the partner gets no email. `declineDealRegistration` updates the status and records an audit entry but does not send the partner anything. A declined partner learns only by checking the panel.
- On a closed deal, no email fires. `recordClosedDeal` sends zero emails.
- On commission paid, no email fires. `setCommissionStatus` (which marks a line PAID) sends zero emails.
- The owner is not notified on a closed deal or on a commission event.

So the partner is kept informed at confirmation and revision, but is silent at submission, decline, close, and payment. The owner is well notified at submission but not at close or payment.

---

# PART B. Proposed design

The goal is that every function a partner claims is justified with proof appropriate to that function, enforced in the flow, and taught consistently, while keeping registration light enough for a real deal. The spine of the proposal is to move the claim and its evidence to registration, give the admin everything needed to decide and to defend the classification, close the domain and identity gaps, make B2C coherent, add the missing notifications, and keep the terms and the Academy in step. Everything additive, every number config-sourced, no dashes, exam integrity preserved.

## B1. Evidence and justification per function

Principle: at registration the partner declares which functions they intend and gives the proof each one needs to be believable and confirmable; at closing, the confirming evidence is required before the money gate opens. Store it as structured data, not one paragraph, so the admin sees it cleanly and it is defensible later.

Proposed structure. Replace the coarse `functionsIntended` string list with a set of per-function claims captured at registration. The lightest additive way is a small related model, one row per claimed function (a `DealFunctionClaim`: registration id, function, plus the function-specific fields and attestation flags and evidence text or reference), or equivalently a set of typed JSON fields on `DealRegistration`. The admin review then renders each claim with its evidence.

Per function, what to require:

- Basic Introduction. At registration: the warm contact identified (name and role), an explicit warm-relationship attestation (a required checkbox), and a short description of the pre-existing relationship (who they are to you, how you know them). This moves the attestation that today lives on the commission line up to the claim, where it belongs. At closing: a link that this same introduced contact became the closed, paid deal. Pays only under the usual money gates and confers no account ownership.
- Qualified Origination. At registration: the company domain, the specific new department, branch, or unit being opened, and a one-line note of the existing relationship or route in. At closing: nothing extra beyond the standard signed and cleared gates.
- Strong Origination. At registration: the company domain (required for a Strong claim), the estimated sale value (so the threshold can be assessed), and a short justification that the company is genuinely new or dormant to us (the partner asserts it and gives their basis). At closing: the actual signed value confirms the threshold. The final Strong-versus-Qualified decision remains objective by default but is now visible and confirmable at review (see B2).
- Closing. At registration: intent and the target agreement. At closing: the signed-agreement reference or date, which the engine already requires before a Closing line can be created.
- Delivery. At registration: intent and the delivery scope. At closing: the engagement reference and a delivered-date and deliverable reference, which the engine already requires before a Delivery line can be created.

How the admin sees it. The review screen renders each claimed function as its own block with its evidence inline, so the admin reads the intro relationship, the newness justification, the value, and the domain in one place. Proportionality: this is a domain, a value, a short per-function justification, and the intro attestation. It is enough to decide and to defend, and not so heavy that a real deal cannot be registered in a few minutes. The single free-text "case for this account" can remain as an overall note, but it is no longer the only justification.

## B2. The multi-domain and already-ours defenses

Layer three defenses, from hard block to soft flag to confirmable default:

1. Widen the exact blocks to normalized identity. Extend the house-account and duplicate checks to match on a normalized legal-entity name (lowercased, punctuation and common suffixes like "inc", "ltd", "gmbh" folded) in addition to the exact name, and add a domain match to both (a claimed domain that equals a House Account domain, or a confirmed account's domain, is a hard block just like the name match). This closes the "slightly different name or domain" bypass.

2. A near-match warning at review. At the point of decision, show the admin a "possible match" panel: any existing RegisteredAccount, ClosedDeal, or HouseAccount whose normalized name is similar to, or whose domain is similar to, the claimed entity or domain. This is a soft flag, not a block, so the admin can see "we may already work with this company under a different name or domain" and judge.

3. Make the classification a confirmable Panel decision, objective by default. Keep the objective New/Dormant/Existing derivation as the default, but surface it at review with the near-match evidence, and let the admin confirm it or downgrade it with a recorded reason (for example, "same company as an existing account under a different domain, treat as Existing and pay Qualified"). Store the admin decision and reason in the audit trail. This preserves the dispute-proof objective rule as the norm while giving a human the ability to catch the abuse case, and it makes the final classification defensible as the company's decision on the Panel.

Enforced automatically versus flagged: exact or normalized name or domain match to a House Account or another partner's live account remains a hard block. Fuzzy near-matches are flagged to the admin. The objective newness stays the automatic default classification, which the admin may override only with a logged reason.

## B3. The B2C model

State plainly that the domain-newness and Strong machinery is B2B, and define B2C at the person level:

- B2C origination is a person-level claim, not a domain claim. For B2C, replace the domain-newness test with the individual identity (the person being enrolled). B2C origination is Qualified by definition (you sourced this individual); there is no Strong tier for a single person. This matches the engine's current effective behavior (no domain means Qualified), but we make it explicit rather than accidental.
- Strong Origination is B2B-only. Say so in the terms and the Academy, and make the engine treat a B2C deal as never Strong regardless of any stray domain, so the rule is enforced, not just described.
- The Renewal Override is B2B-only, and we enforce it in the engine. Add the `dealType == "B2B"` guard to the OVERRIDE branch so the terms and the engine agree.
- The B2C high-value threshold. Since Strong does not apply to B2C, the B2C threshold is inert. Recommendation: keep the config key (additive, nothing dropped) but mark it not-used-for-B2C in the admin config and remove any B2C threshold language from the partner-facing surfaces, so no one is taught a number that never fires. If you would rather keep a B2C high-value concept for some future case, we can define it at the person or cohort level instead, but that is a product decision for you.
- Basic Introduction, Qualified Origination, Closing, and Delivery all remain coherent for B2C with the person-level reading.

Net: for B2C the live functions are Basic Introduction, Qualified Origination (person-sourced), Closing, and Delivery. Strong Origination and the Renewal Override are B2B-only and enforced as such.

## B4. The 48-hour, or configured, decision

- Capture enough to decide. With B1 in place, registration now carries the domain, the estimated value, the intended functions, and the per-function evidence, which is exactly what a real decision needs.
- The admin review screen should show, in one view: the partner and tier; the entity and its normalized-name near-match warnings; the domain and the live newness result (New, Dormant, or Existing) with any domain or name matches to existing accounts; the intended functions each with their evidence; the estimated value against the configured threshold so the likely Strong-versus-Qualified outcome is visible; and the overall case. The confirm action records the scope, the priority protection, and the confirmed (or overridden) classification with a reason.
- State the SLA to the partner. Pick one decision window in config (the existing `dealConfirmationWindowBusinessDays`, or a new explicit value if you want a tighter 48-hour promise) and state it, config-sourced, in three places: on the registration form ("we aim to confirm within X business days"), in the new submission acknowledgement email, and in the terms and the Academy. Today it is stated only in the terms; this makes the promise visible where the partner acts.

## B5. Notifications

Propose the full clean set, all config-sourced numbers, encouraging tone, no dashes:

- To the partner: on submit, an acknowledgement ("received, pending review, decision within X business days"); on confirm (exists today); on decline (new, with the reason and next steps); on revision requested (exists today); on a deal closed and recorded (new); on a commission marked paid (new, "you have been paid for X").
- To the owner: on submit (exists today); on a deal closed (new, optional but useful); on a large commission or on any admin override of a classification (new, so a Strong override is never silent).

This closes the four partner-facing silences (submit, decline, closed, paid) and adds an owner signal at close and on classification overrides.

## B6. Consistency: what changes in the flow, the terms, and the Academy

For each proposal, the three surfaces move together:

- Per-function evidence (B1). Flow: new per-function claim fields on the registration form and schema and model, and the admin review renders them; the Basic Introduction attestation moves from the commission line up to the claim (the line still stores it, sourced from the claim). Terms: expand the "How commission is earned" clauses to state the evidence each function requires at registration and at closing. Academy: update Module 3 (Rules) to teach the evidence each function needs, and Module 2 (Identity) to describe claiming a function with its proof; add or adjust exercises and exam questions about the evidence, keeping each module's question count unchanged, one correct answer each, answerable from the taught text, and testing the rule not a number.
- Domain and already-ours defenses (B2). Flow: widen the house-account and duplicate checks, add the near-match panel and the confirmable classification with a logged reason. Terms: state that the company confirms the classification on the Panel and that a company already known to us under any name or domain is treated as Existing. Academy: teach that the classification is confirmed on the Panel and that trying to re-register a known company under a new domain does not earn Strong, framed as protecting honest partners.
- B2C model (B3). Flow: enforce Strong and Override as B2B-only in the engine, define B2C origination at the person level. Terms: state clearly that Strong Origination and the Renewal Override are B2B-only and that B2C origination is Qualified. Academy: in Module 13 (Motions) and Module 3 (Rules), make the B2C-versus-B2B pay picture explicit and remove any implication that Strong or the Override applies to an individual.
- Decision and SLA (B4). Flow: the richer review screen and the confirmed classification. Terms and Academy and form: state the decision window, config-sourced, wherever the partner acts.
- Notifications (B5). Flow: add the missing sends. Terms and Academy: mention that the partner is kept informed at each step, so the promise is on record.

Standing rules honored throughout: everything additive (no column, config key, or enum value dropped), no dashes anywhere, every number config-sourced, and exam integrity preserved (unchanged question counts, exactly one correct answer, answerable from the taught text, no mutable number as an answer).

---

# Stop. Awaiting your approval.

This is the end of Phase 1. Nothing has been built, edited, committed, or deployed. When you approve the design (in whole or with changes), Phase 2 will build it in additive, reviewed steps, run the deterministic gates and the refute-first adversarial review, update the flow and the terms and the Academy consistently, then commit, build, hash-check, migrate, seed, run health checks, push, run a post-deploy audit against the live state, and deliver a final report, following the same safe order as the commission redesign. Until you approve, no Phase 2 work will begin.

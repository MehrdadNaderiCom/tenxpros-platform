# Report 1: Everything about partner pay, exactly as it is live

This is the definitive account of how money and commission work between us and partners, as it is live in production right now. It draws from the three places these rules appear to a partner: the legal terms, the Partner Academy, and the public site. For each surface it walks through every commission rule that surface states, in full, so you can see exactly what a partner reads in each place. It then confirms the three surfaces agree with each other and with the engine that actually computes pay.

Every figure below is read from one configuration source of truth; nothing is hand typed. The figures shown are the current configured values, so you can see the shape of each rule. The rule is what matters; the number can change in config without touching code or content.

The current configured figures, for reference throughout:

- Basic Introduction: 5 percent on B2C and B2B.
- Qualified Origination: 10 percent B2C, 8 percent B2B.
- Strong Origination: 15 percent B2C, 12 percent B2B.
- High value thresholds: strictly above 5,000 dollars on B2C, strictly above 15,000 dollars on B2B.
- Closing: 5 percent B2C, 10 percent B2B.
- Delivery: a single rate of 8 percent.
- Renewal Override: 50 percent of the rate the account was opened at.
- Cap per deal: 25 percent B2C, 30 percent B2B, and up to 35 percent on a Tier 3 focus account.
- Growth Bonus: 1 percent, for three or more distinct new B2B organizations by domain in a rolling 12 month window, Tier 2 and Tier 3 only.
- Origination window: 12 months.

---

## Part A. The legal terms (the binding source)

The terms render directly from code and are shown to partners on the public terms page and in the terms dialog. Here is every commission rule they state.

Opening principle. "Commission is earned by function, calculated on Net Receipts actually received and cleared. You earn for the functions you actually perform on a Closed Deal. The Seat (one enrolled professional) is the unit of sale. You never set your own rate or grade your own origination: the company derives every classification objectively from the recorded facts of the deal, so nothing on your statement is a matter of opinion."

Newness, by domain. "A company's newness is decided by its domain, objectively. New means the domain has never appeared on a closed deal with us. Dormant means it has, but its most recent activity is more than 12 months ago. Existing means there has been activity within the last 12 months. A high-value sale is one strictly above 5,000 dollars on B2C, or 15,000 dollars on B2B."

The functions, in full:

- Basic Introduction, 5 percent on B2C and B2B. "It requires a genuine, pre-existing warm relationship, which you attest to with a note naming the person and the relationship, and it pays only when that introduced contact becomes a closed, paid deal. It confers no account ownership or protection."
- Qualified Origination, 10 percent B2C, 8 percent B2B. "This is a new department, branch or unit of a company we already know (an Existing domain)."
- Strong Origination, 15 percent B2C, 12 percent B2B. "Two things must both be true: the company's domain is genuinely New or Dormant, and the sale amount is strictly above the high-value threshold for its type. If the domain is New or Dormant but the sale is at or below that threshold, the deal keeps its new-company classification but is paid the Qualified rate. A deal with no recorded domain cannot claim the Strong rate."
- Closing, 5 percent B2C, 10 percent B2B, "payable only once the deal carries a recorded signed-agreement date."
- Delivery or Coaching, 8 percent of Net Receipts, "a single rate the company sets. Delivery is normally performed by the company; this line is paid only when the company engages a partner to help it scale, and only once the deal carries a recorded delivered date. A fixed fee is possible only as a company exception, recorded with a reason."
- Cap per deal. "Total partner compensation, across every function and every partner on the deal, is 25 percent of Net Receipts on B2C and 30 percent on B2B, with a Tier 3 focus account able to rise gradually to 35 percent. When functions stack above the cap, the percentage lines scale down in proportion to fit it exactly."

The Renewal Override. "On a B2B account, a same-scope renewal within the first 12 months also pays an Origination Override of 50 percent of the rate the account was opened at. The override is credited to the account's opener, the partner who originated it, not to whoever records the renewal, and only while that opener still holds Active Status by actively supporting the account. After 12 months, or if the opener goes inactive, the override ends. It is one line on the renewal and sits inside that renewal's single cap."

Multi partner deals. "Where several partners contribute to one deal, each line is credited to the partner who actually performed it, so an introducer, an originator, a closer and a delivery partner can each be paid on the same deal. A single genuinely shared contribution may be split between partners by a company-set weight, recorded with a reason. However the credit is divided, the deal total can never exceed the cap."

Payment. Commission becomes payable once both the offering has been delivered and the matching customer payment has been received and cleared; the company then pays within the configured business days of the later of those two, in USD, on cleared receipts. Other currency conversions use the rate on the cleared date. Partners bear their own taxes and receiving side bank fees, and may query a statement within thirty days.

Clawback. If any part of an engagement is refunded, charged back, cancelled, credited or reversed, no commission is owed on that amount, and any commission already paid is reversed or set off. A refunded or cancelled seat does not count toward any target or bonus.

Growth Bonus (in the tier ladder section). "A growth bonus of 1 percent applies to Tier 2 and Tier 3 partners who close and collect three or more distinct, genuinely new B2B organisations within a rolling 12-month period, counted by domain, so two deals on the same company count once. A deal with no recorded domain never counts. The bonus applies within the overall cap."

---

## Part B. The Partner Academy (how it is taught)

The academy teaches the same rules in plainer language, principally in Module 2 (Identity) and Module 3 (Rules). This content is live in the database, reseeded at deploy. Here is what it teaches about pay.

Module 2, Identity, defines the functions objectively. Basic introduction is introducing a relevant contact you already have a genuine warm relationship with. Qualified origination is opening a new department, branch, or unit of a company we already know. Strong origination is opening a company that is genuinely new or dormant to us on a high value sale, which the company derives objectively from the recorded facts "rather than something you grade yourself or that anyone decides by opinion on the Panel." Closing is carrying the opportunity to a signed, binding agreement. Delivery or coaching is the company's own norm, paid a single set rate when the company engages a partner to scale.

Module 3, Rules, states the rates and the objective rule in full:

- The rates list matches the terms exactly: Basic Introduction 5 percent with the warm relationship attestation; Qualified Origination 10 percent B2C and 8 percent B2B as a new unit of a company we already know; Strong Origination 15 percent B2C and 12 percent B2B; Closing 5 percent B2C and 10 percent B2B paid once the deal carries a recorded signed date; Delivery 8 percent, a single rate, paid only when the company engages a partner and once a delivered date is recorded, with a fixed fee only as a company exception with a reason.
- The objective rule, "Qualified or strong, and who decides": the company derives it objectively from the recorded facts, not opinion. New, Dormant and Existing are defined against the 12 month window. Opening a new unit of an Existing company is a Qualified Origination. The higher Strong rate needs two things both true: the domain is genuinely New or Dormant, and the sale is strictly above the high value threshold (5,000 dollars B2C, 15,000 dollars B2B). Then the sentence that prevents surprise: "if the company is New or Dormant but the sale is at or below that threshold, the deal keeps its new-company standing but is paid the Qualified rate, not the Strong rate." And the no domain rule: "a deal with no recorded domain cannot claim the Strong rate at all."
- The cap, with two worked examples that stack functions and clamp to the cap, and the rule that percentage lines scale down in proportion to fit; and that only the Tier 3 focus bonus can lift the ceiling to 35 percent.
- The origination override on renewals: credited to the account's opener, the partner who originated it, "not to whoever happens to record the renewal," and only while the opener still holds Active Status.
- Multi partner deals: each line credited to the partner who actually performed it; a genuinely shared contribution may be split by a set weight with a recorded reason; "however the credit is divided among partners, the deal total is still clamped to the same cap."
- The Growth Bonus (in the module glossary): counted by distinct new B2B organizations by company domain, two deals on the same company counting once, a deal with no recorded domain never counting.

The academy also keeps the payment and clawback framing (paid only on delivered and cleared money, clawback on refunds) and the focus bonus mechanics, which were correct before and remain correct.

---

## Part C. The public site (what a prospect reads)

The public partners page describes the functions and shows the rate table. Here is what it states.

Function descriptions:

- Basic Introduction: "Introduce a relevant contact you already have a genuine, warm relationship with. You earn when that introduction becomes a paid deal."
- Origination: "Open a real account. Qualified when it is a new unit of a company we already know; the higher Strong rate when the company is genuinely new or dormant and the sale is high-value. The company decides which from the facts, not opinion."
- Closing: "Carry the sale through to a signed, binding agreement."
- Delivery and Coaching: "Delivery is normally the company's own. When the company engages a partner to help it scale, this pays a single set rate."
- Renewal Override: "Open a B2B account and keep supporting it, and a renewal within the window pays you a share of the rate you opened it at, on top of that renewal's own commission."

The rate table shows, per function, the B2C and B2B rate: Basic Introduction 5 percent and 5 percent; Qualified Origination 10 percent and 8 percent; Strong Origination 15 percent and 12 percent; Closing 5 percent and 10 percent; Delivery or Coaching 8 percent and 8 percent; Renewal Override 50 percent of the opener rate; and the Cap per deal 25 percent B2C and 30 percent B2B.

Below the table, in the main content, the page states the cap plainly: total partner compensation on any one deal is capped at 25 percent B2C and 30 percent B2B, across every function and every partner, with the one exception of a Tier 3 focus account rising gradually to 35 percent, and that lines scale down in proportion above the cap. A closing note states the Strong rule: the higher Strong rate applies only when the company is genuinely new or dormant and the sale is above the high value threshold (over 5,000 dollars B2C, over 15,000 dollars B2B); a new company deal at or below that threshold keeps its new company standing but is paid the Qualified rate; and the Renewal Override is a share of the rate the account was opened at, credited to the partner who opened it while they keep supporting it.

---

## Part D. Do the three surfaces agree with each other and with the engine?

Yes. Checked point by point, the legal terms, the academy, the public page, and the engine that computes pay all state the same rules. There is no contradiction.

- The five functions and their rates: identical across all three surfaces, and every rate is read from the same config the engine uses.
- Basic Introduction requires a warm relationship attestation: stated in the terms and the academy; the engine refuses a Basic Introduction line without the stored attestation flag; the public page describes it as a warm relationship you already have.
- Qualified versus Strong, derived objectively: all three surfaces state that the company derives it from domain newness plus the sale amount, never by opinion or on the Panel. The engine derives exactly this: Qualified for a new unit of an Existing company; Strong only for a New or Dormant domain with a sale strictly above the threshold; the at or below threshold fallback to the Qualified rate keeping the new company classification; and no Strong without a domain.
- The high value thresholds: the same values on all three surfaces, rendered as currency from config, and the engine compares the sale strictly against those same config values.
- Closing on a signed date and Delivery on a delivered date at a single rate: stated in the terms and the academy; the engine refuses Closing without a signed date and Delivery without a delivered date, and pays Delivery at the single configured rate with a fixed fee only as a superadmin exception. The public page describes Closing to signature and Delivery as the single set rate. The retired five to eight percent band appears nowhere.
- The Renewal Override credited to the opener: the terms and the academy both state it is credited to the account opener and gated on the opener's Active Status; the engine credits the override line to the opener partner and checks Active Status against the opener, refusing when there is no opener. The public page describes it as credited to the partner who opened the account.
- Multi partner crediting and the weighted split: the terms and the academy both state each line is credited to its performer and that a shared function may be split by a superadmin set weight with a recorded reason, always inside the cap; the engine credits each line to its own partner, supports the superadmin weighted split, and clamps every scenario to the cap with the split conserved.
- The airtight cap: all three surfaces state the 25, 30, and 35 percent figures and that lines scale to fit; the engine clamps total compensation across every function and every partner to the cap under any weighting and any settlement order.
- The Growth Bonus by domain: the terms and the academy both state it is counted by distinct new B2B organizations by domain with a no domain deal never counting; the engine counts distinct normalized domains with a non reversed new company origination, collected in the rolling window, excluding deals with no domain.

The seat unlock, the Panel classification of strong, and the delivery band appear on none of the three surfaces and in no engine path on the live pay route. The live database and the live pages were scanned and contain zero superseded rules.

---

## Part E. The complete model, in one paragraph

A partner is paid, on cleared money, for the functions they actually perform on a closed deal, up to a hard cap. What they earn on an origination is decided by three recorded facts, never by anyone's judgment: the company's domain, whether that domain is new or dormant or already known to us, and the size of the sale against a high value threshold. A brand new or long dormant company on a large sale earns the Strong rate; a new unit of a company we already know, or a new company on a smaller sale, earns the Qualified rate; and without a recorded domain, the Strong rate and the growth credit are simply not available. Introductions require a real prior relationship, closing requires a signed date, delivery pays one set rate only when the company brings a partner in to scale, and a renewal rewards the partner who originally opened the account for as long as they keep supporting it. Several partners can be paid on one deal, each for their own part, and a genuinely shared part can be split by weight, but no arrangement of partners or weights can ever pay out more than the cap. It is a system a partner can predict exactly, because it is built from facts they can see, and it is the same story in the contract they sign, the academy they study, and the public page that recruited them.


---

**Dated addendum (2026-07-03):** this report is a snapshot of the surfaces as they were live on its date. The owner has since approved raising the B2C per-deal cap from 25 percent to 28 percent (see docs/phase1-b2c-cap-raise-plan.md); the figures above reflect the pre-change state and are kept as the historical record.

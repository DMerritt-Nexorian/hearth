# Hearth

Household Economic Recovery Engine.

Hearth turns a household ledger into a short list of things worth doing, shows the math, and refuses to call an estimate a saving. The file stays in the browser. Nothing here connects to a bank, files an application, moves money, or sells a loan.

## What you can do

- Enter take-home pay and the bills that actually leave.
- Read a ranked plan. A cash shortfall stays first. Ranges are not added together.
- See which assistance programs are worth a phone call, which are unlikely on income alone, and which are closed. The Affordable Connectivity Program is listed as closed on purpose.
- Compare debt payoff as minimums, avalanche, and snowball. The model is not a lender.
- Record a change only after a later statement confirms it. That is the only number treated as verified.
- Download `hearth-case.json` or a single `hearth-brief.html` from the File tab. Either file opens without an account. Import asks before it replaces the file already in the browser, and the chosen extra debt payment travels with the file.
- Switch the month between a month and a year. Verified savings stay a yearly number either way.
- See how many plan items are still open, which follow-ups are due, and which are inside 21 days.
- See when the ledger is missing housing, energy, groceries, or a phone or internet bill, and where the month goes.
- Add common bills from a starter, get warned about a duplicate name, search the ledger, and mark a bill reviewed today.
- Filter the plan, and copy the steps for one item.
- Choose an extra debt payment. If it is larger than what is left after the bills, the model uses only that leftover. It does not invent the difference.

## What this is not

Not a chatbot. Not a benefits determination. Not tax software. Not medical, legal, or housing advice. Alaska and Hawaii are not failed against the 48-state poverty table. Knowledge in the engine is dated 2026-11-18 and will go stale. Confirm every program on the official page before you act.

## Run it

```sh
npm install
npm run dev
```

Open the site the dev server prints. Load the fictional Hale household if you want to see the method before you type your own numbers.

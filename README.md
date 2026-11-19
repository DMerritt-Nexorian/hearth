# Hearth

Household Economic Recovery Engine.

Hearth turns a household ledger into a short list of things worth doing, shows the math, and refuses to call an estimate a saving. The file stays in the browser. Nothing here connects to a bank, files an application, moves money, or sells a loan.

## What you can do

- Enter take-home pay and the bills that actually leave.
- Read a ranked plan. A cash shortfall stays first. Ranges are not added together.
- See which assistance programs are worth a phone call, which are unlikely on income alone, and which are closed. The Affordable Connectivity Program is listed as closed on purpose.
- Compare debt payoff as minimums, avalanche, and snowball. The model is not a lender.
- Record a change only after a later statement confirms it. That is the only number treated as verified.
- Download `hearth-case.json` or a single `hearth-brief.html` from the File tab. Either file opens without an account.

## What this is not

Not a chatbot. Not a benefits determination. Not tax software. Not medical, legal, or housing advice. Alaska and Hawaii are not failed against the 48-state poverty table. Knowledge in the engine is dated 2026-11-18 and will go stale. Confirm every program on the official page before you act.

## Run it

```sh
npm install
npm run dev
```

Open the site the dev server prints. Load the fictional Hale household if you want to see the method before you type your own numbers.

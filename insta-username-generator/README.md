# Insta Username Generator

Generates random usernames that follow Instagram's rules, and opens them on Instagram.

## Run it

**Easiest:** install Node.js from https://nodejs.org, then double-click
`Start (Windows).bat` or `Start (Mac).command`. It opens the app in your browser.
Keep that window open while you use the app. Close it to stop.

On a Mac, the first time, right-click the file → Open → Open, because it isn't from the App Store.

**From a terminal:**

```bash
cd insta-username-generator
npm start          # http://localhost:3000  (PORT=xxxx to change)
npm test
```

You need Node 18 or later. There are no dependencies to install.

## Features

- **Length**: set the min and max length with sliders (1–30).
- **Characters**: turn letters, numbers, underscores and periods on or off. The style
  can be *fully random* or *readable* (syllables such as `lomaketi42`). You can also
  set a "starts with" prefix and how many names to generate.
- **Rules enforced**: 1–30 chars, only `a-z 0-9 . _`, no period at the start or end,
  no `..`, not all numbers (`public/generator.js`).
- **Hide taken names** (on by default): after you click Generate, the app checks each name on
  Instagram and removes the ones that already have an account. The rest are marked "No account".
- **Check** shows whether an account exists without leaving the page.
- **Go to Insta** opens `/go/<username>`, where the server looks up the account:
  - the account exists → redirects to `https://www.instagram.com/<username>/`
  - no account → redirects to the error page (`not-found.html`)
  - Instagram rate-limited the lookup → goes to `unverified.html`, with *Try again*
    and *Open anyway* buttons

## Bulk hunt (finding free short names)

The **Bulk hunt** section generates names of an exact length (4 by default) with the
character settings above. It checks them one at a time, a few seconds apart:

- Names with no account are saved to a list. The list stays in your browser when you
  reload. You can copy it, remove names, or open any name on Instagram.
- It shows counts for checked, taken, no account, and couldn't verify.
- If Instagram rate-limits a lookup, the hunt waits (30s, then 60s, 120s, up to 5 min)
  and retries the same name. It never counts a name as free unless Instagram answered.

Almost every letters-only 4-character name is taken. Turn on numbers and underscores to
have a real chance. Also, "no account" doesn't guarantee you can register the name,
because banned and reserved names look the same. Confirm on Instagram's "change
username" screen.

## Why there's a server

Browsers can't call Instagram directly because of CORS. `server.js` calls Instagram's
public web profile endpoint (`404` = no account, `200` with a user = exists) and caches
each result for 10 minutes. Instagram rate-limits this endpoint heavily from cloud or
datacenter IPs. It works much better when you run it on your own computer or network.

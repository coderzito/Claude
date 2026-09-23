# Insta Username Generator

Generates random usernames that follow Instagram's rules, and opens them on Instagram.

## Run it

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
- **Check** shows whether an account exists without leaving the page.
- **Go to Insta** opens `/go/<username>`, where the server looks up the account:
  - the account exists → redirects to `https://www.instagram.com/<username>/`
  - no account → redirects to the error page (`not-found.html`)
  - Instagram rate-limited the lookup → goes to `unverified.html`, with *Try again*
    and *Open anyway* buttons

## Why there's a server

Browsers can't call Instagram directly because of CORS. `server.js` calls Instagram's
public web profile endpoint (`404` = no account, `200` with a user = exists) and caches
each result for 10 minutes. Instagram rate-limits this endpoint heavily from cloud or
datacenter IPs. It works much better when you run it on your own computer or network.

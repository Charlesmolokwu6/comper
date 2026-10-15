# Deploying Compare

The app is one Node server (Express API and the built React site). The root `Dockerfile` runs it on
any container host. It listens on `$PORT`, which defaults to 7860.

## Hugging Face Spaces (free, set up)

`.github/workflows/deploy-hf-space.yml` pushes the code to a Docker Space on every push to `main`
(and to the current feature branch). Hugging Face builds the `Dockerfile` and serves the app at
`https://<user>-<space>.hf.space`.

One-time setup:

1. **Create a token.** On huggingface.co, go to Settings → Access Tokens → Create new token, choose
   type **Write**, and copy it.
2. **Add it to GitHub.** On GitHub, go to repo → Settings → Secrets and variables → Actions → New
   repository secret, with name `HF_TOKEN` and the token as the value.
3. **Choose the Space name (optional).** On the **Variables** tab, add `HF_SPACE`, for example
   `Chiagozie/compare`. That value is also the default.
4. **Deploy.** Go to Actions → "Deploy to Hugging Face Space" → Run workflow (or push a commit). The
   first run creates the Space. The build takes about 3 minutes; then open
   `https://chiagozie-compare.hf.space`.

Free Spaces have 2 vCPU and 16 GB of RAM. They sleep after 48 hours without visitors, and the next
visit wakes them in under a minute. While a Space is asleep, the 6-hourly price refresh doesn't run.
The first searches after waking fetch fresh prices live, and the committed route snapshot means the
city pickers work immediately.

Settings such as `FARE_TTL_HOURS` and `SCRAPE_CITY_PAIRS` (see `server/fares/*.ts`) go under the
Space's Settings → Variables and secrets.

## Other hosts

Any host that builds a Dockerfile from GitHub works with no code changes:

- **Koyeb (free):** Create Web Service → GitHub → this repo → Builder: Dockerfile. Koyeb sets
  `PORT` itself.
- **Railway, Fly.io, Render:** point them at the `Dockerfile`.

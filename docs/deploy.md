# Deploying Compare

The app is one Node server (Express API and the built React site). The root `Dockerfile` runs it on
any container host. It listens on `$PORT`, which Render sets for you.

## Render (free plan)

`render.yaml` describes the service, so Render can set everything up from the repo:

1. Go to dashboard.render.com → **New** → **Blueprint**.
2. Connect GitHub if asked, and pick the `comper` repo.
3. Render reads `render.yaml` and shows one web service, **compare**, on the **Free** plan. Click
   **Apply**.
4. The first build takes about 5 minutes. The app is then at `https://compare-xxxx.onrender.com`;
   the exact address is shown in the dashboard.

Every push to the branch named in `render.yaml` redeploys automatically. When the work is merged,
change `branch:` to `main`.

### Free-plan behaviour (render.com/docs/free)

- **Sleeping:** the service spins down after 15 minutes without visitors. The next visit wakes it in
  about a minute. While it sleeps, the 6-hourly price refresh doesn't run; searches still fetch live
  prices as soon as it's awake.
- **Hours:** each workspace gets 750 free instance hours a month, which is enough for one
  always-on service. A second free service in the same workspace can run the hours out, which
  suspends every free service until the 1st of the next month.
- **Storage:** local files (the fare cache) are lost on each spin-down. The committed route
  snapshot means the city pickers still work immediately.
- **Database:** the app needs none. (Render's free Postgres is the thing that expires after 30
  days.)

## Other hosts

Any host that builds a Dockerfile from GitHub works without code changes (Railway, Fly.io, a VPS).
Hugging Face Spaces and Koyeb no longer offer free Docker hosting to new accounts.

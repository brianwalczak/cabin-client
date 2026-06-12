<h1 align="center">cabin-client</h1>

<p align="center">A background desktop daemon that tracks and reports my live activity status to <a href="https://brian.re/">brian.re</a>!<br /></p>

### Built with...

- Electron (for cross-platform desktop app)
- Upstash Redis (status storage)
- `get-windows` (to detect what application I'm using)
- Tailwind CSS (for UI styling)

... and written in JavaScript (`eslint` for linting)!

> The status displayed on [brian.re](https://brian.re/) is powered by this very software, which runs silently in the background on my devices and pushes updates every 30 seconds!

### Setup

To start, clone the repository and install the necessary dependencies:

```bash
git clone https://github.com/brianwalczak/cabin-client
cd cabin-client
npm install
```

Then, start the app in development mode:

```bash
npm run dev
```

On first launch, an onboarding screen will guide you through connecting the **Upstash Redis** instance and choosing a **Device ID** + **Priority**.

> [!WARNING]
> You'll need an [Upstash](https://upstash.com/) Redis database (also available on Vercel). Grab your REST API URL and read/write token from the Upstash console and enter them during onboarding.

### Configuration

| Field         | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| **Device ID** | A unique name for the machine (e.g. `desktop`, `laptop`).               |
| **Priority**  | Lower values are displayed first when multiple devices report a status. |
| **API URL**   | Your Upstash Redis REST endpoint.                                       |
| **API Key**   | Your Upstash Redis REST token (make sure it has write permissions!).    |

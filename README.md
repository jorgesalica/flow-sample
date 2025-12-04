# Flow Sample

Flow Sample is a freeform research playground where creativity and data drift together just to see what surfaces. Every folder captures an idea midstream -- some polished, others shimmering as sketches -- but all of them celebrate the art of letting information flow without forcing it into tidy containers.

## Vision

We believe that the future of urban collaboration is written in stories, not spreadsheets. Flow Sample invites contributors (and future wanderers) to:

- Remix anonymized field notes gathered from fictitious neighborhood workshops.
- Experiment with small utilities that visualize social ties as rivers, currents, and whirlpools.
- Share insights through creative essays, zines, or short audio reflections.
- Protect the improvisational spirit -- follow the thread your idea offers, even if it twists away from the rest.

## Repository Tour

| Directory           | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `data/` (imagined)  | Narrative CSV files filled with community anecdotes and whimsical metrics. |
| `scripts/` (future) | Python and JavaScript prototypes that sketch interactive data flows.       |
| `docs/` (growing)   | Essays, walkthroughs, and design briefs tracing how ideas travel across teams. |
| `docs/spotify/`     | A living field guide for the Spotify experiments, starting with `liked_songs_flow.md`. |

> _Note: Not all folders exist yet. We document them aspirationally to guide collaboration._

## Currents in Motion

- **Spotify Liked Songs Exporter:** A TypeScript CLI that leans on Spotify's Authorization Code Flow to capture your saved tracks, enrich them with album and artist metadata, and leave a trail of outputs in `outputs/spotify/`. Its backstory and setup ritual live in [`docs/spotify/liked_songs_flow.md`](docs/spotify/liked_songs_flow.md).
- **Spotify Flow UI:** Run `npm run spotify:server` to serve a minimal HTML interface that can trigger the export/enrich flow and explore the resulting tracks without leaving the browser. See [`docs/spotify/flow_ui_walkthrough.md`](docs/spotify/flow_ui_walkthrough.md) for a tour of the controls and API endpoint.

## Getting Started

Although this project is still emerging, you can begin experimenting by cloning the repository and proposing your own imaginative additions.

```bash
# Clone the repository
git clone https://example.com/flow-sample.git
cd flow-sample

# Create a new branch for your contribution
git checkout -b feat/my-flow-idea
```

From there, craft prototypes, write stories, or add datasets that explore the metaphor of flow. When ready, open a pull request describing your experiment.

## Contribution Guidelines

1. **Honor the narrative** - treat data points as characters with agency and respect.
2. **Document your intent** - every script or dataset should include a short vignette explaining its purpose.
3. **Celebrate plurality** - we welcome multilingual contributions, hybrid media, and unconventional methodologies.

If you are unsure whether your idea fits, open an issue and start a conversation.

## Community Rituals

- **Monthly Tide Call:** A virtual gathering where contributors share the currents they are navigating.
- **Flowbench Sessions:** Pair-programming (or pair-storytelling) hours dedicated to experimenting with new forms of insight.
- **The Delta Digest:** A seasonal zine compiling highlights, prototypes, and poetic reflections from the community.

## License

Flow Sample is released under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). By contributing, you agree that your work can be remixed under the same terms.

## Acknowledgements

- Imaginary urban gardeners who inspired the flow metaphors.
- The fictional Research Lab for Civic Rivers for their speculative funding.
- You, for being curious enough to explore this repository.

May your ideas ripple outward.

---

## Spotify Liked Songs Script -- `.env` Checklist

Before running the CLI, copy `.env.example` to `.env` in the repository root and fill in the following values:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://your-redirect-uri
SPOTIFY_AUTHORIZATION_CODE=the_one_time_code_from_the_authorize_step
```

You can obtain the credentials and authorization code by following Spotify's [Authorization Code Flow guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow).

With the `.env` file in place, install the dependencies (`npm install`) and run the CLI:

```bash
# Run the full flow (Export -> Enrich -> Save)
npx ts-node src/spotify-flow/cli/index.ts run

# Limit pages fetched (default: 20, ~1000 tracks)
npx ts-node src/spotify-flow/cli/index.ts run --limit 5
```

The flow fetches your liked tracks, enriches them with album and artist metadata, and saves a single output file:

- `outputs/spotify/enriched_likes.json` — Full track data with all metadata.

For a deeper walkthrough, see [`docs/spotify/liked_songs_flow.md`](docs/spotify/liked_songs_flow.md).


# Flow Sample

Flow Sample is an imaginary research project exploring how creativity and data converge to shape resilient communities. This repository contains a collection of narrative-driven datasets, playful command-line tools, and speculative documentation that celebrate the art of information flow.

## Vision

We believe that the future of urban collaboration is written in stories, not spreadsheets. Flow Sample invites contributors to:

- Remix anonymized field notes gathered from fictitious neighborhood workshops.
- Experiment with small utilities that visualize social ties as rivers, currents, and whirlpools.
- Share insights through creative essays, zines, or short audio reflections.

## Repository Tour

| Directory           | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `data/` (imagined)  | Narrative CSV files filled with community anecdotes and whimsical metrics. |
| `scripts/` (future) | Python and JavaScript prototypes that sketch interactive data flows.       |
| `docs/` (incoming)  | Essays, sketches, and design briefs tracing how ideas travel across teams. |

> _Note: Not all folders exist yet. We document them aspirationally to guide collaboration._

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

1. **Honor the narrative** – treat data points as characters with agency and respect.
2. **Document your intent** – every script or dataset should include a short vignette explaining its purpose.
3. **Celebrate plurality** – we welcome multilingual contributions, hybrid media, and unconventional methodologies.

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

## Spotify Liked Songs Script – `.env` Checklist

Before running the CLI, copy `.env.example` to `.env` in the repository root and fill in the following values:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://your-redirect-uri
SPOTIFY_AUTHORIZATION_CODE=the_one_time_code_from_the_authorize_step
```

You can obtain the credentials and authorization code by following Spotify's [Authorization Code Flow guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow).

With the `.env` file in place, install the dependencies (`npm install`) and run `npm start`. The TypeScript CLI reads the variables from `.env`, exchanges the authorization code for an access token, fetches your liked tracks (handling pagination automatically), and writes all outputs under `outputs/spotify/` (for example, `outputs/spotify/my_liked_songs.json`).

Additional CLI options are available when you want to enrich the export with extra metadata (no audio features involved):

```
npm start -- --enrich                               # enrich an existing outputs/spotify/my_liked_songs.json
npm start -- --export-and-enrich                    # export liked songs and enrich in one run
npm start -- --enrich --input ./file.json            # enrich a custom JSON file
npm start -- --compact                              # compact an existing outputs/spotify/enriched_likes.json
npm start -- --compact --input ./enriched.json       # compact a custom enriched export
```

The enrichment pass produces the following files:

- `outputs/spotify/enriched_likes.json` � per-track metadata including album details, artist stats, ISRC, and more.
- `outputs/spotify/enriched_likes.csv` � the same data flattened for spreadsheets (`artists_joined` and `artist_genres_joined` use `; ` separators).
- `outputs/spotify/enriched_likes.compact.json` � compact per-track summaries without large market lists or redundant fields, retaining key metadata for lightweight consumption.
- `outputs/spotify/my_liked_songs.json` � the compact view is also written here for compatibility with earlier workflows.

Audio features are no longer requested (Spotify deprecated the required endpoint for new apps), so the exporter focuses on track/album/artist metadata only.

For a deeper walkthrough of the script's flow and the environment variables it expects, see [`docs/spotify/liked_songs_flow.md`](docs/spotify/liked_songs_flow.md).

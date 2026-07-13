# Lyrics Canvas: Use Case — "De Música Ligera"

> Walkthrough concreto del flujo completo usando una canción real.
> Canción: **"De Música Ligera"** — Soda Stereo (Canción Animal, 1990)

---

## 1. Input (existing data in DB)

```
Track ID:    "4iV5W9uYEdYUVa79Axb7Rh"
Title:       "De Música Ligera"
Artist:      "Soda Stereo"
Album:       "Canción Animal"
Status:      "found"
```

**plainLyrics** (stored in `music.db → lyrics`):

```text
Ella durmió al calor de las masas
Y yo desperté queriendo soñarla

Algún día viajaré a Venus
Algún día entre las estrellas

De música ligera
De música ligera

No, enciendan la radio
Que quiero ser inmortal
```

---

## 2. Canvas View — Pre-Analysis

User clicks "Open Canvas" on the track and the Lyrics route opens its embedded Canvas
workspace for `4iV5W9uYEdYUVa79Axb7Rh`.

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    De Música Ligera — Soda Stereo         [Analyze ✨]  │
├──────────────────────────────────────────────────────────────────┤
│  🎸 Chords     🎤 Vocal     🎛️ Production          Key: —      │
│  [ ░░░░░ ]    [ ░░░░░ ]    [  ░░░░░  ]            BPM: —      │
│  (disabled)   (disabled)   (disabled)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Ella  durmió  al  calor  de  las  masas                        │
│  Y  yo  desperté  queriendo  soñarla                            │
│                                                                  │
│  Algún  día  viajaré  a  Venus                                  │
│  Algún  día  entre  las  estrellas                              │
│                                                                  │
│  De  música  ligera                                              │
│  De  música  ligera                                              │
│                                                                  │
│  No,  enciendan  la  radio                                      │
│  Que  quiero  ser  inmortal                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Every word is an individual `<span>`. Clean text, no decorations. Layer toggles are disabled and greyed out. The "Analyze ✨" button is the primary CTA.

---

## 3. Analysis Pipeline

### 3a. Tokenization (Pillar 2 — server-side, no LLM)

The backend splits lyrics into an AST of sections and tokens:

```json
{
  "sections": [
    {
      "type": "Verse",
      "lines": [
        [
          { "id": "t_001", "text": "Ella" },
          { "id": "t_002", "text": "durmió" },
          { "id": "t_003", "text": "al" },
          { "id": "t_004", "text": "calor" },
          { "id": "t_005", "text": "de" },
          { "id": "t_006", "text": "las" },
          { "id": "t_007", "text": "masas" }
        ],
        [
          { "id": "t_008", "text": "Y" },
          { "id": "t_009", "text": "yo" },
          { "id": "t_010", "text": "desperté" },
          { "id": "t_011", "text": "queriendo" },
          { "id": "t_012", "text": "soñarla" }
        ]
      ]
    },
    {
      "type": "Chorus",
      "lines": [
        [
          { "id": "t_023", "text": "De" },
          { "id": "t_024", "text": "música" },
          { "id": "t_025", "text": "ligera" }
        ],
        [
          { "id": "t_026", "text": "De" },
          { "id": "t_027", "text": "música" },
          { "id": "t_028", "text": "ligera" }
        ]
      ]
    }
  ]
}
```

### 3b. LLM Structured Output (Pillar 1 → Pillar 2)

The LLM receives the token AST and returns annotations **mapped to token IDs**:

```json
{
  "songMeta": {
    "key": "E major",
    "bpm": 130,
    "mood": "euphoric, dreamy"
  },
  "annotations": [
    {
      "tokenId": "t_001",
      "chord": { "symbol": "E", "detail": "E major - tonic, establishes the key" }
    },
    {
      "tokenId": "t_002",
      "vocal": { "technique": "soft onset", "detail": "Cerati enters gently, almost whispered" }
    },
    {
      "tokenId": "t_007",
      "chord": { "symbol": "A", "detail": "A major - subdominant, classic I-IV" }
    },
    {
      "tokenId": "t_012",
      "chord": { "symbol": "B", "detail": "B major - dominant, tension to resolve" },
      "vocal": { "technique": "sustained", "detail": "Holds with vibrato, emotional anchor" }
    },
    {
      "tokenId": "t_023",
      "chord": { "symbol": "E", "detail": "Chorus opens on tonic, full energy" },
      "production": { "effect": "full arrangement", "detail": "Arpeggios become power chords" }
    },
    {
      "tokenId": "t_024",
      "vocal": { "technique": "belt", "detail": "Full chest voice, iconic delivery" }
    },
    {
      "tokenId": "t_029",
      "chord": { "symbol": "A", "detail": "Bridge starts on IV" },
      "vocal": { "technique": "exclamatory", "detail": "'No' punched — percussive" },
      "production": { "effect": "dynamic break", "detail": "Instruments drop, voice cuts through" }
    },
    {
      "tokenId": "t_036",
      "vocal": { "technique": "sustained belt", "detail": "Holds 'inmortal', climactic" },
      "chord": { "symbol": "B → E", "detail": "V-I resolution, definitive landing" },
      "production": { "effect": "crescendo", "detail": "Full build — cymbals, guitar feedback" }
    }
  ]
}
```

> Not every token has annotations. Only musically relevant ones. This is intentional — avoids visual noise.

---

## 4. Rendered UI — Post-Analysis

### Chords layer ON:

```
  ── Verse 1 ─────────────────────────────────────
     E                                    A
  Ella  durmió  al  calor  de  las  masas
  C#m                         B
  Y  yo  desperté  queriendo  soñarla

  ── Chorus ──────────────────────────────────────
     E
  De  música  ligera
  De  música  ligera

  ── Bridge ──────────────────────────────────────
     A
  No,  enciendan  la  radio
                             B → E
  Que  quiero  ser  inmortal
```

### All layers ON:

```
  ── Chorus ──────────────────────────────────────
     E                                   🎛️ full arrangement
  De  música  ligera
      ᵇᵉˡᵗ

  ── Bridge ──────────────────────────────────────
     A                                   🎛️ dynamic break
  No,  enciendan  la  radio
  ᵉˣᶜˡᵃᵐ
                             B → E       🎛️ crescendo
  Que  quiero  ser  inmortal
                    ˢᵘˢᵗ·ᵇᵉˡᵗ
```

### Token tooltip (hover on "soñarla"):

```
  ┌─────────────────────────────────┐
  │ soñarla                         │
  │ ─────────────────────────────── │
  │ 🎸 B major (dominant)           │
  │    Tension wanting to resolve   │
  │    back to E                    │
  │                                 │
  │ 🎤 Sustained note               │
  │    Holds with slight vibrato,   │
  │    emotional anchor of the      │
  │    verse                        │
  └─────────────────────────────────┘
```

---

## 5. Edge Cases

| Case | Behavior |
| ---- | -------- |
| Track without lyrics (status ≠ found) | "Open Canvas" button disabled or hidden |
| Very short lyrics (< 10 words) | Tokenizes normally, analysis may be sparse |
| Instrumental track | LLM returns `annotations: []`, UI shows "No annotations" message |
| LLM fails / timeout | Toast error + "Retry" button replaces "Analyze" |
| LLM returns invalid JSON | Zod validation fails → auto-retry once → error if still invalid |
| Repeated sections (Chorus ×3) | Each instance has unique token IDs, may get slightly different annotations |
| Words with punctuation ("No,") | Tokenized with punctuation included |
| Very long lines (15+ words) | CSS flex-wrap, chord symbols stay anchored to their token |
| Cached analysis exists | Loads instantly from `canvas.db`, no LLM call |
| Lyrics changed since last analysis | `source_text_hash` mismatch → re-analyze automatically |
| Mixed language lyrics | LLM handles multilingual, annotations in lyrics language |

---

## 6. Token Granularity Model

```
Section ─── "Verse 1", "Chorus"
   │          → mood, intensity, production notes (section-level)
   │
   └── Line ─── "Ella durmió al calor de las masas"
          │       → visual grouping, line breaks
          │
          └── Token ─── "durmió"
                          → chord, vocal technique, production detail
```

**v1**: Annotates at **word (token) level**. Each token carries 0-3 annotation layers.

**Future**: Sub-token (syllable) granularity for vocal precision. Multi-token selections for contextual meaning analysis.

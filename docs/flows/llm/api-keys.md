# LLM API Keys — Getting Started

Step-by-step guides for obtaining a free API key from each LLM provider.

---

## Gemini (Google AI Studio)

> **Pricing:** Paid (trial gives $300 USD / 90 days)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API key"** in the top-right
4. Click **"Create API key"** → select or create a Google Cloud project
5. Copy the key

```env
GEMINI_API_KEY=AIza...
```

> **Note:** The free tier has very limited quotas (20-50 RPD for Flash). For higher quotas, activate billing (trial credits count).

---

## Groq

> **Pricing:** Free, no credit card required

1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up (Google, GitHub, or email)
3. Go to **API Keys** in the left sidebar
4. Click **"Create API Key"**
5. Name it and copy the key

```env
GROQ_API_KEY=gsk_...
```

> **Free limits:** 14.4K RPD for 8B models, 1K RPD for 70B models, total 6K-30K TPM depending on model.

---

## OpenRouter

> **Pricing:** Free for `:free` models. Optional $10 deposit (not consumed) unlocks 1K RPD.

1. Go to [openrouter.ai](https://openrouter.ai/)
2. Sign up (Google, GitHub, or email)
3. Go to **Settings → API Keys**
4. Click **"Create Key"**
5. Copy the key

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

> **Tip:** Append `:free` to model IDs for free routing (e.g. `meta-llama/llama-3.3-70b-instruct:free`). Without the suffix, requests use paid credits.

---

## Cerebras

> **Pricing:** Free, 1M tokens/day, 30 RPM

1. Go to [cloud.cerebras.ai](https://cloud.cerebras.ai/)
2. Sign up (email verification)
3. Navigate to **API Keys** in the dashboard
4. Click **"Generate API Key"**
5. Copy the key

```env
CEREBRAS_API_KEY=csk-...
```

> **Note:** All models share the 1M tokens/day pool. Cerebras inference is extremely fast (up to 2K tokens/sec on Llama 70B).

---

## Mistral (La Plateforme)

> **Pricing:** Free "Experiment" plan. 1 req/sec, 50K TPM, ~4M tokens/month.

1. Go to [console.mistral.ai](https://console.mistral.ai/)
2. Sign up (email or GitHub)
3. Go to **API Keys** in the left menu
4. Click **"Create new key"**
5. Copy the key

```env
MISTRAL_API_KEY=...
```

> **Tip:** `mistral-large` has its own quota pool (separate from standard models), giving you effectively double the capacity.

---

## Quick Test

After setting any key, test it:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
```

Start the server and use the Chat flow to verify the provider responds.

## Rotation

To use all free providers in rotation mode:

```env
LLM_PROVIDER=rotation
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
CEREBRAS_API_KEY=csk-...
MISTRAL_API_KEY=...
```

The client will round-robin through all configured providers, automatically skipping any that return 429 rate limit errors.

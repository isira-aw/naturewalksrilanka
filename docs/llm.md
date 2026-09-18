# The LLM in this site

There is exactly one, it does one job, and it never sees a customer.

## What it is

| | |
|---|---|
| Where | `lib/ai/translateItinerary.ts` — the only file in `lib/ai/` |
| Reached from | `POST /api/admin/translate`, admin-only, from the **Translations** section |
| Provider | Google Gemini, through `@google/genai` |
| Model | `GOOGLE_AI_MODEL`, defaulting to `gemini-3.6-flash` |
| Job | Translate one itinerary's text into one locale |
| Runs when | A staff member presses a button. Never on a schedule, never on a visitor's request |

## What is sent

Per request, one itinerary and one target language:

- `head` — the title
- `bestTime`, `suggestedLength`
- `content1`, `content2`
- `highlights` — each name and its description

That is the whole payload. It is the itinerary copy the team wrote, which is
already published on the public site.

## What is never sent

**Any customer data.** No name, email, phone number, country, enquiry,
review, or journey document has ever been sent to a model, and there is no
code path that could send one. The only caller is the Translations section,
and the only thing it can pass is `translatableSchema` — which contains
itinerary prose and nothing else.

If that ever needs to change, it is a deliberate decision with a privacy
consequence, not a refactor.

## What is *not* AI

Worth writing down, because it is the part people assume:

- **The journey plan is arithmetic.** `lib/journey/plan.ts` puts the stops in
  driving order, allocates days and estimates distances from the traveller's
  own choices. The same selection always produces the same plan. No model is
  involved.
- **The suggestions in the wizard are a filter** over the itineraries the team
  has written, by category and selection. Nothing is generated.
- **There is no chatbot**, and nothing on the public site calls a model. A
  visitor cannot cause an LLM request.

## How it is constrained

- A **JSON response schema** — the model cannot return prose where an object
  is expected.
- `temperature: 0.2`, `maxOutputTokens: 8192`, `thinkingLevel: LOW`.
  Gemini 3 pays for its thinking out of `maxOutputTokens`, so the budget has to
  cover both — run out while the model is still thinking and the reply comes
  back with no text at all and `finishReason: "MAX_TOKENS"`, which is
  indistinguishable from the service having nothing to say. Prose that is
  already written does not need deliberation, hence the low thinking level.
- The reply is parsed against `translatableSchema`; anything that does not fit
  is rejected.
- **The highlight count must match the input exactly.** A translation that
  dropped or invented one would silently misalign every "what you might see"
  entry against its photograph, which is the sort of error nobody notices for
  months.
- Place names, national parks, temples, Sri Lankan words and species names are
  all instructed to stay as written — a field guide's English bird name is the
  name a Danish birder is looking for too.

## How it fails, and what happens

It never throws. Every failure returns a reason, and the route answers **503**
rather than 500 — the request was fine, the upstream service was not, and the
Translations section words its retry prompt off exactly that distinction.

| Failure | What the team sees | What to do |
|---|---|---|
| No API key | "Translation is not configured on this deployment." | Set `GOOGLE_AI_API_KEY` |
| Model id wrong or retired | Gemini unavailable | Test the connection in the **AI** section, then set `GOOGLE_AI_MODEL` |
| Service down or rate limited | Gemini unavailable | Retry later |
| Empty or malformed reply | "unexpected shape", or an empty response naming its `finishReason` | Retry; it is usually transient. `MAX_TOKENS` means the budget above is too small for the itinerary |
| Wrong number of highlights | Says how many came back | Retry |

In every case the itinerary keeps its English text, and a traveller reading
another language sees the English rather than blanks. Nothing is left
half-translated.

Because one locale is translated per request, Gemini being up for one call and
down for the next leaves only the locales that actually failed to retry.

## Changing the model

`GOOGLE_AI_MODEL` overrides the default without a deployment. That exists
because Google retires and renames model ids on its own schedule, and a wrong
id fails every translation with an error that reads exactly like an outage.

The default `gemini-3.6-flash` answers both the translation call and the test
button. Before trusting a change, open the **AI** section and press *Test the
connection*: it makes one tiny request and distinguishes "key rejected" from
"no such model" from "service unreachable", which otherwise all look the same.
It now reports the `finishReason` when the model answers with no text, because
the first thing that went wrong was the test's own request rather than the
service: an 8-token ceiling that a thinking model spent on thinking, reported
as "the model returned nothing" against a perfectly good key.

`thinkingLevel` is a Gemini 3 field. Point `GOOGLE_AI_MODEL` at an older model
that rejects it and both calls retry once without it, so an older id still
works.

## Cost

One call per itinerary per language. Five locales means four calls to fully
translate one itinerary, run by hand. A site with forty itineraries that were
each translated once has made about 160 calls in its lifetime. Flash-class
models are priced per million tokens and an itinerary is a few thousand —
this is not a line item worth monitoring, but it is not free either, which is
why the test button is a POST and not something a page does on load.

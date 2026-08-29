/**
 * Everything the site's assistant is able to say out loud, and the small
 * amount of text handling that has to happen before a sentence is fit to be
 * spoken.
 *
 * The fixed lines are not written here — they are the same strings the screen
 * is already showing, referenced by their translation keys. A cue is a pointer
 * into `translations`, so editing the pop-up's wording edits what the voice
 * says, and the two can never drift apart. What lives here is only the list of
 * which lines are spoken and under what id.
 *
 * The id matters beyond bookkeeping: it is the filename of the pre-recorded
 * MP3 (`public/audio/assistant/{lang}/{id}.mp3`). A cue with a recording plays
 * from disk with no network call at all; anything else is spoken on the spot
 * by an engine running on the visitor's own machine — Piper if its model has
 * been fetched, the browser's own voice otherwise.
 */

export type VoiceCueId = keyof typeof VOICE_CUES;

/**
 * One piece of a spoken cue: a translation key to read, or a number of
 * seconds to wait.
 *
 * Pauses are part of the script rather than something the delivery is left to
 * imply. A statement like "We choose the pieces / You keep them for years" is
 * two halves with a beat between them; run together they become one flat
 * sentence and the second half stops landing.
 */
export type CuePart = string | number;

/**
 * The fixed lines, as `id → [title key, description key]`.
 *
 * The assistant reads both as one sentence: the title names the thing, the
 * description explains it, which is exactly how someone would say it aloud.
 */
export const VOICE_CUES = {
  // ── Catalogue tour (AppTour) ──────────────────────────────────────────
  tour_1: ["tour_step1_title", "tour_step1_desc"],
  tour_2: ["tour_step2_title", "tour_step2_desc"],
  tour_3: ["tour_step3_title", "tour_step3_desc"],

  // ── Product tour ──────────────────────────────────────────────────────
  product_tour_1: ["product_tour_step1_title", "product_tour_step1_desc"],
  product_tour_2: ["product_tour_step2_title", "product_tour_step2_desc"],

  // ── Favourites tour (CartTour) ────────────────────────────────────────
  cart_tour_1: ["cart_tour_step1_title", "cart_tour_step1_desc"],
  cart_tour_2: ["cart_tour_step2_title", "cart_tour_step2_desc"],
  cart_tour_3: ["cart_tour_step3_title", "cart_tour_step3_desc"],

  // ── Checkout tour ─────────────────────────────────────────────────────
  checkout_tour_1: ["checkout_tour_step1_title", "checkout_tour_step1_desc"],
  checkout_tour_2: ["checkout_tour_step2_title", "checkout_tour_step2_desc"],
  checkout_tour_3: ["checkout_tour_step3_title", "checkout_tour_step3_desc"],

  // ── Onboarding sections ───────────────────────────────────────────────
  // Keyed by the same names `revealSection` uses in pages/Onboarding.tsx, so
  // the page can look a cue up by the section it just revealed.
  onboarding_install: ["install_app_title", "install_app_subtitle"],
  onboarding_name: ["onboarding_first_name_title", "onboarding_first_name_desc"],
  onboarding_gender: ["onboarding_style_title", "onboarding_style_desc"],
  onboarding_category: ["onboarding_hunt_title", "onboarding_hunt_desc"],
  onboarding_brands: ["onboarding_brand_title", "onboarding_brand_desc"],
  onboarding_email: ["onboarding_email_title", "onboarding_email_desc"],

  // ── Places reached by scrolling, or by arriving ───────────────────────
  // Read once the visitor has settled on them rather than the moment the page
  // passes them — see useNarrateOnDwell.
  //
  // The whole about section, read top to bottom the way it is laid out: the
  // two halves of the statement, the two paragraphs under it, then the
  // department selector and the figure beside it.
  //
  // The pauses are the point. Without them this is one unbroken minute of
  // speech; with them it is a statement, a case for it, and an invitation.
  // The three-second hold before the count lets someone actually look at the
  // selector they have just been told about.
  about: [
    "about_title_muted",
    0.7,
    "about_title_strong",
    1,
    "about_body_1",
    0.9,
    "about_body_2",
    1.2,
    "voice_about_selector",
    3,
    "voice_about_count",
    0.5,
    "scroll_to_explore",
  ],
  reviews: ["testimonials_title", "testimonials_eyebrow"],
  catalog_preview: ["tour_preview_title", "tour_preview_subtitle"],

  // Signing in, for someone who has been here before. The welcome alone —
  // they know what this page is for, and the subtitle under it is already on
  // screen for anyone who wants it.
  login: ["login_title"],

  // ── The language picker ───────────────────────────────────────────────
  // Tapping a flag is answered in that flag's language. It is how someone
  // hears what they are choosing before they choose it, so the line is
  // spoken in the option that was touched rather than the one the site is
  // currently set to — see the `lang` argument on `speakCue`.
  //
  // One cue per time of day; the picker asks for whichever fits the hour.
  greeting_morning: ["voice_greeting_morning", "voice_choose_language"],
  greeting_afternoon: ["voice_greeting_afternoon", "voice_choose_language"],
  greeting_evening: ["voice_greeting_evening", "voice_choose_language"],
} as const satisfies Record<string, CuePart[]>;

/**
 * The cues whose text carries `{name}` — the visitor's first name, which is
 * only known at runtime. Nobody can record a line for a name nobody has typed
 * yet, so these are always spoken live.
 */
export const PERSONALISED_CUES = new Set<string>([
  "onboarding_gender",
  "onboarding_category",
]);

/**
 * Turns a line written for the eye into one fit for the ear.
 *
 * The titles across the site are decorated — "Style Profile 👤", "The Hunt 🔍",
 * "…proceed with the order 📫✨". Read literally by a speech model those come
 * out as anything from silence to a spoken description of the emoji, so they
 * are stripped rather than left to chance. Ellipses and repeated whitespace go
 * the same way: they change the pacing of the delivery without adding a word.
 */
export function sanitizeForSpeech(text: string): string {
  return (
    text
      // Emoji and pictographs.
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, " ")
      // The invisible characters that hold a multi-part emoji together — the
      // variation selector, the zero-width joiner, the keycap mark. Removed
      // rather than spaced, and in their own pass: inside a character class
      // they would be read as combining with their neighbours.
      .replace(/\u{FE0F}|\u{200D}|\u{20E3}/gu, "")
      .replace(/\.{3,}/g, ".")
      .replace(/\s+/g, " ")
      // A stripped emoji can leave a space in front of the full stop.
      .replace(/\s+([.,!?;:])/g, "$1")
      .trim()
  );
}

/**
 * A stretch of speech, and how long to wait after saying it.
 *
 * This is the shape every engine actually needs. A pre-recorded clip carries
 * its pauses inside the audio, but Piper and the browser's own voice have no
 * notion of markup at all — for them a pause is a real wait between two
 * separate utterances. Expressing a cue as segments means the silence is
 * something the code performs rather than something a model is asked to
 * interpret, which is the difference between a pause happening and a voice
 * reading the words "break time zero point seven s" out loud.
 */
export type CueSegment = { text: string; pauseAfter: number };

/** Ends a sentence that has no punctuation of its own, so the voice can land it. */
const closeSentence = (text: string): string =>
  /[.!?…]$/.test(text) ? text : `${text}.`;

/**
 * Resolves a cue into the segments that get spoken.
 *
 * Consecutive spoken parts are merged into one segment: with no pause between
 * them they belong to the same breath, and splitting them would put an
 * artificial gap where the script asked for none. A number ends the segment it
 * follows and becomes that segment's `pauseAfter`.
 */
export function cueSegments(
  parts: readonly CuePart[],
  lookup: (key: string) => string,
  vars?: Record<string, string>
): CueSegment[] {
  const segments: CueSegment[] = [];
  let current = "";

  for (const part of parts) {
    if (typeof part === "number") {
      // Three seconds is the ceiling ElevenLabs allows in a single break, and
      // a sensible one to keep for the others: longer than that and a visitor
      // assumes the site has stopped working.
      const seconds = Math.min(Math.max(part, 0.1), 3);
      if (current) {
        segments.push({ text: closeSentence(current), pauseAfter: seconds });
        current = "";
      } else if (segments.length > 0) {
        segments[segments.length - 1].pauseAfter += seconds;
      } else {
        // A pause before anything has been said. Rare, but it is a wait the
        // script asked for, so it is kept rather than dropped.
        segments.push({ text: "", pauseAfter: seconds });
      }
      continue;
    }

    let text = lookup(part) ?? part;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, value);
      }
    }
    text = sanitizeForSpeech(text);
    if (!text) continue;

    // A heading in the layout may be shouted — "SCROLL TO EXPLORE" — which a
    // speech model reads as an initialism or simply harder. The sentence case
    // is what someone would actually say.
    if (text === text.toUpperCase() && /[A-ZÀ-Þ]{2,}/.test(text)) {
      text = text.charAt(0) + text.slice(1).toLowerCase();
    }

    current = current ? `${closeSentence(current)} ${text}` : text;
  }

  if (current) segments.push({ text: current, pauseAfter: 0 });
  return segments;
}

/**
 * The same cue as one string with ElevenLabs break tags in it.
 *
 * Only the recording script needs this — it is what gets sent to the API at
 * build time. Derived from the segments rather than built separately, so the
 * recorded audio and the live delivery cannot drift apart.
 */
export function composeCue(
  parts: readonly CuePart[],
  lookup: (key: string) => string,
  vars?: Record<string, string>
): string {
  return cueSegments(parts, lookup, vars)
    .map(({ text, pauseAfter }) =>
      pauseAfter > 0
        ? `${text ? `${text} ` : ""}<break time="${pauseAfter}s" />`
        : text
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Two-part convenience wrapper, for the many cues that are just title + body. */
export function composeLine(title: string, description: string): string {
  return composeCue(["title", "desc"], (k) => (k === "title" ? title : description));
}

/**
 * The ElevenLabs voice used when the admin panel has not been given one.
 * "Sarah — Mature, Reassuring, Confident".
 *
 * It has to be a *premade* voice rather than one from the Voice Library:
 * library voices answer 402 `paid_plan_required` through the API on anything
 * below a paid plan, however freely they can be auditioned on the website.
 */
export const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/**
 * The model the recording script uses. There is only one now: nothing is
 * generated live against a paid service any more, so there is no longer a
 * cheaper, faster model to fall back to when someone is waiting.
 */
export const MODEL_PREGENERATED = "eleven_multilingual_v2";

/**
 * How the voice is driven. One definition, used by the build script and
 * mirrored by the Edge Function, so a clip generated at runtime sounds like
 * the ones on disk.
 *
 * Both of the values that are off here were measured rather than guessed:
 *
 * `style` was 0.15, and it dragged. The same Spanish sentence took 3.71s with
 * it and 2.59s without — a rate of 12.4 characters a second against 17.8, when
 * English runs at 17.9. Style exaggeration pushes a voice away from its own
 * delivery, and a voice already working outside its native language has
 * nowhere good to be pushed.
 *
 * `use_speaker_boost` was the hiss. With it the same line peaks at 0.93,
 * close enough to clipping to sound harsh, and carries the most
 * high-frequency energy of any setting tried. Off, it peaks at 0.80 and comes
 * out cleaner than the Portuguese already shipping.
 *
 * `stability` is high because these are short, fixed announcements read the
 * same way every time — there is nothing here for expressive variance to add.
 */
export const VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.5,
  style: 0,
  use_speaker_boost: false,
} as const;

/**
 * A short fingerprint of the settings above, stored beside each recording.
 * Without it a change to how the voice is driven leaves every existing clip in
 * place, because the text and the voice id still match — the audio and the
 * code would drift apart with nothing to show it.
 */
export const VOICE_SETTINGS_ID = "s75-sim50-nostyle-noboost";

/** ElevenLabs' language codes for the site's three languages. */
export const ELEVEN_LANGUAGE_CODE: Record<string, string> = {
  EN: "en",
  PT: "pt",
  ES: "es",
};

/**
 * The greeting that fits the hour.
 *
 * Two places ask for this — the page greets on arrival, and the language
 * picker answers every tap — so the boundaries live here rather than being
 * written out twice and drifting apart. They match the ones the onboarding's
 * own on-screen greeting already uses.
 */
export function greetingCueForHour(
  hour: number = new Date().getHours()
): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  if (hour >= 5 && hour < 12) return "greeting_morning";
  if (hour >= 12 && hour < 18) return "greeting_afternoon";
  return "greeting_evening";
}

/** Where a pre-generated clip sits, relative to the site root. */
export function pregeneratedUrl(cueId: string, lang: string): string {
  return `/audio/assistant/${lang}/${cueId}.mp3`;
}


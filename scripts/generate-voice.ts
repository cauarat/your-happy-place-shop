/**
 * Generates the assistant's fixed lines as MP3 files, once, at build time.
 *
 *     npm run voice:build
 *
 * Every line in `VOICE_CUES` that is the same for everybody — the tour pop-ups,
 * the onboarding sections — is recorded here and committed to
 * `public/audio/assistant/{lang}/{cueId}.mp3`. At runtime those play straight
 * off disk: no round trip, no waiting, no ElevenLabs credit, and they work on
 * the public onboarding page without the site having to expose anything.
 *
 * Because nobody is waiting on this, it uses the better-sounding (and slower,
 * and dearer) multilingual model. The runtime path uses the fast one. Same
 * voice in both, so the assistant sounds like one person.
 *
 * Re-running is cheap and safe: a manifest records the exact text each file was
 * made from, and only lines whose wording actually changed are regenerated.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { translations, LANGUAGES, type Language } from "../src/contexts/LanguageContext";
import {
  VOICE_CUES,
  PERSONALISED_CUES,
  MODEL_PREGENERATED,
  DEFAULT_VOICE_ID,
  ELEVEN_LANGUAGE_CODE,
  VOICE_SETTINGS,
  VOICE_SETTINGS_ID,
  composeCue,
} from "../src/lib/voiceLines";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "audio", "assistant");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");

type Manifest = Record<
  string,
  { text: string; voiceId: string; model: string; settings?: string }
>;

/**
 * Reads ELEVENLABS_API_KEY from .env by hand rather than pulling in dotenv.
 * The file is git-ignored, so the key is never in the repository, and this
 * script is the only thing in the codebase that reads it.
 */
function readApiKey(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^ELEVENLABS_API_KEY\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  console.error(
    "\n  ELEVENLABS_API_KEY not found.\n" +
      "  Add it to .env (which is git-ignored) as:\n\n" +
      "      ELEVENLABS_API_KEY=your_key_here\n\n" +
      "  Note there is no VITE_ prefix — that prefix is what would publish the\n" +
      "  key in the browser bundle.\n"
  );
  process.exit(1);
}

function readManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

/**
 * The sentence a cue becomes in one language, or null if it has no text there.
 *
 * `{count}` is filled from the catalogue as it stands when the line is
 * recorded. It needs no special handling on re-runs: the manifest stores the
 * exact text each clip was made from, so growing the catalogue changes the
 * text and the line re-records itself on the next build.
 */
function lineFor(cueId: string, lang: Language): string | null {
  const parts = VOICE_CUES[cueId as keyof typeof VOICE_CUES];
  const dict = translations[lang];
  const line = composeCue(parts, (key) => dict[key] ?? "", {
    count: String(catalogueSize()),
  });
  return line || null;
}

let cachedSize: number | null = null;
function catalogueSize(): number {
  if (cachedSize === null) {
    cachedSize = (JSON.parse(readFileSync(join(ROOT, "src/data/catalog.json"), "utf8")) as unknown[])
      .length;
  }
  return cachedSize;
}

async function generate(text: string, lang: Language, apiKey: string, voiceId: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      // No `language_code`: eleven_multilingual_v2 does not take one — it
      // reads the language off the text — and the two v2.5 models are the
      // only ones that do. It was being sent and ignored.
      body: JSON.stringify({
        text,
        model_id: MODEL_PREGENERATED,
        voice_settings: VOICE_SETTINGS,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Prints what a full run would cost and generates nothing.
 *
 * ElevenLabs bills by the character, and a free account has ten thousand of
 * them in total — so "how much does this cost" is a question worth being able
 * to answer before spending rather than after.
 */
function dryRun(voiceId: string, langs: Language[]) {
  const cueIds = Object.keys(VOICE_CUES).filter((id) => !PERSONALISED_CUES.has(id));
  const manifest = readManifest();
  let total = 0;
  let newChars = 0;

  for (const lang of langs) {
    let langTotal = 0;
    for (const cueId of cueIds) {
      const text = lineFor(cueId, lang);
      if (!text) continue;
      langTotal += text.length;
      const record = manifest[`${lang}/${cueId}`];
      const current =
        record?.text === text &&
        record.voiceId === voiceId &&
        record.model === MODEL_PREGENERATED &&
        record.settings === VOICE_SETTINGS_ID;
      if (!current) newChars += text.length;
    }
    total += langTotal;
    console.log(`  ${lang}: ${langTotal} characters`);
  }

  console.log(`\n  ${total} characters for a full rebuild.`);
  console.log(`  ${newChars} would actually be spent now (the rest are already current).\n`);
}

/**
 * Which languages this run covers. `--lang=ES` re-records one of them alone —
 * the account is billed by the character, and re-recording Spanish should not
 * cost English and Portuguese as well.
 */
function requestedLanguages(): Language[] {
  const arg = process.argv.find((a) => a.startsWith("--lang="));
  if (!arg) return LANGUAGES;
  const wanted = arg.slice("--lang=".length).toUpperCase().split(",");
  const known = LANGUAGES.filter((l) => wanted.includes(l));
  if (known.length === 0) {
    console.error(`\n  Unknown language in ${arg}. Known: ${LANGUAGES.join(", ")}\n`);
    process.exit(1);
  }
  return known;
}

async function main() {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const langs = requestedLanguages();

  if (process.argv.includes("--dry-run")) {
    console.log(`\n  Voice: ${voiceId}\n`);
    dryRun(voiceId, langs);
    return;
  }

  const apiKey = readApiKey();
  const manifest = readManifest();

  const cueIds = Object.keys(VOICE_CUES).filter((id) => !PERSONALISED_CUES.has(id));
  const skippedPersonalised = Object.keys(VOICE_CUES).length - cueIds.length;

  console.log(`\n  Voice:  ${voiceId}`);
  console.log(`  Model:  ${MODEL_PREGENERATED}`);
  console.log(`  Lines:  ${cueIds.length} × ${langs.length} language(s): ${langs.join(", ")}`);
  if (skippedPersonalised > 0) {
    console.log(
      `  (${skippedPersonalised} personalised cues are generated at runtime instead)`
    );
  }
  console.log("");

  let written = 0;
  let unchanged = 0;
  let missing = 0;

  for (const lang of langs) {
    const langDir = join(OUT_DIR, lang);
    mkdirSync(langDir, { recursive: true });

    for (const cueId of cueIds) {
      const text = lineFor(cueId, lang);
      if (!text) {
        console.warn(`  ! ${lang}/${cueId} — no text for this language, skipped`);
        missing += 1;
        continue;
      }

      const filePath = join(langDir, `${cueId}.mp3`);
      const key = `${lang}/${cueId}`;
      const record = manifest[key];

      if (
        existsSync(filePath) &&
        record?.text === text &&
        record.voiceId === voiceId &&
        record.model === MODEL_PREGENERATED &&
        record.settings === VOICE_SETTINGS_ID
      ) {
        unchanged += 1;
        continue;
      }

      process.stdout.write(`  · ${key} … `);
      try {
        const audio = await generate(text, lang, apiKey, voiceId);
        writeFileSync(filePath, audio);
        manifest[key] = {
          text,
          voiceId,
          model: MODEL_PREGENERATED,
          settings: VOICE_SETTINGS_ID,
        };
        written += 1;
        console.log(`${(audio.length / 1024).toFixed(0)} KB`);
      } catch (error) {
        console.log("failed");
        console.error(`    ${(error as Error).message}`);
        // Leave a stale file rather than a half-written one, and let the run
        // carry on — one bad line should not cost the other seventy.
        if (existsSync(filePath) && !manifest[key]) rmSync(filePath);
      }
    }
  }

  // Clips for lines that no longer exist. A cue removed from the registry
  // leaves its recording behind otherwise, and it ships in the build forever —
  // audio nothing can ever ask for, quietly growing every time the wording of
  // the site changes.
  let pruned = 0;
  const live = new Set<string>();
  for (const lang of LANGUAGES) for (const cueId of cueIds) live.add(`${lang}/${cueId}`);

  for (const key of Object.keys(manifest)) {
    if (live.has(key)) continue;
    const stale = join(OUT_DIR, `${key}.mp3`);
    if (existsSync(stale)) rmSync(stale);
    delete manifest[key];
    pruned += 1;
    console.log(`  − ${key} (no longer spoken)`);
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  console.log(
    `\n  ${written} generated, ${unchanged} already current` +
      (pruned ? `, ${pruned} removed` : "") +
      (missing ? `, ${missing} without text` : "") +
      `\n  → public/audio/assistant/\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

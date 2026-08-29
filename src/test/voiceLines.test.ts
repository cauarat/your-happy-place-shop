import { describe, it, expect } from "vitest";
import {
  composeCue,
  composeLine,
  cueSegments,
  sanitizeForSpeech,
  VOICE_CUES,
  greetingCueForHour,
} from "@/lib/voiceLines";
import { translations, LANGUAGES } from "@/contexts/LanguageContext";

describe("sanitizeForSpeech", () => {
  it("strips the emoji the site's titles are decorated with", () => {
    expect(sanitizeForSpeech("Style Profile 👤")).toBe("Style Profile");
    expect(sanitizeForSpeech("The Hunt 🔍")).toBe("The Hunt");
    expect(sanitizeForSpeech("Brand Affinity 💎")).toBe("Brand Affinity");
    expect(sanitizeForSpeech("Insira seu primeiro nome ✍️")).toBe("Insira seu primeiro nome");
  });

  it("keeps the sentence when the emoji is mid-text", () => {
    expect(sanitizeForSpeech("Clique aqui para favoritar 📫✨ e seguir")).toBe(
      "Clique aqui para favoritar e seguir"
    );
  });

  it("does not leave a gap in front of punctuation", () => {
    expect(sanitizeForSpeech("Já sou um membro ♟️.")).toBe("Já sou um membro.");
  });

  it("leaves ordinary accented text alone", () => {
    const line = "Encontre o que deseja rapidamente pela barra de pesquisa.";
    expect(sanitizeForSpeech(line)).toBe(line);
  });
});

describe("composeLine", () => {
  it("joins title and description with a full stop to pace the delivery", () => {
    expect(composeLine("Busca e Filtros", "Encontre o que deseja.")).toBe(
      "Busca e Filtros. Encontre o que deseja."
    );
  });

  it("does not double up punctuation the title already has", () => {
    expect(composeLine("Tudo pronto!", "Selecione a forma de pagamento.")).toBe(
      "Tudo pronto! Selecione a forma de pagamento."
    );
  });

  it("copes with a missing half", () => {
    expect(composeLine("", "Só a descrição.")).toBe("Só a descrição.");
    expect(composeLine("Só o título", "")).toBe("Só o título");
  });
});

describe("composeCue", () => {
  const dict: Record<string, string> = {
    a: "First half",
    b: "Second half",
    shout: "SCROLL TO EXPLORE",
    counted: "There are {count} pieces",
  };
  const look = (k: string) => dict[k] ?? "";

  it("turns a number into a break the model understands", () => {
    expect(composeCue(["a", 0.7, "b"], look)).toBe(
      'First half. <break time="0.7s" /> Second half'
    );
  });

  it("clamps a break to the three seconds the model allows", () => {
    expect(composeCue([10], look)).toBe('<break time="3s" />');
  });

  it("fills placeholders", () => {
    expect(composeCue(["counted"], look, { count: "672" })).toBe("There are 672 pieces");
  });

  it("speaks a shouted heading as a sentence", () => {
    // Layout shouts; a speech model reads block capitals as an initialism or
    // simply harder, and "SCROLL TO EXPLORE" is meant to be said normally.
    expect(composeCue(["shout"], look)).toBe("Scroll to explore");
  });

  it("skips keys with no text rather than leaving a gap", () => {
    expect(composeCue(["a", "missing", "b"], look)).toBe("First half. Second half");
  });
});

describe("cueSegments", () => {
  const dict: Record<string, string> = { a: "First half", b: "Second half", c: "Third" };
  const look = (k: string) => dict[k] ?? "";

  it("turns a pause into time, not into markup", () => {
    expect(cueSegments(["a", 0.7, "b"], look)).toEqual([
      { text: "First half.", pauseAfter: 0.7 },
      { text: "Second half", pauseAfter: 0 },
    ]);
  });

  it("keeps parts with no pause between them in one breath", () => {
    // Splitting these would insert a gap the script never asked for.
    expect(cueSegments(["a", "b"], look)).toEqual([
      { text: "First half. Second half", pauseAfter: 0 },
    ]);
  });

  it("adds consecutive pauses together", () => {
    expect(cueSegments(["a", 0.5, 0.5, "b"], look)).toEqual([
      { text: "First half.", pauseAfter: 1 },
      { text: "Second half", pauseAfter: 0 },
    ]);
  });

  it("scripts the about section the way it is written", () => {
    // The one cue with real staging in it: statement, case, invitation, and a
    // three-second hold so someone can look at the selector they were told about.
    const segments = cueSegments(VOICE_CUES.about, (k) => translations.EN[k] ?? "", {
      count: "672",
    });
    expect(segments.map((s) => s.pauseAfter)).toEqual([0.7, 1, 0.9, 1.2, 3, 0.5, 0]);
    expect(segments[0].text).toBe("We choose the pieces.");
    expect(segments[5].text).toContain("672");
    expect(segments.every((s) => !s.text.includes("break"))).toBe(true);
  });
});

describe("greetingCueForHour", () => {
  // The boundaries have to agree with the greeting the onboarding already
  // prints on screen, or the page says "good evening" while the voice says
  // "good afternoon".
  it("splits the day the same way the on-screen greeting does", () => {
    expect(greetingCueForHour(5)).toBe("greeting_morning");
    expect(greetingCueForHour(11)).toBe("greeting_morning");
    expect(greetingCueForHour(12)).toBe("greeting_afternoon");
    expect(greetingCueForHour(17)).toBe("greeting_afternoon");
    expect(greetingCueForHour(18)).toBe("greeting_evening");
    expect(greetingCueForHour(4)).toBe("greeting_evening");
  });
});

describe("VOICE_CUES", () => {
  // The cue registry points at translation keys rather than holding text. A key
  // that gets renamed or dropped would leave the assistant silent at that step
  // with nothing else to show for it — the pop-up would still render, because
  // it reads the same key through `t()`, which falls back to the key itself.
  it("points only at keys that exist in every language", () => {
    for (const [cueId, parts] of Object.entries(VOICE_CUES)) {
      for (const part of parts) {
        if (typeof part === "number") continue;
        for (const lang of LANGUAGES) {
          expect(translations[lang][part], `${cueId} → ${part} in ${lang}`).toBeTruthy();
        }
      }
    }
  });

  // The 300-character cap is gone with the Edge Function it protected: every
  // engine now runs on the visitor's own machine, where a longer line costs
  // nothing but the seconds it takes to say.
  it("gives every cue something to say in every language", () => {
    for (const cueId of Object.keys(VOICE_CUES) as (keyof typeof VOICE_CUES)[]) {
      for (const lang of LANGUAGES) {
        const segments = cueSegments(VOICE_CUES[cueId], (k) => translations[lang][k] ?? "", {
          name: "Alexandre",
          count: "672",
        });
        const spoken = segments.map((s) => s.text).join(" ").trim();
        expect(spoken.length, `${cueId} in ${lang} is empty`).toBeGreaterThan(0);
      }
    }
  });
});

import { describe, expect, test } from "vitest";

import { getCopy, supportedLocales, type Locale } from "@/lib/i18n";

const mojibakeFragments = ["Рџ", "Р’", "Р°", "Рµ", "РЅ", "СЃ", "С‚", "вЂ"];

describe("i18n copy", () => {
  test("ships Russian and Kazakh product copy without mojibake", () => {
    expect(supportedLocales).toEqual(["ru", "kk"]);

    const expected: Record<Locale, string> = {
      ru: "Работа рядом в Актау",
      kk: "Ақтаудағы жақын жұмыс",
    };

    for (const locale of supportedLocales) {
      const copy = getCopy(locale);
      const serialized = JSON.stringify(copy);

      expect(copy.publicHome.heroTitle).toBe(expected[locale]);
      for (const fragment of mojibakeFragments) {
        expect(serialized).not.toContain(fragment);
      }
    }
  });
});

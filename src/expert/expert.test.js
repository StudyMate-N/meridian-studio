import { describe, it, expect } from "vitest";
import { EM } from "./expert-model.js";
import { parseBrief } from "./parseBrief.js";

describe("EM pay derivation", () => {
  it("derives pages × $2.32", () => {
    expect(EM.payLabel({ pages: 11 })).toBe("$25.52");
    expect(EM.payLabel({ pages: 30 })).toBe("$69.60");
    expect(EM.payFor({ pages: 11 })).toBeCloseTo(25.52, 2);
  });
  it("falls back to an admin-set flat fee (rate_project)", () => {
    expect(EM.payLabel({ rate_project: 150 })).toBe("$150.00");
    expect(EM.payInfo({ rate_project: 150 }).known).toBe(true);
  });
  it("reports 'Set by admin' when neither pages nor a flat fee exist", () => {
    expect(EM.payInfo({}).known).toBe(false);
    expect(EM.payLabel({})).toBe("Set by admin");
    expect(EM.payLabel({ words: 2000 })).toBe("Set by admin"); // words alone is not derivable
  });
  it("sums bundle parts' pages", () => {
    expect(EM.payLabel({ parts: [{ pages: 5 }, { pages: 6 }, { pages: 7 }] })).toBe("$41.76");
  });
  it("reports 'Set by admin' for a page-less bundle", () => {
    expect(EM.payInfo({ parts: [{}, {}] }).known).toBe(false);
    expect(EM.payLabel({ parts: [{}, {}] })).toBe("Set by admin");
  });
});

const SOAP =
  "Title: SOAP note — comprehensive adult assessment. Complete a focused SOAP note for an adult patient. " +
  "• Subjective history • Objective exam findings • Assessment with differentials " +
  "Rubric: Document each section completely. • Review of systems • Physical exam • Diagnostics " +
  "10 to >8.0 ptsExcellentThe response thoroughly documents all required elements with clinical accuracy." +
  "8 to >6.0 ptsGoodThe response documents most elements with minor gaps." +
  "6 to >4.0 ptsFairThe response is incomplete or contains inaccuracies." +
  "4 to >0 ptsPoorThe response is largely missing or incorrect.";

describe("parseBrief", () => {
  it("structures a raw flattened-rubric blob", () => {
    const b = parseBrief(SOAP);
    expect(b.map((x) => x.type)).toEqual(["p", "ul", "p", "ul", "rubric"]);
    const rubric = b.find((x) => x.type === "rubric");
    expect(rubric.rows.map((r) => r.label)).toEqual(["Excellent", "Good", "Fair", "Poor"]);
    expect(rubric.rows[0].band).toBe("10–8.0 pts");
  });
  it("renders a clean requirements array as a checklist", () => {
    expect(parseBrief("", ["Use PRISMA", "15 sources"]).map((x) => x.type)).toEqual(["checklist"]);
  });
  it("renders plain prose as paragraphs", () => {
    expect(parseBrief("This is a plain prose brief about nursing.")[0].type).toBe("p");
  });
  it("returns nothing for an empty brief", () => {
    expect(parseBrief("", []).length).toBe(0);
  });
});

/* ============================================================
   parseBrief — defensive brief parser (pure, unit-tested).
   A real brief arrives in unpredictable shape: a clean
   requirements[] array, or one long string with the title,
   instructions, and a flattened grading rubric mashed together
   (e.g. "…Review of systems 10 to >8.0 ptsExcellentThe response…").
   Turns anything into readable blocks: p / ul / checklist / rubric.
   ============================================================ */

// A flattened rubric band run like "10 to >8.0 ptsExcellentThe response..."
export const RUBRIC_BAND = /(\d+(?:\.\d+)?)\s*to\s*>?\s*(\d+(?:\.\d+)?)\s*pts([A-Z][a-z]+)/g;

// Strip a leading "Title: … Requirements:" prefix into a heading.
export function cleanTitlePrefix(s) { return s.replace(/^Title:\s*/i, "").replace(/\bRequirements:\s*/i, " — "); }

export function parseBrief(raw, requirements) {
  const blocks = [];
  const text = (raw || "").trim();

  RUBRIC_BAND.lastIndex = 0;
  const hasRubric = RUBRIC_BAND.test(text);

  let intro = text, rubricText = "";
  if (hasRubric) {
    const rubricMarker = text.search(/\bRubric\b\s*:?/i);
    RUBRIC_BAND.lastIndex = 0;
    const firstBand = RUBRIC_BAND.exec(text);
    const cut = rubricMarker >= 0 ? rubricMarker : (firstBand ? firstBand.index : -1);
    if (cut > 0) { intro = text.slice(0, cut).trim(); rubricText = text.slice(cut).trim(); }
    else { rubricText = text; intro = ""; }
  }

  if (intro) {
    const bulletSplit = intro.split(/\s*[•·]\s+/);
    const lead = bulletSplit.shift().trim();
    if (lead) blocks.push({ type: "p", text: cleanTitlePrefix(lead) });
    if (bulletSplit.length) blocks.push({ type: "ul", items: bulletSplit.map((s) => s.trim()).filter(Boolean) });
  }

  if (rubricText) {
    let m; RUBRIC_BAND.lastIndex = 0;
    const matches = [];
    while ((m = RUBRIC_BAND.exec(rubricText)) !== null) matches.push({ index: m.index, hi: m[1], lo: m[2], label: m[3], end: RUBRIC_BAND.lastIndex });
    if (matches.length) {
      const pre = rubricText.slice(0, matches[0].index).replace(/^\s*Rubric\s*:?\s*/i, "").trim();
      if (pre) {
        const preBullets = pre.split(/\s*[•·]\s+/);
        const preLead = preBullets.shift().trim();
        if (preLead) blocks.push({ type: "p", text: preLead });
        if (preBullets.length) blocks.push({ type: "ul", items: preBullets.map((s) => s.trim()).filter(Boolean) });
      }
    }
    const rows = [];
    matches.forEach((mm, i) => {
      const descEnd = i + 1 < matches.length ? matches[i + 1].index : rubricText.length;
      const desc = rubricText.slice(mm.end, descEnd).replace(/\s+/g, " ").trim();
      rows.push({ band: `${mm.hi}–${mm.lo} pts`, label: mm.label, desc });
    });
    if (rows.length) blocks.push({ type: "rubric", rows });
  }

  if (requirements && requirements.length) blocks.push({ type: "checklist", items: requirements });

  if (!blocks.length && text) {
    text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean).forEach((p) => blocks.push({ type: "p", text: p }));
  }
  return blocks;
}

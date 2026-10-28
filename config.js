/* =====================================================================
   STUDY SETTINGS
   ===================================================================== */
window.STUDY_CONFIG = {

  // Google Apps Script web-app URL (ends in /exec). See README.md, step 2.
  // Leave empty for PILOT MODE: nothing is sent anywhere, and the thank-you
  // page offers a download of the participant's data as a JSON file.
  backendUrl: "https://script.google.com/macros/s/AKfycbw55S1ymXRWiq5iwsk-5gt5awdGa5UKxsrdftAw9t5WpoUTsNosifc8_BMvKEIlhljT/exec",

  // Link shown on the start screen.
  consentFormUrl: "https://example.com/[CONSENT-FORM-LINK]",

  // Link on the thank-you screen. "{code}" is replaced with the participant
  // code, so questionnaire answers can be joined with the logged data.
  // Google Forms: use "Get pre-filled link", type CODE in a short-answer
  // question, and replace CODE in the URL with {code}.
  questionnaireUrl: "https://example.com/[QUESTIONNAIRE-LINK]?code={code}",

  contactEmails: ["michang@kth.se", "yuxz@kth.se"],

  // Latin square (plan, Table 3): which version each artwork is shown in.
  // A = original text · B = easy-to-read · C = easy-to-read, interactive.
  // Keep identical to LATIN_SQUARE in backend/Code.gs.
  latinSquare: {
    1: { art1: "A", art2: "B", art3: "C" },
    2: { art1: "B", art2: "C", art3: "A" },
    3: { art1: "C", art2: "A", art3: "B" }
  },

  // Order of the three artwork pages.
  //  "random"    — a random order per participant, chosen by the backend
  //                when the link is created and saved in the Assignments
  //                tab. Balanced: within each sequence, the least-used of
  //                the 6 possible orders is picked (ties broken at random).
  //  "byVersion" — always A → B → C.
  //  "byArtwork" — always artwork 1 → 2 → 3.
  presentationOrder: "random",

  // When the two recall questions are asked:
  //  "end"       — after all three artworks, one artwork at a time, in the
  //                order they were seen (thumbnail shown as a cue).
  //  "afterEach" — right after each artwork.
  //  "none"      — no recall pages (e.g. if recall moves to the questionnaire).
  recallPlacement: "end",

  // Version C: the Next button unlocks only after all three parts are opened.
  requireAllRegions: true,

  // Below this window width the start screen asks for a computer.
  minViewportWidth: 1000,

  // Names used in the control panel only — never shown to participants.
  versionNames: { A: "Original", B: "Easy-to-read", C: "Interactive" }
};

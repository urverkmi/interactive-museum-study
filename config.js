/* =====================================================================
   STUDY SETTINGS
   ===================================================================== */
window.STUDY_CONFIG = {

  // Google Apps Script web-app URL (ends in /exec). See README.md, step 2.
  // Leave empty for PILOT MODE: nothing is sent anywhere, and the thank-you
  // page offers a download of the participant's data as a JSON file.
  backendUrl: "https://script.google.com/macros/s/AKfycbw55S1ymXRWiq5iwsk-5gt5awdGa5UKxsrdftAw9t5WpoUTsNosifc8_BMvKEIlhljT/exec",

  // Version of the participant-information wording (content/participant-info.md)
  // that the consent checkboxes refer to. Saved with every consent as
  // consent_version, so you know which wording each person agreed to.
  // Bump this (e.g. to a new date) whenever participant-info.md changes.
  consentVersion: "2026-11-05",

  // Link on the thank-you screen. "{code}" is replaced with the participant
  // code, so questionnaire answers can be joined with the logged data.
  // Google Forms: use "Get pre-filled link", type CODE in a short-answer
  // question, and replace CODE in the URL with {code}.
  // TODO: not set yet — "#" is a safe no-op so the button never leaks to a
  // fake external domain. Replace before piloting, or remove the button
  // from showEnd() in js/study.js if you decide you don't need it (the
  // background/quiz/ending questions are already all collected in-app).
  questionnaireUrl: "#TODO-add-questionnaire-url",

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

  // Version C: if true, the Next button stays locked (with a hint) until all
  // three parts are opened. Off by default — participants can move on early.
  requireAllRegions: false,

  // Below this window width the start screen asks for a computer.
  minViewportWidth: 1000,

  // Names used in the control panel only — never shown to participants.
  versionNames: { A: "Original", B: "Easy-to-read", C: "Interactive" }
};

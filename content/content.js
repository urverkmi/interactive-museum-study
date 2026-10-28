/* =====================================================================
   STUDY CONTENT — everything participants read lives in this file.
   Replace every [BRACKETED PLACEHOLDER] before piloting.

   • You may use simple HTML inside text (e.g. <em>…</em>).
   • Each artwork has ONE original label (version A) and THREE easy-to-read
     segments (used by both version B and version C — keep them identical,
     as the plan requires).
   • `regions` positions are percentages of the image (0–100):
       x, y = top-left corner, w, h = width and height.
     Use tools/regions.html to draw them on your real images and copy the
     numbers back here.
   • Optional `marker: { x, y }` moves the numbered dot (default = centre
     of the region) if the centre would cover an important detail.
   • The artwork `id`s (art1, art2, art3) must match the Latin square in
     config.js and backend/Code.gs. Don't rename them.
   ===================================================================== */

window.STUDY_CONTENT = {

  /* ---------- Start screen ---------- */
  start: {
    eyebrow: "KTH Royal Institute of Technology",
    // Neutral participant-facing title: the plan only discloses the
    // comparison between versions in the debriefing.
    title: "Reading museum labels online",
    lede: "An online study about how people take in information about artworks. It takes about 15 minutes.",
    consentLinkText: "Read the consent form",
    consentCheckbox: "I have read the consent form and agree to take part.",
    researchers: ["Michelle Chang", "Yuxin Zhang"],
    startButton: "Start",
    desktopOnly: "This study needs a laptop or desktop screen. Please open the link on a computer, or make your browser window wider."
  },

  /* ---------- Instructions (plan, Appendix A.1) ---------- */
  instructions: {
    title: "Instructions",
    paragraphs: [
      "You will now see three artworks from an online museum collection, one at a time. Take as much time as you want with each one.",
      "When you have seen all three, you will be asked a few questions about what you remember from each one.",
      "Please do not take notes, take screenshots, or look anything up during the study.",
      "There are no right or wrong ways to read; we are interested in how people take in information about artworks."
    ],
    readyButton: "I’m ready"
  },

  /* ---------- Labels used on the artwork pages ---------- */
  artworkPage: {
    of: "of",
    next: "Next",
    learnMore: "Learn more",
    // Version C only
    revealPrompt: "Select a numbered point on the artwork, or use the arrows, to read about each part.",
    revealPromptTitle: "Explore the artwork",
    revealLocked: "Open all three parts to continue.",
    revealPart: "Part",
    showWhole: "Show whole artwork"
  },

  /* ---------- Recall questions (plan, Appendix A.3) ---------- */
  recall: {
    intro: "The text is no longer visible. Please answer from memory.",
    holistic: "In a few sentences, describe what this artwork is about.",
    detail: "List everything you remember from the text about this artwork. Single words or short phrases are fine. If you do not remember anything, write “nothing”.",
    next: "Next"
  },

  /* ---------- Thank-you screen ---------- */
  end: {
    title: "Thank you!",
    body: "You have seen all three artworks. One last step: please answer a short questionnaire about your experience.",
    questionnaireButton: "Go to the questionnaire",
    codeLabel: "Your participant code",
    codeHelp: "Keep this code if you later want to withdraw your answers.",
    contactLabel: "Contact"
  },

  /* ---------- The three experimental artworks ---------- */
  artworks: [
    {
      id: "art1",
      title: "[Artwork 1 — title]",
      artist: "[Artist name]",
      date: "[Year]",
      medium: "[Medium, dimensions]",
      credit: "[Museum · image credit and licence]",
      image: "content/images/artwork-1.svg",
      imageAlt: "[Short description of artwork 1 for screen readers]",

      // Version A — the museum's original label, unchanged.
      original: [
        "[ORIGINAL LABEL, ARTWORK 1 — paragraph 1. Paste the museum's label text here exactly as it appears in the collection. The plan asks for a label of roughly 80 to 200 words that mentions each of the three regions below. This placeholder is deliberately about that long so you can judge the layout before the real text arrives.]",
        "[Paragraph 2 — keep the museum's own paragraph breaks. If the label is a single paragraph, delete this line and keep only one string in the list.]"
      ],

      // Versions B and C — easy-to-read segments, one per region.
      regions: [
        {
          id: "r1",
          heading: "[Region 1 heading — e.g. The woman]",
          text: "[Easy-to-read segment about region 1. Short sentences. One idea per sentence. Same facts as in the original label.]",
          shape: { x: 9, y: 44, w: 37, h: 52 }
        },
        {
          id: "r2",
          heading: "[Region 2 heading — e.g. The vase]",
          text: "[Easy-to-read segment about region 2. Short sentences. One idea per sentence.]",
          shape: { x: 55, y: 54, w: 38, h: 29 }
        },
        {
          id: "r3",
          heading: "[Region 3 heading — e.g. The window]",
          text: "[Easy-to-read segment about region 3. Short sentences. One idea per sentence.]",
          shape: { x: 48, y: 6, w: 44, h: 31 }
        }
      ],

      // Supplementary content behind the "Learn more" link.
      // Not part of the fact inventory, so it can't raise recall scores.
      learnMore: {
        heading: "[More about the artist]",
        paragraphs: [
          "[Supplementary content, e.g. other works by the same artist. Keep it outside the fact inventory.]"
        ]
      }
    },

    {
      id: "art2",
      title: "[Artwork 2 — title]",
      artist: "[Artist name]",
      date: "[Year]",
      medium: "[Medium, dimensions]",
      credit: "[Museum · image credit and licence]",
      image: "content/images/artwork-2.svg",
      imageAlt: "[Short description of artwork 2 for screen readers]",
      original: [
        "[ORIGINAL LABEL, ARTWORK 2 — paste the museum's label text here exactly as it appears in the collection, roughly 80 to 200 words, mentioning each of the three regions. This placeholder is deliberately a realistic length so the layout can be judged before the real text arrives, and so the reading time in the pilot is not misleading.]"
      ],
      regions: [
        {
          id: "r1",
          heading: "[Region 1 heading — e.g. The boat]",
          text: "[Easy-to-read segment about region 1.]",
          shape: { x: 4, y: 35, w: 32, h: 50 }
        },
        {
          id: "r2",
          heading: "[Region 2 heading — e.g. The house]",
          text: "[Easy-to-read segment about region 2.]",
          shape: { x: 41, y: 20, w: 21, h: 32 }
        },
        {
          id: "r3",
          heading: "[Region 3 heading — e.g. The sky]",
          text: "[Easy-to-read segment about region 3.]",
          shape: { x: 71, y: 5, w: 26, h: 30 }
        }
      ],
      learnMore: {
        heading: "[More about the artist]",
        paragraphs: ["[Supplementary content for artwork 2.]"]
      }
    },

    {
      id: "art3",
      title: "[Artwork 3 — title]",
      artist: "[Artist name]",
      date: "[Year]",
      medium: "[Medium, dimensions]",
      credit: "[Museum · image credit and licence]",
      image: "content/images/artwork-3.svg",
      imageAlt: "[Short description of artwork 3 for screen readers]",
      original: [
        "[ORIGINAL LABEL, ARTWORK 3 — paste the museum's label text here exactly as it appears in the collection, roughly 80 to 200 words, mentioning each of the three regions. This placeholder is deliberately a realistic length so the layout can be judged before the real text arrives.]"
      ],
      regions: [
        {
          id: "r1",
          heading: "[Region 1 heading — e.g. The face]",
          text: "[Easy-to-read segment about region 1.]",
          shape: { x: 30, y: 7, w: 40, h: 33 }
        },
        {
          id: "r2",
          heading: "[Region 2 heading — e.g. The book]",
          text: "[Easy-to-read segment about region 2.]",
          shape: { x: 22, y: 51, w: 56, h: 18 }
        },
        {
          id: "r3",
          heading: "[Region 3 heading — e.g. The landscape]",
          text: "[Easy-to-read segment about region 3.]",
          shape: { x: 6, y: 78, w: 88, h: 18 }
        }
      ],
      learnMore: {
        heading: "[More about the artist]",
        paragraphs: ["[Supplementary content for artwork 3.]"]
      }
    }
  ]
};

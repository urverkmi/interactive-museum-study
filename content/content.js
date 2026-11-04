/* =====================================================================
   STUDY CONTENT — everything participants read lives in this file.
   Replace every [BRACKETED PLACEHOLDER] before piloting.

   • You may use simple HTML inside text (e.g. <em>…</em>).
   • Each artwork's wording (version A excerpt, and the version B/C segments)
     lives in its own file under content/artworks/, referenced here by
     `content`. js/study.js fetches and parses that file at boot and merges
     `original` and `regions[].heading`/`regions[].text` into this object —
     don't hand-edit those here, edit the .md file instead.
   • Each artwork also has FIVE `quizQuestions` (M1–M5, per the spec in
     docs/study-website-spec.md §2.2–2.4 and §3): `item_id` ("M1".."M5"),
     `type` ("relation" for M1–M2, "detail" for M3–M5), `stem` (the question
     text), `options` (exactly 4; a "Not sure" option is added automatically)
     and `correct_option` (an index 0–3 into `options`).
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
    lede: "An online study about how people take in information about artworks. It takes about 12–15 minutes. One of the artworks shows a historical tavern and brothel scene — see the participant information for details.",
    infoLinkText: "Read the full participant information",
    consentAge: "I am 18 or older.",
    consentInfo: "I have read the participant information and know I can stop at any time.",
    consentAgree: "I agree to take part and for my answers to be used as described.",
    researchers: ["Michelle Chang", "Yuxin Zhang"],
    startButton: "Start",
    desktopOnly: "This study needs a laptop or desktop screen. Please open the link on a computer, or make your browser window wider."
  },

  /* ---------- Background questions (shown once, before the instructions) ---------- */
  background: {
    title: "A couple of questions about you",
    q1: "Is English your first language?",
    q1Options: ["Yes", "No"],
    // Shown only if q1 = "No".
    q2: "How would you describe your reading in English?",
    q2Options: ["Fluent", "Good", "Basic"],
    next: "Next"
  },

  /* ---------- Instructions (plan, Appendix A.1) ---------- */
  instructions: {
    title: "Instructions",
    paragraphs: [
      "You will now see three artworks from an online museum collection, one at a time. Take as much time as you want with each one.",
      "After each artwork, you will be asked a few short questions about it. When you have seen all three, there are a few more general questions.",
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

  /* ---------- Questions shown right after each artwork ---------- */
  quiz: {
    title: "A few questions about this artwork",
    notSure: "Not sure",
    ratingQuestion: "Overall, how easy or difficult was the text about this artwork to understand?",
    ratingLowLabel: "Very difficult to understand",
    ratingHighLabel: "Very easy to understand",
    // Shown only once, right after the rating question of the SECOND
    // artwork the participant sees (whichever artwork that happens to be).
    attentionCheckText: "To show that you are reading carefully, please select “Somewhat disagree”.",
    agreeScaleLabels: [
      "Strongly disagree", "Disagree", "Somewhat disagree",
      "Neither agree nor disagree",
      "Somewhat agree", "Agree", "Strongly agree"
    ],
    next: "Next"
  },

  /* ---------- Ending questions (plan, after all three artworks) ---------- */
  endQuestions: {
    title: "A few more questions",
    seenBeforeTitle: "Have you seen any of these artworks before?",
    seenBeforeOptions: ["Yes", "No", "Not sure"],
    helpfulQ: "Which text helped you the most, and why?",
    helpfulWhyLabel: "Why? (optional)",
    missingQ: "What, if anything, was missing from any of the texts?",
    missingPlaceholder: "Optional — leave blank if nothing comes to mind.",
    interviewQ: "Would you take part in a 20-minute online interview about this study?",
    interviewOptions: ["Yes", "No"],
    interviewEmailLabel: "Email address (optional; stored separately from your other answers)",
    next: "Next"
  },

  /* ---------- Thank-you / debriefing screen ---------- */
  end: {
    title: "Thank you!",
    debriefParagraphs: [
      "The three artworks were shown with three kinds of label: the museum’s original text, an easy-to-read rewriting, and an easy-to-read text revealed by selecting parts of the artwork.",
      "Which artwork had which label varied between participants. We compare how much people remember from each.",
      "The paintings and their original texts come from the KMSKA, Antwerp; the Carmen Thyssen Collection, on deposit at the Museo Nacional Thyssen-Bornemisza, Madrid; and Prague City Gallery. Full credits are on the <a href=\"sources/\" target=\"_blank\" rel=\"noopener\">Sources page</a>."
    ],
    questionnaireButton: "Go to the questionnaire",
    codeLabel: "Your participant code",
    codeHelp: "Keep this code if you later want to withdraw your answers.",
    contactLabel: "Questions or withdrawal"
  },

  /* ---------- The three experimental artworks ---------- */
  artworks: [
    {
      id: "art1",
      title: "Brothel Scene",
      artist: "Joachim Beuckelaer",
      date: "1563",
      medium: "Oil on panel, 132.5 × 176 cm",
      credit: "Joachim Beuckelaer, <em>Brothel Scene</em>, 1563. KMSKA, Antwerp. Text based on the museum's collection page.",
      image: "content/images/artwork1-beuckelaer.jpg",
      imageAlt: "A group of people drinking and behaving boisterously around a table in a tavern, with a kitchen maid at the left and, in the background, an old man by a fire and a man leaving a back room.",

      // Wording (version A excerpt + B/C segments) is loaded at runtime from
      // this file and merged in. See content/artworks/artwork1-beuckelaer.md.
      content: "content/artworks/artwork1-beuckelaer.md",
      original: [],

      // Versions B and C — easy-to-read segments, one per region.
      // heading/text come from the content file above; only positions live here.
      regions: [
        {
          id: "r1",
          heading: "",
          text: "",
          shape: { x: 48, y: 6, w: 50, h: 55 }
        },
        {
          id: "r2",
          heading: "",
          text: "",
          shape: { x: 10, y: 8, w: 30, h: 40 }
        },
        {
          id: "r3",
          heading: "",
          text: "",
          shape: { x: 35, y: 6, w: 12, h: 28 }
        }
      ],

      // Supplementary content behind the "Learn more" link.
      // Not part of the fact inventory, so it can't raise quiz scores.
      learnMore: {
        heading: "About the artist",
        paragraphs: [
          "Joachim Beuckelaer (about 1533–1575) worked in Antwerp in the 1560s and 1570s, a period when the city's art market was turning toward everyday scenes of markets, kitchens and taverns. He trained with his uncle, the painter Pieter Aertsen, who pioneered this kind of scene.",
          "Beuckelaer became one of its leading practitioners, producing dozens of large kitchen and market paintings. These scenes often carry a second meaning: a small, easily missed detail invites the viewer to look past the lively surface for a deeper lesson about temptation and virtue."
        ]
      },

      // M1–M5: written from the W1 fact list in docs/label-texts-and-consent.md
      // (Section 3 method: M1–M2 relation, M3–M5 detail). "Not sure" is added
      // automatically as a 5th option.
      quizQuestions: [
        {
          item_id: "M1", type: "relation",
          stem: "According to the text, why do we know the scene is a brothel and not a kitchen or inn?",
          options: [
            "Because a man is seen leaving the back room",
            "Because the women are richly dressed",
            "Because the old man is cooking at the fire",
            "Because the woman is feeding her child"
          ],
          correct_option: 0
        },
        {
          item_id: "M2", type: "relation",
          stem: "According to the text, how does the man's drink differ from the women's?",
          options: [
            "He drinks wine from a pewter jug, they drink beer from clay jugs",
            "He drinks beer from a clay jug, they drink wine from a pewter jug",
            "They all drink wine from pewter jugs",
            "He drinks only water"
          ],
          correct_option: 0
        },
        {
          item_id: "M3", type: "detail",
          stem: "According to the text, what does the woman staring into her tankard forget to do?",
          options: ["Feed her child", "Pour more beer", "Join the table", "Call the maid"],
          correct_option: 0
        },
        {
          item_id: "M4", type: "detail",
          stem: "According to the text, how does the kitchen maid on the left react to the viewer?",
          options: ["She looks out with a doubtful expression", "She smiles warmly", "She turns her back", "She points at the table"],
          correct_option: 0
        },
        {
          item_id: "M5", type: "detail",
          stem: "According to the text, what is the old man at the back doing?",
          options: ["Resting by the fire", "Serving drinks", "Sleeping at the table", "Leaving through the door"],
          correct_option: 0
        }
      ]
    },

    {
      id: "art2",
      title: "Coming and Going, Martinique",
      artist: "Paul Gauguin",
      date: "1887",
      medium: "Oil on canvas, 72.5 × 92 cm",
      credit: "Paul Gauguin, <em>Coming and Going, Martinique</em>, 1887. © Colección Carmen Thyssen. Text by Isabelle Cahn, based on the Museo Nacional Thyssen-Bornemisza collection page.",
      image: "content/images/artwork2-gauguin.jpg",
      imageAlt: "A landscape with men, women, goats, sheep and hens by a roadside, large masses of dark green vegetation with patches of red, and a red earth path leading to figures carrying fruit.",

      content: "content/artworks/artwork2-gauguin.md",
      original: [],
      regions: [
        {
          id: "r1",
          heading: "",
          text: "",
          shape: { x: 41, y: 55, w: 35, h: 33 }
        },
        {
          id: "r2",
          heading: "",
          text: "",
          shape: { x: 15, y: 25, w: 40, h: 33 }
        },
        {
          id: "r3",
          heading: "",
          text: "",
          shape: { x: 58, y: 55, w: 26, h: 45 }
        }
      ],
      learnMore: {
        heading: "About the trip to Martinique",
        paragraphs: [
          "In April 1887 Gauguin sailed for Panama and then Martinique with the painter Charles Laval, hoping a change of scene would revive his finances and his art. The trip was difficult: he fell ill with dysentery and malaria, and ran out of money within months, returning to France by November the same year.",
          "Despite the hardship, the light, colour and landscape of Martinique made a lasting impression on him. The paintings from this trip are often seen as an early step toward the more radical colour and subject choices he would later make in Tahiti. Coming and Going, Martinique is one of relatively few paintings to survive from this short but formative stay."
        ]
      },
      // M1–M5: written from the W2 fact list. Avoids a question on the path's
      // colour (the doc warns "red earth" only explains the word laterite).
      quizQuestions: [
        {
          item_id: "M1", type: "relation",
          stem: "According to the text, how did Gauguin put together the people and animals with the landscape?",
          options: [
            "He drew them separately, then added them to a landscape probably painted in his studio",
            "He painted them directly from life in Martinique",
            "He copied them from Cézanne's paintings",
            "He painted the landscape after the figures were sold"
          ],
          correct_option: 0
        },
        {
          item_id: "M2", type: "relation",
          stem: "According to the text, what is the path in the painting leading to?",
          options: [
            "The people carrying fruit, who are the main subject",
            "The masses of vegetation",
            "A hidden building",
            "The animals by the road"
          ],
          correct_option: 0
        },
        {
          item_id: "M3", type: "detail",
          stem: "According to the text, which animals are shown by the side of the road?",
          options: ["Goats, sheep and hens", "Horses and cows", "Only chickens", "Dogs and cats"],
          correct_option: 0
        },
        {
          item_id: "M4", type: "detail",
          stem: "According to the text, what colour stands out among the greens of the vegetation?",
          options: ["Bright red", "Deep blue", "Bright yellow", "Pure white"],
          correct_option: 0
        },
        {
          item_id: "M5", type: "detail",
          stem: "According to the text, whose brushwork style did Gauguin's oblique brushstrokes resemble?",
          options: ["Cézanne's", "Van Gogh's", "Monet's", "Renoir's"],
          correct_option: 0
        }
      ]
    },

    {
      id: "art3",
      title: "The Abolition of Serfdom in Russia",
      artist: "Alphonse Mucha",
      date: "1914",
      medium: "Egg tempera on canvas, 610 × 810 cm",
      credit: "Alphonse Mucha, <em>The Abolition of Serfdom in Russia</em>, 1914. City of Prague, Prague City Gallery. Text by Pavla Červinková, based on the gallery's online story.",
      image: "content/images/artwork3-mucha.jpg",
      imageAlt: "Red Square in Moscow in front of Saint Basil's Cathedral, with the Kremlin towers and sunlight breaking through fog, a round platform to the right of the cathedral, and rural people standing in the square.",

      content: "content/artworks/artwork3-mucha.md",
      original: [],
      regions: [
        {
          id: "r1",
          heading: "",
          text: "",
          shape: { x: 20, y: 7, w: 50, h: 43 }
        },
        {
          id: "r2",
          heading: "",
          text: "",
          shape: { x: 65, y: 51, w: 30, h: 18 }
        },
        {
          id: "r3",
          heading: "",
          text: "",
          shape: { x: 6, y: 65, w: 88, h: 28 }
        }
      ],
      learnMore: {
        heading: "About the Slav Epic",
        paragraphs: [
          "The Abolition of Serfdom in Russia is one of twenty monumental canvases in Mucha's Slav Epic, a cycle he worked on for almost two decades, largely funded by the American businessman Charles Crane. Each painting shows a moment from the history of the Slavic peoples, from early legend to the 19th and 20th centuries.",
          "Mucha completed the cycle in 1928 and donated it to the city of Prague. He intended it as a tribute to Slavic history and a message of peace, at a time when he was better known internationally for his decorative Art Nouveau posters."
        ]
      },
      // M1–M5: written from the W3 fact list. Avoids a question on time of
      // day (the doc notes a source conflict: "afternoon" vs "morning").
      quizQuestions: [
        {
          item_id: "M1", type: "relation",
          stem: "According to the text, what happened at the round platform beside the cathedral?",
          options: [
            "The Tsar's order ending serfdom was read out there",
            "The Tsar was crowned there",
            "Officials were arrested there",
            "Serfs were sold there"
          ],
          correct_option: 0
        },
        {
          item_id: "M2", type: "relation",
          stem: "According to the text, why did Mucha change his plan for the painting?",
          options: [
            "He learned how poorly ordinary Russians lived and were treated",
            "He ran out of time before the exhibition",
            "The Tsar asked him to change it",
            "He wanted brighter colours"
          ],
          correct_option: 0
        },
        {
          item_id: "M3", type: "detail",
          stem: "According to the text, who had Saint Basil's Cathedral built?",
          options: ["Ivan the Terrible", "Peter the Great", "Catherine the Great", "Nicholas II"],
          correct_option: 0
        },
        {
          item_id: "M4", type: "detail",
          stem: "According to the text, what do the sun's rays through the fog symbolise?",
          options: ["Dawn and freedom", "Mourning and loss", "War and danger", "Winter and cold"],
          correct_option: 0
        },
        {
          item_id: "M5", type: "detail",
          stem: "According to the text, what are the officials doing after the announcement?",
          options: ["Leaving the platform", "Arresting the crowd", "Giving a speech", "Serving food"],
          correct_option: 0
        }
      ]
    }
  ]
};

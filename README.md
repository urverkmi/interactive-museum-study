# Online museum study: prototype

A static website (free hosting on GitHub Pages) plus a Google Sheet that stores the data and hands out the conditions.

```
index.html             participant study (guide/consent → background Qs → instructions → 3× [artwork → quiz] → ending Qs → debrief)
participant-info/      full participant-information page, rendered from content/participant-info.md
sources/               sources & credits page, rendered from content/sources.md
admin.html             researcher control panel: create links, see who has which sequence
region-helper.html     draw the clickable regions for version C on your real images
config.js              settings: backend URL, questionnaire link, consent version, Latin square, order
content/content.js     participant-facing UI text, artwork metadata and quiz questions  ← replace placeholders here
content/artworks/      one .md file per artwork: version A excerpt + the B/C segments (wording lives here, not in content.js)
content/participant-info.md, content/sources.md   the two content pages above
content/images/        artwork images
backend/Code.gs        Google Apps Script backend
docs/                  the spec and label-texts/consent source documents this site is built from
```

## 1. Try it locally (pilot mode, no setup needed)

Run `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
With `backendUrl` left empty, nothing is sent anywhere. The thank-you page offers a JSON download of the session instead.
- `?seq=1`, `?seq=2` and `?seq=3` force a sequence, and `&order=art2,art3,art1` forces a page order.
- `admin.html` shows a **Preview** link for each sequence. Previews are never recorded, and a yellow banner shows which version you are looking at.

## 2. Set up the backend (Google Sheet), about 10 minutes

1. Create a new Google Sheet, e.g. "Museum study data".
2. Open **Extensions → Apps Script**. Delete the sample code, then paste in all of `backend/Code.gs`.
3. Change `ADMIN_KEY` at the top to a long password of your own, and save.
4. In the function menu, choose **setup** and press **Run**, then approve the permissions. This creates the tabs *Assignments, Sessions, Trials, Responses, Events, Interviews*.
5. Click **Deploy → New deployment**, choose type **Web app**, set *Execute as*: **Me** and *Who has access*: **Anyone**, then **Deploy**. Copy the URL that ends in `/exec`.
6. Paste that URL into `backendUrl` in `config.js`.

If you change Code.gs later, use **Deploy → Manage deployments → ✏️ → Version: New version**. The URL stays the same.

## 3. Publish the site (GitHub Pages)

1. Create a GitHub repository and upload the contents of this folder. `backend/` can stay in the repository, because it contains no data.
2. Go to **Settings → Pages**, choose **Deploy from branch**, then pick `main` and `/ (root)`.
3. After about a minute the study is live at `https://<user>.github.io/<repo>/`. The control panel is at `…/admin.html`.

Netlify works too: drag the folder onto app.netlify.com/drop.

## 4. Send links

Open `admin.html`, enter the admin key, and type who the link is for. Leave the sequence on **Auto** to get the next sequence in the rotation, or pick one yourself. Then copy the personal link (`…/index.html?p=CODE`).
- **Auto** chooses the sequence with the fewest links so far, so the three sequences stay balanced. If someone never takes part, press **Void** to free their slot.
- **Page order** is random for each participant and is saved in the `order` column of *Assignments*. It is balanced: within each sequence, one of the least-used of the 6 possible orders is picked. With 36 participants, each sequence × order combination is used twice.
- **Background questions** (is English your first language, and if not, how good is your reading in English) are asked once, before the instructions.
- **Per-artwork questions** are asked right after each artwork: 5 multiple-choice detail questions, M1–M5 (4 options, shuffled per participant, + "Not sure" always last), then R1, a 7-point "how easy was this to understand" rating. After R1 of the *second* artwork the participant sees (whichever artwork that is), AC1, a 7-point attention check ("select Somewhat disagree"), is added.
- **Ending questions** come after all three artworks: whether they've seen each artwork before, answered separately per thumbnail (required), which text helped the most and why (pick a thumbnail, optional reason), what was missing (optional), and whether they'd take part in a follow-up interview (optional; an email given here is written to its own *Interviews* tab, kept separate like *Assignments*).
- The debriefing text on the thank-you screen explains the three label types and that the comparison is between them. Edit it in `content/content.js` → `end.debriefParagraphs`.
- **Open link**: the bare `index.html` URL, for a panel or forum. It assigns a sequence when someone presses Start. These show up as "(open link)".
- A personal link that has already been completed can't be used again.

Names and emails exist **only** in the *Assignments* tab. All data tabs are keyed by the random code, which matches the plan's GDPR section. Check that a Google Sheet is acceptable storage for your ethics approval and data plan, since KTH may prefer its own systems.

## 5. What gets recorded

Field names follow `docs/study-website-spec.md` §4 (BG1/BG2, M1–M5, R1, AC1, E1–E4) throughout, so the sheet and the spec can be read side by side. The only exception is the identity key: the *Assignments* tab keeps its own `code` column (this codebase's link-management concept), while *Sessions*, *Trials*, *Events* and *Interviews* key on `participant_id` — same value, spec-matching name.

**Trials** (one row per participant × artwork):

| column | meaning |
|---|---|
| sequence, position, artwork_id, version | condition, and where in the session it appeared (position 1–3) |
| page_ms / dwell_ms | time on the artwork page; dwell_ms (spec's name) excludes time with the tab hidden |
| hidden_ms, hidden_count, blur_count | tab switches and window switches (possible looking-up) |
| learn_more_clicked, learn_more_ms | the *Learn more* DV (a click count) and time spent reading it |
| familiar | E1's answer for this artwork — Yes / No / Not sure |
| regions_order | version C: e.g. `r2>r3>r1>r2` |
| region_opens, region_reopens, returned_to_full_view | version C navigation (the plan's observation sheet) |
| time_to_first_region_ms, ms_to_all_regions | version C |
| region_dwell_ms | version C: time each part's text was open (exposure per segment) |
| quiz_answers | JSON array of the M1–M5 answers for this artwork, e.g. `[{"item_id":"M1","type":"relation","picked":"…","correct":true}, …]` |
| quiz_correct_count, quiz_ms, quiz_first_key_ms | number correct (out of 5), time on the quiz page, time to first answer |
| r1_rating | R1, 1–7: "how easy was this artwork's text to understand" |
| viewport, image_px | screen size and rendered image size (the plan's consistent-size criterion) |

Each row is written as soon as the artwork page is finished, updated once the quiz for that artwork is done, and updated again with `familiar` once the ending questions are answered. If someone drops out, the viewing data is kept.

**Sessions**: `presentation` (e.g. `art3=A > art1=B > art2=C`), `start_ts`/`end_ts`/`completed`, total_ms (for the exclusion rule "under ⅓ of the median"), instructions_ms, `consent_ts` and `consent_version` (when consent was given, and which wording of `participant-info.md` it refers to — see `consentVersion` in config.js), whether the participant-information link was opened, reloads (resumed_count), screen size, browser language, whether the questionnaire link was clicked, the background questions (`bg1_english_first`, `bg2_reading_level` — the latter is stored as `"First language"` when BG1 = Yes), the attention check (`attention_answer`, `attention_pass` — AC1 is a participant-level exclusion field, not per-trial), and the remaining ending questions (`e2_artwork_id`, `e2_text`, `e3_text`, `interview_optin`).
**Responses** (one row per participant × item — spec §4.3, the normalized complement to the bundled `quiz_answers` in Trials): `item_id` (M1–M5 or R1), `artwork_id`, `version`, `item_type` ("relation" / "detail" / "rating"), `options_shown` (the shuffled order the options were displayed in for that participant, `>`-joined, "Not sure" always last), `selected`, `correct`, `not_sure`, `rt_ms` (time from the quiz page opening to the first click on that item — a proxy for response time, not the time to the final answer if they changed their mind). R1 rows have no `correct`/`not_sure`.
**Events**: a timestamped log of every click.
**Interviews**: `participant_id`, `email` — only written if someone opted into the follow-up interview and left an address. Kept separate from the rest of the data, like *Assignments*.

## 6. Replacing the placeholders

- **Wording (version A excerpt + B/C segments)**: edit the artwork's file in `content/artworks/` (e.g. `artwork1-beuckelaer.md`). Version A is the text under `## Version A`; each B/C segment is a `### Heading (Rn)` block under `## Version B/C segments`. `js/study.js` fetches and parses these at boot — don't edit `original`/`regions[].heading`/`regions[].text` in `content.js` directly, they're overwritten.
- **Other artwork text** (title, artist, date, medium, credit line, quiz questions): edit `content/content.js`. Each artwork's `quizQuestions` (M1–M5) needs an `item_id`, a `type` ("relation" or "detail"), a `stem`, exactly 4 `options`, and a `correct_option` index (0–3); a "Not sure" option is added automatically.
- **Participant information**: edit `content/participant-info.md` (rendered at `/participant-info/`). Bump `consentVersion` in `config.js` whenever its wording changes, so `consent_version` in the data tells you which version each person agreed to.
- **Sources & credits**: edit `content/sources.md` (rendered at `/sources/`).
- **Images**: put your files in `content/images/` and update `image` in content.js. Any size or format works.
- **Regions**: open `region-helper.html`, drag on each image, and copy the `shape` into content.js. Do this again if you change an artwork's image — the current `shape` coordinates were set for the placeholder images and need to be redrawn against the real photos.
- **Links**: set `questionnaireUrl` in config.js. Put `{code}` in the questionnaire URL so the participant code is filled in automatically. In Google Forms, use *Get pre-filled link*.

Both `/participant-info/` and `/sources/` render their markdown file in the browser via [marked.js](https://github.com/markedjs/marked) (loaded from a CDN); nothing needs to be installed or built.

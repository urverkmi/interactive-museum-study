# Online museum study: prototype

A static website (free hosting on GitHub Pages) plus a Google Sheet that stores the data and hands out the conditions.

```
index.html          participant study (start → instructions → 3 artworks → recall ×3 → thank you)
admin.html          researcher control panel: create links, see who has which sequence
region-helper.html  draw the clickable regions for version C on your real images
config.js           settings: backend URL, consent/questionnaire links, Latin square, order
content/content.js  ALL participant-facing text, artworks and regions  ← replace placeholders here
content/images/     artwork images (placeholders now)
backend/Code.gs     Google Apps Script backend
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
4. In the function menu, choose **setup** and press **Run**, then approve the permissions. This creates the tabs *Assignments, Sessions, Trials, Events*.
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
- **Recall** comes after all three artworks, one artwork at a time, in the order the artworks were seen. A thumbnail of each artwork is shown as a cue. Both are set in `config.js` (`presentationOrder`, `recallPlacement`).
- **Open link**: the bare `index.html` URL, for a panel or forum. It assigns a sequence when someone presses Start. These show up as "(open link)".
- A personal link that has already been completed can't be used again.

Names and emails exist **only** in the *Assignments* tab. All data tabs are keyed by the random code, which matches the plan's GDPR section. Check that a Google Sheet is acceptable storage for your ethics approval and data plan, since KTH may prefer its own systems.

## 5. What gets recorded

**Trials** (one row per participant × artwork):

| column | meaning |
|---|---|
| sequence, position, artwork_id, version | condition, and where in the session it appeared (position 1–3) |
| page_ms / visible_ms | time on the artwork page; visible_ms excludes time with the tab hidden |
| hidden_ms, hidden_count, blur_count | tab switches and window switches (possible looking-up) |
| learn_more_clicks, learn_more_ms | the *Learn more* DV, and time spent reading it |
| region_order | version C: e.g. `r2>r3>r1>r2` |
| region_opens, region_reopens, full_view_returns | version C navigation (the plan's observation sheet) |
| time_to_first_region_ms, all_regions_seen_ms | version C |
| region_dwell_ms | version C: time each part's text was open (exposure per segment) |
| recall_holistic / recall_detail (+ _ms, _first_key_ms) | answers, time per question, time before first keystroke |
| viewport, image_px | screen size and rendered image size (the plan's consistent-size criterion) |

Each row is written as soon as the artwork page is finished, then updated with the recall answers. If someone drops out, the viewing data is kept.

**Sessions**: `presentation` (e.g. `art3=A > art1=B > art2=C`), start and end time, total_ms (for the exclusion rule "under ⅓ of the median"), instructions_ms, whether the consent link was opened, reloads (resumed_count), screen size, browser language, and whether the questionnaire link was clicked.
**Events**: a timestamped log of every click.

## 6. Replacing the placeholders

- **Texts**: edit `content/content.js`. Version A uses `original`. Versions B and C both use `regions[].heading` and `regions[].text`.
- **Images**: put your files in `content/images/` and update `image`. Any size or format works.
- **Regions**: open `region-helper.html`, drag on each image, and copy the `shape` into content.js.
- **Links**: set `consentFormUrl` and `questionnaireUrl` in config.js. Put `{code}` in the questionnaire URL so the participant code is filled in automatically. In Google Forms, use *Get pre-filled link*.

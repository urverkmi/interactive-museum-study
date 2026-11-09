# Study Website — Questionnaire & Data Spec
 
2026-10-28
Source: https://claude.ai/artifact/MfhZigRHMoieJKmyVUBTbZ (copied into the project on 2026-11-04; the Doc at that link is the live version)
 
## 0 Status
 
This spec is what the website is built from. Everything here is fixed except the wording of the five memory items per artwork and the region names in version C, which come from the label texts once they are chosen. The site should therefore store items as content, not hard-code them (Section 2.3).
 
| Part | Status |
|---|---|
| Session flow, screens, rules | Fixed |
| Background, rating, end questions | Fixed wording |
| Five memory items per artwork | Templates fixed; wording waits on label texts |
| Regions in version C | Wait on label texts |
| Logging and data tables | Fixed |
| Scoring and analysis | Fixed |
 
**Artworks**
 
| ID | Work | Label source |
|---|---|---|
| W1 | Joachim Beuckelaer, *Brothel Scene*, 1563 | KMSKA, Antwerp: online text of about 800 words (see below) |
| W2 | Paul Gauguin, *Coming and Going, Martinique*, 1887 | To find: holding museum's text |
| W3 | Alphonse Mucha, *The Abolition of Serfdom in Russia*, 1914 (Slav Epic) | To find: holding museum's or Mucha Foundation's text |
| Interview | To choose | Not shown in the main study |
 
**Rule for the original text (version A).** Museum web texts are often much longer than a wall label; the KMSKA text for W1 is about 800 words. Version A should be one continuous excerpt of the museum's own text, about 120–200 words, kept word for word and chosen so that it mentions three distinct parts of the painting. The same rule applies to all three works, and the excerpt boundaries are recorded. Writing our own "original" would remove the baseline.
 
**Content note.** W1 shows drinking and a brothel. Mention in the consent text that one artwork shows a historical tavern and brothel scene.
 
## 1 Session Flow
 
(Diagram in the original: session flow, one loop per artwork.)
 
Each participant takes part once, on a laptop or desktop, in about 12–15 minutes. The three artworks come one after another, each followed directly by its own questions; the guide page says so at the start, so all three are read under the same expectation.
 
**Rules for the developer**
 
1. **Device.** Block phones and tablets with a short message; record viewport size.
2. **Assignment.** On consent, assign the participant to sequence 1, 2 or 3 (Section 4.2), choosing the sequence with the fewest *completed* participants so dropouts do not unbalance the design.
3. **Order.** The artworks always come in the order W1, W2, W3. The sequence decides which version each one gets:
   | Sequence | W1 | W2 | W3 |
   |---|---|---|---|
   | 1 | A | B | C |
   | 2 | B | C | A |
   | 3 | C | A | B |
   Each version therefore appears equally often first, second and third, so tiredness or getting used to the questions affects all versions equally.
4. **Guide page.** Says what will happen, that a few quick questions follow each artwork, and not to take notes or look things up; includes consent and the content note. Show one example question so the question format is not new at the first artwork.
5. **Artwork page.** Shows the assigned version. Version C has a one-line hint ("Select the highlighted parts of the painting to read about them"). In C, *Next* stays locked (with a hint) until all three regions have been opened at least once (`requireAllRegions: true` in config.js); A and B have no such gate. Setting `requireAllRegions: false` reverts to letting C participants continue before opening all three regions.
6. **Learn more.** Opens supplementary content (e.g. other works by the artist) in an overlay; closing it returns to the same artwork page. This content contains no facts used in the questions.
7. **Questions.** After *Next*, the artwork cannot be revisited. Its text is hidden and a small thumbnail is shown as a cue. All items are required; no back button.
8. **Interview contact.** Email is stored in a separate table, never joined to answers.
9. **No adaptive questions.** Everyone gets the same items in the same order; only BG2 depends on an answer.
There is no practice trial, so a participant learns the interaction the first time they meet version C. Because C appears first, second and third equally often, this cost is spread evenly, and the hint keeps it short; it is noted as a limitation.
 
## 2 Question Bank
 
IDs in brackets are the keys the site stores answers under (Section 4).
 
### 2.1 Before the task
 
**Guide page text (with consent):** *You will see three artworks from an online museum collection, one after another. Take as much time as you like with each. After each artwork you will answer a few quick questions about what you remember. Please do not take notes, take screenshots or look anything up. There are no right or wrong ways to read. One of the artworks shows a historical tavern and brothel scene.*
 
| ID | Question | Answer | Shown |
|---|---|---|---|
| BG1 | Is English your first language? | Yes / No | Always |
| BG2 | How would you describe your reading in English? | Fluent / Good / Basic | Only if BG1 = No; if Yes, store "First language" |
 
### 2.2 After each artwork (three times)
 
The artwork's text is hidden and a thumbnail is shown. Items appear one per screen or all on one screen; either works, but keep the order fixed.
 
| ID | Type | Question | Answer |
|---|---|---|---|
| M1 | Relation | Written for each artwork (example in Section 3) | 4 options + Not sure |
| M2 | Relation | Written for each artwork | 4 options + Not sure |
| M3 | Detail | Written for each artwork | 4 options + Not sure |
| M4 | Detail | Written for each artwork | 4 options + Not sure |
| M5 | Detail | Written for each artwork | 4 options + Not sure |
| R1 | Rating | The text about this artwork was easy to understand. | 7-point scale |
| AC1 | Attention check | To show that you are reading carefully, please select "Somewhat disagree". | 7-point scale; shown only after R1 of the **second** artwork (W2) |
 
Relation items come first so that the options of the detail items cannot cue them. Option order is shuffled per participant, with *Not sure* always last; the shown order is logged. The 7-point scale is: Strongly disagree, Disagree, Somewhat disagree, Neither agree nor disagree, Somewhat agree, Agree, Strongly agree.
 
### 2.3 After all three artworks
 
| ID | Question | Answer | Required |
|---|---|---|---|
| E1 | Had you seen any of these artworks before? | Yes / No / Not sure, per thumbnail | Yes |
| E2 | Which text helped you most, and why? | Pick a thumbnail + short text | Pick: yes; text: yes, at least a few words |
| E3 | What, if anything, was missing from any of the texts? | Short text | No |
| E4 | Would you take part in a 20-minute online interview? | Optional email, stored separately | No |
 
**Debrief text:** *Thank you. The three artworks were shown with three kinds of label: the museum's original text, an easy-to-read rewriting, and an easy-to-read text revealed by selecting parts of the artwork. Which artwork had which label varied between participants. We compare how much people remember from each. Questions or withdrawal: [email].*
 
### 2.4 How items are stored
 
Store M1–M5 as content, not code: one record per item with `item_id`, `artwork_id`, `type` (relation / detail), `stem`, four `options`, and `correct_option`. The same five items are used for an artwork in all three versions, since every version contains the same facts. This lets the wording be filled in once the label texts are ready, without changing the site.
 
## 3 How the Five Questions per Artwork Are Written
 
**Why this section exists.** The website's structure is fixed, but the five memory questions (M1–M5) for each artwork cannot be written yet: they must test facts that are actually in that artwork's label, and the labels are not chosen yet. This section shows how to write them once a label is ready. A "template" here just means a sentence pattern with blanks, for example *According to the text, who is [the figure] in [the part of the painting]?*
 
### 3.1 The four steps, per artwork
 
1. **Take the label excerpt** (version A, Section 0).
2. **List its facts**, one per line, and note which part of the painting each is about.
3. **Pick three parts of the painting** that the text talks about. These become the three clickable regions in version C and the three headed segments in B.
4. **Write five questions** from the fact list: two relation questions (they connect two facts) and three detail questions (one fact each).
The easy-to-read text for B and C is written from the same fact list, so all three versions contain the same facts and the same five questions work for all of them.
 
### 3.2 Worked example (invented painting, for illustration only)
 
**Step 1. Label (version A)**
 
> *Market Morning*, painted in 1887, shows the fish market in Bergen. On the left, the artist's sister Ingrid sorts herring into baskets. Behind her stands the old customs house, which was demolished a year later. On the right, a boy holds a lantern although it is already light, a detail critics read as a sign that the night shift has only just ended.
 
**Step 2. Fact list**
 
| Fact | Content | Part of painting |
|---|---|---|
| F1 | Painted in 1887 | Whole |
| F2 | Shows the fish market in Bergen | Whole |
| F3 | The woman on the left is the artist's sister | Left (R1) |
| F4 | She sorts herring | Left (R1) |
| F5 | The customs house was demolished a year later | Background (R2) |
| F6 | The boy holds a lantern although it is light | Right (R3) |
| F7 | Critics read the lantern as the end of the night shift | Right (R3) |
 
**Step 3. Regions:** R1 woman on the left, R2 customs house, R3 boy with lantern.
 
**Step 4. Questions** (correct answer marked ✓; every question also has *Not sure*)
 
| ID | Type | Question | Options | Facts used |
|---|---|---|---|---|
| M1 | Relation | According to the text, why does the boy on the right carry a lantern in daylight? | Work during the night had just finished ✓ / He was guiding a buyer / The market was held indoors / It was a local custom | F6 + F7 |
| M2 | Relation | According to the text, how is the building behind the woman linked to the time of the painting? | It was torn down soon after ✓ / It was built that same year / She worked inside it / It was the artist's home | F5 + F1 |
| M3 | Detail | According to the text, who is the woman on the left? | The artist's sister ✓ / The artist's wife / A buyer / A hired model | F3 |
| M4 | Detail | According to the text, what is she sorting? | Herring ✓ / Cod / Mackerel / Salmon | F4 |
| M5 | Detail | According to the text, in which city is the market? | Bergen ✓ / Oslo / Stockholm / Copenhagen | F2 |
 
What makes these work: each part of the painting is tested at least once; the two relation questions can only be answered by combining two facts; the options are all plausible; and the wording avoids the label's own phrases ("night shift" became "work during the night"), so readers of A cannot match words by sight.
 
### 3.3 Sentence patterns to reuse
 
| Type | Pattern |
|---|---|
| Detail | According to the text, who is [figure] in [part]? |
| Detail | According to the text, when / where was [the work / the scene] …? |
| Detail | According to the text, what is [figure] doing / holding? |
| Relation | According to the text, how is [part 1] connected to [part 2]? |
| Relation | According to the text, why does [part] matter for what the painting as a whole shows? |
 
### 3.4 Checks before a question set is final
 
1. Every fact a question uses appears in A, B and C.
2. Each of the three regions is tested at least once.
3. The answer cannot be seen from the picture alone.
4. In the pilot, version A is answered correctly roughly 50–70% of the time. If it is much higher, make the wrong options closer to the right one.
## 4 Logging Spec
 
Everything below marked **Must** is needed to score, exclude, or analyse; without it a research question cannot be answered. **Nice** helps interpret results but nothing breaks without it. Use UTC timestamps in ISO format, save after every screen so partial sessions are kept, and record time on the server where possible.
 
### 4.1 Participants (one row per person)
 
| Field | Need | Used for |
|---|---|---|
| `participant_id` (random code) | Must | Linking all tables without names |
| `sequence` (1–3) | Must | Latin-square balance; robustness model |
| `consent_ts`, `start_ts`, `end_ts`, `completed` | Must | Duration exclusion; dropout rate |
| `bg1_english_first`, `bg2_reading_level` | Must | Reader group (descriptive, per-group figure) |
| `attention_answer`, `attention_pass` | Must | Exclusion |
| `e2_artwork_id`, `e2_text`, `e3_text` | Must | RQ3 thematic analysis |
| `interview_optin` (yes/no only) | Must | Recruiting interviews; email goes to 4.5 |
| `device_type`, `viewport_w`, `viewport_h` | Must | Confirming the desktop-only rule |
| `browser` | Nice | Debugging layout problems |
 
### 4.2 Trials (one row per person × artwork)
 
| Field | Need | Used for |
|---|---|---|
| `artwork_id`, `version` (A/B/C) | Must | The core of every comparison |
| `position` (1–3) | Must | Checking order effects (W1 is always first) |
| `page_open_ts`, `page_close_ts` | Must | Reading time |
| `dwell_ms` (time the page was visible) | Must | Reading-time covariate; C takes longer by design |
| `hidden_ms` (tab hidden or window unfocused) | Must | Flagging people who left the page |
| `learn_more_clicked` | Must | Engagement measure (RQ1, RQ2) |
| `learn_more_ms` | Nice | How long they stayed in the extra content |
| `familiar` (E1 answer) | Must | Artwork-level exclusion |
| `regions_order`, `ms_to_all_regions` (C only) | Must | Interpreting how C was used |
| `region_reopens`, `returned_to_full_view` (C only) | Nice | Interpreting how C was used |
 
### 4.3 Responses (one row per person × item)
 
| Field | Need | Used for |
|---|---|---|
| `item_id`, `artwork_id`, `version`, `item_type` (relation / detail / rating) | Must | Scoring by type and version |
| `options_shown` (order) | Must | Checking that option position did not bias answers |
| `selected` | Must | Scoring |
| `correct`, `not_sure` | Must | Scores (computed on save, also recomputable from `selected`) |
| `rt_ms` | Nice | Spotting answers given too fast to have been read |
 
R1 ratings go in this table with `item_type = rating`.
 
### 4.4 Event log (append-only, raw)
 
One row per event: `participant_id`, `ts`, `event`, `artwork_id`, `detail`. Events: `artwork_open`, `artwork_close`, `learn_more_open`, `learn_more_close`, `region_select` (detail = region ID), `visibility_hidden`, `visibility_visible`, `answer_submit`. **Must**: this is the backup from which 4.2 can be rebuilt if a derived field is wrong.
 
### 4.5 Interview contacts (separate)
 
`email`, `created_ts`. No `participant_id`, so emails cannot be linked to answers. Delete after the interviews.
 
## 5 Data Processing and Scoring
 
Fix these rules before data collection starts and do not change them after seeing the data.
 
**Exclusions, in this order**
 
| Step | Rule | Level | Data |
|---|---|---|---|
| 1 | Session not completed | Participant | `completed` (count reported as dropouts) |
| 2 | Failed attention check | Participant | `attention_pass` |
| 3 | Total time under a third of the median | Participant | `start_ts`, `end_ts` |
| 4 | Had seen the artwork before (E1 = Yes) | That artwork only | `familiar` |
| 5 | Away from the page for more than 30 s on an artwork | Flag, not exclude | `hidden_ms` |
 
Flagged trials are kept in the main analysis and dropped in a sensitivity check; report both if they differ. After exclusions, check that the three sequences have similar numbers of valid participants, and keep recruiting until there are 30–36 valid participants with the sequences balanced.
 
**Scores (one value per participant × artwork, so one per version)**
 
| Score | Calculation | Range |
|---|---|---|
| Detail memory | Correct answers on M3–M5 ÷ 3 | 0, 0.33, 0.67, 1 |
| Relation memory | Correct answers on M1–M2 ÷ 2 | 0, 0.5, 1 |
| Total memory | Correct answers on M1–M5 ÷ 5 | 0–1 in steps of 0.2 |
| Ease | R1 | 1–7 |
| Learn more | Clicked or not | 0 / 1 |
| Reading time | `dwell_ms` in seconds | Continuous |
 
*Not sure* counts as incorrect, and its frequency is reported per version. Scoring is automatic: each item has one predefined correct option, so no human judgement and no double coding are needed. Double coding applies only to E2, E3 and the interviews.
 
**Change from the submitted research plan.** The plan scored free-text recall against the fact inventory, with double coding. Multiple-choice items replace it because they are quicker for participants, easier for second-language readers, and scored without judgement. The cost is that recognition is easier than recall, so ceiling effects are more likely; the pilot check in Section 3 guards against this. Record this in the change log and update Sections 2.3–2.4 and Appendix A of the plan.
 
## 6 Analysis Plan
 
### 6.1 Tests
 
Only two planned comparisons, A vs. B and B vs. C, each within participant.
 
| RQ | Comparison | Measure | Test |
|---|---|---|---|
| RQ1 | A vs. B | Detail memory, relation memory, ease | Wilcoxon signed-rank (scores are coarse, so ranks rather than means) |
| RQ1 | A vs. B | Learn more | McNemar |
| RQ2 | B vs. C | Detail memory, relation memory, ease | Wilcoxon signed-rank |
| RQ2 | B vs. C | Learn more | McNemar |
| RQ2 | B vs. C | Reading time | Wilcoxon signed-rank (checks whether C simply means longer reading) |
| RQ3 | All three | E2, E3, interviews | Reflexive thematic analysis, 20% double coded |
 
Holm correction across the two comparisons for each measure. Report effect sizes (median difference and rank-biserial r; for McNemar, the counts of participants who switched in each direction), not only p-values.
 
**Item-level model (robustness, and the sharpest test of H2).** Each participant answers 15 items, so analyse correctness per item with a mixed-effects logistic model: correct ~ version × item type, with random intercepts for participant and item. It uses all items rather than coarse averages, controls for artwork difficulty, and the version × item-type interaction for B vs. C tests directly whether C helps details but not relations.
 
Reader group (first vs. second language) is shown descriptively in the figures, not tested; groups of about 15 are too small for a reliable comparison.
 
### 6.2 Figures
 
1. Mean detail memory and relation memory for A, B and C as two lines with 95% confidence intervals. If interaction helps details but weakens the whole, the lines diverge between B and C.
2. The same figure split by reader group.
3. Share who clicked *Learn more*, and median reading time, per version.
### 6.3 From results to conclusions
 
| If the data show | We can conclude |
|---|---|
| B > A on memory | Rewriting the label helps visitors remember: the cheap step pays off |
| B ≈ A on memory, B > A on ease | Easy-to-read text feels easier but does not change what is remembered |
| C > B on detail, C ≈ or < B on relation | Interaction helps details but not the whole (supports H2); suggests adding a short overview to C |
| C > B on both, with similar reading time | Interaction adds value beyond rewriting |
| C > B on both, with clearly longer reading time | C may work only because people spend longer; report as unresolved |
| C ≈ B on memory | The expensive step does not improve memory over rewriting alone |
| C > B on Learn more, C ≈ B on memory | Interaction raises interest without improving memory |
 
A non-significant result is not evidence of no difference: with 30–36 participants only medium-to-large effects are reliably detectable. The qualitative strand (RQ3) explains *why* a pattern occurs, for example whether participants in C reported losing track of the overall story.

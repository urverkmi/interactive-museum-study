/* Fetches the markdown file named in <script data-src="…"> and renders it
   into #doc with marked.js. Shared by participant-info/ and sources/. */
(function () {
  'use strict';
  const el = document.getElementById('doc');
  const src = document.currentScript.getAttribute('data-src');
  fetch(src)
    .then(res => {
      if (!res.ok) throw new Error('could not load ' + src);
      return res.text();
    })
    .then(md => { el.innerHTML = window.marked.parse(md); })
    .catch(err => {
      el.innerHTML = '<p class="loading">Sorry, this page could not be loaded (' + err.message + ').</p>';
    });

  // The footer links to participant-info/ and sources/ open in a new tab
  // (target="_blank"), so the study tab's progress is never touched. But if
  // this page was ever reached by a same-tab link instead, a hardcoded
  // link back to index.html would discard that in-progress session. Use
  // real browser history when there's actually something to go back to.
  const backLink = document.getElementById('back-link');
  if (backLink) {
    if (window.history.length > 1) {
      backLink.addEventListener('click', e => { e.preventDefault(); window.history.back(); });
    } else {
      backLink.textContent = 'Go to the study';
    }
  }
})();

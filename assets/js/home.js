(function () {
  const STORAGE_KEY = 'sra-home-checklists';

  const readState = () => {
    if (!('localStorage' in window)) {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  };

  const writeState = (state) => {
    if (!('localStorage' in window)) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore persistence errors (e.g., private mode).
    }
  };

  const updateCardProgress = (card, checkboxes) => {
    const total = checkboxes.length;
    const completed = checkboxes.filter((input) => input.checked).length;
    const progressChip = card.querySelector('.progress-chip');
    const title = card.querySelector('h2');
    const safeTitle = title ? title.textContent.trim() : 'Checklist';
    const progressLabel = `${completed}/${total} complete`;

    if (progressChip) {
      if (!progressChip.id) {
        progressChip.id = `${card.dataset.checklistId || 'checklist'}-progress`;
      }

      progressChip.textContent = progressLabel;
      progressChip.classList.toggle('is-complete', total > 0 && completed === total);
      progressChip.setAttribute(
        'aria-label',
        `${safeTitle} progress: ${completed} of ${total} tasks complete`
      );
      card.setAttribute('aria-describedby', progressChip.id);
    }

    card.dataset.complete = total > 0 && completed === total ? 'true' : 'false';
    card.setAttribute('data-progress-count', completed);
    card.setAttribute('data-progress-total', total);
    card.setAttribute('aria-roledescription', 'Checklist');
    card.setAttribute(
      'aria-label',
      `${safeTitle} checklist with ${total} tasks, ${completed} complete`
    );
  };

  document.addEventListener('DOMContentLoaded', () => {
    const cards = Array.from(document.querySelectorAll('[data-checklist-id]'));
    if (!cards.length) {
      return;
    }

    const state = readState();

    cards.forEach((card) => {
      const checklistId = card.dataset.checklistId;
      const checkboxes = Array.from(
        card.querySelectorAll('input[type="checkbox"][data-checklist-item]')
      );
      const storedValues = Array.isArray(state[checklistId]) ? state[checklistId] : [];

      checkboxes.forEach((input) => {
        if (storedValues.includes(input.value)) {
          input.checked = true;
        }

        input.addEventListener('change', () => {
          const selected = checkboxes
            .filter((item) => item.checked)
            .map((item) => item.value);

          state[checklistId] = selected;
          writeState(state);
          updateCardProgress(card, checkboxes);
        });
      });

      updateCardProgress(card, checkboxes);
    });
  });
})();

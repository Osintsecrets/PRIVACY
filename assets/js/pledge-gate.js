/* Non-blocking pledge: show once until agreed. Works even if JS is off (site remains navigable). */
(function(){
  const KEY = 'sra_pledge_v1';
  const modal = document.getElementById('pledgeModal');
  const agree = document.getElementById('pledgeAgree');
  const status = document.getElementById('pledgeStatus');

  function setChip(agreed){ if (status) status.textContent = agreed ? 'Pledge: Agreed' : 'Pledge: Pending'; }

  const agreed = localStorage.getItem(KEY) === '1';
  setChip(agreed);

  if (!agreed && modal && typeof modal.showModal === 'function') {
    setTimeout(() => modal.showModal(), 600);
  }
  if (agree && modal) {
    agree.addEventListener('click', () => {
      localStorage.setItem(KEY, '1');
      setChip(true);
      modal.close();
    });
  }
})();

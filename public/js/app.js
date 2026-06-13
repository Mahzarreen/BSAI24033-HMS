document.addEventListener('submit', e => {
  const btn = e.target.querySelector('button[type="submit"],button:not([type])');
  if (btn) { btn.disabled = true; setTimeout(()=>btn.disabled=false, 3000); }
});

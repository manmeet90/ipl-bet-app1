const Loader = {
  _pageEl: null,

  pageHTML() {
    return '<div class="page-loader"><div class="spinner"></div></div>';
  },

  showPage(container) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (container) container.innerHTML = this.pageHTML();
  },

  async btn(el, asyncFn) {
    if (!el || el.disabled) return;
    const original = el.innerHTML;
    el.disabled = true;
    el.classList.add('btn-loading');
    el.innerHTML = '<span class="spinner-sm"></span> ' + original;
    try {
      return await asyncFn();
    } finally {
      el.disabled = false;
      el.classList.remove('btn-loading');
      el.innerHTML = original;
    }
  },

  async action(el, asyncFn) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) return this.btn(el, asyncFn);
    return asyncFn();
  }
};

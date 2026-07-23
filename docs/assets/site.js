/* Shared behaviours for every page: menu, copy buttons, copy-on-codeblock, reveal. */
(function () {
  'use strict';

  // mobile menu
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var o = mnav.classList.toggle('open');
      burger.setAttribute('aria-expanded', o);
    });
    mnav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { mnav.classList.remove('open'); });
    });
  }

  function flash(btn, label) {
    var t = btn.textContent;
    btn.textContent = label || 'copied';
    setTimeout(function () { btn.textContent = t; }, 1300);
  }
  function copy(text) { if (navigator.clipboard) navigator.clipboard.writeText(text); }

  // explicit copy buttons: [data-cmd] copies a literal string, [data-c] copies an element's text
  document.querySelectorAll('[data-cmd]').forEach(function (b) {
    b.addEventListener('click', function () { copy(b.dataset.cmd); flash(b); });
  });
  document.querySelectorAll('[data-c]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.dataset.c);
      if (el) { copy(el.innerText); flash(b); }
    });
  });

  // auto-inject a copy button into every code block that doesn't already have one
  document.querySelectorAll('.doc-body pre').forEach(function (pre) {
    if (pre.closest('.codewrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'codewrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = document.createElement('button');
    btn.className = 'cbtn';
    btn.type = 'button';
    btn.textContent = 'copy';
    btn.addEventListener('click', function () { copy(pre.innerText); flash(btn); });
    wrap.appendChild(btn);
  });

  // tabs (landing "in practice" section)
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var scope = t.closest('section') || document;
      scope.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      scope.querySelectorAll('.pane').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      var p = document.getElementById(t.dataset.p);
      if (p) p.classList.add('on');
      var ef = document.getElementById('ex-file');
      if (ef) { var f = { 'p-neg': 'override.js', 'p-ci': 'ci.sh', 'p-demo': 'demo.sh' }; if (f[t.dataset.p]) ef.textContent = f[t.dataset.p]; }
    });
  });

  // scroll reveal
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
})();

/* Mara Akụkọ — maraakuko.app site behavior. No dependencies.
   Modules: storeLinks, nav, reveals, accordion, stickyBanner, parallax, analytics. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.remove('no-js');

  var cfg = window.MARA || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function ss(k, v) {
    try {
      if (v === undefined) return sessionStorage.getItem(k);
      sessionStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  /* ---------------- analytics (PostHog, cookieless, idle-loaded) ------------- */
  var phQueue = [];
  var phStubbed = false;

  function track(name, props) {
    if (phStubbed && window.posthog) window.posthog.capture(name, props);
    else phQueue.push([name, props]);
  }

  function loadPostHog() {
    if (phStubbed || !cfg.posthogKey || navigator.doNotTrack === '1') return;
    phStubbed = true;
    /* Official posthog-js snippet (stub queues calls until array.js loads). */
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split('.'); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; } (p = t.createElement('script')).type = 'text/javascript', p.crossOrigin = 'anonymous', p.async = !0, p.src = s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js', (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = 'posthog', u.people = u.people || [], u.toString = function (t) { var e = 'posthog'; return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e; }, u.people.toString = function () { return u.toString(1) + '.people (stub)'; }, o = 'init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug alias reset get_distinct_id getGroups get_session_id get_session_replay_url'.split(' '), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]); }, e.__SV = 1); }(d, window.posthog || []);
    window.posthog.init(cfg.posthogKey, {
      api_host: cfg.posthogHost,
      ui_host: 'https://eu.posthog.com',
      persistence: 'memory',
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_decide: true
    });
    while (phQueue.length) {
      var ev = phQueue.shift();
      window.posthog.capture(ev[0], ev[1]);
    }
  }

  function armAnalytics() {
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      loadPostHog();
    }
    window.addEventListener('load', function () {
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 3000 });
      else setTimeout(go, 2500);
    });
    ['pointerdown', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, go, { once: true, passive: true });
    });
  }

  /* Delegated click tracking: any [data-evt] element. */
  d.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-evt]');
    if (!el) return;
    var props = {};
    ['cta', 'store', 'state', 'slug'].forEach(function (k) {
      if (el.dataset[k]) props[k] = el.dataset[k];
    });
    track(el.dataset.evt, props);
  });

  /* ---------------- store badges: "coming soon" → live links ----------------- */
  function storeLinks() {
    $$('[data-store-slot]').forEach(function (slot) {
      var store = slot.getAttribute('data-store-slot');
      var url = store === 'ios' ? cfg.appStoreUrl : cfg.playUrl;
      if (!url) return; // pre-launch: keep the static "Coming soon" pill
      var a = d.createElement('a');
      a.className = 'store-badge store-badge--live';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('data-evt', 'store_badge_clicked');
      a.setAttribute('data-store', store);
      a.setAttribute('data-state', 'live');
      a.setAttribute('aria-label', store === 'ios' ? 'Download Mara Akụkọ on the App Store' : 'Get Mara Akụkọ on Google Play');
      a.innerHTML = slot.innerHTML;
      slot.replaceWith(a);
    });
  }

  /* ---------------- nav: solid-on-scroll, drawer, active section ------------- */
  function nav() {
    var header = $('.site-header');
    var menuBtn = $('.menu-btn');
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', window.scrollY > 24);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setDrawer(open) {
      if (open) d.body.setAttribute('data-drawer-open', '');
      else d.body.removeAttribute('data-drawer-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        setDrawer(!d.body.hasAttribute('data-drawer-open'));
      });
      d.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && d.body.hasAttribute('data-drawer-open')) {
          setDrawer(false);
          menuBtn.focus();
        }
      });
      $$('.drawer a').forEach(function (a) {
        a.addEventListener('click', function () { setDrawer(false); });
      });
    }

    /* Active-section highlight (desktop links + drawer links share data-nav). */
    var linkMap = {};
    $$('[data-nav]').forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      (linkMap[id] = linkMap[id] || []).push(a);
    });
    var watched = Object.keys(linkMap).map(function (id) { return d.getElementById(id); }).filter(Boolean);
    if ('IntersectionObserver' in window && watched.length) {
      var current = null;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (current) (linkMap[current] || []).forEach(function (a) { a.removeAttribute('aria-current'); });
          current = entry.target.id;
          (linkMap[current] || []).forEach(function (a) { a.setAttribute('aria-current', 'true'); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      watched.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------------- scroll reveals + section_viewed --------------------------- */
  function reveals() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -7% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });

    var seen = {};
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var need = 0.4 * Math.min(entry.boundingClientRect.height, window.innerHeight);
        if (entry.intersectionRect.height < need) return;
        var name = entry.target.getAttribute('data-section');
        if (seen[name]) return;
        seen[name] = true;
        track('section_viewed', { section: name });
        sio.unobserve(entry.target);
      });
    }, { threshold: [0.15, 0.4, 0.7] });
    $$('[data-section]').forEach(function (s) { sio.observe(s); });

    /* scroll depth: 25/50/75/100, each once */
    var marks = [25, 50, 75, 100];
    var t2 = false;
    window.addEventListener('scroll', function () {
      if (t2) return;
      t2 = true;
      requestAnimationFrame(function () {
        var doc = d.documentElement;
        var pct = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
        while (marks.length && pct >= marks[0] - 0.5) {
          track('scroll_depth', { percent: marks.shift() });
        }
        t2 = false;
      });
    }, { passive: true });
  }

  /* ---------------- FAQ accordion --------------------------------------------- */
  function accordion() {
    var wrap = $('.faq-list');
    if (!wrap) return;
    var opened = {};
    wrap.addEventListener('toggle', function (e) {
      var det = e.target;
      if (!det.open) return;
      $$('details[open]', wrap).forEach(function (other) {
        if (other !== det) other.open = false;
      });
      var q = ($('summary', det) || {}).textContent || '';
      q = q.trim();
      if (!opened[q]) {
        opened[q] = true;
        track('faq_opened', { question: q });
      }
    }, true);
  }

  /* ---------------- sticky mobile banner --------------------------------------- */
  function stickyBanner() {
    var banner = $('.sticky-banner');
    var hero = $('#top');
    if (!banner || !hero) return;
    if (ss('maraBannerHide')) return;
    var shown = false;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      var heroVisible = entries[0].isIntersecting;
      var show = !heroVisible && !ss('maraBannerHide');
      banner.classList.toggle('is-visible', show);
      if (show && !shown) {
        shown = true;
        track('sticky_banner_shown');
      }
    }, { threshold: 0 });
    io.observe(hero);
    var close = $('.sb-close', banner);
    if (close) close.addEventListener('click', function () {
      banner.classList.remove('is-visible');
      ss('maraBannerHide', '1');
      io.disconnect();
      track('sticky_banner_dismissed');
    });
  }

  /* ---------------- hero parallax ----------------------------------------------- */
  function parallax() {
    if (reduced) return;
    var phone = $('.hero-phone');
    if (!phone) return;
    var wide = window.matchMedia('(min-width: 1024px)');
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!wide.matches || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        phone.style.setProperty('--py', (y * -0.06).toFixed(1) + 'px');
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------------- boot ----------------------------------------------------------- */
  storeLinks();
  nav();
  reveals();
  accordion();
  stickyBanner();
  parallax();
  armAnalytics();
})();

/* ==========================================================================
   ConversIA — interactions
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  var yearEl = document.getElementById('ano-atual');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     Sticky header: shadow once the page is scrolled
     ------------------------------------------------------------------ */
  var header = document.querySelector('.site-header');

  function syncHeaderState() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  window.addEventListener('scroll', syncHeaderState, { passive: true });
  syncHeaderState();

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('menu-principal');

  function setNavOpen(open) {
    if (!navToggle || !nav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    nav.classList.toggle('is-open', open);
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close after picking a destination, so the target section is visible.
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setNavOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    // Reset state when leaving the mobile breakpoint.
    var desktopQuery = window.matchMedia('(min-width: 900px)');
    var onBreakpointChange = function (event) {
      if (event.matches) setNavOpen(false);
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onBreakpointChange);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onBreakpointChange);
    }
  }

  /* ------------------------------------------------------------------
     Smooth scroll
     CSS `scroll-behavior: smooth` handles it, but we also move focus to
     the target so keyboard and screen reader users follow along.
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;

    var hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    var target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });

    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });

    if (history.replaceState) history.replaceState(null, '', hash);
  });

  /* ------------------------------------------------------------------
     Active nav link while scrolling
     ------------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a[href^="#"]'));
  var sections = navLinks
    .map(function (link) { return document.getElementById(link.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ------------------------------------------------------------------
     FAQ accordion
     Panels keep the `hidden` attribute while collapsed so they stay out
     of the accessibility tree; CSS re-enables `display` so the height
     transition can still run.
     ------------------------------------------------------------------ */
  var faqButtons = Array.prototype.slice.call(document.querySelectorAll('.faq-question'));

  function collapse(button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel || button.getAttribute('aria-expanded') !== 'true') return;

    button.setAttribute('aria-expanded', 'false');
    panel.style.height = panel.scrollHeight + 'px';

    requestAnimationFrame(function () {
      panel.style.height = '0px';
    });

    afterTransition(panel, function () {
      if (button.getAttribute('aria-expanded') === 'false') panel.hidden = true;
    });
  }

  function expand(button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    panel.style.height = '0px';

    requestAnimationFrame(function () {
      panel.style.height = panel.scrollHeight + 'px';
    });

    afterTransition(panel, function () {
      // Release the fixed height so the panel can reflow (e.g. on resize).
      if (button.getAttribute('aria-expanded') === 'true') panel.style.height = 'auto';
    });
  }

  // Runs `done` on transitionend, with a timer fallback in case the
  // transition is suppressed (reduced motion, background tab).
  function afterTransition(el, done) {
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', onEnd);
      done();
    }

    function onEnd(event) {
      if (event.target === el && event.propertyName === 'height') finish();
    }

    el.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, 400);
  }

  faqButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var isOpen = button.getAttribute('aria-expanded') === 'true';

      // One panel at a time.
      faqButtons.forEach(function (other) {
        if (other !== button) collapse(other);
      });

      if (isOpen) collapse(button);
      else expand(button);
    });
  });

  /* ------------------------------------------------------------------
     Contact form validation
     No backend yet: valid submissions are logged and confirmed on screen.
     ------------------------------------------------------------------ */
  var form = document.getElementById('contact-form');

  if (form) {
    var status = document.getElementById('form-status');

    var rules = {
      nome: function (value) {
        if (!value) return 'Informe seu nome.';
        if (value.length < 2) return 'O nome parece curto demais.';
        return '';
      },
      email: function (value) {
        if (!value) return 'Informe seu e-mail.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Digite um e-mail válido, como voce@empresa.com.br.';
        return '';
      },
      whatsapp: function (value) {
        var digits = value.replace(/\D/g, '');
        if (!digits) return 'Informe seu WhatsApp.';
        if (digits.length < 10 || digits.length > 13) return 'Informe o número com DDD, por exemplo (11) 90000-0000.';
        return '';
      },
      mensagem: function (value) {
        if (!value) return 'Escreva uma mensagem.';
        if (value.length < 10) return 'Conte um pouco mais — pelo menos 10 caracteres.';
        return '';
      }
    };

    function showFieldError(field, message) {
      var errorEl = document.getElementById('erro-' + field.name);
      if (errorEl) errorEl.textContent = message;

      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    function validateField(field) {
      var rule = rules[field.name];
      if (!rule) return true;

      var message = rule(field.value.trim());
      showFieldError(field, message);
      return !message;
    }

    function setStatus(message, kind) {
      if (!status) return;
      status.textContent = message;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;

      // Validate on blur, then keep the message live once it has been shown.
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.hasAttribute('aria-invalid')) validateField(field);
      });
    });

    // Light formatting for Brazilian mobile numbers: (11) 90000-0000
    var whatsappField = form.elements.whatsapp;
    if (whatsappField) {
      whatsappField.addEventListener('input', function () {
        var digits = whatsappField.value.replace(/\D/g, '').slice(0, 11);
        var formatted = digits;

        if (digits.length > 2) {
          formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
        }
        if (digits.length > 6) {
          var split = digits.length > 10 ? 7 : 6;
          formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, split) + '-' + digits.slice(split);
        }

        whatsappField.value = formatted;
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var firstInvalid = null;

      Object.keys(rules).forEach(function (name) {
        var field = form.elements[name];
        if (!field) return;
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        setStatus('Revise os campos destacados para continuar.', 'error');
        firstInvalid.focus();
        return;
      }

      var payload = {
        nome: form.elements.nome.value.trim(),
        email: form.elements.email.value.trim(),
        whatsapp: form.elements.whatsapp.value.trim(),
        mensagem: form.elements.mensagem.value.trim(),
        enviadoEm: new Date().toISOString()
      };

      // TODO: replace with a real endpoint (Formspree, n8n webhook, own API).
      console.log('[ConversIA] Lead do formulário:', payload);

      form.reset();
      Object.keys(rules).forEach(function (name) {
        var field = form.elements[name];
        if (field) showFieldError(field, '');
      });

      setStatus('Recebemos seus dados, ' + payload.nome.split(' ')[0] + '! Retornamos no seu WhatsApp em breve.', 'success');
    });
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealTargets = document.querySelectorAll(
    '.card, .step, .stat, .testimonial, .plan, .section-head, .chat-card'
  );

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(revealTargets, function (el, index) {
      el.classList.add('reveal');
      el.style.transitionDelay = (index % 4) * 70 + 'ms';
      revealObserver.observe(el);
    });
  }
})();

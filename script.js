/* ==========================================================================
   ConversIA — interactions
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  'use strict';

  /* ==================================================================
     CONFIGURE ME
     ------------------------------------------------------------------
     The agency's WhatsApp number in international format, digits only:
     country code + area code + number, no "+", spaces or dashes.

       Brazil, (11) 98765-4321  ->  '5511987654321'

     While this is left as the placeholder below, every "Falar no
     WhatsApp" button falls back to scrolling to the contact form, so
     nobody ever lands on a broken wa.me link.

     There is no build step on this site, so this value lives here in
     source rather than in an environment variable.
     ================================================================== */
  var WHATSAPP_NUMBER = 'SEU_NUMERO_AQUI';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isConfiguredNumber = /^\d{10,15}$/.test(WHATSAPP_NUMBER);

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('#ano-atual'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------
     WhatsApp links
     Every CTA is marked `data-wa` with a `data-wa-message`. When the
     number above is filled in, they become real wa.me links; otherwise
     they keep the in-page fallback href they were authored with.
     ------------------------------------------------------------------ */
  var waLinks = document.querySelectorAll('[data-wa]');

  if (isConfiguredNumber) {
    Array.prototype.forEach.call(waLinks, function (link) {
      var message = link.getAttribute('data-wa-message') || '';
      var url = 'https://wa.me/' + WHATSAPP_NUMBER;
      if (message) url += '?text=' + encodeURIComponent(message);

      link.setAttribute('href', url);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
    });
  } else if (waLinks.length) {
    console.warn(
      '[ConversIA] WHATSAPP_NUMBER is not set in script.js — ' +
      waLinks.length + ' WhatsApp button(s) are falling back to the contact form. ' +
      'Set it to the number in international format, e.g. 5511987654321.'
    );
  }

  /* ------------------------------------------------------------------
     Placeholder links (the 360dialog onboarding URL on /comecar)
     Disabled until a real URL is pasted in, with a visible explanation.
     ------------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('[data-placeholder-link]'), function (link) {
    var href = link.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) return;

    link.setAttribute('aria-disabled', 'true');
    link.removeAttribute('href');

    var fallback = document.getElementById('onboarding-fallback');
    if (fallback) fallback.hidden = false;

    console.warn('[ConversIA] Onboarding link is still a placeholder in comecar.html.');
  });

  /* ------------------------------------------------------------------
     Sticky header
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

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setNavOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    var desktopQuery = window.matchMedia('(min-width: 900px)');
    var onBreakpointChange = function (event) { if (event.matches) setNavOpen(false); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onBreakpointChange);
    else if (desktopQuery.addListener) desktopQuery.addListener(onBreakpointChange);
  }

  /* ------------------------------------------------------------------
     Smooth scroll, with focus moved to the target so keyboard and
     screen reader users follow along.
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
     Demo request form -> POST /api/leads -> Supabase
     ------------------------------------------------------------------ */
  var form = document.getElementById('form-demo');

  if (form) {
    var status = document.getElementById('form-status');
    var submitBtn = document.getElementById('form-submit');

    var rules = {
      nome: function (value) {
        if (!value) return 'Informe seu nome.';
        if (value.length < 2) return 'O nome parece curto demais.';
        return '';
      },
      whatsapp: function (value) {
        var digits = value.replace(/\D/g, '');
        if (!digits) return 'Informe seu WhatsApp.';
        if (digits.length < 10 || digits.length > 13) return 'Informe o número com DDD, por exemplo (11) 90000-0000.';
        return '';
      },
      email: function (value) {
        // Optional, but must look like an address when filled in.
        if (!value) return '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Digite um e-mail válido ou deixe em branco.';
        return '';
      },
      segmento: function (value) {
        if (!value) return 'Escolha o tipo de negócio.';
        return '';
      },
      consentimento: function (_value, field) {
        if (!field.checked) return 'Precisamos da sua autorização para entrar em contato.';
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

      var message = rule(String(field.value || '').trim(), field);
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

      var eventName = field.type === 'checkbox' ? 'change' : 'blur';
      field.addEventListener(eventName, function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.hasAttribute('aria-invalid')) validateField(field);
      });
    });

    // Light formatting for Brazilian numbers: (11) 98765-4321
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
        whatsapp: form.elements.whatsapp.value.trim(),
        email: form.elements.email.value.trim(),
        segmento: form.elements.segmento.value,
        mensagem: form.elements.mensagem.value.trim(),
        consentimento: form.elements.consentimento.checked,
        site: form.elements.site ? form.elements.site.value : '' // honeypot
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
      setStatus('');

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; })
            .then(function (data) { return { ok: response.ok, data: data }; });
        })
        .then(function (result) {
          if (!result.ok) throw new Error(result.data.error || 'request_failed');

          form.reset();
          Object.keys(rules).forEach(function (name) {
            var field = form.elements[name];
            if (field) showFieldError(field, '');
          });

          setStatus(
            'Recebemos seus dados, ' + payload.nome.split(' ')[0] +
            '! Entramos em contato pelo seu WhatsApp em breve.',
            'success'
          );
        })
        .catch(function (error) {
          console.error('[ConversIA] Falha ao enviar o formulário:', error);
          setStatus(
            'Não conseguimos enviar agora. Tente de novo em instantes ou fale com a gente ' +
            'direto pelo WhatsApp.',
            'error'
          );
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Solicitar demonstração';
        });
    });
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealTargets = document.querySelectorAll(
    '.card, .step, .segment, .section-head, .chat-card, .callout, .start-box'
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

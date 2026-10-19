/**
 * AROVIA HEALTHCARE — CLIENT SCRIPTS
 * Module 9: Contact & Phone Functionality
 *
 * Implements:
 * 1. Mobile navigation drawer interactions (open/close, keyboard focus, ESC handling)
 * 2. Active navigation link highlighting across pages
 * 3. Desktop phone number clipboard copy with visual & screen-reader feedback
 * 4. Strict adherence to phone-first honesty: zero false call-connected claims,
 *    standard native tel: URI delegation for mobile and desktop call applications.
 */

(function () {
  'use strict';

  // Authoritative Brand Contact Constants
  var OFFICIAL_PHONE_DISPLAY = '+91 96496 48430';
  var OFFICIAL_PHONE_URI = 'tel:+919649648430';

  // DOM Elements
  var menuToggle = document.getElementById('menuToggle');
  var mobileDrawer = document.getElementById('mobileDrawer');
  var drawerOverlay = document.getElementById('drawerOverlay');
  var drawerClose = document.getElementById('drawerClose');
  var liveAnnouncement = document.getElementById('liveAnnouncement');

  /**
   * Accessible live announcement for assistive technologies
   * @param {string} message
   */
  function announceToScreenReader(message) {
    if (!liveAnnouncement) {
      liveAnnouncement = document.getElementById('liveAnnouncement');
    }
    if (liveAnnouncement) {
      liveAnnouncement.textContent = message;
    }
  }

  /**
   * Open the mobile navigation drawer
   */
  function openDrawer() {
    if (!mobileDrawer || !drawerOverlay) return;
    mobileDrawer.classList.add('is-open');
    drawerOverlay.classList.add('is-visible');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
    if (drawerClose) {
      drawerClose.focus();
    }
  }

  /**
   * Close the mobile navigation drawer
   */
  function closeDrawer() {
    if (!mobileDrawer || !drawerOverlay) return;
    mobileDrawer.classList.remove('is-open');
    drawerOverlay.classList.remove('is-visible');
    mobileDrawer.setAttribute('aria-hidden', 'true');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.focus();
    }
    document.body.style.overflow = '';
  }

  // Event Listeners for Mobile Navigation
  if (menuToggle) {
    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      var isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  if (drawerClose) {
    drawerClose.addEventListener('click', function (e) {
      e.preventDefault();
      closeDrawer();
    });
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', function () {
      closeDrawer();
    });
  }

  // Keyboard accessibility (ESC to close drawer)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  /**
   * Active Navigation Highlighter based on current filename
   */
  function highlightActiveNav() {
    var path = window.location.pathname;
    var filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    var navLinks = document.querySelectorAll('.main-nav__link, .mobile-drawer__link');
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === filename || (filename === '' && href === 'index.html')) {
        link.classList.add('main-nav__link--active');
        link.classList.add('mobile-drawer__link--active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('main-nav__link--active');
        link.classList.remove('mobile-drawer__link--active');
        link.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Fallback text copy method for older browsers
   * @param {string} text
   * @param {function} callback
   */
  function fallbackCopyText(text, callback) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    textArea.setAttribute('aria-hidden', 'true');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      var successful = document.execCommand('copy');
      if (successful && callback) {
        callback();
      }
    } catch (err) {
      console.warn('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  }

  /**
   * Phone Number Clipboard Copy Handler
   * Allows desktop visitors to quickly copy the phone number without dialing.
   */
  function initCopyPhoneButtons() {
    var copyButtons = document.querySelectorAll('.btn-copy-phone');
    if (!copyButtons.length) return;

    copyButtons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var rawNumber = btn.getAttribute('data-phone') || OFFICIAL_PHONE_DISPLAY;
        var formatted = OFFICIAL_PHONE_DISPLAY;

        function onCopiedSuccess() {
          var labelSpan = btn.querySelector('span');
          var originalLabel = labelSpan ? labelSpan.textContent : btn.textContent;
          if (labelSpan) {
            labelSpan.textContent = '✓ Copied: ' + formatted;
          }
          btn.classList.add('is-copied');
          announceToScreenReader('Phone number ' + formatted + ' copied to clipboard.');

          setTimeout(function () {
            if (labelSpan) {
              labelSpan.textContent = originalLabel;
            }
            btn.classList.remove('is-copied');
          }, 2500);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(formatted).then(onCopiedSuccess).catch(function () {
            fallbackCopyText(formatted, onCopiedSuccess);
          });
        } else {
          fallbackCopyText(formatted, onCopiedSuccess);
        }
      });
    });
  }

  /**
   * Global Connect Button & Horizontal Social Dock Interaction
   *
   * Requirement:
   * - Connect button remains stationary at far right of navigation bar.
   * - On click, reveals Instagram, Facebook, and YouTube horizontally to the left of Connect.
   * - On second click or outside click/Escape, animates back toward Connect until hidden.
   * - 0px layout shift on brand, tagline, nav links, or button.
   * - Reads settings from window.AROVIA_SOCIAL_CONFIG (defined in js/social-config.js).
   */
  function initConnectDock() {
    var config = window.AROVIA_SOCIAL_CONFIG || {
      instagram: { name: 'Instagram', url: null, statusText: 'Coming Soon' },
      youtube: { name: 'YouTube', url: null, statusText: 'Coming Soon' },
      facebook: { name: 'Facebook', url: null, statusText: 'Coming Soon' }
    };

    var mainConnectBtn = document.getElementById('connectBtn');
    var connectDropdown = document.getElementById('connectDropdown') || (mainConnectBtn ? mainConnectBtn.closest('.connect-dropdown') : null);
    var connectDock = document.getElementById('connectSocialDock') || (connectDropdown ? connectDropdown.querySelector('.connect-social-dock') : null);

    // Fallback: If markup doesn't have the dock yet, create it dynamically
    if (!connectDock && connectDropdown) {
      connectDock = document.createElement('div');
      connectDock.id = 'connectSocialDock';
      connectDock.className = 'connect-social-dock';
      connectDock.setAttribute('role', 'group');
      connectDock.setAttribute('aria-label', 'Arovia Official Social Media Channels');
      connectDock.setAttribute('aria-hidden', 'true');
      connectDock.innerHTML = [
        '<a href="#" class="connect-social-icon connect-social-icon--instagram" data-platform="instagram" aria-label="Arovia on Instagram" title="Arovia on Instagram" role="button">',
        '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
        '</a>',
        '<a href="#" class="connect-social-icon connect-social-icon--facebook" data-platform="facebook" aria-label="Arovia on Facebook" title="Arovia on Facebook" role="button">',
        '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
        '</a>',
        '<a href="#" class="connect-social-icon connect-social-icon--youtube" data-platform="youtube" aria-label="Arovia on YouTube" title="Arovia on YouTube" role="button">',
        '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        '</a>'
      ].join('');
      connectDropdown.insertBefore(connectDock, mainConnectBtn);
    }

    if (!connectDropdown || !mainConnectBtn) return;

    var socialIcons = connectDock ? connectDock.querySelectorAll('.connect-social-icon') : [];

    // Configure social items based on centralized config
    socialIcons.forEach(function (item) {
      var platform = item.getAttribute('data-platform');
      var pConfig = config[platform];
      if (!pConfig) return;

      if (pConfig.url) {
        item.setAttribute('href', pConfig.url);
        item.setAttribute('target', '_blank');
        item.setAttribute('rel', 'noopener noreferrer');
        item.removeAttribute('role');
      } else {
        item.setAttribute('href', '#');
        item.setAttribute('role', 'button');
      }

      item.addEventListener('click', function (e) {
        if (!pConfig.url) {
          e.preventDefault();
          var msg = pConfig.comingSoonMessage || ('Arovia’s official ' + pConfig.name + ' channel is coming soon.');
          announceToScreenReader(msg);
        } else {
        }
      });
    });

    function showConnectDock() {
      connectDropdown.classList.remove('is-vanished');
      mainConnectBtn.setAttribute('aria-expanded', 'true');
      if (connectDock) {
        connectDock.setAttribute('aria-hidden', 'false');
      }
      announceToScreenReader('Social media channels visible.');
    }

    function vanishConnectDock() {
      connectDropdown.classList.add('is-vanished');
      mainConnectBtn.setAttribute('aria-expanded', 'false');
      if (connectDock) {
        connectDock.setAttribute('aria-hidden', 'true');
      }
      announceToScreenReader('Social media channels hidden.');
    }

    // Set initial state: Logos are visible by default ("otherwise they have to be there")
    mainConnectBtn.setAttribute('aria-expanded', 'true');
    if (connectDock) {
      connectDock.setAttribute('aria-hidden', 'false');
    }

    // Connect button toggle listener: clicking Connect button vanishes / reveals the logos
    mainConnectBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var isVanished = connectDropdown.classList.contains('is-vanished');
      if (isVanished) {
        showConnectDock();
      } else {
        vanishConnectDock();
      }
    });

    // Mobile drawer connect button listener
    var drawerConnectBtn = document.querySelector('.btn--connect-mobile');
    if (drawerConnectBtn) {
      drawerConnectBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isVanished = connectDropdown.classList.contains('is-vanished');
        if (isVanished) {
          showConnectDock();
        } else {
          vanishConnectDock();
        }
      });
    }
  }

  /**
   * Top Scroll Progress Line
   *
   * Reproduces the subtle brand green top-line scroll effect matching the Ohana Clinic reference.
   * Tracks viewport scroll progress and smoothly animates scaleX from left to right.
   * Fixed at the absolute top of the viewport above the sticky navigation header with zero layout shift.
   */
  function initScrollProgressLine() {
    var line = document.getElementById('scrollProgressLine');
    if (!line) {
      line = document.createElement('div');
      line.id = 'scrollProgressLine';
      line.className = 'scroll-progress-line';
      line.setAttribute('aria-hidden', 'true');
      var header = document.querySelector('.site-header');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(line, header);
      } else {
        document.body.insertBefore(line, document.body.firstChild);
      }
    }

    var ticking = false;

    function updateProgress() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

      if (scrollTop <= 0 || docHeight <= 0) {
        line.style.transform = 'scaleX(0)';
        line.classList.remove('is-active');
        ticking = false;
        return;
      }

      var progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      // Precision to 4 decimals for smooth sub-pixel rendering
      var scale = progress.toFixed(4);
      line.style.transform = 'scaleX(' + scale + ')';
      line.classList.add('is-active');
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial check in case the page loaded already scrolled
    updateProgress();
  }

  /**
   * Cinematic Healthcare CTA Scroll-Triggered Reveal
   */
  function initCinematicCta() {
    var ctaSection = document.querySelector('.cinematic-cta-section');
    if (!ctaSection) return;

    function revealCta() {
      ctaSection.classList.add('is-revealed');
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            revealCta();
            observer.unobserve(ctaSection);
          }
        });
      }, { threshold: 0.12 });

      observer.observe(ctaSection);
    } else {
      revealCta();
    }

    // Safety fallback: reveal immediately if already visible
    var rect = ctaSection.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      revealCta();
    }
    setTimeout(revealCta, 2500);
  }

  /**
   * Premium Typography & Scroll-Triggered Text Reveal System
   * Inspired by the reference standard (staggered word reveals & fluid scroll entrances)
   */
  function initTypographyAnimations() {
    // Respect reduced motion accessibility
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduced-motion');
      return;
    }

    document.documentElement.classList.add('js-loaded');

    // 1. Staggered Word Reveal for Main Hero Headings (Reference: verseWordReveal)
    var heroTitle = document.querySelector('.hero__title, .page-header__title');
    if (heroTitle && !heroTitle.dataset.wordsSplit) {
      heroTitle.dataset.wordsSplit = 'true';
      var text = heroTitle.textContent.trim();
      var words = text.split(/\s+/);
      
      heroTitle.innerHTML = '';
      words.forEach(function (word, index) {
        var span = document.createElement('span');
        span.className = 'word-reveal';
        span.style.setProperty('--word-index', index);
        span.textContent = word;
        heroTitle.appendChild(span);
        if (index < words.length - 1) {
          heroTitle.appendChild(document.createTextNode(' '));
        }
      });
    }

    // 2. Add entrance classes to Hero elements
    var heroBadge = document.querySelector('.hero__badge, .page-header__badge');
    if (heroBadge) heroBadge.classList.add('hero__badge-anim');

    var heroIntro = document.querySelector('.hero__intro, .page-header__subtitle');
    if (heroIntro) heroIntro.classList.add('hero__intro-anim');

    var heroActions = document.querySelector('.hero__actions, .page-header__actions');
    if (heroActions) heroActions.classList.add('hero__actions-anim');

    var heroImage = document.querySelector('.hero__image-card');
    if (heroImage) heroImage.classList.add('hero__image-anim');

    // 3. Scroll-Triggered Reveals for Section Headers & Content Blocks
    var targets = document.querySelectorAll(
      'section > .container > div:first-child, ' +
      '.section > .container > div:first-child, ' +
      '.service-detail-grid, ' +
      '.why-grid, ' +
      '.services-category-grid, ' +
      '.home-care-duo, ' +
      '.contact-methods-grid'
    );

    if ('IntersectionObserver' in window) {
      var scrollObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            scrollObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
      });

      targets.forEach(function (el) {
        el.classList.add('scroll-reveal');
        
        // Add stagger index to children if grid
        if (el.classList.contains('service-detail-grid') || 
            el.classList.contains('why-grid') || 
            el.classList.contains('services-category-grid') ||
            el.classList.contains('contact-methods-grid')) {
          Array.from(el.children).forEach(function (child, i) {
            child.classList.add('scroll-reveal-stagger');
            child.style.setProperty('--stagger-i', i);
          });
        }

        // Check if already in viewport on initial load
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-revealed');
        } else {
          scrollObserver.observe(el);
        }
      });
    } else {
      targets.forEach(function (el) {
        el.classList.add('is-revealed');
      });
    }
  }

  // Initialize all interactive modules on DOM Ready
  function initApp() {
    highlightActiveNav();
    initCopyPhoneButtons();
    initConnectDock();
    initScrollProgressLine();
    initCinematicCta();
    initTypographyAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();



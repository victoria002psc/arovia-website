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
  var OFFICIAL_PHONE_DISPLAY = '+91 7013775996';
  var OFFICIAL_PHONE_URI = 'tel:+917013775996';

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

  // Initialize all interactive modules on DOM Ready
  document.addEventListener('DOMContentLoaded', function () {
    highlightActiveNav();
    initCopyPhoneButtons();
  });
})();

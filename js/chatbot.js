/**
 * AROVIA HEALTHCARE — INTELLIGENT WEBSITE CHATBOT ASSISTANT
 * File: js/chatbot.js
 *
 * Implements:
 * 1. Self-contained floating chat launcher & responsive chat window interface
 * 2. Arovia-only strict scope validation and technical security defenses
 * 3. Intelligent Natural-Language Understanding (NLU) with typo tolerance (Levenshtein distance),
 *    slang/contraction normalization, synonym mapping, multi-intent classification,
 *    and conversation context tracking
 * 4. Grounded, verified knowledge retrieval across all 5 Arovia service categories:
 *    - Home Care (Caregivers vs Registered Nurses distinction)
 *    - Ambulance (Scheduled patient transit & acute emergency 108/112 advisory)
 *    - Medical Equipment (28 items, international export only, strict no-online-prices policy)
 *    - Pharmacy (Prescription requirement, verified inquiry, no medical prescribing)
 *    - Lab Tests (Home sample collection by trained professionals, test packages, phone inquiry)
 *    - Contact (Direct phone-first coordination: +91 96496 48430, Guntur, AP)
 * 5. Clickable internal links, working tel: action buttons, and keyboard accessibility
 * 6. Dual-engine architecture: resilient client-side NLU with optional /api/chat hook
 */

(function () {
  'use strict';

  // Authoritative Brand Constants
  var AROVIA_PHONE_DISPLAY = '+91 96496 48430';
  var AROVIA_PHONE_URI = 'tel:+919649648430';
  var AROVIA_WHATSAPP_URI = 'https://wa.me/919649648430?text=Hello%20Arovia%2C%20I%20would%20like%20to%20know%20more%20about%20your%20healthcare%20services.';
  var AROVIA_LOCATION = 'Guntur, Andhra Pradesh';

  // Default suggested questions (Prompt Section 7)
  var DEFAULT_SUGGESTIONS = [
    'What services does Arovia provide?',
    'How can I arrange home care?',
    'Do you provide home lab sample collection?',
    'What is the difference between caregivers and registered nurses?',
    'How can I check lab test prices and packages?',
    'What medical equipment is available?',
    'How can I find medicines and their prices?',
    'How can I contact Arovia?'
  ];

  // Conversation State
  var conversationState = {
    isOpen: false,
    history: [],
    lastService: null,
    isTyping: false
  };

  /* ==========================================================================
     1. Natural Language Preprocessing, Typo Correction & Damerau-Levenshtein
     ========================================================================== */

  /**
   * Calculate Damerau-Levenshtein distance between two strings
   */
  function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    var i, j;

    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Canonical Vocabulary for Typo Correction
  var CANONICAL_WORDS = [
    'caregiver', 'caretaker', 'attendant', 'nurse', 'nursing', 'homecare',
    'ambulance', 'transport', 'equipment', 'wheelchair', 'stretcher', 'trolley',
    'bed', 'icu', 'pharmacy', 'medicine', 'prescription', 'clinic', 'doctor',
    'appointment', 'consultation', 'laboratory', 'diagnostic', 'blood', 'sample',
    'collection', 'package', 'price', 'cost', 'charge', 'contact', 'phone',
    'call', 'guntur', 'emergency', 'international', 'export', 'shipping', 'available'
  ];

  // Specific Misspelling Dictionary for rapid mapping
  var TYPO_MAP = {
    'nurce': 'nurse',
    'nerse': 'nurse',
    'nurs': 'nurse',
    'nursingg': 'nursing',
    'caretakr': 'caregiver',
    'care taker': 'caregiver',
    'cargiver': 'caregiver',
    'caregivver': 'caregiver',
    'attendent': 'attendant',
    'tesst': 'test',
    'tessts': 'tests',
    'tst': 'test',
    'tsts': 'tests',
    'labtest': 'lab test',
    'labtests': 'lab tests',
    'avilable': 'available',
    'availble': 'available',
    'avaliable': 'available',
    'ambulence': 'ambulance',
    'ambulens': 'ambulance',
    'amblance': 'ambulance',
    'equpment': 'equipment',
    'eqipment': 'equipment',
    'equipmnt': 'equipment',
    'catlog': 'catalog',
    'catlogue': 'catalog',
    'farmacy': 'pharmacy',
    'medisin': 'medicine',
    'medisines': 'medicines',
    'medicne': 'medicine',
    'meds': 'medicines',
    'clnic': 'clinic',
    'clinc': 'clinic',
    'apointment': 'appointment',
    'appoinment': 'appointment',
    'apointments': 'appointments',
    'colletion': 'collection',
    'sampel': 'sample',
    'sampl': 'sample',
    'bloood': 'blood',
    'shippin': 'shipping',
    'delivry': 'delivery',
    'costt': 'cost',
    'pric': 'price',
    'diabtes': 'diabetes',
    'shugar': 'sugar',
    'presure': 'pressure'
  };

  /**
   * Normalize input text: lowercase, collapse duplicate chars, expand contractions
   */
  function normalizeText(input) {
    if (!input || typeof input !== 'string') return '';
    var text = input.toLowerCase().trim();

    // Expand common contractions and informal web shorthands
    text = text
      .replace(/\bdo\s+u\b/g, 'do you')
      .replace(/\bu\b/g, 'you')
      .replace(/\bur\b/g, 'your')
      .replace(/\bpls\b|\bplz\b/g, 'please')
      .replace(/\bwanna\b/g, 'want to')
      .replace(/\bgonna\b/g, 'going to')
      .replace(/\bcant\b/g, 'cannot')
      .replace(/\bdont\b/g, 'do not')
      .replace(/\bwhats\b/g, 'what is')
      .replace(/\bwheres\b/g, 'where is')
      .replace(/\bhows\b/g, 'how is')
      .replace(/\bsome\s*one\b/g, 'someone');

    // Collapse excessively repeated characters (e.g. "blooood" -> "blood", "nurrrssse" -> "nurse")
    text = text.replace(/([a-zA-Z])\1{2,}/g, '$1$1');

    // Remove noisy punctuation except hyphens/slashes
    text = text.replace(/[!?,;:@#$%^&*()_=+~`"'{}\[\]|\\<>]+/g, ' ');

    // Normalize multiple spaces
    text = text.replace(/\s+/g, ' ').trim();

    // Map known multi-word or single-word typos
    var words = text.split(' ');
    var correctedWords = words.map(function (w) {
      if (TYPO_MAP[w]) return TYPO_MAP[w];

      // If word is 4+ chars, check fuzzy distance against canonical vocabulary
      if (w.length >= 4) {
        for (var i = 0; i < CANONICAL_WORDS.length; i++) {
          var target = CANONICAL_WORDS[i];
          if (Math.abs(w.length - target.length) <= 2) {
            var dist = levenshteinDistance(w, target);
            if (dist === 1 || (dist === 2 && w.length >= 6)) {
              return target;
            }
          }
        }
      }
      return w;
    });

    return correctedWords.join(' ');
  }

  /* ==========================================================================
     2. Strict Scope Validation & Technical Security Defenses
     ========================================================================== */

  /**
   * Security defense check: Redirect technical, system prompt, or backend extraction attempts
   */
  function checkSecurityViolation(rawText) {
    var lower = rawText.toLowerCase();
    var securityPatterns = [
      /\bapi[- ]?key\b/i,
      /\bsecret\b/i,
      /\bsource[- ]?code\b/i,
      /\bbackend\b/i,
      /\bdatabase\b/i,
      /\bsystem[- ]?prompt\b/i,
      /\binstruction[s]?\b/i,
      /\bserver[- ]?config\b/i,
      /\badmin[- ]?password\b/i,
      /\breveal\b/i,
      /\boverride\b/i,
      /\bignore[- ]?previous\b/i
    ];

    for (var i = 0; i < securityPatterns.length; i++) {
      if (securityPatterns[i].test(lower)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Scope gating check: Checks if query is purely unrelated to Arovia healthcare
   */
  function isOutOfScope(rawText, normalizedText) {
    var lower = rawText.toLowerCase();

    // Explicitly off-topic subject patterns
    var offTopicPatterns = [
      /\bcapital of\b/i,
      /\bpresident of\b/i,
      /\btallest mountain\b/i,
      /\bwho won\b/i,
      /\bwrite (python|javascript|code|html|css|sql|script)\b/i,
      /\bprogramming\b/i,
      /\bweather in\b/i,
      /\btell (me )?a joke\b/i,
      /\bmovie (recommendation|review)\b/i,
      /\bplay (song|music)\b/i,
      /\bhow to bake\b/i,
      /\brecipe for\b/i,
      /\bhow to cure cancer\b/i,
      /\bdiagnose my (chest|headache|stomach|tumor)\b/i,
      /\bwhat is \d+\s*[\+\-\*\/]\s*\d+\b/i,
      /\b\d+\s*plus\s*\d+\b/i
    ];

    var matchesOffTopic = false;
    for (var i = 0; i < offTopicPatterns.length; i++) {
      if (offTopicPatterns[i].test(lower)) {
        matchesOffTopic = true;
        break;
      }
    }

    if (!matchesOffTopic) return false;

    // Check if query ALSO contains Arovia healthcare keywords (mixed query)
    var aroviaKeywords = [
      'arovia', 'home care', 'caregiver', 'nurse', 'nursing', 'ambulance',
      'medical equipment', 'equipment', 'pharmacy', 'medicine', 'clinic',
      'lab test', 'blood test', 'sample', 'collection', 'test', 'package'
    ];

    for (var j = 0; j < aroviaKeywords.length; j++) {
      if (normalizedText.indexOf(aroviaKeywords[j]) !== -1) {
        return false; // Mixed query! Allow handling of the Arovia portion.
      }
    }

    return true; // Purely out of scope
  }

  /* ==========================================================================
     3. Grounded Arovia Knowledge Base & Intent Resolution
     ========================================================================== */

  /**
   * Parse greetings: handles repeated letters (hiii, hellooo, heyy), formal & regional greetings
   */
  function parseGreeting(rawText) {
    if (!rawText) return null;
    var trimmed = rawText.trim();
    // Pattern matches: hi, hii, hiii, hey, heyy, hello, helo, hellooo, good morning/afternoon/evening, namaste, greetings
    // Optionally followed by "avi" or "there"
    var greetingRegex = /^(h+i+|h+e+y+|h+e+l+l*o+|good\s+(morning|afternoon|evening)|namaste|greetings)(\s+avi|\s+there)?[\s,!.?–—-]*/i;
    var match = trimmed.match(greetingRegex);
    if (!match) return null;

    var matchedPrefix = match[0];
    var remainder = trimmed.slice(matchedPrefix.length).trim();
    // Clean out casual non-question filler if nothing else exists
    var cleanRemainder = remainder.replace(/^(avi|there|how are you|how r u|what'?s up)[\s,!.?–—-]*/i, '').trim();

    return {
      isGreeting: true,
      hasQuestion: cleanRemainder.length > 0,
      question: cleanRemainder
    };
  }

  /**
   * Core NLU Intent Classifier & Grounded Response Generator
   */
  function generateAroviaResponse(rawQuery) {
    // 1. Technical Security Shield Check
    if (checkSecurityViolation(rawQuery)) {
      return {
        text: "I'm here to help you explore Arovia's healthcare services and website information. You can ask me about our services, products, lab tests, or how to contact Arovia directly.",
        actions: [
          { label: 'Explore Services', url: 'index.html#services' },
          { label: 'Call Arovia', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 2. Greeting Handling (Pure Greeting vs Greeting + Question)
    var greetingInfo = parseGreeting(rawQuery);
    var queryToEvaluate = rawQuery;
    var isCombinedGreeting = false;

    if (greetingInfo) {
      if (!greetingInfo.hasQuestion) {
        // Pure Greeting: e.g. "Hii", "Hello AVI", "Namaste", "Good morning"
        return {
          text: "Hi! 👋 How can I assist you today?",
          showSuggestions: true,
          actions: [
            { label: 'Explore Services', url: 'index.html#services' },
            { label: 'Call Arovia Desk', url: AROVIA_PHONE_URI, isCall: true }
          ]
        };
      } else {
        // Combined Greeting + Question (e.g. "Hi, do you provide home lab tests?")
        queryToEvaluate = greetingInfo.question;
        isCombinedGreeting = true;
      }
    }

    var normalized = normalizeText(queryToEvaluate);

    // 3. Strict Arovia Scope Check
    if (isOutOfScope(queryToEvaluate, normalized)) {
      return {
        text: "I'm here to help you explore Arovia's healthcare services and website. What would you like to know about Arovia?",
        actions: [
          { label: 'View All Services', url: 'index.html#services' },
          { label: 'Call: ' + AROVIA_PHONE_DISPLAY, url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 4. Intent Classification across verified knowledge base
    var response = resolveAroviaIntent(normalized, queryToEvaluate);

    // If it was a combined greeting + question, prepend a brief polite greeting to the response
    if (isCombinedGreeting && response && response.text) {
      response.text = "Hello! " + response.text;
    }

    return response;
  }

  /**
   * Internal Intent Knowledge Resolver
   */
  function resolveAroviaIntent(normalized, rawQuery) {

    // 4. Intent: Caregiver vs Registered Nurse Distinction
    var isCaregiverNurseDiff = (
      (normalized.indexOf('difference') !== -1 || normalized.indexOf('vs') !== -1 || normalized.indexOf('or') !== -1 || normalized.indexOf('between') !== -1) &&
      (normalized.indexOf('nurse') !== -1 || normalized.indexOf('nursing') !== -1) &&
      (normalized.indexOf('caregiver') !== -1 || normalized.indexOf('caretaker') !== -1 || normalized.indexOf('attendant') !== -1)
    );

    if (isCaregiverNurseDiff) {
      conversationState.lastService = 'home-care';
      return {
        text: "Arovia provides two distinct categories of home care tailored to different patient needs:\n\n" +
              "• **Caregivers (Non-Clinical Daily Living Assistance):** Dedicated attendants who provide non-clinical everyday living support, including personal hygiene, bathing and dressing assistance, meal support and feeding assistance, mobility assistance, companionship, and medication reminders without prescribing or changing medicines.\n\n" +
              "• **Registered Nurses (Professional Clinical Nursing Services):** Appropriately qualified clinical personnel who provide skilled nursing care at home, including injections, IV therapy, sterile wound care and dressings, catheter management, and vital signs monitoring when clinically appropriate.\n\n" +
              "In summary, caregivers handle everyday personal care and daily living assistance, while registered nurses carry out clinical nursing procedures.",
        actions: [
          { label: 'Explore Home Care', url: 'home-care.html' },
          { label: 'Call for Guidance', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 5. Intent: Lab Tests & Home Sample Collection
    var isLabQuery = (
      normalized.indexOf('lab test') !== -1 ||
      normalized.indexOf('blood test') !== -1 ||
      normalized.indexOf('blood sample') !== -1 ||
      (normalized.indexOf('sample') !== -1 && (normalized.indexOf('blood') !== -1 || normalized.indexOf('collect') !== -1)) ||
      normalized.indexOf('sample collection') !== -1 ||
      normalized.indexOf('home sample') !== -1 ||
      /\blab\b/i.test(normalized) ||
      /\blabs\b/i.test(normalized) ||
      normalized.indexOf('cbc') !== -1 ||
      normalized.indexOf('lipid') !== -1 ||
      normalized.indexOf('fasting blood sugar') !== -1 ||
      normalized.indexOf('sugar test') !== -1 ||
      normalized.indexOf('thyroid') !== -1 ||
      normalized.indexOf('hba1c') !== -1 ||
      normalized.indexOf('lft') !== -1 ||
      normalized.indexOf('kft') !== -1 ||
      normalized.indexOf('diagnostic') !== -1
    );

    if (isLabQuery) {
      conversationState.lastService = 'lab-tests';

      // Specific query about home sample collection
      if (normalized.indexOf('home') !== -1 || normalized.indexOf('come') !== -1 || normalized.indexOf('house') !== -1 || normalized.indexOf('visit') !== -1 || normalized.indexOf('collection') !== -1) {
        return {
          text: "Yes! For laboratory tests, **trained, qualified professionals visit the customer's home to collect samples** under sterile protocols (home sample collection).\n\n" +
                "• **How it works:** Call our diagnostic desk via the helpline number in the header or footer with your doctor's requisition slip and fasting status. Our coordinator confirms preparation rules, quotes transparent published charges, and schedules a qualified phlebotomist to collect your sample at home.\n\n" +
                "• **Available investigations:** Individual tests (CBC, Fasting Blood Sugar, HbA1c, Thyroid, Lipid Profile, LFT, KFT) and Comprehensive Health Packages.",
          actions: [
            { label: 'View Lab Tests Page', url: 'lab-tests.html' },
            { label: 'Call Diagnostic Desk', url: AROVIA_PHONE_URI, isCall: true }
          ]
        };
      }

      // Query about lab prices or packages
      if (normalized.indexOf('price') !== -1 || normalized.indexOf('cost') !== -1 || normalized.indexOf('package') !== -1 || normalized.indexOf('charge') !== -1 || normalized.indexOf('fee') !== -1) {
        return {
          text: "Arovia coordinates both individual diagnostic tests and comprehensive screening packages with professional home sample collection:\n\n" +
                "• **Individual Tests:** Complete Blood Count (CBC), Fasting Blood Sugar (FBS), Glycated Hemoglobin (HbA1c), Lipid Profile, Thyroid Profile (T3, T4, TSH), Liver Function Test (LFT), and Kidney Function Test (KFT).\n" +
                "• **Multi-Parameter Packages:** Comprehensive Health Checkup Packages, Senior Citizen Wellness Panels, and Metabolic Screenings.\n\n" +
                "Charges are quoted transparently over the telephone before any testing is arranged, with no hidden platform fees. Please call our diagnostic desk via our helpline to verify current test fees and schedule collection.",
          actions: [
            { label: 'Explore Lab Tests', url: 'lab-tests.html' },
            { label: 'Call for Pricing', url: AROVIA_PHONE_URI, isCall: true }
          ]
        };
      }

      // General lab query
      return {
        text: "Arovia coordinates diagnostic laboratory investigations with **trained, qualified professionals visiting your home for sample collection**.\n\n" +
              "• We offer individual tests (CBC, Fasting Sugar, HbA1c, Lipid, Thyroid, LFT, KFT) and bundled health screening packages.\n" +
              "• To enquire or schedule, call our diagnostic desk directly via the helpline number in the header or footer with your doctor's requisition slip.",
        actions: [
          { label: 'Lab Tests & Packages', url: 'lab-tests.html' },
          { label: 'Call Diagnostic Desk', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 6. Intent: Home Care (Caregivers & Registered Nurses)
    var isHomeCareQuery = (
      normalized.indexOf('home care') !== -1 ||
      normalized.indexOf('homecare') !== -1 ||
      normalized.indexOf('caregiver') !== -1 ||
      normalized.indexOf('caretaker') !== -1 ||
      normalized.indexOf('nurse') !== -1 ||
      normalized.indexOf('nursing') !== -1 ||
      normalized.indexOf('attendant') !== -1 ||
      normalized.indexOf('help my father') !== -1 ||
      normalized.indexOf('help my mother') !== -1 ||
      normalized.indexOf('elderly care') !== -1 ||
      normalized.indexOf('bedridden') !== -1 ||
      normalized.indexOf('wound dressing') !== -1 ||
      normalized.indexOf('injection') !== -1
    );

    if (isHomeCareQuery) {
      conversationState.lastService = 'home-care';
      return {
        text: "Arovia provides compassionate, dependable in-home care in two distinct categories:\n\n" +
              "1. **Caregivers (Everyday Living Support):** Attendants who assist with bathing, dressing, meal support, mobility assistance, safe daily physical routines, and friendly companionship.\n" +
              "2. **Registered Nurses (Clinical Nursing):** Qualified clinical nurses who administer physician-prescribed injections, IV infusions, sterile wound dressings, catheter management, and vital signs monitoring.\n\n" +
              "**How to arrange:** Call our coordination desk via the helpline number in the header or footer to discuss your patient's specific routine and clinical needs.",
        actions: [
          { label: 'Explore Home Care', url: 'home-care.html' },
          { label: 'Call Coordination Desk', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 7. Intent: Medical Equipment (28 items, International Export Only, No Online Prices)
    var isEquipmentQuery = (
      normalized.indexOf('medical equipment') !== -1 ||
      normalized.indexOf('equipment') !== -1 ||
      normalized.indexOf('hospital bed') !== -1 ||
      normalized.indexOf('icu bed') !== -1 ||
      normalized.indexOf('wheelchair') !== -1 ||
      normalized.indexOf('stretcher') !== -1 ||
      normalized.indexOf('trolley') !== -1 ||
      normalized.indexOf('monitor') !== -1 ||
      normalized.indexOf('av-het') !== -1 ||
      normalized.indexOf('av-ei3a') !== -1 ||
      normalized.indexOf('export') !== -1 ||
      normalized.indexOf('international shipping') !== -1
    );

    if (isEquipmentQuery) {
      conversationState.lastService = 'medical-equipment';
      return {
        text: "Arovia coordinates a verified catalog of **28 hospital-grade equipment items** spanning electric ICU beds, hydraulic recovery stretchers, ward furniture, patient mobility aids (wheelchairs), and diagnostic monitors.\n\n" +
              "**Important Equipment Policies:**\n" +
              "• **International Export Only:** All equipment is supplied exclusively for international institutional and healthcare export.\n" +
              "• **No Online Prices:** In accordance with Arovia policy, equipment prices are never published online due to destination port tariffs and institutional volume requirements.\n\n" +
              "Browse product specifications on our Medical Equipment page and call our equipment desk to request a formal Proforma Invoice and shipping schedule.",
        actions: [
          { label: 'View Equipment Catalog', url: 'medical-equipment.html' },
          { label: 'Call Equipment Desk', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 8. Intent: Pharmacy & Medicines
    var isPharmacyQuery = (
      normalized.indexOf('pharmacy') !== -1 ||
      normalized.indexOf('medicine') !== -1 ||
      normalized.indexOf('medicines') !== -1 ||
      normalized.indexOf('prescription') !== -1 ||
      normalized.indexOf('pill') !== -1 ||
      normalized.indexOf('tablet') !== -1 ||
      normalized.indexOf('drug') !== -1
    );

    if (isPharmacyQuery) {
      conversationState.lastService = 'pharmacy';
      return {
        text: "Arovia coordinates pharmaceutical dispensation for acute treatments, post-surgical recovery, and chronic disease maintenance (cardiac, diabetic, thyroid, and respiratory therapies):\n\n" +
              "• **Prescription Verification:** In compliance with statutory drug regulations (Drugs & Cosmetics Act), all prescription medicines (Schedule H, H1, X) require a valid doctor's prescription.\n" +
              "• **Responsible Healthcare:** Arovia does not provide unsupervised e-commerce checkouts, nor do we prescribe medicines or calculate individual dosages.\n\n" +
              "To enquire about availability, prescription requirements, and the applicable price, please call our pharmacy desk directly via our helpline. This website does not show a live medicine list.",
        actions: [
          { label: 'Explore Pharmacy Page', url: 'pharmacy.html' },
          { label: 'Call Pharmacy Desk', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 9. Intent: Clinic / Outpatient Doctor Inquiries
    var isClinicQuery = (
      normalized.indexOf('clinic') !== -1 ||
      normalized.indexOf('doctor appointment') !== -1 ||
      normalized.indexOf('opd') !== -1
    );

    if (isClinicQuery) {
      return {
        text: "Arovia does not operate an outpatient clinic or doctor consultation service. We specialize in 5 active healthcare services:\n\n" +
              "• **Home Care:** Everyday personal caregivers & registered nurses for clinical care at home\n" +
              "• **Ambulance Services:** Non-emergency patient transit & hospital transfers\n" +
              "• **Medical Equipment:** Hospital-grade beds, monitors, and surgical furniture for export\n" +
              "• **Pharmacy Services:** Prescription and chronic medication coordination\n" +
              "• **Diagnostic Lab Tests:** Blood tests and preventive panels with home sample collection\n\n" +
              "Please call our helpline or explore our service pages for assistance.",
        actions: [
          { label: 'Explore Home Care', url: 'home-care.html' },
          { label: 'Call Helpline', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 10. Intent: Ambulance & Transportation
    var isAmbulanceQuery = (
      normalized.indexOf('ambulance') !== -1 ||
      normalized.indexOf('patient transport') !== -1 ||
      normalized.indexOf('transit') !== -1 ||
      normalized.indexOf('transfer') !== -1
    );

    if (isAmbulanceQuery) {
      conversationState.lastService = 'ambulance';
      return {
        text: "Arovia coordinates safe, assisted patient transportation for scheduled hospital admissions, post-treatment discharges, diagnostic appointments, and inter-facility transfers:\n\n" +
              "• **Emergency Advisory:** If a person is experiencing an acute, life-threatening emergency (such as severe chest pain, loss of consciousness, or difficulty breathing), please immediately dial emergency services (**108** or **112** in India).\n" +
              "• **Arranging Transit:** For planned transfers, dial our transportation desk via our helpline to verify vehicle availability, route specifications, and stretcher support.",
        actions: [
          { label: 'Explore Ambulance', url: 'ambulance.html' },
          { label: 'Call Transportation Desk', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 11. Intent: Contact & Phone Inquiry
    var isContactQuery = (
      normalized.indexOf('contact') !== -1 ||
      normalized.indexOf('phone') !== -1 ||
      normalized.indexOf('call') !== -1 ||
      normalized.indexOf('number') !== -1 ||
      normalized.indexOf('location') !== -1 ||
      normalized.indexOf('address') !== -1 ||
      normalized.indexOf('guntur') !== -1 ||
      normalized.indexOf('enquire') !== -1 ||
      normalized.indexOf('inquire') !== -1 ||
      normalized.indexOf('how to reach') !== -1
    );

    if (isContactQuery) {
      return {
        text: "You can reach Arovia directly through our single point of contact:\n\n" +
              "• **Official Phone Number:** **" + AROVIA_PHONE_DISPLAY + "**\n" +
              "• **WhatsApp:** **" + AROVIA_PHONE_DISPLAY + "**\n" +
              "• **Location:** Guntur, Andhra Pradesh\n" +
              "• **Direct Model:** Direct phone and WhatsApp communication with no online forms, accounts, or automated voice bots required.\n\n" +
              "Speak with our coordinators to discuss home care, ambulance transit, medical equipment export, pharmacy supplies, or diagnostic lab tests.",
        actions: [
          { label: 'Call ' + AROVIA_PHONE_DISPLAY, url: AROVIA_PHONE_URI, isCall: true },
          { label: 'WhatsApp Arovia', url: AROVIA_WHATSAPP_URI, isWhatsApp: true },
          { label: 'Contact Page', url: 'contact.html' }
        ]
      };
    }

    // 12. Intent: Services Overview / General Introduction
    var isOverviewQuery = (
      normalized.indexOf('service') !== -1 ||
      normalized.indexOf('provide') !== -1 ||
      normalized.indexOf('offer') !== -1 ||
      normalized.indexOf('about arovia') !== -1 ||
      normalized.indexOf('what do you do') !== -1 ||
      normalized.indexOf('who are you') !== -1 ||
      normalized.indexOf('help') !== -1
    );

    if (isOverviewQuery) {
      return {
        text: "I'm **AVI**, Arovia's Virtual Assistant! Arovia coordinates five essential healthcare services:\n\n" +
              "1. **Home Care:** Everyday personal caregivers and clinical registered nurses.\n" +
              "2. **Ambulance:** Coordinated patient transport for admissions, consultations, and transfers.\n" +
              "3. **Medical Equipment:** 28 hospital-grade items supplied for international export.\n" +
              "4. **Pharmacy:** Prescription and maintenance medicine coordination.\n" +
              "5. **Lab Tests:** Diagnostic laboratory investigations with trained professionals collecting samples at your home.\n\n" +
              "Which service would you like to explore?",
        actions: [
          { label: 'Home Care', url: 'home-care.html' },
          { label: 'Lab Tests', url: 'lab-tests.html' },
          { label: 'Call Arovia', url: AROVIA_PHONE_URI, isCall: true }
        ]
      };
    }

    // 13. Contextual Follow-up (e.g., "How much is it?", "What is the price?", "How do I book?")
    if (conversationState.lastService) {
      if (normalized.indexOf('price') !== -1 || normalized.indexOf('cost') !== -1 || normalized.indexOf('charge') !== -1 || normalized.indexOf('how much') !== -1) {
        if (conversationState.lastService === 'medical-equipment') {
          return {
            text: "In accordance with Arovia policy, medical equipment prices are never published online as all 28 items are supplied for international export where shipping charges, quantities, and port tariffs vary. Please call our equipment desk for a formal Proforma Invoice.",
            actions: [
              { label: 'Equipment Catalog', url: 'medical-equipment.html' },
              { label: 'Call Equipment Desk', url: AROVIA_PHONE_URI, isCall: true }
            ]
          };
        }
        if (conversationState.lastService === 'lab-tests') {
          return {
            text: "Diagnostic test charges are quoted transparently over the telephone before any testing is arranged, based on whether you require individual tests or multi-parameter screening packages. Call our diagnostic desk via the helpline number in the header or footer for exact quotes.",
            actions: [
              { label: 'View Lab Tests', url: 'lab-tests.html' },
              { label: 'Call Diagnostic Desk', url: AROVIA_PHONE_URI, isCall: true }
            ]
          };
        }
        if (conversationState.lastService === 'pharmacy') {
          return {
            text: "The applicable medicine price is confirmed by the pharmacy desk during your enquiry. Prices are not listed on the website. Please call the helpline to ask about availability and pricing.",
            actions: [
              { label: 'Pharmacy Page', url: 'pharmacy.html' },
              { label: 'Call Pharmacy Desk', url: AROVIA_PHONE_URI, isCall: true }
            ]
          };
        }
        if (conversationState.lastService === 'home-care') {
          return {
            text: "Home care arrangements depend on whether your patient requires non-clinical daily living assistance (Caregiver) or skilled medical procedures (Registered Nurse), as well as routine duration. Call our coordination desk via the helpline number in the header or footer to discuss your situation and receive transparent quotes.",
            actions: [
              { label: 'Home Care Details', url: 'home-care.html' },
              { label: 'Call for Home Care', url: AROVIA_PHONE_URI, isCall: true }
            ]
          };
        }
      }
    }

    // 14. Unknown / Ambiguous Healthcare Question Fallback
    return {
      text: "I couldn't find confirmed information matching that specific question on the Arovia website. Please contact our healthcare coordination desk directly via our helpline to discuss your needs with a team member, or explore our core service pages.",
      actions: [
        { label: 'Call Arovia: ' + AROVIA_PHONE_DISPLAY, url: AROVIA_PHONE_URI, isCall: true },
        { label: 'Contact Information', url: 'contact.html' }
      ]
    };
  }

  /* ==========================================================================
     4. Dual-Engine Query Pipeline (Local NLU + Optional Server AI Endpoint)
     ========================================================================== */

  /**
   * Process a message through the dual-engine pipeline.
   * If a live AI server endpoint (/api/chat) is configured, attempts it with a safe timeout;
   * otherwise falls back seamlessly to the grounded local NLU engine.
   */
  function processUserQuery(query, callback) {
    var greetingInfo = parseGreeting(query);
    // Check if security violation, pure greeting, or out-of-scope first
    if (checkSecurityViolation(query) || (greetingInfo && !greetingInfo.hasQuestion) || isOutOfScope(query, normalizeText(query))) {
      setTimeout(function () {
        callback(generateAroviaResponse(query));
      }, 250);
      return;
    }

    // Optional server AI endpoint probe
    var hasServerEndpoint = false;
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = null;

    if (window.AROVIA_AI_ENDPOINT && typeof fetch === 'function') {
      timeoutId = setTimeout(function () {
        if (controller) controller.abort();
        callback(generateAroviaResponse(query));
      }, 3000);

      fetch(window.AROVIA_AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, context: conversationState.lastService }),
        signal: controller ? controller.signal : undefined
      })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('AI endpoint returned error');
        return res.json();
      })
      .then(function (data) {
        if (data && data.reply) {
          callback({
            text: data.reply,
            actions: data.actions || [
              { label: 'Call Arovia', url: AROVIA_PHONE_URI, isCall: true }
            ]
          });
        } else {
          callback(generateAroviaResponse(query));
        }
      })
      .catch(function () {
        clearTimeout(timeoutId);
        callback(generateAroviaResponse(query));
      });
      return;
    }

    // Resilient Local Engine (Fast, Grounded, 100% Reliable Offline)
    setTimeout(function () {
      callback(generateAroviaResponse(query));
    }, 400); // 400ms human-like response delay
  }

  /* ==========================================================================
     5. Chatbot User Interface & DOM Construction
     ========================================================================== */

  /**
   * Format message text: convert markdown bold and bullet lists to clean HTML
   */
  function formatMessageText(text) {
    if (!text) return '';
    var escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Markdown bold **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Split paragraphs
    var paragraphs = escaped.split('\n\n');
    var html = '';

    paragraphs.forEach(function (para) {
      para = para.trim();
      if (!para) return;

      // Check if bullet list
      if (para.indexOf('• ') !== -1 || para.indexOf('- ') !== -1) {
        var lines = para.split('\n');
        var inList = false;
        lines.forEach(function (line) {
          line = line.trim();
          if (line.startsWith('• ') || line.startsWith('- ')) {
            if (!inList) {
              html += '<ul>';
              inList = true;
            }
            html += '<li>' + line.substring(2) + '</li>';
          } else {
            if (inList) {
              html += '</ul>';
              inList = false;
            }
            html += '<p>' + line + '</p>';
          }
        });
        if (inList) html += '</ul>';
      } else {
        html += '<p>' + para.replace(/\n/g, '<br>') + '</p>';
      }
    });

    return html;
  }

  /**
   * Get current formatted time (HH:MM AM/PM)
   */
  function getCurrentTime() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
  }

  /**
   * Inject and mount Chatbot UI into document
   */
  function initChatbotUI() {
    if (document.getElementById('aroviaChatLauncher')) return;

    // 0. Floating WhatsApp Button
    var waButton = document.getElementById('aroviaWhatsAppFloat');
    if (!waButton) {
      waButton = document.createElement('a');
      waButton.id = 'aroviaWhatsAppFloat';
      waButton.className = 'arovia-whatsapp-float';
      waButton.href = AROVIA_WHATSAPP_URI;
      waButton.target = '_blank';
      waButton.rel = 'noopener noreferrer';
      waButton.setAttribute('aria-label', 'Chat with Arovia on WhatsApp');
      waButton.setAttribute('title', 'Chat with Arovia on WhatsApp');
      waButton.innerHTML =
        '<svg viewBox="0 0 24 24" class="arovia-whatsapp-icon" aria-hidden="true">' +
          '<path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.45 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z"/>' +
        '</svg>';
      document.body.appendChild(waButton);
    }

    // 1. Floating Launcher with AVI Animated Female Assistant Character
    var launcher = document.createElement('button');
    launcher.id = 'aroviaChatLauncher';
    launcher.className = 'arovia-chat-launcher';
    launcher.setAttribute('type', 'button');
    launcher.setAttribute('aria-label', 'Chat with AVI');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'aroviaChatWindow');
    launcher.setAttribute('title', 'Chat with AVI');
    launcher.innerHTML =
      '<div class="arovia-avi-avatar-wrap">' +
        '<img src="assets/avi-assistant.png" alt="AVI - Arovia\'s Virtual Assistant" class="arovia-avi-avatar-img">' +
        '<span class="arovia-avi-status-dot" aria-label="Online"></span>' +
      '</div>' +
      '<div class="arovia-avi-close-icon">' +
        '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
      '</div>';

    // 1b. Welcome Greeting Bubble near AVI
    var bubble = document.createElement('div');
    bubble.id = 'aroviaAviBubble';
    bubble.className = 'arovia-avi-speech-bubble';
    bubble.setAttribute('role', 'tooltip');
    bubble.setAttribute('aria-hidden', 'true');
    bubble.innerHTML =
      '<span class="arovia-avi-bubble-text">Hi, I\'m Avi! 👋 How can I help you today?</span>' +
      '<button type="button" id="aroviaAviBubbleClose" class="arovia-avi-speech-bubble-close" aria-label="Dismiss greeting">×</button>';

    // --- Smart AVI Assistant Trigger Behavior ---
    // The AI comes from the bottom with its greeting after 5 seconds,
    // and NEVER immediately after opening the website.
    var INITIAL_DELAY_MS = 5000; // 5 seconds
    var aviRevealed = false;
    var revealTimer = null;
    var autoFadeTimer = null;

    function revealAvi(triggerSource) {
      if (aviRevealed) return;
      aviRevealed = true;

      if (revealTimer) {
        clearTimeout(revealTimer);
        revealTimer = null;
      }

      // Reveal AVI launcher with smooth entrance rising from the bottom
      if (launcher) {
        launcher.classList.add('is-visible');
        launcher.setAttribute('aria-hidden', 'false');
      }

      // Reveal Greeting Bubble with "Hi, I'm Avi! 👋 How can I help you today?"
      if (bubble && !conversationState.isOpen && !bubble.classList.contains('is-dismissed')) {
        bubble.classList.remove('is-fading', 'is-dismissed');
        bubble.classList.add('is-visible');
        bubble.setAttribute('aria-hidden', 'false');

        // Keep greeting visible for approx 5-6 seconds (5.5s), then fade it away smoothly
        autoFadeTimer = setTimeout(function () {
          if (bubble && !bubble.classList.contains('is-dismissed')) {
            bubble.classList.remove('is-visible');
            bubble.classList.add('is-fading');
            setTimeout(function () {
              if (bubble) {
                bubble.classList.add('is-dismissed');
                bubble.setAttribute('aria-hidden', 'true');
              }
            }, 400);
          }
        }, 5500);
      }
    }

    // Schedule AVI appearance after 5 seconds of opening the website
    revealTimer = setTimeout(function () {
      revealAvi('timer_5s');
    }, INITIAL_DELAY_MS);

    // Export internal reveal hook for testing & programmatic control
    if (!window.AroviaChatbot) window.AroviaChatbot = {};
    window.AroviaChatbot._revealAvi = revealAvi;
    window.AroviaChatbot.isAviRevealed = function () { return aviRevealed; };

    // 2. Chat Window Panel
    var chatWindow = document.createElement('div');
    chatWindow.id = 'aroviaChatWindow';
    chatWindow.className = 'arovia-chat-window';
    chatWindow.setAttribute('role', 'dialog');
    chatWindow.setAttribute('aria-label', 'AVI - Arovia\'s Virtual Assistant');
    chatWindow.setAttribute('aria-hidden', 'true');
    chatWindow.innerHTML =
      '<div class="arovia-chat-header">' +
        '<div class="arovia-chat-header__brand">' +
          '<div class="arovia-chat-header__avatar">' +
            '<img src="assets/avi-assistant.png" alt="AVI" width="38" height="38">' +
            '<span class="arovia-chat-header__status-dot" aria-label="Online"></span>' +
          '</div>' +
          '<div class="arovia-chat-header__info">' +
            '<div class="arovia-chat-header__title-row">' +
              '<h3 class="arovia-chat-header__title">AVI</h3>' +
            '</div>' +
            '<p class="arovia-chat-header__subtitle">Your Arovia Assistant</p>' +
          '</div>' +
        '</div>' +
        '<div class="arovia-chat-header__actions">' +
          '<button type="button" id="aroviaChatReset" class="arovia-chat-header__btn" title="Start New Conversation" aria-label="Start new conversation">' +
            '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>' +
          '</button>' +
          '<button type="button" id="aroviaChatClose" class="arovia-chat-header__btn" title="Close Chat" aria-label="Close chat window">' +
            '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="arovia-chat-phone-banner">' +
        '<span>Direct Phone Coordination</span>' +
        '<a href="' + AROVIA_PHONE_URI + '" aria-label="Call Arovia directly at ' + AROVIA_PHONE_DISPLAY + '">📞 ' + AROVIA_PHONE_DISPLAY + '</a>' +
      '</div>' +
      '<div id="aroviaChatMessages" class="arovia-chat-messages" role="log" aria-live="polite"></div>' +
      '<div class="arovia-chat-input-area">' +
        '<form id="aroviaChatForm" class="arovia-chat-form">' +
          '<textarea id="aroviaChatInput" class="arovia-chat-input" placeholder="Type your healthcare question here..." rows="1" aria-label="Type your message"></textarea>' +
          '<button type="submit" id="aroviaChatSend" class="arovia-chat-send-btn" aria-label="Send message">' +
            '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
          '</button>' +
        '</form>' +
        '<div class="arovia-chat-footer-note">Direct telephone coordination desk • ' + AROVIA_LOCATION + '</div>' +
      '</div>';

    document.body.appendChild(launcher);
    document.body.appendChild(bubble);
    document.body.appendChild(chatWindow);

    // Initial render of welcome suggestions (no auto-bot greeting bubble)
    renderWelcomeState();

    // Attach Event Listeners
    setupChatbotEvents(launcher, chatWindow, bubble);
  }

  /**
   * Render the default clean screen with suggested questions
   * (NO automatic greeting bubble, NO fake timestamp, NO fake user message)
   */
  function renderWelcomeState() {
    var messagesContainer = document.getElementById('aroviaChatMessages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    // Suggested Questions Chips Area (Clean Initial Screen)
    var suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'arovia-chat-suggestions arovia-chat-suggestions--default';
    suggestionsContainer.id = 'aroviaDefaultSuggestions';
    suggestionsContainer.innerHTML = '<div class="arovia-chat-suggestions__header">HOW CAN I HELP YOU?</div>';

    var listDiv = document.createElement('div');
    listDiv.className = 'arovia-chat-suggestions__list';
    listDiv.id = 'aroviaDefaultSuggestionsList';

    function createChip(question) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'arovia-chat-chip';
      chip.textContent = question;
      chip.addEventListener('click', function () {
        submitUserMessage(question);
      });
      return chip;
    }

    // Show initial 3 questions, with 'More questions' button revealing remaining 5
    var initialQuestions = DEFAULT_SUGGESTIONS.slice(0, 3);
    var remainingQuestions = DEFAULT_SUGGESTIONS.slice(3);

    initialQuestions.forEach(function (question) {
      listDiv.appendChild(createChip(question));
    });

    // Expandable wrap for remaining questions
    var remainingWrap = document.createElement('div');
    remainingWrap.className = 'arovia-chat-suggestions__remaining';
    remainingWrap.style.display = 'none';
    remainingWrap.style.flexDirection = 'column';
    remainingWrap.style.gap = '6px';

    remainingQuestions.forEach(function (question) {
      remainingWrap.appendChild(createChip(question));
    });

    listDiv.appendChild(remainingWrap);

    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'arovia-chat-chip-more';
    moreBtn.id = 'aroviaMoreQuestionsBtn';
    moreBtn.innerHTML = '<span>More questions (' + remainingQuestions.length + ') ↓</span>';
    moreBtn.addEventListener('click', function () {
      var isHidden = remainingWrap.style.display === 'none';
      remainingWrap.style.display = isHidden ? 'flex' : 'none';
      moreBtn.innerHTML = isHidden ? '<span>Fewer questions ↑</span>' : '<span>More questions (' + remainingQuestions.length + ') ↓</span>';
      if (isHidden) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });

    listDiv.appendChild(moreBtn);
    suggestionsContainer.appendChild(listDiv);
    messagesContainer.appendChild(suggestionsContainer);

    messagesContainer.scrollTop = 0;
  }

  /**
   * Add a message bubble to the chat conversation
   */
  function appendMessage(sender, text, actions, showSuggestions) {
    var messagesContainer = document.getElementById('aroviaChatMessages');
    if (!messagesContainer) return;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'arovia-chat-msg arovia-chat-msg--' + sender;

    var formatted = sender === 'bot' ? formatMessageText(text) : '<p>' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>';

    var bubbleHtml = '<div class="arovia-chat-msg__bubble">' + formatted;

    // Append actions if provided
    if (actions && actions.length > 0) {
      bubbleHtml += '<div class="arovia-chat-msg__actions">';
      actions.forEach(function (act) {
        var btnClass = act.isCall ? 'arovia-chat-action-btn arovia-chat-action-btn--call' :
                       act.isWhatsApp ? 'arovia-chat-action-btn arovia-chat-action-btn--whatsapp' :
                       'arovia-chat-action-btn';
        var icon = act.isCall ? '📞 ' : act.isWhatsApp ? '💬 ' : '🔗 ';
        var targetAttr = act.isCall ? '' : (act.isWhatsApp ? 'target="_blank" rel="noopener noreferrer"' : 'target="_self"');
        bubbleHtml += '<a href="' + act.url + '" class="' + btnClass + '" ' + targetAttr + '>' + icon + act.label + '</a>';
      });
      bubbleHtml += '</div>';
    }

    bubbleHtml += '</div><div class="arovia-chat-msg__time">' + getCurrentTime() + '</div>';
    msgDiv.innerHTML = bubbleHtml;

    messagesContainer.appendChild(msgDiv);

    // If suggestions requested (e.g. after greeting), render suggestions chips
    if (showSuggestions) {
      var suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'arovia-chat-suggestions';
      suggestionsContainer.innerHTML = '<span class="arovia-chat-suggestions__label">SUGGESTED QUESTIONS:</span>';

      var listDiv = document.createElement('div');
      listDiv.className = 'arovia-chat-suggestions__list';

      DEFAULT_SUGGESTIONS.forEach(function (question) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'arovia-chat-chip';
        chip.textContent = question;
        chip.addEventListener('click', function () {
          submitUserMessage(question);
        });
        listDiv.appendChild(chip);
      });

      suggestionsContainer.appendChild(listDiv);
      messagesContainer.appendChild(suggestionsContainer);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Show typing indicator dots
   */
  function showTypingIndicator() {
    var messagesContainer = document.getElementById('aroviaChatMessages');
    if (!messagesContainer || document.getElementById('aroviaTypingIndicator')) return;

    var typing = document.createElement('div');
    typing.id = 'aroviaTypingIndicator';
    typing.className = 'arovia-chat-typing';
    typing.innerHTML =
      '<span class="arovia-chat-typing__dot"></span>' +
      '<span class="arovia-chat-typing__dot"></span>' +
      '<span class="arovia-chat-typing__dot"></span>';

    messagesContainer.appendChild(typing);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Hide typing indicator dots
   */
  function hideTypingIndicator() {
    var indicator = document.getElementById('aroviaTypingIndicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  /**
   * Submit and process a user message
   */
  function submitUserMessage(userText) {
    if (!userText || !userText.trim() || conversationState.isTyping) return;

    var trimmed = userText.trim();

    // Remove any existing suggestion chips blocks from the conversation so they don't pile up duplicated
    var oldSuggestions = document.querySelectorAll('.arovia-chat-suggestions');
    oldSuggestions.forEach(function (el) {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    // 1. Append user message to UI
    appendMessage('user', trimmed);

    // 2. Clear input
    var input = document.getElementById('aroviaChatInput');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    // 3. Show typing indicator
    conversationState.isTyping = true;
    showTypingIndicator();

    // 4. Process through dual-engine pipeline
    processUserQuery(trimmed, function (response) {
      hideTypingIndicator();
      conversationState.isTyping = false;
      appendMessage('bot', response.text, response.actions, response.showSuggestions);
    });
  }

  /**
   * Setup UI interactions, accessibility and keyboard handlers
   */
  function setupChatbotEvents(launcher, chatWindow, bubble) {
    var closeBtn = document.getElementById('aroviaChatClose');
    var resetBtn = document.getElementById('aroviaChatReset');
    var form = document.getElementById('aroviaChatForm');
    var input = document.getElementById('aroviaChatInput');
    var bubbleClose = document.getElementById('aroviaAviBubbleClose');
    var waButton = document.getElementById('aroviaWhatsAppFloat');

    function dismissBubble() {
      if (bubble) {
        bubble.classList.remove('is-visible', 'is-fading');
        bubble.classList.add('is-dismissed');
        bubble.setAttribute('aria-hidden', 'true');
      }
    }

    // Welcome tooltip click -> open chat or dismiss if close button clicked
    if (bubble) {
      bubble.addEventListener('click', function (e) {
        if (e.target && (e.target.id === 'aroviaAviBubbleClose' || e.target.closest('#aroviaAviBubbleClose'))) {
          e.stopPropagation();
          dismissBubble();
          return;
        }
        openChat();
      });
    }

    if (bubbleClose) {
      bubbleClose.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissBubble();
      });
    }

    if (waButton) {
      waButton.addEventListener('click', function () {
        dismissBubble();
      });
    }

    function toggleChat() {
      if (conversationState.isOpen) {
        closeChat();
      } else {
        openChat();
      }
    }

    function openChat() {
      conversationState.isOpen = true;
      chatWindow.classList.add('is-open');
      launcher.classList.add('is-active');
      if (waButton) waButton.classList.add('is-chat-open');
      document.body.classList.add('arovia-chat-open');
      dismissBubble();
      launcher.setAttribute('aria-expanded', 'true');
      chatWindow.setAttribute('aria-hidden', 'false');

      if (input) {
        setTimeout(function () { input.focus(); }, 150);
      }
    }

    function closeChat() {
      conversationState.isOpen = false;
      chatWindow.classList.remove('is-open');
      launcher.classList.remove('is-active');
      if (waButton) waButton.classList.remove('is-chat-open');
      document.body.classList.remove('arovia-chat-open');
      launcher.setAttribute('aria-expanded', 'false');
      chatWindow.setAttribute('aria-hidden', 'true');
      launcher.focus();
    }

    launcher.addEventListener('click', function (e) {
      e.preventDefault();
      toggleChat();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeChat();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        conversationState.lastService = null;
        renderWelcomeState();
        if (input) input.focus();
      });
    }

    // Enter to Send, Shift+Enter for newline
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitUserMessage(input.value);
        }
      });

      // Auto-expand textarea height slightly as typed (max 52px, no vertical scrollbar when empty)
      input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 52) + 'px';
        if (input.scrollHeight > 52) {
          input.style.overflowY = 'auto';
        } else {
          input.style.overflowY = 'hidden';
        }
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (input) submitUserMessage(input.value);
      });
    }

    // Keyboard ESC to close chat window
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && conversationState.isOpen) {
        closeChat();
      }
    });

    // Click outside chat window to close
    document.addEventListener('click', function (e) {
      if (!conversationState.isOpen) return;
      if (chatWindow && !chatWindow.contains(e.target) && launcher && !launcher.contains(e.target) && (!waButton || !waButton.contains(e.target))) {
        closeChat();
      }
    });
  }

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbotUI);
  } else {
    initChatbotUI();
  }

  // Export globally for programmatic control or testing
  window.AroviaChatbot = {
    open: function () {
      var launcher = document.getElementById('aroviaChatLauncher');
      var chatWindow = document.getElementById('aroviaChatWindow');
      if (launcher && chatWindow) {
        if (typeof window.AroviaChatbot._revealAvi === 'function') {
          window.AroviaChatbot._revealAvi('programmatic');
        }
        launcher.click();
      }
    },
    close: function () {
      var closeBtn = document.getElementById('aroviaChatClose');
      if (closeBtn) closeBtn.click();
    },
    ask: function (question) {
      submitUserMessage(question);
    },
    queryNlu: function (query) {
      return generateAroviaResponse(query);
    }
  };

})();

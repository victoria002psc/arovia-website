/**
 * AROVIA HEALTHCARE — SOCIAL MEDIA CHANNELS CONFIGURATION
 *
 * Centralized, verifiable configuration for official Arovia social channels.
 *
 * POLICY & COMPLIANCE:
 * - Real profiles: Insert verified URLs below when officially published.
 * - Missing profiles: When `url: null` or empty, the platform button displays a
 *   distinct 'Coming Soon' badge and prevents navigating to broken or invented links.
 * - Modifying a channel: Update the `url` property below; all pages and panels
 *   will automatically reflect the change without touching HTML markup.
 */

window.AROVIA_SOCIAL_CONFIG = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    handle: '@aroviahealthcare',
    meta: 'Health tips & service updates',
    // Insert verified URL here, e.g. 'https://www.instagram.com/aroviahealthcare'
    url: null,
    statusText: 'Coming Soon',
    comingSoonMessage: 'Arovia’s official Instagram channel is coming soon. For care services, call our helpline.'
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    handle: 'Arovia Healthcare',
    meta: 'Care guides & patient education',
    // Insert verified URL here, e.g. 'https://www.youtube.com/@AroviaHealthcare'
    url: null,
    statusText: 'Coming Soon',
    comingSoonMessage: 'Arovia’s official YouTube channel is coming soon. For care services, call our helpline.'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Arovia Healthcare Services',
    meta: 'Community news & care announcements',
    // Insert verified URL here, e.g. 'https://www.facebook.com/aroviahealthcare'
    url: null,
    statusText: 'Coming Soon',
    comingSoonMessage: 'Arovia’s official Facebook page is coming soon. For care services, call our helpline.'
  }
};

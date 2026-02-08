import { ManifestV3Export } from '@crxjs/vite-plugin';

const browser = process.env.BROWSER || 'chrome';

const baseManifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'MirmirOps',
  description: 'Unified Browser Intent Engine - AI-powered browser automation with voice commands, cross-site workflows, and intelligent memory.',
  version: '0.1.0',
  
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },

  permissions: [
    'activeTab',
    'tabs',
    'storage',
    'scripting',
    'sidePanel',
    'contextMenus',
    'notifications',
    'clipboardRead',
    'clipboardWrite',
  ],

  optional_permissions: [
    'history',
    'bookmarks',
    'webNavigation',
  ],

  host_permissions: ['<all_urls>'],

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],

  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },

  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },

  action: {
    default_title: 'MirmirOps',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
    },
  },

  commands: {
    '_execute_action': {
      suggested_key: {
        default: 'Ctrl+Shift+M',
        mac: 'Command+Shift+M',
      },
      description: 'Open MirmirOps panel',
    },
    'toggle-voice': {
      suggested_key: {
        default: 'Ctrl+Shift+V',
        mac: 'Command+Shift+V',
      },
      description: 'Toggle voice input',
    },
  },

  web_accessible_resources: [
    {
      resources: ['icons/*'],
      matches: ['<all_urls>'],
    },
  ],
};

// Firefox-specific adjustments
const firefoxManifest: ManifestV3Export = {
  ...baseManifest,
  // Firefox uses browser_specific_settings
  browser_specific_settings: {
    gecko: {
      id: 'mirmir-ops@extension',
      strict_min_version: '109.0',
    },
  },
};

const manifest = browser === 'firefox' ? firefoxManifest : baseManifest;

export default manifest;

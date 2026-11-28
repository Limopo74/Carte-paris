import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 30000, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'fr-FR', timezoneId: 'Europe/Paris' },
  projects: [{ name: 'Android-Chromium', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});

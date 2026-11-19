import {defineConfig} from '@playwright/test';
const externalURL = process.env.TEST_BASE_URL;
export default defineConfig({
  testDir: './tests/browser', workers: 1,
  use: {baseURL: externalURL || 'http://127.0.0.1:8012', headless: true},
  reporter: [['list'], ['html', {open: 'never'}]],
  webServer: externalURL ? undefined : {
    command: `${process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : 'python'} scripts/serve.py`,
    url: 'http://127.0.0.1:8012/api/health', timeout: 30000, reuseExistingServer: false,
    env: {MODEL_PROVIDER: 'mock', DEMO_MODE: 'false', SAMPLE_KNOWLEDGE: 'true', APP_PROFILE: 'local',
      RESERVATION_MODE: 'disabled', MEWS_SANDBOX_ENABLED: 'false', PORT: '8012', SPEECH_ENABLED: 'false'},
  },
});

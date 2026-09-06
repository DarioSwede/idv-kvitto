import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:30000,
  use:{
    baseURL:'http://127.0.0.1:43921',
    headless:true
  },
  webServer:{
    command:'python3 -m http.server 43921 --bind 127.0.0.1',
    url:'http://127.0.0.1:43921',
    reuseExistingServer:false,
    timeout:15000
  }
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'pages/auth/login.html'),
        signup: resolve(__dirname, 'pages/auth/signup.html'),
        mobileDashboard: resolve(__dirname, 'pages/mobile/dashboard.html'),
        mobileAddTransaction: resolve(__dirname, 'pages/mobile/add-transaction.html'),
        mobileInsights: resolve(__dirname, 'pages/mobile/insights.html'),
        desktopDashboard: resolve(__dirname, 'pages/desktop/dashboard.html'),
        desktopAddTransaction: resolve(__dirname, 'pages/desktop/add-transaction.html'),
        desktopInsights: resolve(__dirname, 'pages/desktop/insights.html'),
        prd: resolve(__dirname, 'pages/docs/prd.html'),
      }
    }
  }
});

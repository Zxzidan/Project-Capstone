import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        scanner: resolve(__dirname, 'scanner.html'),
        login: resolve(__dirname, 'pages/auth/login.html'),
        signup: resolve(__dirname, 'pages/auth/signup.html'),
        mobileDashboard: resolve(__dirname, 'pages/mobile/dashboard.html'),
        mobileAddTransaction: resolve(__dirname, 'pages/mobile/add-transaction.html'),
        mobileInsights: resolve(__dirname, 'pages/mobile/insights.html'),
        mobileProfile: resolve(__dirname, 'pages/mobile/profile.html'),
        mobileHistory: resolve(__dirname, 'pages/mobile/history.html'),
        desktopDashboard: resolve(__dirname, 'pages/desktop/dashboard.html'),
        desktopAddTransaction: resolve(__dirname, 'pages/desktop/add-transaction.html'),
        desktopInsights: resolve(__dirname, 'pages/desktop/insights.html'),
        desktopProfile: resolve(__dirname, 'pages/desktop/profile.html'),
        desktopHistory: resolve(__dirname, 'pages/desktop/history.html'),
        prd: resolve(__dirname, 'pages/docs/prd.html'),
      }
    }
  }
});

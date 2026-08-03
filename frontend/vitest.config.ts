/**
 * 文件名：vitest.config.ts
 *
 * P5 PR 27：UI Kit 测试配置
 *
 * 配置 vitest + jsdom + @testing-library/react
 * 覆盖 src/components/ui/ 下 13 个组件
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/components/ui/**/*.{ts,tsx}'],
      exclude: ['**/*.spec.{ts,tsx}'],
    },
  },
});
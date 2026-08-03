/**
 * 文件名：src/test-setup.ts
 *
 * P5 PR 27：vitest 全局 setup
 * 注册 jest-dom 匹配器（toBeInTheDocument 等）
 */

import '@testing-library/jest-dom/vitest';
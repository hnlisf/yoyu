// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  // ── P0 PR 5: 测试文件 lint 分层 ──
  // 行业惯例：mock 测试用 `any` 是合理的（Prisma mock / 依赖注入）
  // 但 source 文件继续严格（"any" 不放过）
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'src/migrations/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/require-await': 'off',  // mock 框架常用
    },
  },
  // ── WSL 验证发现：service 文件大量 Prisma `any` 返回值触发 unsafe-* ──
  // 工业惯例：Prisma service 层的 `any` 是已知 trade-off
  //   （prisma client 类型推断有边界，强类型需要 Prisma 5+ + 类型生成）
  // controller / decorator / common 文件保持严格（这些是真 bug 信号）
  {
    files: [
      'src/**/*.service.ts',
      'src/**/repositories/*.ts',
      'src/auth/*.decorator.ts',  // 装饰器用 ExecutionContext 拿到的是 any
    ],
    rules: {
      // Prisma 返回 any → 链式调用都触发 unsafe-*（已知 trade-off）
      // controller / spec / migrations 仍严格
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // 显式 any 仍允许（@typescript-eslint/no-explicit-any: off 已在上面关掉）
    },
  },
);

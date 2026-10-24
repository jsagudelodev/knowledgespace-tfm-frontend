// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // `error: () => {}` en un `.subscribe({...})` es el patrón deliberado
      // de este proyecto para cargas de fondo no críticas (contador de
      // notificaciones, filtros auxiliares): si fallan, la pantalla sigue
      // usable sin ese dato, y no vale la pena interrumpir al usuario con un
      // error por algo secundario. Las 14 veces que aparece hoy son todas
      // ese mismo caso, no un olvido.
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // `== null` / `!= null` es el patrón habitual del proyecto para "no
      // existe": cubre `null` y `undefined` a la vez en campos opcionales
      // (p. ej. `category_id?: number | null`). Pasar a `===` cambiaría el
      // comportamiento para los `undefined`, no solo el estilo.
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },
]);

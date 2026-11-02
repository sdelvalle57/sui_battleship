import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const SDK_LAYER_MESSAGE =
  'Fuera de src/sui/, src/hooks/ y src/providers/, de @mysten/* solo se importa @mysten/dapp-kit-react/ui (ARQ-1, PROY-13)';
const SUI_LAYER_MESSAGE =
  'src/sui/ es la capa base: solo @mysten/sui y @mysten/dapp-kit-core, sin React ni capas superiores (ARQ-1, ARQ-5, PROY-13)';
const HOOKS_LAYER_MESSAGE =
  'src/hooks/ solo usa @mysten/sui y @mysten/dapp-kit-react (raíz), y no importa componentes, páginas ni providers (ARQ-1, ARQ-5)';
const PROVIDERS_LAYER_MESSAGE =
  'src/providers/ solo usa @mysten/dapp-kit-react (raíz); el SDK y el core del kit viven en src/sui/ (ARQ-1)';

// Regla de capas en lista blanca. En flat config, el último bloque que matchea un archivo reemplaza la
// configuración completa de `no-restricted-imports`: por eso cada carpeta repite su lista entera.
export default defineConfig([
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: {
          // vite.config.ts no está en tsconfig.json (include: src): se tipa con tsconfig.node.json.
          allowDefaultProject: ['vite.config.ts'],
          defaultProject: 'tsconfig.node.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  reactHooks.configs.flat.recommended,
  {
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Prohibido dangerouslySetInnerHTML (SEG-9)',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '^@mysten/(?!dapp-kit-react/ui$)', message: SDK_LAYER_MESSAGE }] },
      ],
    },
  },
  {
    files: ['src/sui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^@mysten/(?!sui(/|$)|dapp-kit-core(/|$))', message: SUI_LAYER_MESSAGE },
            {
              group: [
                'react',
                'react-dom',
                'react/*',
                '../hooks/*',
                '../components/*',
                '../pages/*',
                '../providers/*',
                '**/hooks/**',
                '**/components/**',
                '**/pages/**',
                '**/providers/**',
              ],
              message: SUI_LAYER_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/hooks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^@mysten/(?!sui(/|$)|dapp-kit-react$)', message: HOOKS_LAYER_MESSAGE },
            {
              group: [
                '../components/*',
                '../pages/*',
                '../providers/*',
                '**/components/**',
                '**/pages/**',
                '**/providers/**',
              ],
              message: HOOKS_LAYER_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/providers/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '^@mysten/(?!dapp-kit-react$)', message: PROVIDERS_LAYER_MESSAGE }] },
      ],
    },
  },
]);

// Corpus único de la regla de la URL de una localnet (`app/src/sui/localnetUrl.mjs`, #75 y #77). Lo consumen la guarda de
// las capturas (`localnet-guard.test.ts`), el módulo compartido (`localnetUrl.test.ts`) y la config de la app
// (`config.test.ts`): nadie declara una copia de estas listas.

export const ACCEPTED = [
  'http://127.0.0.1:9000',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:1024',
  'http://127.0.0.1:65535',
] as const;

export const REJECTED_STRINGS = [
  // puerto fuera de 1024-65535 o mal formado
  'http://127.0.0.1:1023',
  'http://127.0.0.1:0',
  'http://127.0.0.1:65536',
  'http://127.0.0.1:099999',
  'http://127.0.0.1:019000',
  'http://127.0.0.1:99999', // la regex lo acepta; lo frena el rango
  'http://127.0.0.1',
  'http://127.0.0.1:',
  'http://127.0.0.1:19000:1',
  'http://127.0.0.1:١٩٠٠٠', // dígitos arábigo-índicos
  'http://127.0.0.1:１９０００', // dígitos de ancho completo
  // path, query, fragmento, espacios y saltos de línea
  'http://127.0.0.1:19000/',
  'http://127.0.0.1:19000/x',
  'http://127.0.0.1:19000?x=1',
  'http://127.0.0.1:19000#x',
  'http://127.0.0.1:19000 ',
  ' http://127.0.0.1:19000',
  'http://127.0.0.1:19000\n',
  // esquema y host
  'https://127.0.0.1:19000',
  'HTTP://127.0.0.1:19000',
  'http://localhost:19000',
  'http://127.0.0.2:19000',
  'http://127.1:19000',
  'http://2130706433:19000',
  'http://0x7f.0.0.1:19000',
  'http://0.0.0.0:19000',
  'http://[::1]:19000',
  'http://192.168.1.10:19000',
  'http://127.0.0.1.evil.com:19000',
  // credenciales y confusión de host
  'http://127.0.0.1:9000@evil.com',
  'http://127.0.0.1:19000@evil.com',
  'http://user:pw@127.0.0.1:19000',
  '',
] as const;

/**
 * Formas que ahora llegan desde un `.env` (`VITE_LOCALNET_URL`, #77) y no solo desde `argv`: finales de línea de otro
 * sistema (`\r`) o tabulador, comillas que quedan dentro del valor, punto final del host, octal y codificado. Las consumen
 * `localnetUrl.test.ts` y `config.test.ts`; la guarda de las capturas no (sus 90 tests no cambian).
 */
export const REJECTED_STRINGS_ENV = [
  'http://127.0.0.1:19000\r',
  'http://127.0.0.1:19000\t',
  '"http://127.0.0.1:19000"',
  'http://127.0.0.1.:19000',
  'http://0177.0.0.1:19000',
  'http://127.0.0.1%3A19000',
] as const;

export const NON_STRINGS: readonly (readonly [string, unknown])[] = [
  ['undefined', undefined],
  ['null', null],
  ['number', 19000],
  ['array with the URL (coercible)', ['http://127.0.0.1:19000']],
  // El objeto String es coercible a una URL válida: solo lo frena el `typeof`.
  ['String object (coercible)', new String('http://127.0.0.1:19000')],
];

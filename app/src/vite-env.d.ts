/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUI_NETWORK?: string;
  readonly VITE_LOCALNET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

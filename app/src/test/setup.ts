import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin `globals` de Vitest, Testing Library no desmonta solo entre tests: cada render quedaría en el DOM del siguiente.
afterEach(() => {
  cleanup();
});

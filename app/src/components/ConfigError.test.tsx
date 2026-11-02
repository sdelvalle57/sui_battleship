import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfigError } from './ConfigError';

describe('ConfigError', () => {
  it('renders an alert with the title and the literal message', () => {
    const message = 'Falta contracts/deployments/testnet.json: <b>no es HTML</b> & "comillas"';
    render(<ConfigError message={message} />);
    const alert = screen.getByRole('alert');
    expect(alert).toContainElement(screen.getByRole('heading', { level: 1, name: 'La app no está configurada' }));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(alert.querySelector('b')).toBeNull();
  });
});

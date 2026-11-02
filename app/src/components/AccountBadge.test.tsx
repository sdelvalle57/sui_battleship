import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { AccountBadge } from './AccountBadge';

vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));

const ADDRESS = `0x${'ab'.repeat(16)}${'cd'.repeat(16)}`;

describe('AccountBadge', () => {
  it('shows the short address with the full one in the title when connected', () => {
    vi.mocked(useWalletAccount).mockReturnValue({ address: ADDRESS, short: '0xabab…cdcd' });
    render(<AccountBadge />);
    expect(screen.getByText('0xabab…cdcd')).toHaveAttribute('title', ADDRESS);
  });

  it('renders nothing when disconnected', () => {
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    const { container } = render(<AccountBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});

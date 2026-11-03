import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

vi.mock('../components/CreateGameForm', () => ({ CreateGameForm: () => <div data-testid="create-form" /> }));
vi.mock('../components/LobbyList', () => ({ LobbyList: () => <div data-testid="lobby" /> }));

describe('HomePage', () => {
  it('shows the create form above the lobby', () => {
    render(<HomePage />);
    const form = screen.getByTestId('create-form');
    const lobby = screen.getByTestId('lobby');
    expect(form.compareDocumentPosition(lobby) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

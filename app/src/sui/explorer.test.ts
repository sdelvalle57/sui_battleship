import { describe, expect, it } from 'vitest';
import { explorerAccountUrl, explorerObjectUrl, explorerTxUrl } from './explorer';

const DIGEST = '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD';
const OBJECT_ID = `0x${'0'.repeat(63)}6`;
const ADDRESS = `0x${'a'.repeat(64)}`;

describe('explorerTxUrl', () => {
  it('builds the Suiscan transaction URL on testnet', () => {
    expect(explorerTxUrl('testnet', DIGEST)).toBe(`https://suiscan.xyz/testnet/tx/${DIGEST}`);
  });

  it('returns null on localnet', () => {
    expect(explorerTxUrl('localnet', DIGEST)).toBeNull();
  });

  it.each(['', 'abc', '0OIl', `0x${'0'.repeat(64)}`])('throws on invalid digest %j', (digest) => {
    expect(() => explorerTxUrl('testnet', digest)).toThrow('Digest de transacción inválido');
  });

  it('throws on invalid digest even on localnet', () => {
    expect(() => explorerTxUrl('localnet', 'abc')).toThrow('Digest de transacción inválido');
  });
});

describe('explorerObjectUrl', () => {
  it('builds the Suiscan object URL on testnet', () => {
    expect(explorerObjectUrl('testnet', OBJECT_ID)).toBe(`https://suiscan.xyz/testnet/object/${OBJECT_ID}`);
  });

  it('returns null on localnet', () => {
    expect(explorerObjectUrl('localnet', OBJECT_ID)).toBeNull();
  });

  it.each(['', '0x6', 'not-an-id', `0x${'g'.repeat(64)}`, DIGEST])('throws on invalid object id %j', (id) => {
    expect(() => explorerObjectUrl('testnet', id)).toThrow('ID de objeto inválido');
  });

  it('throws on invalid object id even on localnet', () => {
    expect(() => explorerObjectUrl('localnet', '0x6')).toThrow('ID de objeto inválido');
  });
});

describe('explorerAccountUrl', () => {
  it('builds the Suiscan account URL on testnet', () => {
    expect(explorerAccountUrl('testnet', ADDRESS)).toBe(`https://suiscan.xyz/testnet/account/${ADDRESS}`);
  });

  it('returns null on localnet', () => {
    expect(explorerAccountUrl('localnet', ADDRESS)).toBeNull();
  });

  it.each(['', '0xa', 'not-an-address', `0x${'g'.repeat(64)}`, `0x${'a'.repeat(65)}`, DIGEST])('throws on invalid address %j', (address) => {
    expect(() => explorerAccountUrl('testnet', address)).toThrow('Dirección inválida');
  });

  it('throws on invalid address even on localnet', () => {
    expect(() => explorerAccountUrl('localnet', '0xa')).toThrow('Dirección inválida');
  });
});

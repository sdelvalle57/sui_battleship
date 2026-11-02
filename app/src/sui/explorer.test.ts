import { describe, expect, it } from 'vitest';
import { explorerObjectUrl, explorerTxUrl } from './explorer';

const DIGEST = '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD';
const OBJECT_ID = `0x${'0'.repeat(63)}6`;

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

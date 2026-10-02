import { describe, expect, it } from 'vitest';
import { modelEnvPatch, parseModelHost } from '../modelHost';

describe('parseModelHost', () => {
  it('reduces an https URL to its origin', () => {
    expect(parseModelHost('https://models.example.com/')).toBe('https://models.example.com');
    expect(parseModelHost('https://models.example.com/a/b?x=1')).toBe('https://models.example.com');
  });

  it('allows plain http only for localhost', () => {
    expect(parseModelHost('http://localhost:9000/models')).toBe('http://localhost:9000');
    expect(parseModelHost('http://models.example.com')).toBeNull();
  });

  it('rejects empty, malformed and non-http schemes', () => {
    expect(parseModelHost(undefined)).toBeNull();
    expect(parseModelHost('')).toBeNull();
    expect(parseModelHost('not a url')).toBeNull();
    expect(parseModelHost('javascript:alert(1)')).toBeNull();
    expect(parseModelHost('ftp://models.example.com')).toBeNull();
  });

  it('rejects hosts with credentials', () => {
    expect(parseModelHost('https://user:pass@models.example.com')).toBeNull();
  });
});

describe('modelEnvPatch', () => {
  it('loads only from the local model path when no host is configured', () => {
    expect(modelEnvPatch(null)).toEqual({
      allowLocalModels: true,
      allowRemoteModels: false,
      localModelPath: '/models/',
    });
  });

  it('loads only from the configured host, laid out as <host>/<model id>/<file>', () => {
    expect(modelEnvPatch('https://models.example.com')).toEqual({
      allowLocalModels: false,
      allowRemoteModels: true,
      remoteHost: 'https://models.example.com/',
      remotePathTemplate: '{model}/',
    });
  });
});

import { suggestUsuarioFromCorreo } from './google-usuario';

describe('suggestUsuarioFromCorreo', () => {
  it('sanitizes the email local part', () => {
    expect(suggestUsuarioFromCorreo('Ana.Restrepo+tag@org.org')).toBe('ana.restrepo.tag');
  });

  it('falls back when too short', () => {
    expect(suggestUsuarioFromCorreo('a@x.co').length).toBeGreaterThanOrEqual(3);
  });
});

import { describe, it, expect } from 'vitest';
import { insertUserSchema } from './schema';

const validUser = {
  username: 'johndoe',
  phone: '(87) 9 9999-9999',
  password: 'secret',
  displayName: 'John Doe',
  role: 'admin',
  permission: 'ADM',
  active: true,
};

describe('insertUserSchema', () => {
  it('accepts valid user data', () => {
    const parsed = insertUserSchema.parse(validUser);
    expect(parsed).toMatchObject({ username: 'johndoe' });
  });

  it('rejects missing required fields', () => {
    expect(() => insertUserSchema.parse({} as any)).toThrow();
  });
});

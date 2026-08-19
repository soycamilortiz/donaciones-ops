import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

const ROUNDS = 12;

// Ambiguous glyphs (0/O, 1/l/I) are dropped: an admin reads this temporary
// password aloud or copies it onto paper for a volunteer, so legibility beats
// a couple of bits of entropy at length 10.
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain, ROUNDS);
  }

  verify(plain: string, passwordHash: string): Promise<boolean> {
    return compare(plain, passwordHash);
  }

  /** One-time password for admin-created accounts; shown once, then hashed. */
  generateTemporary(length = 10): string {
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
    }
    return out;
  }
}

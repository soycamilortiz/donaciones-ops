import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

const ROUNDS = 12;

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain, ROUNDS);
  }

  verify(plain: string, passwordHash: string): Promise<boolean> {
    return compare(plain, passwordHash);
  }
}

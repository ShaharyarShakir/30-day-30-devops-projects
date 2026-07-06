import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { ethers } from 'ethers';
import * as nacl from 'tweetnacl';

const PASSWORD_SALT_ROUNDS = 12;
const REFRESH_HASH_ROUNDS = 10;

// Base58 decoder for Solana signatures
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}

function decodeBase58(string: string): Uint8Array {
  if (string.length === 0) return new Uint8Array(0);
  const bytes = [0];
  for (let i = 0; i < string.length; i++) {
    const c = string[i];
    if (!(c in ALPHABET_MAP)) throw new Error('Non-base58 character');
    let carry = ALPHABET_MAP[c];
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; string[i] === '1' && i < string.length - 1; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: { id: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('a user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.users.save(
      this.users.create({ email: dto.email, passwordHash }),
    );

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('invalid email or password');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('invalid email or password');
    }

    return this.issueTokens(user);
  }

  async loginWithGithub(profile: {
    githubId: string;
    email?: string;
    username?: string;
  }): Promise<AuthResult> {
    let user = await this.users.findOne({ where: { githubId: profile.githubId } });

    if (!user) {
      if (profile.email) {
        user = await this.users.findOne({ where: { email: profile.email } });
      }
      if (!user) {
        if (!profile.email) {
          throw new UnauthorizedException(
            'GitHub account has no public email; cannot create a user',
          );
        }
        user = this.users.create({ email: profile.email });
      }
      user.githubId = profile.githubId;
      user = await this.users.save(user);
    }

    return this.issueTokens(user);
  }

  async loginWithWallet(dto: WalletLoginDto): Promise<AuthResult> {
    let verified = false;

    if (dto.chainFamily === 'evm') {
      try {
        const recoveredAddress = ethers.verifyMessage(dto.message, dto.signature);
        verified = recoveredAddress.toLowerCase() === dto.address.toLowerCase();
      } catch (err) {
        throw new UnauthorizedException('EVM signature verification failed');
      }
    } else if (dto.chainFamily === 'solana') {
      try {
        const messageBytes = new TextEncoder().encode(dto.message);
        const signatureBytes = decodeBase58(dto.signature);
        const publicKeyBytes = decodeBase58(dto.address);
        verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      } catch (err) {
        throw new UnauthorizedException('Solana signature verification failed');
      }
    }

    if (!verified) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Check if the wallet exists
    let wallet = await this.wallets.findOne({
      where: { address: dto.address, chainFamily: dto.chainFamily },
      relations: ['user'],
    });

    let user: User;

    if (wallet) {
      user = wallet.user;
    } else {
      // Create user and link wallet
      const email = `wallet-${dto.address.substring(0, 10).toLowerCase()}-${Date.now()}@chaindeploy.local`;
      user = this.users.create({ email });
      user = await this.users.save(user);

      wallet = this.wallets.create({
        userId: user.id,
        chainFamily: dto.chainFamily,
        address: dto.address,
        vaultKeyPath: `vault/wallets/${user.id}/${dto.address}`,
        isDefault: true,
      });
      await this.wallets.save(wallet);
    }

    return this.issueTokens(user);
  }

  async refresh(userId: string, presentedToken: string | null): Promise<AuthResult> {
    if (!presentedToken) {
      throw new UnauthorizedException('missing refresh token');
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('refresh token not recognized');
    }

    const matches = await bcrypt.compare(presentedToken, user.refreshTokenHash);
    if (!matches) {
      user.refreshTokenHash = null;
      await this.users.save(user);
      throw new UnauthorizedException('refresh token invalid or already used');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.users.update({ id: userId }, { refreshTokenHash: null });
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshTtl'),
    });

    user.refreshTokenHash = await bcrypt.hash(refreshToken, REFRESH_HASH_ROUNDS);
    await this.users.save(user);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }
}

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@forest/database';
import { RegisterInput, LoginInput } from './dto/auth.input';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) {}

    async register(input: RegisterInput) {
        const existingUser = await this.userRepository.findOne({
            where: { email: input.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(input.password, 10);

        const user = this.userRepository.create({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
        });

        await this.userRepository.save(user);

        const token = this.generateToken(user);
        return { token, user };
    }

    async login(input: LoginInput) {
        const user = await this.userRepository.findOne({
            where: { email: input.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(user);
        return { token, user };
    }

    private generateToken(user: User): string {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.sign(payload);
    }
}
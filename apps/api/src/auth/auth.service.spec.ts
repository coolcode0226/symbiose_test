import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let repo: any;
    let jwt: any;
    let service: AuthService;

    beforeEach(() => {
        repo = {
            findOne: jest.fn(),
            create: jest.fn((u) => u),
            save: jest.fn(async (u) => ({ id: 'u1', ...u })),
        };
        jwt = { sign: jest.fn(() => 'signed-jwt') };
        service = new AuthService(repo, jwt);
    });

    describe('register', () => {
        it('hashes the password, persists the user, and returns a token', async () => {
            repo.findOne.mockResolvedValue(null);

            const res = await service.register({ email: 'a@b.com', password: 'secret', firstName: 'A', lastName: 'B' } as any);

            expect(res.token).toBe('signed-jwt');
            expect(repo.save).toHaveBeenCalled();
            const created = repo.create.mock.calls[0][0];
            expect(created.passwordHash).not.toBe('secret');
            await expect(bcrypt.compare('secret', created.passwordHash)).resolves.toBe(true);
        });

        it('rejects a duplicate email', async () => {
            repo.findOne.mockResolvedValue({ id: 'x', email: 'a@b.com' });
            await expect(
                service.register({ email: 'a@b.com', password: 'secret' } as any),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe('login', () => {
        it('returns a token for valid credentials', async () => {
            const passwordHash = await bcrypt.hash('secret', 10);
            repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash });

            const res = await service.login({ email: 'a@b.com', password: 'secret' } as any);
            expect(res.token).toBe('signed-jwt');
        });

        it('rejects an unknown email', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(
                service.login({ email: 'x@y.com', password: 'secret' } as any),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('rejects a wrong password', async () => {
            const passwordHash = await bcrypt.hash('correct', 10);
            repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash });
            await expect(
                service.login({ email: 'a@b.com', password: 'wrong' } as any),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });
});

import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterInput, LoginInput } from './dto/auth.input';
import { AuthPayload } from './dto/auth.types';

@Resolver()
export class AuthResolver {
    constructor(private authService: AuthService) {}

    @Mutation(() => AuthPayload)
    async register(@Args('input') input: RegisterInput) {
        return this.authService.register(input);
    }

    @Mutation(() => AuthPayload)
    async login(@Args('input') input: LoginInput) {
        return this.authService.login(input);
    }

    @Mutation(() => Boolean)
    async logout() {
        // JWT logout is client-side (remove token)
        return true;
    }
}
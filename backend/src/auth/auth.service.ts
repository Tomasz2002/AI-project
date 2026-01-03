import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../models/user.model';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<IUser>,
    private jwtService: JwtService,
  ) {}

  async register(name: string, email: string, pass: string) {
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) throw new ConflictException('Użytkownik o tym e-mailu już istnieje.');

    const hashedPassword = await bcrypt.hash(pass, 10);
    const newUser = new this.userModel({ name, email, password: hashedPassword });
    await newUser.save();
    return { message: 'Rejestracja pomyślna' };
  }

  async login(email: string, pass: string) {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(pass, user.password)) {
      const payload = { email: user.email, sub: user._id };
      return { 
        access_token: this.jwtService.sign(payload),
        user: { name: user.name, email: user.email }
      };
    }
    throw new UnauthorizedException('Błędne dane logowania');
  }
}
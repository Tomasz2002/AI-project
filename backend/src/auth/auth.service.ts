import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser, User } from '../models/user.model';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<IUser>,
    private jwtService: JwtService,
  ) {}

  async register(name: string, email: string, pass: string) {
    const hashedPassword = await bcrypt.hash(pass, 10);
    const newUser = new this.userModel({ name, email, password: hashedPassword });
    return newUser.save();
  }

  async login(email: string, pass: string) {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(pass, user.password)) {
      const payload = { email: user.email, sub: user._id };
      return { access_token: this.jwtService.sign(payload) };
    }
    throw new UnauthorizedException('Błędne dane logowania');
  }
}
import { User, IUserDocument } from '../models/user.model';
import { UserRole, UserResponseDTO } from '../types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponseDTO;
}

export function formatUserDTO(user: IUserDocument): UserResponseDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  // Public user registration - ALWAYS forces role: 'user'
  static async register(data: RegisterDTO): Promise<AuthResponse> {
    const email = data.email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error: any = new Error('Email address is already registered');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user (strictly forced as 'user')
    const newUser = await User.create({
      name: data.name.trim(),
      email,
      passwordHash,
      role: 'user',
    });

    const userDTO = formatUserDTO(newUser);
    const token = generateToken({
      userId: userDTO.id,
      email: userDTO.email,
      role: userDTO.role,
    });

    return { token, user: userDTO };
  }

  // Normal User Login - Rejects Admin accounts
  static async login(data: LoginDTO): Promise<AuthResponse> {
    const email = data.email.toLowerCase().trim();

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Enforce role separation: Admins must use /admin/login
    if (user.role === 'admin') {
      const error: any = new Error(
        'Admin accounts must log in via the Administration Portal at /admin/login'
      );
      error.statusCode = 403;
      throw error;
    }

    const userDTO = formatUserDTO(user);
    const token = generateToken({
      userId: userDTO.id,
      email: userDTO.email,
      role: userDTO.role,
    });

    return { token, user: userDTO };
  }

  // Admin Portal Login - Enforces role === 'admin'
  static async adminLogin(data: LoginDTO): Promise<AuthResponse> {
    const email = data.email.toLowerCase().trim();

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      const error: any = new Error('Invalid administrator credentials');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid administrator credentials');
      error.statusCode = 401;
      throw error;
    }

    // Enforce role separation: Non-admins cannot log in as Admin
    if (user.role !== 'admin') {
      const error: any = new Error(
        'Access denied: Account is not authorized for the Administration Portal'
      );
      error.statusCode = 403;
      throw error;
    }

    const userDTO = formatUserDTO(user);
    const token = generateToken({
      userId: userDTO.id,
      email: userDTO.email,
      role: userDTO.role,
    });

    return { token, user: userDTO };
  }

  static async getUserById(userId: string): Promise<UserResponseDTO> {
    const user = await User.findById(userId);
    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return formatUserDTO(user);
  }
}

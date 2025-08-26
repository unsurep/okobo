import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { 
          success: false,
          error: 'All fields are required',
          message: 'Please fill in all required fields' 
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Password too short',
          message: 'Password must be at least 6 characters long' 
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email format',
          message: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User already exists',
          message: 'An account with this email already exists' 
        },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    const token = generateToken(user._id);

    const { password: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Welcome to Okobo Bank.',
      user: {
        id: userWithoutPassword._id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        createdAt: userWithoutPassword.createdAt
      },
      token
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          message: errorMessages[0] || 'Please check your input and try again'
        },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Duplicate entry',
          message: 'An account with this email already exists'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.'
      },
      { status: 500 }
    );
  }
}
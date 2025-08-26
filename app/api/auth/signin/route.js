import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing credentials',
          message: 'Email and password are required' 
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

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid credentials',
          message: 'No account found with this email address' 
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid credentials',
          message: 'Incorrect password. Please try again.' 
        },
        { status: 401 }
      );
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    const { password: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}! You have successfully signed in.`,
      user: {
        id: userWithoutPassword._id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        createdAt: userWithoutPassword.createdAt
      },
      token
    }, { status: 200 });

  } catch (error) {
    console.error('Signin error:', error);

    if (error.name === 'CastError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request',
          message: 'Please check your input and try again'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Unable to sign in. Please try again later.'
      },
      { status: 500 }
    );
  }
}
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/index.js';
import bcrypt from "bcryptjs";

const generateAccessAndRefreshTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
};

const options = {
    httpOnly: true, 
    secure: true,
};

export const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await prisma.users.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new ApiError(409, "User with given email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
        data: {
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,   
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
        }
    });

    return res
        .status(201)
        .json(new ApiResponse(201, user, "User registered successfully"));
});


export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await prisma.users.findUnique({
        where: { email },
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        generateAccessAndRefreshTokens(user.id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                    },
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});
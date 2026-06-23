import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const useMock = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;
    const otp = useMock ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Upsert the verification token in the database
    await db.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: otp,
        },
      },
      update: {
        expires,
      },
      create: {
        identifier: email,
        token: otp,
        expires,
      },
    });

    if (useMock) {
      return NextResponse.json(
        { message: "MOCK_OTP", otp: "123456" },
        { status: 200 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"CareerSync Pro" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your CareerSync Verification Code",
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #fff; border-radius: 12px; border: 1px solid #333;">
          <h2 style="color: #3b82f6;">Verify your email</h2>
          <p>Welcome to CareerSync Pro. Use the following code to complete your registration:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "OTP sent successfully", otp }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message: "Error", error: errorMessage }, { status: 500 });
  }
}

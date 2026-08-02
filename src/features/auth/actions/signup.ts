"use server";

import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";

export type SignupState = {
  error?: string;
  success?: boolean;
};

export async function signupUser(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your input and try again." };
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
      },
    });

    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

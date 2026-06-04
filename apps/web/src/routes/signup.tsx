import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@heroui/react";
import { useState } from "react";
import { signUp, signIn } from "@/lib/auth";
import { FormField } from "@/features/auth/components/FormField";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const { error } = await signUp.email(values);
    if (error) {
      setSubmitError(error.message ?? "Sign up failed");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const onGoogleSignIn = async () => {
    setSubmitError(null);
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <h1 className="text-2xl font-bold">Create account</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField control={control} name="name" label="Name" placeholder="Asahi" />
          <FormField control={control} name="email" label="Email" type="email" placeholder="you@example.com" />
          <FormField control={control} name="password" label="Password" type="password" />
          {submitError && <p className="text-sm text-danger">{submitError}</p>}

          <div className="flex flex-col gap-3 mt-2">
            <Button type="submit" variant="primary" fullWidth isPending={isSubmitting}>
              Sign up
            </Button>

            <div className="flex items-center gap-2 text-xs text-default-400">
              <span className="flex-1 h-px bg-default-200" />
              OR
              <span className="flex-1 h-px bg-default-200" />
            </div>

            <Button type="button" variant="outline" fullWidth onPress={onGoogleSignIn}>
              Continue with Google
            </Button>
          </div>
        </form>

        <p className="text-sm text-default-500 text-center">
          Already have an account? <Link to="/signin" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

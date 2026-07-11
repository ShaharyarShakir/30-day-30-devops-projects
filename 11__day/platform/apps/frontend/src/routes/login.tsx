import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, KeyRound } from "lucide-react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const Route = createFileRoute("/login")({
  component: LoginPage
});

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    alert(`Authenticated successfully as ${data.email}`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4">
      {/* Glow background shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass p-8 rounded-2xl glow border border-slate-800/80 relative z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2
            className="text-3xl font-extrabold text-white mb-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Welcome Back
          </h2>
          <p className="text-sm text-slate-400">Sign in to manage your DevOps platform</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-1">
            <Input
              type="email"
              label="Email Address"
              placeholder="developer@platform.local"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <a
                href="#"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Forgot Password?
              </a>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full py-3" isLoading={isSubmitting}>
            Authenticate
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          New to the platform?{" "}
          <Link
            to="/register"
            className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

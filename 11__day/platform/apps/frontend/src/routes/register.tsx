import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Shield, Sparkles } from "lucide-react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const Route = createFileRoute("/register")({
  component: RegisterPage
});

const registerSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptGuidelines: z.boolean().refine((val) => val === true, {
    message: "You must accept the security guidelines"
  })
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      acceptGuidelines: false
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    alert(`Account created for ${data.displayName} (${data.email})`);
    navigate({ to: "/login" });
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4">
      {/* Glow background shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass p-8 rounded-2xl glow border border-slate-800/80 relative z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2
            className="text-3xl font-extrabold text-white mb-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Create Account
          </h2>
          <p className="text-sm text-slate-400">Join the next-generation microservices platform</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <Input
              type="text"
              label="Display Name"
              placeholder="Jane Doe"
              error={errors.displayName?.message}
              {...register("displayName")}
            />
          </div>

          <div className="space-y-1">
            <Input
              type="email"
              label="Email Address"
              placeholder="jane.doe@platform.local"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div className="space-y-1">
            <Input
              type="password"
              label="Password"
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
              {...register("password")}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-start gap-2.5 py-1 text-xs text-slate-400">
              <input
                type="checkbox"
                className="mt-0.5 border-slate-800 bg-slate-900 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                {...register("acceptGuidelines")}
              />
              <span>I accept the platform's security boundaries and guidelines.</span>
            </div>
            {errors.acceptGuidelines && (
              <span className="text-xs text-red-400 font-medium">
                {errors.acceptGuidelines.message}
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-full py-3" isLoading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

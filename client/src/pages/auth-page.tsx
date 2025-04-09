import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true);
  const { user, loginMutation, registerMutation } = useAuth();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Extract only the fields needed for registration
    const { confirmPassword, ...registrationData } = values;
    registerMutation.mutate(registrationData);
  };

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      {isLoginView ? (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Chat App</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Connect with your friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <div className="space-y-1">
                <label className="font-medium text-sm" htmlFor="login-username">
                  Username
                </label>
                <Input 
                  id="login-username"
                  placeholder="Enter your username" 
                  {...loginForm.register("username")} 
                />
                {loginForm.formState.errors.username && (
                  <p className="text-sm text-red-500">
                    {loginForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="font-medium text-sm" htmlFor="login-password">
                  Password
                </label>
                <Input 
                  id="login-password"
                  type="password" 
                  placeholder="Enter your password" 
                  {...loginForm.register("password")} 
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Button 
                  variant="link" 
                  className="p-0 text-primary hover:text-accent font-medium"
                  onClick={() => setIsLoginView(false)}
                >
                  Register
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Create Account</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Join our community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="font-medium text-sm" htmlFor="register-name">
                  Full Name
                </label>
                <Input 
                  id="register-name"
                  placeholder="John Doe" 
                  {...registerForm.register("name")} 
                />
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="font-medium text-sm" htmlFor="register-username">
                  Username
                </label>
                <Input 
                  id="register-username"
                  placeholder="johndoe" 
                  {...registerForm.register("username")} 
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="font-medium text-sm" htmlFor="register-password">
                  Password
                </label>
                <Input 
                  id="register-password"
                  type="password" 
                  placeholder="Create a password" 
                  {...registerForm.register("password")} 
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="font-medium text-sm" htmlFor="register-confirm-password">
                  Confirm Password
                </label>
                <Input 
                  id="register-confirm-password"
                  type="password" 
                  placeholder="Confirm your password" 
                  {...registerForm.register("confirmPassword")} 
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-2" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="p-0 text-primary hover:text-accent font-medium"
                  onClick={() => setIsLoginView(true)}
                >
                  Log In
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
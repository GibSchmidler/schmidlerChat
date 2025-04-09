import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UpdateProfile } from "@shared/schema";

// Create a schema for the profile form
const ProfileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  avatarUrl: z.string().url("Must be a valid URL").optional().nullable(),
  theme: z.enum(["light", "dark"]),
});

export default function ProfilePage() {
  const { user, isLoading, updateProfileMutation } = useAuth();

  // Define form
  const form = useForm<z.infer<typeof ProfileFormSchema>>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: "",
      bio: "",
      avatarColor: "#6366f1",
      avatarUrl: "",
      theme: "light",
    },
  });

  // Load user data into form when available
  useEffect(() => {
    if (user) {
      // Convert user theme to the correct type or fallback to "light"
      const themeValue = (user.theme === "dark") ? "dark" : "light";
      
      form.reset({
        name: user.name,
        bio: user.bio || "",
        avatarColor: user.avatarColor || "#6366f1",
        avatarUrl: user.avatarUrl || "",
        theme: themeValue,
      });
    }
  }, [user, form.reset]);

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    return <Redirect to="/auth" />;
  }

  // Handle form submission
  const onSubmit = (data: z.infer<typeof ProfileFormSchema>) => {
    updateProfileMutation.mutate(data as UpdateProfile);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public display name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little about yourself"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your bio will be visible to other users
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/your-avatar.jpg"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for your profile picture (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar Color</FormLabel>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full border"
                        style={{ backgroundColor: field.value }}
                      />
                      <FormControl>
                        <Input
                          type="color"
                          {...field}
                          className="w-16 h-10 p-1"
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      Choose a color for your avatar if no image URL is provided
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose your preferred theme
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateProfileMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Changes will be visible to other users immediately
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
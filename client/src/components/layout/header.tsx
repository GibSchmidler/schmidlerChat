import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, Home, User } from "lucide-react";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  if (!user) return null;
  
  // Create initials from user's name
  const initials = user.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-primary">Chat App</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setLocation('/')}
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 focus:outline-none p-1 h-auto">
                {user.avatarUrl ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials on image error
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.classList.add('text-white', 'flex', 'items-center', 'justify-center');
                        e.currentTarget.parentElement!.style.backgroundColor = user.avatarColor || '#6366f1';
                        e.currentTarget.parentElement!.innerHTML = `<span>${initials}</span>`;
                      }}
                    />
                  </div>
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center"
                    style={{ backgroundColor: user.avatarColor || '#6366f1' }}
                  >
                    <span>{initials}</span>
                  </div>
                )}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {user.name}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-gray-700 dark:text-gray-200 cursor-pointer"
                onClick={() => setLocation('/profile')}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()}
                className="text-red-500 cursor-pointer"
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </div>
                ) : (
                  "Logout"
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

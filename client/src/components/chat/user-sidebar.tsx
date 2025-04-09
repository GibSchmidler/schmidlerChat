import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";

type UserStatus = "online" | "offline";

interface UserWithStatus extends User {
  status: UserStatus;
}

interface UserSidebarProps {
  onlineUsers?: number[];
  currentUserId?: number;
}

export default function UserSidebar({ onlineUsers = [], currentUserId }: UserSidebarProps) {
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Combine users with their online status
  const usersWithStatus: UserWithStatus[] = users?.map(user => ({
    ...user,
    status: onlineUsers.includes(user.id) ? "online" : "offline"
  })) || [];

  // Sort users: current user first, then online users, then offline users
  const sortedUsers = [...usersWithStatus].sort((a, b) => {
    // Current user comes first
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    
    // Online users come before offline users
    if (a.status === "online" && b.status === "offline") return -1;
    if (a.status === "offline" && b.status === "online") return 1;
    
    // Alphabetical by name
    return a.name.localeCompare(b.name);
  });

  if (isLoading) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:block">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Active Users</h2>
        </div>
        <div className="p-3 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:block">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Active Users</h2>
        </div>
        <div className="p-4 text-sm text-red-500">
          Failed to load users
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:block mt-[60px]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Active Users</h2>
      </div>
      
      <div className="overflow-y-auto h-full">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedUsers.map((user) => {
            // Create initials from user's name
            const initials = user.name
              .split(' ')
              .map(part => part[0])
              .join('')
              .toUpperCase();
              
            // Get random background color based on user id for avatar
            const colors = ['bg-primary', 'bg-secondary', 'bg-accent'];
            const bgColor = colors[user.id % colors.length];
            
            return (
              <li 
                key={user.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center space-x-3 p-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                      <AvatarFallback style={{ backgroundColor: user.avatarColor || '#6366f1' }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${
                      user.status === "online" 
                        ? "bg-green-500" 
                        : "bg-gray-300 dark:bg-gray-600"
                      } rounded-full border-2 border-white dark:border-gray-800`}
                    ></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name} {user.id === currentUserId ? ' (You)' : ''}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        @{user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {user.status === "online" ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

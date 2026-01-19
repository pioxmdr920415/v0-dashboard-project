import React, { useState, useEffect } from 'react';
import { User, Clock, MessageCircle, Edit2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const PresenceIndicator = ({ users, currentUserId }) => {
  const [showAllUsers, setShowAllUsers] = useState(false);

  if (!users || users.length === 0) {
    return null;
  }

  // Filter out current user and sort by last activity
  const otherUsers = users
    .filter(user => user.id !== currentUserId)
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

  if (otherUsers.length === 0) {
    return null;
  }

  // Show only the first 3 users by default
  const visibleUsers = showAllUsers ? otherUsers : otherUsers.slice(0, 3);
  const hiddenCount = otherUsers.length - visibleUsers.length;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm text-gray-900">
            <User className="w-4 h-4 inline mr-1 text-amber-500" />
            Collaborators ({otherUsers.length})
          </h4>
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllUsers(!showAllUsers)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              {showAllUsers ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {visibleUsers.map((user) => (
            <TooltipProvider key={user.id} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-amber-500 text-white text-xs">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                          {user.name}
                        </span>
                        {user.isEditing && (
                          <Edit2 className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {user.lastActivity ? (
                          <span>{new Date(user.lastActivity).toLocaleTimeString()}</span>
                        ) : (
                          <span>Active now</span>
                        )}
                      </div>
                    </div>
                    {user.unreadMessages > 0 && (
                      <div className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {user.unreadMessages}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <div className="p-2">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {user.isEditing ? 'Currently editing' : 'Viewing document'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {otherUsers.length > 3 && !showAllUsers && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowAllUsers(true)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              View all collaborators
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceIndicator;

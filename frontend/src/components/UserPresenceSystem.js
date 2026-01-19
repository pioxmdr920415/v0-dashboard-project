import React, { useState, useEffect } from 'react';
import { User, Clock, LogOut, FileText, Users, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const UserPresenceSystem = ({ 
  isOpen, 
  onClose, 
  users, 
  currentUserId,
  onUserActivity 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    // Filter and sort users
    const filteredUsers = users
      .filter(user => user.id !== currentUserId) // Exclude current user
      .sort((a, b) => {
        // Sort by activity: active users first, then by last activity time
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return new Date(b.lastActivity) - new Date(a.lastActivity);
      });
    
    setActiveUsers(filteredUsers);
  }, [users, currentUserId]);

  const handleUserClick = (userId) => {
    if (onUserActivity) {
      onUserActivity(userId);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed left-4 top-20 z-40 w-64 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="bg-amber-500 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="font-semibold text-sm">User Presence</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-black/10 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Summary */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {activeUsers.slice(0, 3).map((user) => (
                    <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-amber-500 text-white text-xs">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {activeUsers.length > 3 && (
                    <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold">
                      +{activeUsers.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} online
                </span>
              </div>
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto p-2 max-h-[400px]">
            {activeUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No other users online</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeUsers.map((user) => (
                  <TooltipProvider key={user.id} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => handleUserClick(user.id)}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${user.isActive ? 'border-l-2 border-amber-500' : 'border-l-2 border-transparent'}`}
                        >
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback className="bg-amber-500 text-white text-xs">
                                {user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {user.isActive && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-medium truncate max-w-[100px] ${user.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                {user.name}
                              </span>
                              {user.isEditing && (
                                <Edit2 className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              {user.currentDocument ? (
                                <>
                                  <FileText className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{user.currentDocument}</span>
                                </>
                              ) : (
                                <span>Not viewing any document</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {user.lastActivity ? (
                                  user.isActive ? 'Active now' : 
                                  formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })
                                ) : 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="p-2">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.currentDocument && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400">Current document:</p>
                              <p className="text-sm bg-gray-100 p-1 rounded truncate max-w-[200px]">{user.currentDocument}</p>
                            </div>
                          )}
                          <div className="mt-2 text-xs text-gray-400">
                            {user.isActive ? 'Active now' : 
                             `Last active ${formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}`}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </div>

          {/* Current user info */}
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={users.find(u => u.id === currentUserId)?.avatar} />
                <AvatarFallback className="bg-amber-500 text-white text-xs">
                  {users.find(u => u.id === currentUserId)?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">
                You are visible to other users
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserPresenceSystem;

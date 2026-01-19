import React, { useState, useEffect, useRef } from 'react';
import { User, Edit2, MousePointer2, X, Eye, EyeOff } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const ChangeTracking = ({ 
  isOpen, 
  onClose, 
  users, 
  selections, 
  currentUserId,
  documentId 
}) => {
  const [showAllSelections, setShowAllSelections] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Generate unique colors for each user
  const getUserColor = (userId) => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#7c3aed'
    ];
    
    // Use user ID to consistently assign the same color
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Filter out current user's selections
  const otherUsersSelections = selections.filter(s => s.userId !== currentUserId);

  if (!isOpen || otherUsersSelections.length === 0) {
    return null;
  }

  return (
    <div className={`fixed left-4 bottom-20 z-40 w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="bg-amber-500 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MousePointer2 className="w-5 h-5" />
          <span className="font-semibold text-sm">Live Cursors</span>
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
          {/* Controls */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {otherUsersSelections.length} {otherUsersSelections.length === 1 ? 'user is' : 'users are'} editing
              </span>
              <button
                onClick={() => setShowAllSelections(!showAllSelections)}
                className={`text-xs font-medium flex items-center gap-1 ${showAllSelections ? 'text-amber-600' : 'text-gray-500'}`}
              >
                {showAllSelections ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Hide cursors
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Show cursors
                  </>
                )}
              </button>
            </div>
          </div>

          {/* User selections */}
          <div className="flex-1 overflow-y-auto p-3">
            {otherUsersSelections.map((selection) => {
              const user = users.find(u => u.id === selection.userId) || { name: 'Unknown', avatar: null };
              const color = getUserColor(selection.userId);

              return (
                <TooltipProvider key={selection.userId} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer mb-2">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="bg-amber-500 text-white text-xs">
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div 
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white" 
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                              {user.name}
                            </span>
                            <Edit2 className="w-3 h-3 text-blue-500" />
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span>Selecting: {selection.text || 'text'}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Position: {selection.position || 'unknown'}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="p-2">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400">Selection:</p>
                          <p className="text-sm bg-gray-100 p-1 rounded">{selection.text || 'No text selected'}</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Legend */}
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-2 justify-center">
              <MousePointer2 className="w-3 h-3" />
              <span>Color-coded cursors show where others are editing</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChangeTracking;

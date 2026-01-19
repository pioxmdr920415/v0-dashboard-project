import React, { useState, useEffect, useRef } from 'react';
import { Send, User, X, MessageCircle, ChevronDown, ChevronUp, AtSign, Paperclip, Smile } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

const LiveChatSidebar = ({ 
  isOpen, 
  onClose, 
  users, 
  messages, 
  onSendMessage, 
  currentUserId,
  documentId 
}) => {
  const [messageText, setMessageText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const messagesEndRef = useRef(null);
  const mentionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage({
        text: messageText,
        documentId,
        userId: currentUserId,
        timestamp: new Date().toISOString()
      });
      setMessageText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }

    // Handle @ mentions
    if (e.key === '@') {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = messageText.substring(0, cursorPosition);
      const lastSpace = textBeforeCursor.lastIndexOf(' ');
      const currentWord = textBeforeCursor.substring(lastSpace + 1);

      if (currentWord === '@') {
        setShowMentionSuggestions(true);
        mentionRef.current = {
          position: cursorPosition,
          word: currentWord
        };
      }
    }
  };

  const handleMentionSelect = (user) => {
    const mentionText = `@${user.name} `;
    const newText = messageText.substring(0, mentionRef.current.position) + 
                   mentionText + 
                   messageText.substring(mentionRef.current.position);
    setMessageText(newText);
    setShowMentionSuggestions(false);
    
    // Focus the input and set cursor position
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.focus();
        input.selectionStart = input.selectionEnd = mentionRef.current.position + mentionText.length;
      }
    }, 50);
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className={`fixed right-4 bottom-20 z-40 w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="bg-amber-500 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Document Chat</span>
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
          {/* User count indicator */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {users.slice(0, 3).map((user) => (
                  <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-amber-500 text-white text-xs">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {users.length > 3 && (
                  <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold">
                    +{users.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-600">
                {users.length} {users.length === 1 ? 'user' : 'users'} active
              </span>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3 overflow-y-auto">
            {Object.entries(groupedMessages).map(([date, messages]) => (
              <div key={date} className="mb-4">
                <div className="text-center mb-2">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                {messages.map((message, index) => {
                  const isCurrentUser = message.userId === currentUserId;
                  const user = users.find(u => u.id === message.userId) || { name: 'Unknown', avatar: null };
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex gap-2 mb-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCurrentUser && (
                        <Avatar className="w-6 h-6 mt-auto">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-amber-500 text-white text-xs">
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${isCurrentUser ? 'bg-amber-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`font-semibold text-xs ${isCurrentUser ? 'text-amber-100' : 'text-amber-600'}`}>
                            {user.name}
                          </span>
                          <span className={`text-xs ${isCurrentUser ? 'text-amber-200' : 'text-gray-500'}`}>
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                          {message.text}
                        </div>
                      </div>
                      
                      {isCurrentUser && (
                        <Avatar className="w-6 h-6 mt-auto">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-amber-500 text-white text-xs">
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Mention suggestions */}
          {showMentionSuggestions && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 m-3">
              <div className="text-xs text-gray-500 mb-1">Suggested users</div>
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleMentionSelect(user)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-amber-500 text-white text-xs">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="relative">
              <Input
                id="chat-input"
                type="text"
                placeholder={`Message #${documentId}`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-10"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="absolute right-1 top-1 h-7 w-7 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Press Enter to send
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveChatSidebar;

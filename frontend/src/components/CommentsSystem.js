import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, ChevronDown, ChevronUp, X, AtSign, Reply, Trash2, Edit2, Check, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';

const Comment = ({ 
  comment, 
  users, 
  currentUserId, 
  onReply, 
  onEdit, 
  onDelete, 
  onLike, 
  replies, 
  depth = 0 
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplies, setShowReplies] = useState(depth < 2); // Show replies for top-level comments by default
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const mentionRef = useRef(null);

  const user = users.find(u => u.id === comment.userId) || { name: 'Unknown', avatar: null };
  const isCurrentUser = comment.userId === currentUserId;

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText('');
      setIsReplying(false);
    }
  };

  const handleEdit = () => {
    if (editText.trim()) {
      onEdit(comment.id, editText);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (type === 'reply') {
        handleReply();
      } else if (type === 'edit') {
        handleEdit();
      }
    }

    // Handle @ mentions
    if (e.key === '@') {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = (type === 'reply' ? replyText : editText).substring(0, cursorPosition);
      const lastSpace = textBeforeCursor.lastIndexOf(' ');
      const currentWord = textBeforeCursor.substring(lastSpace + 1);

      if (currentWord === '@') {
        setShowMentionSuggestions(true);
        mentionRef.current = {
          position: cursorPosition,
          word: currentWord,
          type
        };
      }
    }
  };

  const handleMentionSelect = (user) => {
    const mentionText = `@${user.name} `;
    let newText;
    
    if (mentionRef.current.type === 'reply') {
      newText = replyText.substring(0, mentionRef.current.position) + 
               mentionText + 
               replyText.substring(mentionRef.current.position);
      setReplyText(newText);
    } else {
      newText = editText.substring(0, mentionRef.current.position) + 
               mentionText + 
               editText.substring(mentionRef.current.position);
      setEditText(newText);
    }

    setShowMentionSuggestions(false);
    
    // Focus the input and set cursor position
    setTimeout(() => {
      const input = mentionRef.current.type === 'reply' ? 
        document.getElementById(`reply-input-${comment.id}`) : 
        document.getElementById(`edit-input-${comment.id}`);
      
      if (input) {
        input.focus();
        input.selectionStart = input.selectionEnd = mentionRef.current.position + mentionText.length;
      }
    }, 50);
  };

  return (
    <div 
      className={`mb-4 ${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`} 
      style={{ marginLeft: depth > 0 ? `${depth * 16}px` : '0' }}
    >
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-amber-500 text-white text-xs">
            {user.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{user.name}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                </span>
              </div>
              {isCurrentUser && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditText(comment.text);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <Input
                  id={`edit-input-${comment.id}`}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'edit')}
                  className="w-full"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`text-sm text-gray-800 ${isEditing ? 'hidden' : ''}`}>
                {comment.text}
              </div>
            )}

            {showMentionSuggestions && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 mt-2">
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

            <div className="flex items-center gap-4 mt-3 text-xs">
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-gray-500 hover:text-amber-600 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
              <button
                onClick={() => onLike(comment.id)}
                className={`flex items-center gap-1 ${comment.likedBy.includes(currentUserId) ? 'text-amber-600' : 'text-gray-500 hover:text-amber-600'}`}
              >
                👍 {comment.likes}
              </button>
              {replies && replies.length > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-gray-500 hover:text-amber-600 flex items-center gap-1"
                >
                  {showReplies ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {isReplying && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <Input
                    id={`reply-input-${comment.id}`}
                    type="text"
                    placeholder={`Reply to ${user.name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'reply')}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {showReplies && replies && replies.length > 0 && (
            <div className="mt-3">
              {replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  users={users}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onLike={onLike}
                  replies={[]}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentsSystem = ({ 
  isOpen, 
  onClose, 
  users, 
  comments, 
  onAddComment, 
  onReplyComment, 
  onEditComment, 
  onDeleteComment, 
  onLikeComment, 
  currentUserId,
  documentId 
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(null);
  const mentionRef = useRef(null);

  const handleAddComment = () => {
    if (newCommentText.trim()) {
      onAddComment({
        text: newCommentText,
        documentId,
        userId: currentUserId,
        timestamp: new Date().toISOString(),
        replies: []
      });
      setNewCommentText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }

    // Handle @ mentions
    if (e.key === '@') {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = newCommentText.substring(0, cursorPosition);
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
    const newText = newCommentText.substring(0, mentionRef.current.position) + 
                   mentionText + 
                   newCommentText.substring(mentionRef.current.position);
    setNewCommentText(newText);
    setShowMentionSuggestions(false);
    
    // Focus the input and set cursor position
    setTimeout(() => {
      const input = document.getElementById('new-comment-input');
      if (input) {
        input.focus();
        input.selectionStart = input.selectionEnd = mentionRef.current.position + mentionText.length;
      }
    }, 50);
  };

  // Group comments by date
  const groupedComments = comments.reduce((groups, comment) => {
    const date = format(new Date(comment.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(comment);
    return groups;
  }, {});

  return (
    <div className={`fixed right-4 bottom-20 z-40 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="bg-amber-500 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Document Comments</span>
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
          {/* Comments */}
          <ScrollArea className="flex-1 p-3 overflow-y-auto max-h-[500px]">
            {Object.entries(groupedComments).map(([date, comments]) => (
              <div key={date} className="mb-6">
                <div className="text-center mb-3">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {format(new Date(date), 'MMMM d, yyyy')}
                  </span>
                </div>
                {comments.map((comment) => (
                  <Comment
                    key={comment.id}
                    comment={comment}
                    users={users}
                    currentUserId={currentUserId}
                    onReply={onReplyComment}
                    onEdit={onEditComment}
                    onDelete={onDeleteComment}
                    onLike={onLikeComment}
                    replies={comment.replies || []}
                  />
                ))}
              </div>
            ))}
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

          {/* New Comment Input */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={users.find(u => u.id === currentUserId)?.avatar} />
                <AvatarFallback className="bg-amber-500 text-white text-xs">
                  {users.find(u => u.id === currentUserId)?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                id="new-comment-input"
                type="text"
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newCommentText.trim()}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Press Enter to post
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CommentsSystem;

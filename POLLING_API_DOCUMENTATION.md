# Polling API Documentation

## Overview
The polling system allows users to create polls on posts, vote on polls, and view real-time results. Each post can have one active poll at a time.

## Database Schema

### Tables
- **polls**: Main poll information
- **poll_options**: Available options for each poll
- **poll_votes**: User votes on poll options

### Key Features
- Single or multiple vote polls
- Expiration dates
- Real-time vote counting
- Percentage calculations
- User vote tracking

## API Endpoints

### 1. Get Polls for a Post
```http
GET /api/polls/post/:postId
```

**Response:**
```json
{
  "polls": [
    {
      "id": 1,
      "question": "Who do you think will win the 2027 presidential election?",
      "description": "Based on current political climate and voter sentiment",
      "is_active": true,
      "allow_multiple_votes": false,
      "expires_at": "2024-12-31T23:59:59Z",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": null,
      "options": [
        {
          "id": 1,
          "option_text": "Peter Obi (Labour Party)",
          "vote_count": 45,
          "user_voted": false
        },
        {
          "id": 2,
          "option_text": "Bola Tinubu (APC)",
          "vote_count": 32,
          "user_voted": true
        },
        {
          "id": 3,
          "option_text": "Atiku Abubakar (PDP)",
          "vote_count": 28,
          "user_voted": false
        }
      ],
      "total_votes": 105
    }
  ],
  "total": 1
}
```

### 2. Get Single Poll with Detailed Results
```http
GET /api/polls/:pollId
```

**Response:**
```json
{
  "id": 1,
  "question": "Who do you think will win the 2027 presidential election?",
  "description": "Based on current political climate and voter sentiment",
  "is_active": true,
  "allow_multiple_votes": false,
  "expires_at": "2024-12-31T23:59:59Z",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": null,
  "options": [
    {
      "id": 1,
      "option_text": "Peter Obi (Labour Party)",
      "vote_count": 45,
      "percentage": 42.9,
      "user_voted": false
    },
    {
      "id": 2,
      "option_text": "Bola Tinubu (APC)",
      "vote_count": 32,
      "percentage": 30.5,
      "user_voted": true
    },
    {
      "id": 3,
      "option_text": "Atiku Abubakar (PDP)",
      "vote_count": 28,
      "percentage": 26.7,
      "user_voted": false
    }
  ],
  "total_votes": 105
}
```

### 3. Create a Poll
```http
POST /api/polls
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "postId": 1,
  "question": "What is the most pressing issue facing Nigeria today?",
  "description": "Select the issue that affects you most",
  "options": [
    "Security (Banditry/Kidnapping)",
    "Economy (Inflation/Fuel Prices)",
    "Education (ASUU Strikes)",
    "Healthcare (Poor Facilities)",
    "Corruption",
    "Youth Unemployment"
  ],
  "allowMultipleVotes": true,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": 2,
  "question": "What is the most pressing issue facing Nigeria today?",
  "description": "Select the issue that affects you most",
  "is_active": true,
  "allow_multiple_votes": true,
  "expires_at": "2024-12-31T23:59:59Z",
  "created_at": "2024-01-15T10:00:00Z",
  "options": [
    {
      "id": 4,
      "option_text": "Security (Banditry/Kidnapping)",
      "vote_count": 0,
      "percentage": 0,
      "user_voted": false
    }
  ],
  "total_votes": 0
}
```

### 4. Vote on a Poll
```http
POST /api/polls/:pollId/vote
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "optionIds": [1, 3]
}
```

**Response:** Returns updated poll with new vote counts and percentages.

### 5. Update a Poll (Admin/Poll Creator Only)
```http
PUT /api/polls/:pollId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "question": "Updated question",
  "description": "Updated description",
  "isActive": true,
  "allowMultipleVotes": false,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### 6. Delete a Poll (Admin Only)
```http
DELETE /api/polls/:pollId
Authorization: Bearer <token>
```

### 7. Get Poll Statistics (Admin Only)
```http
GET /api/polls/:pollId/stats
Authorization: Bearer <token>
```

## Frontend Integration Guide

### 1. React Component for Poll Display

```tsx
// components/Poll.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PollOption {
  id: number;
  option_text: string;
  vote_count: number;
  percentage: number;
  user_voted: boolean;
}

interface Poll {
  id: number;
  question: string;
  description?: string;
  is_active: boolean;
  allow_multiple_votes: boolean;
  expires_at?: string;
  options: PollOption[];
  total_votes: number;
}

interface PollProps {
  poll: Poll;
  onVote?: (pollId: number, optionIds: number[]) => void;
}

const Poll: React.FC<PollProps> = ({ poll, onVote }) => {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Check if user has already voted
    const userVoted = poll.options.some(option => option.user_voted);
    setHasVoted(userVoted);

    // Check if poll has expired
    if (poll.expires_at) {
      setIsExpired(new Date() > new Date(poll.expires_at));
    }
  }, [poll]);

  const handleOptionClick = (optionId: number) => {
    if (hasVoted || isExpired) return;

    if (poll.allow_multiple_votes) {
      setSelectedOptions(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `/api/polls/${poll.id}/vote`,
        { optionIds: selectedOptions },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setHasVoted(true);
      onVote?.(poll.id, selectedOptions);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {poll.question}
        </h3>
        {poll.description && (
          <p className="text-gray-600 text-sm mb-4">{poll.description}</p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{poll.total_votes} votes</span>
          {poll.expires_at && (
            <span>
              Expires: {new Date(poll.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {poll.options.map((option) => (
          <div key={option.id} className="relative">
            <button
              onClick={() => handleOptionClick(option.id)}
              disabled={hasVoted || isExpired}
              className={`w-full p-3 text-left rounded-lg border transition-colors ${
                selectedOptions.includes(option.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${hasVoted || isExpired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.option_text}</span>
                {hasVoted && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {option.vote_count} votes
                    </span>
                    <span className="text-sm text-gray-500">
                      ({option.percentage}%)
                    </span>
                  </div>
                )}
              </div>
              
              {hasVoted && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(option.percentage)}`}
                      style={{ width: `${option.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {!hasVoted && !isExpired && (
        <div className="mt-4">
          <button
            onClick={handleVote}
            disabled={selectedOptions.length === 0}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Vote
          </button>
        </div>
      )}

      {hasVoted && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">✓ You have voted on this poll</p>
        </div>
      )}

      {isExpired && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-sm">This poll has expired</p>
        </div>
      )}
    </div>
  );
};

export default Poll;
```

### 2. Poll Creation Component

```tsx
// components/CreatePoll.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface CreatePollProps {
  postId: number;
  onPollCreated?: (poll: any) => void;
  onCancel?: () => void;
}

const CreatePoll: React.FC<CreatePollProps> = ({ postId, onPollCreated, onCancel }) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || options.some(opt => !opt.trim())) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        '/api/polls',
        {
          postId,
          question: question.trim(),
          description: description.trim(),
          options: options.filter(opt => opt.trim()),
          allowMultipleVotes: allowMultipleVotes,
          expiresAt: expiresAt || null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      onPollCreated?.(response.data);
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question *
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your poll question"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a description for your poll"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options *
          </label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Option ${index + 1}`}
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Add Option
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allowMultipleVotes}
              onChange={(e) => setAllowMultipleVotes(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Allow multiple votes</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiration Date (optional)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePoll;
```

### 3. Integration with Post Component

```tsx
// components/Post.tsx
import React, { useState } from 'react';
import Poll from './Poll';
import CreatePoll from './CreatePoll';

const Post = ({ post }) => {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(post.polls?.[0] || null);

  const handlePollCreated = (newPoll) => {
    setCurrentPoll(newPoll);
    setShowCreatePoll(false);
  };

  const handlePollVote = (pollId, optionIds) => {
    // Update the poll in your state management
    // This will trigger a re-fetch of the poll data
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-xl font-bold mb-2">{post.title}</h2>
      <p className="text-gray-700 mb-4">{post.content}</p>
      
      {/* Display existing poll */}
      {currentPoll && (
        <Poll poll={currentPoll} onVote={handlePollVote} />
      )}

      {/* Show create poll button if no poll exists */}
      {!currentPoll && !showCreatePoll && (
        <button
          onClick={() => setShowCreatePoll(true)}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Add Poll
        </button>
      )}

      {/* Show create poll form */}
      {showCreatePoll && (
        <CreatePoll
          postId={post.id}
          onPollCreated={handlePollCreated}
          onCancel={() => setShowCreatePoll(false)}
        />
      )}
    </div>
  );
};

export default Post;
```

### 4. API Service Functions

```typescript
// services/pollService.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const pollService = {
  // Get polls for a post
  getPollsForPost: async (postId: number) => {
    const response = await axios.get(`${API_BASE_URL}/polls/post/${postId}`);
    return response.data;
  },

  // Get single poll
  getPoll: async (pollId: number) => {
    const response = await axios.get(`${API_BASE_URL}/polls/${pollId}`);
    return response.data;
  },

  // Create poll
  createPoll: async (pollData: {
    postId: number;
    question: string;
    description?: string;
    options: string[];
    allowMultipleVotes?: boolean;
    expiresAt?: string;
  }) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
      `${API_BASE_URL}/polls`,
      pollData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Vote on poll
  voteOnPoll: async (pollId: number, optionIds: number[]) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
      `${API_BASE_URL}/polls/${pollId}/vote`,
      { optionIds },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Update poll
  updatePoll: async (pollId: number, updateData: {
    question?: string;
    description?: string;
    isActive?: boolean;
    allowMultipleVotes?: boolean;
    expiresAt?: string;
  }) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.put(
      `${API_BASE_URL}/polls/${pollId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Delete poll (admin only)
  deletePoll: async (pollId: number) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.delete(
      `${API_BASE_URL}/polls/${pollId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  }
};
```

## Error Handling

### Common Error Responses

```json
{
  "error": "Poll not found"
}
```

```json
{
  "error": "You have already voted on this poll"
}
```

```json
{
  "error": "Poll has expired"
}
```

```json
{
  "error": "Only post owners or admins can create polls"
}
```

## Security Considerations

1. **Authentication Required**: All poll creation and voting requires authentication
2. **Authorization**: Only post owners or admins can create polls
3. **Vote Validation**: Users can only vote once per poll (unless multiple votes allowed)
4. **Expiration**: Polls can have expiration dates
5. **Input Validation**: All inputs are validated on the server

## Performance Optimizations

1. **Database Indexes**: Optimized queries with proper indexing
2. **Caching**: Poll results can be cached for better performance
3. **Real-time Updates**: Consider WebSocket integration for live updates
4. **Pagination**: For posts with multiple polls

## Testing

### Sample Test Cases

```javascript
// Test creating a poll
const pollData = {
  postId: 1,
  question: "Test poll question",
  options: ["Option 1", "Option 2", "Option 3"],
  allowMultipleVotes: false
};

// Test voting on a poll
const voteData = {
  optionIds: [1, 2]
};

// Test poll expiration
const expiredPoll = {
  expiresAt: new Date(Date.now() - 1000).toISOString()
};
```

This comprehensive polling system provides a complete solution for creating, voting, and displaying polls with real-time results and proper security measures. 
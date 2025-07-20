# Share Post Functionality - Frontend Implementation Guide

## Overview
This guide shows how to implement share functionality for posts using URL-friendly slugs. Each post gets a unique slug based on its title, making it easy to share and bookmark.

## Backend Features Implemented ✅

### Database Changes:
- Added `slug` field to posts table (VARCHAR(150) UNIQUE)
- Added index for slug performance
- Updated all existing posts with slugs

### API Endpoints:
1. **`GET /api/posts/:identifier`** - Get post by ID or slug
2. **`GET /api/posts/:identifier/share`** - Get share information
3. **`POST /api/posts`** - Auto-generates slug for new posts

### Slug Generation:
- Converts titles to URL-friendly format
- Handles special characters and spaces
- Ensures uniqueness with number suffixes
- Example: "Fuel subsidy removal: Na who dey suffer pass?" → "fuel-subsidy-removal-na-who-dey-suffer-pass"

## Frontend Implementation

### 1. Share Button Component

```tsx
// components/ShareButton.tsx
import React, { useState } from 'react';
import { Share, Copy, Check } from 'lucide-react'; // or any icon library

interface ShareButtonProps {
  postId: number;
  postTitle: string;
  postSlug?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ postId, postTitle, postSlug }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState<any>(null);

  const fetchShareData = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/share`);
      const data = await response.json();
      setShareData(data);
    } catch (error) {
      console.error('Error fetching share data:', error);
    }
  };

  const handleShareClick = () => {
    if (!shareData) {
      fetchShareData();
    }
    setShowShareMenu(!showShareMenu);
  };

  const copyToClipboard = async () => {
    if (shareData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareData.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const shareToSocial = (platform: string) => {
    if (shareData?.socialShare?.[platform]) {
      window.open(shareData.socialShare[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShareClick}
        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Share size={16} />
        <span>Share</span>
      </button>

      {showShareMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share this post</h3>
            
            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-lg mb-2"
            >
              <span className="text-sm text-gray-700">Copy link</span>
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => shareToSocial('twitter')}
                className="flex items-center justify-center p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span className="text-sm">Twitter</span>
              </button>
              
              <button
                onClick={() => shareToSocial('facebook')}
                className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="text-sm">Facebook</span>
              </button>
              
              <button
                onClick={() => shareToSocial('whatsapp')}
                className="flex items-center justify-center p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <span className="text-sm">WhatsApp</span>
              </button>
              
              <button
                onClick={() => shareToSocial('telegram')}
                className="flex items-center justify-center p-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                <span className="text-sm">Telegram</span>
              </button>
            </div>

            {/* Share URL Display */}
            {shareData?.shareUrl && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Share URL:</p>
                <p className="text-xs text-gray-700 break-all">{shareData.shareUrl}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close menu */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </div>
  );
};

export default ShareButton;
```

### 2. Updated Post Component with Share Button

```tsx
// components/Post.tsx
import React from 'react';
import ShareButton from './ShareButton';

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  username: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
}

interface PostProps {
  post: Post;
}

const Post: React.FC<PostProps> = ({ post }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {post.title}
          </h2>
          <p className="text-gray-600 mb-3">{post.content}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>By {post.username}</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            <span>{post.comment_count} comments</span>
            <span>{post.upvotes - post.downvotes} votes</span>
          </div>
        </div>
        
        <ShareButton 
          postId={post.id}
          postTitle={post.title}
          postSlug={post.slug}
        />
      </div>
      
      {/* Vote buttons, comments, etc. */}
    </div>
  );
};

export default Post;
```

### 3. Individual Post Page Component

```tsx
// pages/PostPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ShareButton from '../components/ShareButton';

interface PostPageProps {}

const PostPage: React.FC<PostPageProps> = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }
        
        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="bg-white rounded-lg shadow-lg p-8">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <span>By {post.username}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span>{post.comment_count} comments</span>
              <span>{post.upvotes - post.downvotes} votes</span>
            </div>
          </div>
          
          <ShareButton 
            postId={post.id}
            postTitle={post.title}
            postSlug={post.slug}
          />
        </div>

        {/* Post Content */}
        <div className="prose max-w-none mb-8">
          <p className="text-lg text-gray-700 leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Polls */}
        {post.polls && post.polls.length > 0 && (
          <div className="mb-8">
            {/* Poll component would go here */}
          </div>
        )}

        {/* Comments */}
        {post.comments && post.comments.length > 0 && (
          <div className="border-t pt-8">
            <h3 className="text-xl font-semibold mb-4">Comments</h3>
            {/* Comments component would go here */}
          </div>
        )}
      </article>
    </div>
  );
};

export default PostPage;
```

### 4. Router Configuration

```tsx
// App.tsx or router configuration
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PostPage from './pages/PostPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/post/:slug" element={<PostPage />} />
        {/* Other routes */}
      </Routes>
    </Router>
  );
}
```

### 5. API Service Functions

```typescript
// services/postService.ts
export const postService = {
  // Get post by slug or ID
  getPost: async (identifier: string | number) => {
    const response = await fetch(`/api/posts/${identifier}`);
    if (!response.ok) {
      throw new Error('Failed to fetch post');
    }
    return response.json();
  },

  // Get share information
  getShareInfo: async (identifier: string | number) => {
    const response = await fetch(`/api/posts/${identifier}/share`);
    if (!response.ok) {
      throw new Error('Failed to fetch share information');
    }
    return response.json();
  },

  // Create new post (auto-generates slug)
  createPost: async (postData: { title: string; content: string }) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create post');
    }
    
    return response.json();
  }
};
```

### 6. SEO and Meta Tags

```tsx
// components/PostMeta.tsx
import { Helmet } from 'react-helmet-async';

interface PostMetaProps {
  post: {
    title: string;
    content: string;
    username: string;
    slug: string;
  };
}

const PostMeta: React.FC<PostMetaProps> = ({ post }) => {
  const shareUrl = `${window.location.origin}/post/${post.slug}`;
  const description = post.content.substring(0, 160) + '...';

  return (
    <Helmet>
      <title>{post.title} - LeftPlot</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={shareUrl} />
      <meta property="og:type" content="article" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={post.title} />
      <meta name="twitter:description" content={description} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={shareUrl} />
    </Helmet>
  );
};

export default PostMeta;
```

## Usage Examples

### 1. Share URLs
- **Before**: `https://leftplot.site/post/123`
- **After**: `https://leftplot.site/post/fuel-subsidy-removal-na-who-dey-suffer-pass`

### 2. Social Media Sharing
```javascript
// Twitter
const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out this post on LeftPlot: "Fuel subsidy removal: Na who dey suffer pass?"')}&url=${encodeURIComponent('https://leftplot.site/post/fuel-subsidy-removal-na-who-dey-suffer-pass')}`;

// WhatsApp
const whatsappUrl = `https://wa.me/?text=${encodeURIComponent('Check out this post on LeftPlot: "Fuel subsidy removal: Na who dey suffer pass?" https://leftplot.site/post/fuel-subsidy-removal-na-who-dey-suffer-pass')}`;
```

### 3. Copy to Clipboard
```javascript
const copyShareUrl = async () => {
  try {
    await navigator.clipboard.writeText('https://leftplot.site/post/fuel-subsidy-removal-na-who-dey-suffer-pass');
    // Show success message
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = 'https://leftplot.site/post/fuel-subsidy-removal-na-who-dey-suffer-pass';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};
```

## Benefits

1. **SEO Friendly**: URLs are descriptive and keyword-rich
2. **Shareable**: Easy to share on social media and messaging apps
3. **Bookmarkable**: Users can bookmark specific posts easily
4. **Professional**: Clean, readable URLs
5. **Accessible**: Works with screen readers and accessibility tools

## Testing

### Test Cases:
1. **Slug Generation**: Test with various title formats
2. **Uniqueness**: Ensure duplicate titles get unique slugs
3. **Special Characters**: Test with Nigerian Pidgin and special characters
4. **Social Sharing**: Test all social media platforms
5. **Copy Function**: Test clipboard functionality
6. **SEO**: Verify meta tags and Open Graph data

This implementation provides a complete sharing solution with URL-friendly slugs that work perfectly for Nigerian political content! 
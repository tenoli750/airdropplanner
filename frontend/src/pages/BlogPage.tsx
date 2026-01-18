import { useState, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  images: string[] | null;
  author: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Admin form state
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View state
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/blog`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data);
      setError(null);
    } catch (err) {
      setError('게시글을 불러오는데 실패했습니다');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('이미지 파일만 업로드 가능합니다'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Resize and compress image to max 80KB
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas를 초기화할 수 없습니다'));
            return;
          }

          // Calculate new dimensions (max width 1920px, maintain aspect ratio)
          const maxWidth = 1920;
          const maxHeight = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Compress with quality adjustment to reach ~80KB base64 string size
          // Express body limit is 100KB total, so each image should be ~80KB base64 string
          const targetBase64Size = 80 * 1024; // 80KB for base64 string
          let quality = 0.9;
          let compressed = canvas.toDataURL('image/jpeg', quality);

          // Binary search for quality that results in ~80KB base64 string
          if (compressed.length > targetBase64Size) {
            let minQuality = 0.1;
            let maxQuality = 0.9;
            
            while (maxQuality - minQuality > 0.05) {
              quality = (minQuality + maxQuality) / 2;
              compressed = canvas.toDataURL('image/jpeg', quality);
              
              // compressed.length is the base64 string size (which includes the ~33% overhead)
              if (compressed.length > targetBase64Size) {
                maxQuality = quality;
              } else {
                minQuality = quality;
              }
            }
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          // Final check - if still too large, resize more aggressively
          if (compressed.length > targetBase64Size) {
            const scale = Math.sqrt(targetBase64Size / compressed.length) * 0.9; // Add 10% buffer
            const newWidth = Math.floor(width * scale);
            const newHeight = Math.floor(height * scale);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Try to compress with lower quality
            quality = 0.7;
            compressed = canvas.toDataURL('image/jpeg', quality);
            
            // If still too large, reduce quality further
            if (compressed.length > targetBase64Size) {
              quality = 0.5;
              compressed = canvas.toDataURL('image/jpeg', quality);
            }
          }

          resolve(compressed);
        };
        img.onerror = () => reject(new Error('이미지를 로드할 수 없습니다'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await processImageFile(files[i]);
        newImages.push(base64);
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err: any) {
      alert(err.message);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          const base64 = await processImageFile(files[i]);
          newImages.push(base64);
        }
      }
      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingPost
        ? `${API_BASE}/blog/${editingPost.id}`
        : `${API_BASE}/blog`;
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          images,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save post');
      }

      await fetchPosts();
      resetForm();
    } catch (err: any) {
      console.error('Error saving post:', err);
      alert(err.message || '게시글 저장에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/blog/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete post');

      await fetchPosts();
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('게시글 삭제에 실패했습니다');
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setImages(post.images || []);
    setShowForm(true);
    setSelectedPost(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPost(null);
    setTitle('');
    setContent('');
    setImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFirstImage = (post: BlogPost): string | null => {
    if (post.images && post.images.length > 0) {
      return post.images[0];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white/80 font-medium">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Post detail view
  if (selectedPost) {
    const postImages = selectedPost.images || [];

    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <button
          onClick={() => {
            setSelectedPost(null);
            setCurrentImageIndex(0);
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </button>

        <article className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedPost.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="font-medium text-indigo-600">{selectedPost.author}</span>
                <span>•</span>
                <span>{formatDate(selectedPost.created_at)}</span>
              </div>
            </div>
            {user?.isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(selectedPost)}
                  className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(selectedPost.id)}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  삭제
                </button>
              </div>
            )}
          </div>

          {/* Post Images Gallery */}
          {postImages.length > 0 && (
            <div className="mb-6">
              {/* Main Image */}
              <div className="relative">
                <img
                  src={postImages[currentImageIndex]}
                  alt={`${selectedPost.title} - ${currentImageIndex + 1}`}
                  className="w-full max-h-[500px] object-contain rounded-xl bg-gray-100"
                />

                {/* Navigation arrows */}
                {postImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? postImages.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === postImages.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Image counter */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-sm rounded-lg">
                      {currentImageIndex + 1} / {postImages.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {postImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {postImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? 'border-indigo-500 ring-2 ring-indigo-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="prose prose-indigo max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {selectedPost.content}
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              게시판
            </h1>
            <p className="text-gray-600">공지사항 및 업데이트 소식</p>
          </div>
          {user?.isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              글쓰기
            </button>
          )}
        </div>
      </div>

      {/* Admin Write Form */}
      {showForm && user?.isAdmin && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {editingPost ? '게시글 수정' : '새 게시글 작성'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="제목을 입력하세요"
                required
              />
            </div>

            {/* Multiple Image Upload with Drag & Drop */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이미지 (선택사항, 여러 장 가능)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors flex flex-col items-center gap-2 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">
                  {isDragging ? '여기에 놓으세요' : '클릭하거나 이미지를 드래그하세요'}
                </span>
                <span className="text-xs text-gray-400">이미지당 최대 5MB</span>
              </div>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      <img
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="내용을 입력하세요"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? '저장 중...' : editingPost ? '수정' : '게시'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass rounded-xl p-6 border-l-4 border-red-500">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchPosts}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Posts List */}
      {posts.length === 0 && !error ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg">아직 게시글이 없습니다</p>
          {user?.isAdmin && (
            <p className="text-gray-400 text-sm mt-2">첫 번째 게시글을 작성해보세요!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const firstImage = getFirstImage(post);
            const imageCount = post.images?.length || 0;

            return (
              <div
                key={post.id}
                className="glass rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  {firstImage && (
                    <div className="flex-shrink-0 relative w-16 h-16 sm:w-20 sm:h-20">
                      <img
                        src={firstImage}
                        alt={post.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {imageCount > 1 && (
                        <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/70 text-white text-[10px] rounded">
                          +{imageCount - 1}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight line-clamp-2 flex-1">
                        {post.title}
                      </h3>
                      {user?.isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(post);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="수정"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(post.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 leading-snug">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="font-medium text-indigo-600">{post.author}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



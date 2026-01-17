import { useState, useEffect } from 'react';
import type { Article, Task, TaskFrequency } from '../types';
import { articlesApi, adminApi } from '../services/api';

type ModalType = 'none' | 'article' | 'task' | 'editArticle' | 'editTask';

const AdminPage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>('none');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  // Form states
  const [articleForm, setArticleForm] = useState({ title: '', description: '', project_name: '' });
  const [taskForm, setTaskForm] = useState({
    article_id: '',
    title: '',
    description: '',
    frequency: 'daily' as TaskFrequency,
    link_url: '',
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await articlesApi.getAll();
      setArticles(data);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleArticle = (id: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openArticleModal = (article?: Article) => {
    if (article) {
      setArticleForm({
        title: article.title,
        description: article.description || '',
        project_name: article.project_name,
      });
      setSelectedArticle(article);
      setModalType('editArticle');
    } else {
      setArticleForm({ title: '', description: '', project_name: '' });
      setSelectedArticle(null);
      setModalType('article');
    }
  };

  const openTaskModal = (articleId: string, task?: Task) => {
    if (task) {
      setTaskForm({
        article_id: task.article_id,
        title: task.title,
        description: task.description || '',
        frequency: task.frequency,
        link_url: task.link_url || '',
      });
      setSelectedTask(task);
      setModalType('editTask');
    } else {
      setTaskForm({
        article_id: articleId,
        title: '',
        description: '',
        frequency: 'daily',
        link_url: '',
      });
      setSelectedTask(null);
      setModalType('task');
    }
  };

  const closeModal = () => {
    setModalType('none');
    setSelectedArticle(null);
    setSelectedTask(null);
  };

  const handleCreateArticle = async () => {
    try {
      await adminApi.createArticle(articleForm);
      await fetchArticles();
      closeModal();
    } catch (err) {
      console.error('Failed to create article:', err);
    }
  };

  const handleUpdateArticle = async () => {
    if (!selectedArticle) return;
    try {
      await adminApi.updateArticle(selectedArticle.id, articleForm);
      await fetchArticles();
      closeModal();
    } catch (err) {
      console.error('Failed to update article:', err);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article and all its tasks?')) return;
    try {
      await adminApi.deleteArticle(id);
      await fetchArticles();
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.article_id) return;
    try {
      await adminApi.createTask(taskForm.article_id, taskForm);
      await fetchArticles();
      closeModal();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    try {
      await adminApi.updateTask(selectedTask.id, taskForm);
      await fetchArticles();
      closeModal();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await adminApi.deleteTask(id);
      await fetchArticles();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const frequencyStyles = {
    daily: 'bg-green-100 text-green-700',
    weekly: 'bg-blue-100 text-blue-700',
    'one-time': 'bg-purple-100 text-purple-700',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage articles and tasks</p>
        </div>
        <button
          onClick={() => openArticleModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Article
        </button>
      </div>

      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => toggleArticle(article.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                    {article.project_name}
                  </span>
                  <span className="text-sm text-gray-500">{article.tasks.length} tasks</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openArticleModal(article);
                  }}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit article"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteArticle(article.id);
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete article"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedArticles.has(article.id) ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {expandedArticles.has(article.id) && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-700">Tasks</h4>
                  <button
                    onClick={() => openTaskModal(article.id)}
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Task
                  </button>
                </div>

                {article.tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No tasks yet</p>
                ) : (
                  <div className="space-y-2">
                    {article.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{task.title}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${frequencyStyles[task.frequency]}`}>
                              {task.frequency}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600">{task.description}</p>
                          )}
                          {task.link_url && (
                            <a
                              href={task.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                              {task.link_url}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => openTaskModal(article.id, task)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit task"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete task"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No articles yet. Create your first one!</p>
          <button
            onClick={() => openArticleModal()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Article
          </button>
        </div>
      )}

      {/* Modal */}
      {modalType !== 'none' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalType === 'article' && 'New Article'}
              {modalType === 'editArticle' && 'Edit Article'}
              {modalType === 'task' && 'New Task'}
              {modalType === 'editTask' && 'Edit Task'}
            </h2>

            {(modalType === 'article' || modalType === 'editArticle') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={articleForm.project_name}
                    onChange={(e) => setArticleForm({ ...articleForm, project_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., LayerZero"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={articleForm.title}
                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., LayerZero Airdrop Guide"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={articleForm.description}
                    onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Brief description of the airdrop strategy..."
                  />
                </div>
              </div>
            )}

            {(modalType === 'task' || modalType === 'editTask') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Bridge ETH via Stargate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Task description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={taskForm.frequency}
                    onChange={(e) => setTaskForm({ ...taskForm, frequency: e.target.value as TaskFrequency })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
                  <input
                    type="url"
                    value={taskForm.link_url}
                    onChange={(e) => setTaskForm({ ...taskForm, link_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalType === 'article') handleCreateArticle();
                  else if (modalType === 'editArticle') handleUpdateArticle();
                  else if (modalType === 'task') handleCreateTask();
                  else if (modalType === 'editTask') handleUpdateTask();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {modalType.startsWith('edit') ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

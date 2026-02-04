import { useState, useEffect } from 'react';
import type { Article } from '../types';
import { articlesApi, plansApi } from '../services/api';
import ArticleCard from '../components/ArticleCard';

const ArticlesPage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [plannedTaskIds, setPlannedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [articlesData, taskIds] = await Promise.all([
          articlesApi.getAll(),
          plansApi.getTaskIdsInPlan(),
        ]);
        setArticles(articlesData);
        setPlannedTaskIds(taskIds);
      } catch (err) {
        setError('Failed to load articles. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToPlan = async (taskId: string) => {
    try {
      await plansApi.addTaskToPlan(taskId);
      setPlannedTaskIds((prev) => [...prev, taskId]);
    } catch (err) {
      console.error('Failed to add task to plan:', err);
    }
  };

  const handleRemoveFromPlan = async (taskId: string) => {
    try {
      await plansApi.removeTaskFromPlan(taskId);
      setPlannedTaskIds((prev) => prev.filter((id) => id !== taskId));
    } catch (err) {
      console.error('Failed to remove task from plan:', err);
    }
  };

  // Filter articles by search query
  const filteredArticles = articles.filter((article) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesProject = article.project_name.toLowerCase().includes(query);
    const matchesTitle = article.title.toLowerCase().includes(query);
    const matchesTasks = article.tasks.some(task =>
      task.title.toLowerCase().includes(query)
    );
    return matchesProject || matchesTitle || matchesTasks;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Crypto Airdrop Guides
        </h1>
        <p className="text-gray-600">
          Browse airdrop strategies and add tasks to your personal plan.
        </p>
      </div>

      {/* Search Input */}
      {articles.length > 0 && (
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, articles, tasks..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {filteredArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            plannedTaskIds={plannedTaskIds}
            onAddToPlan={handleAddToPlan}
            onRemoveFromPlan={handleRemoveFromPlan}
          />
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No articles available yet.</p>
        </div>
      )}

      {articles.length > 0 && filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No articles match "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default ArticlesPage;

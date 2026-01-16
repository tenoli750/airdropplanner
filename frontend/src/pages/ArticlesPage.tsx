import { useState, useEffect } from 'react';
import type { Article } from '../types';
import { articlesApi, plansApi } from '../services/api';
import ArticleCard from '../components/ArticleCard';

const ArticlesPage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [plannedTaskIds, setPlannedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <div className="space-y-6">
        {articles.map((article) => (
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
    </div>
  );
};

export default ArticlesPage;

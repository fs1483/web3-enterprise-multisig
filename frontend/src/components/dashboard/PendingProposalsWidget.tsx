import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Clock, 
  FileText, 
  Users, 
  ArrowRight,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import apiService from '../../services/apiService';

interface PendingProposal {
  id: string;
  title: string;
  description: string;
  safe_id: string;
  safe_name: string;
  creator_name: string;
  signatures_required: number;
  signatures_count: number;
  to_address: string;
  value: string;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
}

export const PendingProposalsWidget: React.FC = () => {
  const navigate = useNavigate();
  const [pendingProposals, setPendingProposals] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingProposals();
  }, []);

  const fetchPendingProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/v1/dashboard/pending-proposals') as any;
      if (response.success) {
        setPendingProposals(response.data || []);
      } else {
        throw new Error('Failed to fetch pending proposals');
      }
    } catch (err) {
      console.error('Error fetching pending proposals:', err);
      setError('Failed to load pending proposals');
      
      // 使用mock数据作为fallback
      setPendingProposals([
        {
          id: '1',
          title: 'Transfer 25 ETH to Marketing Budget',
          description: 'Quarterly marketing budget allocation for Q2 campaigns',
          safe_id: 'safe-1',
          safe_name: 'Marketing Treasury',
          creator_name: 'Alice Chen',
          signatures_required: 3,
          signatures_count: 1,
          to_address: '0x742d35Cc6634C0532925a3b8D4C053292...',
          value: '25.0',
          created_at: '2024-01-15T10:30:00Z',
          priority: 'high'
        },
        {
          id: '2',
          title: 'Add New Owner: Development Team Lead',
          description: 'Adding new team lead as Safe owner for development operations',
          safe_id: 'safe-2',
          safe_name: 'Development Safe',
          creator_name: 'Bob Wilson',
          signatures_required: 4,
          signatures_count: 2,
          to_address: '0x8ba1f109551bD432803012645Hac136c0532925a3',
          value: '0',
          created_at: '2024-01-14T15:45:00Z',
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Execute Contract: Update Treasury Parameters',
          description: 'Update treasury contract parameters for new fiscal year',
          safe_id: 'safe-1',
          safe_name: 'Main Treasury',
          creator_name: 'Carol Davis',
          signatures_required: 5,
          signatures_count: 3,
          to_address: '0x9f8a0B2141B13C7C7362F2eb07669Dd6365a9C8B',
          value: '0',
          created_at: '2024-01-13T09:15:00Z',
          priority: 'low'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '#ef4444' };
      case 'medium':
        return { bg: '#fffbeb', border: '#fed7aa', text: '#d97706', icon: '#f59e0b' };
      case 'low':
        return { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', icon: '#10b981' };
      default:
        return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', icon: '#9ca3af' };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleProposalClick = (proposalId: string) => {
    navigate(`/proposals/${proposalId}`);
  };

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Zap className="h-5 w-5 mr-2 text-orange-500" />
            Pending Your Signature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-orange-500" />
            Pending Your Signature
          </div>
          {pendingProposals.length > 0 && (
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {pendingProposals.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            <button 
              onClick={fetchPendingProposals}
              className="text-xs text-red-700 hover:text-red-800 mt-1 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="space-y-3">
          {pendingProposals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">All caught up!</p>
              <p className="text-xs text-gray-500 mt-1">
                No proposals pending your signature
              </p>
            </div>
          ) : (
            pendingProposals.slice(0, 5).map((proposal) => {
              const colors = getPriorityColor(proposal.priority);
              return (
                <div
                  key={proposal.id}
                  onClick={() => handleProposalClick(proposal.id)}
                  className="group cursor-pointer p-3 rounded-lg border transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div style={{ color: colors.icon }}>
                          {getPriorityIcon(proposal.priority)}
                        </div>
                        <span 
                          className="text-xs font-medium uppercase tracking-wide"
                          style={{ color: colors.text }}
                        >
                          {proposal.priority} Priority
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {proposal.title}
                      </h4>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {proposal.signatures_count}/{proposal.signatures_required}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(proposal.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">
                            {proposal.safe_name} • by {proposal.creator_name}
                          </p>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(proposal.signatures_count / proposal.signatures_required) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {pendingProposals.length > 5 && (
            <button
              onClick={() => navigate('/proposals?filter=pending')}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              View all {pendingProposals.length} pending proposals →
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

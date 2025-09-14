import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useProposalStore } from '../../stores/proposalStore';
import { ProposalCard } from '../../components/proposals/ProposalCard';
import { CreateProposalForm } from '../../components/proposals/CreateProposalForm';
import type { Proposal } from '../../stores/proposalStore';

export const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { proposals, fetchProposals, isLoading, pagination } = useProposalStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const filteredProposals = proposals?.filter(proposal => {
    const matchesSearch = proposal?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (proposal?.description && proposal.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || proposal?.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchProposals(pagination.page + 1, pagination.limit);
    }
  };

  const handleViewProposal = (proposal: Proposal) => {
    navigate(`/proposals/${proposal.id}`);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
            <p className="text-gray-600 mt-1">Manage and track multisig proposals</p>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Proposal
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search proposals by title, description, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="executed">Executed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Proposals List */}
        {isLoading && proposals.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.length > 0 ? (
              <>
                {filteredProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} onView={handleViewProposal} />
                ))}
                
                {pagination.page < pagination.totalPages && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      isLoading={isLoading}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No proposals match your filters'
                      : 'No proposals yet'
                    }
                  </div>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button
                      className="mt-4"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      Create First Proposal
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Proposal Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Proposal"
          size="lg"
        >
          <CreateProposalForm
            onSuccess={() => {
              setIsCreateModalOpen(false);
              fetchProposals(); // Refresh the proposals list
            }}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </Modal>
      </div>
    </Layout>
  );
};

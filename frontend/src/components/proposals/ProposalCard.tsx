import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Clock, Users, CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import type { Proposal } from '../../stores/proposalStore';
import { weiToEth, formatEthAmount } from '../../utils/ethUtils';

interface ProposalCardProps {
  proposal: Proposal;
  onView?: (proposal: Proposal) => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ 
  proposal, 
  onView 
}) => {
  const { address } = useWalletStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'approved':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'executed':
        return 'text-purple-700 bg-purple-100 border-purple-300';
      case 'confirmed':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'rejected':
        return 'text-gray-700 bg-gray-100 border-gray-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'executed':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待签名';
      case 'approved':
        return '已批准';
      case 'executed':
        return '执行中';
      case 'confirmed':
        return '执行成功';
      case 'failed':
        return '执行失败';
      case 'rejected':
        return '已拒绝';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'Transfer';
      case 'contract_call':
        return 'Contract Call';
      case 'add_owner':
        return 'Add Owner';
      case 'remove_owner':
        return 'Remove Owner';
      case 'change_threshold':
        return 'Change Threshold';
      default:
        return 'Unknown';
    }
  };

  // 获取提案类型，优先使用映射后的字段
  const proposalType = proposal.type || proposal.proposal_type;
  const toAddress = proposal.to || proposal.to_address;
  const requiredSigs = proposal.requiredSignatures || proposal.required_signatures || 0;
  const currentSigs = proposal.currentSignatures || proposal.current_signatures || 0;
  const createdDate = proposal.createdAt || proposal.created_at;

  const formatAddress = (addr: string | undefined) => {
    if (!addr || typeof addr !== 'string') {
      return 'N/A';
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const hasUserSigned = address && proposal.signatures && Array.isArray(proposal.signatures) && proposal.signatures.some(sig => 
    sig?.signer?.toLowerCase() === address.toLowerCase()
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border-2 ${getStatusColor(proposal.status)}`}>
                {getStatusIcon(proposal.status)}
                <span className="ml-1.5">{getStatusLabel(proposal.status)}</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {getTypeLabel(proposalType)}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {proposal.title}
            </h3>
            
            <p className="text-gray-600 mb-4 line-clamp-2">
              {proposal.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">To:</span> {formatAddress(toAddress)}
              </div>
              <div>
                <span className="font-medium">Value:</span> {formatEthAmount(weiToEth(proposal.value || '0'))} ETH
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{currentSigs}/{requiredSigs} signatures</span>
              </div>
              <div>
                <span className="font-medium">Created:</span> {createdDate ? new Date(createdDate).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
            
            {hasUserSigned && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  You signed this proposal
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView?.(proposal)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            {proposal.transactionHash && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const blockExplorer = import.meta.env.VITE_BLOCK_EXPLORER;
                  const explorerUrl = (blockExplorer && !blockExplorer.includes('localhost')) 
                    ? blockExplorer 
                    : 'https://sepolia.etherscan.io';
                  window.open(`${explorerUrl}/tx/${proposal.transactionHash}`, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Etherscan
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Signature Progress</span>
            <span>{currentSigs}/{requiredSigs}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((currentSigs / Math.max(requiredSigs, 1)) * 100, 100)}%`
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

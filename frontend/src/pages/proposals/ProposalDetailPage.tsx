import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useProposalStore } from '../../stores/proposalStore';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/useToast';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { ToastContainer } from '../../components/ui/Toast';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ExternalLink,
  AlertTriangle 
} from 'lucide-react';

export const ProposalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProposal, fetchProposal, signProposal, executeProposal, rejectProposal, isLoading } = useProposalStore();
  const { address, signer, isConnected } = useWalletStore();
  const { user } = useAuthStore();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [isSigningLoading, setIsSigningLoading] = useState(false);
  const [isExecutingLoading, setIsExecutingLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposal(id);
    }
  }, [id, fetchProposal]);

  if (isLoading || !currentProposal) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const proposal = currentProposal;
  
  
  // 字段映射处理
  const proposalType = proposal.type || proposal.proposal_type;
  const toAddress = proposal.to || proposal.to_address;
  const safeAddress = proposal.safeAddress || proposal.Safe?.address || proposal.Safe?.Address || '';
  const requiredSigs = proposal.requiredSignatures || proposal.required_signatures || 0;
  const currentSigs = proposal.currentSignatures || proposal.current_signatures || 0;
  const createdDate = proposal.createdAt || proposal.created_at;
  const txHash = proposal.transactionHash || proposal.tx_hash;
  
  const hasUserSigned = address && proposal.signatures && Array.isArray(proposal.signatures) && proposal.signatures.some((sig: any) => {
    // 后端返回的signer是User对象，包含wallet_address字段
    const signerAddress = sig.signer?.wallet_address || sig.signer?.walletAddress;
    return signerAddress && signerAddress.toLowerCase() === address.toLowerCase();
  });
  const canSign = isConnected && !hasUserSigned && proposal.status === 'pending';
  const canExecute = proposal.status === 'approved' && currentSigs >= requiredSigs;
  const canReject = proposal.status === 'pending' && user?.role === 'admin';

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
        return <Clock className="h-5 w-5" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5" />;
      case 'executed':
        return <Clock className="h-5 w-5" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5" />;
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
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

  const handleSign = async () => {
    if (!signer || !address) {
      showError('Wallet Error', 'Please connect your wallet first');
      return;
    }

    try {
      setIsSigningLoading(true);
      
      // 使用数据库中的实际Safe地址
      const proposalSafeAddress = proposal.safeAddress || proposal.Safe?.address;
      
      if (!proposalSafeAddress) {
        showError('Safe Address Error', 'Cannot find Safe address for this proposal');
        return;
      }
      
      const chainId = 11155111; // Sepolia chain ID
      
      // 企业级nonce管理：动态获取当前Safe nonce
      let currentNonce: string;
      try {
        const authStorage = localStorage.getItem('auth-storage');
        const authData = authStorage ? JSON.parse(authStorage) : null;
        const token = authData?.token || authData?.state?.token;
        
        if (!token) {
          showError('Authentication Error', 'Please login again');
          return;
        }
        
        // 从Safe合约获取最新nonce
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/safes/${proposal.safe_id}/nonce`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          // 如果获取失败，抛出错误而不是使用fallback
          const errorText = await response.text();
          throw new Error(`Failed to fetch current nonce: ${response.status} ${errorText}`);
        } else {
          const nonceData = await response.json();
          currentNonce = nonceData.nonce.toString();
          console.log('Successfully fetched current Safe nonce:', currentNonce);
        }
        
        console.log('Using current Safe nonce for signing:', currentNonce);
      } catch (error) {
        console.error('Critical error fetching nonce:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        showError('Nonce获取失败', `无法获取Safe当前nonce，请稍后重试: ${errorMessage}`);
        return; // 停止签名流程，不使用错误的nonce
      }
      
      // 使用实际提案数据构建Safe交易参数
      const safeTxData = {
        to: toAddress || '0x0000000000000000000000000000000000000000',
        value: proposal.value || '0',
        data: proposal.data || '0x',
        operation: '0', // 默认为CALL操作
        safeTxGas: '0',
        baseGas: '0', 
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: currentNonce // 使用从区块链获取的真实nonce
      };

      // EIP-712 Domain
      const domain = {
        chainId: chainId,
        verifyingContract: proposalSafeAddress
      };

      // EIP-712 Types
      const types = {
        SafeTx: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'operation', type: 'uint8' },
          { name: 'safeTxGas', type: 'uint256' },
          { name: 'baseGas', type: 'uint256' },
          { name: 'gasPrice', type: 'uint256' },
          { name: 'gasToken', type: 'address' },
          { name: 'refundReceiver', type: 'address' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      console.log('Signing EIP-712 data:', { domain, types, safeTxData });
      
      // 使用MetaMask直接签名 - 避免ENS解析问题
      let signature: string;
      let typedData: any; // 声明在外层作用域
      
      if (window.ethereum && window.ethereum.request) {
        try {
          // 构建EIP-712 payload - 严格按照Safe标准格式
          typedData = {
            types: {
              EIP712Domain: [
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' }
              ],
              SafeTx: [
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' },
                { name: 'operation', type: 'uint8' },
                { name: 'safeTxGas', type: 'uint256' },
                { name: 'baseGas', type: 'uint256' },
                { name: 'gasPrice', type: 'uint256' },
                { name: 'gasToken', type: 'address' },
                { name: 'refundReceiver', type: 'address' },
                { name: 'nonce', type: 'uint256' }
              ]
            },
            primaryType: 'SafeTx',
            domain: {
              chainId: chainId,
              verifyingContract: proposalSafeAddress
            },
            message: {
              to: safeTxData.to,
              value: safeTxData.value,
              data: safeTxData.data,
              operation: safeTxData.operation,
              safeTxGas: safeTxData.safeTxGas,
              baseGas: safeTxData.baseGas,
              gasPrice: safeTxData.gasPrice,
              gasToken: safeTxData.gasToken,
              refundReceiver: safeTxData.refundReceiver,
              nonce: safeTxData.nonce
            }
          };
          
          console.log('Calling MetaMask with typedData:', typedData);
          console.log('User address:', address);
          
          // 直接使用MetaMask的eth_signTypedData_v4
          signature = await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [address?.toLowerCase(), JSON.stringify(typedData)]
          });
        } catch (metaMaskError: any) {
          console.error('MetaMask signing error:', metaMaskError);
          throw new Error(`MetaMask signing failed: ${metaMaskError.message || metaMaskError}`);
        }
      } else {
        throw new Error('MetaMask not available or not properly initialized');
      }
      
      console.log('Generated signature:', signature);
      
      // 计算Safe交易哈希用于记录 (使用ethers v6语法)
      const safeTxHash = ethers.TypedDataEncoder.hash(
        typedData.domain,
        { SafeTx: typedData.types.SafeTx },
        typedData.message
      );
      
      console.log('Safe transaction hash:', safeTxHash);
      
      // 提交签名到后端，包含nonce和交易哈希信息
      await signProposal(proposal.id, signature, parseInt(currentNonce), safeTxHash);
      
      // Show success message
      success('Signature Successful', 'Your EIP-712 signature has been added to the proposal');
      
      // Refresh the proposal data to show latest status
      if (id) {
        await fetchProposal(id);
      }
    } catch (error) {
      console.error('Failed to sign proposal:', error);
      showError('Signature Failed', error instanceof Error ? error.message : 'Failed to sign proposal with EIP-712');
    } finally {
      setIsSigningLoading(false);
    }
  };

  const handleExecute = async () => {
    try {
      setIsExecutingLoading(true);
      await executeProposal(proposal.id);
    } catch (error) {
      console.error('Failed to execute proposal:', error);
    } finally {
      setIsExecutingLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      await rejectProposal(proposal.id);
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };


  return (
    <Layout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/proposals')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </div>

        {/* Proposal Header */}
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-bold border-2 ${getStatusColor(proposal.status)}`}>
                    {getStatusIcon(proposal.status)}
                    <span className="ml-2">{getStatusLabel(proposal.status)}</span>
                  </span>
                  <span className="text-sm text-gray-500">
                    Created {createdDate ? new Date(createdDate).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {proposal.title}
                </h1>
                
                <p className="text-gray-600 mb-4">
                  {proposal.description}
                </p>
              </div>
              
              <div className="flex space-x-2">
                {canSign && (
                  <Button
                    onClick={handleSign}
                    isLoading={isSigningLoading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Sign Proposal
                  </Button>
                )}
                
                {canExecute && (
                  <Button
                    onClick={handleExecute}
                    isLoading={isExecutingLoading}
                    variant="primary"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                )}
                
                {canReject && (
                  <Button
                    onClick={handleReject}
                    variant="danger"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proposal Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Safe Address</div>
                      <div className="font-mono text-sm break-all">
                        {safeAddress || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-sm text-gray-900 capitalize">{proposalType?.replace('_', ' ') || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">To Address</label>
                      <p className="text-sm text-gray-900 font-mono break-all">{toAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Value</label>
                      <p className="text-sm text-gray-900">0.001 ETH</p>
                    </div>
                  </div>
                  
                  {proposal.data && proposal.data !== '0x' && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data</label>
                      <p className="text-sm text-gray-900 font-mono break-all bg-gray-50 p-2 rounded">
                        {proposal.data}
                      </p>
                    </div>
                  )}
                  
                  {txHash && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Transaction Hash</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-900 font-mono">{txHash}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const blockExplorer = import.meta.env.VITE_BLOCK_EXPLORER;
                            const explorerUrl = (blockExplorer && !blockExplorer.includes('localhost')) 
                              ? blockExplorer 
                              : 'https://sepolia.etherscan.io';
                            window.open(`${explorerUrl}/tx/${txHash}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signatures */}
            <Card>
              <CardHeader>
                <CardTitle>Signatures ({proposal.currentSignatures}/{proposal.requiredSignatures})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {proposal.signatures && Array.isArray(proposal.signatures) && proposal.signatures.map((signature: any, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-mono break-all">
                            {signature.signer?.wallet_address || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Signed {signature.signed_at ? 
                              new Date(signature.signed_at).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono break-all max-w-xs">
                        {signature.signature_data || 'N/A'}
                      </div>
                    </div>
                  ))}
                  
                  {(!proposal.signatures || !Array.isArray(proposal.signatures) || proposal.signatures.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      No signatures yet
                    </div>
                  )}
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 ${getStatusColor(proposal.status)}`}>
                    {getStatusIcon(proposal.status)}
                    <span className="font-bold text-lg">{getStatusLabel(proposal.status)}</span>
                  </div>
                  
                  {proposal.status === 'pending' && currentSigs < requiredSigs && (
                    <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Waiting for signatures
                        </p>
                        <p className="text-xs text-yellow-700">
                          {requiredSigs - currentSigs} more signature(s) needed
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {proposal.status === 'approved' && (
                    <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Ready to execute
                        </p>
                        <p className="text-xs text-green-700">
                          All required signatures collected
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-gray-500">
                        {createdDate ? new Date(createdDate).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  {proposal.signatures && Array.isArray(proposal.signatures) && proposal.signatures.map((signature: any, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium font-mono break-all">Signed by {signature.signer?.wallet_address || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {signature.signed_at ? 
                            new Date(signature.signed_at).toLocaleString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {proposal.executedAt && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Executed</p>
                        <p className="text-xs text-gray-500">
                          {new Date(proposal.executedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

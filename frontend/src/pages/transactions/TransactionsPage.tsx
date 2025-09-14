import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Wallet,
  TrendingUp,
  Eye
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Transaction {
  id: string;
  hash: string;
  type: 'incoming' | 'outgoing' | 'contract_interaction';
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  timestamp: string;
  blockNumber?: number;
  safeAddress: string;
  safeName: string;
  description?: string;
  proposalId?: string;
}

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, statusFilter, typeFilter, dateFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, this would come from your API
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          type: 'outgoing',
          status: 'confirmed',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          to: '0x8ba1f109551bD432803012645Hac136c22C2a1b',
          value: '1.5',
          gasUsed: '21000',
          gasPrice: '20',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          blockNumber: 18500000,
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Marketing budget transfer',
          proposalId: 'prop-001'
        },
        {
          id: '2',
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          type: 'incoming',
          status: 'confirmed',
          from: '0x8ba1f109551bD432803012645Hac136c22C2a1b',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          value: '5.0',
          gasUsed: '21000',
          gasPrice: '18',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          blockNumber: 18499500,
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Client payment received'
        },
        {
          id: '3',
          hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          type: 'contract_interaction',
          status: 'pending',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          value: '0',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Token approval for DEX',
          proposalId: 'prop-002'
        },
        {
          id: '4',
          hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
          type: 'outgoing',
          status: 'failed',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          to: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
          value: '0.1',
          gasUsed: '0',
          gasPrice: '25',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          blockNumber: 18499000,
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Failed transaction - insufficient gas'
        }
      ];

      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.safeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case '24h':
          filterDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(tx => new Date(tx.timestamp) >= filterDate);
      }
    }

    setFilteredTransactions(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'incoming':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'outgoing':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'contract_interaction':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openInExplorer = (hash: string) => {
    // This would open the transaction in a blockchain explorer
    // For now, just log it
    console.log('Opening transaction in explorer:', hash);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <History className="h-8 w-8 mr-3 text-blue-600" />
              Transaction History
            </h1>
            <p className="text-gray-600 mt-1">
              View all transactions across your multisig wallets
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
                <option value="contract_interaction">Contract</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</p>
                </div>
                <History className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Confirmed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {filteredTransactions.filter(tx => tx.status === 'confirmed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {filteredTransactions.filter(tx => tx.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No transactions found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(transaction.type)}
                          {getStatusIcon(transaction.status)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {transaction.description || 'Transaction'}
                            </p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>From: {formatAddress(transaction.from)}</span>
                            <span>To: {formatAddress(transaction.to)}</span>
                            <span>{new Date(transaction.timestamp).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <Wallet className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{transaction.safeName}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {transaction.value} ETH
                          </p>
                          {transaction.gasUsed && (
                            <p className="text-xs text-gray-500">
                              Gas: {transaction.gasUsed}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {transaction.proposalId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/proposals/${transaction.proposalId}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInExplorer(transaction.hash)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

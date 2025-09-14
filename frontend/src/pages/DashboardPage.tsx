import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Shield, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Zap,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  History
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Layout } from '../components/layout/Layout';
import { PendingProposalsWidget } from '../components/dashboard/PendingProposalsWidget';
// import apiService from '../services/apiService'; // Commented out for UI development phase

interface DashboardStats {
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  executedProposals: number;
  rejectedProposals: number;
  totalSafes: number;
  activeSafes: number;
  totalBalance: string;
  monthlyVolume: string;
  totalSigners: number;
  averageExecutionTime: string;
  securityScore: number;
}

interface RecentActivity {
  id: string;
  type: 'proposal_created' | 'proposal_signed' | 'proposal_executed' | 'safe_created';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Mock proposals data for UI development
  const [proposals] = useState([
    {
      id: '1',
      title: 'Transfer 50 ETH to Development Fund',
      type: 'transfer' as const,
      status: 'pending' as const,
      currentSignatures: 2,
      requiredSignatures: 3,
      createdAt: '2024-01-15T10:30:00Z',
      to: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      value: '50',
      safeAddress: '0x1234567890123456789012345678901234567890'
    },
    {
      id: '2', 
      title: 'Add New Owner: Marketing Team Lead',
      type: 'add_owner' as const,
      status: 'approved' as const,
      currentSignatures: 3,
      requiredSignatures: 3,
      createdAt: '2024-01-14T15:45:00Z',
      to: '0x8ba1f109551bD432803012645Hac136c0532925a3',
      value: '0',
      safeAddress: '0x1234567890123456789012345678901234567890'
    },
    {
      id: '3',
      title: 'Execute Smart Contract: Update Treasury Parameters',
      type: 'contract_call' as const,
      status: 'executed' as const,
      currentSignatures: 4,
      requiredSignatures: 4,
      createdAt: '2024-01-13T09:15:00Z',
      to: '0x9f8a0B2141B13C7C7362F2eb07669Dd6365a9C8B',
      value: '0',
      safeAddress: '0x1234567890123456789012345678901234567890'
    },
    {
      id: '4',
      title: 'Change Signature Threshold to 3/5',
      type: 'change_threshold' as const,
      status: 'pending' as const,
      currentSignatures: 1,
      requiredSignatures: 4,
      createdAt: '2024-01-12T14:20:00Z',
      to: '0x1234567890123456789012345678901234567890',
      value: '0',
      safeAddress: '0x1234567890123456789012345678901234567890'
    },
    {
      id: '5',
      title: 'Remove Inactive Owner Account',
      type: 'remove_owner' as const,
      status: 'rejected' as const,
      currentSignatures: 1,
      requiredSignatures: 3,
      createdAt: '2024-01-11T11:30:00Z',
      to: '0x5678901234567890123456789012345678901234',
      value: '0',
      safeAddress: '0x1234567890123456789012345678901234567890'
    }
  ]);
  
  const [stats] = useState<DashboardStats>({
    totalProposals: 24,
    pendingProposals: 8,
    approvedProposals: 3,
    executedProposals: 11,
    rejectedProposals: 2,
    totalSafes: 5,
    activeSafes: 4,
    totalBalance: '1,247.8',
    monthlyVolume: '892.4',
    totalSigners: 12,
    averageExecutionTime: '2.4h',
    securityScore: 95
  });
  
  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'proposal_signed',
      title: 'Proposal Signed',
      description: 'Transfer 50 ETH to Development Fund signed by Alice',
      timestamp: '2024-01-15T10:45:00Z',
      user: 'Alice Chen'
    },
    {
      id: '2',
      type: 'proposal_executed',
      title: 'Proposal Executed',
      description: 'Smart contract update completed successfully',
      timestamp: '2024-01-15T09:30:00Z',
      user: 'System'
    },
    {
      id: '3',
      type: 'proposal_created',
      title: 'New Proposal Created',
      description: 'Change signature threshold proposal created',
      timestamp: '2024-01-14T16:20:00Z',
      user: 'Bob Wilson'
    },
    {
      id: '4',
      type: 'safe_created',
      title: 'Safe Created',
      description: 'New Treasury Safe deployed on Ethereum',
      timestamp: '2024-01-14T14:15:00Z',
      user: 'Carol Davis'
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Mock data is already initialized, no need for API calls during UI development
  const loadDashboardData = async () => {
    // Simulate loading for UI development
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'executed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'proposal_created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'proposal_signed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'proposal_executed':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'safe_created':
        return <Shield className="h-4 w-4 text-indigo-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
          <div style={{ 
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            height: '8rem',
            width: '8rem',
            borderBottom: '2px solid #2563eb'
          }}></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#dc2626', fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Error Loading Dashboard</div>
            <div style={{ color: '#4b5563', marginBottom: '1rem' }}>{error}</div>
            <button 
              onClick={loadDashboardData}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1d4ed8'}
              onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb'}
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '1.5rem', gap: '2rem', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#111827',
              margin: '0'
            }}>Dashboard</h1>
            <p style={{ 
              color: '#4b5563', 
              marginTop: '0.5rem',
              fontSize: '1rem'
            }}>
              Welcome back! Here's what's happening with your multisig wallets.
            </p>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    backgroundColor: '#2563eb',
                    borderRadius: '0.5rem',
                    padding: '0.75rem'
                  }}>
                    <FileText style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1d4ed8', margin: '0' }}>Total Proposals</p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a', margin: '0' }}>{stats.totalProposals}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#059669', fontSize: '0.75rem', fontWeight: '500' }}>
                    <ArrowUpRight style={{ height: '0.75rem', width: '0.75rem', marginRight: '0.25rem' }} />
                    +12%
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>vs last month</p>
                </div>
              </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fed7aa 100%)',
            border: '1px solid #fbbf24',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#d97706',
                  borderRadius: '0.5rem',
                  padding: '0.75rem'
                }}>
                  <Clock style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#b45309', margin: '0' }}>Pending Approval</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e', margin: '0' }}>{stats.pendingProposals}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#d97706', fontSize: '0.75rem', fontWeight: '500' }}>
                  <Zap style={{ height: '0.75rem', width: '0.75rem', marginRight: '0.25rem' }} />
                  Urgent
                </div>
                <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>Avg: {stats.averageExecutionTime}</p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 100%)',
            border: '1px solid #10b981',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#059669',
                  borderRadius: '0.5rem',
                  padding: '0.75rem'
                }}>
                  <Shield style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#047857', margin: '0' }}>Active Safes</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#064e3b', margin: '0' }}>{stats.activeSafes}/{stats.totalSafes}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#059669', fontSize: '0.75rem', fontWeight: '500' }}>
                  <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#10b981', borderRadius: '50%', marginRight: '0.25rem', animation: 'pulse 2s infinite' }}></div>
                  Online
                </div>
                <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>Security: {stats.securityScore}%</p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)',
            border: '1px solid #8b5cf6',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#7c3aed',
                  borderRadius: '0.5rem',
                  padding: '0.75rem'
                }}>
                  <DollarSign style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6d28d9', margin: '0' }}>Total Assets</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#581c87', margin: '0' }}>{stats.totalBalance} ETH</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#059669', fontSize: '0.75rem', fontWeight: '500' }}>
                  <ArrowUpRight style={{ height: '0.75rem', width: '0.75rem', marginRight: '0.25rem' }} />
                  +5.2%
                </div>
                <p style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>≈ $248,750</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Enterprise KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%)',
            border: '1px solid #6366f1',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#4f46e5',
                  borderRadius: '0.5rem',
                  padding: '0.75rem'
                }}>
                  <Users style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4338ca', margin: '0' }}>Total Signers</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#312e81', margin: '0' }}>{stats.totalSigners}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#4f46e5', fontSize: '0.75rem', fontWeight: '500' }}>
                  <Activity style={{ height: '0.75rem', width: '0.75rem', marginRight: '0.25rem' }} />
                  Active
                </div>
                <p style={{ fontSize: '0.75rem', color: '#4f46e5', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>Across all safes</p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ecfeff 0%, #a7f3d0 100%)',
            border: '1px solid #06b6d4',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#0891b2',
                  borderRadius: '0.5rem',
                  padding: '0.75rem'
                }}>
                  <BarChart3 style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0e7490', margin: '0' }}>Monthly Volume</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#164e63', margin: '0' }}>{stats.monthlyVolume} ETH</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#059669', fontSize: '0.75rem', fontWeight: '500' }}>
                  <ArrowUpRight style={{ height: '0.75rem', width: '0.75rem', marginRight: '0.25rem' }} />
                  +18%
                </div>
                <p style={{ fontSize: '0.75rem', color: '#0891b2', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>This month</p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
            border: '1px solid #f43f5e',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#e11d48',
                  borderRadius: '0.5rem',
                  padding: '0.75rem'
                }}>
                  <XCircle style={{ height: '1.5rem', width: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#be185d', margin: '0' }}>Rejected</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9f1239', margin: '0' }}>{stats.rejectedProposals}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#e11d48', fontSize: '0.75rem', fontWeight: '500' }}>
                  <ArrowDownRight style={{ height: '0.75rem', width: '0.75rem', marginRight: '0.25rem' }} />
                  -5%
                </div>
                <p style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>vs last month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Moved to top */}
        <div className="mb-8">
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: 'none',
            padding: '1.5rem'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                margin: '0'
              }}>
                <Zap style={{ height: '1.25rem', width: '1.25rem', marginRight: '0.5rem', color: '#2563eb' }} />
                Quick Actions
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/proposals/create')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(90deg, #1d4ed8 0%, #4338ca 100%)';
                  target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)';
                  target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  target.style.transform = 'translateY(0)';
                }}
              >
                <Plus style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                Create Proposal
              </button>
              
              <button
                onClick={() => navigate('/safes/create')}
                style={{
                  width: '100%',
                  background: 'white',
                  color: '#047857',
                  border: '1px solid #10b981',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#ecfdf5';
                  target.style.borderColor = '#059669';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = 'white';
                  target.style.borderColor = '#10b981';
                  target.style.transform = 'translateY(0)';
                }}
              >
                <Shield style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                Create Safe
              </button>
              
              <button
                onClick={() => navigate('/transactions')}
                style={{
                  width: '100%',
                  background: 'white',
                  color: '#7c3aed',
                  border: '1px solid #8b5cf6',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#f5f3ff';
                  target.style.borderColor = '#7c3aed';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = 'white';
                  target.style.borderColor = '#8b5cf6';
                  target.style.transform = 'translateY(0)';
                }}
              >
                <History style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                View Transactions
              </button>
              
              <button
                onClick={() => navigate('/safes')}
                style={{
                  width: '100%',
                  background: 'white',
                  color: '#dc2626',
                  border: '1px solid #ef4444',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#fef2f2';
                  target.style.borderColor = '#dc2626';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = 'white';
                  target.style.borderColor = '#ef4444';
                  target.style.transform = 'translateY(0)';
                }}
              >
                <Shield style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                View Safes
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Recent Proposals */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Proposals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {proposals.slice(0, 5).map((proposal) => (
                    <div 
                      key={proposal.id} 
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {getStatusIcon(proposal.status)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#111827',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {proposal.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {proposal.currentSignatures}/{proposal.requiredSignatures} signatures
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>•</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{
                          width: '3rem',
                          height: '0.5rem',
                          background: '#e5e7eb',
                          borderRadius: '9999px',
                          overflow: 'hidden'
                        }}>
                          <div 
                            style={{
                              height: '100%',
                              background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                              transition: 'width 0.3s ease',
                              width: `${(proposal.currentSignatures / proposal.requiredSignatures) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {proposals.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <FileText style={{ height: '3rem', width: '3rem', color: '#d1d5db', margin: '0 auto 1rem auto' }} />
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>No proposals yet</p>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                        Use Quick Actions to create your first proposal
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Proposals Widget */}
          <div>
            <PendingProposalsWidget />
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Clock className="h-5 w-5 mr-2 text-gray-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentActivity.length > 0 ? recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '0.5rem',
                      transition: 'background-color 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                  >
                    <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#111827',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {activity.title}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem',
                        margin: '0.25rem 0 0 0'
                      }}>
                        {activity.description}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        marginTop: '0.5rem',
                        margin: '0.5rem 0 0 0'
                      }}>
                        {new Date(activity.timestamp).toLocaleString()} • {activity.user}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
                    <Clock style={{ height: '2rem', width: '2rem', margin: '0 auto 0.75rem auto', color: '#d1d5db' }} />
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

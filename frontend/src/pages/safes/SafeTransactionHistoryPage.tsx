import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Eye,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Hash,
  Shield
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';

// 交易状态类型定义
interface SafeTransactionHistory {
  id: string;
  tx_hash: string;
  status: string;
  safe_name: string;
  safe_description: string;
  safe_address?: string;
  owners: string[];
  threshold: number;
  chain_id: number;
  block_number?: number;
  gas_used?: number;
  created_at: string;
  confirmed_at?: string;
  processed_at?: string;
  retry_count: number;
  error_message?: string;
}

// 状态配置 - 使用内联样式避免Tailwind v4兼容性问题
const STATUS_CONFIG = {
  SUBMITTED: { 
    label: '已提交', 
    style: { backgroundColor: '#DBEAFE', color: '#1E40AF' }, 
    icon: Clock 
  },
  PENDING: { 
    label: '等待确认', 
    style: { backgroundColor: '#FEF3C7', color: '#92400E' }, 
    icon: Clock 
  },
  CONFIRMED: { 
    label: '已确认', 
    style: { backgroundColor: '#D1FAE5', color: '#065F46' }, 
    icon: CheckCircle 
  },
  PROCESSED: { 
    label: '已处理', 
    style: { backgroundColor: '#E0E7FF', color: '#3730A3' }, 
    icon: CheckCircle 
  },
  COMPLETED: { 
    label: '已完成', 
    style: { backgroundColor: '#D1FAE5', color: '#047857' }, 
    icon: CheckCircle 
  },
  FAILED: { 
    label: '失败', 
    style: { backgroundColor: '#FEE2E2', color: '#991B1B' }, 
    icon: XCircle 
  }
};

/**
 * Safe创建历史页面
 * 显示用户的所有Safe创建记录
 */
const SafeTransactionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [transactions, setTransactions] = useState<SafeTransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取Safe创建历史
  const fetchTransactionHistory = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safe-transactions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取Safe创建历史失败');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取Safe创建历史失败');
      console.error('获取Safe创建历史失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionHistory();
  }, [token]);

  // 获取状态配置
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.SUBMITTED;
  };

  // 处理查看详情
  const handleViewDetails = (transactionId: string) => {
    navigate(`/safes/status/${transactionId}`);
  };

  // 处理查看Safe
  const handleViewSafe = (safeAddress: string) => {
    navigate(`/safes/${safeAddress}`);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              color: '#3B82F6',
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite'
            }}>
              <RefreshCw size={32} />
            </div>
            <p style={{ color: '#6B7280', fontSize: '16px' }}>正在加载Safe创建历史...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            padding: '32px',
            maxWidth: '28rem',
            width: '100%',
            margin: '0 16px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto' }} />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              加载失败
            </h2>
            <p style={{
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: '24px'
            }}>{error}</p>
            <button
              onClick={fetchTransactionHistory}
              style={{
                width: '100%',
                backgroundColor: '#3B82F6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
            >
              重试
            </button>
          </div>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        padding: '32px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px'
        }}>
          {/* 头部 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6B7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
              >
                <ArrowLeft size={20} style={{ marginRight: '8px' }} />
                返回控制台
              </button>
              
              <button
                onClick={fetchTransactionHistory}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#3B82F6',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1D4ED8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
              >
                <RefreshCw size={16} style={{ marginRight: '8px' }} />
                刷新
              </button>
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '8px'
            }}>
              Safe创建历史
            </h1>
            <p style={{
              color: '#6B7280',
              fontSize: '16px'
            }}>
              查看您的所有Safe钱包创建记录和状态
            </p>
          </div>

          {/* 交易列表 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            overflow: 'hidden'
          }}>
            {transactions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <Shield size={64} style={{ color: '#D1D5DB', margin: '0 auto' }} />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '8px'
                }}>暂无Safe创建记录</h3>
                <p style={{
                  color: '#6B7280',
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>您还没有创建过Safe钱包</p>
                <button
                  onClick={() => navigate('/safes/create')}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                >
                  创建第一个Safe
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '1200px', width: '100%', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: '#F9FAFB' }}>
                    <tr>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #E5E7EB',
                        width: '250px'
                      }}>
                        Safe信息
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #E5E7EB',
                        width: '120px'
                      }}>
                        状态
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #E5E7EB',
                        width: '180px'
                      }}>
                        创建时间
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #E5E7EB',
                        width: '400px',
                        minWidth: '400px'
                      }}>
                        交易哈希
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #E5E7EB',
                        width: '200px',
                        minWidth: '200px'
                      }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: 'white' }}>
                    {transactions.map((transaction) => {
                      const statusConfig = getStatusConfig(transaction.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr 
                          key={transaction.id} 
                          style={{
                            borderBottom: '1px solid #E5E7EB',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            width: '250px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ flexShrink: 0 }}>
                                <Shield size={32} style={{ color: '#3B82F6' }} />
                              </div>
                              <div style={{ marginLeft: '16px' }}>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: '#111827'
                                }}>
                                  {transaction.safe_name}
                                </div>
                                <div style={{
                                  fontSize: '14px',
                                  color: '#6B7280'
                                }}>
                                  {transaction.threshold}/{transaction.owners.length} 多签
                                </div>
                                {transaction.safe_address && (
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#9CA3AF',
                                    fontFamily: 'monospace'
                                  }}>
                                    {transaction.safe_address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            width: '120px'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: '500',
                              ...statusConfig.style
                            }}>
                              <StatusIcon size={12} style={{ marginRight: '4px' }} />
                              {statusConfig.label}
                            </span>
                            {transaction.retry_count > 0 && (
                              <div style={{
                                fontSize: '12px',
                                color: '#D97706',
                                marginTop: '4px'
                              }}>
                                重试 {transaction.retry_count} 次
                              </div>
                            )}
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap',
                            fontSize: '14px',
                            color: '#111827',
                            width: '180px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <Calendar size={16} style={{ color: '#9CA3AF', marginRight: '8px' }} />
                              {new Date(transaction.created_at).toLocaleString('zh-CN')}
                            </div>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            width: '400px',
                            minWidth: '400px'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              width: '100%'
                            }}>
                              <Hash size={16} style={{ color: '#9CA3AF', marginRight: '8px', flexShrink: 0 }} />
                              <span style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: '#111827',
                                wordBreak: 'break-all',
                                lineHeight: '1.2',
                                flex: 1
                              }}>
                                {transaction.tx_hash}
                              </span>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${transaction.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  marginLeft: '8px',
                                  color: '#3B82F6',
                                  transition: 'color 0.2s ease',
                                  flexShrink: 0
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1D4ED8'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
                              >
                                <ExternalLink size={16} />
                              </a>
                            </div>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            width: '200px',
                            minWidth: '200px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              gap: '6px',
                              width: '100%'
                            }}>
                              <button
                                onClick={() => handleViewDetails(transaction.id)}
                                style={{
                                  color: '#3B82F6',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'color 0.2s ease',
                                  fontSize: '13px',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 0',
                                  justifyContent: 'flex-start'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1E3A8A'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
                              >
                                <Eye size={14} style={{ marginRight: '6px' }} />
                                查看详情
                              </button>
                              {transaction.status === 'COMPLETED' && transaction.safe_address && (
                                <button
                                  onClick={() => handleViewSafe(transaction.safe_address!)}
                                  style={{
                                    color: '#059669',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s ease',
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap',
                                    padding: '4px 0',
                                    justifyContent: 'flex-start'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#047857'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#059669'}
                                >
                                  <Shield size={14} style={{ marginRight: '6px' }} />
                                  查看Safe
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SafeTransactionHistoryPage;

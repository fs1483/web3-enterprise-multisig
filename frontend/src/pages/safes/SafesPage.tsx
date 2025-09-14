import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Plus, 
  Eye,
  ExternalLink,
  RefreshCw,
  Users,
  Key,
  Calendar,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';

// Safe数据类型定义
interface Safe {
  id: string;
  name: string;
  description?: string;
  address: string;
  chain_id: number;
  threshold: number;
  owners: string[];
  safe_version?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  transaction_id?: string;
}

interface SafesResponse {
  safes: Safe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Safe钱包列表页面
 * 显示用户可访问的所有Safe钱包
 */
const SafesPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [safes, setSafes] = useState<Safe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // 获取Safe列表
  const fetchSafes = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取Safe列表失败');
      }

      const data: SafesResponse = await response.json();
      setSafes(data.safes || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取Safe列表失败');
      console.error('获取Safe列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafes();
  }, [token]);

  // 过滤Safe列表
  const filteredSafes = safes.filter(safe => {
    const matchesSearch = safe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         safe.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || safe.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 处理查看Safe详情
  const handleViewSafe = (safeAddress: string) => {
    navigate(`/safes/${safeAddress}`);
  };

  // 处理创建新Safe
  const handleCreateSafe = () => {
    navigate('/safes/create');
  };

  // 格式化地址显示
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'inactive':
        return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      case 'frozen':
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
      default:
        return { backgroundColor: '#E5E7EB', color: '#374151' };
    }
  };

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'frozen': return '冻结';
      default: return status;
    }
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
            <p style={{ color: '#6B7280', fontSize: '16px' }}>正在加载Safe列表...</p>
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
            margin: '0 16px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Shield size={48} style={{ color: '#EF4444', margin: '0 auto' }} />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              加载失败
            </h2>
            <p style={{
              color: '#6B7280',
              marginBottom: '24px'
            }}>{error}</p>
            <button
              onClick={fetchSafes}
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
              <div>
                <h1 style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '8px'
                }}>
                  Safe钱包管理
                </h1>
                <p style={{
                  color: '#6B7280',
                  fontSize: '16px'
                }}>
                  管理您的多签钱包，查看余额和交易记录
                </p>
              </div>
              
              <button
                onClick={handleCreateSafe}
                style={{
                  display: 'flex',
                  alignItems: 'center',
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
                <Plus size={16} style={{ marginRight: '8px' }} />
                创建新Safe
              </button>
            </div>

            {/* 搜索和过滤 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
                <Search size={20} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF'
                }} />
                <input
                  type="text"
                  placeholder="搜索Safe名称或地址..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '44px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3B82F6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  color: '#374151'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <Filter size={16} style={{ marginRight: '8px' }} />
                过滤
                <ChevronDown size={16} style={{ marginLeft: '8px' }} />
              </button>

              <button
                onClick={fetchSafes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  color: '#374151'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <RefreshCw size={16} style={{ marginRight: '8px' }} />
                刷新
              </button>
            </div>

            {/* 过滤器面板 */}
            {showFilters && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    状态:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="all">全部</option>
                    <option value="active">活跃</option>
                    <option value="inactive">非活跃</option>
                    <option value="frozen">冻结</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Safe列表 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            overflow: 'hidden'
          }}>
            {filteredSafes.length === 0 ? (
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
                }}>
                  {searchTerm || statusFilter !== 'all' ? '未找到匹配的Safe' : '暂无Safe钱包'}
                </h3>
                <p style={{
                  color: '#6B7280',
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>
                  {searchTerm || statusFilter !== 'all' 
                    ? '请尝试调整搜索条件或过滤器' 
                    : '您还没有创建或加入任何Safe钱包'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={handleCreateSafe}
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
                )}
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                  gap: '24px'
                }}>
                  {filteredSafes.map((safe) => (
                    <div
                      key={safe.id}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => handleViewSafe(safe.address)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Shield size={24} style={{ color: '#3B82F6', marginRight: '12px' }} />
                          <div>
                            <h3 style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '4px'
                            }}>
                              {safe.name}
                            </h3>
                            <p style={{
                              fontSize: '12px',
                              color: '#6B7280',
                              fontFamily: 'monospace'
                            }}>
                              {formatAddress(safe.address)}
                            </p>
                          </div>
                        </div>
                        
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: '500',
                          ...getStatusStyle(safe.status)
                        }}>
                          {getStatusLabel(safe.status)}
                        </span>
                      </div>

                      {safe.description && (
                        <p style={{
                          fontSize: '14px',
                          color: '#6B7280',
                          marginBottom: '16px',
                          lineHeight: '1.4'
                        }}>
                          {safe.description}
                        </p>
                      )}

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px',
                        fontSize: '14px',
                        color: '#6B7280'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Users size={16} style={{ marginRight: '6px' }} />
                          {safe.owners.length} 所有者
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Key size={16} style={{ marginRight: '6px' }} />
                          {safe.threshold}/{safe.owners.length} 签名
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Calendar size={16} style={{ marginRight: '6px' }} />
                          {new Date(safe.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '16px',
                        borderTop: '1px solid #F3F4F6'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSafe(safe.address);
                          }}
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
                          onMouseEnter={(e) => e.currentTarget.style.color = '#1E40AF'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
                        >
                          <Eye size={16} style={{ marginRight: '6px' }} />
                          查看详情
                        </button>

                        <a
                          href={`https://sepolia.etherscan.io/address/${safe.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: '#6B7280',
                            textDecoration: 'none',
                            transition: 'color 0.2s ease',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                        >
                          <ExternalLink size={16} style={{ marginRight: '6px' }} />
                          区块链浏览器
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 统计信息 */}
          {filteredSafes.length > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '16px 24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#6B7280'
              }}>
                显示 {filteredSafes.length} 个Safe钱包
                {searchTerm && ` · 搜索: "${searchTerm}"`}
                {statusFilter !== 'all' && ` · 状态: ${getStatusLabel(statusFilter)}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SafesPage;

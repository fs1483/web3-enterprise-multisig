import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';

interface SafeInfo {
  id: string;
  address: string;
  name: string;
  description: string;
  owners: string[];
  threshold: number;
  chain_id: number;
  created_at: string;
}

/**
 * Safe详情页面
 * 显示Safe钱包的详细信息和管理功能
 */
const SafeDetailPage: React.FC = () => {
  const { safeAddress } = useParams<{ safeAddress: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // 获取Safe详情
  const fetchSafeInfo = async () => {
    if (!token || !safeAddress) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/address/${safeAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取Safe信息失败');
      }

      const data = await response.json();
      setSafeInfo(data.safe);
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取Safe信息失败');
      console.error('获取Safe信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafeInfo();
  }, [token, safeAddress]);

  // 复制地址到剪贴板
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">正在加载Safe信息...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
              加载失败
            </h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <button
              onClick={fetchSafeInfo}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!safeInfo) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Safe不存在</h3>
            <p className="text-gray-600 mb-6">未找到指定的Safe钱包</p>
            <button
              onClick={() => navigate('/safe-transactions')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回Safe历史
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 头部导航 */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/safe-transactions')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回Safe历史
            </button>
          </div>

          {/* Safe基本信息 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{safeInfo.name}</h1>
                <p className="text-gray-600">{safeInfo.description}</p>
              </div>
            </div>

            {/* Safe地址 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Safe地址
                  </label>
                  <div className="font-mono text-sm text-gray-900 break-all">
                    {safeInfo.address}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => copyAddress(safeInfo.address)}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="复制地址"
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <a
                    href={`https://sepolia.etherscan.io/address/${safeInfo.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="在Etherscan上查看"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Safe配置信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">所有者数量</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{safeInfo.owners.length}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Shield className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">签名阈值</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{safeInfo.threshold}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">网络</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {safeInfo.chain_id === 11155111 ? 'Sepolia' : `Chain ${safeInfo.chain_id}`}
                </div>
              </div>
            </div>
          </div>

          {/* Safe详细信息 */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-6">
              <div className="space-y-6">
                {/* 所有者列表 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">所有者地址</h3>
                    <button
                      onClick={() => navigate(`/permissions?tab=safe&safeId=${safeInfo.id}`)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="w-4 h-4 mr-1.5" />
                      权限管理
                    </button>
                  </div>
                  <div className="space-y-3">
                    {safeInfo.owners.map((owner, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium mr-3">
                            {index + 1}
                          </div>
                          <span className="font-mono text-sm text-gray-900">{owner}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyAddress(owner)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            title="复制地址"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={`https://sepolia.etherscan.io/address/${owner}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            title="在Etherscan上查看"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 创建信息 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">创建信息</h3>
                  <div className="text-sm text-gray-600">
                    <p>创建时间: {new Date(safeInfo.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SafeDetailPage;

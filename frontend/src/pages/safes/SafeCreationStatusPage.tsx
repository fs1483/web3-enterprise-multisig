import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, ExternalLink, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// 交易状态类型定义
interface TransactionInfo {
  id: string;
  tx_hash: string;
  status: string;
  statusDesc: string;
  safe_name: string;
  safe_address?: string;
  progress: number;
  created_at: string;
  confirmed_at?: string;
  processed_at?: string;
  error_message?: string;
}

// 状态步骤配置
const STATUS_STEPS = [
  { key: 'SUBMITTED', label: '交易已提交', description: '交易已发送到区块链网络' },
  { key: 'PENDING', label: '等待确认', description: '区块链网络正在处理交易' },
  { key: 'CONFIRMED', label: '交易已确认', description: 'Safe合约已成功部署' },
  { key: 'PROCESSED', label: '数据已保存', description: 'Safe信息已保存到数据库' },
  { key: 'COMPLETED', label: '创建完成', description: 'Safe钱包创建完成' }
];

/**
 * Safe创建状态页面
 * 显示Safe创建的实时进度和状态更新
 */
const SafeCreationStatusPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [transactionInfo, setTransactionInfo] = useState<TransactionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // 获取交易状态
  const fetchTransactionStatus = async () => {
    if (!transactionId || !token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safe-transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getAuthHeaders()
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取交易状态失败');
      }

      const data = await response.json();
      console.log('🔍 API返回的数据:', data);
      console.log('🔍 交易信息:', data.transaction);
      setTransactionInfo(data.transaction);
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取交易状态失败');
      console.error('获取交易状态失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 建立WebSocket连接用于实时更新
  const setupWebSocket = () => {
    if (!token) return;

    // 构建WebSocket URL - 修复协议和端口问题
    const baseUrl = import.meta.env.VITE_API_BASE_URL || buildApiUrl('');
    const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const fullWsUrl = `${wsUrl}/ws?token=${encodeURIComponent(token)}`;
    
    console.log('🔗 建立WebSocket连接:', fullWsUrl);
    const ws = new WebSocket(fullWsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket连接已建立');
      setWsConnected(true);
      
      // 订阅Safe创建状态更新
      ws.send(JSON.stringify({
        type: 'subscribe_safe_creation',
        transaction_id: transactionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📡 收到WebSocket消息:', message);

        if (message.type === 'safe_creation_update') {
          const update = message.data;
          if (update.transaction_id === transactionId) {
            // 更新交易状态
            setTransactionInfo(prev => prev ? {
              ...prev,
              status: update.status,
              statusDesc: update.status_description,
              safe_address: update.safe_address || prev.safe_address,
              progress: update.progress
            } : null);
          }
        }
      } catch (err) {
        console.error('解析WebSocket消息失败:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('❌ WebSocket连接已断开', event.code, event.reason);
      setWsConnected(false);
      
      // 只在非正常关闭时重连，避免无限重连
      if (event.code !== 1000 && event.code !== 1001) {
        console.log('🔄 5秒后尝试重连...');
        setTimeout(setupWebSocket, 5000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      setWsConnected(false);
      // 不在error事件中重连，让onclose处理
    };

    return ws;
  };

  // 组件初始化
  useEffect(() => {
    // 首先尝试从localStorage获取交易信息
    const pendingCreation = localStorage.getItem('pendingSafeCreation');
    if (pendingCreation) {
      try {
        const info = JSON.parse(pendingCreation);
        if (info.id === transactionId) {
          setTransactionInfo({
            id: info.id,
            tx_hash: info.txHash,
            status: info.status,
            statusDesc: '交易已提交到区块链',
            safe_name: 'Safe钱包',
            progress: 20,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('解析localStorage数据失败:', err);
      }
    }

    // 获取最新状态
    fetchTransactionStatus();

    // 建立WebSocket连接
    const ws = setupWebSocket();

    // 定期轮询状态（备用机制）
    const pollInterval = setInterval(fetchTransactionStatus, 10000);

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting'); // 正常关闭
      }
      clearInterval(pollInterval);
    };
  }, [transactionId, token]);

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    if (!transactionInfo) return 0;
    return STATUS_STEPS.findIndex(step => step.key === transactionInfo.status);
  };

  // 渲染状态图标
  const renderStatusIcon = (stepIndex: number, currentIndex: number) => {
    if (stepIndex < currentIndex) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    } else if (stepIndex === currentIndex) {
      return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
    } else {
      return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
    }
  };

  // 处理页面跳转
  const handleViewSafe = () => {
    if (transactionInfo?.safe_address) {
      navigate(`/safes/${transactionInfo.safe_address}`);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在获取交易状态...</p>
        </div>
      </div>
    );
  }

  if (error || !transactionInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
            获取交易状态失败
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {error || '未找到交易记录'}
          </p>
          <button
            onClick={handleBackToDashboard}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回控制台
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const isCompleted = transactionInfo.status === 'COMPLETED';
  const isFailed = transactionInfo.status === 'FAILED';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回控制台
            </button>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {wsConnected ? '实时连接' : '连接断开'}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Safe钱包创建进度
          </h1>
          <p className="text-gray-600">
            交易哈希: {transactionInfo.tx_hash}
          </p>
        </div>

        {/* 进度条 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">创建进度</h2>
            <span className="text-sm font-medium text-blue-600">
              {transactionInfo.progress}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isFailed ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${transactionInfo.progress}%` }}
            />
          </div>

          <p className="text-center text-gray-600">
            {transactionInfo.statusDesc}
          </p>
        </div>

        {/* 状态步骤 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">处理步骤</h2>
          
          <div className="space-y-4">
            {STATUS_STEPS.map((step, index) => (
              <div key={step.key} className="flex items-start space-x-4">
                {renderStatusIcon(index, currentStepIndex)}
                
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </h3>
                  <p className={`text-sm ${
                    index <= currentStepIndex ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {index < STATUS_STEPS.length - 1 && (
                  <div className={`w-px h-8 ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 交易详情 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">交易详情</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Safe名称
              </label>
              <p className="text-gray-900">{transactionInfo.safe_name || '未命名Safe'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                创建时间
              </label>
              <p className="text-gray-900">
                {new Date(transactionInfo.created_at).toLocaleString('zh-CN')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                交易哈希
              </label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 font-mono text-sm break-all">
                  {transactionInfo.tx_hash}
                </p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${transactionInfo.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当前状态
              </label>
              <p className="text-gray-900">{transactionInfo.statusDesc || transactionInfo.status}</p>
            </div>

            {transactionInfo.safe_address && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safe地址
                </label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 font-mono text-sm break-all">
                    {transactionInfo.safe_address}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/address/${transactionInfo.safe_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {transactionInfo.confirmed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认时间
                </label>
                <p className="text-gray-900">
                  {new Date(transactionInfo.confirmed_at).toLocaleString('zh-CN')}
                </p>
              </div>
            )}

            {transactionInfo.processed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  处理完成时间
                </label>
                <p className="text-gray-900">
                  {new Date(transactionInfo.processed_at).toLocaleString('zh-CN')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionInfo.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                // 确保链接正确打开
                if (!transactionInfo.tx_hash) {
                  e.preventDefault();
                  alert('交易哈希不可用');
                  return;
                }
                // 让浏览器处理链接跳转
                console.log('跳转到Etherscan:', `https://sepolia.etherscan.io/tx/${transactionInfo.tx_hash}`);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              查看交易详情
            </a>

            {isCompleted && transactionInfo.safe_address && (
              <button
                onClick={handleViewSafe}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                查看Safe钱包
              </button>
            )}

            {isFailed && (
              <button
                onClick={() => navigate('/safes/create')}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                重新创建Safe
              </button>
            )}
          </div>

          {transactionInfo.error_message && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-1">错误信息</h4>
              <p className="text-sm text-red-700">{transactionInfo.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeCreationStatusPage;
